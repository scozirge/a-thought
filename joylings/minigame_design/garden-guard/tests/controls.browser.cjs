const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const G = require('../core.js');
const base = process.env.GARDEN_URL || pathToFileURL(path.join(__dirname, '../dist/garden-guard.html')).href;
const out = path.join(__dirname, '../dist/browser-check');
(async () => {
  fs.mkdirSync(out,{recursive:true});
  const browser = await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  const p = await browser.newPage({viewport:{width:1440,height:1080}}), errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  const read=()=>p.evaluate(()=>gardenDebug.getState());
  const press=selector=>p.locator(selector).dispatchEvent('click');
  const prepare=async kind=>{
    const s=G.createState(); assert.equal(G.build(s,kind,9,6).ok,true);
    await p.evaluate(data=>{
      if(gardenDebug.getState().phase==='running')document.querySelector('#action').click();
      localStorage.setItem('garden-guard-v1',JSON.stringify(data));
    },G.snapshot(s));
    await p.reload(); await press('#action');
  };
  try {
    await p.clock.install({time:new Date('2026-01-01T00:00:00Z')}); await p.goto(base); await p.clock.pauseAt(new Date('2026-01-01T01:00:00Z'));
    await prepare('frost');
    let frost;
    for(let i=0;i<80;i++) {
      await p.clock.runFor(100); frost=await read();
      if(frost.effects.some(e=>e.kind==='frost') && frost.enemies.filter(e=>e.slow>0).length>=2)break;
    }
    assert.ok(frost.enemies.filter(e=>e.slow>0).length>=2);
    assert.ok(frost.enemies.some(e=>e.slow>0 && e.hp===e.maxHp),'周圍目標只緩速');
    assert.ok(frost.enemies.some(e=>e.slow===0),'範圍外不緩速');
    await press('#action'); assert.ok(await p.locator('.frost-area-effect').count()>0);
    assert.equal(frost.shots.length, 0);
    assert.ok(frost.effects.some(e => e.kind === 'frost' && e.x === 9 && e.y === 6 && e.radius === G.TOOLS.frost.range));
    await p.locator('[data-tool="frost"]').focus();
    assert.equal(await p.locator('#tower-info .info-effect').textContent(),'塔周圍 2.65 格緩速');
    await p.screenshot({path:path.join(out,'frost-area-slow.png')});
    const frozen=await read(); await p.clock.runFor(3000); assert.deepEqual(await read(),frozen);

    await prepare('push'); let pushed;
    for(let i=0;i<100;i++) {
      await p.clock.runFor(100); pushed=await read();
      if(pushed.effects.some(e=>e.kind==='push-cell') && pushed.enemies.filter(e=>e.push).length>=2)break;
    }
    const affected=pushed.enemies.filter(e=>e.push); assert.ok(affected.length>=2);
    const cell=pushed.effects.find(e=>e.kind==='push-cell'); assert.ok(cell);
    for(const e of affected) {
      assert.ok(e.push.length>0 && e.push.length<=3+1e-9); assert.ok(e.push.points.length>=2);
      assert.ok(e.push.x<=11); assert.ok(Math.hypot(e.push.fromX-9,e.push.fromY-6)<=G.TOOLS.push.range);
      assert.equal(Math.round(e.push.fromX),cell.x); assert.equal(Math.round(e.push.fromY),cell.y);
    }
    assert.ok(pushed.effects.filter(e=>e.kind==='push').every(e=>Math.abs(Math.hypot(e.ux,e.uy)-1)<1e-9));
    await press('#action'); assert.ok(await p.locator('.push-cell-effect').count()>0); assert.ok(await p.locator('.push-effect').count()>=2);
    await p.locator('[data-tool="push"]').focus();
    assert.equal(await p.locator('#tower-info .info-effect').textContent(),'同格沿路退 3 格・最近優先');
    assert.ok((await p.locator('#tower-info').innerText()).includes('攻擊 0.35次/s'));
    await p.screenshot({path:path.join(out,'push-along-path.png')});
    const paused=await read(); await p.clock.runFor(3000); assert.deepEqual(await read(),paused);
    await p.setViewportSize({width:390,height:844}); await press('[data-tool="push"]');
    const info=await p.locator('#tower-info').boundingBox(); assert.ok(info.x>=0&&info.x+info.width<=390&&info.y+info.height<=844);
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await p.screenshot({path:path.join(out,'push-area-mobile.png')});

    await p.setViewportSize({width:1440,height:1080}); await prepare('molecular');
    await p.clock.runFor(1400); const aiming=await read(), tower=aiming.buildings[0];
    assert.ok(tower.aim && tower.aim.age>0 && tower.aim.age<2.5*G.BATTLE_SPEED);
    assert.equal(aiming.stats.hits,0); assert.equal(aiming.shots.length,0);
    assert.equal(await p.locator('.molecular-aim').getAttribute('data-target'),String(tower.aim.target));
    const line=await p.locator('.aim-line').getAttribute('d');
    await p.clock.runFor(100); assert.notEqual(await p.locator('.aim-line').getAttribute('d'),line,'瞄準線持續跟隨目標');
    await press('#action'); await p.locator('[data-tool="molecular"]').focus();
    assert.ok((await p.locator('#tower-info').innerText()).includes('傷害 28'));
    assert.equal(await p.locator('#tower-info .info-effect').textContent(),'高血量優先・瞄準 2.5 秒');
    await p.screenshot({path:path.join(out,'molecular-aim.png')});
    const aimingPaused=await read(); await p.clock.runFor(3000); assert.deepEqual(await read(),aimingPaused);
    const aimLine=await p.locator('.aim-line').getAttribute('d');
    await p.clock.runFor(1000); assert.equal(await p.locator('.aim-line').getAttribute('d'),aimLine);
    await p.setViewportSize({width:390,height:844}); await press('[data-tool="molecular"]');
    const molecularInfo=await p.locator('#tower-info').boundingBox();
    assert.ok(molecularInfo.x>=0 && molecularInfo.x+molecularInfo.width<=390);
    await p.screenshot({path:path.join(out,'molecular-aim-mobile.png')});
    await p.setViewportSize({width:1440,height:1080}); await press('#action');
    let fired;
    for(let i=0;i<60;i++) {await p.clock.runFor(50);fired=await read();if(fired.shots.some(s=>s.kind==='molecular'))break;}
    const shot=fired.shots.find(s=>s.kind==='molecular'); assert.ok(shot); assert.equal(shot.target,tower.aim.target);
    const lockStarted=aiming.time-tower.aim.age;
    assert.ok(fired.time-lockStarted>=2.5*G.BATTLE_SPEED-1e-6);
    await p.clock.runFor(200); assert.ok((await read()).stats.defeated>0);
    await press('#action'); await p.locator('[data-tool="cannon"]').focus();
    assert.equal(await p.locator('#tower-info .info-target').textContent(),'目標 地');
    await p.locator('[data-tool="pierce"]').focus(); assert.ok((await p.locator('#tower-info').innerText()).includes('傷害 1'));
    assert.ok((await p.locator('#tower-info').innerText()).includes('攻擊 0.8次/s'));
    await prepare('pierce');
    for (let i = 0; i < 40 && !await p.locator('.laser-beam').count(); i++) await p.clock.runFor(50);
    await press('#action');
    assert.ok(await p.locator('.laser-beam path').count() >= 3);
    assert.equal((await read()).shots.length, 0);
    const beam = await p.locator('.laser-beam').first().innerHTML();
    await p.clock.runFor(500);
    assert.equal(await p.locator('.laser-beam').first().innerHTML(), beam);
    await p.screenshot({path:path.join(out,'laser-beam.png')});
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({passed:true,frostArea:true,secondarySlowOnly:true,singleCellPush:true,direction:'awayFromHomeAlongPath',aimSeconds:2.5,trackingLine:true,molecularDamage:28,piercingDamage:1,piercingRate:0.8,pause:true,mobile:true,browserErrors:errors}));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
