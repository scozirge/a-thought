const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/USER/AppData/Local/npm-cache/_npx/4c085717babbf4e0/node_modules/playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),{solve}=require('./helpers.cjs');
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));fs.mkdirSync('dist/browser-check',{recursive:true});
const center=async selector=>{await page.locator(selector).scrollIntoViewIfNeeded();const b=await page.locator(selector).boundingBox();return {x:b.x+b.width/2,y:b.y+b.height/2};};
async function drag(a,b){const p=await center(a),q=await center(b);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(q.x,q.y,{steps:8});await page.mouse.up();}
for(const game of ['pancake','boxes','rooms','bridges']){
 await page.goto('http://127.0.0.1:18125/?game='+game);
 for(let level=0;level<3;level++){
  await page.locator('[data-level="'+level+'"]').click();
  await page.screenshot({path:'dist/browser-check/'+game+'-'+level+'.png',fullPage:true});
  const actions=solve(game,level);
  for(let i=0;i<actions.length;i++){
   const a=actions[i];
   if(game==='pancake')await page.locator('[data-flip="'+a.n+'"]').click();
   if(game==='boxes')await page.locator('[data-dir="'+(a.dx===1?'right':a.dx===-1?'left':a.dy===1?'down':'up')+'"]').click();
   if(game==='rooms')await drag('[data-room="'+a.a+'"]','[data-room="'+a.b+'"]');
   if(game==='bridges'){if(i===0)await drag('[data-island="'+a.a+'"]','[data-island="'+a.b+'"]');else{await page.locator('[data-island="'+a.a+'"]').click();await page.locator('[data-island="'+a.b+'"]').click();}}
  }
  assert.ok(await page.locator('#modal').evaluate(e=>e.open),game+' '+level+' win');
  await page.locator('#stay').click();
  await page.locator('#undo').click();
  assert.equal(await page.locator('#modal').evaluate(e=>e.open),false);
  await page.reload();
  assert.equal(await page.evaluate(g=>JSON.parse(localStorage.getItem('puzzle-studio-v1')).entries[g].actions.length,game),actions.length-1);
  await page.locator('#reset').click();
  assert.ok(await page.locator('#undo').isDisabled());
  console.log('UI solved, undo, reload, reset:',game,level+1);
 }
}
for(const width of [900,390,320]){
 await page.setViewportSize({width,height:950});
 for(const game of ['pancake','boxes','rooms','bridges']){
  await page.goto('http://127.0.0.1:18125/?game='+game);
  await page.locator('[data-level="2"]').click();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+game+' '+width);
  if(width===390)await page.screenshot({path:'dist/browser-check/'+game+'-mobile.png',fullPage:true});
 }
}
const touch=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),mobile=await touch.newPage();
await mobile.goto('http://127.0.0.1:18125/?game=rooms');
await mobile.locator('[data-room="0"]').tap();await mobile.locator('[data-room="3"]').tap();
assert.equal(await mobile.locator('.room-cell.filled').count(),4);
await mobile.goto('http://127.0.0.1:18125/?game=bridges');
await mobile.locator('[data-island="0"]').tap();await mobile.locator('[data-island="1"]').tap();
assert.equal(await mobile.locator('.bridge-line').count(),1);
assert.deepEqual(errors,[]);
await browser.close();console.log('All browser checks passed; desktop, mobile, touch, no page errors.');
})().catch(e=>{console.error(e);process.exit(1);});
