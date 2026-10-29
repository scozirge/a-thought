const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install({time:new Date('2026-10-29T00:00:00Z')});await page.clock.pauseAt(new Date('2026-10-29T00:00:01Z'));
 const url=process.env.TOGETHER_URL||'http://127.0.0.1:18128/',read=()=>page.evaluate(()=>readGame());
 await page.goto(new URL('?preview=gravity',url).href);
 await page.keyboard.down('s');await page.clock.runFor(1400);assert.deepEqual((await read()).gravity,[1,-1],'長按只翻一次');await page.keyboard.up('s');
 assert.match(await page.locator('#mechanic-status').innerText(),/貓 ↓ · 狗 ↑/);
 await page.screenshot({path:path.join(__dirname,'../test-output/gravity-in-play.png'),fullPage:true});
 await page.locator('[data-player="1"] [data-action=special]').click();await page.clock.runFor(1000);assert.deepEqual((await read()).gravity,[-1,-1],'狗狗觸控翻貓咪');
 await page.locator('#restart').click();await page.keyboard.down('s');await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.clock.runFor(100);await page.keyboard.up('s');assert.deepEqual((await read()).gravity,[1,1],'失焦清除未觸發動作');
 for(const name of ['balance','ascent']){
  await page.goto(new URL(`?preview=${name}&tip=true`,url).href);await page.clock.runFor(100);
  assert.equal(await page.locator('.special-action:visible').count(),0);
  assert.equal(await page.locator('[data-trial],[data-campaign],#levels optgroup').count(),0);
  const before=await read();await page.keyboard.press('s');await page.keyboard.press('ArrowDown');await page.keyboard.press('e');await page.keyboard.press('Enter');await page.clock.runFor(100);
  const after=await read();assert.deepEqual(after.players.map(p=>[p.w,p.h]),[[38,44],[38,44]]);assert.deepEqual(after.balances,before.balances);
  assert.ok(await page.locator('#answer-panel').isVisible());assert.ok(await page.locator('#answer-steps li').count()>=4);await page.locator('#answer-toggle').click();
 }
 await page.goto(new URL('?preview=ice',url).href);assert.equal(await page.locator('.special-action:visible').count(),0);
 await page.keyboard.down('a');await page.clock.runFor(300);await page.keyboard.up('a');const ice=await read();
 await page.keyboard.press('ArrowDown');await page.clock.runFor(50);assert.ok((await read()).players[0].vx< -100);assert.ok((await read()).players[0].x<ice.players[0].x);
 await page.keyboard.down('d');await page.clock.runFor(180);await page.keyboard.up('d');assert.ok(Math.abs((await read()).players[0].vx)<100);
 await page.screenshot({path:path.join(__dirname,'../test-output/ice-directions-only.png'),fullPage:true});
 // Match the user's heavy-crate screenshot using only the starting keyboard controls.
 await page.goto(new URL('?level=10',url).href);await page.clock.runFor(100);
 await page.keyboard.down('d');await page.keyboard.down('ArrowRight');await page.clock.runFor(100);
 assert.equal((await read()).boxes[0].x,120,'後排還沒碰到前排，不能隔空推重箱');
 await page.clock.runFor(400);await page.keyboard.up('d');await page.keyboard.up('ArrowRight');
 let pushed=await read();assert.ok(pushed.boxes[0].x>140);assert.ok(pushed.players[1].x-pushed.players[0].x-38<=3);
 await page.screenshot({path:path.join(__dirname,'../test-output/push-together-fixed.png'),fullPage:true});
 await page.goto(new URL('?level=11',url).href);
 const save=await page.evaluate(()=>localStorage.getItem('together-home-curated-v4'));
 await page.clock.runFor(100);await page.keyboard.down('d');
 for(let i=0;i<60&&(await read()).players[0].x<176;i++)await page.clock.runFor(10);
 await page.keyboard.press('w');await page.clock.runFor(570);await page.keyboard.up('d');
 const landing=await read();assert.equal(landing.failed,false);assert.equal(landing.collected[0],true);
 assert.equal(await page.locator('.key-slot').count(),2);assert.equal(await page.locator('.key-slot.collected').count(),1);
 await page.screenshot({path:path.join(__dirname,'../test-output/ice-key-without-brake.png'),fullPage:true});
 await page.clock.runFor(1400);
 assert.equal((await read()).failed,true);assert.equal((await read()).fallen,0);assert.equal((await read()).won,false);
 assert.equal(await page.locator('#failure').isVisible(),true);assert.equal(await page.locator('#success').isVisible(),false);
 assert.match(await page.locator('#fail-title').innerText(),/貓咪掉出去了/);
 const failed=await read();await page.clock.runFor(600);assert.deepEqual(await read(),failed);
 assert.equal(await page.evaluate(()=>localStorage.getItem('together-home-curated-v4')),save,'失敗不寫完成紀錄');
 await page.screenshot({path:path.join(__dirname,'../test-output/ice-failure.png'),fullPage:true});
 await page.locator('#retry').click();assert.equal((await read()).failed,false);assert.equal((await read()).level,10);assert.ok((await read()).collected.every(v=>!v));
 for(const retryKey of ['Enter','r']){
  await page.keyboard.down('d');await page.clock.runFor(2500);await page.keyboard.up('d');assert.equal((await read()).failed,true);
  await page.keyboard.press(retryKey);await page.clock.runFor(20);assert.equal((await read()).failed,false);assert.equal((await read()).level,10);
 }
 for(const level of [6,7,11,13,18,19,20])for(const width of [1280,375,320]){
  await page.goto(new URL(`?level=${level}`,url).href);await page.setViewportSize({width,height:900});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.ok(await page.locator('.pad button:visible').evaluateAll(buttons=>buttons.every(b=>[...b.children].every(span=>{const r=span.getBoundingClientRect(),p=b.getBoundingClientRect();return r.left>=p.left-1&&r.right<=p.right+1;}))),`${level}/${width} 按鈕文字不溢出`);
  await page.screenshot({path:path.join(__dirname,`../test-output/mixed-${level}-${width}.png`),fullPage:true});
 }
 for(const removed of ['sync','pilot','spring','portal','charge','echo','magnet','relay','freeze','size','ball','bubbles']){await page.goto(new URL(`?preview=${removed}`,url).href);assert.equal((await read()).level,0);}
 assert.deepEqual(errors,[]);console.log('Retained trials, removed ball and bubbles, quick selection, ice direction controls, retry, saves and mobile layouts passed.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
