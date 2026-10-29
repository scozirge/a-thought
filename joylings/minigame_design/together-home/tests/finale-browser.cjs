const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),assert=require('node:assert/strict'),path=require('node:path'),G=require('../core.js'),{playLevel}=require('./play-level.cjs');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install({time:new Date('2026-10-29T00:00:00Z')});await page.clock.pauseAt(new Date('2026-10-29T00:00:01Z'));
 await page.goto(process.env.TOGETHER_URL||'http://127.0.0.1:18128/');
 const read=()=>page.evaluate(()=>readGame()),held=new Set(),keys=[['a','d','w'],['ArrowLeft','ArrowRight','ArrowUp']];
 async function tick(n,a){
  const want=new Set();a.forEach((c,i)=>{if(c.axis)want.add(keys[i][c.axis>0?1:0]);if(c.jump)want.add(keys[i][2]);});
  for(const k of [...held])if(!want.has(k)){await page.keyboard.up(k);held.delete(k);}for(const k of want)if(!held.has(k)){await page.keyboard.down(k);held.add(k);}
  await page.clock.runFor(Math.round(n*1000/120));for(const k of [keys[0][2],keys[1][2]])if(held.has(k)){await page.keyboard.up(k);held.delete(k);}
 }
 // Isolated save fixtures test completion order; gameplay still uses only keys.
 for(const reduced of [false,true]){
  await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
  const saved=G.levels.slice(1).map(l=>l.saveKey);
  await page.evaluate(saved=>localStorage.setItem('together-home-curated-v4',JSON.stringify([...saved,saved[0],'removed-level'])),saved);await page.reload();
  assert.equal(await page.locator('#finale').evaluate(d=>d.open),false,'重複／過期存檔不能算第二十關');
  assert.equal(await page.locator('#levels option').filter({hasText:'✓'}).count(),19);
  await playLevel({read,tick},G.levels[0]);await tick(0,[{},{}]);
  assert.equal(await page.locator('#finale').evaluate(d=>d.matches(':modal')),true,'最後補第一關也會全破');
  assert.equal(await page.locator('#finale-title').innerText(),'你們是最佳拍檔！');
  const before=await read(),art=await page.locator('#finale-art').evaluate(c=>c.toDataURL());
  await page.keyboard.press('r');await page.keyboard.press('w');await page.keyboard.press('ArrowUp');await page.clock.runFor(3200);
  assert.deepEqual(await read(),before,'舞台開啟時遊戲不接收操作');
  const after=await page.locator('#finale-art').evaluate(c=>c.toDataURL());
  if(reduced)assert.equal(after,art,'減少動態偏好呈現靜態終幕');else assert.notEqual(after,art,'入場動畫有走動');
  await page.screenshot({path:path.join(__dirname,`../test-output/finale-${reduced?'reduced':'stage'}.png`),fullPage:true});
  if(reduced)await page.keyboard.press('Escape');else await page.locator('#finale-close').click();
  assert.equal(await page.locator('#finale').evaluate(d=>d.open),false);assert.equal(await page.locator('#game').evaluate(c=>c===document.activeElement),true);
  await page.locator('#next').click();assert.equal((await read()).level,1);assert.equal((await read()).won,false);
 }
 assert.deepEqual(errors,[]);console.log('All-clear order, invalid saves, stage animation, reduced motion, modal keys and focus passed.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
