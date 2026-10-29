const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),G=require('../core.js'),{playLevel}=require('./play-level.cjs');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.clock.install({time:new Date('2026-10-29T00:00:00Z')});await page.clock.pauseAt(new Date('2026-10-29T00:00:01Z'));
 // Observe rendered labels without changing any draw call or gameplay state.
 await page.addInitScript(()=>{
  const clear=CanvasRenderingContext2D.prototype.clearRect,fill=CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.clearRect=function(...args){if(this.canvas.id==='game')window.renderedLabels=[];return clear.apply(this,args);};
  CanvasRenderingContext2D.prototype.fillText=function(...args){if(this.canvas.id==='game')window.renderedLabels.push(String(args[0]));return fill.apply(this,args);};
 });
 const base=process.env.TOGETHER_URL||'http://127.0.0.1:18128/?level=1',output=path.join(__dirname,'../test-output');fs.mkdirSync(output,{recursive:true});
 const read=()=>page.evaluate(()=>readGame()),held=new Set(),keys=[['a','d','w'],['ArrowLeft','ArrowRight','ArrowUp']];
 async function tick(n,a){
  const want=new Set();a.forEach((c,i)=>{if(c.axis)want.add(keys[i][c.axis>0?1:0]);if(c.jump)want.add(keys[i][2]);});
  for(const k of [...held])if(!want.has(k)){await page.keyboard.up(k);held.delete(k);}for(const k of want)if(!held.has(k)){await page.keyboard.down(k);held.add(k);}
  await page.clock.runFor(Math.round(n*1000/120));for(const k of [keys[0][2],keys[1][2]])if(held.has(k)){await page.keyboard.up(k);held.delete(k);}
 }
 for(const tips of [false,true]){
  const url=new URL(base);if(tips)url.searchParams.set('tip','true');await page.goto(url.href);
  for(const l of G.levels){
   await page.selectOption('#levels',String(l.id));
   assert.equal(await page.locator('#message').isVisible(),tips||!!l.puzzle,`第 ${l.id+1} 關提示`);
   assert.equal(await page.locator('.answer-section').isVisible(),tips);assert.equal(await page.locator('#answer-panel').isVisible(),tips);
   assert.equal(await page.locator('#levels option').count(),21);assert.equal((await read()).won,false);
   const labels=await page.evaluate(()=>window.renderedLabels),numbers=labels.filter(t=>/^\d+(?:\s[☀☾])?$/.test(t));
   assert.ok(!labels.some(t=>/undefined|NaN|\bnull\b/.test(t)),`第 ${l.id+1} 關沒有未定義標籤`);
   if(tips){assert.ok(await page.locator('#answer-steps li').count()>=3);if(l.gates.some(g=>g.number)||l.lifts.length>1)assert.ok(numbers.length>0,`第 ${l.id+1} 關教學編號`);}
   else{assert.equal(await page.locator('#answer-steps li').count(),0);assert.deepEqual(numbers,[],`第 ${l.id+1} 關一般版不畫編號`);assert.ok(!labels.some(t=>/[①②③④⑤⑥]/.test(t)));assert.equal(await page.locator('#message').textContent(),l.puzzle?l.hint:'');}
   assert.equal(await page.locator('#mode-status').isVisible(),!!(l.phaseOnJump||l.switches?.length));
  }
  if(tips)assert.equal(await page.locator('#message').innerText(),G.levels.at(-1).hint);
  for(const width of [1280,375,320]){
   await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:path.join(output,`tutorial-${tips?'on':'off'}-${width}.png`),fullPage:true});
  }
  await page.setViewportSize({width:1280,height:900});await page.selectOption('#levels','0');
  if(tips){await page.locator('#answer-toggle').evaluate(button=>button.click());assert.equal(await page.locator('#answer-panel').isVisible(),false);await page.locator('#restart').click();assert.equal(await page.locator('#answer-panel').isVisible(),true);}
  await playLevel({read,tick},G.levels[0]);await tick(0,[{},{}]);assert.ok((await read()).won);assert.ok((await read()).players.every(p=>p.exited));
  assert.equal(await page.locator('.key-slot.collected').count(),G.levels[0].keys.length);await page.locator('#next').click();assert.equal((await read()).level,1);assert.equal(await page.locator('.answer-section').isVisible(),tips);
 }
 for(const query of ['?tip','?tip=false','?tip=1','?tip=TRUE']){await page.goto(new URL(query+'&level=1',base).href);assert.equal(await page.locator('.answer-section').isVisible(),false);assert.equal(await page.locator('#message').isVisible(),false);}
 await page.goto(new URL('?level=20&tip=true',base).href);assert.equal((await read()).level,19);assert.ok(await page.locator('#answer-panel').isVisible());
 await page.goto(new URL('?preview=gravity&tip=true',base).href);assert.equal((await read()).level,G.levels.findIndex(l=>l.preview==='gravity'));assert.ok(await page.locator('#answer-panel').isVisible());
 assert.deepEqual(errors,[]);console.log('All 20 normal/teacher views, canvas numbering, hints, solutions, real keyboard wins, saves, query flags and mobile layouts passed.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
