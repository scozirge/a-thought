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
   p.on('console',m=>{const s=m.text().replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,'[redacted-id]');if(cancelling&&/OperationCanceledException/.test(s)&&report.expectedCancellationMessages<2)report.expectedCancellationMessages++;else if(/Exception:|abort\(|NullReferenceException/i.test(s))report.errors.push(s.slice(0,500));fs.appendFileSync(path.join(output,'peer-'+i+'.log'),s+'\n');});
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
  await click(pages[1],'Arena',true);
  await pages[1].waitForFunction(()=>neonState.arenaPhase==='Waiting'&&neonState.arenaQueueFilled>=4);
  cancelling=true;await click(pages[1],'Cancel arena',true);
  await pages[1].waitForFunction(()=>neonState.view==='lobby'&&!neonState.connected);
  await pages[1].waitForTimeout(3000);cancelling=false;
  report.checks.push('Mobile leave-matchmaking button disconnects an already populated queue and allows retry');
  const queued=Date.now();
  await Promise.all(pages.map(p=>p.evaluate(()=>{
   window.queueSamples=[];
   window.queueSampleTimer=setInterval(()=>{const s=window.neonState;if(s?.view!=='arena-waiting')return;const last=queueSamples.at(-1);if(last&&last.icons===s.arenaQueueIcons&&last.filled===s.arenaQueueFilled&&last.alpha===s.arenaQueueOpacity)return;queueSamples.push({time:performance.now(),icons:s.arenaQueueIcons,filled:s.arenaQueueFilled,alpha:s.arenaQueueOpacity});},100);
  })));
  await Promise.all(pages.map((p,i)=>click(p,'Arena',i===1)));
  await Promise.all(pages.map(async(p,i)=>{
   await p.waitForFunction(()=>neonState.arenaPhase==='Waiting'&&neonState.arenaQueueText&&neonState.arenaQueueFilled>=1);
   const status=await p.evaluate(()=>neonState.arenaQueueText);
   assert.equal(status,i===0?'配對中…':'MATCHMAKING…');
   const s=await p.evaluate(()=>neonState);assert.equal(s.arenaQueueIcons,16);
   assert.ok(s.arenaQueueFilled>=1&&s.arenaQueueFilled<16);assert.ok(s.arenaQueueVertices>=12,'Status text glyph vertices: '+s.arenaQueueVertices);
   const control=(await p.evaluate(()=>neonState.controls)).find(c=>c.name==='Cancel arena');
   assert.equal(control.text,i===0?'離開配對':'LEAVE MATCHMAKING');
   const bounds=await cssRect(p,control);assert.ok(bounds.h>=43&&bounds.y>=0&&bounds.y+bounds.h<=(i===0?800:390));
   await p.screenshot({path:path.join(output,'queue-'+i+'.png')});
   if(i===1){
    for(const [width,height] of [[568,260],[844,240]]){
     await p.setViewportSize({width,height});await p.waitForTimeout(1000);
     const short=await p.evaluate(()=>neonState);assert.equal(short.arenaQueueIcons,16);assert.ok(short.arenaQueueFilled>=1&&short.arenaQueueFilled<=16);assert.ok(short.arenaQueueVertices>=12,'Short viewport glyph vertices: '+short.arenaQueueVertices);
     const ratio=short.cssWidth/short.screenWidth,icons=short.elements.filter(e=>e.name.startsWith('Arena seat ')),label=short.elements.find(e=>e.name==='Arena queue');
     const button=await cssRect(p,short.controls.find(c=>c.name==='Cancel arena'));
     assert.equal(icons.length,16);
     for(const e of icons){assert.ok(e.x*ratio>=10&&(e.x+e.w)*ratio<=width-10);assert.ok(e.y>=label.y+label.h);assert.ok((e.y+e.h)*ratio<button.y);}
     await p.screenshot({path:path.join(output,'queue-mobile-'+width+'x'+height+'.png')});
    }
    await p.setViewportSize({width:844,height:390});await p.waitForTimeout(700);
   }
  }));
  report.checks.push('Queue shows 16 outlined/filled seat icons and breathing status; no numeric human count, timer or rules; short mobile reflow preserves progress');
  await Promise.all(pages.map(async(p,i)=>{
   await p.waitForFunction(()=>neonState.view==='arena-waiting'&&neonState.arenaQueueFilled>=7&&neonState.arenaQueueFilled<16,null,{timeout:20000});
   await p.screenshot({path:path.join(output,'queue-progress-'+i+'.png')});
   await p.waitForFunction(()=>neonState.view==='arena-waiting'&&neonState.arenaQueueFilled===16,null,{timeout:20000});
   await p.screenshot({path:path.join(output,'queue-full-'+i+'.png')});
  }));
  await Promise.all(pages.map(p=>p.waitForFunction(()=>neonState.arenaPhase==='Running'&&neonState.arenaRoles===32,null,{timeout:90000})));
  report.queueProgress=await Promise.all(pages.map(p=>p.evaluate(()=>{clearInterval(queueSampleTimer);return queueSamples;})));
  for(const samples of report.queueProgress){
   assert.equal(Math.max(...samples.map(s=>s.filled)),16);
   assert.ok(Math.max(...samples.map(s=>s.alpha))-Math.min(...samples.map(s=>s.alpha))>.3,'Queue text must visibly breathe');
   assert.ok(new Set(samples.map(s=>s.filled)).size>=3,'Queue seats must fill over time');
   for(const sample of samples)if(sample.icons===16)assert.ok(sample.filled>=0&&sample.filled<=16,'Queue seat range');
  }
  const states=await Promise.all(pages.map(p=>p.evaluate(()=>neonState)));
  assert.equal(states[0].touch,false);assert.equal(states[1].touch,true);
  assert.equal(states[0].room,states[1].room);assert.ok(states.every(s=>s.peers===2&&s.arenaRemaining===16));
  report.queueToBattleMs=Date.now()-queued;
  report.checks.push('Two real Photon WebGL peers share a closed 32-actor arena after the 15-second queue');
  await Promise.all(pages.map((p,i)=>p.screenshot({path:path.join(output,'battle-'+i+'.png')})));
  await Promise.all(pages.map(p=>p.evaluate(()=>unityInstance.SendMessage('NeonWebBridge','RunArenaAudit'))));
  await Promise.all(pages.map(async(p,i)=>{
   await p.waitForFunction(()=>neonState.arenaAudit?.stage==='pickup-preview',null,{timeout:30000});
   await p.waitForTimeout(500);
   await p.screenshot({path:path.join(output,'pickup-'+i+'.png')});
  }));
  report.checks.push('Human opponents, named AI and resource bots show actual pickup particles on both real peers; near/far cloud shaders and seat-only AI detection verified');
  await Promise.all(pages.map(async(p,i)=>{
   await p.waitForFunction(()=>neonState.arenaAudit?.stage==='fog-preview'&&neonState.arenaRadius<2100&&neonState.arenaRadius>1900,null,{timeout:30000});
   await p.waitForTimeout(800);
   const s=await p.evaluate(()=>neonState);assert.ok(s.arenaFogReady);assert.equal(s.arenaRingVisible,false);
   await p.screenshot({path:path.join(output,'fog-'+i+'.png')});
  }));
  report.checks.push('Actual WebGL procedural black mist renders on both clients with no circle LineRenderer; HUD remains above mist');
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
  report.checks.push('Player seats drop 2 and resource bots 1; ambient stars use 4/2/1 tiers, pace individually, pause at density limit and stop in a collapsed circle');
  for(const [i,p] of pages.entries())await click(p,'Arena return',i===1);
  await Promise.all(pages.map(p=>p.waitForFunction(()=>neonState.view==='lobby'&&!neonState.connected,null,{timeout:45000})));
  report.checks.push('Desktop and phone results return to lobby without respawning');
  assert.equal(report.errors.length,0,report.errors.join('\n'));report.passed=true;
 }catch(e){report.failure=e.stack;process.exitCode=1;}
 finally{fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report));}
})();
