'use strict';
const { chromium } = require(process.env.POTIONS_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const G = require('../game.js');
const M = require('../manager.js');
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
    assert.equal(await page.locator('#manager-entry').getAttribute('data-locked'),'true');
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('witch-potions-v1')));
    const beforeLockedEntry = await saved();
    assert.equal(await page.locator('#manager-entry-lock').isVisible(),true);
    await page.locator('#manager-entry').click();
    assert.equal(await page.locator('#manager-lock-dialog').isVisible(),true);
    assert.equal(await page.locator('#manager-lock-message').innerText(),'要先完成10題藥水問題才能成為管理員');
    assert.equal(await page.locator('#manager-panel').isVisible(),false);
    await page.locator('#manager-lock-dialog [data-close]').click();
    assert.deepEqual(await saved(),beforeLockedEntry);
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
    assert.equal(await page.locator('#solution-list li').count(), 0);
    assert.equal(await page.locator('#witch-hints').isVisible(), false);
    const tips = await browser.newPage();
    for (const query of ['', '?tip=false', '?tip=1', '?tip=True', '?v=0.5.1&tip=true']) {
      const url = new URL(base); url.search = query;
      await tips.goto(url.href);
      const visible = query.endsWith('tip=true');
      assert.equal(await tips.locator('#manager-entry').getAttribute('data-locked'),'true');
      assert.equal(await tips.locator('#witch-hints').isVisible(), visible);
      assert.equal(await tips.locator('#solution-list li').count(), visible ? G.levels[0].solution.length : 0);
    }
    await tips.locator('[data-level="9"]').click();
    assert.equal(await tips.locator('#solution-list li').count(), G.levels[9].solution.length);
    await tips.reload();assert.equal(await tips.locator('#witch-hints').isVisible(), true);
    await tips.close();
    const preview = await browser.newPage({viewport:{width:1365,height:1000}});
    for(const query of ['?gm=false','?gm=1','?gm=True']) {
      const url = new URL(base); url.search = query;
      await preview.goto(url.href);
      assert.equal(await preview.locator('#manager-panel').isVisible(),false);
      assert.equal(await preview.locator('#manager-entry').getAttribute('data-locked'),'true');
    }
    const previewURL = new URL(base); previewURL.search = '?v=0.6.0&tip=true&gm=true';
    await preview.goto(previewURL.href);
    assert.equal(await preview.locator('#manager-panel').isVisible(),true);
    assert.equal(await preview.locator('#manager-entry-lock').isVisible(),false);
    assert.equal(await preview.locator('#manager-subtitle').innerText(),'你現在是遊戲管理員');
    await preview.waitForFunction(()=>!document.getElementById('manager-quiz').hidden);
    assert.equal(await preview.locator('.manager-pour-source>svg').count(),1);
    assert.equal(await preview.locator('[data-choice="0"] .ingredient-icon').count(),2);
    assert.equal(await preview.locator('[data-choice="2"] .ingredient-icon').count(),1);
    for(const width of [320,390,945,1365]) {
      await preview.setViewportSize({width,height:1000});
      assert.equal(await preview.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await preview.locator('#manager-panel').screenshot({path:path.join(output,`manager-outcomes-${width}.png`)});
    }
    await preview.locator('[data-choice="1"]').click();
    await preview.waitForFunction(()=>document.getElementById('manager-progress').textContent==='2 / 10');
    const previewSave = await preview.evaluate(()=>JSON.parse(localStorage.getItem('witch-potions-v1')));
    assert.deepEqual(previewSave.completed,[]);
    assert.equal(previewSave.manager.answered,0);
    await preview.locator('#manager-back').click();
    assert.equal(await preview.locator('#witch-hints').isVisible(),true);
    await preview.goto(base);
    assert.equal(await preview.locator('#manager-entry').getAttribute('data-locked'),'true');
    await preview.close();
    checks.push('gm=true 直接播放管理員開場、圖像結果選項、試玩不改正式成績、移除參數恢復十關解鎖限制');
    checks.push('原料與目標配方使用圖示，女巫提示與完整解法只有 tip=true 才顯示');
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
    await action(['fill', 1, 1]);
    const beforeMix = await saved();
    await page.locator('[data-ingredient="1"]').click();
    await page.locator('#cup-0').click();
    assert.equal(await page.locator('#mix-dialog').isVisible(), true);
    assert.equal(await page.locator('#mix-message').innerText(), '不同配方不能倒入同一個杯子喔!');
    assert.deepEqual(await saved(), beforeMix);
    assert.equal(await page.locator('#pour-flight').isVisible(), false);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#mix-dialog').isVisible(), false);
    await page.locator('#cup-0').click();await page.locator('#cup-1').click();
    assert.equal(await page.locator('#mix-dialog').isVisible(), true);
    assert.deepEqual(await saved(), beforeMix);
    for (const width of [320,1365]) {
      await page.setViewportSize({width,height:1000});
      assert.equal(await page.locator('#mix-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth), true);
      await page.screenshot({path:path.join(output,`mix-dialog-${width}.png`)});
    }
    await page.locator('#mix-dialog [data-close]').click();
    await action(['empty',1]);await action(['pour',0,1]);
    assert.equal(await page.locator('#mix-dialog').isVisible(), false);
    checks.push('瓶對杯與杯對杯混料跳出提醒，不扣原料不改紀錄；關閉後倒入空杯正常');
    await page.locator('[data-level="1"]').click();
    await action(['fill', 0, 1]);
    await page.locator('[data-level="0"]').click();
    assert.equal(await page.locator('#cup-contents-0').innerText(), '空杯');
    assert.equal(await page.locator('#pot-contents').innerText(), '空鍋');
    assert.equal(await page.locator('#undo').isDisabled(), true);
    assert.equal((await saved()).games[1].length, 0);
    await action(['fill',0,0]);
    await action(['pot', 0]);
    await page.locator('#pot').hover();
    assert.equal(await page.locator('#pot-tooltip').isVisible(), true);
    assert.equal(await page.locator('#pot-recipe [aria-label="玫瑰露 5 份"]').count(), 1);
    await page.screenshot({path:path.join(output,'pot-tooltip.png')});
    await page.locator('#brew').click();
    assert.match(await page.locator('#result-story').innerText(), /已清空/);
    assert.equal((await saved()).games[0].length, 0);
    assert.equal((await saved()).games[1].length, 0);
    assert.equal(await page.locator('#result-feedback .ingredient-icon').count(), 2);
    await page.locator('#result-back').click();
    assert.equal(await page.locator('#undo').isDisabled(), true);
    assert.equal(await page.locator('#cup-contents-0').innerText(), '空杯');
    await page.reload();assert.equal((await saved()).games[0].length, 0);
    checks.push('切換題目清空杯子與大鍋、無舊步驟可撤回；大鍋配方與失敗清空正常');
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
      assert.equal(await page.locator('#manager-entry').getAttribute('data-locked'),String(i < G.levels.length-1));
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
    await page.locator('#brew').click();
    assert.equal(await page.locator('#result-next').innerText(),'遊戲管理員 →');
    await page.locator('#result-next').click();
    assert.equal(await page.locator('#manager-panel').isVisible(),true);
    assert.equal(await page.locator('.shop-floor').isVisible(),false);
    assert.equal(await page.locator('#witch-hints').isVisible(),false);
    assert.equal(await page.locator('#manager-subtitle').innerText(),'你現在是遊戲管理員');
    await page.locator('#manager-back').click();
    await page.waitForTimeout(5100);
    assert.equal(await page.locator('#manager-panel').isVisible(),false);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.locator('#manager-entry').click();
    await page.screenshot({path:path.join(output,'manager-intro.png')});
    await page.waitForFunction(()=>document.getElementById('manager-subtitle').textContent==='現在幫忙選出對的遊戲規則吧');
    await page.waitForFunction(()=>!document.getElementById('manager-quiz').hidden);
    for (const [index,q] of M.questions.entries()) {
      assert.equal(await page.locator('#manager-question').innerText(),q.title);
      assert.equal(await page.locator('[data-choice]').count(),q.choices.length);
      if(index===8) assert.deepEqual(await page.locator('.manager-math-lines').allTextContents(),['x+y=5','x=3 或是 y=2','x=3 且 y=2']);
      if(index===9) {
        assert.deepEqual(await page.locator('[data-choice="2"] .manager-math-lines span').allTextContents(),['X + Y = 5','X − Y = 1']);
        assert.ok((await page.locator('#manager-scene').boundingBox()).y<(await page.locator('#manager-question').boundingBox()).y);
      }
      await page.locator(`[data-choice="${(q.answer+1)%q.choices.length}"]`).click();
      assert.equal(await page.locator('#manager-feedback').innerText(),'再想一想！');
      assert.equal((await saved()).manager.answered,index);
      for(const width of [320,390,945,1365]) {
        await page.setViewportSize({width,height:1000});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      }
      await page.locator('#manager-panel').screenshot({path:path.join(output,`manager-question-${index+1}.png`)});
      await page.locator(`[data-choice="${q.answer}"]`).click();
      assert.equal((await saved()).manager.answered,index+1);
      assert.equal(await page.locator('[data-choice]:disabled').count(),q.choices.length);
      if(index===0) {
        await page.reload();
        assert.equal((await saved()).manager.answered,1);
        await page.locator('#manager-entry').click();
      }
      if(index<M.questions.length-1) await page.waitForFunction(title=>document.getElementById('manager-question').textContent===title,M.questions[index+1].title);
      else await page.waitForFunction(()=>!document.getElementById('manager-finish').hidden);
    }
    assert.equal(await page.locator('#manager-entry-status').innerText(),'✓ 已完成');
    await page.locator('#manager-replay').click();
    assert.equal(await page.locator('#manager-question').innerText(),M.questions[0].title);
    await page.locator('[data-level="9"]').click();
    assert.equal(await page.locator('#manager-panel').isVisible(),false);
    assert.equal(await page.locator('.shop-floor').isVisible(),true);
    await page.reload();
    assert.equal(await page.locator('#manager-entry-status').innerText(),'✓ 已完成');
    checks.push('十關解鎖管理員、兩段開場字幕、離開取消動畫、十題答錯重選與答對換題、答題存檔及重玩、四種寬度');
    await page.locator('[data-level="0"]').click();
    assert.equal(await page.locator('#order-complete').isVisible(),true);
    assert.equal(await page.locator('#cup-contents-0').innerText(),'空杯');
    assert.equal(await page.locator('#pot-contents').innerText(),'空鍋');
    await page.reload();
    assert.equal((await saved()).completed.length,G.levels.length);
    assert.equal(await page.locator('#orders .tab-done').count(),10);
    checks.push('完成後切關、重載保留十關通關標記，重進關卡從空杯空鍋開始');
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.locator('[data-level="0"]').click();await page.locator('#reset').click();
    await action(['fill',0,0]);await page.locator('#undo').click();assert.equal(await page.locator('#cup-contents-0').innerText(),'空杯');
    await page.locator('[data-ingredient="1"]').click();await page.locator('#cup-1').click();
    await page.locator('[data-level="1"]').click();await page.waitForTimeout(650);
    assert.equal(await page.locator('#pour-flight').isVisible(),false);
    assert.equal(await page.locator('#cup-0').isEnabled(),true);
    await page.locator('[data-level="0"]').click();
    assert.equal(await page.locator('#cup-contents-1').innerText(),'空杯');
    assert.equal(await page.locator('#pot-contents').innerText(),'空鍋');
    assert.equal(await page.locator('#undo').isDisabled(),true);
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
