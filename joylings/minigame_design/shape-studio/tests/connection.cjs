const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {chromium,webkit}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const url=process.env.STUDIO_URL||'https://scozirge.github.io/little-engineer/';
const duration=Number(process.env.STUDIO_SOAK_SECONDS||600)*1000;
const output=path.resolve(__dirname,'../artifacts/connection');
fs.mkdirSync(output,{recursive:true});
const events=[],clients=[],errors=[],syncTimes=[];
const record=(name,data={})=>{const row={time:new Date().toISOString(),name,...data};events.push(row);console.log(JSON.stringify(row));};
const wait=(p,fn,arg,timeout=45000)=>p.page.waitForFunction(fn,arg,{timeout});
const view=p=>p.page.evaluate(()=>roomView);
const pause=ms=>new Promise(r=>setTimeout(r,ms));
let ownRoom=false,roomSince=0,unexpected=[];

async function open(browser,name,mobile=false){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1080,height:830},isMobile:mobile,hasTouch:mobile});
  const page=await context.newPage();
  const p={context,page,name,mobile,expectedOffline:false};clients.push(p);
  await page.exposeFunction('connectionEvent',e=>{
    events.push({time:new Date().toISOString(),player:name,expected:p.expectedOffline,...e});
    if(ownRoom&&!p.expectedOffline&&e.kind==='disconnect')unexpected.push(name);
  });
  await page.addInitScript(()=>{
    let ui;Object.defineProperty(window,'paperStudio',{get:()=>ui,set(value){
      ui=value;const render=ui.view;
      window.transitions=[];
      ui.view=v=>{
        const old=window.roomView;window.roomView=v;render(v);
        if(old?.connected&&!v.connected)window.connectionEvent({kind:'disconnect',phase:v.phase});
        if(v.phase==='reveal'&&window.transitions.at(-1)?.slide!==v.slide)window.transitions.push({round:v.round,slide:v.slide,time:Date.now()});
      };
    }});
  });
  page.on('pageerror',e=>{errors.push({player:name,message:e.message});record('pageerror',{player:name,message:e.message});});
  page.on('console',m=>{if(/Exception|failed|disconnect|shutdown/i.test(m.text()))events.push({player:name,kind:'console',text:m.text().slice(0,400),time:new Date().toISOString()});});
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await wait(p,()=>window.roomView?.phase==='home'&&!document.querySelector('#join').disabled,null,120000);
  if(browser.browserType()===chromium){p.cdp=await context.newCDPSession(page);await p.cdp.send('Emulation.setFocusEmulationEnabled',{enabled:true});}
  return p;
}
async function roster(players,count,phase='draw'){
  await Promise.all(players.map(async p=>{
    await wait(p,({count,phase})=>roomView.connected&&roomView.phase===phase&&roomView.people.filter(x=>x.online).length===count,{count,phase});
    const v=await view(p),online=v.people.filter(x=>x.online);
    assert.equal(new Set(online.map(x=>x.id)).size,count);
    assert.equal(new Set(online.map(x=>x.avatar)).size,count);
    assert.equal(await p.page.locator('#who').innerText(),count+' 位師傅');
    if(!v.host){assert.ok(online.some(x=>x.id===v.me));assert.equal(v.original,phase==='reveal'?v.original:'');}
    return online;
  }));
  // Each artist's own mark acknowledgement can precede the next artist's update.
  // Wait for the actual host roster to arrive, with a bounded network latency.
  const expected=JSON.stringify((await view(players[0])).people.map(x=>[x.id,x.avatar,x.online,x.done]));
  const started=Date.now();
  await Promise.all(players.slice(1).map(p=>wait(p,expected=>
    JSON.stringify(roomView.people.map(x=>[x.id,x.avatar,x.online,x.done]))===expected,expected,3000)));
  syncTimes.push(Date.now()-started);
}
async function stroke(p,seed=0){
  await p.page.locator('#unity-canvas').scrollIntoViewIfNeeded();
  const b=await p.page.locator('#unity-canvas').boundingBox(),shift=(seed%6)*.04;
  const pts=[[.18,.2+shift],[.32,.5+shift],[.55,.25+shift],[.74,.52+shift]].map(([x,y])=>({x:b.x+x*b.width,y:b.y+y*b.height}));
  if(p.mobile&&p.cdp){
    await p.cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pts[0]]});
    for(const pt of pts.slice(1))await p.cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[pt]});
    await p.cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }else{
    await p.page.mouse.move(pts[0].x,pts[0].y);await p.page.mouse.down();
    for(const pt of pts.slice(1))await p.page.mouse.move(pt.x,pt.y,{steps:3});
    await p.page.mouse.up();
  }
}
async function ink(p){
  const png=await p.page.locator('#unity-canvas').screenshot();
  const pixels=await p.page.evaluate(async data=>{
    const im=new Image();im.src='data:image/png;base64,'+data;await im.decode();
    const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.drawImage(im,0,0,128,128);
    const raw=ctx.getImageData(12,12,104,88).data;let count=0;
    for(let i=0;i<raw.length;i+=4)if(Math.min(raw[i],raw[i+1],raw[i+2])<220)count++;
    return {count,bytes:btoa(String.fromCharCode(...raw))};
  },png.toString('base64'));
  return {count:pixels.count,hash:crypto.createHash('sha256').update(pixels.bytes).digest('hex')};
}
async function mark(p,value){
  await wait(p,()=>!roomView.markPending);
  if((await view(p)).done!==value){await p.page.click('#mark');await wait(p,v=>roomView.done===v&&!roomView.markPending,value);}
}
async function join(p){
  const start=Date.now();await p.page.click('#join');
  await wait(p,()=>roomView.connected&&roomView.me>0&&roomView.phase==='draw');
  p.expectedOffline=false;return Date.now()-start;
}
async function rejoin(p,host,{reload=false,rename=false}={}){
  const before=await view(p),art=await ink(p),token=await p.page.evaluate(()=>sessionStorage.getItem('shape-studio-seat'));
  p.expectedOffline=true;
  if(reload){
    await p.page.reload({waitUntil:'domcontentloaded'});
    await wait(p,()=>window.roomView?.phase==='home'&&!document.querySelector('#join').disabled,null,120000);
  }else{
    await p.page.click('#leave');await wait(p,()=>roomView.phase==='home'&&!roomView.busy);
    await wait(host,id=>roomView.people.some(x=>x.id===id&&!x.online),before.me);
    if(rename){await p.page.click('#identity');await wait(p,old=>roomView.identity!==old,before.identity);}
  }
  const elapsed=await join(p);await p.page.waitForTimeout(350);
  const after=await view(p);
  assert.equal(after.me,before.me,p.name+' 重進應沿用座位');
  assert.equal(after.done,before.done,p.name+' 重進應保留勾選');
  if(!rename)assert.equal(after.identity,before.identity,p.name+' 重進應保留身分');
  else assert.notEqual(after.identity,before.identity,p.name+' 換名字後應顯示新身分');
  const label=await p.page.evaluate(()=>document.querySelector('#avatar').textContent+' '+document.querySelector('#name').textContent);
  assert.equal(await p.page.locator('#self-id').innerText(),'你是師傅 · '+label);
  assert.equal(await p.page.evaluate(()=>sessionStorage.getItem('shape-studio-seat')),token);
  assert.equal((await ink(p)).hash,art.hash,p.name+' 重進應保留完整作品');
  await roster(clients,5);
  record(reload?'重新整理後重進通過':'退出重進通過',{player:p.name,renamed:rename,joinMs:elapsed,id:after.me});
}

async function run(){
  const chrome=await chromium.launch({channel:'chrome',args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
  const wk=await webkit.launch();let host;
  try{
    host=await open(wk,'出題者',true);
    const artists=[];for(let i=0;i<5;i++)artists.push(await open(chrome,'師傅'+(i+1),i===1||i===3));
    const probe=artists[0];await probe.page.click('#join');
    await wait(probe,()=>roomView.me>0||(roomView.phase==='home'&&!roomView.busy&&!document.querySelector('#toast').hidden&&/開房/.test(document.querySelector('#toast').textContent)));
    if((await view(probe)).me>0){await probe.page.click('#leave');throw Error('教室已有玩家，已退出；不接手或中斷現有課堂');}
    await host.page.tap('#host');await wait(host,()=>roomView.host&&roomView.phase==='wait');ownRoom=true;
    await Promise.all(artists.map(async p=>{await p.page.click('#join');await wait(p,()=>roomView.me>0&&roomView.phase==='wait');}));
    await roster(clients,5,'wait');roomSince=Date.now();
    const initial=await view(host);record('六人同房成功',{total:6,artists:initial.people,hostBrowser:'WebKit',artistBrowser:'Chrome',url});
    await host.page.tap('#start');await roster(clients,5);
    await Promise.all(artists.map(async(p,i)=>{await p.page.locator('[data-chalk="'+(i+1)+'"]').click();await stroke(p,i);await mark(p,true);assert.ok((await ink(p)).count>40);}));
    await wait(host,()=>roomView.people.every(x=>x.done));await roster(clients,5);
    record('五位師傅同時作畫與完成勾選同步');
    for(const p of artists)await rejoin(p,host);
    for(const p of artists){await mark(p,false);await stroke(p,3);await p.page.waitForTimeout(900);await rejoin(p,host,{rename:true});}
    for(const p of [artists[0],artists[1]])await rejoin(p,host,{reload:true});
    // Exercise the last unflushed stroke, rather than only drawings saved by the done checkbox.
    for(let i=0;i<3;i++){
      const p=artists[2];await p.page.click('#clear');await mark(p,true);await mark(p,false);
      await stroke(p,i);await rejoin(p,host);
    }
    const saved=await Promise.all(artists.map(async p=>({view:await view(p),ink:await ink(p)})));
    await Promise.all(artists.map(async p=>{p.expectedOffline=true;await p.page.click('#leave');await wait(p,()=>roomView.phase==='home'&&!roomView.busy);}));
    await wait(host,()=>roomView.people.every(x=>!x.online));
    await Promise.all(artists.map(p=>join(p)));await roster(clients,5);
    for(let i=0;i<artists.length;i++){
      const v=await view(artists[i]);assert.equal(v.me,saved[i].view.me);assert.equal(v.identity,saved[i].view.identity);
      assert.equal(v.done,saved[i].view.done);assert.equal((await ink(artists[i])).hash,saved[i].ink.hash);
    }
    record('五位師傅同時離房再同時加入，座位、作品與狀態全數保留');
    let sample=0;
    while(Date.now()-roomSince<duration){
      await roster(clients,5);assert.deepEqual(unexpected,[],'非預期斷線');
      const p=artists[sample%artists.length];await mark(p,false);await stroke(p,sample);await mark(p,true);
      await wait(host,id=>roomView.people.some(x=>x.id===id&&x.done),(await view(p)).me);
      sample++;record('連線穩定觀察',{seconds:Math.round((Date.now()-roomSince)/1000),online:6,sample});
      await pause(Math.min(30000,Math.max(0,duration-(Date.now()-roomSince))));
    }
    await Promise.all(artists.map(p=>mark(p,true)));
    await host.page.tap('#end');
    await Promise.all(clients.map(p=>wait(p,()=>roomView.phase==='reveal'&&roomView.slide===-1&&document.querySelectorAll('#gallery img').length===6,null,45000)));
    const ids=(await view(host)).showOrder;
    for(const p of clients){
      const v=await view(p);assert.equal(v.showOrder.length,5);assert.deepEqual(v.showOrder,ids);
      assert.ok(v.original);assert.ok(v.people.every(x=>x.drawn&&x.done));
      // WebKit and Chrome encode PNG files differently; compare decoded pixels.
      const pictures=await p.page.locator('#gallery img').evaluateAll(items=>Promise.all(items.map(async im=>{
        await im.decode();const c=document.createElement('canvas');c.width=c.height=256;
        const ctx=c.getContext('2d');ctx.drawImage(im,0,0);
        const hash=await crypto.subtle.digest('SHA-256',ctx.getImageData(0,0,256,256).data);
        return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
      })));
      if(p===host)host.pictures=pictures;else assert.deepEqual(pictures,host.pictures,'六端完整作品應一致');
      assert.deepEqual(await p.page.evaluate(()=>transitions.map(x=>x.slide)),[-2,0,1,2,3,4,-1]);
    }
    record('六端作品牆一致，原圖與五張作品輪流展示完整');
    await host.page.screenshot({path:path.join(output,'six-player-gallery.png'),fullPage:true});
    await host.page.locator('button.tile:not(.original)').first().tap();await host.page.tap('#confirm-pick');
    await Promise.all(clients.map(p=>wait(p,()=>roomView.phase==='draw'&&roomView.round===2)));
    for(const p of artists){assert.equal((await view(p)).done,false);assert.equal((await ink(p)).count,0);}
    record('公布得獎後六端同步進下一輪，畫紙與勾選皆清空');
    for(const p of clients)p.expectedOffline=true;
    host.page.once('dialog',d=>d.accept());await host.page.tap('#leave');
    await Promise.all(clients.map(p=>wait(p,()=>roomView.phase==='home'&&!roomView.busy,null,65000)));
    ownRoom=false;assert.deepEqual(unexpected,[]);assert.deepEqual(errors,[]);
    record('房主關房後所有師傅正常返回首頁');
    await host.page.tap('#host');await wait(host,()=>roomView.host&&roomView.phase==='wait');ownRoom=true;
    await Promise.all(artists.map(async p=>{await p.page.click('#join');await wait(p,()=>roomView.phase==='wait'&&roomView.me>0);p.expectedOffline=false;}));
    host.expectedOffline=false;await roster(clients,5,'wait');await host.page.tap('#start');await roster(clients,5);
    for(const p of artists)assert.equal((await ink(p)).count,0);
    record('關房後重新開房，六人再次入房及開始新回合通過');
    assert.deepEqual(unexpected,[]);assert.deepEqual(errors,[]);
    record('PASS',{durationSeconds:Math.round((Date.now()-roomSince)/1000),simultaneousPlayers:6,rejoins:20,unexpectedDisconnects:0,maxRosterSyncMs:Math.max(...syncTimes)});
  }catch(e){
    record('FAIL',{message:e.message,stack:e.stack});
    for(const p of clients){try{const v=await view(p);record('failure-view',{player:p.name,view:{...v,original:v.original?'[原圖 '+v.original.length+' 字元]':''}});await p.page.screenshot({path:path.join(output,'failure-'+p.name+'.png')});}catch{}}
    throw e;
  }finally{
    if(ownRoom&&host){try{for(const p of clients)p.expectedOffline=true;if((await view(host)).host){host.page.once('dialog',d=>d.accept());await host.page.locator('#leave').click({timeout:5000});await wait(host,()=>roomView.phase==='home',null,15000);}}catch{}}
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(events,null,2));
    await Promise.all([chrome.close(),wk.close()]);
  }
}
run().catch(e=>{console.error(e.message);process.exitCode=1;});
