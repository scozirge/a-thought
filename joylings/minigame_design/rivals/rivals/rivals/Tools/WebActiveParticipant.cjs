// Optional active participant for the long Web match test. Uses real movement
// input only; never changes health, positions, scores or match phase directly.
const {chromium}=require(process.env.RIVALS_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const output=path.resolve(process.env.RIVALS_TEST_OUTPUT||'Logs/WebMultiplayer/Final');
const result={errors:[],samples:[]};fs.mkdirSync(output,{recursive:true});
const angle=a=>((a+540)%360)-180;
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.RIVALS_CHROME||undefined,headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 try{
  const page=await browser.newPage({viewport:{width:960,height:720}});
  page.on('pageerror',e=>result.errors.push(e.message));
  page.on('console',m=>{if(/^(?:\w*Exception|RuntimeError):/.test(m.text()))result.errors.push(m.text());});
  const url=new URL(process.env.RIVALS_WEB_URL||'http://127.0.0.1:8188/');url.searchParams.set('diagnostics','1');
  await page.goto(url.href);await page.waitForFunction(()=>window.rivalsLobbyState?.ready&&!window.rivalsLobbyState.busy,null,{timeout:90000});
  const rooms=await page.evaluate(name=>window.rivalsLobbyState.rooms.filter(r=>name?r.name===name:/^擊殺[a-z0-9]{6}的房間$/.test(r.name)),process.env.RIVALS_PARTICIPANT_ROOM||null);
  assert.equal(rooms.length,1,'specify RIVALS_PARTICIPANT_ROOM when multiple long tests exist');result.room=rooms[0];
  await page.locator('#player-name').fill('走位測試');await page.locator(`.room-row[data-room-id="${rooms[0].id}"] button`).click();
  await page.waitForFunction(()=>window.rivalsDiagnostics?.phase===2&&window.rivalsDiagnostics.players.filter(p=>!p.bot).length>=3,null,{timeout:45000});
  const box=await page.locator('canvas').boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
  await page.keyboard.down('Shift');
  let previous=null,nextProgress=0,detourUntil=0,detourYaw=0,turn=1,initialGame=null,nextLog=0;
  const deadline=Date.now()+600000;
  while(Date.now()<deadline){
   const s=await page.evaluate(()=>window.rivalsDiagnostics);assert.ok(s?.players,'participant remains connected');
   if(initialGame===null)initialGame=s.game;
   if(s.phase===4||s.game>initialGame){result.winner=s;result.ok=true;break;}
   const local=s.players.find(p=>p.seat===s.localSeat),now=Date.now();
   if(now>nextLog){result.samples.push(s);console.log('ACTIVE_PARTICIPANT '+JSON.stringify({score:[s.blueKills,s.redKills],health:local.health,position:local.position}));nextLog=now+15000;}
   if(local.health<=0){await page.keyboard.up('w');previous=null;await page.waitForTimeout(100);continue;}
   const enemies=s.players.filter(p=>p.team!==local.team&&p.health>0).sort((a,b)=>Number(b.bot)-Number(a.bot)||Math.hypot(a.position.x-local.position.x,a.position.z-local.position.z)-Math.hypot(b.position.x-local.position.x,b.position.z-local.position.z));
   if(!enemies.length){await page.waitForTimeout(100);continue;}
   const target=enemies[0].position,dx=target.x-local.position.x,dz=target.z-local.position.z,distance=Math.hypot(dx,dz);
   let yaw=Math.atan2(dx,dz)*180/Math.PI;
   if(now>=nextProgress){
    if(previous&&distance>4&&Math.hypot(local.position.x-previous.x,local.position.z-previous.z)<.5){detourYaw=yaw+90*turn;turn=-turn;detourUntil=now+2200;}
    previous=local.position;nextProgress=now+3000;
   }
   if(now<detourUntil)yaw=detourYaw;
   await page.evaluate(({x,y})=>document.dispatchEvent(new MouseEvent('mousemove',{movementX:x,movementY:y,bubbles:true})),{x:angle(yaw-s.look.x)/.12,y:-s.look.y/.12});
   if(distance>3||now<detourUntil)await page.keyboard.down('w');else await page.keyboard.up('w');
   await page.waitForTimeout(100);
  }
  await page.keyboard.up('w');await page.keyboard.up('Shift');assert.equal(result.ok,true,'observe a live thirty-kill result');assert.deepEqual(result.errors,[]);
  console.log('WEB_ACTIVE_PARTICIPANT_OK '+JSON.stringify({score:[result.winner.blueKills,result.winner.redKills],samples:result.samples.length}));
 }catch(e){result.failure=e.stack;throw e;}
 finally{fs.writeFileSync(path.join(output,'active-participant-check.json'),JSON.stringify(result,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
