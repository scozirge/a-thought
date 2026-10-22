const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/USER/AppData/Local/npm-cache/_npx/4c085717babbf4e0/node_modules/playwright');
const G=require('../core.js'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const output=path.resolve(__dirname,'../dist/browser-check');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:18121/');
  const card=id=>page.locator(`[data-card="${id}"]`),slot=id=>page.locator(`[data-slot="${id}"]`);
  const save=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('donut-math-v2')));
  async function fill(i){for(const [s,id] of Object.entries(G.levels[i].solution)){await slot(s).click();await card(id).click();}}
  async function pass(i){
   await page.locator('#play').click();
   await page.waitForFunction(()=>document.getElementById('status').textContent==='全部訂單完成！',null,{timeout:45000});
   assert.equal(await page.locator('tbody tr.pass').count(),G.levels[i].cases.length);
  }
  await page.screenshot({path:path.join(output,'math-initial.png'),fullPage:true});
  assert.equal(await page.locator('#play').isDisabled(),true);
  await card('add6').dragTo(slot('a'));await card('mul3').click();await card('div2').click();
  await slot('b').dragTo(slot('c'));
  assert.deepEqual((await save()).programs[0],G.levels[0].solution);
  await pass(0);
  // Change the first machine to a wrong one. Failure preserves the complete recipe.
  await slot('a').click();await card('sub2').click();
  await page.locator('#play').click();
  await page.waitForFunction(()=>document.getElementById('status').className==='error',null,{timeout:12000});
  assert.equal((await save()).programs[0].a,'sub2');assert.equal(await page.locator('tbody tr.fail').count(),1);
  await page.locator('#undo').click();assert.deepEqual((await save()).programs[0],G.levels[0].solution);
  await page.locator('[data-level="1"]').click();
  await card('mul3').dragTo(slot('test'));assert.equal((await save()).programs[1].test,null);
  await fill(1);await pass(1);
  await page.screenshot({path:path.join(output,'math-branch.png'),fullPage:true});
  await page.locator('[data-level="2"]').click();await fill(2);await pass(2);
  for(const width of [320,390,900,1440]){
   await page.setViewportSize({width,height:1000});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);
   await page.screenshot({path:path.join(output,`math-double-${width}.png`),fullPage:true});
  }
  await page.reload();assert.equal(await page.locator('nav .check').count(),3);
  assert.deepEqual((await save()).programs[2],G.levels[2].solution);
  // Editing and switching must cancel both animation and future results.
  await page.locator('#play').click();await page.waitForTimeout(300);
  await slot('yes1').click();await card('add4').click();await page.waitForTimeout(900);
  assert.equal(await page.locator('#cargo').isHidden(),true);
  assert.equal(await page.locator('tbody tr.pass').count(),0);
  await page.locator('#undo').click();await page.locator('#play').click();
  await page.locator('[data-level="0"]').click();await page.waitForTimeout(700);
  assert.equal(await page.locator('#cargo').isHidden(),true);
  await page.locator('#reset').click();assert.equal(await page.locator('.slot.filled').count(),0);
  const touch=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  await touch.goto('http://127.0.0.1:18121/');
  for(const id of ['add6','div2','mul3'])await touch.locator(`[data-card="${id}"]`).tap();
  assert.equal(await touch.locator('.slot.filled').count(),3);
  assert.equal(await touch.locator('#play').isEnabled(),true);await touch.close();
  assert.deepEqual(errors,[]);
  console.log('通過：拖放交換、三關 15 張訂單、錯解、比較槽限制、復原、進度、改機器／切關中止、觸控、四種寬度。');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
