// Real Photon rooms, browser input, and transport failures; no gameplay setters.
const {chromium}=require(process.env.RIVALS_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const output=process.env.RIVALS_TEST_OUTPUT?path.resolve(process.env.RIVALS_TEST_OUTPUT):path.resolve(__dirname,'../Logs');
const before=process.argv.includes('--before');
const results={url:process.env.RIVALS_WEB_URL||'http://127.0.0.1:8184/',testedAt:new Date().toISOString(),checks:[],runs:[]};
const roomName='連線'+Date.now().toString(36).slice(-6);
fs.mkdirSync(output,{recursive:true});
const errors=/^(?:InvalidOperationException|NullReferenceException|MissingReferenceException|ArgumentException|IndexOutOfRangeException):/;
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.RIVALS_CHROME||undefined,headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
  async function open(name){
    const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
    const run={name,errors:[],logs:[]};results.runs.push(run);
    page.on('pageerror',e=>run.errors.push(e.message));
    page.on('console',m=>{const t=m.text();if(errors.test(t))run.errors.push(t);if(/RIVALS_|Exception:/.test(t))run.logs.push(t);});
    await page.addInitScript(()=>{
      const Native=window.WebSocket;
      window.connectionTest={sockets:[],block:false};
      window.WebSocket=class extends Native{
        constructor(...args){super(...args);window.connectionTest.sockets.push(this);if(window.connectionTest.block)this.addEventListener('open',()=>this.close());}
      };
    });
    const url=new URL(process.env.RIVALS_WEB_URL||'http://127.0.0.1:8184/');url.searchParams.set('diagnostics','1');
    await page.goto(url.href);await lobby(page);return {context,page};
  }
  async function lobby(page){await page.waitForFunction(()=>window.rivalsLobbyState?.visible&&window.rivalsLobbyState.ready&&!window.rivalsLobbyState.busy,null,{timeout:90000});}
  async function playing(page,humans){
    await page.waitForFunction(h=>{
      const s=window.rivalsDiagnostics;
      return !window.rivalsLobbyState?.visible&&s?.players?.length===8&&s.players.filter(p=>!p.bot).length===h&&s.localInputOwners===1;
    },humans,{timeout:90000});
  }
  async function create(page){await lobby(page);await page.locator('#player-name').fill(roomName);await page.locator('#create-room').click();await playing(page,1);}
  async function join(page,name){
    await lobby(page);await page.locator('#player-name').fill(name);
    const row=page.locator('.room-row').filter({has:page.getByText(roomName+'的房間',{exact:true})});
    await row.getByRole('button',{name:'加入房間',exact:true}).click({timeout:30000});await playing(page,2);
  }
  async function leave(page){
    await page.bringToFront();await page.locator('#unity-canvas').focus();await page.keyboard.press('Escape');await page.waitForTimeout(250);
    const box=await page.locator('#unity-canvas').boundingBox();
    await page.mouse.click(box.x+box.width*.5,box.y+box.height*445/720,{delay:80});await lobby(page);
  }
  async function check(name,fn){
    try{await fn();results.checks.push({name,ok:true});console.log('PASS '+name);}
    catch(e){results.checks.push({name,ok:false,error:e.message});if(!before)throw e;console.log('REPRODUCED '+name+': '+e.message);}
  }
  try{
    const host=await open('host'),guest=await open('guest');
    await create(host.page);await join(guest.page,'連線訪客');await playing(host.page,2);
    await check('initial roster has eight unique seats and balanced teams',async()=>{
      const s=await guest.page.evaluate(()=>window.rivalsDiagnostics);
      assert.equal(new Set(s.players.map(p=>p.seat)).size,8);assert.equal(s.players.filter(p=>p.team===0).length,4);
    });
    for(let i=0;i<2;i++){
      await leave(guest.page);await playing(host.page,1);
      await check('lobby clears gameplay diagnostics after leave '+i,async()=>assert.ok(!(await guest.page.evaluate(()=>window.rivalsDiagnostics))?.players));
      await check('leaving preserves the selected player name '+i,async()=>assert.equal(await guest.page.evaluate(()=>window.rivalsLobbyState.name),'連線訪客'));
      await join(guest.page,'連線訪客');await playing(host.page,2);
      await check('leave and rejoin '+i,async()=>assert.equal((await guest.page.evaluate(()=>window.rivalsDiagnostics)).localInputOwners,1));
    }
    // An open settings panel must not hide the lobby after the host disappears.
    await guest.page.bringToFront();await guest.page.locator('#unity-canvas').focus();await guest.page.keyboard.press('F8');await guest.page.waitForTimeout(500);
    if(!before)await guest.page.waitForFunction(()=>window.rivalsDiagnostics?.settingsOpen===true);
    await guest.page.screenshot({path:path.join(output,before?'connection-settings-before.png':'connection-settings.png')});
    await host.context.close();
    await check('host disconnect returns to visible lobby even from settings',()=>lobby(guest.page));
    if(before&&results.checks.at(-1).ok===false){await guest.page.reload();await lobby(guest.page);}
    await check('lobby reconnects after a transport disconnect',async()=>{
      await guest.page.evaluate(()=>{for(const s of window.connectionTest.sockets)if(s.readyState===WebSocket.OPEN)s.close();});
      await guest.page.waitForFunction(()=>!window.rivalsLobbyState.ready,null,{timeout:15000});await lobby(guest.page);
      const sockets=await guest.page.evaluate(()=>window.connectionTest.sockets.filter(s=>s.readyState===WebSocket.OPEN).length);assert.equal(sockets,1);
    });
    await check('repeated refresh keeps one live lobby connection',async()=>{
      for(let i=0;i<3;i++){
        await guest.page.locator('#refresh-rooms').click();
        await guest.page.waitForFunction(()=>window.rivalsLobbyState.busy,null,{timeout:10000});await lobby(guest.page);
      }
      assert.equal(await guest.page.evaluate(()=>window.connectionTest.sockets.filter(s=>s.readyState===WebSocket.OPEN).length),1);
    });
    if(!before)await check('failed connection releases controls and can retry after network recovery',async()=>{
      await guest.page.evaluate(()=>{window.connectionTest.block=true;for(const s of window.connectionTest.sockets)if(s.readyState===WebSocket.OPEN)s.close();});
      await guest.page.waitForFunction(()=>!window.rivalsLobbyState.ready&&!window.rivalsLobbyState.busy,null,{timeout:45000});
      await guest.page.locator('#create-room').click();
      await guest.page.waitForFunction(()=>window.rivalsLobbyState.busy,null,{timeout:10000});
      await guest.page.waitForFunction(()=>!window.rivalsLobbyState.busy&&window.rivalsLobbyState.visible,null,{timeout:45000});
      assert.ok(!(await guest.page.evaluate(()=>window.rivalsDiagnostics))?.players);
      await guest.page.evaluate(()=>{window.connectionTest.block=false;});await lobby(guest.page);
    });
    await create(guest.page);await leave(guest.page);
    await check('can create again after host disconnect',()=>lobby(guest.page));
    await check('no unhandled browser or game exceptions',async()=>assert.deepEqual(results.runs.flatMap(r=>r.errors),[]));
    console.log('WEB_CONNECTION_LIFECYCLE_'+(results.checks.every(c=>c.ok)?'OK':'REPRODUCED'));
  }finally{
    fs.writeFileSync(path.join(output,before?'connection-lifecycle-before.json':'connection-lifecycle-check.json'),JSON.stringify(results,null,2));await browser.close();
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
