const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const G = require('../core.js');
const layouts = require('./layouts.cjs');
const base = process.env.GARDEN_URL || 'http://127.0.0.1:18130/';
const out = path.join(__dirname, '../dist/browser-check');
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const read = p => p.evaluate(() => gardenDebug.getState());
const cell = (p, c, r) => p.locator(`.cell-hit[data-c="${c}"][data-r="${r}"]`);
async function place(p, kind, c, r) { await p.locator(`[data-tool="${kind}"]`).click(); await cell(p, c, r).click(); }
async function prepare(p, snapshot) {
  await p.evaluate(data => localStorage.setItem('garden-guard-v1', JSON.stringify(data)), snapshot);
  await p.reload();
}
function lastWaveSnapshot() {
  const s = G.createState();
  for (let wave = 0; wave < 3; wave++) {
    for (const b of layouts[0][wave]) G.build(s, ...b);
    G.startWave(s);
    for (let t = 0; t < 120 * 60 && s.phase === 'running'; t++) G.step(s, 1 / 60);
  }
  for (const b of layouts[0][3]) G.build(s, ...b);
  return G.snapshot(s);
}
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH || fs.existsSync(edge) ? { executablePath: process.env.CHROME_PATH || edge } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
  const p = await context.newPage(), errors = [];
  p.on('pageerror', e => errors.push(e.message));
  try {
    const response = await p.goto(base); assert.equal(response.status(), 200);
    await p.screenshot({ path: path.join(out, 'initial-desktop.png'), fullPage: true });
    await place(p, 'pea', 8, 5); assert.equal((await read(p)).money, 16);
    await p.locator('#undo').click(); assert.equal((await read(p)).money, 22);
    await place(p, 'pea', 8, 5);
    await p.locator('#remove').click(); await cell(p, 8, 5).click(); assert.equal((await read(p)).money, 22);
    await p.locator('#undo').click(); assert.equal((await read(p)).buildings.length, 1);
    await p.reload(); assert.equal((await read(p)).buildings.length, 1);
    await p.locator('[data-tool="wall"]').click(); await cell(p, 6, 5).focus(); await p.keyboard.press('ArrowRight'); await p.keyboard.press('Enter');
    assert.ok((await read(p)).buildings.some(b => b.kind === 'wall' && b.c === 7 && b.r === 5));
    await p.keyboard.press('Escape'); assert.equal(await p.locator('.tool-card.selected').count(), 0);
    await p.locator('#reset').click();
    for (let r = 0; r < G.ROWS; r++) await place(p, 'wall', 6, r);
    await p.mouse.move(20, 20);
    assert.equal((await p.evaluate(() => gardenDebug.getRoutes()))[0].breaking, true);
    await p.screenshot({ path: path.join(out, 'blocked-route.png'), fullPage: true });
    await p.locator('#action').click();
    await p.waitForFunction(() => gardenDebug.getState().stats.broken > 0, null, { timeout: 30000 });
    await p.locator('#action').click(); assert.equal((await read(p)).phase, 'paused');
    const paused = await read(p); await p.waitForTimeout(400); assert.equal((await read(p)).time, paused.time);
    assert.equal((await p.evaluate(() => gardenDebug.getRoutes()))[0].breaking, false);
    console.log('已驗證：建造、退回、撤回、鍵盤、存檔、封路拆牆與暫停。');

    // Reproduce the user's exact starting flow, without skipping to wave two.
    await p.locator('#reset').click();
    await place(p, 'pea', 8, 1);
    assert.doesNotMatch(await p.locator('body').innerText(), /盾甲蟲|從下方打|小石牆/);
    assert.equal(await p.locator('.tool-name, #hint, #route-toggle, #route-layer, #speed, .wave-card, .page-footer').count(), 0);
    assert.equal((await read(p)).wave, 0);
    await p.locator('#action').click();
    await p.waitForFunction(() => gardenDebug.getState().stats.blocked >= 3 && document.querySelector('.block-effect .ricochet'), null, { timeout: 20000 });
    await p.evaluate(() => document.querySelector('#action').click());
    const blockedState = await read(p);
    assert.equal(blockedState.stats.hits, 0);
    assert.ok(blockedState.enemies.every(e => e.kind === 'shield' && e.hp === 3));
    assert.equal(await p.locator('#bug-layer .hard-shell').count(), blockedState.enemies.length);
    for (const e of blockedState.enemies) assert.equal(await p.locator(`[data-enemy="${e.id}"] text`).textContent(), '3');
    assert.ok(await p.locator('.block-effect .ricochet').count() > 0);
    await p.waitForTimeout(180); await p.mouse.move(20, 20);
    await p.screenshot({ path: path.join(out, 'shield-armor-block.png'), fullPage: true });

    await p.locator('#reset').click();
    await place(p, 'pea', 8, 5);
    await p.locator('#action').click();
    await p.waitForFunction(() => gardenDebug.getState().stats.hits >= 1, null, { timeout: 15000 });
    await p.evaluate(() => document.querySelector('#action').click());
    const belowState = await read(p);
    assert.equal(belowState.stats.blocked, 0);
    assert.ok(belowState.enemies.some(e => e.kind === 'shield' && e.hp < 3));
    await p.screenshot({ path: path.join(out, 'shield-below-hit.png'), fullPage: true });

    const shield = G.createState(); shield.wave = 1;
    G.build(shield, 'pea', 8, 1); G.build(shield, 'pea', 8, 5); G.build(shield, 'frost', 4, 5);
    await prepare(p, G.snapshot(shield));
    await p.locator('#action').click();
    await p.waitForFunction(() => gardenDebug.getState().stats.blocked > 0 && gardenDebug.getState().stats.hits > 0, null, { timeout: 20000 });
    await p.locator('#action').click(); await p.mouse.move(20, 20);
    await p.screenshot({ path: path.join(out, 'shield-direction.png'), fullPage: true });
    await p.reload(); assert.equal((await read(p)).phase, 'planning'); assert.equal((await read(p)).wave, 1);

    await prepare(p, lastWaveSnapshot());
    await p.locator('#action').click();
    await p.waitForFunction(() => gardenDebug.getState().phase === 'won', null, { timeout: 45000 });
    assert.equal((await read(p)).hearts, 5); await p.locator('#result[open]').waitFor();
    await p.screenshot({ path: path.join(out, 'victory.png'), fullPage: true });
    await p.locator('#result-primary').click(); assert.equal((await read(p)).level, 1);
    console.log('已驗證：盾甲方向、有效命中、波次復原、通關與下一園。');

    await prepare(p, G.snapshot(G.createState()));
    await p.locator('#action').click();
    await p.waitForFunction(() => gardenDebug.getState().phase === 'lost', null, { timeout: 45000 });
    await p.locator('#result-primary').click(); assert.equal((await read(p)).phase, 'planning'); assert.equal((await read(p)).hearts, 5);
    await p.locator('[data-level="1"]').click();
    for (const b of layouts[1][0]) await place(p, ...b);
    await p.mouse.move(20, 20);
    await p.screenshot({ path: path.join(out, 'garden-desktop.png'), fullPage: true });
    for (const width of [900, 390, 320]) {
      await p.setViewportSize({ width, height: 900 });
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `頁面溢出 ${width}`);
      for (const button of await p.locator('.tool-card').all()) {
        const box = await button.boundingBox(); assert.ok(box.width >= 48 && box.height >= 48);
        if (await button.locator('.tool-name').count()) assert.ok(await button.locator('.tool-name').evaluate(el => el.scrollWidth <= el.clientWidth), `名稱裁切 ${width}`);
      }
      assert.ok(await p.locator('#action').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight));
      if (width === 390) await p.screenshot({ path: path.join(out, 'garden-mobile.png'), fullPage: true });
    }
    await p.setViewportSize({ width: 1440, height: 1080 });
    await p.evaluate(() => { document.documentElement.style.zoom = '2'; });
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, '200% 縮放溢出');
    await p.evaluate(() => { document.documentElement.style.zoom = ''; localStorage.setItem('garden-guard-v1', '{broken'); });
    await p.reload(); assert.equal((await read(p)).money, 22);
    const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const phone = await touch.newPage(); await phone.goto(base);
    await phone.locator('[data-tool="pea"]').tap();
    await cell(phone, 3, 5).tap(); assert.equal((await read(phone)).buildings.length, 1);
    await phone.locator('#action').tap(); assert.equal((await read(phone)).phase, 'running');
    await phone.locator('#action').tap(); assert.equal((await read(phone)).phase, 'paused');
    await touch.close();
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, viewports: [1440, 900, 390, 320], zoom: '200%', touch: true, screenshots: out }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
