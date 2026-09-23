// Exercise browser mouse input against the real Unity Web build. No injected
// movement events or gameplay writes: diagnostics are only used for assertions.
const {chromium}=require(process.env.RIVALS_PLAYWRIGHT_MODULE||'playwright');
const {enterRoom}=require('./WebRoomHelpers.cjs');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const output=path.resolve(__dirname,'../Logs'),results=[];
const angular=(a,b)=>((a-b+540)%360)-180;
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.RIVALS_CHROME||undefined,headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 try{
  for(const mode of process.env.RIVALS_LOOK_MODES?.split(',')||['locked','rejected','silent-request']){
   const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
   const result={mode,errors:[]};results.push(result);
   page.on('pageerror',e=>result.errors.push(e.message));
   page.on('console',m=>{if(/^(InvalidOperationException|NullReferenceException|MissingReferenceException|ArgumentException):/.test(m.text()))result.errors.push(m.text());});
   await page.addInitScript(mode=>{
    if(mode==='rejected')HTMLCanvasElement.prototype.requestPointerLock=function(){return Promise.reject(new Error('QA pointer lock rejected'));};
    if(mode==='legacy-error')HTMLCanvasElement.prototype.requestPointerLock=function(){setTimeout(()=>document.dispatchEvent(new Event('pointerlockerror')),0);};
    if(mode==='silent-request')HTMLCanvasElement.prototype.requestPointerLock=function(){};
   },mode);
   const url=new URL(process.env.RIVALS_WEB_URL||'http://localhost:8184/');url.searchParams.set('diagnostics','1');
   await page.goto(url.href);
   await enterRoom(page,{room:'視角測試'+Date.now().toString(36)});
   await page.waitForFunction(()=>window.rivalsDiagnostics?.phase===2,null,{timeout:120000});
   const box=await page.locator('canvas').boundingBox(),cx=box.x+box.width/2,cy=box.y+box.height/2;
   let mx=cx,my=cy;
   const move=async(x,y,steps=12)=>{mx=x;my=y;await page.mouse.move(x,y,{steps});await page.waitForTimeout(170);};
   const state=()=>page.evaluate(()=>window.rivalsDiagnostics);
   const live=async()=>{const s=await state();assert.equal(s.phase,2);assert.ok(s.players.find(p=>p.seat===s.localSeat).health>0,'test player died');return s;};
   await page.mouse.click(mx,my,{delay:90});await page.waitForTimeout(350);
   await page.keyboard.down('d');await page.waitForTimeout(1600);await page.keyboard.up('d');
   assert.equal(await page.evaluate(()=>!!document.pointerLockElement),mode==='locked');
   if(mode!=='locked'){
    await page.waitForTimeout(1700);const fallback=await live();assert.equal(fallback.controls,true);
    assert.equal(await page.locator('#control-resume').isVisible(),false);
    assert.equal(await page.locator('#drag-help').isVisible(),true);
    for(const x of [1439,1,box.x+box.width-1,box.x+1]){
     await move(x,cy);await page.waitForTimeout(100);const current=await live();
     assert.ok(Math.abs(angular(current.look.x,fallback.look.x))<.1,'unheld mouse at edges never turns the camera');
    }
    let total=0;
    for(let i=0;i<6;i++){
     await move(cx-300,cy);const before=await live();
     await page.mouse.down({button:'right'});await move(cx+300,cy);const after=await live();
     const delta=angular(after.look.x,before.look.x);assert.ok(Math.abs(delta-72)<2);total+=delta;
     assert.equal(after.aiming,true);
     assert.equal(await page.locator('canvas').evaluate(el=>getComputedStyle(el).cursor),'none');
     await page.waitForTimeout(180);assert.ok(Math.abs(angular((await live()).look.x,after.look.x))<.1,'held stationary drag never spins');
     await page.mouse.up({button:'right'});await move(cx,cy);
     assert.ok(Math.abs(angular((await live()).look.x,after.look.x))<.1,'release and reposition never turns the camera');
    }
    assert.ok(total>360);result.dragTurnDegrees=total;
    assert.equal((await live()).aiming,false);
    const beforeMove=await live(),original=beforeMove.players.find(p=>p.seat===beforeMove.localSeat);
    await page.keyboard.down('d');await page.mouse.down();await page.waitForTimeout(500);await page.mouse.up();await page.keyboard.up('d');await page.waitForTimeout(220);
    const moved=await live(),local=moved.players.find(p=>p.seat===moved.localSeat);
    assert.ok(Math.hypot(local.position.x-original.position.x,local.position.z-original.position.z)>.1,'fallback allows movement');
    assert.ok(local.shots>original.shots,'fallback allows shooting');
    assert.notEqual(await page.locator('canvas').evaluate(el=>getComputedStyle(el).cursor),'none');
    await page.mouse.down({button:'right'});await page.locator('#fullscreen').focus();await page.mouse.up({button:'right'});await page.waitForTimeout(180);
    assert.equal((await live()).controls,false);await page.locator('#resume-pointer').click();await page.waitForTimeout(200);
    const resumed=await live();assert.equal(resumed.controls,true);await move(cx+100,cy);
    assert.ok(Math.abs(angular((await live()).look.x,resumed.look.x))<.1,'focus recovery cancels held drag');
    await page.screenshot({path:path.join(output,`pointer-drag-${mode}.png`)});
    await page.keyboard.press('Escape');await page.waitForTimeout(200);assert.equal(await page.locator('#control-resume').isVisible(),false);
    assert.equal(await page.locator('#drag-help').isVisible(),false);assert.equal((await live()).controls,false);
    result.fallbackPlayable=true;assert.deepEqual(result.errors,[]);console.log('WEB_LOOK_MODE_OK '+JSON.stringify(result));await context.close();continue;
   }

   let before=await live();await move(mx+250,my-100);let after=await live();
   result.horizontal=angular(after.look.x,before.look.x);result.vertical=after.look.y-before.look.y;
   assert.ok(Math.abs(result.horizontal-30)<2,'ordinary mouse motion must turn 30 degrees without holding a button');
   assert.ok(Math.abs(result.vertical+12)<2,'mouse up must look up');
   // Accumulate real yaw deltas to catch a 360-degree clamp or edge stall.
   let total=0,previous=after.look.x;
   for(let i=0;i<8;i++){await move(mx+800,my);const s=await live();total+=angular(s.look.x,previous);previous=s.look.x;}
   before=await live();await page.waitForTimeout(650);after=await live();
   assert.ok(Math.abs(angular(after.look.x,before.look.x))<.1,'stationary mouse never spins, even past the screen boundary');
   result.idleStable=true;
   result.fullTurnDegrees=total;assert.ok(total>360,'must turn more than a full circle');
   // Right click remains aim, and motion still works while aiming.
   await page.mouse.down({button:'right'});await page.waitForTimeout(200);assert.equal((await state()).aiming,true);
   before=await live();await move(mx+90,my);after=await live();
   assert.ok(Math.abs(angular(after.look.x,before.look.x)-10.8)<2);
   await page.mouse.up({button:'right'});await page.waitForTimeout(200);assert.equal((await state()).aiming,false);
   result.aim=true;
   // Esc immediately stops motion; Unity's menu resume must re-enable it.
   await page.keyboard.press('Escape');await page.waitForTimeout(400);
   assert.equal((await state()).controls,false);before=await live();await move(cx-150,cy-100);after=await live();
   assert.ok(Math.abs(angular(after.look.x,before.look.x))<.5);assert.ok(Math.abs(after.look.y-before.look.y)<.5);
   await page.mouse.click(cx,box.y+box.height*339/720,{delay:90});await page.waitForTimeout(400);
   assert.equal((await state()).controls,true);
   await move(cx,cy);before=await live();await move(cx+150,cy);after=await live();
   assert.ok(Math.abs(angular(after.look.x,before.look.x)-18)<2,'resume must restore look');result.resume=true;
   await page.screenshot({path:path.join(output,`look-web-${mode}.png`)});
   assert.deepEqual(result.errors,[]);
   console.log('WEB_LOOK_MODE_OK '+JSON.stringify(result));await context.close();
  }
 }finally{fs.writeFileSync(path.join(output,'look-web-check.json'),JSON.stringify(results,null,2));await browser.close();}
 console.log('WEB_LOOK_OK');
})().catch(e=>{console.error(e);process.exit(1);});
