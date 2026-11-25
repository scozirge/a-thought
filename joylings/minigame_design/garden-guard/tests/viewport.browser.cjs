const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const base = process.env.GARDEN_URL || pathToFileURL(path.join(__dirname, '../dist/garden-guard.html')).href;
const screens = [[320,480], [320,568], [390,844], [480,320], [568,320], [667,375],
  [844,390], [768,1024], [1024,600], [1024,768], [1366,768], [1440,900], [1920,1080]];

async function checkScreen(page, width, height) {
  await page.setViewportSize({width, height});
  const problems = await page.evaluate(() => {
    const errors = [];
    if (document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight) errors.push('頁面需要捲動');
    const targets = document.querySelectorAll('#board, .cell-hit, .entrance, .tool-card, .icon-button, #action, #crystals, #hammers, #level-select, .resources, .display-settings summary');
    for (const el of targets) {
      if (!el.getClientRects().length) continue;
      const r = el.getBoundingClientRect(), name = el.getAttribute('aria-label') || el.id || el.tagName;
      if (r.left < -.5 || r.top < -.5 || r.right > innerWidth + .5 || r.bottom > innerHeight + .5 || r.width <= 0 || r.height <= 0) errors.push(name + ' 超出畫面');
      if (el.matches('button, select, summary') && (r.width < 48 || r.height < 48)) errors.push(name + ' 按鈕過小');
      if (el.matches('.cell-hit, button, select, summary') && !el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))) errors.push(name + ' 被遮住');
    }
    return errors;
  });
  assert.deepEqual(problems, [], width + '×' + height + ' ' + problems.join('、'));
}

(async () => {
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  try {
    const page = await browser.newPage({isMobile:true, hasTouch:true, viewport:{width:390,height:844}});
    await page.goto(base);
    assert.equal(await page.locator('#solution').count(), 0);
    await checkScreen(page, 320, 568);
    await page.evaluate(() => localStorage.setItem('garden-guard-v1', JSON.stringify(Garden.snapshot(Garden.createState(Garden.BONUS_LEVEL)))));
    const url = new URL(base);
    url.searchParams.set('tip', 'true');
    await page.goto(url.href);
    assert.equal(await page.locator('.entrance').count(), 4);
    assert.ok(await page.locator('#solution').isVisible());
    for (const [width, height] of screens) await checkScreen(page, width, height);
    for (const [width,height] of [[320,480],[480,320]]) {
      await page.setViewportSize({width,height});
      await page.locator('.entrance[data-boss]').first().tap();
      const guide=page.getByRole('dialog',{name:'入口蟲蟲'});
      assert.ok(await guide.isVisible()); assert.equal(await guide.locator('.guide-card').count(),3);
      await guide.getByRole('button',{name:'下一頁'}).tap();
      await guide.getByRole('button',{name:'上一頁'}).tap();
      const close=guide.getByRole('button',{name:'關閉入口蟲蟲'});
      const box=await close.boundingBox();
      assert.ok(box.width>=48 && box.height>=48 && box.x+box.width<=width && box.y>=0);
      await close.tap(); assert.ok(await guide.isHidden());
    }
    await checkScreen(page, 390, 844);
    await page.locator('[data-tool="wall"]').tap();
    await page.locator('.cell-hit[data-c="10"][data-r="7"]').tap();
    const building = await page.evaluate(() => gardenDebug.getState().buildings.find(b => b.c === 10 && b.r === 7));
    assert.equal(building?.kind, 'wall');
    await page.locator('#action').tap();
    await page.locator('#action').tap();
    await checkScreen(page, 844, 390);
    assert.equal(await page.evaluate(() => gardenDebug.getState().phase), 'paused');
    await page.locator('.display-settings summary').tap();
    await page.locator('#enemy-health').check();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.display-settings').evaluate(el => el.open), false);
    for (const level of [0, 9, 10]) {
      await page.evaluate(level => {
        const s = GardenSolutions.create(level);
        Garden.startWave(s, 0, 42);
        for (let i = 0; i < 30000 && s.phase === 'running'; i++) Garden.step(s, 1 / 60, true);
        if (s.phase !== 'won' && s.phase !== 'cleared') throw Error(`第 ${level + 1} 關測試部署未過關：${s.phase}`);
        localStorage.setItem('garden-guard-v1', JSON.stringify(Garden.snapshot(s)));
      }, level);
      await page.reload();
      const result = page.getByRole('dialog');
      assert.ok(await result.isVisible());
      for (const [width, height] of [[320, 480], [320, 568], [480, 320], [844, 390]]) {
        await page.setViewportSize({width, height});
        assert.ok(await result.evaluate(el => el.scrollHeight <= el.clientHeight + 1), `第 ${level + 1} 關 ${width}×${height} 結算獎勵與按鈕一次可見`);
        for (const button of await result.getByRole('button').all()) {
          const r = await button.boundingBox();
          assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.width <= width && r.y + r.height <= height);
        }
      }
      await result.getByRole('button',{name:'繼續',exact:true}).tap();
      assert.equal(await page.locator('#level-select').inputValue(),String(level));
      for (const [width,height] of [[320,480],[480,320]]) {
        await page.setViewportSize({width,height});
        for (const button of await page.locator('.round-actions button:visible').all()) {
          const box=await button.boundingBox();
          assert.ok(box.width>=48 && box.height>=48 && box.x>=0 && box.y>=0 && box.x+box.width<=width+1 && box.y+box.height<=height+1, `${width}×${height} ${await button.textContent()}`);
        }
      }
    }
    console.log(JSON.stringify({screens:screens.length, allCells:96, bonusEntrances:4, rotateDuringPause:true, rewardDialogs:[1,10,11]}));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
