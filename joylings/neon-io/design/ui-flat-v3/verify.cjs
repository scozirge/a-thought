// Browser-level layout and interaction checks for the design prototype only.
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:8198/';
const out = path.join(__dirname, 'screens');
fs.mkdirSync(out, { recursive: true });
const views = ['lobby', 'battle', 'collection', 'loadout', 'tutorial', 'settings', 'result'];
const devices = [{name:'desktop',width:1440,height:900}, {name:'phone',width:844,height:390}];

async function inspect(page) {
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => {
    const active = [...document.querySelectorAll('button,input,select,a[href]')].filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden');
    return {
      size: [innerWidth, innerHeight],
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      documentHeight: document.documentElement.scrollHeight,
      smallTargets: active.filter(e => {const r=e.getBoundingClientRect();return r.height<43.5 || r.width<43.5;}).map(e => ({name:e.getAttribute('aria-label')||e.textContent.trim(), w:e.getBoundingClientRect().width, h:e.getBoundingClientRect().height})),
      missingImages: [...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src),
      clippedCards: [...document.querySelectorAll('.direction')].filter(e=>{const a=e.getBoundingClientRect(),b=e.querySelector('.direction-body').getBoundingClientRect();return b.bottom>a.bottom+1||b.right>a.right+1;}).length,
      guideFont: document.querySelector('.guide-copy li') ? getComputedStyle(document.querySelector('.guide-copy li')).fontSize : null,
      primaryFont: document.querySelector('.mode strong') ? getComputedStyle(document.querySelector('.mode strong')).fontSize : null,
      touchingPanels: (()=>{const h=document.querySelector('.health-panel'),s=document.querySelector('.skill-dock');if(!h||!s)return false;const a=h.getBoundingClientRect(),b=s.getBoundingClientRect();return a.right>b.left && a.left<b.right && a.bottom>b.top && a.top<b.bottom;})()
    };
  });
}

(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || undefined,headless:true});
  const report = {type:'HTML/CSS UI prototype, not Unity or multiplayer validation',url:base,checks:[],errors:[]};
  const page = await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  page.on('pageerror',e=>report.errors.push(e.message));
  for(const v of ['a','b','c']) for(const d of devices) for(const view of views){
    await page.setViewportSize({width:d.width,height:d.height});
    await page.goto(`${base}prototype.html?variant=${v}&screen=${view}`,{waitUntil:'networkidle'});
    const result=await inspect(page);
    report.checks.push({variant:v,device:d.name,view,...result});
    if(['lobby','battle','tutorial','collection'].includes(view)) await page.screenshot({path:path.join(out,`${v}-${view}-${d.name}.png`),fullPage:true});
  }
  for(const size of [[667,375],[844,300],[844,240],[390,844],[320,640]]) for(const v of ['a','b','c']) for(const view of views){
    await page.setViewportSize({width:size[0],height:size[1]});
    await page.goto(`${base}prototype.html?variant=${v}&screen=${view}`,{waitUntil:'load'});
    report.checks.push({variant:v,device:size.join('x'),view,...await inspect(page)});
  }
  fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify(report,null,2));
  console.log('Layout sweep complete:',report.checks.length,'cases. Checking interactions.');
  // Navigation, actual catalogue selection, guide pages, settings and modal cancellation.
  await page.setViewportSize({width:844,height:390});
  for(const v of ['a','b','c']){
    await page.goto(`${base}prototype.html?variant=${v}&screen=lobby`);
    await page.getByRole('button',{name:'收藏',exact:true}).click();
    await page.getByRole('button',{name:'身體',exact:true}).click();
    assert.equal(await page.locator('.part-tab.selected').textContent(),'身體');
    const name=await page.locator('.skill-card').nth(3).locator('span').textContent();
    await page.locator('.skill-card').nth(3).click();
    assert.equal(await page.locator('.detail-copy h2').textContent(),name);
    await page.getByRole('button',{name:'前往配裝'}).click();
    await page.getByRole('button',{name:'開始配對'}).click();
    await page.getByRole('button',{name:'預覽對戰'}).click();
    await page.getByRole('button',{name:'離開戰場'}).click();
    await page.getByRole('button',{name:'繼續遊玩'}).click();
    assert.equal(await page.locator('.dialog').count(),0);
    await page.getByRole('button',{name:'離開戰場'}).click();
    await page.getByRole('dialog').getByRole('button',{name:'離開戰場'}).click();
    await page.getByRole('button',{name:'遊玩教學'}).click();
    assert.match(await page.locator('.page-count').textContent(),/2/);
    await page.getByRole('button',{name:'下一頁'}).click();
    assert.match(await page.locator('.guide-copy h1').textContent(),/攻擊方向/);
    await page.getByRole('button',{name:'上一頁'}).click();
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.locator('.guide-copy h1').textContent(),'角色操作');
    await page.getByRole('button',{name:'關閉'}).click();
    await page.getByRole('button',{name:'設定',exact:true}).click();
    await page.getByRole('slider',{name:'音樂音量'}).fill('32');
    assert.equal(await page.locator('output').first().textContent(),'32%');
    await page.setViewportSize({width:844,height:390});
  }
  report.interactions='3 variants passed catalogue, loadout, modal, tutorial, viewport rotation, range input';
  for(const size of [[1440,900],[844,390],[390,844],[320,640]]){
    await page.setViewportSize({width:size[0],height:size[1]});
    await page.goto(base,{waitUntil:'networkidle'});
    await page.locator('.variant-tabs [data-variant="c"]').click();
    await page.locator('[data-device="phone"]').click();
    await page.locator('[data-screen="tutorial"]').click();
    await page.frameLocator('#prototype').locator('.guide-panel').waitFor();
    const result=await inspect(page);
    report.checks.push({page:'gallery',device:size.join('x'),...result});
    if(size[0]===1440)await page.screenshot({path:path.join(out,'gallery-desktop.png'),fullPage:true});
    if(size[0]===390)await page.screenshot({path:path.join(out,'gallery-phone.png'),fullPage:true});
  }
  await browser.close();
  if(process.env.CHECK_WEBKIT==='1'){
    try{
      const wk=await webkit.launch({headless:true});
      const wp=await wk.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:1});
      for(const v of ['a','b','c']) for(const view of views){await wp.goto(`${base}prototype.html?variant=${v}&screen=${view}`,{waitUntil:'networkidle'});report.checks.push({engine:'WebKit',variant:v,view,...await inspect(wp)});}
      report.webkit='completed';await wk.close();
    }catch(e){report.webkit={error:e.message};}
  }
  report.failures=report.checks.filter(x=>x.horizontalOverflow||x.smallTargets.length||x.missingImages.length||x.touchingPanels||x.clippedCards);
  fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({cases:report.checks.length,failures:report.failures,errors:report.errors,interactions:report.interactions,webkit:report.webkit},null,2));
  if(report.failures.length||report.errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1);});
