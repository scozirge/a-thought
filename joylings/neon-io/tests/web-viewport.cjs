// Test the HTML host's browser API fallbacks independently of WebGL rendering.
const {chromium,webkit,devices}=require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const template=fs.readFileSync(path.resolve(__dirname,'../unity/Assets/WebGLTemplates/Neon/index.html'),'utf8');
const output=path.resolve(__dirname,'../logs/web-viewport');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const report={passed:false,scope:'HTML host only; Unity is stubbed',checks:[]};
 try{
  for(const engine of ['chromium','webkit']){
   const browser=await (engine==='webkit'?webkit:chromium).launch(engine==='webkit'?{headless:true}:{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
   try{
    const page=await browser.newPage({...devices['iPhone 13'],viewport:{width:390,height:844}});
    const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(engine,e.message);});
    await page.addInitScript(()=>{
     window.sent=[];window.apiCalls=[];
     const actual=window.visualViewport,v=new EventTarget();
     for(const key of ['width','height','offsetLeft','offsetTop'])Object.defineProperty(v,key,{get:()=>v.overrides?.[key]??actual[key]});
     Object.defineProperty(window,'visualViewport',{configurable:true,value:v});
     // iOS/in-app browsers can expose an API but still reject requests.
     Element.prototype.requestFullscreen=async()=>{apiCalls.push('fullscreen');throw new DOMException('Denied','NotAllowedError');};
     if(screen.orientation)screen.orientation.lock=async()=>{apiCalls.push('lock');throw new DOMException('Unsupported','NotSupportedError');};
     window.createUnityInstance=async()=>({SendMessage:(...args)=>sent.push(args)});
    });
    await page.route('https://neon.test/**',route=>route.fulfill({contentType:'text/html',body:template.replace(/<script src="Build\/[^>]+><\/script>/,'')}));
    await page.goto('https://neon.test/');await page.locator('#rotate').waitFor({state:'visible'});
    assert.deepEqual(errors,[]);await page.locator('#start:enabled').waitFor({timeout:5000});
    await page.locator('#landscape').tap();assert.ok(await page.locator('#rotate').isVisible());
    assert.equal(await page.evaluate(()=>sent.some(a=>a[1]==='StartGame')),false);
    await page.setViewportSize({width:844,height:390});await page.locator('#rotate').waitFor({state:'hidden'});await page.locator('#start').tap();
    assert.equal(await page.evaluate(()=>sent.filter(a=>a[1]==='StartGame').length),1);
    assert.ok(await page.locator('#loading').isHidden());
    // Model a keyboard/toolbar changing only the visual viewport, without a
    // window resize or a physical orientation change.
    await page.evaluate(()=>{
     visualViewport.overrides={width:844,height:240,offsetLeft:0,offsetTop:18};
     visualViewport.dispatchEvent(new Event('resize'));
    });
    await page.waitForFunction(()=>neonViewport.visibleHeight===240);
    assert.equal(await page.locator('#viewport').evaluate(e=>e.getBoundingClientRect().height),240);
    assert.ok(await page.locator('#rotate').isHidden());
    await page.evaluate(()=>{visualViewport.overrides.offsetTop=0;visualViewport.overrides.height=390;visualViewport.dispatchEvent(new Event('scroll'));});
    await page.waitForFunction(()=>neonViewport.visibleHeight===390);
    await page.evaluate(()=>{delete visualViewport.overrides;window.dispatchEvent(new Event('resize'));});
    await page.setViewportSize({width:390,height:844});await page.locator('#rotate').waitFor({state:'visible'});
    await page.setViewportSize({width:844,height:390});await page.locator('#rotate').waitFor({state:'hidden'});
    assert.equal(await page.evaluate(()=>sent.filter(a=>a[1]==='StartGame').length),1,'Rotation must not restart the intro');
    assert.deepEqual(errors,[]);
    report.checks.push(engine+': denied fullscreen/orientation APIs, repeated rotation, visualViewport-only resize/scroll and single start passed');
    const laptop=await browser.newPage({viewport:{width:800,height:1000},hasTouch:true,userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36'});
    await laptop.addInitScript(()=>{window.sent=[];window.createUnityInstance=async()=>({SendMessage:(...args)=>sent.push(args)});});
    await laptop.route('https://neon.test/**',route=>route.fulfill({contentType:'text/html',body:template.replace(/<script src="Build\/[^>]+><\/script>/,'')}));
    await laptop.goto('https://neon.test/');await laptop.waitForFunction(()=>sent.some(a=>a[1]==='SetViewport'));
    assert.ok(await laptop.locator('#rotate').isHidden());
    assert.equal(await laptop.evaluate(()=>JSON.parse(sent.filter(a=>a[1]==='SetViewport').at(-1)[2]).touch),false);
    report.checks.push(engine+': touchscreen Windows browser retains desktop mouse layout, including portrait windows');
   }finally{await browser.close();}
  }
  report.passed=true;
 }catch(e){report.failure=e.stack;process.exitCode=1;}
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})();
