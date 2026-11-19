const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const G = require('../core.js');
const layouts = require('./layouts.cjs');
const base = process.env.GARDEN_URL || pathToFileURL(path.join(__dirname, '../dist/garden-guard.html')).href;
const out = path.join(__dirname, '../dist/browser-check');
(async () => {
  fs.mkdirSync(out,{recursive:true});
  const browser = await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  const p = await browser.newPage({viewport:{width:1440,height:1080}}), errors=[];
  p.on('pageerror', e => errors.push(e.message));
  const read = () => p.evaluate(() => gardenDebug.getState());
  const press = selector => p.locator(selector).dispatchEvent('click');
  const cell = (c,r) => '.cell-hit[data-c="'+c+'"][data-r="'+r+'"]';
  const deploy = async layout => {
    for (const [kind,c,r] of layout) {await press('[data-tool="'+kind+'"]'); await press(cell(c,r)); assert.ok((await read()).buildings.some(b=>b.kind===kind&&b.c===c&&b.r===r));}
  };
  const prepare = async data => {
    await p.evaluate(data=>{if(gardenDebug.getState().phase==='running')document.querySelector('#action').click();localStorage.setItem('garden-guard-v1',JSON.stringify(data));},data);
    await p.reload();
  };
  const finish = async () => {for(let i=0;i<65&&(await read()).phase==='running';i++)await p.clock.runFor(1500);};
  try {
    await p.clock.install({time:new Date('2026-01-01T00:00:00Z')}); await p.clock.pauseAt(new Date('2026-01-01T01:00:00Z')); await p.goto(base);
    await p.clock.runFor(10000); assert.equal((await read()).phase,'planning'); assert.equal((await read()).money,G.LEVELS[0].money);
    await deploy([['pea',9,2]]); await press('#action');
    for (let i=0; i<50; i++) {
      await p.clock.runFor(100);
      const first=await read();
      if (first.stats.blocked>0 && first.enemies.length>=1) break;
    }
    await press('#action');
    const shield=await read(); assert.ok(shield.stats.blocked>0,JSON.stringify({errors, phase:shield.phase,time:shield.time,towers:shield.buildings.map(b=>b.kind),stats:shield.stats,enemies:shield.enemies.length})); assert.equal(shield.stats.hits,0); assert.ok(shield.enemies.every(e=>e.hp===e.maxHp));
    assert.equal(new Set(shield.enemies.map(e=>e.r)).size,1); assert.equal(await p.locator('#bug-layer .hard-shell').count(),shield.enemies.length);
    await prepare(G.snapshot(G.createState())); await deploy(layouts[0]); const initial=await read(); await press('#action');
    await p.clock.runFor(2500); assert.equal((await read()).phase,'running');
    assert.equal(await p.locator('#remove').isDisabled(),true); assert.equal(await p.locator('#undo').isDisabled(),true);
    const before=(await read()).buildings.map(b=>b.id); await press('[data-tool="wall"]'); await press(cell(7,0)); assert.deepEqual((await read()).buildings.map(b=>b.id),before);
    await press('#action'); const paused=await read(); await p.clock.runFor(10000); assert.deepEqual(await read(),paused);
    await press('#action'); await finish(); const cleared=await read();
    assert.equal(cleared.phase,'planning'); assert.equal(cleared.level,1); assert.equal(cleared.hearts,5);
    assert.equal(cleared.money,initial.money+G.LEVELS[0].reward);
    assert.deepEqual(cleared.buildings.map(({id,kind,c,r,hp})=>({id,kind,c,r,hp})),initial.buildings.map(({id,kind,c,r,hp})=>({id,kind,c,r,hp})));
    assert.equal(await p.locator('#result').getAttribute('open'),null); assert.equal(await p.locator('#action').textContent(),'下一關'); assert.equal(await p.locator('#level-select').inputValue(),'1');
    assert.equal(await p.locator('#remove').isDisabled(),false);
    await p.screenshot({path:path.join(out,'campaign-next-deployment.png')});
    await p.clock.runFor(15000); assert.deepEqual(await read(),cleared);
    assert.equal(await p.locator('#effects-layer > *, .frost-area-effect').count(), 0, '收尾特效播完，部署仍然停在原地');
    const tower=cleared.buildings.find(b=>b.kind!=='wall'); await press('#remove'); await press(cell(tower.c,tower.r));
    assert.equal((await read()).money,cleared.money+G.TOOLS[tower.kind].cost); await press('#undo'); assert.equal((await read()).money,cleared.money);
    await p.reload(); assert.equal((await read()).level,1); assert.equal((await read()).phase,'planning'); assert.equal((await read()).money,cleared.money);
    // Reorganise with full refunds; the first wave's buildings survive until explicitly removed.
    await press('#reset'); assert.equal((await read()).money,G.LEVELS[1].money); await deploy(layouts[1]);
    await press('#action'); await p.clock.runFor(500); assert.equal((await read()).level,1); assert.ok((await read()).enemies.length>0);
    await finish(); assert.equal((await read()).level,2); assert.equal((await read()).phase,'planning'); assert.equal((await read()).hearts,5);
    console.log('已驗證：前兩關連打、固定獎金、保留建築、部署等待、拆塔退款與重新整理。');

    // Ground-only towers see flying enemies in range and hold their fire.
    const air=G.createState(4); G.build(air,'cannon',9,3); G.build(air,'flame',9,4);
    await prepare(G.snapshot(air)); await press('#action'); await p.clock.runFor(1000); await press('#action');
    const flying=await read(); assert.ok(flying.enemies.length>=3&&flying.enemies.every(e=>e.kind==='flyer'));
    assert.equal(flying.stats.hits,0); assert.equal(flying.shots.length,0); assert.equal(flying.fires.length,0);
    await p.locator('#level-select').selectOption('7'); assert.equal((await read()).level,7); assert.equal((await read()).money,G.LEVELS[7].money); assert.equal((await read()).buildings.length,0);
    await press('#action'); await p.clock.runFor(500);
    await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    assert.equal((await read()).phase,'paused'); await p.evaluate(()=>{delete document.hidden;});
    await press('#reset'); assert.equal((await read()).level,7); assert.equal((await read()).phase,'planning'); assert.equal((await read()).money,G.LEVELS[7].money);

    await p.locator('#level-select').selectOption('9'); await deploy(layouts[9]); await press('#action');
    await p.clock.runFor(7000); await p.screenshot({path:path.join(out,'campaign-final-battle.png')}); await finish();
    assert.equal((await read()).phase,'won'); assert.ok((await read()).hearts>0); assert.equal((await read()).completed,true);
    assert.equal(await p.locator('#result-title').textContent(),'十關完成！');
    await p.screenshot({path:path.join(out,'campaign-complete.png')});
    const finalMoney=(await read()).money; await p.reload(); assert.equal((await read()).phase,'won'); assert.equal((await read()).money,finalMoney);
    await press('#result-primary'); assert.equal((await read()).level,0); assert.equal((await read()).money,G.LEVELS[0].money); assert.equal((await read()).buildings.length,0);
    const old=G.createState(4); G.build(old,'molecular',3,4); old.hearts=4;
    await prepare({...G.snapshot(old),version:6,money:76});
    assert.equal((await read()).money,90); assert.equal((await read()).hearts,5); assert.equal(await p.locator('#health').textContent(),'5'); assert.equal((await read()).buildings.length,1);
    await p.reload(); assert.equal((await read()).money,90,'新版預算只調整一次');
    await p.locator(cell(3,4)).focus(); assert.equal(await p.locator('#tower-info .info-effect').textContent(),'高血量優先・瞄準 2.5 秒');
    assert.ok(Math.abs(Number(await p.locator('#range-layer circle').getAttribute('r'))-6.6*64)<1e-9);
    await press('[data-tool="pierce"]'); await p.locator(cell(3,5)).focus();
    assert.ok(Math.abs(Number(await p.locator('#range-layer circle').getAttribute('r'))-6.2*64)<1e-9);
    await press('#remove'); await press(cell(3,4)); assert.equal((await read()).money,104,'舊分子砲退原購買價 14');
    await press('#undo'); assert.equal((await read()).money,90); assert.equal((await read()).buildings[0].paidCost,14);
    await press('#reset'); assert.equal((await read()).money,104);
    await press('[data-tool="molecular"]'); await press(cell(3,4)); assert.equal((await read()).money,104-G.TOOLS.molecular.cost,'按本版分子砲價格購買');
    await p.reload(); assert.equal((await read()).buildings[0].paidCost,G.TOOLS.molecular.cost);
    await press('#remove'); await press(cell(3,4)); assert.equal((await read()).money,104,'新塔讀檔後仍全額退款');
    await prepare(G.snapshot(G.createState()));
    await press('#action'); await finish(); assert.equal((await read()).phase,'lost'); await p.clock.runFor(800); assert.equal(await p.locator('#result').evaluate(el=>el.open),true); await press('#result-primary'); assert.equal((await read()).phase,'planning'); assert.equal((await read()).hearts,5);
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({passed:true,stages:10,retainedBuildings:true,refund:true,manualNext:true,rewardOnce:true,testSelection:true,completionSaved:true,retry:true,budgetMigration:true,longerRanges:true,browserErrors:errors}));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
