// Exercise real WebGL startup under both browser autoplay policies, with no start gate.
const {chromium}=require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const url=process.env.NEON_WEB_URL||'http://127.0.0.1:8200/';
const output=path.resolve(__dirname,'../logs/'+(process.env.NEON_RUN||'novarove-autostart'));fs.mkdirSync(output,{recursive:true});
(async()=>{
 const report={passed:false,url,checks:[],errors:[]};
 try{for(const allowed of [false,true]){
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding',allowed?'--autoplay-policy=no-user-gesture-required':'--autoplay-policy=document-user-activation-required','--disable-features=PreloadMediaEngagementData,MediaEngagementBypassAutoplayPolicies']});
  try{
   const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:2,locale:'zh-TW'});page.on('pageerror',e=>report.errors.push(e.message));
   // Read without granting synthetic user activation during the blocked-audio case.
   const cdp=await page.context().newCDPSession(page);
   const passive=async fn=>{const r=await cdp.send('Runtime.evaluate',{expression:'('+fn.toString()+')()',returnByValue:true,userGesture:false});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;};
   async function until(fn,ms=120000){const end=Date.now()+ms;while(Date.now()<end){if(await passive(fn))return;await new Promise(r=>setTimeout(r,150));}throw Error('Timed out: '+fn.toString());}
   async function capture(name){const r=await cdp.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(output,name+'.png'),Buffer.from(r.data,'base64'));}
   await page.addInitScript(()=>{
    const connect=AudioNode.prototype.connect;
    AudioNode.prototype.connect=function(destination,...args){const r=connect.call(this,destination,...args);if(destination===this.context.destination){window.audioMeter ||= this.context.createAnalyser();connect.call(this,window.audioMeter);}return r;};
   });
   await page.goto(url+'?neonQA=1');
   await until(()=>window.neonState?.started&&neonState.scene==='Init',300000);
   assert.ok(await passive(()=>!document.querySelector('#start')&&!document.querySelector('a')&&document.querySelector('#loading').hidden));
   await new Promise(r=>setTimeout(r,2000));
   if(allowed){await until(()=>neonState.audioContextState==='running');assert.ok(await passive(()=>document.querySelector('#sound').hidden));}
   else{assert.equal(await passive(()=>neonState.audioContextState),'suspended');assert.ok(await passive(()=>!document.querySelector('#sound').hidden));}
   await capture((allowed?'allowed':'blocked')+'-intro');
   await until(()=>neonState.view==='lobby'&&neonState.scene==='Lobby',90000);
   const load=await passive(()=>neonLoadStarted);
   report.checks.push(`${allowed?'Allowed':'Blocked'} audio: original intro and lobby run automatically without a pointer gesture`);
   if(!allowed){assert.equal(await passive(()=>neonState.audioContextState),'suspended');assert.ok(await passive(()=>!navigator.userActivation.hasBeenActive));await page.locator('#sound').click();await until(()=>neonState.audioContextState==='running');assert.ok(await passive(()=>document.querySelector('#sound').hidden));assert.equal(await passive(()=>neonState.scene),'Lobby');assert.equal(await passive(()=>neonLoadStarted),load);}
   await page.waitForTimeout(800);
   const rms=await page.evaluate(()=>{const a=window.audioMeter;if(!a)return 0;const s=new Float32Array(a.fftSize);a.getFloatTimeDomainData(s);return Math.sqrt(s.reduce((n,v)=>n+v*v,0)/s.length);});
   assert.ok(rms>.0001,'Real audio samples play after the browser allows audio');
   report.checks.push(`${allowed?'Automatic':'Tap-to-enable'} audio produces samples (RMS ${rms.toFixed(5)}) without restarting the intro`);
   await page.screenshot({path:path.join(output,(allowed?'allowed':'blocked')+'-lobby.png'),scale:'css'});
  }finally{await browser.close();}
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
 }catch(e){report.failure=e.stack;process.exitCode=1;}
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})();
