const {chromium}=require(process.env.RIVALS_PLAYWRIGHT_MODULE||'playwright');
const {enterRoom}=require('./WebRoomHelpers.cjs');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const output=path.resolve(__dirname,'../Logs'),beforeMode=process.argv.includes('--before'),results=[];
const angular=(a,b)=>((a-b+540)%360)-180;
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.RIVALS_CHROME||undefined,headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 try{
  for(const mode of ['locked']){
   const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),run={mode,errors:[]};results.push(run);
   page.on('pageerror',e=>run.errors.push(e.message));page.on('console',m=>{if(/^(InvalidOperationException|NullReferenceException|MissingReferenceException|ArgumentException):/.test(m.text()))run.errors.push(m.text());});
   await page.addInitScript(mode=>{
    if(mode==='rejected')HTMLCanvasElement.prototype.requestPointerLock=function(){return Promise.reject(new Error('QA rejected'));};
    if(mode==='silent-request')HTMLCanvasElement.prototype.requestPointerLock=function(){window.qaLockRequests=(window.qaLockRequests||0)+1;};
   },mode);
   const url=new URL(process.env.RIVALS_WEB_URL||'http://localhost:8184/');url.searchParams.set('diagnostics','1');url.searchParams.set('v','focus-qa');await page.goto(url.href);
   await enterRoom(page,{name:'專心貓貓',room:'專心貓貓的房間'});
   const box=await page.locator('canvas').boundingBox(),cx=box.x+box.width/2,cy=box.y+box.height/2;
   const wait=ms=>page.waitForTimeout(ms),state=()=>page.evaluate(()=>window.rivalsDiagnostics);
   async function live(){const s=await state();assert.equal(s.phase,2);assert.ok(s.players.find(p=>p.seat===s.localSeat).health>0);return s;}
   async function engage(){await page.mouse.click(cx,cy,{delay:75});await wait(220);}
   await engage();await page.keyboard.down('d');await wait(1600);await page.keyboard.up('d');
   if(beforeMode){
    await page.locator('#fullscreen').focus();await page.locator('canvas').focus();await wait(200);
    const before=await live();await page.mouse.move(cx+160,cy,{steps:10});await wait(250);const after=await live();
    run.before=before;run.after=after;run.yawChange=angular(after.look.x,before.look.x);
    run.browser=await page.evaluate(()=>({focused:document.activeElement===document.querySelector('canvas'),locked:!!document.pointerLockElement,bridgeEnabled:window.rivalsLook.enabled}));
    assert.equal(after.controls,true);assert.ok(Math.abs(run.yawChange)<.1);run.reproduced=true;
   }else{
    // Tab must not accidentally move focus from the canvas during play.
    await page.keyboard.press('Tab');await wait(150);assert.equal(await page.evaluate(()=>window.rivalsPointer.active),true);
    // Actual DOM focus transfer, then return without a click: a formerly silent
    // loss must now gate gameplay and show the recovery affordance.
    await page.keyboard.down('w');await wait(160);await page.locator('#fullscreen').focus();await page.keyboard.up('w');await page.locator('canvas').focus();await wait(250);
    assert.equal((await live()).controls,false);assert.equal(await page.locator('#control-resume').isVisible(),true);
    const frozen=await live();await page.mouse.move(cx+100,cy,{steps:10});await wait(150);assert.ok(Math.abs(angular((await live()).look.x,frozen.look.x))<.1);
    await page.locator('#resume-pointer').click();await wait(250);assert.equal((await live()).controls,true);
    await page.mouse.move(cx,cy);await wait(180);const recovered=await live();await page.mouse.move(cx+160,cy,{steps:10});await wait(180);
    run.recoveredTurn=angular((await live()).look.x,recovered.look.x);assert.ok(Math.abs(run.recoveredTurn-19.2)<2,'one click restores mouse look');
    const settled=await live(),position=settled.players.find(p=>p.seat===settled.localSeat).position;await wait(350);const idle=await live(),next=idle.players.find(p=>p.seat===idle.localSeat).position;
    assert.ok(Math.hypot(next.x-position.x,next.z-position.z)<.15,'released movement must not stick across focus recovery');
    if(mode==='locked'){
     await page.evaluate(()=>document.exitPointerLock());await wait(220);assert.equal((await live()).controls,false);assert.equal(await page.locator('#control-resume').isVisible(),true);
     await wait(1400);await engage();assert.equal((await live()).controls,true);assert.equal(await page.evaluate(()=>!!document.pointerLockElement),true);run.unexpectedUnlock=true;
    }
    // A window-focus boundary must discard held turn input and require a click.
    await page.keyboard.down('e');await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await wait(150);await page.keyboard.up('e');
    assert.equal((await live()).controls,false);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await wait(150);
    assert.equal((await live()).controls,false);await engage();assert.equal((await live()).controls,true);
    const still=await live();await wait(350);assert.ok(Math.abs(angular((await live()).look.x,still.look.x))<.1,'released turn must not stick across focus recovery');
    await page.keyboard.press('Escape');await wait(250);assert.equal((await live()).controls,false);assert.equal(await page.locator('#control-resume').isVisible(),false,'pause menu is not covered by recovery UI');
    await page.mouse.click(cx,box.y+box.height*339/720,{delay:80});await wait(250);assert.equal((await live()).controls,true,'pause resume works on one click');
    await page.evaluate(()=>document.exitPointerLock());await wait(1400);
    await page.locator('#fullscreen').click();await wait(400);
    assert.equal(await page.evaluate(()=>document.fullscreenElement===document.getElementById('stage')),true);
    assert.equal(await page.evaluate(()=>document.pointerLockElement===document.querySelector('canvas')),true,'fullscreen gesture also grants real pointer lock');
    assert.equal((await live()).controls,true);run.fullscreenLock=true;
    run.pointer=await page.evaluate(()=>window.rivalsPointer);run.ok=true;
    await page.screenshot({path:path.join(output,`focus-web-${mode}.png`)});
   }
   assert.deepEqual(run.errors,[]);console.log('WEB_FOCUS_MODE '+JSON.stringify({mode,ok:run.ok,reproduced:run.reproduced,recoveredTurn:run.recoveredTurn}));await context.close();
  }
 }finally{fs.writeFileSync(path.join(output,beforeMode?'focus-web-before.json':'focus-web-check.json'),JSON.stringify(results,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
