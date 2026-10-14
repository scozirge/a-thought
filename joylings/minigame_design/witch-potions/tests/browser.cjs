'use strict';
const { chromium } = require(process.env.POTIONS_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const G = require('../game.js');
const base = process.env.POTIONS_URL || 'http://127.0.0.1:18118/';
const output = path.resolve(__dirname, '../dist/browser-check');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const errors = [], checks = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1365, height: 1000 } });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base);
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('witch-potions-v1')));
    async function settled() { await page.waitForFunction(() => !document.getElementById('cup-0').disabled); }
    async function action([kind, from, to]) {
      if (kind === 'fill') { await page.locator(`[data-ingredient="${to}"]`).click(); await page.locator('#cup-' + from).click(); }
      else { await page.locator('#cup-' + from).click(); await page.locator(kind === 'pour' ? '#cup-' + to : kind === 'pot' ? '#pot' : '#waste').click(); }
      await settled();
    }
    assert.equal(await page.locator('#step-count,#journal-count,#hint-button,#hint-dialog').count(), 0);
    assert.doesNotMatch(await page.locator('body').innerText(), /次操作|數字是份量|\b[ABC]\b/);
    assert.equal(await page.locator('#target-potion svg').count(), 1);
    assert.equal(await page.locator('#recipe .ingredient-icon').count(), 2);
    assert.equal(await page.locator('#solution-list li').count(), G.levels[0].solution.length);
    assert.equal(await page.locator('#hint-text').isVisible(), true);
    checks.push('原料與配方使用圖示、目標藥水瓶、移除計次、提示和完整倒法直接顯示');
    await page.locator('[data-ingredient="0"]').click();
    await page.mouse.move(700, 390);
    assert.equal(await page.locator('#carry-cursor').isVisible(), true);
    const before = await page.locator('#carry-cursor').getAttribute('style');
    await page.mouse.move(770, 440);
    assert.notEqual(await page.locator('#carry-cursor').getAttribute('style'), before);
    await page.mouse.click(770, 440, { button: 'right' });
    assert.equal(await page.locator('#carry-cursor').isVisible(), false);
    assert.equal(await page.locator('#cancel').isVisible(), false);
    await page.locator('[data-ingredient="0"]').click();
    await page.locator('#cup-0').click();
    assert.equal(await page.locator('#pour-flight').isVisible(), true);
    assert.equal(await page.locator('#pour-flight').getAttribute('data-source'), 'ingredient-0');
    assert.equal(await page.locator('#pour-flight').getAttribute('data-target'), 'cup-0');
    await page.waitForTimeout(270);
    await page.screenshot({ path: path.join(output, 'pour-animation.png') });
    await settled();
    assert.equal(await page.locator('#pour-flight').isVisible(), false);
    await page.locator('#cup-0').click();
    assert.equal(await page.locator('#carry-cursor svg clipPath').count(), 1);
    await page.locator('#cup-0').click({ button: 'right' });
    assert.equal((await saved()).games[0].length, 1);
    assert.equal(await page.locator('#cancel').isVisible(), false);
    checks.push('原料瓶與量杯跟隨滑鼠、右鍵取消不改配方、來源至目的地倒入動畫');
    await page.locator('[data-level="1"]').click();
    await action(['fill', 0, 1]);
    await page.locator('[data-level="0"]').click();
    await action(['pot', 0]);
    await page.locator('#pot').hover();
    assert.equal(await page.locator('#pot-tooltip').isVisible(), true);
    assert.equal(await page.locator('#pot-recipe [aria-label="玫瑰露 5 份"]').count(), 1);
    await page.screenshot({path:path.join(output,'pot-tooltip.png')});
    await page.locator('#brew').click();
    assert.match(await page.locator('#result-story').innerText(), /已清空/);
    assert.equal((await saved()).games[0].length, 0);
    assert.equal((await saved()).games[1].length, 1);
    assert.equal(await page.locator('#result-feedback .ingredient-icon').count(), 2);
    await page.locator('#result-back').click();
    assert.equal(await page.locator('#undo').isDisabled(), true);
    assert.equal(await page.locator('#cup-contents-0').innerText(), '空杯');
    await page.reload();assert.equal((await saved()).games[0].length, 0);
    checks.push('大鍋滑鼠浮動配方、失敗立即清空且重新整理後保持空白、保留其他訂單草稿');
    const portraits = new Set(), gallery = [];
    for (let i=0;i<G.levels.length;i++) {
      if (i === 4) await page.emulateMedia({reducedMotion:"reduce"});
      await page.locator(`[data-level="${i}"]`).click();await page.locator('#reset').click();
      const portrait = await page.locator('#customer-art').innerHTML();
      portraits.add(portrait);
      const potion = await page.locator('#target-potion').innerHTML();
      assert.doesNotMatch(potion, /undefined/);
      for (const a of G.levels[i].solution) await action(a);
      await page.locator('#brew').click();
      assert.equal(await page.locator('#result-title').innerText(),'就是這個配方！');
      gallery.push({name:G.levels[i].name,customer:G.levels[i].customer,portrait,potion,result:await page.locator('#result-art').innerHTML()});
      await page.locator('#result-back').click();
      checks.push(G.levels[i].name+'：實際按鈕通關');
    }
    assert.equal(portraits.size,10);
    const galleryPage = await browser.newPage({viewport:{width:1500,height:1000},reducedMotion:'reduce'});
    await galleryPage.setContent('<html lang="zh-Hant"><meta charset="utf-8"><style>body{font-family:Microsoft JhengHei,sans-serif;background:#f3efe7;color:#584970;padding:20px}main{display:grid;grid-template-columns:repeat(5,1fr);gap:16px}article{background:#fbf8f0;border-radius:20px;padding:16px;text-align:center}h2{font-size:19px;margin:8px}p{font-size:13px}.portrait,.result{height:145px}.potion{height:85px}svg{height:100%;max-width:100%}</style><main>'+gallery.map(item=>`<article><h2>${item.name}</h2><p>${item.customer}</p><div class="portrait">${item.portrait}</div><div class="potion">${item.potion}</div><div class="result">${item.result}</div></article>`).join('')+'</main></html>');
    await galleryPage.screenshot({path:path.join(output,'all-customers-and-effects.png'),fullPage:true});await galleryPage.close();
    checks.push('十位客人圖像不重複，十種藥水圖案與成功效果可正確繪製');
    assert.equal((await saved()).completed.length, G.levels.length);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.locator('[data-level="0"]').click();await page.locator('#reset').click();
    await action(['fill',0,0]);await page.locator('#undo').click();assert.equal(await page.locator('#cup-contents-0').innerText(),'空杯');
    await page.locator('[data-ingredient="1"]').click();await page.locator('#cup-1').click();
    await page.locator('[data-level="1"]').click();await page.waitForTimeout(650);
    assert.equal(await page.locator('#pour-flight').isVisible(),false);
    assert.equal(await page.locator('#cup-0').isEnabled(),true);
    checks.push('撤回、動畫中換訂單無殘留或鎖住操作');
    await page.locator('[data-level="0"]').click();await page.locator('#reset').click();
    for(const width of [320,390,945,1365]) {
      await page.setViewportSize({width,height:1000});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.screenshot({path:path.join(output,`layout-${width}.png`),fullPage:true});
    }
    const touch=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    touch.on('pageerror',e=>errors.push(e.message));await touch.goto(base);
    assert.equal(await touch.locator('#pot-tooltip').isVisible(),true);
    await touch.locator('[data-ingredient="1"]').tap();assert.equal(await touch.locator('#carry-cursor').isVisible(),false);
    await touch.locator('#cup-1').tap();await touch.waitForTimeout(650);
    await touch.locator('#cup-1').tap();await touch.locator('#pot').tap();await touch.waitForTimeout(650);
    assert.equal(await touch.locator('#pot-recipe [aria-label="月光水 3 份"]').count(),1);
    await touch.screenshot({path:path.join(output,'touch-390.png'),fullPage:true});
    await touch.close();
    await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-ingredient="0"]').click();await page.locator('#cup-0').click();
    assert.equal(await page.locator('#pour-flight').isVisible(),false);assert.equal(await page.locator('#cup-0').isEnabled(),true);
    await page.locator('#pot').focus();assert.equal(await page.locator('#pot-tooltip').isVisible(),true);
    checks.push('320／390／945／1365 排版、觸控常顯鍋內配方、減少動態與鍵盤查看');
    await page.locator('[data-level="9"]').click();await page.locator('#reset').click();
    assert.equal(await page.locator('[data-cup]').count(),5);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await action(['fill',1,0]);await action(['pour',1,2]);await action(['pour',1,4]);
    await page.locator('#cup-4').click();assert.equal(await page.locator('#carry-cursor').isVisible(),true);
    await page.locator('#cup-4').click({button:'right'});assert.equal(await page.locator('#carry-cursor').isVisible(),false);
    await action(['empty',4]);await page.locator('#undo').click();
    assert.equal(await page.locator('#cup-contents-4 .ingredient-icon').count(),1);
    await page.reload();assert.equal(await page.locator('[data-cup]').count(),5);
    assert.equal(await page.locator('#cup-contents-4 .ingredient-icon').count(),1);
    for (const i of [4,6,9]) {
      await page.locator(`[data-level="${i}"]`).click();
      for(const width of [320,390,945,1365]) {
        await page.setViewportSize({width,height:1000});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      }
      await page.screenshot({path:path.join(output,`cups-${G.levels[i].capacities.length}.png`),fullPage:true});
    }
    await page.setViewportSize({width:390,height:1000});
    await page.screenshot({path:path.join(output,'five-cups-mobile.png'),fullPage:true});
    const migration = await browser.newPage();await migration.goto(base);
    await migration.evaluate(()=>localStorage.setItem('witch-potions-v1',JSON.stringify({version:2,current:9,games:[[['fill',0,0]],[],[],[],[],[],[],[],[],[['fill',1,0]]],completed:['love','dragon']})));
    await migration.reload();
    let migrated=await migration.evaluate(()=>JSON.parse(localStorage.getItem('witch-potions-v1')));
    assert.equal(migrated.version,3);assert.deepEqual(migrated.games[0],[['fill',0,0]]);
    assert.deepEqual(migrated.games[9],[]);assert.deepEqual(migrated.completed,['love']);
    assert.equal(await migration.locator('[data-cup]').count(),5);await migration.close();
    checks.push('三至五杯排版、第五杯動畫與右鍵、清空與撤回、重載五杯草稿、舊版配方遷移');
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({checks,errors},null,2));
    console.log(checks.join('\n'));
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
