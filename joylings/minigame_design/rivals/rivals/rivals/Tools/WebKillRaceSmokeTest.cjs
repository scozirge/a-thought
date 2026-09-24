// Real Photon peers and browser input. The release exposes read-only diagnostics.
const {chromium}=require(process.env.RIVALS_PLAYWRIGHT_MODULE||'playwright');
const {enterRoom}=require('./WebRoomHelpers.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const output=path.resolve(process.env.RIVALS_TEST_OUTPUT||path.join(__dirname,'../Logs/KillRace'));
const result={checks:[],errors:[],respawns:[],samples:[]},complete=process.argv.includes('--complete-game');
fs.mkdirSync(output,{recursive:true});
const me=s=>s.players.find(p=>p.seat===s.localSeat),angle=a=>((a+540)%360)-180;
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.RIVALS_CHROME||undefined,headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
  const state=p=>p.evaluate(()=>window.rivalsDiagnostics);
  function check(value,label){assert.ok(value,label);result.checks.push(label);console.log('KILL_RACE_CHECK '+label);}
  async function open(){
    const context=await browser.newContext({viewport:{width:1440,height:960}}),page=await context.newPage();
    page.on('pageerror',e=>result.errors.push(e.message));
    page.on('console',m=>{if(/^(?:InvalidOperationException|NullReferenceException|MissingReferenceException|ArgumentException):/.test(m.text()))result.errors.push(m.text());});
    const url=new URL(process.env.RIVALS_WEB_URL||'http://127.0.0.1:8186/');url.searchParams.set('diagnostics','1');
    await page.goto(url.href);return page;
  }
  async function engage(page){await page.bringToFront();const box=await page.locator('canvas').boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await page.waitForTimeout(200);}
  async function walkTo(page,x,z){
    const deadline=Date.now()+8500;
    await page.keyboard.down('Shift');await page.keyboard.down('w');
    try{while(Date.now()<deadline){
      const s=await state(page),p=me(s);if(s.phase!==2||p.health<=0||Math.hypot(x-p.position.x,z-p.position.z)<1)break;
      const yaw=Math.atan2(x-p.position.x,z-p.position.z)*180/Math.PI;
      await page.evaluate(({x,y})=>document.dispatchEvent(new MouseEvent('mousemove',{movementX:x,movementY:y,bubbles:true})),{x:angle(yaw-s.look.x)/.12,y:-s.look.y/.12});await page.waitForTimeout(100);
    }}finally{await page.keyboard.up('w');await page.keyboard.up('Shift');}
  }
  try{
    const host=await open(),client=await open(),room='擊殺'+Date.now().toString(36).slice(-6);
    await Promise.all([enterRoom(host,{room,name:room,create:true}),enterRoom(client,{room,name:'復活測試',create:false})]);
    await host.waitForFunction(()=>window.rivalsDiagnostics.players.filter(p=>!p.bot).length===2);
    let initial=await state(client);check(initial.killsToWin===30&&initial.remaining===0,'30-kill target and no round timer');
    check(initial.players.length===8&&initial.players.filter(p=>p.team===0).length===4,'eight balanced seats');
    await client.screenshot({path:path.join(output,'kill-race-scoreboard.png')});
    await engage(client);const starting=me(await state(client));
    // Use the verified open outside lane, then enter combat by a central screen.
    await walkTo(client,33,starting.position.z);await walkTo(client,33,0);await walkTo(client,21,0);
    const deaths=new Map(),observed=[new Map(),new Map()];
    let localRespawn=false,localDeathCaptured=false,scoreSeen=false,seenPodium=false,seenNextGame=false,initialGame=initial.game,trackedGame=initial.game;
    const deadline=Date.now()+(complete?1200000:300000);let nextReport=Date.now()+15000;
    while(Date.now()<deadline){
      const pair=await Promise.all([state(host),state(client)]),h=pair[0],c=pair[1];
      result.lastPeers=pair;
      if(Date.now()>=nextReport){console.log('KILL_RACE_PROGRESS '+JSON.stringify({blue:h.blueKills,red:h.redKills,respawns:result.respawns.length,localHealth:me(c).health}));nextReport=Date.now()+15000;}
      if(h.game!==trackedGame){deaths.clear();trackedGame=h.game;}
      result.samples.push({time:h.time,game:h.game,phase:h.phase,blue:h.blueKills,red:h.redKills,clientBlue:c.blueKills,clientRed:c.redKills});
      assert.ok(h.blueKills<=30&&h.redKills<=30,'score cannot exceed target');
      if(h.phase===2)assert.ok(h.blueKills<30&&h.redKills<30,'thirtieth kill must stop combat');
      if(h.blueKills+h.redKills>0)scoreSeen=true;
      for(let peer=0;peer<pair.length;peer++)for(const p of pair[peer].players){
        const key=pair[peer].game+':'+p.seat+':'+p.spawnSequence;
        observed[peer].set(key,{spawnPoint:p.spawnPoint,spawnLook:p.spawnLook});
        if(peer!==0||h.phase!==2)continue;
        const last=deaths.get(p.seat);
        if(p.health===0&&!last)deaths.set(p.seat,{time:h.time,remaining:p.respawnRemaining,position:p.position,sequence:p.spawnSequence,bot:p.bot});
        if(p.health>0&&last){
          const elapsed=h.time-last.time;
          assert.ok(elapsed>=last.remaining-.35&&elapsed<4.5,'respawn follows host three-second timer');
          assert.equal(p.spawnSequence,last.sequence+1,'one new life per death');
          assert.ok(Math.hypot(p.spawnPoint.x-last.position.x,p.spawnPoint.y-last.position.y,p.spawnPoint.z-last.position.z)>=4.99,'new location differs from death location');
          assert.ok(Math.abs(p.spawnPoint.x)<=33&&Math.abs(p.spawnPoint.z)<=33,'respawn stays in arena');
          assert.equal(p.health,300,'full health on respawn');assert.equal(p.weapon,1,'pistol on respawn');
          result.respawns.push({seat:p.seat,bot:last.bot,elapsed,firstRemaining:last.remaining,spawnPoint:p.spawnPoint});deaths.delete(p.seat);
        }
      }
      const local=me(c);
      if(c.phase===2&&local.health===0&&!localDeathCaptured){
        check(local.respawnRemaining>0&&local.respawnRemaining<=3,'local death has a synchronized three-second countdown');
        check(!c.controls&&await client.evaluate(()=>document.pointerLockElement===document.querySelector('canvas')),'death disables controls while preserving mouse lock');
        await client.screenshot({path:path.join(output,'kill-race-respawn-countdown.png')});localDeathCaptured=true;result.deadLocal=c;
      }
      if(localDeathCaptured&&!localRespawn&&local.health>0&&local.spawnSequence>me(result.deadLocal).spawnSequence){
        // Diagnostics run in Update, before Fusion Render updates the camera.
        // Allow the next rendered sample, while still bounding recovery tightly.
        await client.waitForFunction(()=>{const s=window.rivalsDiagnostics;return Math.abs(((s.cameraAngles.y-s.look.x+540)%360)-180)<.5;},null,{timeout:1500});
        const revived=await state(client);
        check(revived.controls,'respawn restores controls without another click');
        result.revivedLocal=revived;localRespawn=true;
        await client.screenshot({path:path.join(output,'kill-race-respawned.png')});
      }
      if(h.phase===4&&!seenPodium){
        seenPodium=true;check(Math.max(h.blueKills,h.redKills)===30,'live game ends at thirty');
        await client.waitForFunction(()=>window.rivalsDiagnostics.phase===4,null,{timeout:5000});
        const final=await state(client);assert.equal(final.winner,h.winner);assert.equal(final.blueKills,h.blueKills);assert.equal(final.redKills,h.redKills);
        result.winner=h;await client.screenshot({path:path.join(output,'kill-race-winner.png')});
      }
      if(complete&&seenPodium&&h.game>initialGame){check(h.blueKills===0&&h.redKills===0,'next game resets scores');seenNextGame=true;break;}
      if(!complete&&localRespawn&&scoreSeen&&result.respawns.some(r=>r.bot)&&result.respawns.some(r=>!r.bot)&&result.respawns.length>=4){
        const totals=[h.blueKills,h.redKills];
        await client.waitForFunction(([blue,red])=>window.rivalsDiagnostics.blueKills>=blue&&window.rivalsDiagnostics.redKills>=red,totals,{timeout:5000});break;
      }
      await client.waitForTimeout(80);
    }
    check(scoreSeen&&localRespawn,'real eliminations and local respawn observed');
    check(result.respawns.some(r=>r.bot)&&result.respawns.some(r=>!r.bot),'human and bot share respawn rules');
    let replicated=0;for(const [key,value] of observed[0])if(observed[1].has(key)){assert.deepEqual(observed[1].get(key),value);replicated++;}
    check(replicated>=10,'both peers agree on host-selected spawn positions and directions');
    if(complete)check(seenPodium&&seenNextGame,'observe a complete thirty-kill match and the next game');
    if(!complete){
      const before=await state(client),seat=before.localSeat,shots=me(before).shots;
      await client.evaluate(pitch=>document.dispatchEvent(new MouseEvent('mousemove',{movementX:0,movementY:(-70-pitch)/.12,bubbles:true})),before.look.y);
      await client.mouse.down();await client.waitForTimeout(35);await client.mouse.up();
      await host.waitForFunction(({seat,shots})=>window.rivalsDiagnostics.players.find(p=>p.seat===seat)?.shots===shots+1,{seat,shots},{timeout:5000});
      check(true,'first short click after respawn reaches the host');
    }
    assert.deepEqual(result.errors,[]);result.ok=true;console.log('WEB_KILL_RACE_OK '+JSON.stringify({respawns:result.respawns.length,replicatedLives:replicated,fullGame:seenPodium}));
  }finally{fs.writeFileSync(path.join(output,'kill-race-web-check.json'),JSON.stringify(result,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
