const {chromium}=require(process.env.RIVALS_PLAYWRIGHT_MODULE||'playwright');const {enterRoom}=require('./WebRoomHelpers.cjs');
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),result={runs:[],errors:[]};const angle=(a,b=0)=>((a-b+540)%360)-180;
(async()=>{const b=await chromium.launch({executablePath:process.env.RIVALS_CHROME,headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 try{for(const mode of (process.argv.includes('--fallback')?['fallback']:['locked','fallback'])){
  const c=await b.newContext({viewport:{width:1440,height:1000}}),p=await c.newPage();
  if(mode==='fallback')await p.addInitScript(()=>HTMLCanvasElement.prototype.requestPointerLock=function(){return Promise.reject(new Error('Embedded browser simulation'));});
  p.on('pageerror',e=>result.errors.push(e.message));p.on('console',m=>{if(/^(InvalidOperationException|NullReferenceException|MissingReferenceException|ArgumentException):/.test(m.text()))result.errors.push(m.text());});
  await p.goto((process.env.RIVALS_WEB_URL||'http://localhost:8184/')+'?diagnostics=1&v=solo-camera');await enterRoom(p,{name:'單人貓貓',room:'solo-camera'});
  const box=await p.locator('canvas').boundingBox();await p.mouse.click(box.x+box.width/2,box.y+box.height/2);await p.mouse.move(mode==='fallback'?box.x+box.width-1:box.x+box.width/2+250,box.y+box.height/2,{steps:12});await p.waitForTimeout(200);
  const state=()=>p.evaluate(()=>window.rivalsDiagnostics),me=s=>s.players.find(x=>x.seat===s.localSeat);
  let previous=await state();assert.equal(previous.players.filter(x=>x.bot).length,7);assert.equal(previous.players.filter(x=>!x.bot).length,1);
  const run={mode,initialLife:me(previous).spawnSequence,maxIdleYaw:0,maxIdlePitch:0,maxCameraYaw:0,maxCameraPitch:0,maxHitRoll:0,botMovements:0,hits:0,death:false,respawned:false,samples:[]};result.runs.push(run);
  const deadline=Date.now()+180000;
  // Deliberately keep hands off: bot locomotion, incoming shots, elimination
  // and respawns occur naturally in the actual game.
  while(Date.now()<deadline){await p.waitForTimeout(110);const s=await state(),local=me(s),old=me(previous);
   const sample={phase:s.phase,life:local.spawnSequence,health:local.health,damage:local.damage,fall:local.fall,look:s.look,camera:s.cameraAngles,position:s.cameraPosition};run.samples.push(sample);
   run.botMovements+=s.players.filter(x=>x.bot).filter(x=>{const prior=previous.players.find(o=>o.seat===x.seat);return prior&&Math.hypot(x.position.x-prior.position.x,x.position.z-prior.position.z)>.05;}).length;
   if(s.phase===2&&previous.phase===2&&local.spawnSequence===old.spawnSequence&&local.health>0&&old.health>0){
    run.maxIdleYaw=Math.max(run.maxIdleYaw,Math.abs(angle(s.look.x,previous.look.x)));run.maxIdlePitch=Math.max(run.maxIdlePitch,Math.abs(s.look.y-previous.look.y));
    run.maxCameraYaw=Math.max(run.maxCameraYaw,Math.abs(angle(s.cameraAngles.y,previous.cameraAngles.y)));run.maxCameraPitch=Math.max(run.maxCameraPitch,Math.abs(angle(s.cameraAngles.x,previous.cameraAngles.x)));
    assert.ok(run.maxIdleYaw<.1&&run.maxIdlePitch<.1&&run.maxCameraYaw<.1&&run.maxCameraPitch<.1,'bots changed idle yaw or pitch');
    run.maxHitRoll=Math.max(run.maxHitRoll,Math.abs(angle(s.cameraAngles.z)));
   }
   if(local.health<old.health){run.hits++;if(run.hits===1)await p.screenshot({path:path.resolve(__dirname,'../Logs/solo-camera-'+mode+'-hit.png')});}
   if(local.health===0&&!run.death){run.death=true;run.deathSample=sample;}
   if(local.spawnSequence>run.initialLife&&local.health>0){run.respawned=true;run.respawn=sample;if(run.hits>0)break;}
   previous=s;
  }
  assert.ok(run.botMovements>20,'bots must move during observation');assert.ok(run.hits>0,'observe actual received damage');assert.ok(run.respawned,'observe automatic random respawn');assert.ok(run.maxHitRoll<=2.5,'alive hit reaction must remain a small roll');
  const summary={...run,samples:undefined};console.log('WEB_SOLO_CAMERA_MODE_OK '+JSON.stringify(summary));await c.close();
 }
 assert.equal(result.errors.length,0);result.ok=true;console.log('WEB_SOLO_CAMERA_OK');
 }finally{fs.writeFileSync(path.resolve(__dirname,'../Logs/solo-camera-web-check.json'),JSON.stringify(result,null,2));await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});
