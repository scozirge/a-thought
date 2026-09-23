// Inspect the rendered Web player from its first countdown, without clicking
// to capture the mouse. Screenshots verify the reticle rather than a QA flag.
const {chromium}=require(process.env.RIVALS_PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const out=path.resolve(__dirname,'../Logs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.RIVALS_CHROME||undefined,headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),result={errors:[]};
 page.on('pageerror',e=>result.errors.push(e.message));
 page.on('console',m=>{if(/^(InvalidOperationException|NullReferenceException|MissingReferenceException|ArgumentException):/.test(m.text()))result.errors.push(m.text());});
 try{
  await page.goto('http://localhost:8184/?diagnostics=1&v=entry-crosshair');
  await page.waitForFunction(()=>window.rivalsLobbyState?.ready&&!window.rivalsLobbyState.busy,null,{timeout:90000});
  await page.locator('#player-name').fill('準心貓貓');await page.locator('#create-room').click();
  await page.waitForFunction(()=>window.rivalsDiagnostics?.phase===1&&window.rivalsLobbyState?.visible===false,null,{timeout:90000});
  result.countdown=await page.evaluate(()=>window.rivalsDiagnostics);
  result.canvas=await page.locator('canvas').boundingBox();
  await page.screenshot({path:path.join(out,'pointer-lock-walls-entry-countdown.png')});
  assert.equal(result.countdown.controls,false);
  assert.equal(result.countdown.targetSeat,-1,'central screens hide the opposing spawn target');
  await page.waitForFunction(()=>window.rivalsDiagnostics?.phase===2,null,{timeout:15000});
  await page.waitForTimeout(120);
  assert.equal(await page.locator('#control-resume').isVisible(),true);
  result.resume=await page.locator('#resume-pointer').boundingBox();
  assert.ok(result.resume.y>result.canvas.y+result.canvas.height*.6,'recovery does not cover crosshair');
  await page.screenshot({path:path.join(out,'pointer-lock-walls-entry-unfocused.png')});
  const cx=result.canvas.x+result.canvas.width/2,cy=result.canvas.y+result.canvas.height/2;
  await page.mouse.click(cx,cy,{delay:70});await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>window.rivalsDiagnostics.controls),true);
  await page.screenshot({path:path.join(out,'pointer-lock-walls-entry-playing.png')});
  assert.deepEqual(result.errors,[]);result.ok=true;
  console.log('WEB_ENTRY_CROSSHAIR_OK');
 }finally{fs.writeFileSync(path.join(out,'pointer-lock-walls-entry-check.json'),JSON.stringify(result,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
