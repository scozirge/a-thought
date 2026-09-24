// A real touch Web player and a keyboard Web player share Photon rooms.
const {chromium}=require(process.env.RIVALS_PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.resolve(process.env.RIVALS_TEST_OUTPUT||'Logs/MobileControls');fs.mkdirSync(output,{recursive:true});
const url=new URL(process.env.RIVALS_WEB_URL||'http://127.0.0.1:8189/');url.searchParams.set('diagnostics','1');
const startupTimeoutMs=Number(process.env.RIVALS_STARTUP_TIMEOUT_MS||120000),lagged=process.argv.includes('--lag');
const result={url:url.href,testedAt:new Date().toISOString(),webSocketDelayEachDirectionMs:lagged?90:0,checks:[],runs:[]};
const me=s=>s.players.find(p=>p.seat===s.localSeat),angle=v=>((v+540)%360)-180;
const suffix=Date.now().toString(36).slice(-6);
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.RIVALS_CHROME||undefined,headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 const opened=[];
 const state=page=>page.evaluate(()=>window.rivalsDiagnostics);
 async function wait(page,predicate,label,timeout=30000){const end=Date.now()+timeout;while(Date.now()<end){const s=await state(page);if(s?.players&&predicate(s))return s;await page.waitForTimeout(80);}throw Error(label+' timeout');}
 async function lobby(page){await page.waitForFunction(()=>window.rivalsLobbyState?.visible&&window.rivalsLobbyState.ready&&!window.rivalsLobbyState.busy,null,{timeout:startupTimeoutMs});}
 function pass(label){result.checks.push(label);console.log('WEB_MOBILE_CHECK '+label);}
 async function open(name,mobile){
  const context=await browser.newContext(mobile?{viewport:{width:844,height:390},hasTouch:true,isMobile:true,deviceScaleFactor:1}:{viewport:{width:1440,height:1000}}),page=await context.newPage();
  opened.push(page);
  if(mobile&&lagged)await page.addInitScript(()=>{
   const Native=window.WebSocket,delayed=new WeakSet();
   window.WebSocket=class extends Native{
    constructor(...args){super(...args);this.addEventListener('message',event=>{if(delayed.has(event))return;event.stopImmediatePropagation();const copy=new MessageEvent('message',{data:event.data,origin:event.origin,lastEventId:event.lastEventId});delayed.add(copy);setTimeout(()=>{if(this.readyState===Native.OPEN)this.dispatchEvent(copy);},90);});}
    send(data){const copy=ArrayBuffer.isView(data)?new Uint8Array(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)):data instanceof ArrayBuffer?data.slice(0):data;setTimeout(()=>{if(this.readyState===Native.OPEN)super.send(copy);},90);}
   };
  });
  const run={name,errors:[],logs:[]};result.runs.push(run);page.on('pageerror',e=>run.errors.push(e.message));page.on('console',m=>{const t=m.text();if(/^(?:\w*Exception|RuntimeError):/.test(t))run.errors.push(t);if(/RIVALS_|UnityCache|Disconnect|Shutdown/.test(t))run.logs.push(t);});
  await page.addInitScript(()=>document.addEventListener('pointerdown',e=>{if(e.target.closest('#touch-fire'))window.mobileTriggerTime=performance.now();},true));
  await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:startupTimeoutMs});await lobby(page);await page.locator('#player-name').fill(name+suffix);return page;
 }
 try{
  const desktop=await open('鍵鼠',false),phone=await open('手機',true);
  assert.equal(await phone.locator('#mode-touch').getAttribute('aria-pressed'),'true');assert.equal(await desktop.locator('#mode-keyboard').getAttribute('aria-pressed'),'true');
  await phone.screenshot({path:path.join(output,'phone-lobby.png')});
  await desktop.locator('#fullscreen').click();assert.equal(await desktop.evaluate(()=>!!document.fullscreenElement),true);await desktop.locator('#fullscreen').click();
  await desktop.locator('#create-room').click();await wait(desktop,s=>s.phase===2,'desktop host');
  await phone.locator('.room-row').filter({has:phone.getByText('鍵鼠'+suffix+'的房間',{exact:true})}).getByRole('button',{name:'加入房間',exact:true}).tap();
  await wait(phone,s=>s.players.filter(p=>!p.bot).length===2&&s.controls,'phone client');await wait(desktop,s=>s.players.filter(p=>!p.bot).length===2,'two humans');
  assert.equal(await phone.evaluate(()=>!!document.pointerLockElement),false);pass('phone touch and desktop keyboard join the same real room');
  const cdp=await phone.context().newCDPSession(phone),points=new Map();
  const center=async selector=>{const b=await phone.locator(selector).boundingBox();assert.ok(b,selector+' visible');return{x:b.x+b.width/2,y:b.y+b.height/2};};
  const send=type=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:[...points].map(([id,p])=>({id,...p,radiusX:3,radiusY:3,force:1}))});
  async function down(id,p){points.set(id,p);await send('touchStart');}
  async function move(id,p){points.set(id,p);await send('touchMove');}
  async function up(id){const p=points.get(id);points.delete(id);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[{id,...p,radiusX:3,radiusY:3,force:0}]});}
  async function tap(selector,id=8,delay=40){await down(id,await center(selector));await phone.waitForTimeout(delay);await up(id);}
  async function turn(yaw,pitch){
   const s=await state(phone),b=await phone.locator('canvas').boundingBox(),scale=1.6*720/Math.max(240,b.height);
   const dx=angle(yaw-s.look.x)/(.12*scale),dy=(pitch-s.look.y)/(.12*scale),steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx)/200,Math.abs(dy)/150)));
   for(let i=0;i<steps;i++){const from={x:b.x+b.width*.48,y:b.y+b.height*.6};await down(20,from);await move(20,{x:from.x+dx/steps,y:from.y+dy/steps});await phone.waitForTimeout(55);await up(20);await phone.waitForTimeout(35);}
  }
  let stick=await center('#touch-move');await down(1,stick);await move(1,{x:stick.x+42,y:stick.y});await phone.waitForTimeout(1400);await up(1);await phone.waitForTimeout(350);
  const before=await state(phone);await turn(before.look.x,-65);await wait(phone,s=>Math.abs(s.look.y+65)<1,'touch aim upward');
  const shotBaseline=me(await state(phone)).shots;
  stick=await center('#touch-move');await down(1,stick);await move(1,{x:stick.x+36,y:stick.y});await down(2,{x:420,y:175});await move(2,{x:450,y:175});await tap('#touch-fire',3,50);await up(2);await phone.waitForTimeout(400);await up(1);
  await wait(phone,s=>me(s).shots>shotBaseline,'multi-touch shot');const moved=await state(phone);assert.ok(Math.hypot(me(moved).position.x-me(before).position.x,me(moved).position.z-me(before).position.z)>1);assert.ok(Math.abs(angle(moved.look.x-before.look.x))>5);
  await phone.waitForTimeout(1000);const stopped=await state(phone);await wait(desktop,s=>{const p=s.players.find(p=>p.seat===stopped.localSeat);return Math.hypot(p.position.x-me(stopped).position.x,p.position.z-me(stopped).position.z)<.4;},'movement replicated');pass('simultaneous joystick movement, drag look and shooting replicate to the host');
  const initial=me(await state(phone)).shots;result.taps=[];
  for(let i=0;i<6;i++){
   const count=await phone.evaluate(()=>window.rivalsShotEvents?.length||0);await tap('#touch-fire',3,35);
   await phone.waitForFunction(count=>(window.rivalsShotEvents?.length||0)>count,count,{timeout:1500});
   result.taps.push(await phone.evaluate(()=>({delayMs:window.rivalsShotEvents.at(-1).time-window.mobileTriggerTime})));await phone.waitForTimeout(400);
  }
  const fired=await state(phone);assert.equal(me(fired).shots-initial,6);assert.equal(me(fired).visualShots,me(fired).shots);await wait(desktop,s=>s.players.find(p=>p.seat===fired.localSeat).shots===me(fired).shots,'host shot count');
  result.afterShots=fired;const magazine={0:30,1:12,3:6,4:1}[me(fired).weapon];
  await tap('#touch-reload',8,35);await wait(phone,s=>me(s).ammo===magazine&&!me(s).reloading,'touch reload');await wait(desktop,s=>s.players.find(p=>p.seat===fired.localSeat).ammo===magazine,'host reload');pass('six short touch shots have one feedback each and a short reload tap agrees on both peers');
  await tap('#touch-aim',4);await wait(phone,s=>s.aiming,'tap aim stays enabled');await phone.waitForTimeout(250);assert.equal((await state(phone)).aiming,true);
  const aimedShots=me(await state(phone)).shots;await down(3,await center('#touch-fire'));await move(3,{x:(await center('#touch-fire')).x-15,y:(await center('#touch-fire')).y});await phone.waitForTimeout(600);await up(3);
  const aimed=await wait(phone,s=>s.aiming&&me(s).shots>aimedShots,'shoot while aim is latched');await wait(desktop,s=>s.players.find(p=>p.seat===aimed.localSeat).shots===me(aimed).shots,'aimed shots reach host');
  await tap('#touch-aim',4);await wait(phone,s=>!s.aiming,'second tap releases aim');pass('tap aim stays enabled while firing and dragging; the second tap releases it');
  const grounded=me(await state(phone)).position.y;await tap('#touch-jump',5);await wait(phone,s=>me(s).position.y>grounded+.35,'touch jump');pass('aim and jump respond to touch buttons');
  await wait(phone,s=>Math.abs(me(s).position.y-grounded)<.15,'land after jump');
  stick=await center('#touch-move');await down(1,stick);await move(1,{x:stick.x+40,y:stick.y});await down(6,await center('#touch-sprint'));
  assert.equal(await phone.evaluate(()=>!!(rivalsTouch.held&(1<<3))&&rivalsTouch.moveX===1),true);
  // The character accelerates at 10 m/s². Measure after reaching full speed,
  // rather than comparing the acceleration from rest to a constant-speed walk.
  await phone.waitForTimeout(1000);const sprintStart=me(await state(phone)).position;await phone.waitForTimeout(900);
  const sprintEnd=me(await state(phone)).position;await up(6);await up(1);result.sprintDistance=Math.hypot(sprintEnd.x-sprintStart.x,sprintEnd.z-sprintStart.z);assert.ok(result.sprintDistance>6,'sprint must exceed walking travel');
  assert.equal(await phone.locator('#touch-slide').count(),0);pass('sprint accelerates the joystick and no slide button remains');
  await phone.locator('#fullscreen').tap();await phone.waitForTimeout(300);assert.equal(await phone.evaluate(()=>!!document.fullscreenElement),true);await phone.locator('#fullscreen').tap();await wait(phone,s=>s.controls,'resume after fullscreen');pass('real game supports fullscreen in keyboard and touch modes');
  await phone.locator('#touch-menu').tap();await phone.waitForFunction(()=>window.rivalsTouch.paused);assert.equal(await phone.locator('#touch-pause').isVisible(),true);await wait(phone,s=>!s.controls,'paused touch player');
  await phone.locator('#touch-audio').tap();await phone.waitForFunction(()=>document.getElementById('touch-audio').textContent==='聲音：開');await phone.locator('#touch-audio').tap();await phone.waitForFunction(()=>document.getElementById('touch-audio').textContent==='聲音：關');
  await phone.locator('#touch-resume').tap();await wait(phone,s=>s.controls,'phone menu resume');
  await turn((await state(phone)).look.x,0);await phone.waitForTimeout(200);await phone.screenshot({path:path.join(output,'phone-battle-landscape.png')});pass('phone menu pauses and resumes the real player');
  // A real loss of focus must not leave a joystick or fire button held.
  stick=await center('#touch-move');await down(1,stick);await move(1,{x:stick.x+35,y:stick.y});await down(3,await center('#touch-fire'));
  await phone.locator('#fullscreen').focus();await phone.waitForTimeout(150);assert.equal(await phone.evaluate(()=>rivalsTouch.held),0);assert.equal(await phone.evaluate(()=>rivalsTouch.moveX),0);await up(1);await up(3);
  assert.equal(await phone.locator('#control-resume').isVisible(),false);await tap('#touch-fire',3);await wait(phone,s=>s.controls,'first touch resumes after focus');pass('focus loss clears movement and fire; the next touch resumes without a prompt');
  await phone.locator('#touch-menu').tap();await phone.locator('#touch-leave').tap();await lobby(phone);await wait(desktop,s=>s.players.filter(p=>p.bot).length===7,'Bot replaces phone');
  await desktop.keyboard.press('Escape');await desktop.evaluate(()=>player.SendMessage('RIVALS Session','WebControlCommand','leave'));await lobby(desktop);
  await phone.locator('#create-room').tap();await wait(phone,s=>s.server&&s.phase===2&&s.controls,'phone host');await lobby(desktop);
  await desktop.locator('.room-row').filter({has:desktop.getByText('手機'+suffix+'的房間',{exact:true})}).getByRole('button',{name:'加入房間',exact:true}).click();
  await wait(desktop,s=>!s.server&&s.players.filter(p=>!p.bot).length===2,'desktop joins phone');await wait(phone,s=>s.players.filter(p=>!p.bot).length===2,'phone host roster');pass('phone can host and a desktop keyboard player can join');
  if(process.argv.includes('--respawn')){
   // Walk toward real enemy Bots, allowing combat to cause the death. No health,
   // position, score or timer setters are used by this test.
   const end=Date.now()+180000;let death=null,previous=null,nextProgress=0,detourUntil=0,detourYaw=0,side=1,firing=false,nextLog=0;
   stick=await center('#touch-move');await down(1,stick);await move(1,{x:stick.x,y:stick.y-40});
   while(Date.now()<end){
    const s=await state(phone),local=me(s),now=Date.now();
    if(local.health<=0){death={time:now,state:s};break;}
    if(now>nextLog){console.log('MOBILE_LIFE '+JSON.stringify({health:local.health,position:local.position}));nextLog=now+10000;}
    const enemies=s.players.filter(p=>p.bot&&p.team!==local.team&&p.health>0).sort((a,b)=>Math.hypot(a.position.x-local.position.x,a.position.z-local.position.z)-Math.hypot(b.position.x-local.position.x,b.position.z-local.position.z));
    if(!enemies.length){await phone.waitForTimeout(100);continue;}
    const target=enemies[0].position,dx=target.x-local.position.x,dz=target.z-local.position.z,distance=Math.hypot(dx,dz);let yaw=Math.atan2(dx,dz)*180/Math.PI;
    if(now>=nextProgress){if(previous&&distance>4&&Math.hypot(local.position.x-previous.x,local.position.z-previous.z)<.5){detourYaw=yaw+90*side;side=-side;detourUntil=now+1700;}previous=local.position;nextProgress=now+2500;}
    if(now<detourUntil)yaw=detourYaw;
    await turn(yaw,firing?-65:0);
    if(distance<9&&!firing){await turn(yaw,-65);await tap('#touch-aim',4);await down(3,await center('#touch-fire'));firing=true;}
    await phone.waitForTimeout(140);
   }
   assert.ok(death,'enemy Bots must cause a real touch-player death');await phone.waitForFunction(()=>!rivalsTouch.playable);
   assert.equal(await phone.evaluate(()=>rivalsTouch.held),0);assert.equal(await phone.evaluate(()=>rivalsTouch.moveY),0);assert.equal(await phone.locator('#touch-controls').isVisible(),false);
   await phone.screenshot({path:path.join(output,'phone-respawn-countdown.png')});
   const respawn=await wait(phone,s=>me(s).health>0&&me(s).spawnSequence>me(death.state).spawnSequence&&s.controls,'touch respawn',6000);assert.equal(respawn.aiming,false);assert.equal(await phone.locator('#control-resume').isVisible(),false);
   result.respawn={ms:Date.now()-death.time,before:me(death.state),after:me(respawn)};assert.ok(result.respawn.ms>=2500&&result.respawn.ms<=4500);assert.equal(me(respawn).health,300);assert.equal(me(respawn).weapon,1);assert.equal(me(respawn).ammo,12);
   await phone.waitForTimeout(450);const fresh=await state(phone);assert.equal(me(fresh).shots,me(respawn).shots);assert.ok(Math.hypot(me(fresh).position.x-me(respawn).position.x,me(fresh).position.z-me(respawn).position.z)<.3);
   await up(1);if(firing)await up(3);await tap('#touch-fire',3);await wait(phone,s=>me(s).shots>me(fresh).shots,'fresh touch after respawn');
   pass('real death clears held fingers; three-second respawn restores touch without ghost movement or fire');
  }
  await phone.locator('#touch-menu').tap();await phone.locator('#touch-leave').tap();await lobby(phone);await lobby(desktop);pass('phone host leaves and both devices return to the lobby');
  await phone.locator('#mode-keyboard').tap();assert.equal(await phone.locator('#mode-keyboard').getAttribute('aria-pressed'),'true');await phone.locator('#mode-touch').tap();pass('lobby can switch input modes after a live session');
  assert.ok(result.runs.every(r=>r.errors.length===0));result.ok=true;result.maxTouchFeedbackMs=Math.max(...result.taps.map(t=>t.delayMs));console.log('WEB_MOBILE_OK '+JSON.stringify({checks:result.checks.length,maxTouchFeedbackMs:result.maxTouchFeedbackMs}));
 }catch(error){result.ok=false;result.error=error.stack;result.failureStates=await Promise.all(opened.map(page=>page.evaluate(()=>({game:window.rivalsDiagnostics,lobby:window.rivalsLobbyState,touch:window.rivalsTouch,pointer:window.rivalsPointer})).catch(()=>null)));for(let i=0;i<opened.length;i++)await opened[i].screenshot({path:path.join(output,'mobile-failure-'+i+'.png')}).catch(()=>{});throw error;}
 finally{fs.writeFileSync(path.join(output,'web-mobile-check.json'),JSON.stringify(result,null,2));await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
