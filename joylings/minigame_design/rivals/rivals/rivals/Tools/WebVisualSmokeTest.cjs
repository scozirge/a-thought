// Inspect the real Unity HUD in CSS pixels, including phone safe-area insets.
const {chromium}=require(process.env.RIVALS_PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.resolve(process.env.RIVALS_TEST_OUTPUT||'Logs/VisualRefresh/Visual');fs.mkdirSync(output,{recursive:true});
const url=new URL(process.env.RIVALS_WEB_URL||'http://127.0.0.1:8192/');url.searchParams.set('diagnostics','1');
const result={url:url.href,checks:[],errors:[]},startup=Number(process.env.RIVALS_STARTUP_TIMEOUT_MS||120000);
const scenarios=[
 {name:'phone',width:844,height:390,left:47,right:47,bottom:21},
 {name:'short-phone',width:812,height:303,left:44,right:44,bottom:21},
 {name:'compact-phone',width:568,height:260,left:44,right:44,bottom:34},
 {name:'portrait',width:390,height:844,left:0,right:0,bottom:34},
 {name:'small-portrait',width:320,height:568,left:0,right:0,bottom:0},
 {name:'photo-landscape',width:1280,height:517,left:59,right:59,bottom:21},
];
const overlap=(a,b)=>Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>.5&&Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>.5;
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.RIVALS_CHROME||undefined,headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 try{
  for(const mobile of [false,true]){
   const context=await browser.newContext(mobile?{viewport:{width:844,height:390},hasTouch:true,isMobile:true,deviceScaleFactor:2}:{viewport:{width:1440,height:1000},deviceScaleFactor:1.5});
   const page=await context.newPage();page.on('pageerror',error=>result.errors.push(error.message));page.on('console',message=>{if(/^(?:\w*Exception|RuntimeError):/.test(message.text()))result.errors.push(message.text());});
   await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:startup});await page.waitForFunction(()=>window.rivalsLobbyState?.ready&&!window.rivalsLobbyState.busy,null,{timeout:startup});
   await page.screenshot({path:path.join(output,mobile?'phone-lobby.png':'desktop-lobby.png')});
   await page.locator('#create-room').click();await page.waitForFunction(()=>window.rivalsDiagnostics?.phase===2,null,{timeout:60000});
   if(!mobile){
    const box=await page.locator('canvas').boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await page.waitForTimeout(200);
    const s=await page.evaluate(()=>rivalsDiagnostics),local=s.players.find(p=>p.seat===s.localSeat),friend=s.players.find(p=>p.bot&&p.team===local.team&&p.health>0&&p.distance>2&&p.distance<14);
    if(friend){const yaw=Math.atan2(friend.position.x-local.position.x,friend.position.z-local.position.z)*180/Math.PI;await page.evaluate(({yaw,look})=>document.dispatchEvent(new MouseEvent('mousemove',{movementX:(((yaw-look.x+540)%360)-180)/.12,movementY:-look.y/.12,bubbles:true})),{yaw,look:s.look});await page.waitForTimeout(180);await page.screenshot({path:path.join(output,'desktop-player-visibility.png')});}
    await page.screenshot({path:path.join(output,'desktop-battle.png')});
    await page.keyboard.press('Escape');await page.waitForTimeout(160);await page.screenshot({path:path.join(output,'desktop-pause.png')});
    await page.evaluate(()=>player.SendMessage('RIVALS Session','WebControlCommand','resume'));
   }
   for(const scenario of mobile?scenarios:[{name:'desktop',width:1440,height:1000,left:0,right:0,bottom:0},{name:'small-desktop',width:1024,height:768,left:0,right:0,bottom:0}]){
    await page.setViewportSize({width:scenario.width,height:scenario.height});
    await page.evaluate(s=>{const controls=document.getElementById('touch-controls');controls.style.setProperty('--safe-left',s.left+'px');controls.style.setProperty('--safe-right',s.right+'px');controls.style.setProperty('--safe-bottom',s.bottom+'px');const probe=document.getElementById('viewport-safe-area');probe.style.padding=`0px ${s.right}px ${s.bottom}px ${s.left}px`;updateHudViewport();},scenario);
    await page.waitForFunction(()=>{const s=window.rivalsDiagnostics,b=document.querySelector('canvas').getBoundingClientRect(),scale=window.rivalsTouch.mode?1:Math.max(1,Math.min(1.35,b.height/800));return s&&Math.abs(s.hudWidth-b.width/scale)<2&&Math.abs(s.hudHeight-b.height/scale)<2;},null,{timeout:12000});await page.waitForTimeout(250);
    const state=await page.evaluate(()=>{const s=rivalsDiagnostics,c=document.querySelector('canvas').getBoundingClientRect(),scale=c.width/s.hudWidth;return {phase:s.phase,health:s.players.find(p=>p.seat===s.localSeat).health,canvas:{x:c.x,y:c.y,width:c.width,height:c.height},hud:['hudScore','hudHealth','hudAmmo'].map(name=>{const r=s[name];return{id:name,x:c.x+r.x*scale,y:c.y+r.y*scale,width:r.width*scale,height:r.height*scale};}),buttons:[...document.querySelectorAll('#touch-controls button,#game-toolbar button')].filter(e=>!e.hidden&&e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return{id:e.id,x:r.x,y:r.y,width:r.width,height:r.height,font:parseFloat(getComputedStyle(e).fontSize)};})};});
    assert.equal(state.phase,2);assert.ok(state.health>0,'layout requires live HUD');
    for(const rect of state.hud){assert.ok(rect.x>=state.canvas.x&&rect.y>=state.canvas.y&&rect.x+rect.width<=state.canvas.x+state.canvas.width+.5&&rect.y+rect.height<=state.canvas.y+state.canvas.height+.5,scenario.name+' HUD outside canvas '+JSON.stringify(rect));for(const button of state.buttons)assert.ok(!overlap(rect,button),scenario.name+' HUD/control overlap '+JSON.stringify({rect,button}));}
    assert.ok(!overlap(state.hud[1],state.hud[2]));for(const button of state.buttons)assert.ok(button.font>=14,scenario.name+' small button font '+button.id);
    await page.screenshot({path:path.join(output,scenario.name+'-battle.png')});result.checks.push({name:scenario.name,...state});console.log('VISUAL_LAYOUT_OK '+scenario.name);
   }
   await context.close();
  }
  assert.deepEqual(result.errors,[]);result.ok=true;console.log('WEB_VISUAL_OK '+result.checks.length);
 }catch(error){result.ok=false;result.error=error.stack;throw error;}
 finally{await browser.close();fs.writeFileSync(path.join(output,'visual-check.json'),JSON.stringify(result,null,2));}
})().catch(error=>{console.error(error);process.exitCode=1;});
