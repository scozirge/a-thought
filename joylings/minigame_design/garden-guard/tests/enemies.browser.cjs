const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const G = require('../core.js');
const base = process.env.GARDEN_URL || pathToFileURL(path.join(__dirname, '../dist/garden-guard.html')).href;
const out = path.join(__dirname, '../dist/browser-check');
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const p = await browser.newPage({ viewport: { width: 1440, height: 1080 } }), errors = [];
  p.on('pageerror', e => errors.push(e.message));
  async function prepare(level, placements = []) {
    const s = G.createState(level);
    for (const b of placements) assert.equal(G.build(s, ...b).ok, true);
    await p.evaluate(data => {
      if (gardenDebug.getState().phase === 'running') document.querySelector('#action').click();
      localStorage.setItem('garden-guard-v1', JSON.stringify(data));
    }, G.snapshot(s));
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
    assert.equal(await p.evaluate(() => Object.keys(Garden.ENEMIES).length), 9);
    assert.equal(await p.evaluate(() => Garden.LEVELS.every(l=>l.waves.flat().every(g=>g.kind!=='bomber'))),true);
    await prepare(1, [['pea', 8, 7]]);
    const lower = await pauseWhen('blocked', '.lower-shell .shield-flash');
    assert.ok(lower.enemies.filter(e => e.kind === 'shield_down').every(e => e.hp === 6));
    assert.ok(lower.effects.some(e => e.kind === 'block' && e.vy > 0));
    await screenshot('lower-shield');
    await prepare(2, [['pea', 8, 0]]);
    await p.waitForFunction(() => {
      if (gardenDebug.getState().enemies.some(e => e.kind === 'shield_down' && e.hp < e.maxHp)) { document.querySelector('#action').click(); return true; }
      return false;
    }, null, { timeout: 15000 });
    const above = await p.evaluate(() => gardenDebug.getState());
    const wounded = above.enemies.find(e => e.kind === 'shield_down' && e.hp < e.maxHp);
    assert.ok(wounded);
    assert.equal(wounded.maxHp, 6);
    const sprite = p.locator(`[data-enemy="${wounded.id}"]`);
    assert.equal(await sprite.locator('.bug-hp').textContent(), String(wounded.hp));
    const scale = await sprite.locator('.bug-art').evaluate(g => g.transform.baseVal.getItem(0).matrix.a);
    assert.ok(Math.abs(scale - G.enemyArtScale(wounded.kind, wounded.maxHp)) < 1e-6);

    await prepare(3, [['pea', 8, 5]]);
    const jump = await pauseWhen('jumped', '[data-jumping="true"]');
    assert.ok(jump.enemies.some(e => e.leap));
    assert.ok(await p.locator('.spring-legs').count()); await screenshot('hopper');
    const paused = await p.evaluate(() => gardenDebug.getState()); await p.waitForTimeout(300);
    assert.deepEqual(await p.evaluate(() => gardenDebug.getState()), paused);

    await prepare(6);
    const mother = await pauseWhen('hatched', '.hatch-effect');
    assert.ok(mother.enemies.some(e => e.kind === 'bug' && e.hp === 2));
    assert.ok(await p.locator('.brood-eggs').count()); await screenshot('mother');

    await prepare(4, [0, 1, 2, 3, 4, 5, 6, 7].map(r => ['wall', 6, r]));
    await p.waitForFunction(() => {
      if (gardenDebug.getState().enemies.some(e => e.kind === 'flyer' && e.x < 5.8)) { document.querySelector('#action').click(); return true; }
      return false;
    }, null, { timeout: 12000 });
    assert.equal((await p.evaluate(() => gardenDebug.getState())).stats.broken, 0);
    assert.ok((await p.evaluate(() => gardenDebug.getState())).enemies.filter(e=>e.kind==='flyer').every(e=>e.hp===7));
    assert.ok(await p.locator('.bug-wings').count()); await screenshot('flyer');

    await prepare(5, [['molecular', 8, 2], ['molecular', 8, 5], ['cannon', 6, 3]]);
    const split = await pauseWhen('split', '.split-effect');
    assert.ok(split.enemies.filter(e => e.kind === 'bug' && e.hp === 2).length >= 3);
    assert.equal(await p.locator('.split-effect').first().locator('use[href="#art-splitPlate"]').count(), 3);
    await screenshot('splitter');

    // Compare the painted sprite with its legs hidden. A valid path can still
    // be entirely covered by an egg, wing, shield or health number.
    const { missingFeet, whiteShields } = await p.evaluate(async () => {
      const kinds = Object.keys(Garden.ENEMIES), tile = 90;
      const phases = [0, Math.PI / 2, 3 * Math.PI / 2];
      const width = kinds.length * tile, height = phases.length * tile;
      const sprites = phases.map((phase, row) => kinds.map((kind, col) => {
        const time = phase / (kind === 'swift' ? 19 : 12);
        return `<g transform="translate(${(col + .5) * tile} ${(row + .5) * tile})">${GardenArt.bug(kind, 24, time)}</g>`;
      }).join('')).join('');
      async function paint(style, content = sprites) {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
          <defs>${GardenArt.definitions()}</defs><style>.bug-hp{font:bold 28px sans-serif;text-anchor:middle}${style}</style>${content}</svg>`;
        const image = new Image();
        image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        await image.decode();
        const context = new OffscreenCanvas(width, height).getContext('2d');
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, width, height).data;
      }
      const [normal, hidden] = await Promise.all([paint(''), paint('.bug-legs{display:none}')]);
      const missing = [];
      for (const [row, phase] of phases.entries()) {
        for (const [col, kind] of kinds.entries()) {
          const visible = [0, 0, 0, 0];
          for (let y = 0; y < tile; y++) for (let x = 0; x < tile; x++) {
            if (Math.abs(x - tile / 2) < 10 || Math.abs(y - tile / 2) < 8) continue;
            const pixel = 4 * ((row * tile + y) * width + col * tile + x);
            if (Math.abs(normal[pixel] - hidden[pixel]) + Math.abs(normal[pixel + 3] - hidden[pixel + 3]) < 48) continue;
            visible[(y >= tile / 2 ? 2 : 0) + (x >= tile / 2 ? 1 : 0)]++;
          }
          if (Math.min(...visible) < 12) missing.push({kind, phase, visible});
        }
      }
      // Isolate the actual shield instance so every opaque pixel, including
      // the trim and rivets, must turn white on a successful block.
      const shields = ['shield', 'shield_down'].map((kind, col) => {
        const sprite = new DOMParser().parseFromString(
          `<svg xmlns="http://www.w3.org/2000/svg">${GardenArt.bug(kind, 6, 0, 0, .25)}</svg>`, 'image/svg+xml');
        return `<g transform="translate(${(col + .5) * tile} ${tile / 2})">${sprite.querySelector('.hard-shell').outerHTML}</g>`;
      }).join('');
      const flash = await paint('', shields);
      const white = [0, 1].map(col => {
        let solid = 0, white = 0;
        for (let y = 0; y < tile; y++) for (let x = col * tile; x < (col + 1) * tile; x++) {
          const at = (y * width + x) * 4;
          if (flash[at + 3] < 254) continue;
          solid++;
          if (Math.min(flash[at], flash[at + 1], flash[at + 2]) >= 250) white++;
        }
        return solid > 200 && white / solid > .98;
      });
      return { missingFeet: missing, whiteShields: white };
    });
    assert.deepEqual(whiteShields, [true, true], '上下盾的盾面、包邊和鉚釘都會閃白');
    assert.deepEqual(missingFeet, [], '步伐的中點與兩端都應看得到蟲身兩側的前、後腳');
    await p.evaluate(() => {
      const gallery = document.createElement('div'); gallery.id = 'test-gallery';
      gallery.style.cssText = 'position:fixed;inset:0;background:#f4f4e9;padding:70px;z-index:9999;display:grid;grid-template-columns:repeat(5,1fr);gap:24px';
      gallery.innerHTML = Object.entries(Garden.ENEMIES).map(([kind, e]) => `<div style="text-align:center;font:24px sans-serif"><svg viewBox="-60 -60 120 120" width="160" height="160">${GardenArt.bug(kind, e.hp, 0)}</svg><p>${e.name}</p></div>`).join('');
      document.body.append(gallery);
    });
    await screenshot('catalog');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, enemyKinds: 9, lowerShield: true, leap: true, hatching: true, flying: true, flyerHp:7, splitting: true, bomberRemoved:true, browserErrors: errors }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
