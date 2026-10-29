const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const G=require('../core.js'),{playLevel}=require('./play-level.cjs');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[],held=new Set(),keys=[['a','d','w'],['ArrowLeft','ArrowRight','ArrowUp']];
 const base=process.env.TOGETHER_URL||'http://127.0.0.1:18128/?level=1',output=path.join(__dirname,'../test-output');fs.mkdirSync(output,{recursive:true});
 page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:new Date('2026-10-29T00:00:00Z')});await page.clock.pauseAt(new Date('2026-10-29T00:00:01Z'));
 await page.goto(base);await page.evaluate(keys=>localStorage.setItem('together-home-curated-v4',JSON.stringify(keys)),G.levels.previous.map(l=>l.saveKey));await page.reload();
 assert.equal(await page.locator('#levels option').count(),21);assert.equal(await page.locator('#levels option').filter({hasText:'✓'}).count(),15);assert.equal(await page.locator('#finale').isVisible(),false);
 const read=()=>page.evaluate(()=>readGame());
 async function release(){for(const key of held)await page.keyboard.up(key);held.clear();}
 async function tick(n,commands){
  const wanted=new Set();commands.forEach((c,i)=>{if(c.axis)wanted.add(keys[i][c.axis>0?1:0]);if(c.jump)wanted.add(keys[i][2]);});
  for(const key of [...held])if(!wanted.has(key)){await page.keyboard.up(key);held.delete(key);}
  for(const key of wanted)if(!held.has(key)){await page.keyboard.down(key);held.add(key);}
  await page.clock.runFor(Math.round(n*1000/120));
  for(const key of ['w','ArrowUp'])if(held.has(key)){await page.keyboard.up(key);held.delete(key);}
 }
 for(const l of G.levels.filter(l=>l.puzzle)){
  await release();await page.selectOption('#levels',String(l.id));assert.ok(await page.locator('#message').isVisible());
  await page.screenshot({path:path.join(output,`campaign-${l.id+1}-start.png`)});
  await playLevel({read,tick,mark:async stage=>page.screenshot({path:path.join(output,`campaign-${l.id+1}-${stage}.png`)})},l);await release();
  const s=await read();assert.ok(s.won&&s.players.every(p=>p.exited));console.log(`第 ${l.id+1} 關 ${l.name}：真實鍵盤通關`);
 }
 assert.ok(await page.locator('#finale').isVisible());await page.locator('#finale-close').click();
 await page.reload();assert.equal(await page.locator('#levels option').filter({hasText:'✓'}).count(),20);
 for(const width of [1280,375,320]){
  await page.setViewportSize({width,height:1000});for(const id of [15,16,17,18,19]){await page.selectOption('#levels',String(id));await page.screenshot({path:path.join(output,`campaign-${id+1}-${width}.png`),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 }
 assert.deepEqual(errors,[]);console.log('新關卡實際鍵盤、15 關舊存檔對應、20 關全破與版面檢查通過。');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
