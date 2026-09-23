const {chromium}=require(process.env.RIVALS_PLAYWRIGHT_MODULE||'playwright');
const {enterRoom}=require('./WebRoomHelpers.cjs');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const output=path.resolve(__dirname,'../Logs'),room='房主貓貓的房間',results={room,runs:[]};
fs.mkdirSync(output,{recursive:true});
const local=s=>s.players.find(p=>p.seat===s.localSeat);
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.RIVALS_CHROME||undefined,headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 const state=p=>p.evaluate(()=>window.rivalsDiagnostics);
 async function open(name){
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),run={name,errors:[]};results.runs.push(run);
  page.on('pageerror',e=>run.errors.push(e.message));page.on('console',m=>{if(/^(InvalidOperationException|NullReferenceException|MissingReferenceException|ArgumentException):/.test(m.text()))run.errors.push(m.text());});
  const url=new URL(process.env.RIVALS_WEB_URL||'http://localhost:8184/');url.searchParams.set('diagnostics','1');
  await page.goto(url.href);await page.waitForFunction(()=>window.rivalsLobbyState?.ready&&!window.rivalsLobbyState.busy,null,{timeout:120000});
  return {context,page};
 }
 async function mouseLook(page,yaw,pitch){
  const s=await state(page),dx=(((yaw-s.look.x+540)%360)-180)/.12,dy=(pitch-s.look.y)/.12;
  // Browser input only: no gameplay state setters or debug commands.
  await page.evaluate(({dx,dy})=>document.dispatchEvent(new MouseEvent('mousemove',{movementX:dx,movementY:dy,bubbles:true})),{dx,dy});await delay(160);
 }
 try{
  const host=await open('host'),client=await open('client');
  assert.ok((await host.page.locator('#player-name').inputValue()).length>=2);
  assert.equal(await host.page.locator('#lobby').isVisible(),true);assert.ok(!(await state(host.page))?.players);
  await host.page.bringToFront();await host.page.locator('#player-name').fill('房主貓貓');assert.equal(await host.page.locator('#room-name').textContent(),room);
  await host.page.screenshot({path:path.join(output,'battle-web-lobby.png')});await host.page.locator('#create-room').click();
  await host.page.waitForFunction(()=>window.rivalsDiagnostics?.phase===1,null,{timeout:90000});await host.page.screenshot({path:path.join(output,'battle-web-countdown.png')});
  await client.page.waitForFunction(room=>window.rivalsLobbyState.rooms.some(r=>r.name===room&&r.players===1&&r.max===8),room,{timeout:20000});
  await client.page.screenshot({path:path.join(output,'battle-web-room-list.png')});
  await enterRoom(client.page,{room,name:'訪客兔兔',create:false});
  await host.page.waitForFunction(()=>window.rivalsDiagnostics.players.filter(p=>!p.bot).length===2,null,{timeout:15000});
  let s=await state(client.page);assert.deepEqual(s.players.filter(p=>!p.bot).map(p=>p.name).sort(),['房主貓貓','訪客兔兔'].sort());
  assert.equal(s.players.filter(p=>p.bot).length,6);assert.equal(s.players.filter(p=>p.team===0).length,4);assert.equal(s.players.filter(p=>p.team===1).length,4);
  assert.equal(s.pickups.length,4);assert.deepEqual(s.pickups.map(p=>p.weapon).sort(),[0,0,3,4]);assert.ok(s.pickups.every(p=>Math.abs(p.position.x)===30&&Math.abs(p.position.z)===30));
  results.connected={host:await state(host.page),client:s};
  await client.context.close();await host.page.waitForFunction(()=>window.rivalsDiagnostics.players.filter(p=>p.bot).length===7,null,{timeout:15000});
  // Move using the actual client input through the open spawn-side lane. Retry at
  // a fresh round if combat eliminated the test player during room checks.
  await host.page.bringToFront();const box=await host.page.locator('canvas').boundingBox();
  async function engage(){await host.page.mouse.click(box.x+box.width/2,box.y+box.height/2,{delay:60});await delay(150);}
  await engage();
  if(local(await state(host.page)).health<=0)await host.page.waitForFunction(()=>window.rivalsDiagnostics.phase===2&&window.rivalsDiagnostics.players.find(p=>p.seat===window.rivalsDiagnostics.localSeat).health>0,null,{timeout:75000});
  let acquired=false;
  for(let attempt=0;attempt<3&&!acquired;attempt++){
   s=await state(host.page);
   if(s.phase!==2||local(s).health<=0){await host.page.waitForFunction(()=>window.rivalsDiagnostics.phase===2&&window.rivalsDiagnostics.players.find(p=>p.seat===window.rivalsDiagnostics.localSeat).health>0,null,{timeout:75000});await engage();s=await state(host.page);}
   const team=local(s).team,cornerX=team===0?30:-30;
   await mouseLook(host.page,cornerX>0?90:270,0);await host.page.keyboard.down('Shift');await host.page.keyboard.down('w');
   const deadline=Date.now()+6000;
   while(Date.now()<deadline){s=await state(host.page);if(s.phase!==2||local(s).health<=0||Math.abs(local(s).position.x-cornerX)<1.5)break;await delay(40);}
   await host.page.keyboard.up('w');await host.page.keyboard.up('Shift');
   if(s.phase!==2||local(s).health<=0)continue;
   const pickupDeadline=Date.now()+6000;
   while(Date.now()<pickupDeadline){s=await state(host.page);if(local(s).health<=0||s.phase!==2)break;if(local(s).weapon===0){acquired=true;break;}await delay(50);}
  }
  assert.ok(acquired,'walk to corner rifle');s=await state(host.page);assert.equal(local(s).owned,1);assert.equal(local(s).weapon,0);results.riflePickup=s;
  results.summary={lobby:true,customNames:true,realRoomList:true,teams:true,botReplacement:true,cornerPickups:true,singleWeapon:true};
  console.log('WEB_LOBBY_OK '+JSON.stringify(results.summary));
  if(process.argv.includes('--podium')){
   await mouseLook(host.page,0,0);
   // Observe the unmodified game through a real complete match.
   await host.page.waitForFunction(()=>window.rivalsDiagnostics?.phase===4,null,{timeout:720000});
   const podium=await state(host.page);results.podium=podium;assert.equal(Math.max(podium.blueWins,podium.redWins),5);assert.equal(podium.winners.filter(Boolean).length,4);
   await host.page.screenshot({path:path.join(output,'battle-web-podium.png')});
   await host.page.waitForFunction(game=>window.rivalsDiagnostics.game>game,podium.game,{timeout:15000});results.nextGame=await state(host.page);
   assert.equal(results.nextGame.blueWins,0);assert.equal(results.nextGame.redWins,0);assert.equal(results.nextGame.players.filter(p=>p.team===0).length,4);
   console.log('WEB_PODIUM_OK');
  }
  assert.ok(results.runs.every(r=>r.errors.length===0));
 }finally{fs.writeFileSync(path.join(output,'battle-web-check.json'),JSON.stringify(results,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
