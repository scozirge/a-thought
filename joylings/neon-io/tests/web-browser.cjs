const {chromium}=require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const url=process.env.NEON_WEB_URL||'http://127.0.0.1:8197/';
const validationRoom='neon-web-check-'+Date.now().toString(36);
const output=path.resolve(__dirname,'../logs/'+(process.env.NEON_RUN||('web-browser'+(process.env.NEON_PUBLIC?'-public':''))));fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const report={url,passed:false,errors:[],loads:[],checks:[],sockets:[]};
 try {
  const contexts=await Promise.all([browser.newContext({viewport:{width:1280,height:800},locale:'zh-TW'}),browser.newContext({viewport:{width:1024,height:768},locale:'zh-TW'})]);
  const pages=await Promise.all(contexts.map(c=>c.newPage()));
  async function state(page){return page.evaluate(()=>window.neonState);}
  async function ready(page,fn){await page.waitForFunction(()=>!!window.neonState,null,{timeout:150000});await page.waitForFunction(fn,null,{timeout:150000});}
  async function button(page,name){await page.waitForFunction(n=>window.neonState?.controls?.some(c=>c.name===n&&c.enabled),name,{timeout:45000});
   await page.waitForTimeout(600);
   const b=await page.evaluate(n=>neonState.controls.find(c=>c.name===n&&c.enabled),name);
   const rect=await page.locator('canvas').boundingBox(),dim=await page.locator('canvas').evaluate(c=>({w:c.width,h:c.height}));
   console.log('click',name,b.x,b.y,b.w,b.h);
   await page.mouse.click(rect.x+(b.x+b.w/2)*rect.width/dim.w,rect.y+(b.y+b.h/2)*rect.height/dim.h);}
  for(const [i,page] of pages.entries()){
   await page.addInitScript(()=>{
    const connect=AudioNode.prototype.connect;
    AudioNode.prototype.connect=function(destination,...args){
     const result=connect.call(this,destination,...args);
     if(destination===this.context.destination){
      window.neonAudioMeter ||= this.context.createAnalyser();
      connect.call(this,window.neonAudioMeter);
     }
     return result;
    };
   });
   page.on('pageerror',e=>report.errors.push(e.message));
   page.on('console',m=>{const s=m.text().replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,'[redacted-id]');if(/Exception:|abort\(|shader.*error|NullReferenceException/i.test(s))report.errors.push(s.slice(0,500));fs.appendFileSync(path.join(output,'peer-'+i+'.log'),s+'\n');});
   page.on('websocket',s=>report.sockets.push(new URL(s.url()).hostname));
   await page.goto(url+'?neonQA=1&neonRoom='+validationRoom);await page.locator('#start:enabled').waitFor({timeout:300000});
   await ready(page,()=>window.neonState?.scene==='Init'&&!neonState.started);
   report.loads.push(await page.evaluate(()=>({milliseconds:neonLoadMilliseconds,resources:performance.getEntriesByType('resource').filter(r=>r.name.includes('/Build/')).map(r=>({file:r.name.split('/').pop(),transfer:r.transferSize,encoded:r.encodedBodySize}))})));
   await page.locator('#start').click();await ready(page,()=>window.neonState?.scene==='Init');
   if(i===0){
    await page.waitForTimeout(3000);assert.equal((await state(page)).audioContextState,'running');
    report.introAudioRms=await page.evaluate(()=>{const a=window.neonAudioMeter;if(!a)return 0;const samples=new Float32Array(a.fftSize);a.getFloatTimeDomainData(samples);return Math.sqrt(samples.reduce((sum,n)=>sum+n*n,0)/samples.length);});
    assert.ok(report.introAudioRms>0.0001,'Original intro must produce actual audible audio samples');
    await page.screenshot({path:path.join(output,'intro.png')});
   }
   await ready(page,()=>window.neonState?.scene==='Lobby'&&neonState.owned===95&&neonState.controls.some(c=>c.name==='Infinity'));
   report.checks.push('peer '+i+': original intro reached; 95 features owned on fresh profile');
   await page.waitForTimeout(1500);await page.screenshot({path:path.join(output,'lobby-'+i+'.png')});
  }
  await button(pages[0],'Collection');await ready(pages[0],()=>neonState.controls.some(c=>c.name==='Part 2'));
  await pages[0].screenshot({path:path.join(output,'collection.png')});
  await pages[0].keyboard.press('Escape');await ready(pages[0],()=>neonState.controls.some(c=>c.name==='Infinity'));
  const beforeStars=(await state(pages[0])).stars;
  await button(pages[0],'Challenge');
  await ready(pages[0],()=>neonState.controls.some(c=>c.name==='Close tutorial'));
  await button(pages[0],'Close tutorial');await button(pages[0],'Loadout 0');
  await button(pages[0],'Part 0');await button(pages[0],'Skill 11');await button(pages[0],'Use skill');
  await ready(pages[0],()=>neonState.loadout?.[0]===11);assert.equal((await state(pages[0])).stars,beforeStars);
  report.checks.push('Equipped formerly paid head skill 11 without charging stars');
  await pages[0].reload();await pages[0].locator('#start:enabled').waitFor({timeout:180000});await pages[0].locator('#start').click();
  await ready(pages[0],()=>neonState.scene==='Lobby'&&neonState.controls.some(c=>c.name==='Infinity'));
  assert.equal((await state(pages[0])).loadout[0],11);assert.equal((await state(pages[0])).owned,95);
  report.checks.push('Reloading an existing browser profile preserves loadout and all 95 unlocked skills');
  for(const page of pages){
   await button(page,'Infinity');
   await ready(page,()=>neonState.controls.some(c=>c.name==='Close tutorial')||neonState.scene==='Battle');
   if((await state(page)).controls.some(c=>c.name==='Close tutorial')){
    await button(page,'Close tutorial');await page.waitForTimeout(1000);
    if((await state(page)).controls.some(c=>c.name==='Infinity'))await button(page,'Infinity');
   }
   await ready(page,()=>neonState.scene==='Battle'&&neonState.connected);
  }
  for(const page of pages)await ready(page,()=>neonState.peers>=2);
  const roomStates=await Promise.all(pages.map(state));assert.equal(roomStates[0].room,roomStates[1].room);report.room=roomStates[0].room;
  assert.ok(roomStates.every(s=>s.region==='asia'));report.region='asia';
  report.peerCounts=roomStates.map(s=>s.peers);
  report.checks.push('Two real browser clients joined the same Photon room');
  await pages[0].waitForTimeout(1500);
  for(const [i,page] of pages.entries())await page.screenshot({path:path.join(output,'battle-live-'+i+'.png')});
  if(process.env.NEON_AUDIT==='1'){
   await pages[0].evaluate(()=>window.unityInstance.SendMessage('NeonWebBridge','RunGameplayAudit'));
   await ready(pages[0],()=>!!neonState.gameplayAudit?.checks?.length);
   report.gameplayAudit=(await state(pages[0])).gameplayAudit;
   assert.equal(report.gameplayAudit.passed,true,report.gameplayAudit.failure);
   report.checks.push('Gameplay regressions executed inside the WebGL player');
  }
  // Remain connected beyond the old 40-second startup token deadline.
  await pages[0].waitForTimeout(43000);
  for(const [i,page] of pages.entries()) {const s=await state(page);assert.ok(s.connected&&s.peers>=2);assert.equal(s.error,'');await page.screenshot({path:path.join(output,'battle-'+i+'.png')});}
  report.checks.push('Both peers remained connected beyond the connection timeout');
  assert.ok(report.sockets.some(s=>/photon|exitgames/i.test(s)));assert.deepEqual(report.errors,[]);
  report.passed=true;
 } finally {
  for(const [i,context] of browser.contexts().entries())for(const page of context.pages()){
   try{fs.writeFileSync(path.join(output,'last-state-'+i+'.json'),JSON.stringify(await page.evaluate(()=>window.neonState),null,2));await page.screenshot({path:path.join(output,'last-'+i+'.png')});}catch{}
  }
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));await browser.close();
 }
 console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
