const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/USER/AppData/Local/npm-cache/_npx/4c085717babbf4e0/node_modules/playwright'),assert=require('node:assert/strict'),G=require('../core.js'),fs=require('node:fs');
function solution(l){let best=-1,answer;for(let m=0;m<2**l.items.length;m++){const selected=l.items.map((_,i)=>i).filter(i=>m>>i&1),s=selected.reduce((a,i)=>[a[0]+l.items[i][0],a[1]+l.items[i][1]],[0,0]);if(s[0]<=l.capacity&&s[1]>best){best=s[1];answer=selected;}}return answer;}
(async()=>{
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),c=await b.newContext({viewport:{width:1440,height:1050}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));fs.mkdirSync('dist/qa',{recursive:true});await p.goto('http://127.0.0.1:18126/');
await p.screenshot({path:'dist/qa/first.png',fullPage:true});
await p.locator('#finish').click();assert.match(await p.locator('#status').innerText(),/還差/);
for(const id of [0,1,2])await p.locator('[data-item="'+id+'"]').click();
assert.equal(await p.locator('#weight').innerText(),'9');await p.locator('#finish').click();assert.match(await p.locator('#status').innerText(),/太重/);assert.equal(await p.locator('#win').evaluate(e=>e.open),false);
await p.locator('#undo').click();assert.equal(await p.locator('#weight').innerText(),'5');await p.locator('[data-packed="0"]').click();assert.equal(await p.locator('#weight').innerText(),'3');await p.locator('#reset').click();
const a=await p.locator('[data-item="0"]').boundingBox(),bag=await p.locator('#bag').boundingBox();
await p.mouse.move(a.x+a.width/2,a.y+a.height/2);await p.mouse.down();await p.mouse.move(bag.x+bag.width/2,bag.y+100,{steps:15});await p.mouse.up();assert.equal(await p.locator('#weight').innerText(),'2');assert.equal(await p.locator('[data-item="0"]').getAttribute('aria-pressed'),'true');
await p.reload();assert.equal(await p.locator('#weight').innerText(),'2');
const packed=await p.locator('[data-packed="0"]').boundingBox(),items=await p.locator('#items').boundingBox();
await p.mouse.move(packed.x+20,packed.y+20);await p.mouse.down();await p.mouse.move(items.x+20,items.y+20,{steps:15});await p.mouse.up();assert.equal(await p.locator('#weight').innerText(),'0');
for(let i=0;i<10;i++){await p.locator('[data-level="'+i+'"]').click();for(const id of solution(G.levels[i]))await p.locator('[data-item="'+id+'"]').click();if(i===9)await p.screenshot({path:'dist/qa/final-ready.png',fullPage:true});await p.locator('#finish').click();assert.equal(await p.locator('#win').evaluate(e=>e.open),true,'level '+(i+1));await p.locator('#stay').click();console.log('Completed level',i+1);}
assert.equal(await p.locator('.tick').count(),10);await p.reload();assert.equal(await p.locator('.tick').count(),10);await p.locator('#reset').click();assert.equal(await p.locator('#weight').innerText(),'0');assert.equal(await p.locator('.tick').count(),10);
await p.screenshot({path:'dist/qa/final-empty.png',fullPage:true});
for(const width of [900,390,320]){await p.setViewportSize({width,height:900});await p.locator('[data-level="9"]').click();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+width);await p.screenshot({path:'dist/qa/width-'+width+'.png',fullPage:true});}
const mobile=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),m=await mobile.newPage();await m.goto('http://127.0.0.1:18126/');await m.locator('[data-item="0"]').tap();assert.equal(await m.locator('#weight').innerText(),'2');await m.locator('[data-item="0"]').tap();assert.equal(await m.locator('#weight').innerText(),'0');
await p.setViewportSize({width:1440,height:1050});await p.locator('[data-level="0"]').click();await p.locator('[data-item="0"]').focus();await p.keyboard.press('Enter');assert.equal(await p.locator('#weight').innerText(),'2');await p.keyboard.press('Space');assert.equal(await p.locator('#weight').innerText(),'0');
assert.deepEqual(errors,[]);await b.close();console.log('Browser checks passed: all 10 wins, drag both directions, undo/reset, persistence, mobile tap, keyboard, layouts.');
})().catch(e=>{console.error(e);process.exit(1);});
