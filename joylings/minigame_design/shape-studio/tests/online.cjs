const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const url=process.env.STUDIO_URL||'http://127.0.0.1:18136/';
const output=path.resolve(__dirname,'../artifacts/online');
fs.mkdirSync(output,{recursive:true});
const logs=[];
const record=(name,data={})=>{logs.push({time:new Date().toISOString(),name,...data});console.log(name);};
async function open(browser,name,mobile=false) {
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1080,height:830},isMobile:mobile,hasTouch:mobile});
  const page=await context.newPage();
  page.on('console',m=>{if(/Exception|error|failed|shutdown|disconnect|joined room/i.test(m.text()))record(name+' console',{text:m.text().slice(0,320)});});
  page.on('pageerror',e=>record('pageerror',{name,error:e.message}));
  page.on('websocket',socket=>record(name+' socket',{address:new URL(socket.url()).host}));
  const cdp=await context.newCDPSession(page);
  await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:true});
  // Observe only the WebGL view events already sent to the player's browser.
  await page.addInitScript(()=>{
    let ui;Object.defineProperty(window,'paperStudio',{get:()=>ui,set(value){
      ui=value;const render=ui.view;
      ui.view=v=>{window.roomView=v;render(v);};
    }});
  });
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.roomView && !document.getElementById('join').disabled,null,{timeout:120000});
  return {context,page,cdp,name};
}
const view=p=>p.page.evaluate(()=>window.roomView);
const wait=(p,fn,arg,ms=45000)=>p.page.waitForFunction(fn,arg,{timeout:ms});
async function snapshot(p,file){await p.page.screenshot({path:path.join(output,file+'.png')});}
async function inkPixels(p){
  const png=await p.page.locator('#unity-canvas').screenshot();
  return p.page.evaluate(async data=>{
    const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();
    const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
    const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
    // Sample the drawing area. Frame decorations and transient join notifications sit at the edges.
    const rgba=ctx.getImageData(Math.floor(img.width*.1),Math.floor(img.height*.1),Math.floor(img.width*.8),Math.floor(img.height*.65)).data;
    let n=0;for(let i=0;i<rgba.length;i+=4)if(rgba[i]<80 && rgba[i+1]<100)n++;
    return n;
  },png.toString('base64'));
}
async function stroke(p,mobile=false) {
  const box=await p.page.locator('#unity-canvas').boundingBox();
  const pts=[[.2,.3],[.4,.25],[.5,.64],[.7,.65]].map(([x,y])=>({x:box.x+x*box.width,y:box.y+y*box.height}));
  if(mobile){
    const touch=(type,points)=>p.cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
    await touch('touchStart',[pts[0]]);for(const pt of pts.slice(1))await touch('touchMove',[pt]);await touch('touchEnd',[]);
  }else{
    await p.page.mouse.move(pts[0].x,pts[0].y);await p.page.mouse.down();
    for(const pt of pts.slice(1))await p.page.mouse.move(pt.x,pt.y,{steps:3});
    await p.page.mouse.up();
  }
}
async function run(){
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
  const players=[];
  try{
    const host=await open(browser,'host'),a=await open(browser,'first'),b=await open(browser,'late',true);
    players.push(host,a,b);
    await snapshot(host,'01-home');const prev=(await view(a)).identity;
    await a.page.click('#identity');await wait(a,n=>roomView.identity!==n,prev);
    await a.page.click('#join');await wait(a,()=>roomView.phase==='home' && !roomView.busy && !document.querySelector('#toast').hidden && /開房/.test(document.querySelector('#toast').textContent));
    record('無房與更換身分');
    await host.page.click('#host');await wait(host,()=>roomView.host && roomView.phase==='wait');
    await b.page.click('#host');await wait(b,()=>roomView.phase==='home'&&!roomView.busy&&!document.querySelector('#toast').hidden);
    await a.page.click('#join');await wait(a,()=>roomView.phase==='wait');await wait(host,()=>roomView.people.length===1);
    await host.page.click('#start');await wait(a,()=>roomView.phase==='draw');const began=Date.now();
    const first=await view(a);
    assert.equal(first.title,'');assert.equal(first.original,'');assert.ok(first.seconds>=177 && first.seconds<=180);
    assert.ok((await view(host)).title);await snapshot(host,'02-host-prompt');
    assert.equal(await inkPixels(a),0);
    await stroke(a);await a.page.waitForTimeout(400);assert.ok(await inkPixels(a)>40);
    await a.page.click('#undo');await a.page.waitForTimeout(400);assert.equal(await inkPixels(a),0);
    await stroke(a);await a.page.waitForTimeout(1100);
    const beforeLeave=(await view(a)).me;await a.page.click('#leave');await wait(a,()=>roomView.phase==='home');
    await a.page.click('#join');await wait(a,()=>roomView.phase==='draw'&&roomView.me>0);
    assert.equal((await view(a)).me,beforeLeave);await a.page.waitForTimeout(400);
    assert.ok(await inkPixels(a)>40);
    record('原圖私密、畫圖、復原、離房再加入取回筆跡');
    await b.page.click('#join');await wait(b,()=>roomView.phase==='draw');
    const late=await view(b),now=await view(host);assert.equal(late.title,'');assert.ok(late.seconds<180);
    assert.ok(Math.abs(now.seconds-late.seconds)<=2);assert.notEqual(late.identity,(await view(a)).identity);
    assert.equal(await b.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await b.page.locator('[data-tool=tri]').click();await stroke(b,true);await snapshot(b,'03-late-phone');
    record('手機中途加入並以觸控繪圖',{seconds:late.seconds});
    await wait(host,()=>roomView.phase==='reveal',null,195000);
    const elapsed=(Date.now()-began)/1000;assert.ok(elapsed>175 && elapsed<188,'180 秒實時計時：'+elapsed);
    for(const p of players){
      await wait(p,()=>roomView.phase==='reveal'&&document.querySelectorAll('#gallery img').length===3);
      assert.ok((await view(p)).original);
    }
    record('三端同步翻牌，原圖與兩張作品齊全',{elapsed});
    const pick='button.tile:not(.original)';
    await host.page.locator(pick).first().waitFor({state:'visible'});
    assert.equal(await a.page.locator(pick).count(),0);assert.ok(await host.page.locator('#next').isDisabled());
    await host.page.locator(pick).first().click();await wait(b,()=>roomView.winner>0);
    await snapshot(host,'04-gallery');await snapshot(b,'05-phone-gallery');
    await host.page.click('#next');await wait(a,()=>roomView.phase==='draw'&&roomView.round===2);
    assert.ok((await view(host)).host);assert.equal((await view(b)).host,false);
    assert.equal((await view(a)).original,'');assert.equal((await view(a)).winner,-1);
    assert.equal(await inkPixels(a),0);
    host.page.once('dialog',d=>d.accept());await host.page.click('#leave');
    await wait(b,()=>roomView.phase==='home',null,65000);
    record('僅房主可選、身分固定、下一輪清空、房主離開關房');
    assert.ok(!logs.some(e=>e.name==='pageerror'));
  }catch(e){
    for(const p of players){try{await snapshot(p,'failure-'+p.name);record('failure-view',{player:p.name,view:await view(p)});}catch{}}
    throw e;
  } finally{
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(logs,null,2));await browser.close();
  }
}
run().catch(e=>{console.error(e);process.exitCode=1;});
