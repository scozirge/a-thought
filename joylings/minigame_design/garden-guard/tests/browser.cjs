const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const G = require('../core.js');
const base = process.env.GARDEN_URL || pathToFileURL(path.join(__dirname, '../dist/garden-guard.html')).href;
const out = path.join(__dirname, '../dist/browser-check');
async function checkMenuShortages(browser) {
  const page = await browser.newPage({viewport:{width:1200,height:850}});
  const cell = (c,r) => page.locator(`.cell-hit[data-c="${c}"][data-r="${r}"]`);
  const menu = page.locator('#building-menu'), hint = page.locator('#tower-info');
  try {
    await page.goto(base);
    await cell(5,4).click(); await cell(5,4).click();
    const snapshot = () => page.evaluate(()=>Garden.snapshot(gardenDebug.getState()));
    const first = await snapshot();
    await page.locator('#edit-grade').hover();
    assert.equal(await hint.innerText(),'水晶不足');
    await page.locator('#edit-grade').focus();
    await page.keyboard.press('Enter');
    assert.deepEqual(await snapshot(),first);
    await page.locator('#fusion-locked').hover();
    assert.equal(await hint.innerText(),'合成槌不足');
    await cell(2,2).click();
    assert.ok(await menu.isHidden()); assert.deepEqual(await snapshot(),first);
    await cell(2,2).click(); await cell(5,4).click();
    const second = await snapshot();
    await cell(2,2).click();
    assert.ok(await menu.isHidden()); assert.deepEqual(await snapshot(),second);

    const s=G.createState(3);
    for(const [k,c,r] of [['pea',5,4],['cannon',5,4],['frost',2,2]]) assert.ok(G.build(s,k,c,r).ok);
    await page.evaluate(data=>localStorage.setItem('garden-guard-v1',JSON.stringify(data)),G.snapshot(s));
    await page.reload(); await cell(2,2).click();
    const option=page.locator('#fusion-recipes button').first();
    const before=await snapshot();
    await option.hover(); assert.equal(await hint.innerText(),'合成槌不足');
    await option.focus(); await page.keyboard.press('Enter');
    assert.deepEqual(await snapshot(),before);
    assert.ok(await menu.isVisible());
    await cell(6,6).click(); assert.ok(await menu.isHidden());
    await cell(5,4).click(); await page.locator('#edit-grade').click();
    await page.locator('#edit-move').click();
    await cell(2,2).click();
    assert.equal(await page.locator('#status').innerText(),'請選空格');
    await cell(6,4).hover();
    assert.ok(await page.locator('#hover-layer .fusion-tower').isVisible());
    const original=await snapshot();
    await cell(6,4).click();
    assert.deepEqual((await snapshot()).buildings[0],{...original.buildings[0],c:6});
    assert.equal(await page.locator('#building-layer [data-c="6"][data-r="4"][data-upgraded="true"]').count(),1);
    await page.locator('#undo').click(); assert.deepEqual(await snapshot(),original);
    await cell(5,4).click(); await page.locator('#edit-move').click();
    await page.keyboard.press('Escape'); assert.equal(await page.locator('#hover-layer text').count(),0);
    await cell(5,4).click(); await page.locator('#edit-move').click();
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
    await page.reload(); assert.deepEqual((await snapshot()).buildings[0],{...original.buildings[0],c:6});
    await cell(0,3).click(); assert.ok(await page.locator('#edit-move').isHidden());
    await page.locator('#edit-close').click();
    const reset=page.locator('#reset'), action=page.locator('#action'), beforeBattle=await snapshot();
    assert.equal(await reset.innerText(),'重置');
    await action.click(); assert.equal(await reset.innerText(),'暫停');
    await reset.click(); assert.equal(await reset.innerText(),'放棄');
    assert.equal(await page.evaluate(()=>gardenDebug.getState().phase),'paused');
    await action.click(); assert.equal(await reset.innerText(),'暫停');
    await reset.click(); await reset.click();
    assert.equal(await reset.innerText(),'重置');
    const restored=await snapshot();
    assert.deepEqual(restored.buildings,beforeBattle.buildings);
    for (const k of ['level','money','hearts','upgradeItems','fusionHammers']) assert.equal(restored[k],beforeBattle[k]);
  } finally { await page.close(); }
}

async function checkFusionArt(browser) {
  const page = await browser.newPage({viewport:{width:1200,height:850}});
  const towers = Object.keys(G.TOOLS).filter(kind => kind !== 'wall');
  const seen = new Set();
  const cell = page.locator('.cell-hit[data-c="5"][data-r="4"]');
  const placed = page.locator('#building-layer .fusion-tower');
  try {
    await page.goto(base);
    for (const baseKind of towers) {
      await page.selectOption('#level-select', '2');
      await page.selectOption('#level-select', '3');
      await page.locator(`[data-tool="${baseKind}"]`).click();
      await cell.click();
      for (const material of towers.filter(kind => kind !== baseKind)) {
        await cell.click();
        const option = page.locator(`#fusion-recipes [data-fuse="${material}"]`);
        const recipe = G.fusionRecipe(baseKind,material), weapon = G.primaryWeapon(recipe);
        assert.equal(await option.locator('.recipe-equation .tool-art').count(),2);
        assert.equal(await option.locator('.recipe-equation .fusion-portrait').count(),1);
        assert.deepEqual(await option.locator('.recipe-equation b').allTextContents(),['+','=']);
        const airOnly = ['cometCannon','fireCannon'].includes(weapon);
        const groundOnly = ['snowCannon','meteorTower','crossCoil','frostfireJet','moltenMortar'].includes(weapon);
        assert.equal(await option.locator('.recipe-target').innerText(),airOnly ? '空' : groundOnly ? '地' : '地／空');
        const preview = await option.locator('.fusion-tower').evaluate(el => {
          for (const use of el.querySelectorAll('use')) {
            if (!use.getBBox().width) throw Error('配方圖缺少 ' + use.getAttribute('href'));
          }
          return el.outerHTML;
        });
        if (baseKind === 'pea' && material === 'cannon') {
          await page.locator('#building-menu').screenshot({path:path.join(out,'fusion-recipes-live.png')});
        }
        await option.click();
        assert.equal(await placed.evaluate(el => el.outerHTML), preview, baseKind + '＋' + material);
        await cell.focus();
        assert.equal(await page.locator('#tower-info .info-ingredients').innerText(),`（${G.TOOLS[recipe.kind].name}＋${G.TOOLS[recipe.fusionKind].name}）`);
        const spec=G.toolFor(weapon), info=page.locator('#tower-info');
        assert.equal(await info.locator('.info-effect').first().innerText(),spec.effect);
        assert.match(await info.locator('.info-distance').first().innerText(),/射程 .*[\d]+.*格/);
        if (weapon === 'tacticalAir') assert.deepEqual(await info.locator('.info-distance').allInnerTexts(),[
          '射程 4.1 格','射程 3.8 格 · 爆炸半徑 1.25 格'
        ]);
        if (spec.stunSeconds) assert.ok((await info.innerText()).includes(`暈眩 ${spec.stunSeconds} 秒`));
        if (spec.aimSeconds) {
          const matches=(await info.innerText()).match(/瞄準 [\d.]+ 秒/g);
          assert.deepEqual(matches,[`瞄準 ${spec.aimSeconds} 秒`]);
        }
        if (spec.vortex) {
          assert.ok((await info.innerText()).includes(spec.vortex==='ice' ? '每 3 秒召喚一次' : '每 2.5 秒召喚一次'));
          assert.match(await info.locator('.info-effect').innerText(),spec.vortex==='ice' ? /冰龍捲/ : /火龍捲/);
          assert.doesNotMatch(await info.locator('.info-effect').innerText(),/召喚/);
        }
        seen.add(preview);
        await page.locator('#undo').click();
      }
    }
    assert.equal(seen.size, 21, '21 種成品各有造型，交換材料順序得到同一張圖');
  } finally { await page.close(); }
}
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
        if (kind === 'flame' && frame(.05).x !== undefined) throw Error('投石臂尚在揮動，石頭應留在石斗裡');
        if (kind === 'flame') {
          for (const peak of [.25, .55, .85]) {
            probe.innerHTML = GardenArt.flight('flame', 100,80,300,80,peak,0);
            const fire = probe.querySelector('.meteor-flame'), rock = probe.querySelector('.meteor-stone');
            if (!fire || !rock || fire.contains(rock) || fire.transform.baseVal.getItem(1).matrix.a >= 0)
              throw Error('火焰應持續朝向水平速度的後方，且與岩塊分開旋轉');
          }
        }
        return { kind, launch: frame(kind === 'flame' ? .18 : .05), middle: frame(.5), impact: frame(1) };
      });
      probe.remove();
      return result;
    });
    const fireballWidth = await p.evaluate(() => ['art-shot-flame', 'art-advanced-shot-flame'].map(id => document.getElementById(id).getBBox().width));
    assert.ok(fireballWidth[1] >= 1.7 * fireballWidth[0]);
    const size = kind => paths.find(p => p.kind === kind).middle.size;
    assert.ok(size('cannon') > 2 * size('pea'));
    assert.ok(size('molecular') > size('cannon'));
    assert.equal(await p.locator('#art-shot-pierce, #art-shot-frost').count(), 0);
    for (const { kind, launch, middle, impact } of paths) {
      assert.equal(launch.flare, kind !== 'flame', kind);
      assert.ok(!middle.trail && !middle.shadow && !impact.flare, kind);
      assert.ok(middle.x > 100 && middle.x < 300, kind);
      assert.equal(impact.x, 300, kind); assert.equal(impact.y, 80, kind);
      if (['cannon','flame','molecular'].includes(kind)) assert.ok(middle.y < 80, kind);
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
      const timing = tool.aimSeconds ? '瞄準 ' + tool.aimSeconds + ' 秒' : '攻擊 ' + tool.rate + '次/s';
      assert.ok((await p.locator('#tower-info').innerText()).includes(timing));
      assert.equal(await p.locator('#tower-info .info-target').textContent(), ['cannon','flame','frost'].includes(kind) ? '目標 地' : '目標 地/空');
      assert.equal(await p.locator('#tower-info .info-effect').textContent(), tool.effect);
    }
    await p.locator('[data-tool="wall"]').hover();
    assert.match(await p.locator('#tower-info').innerText(), /石牆[\s\S]*耐久 4/);
    await p.keyboard.press('Escape'); assert.equal(await p.locator('#tower-info').isVisible(), false);
    await press('[data-tool="pea"]'); await press(cell(6,5)); assert.equal((await read()).money, G.LEVELS[0].money - G.TOOLS.pea.cost);
    await p.mouse.move(20,20); await p.locator(cell(6,5)).hover(); assert.equal(await p.locator('#tower-info strong').textContent(), '砲塔');
    await press(cell(6,5)); await press('#edit-remove'); assert.equal((await read()).money, G.LEVELS[0].money);
    await press('#undo'); assert.equal((await read()).buildings.length, 1);
    await p.reload(); assert.equal((await read()).buildings.length, 1);
    await p.locator(cell(8,6)).click();
    await p.keyboard.press('Tab');
    await p.keyboard.press('Shift+Tab');
    assert.ok(await p.locator(cell(8,6)).evaluate(n => n === document.activeElement), '鍵盤回到剛選取的棋格');
    await press('[data-tool="wall"]'); await p.locator(cell(6,4)).focus(); await p.keyboard.press('ArrowRight'); await p.keyboard.press('Enter');
    assert.ok((await read()).buildings.some(b => b.c === 7 && b.r === 4 && b.kind === 'wall'));
    await press('#reset'); assert.equal((await read()).money, G.LEVELS[0].money); assert.equal((await read()).buildings.length, 0);
    await p.locator('#level-select').selectOption('9'); assert.equal((await read()).level, 9); assert.equal((await read()).money, G.LEVELS[9].money);
    const castle = G.LEVELS[9].goal;
    const castleCell = p.locator(cell(castle.c,castle.r)), preview = p.locator('#tower-info .next-upgrade');
    await castleCell.hover(); assert.equal(await preview.count(),0);
    await p.locator('[data-tool="pierce"]').hover(); assert.equal(await preview.count(),0);
    await press(cell(castle.c,castle.r));
    const closeMenu = p.getByRole('button',{name:'關閉升級面板'});
    const beforeClose = await read();
    await closeMenu.click();
    assert.ok(await p.locator('#building-menu').isHidden());
    assert.ok(await p.locator('#tower-info').isHidden());
    assert.ok(await castleCell.evaluate(el=>el===document.activeElement));
    assert.deepEqual(await read(),beforeClose);
    await castleCell.press('Enter');
    await p.locator('#edit-grade').hover(); assert.match(await preview.innerText(),/城堡\+/);
    await press('#edit-grade');
    assert.equal(await preview.count(),0);
    assert.equal((await read()).upgradeItems,8); assert.equal((await read()).hearts,6);
    assert.equal(await p.locator('#castle-bow use').count(),2);
    await p.reload(); assert.ok((await read()).castleUpgraded);
    await castleCell.focus();
    assert.equal(await p.locator('#tower-info .info-ingredients').innerText(),'（城堡＋升級水晶）');
    await press(cell(castle.c,castle.r)); await press('#edit-grade'); await p.keyboard.press('Escape');
    assert.equal((await read()).upgradeItems,9); assert.equal(await p.locator('#castle-bow use').count(),1);
    assert.equal(await p.locator('#action').textContent(), '開始');
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
    // Exercise the unlock and recovery flow using an isolated third-stage clear.
    const won = G.createState(2); assert.ok(G.build(won,'pea',5,4).ok);
    G.startWave(won); won.queue = []; G.step(won,.01,true);
    await p.evaluate(data => localStorage.setItem('garden-guard-v1', JSON.stringify(data)), G.snapshot(won));
    await p.reload();
    assert.match(await p.locator('#win-crystal').innerText(), /解鎖融合槌/);
    assert.equal(await p.locator('#lesson').isVisible(), false);
    await press('#result-primary'); assert.ok(await p.locator('#lesson').isHidden());
    await press('#action'); assert.match(await p.locator('#lesson-title').innerText(), /融合槌/);
    assert.equal(await p.locator('#lesson figure').count(), 3);
    await press('#lesson-close'); await p.reload();
    const target = cell(5,4);
    await press(target); await press('#edit-grade');
    const invested = (await read()).upgradeItems;
    await press('[data-tool="cannon"]'); await press(target);
    assert.equal(await p.locator('#hammer-count').textContent(), '1');
    assert.equal(await p.locator('#fusion-recipes [data-fuse]').count(), 6);
    for (const [width, height] of [[390,844],[568,320]]) {
      await p.keyboard.press('Escape');
      await p.setViewportSize({width,height});
      await press(target);
      const menu = await p.locator('#building-menu').boundingBox();
      assert.ok(menu.x >= 0 && menu.y >= 0 && menu.x + menu.width <= width && menu.y + menu.height <= height);
      const closeBox=await closeMenu.boundingBox();
      assert.ok(menu.x+menu.width-closeBox.x-closeBox.width<=12 && closeBox.y-menu.y<=12,'關閉鍵位於面板右上角');
      await closeMenu.click();
      assert.ok(await p.locator('#building-menu').isHidden());
      await press(target);
      const last = p.locator('#fusion-recipes button').last();
      await last.scrollIntoViewIfNeeded();
      assert.ok(await last.evaluate(el => {
        const box = el.getBoundingClientRect();
        return el.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
      }), '最下方配方可捲動並點選');
    }
    await p.setViewportSize({width:1440,height:1080});
    const recipe = p.getByRole('button', { name: /砲塔＋大砲合成戰術砲臺/ });
    assert.ok(await recipe.isVisible()); await recipe.click();
    assert.equal(await p.locator('#hammer-count').textContent(), '0');
    assert.equal(await p.locator('[data-building="pea"][data-fusion="cannon"]').count(),1);
    await press(target); assert.equal(await p.locator('#building-name').innerText(), '戰術砲臺');
    assert.ok(await p.locator('#edit-grade').isVisible());
    assert.ok(await p.locator('#edit-grade').evaluate(el => el === document.activeElement));
    await p.reload(); await press(target);
    const merged = await read();
    assert.ok(await p.locator('#fusion-options').isHidden());
    assert.equal(merged.upgradeItems, invested + 1); assert.equal(merged.fusionHammers, 0);
    assert.equal(merged.buildings[0].upgraded, false); assert.equal(merged.buildings[0].fusionKind, 'cannon');
    assert.ok(await p.locator('#edit-grade').isVisible());
    await press('#edit-grade');
    assert.equal((await read()).upgradeItems, invested);
    assert.equal(await p.locator('[data-fusion="cannon"] [data-badge]').count(),2);
    await p.reload(); await press(target);
    assert.equal(await p.locator('#building-name').innerText(),'戰術砲臺+');
    assert.match(await p.locator('#edit-grade').innerText(),/取消升級/);
    await press('#edit-grade');
    await press('#edit-remove'); assert.equal(await p.locator('#hammer-count').textContent(), '1');
    assert.equal((await read()).buildings.length,0);
    await press('#undo'); assert.equal(await p.locator('#hammer-count').textContent(), '0');
    const touch = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const phone = await touch.newPage(); await phone.goto(base);
    await phone.locator('[data-tool="flame"]').tap(); assert.equal(await phone.locator('#tower-info .info-target').textContent(), '目標 地');
    await phone.locator('[data-tool="pea"]').tap(); await phone.locator(cell(3,5)).tap(); await phone.locator(cell(3,5)).tap();
    assert.equal(await phone.locator('#building-name').textContent(), '砲塔');
    await phone.locator('#action').tap();
    assert.ok(await phone.locator('#building-menu').isHidden());
    assert.equal((await phone.evaluate(() => gardenDebug.getState())).phase, 'planning');
    await phone.locator('#action').tap(); await phone.locator('#action').tap(); assert.equal((await phone.evaluate(() => gardenDebug.getState())).phase, 'paused');
    for (const [width, height] of [[390,844], [320,568]]) {
      await phone.setViewportSize({width,height});
      await phone.locator('.display-settings summary').tap();
      const hpSetting = phone.getByLabel('顯示蟲蟲血量');
      const controls = await phone.locator('.control-panel').boundingBox();
      for (const item of await phone.locator('.display-settings label').all()) {
        const label = await item.boundingBox();
        assert.ok(label.y >= 0 && label.y + label.height <= controls.y, '直向開啟顯示設定時能直接點選兩項設定');
      }
      const checked = await hpSetting.isChecked();
      await hpSetting.tap();
      assert.equal(await hpSetting.isChecked(), !checked);
      await phone.locator('.display-settings summary').tap();
    }
    await touch.close(); assert.deepEqual(errors, []);
    await checkMenuShortages(browser);
    await checkFusionArt(browser);
    console.log(JSON.stringify({passed:true,tooltips:8,testSelector:10,refund:true,keyboard:true,touch:true,widths:[1440,900,390,320],zoom:'200%',browserErrors:errors}));
  } finally {await browser.close();}
})().catch(error => {console.error(error);process.exitCode=1;});
