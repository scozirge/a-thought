const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PUZZLE_PLAYWRIGHT_MODULE||'playwright');
const R=require('../web/rules.js'),{games}=require('../web/catalog.js');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});try{
 const page=await browser.newPage({viewport:{width:945,height:695},reducedMotion:'reduce'}),errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});
 await page.goto(pathToFileURL(path.resolve(__dirname,'../Builds/Web/index.html')).href);
 assert.deepEqual(await page.locator('.game-card').evaluateAll(es=>es.map(e=>e.dataset.game)),['sticker','penguin']);
 const shot=name=>page.screenshot({path:path.resolve(__dirname,'../artifacts/'+name+'.png'),fullPage:true});
 async function choose(values){for(let i=0;i<values.length;i++){await page.locator('[data-machine="'+i+'"][data-choice="'+values[i]+'"]').click();assert.equal(await page.locator('#role-identity strong').textContent(),'你是'+R.groupFor(i));assert.match(await page.locator('#role-identity span').textContent(),new RegExp('每組只選一次 · 第 '+(i+1)));}}
 async function noOverflow(){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 for(const [game,info]of Object.entries(games)){
  await page.locator('[data-game="'+game+'"]').click();
  assert.equal(await page.locator('.level-button').count(),info.levels.length);
  assert.equal(await page.locator('#role-identity strong').textContent(),'你是老師組');
  for(let i=0;i<info.levels.length;i++){
   await page.locator('[data-level="'+i+'"]').click();const l=info.levels[i],sol=R.solutions(game,l)[0];
   assert.equal(sol.length,4);assert.equal(await page.locator('.machine').count(),4);assert.equal(await page.locator('#play-button').isDisabled(),true);
   await choose(sol);assert.equal(await page.locator('[data-success]').count(),0);
   if(game==='sticker')assert.equal(await page.locator('#sticker-output .empty').count(),l.cols*l.rows);
   await page.locator('#play-button').click();await page.locator('[data-success="true"]').waitFor({timeout:15000});
   assert.deepEqual(await page.locator('.option[aria-pressed="true"]').evaluateAll(es=>es.map(e=>e.dataset.choice)),sol);
   await noOverflow();console.log('PASS H5 '+l.id);
  }
  await shot('h5-'+game+'-v10');await page.locator('[data-action="home"]').first().click();
 }
 await page.locator('[data-game="sticker"]').click();await page.locator('[data-action="clear"]').click();
 const sol=R.solutions('sticker',games.sticker.levels[0])[0],wrong=sol.slice();wrong[0]=R.optionsFor('sticker',games.sticker.levels[0])[0].find(v=>v!==sol[0]);
 await choose(wrong);await page.locator('#play-button').click();await page.locator('[data-success="false"]').waitFor();
 await page.locator('[data-machine="0"][data-choice="'+sol[0]+'"]').click();assert.deepEqual(await page.locator('.option.selected').evaluateAll(es=>es.map(e=>e.dataset.choice)),sol);
 for(const width of [390,945,1365]){
  await page.setViewportSize({width,height:844});await noOverflow();
  for(const selector of ['.option','.machine-title','.tile','.hint','.config-help','.layer-step','#role-identity span']){
   const size=await page.locator(selector).first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize));assert.ok(size>=18,selector+' 字級需至少 18px');
  }
  await shot('h5-sticker-v10-'+width);
 }

 // 最後一關仍只有四次作答；前三組填完不能播放，失敗只改一組即可重試。
 await page.locator('[data-level="19"]').click();await page.locator('[data-action="clear"]').click();
 const last=games.sticker.levels[19],answer=R.solutions('sticker',last)[0],bad=answer.slice();bad[2]=last.palette.find(v=>v!==answer[2]);
 await choose(answer.slice(0,3));assert.equal(await page.locator('#play-button').isDisabled(),true);
 await choose(bad);await page.locator('#play-button').click();await page.locator('[data-success="false"]').waitFor();
 await page.locator('[data-machine="2"][data-choice="'+answer[2]+'"]').click();
 assert.deepEqual(await page.locator('.option.selected').evaluateAll(es=>es.map(e=>e.dataset.choice)),answer);
 await page.reload();await page.locator('[data-game="sticker"]').click();await page.locator('[data-level="19"]').click();
 assert.deepEqual(await page.locator('.option.selected').evaluateAll(es=>es.map(e=>e.dataset.choice)),answer);
 for(const width of [390,945,1365]){await page.setViewportSize({width,height:900});await noOverflow();assert.equal(await page.locator('.machine').count(),4);await shot('h5-sticker-four-v10-'+width);}
 await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('#play-button').click();await page.waitForTimeout(250);await page.locator('[data-action="stop"]').click();
 assert.equal(await page.locator('#sticker-output .empty').count(),last.cols*last.rows);
 assert.deepEqual(await page.locator('.option.selected').evaluateAll(es=>es.map(e=>e.dataset.choice)),answer);
 // 四步企鵝在實際動畫速度下暫停，兩隻的位置一同凍結。
 await page.locator('[data-action="home"]').first().click();await page.locator('[data-game="penguin"]').click();await page.locator('[data-level="19"]').click();
 const ice=games.penguin.levels[19],route=R.solutions('penguin',ice)[0];await choose(route);
 await page.locator('#play-button').click();await page.waitForTimeout(250);await page.locator('[data-action="pause"]').click();
 const positions=()=>page.locator('[id^="ice-penguin-"]').evaluateAll(es=>es.map(e=>e.getAttribute('transform'))),paused=await positions();
 await page.waitForTimeout(250);assert.deepEqual(await positions(),paused);
 await page.locator('[data-action="pause"]').click();await page.locator('[data-success="true"]').waitFor({timeout:15000});
 assert.deepEqual(await page.locator('.ice-world').evaluateAll(es=>es.map(e=>e.dataset.position)),ice.boards.map(b=>b.goal.join(',')));
 for(const width of [390,945,1365]){await page.setViewportSize({width,height:900});await noOverflow();await shot('h5-penguin-four-v10-'+width);}
 await page.locator('[data-action="clear"]').click();assert.equal(await page.locator('.option.selected').count(),0);assert.equal(await page.locator('#play-button').isDisabled(),true);
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log('PASS H5 40 關、四組各一次、身分提示、保存/清空/停止/暫停、字級、無水平溢出與外部請求');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
