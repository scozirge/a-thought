// Exercise shipped training mode through normal UI/input, including offline play.
const {chromium}=require(process.env.RIVALS_PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.resolve(process.env.RIVALS_TEST_OUTPUT||'Logs/Training/Web');fs.mkdirSync(output,{recursive:true});
const url=new URL(process.env.RIVALS_WEB_URL||'http://127.0.0.1:8198/');url.searchParams.set('diagnostics','1');
const result={checks:[],errors:[]},me=s=>s.players.find(p=>p.seat===s.localSeat),angle=x=>((x+540)%360)-180;
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.RIVALS_CHROME||undefined,headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding',...(url.protocol==='https:'?['--disable-http2']:[])]});
 let page;
 function pass(label){result.checks.push(label);console.log('TRAINING_WEB_CHECK '+label);}
 const state=p=>p.evaluate(()=>window.rivalsDiagnostics);
 async function wait(p,test,label,ms=16000){const end=Date.now()+ms;while(Date.now()<end){const s=await state(p);if(s?.players&&test(s))return s;await p.waitForTimeout(60);}throw Error(label+' timeout');}
 try{
  for(const mobile of [false,true]){
   const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:800},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:1});page=await context.newPage();const mode=mobile?'mobile':'keyboard';
   page.on('pageerror',e=>result.errors.push(e.message));page.on('console',m=>{if(/^(?:\w*Exception|RuntimeError):/.test(m.text()))result.errors.push(m.text());});
   await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.rivalsLobbyState?.visible&&rivalsLobbyState.canTrain,null,{timeout:Number(process.env.RIVALS_STARTUP_TIMEOUT_MS||180000)});
   await page.locator('#player-name').fill('訓練'+mode);await page.locator('#training-entry').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,mode+'-menu.png')});
   if(mobile){await context.setOffline(true);await page.waitForTimeout(150);}
   await page.locator('#training-entry').click();let s=await wait(page,s=>s.training&&s.phase===2&&s.players.length===8,'enter training',40000);
   assert.equal(s.pickups.length,9);assert.deepEqual(s.pickups.map(p=>p.weapon).sort(),[0,1,2,3,4,5,6,7,8]);assert.equal(s.players.filter(p=>p.bot).length,7);assert.equal(s.identityName,'訓練'+mode);
   if(!mobile){const box=await page.locator('canvas').boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);}
   await wait(page,s=>s.controls,'controls');const cdp=await context.newCDPSession(page);
   async function aim(yaw,pitch=0){
    // Diagnostics publish every 100 ms. Let pointer-lock/menu deltas settle
    // before steering again, or a stale sample can apply the same turn twice.
    await page.waitForTimeout(220);
    for(let i=0;i<12;i++){
     const s=await state(page),dx=angle(yaw-s.look.x),dy=pitch-s.look.y;if(Math.abs(dx)<.5&&Math.abs(dy)<.5)return;
     if(!mobile)await page.evaluate(({x,y})=>document.dispatchEvent(new MouseEvent('mousemove',{movementX:x,movementY:y,bubbles:true})),{x:dx/.12,y:dy/.12});
     else {const rect=await page.locator('canvas').boundingBox(),scale=.12*1.6*720/Math.max(240,rect.height),start={x:rect.x+rect.width*.5,y:rect.y+rect.height*.42},end={x:start.x+Math.max(-90,Math.min(90,dx/scale)),y:start.y+Math.max(-65,Math.min(65,dy/scale))};for(const [type,p] of [['touchStart',start],['touchMove',end],['touchEnd',end]])await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:[{id:71,...p,radiusX:3,radiusY:3,force:type==='touchEnd'?0:1}]});}
     await page.waitForTimeout(220);
    }throw Error('aim failed');
   }
   async function select(kind){
    if(!mobile){await page.keyboard.press('Escape');await page.waitForTimeout(120);}
    await page.locator('#training-weapons').click();await page.locator('[data-weapon="'+kind+'"]').click();
    await wait(page,s=>me(s).weapon===kind&&s.controls,'select '+kind);await page.waitForTimeout(230);
   }
   async function press(held=false,secondary=false){
    if(!mobile){if(held)await page.mouse.down();else {await page.mouse.down({button:secondary?'right':'left'});await page.waitForTimeout(50);await page.mouse.up({button:secondary?'right':'left'});}}
    else {const rect=await page.locator(secondary?'#touch-aim':'#touch-fire').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:72,x:rect.x+rect.width/2,y:rect.y+rect.height/2,radiusX:3,radiusY:3,force:1}]});if(!held){await page.waitForTimeout(50);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}}
   }
   async function release(){if(mobile)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();}
   const targets=s.players.filter(p=>p.bot).map(p=>({seat:p.seat,position:p.position}));await page.waitForTimeout(1400);s=await state(page);
   for(const t of targets){const p=s.players.find(p=>p.seat===t.seat);assert.equal(p.shots,0);assert.ok(Math.hypot(p.position.x-t.position.x,p.position.z-t.position.z)<.02);}
   pass(mode+' enters with all weapons and stationary targets'+(mobile?' while offline':''));
   for(const kind of [1,0,3,4,5,2]){
    await wait(page,s=>s.players.find(p=>p.seat===1).health>0&&me(s).health>0,'target respawn');await select(kind);await aim(0,8);const before=await state(page),life=before.players.find(p=>p.seat===1).spawnSequence;
    await press(true);try{await wait(page,s=>s.players.find(p=>p.seat===1).health===0,'weapon '+kind+' kills target',12000);}finally{await release();}
    assert.ok(me(await state(page)).shots>me(before).shots);await wait(page,s=>s.players.find(p=>p.seat===1).spawnSequence>life,'fixed target revives',5000);pass(mode+' weapon '+kind+' damage and target respawn');
   }
   await select(4);await aim(0,0);let before=me(await state(page)).shots;await press();await wait(page,s=>me(s).shots===before+1&&s.players.find(p=>p.seat===1).health===0,'single sniper headshot');pass(mode+' sniper headshot kills in one shot');await wait(page,s=>s.players.find(p=>p.seat===1).health>0,'headshot target respawn',5000);
   await select(2);await aim(0,8);before=me(await state(page)).shots;await press(false,true);await wait(page,s=>me(s).shots>before&&me(s).weapon===1,'throw cleaver');await wait(page,s=>s.players.find(p=>p.seat===1).health===0,'cleaver impact');pass(mode+' secondary cleaver returns pistol');
   await select(2);await aim(90,-6);before=me(await state(page)).shots;await press(false,true);await wait(page,s=>me(s).shots>before&&s.ordnance.some(o=>o.weapon===2&&o.stage===1&&o.position.x-me(s).position.x>22),'cleaver longer throw',3000);pass(mode+' cleaver travels beyond twenty-two meters');
   await wait(page,s=>s.players.find(p=>p.seat===1).health>0,'cleaver target respawn',5000);await select(6);await aim(0,22);before=me(await state(page)).shots;await press();await wait(page,s=>me(s).shots>before&&s.ordnance.some(o=>o.weapon===6),'rocket projectile');await page.waitForTimeout(600);assert.ok(me(await state(page)).health<300);pass(mode+' rocket trajectory and self damage');
   await select(6);await aim(0,-75);before=me(await state(page)).shots;await press();await wait(page,s=>me(s).shots===before+1,'manual rocket first shot');await page.waitForTimeout(250);await press();await page.waitForTimeout(4200);assert.equal(me(await state(page)).shots,before+1,'cooldown tap never queues');await press(true);try{await wait(page,s=>me(s).shots===before+2,'manual rocket second shot');await page.waitForTimeout(4300);assert.equal(me(await state(page)).shots,before+2,'holding rocket never repeats');}finally{await release();}await press();await wait(page,s=>me(s).shots===before+3,'fresh rocket click fires');pass(mode+' rocket requires a fresh press and discards cooldown taps');
   await select(8);await aim(90,0);before=me(await state(page)).shots;await press();await wait(page,s=>me(s).shots>before&&s.ordnance.some(o=>o.weapon===8&&o.stage===3&&o.position.x-me(s).position.x>13),'poison longer throw');pass(mode+' poison lands beyond thirteen meters when thrown level');
   await select(8);await aim(0,65);before=me(await state(page)).shots;await press();await wait(page,s=>me(s).shots>before&&s.ordnance.some(o=>o.weapon===8&&o.stage===3)&&me(s).poisonSlowed,'poison zone');await page.screenshot({path:path.join(output,mode+'-poison.png')});
   const slowStart=me(await state(page)).position;assert.ok(Math.abs(me(await state(page)).moveSpeed-3.3)<.02);
   if(mobile){const b=await page.locator('#touch-move').boundingBox(),start={x:b.x+b.width/2,y:b.y+b.height/2};await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:73,...start}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:73,x:start.x+48,y:start.y}]});}else await page.keyboard.down('d');
   await page.waitForTimeout(900);if(mobile)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.keyboard.up('d');const slowEnd=me(await state(page)).position;assert.ok(slowEnd.x-slowStart.x>2&&slowEnd.x-slowStart.x<3.5,'actual movement is slowed');pass(mode+' poison reduces actual movement speed');
   await page.waitForTimeout(5600);await wait(page,s=>me(s).health>0,'poison self respawn',5000);pass(mode+' poison zone and continued practice');
   await select(7);await aim(0,45);s=await state(page);const life=me(s).spawnSequence;before=me(s).shots;await press();await wait(page,s=>me(s).shots>before&&me(s).weapon===1&&s.ordnance.some(o=>o.weapon===7&&o.stage===4),'nuke warning');await page.screenshot({path:path.join(output,mode+'-nuke-warning.png')});
   await wait(page,s=>me(s).health===0,'nuke self death',10000);await wait(page,s=>me(s).spawnSequence>life&&me(s).health===300,'nuke self respawn',5000);s=await state(page);assert.equal(me(s).weapon,1);assert.equal(s.phase,2);pass(mode+' nuke consumed and automatic player respawn with pistol');
   await select(5);await aim(0,-35);await page.screenshot({path:path.join(output,mode+'-range.png')});
   if(mobile){await page.locator('#touch-menu').tap();await page.locator('#touch-leave').tap();}else {await page.keyboard.press('Escape');await page.evaluate(()=>player.SendMessage('RIVALS Session','WebControlCommand','leave'));}
   await page.waitForFunction(()=>window.rivalsLobbyState?.visible&&rivalsLobbyState.canTrain,null,{timeout:30000});assert.equal(await page.locator('#training-weapons').isVisible(),false);
   await page.locator('#training-entry').click();await wait(page,s=>s.training&&s.phase===2&&s.blueKills===0&&s.players.length===8,'re-entry',40000);pass(mode+' clean return and re-entry');
   if(!mobile){
    await page.evaluate(()=>player.SendMessage('RIVALS Session','WebControlCommand','leave'));await page.waitForFunction(()=>window.rivalsLobbyState?.visible&&rivalsLobbyState.ready&&!rivalsLobbyState.busy,null,{timeout:40000});
    await page.locator('#create-room').click();await wait(page,s=>!s.training&&s.phase===1&&s.players.length===8,'normal room after training');
    assert.equal(await page.locator('#training-weapons').isVisible(),false);await page.evaluate(()=>player.SendMessage('RIVALS Session','WebControlCommand','training-select:7'));await page.waitForTimeout(250);
    s=await state(page);assert.equal(me(s).weapon,1);assert.equal(s.players.filter(p=>p.team===0).length,4);assert.equal(s.players.filter(p=>p.team===1).length,4);
    await wait(page,s=>s.phase===2,'normal combat');const normal=await state(page);await page.waitForTimeout(2200);s=await state(page);assert.ok(s.players.some(p=>p.bot&&Math.hypot(p.position.x-normal.players.find(n=>n.seat===p.seat).position.x,p.position.z-normal.players.find(n=>n.seat===p.seat).position.z)>.1));pass('normal multiplayer rules, moving bots and armory isolation after training');
   }
   if(mobile)await context.setOffline(false);await context.close();
  }
  assert.deepEqual(result.errors,[]);result.ok=true;console.log('WEB_TRAINING_OK '+result.checks.length);
 }catch(error){result.ok=false;result.error=error.stack;result.failure=await state(page).catch(()=>null);if(page)await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});throw error;}
 finally{fs.writeFileSync(path.join(output,'web-training-check.json'),JSON.stringify(result,null,2));await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
