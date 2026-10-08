// Test the shipped native player against the shipped Web player, both ways.
const {chromium}=require(process.env.RIVALS_PLAYWRIGHT_MODULE||'playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.resolve(process.env.RIVALS_TEST_OUTPUT||'Logs/ReleaseValidation');
const exe=path.resolve(process.env.RIVALS_EXE||'Builds/Release-20260924/Windows/Rivals.exe');
const result={checks:[],errors:[],snapshots:[],browserLogs:[]},children=[],pages=[];
fs.mkdirSync(output,{recursive:true});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(test,label,timeout=45000){const end=Date.now()+timeout;while(Date.now()<end){const value=await test();if(value)return value;await sleep(150);}throw Error(label+' timed out');}
function native(mode,room,label){
 const log=path.join(output,label+'.log');
 const proc=spawn(exe,['-batchmode','-nographics','-duelSmoke','-keepAlive','-smokeSeconds','5','-expectedHumans','2',mode,'-room',room,'-logFile',log],{windowsHide:true,stdio:'ignore'});
 const run={proc,log};proc.on('error',e=>result.errors.push(e.message));children.push(run);return run;
}
function read(run){return fs.existsSync(run.log)?fs.readFileSync(run.log,'utf8'):'';}
async function stop(run){if(run.proc.exitCode===null&&run.proc.signalCode===null){run.proc.kill();await waitFor(()=>run.proc.exitCode!==null||run.proc.signalCode!==null,'native exit',10000);}}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.RIVALS_CHROME||undefined,headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 async function open(){
  const page=await browser.newPage({viewport:{width:1440,height:960}});pages.push(page);
  page.on('pageerror',e=>result.errors.push(e.message));page.on('console',m=>{const message=m.text();if(/RIVALS_|Disconnect|Shutdown|Timeout|Exception/.test(message))result.browserLogs.push(message);if(/^(InvalidOperationException|NullReferenceException|MissingReferenceException|ArgumentException):/.test(message))result.errors.push(message);});
  const url=new URL(process.env.RIVALS_WEB_URL||'http://127.0.0.1:8187/');url.searchParams.set('diagnostics','1');
  await page.goto(url.href);await page.waitForFunction(()=>window.rivalsLobbyState?.ready&&!window.rivalsLobbyState.busy,null,{timeout:120000});return page;
 }
 async function roster(page,label){
  await page.waitForFunction(()=>window.rivalsDiagnostics?.phase===2&&window.rivalsDiagnostics.players.filter(p=>!p.bot).length===2,null,{timeout:45000});
  const s=await page.evaluate(()=>window.rivalsDiagnostics);assert.equal(s.players.length,8);assert.equal(s.players.filter(p=>p.team===0).length,4);assert.equal(s.killsToWin,30);
  result.snapshots.push({label,state:s});result.checks.push(label);console.log('CROSS_PLAY_CHECK '+label);
 }
 try{
  assert.ok(fs.existsSync(exe),'release exe exists');
  let recoveredPage=null;
  if(!process.argv.includes('--web-host-only')){
  const room='release-'+Date.now().toString(36),nativeHost=native('-host',room,'cross-native-host'),webClient=await open();
  await waitFor(()=>read(nativeHost).includes('RIVALS_CONNECTED Host'),'native host');
  await webClient.waitForFunction(id=>window.rivalsLobbyState.rooms.some(r=>r.id===id),room,{timeout:45000});
  const listing=await webClient.evaluate(id=>window.rivalsLobbyState.rooms.find(r=>r.id===id),room);
  await webClient.locator('#player-name').fill('網頁訪客');
  await webClient.locator('.room-row').filter({has:webClient.getByText(listing.name,{exact:true})}).getByRole('button',{name:'加入房間',exact:true}).click();
  await roster(webClient,'Web client joins Windows host with balanced eight-player match');
  await webClient.waitForTimeout(17000);
  assert.equal((await webClient.evaluate(()=>window.rivalsDiagnostics)).phase,2,'live native host keeps the client connected beyond the watchdog window');
  await waitFor(()=>/RIVALS_ROSTER players=8 humans=2 bots=6/.test(read(nativeHost)),'native sees Web player');
  await webClient.screenshot({path:path.join(output,'cross-windows-host-web-client.png')});
  const hostDeparted=Date.now();
  await stop(nativeHost);
  await webClient.waitForFunction(()=>window.rivalsLobbyState?.visible&&!window.rivalsLobbyState.busy,null,{timeout:30000});
  result.hostDepartureMs=Date.now()-hostDeparted;
  result.checks.push('Web client returns to lobby when Windows host leaves');
  recoveredPage=webClient;
  }

  const webHost=recoveredPage||await open();
  await webHost.waitForFunction(()=>window.rivalsLobbyState.ready&&!window.rivalsLobbyState.busy,null,{timeout:45000});
  const observer=await open(),hostName='正式版'+Date.now().toString(36).slice(-5);
  await webHost.locator('#player-name').fill(hostName);await webHost.locator('#create-room').click();
  await observer.waitForFunction(name=>window.rivalsLobbyState.rooms.some(r=>r.name===name+'的房間'),hostName,{timeout:45000});
  const webRoom=await observer.evaluate(name=>window.rivalsLobbyState.rooms.find(r=>r.name===name+'的房間').id,hostName);
  await observer.close();
  const nativeClient=native('-client',webRoom,'cross-native-client');
  await waitFor(()=>read(nativeClient).includes('RIVALS_CONNECTED Client'),'native client');
  await roster(webHost,'Windows client joins Web host with balanced eight-player match');
  await webHost.waitForTimeout(17000);
  assert.equal((await webHost.evaluate(()=>window.rivalsDiagnostics)).players.filter(p=>!p.bot).length,2,'native client remains connected to a live Web host');
  await waitFor(()=>read(nativeClient).includes('RIVALS_SMOKE_OK'),'native client simulation');
  await webHost.screenshot({path:path.join(output,'cross-web-host-windows-client.png')});
  await stop(nativeClient);
  await webHost.waitForFunction(()=>window.rivalsDiagnostics.players.length===8&&window.rivalsDiagnostics.players.filter(p=>p.bot).length===7,null,{timeout:45000});
  result.checks.push('Web host refills departing Windows player with a bot');
  for(const run of children)assert.ok(!/^(InvalidOperationException|NullReferenceException|MissingReferenceException|ArgumentException):|RIVALS_SMOKE_TIMEOUT/m.test(read(run)),'native runtime has no game exceptions');
  assert.deepEqual(result.errors,[]);result.ok=true;console.log('RELEASE_CROSS_PLAY_OK '+JSON.stringify(result.checks));
 }catch(e){result.failure=e.stack;for(const page of pages)if(!page.isClosed())result.snapshots.push({label:'failure',state:await page.evaluate(()=>({lobby:window.rivalsLobbyState,game:window.rivalsDiagnostics}))});throw e;}
 finally{for(const run of children)await stop(run);await browser.close();fs.writeFileSync(path.join(output,'cross-play-check.json'),JSON.stringify(result,null,2));}
})().catch(e=>{console.error(e);process.exitCode=1;});
