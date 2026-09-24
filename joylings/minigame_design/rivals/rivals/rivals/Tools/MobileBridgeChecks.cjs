// Exercise the actual HTML and WebGL bridge with trusted multi-touch input.
const {chromium}=require(process.env.RIVALS_PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.resolve(process.env.RIVALS_TEST_OUTPUT||'Logs/MobileControls');fs.mkdirSync(output,{recursive:true});
const template=fs.readFileSync(path.join(__dirname,'../Assets/WebGLTemplates/Rivals/index.html'),'utf8');
const bridge=fs.readFileSync(path.join(__dirname,'../Assets/Plugins/WebGL/RivalsInput.jslib'),'utf8');
const html=template.slice(0,template.indexOf('    const config='))+`
    player={SendMessage:(name,method,action)=>{if(method==='WebControlCommand'){
      if(action==='pause'){look.enabled=false;look.release();touch.setState(6);}
      if(action==='resume'){touch.setState(3);look.enabled=true;look.resume();}
      if(action==='leave'){look.enabled=false;touch.setState(0);window.rivalsReceiveLobby({visible:true,ready:true,busy:false,name:'觸控測試',message:'',rooms:[]});}
    }}};
    window.startTestGame=()=>{window.rivalsReceiveLobby({visible:false});touch.setState(3);look.enabled=true;look.resume();};
    document.getElementById('loading').style.display='none';
    window.rivalsReceiveLobby({visible:true,ready:true,busy:false,name:'觸控測試',message:'',rooms:[]});
  </script></body></html>`;
const checks=[],errors=[];function pass(label){checks.push(label);console.log('MOBILE_BRIDGE_CHECK '+label);}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.RIVALS_CHROME||undefined,headless:true});
 try{
  const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true,deviceScaleFactor:1}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://rivals.test/**',route=>route.fulfill({status:200,contentType:'text/html',body:html}));
  await page.goto('http://rivals.test/?diagnostics=1');
  assert.equal(await page.locator('#mode-touch').getAttribute('aria-pressed'),'true');
  await page.locator('#mode-keyboard').tap();await page.reload();assert.equal(await page.locator('#mode-keyboard').getAttribute('aria-pressed'),'true');
  await page.locator('#mode-touch').tap();pass('device default and persisted manual control choice');
  await page.waitForTimeout(200);await page.screenshot({path:path.join(output,'mobile-lobby-landscape.png')});
  await page.addScriptTag({content:'window.LibraryManager={library:{}};window.mergeInto=(target,values)=>Object.assign(target,values);'+bridge});
  await page.evaluate(()=>window.startTestGame());
  assert.equal(await page.evaluate(()=>!!document.pointerLockElement),false);
  assert.equal(await page.evaluate(()=>window.rivalsLook.active),true);
  const cdp=await context.newCDPSession(page),points=new Map();
  async function dispatch(type){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:[...points].map(([id,p])=>({id,...p,radiusX:3,radiusY:3,force:1}))});await page.waitForTimeout(40);}
  async function down(id,p){points.set(id,p);await dispatch('touchStart');}
  async function move(id,p){points.set(id,p);await dispatch('touchMove');}
  // End the changed contact, so Chrome keeps the other fingers pressed.
  async function up(id){const point=points.get(id);points.delete(id);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[{id,...point,radiusX:3,radiusY:3,force:0}]});await page.waitForTimeout(40);}
  async function center(selector){const b=await page.locator(selector).boundingBox();return{x:b.x+b.width/2,y:b.y+b.height/2};}
  const stick=await center('#touch-move'),fire=await center('#touch-fire');
  await down(1,stick);await move(1,{x:stick.x+60,y:stick.y-60});
  await down(2,{x:410,y:170});await move(2,{x:460,y:145});await down(3,fire);
  const combined=await page.evaluate(()=>({x:LibraryManager.library.RivalsTouchMoveX(),y:LibraryManager.library.RivalsTouchMoveY(),held:LibraryManager.library.RivalsTouchHeld(),dx:LibraryManager.library.RivalsLookX(),dy:LibraryManager.library.RivalsLookY(),fire:LibraryManager.library.RivalsTouchFirePress(),locked:!!document.pointerLockElement}));
  assert.ok(combined.x>.6&&combined.y>.6&&Math.hypot(combined.x,combined.y)<=1.001);assert.ok(combined.dx>60&&combined.dy>30);assert.ok(combined.held&1);assert.equal(combined.fire,1);assert.equal(combined.locked,false);
  await up(1);assert.equal(await page.evaluate(()=>rivalsTouch.moveX),0);assert.ok(await page.evaluate(()=>rivalsTouch.held&1));await up(2);await up(3);
  assert.equal(await page.evaluate(()=>rivalsTouch.held),0);pass('three fingers move, look and shoot independently without mouse lock');
  await page.evaluate(()=>rivalsTouch.reset());const jump=await center('#touch-jump');await down(4,jump);await up(4);
  assert.equal(await page.evaluate(()=>LibraryManager.library.RivalsTouchPressed()),4);assert.equal(await page.evaluate(()=>LibraryManager.library.RivalsTouchPressed()),0);
  assert.equal(await page.evaluate(()=>LibraryManager.library.RivalsTouchHeld()&4),4);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>LibraryManager.library.RivalsTouchHeld()&4),0);
  await down(5,fire);await down(6,{x:fire.x+10,y:fire.y});await up(5);assert.equal(await page.evaluate(()=>rivalsTouch.held&1),1);await up(6);
  assert.equal(await page.evaluate(()=>LibraryManager.library.RivalsTouchFirePress()),2);pass('short taps survive until polling and multiple fire fingers release independently');
  await down(7,stick);await move(7,{x:stick.x+40,y:stick.y});await down(8,fire);points.clear();await dispatch('touchCancel');
  assert.deepEqual(await page.evaluate(()=>[rivalsTouch.moveX,rivalsTouch.moveY,rivalsTouch.held,rivalsTouch.firePress]),[0,0,0,0]);pass('pointer cancellation clears all held inputs');
  await down(9,fire);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await up(9);
  assert.equal(await page.evaluate(()=>rivalsLook.active),false);assert.equal(await page.evaluate(()=>rivalsTouch.held),0);
  await page.locator('#resume-pointer').tap();await down(10,fire);await page.evaluate(()=>rivalsTouch.setState(2));await up(10);
  assert.equal(await page.evaluate(()=>rivalsTouch.firePress),0);assert.equal(await page.locator('#touch-controls').isVisible(),false);
  await page.evaluate(()=>rivalsTouch.setState(3));assert.equal(await page.evaluate(()=>rivalsTouch.held),0);pass('blur and death clear touches before resuming or respawning');
  await down(11,fire);await down(12,await center('#touch-menu'));await up(12);await page.waitForTimeout(120);
  assert.equal(await page.locator('#touch-pause').isVisible(),true);await up(11);
  await page.locator('#touch-resume').tap();assert.equal(await page.locator('#touch-pause').isVisible(),false);assert.equal(await page.evaluate(()=>rivalsLook.active),true);pass('phone menu opens while another finger fires and resumes cleanly');
  // Use a real fullscreen request, then the no-API and rejected-API paths.
  await page.locator('#fullscreen').tap();assert.equal(await page.evaluate(()=>!!document.fullscreenElement),true);
  assert.equal(await page.locator('#fullscreen').textContent(),'退出全螢幕');await page.locator('#fullscreen').tap();assert.equal(await page.evaluate(()=>!!document.fullscreenElement),false);pass('native fullscreen enters and exits with touch controls');
  for(const variant of ['unavailable','rejected']){
   await page.evaluate(variant=>{const stage=document.getElementById('stage');stage.requestFullscreen=variant==='unavailable'?undefined:()=>Promise.reject(new Error('blocked'));stage.webkitRequestFullscreen=undefined;},variant);
   await page.locator('#fullscreen').tap();assert.equal(await page.locator('#stage').evaluate(el=>el.classList.contains('expanded')),true);
   await page.locator('#fullscreen').tap();assert.equal(await page.locator('#stage').evaluate(el=>el.classList.contains('expanded')),false);
  }pass('unsupported or denied fullscreen fills the viewport and exits cleanly');
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(output,'mobile-controls-portrait.png')});
  for(const selector of ['#touch-move','#touch-fire','#touch-aim','#touch-jump','#touch-reload','#touch-slide','#touch-sprint']){
   const box=await page.locator(selector).boundingBox();assert.ok(box.width>=48&&box.height>=48);assert.ok(box.x>=0&&box.x+box.width<=390.1);assert.ok(box.y>=0&&box.y+box.height<=844.1);
  }pass('portrait controls remain inside the viewport with usable touch targets');
  await page.locator('#touch-menu').tap();await page.locator('#touch-leave').tap();await page.locator('#mode-keyboard').tap();
  await page.locator('#fullscreen').tap();assert.equal(await page.locator('#stage').evaluate(el=>el.classList.contains('expanded')),true);await page.locator('#fullscreen').tap();
  assert.equal(await page.locator('#touch-controls').isVisible(),false);pass('return to lobby and switch back to keyboard with fullscreen available');
  await page.evaluate(()=>{delete document.getElementById('stage').requestFullscreen;delete document.getElementById('stage').webkitRequestFullscreen;});
  await page.locator('#fullscreen').tap();assert.equal(await page.evaluate(()=>!!document.fullscreenElement),true);await page.locator('#fullscreen').tap();assert.equal(await page.evaluate(()=>!!document.fullscreenElement),false);pass('keyboard mode also enters and exits native fullscreen');
  const denied=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  await denied.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('storage disabled');};Storage.prototype.setItem=()=>{throw new Error('storage disabled');};});
  const deniedPage=await denied.newPage();deniedPage.on('pageerror',e=>errors.push(e.message));await deniedPage.route('http://rivals.test/**',route=>route.fulfill({status:200,contentType:'text/html',body:html}));await deniedPage.goto('http://rivals.test/');await deniedPage.locator('#mode-keyboard').tap();assert.equal(await deniedPage.locator('#mode-keyboard').getAttribute('aria-pressed'),'true');pass('control choice works when browser storage is denied');
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'mobile-bridge-check.json'),JSON.stringify({ok:true,checks,errors},null,2));console.log('MOBILE_BRIDGE_OK '+checks.length);
 }finally{await browser.close();}
})().catch(error=>{fs.writeFileSync(path.join(output,'mobile-bridge-check.json'),JSON.stringify({ok:false,checks,errors,error:error.stack},null,2));console.error(error);process.exit(1);});
