// Three real Photon WebGL clients exercise death scatter, interception and melee overlap.
const {chromium,devices}=require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {click}=require('./web-controls.cjs');
const url=process.env.NEON_WEB_URL||'http://127.0.0.1:8201/';
const output=path.resolve(__dirname,'../logs/'+(process.env.NEON_RUN||'web-death-loot'));fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const report={url,passed:false,errors:[],results:[]};
 try{
  const room='neon-web-check-flight-'+Date.now().toString(36);
  const contexts=await Promise.all([browser.newContext({viewport:{width:1024,height:768},locale:'zh-TW'}),browser.newContext({viewport:{width:1024,height:768},locale:'zh-TW'}),browser.newContext({...devices['iPhone 13'],viewport:{width:844,height:390},locale:'zh-TW'})]);
  const pages=await Promise.all(contexts.map(c=>c.newPage()));
  await Promise.all(pages.map(async(p,i)=>{
   p.on('pageerror',e=>report.errors.push(e.message));
   p.on('console',m=>{const s=m.text().replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,'[redacted-id]');if(/Exception:|abort\(|NullReferenceException/i.test(s))report.errors.push(s.slice(0,500));fs.appendFileSync(path.join(output,'peer-'+i+'.log'),s+'\n');});
   await p.goto(url+'?neonQA=1&neonRoom='+room);
   await p.waitForFunction(()=>window.neonState?.view==='lobby',null,{timeout:300000});
   await click(p,'Infinity',i===2);
   await p.waitForFunction(()=>neonState.controls.some(c=>c.name==='Close tutorial')||neonState.scene==='Battle');
   if((await p.evaluate(()=>neonState.controls)).some(c=>c.name==='Close tutorial')){
    await click(p,'Close tutorial',i===2);
    await p.waitForTimeout(1000);
    if((await p.evaluate(()=>neonState.controls)).some(c=>c.name==='Infinity'))await click(p,'Infinity',i===2);
   }
   await p.waitForFunction(()=>neonState.scene==='Battle'&&neonState.playerAlive&&neonState.peers===3,null,{timeout:90000});
  }));
  assert.equal(new Set(await Promise.all(pages.map(p=>p.evaluate(()=>neonState.room)))).size,1);
  await Promise.all(pages.map(p=>p.evaluate(()=>unityInstance.SendMessage('NeonWebBridge','RunDeathLootAudit'))));
  await Promise.all(pages.map(async(p,i)=>{
   await p.waitForFunction(()=>neonState.deathLootAudit?.passed||neonState.deathLootAudit?.failure,null,{timeout:120000});
   const result=await p.evaluate(()=>neonState.deathLootAudit);report.results[i]=result;
   await p.screenshot({path:path.join(output,'complete-'+i+'.png')});
   assert.equal(result.passed,true,JSON.stringify(result));
  }));
  assert.equal(report.errors.length,0,report.errors.join('\n'));report.passed=true;
 }catch(e){report.failure=e.stack;process.exitCode=1;}
 finally{fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report));}
})();
