const {chromium,devices}=require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {click,cssRect}=require('./web-controls.cjs');
const url=process.env.NEON_WEB_URL||'http://127.0.0.1:8200/';
const output=path.resolve(__dirname,'../logs/'+(process.env.NEON_RUN||'web-arena'));fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const report={url,passed:false,checks:[],errors:[],results:[],expectedCancellationMessages:0};
 let cancelling=false;
 try{
  const contexts=await Promise.all([
   browser.newContext({viewport:{width:1280,height:800},locale:'zh-TW'}),
   browser.newContext({...devices['iPhone 13'],viewport:{width:844,height:390},deviceScaleFactor:2,locale:'en-US'})
  ]);
  const pages=await Promise.all(contexts.map(c=>c.newPage()));
  const room='neon-web-check-arena-'+Date.now().toString(36);
  await Promise.all(pages.map(async(p,i)=>{
   p.on('pageerror',e=>report.errors.push(e.message));
   p.on('console',m=>{const s=m.text().replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,'[redacted-id]');if(i===0&&cancelling&&/OperationCanceledException/.test(s)&&report.expectedCancellationMessages===0)report.expectedCancellationMessages++;else if(/Exception:|abort\(|NullReferenceException/i.test(s))report.errors.push(s.slice(0,500));fs.appendFileSync(path.join(output,'peer-'+i+'.log'),s+'\n');});
   await p.goto(url+'?neonQA=1&neonRoom='+room);
   await p.waitForFunction(()=>window.neonState?.view==='lobby',null,{timeout:300000});
   await p.screenshot({path:path.join(output,'lobby-'+i+'.png')});
   for(const name of ['Arena','Infinity','Challenge'])assert.ok((await p.evaluate(()=>neonState.controls)).some(c=>c.name===name&&c.enabled));
  }));
  report.checks.push('Three playable menu modes on desktop and mobile; original intro reaches lobby');
  await click(pages[0],'Arena',false);
  await pages[0].waitForFunction(()=>neonState.view==='arena-waiting');
  cancelling=true;await click(pages[0],'Cancel arena',false);
  await pages[0].waitForFunction(()=>neonState.view==='lobby'&&!neonState.connected);
  await pages[0].waitForTimeout(3000);
  cancelling=false;
  report.checks.push('Cancel arena matchmaking returns to lobby');
  const queued=Date.now();
  await Promise.all(pages.map((p,i)=>click(p,'Arena',i===1)));
  await Promise.all(pages.map(p=>p.waitForFunction(()=>neonState.arenaPhase==='Running'&&neonState.arenaRoles===32,null,{timeout:90000})));
  const states=await Promise.all(pages.map(p=>p.evaluate(()=>neonState)));
  assert.equal(states[0].touch,false);assert.equal(states[1].touch,true);
  assert.equal(states[0].room,states[1].room);assert.ok(states.every(s=>s.peers===2&&s.arenaRemaining===16));
  report.queueToBattleMs=Date.now()-queued;
  report.checks.push('Two real Photon WebGL peers share a closed 32-actor arena after the 15-second queue');
  await Promise.all(pages.map((p,i)=>p.screenshot({path:path.join(output,'battle-'+i+'.png')})));
  await Promise.all(pages.map(p=>p.evaluate(()=>unityInstance.SendMessage('NeonWebBridge','RunArenaAudit'))));
  await Promise.all(pages.map(p=>p.waitForFunction(()=>neonState.arenaAudit?.passed||neonState.arenaAudit?.failure,null,{timeout:90000})));
  for(const [i,p] of pages.entries()){
   const state=await p.evaluate(()=>neonState);assert.equal(state.arenaAudit.passed,true,JSON.stringify(state.arenaAudit));report.results.push(state.arenaAudit);
   await p.waitForFunction(()=>neonState.view==='arena-result');
   const b=(await p.evaluate(()=>neonState.controls)).find(c=>c.name==='Arena return');assert.ok(b?.enabled);
   const r=await cssRect(p,b);assert.ok(r.y>=0&&r.y+r.h<=(i===1?390:800)&&r.h>=44-1);
   await p.screenshot({path:path.join(output,'result-'+i+'.png')});
   if(i===1){
    await p.setViewportSize({width:568,height:260});await p.waitForTimeout(1500);
    const short=(await p.evaluate(()=>neonState.controls)).find(c=>c.name==='Arena return');const bounds=await cssRect(p,short);
    assert.ok(bounds.y>=0&&bounds.y+bounds.h<=260&&bounds.h>=43);
    await p.screenshot({path:path.join(output,'result-mobile-short.png')});
   }
  }
  report.checks.push('NPC deaths are unranked; player seats rank; damage excludes overkill; repeat deaths ignored; rank 1..16 unique; rewards granted once');
  for(const [i,p] of pages.entries())await click(p,'Arena return',i===1);
  await Promise.all(pages.map(p=>p.waitForFunction(()=>neonState.view==='lobby'&&!neonState.connected,null,{timeout:45000})));
  report.checks.push('Desktop and phone results return to lobby without respawning');
  assert.equal(report.errors.length,0,report.errors.join('\n'));report.passed=true;
 }catch(e){report.failure=e.stack;process.exitCode=1;}
 finally{fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report));}
})();
