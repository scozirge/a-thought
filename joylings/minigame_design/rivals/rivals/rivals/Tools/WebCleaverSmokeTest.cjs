// Check the real diagonal cleaver motion, hit, recovery and throw through browser input.
const {chromium}=require(process.env.RIVALS_PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.resolve(process.env.RIVALS_TEST_OUTPUT||'Logs/Chop/Cleaver');fs.mkdirSync(output,{recursive:true});
const url=new URL(process.env.RIVALS_WEB_URL||'http://127.0.0.1:8198/');url.searchParams.set('diagnostics','1');
const result={checks:[],errors:[]},me=s=>s.players.find(p=>p.seat===s.localSeat),angle=x=>((x+540)%360)-180;
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.RIVALS_CHROME||undefined,headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding',...(url.protocol==='https:'?['--disable-http2']:[])]});
 let page;
 function pass(label){result.checks.push(label);console.log('CLEAVER_WEB_CHECK '+label);}
 const state=p=>p.evaluate(()=>window.rivalsDiagnostics);
 async function wait(p,test,label,ms=16000){const end=Date.now()+ms;while(Date.now()<end){const s=await state(p);if(s?.players&&test(s))return s;await p.waitForTimeout(60);}throw Error(label+' timeout');}
 try{
  for(const mobile of (process.env.RIVALS_TEST_MODES === 'mobile' ? [true] : [false,true])){
   const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:800},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:1});page=await context.newPage();const mode=mobile?'mobile':'keyboard';
   page.on('pageerror',e=>result.errors.push(e.message));page.on('console',m=>{if(/^(?:\w*Exception|RuntimeError):/.test(m.text()))result.errors.push(m.text());});
   await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.rivalsLobbyState?.visible&&rivalsLobbyState.canTrain,null,{timeout:Number(process.env.RIVALS_STARTUP_TIMEOUT_MS||180000)});
   await page.locator('#player-name').fill('訓練'+mode);await page.locator('#training-entry').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,mode+'-menu.png')});
   if(mobile){await context.setOffline(true);await page.waitForTimeout(150);}
   await page.locator('#training-entry').click();let s=await wait(page,s=>s.training&&s.phase===2&&s.players.length===8,'enter training',40000);
   assert.equal(s.pickups.length,9);assert.deepEqual(s.pickups.map(p=>p.weapon).sort(),[0,1,2,3,4,5,6,7,8]);assert.equal(s.players.filter(p=>p.bot).length,7);assert.equal(s.identityName,'訓練'+mode);

   const cdp=await context.newCDPSession(page);
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
   await select(2);await aim(0,0);await page.waitForTimeout(300);
   const idle=me(await state(page)),targetLife=(await state(page)).players.find(p=>p.seat===1).spawnSequence;
   await page.screenshot({path:path.join(output,mode+'-idle.png')});await press();
   const samples=[],until=Date.now()+850;
   while(Date.now()<until){samples.push(me(await state(page)));await page.waitForTimeout(16);}
   const raised=samples.filter(p=>p.cleaverSwingAge>=.05&&p.cleaverSwingAge<.20).sort((a,b)=>b.weaponPosition.y-a.weaponPosition.y)[0];
   const lower=samples.filter(p=>p.cleaverSwingAge>=.23&&p.cleaverSwingAge<.38).sort((a,b)=>a.weaponPosition.x-b.weaponPosition.x)[0];
   assert.ok(raised&&lower,'windup and follow-through both observed');
   assert.ok(raised.weaponPosition.x>idle.weaponPosition.x+.02&&raised.weaponPosition.y>idle.weaponPosition.y+.16,'knife lifts to upper right');
   assert.ok(raised.weaponPosition.x-lower.weaponPosition.x>.40,'chop crosses from right to left');
   assert.ok(raised.weaponPosition.y-lower.weaponPosition.y>.25,'chop drops from upper right to lower left');
   assert.ok(lower.weaponPosition.x<idle.weaponPosition.x-.30&&lower.weaponPosition.y<idle.weaponPosition.y-.045,'cut ends down-left');
   const recovered=me(await state(page));assert.equal(recovered.shots,idle.shots+1);assert.equal(recovered.weapon,2);
   assert.ok(Math.hypot(...['x','y','z'].map(a=>recovered.weaponPosition[a]-idle.weaponPosition[a]))<.025,'knife returns to rest');
   assert.equal((await state(page)).players.find(p=>p.seat===1).health,0,'single cleaver strike kills target');
   result.swings??=[];result.swings.push({mode,idle,raised,lower,recovered,samples});pass(mode+' upper-right to lower-left chop, single hit and recovery');
   // A second real attack supplies ordered visual frames without slowing the motion sampler.
   await press();await page.waitForTimeout(50);await page.screenshot({path:path.join(output,mode+'-raised.png')});await page.waitForTimeout(70);await page.screenshot({path:path.join(output,mode+'-downstroke.png')});await page.waitForTimeout(400);
   const start=me(await state(page)).shots;await press(true);await page.waitForTimeout(1320);await release();await page.waitForTimeout(650);
   const after=me(await state(page));assert.ok(after.shots-start>=2&&after.shots-start<=3);assert.equal(after.weapon,2);assert.ok(after.cleaverSwingAge>=.56);pass(mode+' repeated chops finish and recover at normal cadence');
   await wait(page,s=>s.players.find(p=>p.seat===1).spawnSequence>targetLife&&s.players.find(p=>p.seat===1).health===300,'target respawn',6000);pass(mode+' training target revives after chopping');
   const throwStart=me(await state(page)).shots;await press(false,true);await wait(page,s=>me(s).shots===throwStart+1&&me(s).weapon===1,'throw returns pistol');pass(mode+' secondary throw restores pistol');
   if(mobile)await context.setOffline(false);await context.close();
  }
  if(process.env.RIVALS_LESSON_URL){
   page=await browser.newPage();await page.goto(process.env.RIVALS_LESSON_URL,{waitUntil:'networkidle',timeout:120000});
   const expected=new URL(url);expected.searchParams.delete('diagnostics');assert.equal(await page.locator('.battle-game-link').getAttribute('href'),expected.href);pass('lesson links to the current Web release');
  }
  assert.deepEqual(result.errors,[]);result.ok=true;console.log('WEB_CLEAVER_OK '+result.checks.length);
 }catch(error){result.ok=false;result.error=error.stack;result.failure=await state(page).catch(()=>null);if(page)await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});throw error;}
 finally{fs.writeFileSync(path.join(output,'web-cleaver-check.json'),JSON.stringify(result,null,2));await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
