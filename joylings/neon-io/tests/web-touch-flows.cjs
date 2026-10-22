// Additional real WebGL flows: mobile text entry, English UI and mobile/desktop duel.
const {chromium,devices}=require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const gestures=require('./web-controls.cjs');
const url=process.env.NEON_WEB_URL||'http://127.0.0.1:8200/';
const output=path.resolve(__dirname,'../logs/'+(process.env.NEON_RUN||'web-touch-flows'));fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const report={url,passed:false,physicalDevice:false,checks:[],layouts:[],errors:[]};let page;
 try{
  const room='neon-web-check-duel-'+Date.now().toString(36);
  const ctx=await browser.newContext({...devices['iPhone 13'],viewport:{width:844,height:390},locale:'zh-TW'});page=await ctx.newPage();
  const desktop=await browser.newPage({viewport:{width:1280,height:800},locale:'zh-TW'});
  const ready=async(p,fn)=>{await p.waitForFunction(()=>!!window.neonState,null,{timeout:90000});await p.waitForFunction(fn,null,{timeout:90000});};
  const click=n=>gestures.click(page,n);
  for(const [i,p] of [page,desktop].entries()){
   p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{const s=m.text().replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,'[redacted-id]');if(/Exception:|abort\(|shader.*error|NullReferenceException/i.test(s))report.errors.push(s.slice(0,500));fs.appendFileSync(path.join(output,'peer-'+i+'.log'),s+'\n');});
   await p.goto(url+'?neonQA=1&neonRoom='+room);await p.locator('#start:enabled').waitFor({timeout:300000});await p.locator('#start').click();await ready(p,()=>neonState.view==='lobby');
  }
  async function layout(label){
   await page.waitForTimeout(650);const s=await page.evaluate(()=>neonState),r=s.cssWidth/s.screenWidth;
   for(const c of s.controls.filter(c=>c.type!=='Scrollbar')){assert.ok(c.w*r>=43.4&&c.h*r>=43.4,label+': small '+c.name);if(!c.scroll)assert.ok(c.x*r>=-1&&c.y*r>=-1&&(c.x+c.w)*r<=s.cssWidth+1&&(c.y+c.h)*r<=s.cssHeight+1,label+': clipped '+c.name);}
   report.layouts.push({label,view:s.view,size:[s.cssWidth,s.cssHeight]});await page.screenshot({path:path.join(output,label+'.png'),scale:'css'});console.log('Layout complete',label);
  }
  async function closeGuide(p=page,mobile=true){if(await p.evaluate(()=>neonState.controls.some(c=>c.name==='Close tutorial')))await gestures.click(p,'Close tutorial',mobile);}
  await page.bringToFront();await click('Player name');
  const input=page.locator('input:not([type="button"]),textarea').first();await input.waitFor({state:'visible',timeout:15000});
  await input.fill('TouchPilot');await page.setViewportSize({width:844,height:300});
  await ready(page,()=>neonState.cssHeight===300&&neonState.controls.some(c=>c.name==='Player name'&&c.text==='TouchPilot'));
  await page.waitForTimeout(700);await input.fill('TouchPilotX');await input.press('Enter');
  await page.setViewportSize({width:667,height:375});await ready(page,()=>neonState.cssWidth===667);
  await click('Settings');await click('LanguageDropDown');await ready(page,()=>neonState.controls.some(c=>c.name==='Option 0'&&c.text==='English'));await click('Option 0');
  await ready(page,()=>neonState.controls.some(c=>c.name==='Settings tab 0'&&c.text==='GENERAL'));await layout('english-settings');
  await click('Settings tab 1');await layout('english-shouts');await click('Unlock shout 0');await ready(page,()=>neonState.controls.some(c=>c.name==='Cancel dialog'||c.name==='Close dialog'));await layout('english-shout-prompt');await click(await page.evaluate(()=>neonState.controls.some(c=>c.name==='Cancel dialog'))?'Cancel dialog':'Close dialog');
  await click('Settings tab 2');await layout('english-credits');await click('Back');await layout('english-lobby');
  assert.ok(await page.evaluate(()=>neonState.controls.some(c=>c.name==='Player name'&&c.text==='TouchPilotX')));report.checks.push('Actual mobile HTML keyboard entry survives a viewport resize and commits the player name');
  await click('Tutorial');await ready(page,()=>!!neonState.guidePage);await click('Next page');assert.match(await page.evaluate(()=>neonState.guideText),/thumbstick/);await layout('english-guide');await click('Close tutorial');
  await click('Collection');await layout('english-collection');await click('Part 2');await layout('english-collection-back');await click('Back');
  await click('Challenge');await closeGuide();await ready(page,()=>neonState.view==='loadout');await layout('english-loadout');
  await click('Start matchmaking');await ready(page,()=>neonState.view==='matching'&&neonState.connected);await layout('english-matching');await click('Cancel matchmaking');await ready(page,()=>neonState.view==='loadout'&&!neonState.connected);
  report.checks.push('English mobile menus, settings, shout prompt without making a purchase, tutorial, collection and actual matchmaking cancellation');
  await gestures.click(desktop,'Challenge',false);await closeGuide(desktop,false);await ready(desktop,()=>neonState.view==='loadout');
  await page.setViewportSize({width:844,height:240});await ready(page,()=>neonState.cssHeight===240);await page.waitForTimeout(700);
  await click('Start matchmaking');await ready(page,()=>neonState.connected&&neonState.view==='matching');await layout('compact-matching');
  await gestures.click(desktop,'Start matchmaking',false);await ready(page,()=>neonState.view==='versus');await layout('compact-versus');
  await ready(page,()=>neonState.scene==='Challenge'&&neonState.connected);await ready(desktop,()=>neonState.scene==='Challenge'&&neonState.connected);
  const a=await page.evaluate(()=>neonState),b=await desktop.evaluate(()=>neonState);assert.equal(a.room,b.room);assert.ok(a.peers>=2&&b.peers>=2);report.room=a.room;
  await closeGuide();await page.bringToFront();await layout('compact-duel-hud');
  report.checks.push('Actual mobile and desktop Photon peers show opponent loadouts and enter the same duel');
  await click('Leave arena');await ready(page,()=>neonState.controls.some(c=>c.name==='Confirm dialog'));await layout('compact-leave-confirm');await click('Confirm dialog');await ready(page,()=>neonState.scene==='Lobby'&&!neonState.connected);
  assert.deepEqual(report.errors,[]);report.passed=true;
 }catch(e){report.failure=e.stack;if(page){report.lastState=await page.evaluate(()=>window.neonState).catch(()=>null);await page.screenshot({path:path.join(output,'failure.png'),scale:'css'}).catch(()=>{});}process.exitCode=1;}
 finally{fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks:report.checks,layouts:report.layouts.length,errors:report.errors,failure:report.failure},null,2));await browser.close();}
})();
