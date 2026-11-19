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
    for(let level=0;level<10;level++) {
      await p.locator('#level-select').selectOption(String(level));
      await p.locator('[data-tool="pea"]').click();
      await p.locator('.cell-hit[data-c="2"][data-r="7"]').click();
      await p.locator('#solution').click();
      const state=await read(),expected=S.create(level);
      assert.deepEqual(placements(state),S.layouts[level]);
      assert.equal(state.money,expected.money);assert.ok(state.money>=0);
      assert.equal(state.phase,'planning');assert.equal(state.hearts,5);assert.equal(state.time,0);
      for(const key of ['enemies','shots','effects','fires','queue','undo'])assert.equal(state[key].length,0,key);
      assert.equal(await p.locator('#undo').isDisabled(),true);
      const entries=await p.locator('.entrance').evaluateAll(nodes=>nodes.map(n=>({c:+n.dataset.c,r:+n.dataset.r,side:n.dataset.side})));
      assert.deepEqual(entries,G.entrances(level));
      for(const e of entries.filter(e=>e.side!=='right'))assert.ok(await p.locator(`.cell-hit[data-c="${e.c}"][data-r="${e.r}"]`).evaluate(n=>n.classList.contains('reserved')));
      // Each shipped answer is played through with the same engine and budget.
      G.startWave(expected);for(let i=0;i<12000 && expected.phase==='running';i++)G.step(expected,1/60);
      assert.equal(expected.phase,level===9?'won':'planning',`第 ${level+1} 關解答`);
      report.push({level:level+1,cost:G.LEVELS[level].money-state.money,budget:G.LEVELS[level].money,passed:true});
    }
    const saved=await read();await p.reload();assert.deepEqual(placements(await read()),placements(saved));assert.equal((await read()).money,saved.money);
    await p.locator('#action').click();await p.clock.runFor(4000);
    const battle=await read();assert.equal(battle.phase,'running');assert.ok(battle.enemies.length>0);
    assert.ok(battle.enemies.some(e=>e.c<11 && (e.y<1 || e.y>6)),'上下入口已實際出怪');
    await p.locator('#solution').click();const reset=await read();assert.deepEqual(placements(reset),placements(saved));assert.equal(reset.time,0);assert.equal(reset.phase,'planning');assert.equal(reset.enemies.length,0);
    await p.clock.runFor(2000);assert.equal((await read()).time,0,'解答不自動開戰');
    await p.locator('#action').click();await p.clock.runFor(500);await p.locator('#action').click();
    assert.equal((await read()).phase,'paused');await p.locator('#solution').click();assert.equal((await read()).phase,'planning');
    fs.mkdirSync(path.join(__dirname,'../dist/browser-check'),{recursive:true});
    for(const width of [1440,390,320]) {
      await p.setViewportSize({width,height:width===1440?1080:844});
      for(const button of await p.locator('.icon-button,#action').all()) {const b=await button.boundingBox();assert.ok(b.width>=48 && b.height>=48);assert.ok(b.x>=0 && b.x+b.width<=width);}
      assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await p.locator('#solution').click();assert.equal((await read()).money,saved.money);
      await p.screenshot({path:path.join(__dirname,`../dist/browser-check/solution-${width}.png`),fullPage:true});
    }
    assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,solutions:report,resetDuringBattle:true,resetDuringPause:true,manualStart:true,persisted:true,browserErrors:errors}));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
