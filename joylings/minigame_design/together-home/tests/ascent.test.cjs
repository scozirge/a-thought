const {test}=require('node:test'),assert=require('node:assert/strict'),G=require('../core.js');
const id=G.levels.findIndex(l=>l.preview==='ascent'),l=G.levels[id];
function run(s,n,a={},b={}){for(let i=0;i<n;i++)s=G.step(s,[a,b].map(c=>({...c,jump:i===0&&c.jump})));return s;}
function stand(s,i,x,floor){Object.assign(s.players[i],{x,y:floor-44,grounded:true,vy:0,vx:0,support:-1});}
test('二十關不含球與泡泡，保留認可的雲端路線與存檔',()=>{
 assert.equal(G.levels.length,20);assert.equal(G.levels.filter(l=>l.world).length,10);
 assert.ok(G.levels.every(l=>!l.ballGoals&&!l.targets&&!l.jumpBubbles));
 assert.equal(G.levels.find(l=>l.preview==='balance').saveKey,'trial-balance-1');
 assert.equal(l.world.width,3300);assert.equal(l.door.y+l.door.h,-600);assert.ok(l.jumpSwap&&l.phaseOnJump&&l.balances.length&&l.lifts.length&&l.movers.length&&l.iceZones.length);
 assert.equal(l.keys.length,2);assert.deepEqual(l.keys.map(k=>k.owner),[0,1]);assert.ok(!l.gravityFlip);
});
test('大地圖碰撞邊界放寬至3300，離開冰面可正常停住',()=>{
 let s=G.fresh(id);stand(s,0,1080,400);stand(s,1,20,400);s=run(s,60,{axis:1});assert.ok(s.players[0].x>1180);const x=s.players[0].x;s=run(s,30);assert.equal(s.players[0].x,x);
 stand(s,0,3260,-600);s.collected.fill(true);s=run(s,40,{axis:1});assert.ok(s.players[0].x<=3262);assert.ok(s.players[0].x>3200);
});
test('未開的日月接應門仍擋人，大地圖不能靠寬邊界穿門',()=>{
 let s=G.fresh(id);stand(s,0,270,400);s=run(s,40,{axis:1});assert.ok(s.players[0].x+38<=l.gates[0].x);assert.equal(s.won,false);s=run(s,140,{axis:1});assert.equal(s.failed,true);
});
test('大型關的低踏板不能靠單人重複跳升高，拿鑰匙後才固定',()=>{
 let s=G.fresh(id);stand(s,0,1510,400);stand(s,1,1050,400);
 for(let i=0;i<5;i++)s=run(s,110,{}, {jump:true});assert.equal(s.balances[0][1],400);assert.equal(s.collected[0],false);
 stand(s,1,1310,240);s=run(s,100,{}, {jump:true});assert.ok(s.balances[0][1]<400);
 s.collected[0]=true;s=run(s,220);assert.deepEqual(s.balances[0],[240,240]);
});
test('登塔電梯限定角色，兩次都需釋放下層再從上面接人',()=>{
 for(const [i,helper,rider] of [[0,1,0],[1,0,1]]){
  let s=G.fresh(id),lift=l.lifts[i],lower=lift.buttons[0],upper=lift.buttons[1];
  stand(s,helper,lift.x+40,lift.bottom);stand(s,rider,lower.x,lift.bottom);s=run(s,450);assert.equal(s.lifts[i],lift.bottom,'錯誤角色不能壓機關');
  stand(s,helper,lower.x,lift.bottom);stand(s,rider,lift.x+40,lift.bottom);s=run(s,450);assert.equal(s.lifts[i],lift.top);assert.equal(s.players[rider].y+44,lift.top);
  stand(s,rider,upper.x+90,lift.top);stand(s,helper,lower.x+80,lift.bottom);s=run(s,450);assert.equal(s.lifts[i],lift.bottom);
  stand(s,helper,lift.x+40,lift.bottom);stand(s,rider,upper.x,lift.top);s=run(s,450);assert.equal(s.lifts[i],lift.top);assert.equal(s.players[helper].y+44,lift.top);
 }
});
test('高空日月階梯確實交替，另一人亂跳會撤掉腳下踏板',()=>{
 let s=G.fresh(id);s.mode=1;stand(s,0,2712,-376);stand(s,1,2580,-320);
 assert.equal(G.platformActive(s,l.platforms[6]),true);
 s=run(s,1,{jump:true});assert.equal(s.mode,0);assert.equal(G.platformActive(s,l.platforms[6]),false);
 s=run(s,24);assert.ok(s.players[0].y> -420);
});
test('鏡頭跟隨左右及上下，不把整張大地圖壓成一個畫面',()=>{
 let s=G.fresh(id),start=G.camera(s);assert.equal(start.x,0);assert.equal(start.scale,1);
 for(const [x,y] of [[1300,240],[1950,240],[2250,-40],[2580,-320],[3100,-600]]){
  stand(s,0,x,y);stand(s,1,x-240,y+130);const v=G.camera(s);assert.ok(v.x>start.x);assert.ok(v.scale>=.65);
  for(const p of s.players){assert.ok(p.x>=v.x&&p.x+38<=v.x+v.w);assert.ok(p.y>=v.y&&p.y+44<=v.y+v.h);}
  assert.ok(v.x>=0&&v.x+v.w<=l.world.width+.01);assert.ok(v.y>=l.world.top&&v.y+v.h<=l.world.bottom+.01);
 }
 assert.ok(G.camera(s).y<start.y-500);assert.deepEqual(G.camera(G.fresh(id)),start);
});
test('深谷失敗終止，重試同時還原鏡頭、鑰匙和大型機關',()=>{
 let s=G.fresh(id);stand(s,0,1800,560);s=run(s,1);assert.ok(s.failed);assert.equal(s.won,false);assert.deepEqual(run(s,80,{axis:1},{jump:true}),s);
 const n=G.fresh(id);assert.deepEqual(n.collected,[false,false]);assert.deepEqual(n.lifts,[240,-40]);assert.deepEqual(n.balances,[[240,400]]);assert.equal(G.camera(n).x,0);
});
