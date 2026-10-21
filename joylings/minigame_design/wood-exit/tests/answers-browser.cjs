const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/USER/AppData/Local/npm-cache/_npx/4c085717babbf4e0/node_modules/playwright'),assert=require('node:assert/strict'),G=require('../core.js'),fs=require('node:fs');
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),p=await b.newPage({viewport:{width:1280,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
for(const query of ['', '?tip=false','?tip=True']){await p.goto('http://127.0.0.1:18127/'+query);assert.equal(await p.locator('#answers').isVisible(),false);assert.equal(await p.locator('.block-number').count(),0);}
await p.goto('http://127.0.0.1:18127/?v=0.3&tip=true');assert.ok(await p.locator('#answers').isVisible());
// Reloaded progress must not present step one as the next move.
await p.evaluate(()=>localStorage.setItem('wood-exit-v1',JSON.stringify({version:4,level:6,actions:[{block:2,to:2}],best:{}})));await p.reload();
assert.match(await p.locator('#answer-progress').innerText(),/從目前位置/);assert.equal(await p.locator('#answers li').count(),14);
await p.evaluate(()=>localStorage.setItem('wood-exit-v1',JSON.stringify({version:4,level:6,actions:[{block:2,to:1}],best:{}})));await p.reload();
assert.match(await p.locator('#answer-progress').innerText(),/從目前位置/);assert.equal(await p.locator('#answers [aria-current="step"]').count(),1);
await p.locator('#answer-reset').click();assert.match(await p.locator('#answer-progress').innerText(),/從目前位置/);assert.equal(await p.locator('#remaining').innerText(),'18');
const screenshotActions=[...G.levels[6].solution.slice(0,7),{block:6,to:3},{block:8,to:4},{block:4,to:1}];
assert.deepEqual(G.replay(6,screenshotActions).pos,[0,0,3,3,1,1,3,4,4,4,0,1,4]);
await p.evaluate(actions=>localStorage.setItem('wood-exit-v1',JSON.stringify({version:4,level:6,actions,best:{}})),screenshotActions);await p.reload();
assert.match(await p.locator('#answer-progress').innerText(),/從目前位置/);
assert.doesNotMatch(await p.locator('#answers li').first().innerText(),/木塊 2\s*→/);
fs.mkdirSync('dist/qa',{recursive:true});await p.screenshot({path:'dist/qa/answers-current-board.png',fullPage:true});
await p.locator('#undo').click();assert.equal(await p.locator('#answers li').count(),G.solutionFrom(G.replay(6,screenshotActions.slice(0,-1))).length);
// Insufficient budget must be explicit, even if the geometric route remains valid.
await p.evaluate(()=>localStorage.setItem('wood-exit-v1',JSON.stringify({version:4,level:0,actions:[{block:1,to:3},{block:1,to:4},{block:1,to:3},{block:1,to:4}],best:{}})));await p.reload();
assert.match(await p.locator('#answer-progress').innerText(),/剩餘步數不夠/);
for(let i=0;i<G.levels.length;i++){await p.locator('[data-level="'+i+'"]').click();assert.equal(await p.locator('#answers li').count(),G.levels[i].minMoves);assert.equal(await p.locator('.block-number').count(),G.levels[i].blocks.length-1);assert.match(await p.locator('#answer-title').innerText(),new RegExp('第 '+(i+1)+' 關答案'));assert.match(await p.locator('#answers li').last().innerText(),/移到出口/);
 const steps=await p.locator('#answers li').evaluateAll(rows=>rows.map(row=>({block:row.querySelector('.answer-block').textContent,arrow:row.querySelector('.answer-direction').textContent,distance:row.lastElementChild.textContent})));
 for(let j=0;j<steps.length;j++){
  const step=await p.locator('#answers li').first().evaluate(row=>({block:row.querySelector('.answer-block').textContent,arrow:row.querySelector('.answer-direction').textContent,distance:row.lastElementChild.textContent})),id=step.block==='紅色木塊'?0:Number(step.block.match(/\d+/)[0]),el=p.locator('[data-block="'+id+'"]');
  await el.scrollIntoViewIfNeeded();await p.waitForTimeout(150);
  const box=await el.boundingBox(),cell=await p.locator('#board').evaluate(e=>e.getBoundingClientRect().width/6),distance=step.distance==='移到出口'?6:Number(step.distance.match(/\d+/)[0]),dx=step.arrow==='→'?distance*cell:step.arrow==='←'?-distance*cell:0,dy=step.arrow==='↓'?distance*cell:step.arrow==='↑'?-distance*cell:0;
  await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();await p.mouse.move(box.x+box.width/2+dx,box.y+box.height/2+dy,{steps:8});await p.mouse.up();
  assert.equal(Number(await p.locator('#remaining').innerText()),G.levels[i].limit-j-1,'Visible answer level '+(i+1)+' step '+(j+1));assert.equal(await p.locator('#answers li').count(),steps.length-j-1);
 }
 await p.locator('#win').waitFor({state:'visible'});await p.locator('#stay').click();console.log('Followed displayed answers: level',i+1,steps.length,'moves');
}
fs.mkdirSync('dist/qa',{recursive:true});await p.screenshot({path:'dist/qa/answers-desktop.png',fullPage:true});await p.setViewportSize({width:320,height:900});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.locator('#answers').scrollIntoViewIfNeeded();await p.screenshot({path:'dist/qa/answers-mobile.png',fullPage:true});assert.deepEqual(errors,[]);await b.close();console.log('Teacher URLs, hidden default, numbered blocks, all 12 solutions, level switching and mobile layout passed.');})().catch(e=>{console.error(e);process.exit(1);});