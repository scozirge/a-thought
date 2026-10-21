const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/USER/AppData/Local/npm-cache/_npx/4c085717babbf4e0/node_modules/playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),G=require('../core.js'),{solve}=require('./solver.cjs');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),ctx=await browser.newContext({viewport:{width:1360,height:1100},reducedMotion:'reduce'}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));fs.mkdirSync('dist/qa',{recursive:true});await p.goto('http://127.0.0.1:18127/');
async function drag(i,to){const el=p.locator('[data-block="'+i+'"]');await el.scrollIntoViewIfNeeded();const box=await el.boundingBox(),info=await p.evaluate(i=>{const raw=JSON.parse(localStorage.getItem('wood-exit-v1')||'null');const s=raw?Wood.replay(raw.level,raw.actions):Wood.fresh();return {pos:s.pos[i],axis:Wood.levels[s.level].blocks[i].axis,cell:document.querySelector('#board').getBoundingClientRect().width/6};},i);const x=box.x+box.width/2,y=box.y+box.height/2,delta=(to-info.pos)*info.cell;await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x+(info.axis==='h'?delta:0),y+(info.axis==='v'?delta:0),{steps:8});await p.mouse.up();}
await p.screenshot({path:'dist/qa/first.png',fullPage:true});
await drag(0,0.1);assert.equal(await p.locator('#remaining').innerText(),'4');
await drag(0,6);assert.equal(await p.locator('#remaining').innerText(),'3'); // Clamps to the one free cell, never jumps the blocker.
assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('wood-exit-v1')).actions[0].to),1);
await p.locator('#reset').click();
const el=await p.locator('[data-block="1"]').boundingBox();await p.mouse.move(el.x+el.width/2,el.y+el.height/2);await p.mouse.down();await p.mouse.move(el.x+el.width/2,el.y+el.height/2+100);await p.keyboard.press('Escape');await p.mouse.up();assert.equal(await p.locator('#remaining').innerText(),'4');
for(const to of [3,4,3,4])await drag(1,to);assert.equal(await p.locator('#remaining').innerText(),'0');await drag(0,6);assert.equal(await p.locator('#win').evaluate(e=>e.open),false);assert.match(await p.locator('#status').innerText(),/步數用完/);await p.locator('#undo').click();assert.equal(await p.locator('#remaining').innerText(),'1');await p.locator('#reset').click();
// Releasing near the exit snaps out in the same move; stopping a cell short does not win.
await drag(1,3);await drag(0,3.4);assert.equal(await p.locator('#win').evaluate(e=>e.open),false);assert.equal(await p.locator('#remaining').innerText(),'2');
await p.locator('#reset').click();
for(const release of [3.6,3.9,4]){
 await drag(1,3);await drag(0,release);await p.locator('#win').waitFor({state:'visible'});
 assert.equal(await p.locator('#remaining').innerText(),'2');
 assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('wood-exit-v1')).actions.at(-1).to),6);
 await p.locator('#stay').click();await p.locator('#reset').click();
}
// Keyboard uses the same edge threshold, including the final allowed move.
await drag(1,3);await drag(0,2);await p.locator('[data-block="0"]').focus();
await p.keyboard.press('ArrowRight');assert.equal(await p.locator('#win').evaluate(e=>e.open),false);
await p.keyboard.press('ArrowRight');await p.locator('#win').waitFor({state:'visible'});
assert.equal(await p.locator('#remaining').innerText(),'0');await p.locator('#stay').click();await p.locator('#reset').click();
for(let level=0;level<G.levels.length;level++){
 await p.locator('[data-level="'+level+'"]').click();
 if([2,4,9].includes(level))await p.screenshot({path:'dist/qa/level-'+(level+1)+'.png',fullPage:true});
 const path=solve(G.levels[level]);
 for(let i=0;i<path.length;i++){await drag(path[i].block,path[i].to);assert.equal(Number(await p.locator('#remaining').innerText()),G.levels[level].limit-i-1,'step '+i+' level '+level);}
 await p.locator('#win').waitFor({state:'visible'});if(level===9){assert.match(await p.locator('#win-title').innerText(),/隱藏關解鎖/);assert.equal(await p.locator('#levels button').count(),12);}else assert.match(await p.locator('#win-score').innerText(),/最短路線/);await p.locator('#stay').click();assert.equal(await p.locator('.tick').count(),level+1);console.log('Drag solved level',level+1,'in',path.length);
}
await p.reload();assert.equal(await p.locator('.tick').count(),12);await p.locator('#undo').click();assert.equal(await p.locator('#remaining').innerText(),'5');await p.reload();assert.equal(await p.locator('#remaining').innerText(),'5');await p.locator('#reset').click();assert.equal(await p.locator('#remaining').innerText(),String(G.levels[9].limit));assert.equal(await p.locator('.tick').count(),12);
await p.locator('[data-level="0"]').click();await p.locator('[data-block="1"]').focus();await p.keyboard.press('ArrowDown');await p.keyboard.press('ArrowDown');assert.equal(await p.locator('#remaining').innerText(),'2');await p.keyboard.press('ArrowLeft');assert.equal(await p.locator('#remaining').innerText(),'2');
for(const width of [900,390,320]){await p.setViewportSize({width,height:900});await p.locator('[data-level="9"]').click();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+width);await p.screenshot({path:'dist/qa/mobile-'+width+'.png',fullPage:true});}
const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),m=await mobile.newPage();m.on('pageerror',e=>errors.push(e.message));await m.goto('http://127.0.0.1:18127/');const session=await mobile.newCDPSession(m);
async function touchDrag(i,delta){const block=await m.locator('[data-block="'+i+'"]').boundingBox(),board=await m.locator('#board').boundingBox(),x=block.x+block.width/2,y=block.y+block.height/2,dx=i===0?delta*board.width/6:0,dy=i===0?0:delta*board.width/6;await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let j=1;j<=8;j++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*j/8,y:y+dy*j/8}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
await touchDrag(1,2);await m.waitForFunction(()=>document.querySelector('#remaining').textContent==='3');assert.equal(await m.locator('#remaining').innerText(),'3');await touchDrag(0,3.9);await m.locator('#win').waitFor({state:'visible'});await m.locator('#next').tap();await m.waitForFunction(()=>document.querySelector('#stage').textContent.includes('第 2 關'));assert.match(await m.locator('#stage').innerText(),/第 2 關/);
assert.deepEqual(errors,[]);await browser.close();console.log('Passed: 12 real-drag wins, collision clamp, no-op, cancellation, budget, undo, saves, keyboard, mobile touch and responsive layouts.');
})().catch(e=>{console.error(e);process.exit(1);});