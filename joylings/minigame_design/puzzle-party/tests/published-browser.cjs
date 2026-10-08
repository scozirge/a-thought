const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PUZZLE_PLAYWRIGHT_MODULE||'playwright');
const R=require('../rules/rules.js'),{games}=require('../rules/catalog.js');
// Verify the published Unity assets and a real room spanning two web origins.
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const errors=[],sockets=[],ttlReadbacks=[],artifacts=path.resolve(__dirname,'../artifacts');
 try{
  const hostContext=await browser.newContext({viewport:{width:1365,height:900}}),studentContext=await browser.newContext({viewport:{width:945,height:800}});
  await studentContext.addInitScript(()=>{
   const Native=window.WebSocket;window.__publishedSockets=[];
   window.WebSocket=class extends Native {constructor(...args){super(...args);window.__publishedSockets.push(this);}};
  });
  const host=await hostContext.newPage(),student=await studentContext.newPage();
  for(const [label,page] of [['published-host',host],['local-student',student]]){
   page.on('pageerror',e=>errors.push(e.message));page.on('websocket',s=>sockets.push(new URL(s.url()).host));
   page.on('console',m=>{if(/PUZZLE_ROOM_PLAYER_TTL 0\b/.test(m.text()))ttlReadbacks.push(label);});
  }
  const ready=page=>page.waitForFunction(()=>window.unityInstance&&window.puzzleUnityState&&window.puzzleRoomState?.ready,null,{timeout:180000});
  const room=(page,request)=>page.evaluate(v=>unityInstance.SendMessage('PuzzleParty','RoomCommand',JSON.stringify(v)),request);
  const cmd=(page,text)=>page.evaluate(v=>unityInstance.SendMessage('PuzzleParty','Command',v),text);
  const wait=(page,fn,arg)=>page.waitForFunction(fn,arg,{timeout:65000});
  const published=process.env.PUZZLE_PUBLISHED_URL||'https://scozirge.github.io/a-thought/puzzle-party/';
  const response=await host.goto(published);assert.equal(response.status(),200);
  const version=require('../package.json').version;
  assert.ok((await response.text()).includes("productVersion:'"+version+"'"),'公開頁必須是本次發布版本 '+version);
  await ready(host);
  await room(host,{type:'create',name:'公開網頁老師',group:3});
  await wait(host,()=>puzzleRoomState.connected&&puzzleRoomState.isHost);
  const code=await host.evaluate(()=>puzzleRoomState.code);
  await student.goto('http://127.0.0.1:8191/?room='+code);await ready(student);
  await student.locator('#room-dialog[open]').waitFor();
  await student.waitForFunction(code=>window.puzzleRoomState?.rooms?.some(r=>r.code===code&&r.open),code,{timeout:65000});
  assert.equal(await student.locator('[data-code="'+code+'"]').getAttribute('aria-pressed'),'true','分享連結應自動選取房間');
  await student.locator('#room-name').fill('另一網址學生');await student.locator('#room-join').click();
  await wait(student,()=>puzzleRoomState.connected&&puzzleRoomState.myGroup===0);
  await cmd(host,'open:sticker:19');await wait(student,()=>puzzleUnityState.game==='sticker'&&puzzleUnityState.index===19);
  const solution=R.solutions('sticker',games.sticker.levels[19])[0];
  await cmd(student,'set:0:'+solution[0]);for(let i=1;i<4;i++)await cmd(host,'set:'+i+':'+solution[i]);
  for(const page of [host,student])await wait(page,s=>puzzleUnityState.settings.join(',')===s.join(','),solution);
  await cmd(host,'play');for(const page of [host,student])await wait(page,()=>puzzleUnityState.finished&&puzzleUnityState.success);
  assert.ok(sockets.some(s=>/photon|exitgames/i.test(s)));assert.deepEqual(errors,[]);
  assert.ok(ttlReadbacks.includes('published-host')&&ttlReadbacks.includes('local-student'),'公開老師房間與學生伺服器回讀的席位保留時間都必須是 0');
  await host.screenshot({path:path.join(artifacts,'published-v10-success.png')});
  const cut=await student.evaluate(()=>{const active=__publishedSockets.filter(s=>s.readyState===WebSocket.OPEN);active.forEach(s=>s.close(4001,'published reconnect verification'));return active.length;});
  assert.ok(cut>0,'必須真的中斷學生的原生連線');
  await wait(student,()=>!puzzleRoomState.connected&&!puzzleRoomState.busy&&!!puzzleRoomState.error);
  const disconnectMessage=await student.evaluate(()=>puzzleRoomState.error);
  assert.match(disconnectMessage,/連線已中斷/);assert.doesNotMatch(disconnectMessage,/老師已離線/);
  await wait(host,()=>puzzleRoomState.connected&&puzzleRoomState.members.length===1);
  await room(student,{type:'join',code,name:'重新連線學生',group:0});
  await wait(student,()=>puzzleRoomState.connected&&puzzleUnityState.finished&&puzzleUnityState.success);
  assert.ok(ttlReadbacks.filter(label=>label==='local-student').length>=2);assert.deepEqual(errors,[]);
  await room(host,{type:'leave'});await wait(student,()=>!puzzleRoomState.connected&&!!puzzleRoomState.error);
  fs.writeFileSync(path.join(artifacts,'published-v10-report.json'),JSON.stringify({published,version,localStudent:'http://127.0.0.1:8191/',passed:true,sockets,ttlReadbacks,disconnectMessage,rejoinedAfterNativeSocketClose:true,errors},null,2));
  console.log('PASS 公開 Unity 載入與開房、兩端同步通關、學生原生連線中斷的正確提示與重入、老師關房');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
