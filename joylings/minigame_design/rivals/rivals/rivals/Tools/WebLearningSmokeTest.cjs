// Real room peers and ordinary UI/input only. No test mutation endpoint is shipped.
const {chromium}=require(process.env.RIVALS_PLAYWRIGHT_MODULE||'playwright');
const {enterRoom}=require('./WebRoomHelpers.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),output=path.resolve(process.env.RIVALS_TEST_OUTPUT||path.join(root,'Logs/Learning/Web'));
const bank=JSON.parse(fs.readFileSync(path.join(root,'Assets/Rivals/Resources/WeaponQuestions.json'),'utf8'));
fs.mkdirSync(output,{recursive:true});const result={checks:[],errors:[]};
const me=s=>s.players.find(p=>p.seat===s.localSeat),angle=a=>((a+540)%360)-180;
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.RIVALS_CHROME||undefined,headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 const state=p=>p.evaluate(()=>window.rivalsDiagnostics);
 function check(ok,label){assert.ok(ok,label);result.checks.push(label);console.log('LEARNING_WEB_CHECK '+label);}
 async function open(){const c=await browser.newContext({viewport:{width:1280,height:800}}),p=await c.newPage();p.on('pageerror',e=>result.errors.push(e.message));const url=new URL(process.env.RIVALS_WEB_URL||'http://127.0.0.1:8188/');url.searchParams.set('diagnostics','1');await p.goto(url.href);return p;}
 async function engage(p){const b=p.locator('#resume-pointer');if(await b.isVisible())await b.click();else await p.locator('#unity-canvas').click({position:{x:600,y:400}});}
 async function die(p){
  const until=Date.now()+150000;let next=Date.now()+15000,lastPosition=null,stuck=0,escape=0;
  while(Date.now()<until){const s=await state(p),local=me(s);if(local.health===0&&s.phase===2)return;
   if(s.phase!==2){await p.waitForTimeout(500);continue;}
   if(!s.controls)await engage(p);
   if(lastPosition&&Math.hypot(local.position.x-lastPosition.x,local.position.z-lastPosition.z)<.15)stuck++;else stuck=0;
   lastPosition=local.position;
   if(stuck>=5){await p.keyboard.up('w');const key=escape++%2?'a':'d';await p.keyboard.down(key);await p.waitForTimeout(1800);await p.keyboard.up(key);stuck=0;continue;}
   const enemies=s.players.filter(x=>x.bot&&x.team!==local.team&&x.health>0).sort((a,b)=>Math.hypot(a.position.x-local.position.x,a.position.z-local.position.z)-Math.hypot(b.position.x-local.position.x,b.position.z-local.position.z));
   if(enemies[0]){const target=enemies[0].position,yaw=Math.atan2(target.x-local.position.x,target.z-local.position.z)*180/Math.PI;
    await p.evaluate(({x,y})=>document.dispatchEvent(new MouseEvent('mousemove',{movementX:x,movementY:y,bubbles:true})),{x:angle(yaw-s.look.x)/.12,y:-s.look.y/.12});
    const distance=Math.hypot(target.x-local.position.x,target.z-local.position.z);if(distance>6)await p.keyboard.down('w');else await p.keyboard.up('w');
   }
   if(Date.now()>next){console.log('LEARNING_WEB_WAIT '+JSON.stringify({health:local.health,progress:local.learningProgress,position:local.position}));next=Date.now()+15000;}
   await p.waitForTimeout(450);
  }throw new Error('Timed out waiting for a combat death');
 }
 try{
  const host=await open(),client=await open(),room='徽章'+Date.now().toString(36).slice(-5);
  await host.locator('#training-entry').click();await host.waitForFunction(()=>window.rivalsDiagnostics?.training&&window.rivalsDiagnostics.phase===2,null,{timeout:90000});
  await host.locator('#training-weapons').click();await host.locator('#armory-grid [data-weapon="7"]').click();
  await host.waitForFunction(()=>{const s=window.rivalsDiagnostics;return s.players.find(p=>p.seat===s.localSeat).weapon===7;});
  check(!(await host.evaluate(()=>window.rivalsLearningState?.visible)),'training keeps free weapon selection without a quiz');
  await host.evaluate(()=>window.rivalsLearningCommand('leave'));await host.waitForFunction(()=>window.rivalsLobbyState?.visible&&window.rivalsLobbyState.ready);
  await enterRoom(host,{room,name:room,create:true});await enterRoom(client,{room,name:'答題學生',create:false});
  check(me(await state(client)).learningProgress===0,'joining starts with zero badges');
  for(const peer of [host,client])check(JSON.stringify((await state(peer)).pickups.map(p=>p.weapon).sort())==='[0,0,3,4]','host and client have only ordinary ground weapons');
  for(let attempt=0;attempt<4;attempt++){
   await die(client);await client.keyboard.up('w');await client.waitForFunction(()=>window.rivalsLearningState?.visible&&window.rivalsLearningState.state===1);
   let view=await client.evaluate(()=>window.rivalsLearningState);const question=attempt===0?0:attempt-1;check(view.question===question,'fixed question or retry '+attempt);
   const life=view.life,correct=bank.stages[0].questions[question].answer,choice=attempt===0?1:correct;
   if(attempt===0){await client.waitForTimeout(3500);check(me(await state(client)).health===0,'question does not auto-respawn after three seconds');await client.screenshot({path:path.join(output,'real-question.png')});}
   await client.locator(`[data-option="${choice}"]`).click();await client.waitForFunction(()=>window.rivalsLearningState?.state===2);
   view=await client.evaluate(()=>window.rivalsLearningState);check(view.progress===Math.max(0,attempt),'one correct answer equals one badge '+attempt);
   check(await client.locator('#learning-stars').isVisible()===(attempt>0),'only correct answers show stars '+attempt);
   if(attempt>0)check(await client.locator('#learning-stars .is-filled').count()===attempt,'host-confirmed star count '+attempt);
   // The same public command as the button: host must reject a duplicate.
   await client.evaluate(({life,question,choice})=>window.rivalsLearningCommand(`learning:answer:${life}:${question}:${choice}`),{life,question,choice:correct});await client.waitForTimeout(250);
   check((await client.evaluate(()=>window.rivalsLearningState.progress))===view.progress,'duplicate submission rejected '+attempt);
   const server=await state(host),remote=server.players.find(x=>x.name==='答題學生');check(remote.learningProgress===view.progress,'host confirms client progress '+attempt);
   if(attempt===3){check(view.unlocked&&view.selected===2,'third badge defaults to cleaver');await client.screenshot({path:path.join(output,'real-unlock.png')});}
   await client.locator('#learning-next').click();await client.waitForFunction(()=>window.rivalsLearningState?.state===3);
   if(attempt===3){check(await client.locator('#learning-weapons button').count()===2,'only pistol and unlocked cleaver selectable');await client.screenshot({path:path.join(output,'real-respawn.png')});}
   await client.waitForFunction(life=>{const d=window.rivalsDiagnostics,p=d.players.find(x=>x.seat===d.localSeat);return p.health>0&&p.spawnSequence>life;},life,{timeout:12000});
   if(attempt===3)check(me(await state(client)).weapon===2,'real client respawns carrying cleaver');
  }
  // A manual choice belongs to one life; every new death restores the latest unlock.
  for(let repeat=0;repeat<2;repeat++){
   await die(client);await client.keyboard.up('w');await client.waitForFunction(()=>window.rivalsLearningState?.visible&&window.rivalsLearningState.state===1);
   const view=await client.evaluate(()=>window.rivalsLearningState),life=view.life;
   check(view.question===3&&view.progress===3,'cleaver question repeats after a wrong answer '+repeat);
   check(view.selected===2,'new death defaults to latest unlock '+repeat);
   const correct=bank.stages[1].questions[0].answer;
   await client.locator(`[data-option="${(correct+1)%3}"]`).click();await client.waitForFunction(()=>window.rivalsLearningState?.state===2);
   check((await client.evaluate(()=>window.rivalsLearningState.progress))===3,'wrong answer keeps latest unlock '+repeat);
   await client.locator('#learning-next').click();await client.waitForFunction(()=>window.rivalsLearningState?.state===3);
   check(JSON.stringify(await client.locator('#learning-weapons button').evaluateAll(bs=>bs.map(b=>Number(b.dataset.weapon)).sort()))==='[1,2]','ground weapons excluded from countdown '+repeat);
   await client.evaluate(life=>{for(const weapon of [0,3,4])window.rivalsLearningCommand(`learning:weapon:${life}:${weapon}`);},life);
   await client.waitForTimeout(250);
   check((await client.evaluate(()=>window.rivalsLearningState.selected))===2,'ground weapon requests cannot change selection '+repeat);
   if(repeat===0){
    await client.locator('#learning-weapons [data-weapon="1"]').click();
    await client.waitForFunction(()=>window.rivalsLearningState?.selected===1);
    await host.waitForFunction(()=>window.rivalsDiagnostics.players.find(p=>p.name==='答題學生')?.respawnWeapon===1);
    check(true,'host confirms temporary pistol selection');
   }else{
    await host.waitForFunction(()=>window.rivalsDiagnostics.players.find(p=>p.name==='答題學生')?.respawnWeapon===2);
    check(true,'host restores latest unlock after previous pistol selection');
   }
   await client.waitForFunction(life=>{const s=window.rivalsDiagnostics,p=s.players.find(x=>x.seat===s.localSeat);return p.health>0&&p.spawnSequence>life;},life,{timeout:12000});
   check(me(await state(client)).weapon===(repeat===0?1:2),'actual respawn equips '+(repeat===0?'temporary pistol':'latest unlocked cleaver'));
  }
  await client.evaluate(()=>window.rivalsLearningCommand('leave'));await client.waitForFunction(()=>window.rivalsLobbyState?.visible&&window.rivalsLobbyState.ready);
  await enterRoom(client,{room,name:'答題學生',create:false});check(me(await state(client)).learningProgress===0&&me(await state(client)).respawnWeapon===1,'leaving and rejoining clears progress');
  check(result.errors.length===0,'no browser script errors');console.log('RIVALS_WEB_LEARNING_OK checks='+result.checks.length);
 }finally{fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(result,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
