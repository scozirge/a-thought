// Isolated browser-bridge checks using the exact template code, without Unity.
const {chromium}=require(process.env.RIVALS_PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../Assets/WebGLTemplates/Rivals/index.html'),'utf8');
const html=source.slice(0,source.indexOf('    const config='))+`player={SendMessage:(name,method)=>{if(method==='PauseControls'){look.enabled=false;look.release();}}};document.getElementById('loading').style.display='none';</script></body></html>`;
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.RIVALS_CHROME||undefined,headless:true});const results=[];
 try{
  for(const mode of ['locked','rejected','legacy-error','silent-request','unavailable','false-success']){
   const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('http://localhost:8184/**',route=>route.fulfill({status:200,contentType:'text/html',body:html}));
   await page.addInitScript(mode=>{
    const native=HTMLCanvasElement.prototype.requestPointerLock;
    if(mode==='unavailable'){HTMLCanvasElement.prototype.requestPointerLock=undefined;return;}
    HTMLCanvasElement.prototype.requestPointerLock=function(...args){
     window.requests=(window.requests||0)+1;
     if(mode==='locked'||window.allowNative)return native.apply(this,args);
     if(mode==='rejected')return Promise.reject(new Error('rejected'));
     if(mode==='legacy-error')setTimeout(()=>document.dispatchEvent(new Event('pointerlockerror')),0);
     if(mode==='false-success')return Promise.resolve();
    };
   },mode);
   await page.goto('http://localhost:8184/?diagnostics=1&bridge=1');await page.evaluate(()=>window.rivalsLook.enabled=true);
   const box=await page.locator('canvas').boundingBox(),cx=box.x+box.width/2,cy=box.y+box.height/2;
   await page.locator('#resume-pointer').click();await page.waitForTimeout(mode==='silent-request'||mode==='false-success'?1700:200);
   if(mode!=='locked'){
    assert.equal(await page.evaluate(()=>window.rivalsLook.active),true,'restricted browsers allow deliberate drag controls');
    assert.equal(await page.locator('#control-resume').isVisible(),false);
    assert.equal(await page.locator('#drag-help').isVisible(),true);
    assert.notEqual(await page.locator('canvas').evaluate(el=>getComputedStyle(el).cursor),'none');
    await page.mouse.move(cx,cy);await page.mouse.move(1439,cy,{steps:10});await page.waitForTimeout(500);
    await page.keyboard.down('e');await page.waitForTimeout(200);await page.keyboard.up('e');
    assert.deepEqual(await page.evaluate(()=>({x:window.rivalsLook.x,y:window.rivalsLook.y})),{x:0,y:0});
    assert.equal(await page.evaluate(()=>window.rivalsPointer.pending),false);
    const requests=await page.evaluate(()=>window.requests||0);
    let total=0;
    for(let swipe=0;swipe<5;swipe++){
     await page.mouse.move(cx-300,cy);await page.mouse.down({button:'right'});
     assert.equal(await page.locator('canvas').evaluate(el=>getComputedStyle(el).cursor),'none');
     await page.mouse.move(cx+300,cy-40,{steps:12});
     const delta=await page.evaluate(()=>({x:window.rivalsLook.x,y:window.rivalsLook.y}));
     assert.ok(Math.abs(delta.x-600)<2);assert.ok(Math.abs(delta.y-40)<2);total+=delta.x;
     await page.waitForTimeout(100);assert.deepEqual(await page.evaluate(()=>({x:window.rivalsLook.x,y:window.rivalsLook.y})),delta,'stationary drag never spins');
     await page.mouse.up({button:'right'});await page.mouse.move(cx,cy);
     assert.deepEqual(await page.evaluate(()=>({x:window.rivalsLook.x,y:window.rivalsLook.y})),{x:0,y:0},'repositioning does not turn');
    }
    assert.ok(total>=3000);assert.equal(await page.evaluate(()=>window.requests||0),requests,'gameplay never repeatedly requests a denied lock');
    await page.mouse.down({button:'right'});await page.locator('#fullscreen').focus();await page.mouse.up({button:'right'});
    assert.equal(await page.evaluate(()=>window.rivalsLook.active),false);await page.locator('#resume-pointer').click();
    await page.mouse.move(cx+100,cy);assert.equal(await page.evaluate(()=>window.rivalsLook.x),0,'focus recovery discards held drag');
    if(mode!=='unavailable'){
     await page.evaluate(()=>window.allowNative=true);await page.locator('#retry-pointer').click();await page.waitForTimeout(220);
     assert.equal(await page.evaluate(()=>window.rivalsLook.active),true,'retry succeeds after browser permits lock');
    }
   }
   if(mode!=='unavailable'){
    assert.equal(await page.evaluate(()=>!!document.pointerLockElement),true);
    await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('canvas')),true);
    await page.mouse.move(cx,cy);await page.evaluate(()=>window.rivalsLook.x=window.rivalsLook.y=0);
    await page.mouse.move(cx+4000,cy);assert.ok(Math.abs(await page.evaluate(()=>window.rivalsLook.x)-4000)<2,'relative movement is unbounded');
    await page.evaluate(()=>window.rivalsLook.x=window.rivalsLook.y=0);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>window.rivalsLook.x),0,'stationary mouse never creates input');
    await page.locator('#fullscreen').focus();await page.locator('canvas').focus();await page.waitForTimeout(180);
    assert.equal(await page.evaluate(()=>window.rivalsLook.active),false);assert.notEqual(await page.locator('canvas').evaluate(el=>getComputedStyle(el).cursor),'none');
    await page.locator('#resume-pointer').click();await page.waitForTimeout(220);assert.equal(await page.evaluate(()=>window.rivalsLook.active),true);
   }
   await page.keyboard.press('Escape');await page.waitForTimeout(180);assert.equal(await page.locator('#control-resume').isVisible(),false);
   assert.equal(await page.evaluate(()=>window.rivalsLook.active),false);assert.deepEqual(errors,[]);results.push({mode,ok:true});await page.close();
  }
  // Exercise the actual browser sandbox restriction, without mocking its API.
  for(const permitted of [false,true]){
   const page=await browser.newPage({viewport:{width:1440,height:1000}});
   await page.route('http://localhost:8184/**',route=>route.fulfill({status:200,contentType:'text/html',body:route.request().url().includes('/wrapper')?`<iframe src="/?diagnostics=1" sandbox="allow-scripts allow-same-origin ${permitted?'allow-pointer-lock':''}" style="width:1400px;height:950px;border:0"></iframe>`:html}));
   await page.goto('http://localhost:8184/wrapper');const frame=page.frames().find(f=>f.parentFrame());
   await frame.waitForFunction(()=>window.rivalsLook);await frame.evaluate(()=>window.rivalsLook.enabled=true);
   await frame.locator('#resume-pointer').click();await page.waitForTimeout(220);
   assert.equal(await frame.evaluate(()=>window.rivalsLook.active),true);
   assert.equal(await frame.evaluate(()=>!!document.pointerLockElement),permitted);
   assert.equal(await frame.locator('#drag-help').isVisible(),!permitted);
   if(!permitted){
    const rect=await frame.locator('canvas').boundingBox();const x=rect.x+rect.width/2,y=rect.y+rect.height/2;
    await page.mouse.move(x,y);await page.mouse.down({button:'right'});await page.mouse.move(x+100,y,{steps:5});
    assert.ok(Math.abs(await frame.evaluate(()=>window.rivalsLook.x)-100)<2);await page.mouse.up({button:'right'});
   }
   results.push({mode:permitted?'iframe-permitted':'iframe-blocked',ok:true});await page.close();
  }
  fs.writeFileSync(path.join(__dirname,'../Logs/pointer-lock-bridge-check.json'),JSON.stringify(results,null,2));console.log('POINTER_BRIDGE_OK '+JSON.stringify(results));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
