// Verify the public release, actual multiplayer pickup state and linked course.
const {chromium}=require(process.env.RIVALS_PLAYWRIGHT_MODULE||'playwright');
const {enterRoom}=require('./WebRoomHelpers.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const output=path.resolve(process.env.RIVALS_TEST_OUTPUT||'Logs/UnlockBots/Public');fs.mkdirSync(output,{recursive:true});
const game=new URL(process.env.RIVALS_WEB_URL||'https://scozirge.github.io/a-thought/rivals/');
const revision='cdn-load-20261001';
game.searchParams.set('v',revision);game.searchParams.set('diagnostics','1');
const course=process.env.RIVALS_COURSE_URL||'https://scozirge.github.io/a-thought/hatchbeasts/classroom/';
const result={checks:[],errors:[],downloads:[],logs:[],url:game.href};
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.RIVALS_CHROME||undefined,headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 page.on('pageerror',e=>result.errors.push(e.message));
 page.on('console',m=>{const text=m.text();if(/^(?:\w*Exception|RuntimeError):/.test(text))result.errors.push(text);if(/UnityCache|RIVALS_|Exception|Error/.test(text))result.logs.push(text);});
 page.on('requestfinished',request=>{if(request.url().includes('/Build/')){result.downloads.push({url:request.url(),timing:request.timing()});console.log('PUBLIC_ASSET_LOADED '+new URL(request.url()).pathname.split('/').at(-1));}});
 page.on('requestfailed',request=>result.downloads.push({url:request.url(),failure:request.failure()}));
 const check=(ok,label)=>{assert.ok(ok,label);result.checks.push(label);console.log('PUBLIC_CHECK '+label);};
 try{
  const response=await page.request.get(new URL('版本資訊.json?t='+Date.now(),game).href);
  assert.ok(response.ok());const info=await response.json();result.version=info.networkVersion;result.sourceCommit=info.gameSourceCommit;
  check(info.networkVersion==='rivals-web-26-respawn-default','public release metadata has the new version');
  check(info.uiRevision==='simple-quiz-20261001','public release contains the simplified quiz interface');
  check(info.releaseRevision===revision&&info.compression==='Brotli / Unity decompression fallback','public release contains the compressed validated package');
  await page.goto(game.href,{waitUntil:'domcontentloaded',timeout:120000});
  // First visits download the complete WebAssembly build before connecting.
  // Keep that startup allowance separate from the room-connection deadline.
  await page.waitForFunction(()=>window.rivalsLobbyState?.ready&&!window.rivalsLobbyState.busy,null,{timeout:Number(process.env.RIVALS_STARTUP_TIMEOUT_MS||180000)});
  check(await page.evaluate(()=>window.rivalsAssetDelivery?.enabled===true),'public release enables verified CDN delivery');
  await enterRoom(page,{name:'公開驗證'+Date.now().toString(36).slice(-4)});
  check(await page.locator('#learning-leave,#learning-stage,#learning-progress,#learning-note').count()===0,'public quiz has no exit, stage labels, badge prompt or rule footer');
  const s=await page.evaluate(()=>window.rivalsDiagnostics);
  check(s.players.length===8&&s.players.filter(p=>p.bot).length===7,'public game creates a real room with seven Bots');
  check(JSON.stringify(s.pickups.map(p=>p.weapon).sort())==='[0,0,3,4]','public arena has four ordinary pickups and no badge weapons');
  check(s.players.find(p=>p.seat===s.localSeat).learningProgress===0,'public room starts with locked lesson progress');
  await page.screenshot({path:path.join(output,'game.png')});
  await page.evaluate(()=>window.rivalsLearningCommand('leave'));
  await page.waitForFunction(()=>window.rivalsLobbyState?.visible&&rivalsLobbyState.ready,null,{timeout:30000});
  await page.goto(course+'weapon-logic/?v='+revision,{waitUntil:'domcontentloaded',timeout:60000});
  check(await page.locator('#weapon-challenges details').count()===15,'public course retains all fifteen questions');
  const updates=await page.locator('#game-updates').innerText();
  check(updates.includes('場地上不會出現')&&updates.includes('分散走不同路線'),'public course explains unlock-only weapons and distributed Bots');
  check(await page.locator('a[href*="rivals/?v='+revision+'"]').count()>0,'course links to the current game release');
  check(updates.includes('只留題目和選項'),'course describes the simplified quiz');
  check(updates.includes('最近解鎖')&&updates.includes('只影響這次復活')&&updates.includes('不列入復活選單'),'course explains latest-unlock defaults and temporary choices');
  await page.locator('#weapon-challenges details').first().locator('summary').click();
  check(await page.locator('#weapon-challenges details').first().getAttribute('open')!==null,'question answer can be expanded');
  await page.setViewportSize({width:390,height:844});await page.locator('#game-updates').scrollIntoViewIfNeeded();
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'public lesson fits a narrow mobile viewport');
  await page.screenshot({path:path.join(output,'course-mobile.png')});
  await page.goto(course+'?v='+revision,{waitUntil:'domcontentloaded',timeout:60000});
  check(await page.locator('a[href$="#game-updates"]').count()===1,'public catalog has the new gameplay entry');
  check(result.errors.length===0,'public game and course have no script exceptions');
 }catch(error){result.failure=error.stack;result.lastState=await page.evaluate(()=>({loading:document.getElementById('loading')?.innerText,lobby:window.rivalsLobbyState,resources:performance.getEntriesByType('resource').filter(r=>r.name.includes('/Build/')).map(r=>({name:r.name,duration:r.duration,transfer:r.transferSize}))})).catch(()=>null);await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});throw error;}
 finally{fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(result,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
