// Exercises only normal browser input; diagnostics are read-only.
const {chromium}=require(process.env.RIVALS_PLAYWRIGHT_MODULE||'playwright');
const {enterRoom}=require('./WebRoomHelpers.cjs');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const output=path.resolve(__dirname,'../Logs'),results={errors:[],reloads:[]};
const me=s=>s.players.find(p=>p.seat===s.localSeat);
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.RIVALS_CHROME||undefined,headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>results.errors.push(e.message));
 page.on('console',m=>{if(/^(InvalidOperationException|NullReferenceException|MissingReferenceException|ArgumentException):/.test(m.text()))results.errors.push(m.text());});
 const state=()=>page.evaluate(()=>window.rivalsDiagnostics),wait=ms=>page.waitForTimeout(ms);
 async function aim(yaw,pitch=0){const s=await state();await page.evaluate(({x,y})=>document.dispatchEvent(new MouseEvent('mousemove',{movementX:x,movementY:y,bubbles:true})),{x:(((yaw-s.look.x+540)%360)-180)/.12,y:(pitch-s.look.y)/.12});await wait(120);}
 async function walk(yaw,predicate,limit=6500){await aim(yaw);await page.keyboard.down('Shift');await page.keyboard.down('w');const deadline=Date.now()+limit;let s;while(Date.now()<deadline){s=await state();if(s.phase!==2||me(s).health<=0||predicate(me(s)))break;await wait(30);}await page.keyboard.up('w');await page.keyboard.up('Shift');return s;}
 async function reload(label){
  await aim(0,-35);const initial=await state(),before=me(initial).shots;
  await page.mouse.down();await wait(100);await page.mouse.up();
  await page.waitForFunction(n=>window.rivalsDiagnostics.players.find(p=>p.seat===window.rivalsDiagnostics.localSeat).shots>n,before,{timeout:2000});
  await page.keyboard.press('r',{delay:55});
  await page.waitForFunction(()=>window.rivalsDiagnostics.players.find(p=>p.seat===window.rivalsDiagnostics.localSeat).reloading,null,{timeout:2000});
  const samples=[],seen=new Set(),deadline=Date.now()+3500;let capturedInsert=false;
  while(Date.now()<deadline){
   const s=await state(),p=me(s);if(!p.reloading)break;
   assert.ok(p.health>0&&s.phase===2,'alive during reload');samples.push({progress:p.reloadProgress,stage:p.reloadStage,ammo:p.ammo,look:s.look});
   if(!seen.has(p.reloadStage)){seen.add(p.reloadStage);await page.screenshot({path:path.join(output,`balance-web-${label}-${seen.size}.png`)});}
   if(!capturedInsert&&p.reloadProgress>=.57&&p.reloadProgress<.73){capturedInsert=true;await page.screenshot({path:path.join(output,`balance-web-${label}-insert.png`)});}
   await wait(25);
  }
  const final=await state();assert.equal(me(final).reloading,false);assert.equal(me(final).ammo,label==='pistol'?12:30);
  assert.ok(seen.size>=2,'reload has distinct visible steps');
  for(const s of samples){assert.ok(Math.abs(s.look.x-initial.look.x)<.01&&Math.abs(s.look.y-initial.look.y)<.01,'reload animation leaves aim stable');}
  results.reloads.push({label,samples,final});
 }
 try{
  const url=new URL(process.env.RIVALS_WEB_URL||'http://localhost:8184/');url.searchParams.set('diagnostics','1');url.searchParams.set('v','balance-qa');await page.goto(url.href);
  await enterRoom(page,{name:'裝填貓貓',room:'裝填貓貓的房間'});
  let s=await state();assert.equal(s.maxHealth,300);assert.ok(s.players.every(p=>p.health===300));
  assert.equal(s.pickups.length,4);assert.deepEqual(s.pickups.map(p=>p.weapon).sort(),[0,0,3,4]);assert.ok(s.pickups.every(p=>Math.abs(p.position.x)===30&&Math.abs(p.position.z)===30));results.start=s;
  const box=await page.locator('canvas').boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2,{delay:60});await wait(350);
  await reload('pistol');
  s=await state();const cornerX=me(s).team===0?30:-30;
  s=await walk(cornerX>0?90:270,p=>Math.abs(p.position.x-cornerX)<1.4);assert.ok(me(s).health>0);
  await page.waitForFunction(()=>window.rivalsDiagnostics.players.find(p=>p.seat===window.rivalsDiagnostics.localSeat).weapon===0,null,{timeout:6500});results.pickup=await state();
  await aim(cornerX>0?315:135,4);await page.screenshot({path:path.join(output,'balance-web-covers.png')});
  await reload('rifle');
  // Same gun must remain available beneath the player after its five-second respawn.
  s=await state();const picked=me(s).pickups,slot=s.pickups.find(p=>p.weapon===0&&Math.sign(p.position.x)===Math.sign(cornerX)).slot;
  await page.waitForFunction(slot=>window.rivalsDiagnostics.pickups[slot].available,slot,{timeout:6500});s=await state();assert.equal(me(s).pickups,picked);results.sameGun=s;
  // Observe a real elimination to inspect red/blue name cards in the shipped UI.
  await aim(cornerX>0?315:135,0);
  await page.waitForFunction(()=>window.rivalsDiagnostics.killFeed.some(e=>e.remaining>2),null,{timeout:65000});results.feed=await state();
  await page.screenshot({path:path.join(output,'balance-web-killfeed.png')});
  // Start a fresh normal room for the movement check: the reload test deliberately
  // leaves us exposed to combat. No health overrides or gameplay test setters.
  await page.goto(url.href);await enterRoom(page,{name:'平台兔兔',room:'平台兔兔的房間'});
  const nextBox=await page.locator('canvas').boundingBox();await page.mouse.click(nextBox.x+nextBox.width/2,nextBox.y+nextBox.height/2,{delay:60});await wait(180);
  s=await state();const side=1,sign=me(s).team===0?-1:1;results.deckRoute=[];
  results.deckRoute.push(await walk(90,p=>Math.abs(p.position.x-14)<.6,3500));
  results.deckRoute.push(await walk(sign<0?0:180,p=>Math.abs(p.position.z-sign*14)<.6,3500));
  results.deckRoute.push(await walk(side>0?90:270,p=>Math.abs(p.position.x-side*18)<.6,1500));
  s=await walk(sign<0?180:0,p=>Math.abs(p.position.z-sign*20)<.7,2000);
  results.deck=s;assert.ok(me(s).health>0&&me(s).position.y>1.4,'walk up new stairs onto 1.5m deck');
  await aim(sign<0?0:180,4);await page.screenshot({path:path.join(output,'balance-web-deck.png')});
  assert.deepEqual(results.errors,[]);results.ok=true;console.log('WEB_BALANCE_OK');
 }finally{fs.writeFileSync(path.join(output,'balance-web-check.json'),JSON.stringify(results,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
