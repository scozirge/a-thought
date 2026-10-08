const {chromium}=require(process.env.RIVALS_PLAYWRIGHT_MODULE||'playwright');
const {enterRoom}=require('./WebRoomHelpers.cjs');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const output=path.resolve(__dirname,'../Logs'),results={errors:[],attempts:[]};
const me=s=>s.players.find(p=>p.seat===s.localSeat);
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.RIVALS_CHROME||undefined,headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>results.errors.push(e.message));
 const state=()=>page.evaluate(()=>window.rivalsDiagnostics);
 const wait=ms=>page.waitForTimeout(ms);
 async function aim(yaw,pitch=0){const s=await state();await page.evaluate(({x,y})=>document.dispatchEvent(new MouseEvent('mousemove',{movementX:x,movementY:y,bubbles:true})),{x:(((yaw-s.look.x+540)%360)-180)/.12,y:(pitch-s.look.y)/.12});await wait(110);}
 async function walk(yaw,predicate,limit=6000){await aim(yaw);await page.keyboard.down('Shift');await page.keyboard.down('w');const deadline=Date.now()+limit;let s;while(Date.now()<deadline){s=await state();if(s.phase!==2||me(s).health<=0||predicate(me(s)))break;await wait(30);}await page.keyboard.up('w');await page.keyboard.up('Shift');return s;}
 try{
  const url=new URL(process.env.RIVALS_WEB_URL||'http://localhost:8184/');url.searchParams.set('diagnostics','1');await page.goto(url.href);
  await enterRoom(page,{room:'武器測試'+Date.now().toString(36),name:'武器貓貓'});
  const box=await page.locator('canvas').boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2,{delay:60});await wait(120);
  for(let attempt=0;attempt<4;attempt++){
   let s=await state();if(s.phase!==2||me(s).health<=0)await page.waitForFunction(()=>window.rivalsDiagnostics.phase===2&&window.rivalsDiagnostics.players.find(p=>p.seat===window.rivalsDiagnostics.localSeat).health>0,null,{timeout:75000});
   const team=me(await state()).team,cornerX=team===0?30:-30;
   s=await walk(cornerX>0?90:270,p=>Math.abs(p.position.x-cornerX)<1.5,6500);if(me(s).health<=0)continue;
   await page.waitForFunction(()=>window.rivalsDiagnostics.players.find(p=>p.seat===window.rivalsDiagnostics.localSeat).weapon===0,null,{timeout:5500});
   await aim(0,-45);await page.mouse.down({button:'right'});await wait(200);s=await state();
   if(me(s).health<=0){await page.mouse.up({button:'right'});continue;}
   await page.screenshot({path:path.join(output,'battle-web-rifle-aim.png')});results.ads=s;
   const before=me(s).shots;await page.mouse.down();await wait(1250);await page.mouse.up();s=await state();results.attempts.push(s);
   if(me(s).health<=0){await page.mouse.up({button:'right'});continue;}
   assert.ok(me(s).shots>=before+8);assert.ok(me(s).heat>6);results.spray=s;
   await page.screenshot({path:path.join(output,'battle-web-rifle-spray.png')});await page.mouse.up({button:'right'});await wait(950);
   assert.equal(me(await state()).heat,0);results.ok=true;break;
  }
  assert.equal(results.ok,true,'rifle ADS, sustained fire and recovery');assert.deepEqual(results.errors,[]);console.log('WEB_WEAPON_VIEW_OK');
 }finally{fs.writeFileSync(path.join(output,'battle-web-weapon-check.json'),JSON.stringify(results,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
