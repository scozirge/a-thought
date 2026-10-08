const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PUZZLE_PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const startedAt=new Date().toISOString(),version=require('../package.json').version;
 const browser=await chromium.launch({executablePath:process.env.PUZZLE_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const pages=[],errors=[],base=process.env.PUZZLE_UNITY_URL||'http://127.0.0.1:8191/',dir=path.resolve(__dirname,'../artifacts');
 fs.mkdirSync(dir,{recursive:true});
 const send=(p,v)=>p.evaluate(v=>unityInstance.SendMessage('PuzzleParty','RoomCommand',JSON.stringify(v)),v);
 const wait=(p,fn,arg)=>p.waitForFunction(fn,arg,{timeout:65000});
 async function page(url=base){const context=await browser.newContext({viewport:{width:945,height:900}}),p=await context.newPage();pages.push(p);p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await wait(p,()=>window.unityInstance&&window.puzzleRoomState?.ready);assert.equal(await p.evaluate(()=>document.documentElement.outerHTML.match(/productVersion\s*:\s*['"]([^'"]+)['"]/)?.[1]),version);return p;}
 try{
  const a=await page(),b=await page();
  for(const p of [a,b]){await send(p,{type:'create',name:'合作老師'});await wait(p,()=>puzzleRoomState.connected);}
  const codes=await Promise.all([a,b].map(p=>p.evaluate(()=>puzzleRoomState.code)));assert.notEqual(codes[0],codes[1]);
  const student=await page(base+'?room='+codes[1]);
  await wait(student,c=>puzzleRoomState.rooms?.filter(r=>c.includes(r.code)).length===2,codes);
  assert.equal(await student.locator('[data-code="'+codes[1]+'"]').getAttribute('aria-pressed'),'true');
  assert.equal(await student.locator('#room-name').inputValue(),'');
  await student.locator('#room-join').click();assert.match(await student.locator('#room-error').textContent(),/請輸入組別名稱/);
  for(const width of [390,945,1365]){
   await student.setViewportSize({width,height:900});
   await student.screenshot({path:path.join(dir,'room-list-'+width+'.png')});
   assert.equal(await student.locator('#room-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth),true);
  }
  await student.locator('#room-refresh').click();await wait(student,c=>puzzleRoomState.lobbyReady&&!puzzleRoomState.lobbyBusy&&puzzleRoomState.rooms.some(r=>r.code===c),codes[1]);
  assert.equal(await student.locator('[data-code="'+codes[1]+'"]').getAttribute('aria-pressed'),'true');
  await student.locator('#room-name').fill('小兔');await student.locator('#room-join').click();
  await wait(student,c=>puzzleRoomState.connected&&puzzleRoomState.code===c,codes[1]);
  assert.equal(await a.evaluate(()=>puzzleRoomState.members.length),1);
  await wait(b,()=>puzzleRoomState.members.length===2);
  await wait(student,()=>puzzleUnityState?.role==='小兔');
  await student.evaluate(()=>puzzleOpenRoom());await student.locator('#room-solo').click();
  await wait(student,()=>!puzzleRoomState.connected&&!puzzleRoomState.busy&&!document.getElementById('room-dialog').open);
  await student.evaluate(()=>puzzleOpenRoom());await student.locator('#room-solo').click();
  await wait(student,()=>!puzzleRoomState.connected&&!puzzleRoomState.busy&&!puzzleRoomState.lobbyBusy&&!document.getElementById('room-dialog').open);
  for(const type of ['join','create']){
   await student.evaluate(({type,code})=>{
    puzzleOpenRoom();unityInstance.SendMessage('PuzzleParty','RoomCommand',JSON.stringify({type,code,name:'取消連線測試'}));
    document.getElementById('room-solo').click();
   },{type,code:codes[1]});
   await wait(student,()=>!puzzleRoomState.connected&&!puzzleRoomState.busy&&!puzzleRoomState.lobbyBusy&&!document.getElementById('room-dialog').open);
   await student.waitForTimeout(1200);
   assert.equal(await student.evaluate(()=>puzzleRoomState.connected||document.getElementById('room-dialog').open),false,'取消後舊連線不可復活');
  }
  await student.evaluate(()=>puzzleOpenRoom());await wait(student,c=>puzzleRoomState.rooms?.some(r=>r.code===c),codes[1]);
  await send(b,{type:'leave'});await wait(student,c=>puzzleRoomState.lobbyReady&&!puzzleRoomState.rooms.some(r=>r.code===c),codes[1]);
  assert.equal(await student.locator('#room-join').isDisabled(),true);
  await student.locator('[data-code="'+codes[0]+'"]').click();await student.locator('#room-join').click();
  await wait(student,c=>puzzleRoomState.connected&&puzzleRoomState.code===c,codes[0]);
  await send(a,{type:'leave'});await wait(student,()=>!puzzleRoomState.connected&&!puzzleRoomState.busy);
  await student.locator('#room-solo').click();
  await wait(student,()=>!puzzleRoomState.busy&&!puzzleRoomState.connected&&!document.getElementById('room-dialog').open);
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(dir,'rooms-v14-report.json'),JSON.stringify({startedAt,finishedAt:new Date().toISOString(),version,url:base,passed:true,checks:['同名房間識別','分享預選','空白名稱拒絕','刷新保留選房','390／945／1365px','連線中取消加入與建房','返回單機','關房移除','重新選房'],errors},null,2));
  console.log('PASS 房間清單：同名房間識別、分享預選、空白名稱、刷新保留選房、三種寬度、返回單機與取消清單、關房移除、重新選房');
 }catch(e){for(const [i,p] of pages.entries())await p.screenshot({path:path.join(dir,'room-list-failure-'+i+'.png')}).catch(()=>{});throw e;}
 finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
