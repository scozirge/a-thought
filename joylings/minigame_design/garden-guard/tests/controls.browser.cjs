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
  const prepare=async (kind, upgraded = false)=>{
    const s=G.createState(2); assert.equal(G.build(s,kind,9,6).ok,true);
    if (upgraded) assert.ok(G.upgrade(s,9,6).ok);
    await p.evaluate(data=>{
      if(gardenDebug.getState().phase==='running')document.querySelector('#action').click();
      localStorage.setItem('garden-guard-v1',JSON.stringify(data));
    },G.snapshot(s));
    await p.reload();
    if (kind === 'push') {
      // Put two moving targets in one cell so the area hit is independent of the campaign spawn tempo.
      await p.evaluate(() => {
        const start = Garden.startWave;
        Garden.startWave = state => {
          const started = start(state);
          if (started) {
            state.queue = [];
            for (const x of [8, 8.1]) Garden.spawn(state, 'bug', 4, 5, {x, y:5});
          }
          return started;
        };
      });
    }
    if (upgraded && kind === 'molecular') {
      await p.evaluate(() => {
        const start = Garden.startWave;
        Garden.startWave = state => {
          const started = start(state);
          if (started) {
            state.queue = [];
            for (const [kind, hp, x, y] of [['giant',90,7,5], ['shield',50,8,3], ['flyer',40,10,4], ['bug',30,11,2]]) {
              Garden.spawn(state, kind, hp, y, {x, y});
            }
          }
          return started;
        };
      });
    }
    await press('#action');
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
    assert.ok(frost.enemies.every(e=>e.hp===e.maxHp && e.flash===0),'包含主要目標在內都只緩速');
    assert.equal(frost.stats.hits,0);
    assert.equal(await p.locator('.chilled-shell').count(),frost.enemies.filter(e=>e.slow>0).length);
    assert.ok(frost.effects.every(e=>e.kind==='frost'));
    assert.ok(frost.enemies.some(e=>e.slow===0),'範圍外不緩速');
    await press('#action'); assert.ok(await p.locator('.frost-area-effect').count()>0);
    assert.equal(frost.shots.length, 0);
    assert.ok(frost.effects.some(e => e.kind === 'frost' && e.x === 9 && e.y === 6 && e.radius === G.TOOLS.frost.range));
    await p.locator('[data-tool="frost"]').focus();
    assert.equal(await p.locator('#tower-info .info-effect').textContent(),'穿盾靈氣，周圍 2.65 格附加冰凍');
    await p.screenshot({path:path.join(out,'frost-area-slow.png')});
    const frozen=await read(); await p.clock.runFor(3000); assert.deepEqual(await read(),frozen);

    await prepare('push'); let pushed;
    for(let i=0;i<100;i++) {
      await p.clock.runFor(100); pushed=await read();
      if(pushed.enemies.filter(e=>e.push).length>=2)break;
    }
    const affected=pushed.enemies.filter(e=>e.push); assert.ok(affected.length>=2);
    const cell={x:Math.round(affected[0].push.fromX), y:Math.round(affected[0].push.fromY)};
    for(const e of affected) {
      assert.ok(e.push.length>0 && e.push.length<=3+1e-9); assert.ok(e.push.points.length>=2);
      assert.ok(e.push.x<=11); assert.ok(Math.hypot(e.push.fromX-9,e.push.fromY-6)<=G.TOOLS.push.range);
      assert.equal(Math.round(e.push.fromX),cell.x); assert.equal(Math.round(e.push.fromY),cell.y);
    }
    await press('#action');
    assert.equal(await p.locator('.push-cell-effect,.push-effect').count(),0);
    await p.locator('[data-tool="push"]').focus();
    assert.equal(await p.locator('#tower-info .info-effect').textContent(),'同格沿路退 3 格・靠近城堡優先');
    assert.ok((await p.locator('#tower-info').innerText()).includes('攻擊 0.35次/s'));
    await p.screenshot({path:path.join(out,'push-along-path.png')});
    const paused=await read(); await p.clock.runFor(3000); assert.deepEqual(await read(),paused);
    await p.setViewportSize({width:390,height:844}); await press('[data-tool="push"]');
    const info=await p.locator('#tower-info').boundingBox(); assert.ok(info.x>=0&&info.x+info.width<=390&&info.y+info.height<=844);
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await p.screenshot({path:path.join(out,'push-area-mobile.png')});

    await p.setViewportSize({width:1440,height:1080}); await prepare('molecular');
    await p.clock.runFor(1400); const aiming=await read(), tower=aiming.buildings[0];
    assert.ok(tower.aim && tower.aim.age>0 && tower.aim.age<2*G.BATTLE_SPEED);
    assert.equal(aiming.stats.hits,0); assert.equal(aiming.shots.length,0);
    assert.equal(await p.locator('.molecular-aim').getAttribute('data-target'),String(tower.aim.target));
    const line=await p.locator('.aim-line').getAttribute('d');
    await p.clock.runFor(100); assert.notEqual(await p.locator('.aim-line').getAttribute('d'),line,'瞄準線持續跟隨目標');
    await press('#action'); await p.locator('[data-tool="molecular"]').focus();
    assert.ok((await p.locator('#tower-info').innerText()).includes('傷害 28'));
    assert.equal(await p.locator('#tower-info .info-effect').textContent(),'優先打血量最高的蟲，可穿盾');
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
    assert.ok(fired.time-lockStarted>=2*G.BATTLE_SPEED-1e-6);
    await p.clock.runFor(400); assert.ok((await read()).stats.defeated>0);
    await press('#action'); await p.locator('[data-tool="cannon"]').focus();
    assert.equal(await p.locator('#tower-info .info-target').textContent(),'目標 地');
    await p.locator('[data-tool="pierce"]').focus(); assert.ok((await p.locator('#tower-info').innerText()).includes('傷害 1'));
    assert.ok((await p.locator('#tower-info').innerText()).includes('攻擊 0.8次/s'));
    await prepare('molecular', true);
    const arc = hop => p.locator(`.plasma-arc[data-hop="${hop}"]`);
    for (let i = 0; i < 130 && !await arc(0).count(); i++) await p.clock.runFor(32);
    assert.ok(await arc(0).isVisible());
    assert.equal(await arc(1).count(), 0);
    assert.deepEqual((await read()).effects.filter(e => e.kind === 'plasmaArc').map(e => e.damage), [9]);
    for (let hop = 1; hop <= 2; hop++) {
      for (let i = 0; i < 18 && !await arc(hop).count(); i++) await p.clock.runFor(24);
      assert.ok(await arc(hop).isVisible());
      assert.ok(await arc(hop - 1).locator('.plasma-contact').isVisible(), '上一跳抵達才傳出下一跳');
    }
    await press('#action');
    const links = await p.locator('#effects-layer').innerHTML();
    await p.clock.runFor(1000);
    assert.equal(await p.locator('#effects-layer').innerHTML(), links);
    await p.emulateMedia({reducedMotion:'reduce'});
    await press('#action');
    await p.clock.runFor(32);
    assert.ok(await arc(2).isVisible(), '減少動態時仍顯示連鎖目標');
    assert.equal(await arc(2).locator('[fill="url(#art-chain-glow)"]').count(), 0);
    await p.clock.runFor(800);
    assert.equal(await p.locator('.plasma-arc').count(), 0);
    await p.emulateMedia({reducedMotion:'no-preference'});
    await prepare('pierce');
    for (let i = 0; i < 40 && !await p.locator('.laser-beam').count(); i++) await p.clock.runFor(50);
    await press('#action');
    assert.ok(await p.locator('.laser-beam path').count() >= 3);
    assert.equal((await read()).shots.length, 0);
    const muzzleError = () => p.evaluate(() => {
      const head = document.querySelector('[data-building="pierce"] use[href="#art-tower-pierce"]');
      const lens = document.querySelector('#art-tower-pierce ellipse:last-of-type');
      const origin = document.querySelector('.laser-origin');
      const screen = (node, x, y) => new DOMPoint(x, y).matrixTransform(node.getScreenCTM());
      const a = screen(head, lens.cx.baseVal.value, lens.cy.baseVal.value);
      const b = screen(origin, origin.cx.baseVal.value, origin.cy.baseVal.value);
      return Math.hypot(a.x-b.x, a.y-b.y);
    });
    assert.ok(await muzzleError()<.01);
    await press('#action'); await p.clock.runFor(64); await press('#action');
    assert.ok(await muzzleError()<.01,'後座期間砲口與雷射仍然重合');
    const beam = await p.locator('.laser-beam').first().innerHTML();
    await p.clock.runFor(500);
    assert.equal(await p.locator('.laser-beam').first().innerHTML(), beam);
    await p.screenshot({path:path.join(out,'laser-beam.png')});
    await p.locator('#level-select').selectOption('1');
    await p.locator('#level-select').selectOption('0');
    await press('#action');
    const arrow = p.locator('#shot-layer use[href="#art-shot-castle"]').first();
    for (let i=0; i<180 && !await arrow.count(); i++) await p.clock.runFor(80);
    assert.ok(await arrow.isVisible(), '城堡會向進入射程的蟲射箭');
    const arrowError = await arrow.evaluate(node => {
      const { shots, castle } = gardenDebug.getState();
      const shot = shots.find(s => s.kind === 'castle'), t = shot.age / shot.duration;
      const bow = document.getElementById('castle-bow');
      const origin = new DOMPoint(0, 0).matrixTransform(bow.getCTM());
      const board = document.getElementById('board').getCTM().inverse();
      const start = origin.matrixTransform(board);
      const end = { x: 76 + (shot.tipX + .5) * 64, y: 40 + (shot.tipY + .5) * 64 - shot.lift };
      const point = new DOMPoint(0, 0).matrixTransform(node.getCTM()).matrixTransform(board);
      return castle && Math.hypot(point.x - start.x - (end.x - start.x) * t, point.y - start.y - (end.y - start.y) * t);
    });
    assert.ok(arrowError < .01, '箭從城垛上的弓射向開火時的落點');
    await p.locator('#board').screenshot({path:path.join(out,'castle-arrow.png')});
    for (let i=0; i<170 && !await p.locator('.broken-heart').count(); i++) await p.clock.runFor(100);
    await press('#action');
    const heart = await p.locator('.broken-heart').first().boundingBox();
    const house = await p.locator('#home-layer use[href="#art-castle"]').boundingBox();
    assert.ok(heart && house && (await read()).hearts < 5);
    assert.ok(Math.abs(heart.x + heart.width/2 - house.x - house.width/2) < house.width/8);
    assert.ok(heart.y + heart.height/2 < house.y,'碎心出現在屋頂上方');
    assert.equal(await p.locator('.broken-heart').first().locator(':scope > g').count(),2);
    await p.screenshot({path:path.join(out,'house-broken-heart.png')});
    const bonus = G.createState(G.BONUS_LEVEL), goal = G.LEVELS[G.BONUS_LEVEL].goal;
    assert.ok(G.upgrade(bonus, goal.c, goal.r).ok);
    await p.evaluate(data => localStorage.setItem('garden-guard-v1', JSON.stringify(data)), G.snapshot(bonus));
    await p.reload(); await press('#action');
    const volley = p.locator('#shot-layer use[href="#art-shot-castle"]');
    for (let i = 0; i < 180 && await volley.count() !== 2; i++) await p.clock.runFor(64);
    assert.equal(await volley.count(), 2);
    const dualArrows = await p.evaluate(() => {
      const shots = gardenDebug.getState().shots.filter(s => s.kind === 'castle');
      const bows = Array.from(document.querySelectorAll('#castle-bow use'));
      const arrows = Array.from(document.querySelectorAll('#shot-layer use[href="#art-shot-castle"]'));
      const board = document.querySelector('#board').getCTM().inverse();
      const origin = node => new DOMPoint(0, 0).matrixTransform(node.getCTM()).matrixTransform(board);
      return shots.map((s, i) => {
        const start = origin(bows[i]), actual = origin(arrows[i]), t = s.age / s.duration;
        const endX = 76 + (s.tipX + .5) * 64, endY = 40 + (s.tipY + .5) * 64 - s.lift;
        return { x: start.x, error: Math.hypot(actual.x - start.x - (endX - start.x) * t, actual.y - start.y - (endY - start.y) * t) };
      });
    });
    assert.ok(dualArrows[1].x - dualArrows[0].x > 30, '兩座弩台分立在左右塔樓');
    assert.ok(dualArrows.every(arrow => arrow.error < .01), '中央城堡縮小時兩支箭仍各從自己的塔樓射出');
    for (const second of ['cannon','frost','flame','pierce','push','molecular']) {
      const saved = G.createState(3);
      G.build(saved,'pea',5,4); assert.ok(G.build(saved,second,5,4).fused);
      await p.evaluate(data => {
        if (gardenDebug.getState().phase === 'running') document.querySelector('#action').click();
        localStorage.setItem('garden-guard-v1', JSON.stringify(data));
      }, G.snapshot(saved));
      await p.reload();
      const weapon = G.primaryWeapon(saved.buildings[0]);
      assert.equal(await p.locator('.fusion-tower[data-weapon="' + weapon + '"]').count(),1);
      await p.evaluate(() => {
        const start = Garden.startWave;
        Garden.startWave = state => {
          if (!start(state)) return false;
          state.queue = [];
          for (const [kind,x,y] of [['giant',7,4],['flyer',7,3]]) {
            const e = Garden.spawn(state,kind,120,4,{x,y}); e.shock=100;
          }
          return true;
        };
      });
      await press('#action');
      if (second === 'molecular') {
        await p.clock.runFor(300); assert.equal(await p.locator('.molecular-aim').count(),1);
      }
      if (weapon === 'impactCannon') {
        assert.equal(await p.locator('.impact-resonator').count(),1);
        await p.clock.runFor(2800); assert.equal(await p.locator('.impact-pulse').count(),0);
        await p.clock.runFor(400);
        assert.equal(await p.locator('.impact-pulse').count(),1);
        assert.equal(await p.locator('#shot-layer [href="#art-round-impactCannon"]').count(),0);
        await press('#action');
        continue;
      }
      const projectile = p.locator(second === 'pierce' ? '.laser-beam' : '#shot-layer [href="#art-round-' + weapon + '"]');
      for(let i=0;i<60 && !await projectile.count();i++) await p.clock.runFor(32);
      assert.ok(await projectile.count(), weapon);
      if (second === 'cannon') assert.ok(await p.locator('#shot-layer [href="#art-round-tacticalGround"]').count());
      assert.ok(await projectile.first().evaluate(node => node.getBBox().width > 0));
      await press('#action');
    }
    for (const [baseTower,material, flight, impact] of [
      ['cannon','frost','.rolling-snow','#effects-layer use[href="#art-snowflake"]'],
      ['cannon','flame','.strike-warning[data-weapon="meteorTower"]','.cell-strike[data-weapon="meteorTower"]'],
      ['cannon','pierce','.homing-comet','.comet-burst'],
      ['cannon','push','.sonic-transmission','.cell-strike[data-weapon="sonicCannon"]'],
      ['cannon','molecular',null,'.cell-strike[data-weapon="crossCoil"]'],
      ['frost','flame',null,'.frostfire-spray'],
      ['frost','pierce',null,'.cryo-beam'],
      ['frost','push',null,'.ice-vortex'],
      ['frost','molecular','#shot-layer [href="#art-round-cryoPlasma"]','.ice-prison'],
      ['flame','pierce',null,'.heat-ray'],
      ['flame','push',null,'.fire-vortex'],
      ['flame','molecular','.molten-flight','.armed-firestone'],
      ['pierce','push',null,'.recoil-ray'],
      ['pierce','molecular',null,'.disintegration-beam'],
      ['push','molecular','.gravity-charge','.gravity-well']
    ]) {
      const s=G.createState(3); G.build(s,material,5,4); G.build(s,baseTower,5,4);
      await p.evaluate(data=>localStorage.setItem('garden-guard-v1',JSON.stringify(data)),G.snapshot(s));
      await p.reload();
      const weapon=G.primaryWeapon(s.buildings[0]);
      assert.ok(await p.locator('#building-layer [data-weapon="'+weapon+'"]').isVisible());
      await p.evaluate(() => {
        const start=Garden.startWave;
        Garden.startWave=state=>{
          if(!start(state)) return false;
          state.queue=[];state.castle=null;
          for(const kind of ['giant','flyer']) Garden.spawn(state,kind,60,4,{x:6,y:4}).spikeStun=99;
          return true;
        };
      });
      await press('#action'); await p.clock.runFor(48);
      if(flight) {
        const launch=p.locator(flight).first();
        for(let i=0;i<80 && !await launch.count();i++) await p.clock.runFor(40);
        assert.ok(await launch.isVisible(),weapon+' 發射');
        if (weapon==='gravityCannon') {
          assert.equal(await launch.getAttribute('data-cell'),'6,4');
          const radius=Number(await launch.locator('.gravity-core').getAttribute('r'));
          await p.clock.runFor(280);
          assert.ok(Number(await launch.locator('.gravity-core').getAttribute('r'))>radius);
        }
      }
      const fx=p.locator(impact).first();
      for(let i=0;i<100 && !await fx.count();i++) await p.clock.runFor(40);
      assert.ok(await fx.isVisible(),weapon+' 命中');
      if (weapon==='gravityCannon') {
        const disk=fx.locator('.gravity-collapse');
        const burst=Number(await disk.getAttribute('r'));
        assert.ok(burst>25);
        await p.clock.runFor(210);
        assert.ok(Number(await disk.getAttribute('r'))<burst);
        await p.clock.runFor(400);
        assert.equal(await fx.count(),0);
      }
      if(weapon==='snowCannon') {
        const ball=p.locator('.rolling-snow').first();
        const readScale=()=>ball.evaluate(el=>el.transform.baseVal.getItem(1).matrix.a);
        const near=await readScale();
        const texture=await ball.locator('.snow-surface').innerHTML();
        await p.clock.runFor(650);
        assert.ok(await readScale()>near+.15,'雪球滾遠後會變大');
        assert.notEqual(await ball.locator('.snow-surface').innerHTML(),texture,'俯視球面紋理隨滾動翻面');
        const burst=p.locator('.snow-burst');
        for(let i=0;i<100 && !await burst.count();i++) await p.clock.runFor(40);
        assert.ok(await burst.isVisible(),'地圖邊界可見碎冰爆裂');
      }
      if(weapon==='meteorTower') {
        assert.equal(await fx.locator('rect').count(),5);
        assert.equal(await p.locator('.ground-fire').count(),5);
      }
      if(weapon==='disintegrationBeam') {
        assert.equal(await fx.getAttribute('data-power'),'1');
        await p.clock.runFor(1550);assert.equal(await fx.getAttribute('data-power'),'4');
        await p.clock.runFor(500);assert.equal(await fx.getAttribute('data-power'),'5');
      }
      if(weapon==='cometCannon') assert.equal(await fx.locator('.emp-boundary').getAttribute('r'),'128');
      if(weapon==='sonicCannon') assert.equal(await fx.locator('.sonic-impact').count(),5);
      if(weapon==='fireStation') assert.equal(await fx.locator('.vortex-boundary').getAttribute('r'),'64');
      if(weapon==='moltenMortar') {
        assert.equal(await fx.locator('rect').count(),9);
        const blast=p.locator('.molten-blast');
        for(let i=0;i<60 && !await blast.count();i++) await p.clock.runFor(40);
        assert.equal(await blast.locator('rect').count(),9);
        assert.equal(await p.locator('.ground-fire').count(),9);
      }
      await press('#action');
    }
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({passed:true,fusionWeapons:21,frostArea:true,slowWithoutDamage:true,laserMuzzleAligned:true,singleCellPush:true,direction:'awayFromHomeAlongPath',aimSeconds:2,trackingLine:true,molecularDamage:28,piercingDamage:1,piercingRate:0.8,pause:true,mobile:true,browserErrors:errors}));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
