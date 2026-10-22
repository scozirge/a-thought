// Targeted follow-up for the gallery cards and preview after responsive refinements.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true});
  const p=await b.newPage({deviceScaleFactor:1});
  const base=process.env.PREVIEW_URL||'http://127.0.0.1:8198/';
  const report=JSON.parse(fs.readFileSync(path.join(__dirname,'verification.json'),'utf8'));
  report.galleryFollowup=[];
  for(const size of [[1440,900],[844,390],[390,844],[320,640]]){
    await p.setViewportSize({width:size[0],height:size[1]});
    await p.goto(base,{waitUntil:'networkidle'});
    await p.evaluate(()=>document.fonts.ready);
    const cards=await p.locator('.direction').evaluateAll(elements=>elements.map(e=>{const a=e.getBoundingClientRect(),b=e.querySelector('.direction-body').getBoundingClientRect();return{variant:e.dataset.variant,clipped:b.bottom>a.bottom+1||b.right>a.right+1};}));
    assert.ok(cards.every(c=>!c.clipped));
    assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    for(const v of ['a','b','c']){
      await p.locator(`.variant-tabs [data-variant="${v}"]`).click();
      await p.locator('[data-device="phone"]').click();
      await p.locator('[data-screen="tutorial"]').click();
      const frame=p.frameLocator('#prototype');
      await frame.locator('.guide-panel').waitFor();
      assert.equal(await frame.locator('body').evaluate(()=>innerWidth),844);
      await frame.getByRole('button',{name:'下一頁'}).click();
      assert.equal(await frame.locator('.guide-copy h1').textContent(),'攻擊方向');
      assert.match(await p.locator('#open-prototype').getAttribute('href'),new RegExp(`variant=${v}&screen=tutorial`));
    }
    report.galleryFollowup.push({size,cards,navigation:'passed'});
    await p.evaluate(()=>scrollTo(0,0));
    if(size[0]===390){await p.screenshot({path:path.join(__dirname,'screens/gallery-phone.png'),fullPage:true});await p.locator('.directions').screenshot({path:path.join(__dirname,'screens/gallery-phone-cards.png')});}
    if(size[0]===1440)await p.screenshot({path:path.join(__dirname,'screens/gallery-desktop.png'),fullPage:true});
  }
  report.finalNote='Four gallery layouts rechecked after fixing card-image height; all card copy is visible and all three iframe variants can be navigated.';
  fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report.galleryFollowup));await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
