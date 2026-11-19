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
  const read = () => p.evaluate(() => gardenDebug.getState());
  const press = selector => p.locator(selector).click();
  const cell = (c,r) => '.cell-hit[data-c="' + c + '"][data-r="' + r + '"]';
  try {
    await p.goto(base);
    assert.equal(await p.locator('#level-select option').count(), 10);
    const paths = await p.evaluate(() => {
      const kinds = Object.keys(Garden.TOOLS).filter(kind => Garden.TOOLS[kind].rate && !['frost', 'pierce'].includes(kind));
      const probe = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      document.querySelector('#board').append(probe);
      const result = kinds.map(kind => {
        function frame(t) {
          probe.innerHTML = GardenArt.flight(kind, 100, 80, 300, 80, t, 0);
          const glyph = probe.querySelector(`use[href="#art-shot-${kind}"]`);
          const matrix = glyph?.transform.baseVal.getItem(0).matrix;
          return { x: matrix?.e, y: matrix?.f, flare: !!probe.querySelector('.muzzle-flare'), size: glyph?.getBBox().height, shadow: !!probe.querySelector('ellipse'), trail: !!probe.querySelector('.shot-trail') };
        }
        return { kind, launch: frame(.05), middle: frame(.5), impact: frame(1) };
      });
      probe.remove();
      return result;
    });
    const size = kind => paths.find(p => p.kind === kind).middle.size;
    assert.ok(size('cannon') > 2 * size('pea'));
    assert.ok(size('molecular') > size('cannon'));
    assert.equal(await p.locator('#art-shot-pierce, #art-shot-frost').count(), 0);
    for (const { kind, launch, middle, impact } of paths) {
      assert.ok(launch.flare && !middle.trail && !middle.shadow && !impact.flare, kind);
      assert.ok(middle.x > 100 && middle.x < 300, kind);
      assert.equal(impact.x, 300, kind); assert.equal(impact.y, 80, kind);
      if (kind === 'cannon') assert.ok(middle.y < 80, kind);
      else assert.equal(middle.y, 80, kind);
    }
    assert.equal(await p.locator('#tower-info').isVisible(), false);
    assert.equal(await p.locator('#tools [aria-label*="枚金幣"] .tool-cost svg').count(), 8);
    assert.equal(await p.locator('#coins').getAttribute('aria-label'), '可用金幣 ' + (await read()).money);
    assert.equal(await p.locator('#hearts [data-icon="heart"] svg').count(), 1);
    await p.evaluate(async () => {
      const background = getComputedStyle(document.querySelector('#board')).backgroundImage;
      const image = new Image();
      image.src = background.slice(4, -1).replace(/^"|"$/g, '');
      await image.decode();
    });
    for (const art of await p.locator('.tool-art').all()) {
      assert.ok(await art.evaluate(el => el.getBBox().width > 35), '工具列必須實際繪出造型');
    }
    for (const [kind,tool] of Object.entries(G.TOOLS).filter(([,t]) => t.rate)) {
      await p.locator('[data-tool="' + kind + '"]').hover();
      assert.equal(await p.locator('#tower-info strong').textContent(), tool.name);
      assert.ok((await p.locator('#tower-info').innerText()).includes('傷害 ' + tool.damage));
      assert.ok((await p.locator('#tower-info').innerText()).includes('攻擊 ' + tool.rate + '次/s'));
      assert.equal(await p.locator('#tower-info .info-target').textContent(), ['cannon','flame'].includes(kind) ? '目標 地' : '目標 地/空');
      assert.equal(await p.locator('#tower-info .info-effect').textContent(), tool.effect);
    }
    await p.keyboard.press('Escape'); assert.equal(await p.locator('#tower-info').isVisible(), false);
    await press('[data-tool="pea"]'); await press(cell(6,5)); assert.equal((await read()).money, G.LEVELS[0].money - G.TOOLS.pea.cost);
    await p.mouse.move(20,20); await p.locator(cell(6,5)).hover(); assert.equal(await p.locator('#tower-info strong').textContent(), '一般砲塔');
    await press('#remove'); await press(cell(6,5)); assert.equal((await read()).money, G.LEVELS[0].money);
    await press('#undo'); assert.equal((await read()).buildings.length, 1);
    await p.reload(); assert.equal((await read()).buildings.length, 1);
    await press('[data-tool="wall"]'); await p.locator(cell(6,4)).focus(); await p.keyboard.press('ArrowRight'); await p.keyboard.press('Enter');
    assert.ok((await read()).buildings.some(b => b.c === 7 && b.r === 4 && b.kind === 'wall'));
    await press('#reset'); assert.equal((await read()).money, G.LEVELS[0].money); assert.equal((await read()).buildings.length, 0);
    await p.locator('#level-select').selectOption('9'); assert.equal((await read()).level, 9); assert.equal((await read()).money, G.LEVELS[9].money);
    assert.equal(await p.locator('#action').textContent(), '下一關');
    assert.doesNotMatch(await p.locator('body').innerText(), /移動路徑|盾甲蟲|從下方打/);
    for (const width of [1440,900,390,320]) {
      await p.setViewportSize({width,height:900});
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      for (const button of await p.locator('.tool-card, #level-select, #action').all()) {
        const box = await button.boundingBox(); assert.ok(box.width >= 48 && box.height >= 48);
      }
      await p.locator('[data-tool="flame"]').click();
      const box = await p.locator('#tower-info').boundingBox(); assert.ok(box.x >= 0 && box.x + box.width <= width && box.y >= 0 && box.y + box.height <= 900);
      await p.screenshot({path:path.join(out,'campaign-ui-' + width + '.png'),fullPage:true});
    }
    await p.setViewportSize({width:1440,height:1080}); await p.evaluate(() => {document.documentElement.style.zoom = '2';});
    await p.locator('[data-tool="flame"]').hover(); await p.waitForTimeout(200);
    const zoom = await p.locator('#tower-info').boundingBox(); assert.ok(zoom && zoom.x >= 0 && zoom.x + zoom.width <= 1440 && zoom.y + zoom.height <= 1080);
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await p.screenshot({path:path.join(out,'campaign-ui-zoom.png'),fullPage:true});
    const touch = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const phone = await touch.newPage(); await phone.goto(base);
    await phone.locator('[data-tool="flame"]').tap(); assert.equal(await phone.locator('#tower-info .info-target').textContent(), '目標 地');
    await phone.locator('[data-tool="pea"]').tap(); await phone.locator(cell(3,5)).tap(); await phone.locator(cell(3,5)).tap();
    assert.equal(await phone.locator('#tower-info strong').textContent(), '一般砲塔');
    await phone.locator('#action').tap(); await phone.locator('#action').tap(); assert.equal((await phone.evaluate(() => gardenDebug.getState())).phase, 'paused');
    await touch.close(); assert.deepEqual(errors, []);
    console.log(JSON.stringify({passed:true,tooltips:7,testSelector:10,refund:true,keyboard:true,touch:true,widths:[1440,900,390,320],zoom:'200%',browserErrors:errors}));
  } finally {await browser.close();}
})().catch(error => {console.error(error);process.exitCode=1;});
