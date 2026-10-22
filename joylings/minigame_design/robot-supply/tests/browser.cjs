const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/USER/AppData/Local/npm-cache/_npx/4c085717babbf4e0/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base='http://127.0.0.1:18120/',output=path.resolve(__dirname,'../dist/browser-check');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);
  const card=id=>page.locator(`[data-card="${id}"]`),slot=i=>page.locator(`[data-slot="${i}"]`);
  async function passed(){
   await page.waitForFunction(()=>!document.getElementById('success').hidden,null,{timeout:20000});
   assert.equal(await page.locator('.case.passed').count(),3);
  }
  await page.screenshot({path:path.join(output,'simple-initial.png'),fullPage:true});
  assert.equal(await page.locator('#play').isDisabled(),true);
  // One drag is enough to run and pass the first mission.
  await card('+').dragTo(slot(0));await passed();
  // Wrong replacement keeps the card, then a single click fixes it.
  await card('-').click();
  await page.waitForFunction(()=>document.getElementById('readout').classList.contains('error'));
  assert.match(await slot(0).innerText(),/−/);
  await card('+').click();await passed();
  await page.locator('[data-level="1"]').click();
  await card('cargo').dragTo(slot(0));assert.equal(await slot(0).getAttribute('class').then(c=>c.includes('filled')),false);
  await card('>').click();await card('cargo').click();
  await page.waitForTimeout(600);assert.equal(await page.locator('#readout').innerText(),'');
  await card('mail').click();await passed();
  await page.screenshot({path:path.join(output,'simple-route.png'),fullPage:true});
  await page.locator('[data-level="2"]').click();
  await card('<').click();await card('fill').click();await card('drain').click();await passed();
  for(const width of [320,390,768,1366]){
   await page.setViewportSize({width,height:900});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);
   await page.screenshot({path:path.join(output,`simple-balance-${width}.png`),fullPage:true});
  }
  await page.reload();assert.equal(await page.locator('.level-check').count(),3);
  assert.equal(await page.locator('.slot.filled').count(),3);
  // Reset and switch cancel pending automatic execution.
  await page.locator('#reset').click();await card('<').click();await card('fill').click();await card('drain').click();
  await page.locator('#reset').click();await page.waitForTimeout(1000);
  assert.equal(await page.locator('.slot.filled').count(),0);assert.equal(await page.locator('#readout').innerText(),'');
  await page.locator('[data-level="0"]').click();await card('+').click();await page.waitForTimeout(550);
  await page.locator('[data-level="1"]').click();await page.waitForTimeout(1000);
  assert.equal(await page.locator('#readout').innerText(),'');
  // Touch: tapping a card fills a slot without an editor or an extra Run button.
  const touch=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  await touch.goto(base);await touch.locator('[data-card="+"]').tap();
  await touch.waitForFunction(()=>!document.getElementById('success').hidden,null,{timeout:15000});
  await touch.close();
  // Preserve old completion without changing the user's old draft format.
  const migrated=await browser.newPage();
  await migrated.addInitScript(()=>localStorage.setItem('robot-supply-v1',JSON.stringify({completed:['combine','balance'],programs:['old']})));
  await migrated.goto(base);assert.equal(await migrated.locator('.level-check').count(),2);
  assert.match(await migrated.evaluate(()=>localStorage.getItem('robot-supply-v1')),/old/);await migrated.close();
  assert.deepEqual(errors,[]);
  console.log('通過：單次拖放自動通關、錯誤替換、三關九組資料、空格與類型限制、存檔繼承、重來／切關中止、觸控、四種寬度。');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
