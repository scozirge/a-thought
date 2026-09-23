const {chromium}=require(process.env.RIVALS_PLAYWRIGHT_MODULE||'playwright');
const {enterRoom}=require('./WebRoomHelpers.cjs');const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const results={runs:[],errors:[]},delta=(a,b)=>((a-b+540)%360)-180;
(async()=>{const browser=await chromium.launch({executablePath:process.env.RIVALS_CHROME,headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 async function open(mode){const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),logs=[];
  if(mode==='fallback')await page.addInitScript(()=>HTMLCanvasElement.prototype.requestPointerLock=function(){return Promise.reject(new Error('No pointer lock'));});
  page.on('pageerror',e=>results.errors.push(e.message));page.on('console',m=>{logs.push(m.text());if(/^(InvalidOperationException|NullReferenceException|MissingReferenceException|ArgumentException):/.test(m.text()))results.errors.push(m.text());});
  await page.goto((process.env.RIVALS_WEB_URL||'http://localhost:8184/')+'?diagnostics=1&v=camera');await page.waitForFunction(()=>window.rivalsLobbyState?.ready&&!window.rivalsLobbyState.busy,null,{timeout:120000});return {page,context,logs};}
 const state=p=>p.page.evaluate(()=>window.rivalsDiagnostics),me=s=>s.players.find(p=>p.seat===s.localSeat);
 async function engage(p){await p.page.bringToFront();p.box=await p.page.locator('canvas').boundingBox();await p.page.mouse.click(p.box.x+p.box.width/2,p.box.y+p.box.height/2);await p.page.waitForTimeout(200);}
 async function stable(observer,mover,label){
  await engage(mover);const before=await state(observer),movingBefore=await state(mover);assert.equal(before.phase,2);assert.ok(me(before).health>0);
  // Only the OTHER browser receives movement and mouse events.
  await mover.page.keyboard.down('a');await mover.page.mouse.move(mover.box.x+mover.box.width/2+220,mover.box.y+mover.box.height/2-50,{steps:16});await mover.page.waitForTimeout(650);await mover.page.keyboard.up('a');await mover.page.waitForTimeout(200);
  const after=await state(observer),movingAfter=await state(mover);assert.equal(after.phase,2);assert.ok(me(after).health>0);
  const yaw=Math.abs(delta(after.look.x,before.look.x)),pitch=Math.abs(after.look.y-before.look.y);
  const cameraYaw=Math.abs(delta(after.cameraAngles.y,before.cameraAngles.y)),cameraPitch=Math.abs(delta(after.cameraAngles.x,before.cameraAngles.x));
  assert.ok(cameraYaw<.05&&cameraPitch<.05,'remote motion changed the rendered camera');
  assert.equal(after.localInputOwners,1,'exactly one input owner on each peer');
  const movement=Math.hypot(me(movingAfter).position.x-me(movingBefore).position.x,me(movingAfter).position.z-me(movingBefore).position.z);
  assert.ok(movement>.8,'other player must actually move');assert.ok(Math.abs(delta(movingAfter.look.x,movingBefore.look.x))>15,'other player must actually turn');
  assert.ok(yaw<.05&&pitch<.05,'remote input changed idle player look');
  const positionChange=Math.hypot(me(after).position.x-me(before).position.x,me(after).position.z-me(before).position.z);assert.ok(positionChange<.02,'remote motion displaced local player');
  return {label,yaw,pitch,cameraYaw,cameraPitch,observerControls:after.controls,localInputOwners:after.localInputOwners,positionChange,otherPlayerMovement:movement,otherPlayerTurn:delta(movingAfter.look.x,movingBefore.look.x),localSeat:after.localSeat};
 }
 try{for(const mode of ['locked','fallback']){
  const host=await open(mode),client=await open(mode),room='相機隔離'+Date.now();
  await Promise.all([enterRoom(host.page,{room,name:'相機貓貓',create:true}),enterRoom(client.page,{room,name:'相機兔兔',create:false})]);
  // Take cover on both sides before testing, so hit reactions are not confused
  // with ownership. These are normal browser inputs, not gameplay setters.
  await engage(host);await host.page.keyboard.down('d');await host.page.waitForTimeout(1600);await host.page.keyboard.up('d');
  await engage(client);await client.page.keyboard.down('d');await client.page.waitForTimeout(1600);await client.page.keyboard.up('d');await client.page.waitForTimeout(400);
  const run={mode,checks:[]};results.runs.push(run);
  run.checks.push(await stable(host,client,'host idle while client moves and turns'));
  run.checks.push(await stable(client,host,'client idle while host moves and turns'));
  // Bots remain active throughout the same interval and must not write local look.
  await engage(client);if(mode==='fallback')await client.page.mouse.move(client.box.x+client.box.width-1,client.box.y+client.box.height/2,{steps:12});
  await client.page.waitForTimeout(200);const before=await state(client);await client.page.waitForTimeout(750);const after=await state(client);
  const botsMoved=after.players.filter(p=>p.bot).some(p=>{const old=before.players.find(o=>o.seat===p.seat);return old&&Math.hypot(p.position.x-old.position.x,p.position.z-old.position.z)>.2;});assert.ok(botsMoved,'bots must actually move');
  const yaw=Math.abs(delta(after.look.x,before.look.x)),pitch=Math.abs(after.look.y-before.look.y);assert.ok(yaw<.05&&pitch<.05,'bots or idle edge changed player view');const cameraYaw=Math.abs(delta(after.cameraAngles.y,before.cameraAngles.y));assert.ok(cameraYaw<.05,'bot movement affected rendered camera');run.checks.push({label:'bots moving with local mouse idle',yaw,pitch,cameraYaw,botsMoved,observerControls:after.controls});
  for(const p of [host,client]){const localSpawns=p.logs.filter(x=>/RIVALS_PLAYER_SPAWN.*local=True/.test(x));assert.equal(localSpawns.length,1,'exactly one local camera owner');}
  console.log('WEB_CAMERA_OWNERSHIP_MODE_OK '+JSON.stringify(run));await host.context.close();await client.page.waitForFunction(()=>window.rivalsLobbyState?.visible&&window.rivalsLobbyState.ready,null,{timeout:30000});await client.context.close();
 }assert.equal(results.errors.length,0);results.ok=true;console.log('WEB_CAMERA_OWNERSHIP_OK');
 }finally{fs.writeFileSync(path.resolve(__dirname,'../Logs/camera-ownership-web-check.json'),JSON.stringify(results,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
