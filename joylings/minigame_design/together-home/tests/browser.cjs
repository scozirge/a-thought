const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),G=require('../core.js'),{playLevel}=require('./play-level.cjs');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.goto('http://127.0.0.1:18128/');
 const read=()=>page.evaluate(()=>readGame()),output=path.join(__dirname,'../test-output'),down=new Set();fs.mkdirSync(output,{recursive:true});
 const keys=[{left:'a',right:'d',jump:'w'},{left:'ArrowLeft',right:'ArrowRight',jump:'ArrowUp'}];
 async function release(){for(const k of down)await page.keyboard.up(k);down.clear();}
 async function tick(frames,commands){
  const wanted=new Set();commands.forEach((c,i)=>{if(c.axis)wanted.add(c.axis>0?keys[i].right:keys[i].left);if(c.jump)wanted.add(keys[i].jump);});
  for(const k of [...down])if(!wanted.has(k)){await page.keyboard.up(k);down.delete(k);}
  for(const k of wanted)if(!down.has(k)){await page.keyboard.down(k);down.add(k);}
  await page.clock.runFor(Math.round(frames*1000/120));
  for(const k of [keys[0].jump,keys[1].jump])if(down.has(k)){await page.keyboard.up(k);down.delete(k);}
 }
 assert.equal(await page.title(),'類pico park合作通關');
 assert.equal(await page.locator('#levels option').count(),10);
 // A single rabbit jumps over the untouched crate, walks off the blue pad,
 // and keeps running/jumping at the wall. No direct state setup is used.
 await page.selectOption('#levels','9');
 await tick(10,[{}, {axis:1}]);await tick(120,[{}, {axis:1,jump:true}]);
 await tick(240,[{}, {axis:1}]);await tick(120,[{}, {axis:1,jump:true}]);
 let regression=await read();assert.equal(regression.boxes[0].x,200);assert.equal(G.gateOpen(regression,0),false);assert.ok(regression.players[1].x+38<=G.levels[9].gates[0].x);
 console.log('Level 10 single-player wall exploit blocked via real keyboard.');
 for(const l of G.levels){
  await release();await page.selectOption('#levels',String(l.id));
  if([0,1,2,3,4,5,6,7,8,9].includes(l.id))await page.screenshot({path:path.join(output,`level-${l.id+1}.png`),fullPage:true});
  await playLevel({read,tick},l);assert.ok((await read()).won);assert.ok(await page.locator('#success').isVisible());console.log(`Browser level ${l.id+1} passed`);
 }
 await release();assert.deepEqual((await page.evaluate(()=>JSON.parse(localStorage.getItem('together-home-platform-v3')))).sort((a,b)=>a-b),[0,1,2,3,4,5,6,7,8,9]);
 await page.locator('#next').click();assert.equal((await read()).level,0);assert.equal((await read()).won,false);await page.reload();assert.equal(await page.locator('#levels option').filter({hasText:'✓'}).count(),10);
 await page.keyboard.down('w');await page.clock.runFor(1200);assert.ok((await read()).players[0].grounded,'no auto jump on hold');await page.keyboard.up('w');
 await page.keyboard.down('d');await page.keyboard.down('ArrowRight');await page.clock.runFor(200);let s=await read();assert.ok(s.players[0].x>180&&s.players[1].x>290);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));const x=(await read()).players[0].x;await page.clock.runFor(200);assert.equal((await read()).players[0].x,x);await page.keyboard.up('d');await page.keyboard.up('ArrowRight');
 await page.selectOption('#levels','9');await page.setViewportSize({width:375,height:800});await page.screenshot({path:path.join(output,'ten-levels-mobile.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const touch=page.locator('[data-player="0"] [data-action="right"]'),box=await touch.boundingBox();const before=(await read()).players[0].x;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.clock.runFor(200);await page.mouse.up();assert.ok((await read()).players[0].x>before);
 await page.setViewportSize({width:320,height:800});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('#restart').click();assert.equal((await read()).level,9);assert.ok((await read()).collected.every(v=>!v));assert.ok((await read()).latched.every(v=>!v));assert.deepEqual(errors,[]);
 console.log('Ten levels passed via real keyboard. Progress, next/replay, held keys, simultaneous controls, blur release, touch and 320/375px layouts passed.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
