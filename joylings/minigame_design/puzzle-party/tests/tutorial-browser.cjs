const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PUZZLE_PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'../Builds/UnityWeb'),artifacts=path.resolve(__dirname,'../artifacts');fs.mkdirSync(artifacts,{recursive:true});
 const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+(new URL(req.url,'http://localhost').pathname==='/'?'/index.html':new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:process.env.PUZZLE_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const errors=[],sockets=[],checks=[],base=process.env.PUZZLE_UNITY_URL||`http://127.0.0.1:${server.address().port}/`;
 const wait=(p,fn,arg)=>p.waitForFunction(fn,arg,{timeout:90000});
 const cmd=(p,v)=>p.evaluate(v=>unityInstance.SendMessage('PuzzleParty','Command',v),v);
 const room=(p,v)=>p.evaluate(v=>unityInstance.SendMessage('PuzzleParty','RoomCommand',JSON.stringify(v)),v);
 const state=p=>p.evaluate(()=>puzzleUnityState);
 async function player(){const context=await browser.newContext({viewport:{width:945,height:820}}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('websocket',s=>sockets.push(new URL(s.url()).host));await p.goto(base);await wait(p,()=>window.unityInstance&&window.puzzleUnityState&&window.puzzleRoomState?.ready);return p;}
 async function click(p,id){
  await wait(p,id=>puzzleUnityState.controls.some(c=>c.id===id&&c.enabled),id);
  let hit=(await state(p)).controls.find(c=>c.id===id),height=p.viewportSize().height;
  if(hit.y<0||hit.y+hit.h>height){await p.evaluate(d=>unityInstance.SendMessage('PuzzleParty','Scroll',String(d)),hit.y-height/2);await p.waitForTimeout(300);hit=(await state(p)).controls.find(c=>c.id===id);}
  assert.ok(hit.x>=0&&hit.x+hit.w<=p.viewportSize().width);await p.mouse.click(hit.x+hit.w/2,hit.y+hit.h/2);
 }
 const tutorial=(p,game,page)=>wait(p,({game,page})=>puzzleUnityState.tutorialGame===game&&puzzleUnityState.tutorialPage===page,{game,page});
 try{
  const host=await player();
  for(const game of ['sticker','penguin']){
   const count=game==='sticker'?5:4;
   await click(host,'tutorial:'+game);await tutorial(host,game,0);
   for(const width of [360,390,945,1365]){
    await host.setViewportSize({width,height:820});await host.waitForTimeout(350);
    for(let page=0;page<count;page++){
     await cmd(host,`tutorial:${game}:${page}`);await tutorial(host,game,page);
     const current=await state(host);assert.ok(current.controls.every(c=>c.id.startsWith('tutorial-')));
     await host.screenshot({path:path.join(artifacts,`tutorial-${game}-${page}-${width}.png`)});
    }
   }
   await click(host,'tutorial-prev');await tutorial(host,game,count-2);await click(host,'tutorial-next');await tutorial(host,game,count-1);await click(host,'tutorial-next');await tutorial(host,'',0);
  }
  checks.push('貼紙五頁、企鵝四頁、360/390/945/1365px、真實點擊翻頁及完成');
  await host.setViewportSize({width:945,height:820});await room(host,{type:'create',name:'教學老師'});await wait(host,()=>puzzleRoomState.connected&&puzzleRoomState.isHost);
  await cmd(host,'open:sticker:0');await wait(host,()=>puzzleUnityState.game==='sticker');
  const code=await host.evaluate(()=>puzzleRoomState.code),student=await player();
  await room(student,{type:'join',code,name:'小兔'});await wait(student,()=>puzzleRoomState.connected);
  await wait(student,()=>puzzleUnityState.game==='sticker'&&puzzleUnityState.room.mySlot===0&&puzzleUnityState.room.slotNames[0]==='小兔');
  await cmd(student,'set:0:red');await wait(host,()=>puzzleUnityState.settings[0]==='red'&&puzzleUnityState.room.slotNames[0]==='小兔');
  checks.push('老師先開題再加入：學生立即同步本題、顯示本人名稱且可作答');
  for(const game of ['sticker','penguin']){
   const previousRound=(await state(host)).room.roundId;
   await cmd(host,`open:${game}:0`);await wait(host,r=>puzzleUnityState.room.roundId>r,previousRound);
   const round=(await state(host)).room.roundId;
   await wait(student,({game,round})=>puzzleUnityState.game===game&&puzzleUnityState.room.roundId===round&&puzzleUnityState.room.mySlot===0,{game,round});
   const choice=game==='sticker'?'red':'right';await cmd(student,`set:0:${choice}`);await wait(host,({game,choice})=>puzzleUnityState.game===game&&puzzleUnityState.settings[0]===choice,{game,choice});
   const before=await state(host);
   await click(host,'tutorial-current');await tutorial(student,game,0);
   await cmd(student,`tutorial:${game}:2`);await cmd(student,'tutorial-close');await cmd(student,`set:0:${game==='sticker'?'blue':'left'}`);await student.waitForTimeout(400);await tutorial(student,game,0);
   assert.deepEqual((await state(host)).settings,before.settings);
   assert.equal((await state(student)).controls.length,0,'學生不能翻頁或操作背景');
   await click(host,'tutorial-next');await tutorial(student,game,1);
   if(game==='sticker'){
    const late=await player();await room(late,{type:'join',code,name:'晚到小熊'});await wait(late,()=>puzzleRoomState.connected);await tutorial(late,game,1);
    await click(host,'tutorial-next');await tutorial(late,game,2);await tutorial(student,game,2);await room(late,{type:'leave'});await wait(late,()=>!puzzleRoomState.connected);await tutorial(late,'',0);
    checks.push('晚加入跟隨目前頁，離房清除教學');
   }
   for(let page=(await state(host)).tutorialPage+1;page<(game==='sticker'?5:4);page++){
    await click(host,'tutorial-next');await tutorial(student,game,page);
   }
   await click(host,'tutorial-close');await tutorial(student,'',0);const after=await state(host);assert.deepEqual(after.settings,before.settings);assert.equal(after.room.roundId,before.room.roundId);assert.deepEqual(after.room.slotGroups,before.room.slotGroups);
   checks.push(game+' 老師開啟／翻頁／關閉全房同步，學生不可越權，保留作答與分工');
  }
  await click(host,'tutorial-current');await tutorial(student,'penguin',0);await room(host,{type:'leave'});await wait(student,()=>!puzzleRoomState.connected);await tutorial(student,'',0);
  assert.ok(sockets.some(s=>/photon|exitgames/i.test(s)));assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(artifacts,'tutorial-report.json'),JSON.stringify({version:require('../package.json').version,passed:true,checks,errors,sockets},null,2));console.log('PASS '+checks.join('\nPASS '));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
