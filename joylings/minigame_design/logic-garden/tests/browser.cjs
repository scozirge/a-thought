const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {solveFrogs,candidates}=require('./helpers.cjs');
const out=path.join(__dirname,'../dist/browser-check'),base='http://127.0.0.1:18123/';
const read=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('logic-garden-v1')));
async function place(p,id,side){await p.locator(`[data-gem="${id}"]`).click();await p.locator(`[data-place="${side}"]`).click();}
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const ctx=await browser.newContext({viewport:{width:1440,height:1000}}),p=await ctx.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 try{
  await p.goto(base);await p.screenshot({path:path.join(out,'scale-desktop.png'),fullPage:true});
  await p.locator('[data-gem="1"]').dragTo(p.locator('[data-drop="-1"]'));
  assert.equal((await read(p)).scale.sides[0],-1);
  await p.locator('#weigh').click();assert.match(await p.locator('#scale-message').innerText(),/一樣多/);
  await place(p,2,1);await p.locator('#weigh').click();assert.equal((await read(p)).scale.log.length,1);
  await p.reload();assert.equal(await p.locator('.log-row').count(),1);
  await p.locator('[data-gem="3"]').click();await p.keyboard.press('Escape');assert.equal(await p.locator('.gem.selected').count(),0);
  await p.locator('#guess').click();
  const wrong=(await read(p)).scale.odd===1?2:1;await p.locator(`[data-gem="${wrong}"]`).click();
  assert.match(await p.locator('#scale-message').innerText(),/還不是/);assert.equal((await read(p)).scale.log.length,1);
  for(let level=0;level<3;level++){
   await p.locator(`[data-level="${level}"]`).click();
   let s=(await read(p)).scale,remaining=candidates(s);
   while(remaining.length>1){
    if(!await p.locator('#clear').isDisabled())await p.locator('#clear').click();
    const n=Math.ceil(remaining.length/3);
    for(const id of remaining.slice(0,n))await place(p,id,-1);
    for(const id of remaining.slice(n,n*2))await place(p,id,1);
    await p.locator('#weigh').click();s=(await read(p)).scale;remaining=candidates(s);
   }
   if(level===2){await p.waitForTimeout(650);await p.screenshot({path:path.join(out,'scale-weighed.png'),fullPage:true});}
   await p.locator('#guess').click();await p.locator(`[data-gem="${remaining[0]}"]`).click();
   await p.locator('#modal[open]').waitFor();assert.equal((await read(p)).scale.won,true);
   await p.locator('#modal-close').click();
  }
  assert.deepEqual((await read(p)).done.scale,[0,1,2]);
  await p.locator('[data-game="frogs"]').click();assert.match(p.url(),/game=frogs/);
  await p.screenshot({path:path.join(out,'frogs-desktop.png'),fullPage:true});
  await p.locator('[data-pad="0"]').click();assert.match(await p.locator('#frog-message').innerText(),/沒有空位/);
  await p.locator('[data-pad="1"]').click();await p.waitForFunction(()=>!document.querySelector('#undo').disabled);
  await p.locator('#undo').click();assert.equal((await read(p)).frogs.history.length,0);
  for(let level=0;level<3;level++){
   await p.locator(`[data-level="${level}"]`).click();
   if(level===2)await p.screenshot({path:path.join(out,'frogs-large.png'),fullPage:true});
   const solution=solveFrogs(level);
   for(let i=0;i<solution.length;i++){
    await p.locator(`[data-pad="${solution[i]}"]`).click();
    await p.waitForFunction(()=>!document.querySelector('#undo').disabled);
    if(i===2){await p.reload();assert.equal((await read(p)).frogs.history.length,3);}
   }
   await p.locator('#modal[open]').waitFor();await p.locator('#modal-close').click();
  }
  assert.deepEqual((await read(p)).done.frogs,[0,1,2]);
  await p.locator('#frog-reset').click();assert.equal((await read(p)).frogs.history.length,0);
  for(const width of [900,390,320]){
   await p.setViewportSize({width,height:900});
   for(const game of ['scale','frogs']){
    await p.locator(`[data-game="${game}"]`).click();
    assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${game} overflow ${width}`);
    if(game==='scale'){
     await p.locator('[data-level="2"]').click();
     for(let id=1;id<=9;id++)await place(p,id,-1);
     assert.ok(await p.evaluate(()=>document.querySelector('.pan.left').getBoundingClientRect().bottom<document.querySelector('.rack').getBoundingClientRect().top),'pan overlaps rack');
    }
    if(width===390)await p.screenshot({path:path.join(out,`${game}-mobile.png`),fullPage:true});
   }
  }
  // Invalid storage falls back to a valid fresh game in this isolated browser.
  await p.evaluate(()=>localStorage.setItem('logic-garden-v1','{"version":1,"frogs":null}'));
  await p.reload();assert.equal((await read(p)).frogs.level,0);
  const touch=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const phone=await touch.newPage();await phone.goto(base);
  await phone.locator('[data-gem="1"]').tap();await phone.locator('[data-place="-1"]').tap();
  assert.equal((await read(phone)).scale.sides[0],-1);
  await phone.locator('[data-game="frogs"]').tap();await phone.locator('[data-pad="1"]').tap();
  await phone.waitForFunction(()=>!document.querySelector('#undo').disabled);
  assert.equal((await read(phone)).frogs.history.length,1);await touch.close();
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,levels:6,viewports:[1440,900,390,320],screenshots:out}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
