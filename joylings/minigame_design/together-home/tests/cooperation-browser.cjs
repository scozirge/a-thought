const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url'),G=require('../core.js'),{playLevel}=require('./play-level.cjs');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.clock.install({time:new Date('2026-10-29T00:00:00Z')});await page.clock.pauseAt(new Date('2026-10-29T00:00:01Z'));
 const url=process.env.TOGETHER_URL||pathToFileURL(path.resolve(__dirname,'../dist/h5/index.html')).href;
 await page.goto(url);const read=()=>page.evaluate(()=>readGame()),held=new Set();
 const keys=[['a','d','w','s'],['ArrowLeft','ArrowRight','ArrowUp','ArrowDown']];
 async function release(){for(const k of held)await page.keyboard.up(k);held.clear();}
 async function tick(n,commands){
  const wanted=new Set();commands.forEach((c,i)=>{if(c.axis)wanted.add(keys[i][c.axis>0?1:0]);if(c.jump)wanted.add(keys[i][2]);if(c.special)wanted.add(keys[i][3]);});
  for(const k of [...held])if(!wanted.has(k)){await page.keyboard.up(k);held.delete(k);}
  for(const k of wanted)if(!held.has(k)){await page.keyboard.down(k);held.add(k);}
  await page.clock.runFor(Math.round(n*1000/120));
  for(const k of [keys[0][2],keys[0][3],keys[1][2],keys[1][3]])if(held.has(k)){await page.keyboard.up(k);held.delete(k);}
 }
 const challenges=[G.levels.findIndex(l=>l.preview==='balance'),G.levels.findIndex(l=>l.coop==='moving-relay'&&!l.ascent),G.levels.findIndex(l=>l.preview==='ascent')];
 const levels=process.env.TOGETHER_LEVELS?process.env.TOGETHER_LEVELS.split(',').map(n=>Number(n)-1):challenges;
 for(const index of levels){
  await release();await page.selectOption('#levels',String(index));
  await page.screenshot({path:path.join(__dirname,`../test-output/cooperation-final-${index+1}.png`),fullPage:true});
  await playLevel({read,tick},G.levels[index]);assert.equal((await read()).won,true);assert.ok(await page.locator('#success').isVisible());
  console.log(`Offline keyboard level ${index+1} passed`);
 }
 const bridgeIndex=G.levels.findIndex(l=>l.preview==='bridge');
 await release();await page.selectOption('#levels',String(bridgeIndex));
 // A parked helper never opens the bridge. Running and jumping cannot bypass it.
 await tick(50,[{axis:1},{}]);await tick(180,[{axis:1,jump:true},{}]);
 assert.equal((await read()).won,false);assert.equal(G.gateOpen(await read(),0),false);assert.ok((await read()).players[0].x+38<=G.levels[bridgeIndex].gates[0].x);
 for(const index of challenges){
  await release();await page.selectOption('#levels',String(index));await page.setViewportSize({width:320,height:800});
  await page.screenshot({path:path.join(__dirname,`../test-output/cooperation-final-${index+1}-320.png`),fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 assert.deepEqual(errors,[]);console.log('Balance, final relay, large challenge and offline assets passed.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
