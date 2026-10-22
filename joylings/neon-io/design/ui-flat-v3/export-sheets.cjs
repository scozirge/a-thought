const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const path = require('node:path');
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true});
  const page=await browser.newPage({deviceScaleFactor:1});
  const base=process.env.PREVIEW_URL||'http://127.0.0.1:8198/';
  for(const v of ['a','b','c','comparison']){
    await page.setViewportSize({width:v==='comparison'?2200:1600,height:900});
    await page.goto(base+'overview.html'+(v==='comparison'?'':'?variant='+v),{waitUntil:'networkidle'});
    await page.evaluate(()=>document.fonts.ready);
    await page.screenshot({path:path.join(__dirname,'screens',v==='comparison'?'comparison.png':v+'-overview.png'),fullPage:true});
  }
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
