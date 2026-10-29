const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const G = require('../core.js'), Input = require('../input.js'), solutions = require('../solutions.js');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } }), errors = [], proof = [];
    page.on('pageerror', e => errors.push(e.message));
    const base = process.env.TOGETHER_URL || 'http://127.0.0.1:18128/', progressKey = 'together-home-curated-v4';
    const output = path.join(__dirname, '../test-output'); fs.mkdirSync(output, { recursive: true });
    const progress=path.join(output,'replay-progress.txt');fs.writeFileSync(progress,'');
    const log=message=>{console.log(message);fs.appendFileSync(progress,message+'\n');};
    // Avoid waiting on CSS transitions while Playwright's clock is paused.
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.clock.install({ time: new Date('2026-10-29T00:00:00Z') });
    await page.clock.pauseAt(new Date('2026-10-29T00:00:01Z'));
    // Observe every ordinary physics input; do not replace results or game state.
    await page.addInitScript(() => {
      Object.defineProperty(window, 'Together', { configurable: true, set(game) {
        Object.defineProperty(window, 'Together', { value: game, configurable: true });
        const step = game.step; window.observedInputs = [];
        game.step = (state, inputs, dt) => { window.observedInputs.push(inputs); return step(state, inputs, dt); };
      } });
    });
    const read = () => page.evaluate(() => readGame());
    await page.goto(base); log('已載入一般版');assert.equal(await page.locator('#solution-controls').isVisible(), false);
    await page.evaluate(() => document.getElementById('solution-play').click());
    await page.clock.runFor(200); assert.equal((await read()).players[0].x, G.fresh().players[0].x);
    const teacher = new URL(base); teacher.searchParams.set('tip', 'true'); await page.goto(teacher.href);log('已載入老師版');
    await page.evaluate(([key, value]) => localStorage.setItem(key, value), [progressKey, JSON.stringify([G.levels[0].saveKey])]);
    const originalSave = await page.evaluate(key => localStorage.getItem(key), progressKey);
    for (const l of G.levels) {
      log(`驗證第 ${l.id + 1} 關播放：${l.name}`);
      await page.selectOption('#levels', String(l.id));
      await page.locator('#solution-play').click();
      await page.evaluate(() => { window.observedInputs = []; });
      // Pause with a jump/flip key held, then restore it without a second pulse.
      const tape = solutions.levels[l.saveKey];
      if (l.id === 3 || l.id === 19) {
        await page.clock.runFor(32); await page.locator('#solution-play').click();
        const paused = await read(); await page.clock.runFor(5000); assert.deepEqual(await read(), paused);
        assert.equal(await page.locator('.pressed').count(), 0);
        await page.keyboard.press('ArrowUp'); await page.keyboard.press('s');
        await page.clock.runFor(100); assert.deepEqual(await read(), paused);
        await page.locator('#solution-play').click();
      }
      if (l.id === 0) {
        await page.clock.runFor(200); assert.ok(await page.locator('.pressed').count() > 0);
        // Folding written tips must not release replay inputs.
        // Fold the off-screen answer without waiting for a smooth scroll while
        // the virtual clock is paused. This still invokes the real UI handler.
        await page.locator('#answer-toggle').evaluate(button => button.click());
        await page.locator('#answer-toggle').evaluate(button => button.click());
      }
      await page.clock.runFor(Math.ceil(tape.frames * 1000 / 120) + 200);
      const state = await read(), observed = await page.evaluate(() => window.observedInputs);
      assert.ok(state.won, `第 ${l.id + 1} 關自動解題通關`); assert.ok(!state.failed);
      assert.equal(observed.length, tape.frames, '每一物理步使用一筆按鍵');
      const keyboard = Input.create(); let oracle = G.fresh(l.id), frame = 0;
      for (const [n, bits] of tape.actions) for (let i = 0; i < n; i++) {
        keyboard.setMask(bits); const expected = keyboard.read(); keyboard.consume();
        assert.deepEqual(observed[frame++], expected, `第 ${l.id + 1} 關按鍵順序`);
        oracle = G.step(oracle, expected);
      }
      assert.deepEqual(state, JSON.parse(JSON.stringify(oracle)), '畫面結果與從起點只輸入按鍵的結果相同');
      assert.equal(await page.evaluate(key => localStorage.getItem(key), progressKey), originalSave);
      assert.equal(await page.locator('#finale').isVisible(), false);
      assert.match(await page.locator('#win-title').innerText(), /示範完成/);
      assert.equal(await page.locator('.pressed').count(), 0);
      proof.push({ level: l.id + 1, frames: observed.length, seconds: tape.frames / 120, won: state.won, collected: state.collected, exited: state.players.map(p => p.exited) });
      await page.screenshot({ path: path.join(output, `solution-win-${l.id + 1}.png`) });
      log(`第 ${l.id + 1} 關：播放按鈕通關，${observed.length} 步全部符合一般按鍵物理結果`);
    }
    // Replay from victory; stop/reset/switch never leave stuck inputs or write saves.
    await page.locator('#solution-play').click(); await page.clock.runFor(400);
    await page.locator('#solution-stop').click(); assert.equal((await read()).won, false);
    assert.deepEqual((await read()).players, G.fresh(19).players); assert.equal(await page.locator('.pressed').count(), 0);
    await page.locator('#solution-play').click(); await page.clock.runFor(200);
    await page.selectOption('#levels', '3'); assert.equal(await page.locator('#solution-stop').isVisible(), false);
    await page.locator('#solution-play').click(); await page.clock.runFor(300);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    const blurred = await read(); await page.clock.runFor(2000); assert.deepEqual(await read(), blurred);
    assert.match(await page.locator('#solution-play').innerText(), /繼續播放/);
    await page.locator('#solution-play').click(); await page.clock.runFor(14000); assert.ok((await read()).won);
    await page.locator('#restart').click(); assert.equal(await page.locator('#solution-stop').isVisible(), false);
    await page.keyboard.down('ArrowRight'); await page.clock.runFor(200); await page.keyboard.up('ArrowRight');
    assert.ok((await read()).players[1].x > G.fresh(3).players[1].x, '停止後普通按鍵可操作');
    for (const width of [1280, 375, 320]) {
      await page.setViewportSize({ width, height: 1000 }); await page.locator('#solution-play').click(); await page.clock.runFor(1000);
      await page.locator('#solution-play').click(); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: path.join(output, `solution-controls-${width}.png`), fullPage: true });
      await page.locator('#solution-stop').click();
    }
    assert.equal(await page.evaluate(key => localStorage.getItem(key), progressKey), originalSave); assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, 'solutions-playthrough.json'), JSON.stringify(proof, null, 2));
    console.log('20 關瀏覽器解題、按鍵逐步比對、暫停／續播、停止／重來／選關、失焦、存檔隔離與手機版均通過。');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
