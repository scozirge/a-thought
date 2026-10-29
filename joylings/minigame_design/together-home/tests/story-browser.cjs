const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const G=require('../core.js'),warmup=require('../warmup.js'),codes=['a','d','w','s','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'];
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[],base=process.env.TOGETHER_URL||'http://127.0.0.1:18128/',output=path.join(__dirname,'../test-output');fs.mkdirSync(output,{recursive:true});page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install({time:new Date('2026-10-29T00:00:00Z')});await page.clock.pauseAt(new Date('2026-10-29T00:00:01Z'));
 const read=()=>page.evaluate(()=>readGame()),story=()=>page.evaluate(()=>readStory()),save=()=>page.evaluate(()=>localStorage.getItem('together-home-curated-v4'));
 async function go(query=''){await page.goto(new URL(query,base).href);await page.addStyleTag({content:'button{transition:none!important}'});}
 await go();assert.equal(await page.locator('#intro').evaluate(d=>d.matches(':modal')),true);assert.equal((await story()).phase,'ready');assert.equal((await read()).level,-1);assert.equal(await page.locator('#levels option').count(),21);
 const frozen=await read();await page.keyboard.down('d');await page.keyboard.down('ArrowRight');await page.clock.runFor(600);await page.keyboard.up('d');await page.keyboard.up('ArrowRight');assert.deepEqual(await read(),frozen,'開場等待時角色不動');
 await page.screenshot({path:path.join(output,'story-ready.png'),fullPage:true});
 await page.locator('#intro-start').click();await page.clock.runFor(2600);assert.equal(await page.locator('#intro-line').innerText(),'咦？你也要回家嗎？');
 await page.screenshot({path:path.join(output,'story-meeting.png'),fullPage:true});
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));const paused=await story();await page.clock.runFor(3000);assert.equal((await story()).elapsed,paused.elapsed,'離開視窗時對話暫停');
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.clock.runFor(3000);assert.equal(await page.locator('#intro-line').innerText(),'對呀！我們一起走吧！');
 await page.clock.runFor(3000);assert.equal(await page.locator('#intro-line').innerText(),'路上互相幫忙，一起回家！');
 await page.clock.runFor(5200);assert.equal((await story()).phase,'game');assert.equal(await page.locator('#intro').evaluate(d=>d.open),false);assert.equal((await read()).level,-1);assert.equal(await page.locator('#game').evaluate(c=>c===document.activeElement),true);
 assert.equal(await save(),null);assert.equal(await page.locator('#message').innerText(),warmup.level.hint);await page.screenshot({path:path.join(output,'story-warmup.png'),fullPage:true});
 // Real keyboard events only: pressure plate, jump for the key, then both go home.
 let held=0;
 for(const [frames,mask] of warmup.tape.actions){for(let i=0;i<codes.length;i++){if((held&(1<<i))&&!(mask&(1<<i)))await page.keyboard.up(codes[i]);if(!(held&(1<<i))&&(mask&(1<<i)))await page.keyboard.down(codes[i]);}held=mask;await page.clock.runFor(Math.round(frames*1000/120));}
 await page.clock.runFor(200);for(let i=0;i<codes.length;i++)if(held&(1<<i))await page.keyboard.up(codes[i]);
 assert.equal((await read()).won,true,'暖身可以用正常鍵盤過關');assert.ok((await read()).players.every(p=>p.exited));assert.equal(await save(),null,'暖身不計入正式存檔');assert.equal(await page.locator('#win-title').innerText(),'暖身完成，出發囉！');
 assert.equal(await page.locator('#finale').evaluate(d=>d.open),false);await page.locator('#next').click();assert.equal((await read()).level,0);assert.ok(G.levels[0].jumpSwap);assert.ok(await page.locator('.controls').evaluate(c=>c.classList.contains('special-controls')));
 await go();await page.locator('#intro-start').click();await page.clock.runFor(300);await page.locator('#intro-skip').click();assert.equal((await read()).level,-1);assert.equal((await story()).phase,'game');
 await go();await page.keyboard.press('Escape');assert.equal((await story()).phase,'game');assert.equal((await read()).level,-1);
 await go('?level=0&tip=true');assert.equal(await page.locator('#intro').evaluate(d=>d.open),false);assert.equal(await page.locator('#answer-steps li').count(),3);await page.locator('#solution-play').click();await page.clock.runFor(5000);assert.equal((await read()).won,true);assert.equal(await save(),null);assert.equal(await page.locator('#finale').evaluate(d=>d.open),false);await page.locator('#solution-stop').click();assert.equal((await read()).won,false);
 await page.evaluate(keys=>localStorage.setItem('together-home-curated-v4',JSON.stringify(keys)),G.levels.map(l=>l.saveKey));
 for(const reduced of [false,true]){
  await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});await go('?level=1');assert.equal(await page.locator('#watch-ending').isVisible(),true);await page.locator('#watch-ending').click();assert.equal((await story()).phase,'ending');const before=await read(),picture=await page.locator('#finale-art').evaluate(c=>c.toDataURL());
  await page.clock.runFor(8000);assert.deepEqual(await read(),before);assert.equal(await page.locator('#finale-title').innerText(),'團結就是力量！');assert.equal(await page.locator('#finale-message').innerText(),'我們在一起的時候是最棒的！');const after=await page.locator('#finale-art').evaluate(c=>c.toDataURL());if(reduced)assert.ok(after===picture,'減少動態時終幕完全靜止');else assert.ok(after!==picture,'回家動畫有走動');
  await page.screenshot({path:path.join(output,`story-ending-${reduced?'reduced':'desktop'}.png`),fullPage:true});await page.locator('#finale-close').click();await page.clock.runFor(32);assert.equal(await page.locator('#game').evaluate(c=>c===document.activeElement),true);
  await page.locator('#watch-ending').click();assert.equal((await story()).elapsed,0,'再次播放從頭開始');await page.keyboard.press('Escape');await page.clock.runFor(32);
 }
 for(const width of [375,320]){
  await page.setViewportSize({width,height:740});await go();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await page.locator('#intro-start').isVisible());assert.ok(await page.locator('.speech-bubble').first().evaluate(n=>parseFloat(getComputedStyle(n).fontSize)>=18));
  await page.screenshot({path:path.join(output,`story-intro-${width}.png`),fullPage:true});await page.locator('#intro-start').click();await page.clock.runFor(8500);assert.equal(await page.locator('#intro-line').innerText(),'路上互相幫忙，一起回家！');await page.locator('#intro-skip').click();
  await page.locator('#watch-ending').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await page.locator('#finale-message').isVisible());await page.screenshot({path:path.join(output,`story-ending-${width}.png`),fullPage:true});
 }
 assert.deepEqual(errors,[]);console.log('Story start, three dialogues, pause/resume, skip/Escape, real-keyboard warmup, next level, demo/save isolation, replay ending, reduced motion and 320/375 px layouts passed.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
