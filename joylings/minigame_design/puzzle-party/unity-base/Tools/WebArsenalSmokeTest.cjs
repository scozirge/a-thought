// Two real Photon Web players. Only browser movement/attack input; no game setters.
const {chromium}=require(process.env.RIVALS_PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.resolve(process.env.RIVALS_TEST_OUTPUT||'Logs/Arsenal/NetworkArsenal');fs.mkdirSync(output,{recursive:true});
const url=new URL(process.env.RIVALS_WEB_URL||'http://127.0.0.1:8196/');url.searchParams.set('diagnostics','1');
const result={checks:[],errors:[],weapons:[],logs:[]},me=s=>s.players.find(p=>p.seat===s.localSeat),angle=x=>((x+540)%360)-180;
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.RIVALS_CHROME||undefined,headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 const pages=[];const state=p=>p.evaluate(()=>window.rivalsDiagnostics);
 async function wait(p,test,label,ms=20000){const end=Date.now()+ms;while(Date.now()<end){const s=await state(p);if(s?.players&&test(s))return s;await p.waitForTimeout(50);}throw Error(label+' timeout');}
 async function open(){const context=await browser.newContext({viewport:{width:1280,height:800}}),p=await context.newPage();pages.push(p);p.on('pageerror',e=>result.errors.push(e.message));p.on('console',m=>{if(/^(?:\w*Exception|RuntimeError):/.test(m.text()))result.errors.push(m.text());if(/RIVALS_|Exception/.test(m.text()))result.logs.push(m.text());});await p.goto(url.href,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.rivalsLobbyState?.ready,null,{timeout:180000});return p;}
 async function aim(p,yaw,pitch=0){const s=await state(p);await p.evaluate(({x,y})=>document.dispatchEvent(new MouseEvent('mousemove',{movementX:x,movementY:y,bubbles:true})),{x:angle(yaw-s.look.x)/.12,y:(pitch-s.look.y)/.12});await p.waitForTimeout(100);}
 async function walk(p,x,z){
  const end=Date.now()+16000;await p.keyboard.down('Shift');await p.keyboard.down('w');
  try{while(Date.now()<end){
   let s=await state(p),a=me(s);assert.ok(a.health>0&&s.phase===2,'route interrupted by combat');
   let dx=x-a.position.x,dz=z-a.position.z;if(Math.hypot(dx,dz)<.7)return;
   if(Math.hypot(dx,dz)<3){
    // A cleaver sprint can cross a waypoint between 100 ms diagnostics samples.
    // Stop and take short walking steps near the waypoint without relaxing its tolerance.
    await p.keyboard.up('w');await p.keyboard.up('Shift');await p.waitForTimeout(200);
    a=me(await state(p));dx=x-a.position.x;dz=z-a.position.z;if(Math.hypot(dx,dz)<.7)return;
    await aim(p,Math.atan2(dx,dz)*180/Math.PI);await p.keyboard.down('w');await p.waitForTimeout(60);await p.keyboard.up('w');await p.waitForTimeout(180);
   }else {await p.keyboard.down('Shift');await p.keyboard.down('w');await aim(p,Math.atan2(dx,dz)*180/Math.PI);await p.waitForTimeout(50);}
  }}finally{await p.keyboard.up('w');await p.keyboard.up('Shift');}
  throw Error('walk stuck '+JSON.stringify({target:{x,z},state:me(await state(p))}));
 }
 function pass(s){result.checks.push(s);console.log('WEB_ARSENAL_CHECK '+s);}
 try {
  const host=await open(),client=await open();
  const kinds=process.env.RIVALS_TEST_WEAPONS?process.env.RIVALS_TEST_WEAPONS.split(',').map(Number):[6,5,8,2,7];
  assert.ok(kinds.length&&kinds.every(kind=>[6,5,8,2,7].includes(kind)),'supported weapon selection');
  for(const kind of kinds) {
   const name='武器'+kind+Date.now().toString(36).slice(-4);await host.locator('#player-name').fill(name);await host.locator('#create-room').click();await wait(host,s=>s.phase===2,'host ready');
   await client.locator('#player-name').fill('武器訪客');await client.locator('.room-row').filter({has:client.getByText(name+'的房間',{exact:true})}).getByRole('button',{name:'加入房間',exact:true}).click();await wait(client,s=>s.phase===2&&s.players.filter(p=>!p.bot).length===2,'client ready');
   const box=await client.locator('canvas').boundingBox();await client.mouse.click(box.x+box.width*.5,box.y+box.height*.5);await wait(client,s=>s.controls,'client control');let s=await state(client);const side=me(s).team===0?-1:1;
   // Mirrored routes use the clear spawn lane and outer corridor.
   const route=kind===6?[[18*side,29*side]]:kind===5?[[33*side,29*side],[33*side,0]]:kind===8?[[33*side,29*side],[33*side,-18*side],[30*side,-18*side]]:kind===2?[[0,29*side],[0,12*side],[8*side,12*side]]:[[0,29*side],[0,20*side]];
   for(const [x,z] of route)await walk(client,x,z);
   s=await wait(client,s=>me(s).weapon===kind,'collect '+kind,48000);const seat=s.localSeat;await wait(host,h=>h.players.find(p=>p.seat===seat).weapon===kind,'weapon replicated');assert.equal(s.identityName,'武器訪客');assert.equal(s.pickups.length,14);
   await aim(client,side>0?180:0,kind===7?45:kind===6||kind===8?20:kind===2?0:-40);await client.screenshot({path:path.join(output,'weapon-'+kind+'.png')});
   if(kind===2){
    // Let the last route/aim input reach the host before recording the rest pose.
    await client.waitForTimeout(500);
    const idle=(await state(host)).players.find(p=>p.seat===seat);await client.mouse.down();await client.waitForTimeout(45);await client.mouse.up();
    await wait(host,h=>h.players.find(p=>p.seat===seat).shots>idle.shots&&h.players.find(p=>p.seat===seat).cleaverSwingAge<.56,'remote melee animation');
    const samples=[],until=Date.now()+800;while(Date.now()<until){samples.push((await state(host)).players.find(p=>p.seat===seat));await host.waitForTimeout(20);}
    result.remoteSwing={idle,samples};
    const distance=p=>Math.hypot(...['x','y','z'].map(axis=>(p.weaponPosition[axis]-p.position[axis])-(idle.weaponPosition[axis]-idle.position[axis])));
    assert.ok(samples.some(p=>distance(p)>.35),'remote blade and arm make a large sweep');
    const raised=samples.filter(p=>p.cleaverSwingAge>=.05&&p.cleaverSwingAge<.20).sort((a,b)=>b.weaponPosition.y-a.weaponPosition.y)[0];
    const lower=samples.filter(p=>p.cleaverSwingAge>=.23&&p.cleaverSwingAge<.38).sort((a,b)=>a.weaponPosition.y-b.weaponPosition.y)[0];
    assert.ok(raised&&lower,'remote windup and downstroke observed');
    assert.ok((side>0?-1:1)*(raised.weaponPosition.x-lower.weaponPosition.x)>.35&&raised.weaponPosition.y-lower.weaponPosition.y>.45,'remote chop travels from upper right to lower left');
    const recovered=(await state(host)).players.find(p=>p.seat===seat);assert.equal(recovered.weapon,2);assert.equal(recovered.shots,idle.shots+1);assert.ok(distance(recovered)<.06,'remote blade returns to hand rest');
    pass('cleaver upper-right to lower-left arm chop and recovery replicated to host');
    await aim(client,side>0?180:0,-40);await client.waitForTimeout(250);
   }
   const before=me(await state(client)).shots,sequence=(await state(host)).ordnance.reduce((m,o)=>Math.max(m,o.sequence),0);
   if(kind===2){await client.mouse.down({button:'right'});await client.waitForTimeout(45);await client.mouse.up({button:'right'});}else {await client.mouse.down();await client.waitForTimeout(kind===5?950:45);await client.mouse.up();}
   s=await wait(client,s=>me(s).shots>before,'client attack');await wait(host,h=>h.players.find(p=>p.seat===seat).shots>=me(s).shots,'host confirms attack');
   if(kind===5){assert.ok(me(s).shots-before>=8);assert.ok(me(s).spread>4);await client.screenshot({path:path.join(output,'gatling-expanded-crosshair.png')});await wait(client,s=>me(s).heat===0,'gatling recovers',5000);await client.keyboard.press('r');await wait(client,s=>me(s).reloading,'gatling reload');await wait(host,h=>h.players.find(p=>p.seat===seat).reloading,'reload replicated');await wait(client,s=>!me(s).reloading&&me(s).ammo===100,'gatling full magazine',14000);}
   else {
    const observed=await wait(host,h=>h.ordnance.some(o=>o.sequence>sequence&&o.weapon===kind&&o.ownerSeat===seat),'replicated projectile/strike',4000);const attack=observed.ordnance.find(o=>o.sequence>sequence&&o.weapon===kind&&o.ownerSeat===seat);assert.equal(attack.owner,'武器訪客');
    if(kind===7||kind===2)await wait(client,s=>me(s).weapon===1,'single-use returns pistol');
    if(kind===6||kind===8){assert.ok(me(s).cooldown>2);assert.equal(me(s).reloading,false);}
    if(kind===6){const count=me(s).shots;await client.mouse.down();await client.waitForTimeout(4500);await client.mouse.up();assert.equal(me(await state(client)).shots,count,'held cooldown press cannot auto-launch');await client.waitForTimeout(100);await client.mouse.click(box.x+box.width*.5,box.y+box.height*.5);await wait(client,s=>me(s).shots===count+1,'fresh rocket client press');await wait(host,h=>h.players.find(p=>p.seat===seat).shots===count+1,'one rocket confirmed by host');pass('rocket manual trigger agrees on client and host');}
    if(kind===8){await wait(host,s=>s.ordnance.some(o=>o.sequence===attack.sequence&&o.stage===3),'poison zone on host',5000);await wait(client,s=>s.ordnance.some(o=>o.sequence===attack.sequence&&o.stage===3),'poison zone on client',5000);await client.keyboard.down('w');try{await wait(client,s=>me(s).poisonSlowed,'client walks into poison',2500);}finally{await client.keyboard.up('w');}await wait(host,h=>h.players.find(p=>p.seat===seat).poisonSlowed,'host confirms poison slow',1500);assert.ok(Math.abs(me(await state(client)).moveSpeed-3.3)<.02);pass('poison movement slow agrees on client and host');await client.screenshot({path:path.join(output,'poison-synced.png')});}
    if(kind===7){assert.equal(attack.stage,4);assert.ok(attack.remaining>5);await client.screenshot({path:path.join(output,'nuke-synced-warning.png')});await wait(host,s=>s.ordnance.some(o=>o.sequence===attack.sequence&&o.stage===5),'host nuclear impact',10000);await wait(client,s=>s.ordnance.some(o=>o.sequence===attack.sequence&&o.stage===5),'client nuclear impact',3000);}
    result.weapons.push({kind,attack,client:s});
   }
   pass('weapon '+kind+' real client pickup, attack and host replication');
   await client.keyboard.press('Escape');await client.evaluate(()=>player.SendMessage('RIVALS Session','WebControlCommand','leave'));await client.waitForFunction(()=>window.rivalsLobbyState?.visible&&rivalsLobbyState.ready,null,{timeout:30000});
   await host.evaluate(()=>player.SendMessage('RIVALS Session','WebControlCommand','leave'));await host.waitForFunction(()=>window.rivalsLobbyState?.visible&&rivalsLobbyState.ready,null,{timeout:30000});
  }
  assert.deepEqual(result.errors,[]);result.ok=true;console.log('WEB_ARSENAL_OK');
 }catch(error){result.ok=false;result.error=error.stack;result.failure=await Promise.all(pages.map(p=>state(p).catch(()=>null)));for(let i=0;i<pages.length;i++)await pages[i].screenshot({path:path.join(output,'failure-'+i+'.png')}).catch(()=>{});throw error;}
 finally{fs.writeFileSync(path.join(output,'web-arsenal-check.json'),JSON.stringify(result,null,2));await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
