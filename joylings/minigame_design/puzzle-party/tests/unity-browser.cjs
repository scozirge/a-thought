const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require(process.env.PUZZLE_PLAYWRIGHT_MODULE||'playwright');
const R=require('../rules/rules.js'),{games}=require('../rules/catalog.js');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']});try{
 const page=await browser.newPage({viewport:{width:945,height:695},deviceScaleFactor:2}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(process.env.PUZZLE_UNITY_URL||'http://127.0.0.1:8191/');
 await page.waitForFunction(()=>window.puzzleUnityState&&window.unityInstance,{},{timeout:120000});
 const state=()=>page.evaluate(()=>window.puzzleUnityState);
 const command=async s=>page.evaluate(v=>window.unityInstance.SendMessage('PuzzleParty','Command',v),s);
 const scroll=async n=>{await page.evaluate(v=>window.unityInstance.SendMessage('PuzzleParty','Scroll',String(v)),n);await page.waitForTimeout(220);};
 async function click(id){let b=(await state()).controls.find(b=>b.id===id);assert.ok(b,'找不到按鈕 '+id);
  if(b.y<0||b.y+b.h>page.viewportSize().height){await scroll(b.y-page.viewportSize().height/2);b=(await state()).controls.find(b=>b.id===id);}
  assert.ok(b.x>=0&&b.x+b.w<=page.viewportSize().width,id+' 不應超出螢幕');
  await page.mouse.click(b.x+b.w/2,b.y+b.h/2);await page.waitForTimeout(180);
 }
 const shot=name=>page.screenshot({path:path.resolve(__dirname,'../artifacts/'+name+'.png')});
 assert.deepEqual((await state()).controls.filter(b=>b.id.startsWith('game:')).map(b=>b.id),['game:sticker','game:penguin']);
 assert.ok((await state()).textPixelSize>=18);
 await shot('unity-home-v10');await click('game:sticker');await page.waitForFunction(()=>puzzleUnityState.game==='sticker');
 assert.equal((await state()).role,'你是老師組');
 assert.equal((await state()).controls.filter(b=>b.id.startsWith('level:')).length,20);
 await shot('unity-sticker-v10-945');
 const first=R.solutions('sticker',games.sticker.levels[0])[0];
 for(let i=0;i<4;i++){await click('choose:'+i+':'+first[i]);assert.equal((await state()).role,'你是'+R.groups[i]);}
 await click('role:0');assert.equal((await state()).role,'你是'+R.groups[0]);
 await shot('unity-role-v10');await click('play');await page.waitForFunction(()=>puzzleUnityState.playing);await page.waitForFunction(()=>puzzleUnityState.finished,{},{timeout:20000});assert.equal((await state()).success,true);
 await command('speed');
 for(const [game,info]of Object.entries(games))for(let index=0;index<info.levels.length;index++){
  if(game==='sticker'&&index===0)continue;
  const l=info.levels[index],sol=R.solutions(game,l)[0];await command('open:'+game+':'+index);
  await page.waitForFunction(({game,index})=>puzzleUnityState.game===game&&puzzleUnityState.index===index&&!puzzleUnityState.playing,{game,index});
  assert.equal(sol.length,4);assert.equal((await state()).decisions,4);
  for(let i=0;i<sol.length;i++)await command('set:'+i+':'+sol[i]);
  await page.waitForFunction(sol=>puzzleUnityState.settings.join(',')===sol.join(','),sol);
  await command('play');await page.waitForFunction(()=>puzzleUnityState.playing);
  await page.waitForFunction(()=>puzzleUnityState.finished,{},{timeout:20000});assert.equal((await state()).success,true,l.id);
  console.log('PASS Unity '+l.id);
 }
 // 移除的內容無法從除錯橋開啟；貼紙最後一關回選單。
 await command('open:sticker:19');await page.waitForFunction(()=>puzzleUnityState.game==='sticker');
 await command('open:hero:0');await page.waitForTimeout(250);assert.equal((await state()).game,'sticker');
 await command('open:animal:0');await page.waitForTimeout(250);assert.equal((await state()).game,'sticker');
 const last=R.solutions('sticker',games.sticker.levels[19])[0];for(let i=0;i<last.length;i++)await command('set:'+i+':'+last[i]);
 await command('play');await page.waitForFunction(()=>puzzleUnityState.playing);await page.waitForFunction(()=>puzzleUnityState.finished);
 await click('next');await page.waitForFunction(()=>puzzleUnityState.game==='');
 // 暫停與失敗後修改保留設定。
 await command('open:penguin:19');await page.waitForFunction(()=>puzzleUnityState.game==='penguin');
 const l=games.penguin.levels[19],sol=R.solutions('penguin',l)[0],wrong=sol.slice();wrong[2]=R.optionsFor('penguin',l)[2].find(v=>v!==sol[2]);
 for(let i=0;i<wrong.length;i++)await command('set:'+i+':'+wrong[i]);
 await command('play');await page.waitForFunction(()=>puzzleUnityState.playing);await command('pause');await page.waitForFunction(()=>puzzleUnityState.paused);
 const frozen=(await state()).penguins;await page.waitForTimeout(300);assert.deepEqual((await state()).penguins,frozen);
 await command('pause');await page.waitForFunction(()=>puzzleUnityState.finished);assert.equal((await state()).success,false);assert.deepEqual((await state()).settings,wrong);
 await command('set:2:'+sol[2]);await page.waitForTimeout(220);assert.deepEqual((await state()).settings,sol);
 await page.setViewportSize({width:1365,height:1100});await command('open:penguin:9');await page.waitForTimeout(300);await shot('unity-penguin-v10-wide');
 await page.setViewportSize({width:390,height:844});await command('open:sticker:9');await page.waitForTimeout(400);await shot('unity-mobile-v10');
 assert.ok((await state()).textPixelSize>=18);
 await click('choose:0:red');assert.equal((await state()).role,'你是'+R.groups[0]);await shot('unity-mobile-controls-v10');
 await click('choose:3:blue');
 const client=await page.context().newCDPSession(page),oldY=(await state()).controls.find(c=>c.id==='play').y;
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:200,y:350}]});
 await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:200,y:600}]});
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(300);
 assert.ok((await state()).controls.find(c=>c.id==='play').y>oldY,'觸控可往回捲動');

 // 四個格子都用滑鼠點選：每組各一次，修改單組保留其他三組設定。
 await page.setViewportSize({width:945,height:950});await command('open:sticker:19');await page.waitForFunction(()=>puzzleUnityState.game==='sticker');await click('clear');
 const answer=R.solutions('sticker',games.sticker.levels[19])[0],bad=answer.slice();bad[2]=games.sticker.levels[19].palette.find(v=>v!==answer[2]);
 for(let i=0;i<4;i++){
   if(i===3){await command('play');await page.waitForTimeout(200);assert.equal((await state()).playing,false);assert.equal((await state()).finished,false);}
   await click('choose:'+i+':'+bad[i]);assert.equal((await state()).role,'你是'+R.groupFor(i));assert.equal((await state()).decisions,4);
 }
 assert.equal((await state()).finished,false);assert.deepEqual((await state()).settings,bad);assert.ok((await state()).board.every(v=>!v));
 await command('play');await page.waitForFunction(()=>puzzleUnityState.playing);await page.waitForFunction(()=>puzzleUnityState.finished);
 assert.equal((await state()).success,false);assert.deepEqual((await state()).settings,bad);
 await click('choose:2:'+answer[2]);assert.deepEqual((await state()).settings,answer);
 await command('home');await page.waitForFunction(()=>puzzleUnityState.game==='');await command('open:sticker:19');await page.waitForFunction(()=>puzzleUnityState.game==='sticker');assert.deepEqual((await state()).settings,answer);
 await command('play');await page.waitForFunction(()=>puzzleUnityState.playing);await command('stop');await page.waitForFunction(()=>!puzzleUnityState.playing);
 assert.ok((await state()).board.every(v=>!v));assert.deepEqual((await state()).settings,answer);
 for(const width of [390,945,1365]){
   await page.setViewportSize({width,height:900});await command('open:sticker:19');await page.waitForTimeout(300);await shot('unity-sticker-four-v10-'+width);
   await click('choose:3:'+answer[3]);assert.equal((await state()).role,'你是老師組');assert.equal((await state()).decisions,4);await shot('unity-sticker-four-controls-v10-'+width);
   assert.ok((await state()).controls.every(b=>b.x>=0&&b.x+b.w<=width));
   await command('open:penguin:19');await page.waitForFunction(()=>puzzleUnityState.game==='penguin');await page.waitForTimeout(300);await shot('unity-penguin-four-v10-'+width);
   await click('choose:3:'+sol[3]);assert.equal((await state()).decisions,4);await shot('unity-penguin-four-controls-v10-'+width);
 }
 await click('clear');assert.ok((await state()).settings.every(v=>!v));assert.equal((await state()).decisions,4);
 assert.deepEqual(errors,[]);console.log('PASS Unity 40 關、四組各一次、組別身分、18px 字級、滑鼠與觸控、暫停/保存/停止/清空、945/390/1365 寬度、無瀏覽器錯誤');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

