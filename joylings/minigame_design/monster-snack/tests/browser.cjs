'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.SNACK_PLAYWRIGHT_MODULE || 'playwright');
const solutions = require('./solutions.cjs');
const base = process.env.SNACK_URL || 'http://127.0.0.1:4320/';
const output = path.resolve(__dirname, '../dist/browser-check');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const errors = [];
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(base);
    await page.screenshot({ path: path.join(output, '01-desktop.png'), fullPage: true });
    assert.equal(await page.locator('#run-button').isDisabled(), true);
    await page.locator('[data-type="serve"]').click();
    await page.locator('#step-button').click();
    assert.match(await page.locator('#message').innerText(), /剛剛好/);
    await page.locator('#step-button').click();
    assert.equal(await page.locator('#success-dialog').isVisible(), true);
    await page.locator('#next-button').click();
    assert.equal(await page.locator('#level-title').innerText(), '再多一顆');
    // Real browser drag from palette, then reorder an existing block.
    await page.locator('[data-type="serve"]').dragTo(page.locator('[data-slot="root"]'));
    await page.locator('[data-type="add"]').click();
    assert.equal(await page.locator('.code-block').count(), 2);
    await page.locator('.code-block').nth(1).locator('[data-drag-id]').dragTo(page.locator('.code-block').first());
    assert.match(await page.locator('.code-block').first().innerText(), /把 x 設為/);
    await page.reload();
    assert.equal(await page.locator('.code-block').count(), 2);
    await page.locator('#run-button').click();
    assert.match(await page.locator('#x-value').innerText(), /3/);
    await page.locator('#run-button').click();
    const paused = await page.locator('#message').innerText();
    await page.waitForTimeout(1100);
    assert.equal(await page.locator('#message').innerText(), paused);
    assert.equal(await page.locator('.palette-block').first().isDisabled(), true);
    await page.locator('#reset-button').click();
    await page.waitForTimeout(1100);
    assert.match(await page.locator('#x-value').innerText(), /2/);
    assert.equal(await page.locator('.code-block').count(), 2);
    await page.locator('#clear-button').click();
    assert.equal(await page.locator('.code-block').count(), 0);
    await page.locator('#undo-button').click();
    assert.equal(await page.locator('.code-block').count(), 2);
    await page.locator('#clear-button').click();
    await page.locator('[data-type="serve"]').click();
    await page.locator('#run-button').click();
    assert.equal(await page.locator('#feedback.error').count(), 1);
    assert.equal(await page.locator('#success-dialog').isVisible(), false);
    assert.equal(await page.locator('.error-block').count(), 1);
    console.log('PASS：點選、拖曳新增與排序、保存、暫停、重來、復原、錯誤定位');
    async function choose(index) {
      await page.locator('#levels-button').click();
      await page.locator(`[data-level="${index}"]`).click();
    }
    await choose(7);
    await page.locator('[data-type="ifElse"]').click();
    await page.locator('[data-field="op"]').selectOption('<');
    await page.locator('[data-slot$=":then"]').click();
    await page.locator('[data-type="add"]').click();
    await page.locator('[data-slot$=":else"]').click();
    await page.locator('[data-type="sub"]').click();
    await page.locator('[data-slot="root"]').click();
    await page.locator('[data-type="serve"]').click();
    await page.screenshot({ path: path.join(output, '02-branches.png'), fullPage: true });
    async function completeBySteps() {
      for (let count = 0; count < 140 && !(await page.locator('#success-dialog').isVisible()); count++) {
        await page.locator('#step-button').click();
        if (await page.locator('#feedback.error').count()) throw new Error(await page.locator('#message').innerText());
      }
      assert.equal(await page.locator('#success-dialog').isVisible(), true);
    }
    await completeBySteps();
    await page.locator('#success-dialog [data-close]').click();
    console.log('PASS：透過介面拼出 if / else，四筆訂單全部通過');
    for (let i = 0; i < solutions.length; i++) {
      await page.evaluate(({ i, solution }) => {
        localStorage.setItem('monster-snack-v1', JSON.stringify({ level: i, completed: [], programs: { [i]: solution } }));
      }, { i, solution: solutions[i] });
      // Seed an isolated context's storage; a second tab avoids the current draft's pagehide save.
      const testPage = await context.newPage();
      testPage.on('pageerror', error => errors.push(error.message));
      await testPage.goto(base);
      for (let count = 0; count < 140 && !(await testPage.locator('#success-dialog').isVisible()); count++) {
        await testPage.locator('#step-button').click();
        if (await testPage.locator('#feedback.error').count()) throw new Error(`第 ${i + 1} 關：${await testPage.locator('#message').innerText()}`);
      }
      assert.equal(await testPage.locator('#success-dialog').isVisible(), true, `第 ${i + 1} 關成功視窗`);
      const save = await testPage.evaluate(() => JSON.parse(localStorage.getItem('monster-snack-v1')));
      assert.ok(save.completed.includes(i));
      await testPage.close();
    }
    console.log('PASS：12 關瀏覽器逐步播放，全部訂單完成，成功進度寫入');
    await choose(10);
    await page.locator('[data-type="switch"]').click();
    for (const [kind, flavor] of [['fire', 'warm'], ['snow', 'cold'], ['slime', 'jam'], ['default', 'plain']]) {
      await page.locator(`[data-slot$=":case-${kind}"]`).click();
      await page.locator(`[data-type="${flavor}"]`).click();
    }
    await page.locator('[data-slot="root"]').click();
    await page.locator('[data-type="serve"]').click();
    // Ensure the parent cannot be dropped into its own child.
    const oldCount = await page.locator('.code-block').count();
    await page.locator('.code-block.switch > .code-header [data-drag-id]').dragTo(page.locator('[data-slot$=":case-fire"]'));
    assert.equal(await page.locator('.code-block').count(), oldCount);
    assert.match(await page.locator('#message').innerText(), /不能放進自己/);
    await completeBySteps();
    await page.locator('#success-dialog [data-close]').click();
    console.log('PASS：switch 四個分支可編輯、default 正確，阻止拖入自身');
    await page.locator('#reset-button').click();
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}px 頁面溢出`);
      assert.equal(await page.evaluate(() => {
        const el = document.querySelector('.workspace');
        return el.scrollWidth <= el.clientWidth;
      }), true, `${width}px 編輯器溢出`);
      await page.screenshot({ path: path.join(output, `03-switch-${width}.png`), fullPage: true });
    }
    await choose(0);
    await page.locator('#clear-button').click();
    await page.locator('[data-type="serve"]').click();
    await completeBySteps();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(output, '04-mobile-success.png'), fullPage: true });
    assert.deepEqual(errors, []);
    console.log('PASS：320／390／768／1024／1440px 無橫向溢出，手機成功視窗，無 JavaScript 錯誤');
    const offlinePath = path.resolve(__dirname, '../dist/monster-snack.html');
    assert.ok(fs.existsSync(offlinePath), '請先執行 npm run build:h5');
    const offline = await context.newPage();
    offline.on('pageerror', error => errors.push(error.message));
    await offline.goto(pathToFileURL(offlinePath).href);
    await offline.locator('[data-type="serve"]').click();
    await offline.locator('#step-button').click();
    await offline.locator('#step-button').click();
    assert.equal(await offline.locator('#success-dialog').isVisible(), true);
    await offline.close();
    const touchContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const touch = await touchContext.newPage();
    await touch.goto(base);
    await touch.locator('#levels-button').tap();
    await touch.locator('[data-level="4"]').tap();
    await touch.locator('[data-type="if"]').tap();
    await touch.locator('[data-slot$=":then"]').tap();
    await touch.locator('[data-type="add"]').tap();
    assert.equal(await touch.locator('.branch .code-block.math').count(), 1);
    await touchContext.close();
    assert.deepEqual(errors, []);
    console.log('PASS：離線單檔可通關、手機觸控可在 if 分支加入方塊');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
