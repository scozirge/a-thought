const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const base = process.env.GARDEN_URL || 'https://scozirge.github.io/a-thought/garden-guard/';
const dist = path.join(__dirname, '../dist');
const expectedHtml = fs.readFileSync(path.join(dist, 'h5/index.html'), 'utf8');
const version = expectedHtml.match(/styles\.css\?v=([a-f0-9]+)/)[1];
const normalize = text => text.replace(/\r\n/g, '\n');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } }), errors = [];
  p.on('pageerror', e => errors.push(e.message));
  try {
    const response = await p.goto(`${base}?v=${version}`, { waitUntil: 'networkidle', timeout: 45000 });
    assert.equal(response.status(), 200);
    assert.equal(normalize(await response.text()), normalize(expectedHtml));
    const checkedFiles = ['index.html'];
    for (const file of ['styles.css', 'core.js', 'solutions.js', 'art.js', 'app.js']) {
      const selector = file.endsWith('.css') ? `link[href="${file}?v=${version}"]` : `script[src="${file}?v=${version}"]`;
      assert.equal(await p.locator(selector).count(), 1, `${file} 有版本號`);
      const asset = await p.request.get(`${base}${file}?v=${version}`);
      assert.equal(asset.status(), 200, file);
      assert.equal(normalize(await asset.text()), normalize(fs.readFileSync(path.join(dist, 'h5', file), 'utf8')), file);
      checkedFiles.push(file);
    }
    const film = await p.request.get(`${base}field-guide.mp4?v=${version}`);
    assert.equal(film.status(), 200);
    assert.ok((await film.body()).equals(fs.readFileSync(path.join(dist, 'h5/field-guide.mp4'))), '公開課堂影片與本次錄影相符');
    checkedFiles.push('field-guide.mp4');
    assert.equal(await p.locator('#route-toggle, #route-layer, #hint, .tool-name, .wave-card, #speed, .page-footer').count(), 0);
    assert.equal(await p.locator('[data-tool]').count(), 8);
    assert.equal(await p.evaluate(() => Object.keys(Garden.ENEMIES).length), 9);
    assert.equal(await p.locator('#level-select option').count(), 10);
    for (const kind of ['pea', 'cannon', 'frost', 'flame', 'pierce', 'push', 'molecular']) {
      await p.locator(`[data-tool="${kind}"]`).hover();
      assert.equal(await p.locator('#tower-info').getAttribute('data-kind'), kind);
      assert.match(await p.locator('#tower-info').innerText(), /攻擊 \d+(?:\.\d+)?次\/s/);
    }
    await p.keyboard.press('Escape');
    await p.locator('[data-tool="pea"]').click();
    const fresh = await p.evaluate(() => gardenDebug.getState());
    assert.equal(fresh.level, 0); assert.equal(fresh.wave, 0); assert.equal(fresh.phase, 'planning');
    await p.locator('.cell-hit[data-c="8"][data-r="0"]').click();
    await p.locator('#action').click();
    await p.waitForFunction(() => gardenDebug.getState().stats.blocked >= 3 && document.querySelector('.ricochet'), null, { timeout: 20000 });
    await p.evaluate(() => document.querySelector('#action').click());
    const above = await p.evaluate(() => gardenDebug.getState());
    assert.equal(above.stats.hits, 0);
    assert.ok(above.enemies.length > 0 && above.enemies.every(e => e.kind === 'shield' && e.hp === e.maxHp));
    assert.equal(await p.locator('#bug-layer .hard-shell').count(), above.enemies.length);
    for (const e of above.enemies) assert.equal(await p.locator(`[data-enemy="${e.id}"] text`).textContent(), String(e.hp));
    fs.mkdirSync(path.join(dist, 'browser-check'), { recursive: true });
    await p.mouse.move(20, 20);
    await p.screenshot({ path: path.join(dist, 'browser-check/published-shield.png'), fullPage: true });
    await p.locator('#reset').click();
    await p.locator('#reset').click();
    await p.locator('.cell-hit[data-c="8"][data-r="7"]').click();
    await p.locator('#action').click();
    await p.waitForFunction(() => gardenDebug.getState().stats.hits >= 1, null, { timeout: 15000 });
    await p.evaluate(() => document.querySelector('#action').click());
    const below = await p.evaluate(() => gardenDebug.getState());
    assert.equal(below.stats.blocked, 0);
    assert.ok(below.enemies.some(e => e.kind === 'shield' && e.hp < 6));
    await p.evaluate(() => {
      const s = Garden.createState(1); Garden.build(s, 'pea', 8, 7);
      localStorage.setItem('garden-guard-v1', JSON.stringify(Garden.snapshot(s)));
    });
    await p.reload(); await p.locator('#action').click();
    await p.waitForFunction(() => {
      if (gardenDebug.getState().stats.blocked > 0 && document.querySelector('.lower-shell')) { document.querySelector('#action').click(); return true; }
      return false;
    }, null, { timeout: 15000 });
    const lowerShield = await p.evaluate(() => gardenDebug.getState());
    assert.ok(lowerShield.enemies.filter(e => e.kind === 'shield_down').every(e => e.hp === 6));
    await p.screenshot({ path: path.join(dist, 'browser-check/published-lower-shield.png'), fullPage: true });
    assert.deepEqual(errors, []);
    const report = { url: `${base}?v=${version}`, version, status: 200, checkedFiles, towerInfo: 7, enemyKinds: 9, firstWaveShield: true, upperBlocks: above.stats.blocked, upperHits: above.stats.hits, lowerHits: below.stats.hits, lowerShieldBlocks: lowerShield.stats.blocked, lowerShieldHits: lowerShield.stats.hits, browserErrors: errors };
    fs.writeFileSync(path.join(dist, 'published-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
