// Mobile control, safe-edge placement and every actual UI flow. No mocked Unity scene.
const {chromium,devices}=require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const gestures=require('./web-controls.cjs');
const url=process.env.NEON_WEB_URL||'http://127.0.0.1:8197/';
const output=path.resolve(__dirname,'../logs/'+(process.env.NEON_RUN||'web-joystick-mobile'));fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const inputOnly=process.env.NEON_INPUT_ONLY==='1';
 const report={url,passed:false,physicalDevice:false,inputOnly,checks:[],layouts:[],errors:[]};let page;
 try{
  const ctx=await browser.newContext({...devices['iPhone 13'],viewport:{width:390,height:844},locale:'zh-TW'});page=await ctx.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('console',m=>{const s=m.text().replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,'[redacted-id]');if(/Exception:|abort\(|shader.*error|NullReferenceException/i.test(s))report.errors.push(s.slice(0,500));fs.appendFileSync(path.join(output,'browser.log'),s+'\n');});
  const ready=(fn,arg=null)=>page.waitForFunction(fn,arg,{timeout:120000});
  const click=name=>gestures.click(page,name);
  const state=()=>page.evaluate(()=>neonState);
  async function resize(w,h){await page.setViewportSize({width:w,height:h});await ready(()=>{const c=document.querySelector('canvas'),s=window.neonState;return s&&Math.abs(s.cssWidth-c.clientWidth)<2&&Math.abs(s.cssHeight-c.clientHeight)<2&&s.screenWidth===c.width&&s.screenHeight===c.height;});await page.waitForTimeout(700);}
  async function shot(name){await page.screenshot({path:path.join(output,name+'.png'),scale:'css'});}
  async function closeGuide(){if((await state()).controls.some(c=>c.name==='Close tutorial')){await click('Close tutorial');await ready(()=>!neonState.guidePage);}}
  async function ensureAlive(){await closeGuide();if(!(await state()).playerAlive||(await state()).view==='result'){await ready(()=>neonState.view==='result');await closeGuide();await click('Play again');await ready(()=>neonState.view==='battle'&&neonState.playerAlive);}}
  async function checkLayout(label){
   const s=await state(),ratio=s.cssWidth/s.screenWidth;
   const controls=s.controls.filter(c=>c.type!=='Scrollbar').map(c=>({...c,x:c.x*ratio,y:c.y*ratio,w:c.w*ratio,h:c.h*ratio}));
   for(const c of controls){assert.ok(c.w>=43.4&&c.h>=43.4,`${label}: small ${c.name} ${c.w}x${c.h}`);if(!c.scroll)assert.ok(c.x>=-1&&c.y>=-1&&c.x+c.w<=s.cssWidth+1&&c.y+c.h<=s.cssHeight+1,`${label}: clipped ${c.name}`);}
   const elements=s.elements.map(e=>({...e,x:e.x*ratio,y:e.y*ratio,w:e.w*ratio,h:e.h*ratio}));
   const by=n=>elements.find(e=>e.name===n);
   if(s.view==='battle'){
    const stick=by('Touch joystick'),hp=by('Vitality'),skills=by('Skill dock'),rank=by('Leaderboard'),feed=by('Combat feed');
    assert.ok(stick&&hp&&skills&&rank&&feed,'All mobile HUD groups present');
    for(const e of [stick,hp,skills,rank,feed])assert.ok(e.x>=10&&e.y>=10&&e.x+e.w<=s.cssWidth-9&&e.y+e.h<=s.cssHeight-9,`${label}: HUD ${e.name} outside safe edges`);
    assert.ok(stick.x>=28&&s.cssHeight-stick.y-stick.h>=23,'Joystick has breathing room inside bottom-left safe area');
    assert.ok(hp.y+hp.h<=stick.y-10&&hp.h<=50,'Compact health and experience above joystick');
    assert.ok(Math.abs(s.cssWidth-skills.x-skills.w-24)<1&&s.cssHeight-skills.y-skills.h>=23,'Skills inset at bottom right');
    assert.ok(Math.abs(feed.x-12)<1&&Math.abs(feed.y-12)<1,'Combat feed upper left');
    assert.ok(Math.abs(s.cssWidth-rank.x-rank.w-24)<1&&rank.y>=58,'Rank upper right below leave');
    assert.ok(rank.y+rank.h<=skills.y+1,'Rank and skills do not overlap');
    assert.ok(rank.opacity>0&&rank.opacity<=.3,'Leaderboard is translucent');
    assert.ok(stick.opacity<=.25&&by('Thumb').opacity<=.55,'Joystick and thumb remain translucent');
    const level=by('Level'),exp=by('Experience');assert.ok(level&&exp&&level.x+level.w<exp.x&&Math.abs(level.y+level.h/2-exp.y-exp.h/2)<1,'Level sits beside experience');
    const exit=by('Exit icon'),leave=controls.find(c=>c.name==='Leave arena');
    assert.ok(exit&&exit.w<=24&&exit.h<=24&&leave.w>=43.4&&leave.h>=43.4,'Small exit icon retains accessible hit area');
    assert.ok(!leave.text,'Exit has no large text label');
    assert.ok(skills.w<=172&&skills.h<=66&&elements.filter(e=>e.name==='Slot').every(e=>e.opacity<=.2&&e.borderOpacity<=.25),'Skill slots are small and translucent');
    assert.ok(!by('Tooltip'),'No stale hover tooltip obscures the mobile arena');
   }
   assert.equal(s.legacyPopupVisible,false);
   report.layouts.push({label,view:s.view,css:[s.cssWidth,s.cssHeight],controls:controls.length,elements});await shot(label);
  }
  await page.goto(url+'?neonQA=1&neonRoom=neon-web-check-stick-'+Date.now().toString(36));
  await page.locator('#rotate').waitFor({state:'visible'});await page.waitForFunction(()=>!!window.unityInstance,null,{timeout:300000});await ready(()=>window.neonState?.scene==='Init'&&!neonState.started);await shot('portrait-start');
  await resize(844,390);await page.locator('#rotate').waitFor({state:'hidden'});await ready(()=>neonState.scene==='Lobby'&&neonState.view==='lobby');
  const originalLoad=await page.evaluate(()=>neonLoadStarted);
  for(const [w,h] of (inputOnly?[]:[[844,390],[667,375],[844,300],[844,240]])){
   await resize(w,h);await checkLayout(`lobby-${w}x${h}`);
   await click('Collection');await ready(()=>neonState.view==='collection');await checkLayout(`collection-${w}x${h}`);
   for(const part of [1,2]){await click('Part '+part);await checkLayout(`collection-part${part}-${w}x${h}`);}
   await click('Back');await click('Challenge');await closeGuide();await ready(()=>neonState.view==='loadout');await checkLayout(`loadout-${w}x${h}`);
   await click('Loadout 0');await ready(()=>neonState.view==='select');await checkLayout(`selection-${w}x${h}`);await click('Use skill');await ready(()=>neonState.view==='loadout');await click('Back');
   await click('Settings');await ready(()=>neonState.view==='settings');await checkLayout(`settings-${w}x${h}`);
   await click('RegionDropDown');await checkLayout(`options-${w}x${h}`);await click('Close choices');
   await click('Settings tab 1');await ready(()=>neonState.view==='clamor');await checkLayout(`shouts-${w}x${h}`);
   await click('Settings tab 2');await ready(()=>neonState.view==='credits');await checkLayout(`credits-${w}x${h}`);
   await click('Settings tab 0');await click('Tutorial');await ready(()=>!!neonState.guidePage);await click('Next page');
   assert.ok((await state()).guideText.includes('蘑菇頭'));await checkLayout(`tutorial-${w}x${h}`);await click('Close tutorial');await click('Back');
   console.log('UI size complete',w,h);
  }
  if(!inputOnly)report.checks.push('Four mobile landscape sizes: lobby, all three collection parts, loadout, skill selection, settings, options, shouts, credits and tutorial; visible controls retain 44 CSS pixels');
  else report.checks.push('Focused deployed-player input smoke; the full menu matrix is covered separately by the release verification');
  await resize(844,390);await click('Tutorial');await ready(()=>!!neonState.guidePage);await click('Next page');const guidePage=(await state()).guidePage;
  for(let round=0;round<2;round++){await resize(390,844);await page.locator('#rotate').waitFor({state:'visible'});await resize(844,390);await page.locator('#rotate').waitFor({state:'hidden'});assert.equal((await state()).guidePage,guidePage);}
  assert.equal(await page.evaluate(()=>neonLoadStarted),originalLoad);await click('Close tutorial');
  await page.evaluate(()=>{for(const [k,v] of Object.entries({left:44,right:44,bottom:21}))document.documentElement.style.setProperty('--safe-'+k,v+'px');dispatchEvent(new Event('resize'));});await ready(()=>neonState.cssWidth===756&&neonState.cssHeight===369);await page.waitForTimeout(700);await checkLayout('lobby-notch');
  await page.evaluate(()=>{for(const side of ['left','right','bottom'])document.documentElement.style.removeProperty('--safe-'+side);dispatchEvent(new Event('resize'));});await resize(844,390);
  await click('Infinity');await ready(()=>neonState.controls.some(c=>c.name==='Close tutorial')||neonState.scene==='Battle');await closeGuide();if((await state()).view==='lobby')await click('Infinity');
  await ready(()=>neonState.scene==='Battle'&&neonState.connected&&neonState.playerAlive);await closeGuide();await page.waitForTimeout(800);
  await ensureAlive();
  let s=await state(),stick=s.elements.find(e=>e.name==='Touch joystick'),r=await gestures.cssRect(page,stick);const x=r.x+r.w/2,y=r.y+r.h/2;
  const start={x:s.playerX,y:s.playerY};await gestures.touch(page,'touchStart',[{id:1,x,y}]);await page.waitForTimeout(100);await gestures.touch(page,'touchMove',[{id:1,x:x+45,y}]);
  await ready(()=>neonState.stickX>.7&&neonState.stickDragging);
  // Live opponents can briefly knock the player back; wait for observed movement,
  // rather than assuming one 500 ms QA snapshot already reflects the gesture.
  await page.waitForFunction(p=>neonState.playerAlive&&neonState.playerX>p.x+1,start,{timeout:8000});
  s=await state();report.movement={start,end:{x:s.playerX,y:s.playerY},velocity:{x:s.velocityX,y:s.velocityY}};report.checks.push('Real CDP touch drag moves the actual Photon player right');
  await gestures.touch(page,'touchStart',[{id:1,x:x+45,y},{id:2,x:420,y:180}]);await ready(()=>neonState.stickX>.7);await gestures.touch(page,'touchEnd',[{id:1,x:x+45,y}]);await ready(()=>neonState.stickX>.7&&neonState.stickDragging);
  await gestures.touch(page,'touchEnd',[]);await ready(()=>!neonState.stickDragging&&neonState.stickX===0&&neonState.stickY===0);await page.waitForTimeout(300);s=await state();assert.ok(Math.hypot(s.velocityX,s.velocityY)<1,'Release stops movement');
  await page.touchscreen.tap(440,200);await page.waitForTimeout(600);assert.equal((await state()).stickX,0,'Tap outside joystick cannot steer');
  await gestures.touch(page,'touchStart',[{id:1,x,y}]);await page.waitForTimeout(100);await gestures.touch(page,'touchMove',[{id:1,x,y:y-40}]);await ready(()=>neonState.stickY>.7);await gestures.touch(page,'touchCancel',[]);await ready(()=>!neonState.stickDragging&&neonState.stickY===0);
  report.checks.push('Second finger does not steal joystick; release, off-stick taps and touchcancel clear direction');
  await ensureAlive();
  const slot=(await state()).elements.find(e=>e.name==='Slot'),sr=await gestures.cssRect(page,slot);
  await gestures.touch(page,'touchStart',[{id:9,x:sr.x+sr.w/2,y:sr.y+sr.h/2}]);await ready(()=>neonState.elements.some(e=>e.name==='Tooltip'));
  await gestures.touch(page,'touchEnd',[]);await ready(()=>!neonState.elements.some(e=>e.name==='Tooltip'));
  await gestures.touch(page,'touchStart',[{id:9,x:sr.x+sr.w/2,y:sr.y+sr.h/2}]);await ready(()=>neonState.elements.some(e=>e.name==='Tooltip'));
  await gestures.touch(page,'touchCancel',[]);await ready(()=>!neonState.elements.some(e=>e.name==='Tooltip'));
  report.checks.push('Mobile skill description appears only while pressed and disappears on release or touchcancel');
  await gestures.touch(page,'touchStart',[{id:1,x,y}]);await page.waitForTimeout(100);await gestures.touch(page,'touchMove',[{id:1,x:x+40,y}]);await ready(()=>neonState.stickX>.7);await resize(390,844);await ready(()=>!neonState.stickDragging);await gestures.touch(page,'touchEnd',[]);await resize(844,390);assert.equal((await state()).stickX,0);assert.ok((await state()).connected);
  await click('Leave arena');await ready(()=>neonState.controls.some(c=>c.name==='Cancel dialog'));assert.ok((await state()).inputBlocked);await checkLayout('leave-confirm');await click('Cancel dialog');
  await ready(()=>!neonState.controls.some(c=>c.name==='Cancel dialog'));
  // Online combat continues while the confirmation is open. A death can open
  // the original post-game guide; complete that flow before testing movement.
  await ensureAlive();await ready(()=>!neonState.inputBlocked);
  report.checks.push('Rotation preserves Photon session and clears captured input; confirmation dialog blocks movement');
  for(const [w,h] of [[844,390],[667,375],[844,300],[844,240]]){await resize(w,h);await ensureAlive();await checkLayout(`hud-${w}x${h}`);}
  report.checks.push('Lightweight HUD at four sizes: translucent rank and joystick, inset controls, small exit icon with 44-pixel hit area, compact skills and player level beside actual experience progress');
  await resize(844,390);await ensureAlive();
  await page.evaluate(()=>{for(const [k,v] of Object.entries({left:44,right:44,bottom:21}))document.documentElement.style.setProperty('--safe-'+k,v+'px');dispatchEvent(new Event('resize'));});
  await ready(()=>neonState.cssWidth===756&&neonState.cssHeight===369);await page.waitForTimeout(700);await ensureAlive();await checkLayout('hud-notch');
  await page.evaluate(()=>{for(const side of ['left','right','bottom'])document.documentElement.style.removeProperty('--safe-'+side);dispatchEvent(new Event('resize'));});await resize(844,390);
  report.checks.push('Battle controls retain their inner spacing in addition to simulated notch and bottom gesture safe areas');
  await page.evaluate(()=>unityInstance.SendMessage('NeonWebBridge','PreviewResultLayout'));await ready(()=>neonState.view==='result');
  for(const [w,h] of [[844,390],[667,375],[844,300],[844,240]]){await resize(w,h);await closeGuide();await checkLayout(`result-fixture-${w}x${h}`);assert.ok((await state()).inputBlocked);}
  await closeGuide();await click('Return to lobby');await ready(()=>neonState.scene==='Lobby');report.checks.push('Result layout checked with explicitly synthetic zero-reward fixture, then left the room');
  assert.deepEqual(report.errors,[]);report.passed=true;
 }catch(e){report.failure=e.stack;if(page){report.lastState=await page.evaluate(()=>window.neonState).catch(()=>null);await page.screenshot({path:path.join(output,'failure.png'),scale:'css'}).catch(()=>{});}process.exitCode=1;}
 finally{fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,layouts:report.layouts.length,checks:report.checks,errors:report.errors,failure:report.failure},null,2));await browser.close();}
})();
