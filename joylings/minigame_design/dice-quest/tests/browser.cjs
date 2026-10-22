const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const G=require('../core.js'),{plan}=require('./planner.cjs');
const output=path.join(__dirname,'../dist/browser-check');
const base=process.env.TEST_URL||'http://127.0.0.1:18122/';
const read=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('dice-quest-v1')));
const ready=page=>page.waitForFunction(()=>!document.getElementById('restart').disabled);
async function play(page,a){
  if(a.type==='cast'||a.type==='tool'){
    await page.locator(`[data-die="${a.die}"]`).click();
    await page.locator(a.type==='cast'?`[data-card="${a.card}"]`:`[data-tool="${a.id}"]`).click();
    if(a.id==='merge')await page.locator(`[data-die="${a.other}"]`).click();
  }else if(a.type==='end')await page.locator('#end-turn').click();
  else if(a.type==='reward')await page.locator(`[data-reward="${a.id}"]`).click();
  await ready(page);
}
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base);await page.screenshot({path:path.join(output,'desktop.png'),fullPage:true});
  await page.locator('[data-die="3"]').dragTo(page.locator('[data-card="fire"]'));
  await ready(page);assert.equal((await read(page)).enemyHp,22);
  assert.ok(await page.locator('[data-card="fire"]').isDisabled());
  await page.locator('#undo').click();assert.equal((await read(page)).enemyHp,34);
  await page.locator('[data-die="1"]').click();await page.locator('[data-card="heal"]').click();
  assert.match(await page.locator('#message').innerText(),/等於 3/);assert.equal((await read(page)).dice.length,3);
  await page.keyboard.press('Escape');
  await play(page,{type:'tool',id:'split',die:3});
  assert.deepEqual((await read(page)).dice.map(d=>d.value),[2,4,3,3]);
  await page.locator('#undo').click();
  await page.locator('[data-die="1"]').click();await page.locator('[data-tool="merge"]').click();
  await page.locator('#dice-hint').click({button:'right'});
  assert.equal(await page.locator('.merge-base').count(),0);
  await play(page,{type:'tool',id:'merge',die:1,other:2});
  assert.deepEqual((await read(page)).dice.map(d=>d.value),[6,6]);
  await page.reload();assert.deepEqual((await read(page)).dice.map(d=>d.value),[6,6]);
  assert.ok(await page.locator('#undo').isDisabled());
  await page.locator('#restart').click();await page.locator('[data-cancel]').click();
  assert.deepEqual((await read(page)).dice.map(d=>d.value),[6,6]);
  await page.locator('#restart').click();await page.locator('[data-new]').click();
  let s=await read(page),rounds=0;
  while(s.phase!=='won'&&rounds<24){
    if(s.phase==='reward'){
      await page.screenshot({path:path.join(output,`reward-${s.stage}.png`)});
      await play(page,{type:'reward',id:s.stage===0?'frost':'extra'});
      s=await read(page);continue;
    }
    assert.equal(s.phase,'player');
    if(s.stage===2&&s.round===1)await page.screenshot({path:path.join(output,'dragon.png'),fullPage:true});
    for(const a of plan(s)){
      const expected=G.act(s,a).state;
      await play(page,a);s=await read(page);
      assert.deepEqual(s,expected);
    }
    if(s.phase==='player'){await play(page,{type:'end'});s=await read(page);}
    rounds++;
  }
  assert.equal(s.phase,'won');await page.locator('#modal[open]').waitFor();
  await page.screenshot({path:path.join(output,'won.png')});
  await page.reload();assert.match(await page.locator('#modal-title').innerText(),/冒險成功/);
  await page.locator('[data-new]').click();
  for(const width of [1440,900,390,320]){
    await page.setViewportSize({width,height:900});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}`);
    if(width===390)await page.screenshot({path:path.join(output,'mobile.png'),fullPage:true});
  }
  let lost=G.fresh();while(lost.phase==='player')lost=G.act(lost,{type:'end'}).state;
  await page.evaluate(s=>localStorage.setItem('dice-quest-v1',JSON.stringify(s)),lost);await page.reload();
  await page.locator('[data-retry]').click();await ready(page);
  assert.equal((await read(page)).hp,32);assert.equal((await read(page)).round,1);
  const touch=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const phone=await touch.newPage();await phone.goto(base);
  await phone.locator('[data-die="3"]').tap();await phone.locator('[data-card="fire"]').tap();
  await ready(phone);assert.equal((await read(phone)).enemyHp,22);await touch.close();
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,campaignRounds:rounds,viewports:[1440,900,390,320],screenshots:output}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
