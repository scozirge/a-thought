const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const G = require('../core.js'), S = require('../solutions.js');
const base = process.env.GARDEN_URL || pathToFileURL(path.join(__dirname, '../dist/garden-guard.html')).href;
(async () => {
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  const p = await browser.newPage({viewport:{width:1440,height:1080}}), errors=[], report=[];
  p.on('pageerror',e=>errors.push(e.message));
  const read=()=>p.evaluate(()=>gardenDebug.getState());
  const placements=s=>s.buildings.map(b=>[b.kind,b.c,b.r]);
  try {
    await p.clock.install({time:new Date('2026-01-01T00:00:00Z')});
    const url=new URL(base);
    for(const value of [null,'false','1','True']) {
      if(value===null)url.searchParams.delete('tip');else url.searchParams.set('tip',value);
      await p.goto(url.href);assert.equal(await p.locator('#solution').count(),0);
    }
    url.searchParams.set('tip','true');
    await p.goto(url.href);await p.clock.pauseAt(new Date('2026-01-01T01:00:00Z'));
    assert.equal(await p.locator('#level-select option').count(), 10, '教師頁也不提前公布隱藏關');
    for(let level=0;level<G.LEVELS.length;level++) {
      if (level === G.BONUS_LEVEL) {
        const cleared = S.create(9);
        G.startWave(cleared,0,42);
        while (cleared.phase === 'running') G.step(cleared, 1 / 60);
        assert.equal(cleared.phase, 'won');
        await p.evaluate(data => localStorage.setItem('garden-guard-v1', JSON.stringify(data)), G.snapshot(cleared));
        await p.reload(); await p.locator('#result-primary').click(); await p.locator('#action').click();
      }
      await p.locator('#level-select').selectOption(String(level));
      assert.equal((await read()).upgradeItems, level);
      assert.equal(await p.locator('#upgrade-count').textContent(), String(level));
      await p.locator('[data-tool="pea"]').click();
      await p.locator('.cell-hit[data-c="2"][data-r="7"]').click();
      await p.locator('#solution').click();
      const state=await read(),expected=S.create(level);
      assert.equal(state.upgradeItems, expected.upgradeItems);
      assert.deepEqual(placements(state),S.layouts[level]);
      assert.equal(state.money,expected.money);assert.ok(state.money>=0);
      assert.equal(state.phase,'planning');assert.equal(state.hearts,expected.hearts);assert.equal(state.time,0);
      for(const key of ['enemies','eggs','shots','effects','fires','queue','undo'])assert.equal(state[key].length,0,key);
      assert.equal(await p.locator('#undo').isDisabled(),true);
      const entries=await p.locator('.entrance').evaluateAll(nodes=>nodes.map(n=>({c:+n.dataset.c,r:+n.dataset.r,side:n.dataset.side})));
      assert.deepEqual(entries,G.entrances(level));
      const queue = G.spawnQueue(level);
      const routes = p.locator('#route-layer path');
      assert.ok(await routes.count() > 0);
      assert.ok(await routes.evaluateAll(paths => paths.every(path => path.closest('.ground-route'))),
        `第 ${level+1} 關的部署預覽只畫地面路線`);
      for (const e of entries) {
        const marker=p.locator(`.entrance[data-c="${e.c}"][data-r="${e.r}"]`);
        const kinds=[...new Set(queue.filter(item=>item.position.x===e.c && item.position.y===e.r).map(item=>item.kind))];
        assert.deepEqual((await marker.getAttribute('data-kinds')).split(' '),kinds);
        assert.equal(await marker.locator('.entry-crown').count(),Number(kinds.some(k=>k.endsWith('Boss'))));
      }
      if ([0,2,5,9,10].includes(level)) {
        const marker=level===0?p.locator('.entrance').first():p.locator('.entrance[data-boss]').first();
        await marker.hover();
        const info=p.locator('#tower-info[data-kind="entrance"]');
        assert.ok(await info.isVisible());
        const pictured=await info.locator('[data-kind]').evaluateAll(nodes=>nodes.map(node=>node.dataset.kind).sort());
        assert.deepEqual(pictured,(await marker.getAttribute('data-kinds')).split(' ').sort());
        await marker.click();
        const guide=p.getByRole('dialog',{name:'入口蟲蟲'}), cards=guide.locator('.guide-card');
        assert.ok(await guide.isVisible()); assert.ok(await info.isHidden());
        const kinds=(await marker.getAttribute('data-kinds')).split(' ');
        const boss=await marker.getAttribute('data-boss');
        const expectedOrder=boss?[boss,...kinds.filter(k=>k!==boss)]:kinds;
        for(let start=0;start<kinds.length;start+=3) {
          if(start) await guide.getByRole('button',{name:'下一頁'}).click();
          const displayed=await cards.evaluateAll(nodes=>nodes.map(card=>[card.dataset.kind,card.querySelector('h3').textContent,card.querySelector('p').textContent,card.querySelectorAll('svg').length]));
          assert.deepEqual(displayed,expectedOrder.slice(start,start+3).map(k=>[k,G.ENEMIES[k].name,G.ENEMIES[k].trait,1]));
        }
        if(kinds.length>3) {
          assert.ok(await guide.getByRole('button',{name:'下一頁'}).isDisabled());
          await guide.getByRole('button',{name:'上一頁'}).click();
          assert.equal(await cards.first().getAttribute('data-kind'),expectedOrder[Math.floor((kinds.length-4)/3)*3]);
        } else assert.ok(await guide.locator('nav').isHidden());
        await guide.getByRole('button',{name:'關閉入口蟲蟲'}).click(); assert.ok(await guide.isHidden());
        await marker.focus(); await p.keyboard.press('Enter');
        assert.ok(await guide.isVisible()); assert.equal(await cards.first().getAttribute('data-kind'),expectedOrder[0]);
        await p.keyboard.press('Escape'); assert.ok(await guide.isHidden());
      }
      for(const e of entries.filter(e=>e.side!=='right'))assert.ok(await p.locator(`.cell-hit[data-c="${e.c}"][data-r="${e.r}"]`).evaluate(n=>n.classList.contains('reserved')));
      // Each shipped answer is played through with the same engine and budget.
      G.startWave(expected,0,42);for(let i=0;i<30000 && expected.phase==='running';i++)G.step(expected,1/60);
      assert.equal(expected.phase,level>=9?'won':'planning',`第 ${level+1} 關解答`);
      report.push({level:level+1,cost:G.LEVELS[level].money-state.money,budget:G.LEVELS[level].money,passed:true});
    }
    const saved=await read();await p.reload();assert.deepEqual(placements(await read()),placements(saved));assert.equal((await read()).money,saved.money);
    // Changing combat randomness never changes the three marked entrances.
    const startWithDraw = async roll => {
      const draw = await p.evaluate(value => {
        const original = Math.random;
        try {
          Math.random = () => value / 2;
          document.querySelector('#solution').click();
          const planned = [...document.querySelectorAll('.entrance[data-boss]')].map(e=>[e.dataset.side,e.dataset.boss]);
          Math.random = () => value;
          document.querySelector('#action').click();
          const state = gardenDebug.getState();
          const bosses = state.queue.filter(e=>e.kind.endsWith('Boss')).map(e=>[e.kind,e.position.x,e.position.y]);
          return [planned,bosses,state.webRng.rngState];
        } finally { Math.random = original; }
      }, roll);
      assert.deepEqual(draw, [[['right','stagBoss'],['left','rhinoBoss'],['top','spiderBoss']],
        [['stagBoss',11,3],['rhinoBoss',0,3],['spiderBoss',5,0]],Math.floor(roll * 2 ** 32)]);
    };
    await startWithDraw(.125);await p.clock.runFor(4000);
    const battle=await read();assert.equal(battle.phase,'running');assert.ok(battle.enemies.length>0);
    assert.ok(battle.enemies.some(e=>e.c<11 && (e.y<1 || e.y>6)),'上下入口已實際出怪');
    await p.locator('#solution').click();const reset=await read();assert.deepEqual(placements(reset),placements(saved));assert.equal(reset.time,0);assert.equal(reset.phase,'planning');assert.equal(reset.enemies.length,0);
    await p.clock.runFor(2000);assert.equal((await read()).time,0,'解答不自動開戰');
    await startWithDraw(.375);await p.clock.runFor(500);await p.locator('#action').click();
    assert.equal((await read()).phase,'paused');await p.locator('#solution').click();assert.equal((await read()).phase,'planning');
    fs.mkdirSync(path.join(__dirname,'../dist/browser-check'),{recursive:true});
    for(const width of [1440,390,320]) {
      await p.setViewportSize({width,height:width===1440?1080:844});
      for(const button of await p.locator('.icon-button,#action').all()) {const b=await button.boundingBox();assert.ok(b.width>=48 && b.height>=48);assert.ok(b.x>=0 && b.x+b.width<=width);}
      assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await p.locator('#solution').click();assert.equal((await read()).money,saved.money);
      await p.screenshot({path:path.join(__dirname,`../dist/browser-check/solution-${width}.png`),fullPage:true});
    }
    await startWithDraw(42 / 2 ** 32);
    for (let seconds = 0; seconds < 300 && (await read()).phase === 'running'; seconds += 5) {
      await p.clock.runFor(5000);
    }
    const clearedBonus = await read();
    assert.equal(clearedBonus.phase, 'won'); assert.ok(clearedBonus.hearts > 0 && clearedBonus.hearts <= 5 + Number(clearedBonus.castleUpgraded));
    assert.equal(await p.locator('#result-title').textContent(), '隱藏關勝利！');
    assert.match(await p.locator('#win-crystal').innerText(), /金幣\s+\+0/);
    assert.match(await p.locator('#win-crystal').innerText(), /升級水晶\s+\+1/);
    assert.equal(await p.locator('#bonus-invite').isVisible(), false);
    await p.reload(); assert.equal((await read()).phase, 'won');
    await p.locator('#result-primary').click();
    assert.equal((await read()).phase,'won'); assert.ok(await p.locator('#replay').isHidden());
    await p.getByRole('button',{name:'此關再玩一次',exact:true}).click();
    const replayed=await read();
    assert.equal(replayed.level,G.BONUS_LEVEL); assert.equal(replayed.phase,'planning');
    assert.deepEqual(placements(replayed),placements(saved)); assert.equal(replayed.money,saved.money);
    assert.equal(await p.locator('#level-select option').count(), 11);
    assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,solutions:report,resetDuringBattle:true,resetDuringPause:true,manualStart:true,persisted:true,browserErrors:errors}));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
