// Actual WebGL player, touch events and repeated orientation changes.
const {chromium,webkit,devices}=require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const gestures=require('./web-controls.cjs');
const url=process.env.NEON_WEB_URL||'http://127.0.0.1:8197/';
const engine=process.env.NEON_BROWSER||'chromium';
const output=path.resolve(__dirname,'../logs/'+(process.env.NEON_RUN||'web-mobile-'+engine));fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await (engine==='webkit'?webkit:chromium).launch(engine==='webkit'?{headless:true}:{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const report={url,engine,passed:false,checks:[],errors:[],sizes:[],physicalDevice:false};
 let page;
 try{
  const context=await browser.newContext({...devices['iPhone 13'],viewport:{width:390,height:844},locale:'zh-TW'});
  page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('console',m=>{const s=m.text().replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,'[redacted-id]');if(/Exception:|abort\(|shader.*error|NullReferenceException/i.test(s))report.errors.push(s.slice(0,500));fs.appendFileSync(path.join(output,'browser.log'),s+'\n');});
  async function ready(fn,arg=null){await page.waitForFunction(fn,arg,{timeout:120000});}
  async function click(name){
   await gestures.click(page,name,engine==='chromium');
  }
  async function resize(width,height){
   await page.setViewportSize({width,height});
   await ready(()=>{const c=document.querySelector('canvas'),s=window.neonState;return s&&Math.abs(s.cssWidth-c.clientWidth)<2&&Math.abs(s.cssHeight-c.clientHeight)<2&&s.screenWidth===c.width&&s.screenHeight===c.height;});
   await page.waitForTimeout(800);
  }
  async function checkGuide(label){
   const info=await page.evaluate(()=>{
    const c=document.querySelector('canvas'),r=c.getBoundingClientRect(),s=neonState;
    return {label:'',screen:[s.screenWidth,s.screenHeight],css:[r.width,r.height],page:s.guidePage,legacyPopupVisible:s.legacyPopupVisible,
     controls:s.controls.filter(b=>['Close tutorial','Next page','Previous page'].includes(b.name)).map(b=>({name:b.name,x:b.x*r.width/c.width,y:b.y*r.height/c.height,w:b.w*r.width/c.width,h:b.h*r.height/c.height})),
     canvas:{x:r.x,y:r.y,right:r.right,bottom:r.bottom},viewport:[innerWidth,innerHeight]};
   });
   info.label=label;
   assert.equal(info.legacyPopupVisible,false,'Original popup canvas must stay hidden');assert.equal(info.controls.length,3);
   for(const b of info.controls){assert.ok(b.h>=43.5,`${label}: ${b.name} touch height ${b.h}`);assert.ok(b.w>=100);assert.ok(b.x>=-1&&b.y>=-1&&b.x+b.w<=info.css[0]+1&&b.y+b.h<=info.css[1]+1,`${label}: control clipped`);}
   assert.ok(info.canvas.x>=0&&info.canvas.y>=0&&info.canvas.right<=info.viewport[0]+1&&info.canvas.bottom<=info.viewport[1]+1);
   report.sizes.push(info);await page.screenshot({path:path.join(output,label+'.png'),scale:'css'});
  }
  await page.goto(url+'?neonQA=1&neonRoom=neon-web-check-mobile-'+Date.now().toString(36));
  await page.locator('#rotate').waitFor({state:'visible'});await page.locator('#start:enabled').waitFor({timeout:240000});
  await ready(()=>window.neonState?.scene==='Init'&&!neonState.started);
  assert.ok(await page.locator('canvas').evaluate(c=>c.inert));
  await page.screenshot({path:path.join(output,'portrait-start.png'),scale:'css'});
  report.checks.push('Portrait start shows rotation prompt; original intro remains at its initial state');
  await resize(844,390);await page.locator('#rotate').waitFor({state:'hidden'});await page.locator('#start').tap();
  await ready(()=>window.neonState?.scene==='Init'&&neonState.started);await page.waitForTimeout(2500);
  await page.screenshot({path:path.join(output,'intro-landscape.png'),scale:'css'});
  await ready(()=>neonState.scene==='Lobby'&&neonState.controls.some(c=>c.name==='Settings'));
  await page.screenshot({path:path.join(output,'lobby-landscape.png'),scale:'css'});
  await click('Settings');await click('Tutorial');await ready(()=>neonState.guidePage==='1/10');await click('Next page');await ready(()=>neonState.guidePage==='2/10');
  assert.ok(await page.evaluate(()=>neonState.guideText.includes('蘑菇頭')),'Touch device must show thumbstick instructions');
  await checkGuide('guide-landscape');
  const loadStarted=await page.evaluate(()=>neonLoadStarted);
  for(let round=0;round<2;round++){
   await resize(390,844);await page.locator('#rotate').waitFor({state:'visible'});
   assert.equal(await page.evaluate(()=>neonState.guidePage),'2/10');
   await resize(844,390);await page.locator('#rotate').waitFor({state:'hidden'});
   assert.equal(await page.evaluate(()=>neonState.guidePage),'2/10');
  }
  assert.equal(await page.evaluate(()=>neonLoadStarted),loadStarted);
  await checkGuide('guide-after-rotations');
  await click('Next page');await ready(()=>neonState.guidePage==='3/10');await click('Previous page');await ready(()=>neonState.guidePage==='2/10');
  report.checks.push('Two portrait/landscape round trips preserve page and player instance; next/previous work after rotation');
  await page.evaluate(()=>{for(const [k,v] of Object.entries({left:44,right:44,bottom:21}))document.documentElement.style.setProperty('--safe-'+k,v+'px');window.dispatchEvent(new Event('resize'));});
  await ready(()=>neonState.cssWidth===756&&neonState.cssHeight===369);await checkGuide('guide-notch-insets');
  const canvas=await page.locator('canvas').boundingBox();assert.equal(canvas.x,44);assert.equal(canvas.width,756);
  await page.evaluate(()=>{for(const side of ['left','right','bottom'])document.documentElement.style.removeProperty('--safe-'+side);window.dispatchEvent(new Event('resize'));});
  await resize(667,375);await checkGuide('guide-small-phone');
  await resize(844,300);await checkGuide('guide-short-viewport');
  await resize(844,240);await checkGuide('guide-browser-toolbars');
  await resize(844,390);
  report.checks.push('44 CSS-pixel tutorial controls fit 844x390, 667x375, 844x300 and 844x240; simulated notch/home-indicator insets remain clear');
  await click('Close tutorial');await ready(()=>!neonState.guidePage);await click('Back');
  await click('Infinity');await ready(()=>neonState.controls.some(c=>c.name==='Close tutorial')||neonState.scene==='Battle');
  if(await page.evaluate(()=>neonState.controls.some(c=>c.name==='Close tutorial'))){
   await ready(()=>neonState.guidePage==='1/7');await click('Next page');await ready(()=>neonState.guidePage==='2/7');await checkGuide('first-game-guide');await click('Close tutorial');
   await ready(()=>!neonState.guidePage);
   if(await page.evaluate(()=>neonState.controls.some(c=>c.name==='Infinity')))await click('Infinity');
  }
  await ready(()=>neonState.scene==='Battle'&&neonState.connected);
  if(await page.evaluate(()=>neonState.controls.some(c=>c.name==='Close tutorial')))await click('Close tutorial');
  await page.waitForTimeout(1500);await page.screenshot({path:path.join(output,'battle-landscape.png'),scale:'css'});
  await resize(390,844);await page.locator('#rotate').waitFor({state:'visible'});await resize(844,390);await page.locator('#rotate').waitFor({state:'hidden'});
  assert.ok(await page.evaluate(()=>neonState.connected));
  await click('Leave arena');await ready(()=>neonState.controls.some(c=>c.name==='Confirm dialog'));await click('Confirm dialog');await ready(()=>neonState.scene==='Lobby');
  report.checks.push('First-game tutorial uses the same touch layout; live Photon battle stays connected through rotation and returns to lobby');
  assert.deepEqual(report.errors,[]);report.passed=true;
 }catch(e){report.failure=e.stack;if(page){report.lastState=await page.evaluate(()=>window.neonState).catch(()=>null);await page.screenshot({path:path.join(output,'failure.png'),scale:'css'}).catch(()=>{});}process.exitCode=1;}
 finally{fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
})();
