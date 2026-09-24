// Reproduce landscape safe-area overlap in Chromium and WebKit without Unity.
const {chromium,webkit}=require(process.env.RIVALS_PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.resolve(process.env.RIVALS_TEST_OUTPUT||'Logs/TouchFix');fs.mkdirSync(output,{recursive:true});
const source=fs.readFileSync(path.join(__dirname,'../Assets/WebGLTemplates/Rivals/index.html'),'utf8');
const html=source.slice(0,source.indexOf('    const config='))+`
    player={SendMessage:(name,method,action)=>{if(method==='WebControlCommand'){
      if(action==='pause'){look.enabled=false;look.release();touch.setState(6);}
      if(action==='resume'){touch.setState(3);look.enabled=true;look.resume();}
    }}};
    window.startTestGame=()=>{window.rivalsReceiveLobby({visible:false});touch.setState(3);look.enabled=true;look.resume();};
    document.getElementById('loading').hidden=true;document.getElementById('loading').style.display='none';
    window.startTestGame();
  </script></body></html>`;
const checks=[],engines=process.argv.includes('--chromium-only')?[['chromium',chromium]]:[['chromium',chromium],['webkit',webkit]];
const scenarios=[
 {name:'photo-landscape',width:1280,height:517,left:59,right:59,bottom:21},
 {name:'iphone-landscape',width:844,height:390,left:47,right:47,bottom:21},
 {name:'short-browser',width:812,height:303,left:44,right:44,bottom:21},
 {name:'small-landscape',width:667,height:300,left:0,right:0,bottom:0},
 {name:'compact-safe-area',width:568,height:260,left:44,right:44,bottom:34},
 {name:'portrait',width:390,height:844,left:0,right:0,bottom:34},
 {name:'small-portrait',width:320,height:568,left:0,right:0,bottom:0},
];
(async()=>{
 for(const [engine,type] of engines){
  const browser=await type.launch({headless:true,...(engine==='chromium'?{executablePath:process.env.RIVALS_CHROME||undefined}:{})});
  try{
   const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true,deviceScaleFactor:1}),page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));await page.route('http://rivals.test/**',route=>route.fulfill({contentType:'text/html',body:html}));await page.goto('http://rivals.test/');
   // Force the touch choice in engines whose desktop test device has no coarse pointer.
   await page.evaluate(()=>{chooseControls('touch');startTestGame();});
   for(const scenario of scenarios){
    await page.setViewportSize({width:scenario.width,height:scenario.height});
    await page.locator('#touch-controls').evaluate((element,s)=>{element.style.setProperty('--safe-left',s.left+'px');element.style.setProperty('--safe-right',s.right+'px');element.style.setProperty('--safe-bottom',s.bottom+'px');},scenario);
    await page.waitForTimeout(60);
    const rects=await page.evaluate(()=>[...document.querySelectorAll('#touch-controls button,#game-toolbar button')].filter(e=>!e.hidden).map(e=>{const b=e.getBoundingClientRect();return{id:e.id,x:b.x,y:b.y,width:b.width,height:b.height};}));
    assert.equal(rects.length,8);assert.equal(await page.locator('#touch-slide').count(),0);assert.equal(await page.locator('#control-resume').isVisible(),false);
    for(let i=0;i<rects.length;i++){
     const a=rects[i];assert.ok(a.x>=0&&a.y>=0&&a.x+a.width<=scenario.width+.1&&a.y+a.height<=scenario.height+.1,engine+' '+scenario.name+' outside viewport: '+a.id);
     if(!['touch-menu','fullscreen'].includes(a.id)){assert.ok(a.width>=48&&a.height>=48);assert.ok(a.x>=scenario.left&&a.x+a.width<=scenario.width-scenario.right+.1);}
     for(const b of rects.slice(i+1)){const x=Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x),y=Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y);assert.ok(x<=0||y<=0,engine+' '+scenario.name+' overlap: '+JSON.stringify({a,b}));}
    }
    await page.screenshot({path:path.join(output,engine+'-'+scenario.name+'.png')});checks.push({engine,scenario:scenario.name,rects});
   }
   await page.setViewportSize({width:844,height:390});
   await page.locator('#touch-aim').tap();assert.equal(await page.locator('#touch-aim').getAttribute('aria-pressed'),'true');await page.locator('#touch-fire').tap();assert.equal(await page.evaluate(()=>rivalsTouch.held&2),2);await page.locator('#touch-aim').tap();assert.equal(await page.evaluate(()=>rivalsTouch.held&2),0);
   await page.locator('#touch-aim').tap();await page.locator('#fullscreen').focus();assert.equal(await page.locator('#control-resume').isVisible(),false);assert.equal(await page.evaluate(()=>rivalsTouch.held),0);
   await page.locator('#touch-fire').tap();assert.equal(await page.evaluate(()=>rivalsLook.active),true);assert.equal(await page.evaluate(()=>rivalsTouch.firePress),1);
   await page.evaluate(()=>{const stage=document.getElementById('stage');stage.requestFullscreen=undefined;stage.webkitRequestFullscreen=undefined;});
   await page.locator('#fullscreen').tap();assert.equal(await page.locator('#stage').evaluate(e=>e.classList.contains('expanded')),true);assert.equal(await page.locator('#control-resume').isVisible(),false);await page.locator('#fullscreen').tap();assert.equal(await page.locator('#stage').evaluate(e=>e.classList.contains('expanded')),false);
   assert.deepEqual(errors,[]);console.log('MOBILE_LAYOUT_ENGINE_OK '+engine+' layouts='+scenarios.length+' aim-toggle resume fullscreen-fallback');
  }finally{await browser.close();}
 }
 fs.writeFileSync(path.join(output,'mobile-layout-check.json'),JSON.stringify({ok:true,checks},null,2));console.log('MOBILE_LAYOUT_OK '+checks.length);
})().catch(error=>{fs.writeFileSync(path.join(output,'mobile-layout-check.json'),JSON.stringify({ok:false,checks,error:error.stack},null,2));console.error(error);process.exitCode=1;});
