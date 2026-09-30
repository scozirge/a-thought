// Run the actual menu/armory HTML in Chromium and WebKit with touch input.
const {chromium,webkit}=require(process.env.RIVALS_PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.resolve(process.env.RIVALS_TEST_OUTPUT||'Logs/Training/Menu');fs.mkdirSync(output,{recursive:true});
const source=fs.readFileSync(path.join(__dirname,'../Assets/WebGLTemplates/Rivals/index.html'),'utf8');
const html=source.slice(0,source.indexOf('    const config='))+`
    window.commands=[];let selectedWeapon=1;
    player={SendMessage:(name,method,action)=>{commands.push({method,action});
      if(method==='LobbyCommand'&&JSON.parse(action).action==='training'){window.rivalsReceiveLobby({visible:false,training:true});touch.setState(3|(selectedWeapon<<4));look.enabled=true;look.resume();}
      if(method==='WebControlCommand'){
        if(action==='pause'){look.enabled=false;look.release();touch.setState(6|(selectedWeapon<<4));}
        if(action.startsWith('training-select:'))selectedWeapon=Number(action.split(':')[1]);
        if(action==='resume'){touch.setState(3|(selectedWeapon<<4));look.enabled=true;look.resume();}
      }
    }};
    document.getElementById('loading').style.display='none';
    window.rivalsReceiveLobby({visible:true,ready:false,busy:true,canTrain:true,name:'訓練測試',message:'連線中',rooms:[]});
  </script></body></html>`;
const results=[];
(async()=>{
 for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await engine.launch({headless:true,...(name==='chromium'?{executablePath:process.env.RIVALS_CHROME||undefined}:{})});
  try{
   for(const [width,height] of [[844,390],[812,303],[568,260],[390,844],[320,568],[1280,720]]){
    const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true});const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));await page.route('http://training.test/**',r=>r.fulfill({status:200,contentType:'text/html',body:html}));await page.goto('http://training.test/');
    assert.equal(await page.locator('#create-room').isDisabled(),true);assert.equal(await page.locator('#training-entry').isDisabled(),false);
    await page.evaluate(()=>rivalsReceiveLobby({visible:true,ready:false,busy:false,canTrain:true,name:'訓練測試',message:'連線中',rooms:[]}));await page.locator('#mode-touch').tap();
    const entry=page.locator('#training-entry');await entry.scrollIntoViewIfNeeded();const ordering=await page.evaluate(()=>document.querySelector('.lobby-layout').getBoundingClientRect().bottom<=document.querySelector('#training-entry').getBoundingClientRect().top);assert.ok(ordering,'training entry below main menu');
    await entry.tap();assert.equal(await page.locator('#training-weapons').isVisible(),true);
    for(const kind of [1,3,4,0,5,6,7,2,8]){
      await page.locator('#training-weapons').tap();assert.equal(await page.locator('#touch-pause').isVisible(),false);assert.equal(await page.locator('#touch-controls').isVisible(),false);
      const button=page.locator('[data-weapon="'+kind+'"]');await button.scrollIntoViewIfNeeded();const box=await button.boundingBox();assert.ok(box.width>=100&&box.height>=48);
      await button.tap();assert.equal(await page.locator('#training-armory').isVisible(),false);assert.equal(await page.evaluate(()=>rivalsTouch.weapon),kind);
      assert.equal(await page.locator('#touch-fire').textContent(),kind===2?'揮砍':kind===7?'標記':kind===8?'投擲':'射擊');
      const commands=await page.evaluate(()=>window.commands.filter(c=>c.action==='training-select:'+rivalsTouch.weapon));assert.equal(commands.length,1,'one command per touch');
    }
    await page.locator('#training-weapons').tap();await page.screenshot({path:path.join(output,name+'-'+width+'x'+height+'.png')});await page.locator('#armory-close').tap();
    assert.equal(await page.locator('#touch-controls').isVisible(),true,JSON.stringify(await page.evaluate(()=>({touch:window.rivalsTouch,commands:commands.slice(-6)}))));assert.deepEqual(errors,[]);results.push({engine:name,width,height,weapons:9});await context.close();
   }
  }finally{await browser.close();}
 }
 fs.writeFileSync(path.join(output,'training-menu-check.json'),JSON.stringify({ok:true,checks:results},null,2));console.log('TRAINING_MENU_OK '+results.length);
})().catch(error=>{console.error(error);process.exitCode=1;});
