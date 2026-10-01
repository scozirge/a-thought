// Exercise real pointer locks and the exact shipping lesson/bridge code.
const {chromium}=require(process.env.RIVALS_PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const template=path.resolve(__dirname,'../Assets/WebGLTemplates/Rivals');
const source=fs.readFileSync(path.join(template,'index.html'),'utf8');
const html=source.slice(0,source.indexOf('    const config='))+`player={SendMessage:()=>{}};document.getElementById('loading').style.display='none';</script><script src="learning.js"></script></body></html>`;
const output=path.resolve(process.env.RIVALS_TEST_OUTPUT||'Logs/RespawnPointer');
fs.mkdirSync(output,{recursive:true});
const results=[];
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.RIVALS_CHROME||undefined,headless:true});
 try{
  for(const mode of ['native','rejected']){
   const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   if(mode==='rejected')await page.addInitScript(()=>HTMLCanvasElement.prototype.requestPointerLock=function(){return Promise.reject(new Error('restricted frame'));});
   await page.route('http://localhost:8184/**',route=>{
    const name=new URL(route.request().url()).pathname.split('/').at(-1);
    const asset=['learning.js','learning.css','asset-delivery.js'].includes(name);
    return route.fulfill({status:200,contentType:asset?(name.endsWith('.js')?'text/javascript':'text/css'):'text/html',body:asset?fs.readFileSync(path.join(template,name),'utf8'):html});
   });
   await page.goto('http://localhost:8184/?diagnostics=1');
   await page.evaluate(()=>{
    window.rivalsTouch.started=true;window.rivalsTouch.playable=true;window.rivalsLook.enabled=true;
    window.qaLife=0;
    window.qaDeath=complete=>{
     window.rivalsLook.suspendForRespawn();window.rivalsTouch.playable=false;
     window.qaView={visible:true,state:complete?3:1,life:++window.qaLife,question:complete?15:0,title:'測試題',options:['第一個','第二個'],badges:1,weapons:[1,2,7],selected:2,seconds:3,correct:true};
     window.rivalsReceiveLearning(window.qaView);
    };
    window.rivalsLearningCommand=command=>{
     if(command.startsWith('learning:answer:'))qaView.state=2;
     else if(command.startsWith('learning:continue:'))qaView.state=3;
     else if(command.startsWith('learning:weapon:'))qaView.selected=Number(command.split(':').at(-1));
     window.rivalsReceiveLearning(qaView);
    };
    window.qaFinish=playable=>{
     window.qaFinishDone=false;window.qaResumePrompts=0;
     setTimeout(()=>{
      window.qaActivation=navigator.userActivation.isActive;
      window.rivalsReceiveLearning({visible:false});
      window.rivalsLook.enabled=playable;window.rivalsTouch.playable=playable;
      let frames=0;const observe=()=>{if(!document.getElementById('control-resume').hidden)window.qaResumePrompts++;if(++frames<8)requestAnimationFrame(observe);};requestAnimationFrame(observe);
      window.qaFinishDone=true;
     },5500);
    };
   });
   const check=(ok,label)=>{assert.ok(ok,mode+': '+label);results.push({mode,label});console.log('RESPAWN_POINTER_CHECK '+mode+' '+label);};
   const wait=()=>page.waitForFunction(()=>window.qaFinishDone&&!window.rivalsPointer.pending,null,{timeout:15000});
   await page.locator('#resume-pointer').click();await page.waitForFunction(()=>window.rivalsLook.active);
   await page.evaluate(()=>window.qaDeath(false));
   check(!(await page.evaluate(()=>!!document.pointerLockElement)),'quiz releases the cursor');
   await page.locator('[data-option="0"]').click();await page.locator('#learning-next').click();
   await page.locator('#learning-weapons [data-weapon="1"]').click();
   check(await page.locator('#learning-weapons [data-weapon="1"]').getAttribute('aria-pressed')==='true','countdown weapon selection remains usable');
   await page.evaluate(()=>window.qaFinish(true));await wait();
   check(await page.evaluate(()=>window.qaActivation)===false,'resume runs after transient click activation expires');
   check(await page.evaluate(()=>window.rivalsLook.active),'quiz respawn restores gameplay without another click');
   check(!(await page.locator('#control-resume').isVisible()),'no extra resume overlay after quiz');
   await page.waitForTimeout(180);
   check(await page.evaluate(()=>window.qaResumePrompts)===0,'automatic lock request never flashes a resume prompt');
   check(await page.evaluate(()=>!!document.pointerLockElement)===(mode==='native'),'native lock or previous drag mode restored');
   await page.evaluate(()=>{window.qaDeath(true);window.qaFinish(true);});await wait();
   check(await page.evaluate(()=>!window.qaActivation&&window.rivalsLook.active),'completed lessons resume without any countdown click');
   await page.evaluate(()=>{window.qaDeath(true);window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));window.qaFinish(true);});await wait();
   check(!(await page.evaluate(()=>window.rivalsLook.active)),'leaving and returning to the window cancels automatic resume');
   check(await page.locator('#control-resume').isVisible(),'focus-loss recovery remains available');
   await page.locator('#resume-pointer').click();await page.waitForFunction(()=>window.rivalsLook.active);
   await page.evaluate(()=>window.qaDeath(true));await page.keyboard.press('Escape');
   await page.evaluate(()=>window.qaFinish(true));await wait();
   check(!(await page.evaluate(()=>window.rivalsLook.active)),'Escape cancels pending resume');
   await page.locator('#resume-pointer').click();await page.waitForFunction(()=>window.rivalsLook.active);
   await page.evaluate(()=>{window.qaDeath(true);window.qaFinish(false);});await wait();
   await page.evaluate(()=>{window.rivalsTouch.playable=true;window.rivalsLook.enabled=true;});
   check(!await page.evaluate(()=>window.rivalsLook.active)&&await page.locator('#control-resume').isVisible(),'ending the round discards pending resume');
   check(errors.length===0,'no script errors');await page.close();
  }
 }finally{await browser.close();fs.writeFileSync(path.join(output,'respawn-pointer-results.json'),JSON.stringify(results,null,2)+'\n');}
 console.log('RESPAWN_POINTER_OK checks='+results.length);
})().catch(error=>{console.error(error);process.exitCode=1;});
