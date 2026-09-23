// Nine independent browsers race for an eight-player Photon room.
const {chromium}=require(process.env.RIVALS_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const output=process.env.RIVALS_TEST_OUTPUT?path.resolve(process.env.RIVALS_TEST_OUTPUT):path.resolve(__dirname,'../Logs'),results={url:process.env.RIVALS_WEB_URL||'http://127.0.0.1:8184/',testedAt:new Date().toISOString(),runs:[]};
const title='容量'+Date.now().toString(36).slice(-6)+'的房間';
fs.mkdirSync(output,{recursive:true});
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.RIVALS_CHROME||undefined,headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
  const pages=[];
  async function open(index){
    const context=await browser.newContext({viewport:{width:640,height:480}}),page=await context.newPage();
    const run={index,errors:[],logs:[]};results.runs.push(run);pages.push(page);
    page.on('pageerror',e=>run.errors.push(e.message));
    page.on('console',m=>{const t=m.text();if(/^(?:InvalidOperationException|NullReferenceException|MissingReferenceException|ArgumentException):/.test(t))run.errors.push(t);if(/RIVALS_CONNECT|RIVALS_SHUTDOWN/.test(t))run.logs.push(t);});
    const url=new URL(process.env.RIVALS_WEB_URL||'http://127.0.0.1:8184/');url.searchParams.set('diagnostics','1');
    await page.goto(url.href);await lobby(page);await page.locator('#player-name').fill(index?'容量訪客'+index:title.slice(0,-3));return page;
  }
  async function lobby(page){await page.waitForFunction(()=>window.rivalsLobbyState?.visible&&window.rivalsLobbyState.ready&&!window.rivalsLobbyState.busy,null,{timeout:120000});}
  async function humans(page,count){await page.waitForFunction(n=>!window.rivalsLobbyState?.visible&&window.rivalsDiagnostics?.players?.filter(p=>!p.bot).length===n,count,{timeout:90000});}
  function joinButton(page){return page.locator('.room-row').filter({has:page.getByText(title,{exact:true})}).getByRole('button',{name:'加入房間',exact:true});}
  try{
    const host=await open(0);await host.locator('#create-room').click();await humans(host,1);
    for(let i=1;i<=6;i++){const page=await open(i);await joinButton(page).click({timeout:30000});await humans(host,i+1);console.log('CONNECTED '+(i+1));}
    const contenders=[await open(7),await open(8)];
    await Promise.all(contenders.map(p=>joinButton(p).waitFor({state:'visible',timeout:30000})));
    // Start in the same event-loop turn from already-rendered stale-capable lists.
    await Promise.all(contenders.map(p=>joinButton(p).evaluate(button=>button.click())));
    await humans(host,8);
    const deadline=Date.now()+60000;let states;
    do{
      states=await Promise.all(contenders.map(p=>p.evaluate(()=>({lobby:window.rivalsLobbyState,game:window.rivalsDiagnostics}))));
      if(states.filter(s=>s.lobby.visible&&s.lobby.ready&&!s.lobby.busy).length===1&&states.filter(s=>!s.lobby.visible&&s.game.players?.length===8).length===1)break;
      await host.waitForTimeout(200);
    }while(Date.now()<deadline);
    const losingIndex=states.findIndex(s=>s.lobby.visible&&s.lobby.ready&&!s.lobby.busy);
    assert.notEqual(losingIndex,-1,'excess player returns to usable lobby');
    const loser=contenders[losingIndex];results.race=states;
    assert.match(states[losingIndex].lobby.message,/滿|關閉/);
    assert.ok(!states[losingIndex].game.players,'failed join has no stale game snapshot');
    const roster=await host.evaluate(()=>window.rivalsDiagnostics);
    assert.equal(roster.players.length,8);assert.equal(roster.players.filter(p=>p.bot).length,0);assert.equal(new Set(roster.players.map(p=>p.seat)).size,8);
    await loser.locator('.room-row').filter({has:loser.getByText(title,{exact:true})}).getByRole('button',{name:'房間已滿',exact:true}).waitFor();
    assert.equal(await loser.getByRole('button',{name:'房間已滿',exact:true}).isDisabled(),true);
    await pages[1].context().close();await humans(host,7);
    await joinButton(loser).click({timeout:30000});await humans(host,8);await humans(loser,8);
    results.summary={capacity:8,contenders:9,raceRecovered:true,fullButtonDisabled:true,vacancyRejoined:true,uniqueSeats:8};
    assert.deepEqual(results.runs.flatMap(r=>r.errors),[]);console.log('WEB_ROOM_CAPACITY_OK '+JSON.stringify(results.summary));
  }finally{fs.writeFileSync(path.join(output,'room-capacity-check.json'),JSON.stringify(results,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
