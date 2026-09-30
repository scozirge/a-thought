// Verify the public release, actual multiplayer pickup state and linked course.
const {chromium}=require(process.env.RIVALS_PLAYWRIGHT_MODULE||'playwright');
const {enterRoom}=require('./WebRoomHelpers.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const output=path.resolve(process.env.RIVALS_TEST_OUTPUT||'Logs/UnlockBots/Public');fs.mkdirSync(output,{recursive:true});
const game=new URL(process.env.RIVALS_WEB_URL||'https://scozirge.github.io/a-thought/rivals/');
game.searchParams.set('v','unlock-bots-20261001');game.searchParams.set('diagnostics','1');
const course=process.env.RIVALS_COURSE_URL||'https://scozirge.github.io/a-thought/hatchbeasts/classroom/';
const result={checks:[],errors:[],url:game.href};
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.RIVALS_CHROME||undefined,headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 page.on('pageerror',e=>result.errors.push(e.message));
 page.on('console',m=>{if(/^(?:\w*Exception|RuntimeError):/.test(m.text()))result.errors.push(m.text());});
 const check=(ok,label)=>{assert.ok(ok,label);result.checks.push(label);console.log('PUBLIC_CHECK '+label);};
 try{
  const response=await page.request.get(new URL('版本資訊.json?t='+Date.now(),game).href);
  assert.ok(response.ok());const info=await response.json();result.version=info.networkVersion;result.sourceCommit=info.gameSourceCommit;
  check(info.networkVersion==='rivals-web-25-unlock-bots','public release metadata has the new version');
  await page.goto(game.href,{waitUntil:'domcontentloaded',timeout:120000});
  await enterRoom(page,{name:'公開驗證'+Date.now().toString(36).slice(-4)});
  const s=await page.evaluate(()=>window.rivalsDiagnostics);
  check(s.players.length===8&&s.players.filter(p=>p.bot).length===7,'public game creates a real room with seven Bots');
  check(JSON.stringify(s.pickups.map(p=>p.weapon).sort())==='[0,0,3,4]','public arena has four ordinary pickups and no badge weapons');
  check(s.players.find(p=>p.seat===s.localSeat).learningProgress===0,'public room starts with locked lesson progress');
  await page.screenshot({path:path.join(output,'game.png')});
  await page.evaluate(()=>window.rivalsLearningCommand('leave'));
  await page.waitForFunction(()=>window.rivalsLobbyState?.visible&&rivalsLobbyState.ready,null,{timeout:30000});
  await page.goto(course+'red-blue-battle/?v=unlock-bots-20261001',{waitUntil:'domcontentloaded',timeout:60000});
  check(await page.locator('#weapon-challenges details').count()===15,'public course retains all fifteen questions');
  const updates=await page.locator('#game-updates').innerText();
  check(updates.includes('場地上不會出現')&&updates.includes('分散走不同路線'),'public course explains unlock-only weapons and distributed Bots');
  check(await page.locator('a[href*="rivals/?v=unlock-bots-20261001"]').count()>0,'course links to the current game release');
  await page.locator('#weapon-challenges details').first().locator('summary').click();
  check(await page.locator('#weapon-challenges details').first().getAttribute('open')!==null,'question answer can be expanded');
  await page.setViewportSize({width:390,height:844});await page.locator('#game-updates').scrollIntoViewIfNeeded();
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'public lesson fits a narrow mobile viewport');
  await page.screenshot({path:path.join(output,'course-mobile.png')});
  await page.goto(course+'?v=unlock-bots-20261001',{waitUntil:'domcontentloaded',timeout:60000});
  check(await page.locator('a[href$="#game-updates"]').count()===1,'public catalog has the new gameplay entry');
  check(result.errors.length===0,'public game and course have no script exceptions');
 }finally{fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(result,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
