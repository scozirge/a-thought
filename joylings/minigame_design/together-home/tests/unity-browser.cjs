const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const H=require('./unity-helpers.cjs');
(async()=>{const browser=await H.launch(),results=[];try{
 const teacher=await H.open(browser,'?tip=true'),p=teacher.page;
 assert.equal(await p.locator('#levels option').count(),21);assert.ok(await p.locator('#teacher').isVisible());
 const selected=process.env.TOGETHER_UNITY_LEVELS?process.env.TOGETHER_UNITY_LEVELS.split(',').map(Number):Array.from({length:21},(_,i)=>i);
 for(const index of selected){
  await H.level(teacher,index);await p.locator('#demo').click();await H.wait(teacher,()=>window.togetherUnityState.demo);
  if(index===0){await p.waitForTimeout(600);await p.locator('#demo').click();await H.wait(teacher,()=>window.togetherUnityState.paused);const before=(await H.state(teacher)).state;await p.waitForTimeout(600);assert.deepEqual((await H.state(teacher)).state,before);await p.locator('#demo').click();}
  await H.wait(teacher,()=>window.togetherUnityState.state.won||window.togetherUnityState.state.failed,null,240000);
  const s=await H.state(teacher);assert.ok(s.state.won&&!s.state.failed,'Unity 第 '+index+' 關');assert.ok(s.state.collected.every(Boolean));assert.ok(s.state.players.every(p=>p.exited));assert.deepEqual(s.completed,[]);
  await p.screenshot({path:path.join(H.output,`unity-win-${index}.png`)});results.push({level:index,won:s.state.won,clock:s.state.clock});console.log('PASS Unity 正常按鍵示範：第 '+index+' 關');
 }
 await H.level(teacher,20);await p.locator('#demo').click();await p.waitForTimeout(400);await p.locator('#stop').click();await H.wait(teacher,()=>!window.togetherUnityState.demo);assert.equal((await H.state(teacher)).state.collected.filter(Boolean).length,0);
 const initialX=(await H.state(teacher)).state.players[0].x;await p.keyboard.down('d');await p.waitForTimeout(250);await p.keyboard.up('d');assert.ok((await H.state(teacher)).state.players[0].x>initialX);
 const phone=await H.open(browser,'?level=0',true);assert.equal(await phone.page.locator('#teacher').isVisible(),false);
 // Real multi-touch: hold the stick and jump with another finger.
 const stick=await H.point(phone,'#stick',30),jump=await H.point(phone,'#jump');const start=(await H.state(phone)).state.players[0];
 await H.touch(phone,'touchStart',[{id:1,...stick}]);await phone.page.waitForTimeout(100);await H.touch(phone,'touchStart',[{id:1,...stick},{id:2,...jump}]);await phone.page.waitForTimeout(180);
 const moved=(await H.state(phone)).state.players[0];assert.ok(moved.x>start.x);assert.ok(moved.y<start.y);await H.touch(phone,'touchEnd',[]);
 for(const size of [{width:390,height:844},{width:320,height:740},{width:844,height:390}]){
  await phone.page.setViewportSize(size);assert.ok(await phone.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const a=await phone.page.locator('#stick').boundingBox(),b=await phone.page.locator('#jump').boundingBox(),c=await phone.page.locator('#unity-canvas').boundingBox();assert.ok(a.y>=c.y+c.height-1&&b.y>=c.y+c.height-1);assert.ok(a.x+a.width<=b.x);
  await phone.page.screenshot({path:path.join(H.output,`unity-mobile-${size.width}.png`)});
 }
 assert.deepEqual(teacher.errors,[]);assert.deepEqual(phone.errors,[]);fs.writeFileSync(path.join(H.output,'unity-playthrough.json'),JSON.stringify(results,null,2));
 console.log('PASS Unity WebGL、按鍵解題、暫停／停止、手機多點觸控與版面。');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
