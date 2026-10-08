// Observe the shipped simulation through read-only diagnostics and normal lobby UI.
const {chromium}=require(process.env.RIVALS_PLAYWRIGHT_MODULE||'playwright');
const {enterRoom}=require('./WebRoomHelpers.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.resolve(process.env.RIVALS_TEST_OUTPUT||'Logs/UnlockBots/Bots');
fs.mkdirSync(output,{recursive:true});
const result={checks:[],errors:[],samples:[]};
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.RIVALS_CHROME||undefined,headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 page.on('pageerror',e=>result.errors.push(e.message));
 page.on('console',m=>{if(/^(?:\w*Exception|RuntimeError):/.test(m.text()))result.errors.push(m.text());});
 const state=()=>page.evaluate(()=>window.rivalsDiagnostics);
 const check=(ok,label)=>{assert.ok(ok,label);result.checks.push(label);console.log('BOT_WEB_CHECK '+label);};
 try{
  const url=new URL(process.env.RIVALS_WEB_URL||'http://127.0.0.1:8188/');url.searchParams.set('diagnostics','1');
  await page.goto(url.href);await enterRoom(page,{name:'分散'+Date.now().toString(36).slice(-5)});
  const travelled={},fired=new Set();let previous=null,closePairs=0,totalPairs=0,spreadSamples=0;
  const until=Date.now()+90000;
  while(Date.now()<until){
   const s=await state();result.samples.push(s);
   assert.deepEqual(s.pickups.map(p=>p.weapon).sort(),[0,0,3,4],'only ordinary guns exist throughout combat');
   for(const p of s.players.filter(p=>p.bot)){
    assert.ok([0,1,3,4].includes(p.weapon),'Bot cannot acquire badge weapons from the field');
    const old=previous?.players.find(x=>x.seat===p.seat);
    if(old&&old.health>0&&p.health>0&&old.spawnSequence===p.spawnSequence){
     travelled[p.seat]=(travelled[p.seat]||0)+Math.hypot(p.position.x-old.position.x,p.position.z-old.position.z);
     if(p.shots>old.shots)fired.add(p.seat);
    }
   }
   if(s.phase===2){
    const team=s.players.filter(p=>p.team===1&&p.bot&&p.health>0);
    if(team.length>=3&&Math.max(...team.map(p=>p.position.x))-Math.min(...team.map(p=>p.position.x))>12)spreadSamples++;
    for(let i=0;i<team.length;i++)for(let j=i+1;j<team.length;j++){
     totalPairs++;if(Math.hypot(team[i].position.x-team[j].position.x,team[i].position.z-team[j].position.z)<2)closePairs++;
    }
   }
   previous=s;await page.waitForTimeout(500);
  }
  result.metrics={travelled,firingBots:[...fired],crowdingRatio:closePairs/Math.max(1,totalPairs),spreadSamples};
  check(result.samples.length>60,'observe a sustained real match');
  check(Object.values(travelled).filter(d=>d>15).length===7,'all seven Bots navigate beyond their spawn area');
  check(fired.size>=4,'multiple Bots actively engage opponents');
  check(spreadSamples>20,'Bot team repeatedly uses separated lateral positions');
  check(result.metrics.crowdingRatio<.25,'teammates rarely remain within two meters of one another');
  check(true,'no badge weapon or pedestal pickup slot appears during play');
  await page.screenshot({path:path.join(output,'bot-match.png')});
  check(result.errors.length===0,'no game or browser exceptions');
  console.log('RIVALS_BOT_DISTRIBUTION_OK '+JSON.stringify(result.metrics));
 }finally{fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(result,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
