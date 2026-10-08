const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PUZZLE_PLAYWRIGHT_MODULE||'playwright');
const R=require('../rules/rules.js');
const {games}=require('../rules/catalog.js');

// Four independent players through the real Photon Cloud. No route interception,
// fake snapshots, mocked WebSockets or local multiplayer service are used here.
(async()=>{
 const artifacts=path.resolve(__dirname,'../artifacts');fs.mkdirSync(artifacts,{recursive:true});
 const browser=await chromium.launch({
  executablePath:process.env.PUZZLE_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,
  args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']
 });
 const players=[],errors=[],sockets=[],reports=[],logs=[];
 const base=process.env.PUZZLE_UNITY_URL||'http://127.0.0.1:8191/';
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const note=text=>{reports.push(text);console.log('PASS ONLINE '+text);};
 async function makePlayer(name,group){
  const context=await browser.newContext({viewport:{width:945,height:800},deviceScaleFactor:1});
  const page=await context.newPage();
  const actor={name,group,context,page};players.push(actor);
  page.on('pageerror',error=>errors.push({name,error:error.message}));
  page.on('console',message=>{if(message.type()==='error'||/PUZZLE_ROOM|Fusion|Photon|Shutdown/.test(message.text()))logs.push({name,type:message.type(),message:message.text().slice(0,1500)});});
  page.on('websocket',socket=>{const url=new URL(socket.url());sockets.push({name,host:url.host,protocol:url.protocol});});
  await page.goto(base);await page.waitForFunction(()=>window.unityInstance&&window.puzzleUnityState&&window.puzzleRoomState?.ready,null,{timeout:150000});
  console.log('READY ONLINE '+name+' Unity 已載入');
  return actor;
 }
 const state=actor=>actor.page.evaluate(()=>window.puzzleUnityState);
 const roomUi=actor=>actor.page.evaluate(()=>window.puzzleRoomState);
 const command=(actor,value)=>actor.page.evaluate(v=>window.unityInstance.SendMessage('PuzzleParty','Command',v),value);
 const roomCommand=(actor,value)=>actor.page.evaluate(v=>window.unityInstance.SendMessage('PuzzleParty','RoomCommand',JSON.stringify(v)),value);
 const wait=(actor,predicate,arg,timeout=25000)=>actor.page.waitForFunction(predicate,arg,{timeout});
 const allWait=(actors,predicate,arg,timeout)=>Promise.all(actors.map(actor=>wait(actor,predicate,arg,timeout)));
 const allStates=actors=>Promise.all(actors.map(state));
 async function click(actor,id){
  let hit=(await state(actor)).controls.find(c=>c.id===id);assert.ok(hit,actor.name+' 沒有按鈕 '+id);assert.notEqual(hit.enabled,false,id+' 應可按');
  const height=actor.page.viewportSize().height;
  if(hit.y<0||hit.y+hit.h>height){
   await actor.page.evaluate(v=>window.unityInstance.SendMessage('PuzzleParty','Scroll',String(v)),hit.y-height/2);
   await pause(250);hit=(await state(actor)).controls.find(c=>c.id===id);
  }
  await actor.page.mouse.click(hit.x+hit.w/2,hit.y+hit.h/2);
 }
 async function join(actor,code,html=false){
  if(html){
   await click(actor,'room');await actor.page.locator('#room-name').fill(actor.name);
   await actor.page.locator('#room-code').fill(code);await actor.page.locator('#room-group').selectOption(String(actor.group));
   await actor.page.locator('#room-join').click();
  }else await roomCommand(actor,{type:'join',code,name:actor.name,group:actor.group});
  await wait(actor,g=>(window.puzzleRoomState?.connected&&window.puzzleRoomState.myGroup===g)||(!window.puzzleRoomState?.busy&&!!window.puzzleRoomState?.error),actor.group,65000);
  const joined=await roomUi(actor);assert.ok(joined.connected&&joined.myGroup===actor.group,actor.name+' 加入失敗：'+joined.error);
 }
 async function leave(actor){
  await roomCommand(actor,{type:'leave'});
  await wait(actor,()=>!window.puzzleRoomState?.connected&&!window.puzzleRoomState?.busy&&!window.puzzleRoomState?.error);
 }
 async function open(host,game,index,actors=players){
  await command(host,'open:'+game+':'+index);
  await allWait(actors,({game,index})=>window.puzzleUnityState?.game===game&&window.puzzleUnityState.index===index&&window.puzzleUnityState.room?.phase==='planning',{game,index});
 }
 async function answers(actors,expected){
  await allWait(actors,values=>window.puzzleUnityState?.settings?.join(',')===values.join(','),expected);
 }
 async function collectPlayback(actors,game,level){
  const frames=actors.map(()=>({active:new Set(),boards:[],runId:null}));
  const deadline=Date.now()+20000;
  while(Date.now()<deadline){
   const states=await allStates(actors);
   states.forEach((s,i)=>{
    if(s.active>=0)frames[i].active.add(s.active);
    frames[i].runId=s.room?.runId;
    if(game==='sticker'){
     const key=JSON.stringify(s.board);
     if(frames[i].boards.at(-1)!==key)frames[i].boards.push(key);
    }
   });
   if(states.every(s=>s.finished)){
    assert.ok(states.every(s=>s.success),'所有装置應同步通關');
    assert.equal(new Set(states.map(s=>s.room.runId)).size,1,'同一次播放 ID');
    assert.equal(new Set(states.map(s=>s.room.elapsedMs)).size,1,'完成時間一致');
    for(const s of states){
     assert.equal(s.room.phase,'result');assert.equal(s.room.success,true);
     if(game==='sticker')assert.deepEqual(s.board,level.target);
     else assert.deepEqual(s.penguins,level.boards.map(b=>({x:b.goal[0],y:b.goal[1]})));
    }
    return frames.map(f=>({...f,active:[...f.active]}));
   }
   await pause(65);
  }
  throw new Error('多人播放未在時間內結束');
 }
 try{
  const host=await makePlayer('測試老師',3);
  await click(host,'room');await host.page.locator('#room-name').fill(host.name);await host.page.locator('#room-create').click();
  await wait(host,()=>window.puzzleRoomState?.connected&&window.puzzleRoomState.isHost,null,65000);
  const code=(await roomUi(host)).code;assert.match(code,/^\d{6}$/);
  note('老師成功建立 Photon 房間');
  const first=await makePlayer('第一組',0),second=await makePlayer('第二組',1),third=await makePlayer('第三組',2);
  await join(first,code,true);await Promise.all([join(second,code),join(third,code)]);
  await allWait(players,()=>window.puzzleRoomState?.members?.length===4);
  assert.equal(new Set(players.map(a=>a.context)).size,4);
  assert.ok(sockets.some(s=>/(?:photon|exitgames)/i.test(s.host)&&s.protocol==='wss:'),'必須真的連上 Photon 外部 WSS');
  note('四個隔離瀏覽器透過真正 Photon 雲端加入；老師建立與學生加入表單可用');

  const sticker=games.sticker.levels[19],colors=R.solutions('sticker',sticker)[0];
  await open(host,'sticker',19);
  for(const actor of players){
   const s=await state(actor);assert.equal(s.decisions,4);assert.equal(s.room.myGroup,actor.group);assert.equal(s.role,'你是'+R.groups[actor.group]);
   if(actor!==host){
    assert.ok(s.controls.filter(c=>c.id.startsWith('choose:')).every(c=>c.enabled===(Number(c.id.split(':')[1])===actor.group)),'學生只能按自己組的選項');
    assert.ok(s.controls.filter(c=>['play','clear','speed'].includes(c.id)).every(c=>!c.enabled),'老師功能不可由學生按');
   }
  }
  await Promise.all([command(first,'set:0:'+colors[0]),command(second,'set:1:'+colors[1]),command(third,'set:2:'+colors[2])]);
  await answers(players,[...colors.slice(0,3),'']);
  const before=(await state(host)).settings.slice();
  await command(first,'set:1:'+sticker.palette.find(v=>v!==colors[1]));await command(second,'open:penguin:0');await command(third,'play');await pause(550);
  for(const s of await allStates(players)){assert.equal(s.game,'sticker');assert.equal(s.index,19);assert.deepEqual(s.settings,before);assert.equal(s.playing,false);assert.equal(s.finished,false);}
  await command(host,'play');await pause(350);assert.equal((await state(host)).playing,false,'老師也不能略過缺少的第四格');
  await command(host,'set:3:'+colors[3]);await answers(players,colors);
  for(const s of await allStates(players)){assert.equal(s.finished,false);assert.equal(s.room.success,false);assert.ok(s.board.every(v=>!v),'播放前不得提前貼上答案');}
  note('固定四組身分、三組同時作答不互蓋、跨組/選關/播放偽造指令拒絕、缺一格不能播放');

  await command(host,'play');await allWait(players,()=>window.puzzleUnityState?.playing);
  await command(host,'pause');await allWait(players,()=>window.puzzleUnityState?.paused&&window.puzzleUnityState.room.paused);
  await pause(250);const frozen=await allStates(players);
  assert.equal(new Set(frozen.map(s=>s.room.elapsedMs)).size,1);
  assert.equal(new Set(frozen.map(s=>JSON.stringify(s.board))).size,1);
  await pause(700);
  for(const [i,s] of (await allStates(players)).entries()){assert.equal(s.room.elapsedMs,frozen[i].room.elapsedMs);assert.deepEqual(s.board,frozen[i].board);assert.equal(s.active,frozen[i].active);}
  await host.page.screenshot({path:path.join(artifacts,'online-v10-teacher-paused.png')});
  await first.page.screenshot({path:path.join(artifacts,'online-v10-student-role.png')});
  await command(host,'pause');
  const trace=await collectPlayback(players,'sticker',sticker);
  const expectedFrames=R.run('sticker',sticker,colors).frames.map(f=>JSON.stringify(f.board));
  for(const t of trace){
   for(const key of t.boards)assert.ok(expectedFrames.includes(key)||JSON.parse(key).every(v=>!v),'貼紙只能依計畫逐張出現');
   let previous=-1;for(const key of t.boards){const index=expectedFrames.indexOf(key);if(index>=0){assert.ok(index>=previous,'貼紙不得倒回前一張');previous=index;}}
   assert.ok(t.active.includes(1)&&t.active.includes(2)&&t.active.includes(3),'每個裝置都演出後續三張貼紙');
  }
  fs.writeFileSync(path.join(artifacts,'online-v10-sticker-trace.json'),JSON.stringify(trace,null,2));
  note('四個畫面暫停同步凍結，逐張演出保持正確順序，貼紙第 20 關共同成功');

  const ice=games.penguin.levels[19],route=R.solutions('penguin',ice)[0],wrong=route.slice();wrong[1]=R.optionsFor('penguin',ice)[1].find(v=>v!==route[1]);
  await open(host,'penguin',19);
  await Promise.all([command(first,'set:0:'+wrong[0]),command(second,'set:1:'+wrong[1]),command(third,'set:2:'+wrong[2]),command(host,'set:3:'+wrong[3])]);
  await answers(players,wrong);await command(host,'play');await allWait(players,()=>window.puzzleUnityState?.playing);
  await command(host,'pause');await allWait(players,()=>window.puzzleUnityState?.paused);await pause(250);
  const iceFrozen=await allStates(players);await pause(550);
  for(const [i,s] of (await allStates(players)).entries())assert.deepEqual(s.penguins,iceFrozen[i].penguins,'企鵝暫停不能滑動');
  assert.equal(new Set(iceFrozen.map(s=>JSON.stringify(s.penguins))).size,1,'暫停後四個裝置的企鵝位置一致');
  await command(host,'pause');await allWait(players,()=>window.puzzleUnityState?.finished);
  for(const s of await allStates(players)){assert.equal(s.success,false);assert.equal(s.room.success,false);assert.deepEqual(s.settings,wrong);}
  await command(second,'set:1:'+route[1]);await answers(players,route);
  note('企鵝四端暫停一致，失敗保留全組選擇，只修正出錯組別');

  // Leave/rejoin also exercises a late arrival into an already paused film.
  await leave(third);await allWait([host,first,second],()=>window.puzzleRoomState?.members?.length===3);
  const absentChoice=R.optionsFor('penguin',ice)[2].find(v=>v!==route[2]);
  await command(host,'set:2:'+absentChoice);await answers([host,first,second],route.map((v,i)=>i===2?absentChoice:v));
  await command(host,'set:2:'+route[2]);await answers([host,first,second],route);
  await command(host,'play');await allWait([host,first,second],()=>window.puzzleUnityState?.playing);
  await command(host,'pause');await allWait([host,first,second],()=>window.puzzleUnityState?.paused);
  await join(third,code);await allWait(players,()=>window.puzzleRoomState?.members?.length===4&&window.puzzleUnityState?.paused);
  await pause(300);const late=await allStates(players);
  assert.equal(new Set(late.map(s=>s.room.elapsedMs)).size,1);assert.equal(new Set(late.map(s=>JSON.stringify(s.penguins))).size,1);
  assert.ok(late.every(s=>s.settings.join(',')===route.join(',')));
  await command(host,'pause');await collectPlayback(players,'penguin',ice);
  await third.page.setViewportSize({width:390,height:844});await pause(350);
  await third.page.screenshot({path:path.join(artifacts,'online-v10-penguin-student-mobile.png')});
  assert.ok((await state(third)).textPixelSize>=18);
  note('學生離開後老師可代填；重新加入同步暫停位置與設定；企鵝第 20 關四端成功');

  await leave(third);await allWait([host,first,second],()=>window.puzzleRoomState?.members?.length===3);
  await roomCommand(third,{type:'join',code,name:'重複組測試',group:0});
  await wait(third,()=>window.puzzleRoomState?.busy,null,15000);
  await wait(third,()=>!window.puzzleRoomState?.connected&&!window.puzzleRoomState?.busy&&!!window.puzzleRoomState?.error,null,65000);
  assert.match((await roomUi(third)).error,/這一組|組別|已有人/);
  await leave(third);
  await roomCommand(third,{type:'join',code:'000000',name:'錯房號測試',group:2});
  await wait(third,()=>window.puzzleRoomState?.busy,null,15000);
  await wait(third,()=>!window.puzzleRoomState?.connected&&!window.puzzleRoomState?.busy&&!!window.puzzleRoomState?.error,null,65000);
  assert.match((await roomUi(third)).error,/找不到|房號|離線|關閉|連線/);
  await leave(third);await join(third,code);await allWait(players,()=>window.puzzleRoomState?.members?.length===4);
  note('重複組別與不存在房號提供錯誤，離開後可正常重新加入');

  await leave(host);
  await allWait([first,second,third],()=>!window.puzzleRoomState?.connected&&!!window.puzzleRoomState?.error&&window.puzzleUnityState?.game==='',null,65000);
  assert.ok((await roomUi(first)).error.length>0);
  await first.page.screenshot({path:path.join(artifacts,'online-v10-room-closed.png')});
  note('老師離房，學生回遊戲選單並顯示斷線提示');
  assert.deepEqual(errors,[],'瀏覽器不可出現未處理錯誤');
  fs.writeFileSync(path.join(artifacts,'online-v10-report.json'),JSON.stringify({passed:reports,sockets,errors,logs},null,2));
  console.log('PASS ONLINE 全部真實 Photon 多人測試完成');
 }catch(error){
  const snapshots=await Promise.all(players.map(async actor=>({name:actor.name,state:await state(actor).catch(()=>null),ui:await roomUi(actor).catch(()=>null)})));
  await Promise.all(players.map(actor=>actor.page.screenshot({path:path.join(artifacts,'online-v10-failure-group-'+actor.group+'.png')}).catch(()=>{})));
  fs.writeFileSync(path.join(artifacts,'online-v10-failure.json'),JSON.stringify({error:error.stack,passed:reports,sockets,errors,logs,snapshots},null,2));
  throw error;
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
