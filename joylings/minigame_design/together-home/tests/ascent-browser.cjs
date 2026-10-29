const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),assert=require('node:assert/strict'),path=require('node:path'),G=require('../core.js'),{playAscent}=require('./play-ascent.cjs');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install({time:new Date('2026-10-29T00:00:00Z')});await page.clock.pauseAt(new Date('2026-10-29T00:00:01Z'));
 const url=process.env.TOGETHER_URL||'http://127.0.0.1:18128/';await page.goto(new URL('?preview=ascent&tip=true',url).href);
 const read=()=>page.evaluate(()=>readGame()),held=new Set(),keys=[['a','d','w'],['ArrowLeft','ArrowRight','ArrowUp']];
 async function release(){for(const k of held)await page.keyboard.up(k);held.clear();}
 async function tick(n,a){
  const desired=new Set();a.forEach((c,i)=>{if(c.axis)desired.add(keys[i][c.axis>0?1:0]);if(c.jump)desired.add(keys[i][2]);});
  for(const k of [...held])if(!desired.has(k)){await page.keyboard.up(k);held.delete(k);}for(const k of desired)if(!held.has(k)){await page.keyboard.down(k);held.add(k);}
  await page.clock.runFor(Math.round(n*1000/120));for(const k of [keys[0][2],keys[1][2]])if(held.has(k)){await page.keyboard.up(k);held.delete(k);}
 }
 const l=G.levels.find(l=>l.preview==='ascent');assert.equal((await read()).level,l.id);assert.equal(await page.locator('#levels option').count(),20);
 assert.equal(await page.locator('.special-action:visible').count(),0);assert.equal(await page.locator('[data-trial=ball],[data-trial=bubbles]').count(),0);
 assert.ok(await page.locator('#answer-panel').isVisible());assert.equal(await page.locator('#answer-steps li').count(),8);await page.locator('#answer-toggle').click();
 const initialView=await page.evaluate(()=>readCamera());await page.screenshot({path:path.join(__dirname,'../test-output/ascent-start.png'),fullPage:true});
 await tick(500,[{axis:1},{}]);assert.ok((await read()).failed);assert.equal(await page.evaluate(()=>localStorage.getItem('together-home-curated-v4')),null);
 await release();await page.locator('#retry').click();assert.deepEqual(await page.evaluate(()=>readCamera()),initialView);
 await playAscent({read,tick,mark:async name=>{
  const s=await read(),view=await page.evaluate(()=>readCamera());assert.ok(view.x>0);if(['lifts','summit'].includes(name))assert.ok(view.y< -300);
  for(const p of s.players){assert.ok(p.x>=view.x&&p.x+38<=view.x+view.w);assert.ok(p.y>=view.y&&p.y+44<=view.y+view.h);}
  await page.screenshot({path:path.join(__dirname,`../test-output/ascent-${name}.png`),fullPage:true});console.log(`Ascent ${name}: keyboard passed, camera ${Math.round(view.x)},${Math.round(view.y)}`);
 }},l);
 assert.ok((await read()).won);assert.equal(await page.locator('#success').isVisible(),true);assert.equal(await page.locator('.key-slot.collected').count(),2);
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('together-home-curated-v4'))),[l.saveKey]);
 await release();await page.locator('#restart').click();assert.deepEqual(await page.evaluate(()=>readCamera()),initialView);assert.deepEqual((await read()).collected,[false,false]);
 for(const width of [375,320]){await page.setViewportSize({width,height:900});if(!(await page.locator('#answer-panel').isVisible()))await page.locator('#answer-toggle').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(__dirname,`../test-output/ascent-mobile-${width}.png`),fullPage:true});await page.locator('#answer-toggle').click();}
 for(const removed of ['ball','bubbles']){await page.goto(new URL(`?preview=${removed}`,url).href);assert.equal((await read()).level,0);}
 assert.deepEqual(errors,[]);console.log('Large scrolling challenge: full keyboard win, cameras, mandatory cooperation, failure, retry, saves and mobile passed.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
