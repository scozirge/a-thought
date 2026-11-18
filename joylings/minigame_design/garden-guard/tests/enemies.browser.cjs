const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const G = require('../core.js');
const base = process.env.GARDEN_URL || 'http://127.0.0.1:18130/';
const out = path.join(__dirname, '../dist/browser-check');
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const p = await browser.newPage({ viewport: { width: 1440, height: 1080 } }), errors = [];
  p.on('pageerror', e => errors.push(e.message));
  async function prepare(level, wave, placements = []) {
    const s = G.createState(level); s.wave = wave;
    for (const b of placements) assert.equal(G.build(s, ...b).ok, true);
    await p.evaluate(data => localStorage.setItem('garden-guard-v1', JSON.stringify(data)), G.snapshot(s));
    await p.reload(); await p.locator('#action').click();
  }
  async function pauseWhen(stat, selector) {
    await p.waitForFunction(({ stat, selector }) => {
      if (gardenDebug.getState().stats[stat] > 0 && document.querySelector(selector)) {
        document.querySelector('#action').click(); return true;
      }
      return false;
    }, { stat, selector }, { timeout: 20000 });
    return p.evaluate(() => gardenDebug.getState());
  }
  async function screenshot(name) { await p.mouse.move(20, 20); await p.screenshot({ path: path.join(out, `enemy-${name}.png`), fullPage: true }); }
  try {
    await p.goto(base);
    assert.equal(await p.evaluate(() => Object.keys(Garden.ENEMIES).length), 10);
    await prepare(0, 2, [['pea', 8, 5]]);
    const lower = await pauseWhen('blocked', '.lower-shell');
    assert.equal(lower.stats.hits, 0);
    assert.ok(lower.enemies.filter(e => e.kind === 'shield_down').every(e => e.hp === 3));
    assert.ok(lower.effects.some(e => e.kind === 'block' && e.vy > 0));
    await screenshot('lower-shield');
    await prepare(0, 2, [['pea', 8, 1]]);
    const above = await pauseWhen('hits', '.lower-shell');
    assert.equal(above.stats.blocked, 0);
    assert.ok(above.enemies.some(e => e.kind === 'shield_down' && e.hp < 3));

    await prepare(1, 1, [['pea', 8, 5]]);
    const jump = await pauseWhen('jumped', '[data-jumping="true"]');
    assert.ok(jump.enemies.some(e => e.leap));
    assert.ok(await p.locator('.spring-legs').count()); await screenshot('hopper');
    const paused = await p.evaluate(() => gardenDebug.getState()); await p.waitForTimeout(300);
    assert.deepEqual(await p.evaluate(() => gardenDebug.getState()), paused);

    await prepare(1, 2);
    const mother = await pauseWhen('hatched', '.hatch-effect');
    assert.ok(mother.enemies.some(e => e.kind === 'bug' && e.hp === 1));
    assert.ok(await p.locator('.brood-eggs').count()); await screenshot('mother');

    await prepare(1, 3, [0, 1, 4, 5, 6, 7].map(r => ['wall', 6, r]));
    await p.waitForFunction(() => {
      if (gardenDebug.getState().enemies.some(e => e.kind === 'flyer' && e.x < 5.8)) { document.querySelector('#action').click(); return true; }
      return false;
    }, null, { timeout: 12000 });
    assert.equal((await p.evaluate(() => gardenDebug.getState())).stats.broken, 0);
    assert.ok(await p.locator('.bug-wings').count()); await screenshot('flyer');

    await prepare(2, 0, [['cannon', 8, 3], ['pea', 8, 7], ['pea', 4, 5], ['pea', 4, 0]]);
    const split = await pauseWhen('split', '.split-effect');
    assert.ok(split.enemies.filter(e => e.kind === 'bug' && e.hp === 1).length >= 3);
    await screenshot('splitter');

    await prepare(2, 2, [['molecular', 8, 3], ['wall', 9, 0], ['wall', 10, 0], ['wall', 10, 2]]);
    const bomb = await pauseWhen('exploded', '.detonate-effect');
    assert.ok(bomb.stats.broken > 0); assert.ok(bomb.buildings.length < 4);
    await screenshot('bomber');

    await p.evaluate(() => {
      const gallery = document.createElement('div'); gallery.id = 'test-gallery';
      gallery.style.cssText = 'position:fixed;inset:0;background:#f4f4e9;padding:70px;z-index:9999;display:grid;grid-template-columns:repeat(5,1fr);gap:24px';
      gallery.innerHTML = Object.entries(Garden.ENEMIES).map(([kind, e]) => `<div style="text-align:center;font:24px sans-serif"><svg viewBox="-60 -60 120 120" width="160" height="160">${GardenArt.bug(kind, e.hp, 0)}</svg><p>${e.name}</p></div>`).join('');
      document.body.append(gallery);
    });
    await screenshot('catalog');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, enemyKinds: 10, lowerShield: true, leap: true, hatching: true, flying: true, splitting: true, explosion: true, browserErrors: errors }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
