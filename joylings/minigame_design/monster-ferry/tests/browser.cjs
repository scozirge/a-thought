const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),G=require('../core.js'),{solve}=require('./helpers.cjs');
const base='http://127.0.0.1:18124/',out=path.join(__dirname,'../dist/browser-check');
const read=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('monster-ferry-v1')));
const ready=p=>p.waitForFunction(()=>!document.querySelector('#sail').disabled||document.querySelector('#modal').open);
async function load(p,i){await p.locator(`[data-person="${i}"]`).click();await ready(p);}
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const ctx=await browser.newContext({viewport:{width:1440,height:1100}}),p=await ctx.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 try{
  await p.goto(base);await p.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
  await load(p,0);await p.locator('#sail').click();
  assert.match(await p.locator('#message').innerText(),/偷吃/);assert.equal((await read(p)).state.history.length,0);
  await p.locator('[data-cargo="0"]').click();await ready(p);
  await load(p,1);await p.locator('#sail').click();await p.waitForTimeout(350);
  await p.screenshot({path:path.join(out,'sailing.png')});await ready(p);
  assert.equal((await read(p)).state.bank,1);
  await p.locator('#undo').click();assert.equal((await read(p)).state.bank,0);
  // Reset during travel must cancel the pending arrival.
  await load(p,1);await p.locator('#sail').click();await p.locator('#reset').click();await p.waitForTimeout(1200);
  assert.deepEqual((await read(p)).state,G.fresh(0));
  for(let level=0;level<5;level++){
   await p.locator(`[data-level="${level}"]`).click();
   if(level===2){
    await load(p,0);await load(p,1);assert.match(await p.locator('#weight').getAttribute('class'),/over/);
    await p.locator('#sail').click();assert.match(await p.locator('#message').innerText(),/太重/);
    await p.locator('#reset').click();
   }
   if(level===4)await p.screenshot({path:path.join(out,'night.png'),fullPage:true});
   const route=solve(level);
   for(let trip=0;trip<route.length;trip++){
    for(const i of route[trip])await load(p,i);
    const expected=G.cross((await read(p)).state).state;
    await p.locator('#sail').click();await ready(p);
    assert.deepEqual((await read(p)).state,expected);
    if(trip===0){await p.reload();assert.equal((await read(p)).state.bank,1);}
   }
   await p.locator('#modal[open]').waitFor();await p.locator('#stay').click();
  }
  assert.deepEqual((await read(p)).done,[0,1,2,3,4]);
  await p.screenshot({path:path.join(out,'won.png'),fullPage:true});
  await p.locator('#reset').click();
  for(const width of [900,390,320]){
   await p.setViewportSize({width,height:950});
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`page overflow ${width}`);
   if(width<650)assert.ok(await p.evaluate(()=>{
    const boat=document.querySelector('.aboard').getBoundingClientRect();
    return [...document.querySelectorAll('.resident')].every(el=>el.getBoundingClientRect().bottom<boat.top);
   }),`boarding area overlaps shore at ${width}`);
   if(width===390)await p.screenshot({path:path.join(out,'mobile.png'),fullPage:true});
  }
  const touch=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const phone=await touch.newPage();await phone.goto(base);
  await phone.locator('[data-person="1"]').tap();await ready(phone);
  await phone.locator('#sail').tap();await ready(phone);assert.equal((await read(phone)).state.bank,1);
  await touch.close();assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,levels:5,viewports:[1440,900,390,320],screenshots:out}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
