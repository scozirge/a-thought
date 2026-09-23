// Requires Playwright. RIVALS_PLAYWRIGHT_MODULE and RIVALS_CHROME can point to
// an existing installation; RIVALS_WEB_URL defaults to the local Web build.
const {chromium}=require(process.env.RIVALS_PLAYWRIGHT_MODULE||'playwright');
const {enterRoom}=require('./WebRoomHelpers.cjs');
const fs=require('fs'),path=require('path');
const root=process.env.RIVALS_TEST_OUTPUT?path.resolve(process.env.RIVALS_TEST_OUTPUT):path.resolve(__dirname,'../Logs'),runs=[],results={url:process.env.RIVALS_WEB_URL||'http://127.0.0.1:8184/',testedAt:new Date().toISOString()},lagged=process.argv.includes('--lag');
fs.mkdirSync(root,{recursive:true});
const me=s=>s.players.find(p=>p.seat===s.localSeat);
const room='連線測試'+Date.now().toString(36);
const nameSuffix=Date.now().toString(36).slice(-5);
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.RIVALS_CHROME||undefined,headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 const state=r=>r.page.evaluate(()=>window.rivalsDiagnostics);
 async function wait(r,predicate,label,seconds=45){let end=Date.now()+seconds*1000;while(Date.now()<end){const s=await state(r);if(s?.players&&predicate(s))return s;await r.page.waitForTimeout(40);}throw Error(label+' timeout');}
 async function open(name){
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),r={name,page,context,errors:[],logs:[]};runs.push(r);
  if(lagged&&name==='client')await page.addInitScript(()=>{
    // Browser-only impairment: delay both directions of each WebSocket frame.
    // Copy outgoing memory views because Unity may reuse their backing buffers.
    const Native=window.WebSocket,delayed=new WeakSet();
    window.WebSocket=class extends Native {
      constructor(...args){super(...args);this.addEventListener('message',event=>{
        if(delayed.has(event))return;event.stopImmediatePropagation();
        const copy=new MessageEvent('message',{data:event.data,origin:event.origin,lastEventId:event.lastEventId});delayed.add(copy);
        setTimeout(()=>{if(this.readyState===Native.OPEN)this.dispatchEvent(copy);},90);
      });}
      send(data){const copy=ArrayBuffer.isView(data)?new Uint8Array(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)):data instanceof ArrayBuffer?data.slice(0):data;
        setTimeout(()=>{if(this.readyState===Native.OPEN)super.send(copy);},90);
      }
    };
  });
  page.on('pageerror',e=>r.errors.push(e.message));page.on('console',m=>r.logs.push(m.text()));
  await page.addInitScript(()=>document.addEventListener('mousedown',e=>{if(e.button===0)window.rivalsTriggerTime=performance.now();},true));
  const url=new URL(process.env.RIVALS_WEB_URL||'http://127.0.0.1:8184/');url.searchParams.set('diagnostics','1');
  await page.goto(url.href);await page.waitForFunction(()=>window.rivalsLobbyState?.ready&&!window.rivalsLobbyState.busy,null,{timeout:120000});
  return r;
 }
 try{
  const host=await open('host'),client=await open('client');
  await Promise.all([enterRoom(host.page,{room,name:'網測'+nameSuffix,create:true}),enterRoom(client.page,{room,name:'訪客'+nameSuffix,create:false})]);
  await wait(host,s=>s.players.filter(p=>!p.bot).length===2,'two humans');
  await client.page.bringToFront();const box=await client.page.locator('#unity-canvas').boundingBox();await client.page.mouse.click(box.x+box.width*.5,box.y+box.height*.5,{delay:90});await client.page.waitForTimeout(250);
  // Stand behind spawn cover while exercising the network, away from the now
  // lethal central shotgun/sniper pickups.
  await client.page.keyboard.down('d');await client.page.waitForTimeout(1600);await client.page.keyboard.up('d');
  let s=await state(client);if(s.server)throw Error('Expected client');
  await client.page.evaluate(pitch=>document.dispatchEvent(new MouseEvent('mousemove',{movementX:0,movementY:(-70-pitch)/.12,bubbles:true})),s.look.y);
  await wait(client,s=>Math.abs(s.look.y+70)<.5,'aim upward');
  await client.page.waitForTimeout(700);
  const initial=await state(client),initialShots=me(initial).shots;
  results.clicks=[];
  for(let i=0;i<8;i++){
   const before=await client.page.evaluate(()=>window.rivalsShotEvents?.length||0);await client.page.mouse.down();
   await client.page.waitForFunction(n=>(window.rivalsShotEvents?.length||0)>n,before,{timeout:1500});await client.page.mouse.up();
   const e=await client.page.evaluate(()=>({delayMs:window.rivalsShotEvents.at(-1).time-window.rivalsTriggerTime,event:window.rivalsShotEvents.at(-1),diagnostics:window.rivalsDiagnostics}));results.clicks.push(e);
   await client.page.waitForTimeout(350);
  }
  await client.page.waitForTimeout(1000);s=await state(client);const shots=me(s).shots;
  if(me(s).visualShots!==shots||shots-initialShots!==8)throw Error('Duplicate or missing presentations: '+JSON.stringify(me(s)));
  await wait(host,h=>h.players.find(p=>p.seat===s.localSeat)?.shots===shots,'host acknowledges shots');
  results.afterShots={client:s,host:await state(host)};
  // Reload is predicted as well; verify the final magazine agrees on both peers.
  await client.page.keyboard.press('r',{delay:60});await wait(client,s=>me(s).ammo===12,'reload');await client.page.waitForTimeout(450);
  const reloaded=await state(client);await wait(host,h=>h.players.find(p=>p.seat===reloaded.localSeat)?.ammo===12,'authoritative reload');
  // A real movement input must be seen smoothly at the other peer.
  await client.page.keyboard.down('d');await client.page.waitForTimeout(1500);await client.page.keyboard.up('d');
  results.afterMovement={client:await state(client),host:await state(host)};
  const moved=me(results.afterMovement.client),remote=results.afterMovement.host.players.find(p=>p.seat===moved.seat);
  if(Math.hypot(moved.position.x-me(initial).position.x,moved.position.z-me(initial).position.z)<4)throw Error('Movement input did not move player');
  // Local prediction leads the host while moving by the network transit time.
  // Bound that lead by measured RTT, then require convergence after releasing.
  const lead=Math.hypot(moved.position.x-remote.position.x,moved.position.z-remote.position.z);
  if(lead>5.5*(results.afterMovement.client.rttMs/1000+.2)+.5)throw Error('Remote movement exceeds latency budget');
  await client.page.waitForTimeout(Math.max(900,results.afterMovement.client.rttMs*2+250));
  results.afterStop={client:await state(client),host:await state(host)};
  const stopped=me(results.afterStop.client),confirmed=results.afterStop.host.players.find(p=>p.seat===stopped.seat);
  const stopError=Math.hypot(stopped.position.x-confirmed.position.x,stopped.position.z-confirmed.position.z);
  if(stopError>.3)throw Error('Movement did not reconcile after release: '+stopError);
  const maxClickMs=Math.max(...results.clicks.map(e=>e.delayMs));if(maxClickMs>100)throw Error('Click feedback too slow '+maxClickMs);
  await client.page.evaluate(()=>document.dispatchEvent(new MouseEvent('mousemove',{movementX:0,movementY:70/.12,bubbles:true})));await client.page.waitForTimeout(300);
  await client.page.locator('#unity-canvas').screenshot({path:path.join(root,'network-web-client.png')});
  await client.context.close();await wait(host,s=>s.players.filter(p=>p.bot).length===7&&s.players.length===8,'bot refill');
  results.summary={clicks:8,maxClickMs,rttMs:results.afterShots.client.rttMs,frameMs:results.afterShots.client.frameMs,shots,visuals:me(results.afterShots.client).visualShots,reload:true,botRefill:true,movingLead:lead,stoppedPositionError:stopError,webSocketDelayEachDirectionMs:lagged?90:0};
 }finally{
  results.runs=runs.map(r=>({name:r.name,errors:r.errors,logs:r.logs}));fs.writeFileSync(path.join(root,lagged?'network-web-lag-check.json':'network-web-check.json'),JSON.stringify(results,null,2));await browser.close();
 }
 if(runs.some(r=>r.errors.length||r.logs.some(x=>/^(InvalidOperationException|NullReferenceException|MissingReferenceException|ArgumentException):/.test(x))))throw Error('Browser runtime errors');
 console.log('WEB_NETWORK_OK '+JSON.stringify(results.summary));
})().catch(e=>{console.error(e);process.exit(1)});
