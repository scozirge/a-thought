// Four isolated Web players on real Photon rooms. Impair only the browser
// transport; gameplay is driven by input and inspected through read-only state.
const {chromium}=require(process.env.RIVALS_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const output=path.resolve(process.env.RIVALS_TEST_OUTPUT||'Logs/WebMultiplayer');
const url=new URL(process.env.RIVALS_WEB_URL||'http://127.0.0.1:8188/');url.searchParams.set('diagnostics','1');
const result={url:url.href,testedAt:new Date().toISOString(),checks:[],runs:[],snapshots:[]};
const title='恢復'+Date.now().toString(36).slice(-6)+'的房間';
fs.mkdirSync(output,{recursive:true});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const me=s=>s.players.find(p=>p.seat===s.localSeat);
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.RIVALS_CHROME||undefined,headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 const peers=[];
 async function open(index){
  const context=await browser.newContext({viewport:{width:960,height:720}}),page=await context.newPage();
  const run={index,errors:[],logs:[]};result.runs.push(run);peers.push(page);
  page.on('pageerror',e=>run.errors.push(e.message));page.on('console',m=>{const t=m.text();if(/^(?:\w*Exception|RuntimeError):/.test(t))run.errors.push(t);if(/RIVALS_|Disconnect|Shutdown/.test(t))run.logs.push(t);});
  await page.addInitScript(()=>{
   const Native=window.WebSocket,replayed=new WeakSet();
   const test=window.recoveryTest={sockets:[],paused:false,blocked:false,queue:[],held:0};
   window.WebSocket=class extends Native{
    constructor(...args){
     super(...args);test.sockets.push(this);
     this.addEventListener('open',()=>{if(test.blocked)this.close();});
     this.addEventListener('message',event=>{
      if(replayed.has(event)||!test.paused)return;
      event.stopImmediatePropagation();test.held++;
      const copy=new MessageEvent('message',{data:event.data,origin:event.origin,lastEventId:event.lastEventId});replayed.add(copy);
      test.queue.push(()=>{if(this.readyState===Native.OPEN)this.dispatchEvent(copy);});
     });
    }
    send(data){
     if(!test.paused)return super.send(data);
     const copy=ArrayBuffer.isView(data)?new Uint8Array(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)):data instanceof ArrayBuffer?data.slice(0):data;
     test.held++;test.queue.push(()=>{if(this.readyState===Native.OPEN)super.send(copy);});
    }
   };
   test.resume=()=>{test.paused=false;for(const deliver of test.queue.splice(0))deliver();};
   test.disconnect=()=>{test.blocked=true;for(const socket of test.sockets)if(socket.readyState===Native.OPEN)socket.close();};
  });
  await page.goto(url.href);await lobby(page);await page.locator('#player-name').fill(index?'恢復訪客'+index:title.slice(0,-3));return page;
 }
 async function state(page){return page.evaluate(()=>window.rivalsDiagnostics);}
 async function lobby(page){await page.waitForFunction(()=>window.rivalsLobbyState?.visible&&window.rivalsLobbyState.ready&&!window.rivalsLobbyState.busy,null,{timeout:90000});}
 async function playing(page,count){
  await page.waitForFunction(n=>{const s=window.rivalsDiagnostics;return !window.rivalsLobbyState?.visible&&s?.players?.length===8&&s.players.filter(p=>!p.bot).length===n&&s.localInputOwners===1;},count,{timeout:45000});
  const s=await state(page);assert.equal(new Set(s.players.map(p=>p.seat)).size,8);assert.equal(s.players.filter(p=>p.team===0).length,4);return s;
 }
 async function join(page){await lobby(page);await page.locator('.room-row').filter({has:page.getByText(title,{exact:true})}).getByRole('button',{name:'加入房間',exact:true}).click({timeout:30000});}
 function pass(label){result.checks.push(label);console.log('RECOVERY_CHECK '+label);}
 async function consistent(count,label){
  const snapshots=await Promise.all(peers.map(p=>playing(p,count)));
  const roster=s=>s.players.map(p=>({seat:p.seat,team:p.team,bot:p.bot,name:p.name})).sort((a,b)=>a.seat-b.seat);
  for(const s of snapshots)assert.deepEqual(roster(s),roster(snapshots[0]));
  assert.equal(new Set(snapshots.map(s=>s.localSeat)).size,count);result.snapshots.push({label,states:snapshots});pass(label);
 }
 try{
  const host=await open(0);await host.locator('#create-room').click();await playing(host,1);
  for(let i=1;i<4;i++)await open(i);
  await Promise.all(peers.slice(1).map(join));await consistent(4,'three simultaneous joins agree on seats, teams, names and one owner each');
  const guest=peers[1];
  await guest.bringToFront();const box=await guest.locator('canvas').boundingBox();await guest.mouse.click(box.x+box.width/2,box.y+box.height/2);await sleep(250);
  const initial=await state(guest);
  await guest.evaluate(pitch=>document.dispatchEvent(new MouseEvent('mousemove',{movementX:0,movementY:(-70-pitch)/.12,bubbles:true})),initial.look.y);
  await guest.waitForFunction(()=>Math.abs(window.rivalsDiagnostics.look.y+70)<.5);
  const before=await state(guest),seat=before.localSeat;
  await guest.evaluate(()=>{window.recoveryTest.paused=true;});
  await guest.keyboard.down('d');await sleep(700);await guest.keyboard.up('d');
  await guest.mouse.down();await sleep(50);await guest.mouse.up();await sleep(1750);
  assert.ok(await guest.evaluate(()=>window.recoveryTest.held>0),'network stall must hold real frames');
  result.heldFrames=await guest.evaluate(()=>window.recoveryTest.held);
  await guest.evaluate(()=>window.recoveryTest.resume());
  await sleep(3500);await consistent(4,'2.5-second transport stall recovers without ejecting a player');
  const recovered=await state(guest),authoritative=await state(host),local=me(recovered),remote=authoritative.players.find(p=>p.seat===seat);
  assert.equal(local.spawnSequence,me(before).spawnSequence,'movement comparison stays in the same life');
  result.stopError=Math.hypot(local.position.x-remote.position.x,local.position.z-remote.position.z);assert.ok(result.stopError<.3,'released movement reconciles after transport recovery');
  // A fresh click after recovery must still reach the host exactly once.
  const shots=local.shots;await guest.mouse.down();await sleep(50);await guest.mouse.up();
  await host.waitForFunction(({seat,shots})=>window.rivalsDiagnostics.players.find(p=>p.seat===seat)?.shots===shots+1,{seat,shots},{timeout:5000});pass('movement converges and the first post-stall shot reaches the host once');
  await guest.evaluate(()=>window.recoveryTest.disconnect());
  await guest.waitForFunction(()=>window.rivalsLobbyState?.visible&&!window.rivalsLobbyState.busy,null,{timeout:45000});
  await Promise.all([host,peers[2],peers[3]].map(p=>playing(p,3)));
  assert.ok(!(await state(guest))?.players);assert.equal(await guest.evaluate(()=>document.pointerLockElement),null);
  await guest.evaluate(()=>{window.recoveryTest.blocked=false;});await join(guest);await consistent(4,'guest transport failure clears controls, refills a bot and allows rejoining');
  // Silent host: keep the WebSocket open while withholding game snapshots.
  // Cloud liveness alone must not strand the other three players in this room.
  const departureOffsets=result.runs.map(r=>r.logs.length);
  await host.evaluate(()=>{window.recoveryTest.paused=true;});const departed=Date.now();
  await Promise.all(peers.slice(1).map(p=>p.waitForFunction(()=>window.rivalsLobbyState?.visible&&!window.rivalsLobbyState.busy,null,{timeout:30000})));
  result.hostSilenceRecoveryMs=Date.now()-departed;
  for(const p of peers.slice(1)){assert.ok(!(await state(p))?.players);assert.equal(await p.evaluate(()=>document.pointerLockElement),null);}
  // Photon may close the room before the local snapshot watchdog expires.
  // Either path must produce the same usable lobby and clean gameplay state.
  result.hostDepartureSignals=result.runs.slice(1).map(r=>({index:r.index,signals:r.logs.slice(departureOffsets[r.index]).filter(t=>/RIVALS_SHUTDOWN|RIVALS_HOST_SNAPSHOT_TIMEOUT/.test(t))}));
  assert.ok(result.hostDepartureSignals.every(r=>r.signals.length>0),'all guests detect host departure');
  pass('three guests leave a silent host within 30 seconds and release gameplay state');
  await host.context().close();
  await Promise.all(peers.slice(1).map(lobby));
  const twin=peers[2],observer=peers[3],duplicateName='同名'+title.slice(2,-3),duplicateTitle=duplicateName+'的房間';
  await guest.locator('#player-name').fill(duplicateName);
  await guest.locator('#create-room').click();await playing(guest,1);pass('a recovered guest can create a new room');
  // Same display names must not merge rooms or redirect a stale join button.
  await observer.waitForFunction(name=>window.rivalsLobbyState.rooms.some(r=>r.name===name),duplicateTitle);
  const firstId=await observer.evaluate(name=>window.rivalsLobbyState.rooms.find(r=>r.name===name).id,duplicateTitle);
  await twin.locator('#player-name').fill(duplicateName);await twin.locator('#create-room').click();await playing(twin,1);
  await observer.waitForFunction(name=>window.rivalsLobbyState.rooms.filter(r=>r.name===name).length===2,duplicateTitle);
  const twins=await observer.evaluate(name=>window.rivalsLobbyState.rooms.filter(r=>r.name===name),duplicateTitle);
  assert.equal(new Set(twins.map(r=>r.id)).size,2);result.duplicateRooms=twins;
  // Match the connection ID, since text deliberately cannot distinguish these.
  const original=await observer.locator(`.room-row[data-room-id="${firstId}"] button`).elementHandle();assert.ok(original);
  await original.click();await Promise.all([playing(guest,2),playing(observer,2),playing(twin,1)]);pass('same-named hosts create isolated rooms and a guest joins the selected ID');
  await guest.context().close();await lobby(observer);await playing(twin,1);
  await observer.waitForFunction(id=>!window.rivalsLobbyState.rooms.some(r=>r.id===id),firstId);
  // Replay the captured UI handler as if a queued click arrived after refresh.
  await original.evaluate(button=>button.onclick());
  await observer.waitForFunction(()=>window.rivalsLobbyState.message.includes('已離開清單'));
  assert.ok(!(await state(observer))?.players);await playing(twin,1);
  const secondId=twins.find(r=>r.id!==firstId).id;
  await observer.locator(`.room-row[data-room-id="${secondId}"] button`).click();await Promise.all([playing(twin,2),playing(observer,2)]);
  pass('a stale room cannot join its namesake, and the surviving room remains usable');
  assert.deepEqual(result.runs.flatMap(r=>r.errors),[]);result.ok=true;console.log('WEB_MULTIPLAYER_RECOVERY_OK '+JSON.stringify({checks:result.checks.length,heldFrames:result.heldFrames,stopError:result.stopError,hostSilenceRecoveryMs:result.hostSilenceRecoveryMs}));
 }catch(e){result.failure=e.stack;throw e;}
 finally{fs.writeFileSync(path.join(output,'multiplayer-recovery-check.json'),JSON.stringify(result,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
