const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PUZZLE_PLAYWRIGHT_MODULE||'playwright');
const R=require('../rules/rules.js'),{games}=require('../rules/catalog.js');

// These are real Photon connections. The only network interventions deliberately
// delay genuine incoming WebSocket events or close the actual native socket.
// There are no fake messages, substituted room states, or simulated servers.
(async()=>{
 const startedAt=new Date().toISOString(),dir=path.resolve(__dirname,'../artifacts');fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.PUZZLE_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
 const actors=[],errors=[],logs=[],sockets=[],checks=[],faults=[];
 let buildVersion=null;
 const base=process.env.PUZZLE_UNITY_URL||'http://127.0.0.1:8191/';
 const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const state=a=>a.page.evaluate(()=>window.puzzleUnityState);
 const ui=a=>a.page.evaluate(()=>window.puzzleRoomState);
 const command=(a,value)=>a.page.evaluate(v=>window.unityInstance.SendMessage('PuzzleParty','Command',v),value);
 const roomCommand=(a,value)=>a.page.evaluate(v=>window.unityInstance.SendMessage('PuzzleParty','RoomCommand',JSON.stringify(v)),value);
 const wait=(a,predicate,arg,timeout=35000)=>a.page.waitForFunction(predicate,arg,{timeout});
 const allWait=(list,predicate,arg,timeout)=>Promise.all(list.map(a=>wait(a,predicate,arg,timeout)));
 const live=()=>actors.filter(a=>!a.page.isClosed());
 const states=list=>Promise.all(list.map(state));
 const note=text=>{checks.push(text);console.log('PASS RESILIENCE '+text);};
 const report=extra=>({startedAt,finishedAt:new Date().toISOString(),url:base,buildVersion,checks,faults,sockets,errors,logs,...extra});
 function instrumentation(){
  const Native=window.WebSocket,descriptor=Object.getOwnPropertyDescriptor(Native.prototype,'onmessage');
  const control={sockets:[],hold:false,queue:[],sent:0,received:0,closed:0};
  window.__resilience=control;
  window.WebSocket=class extends Native {
   constructor(...args){
    super(...args);control.sockets.push(this);let handler=null;
    this.addEventListener('close',()=>control.closed++);
    Object.defineProperty(this,'onmessage',{configurable:true,get(){return handler;},set(callback){
     handler=callback;
     descriptor.set.call(this,event=>{
      control.received++;
      const deliver=()=>{if(typeof callback==='function')callback.call(this,event);};
      if(control.hold)control.queue.push(deliver);else deliver();
     });
    }});
   }
   send(data){control.sent++;return super.send(data);}
  };
  control.release=()=>{control.hold=false;const pending=control.queue.splice(0);pending.forEach(deliver=>deliver());return pending.length;};
 }
 async function attachPage(a){
  a.page=await a.context.newPage();const page=a.page,label=a.label;
  page.on('pageerror',error=>errors.push({label,error:error.message}));
  page.on('console',m=>{if(m.type()==='error'||/PUZZLE_ROOM|Fusion|Photon|Shutdown/.test(m.text()))logs.push({label,type:m.type(),time:new Date().toISOString(),message:m.text().slice(0,1700)});});
  page.on('websocket',socket=>{const parsed=new URL(socket.url()),entry={label,host:parsed.host,protocol:parsed.protocol,openedAt:new Date().toISOString(),closedAt:null};sockets.push(entry);socket.on('close',()=>entry.closedAt=new Date().toISOString());});
  await page.goto(base);await ready(a);console.log('READY RESILIENCE '+label);
 }
 async function ready(a){
  await wait(a,()=>window.unityInstance&&window.puzzleUnityState&&window.puzzleRoomState?.ready,null,160000);
  const actual=await a.page.evaluate(()=>document.documentElement.outerHTML.match(/productVersion\s*:\s*['"]([^'"]+)['"]/)?.[1]);
  assert.ok(actual,'測試必須讀到實際載入 HTML 的 productVersion');
  if(buildVersion===null)buildVersion=actual;else assert.equal(actual,buildVersion,'同一次測試不可混用不同 WebGL 輸出');
 }
 async function make(label,group){
  const context=await browser.newContext({viewport:{width:945,height:800},deviceScaleFactor:1});await context.addInitScript(instrumentation);
  const a={label,group,context,page:null};actors.push(a);await attachPage(a);return a;
 }
 async function joined(a,group){
  // The native-to-HTML status bridge runs every 150ms. Ignore the preceding
  // disconnected error until the new Connect has had a chance to publish.
  await wait(a,({group,started})=>(window.puzzleRoomState?.connected&&window.puzzleRoomState.myGroup===group)||(Date.now()-started>1500&&!window.puzzleRoomState?.busy&&!!window.puzzleRoomState?.error),{group,started:Date.now()},70000);
  const status=await ui(a);assert.ok(status.connected&&status.myGroup===group,a.label+' 連線失敗：'+status.error);
  await ttlEvidence(a,a.ttlLogStart);
 }
 async function ttlEvidence(a,start){
  const deadline=Date.now()+10000;
  while(!logs.slice(start).some(log=>log.label===a.label&&/\bPUZZLE_ROOM_PLAYER_TTL 0\b/.test(log.message))){
   assert.ok(Date.now()<deadline,a.label+' 必須回讀 Photon 伺服器 PlayerTtl=0，不能只修改本機 host 值');await delay(50);
  }
 }
 async function join(a,code){
  a.ttlLogStart=logs.length;
  await roomCommand(a,{type:'join',code,name:a.label,group:a.group});await joined(a,a.group);
 }
 async function create(a){
  a.ttlLogStart=logs.length;
  await roomCommand(a,{type:'create',name:a.label,group:3});await joined(a,3);return (await ui(a)).code;
 }
 async function leave(a){
  await roomCommand(a,{type:'leave'});await wait(a,()=>!puzzleRoomState.connected&&!puzzleRoomState.busy&&!puzzleRoomState.error);
 }
 async function members(list,count){await allWait(list,n=>window.puzzleRoomState?.members?.length===n,count);}
 async function answers(list,values){await allWait(list,v=>window.puzzleUnityState?.settings?.join(',')===v.join(','),values);}
 async function open(host,game,index,list=live()){
  await command(host,'open:'+game+':'+index);
  await allWait(list,x=>puzzleUnityState.game===x.game&&puzzleUnityState.index===x.index&&puzzleUnityState.room?.phase==='planning',{game,index});
  return R.solutions(game,games[game].levels[index])[0];
 }
 async function fillBurst(list,game,index,answer){
  const options=R.optionsFor(game,games[game].levels[index]);
  await Promise.all(list.map(async a=>{
   const slot=a.group,values=[options[slot][0],options[slot].at(-1),answer[slot]];
   await a.page.evaluate(({slot,values})=>{for(const value of values)unityInstance.SendMessage('PuzzleParty','Command','set:'+slot+':'+value);},{slot,values});
  }));
  await answers(list,answer);
 }
 async function finished(list,game,index){
  await allWait(list,()=>puzzleUnityState.finished&&puzzleUnityState.room.phase==='result',null,25000);
  const snapshots=await states(list);assert.ok(snapshots.every(s=>s.success&&s.room.success));
  assert.equal(new Set(snapshots.map(s=>s.room.runId)).size,1);assert.equal(new Set(snapshots.map(s=>s.room.elapsedMs)).size,1);
  const level=games[game].levels[index];
  for(const s of snapshots){if(game==='sticker')assert.deepEqual(s.board,level.target);else assert.deepEqual(s.penguins,level.boards.map(b=>({x:b.goal[0],y:b.goal[1]})));}
 }
 async function departed(host,group,others=live().filter(a=>a.group!==group)){
  await allWait(others,g=>puzzleRoomState.connected&&!puzzleRoomState.members.some(m=>m.group===g),group,50000);
  assert.equal((await ui(host)).members.length,3);
 }
 async function beginImmediateCreate(a){
  a.ttlLogStart=logs.length;
  await a.page.evaluate(name=>{
   const evidence=window.__resilienceRecovery={sentAt:null,before:null,busyObserved:false};
   const timer=setInterval(()=>{
    const s=window.puzzleRoomState;if(s?.busy)evidence.busyObserved=true;
    if(s&&!s.connected&&!s.busy&&!evidence.sentAt){
     evidence.sentAt=Date.now();evidence.before=JSON.parse(JSON.stringify(s));clearInterval(timer);
     window.unityInstance.SendMessage('PuzzleParty','RoomCommand',JSON.stringify({type:'create',name,group:3}));
    }
   },10);
  },a.label);
 }
 try{
  let host=await make('穩定性老師',3),code=await create(host);
  const a=await make('穩定性第1組',0),b=await make('穩定性第2組',1),c=await make('穩定性第3組',2);
  await Promise.all([join(a,code),join(b,code),join(c,code)]);await members(actors,4);
  assert.ok(sockets.some(s=>s.protocol==='wss:'&&/(photon|exitgames)/i.test(s.host)));
  note('四個隔離頁面同時加入真正 Photon 雲端');

  // Alternating games repeatedly exercises settings, speed and reset messages
  // on the same connections, including three rapid choices from every player.
  for(let turn=0;turn<6;turn++){
   const game=turn%2?'penguin':'sticker',index=14+turn%6,answer=await open(host,game,index);
   await fillBurst(actors,game,index,answer);
   const speed=(await state(host)).room.speed===1?2:1;await command(host,'speed');await allWait(actors,v=>puzzleUnityState.room.speed===v,speed);
   await command(host,'play');await allWait(actors,()=>puzzleUnityState.playing);
   await command(host,'pause');await allWait(actors,()=>puzzleUnityState.paused);
   const round=(await state(host)).room.roundId;
   await command(host,'stop');await allWait(actors,r=>!puzzleUnityState.playing&&!puzzleUnityState.finished&&puzzleUnityState.room.roundId>r,round);
   await answers(actors,answer);const stopped=await states(actors);
   for(const s of stopped){assert.equal(s.room.elapsedMs,0);if(game==='sticker')assert.ok(s.board.every(v=>!v));else assert.deepEqual(s.penguins,games[game].levels[index].boards.map(board=>({x:board.start[0],y:board.start[1]})));}
   await command(host,'clear');await answers(actors,['','','','']);await fillBurst(actors,game,index,answer);
   await command(host,'play');await finished(actors,game,index);
   note('第 '+(turn+1)+' 輪 '+game+'：四組連點不覆蓋、調速/暫停/停止/清空/重播同步');
  }

  // Withhold real inbound packets briefly; the Unity client still holds round A
  // while the teacher opens round B, so its real outgoing action is stale.
  const oldAnswer=await open(host,'sticker',18),oldRound=(await state(a)).room.roundId;
  const sentBefore=await a.page.evaluate(()=>{__resilience.hold=true;return __resilience.sent;});
  await open(host,'sticker',19,[host,b,c]);assert.equal((await state(a)).room.roundId,oldRound);
  await command(a,'set:0:'+oldAnswer[0]);await wait(a,n=>__resilience.sent>n,sentBefore);await delay(650);
  assert.ok((await state(host)).settings.every(v=>!v),'舊 round 作答不可寫入新題');
  const withheld=await a.page.evaluate(()=>__resilience.release());assert.ok(withheld>0,'必須確實延遲收到的原始封包');
  await allWait(actors,r=>puzzleUnityState.room.roundId>r&&puzzleUnityState.index===19,oldRound);
  await answers(actors,['','','','']);
  const stickerAnswer=R.solutions('sticker',games.sticker.levels[19])[0];await command(a,'set:0:'+stickerAnswer[0]);await answers(actors,[stickerAnswer[0],'','','']);
  faults.push({kind:'stale-round',oldRound,withheldNativeMessages:withheld,newRound:(await state(host)).room.roundId});
  note('延遲真實封包使學生停留舊 round；舊作答遭拒，恢復後新作答正常');
  await fillBurst(actors,'sticker',19,stickerAnswer);

  for(const [i,student]of [a,b,c].entries()){
   await leave(student);await departed(host,student.group,actors.filter(x=>x!==student));
   await answers(actors.filter(x=>x!==student),stickerAnswer);
   await join(student,code);await members(actors,4);await answers(actors,stickerAnswer);
   note('第 '+(i+1)+' 輪學生正常離開/重加：組別釋放、答案保留、沒有殘留席位');
  }

  // Browser refresh tears down the real WebSocket; no in-game leave is sent.
  const reloadAt=Date.now();await b.page.reload();await ready(b);await departed(host,b.group,[host,a,c]);
  const modified=stickerAnswer.slice();modified[b.group]=R.optionsFor("sticker",games.sticker.levels[19])[0].find(v=>v!==modified[b.group]);
  await command(host,'set:'+b.group+':'+modified[b.group]);await answers([host,a,c],modified);
  await join(b,code);await members(actors,4);await answers(actors,modified);
  faults.push({kind:'student-refresh',milliseconds:Date.now()-reloadAt,group:b.group});
  note('學生直接重新整理造成真離線，老師接手修改，新載入頁重加接續答案');

  const closedAt=Date.now();await c.page.close();await departed(host,c.group,[host,a,b]);
  await command(host,'set:'+c.group+':'+stickerAnswer[c.group]);await attachPage(c);await join(c,code);await members(actors,4);
  assert.equal((await state(c)).room.game,'sticker');assert.equal((await state(c)).index,19);
  faults.push({kind:'student-tab-close',milliseconds:Date.now()-closedAt,group:c.group});
  note('學生直接關閉頁籤後釋放席位，新頁可以重新加入原組');

  // Close the actual native WSS, with an abnormal application code so the SDK's
  // error callback runs. No call to RoomCommand(leave) occurs in this recovery.
  await fillBurst(actors,'sticker',19,stickerAnswer);await command(host,'play');await allWait(actors,()=>puzzleUnityState.playing);
  const cut=await a.page.evaluate(()=>{
   const active=__resilience.sockets.filter(socket=>socket.readyState===WebSocket.OPEN&&/(photon|exitgames)/i.test(socket.url));
   const before=__resilience.closed;active.forEach(socket=>socket.close(4001,'resilience test network interruption'));
   return {count:active.length,before,time:Date.now()};
  });assert.ok(cut.count>0,'需切斷真實仍開啟的 Photon WSS');
  await wait(a,n=>__resilience.closed>n,cut.before);
  await Promise.all([departed(host,a.group,[host,b,c]),finished([host,b,c],'sticker',19),wait(a,()=>!puzzleRoomState.connected&&!puzzleRoomState.busy&&!!puzzleRoomState.error,null,50000)]);
  const disconnected=await ui(a);await a.page.screenshot({path:path.join(dir,'resilience-v10-wss-disconnected.png')});
  await join(a,code);await members(actors,4);await finished(actors,'sticker',19);
  faults.push({kind:'native-websocket-close',count:cut.count,milliseconds:Date.now()-cut.time,error:disconnected.error});
  note('播放中真正中斷學生 WSS，其餘三端繼續完成；同頁無需 Leave 重入並同步成功結果');

  // Three abrupt teacher tab closures exercise cleanup epochs repeatedly. A
  // student opens a new room at the first UI-supported opportunity, then the
  // former teacher returns on a fresh page as that student's former group.
  for(let turn=0;turn<3;turn++){
   const candidate=actors.find(x=>x!==host&&x.group===turn),vacantGroup=candidate.group,oldHost=host;
   const answer=await open(host,turn%2?'penguin':'sticker',19);await fillBurst(actors,turn%2?'penguin':'sticker',19,answer);
   await beginImmediateCreate(candidate);const closeAt=Date.now();await oldHost.page.close();
   const remaining=actors.filter(x=>x!==oldHost&&x!==candidate);
   await allWait(remaining,()=>!puzzleRoomState.connected&&!puzzleRoomState.busy&&!!puzzleRoomState.error&&puzzleUnityState.game==='',null,60000);
   await wait(candidate,()=>window.__resilienceRecovery?.sentAt,null,60000);
   await wait(candidate,()=>puzzleRoomState.connected&&puzzleRoomState.isHost&&!puzzleRoomState.busy,null,70000);
   await ttlEvidence(candidate,candidate.ttlLogStart);
   const evidence=await candidate.page.evaluate(()=>__resilienceRecovery);await delay(1000);
   assert.ok((await ui(candidate)).connected&&(await ui(candidate)).isHost,'舊斷線清理不可覆蓋新建房間');
   candidate.group=3;oldHost.group=vacantGroup;host=candidate;code=(await ui(host)).code;
   await attachPage(oldHost);await Promise.all(actors.filter(x=>x!==host).map(x=>join(x,code)));await members(actors,4);
   const again=await open(host,'penguin',19);await fillBurst(actors,'penguin',19,again);await command(host,'play');await finished(actors,'penguin',19);
   faults.push({kind:'teacher-tab-close-immediate-new-room',round:turn+1,milliseconds:Date.now()-closeAt,cleanupBusyObserved:evidence.busyObserved,createSentAt:evidence.sentAt});
   note('第 '+(turn+1)+' 輪老師直接關頁，學生看到離房提示並立即新建房；四組重聚後可通關');
  }
  await host.page.screenshot({path:path.join(dir,'resilience-v10-recovered-room.png')});
  assert.deepEqual(errors,[],'真實斷線與重連不應產生 JavaScript 未處理例外');
  fs.writeFileSync(path.join(dir,'resilience-v10-report.json'),JSON.stringify(report({success:true}),null,2));
  console.log('PASS RESILIENCE 全部真實多人穩定性測試通過');
 }catch(error){
  const snapshots=await Promise.all(live().map(async a=>({label:a.label,group:a.group,state:await state(a).catch(()=>null),ui:await ui(a).catch(()=>null)})));
  await Promise.all(live().map(a=>a.page.screenshot({path:path.join(dir,'resilience-v10-failure-group-'+a.group+'.png')}).catch(()=>{})));
  fs.writeFileSync(path.join(dir,'resilience-v10-failure.json'),JSON.stringify(report({success:false,error:error.stack,snapshots}),null,2));
  throw error;
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
