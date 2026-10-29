const {test}=require('node:test'),assert=require('node:assert/strict'),G=require('../core.js');
const id=name=>G.levels.findIndex(l=>l.mix===name);
function run(s,n,a={},b={}){for(let i=0;i<n;i++)s=G.step(s,[a,b].map(c=>({...c,jump:i===0&&c.jump,special:i===0&&c.special})));return s;}
function stand(s,i,x,y=400){Object.assign(s.players[i],{x,y:y-s.players[i].h,vy:0,vx:0,grounded:true,support:-1});}
test('所有關卡至多一個特殊動作，冰關只有貓狗各一把鑰匙',()=>{
 for(const l of G.levels){assert.ok(['iceBrake','gravityFlip','sizeSwap'].filter(k=>l[k]).length<=1);if(l.ice){assert.equal(l.keys.length,2);assert.deepEqual(l.keys.map(k=>k.owner).sort(),[0,1]);}}
});
test('接橋機關限定角色，對岸接手才可離開；箱子與錯誤角色無法代壓',()=>{
 let s=G.fresh(4),l=G.levels[4],pad=l.gates[0].pads[0];
 stand(s,0,140);assert.equal(G.gateOpen(s,0),false);
 s.boxes.push({x:140,y:358,w:42,h:42,grounded:true});assert.equal(G.weighted(s,pad),false);
 stand(s,0,80);stand(s,1,140);assert.equal(G.gateOpen(s,0),true);assert.equal(G.platformActive(s,l.platforms[0]),true);
 stand(s,1,200);assert.equal(G.gateOpen(s,0),false);
 stand(s,0,450);assert.equal(G.gateOpen(s,0),true);assert.equal(G.gateOpen(s,1),false);
 stand(s,0,550);assert.equal(G.gateOpen(s,0),false);assert.equal(G.gateOpen(s,1),true);
 stand(s,1,850);stand(s,0,600);assert.equal(G.gateOpen(s,1),true);
});
for(const index of [4,10,12,id('gravity-phase'),id('ice-gravity'),id('final')])test(`第 ${index+1} 關：隊友留在起點不能開第二段，鑰匙不能代替接應`,()=>{
 let s=G.fresh(index),l=G.levels[index];s.collected.fill(true);s.key=true;
 stand(s,1,140);stand(s,0,450);if(l.gravityFlip)s.mode=0;
 assert.equal(G.gateOpen(s,1),false);
 // Try running and repeatedly jumping through the second gate with a parked partner.
 for(let t=0;t<250&&!s.failed;t++)s=G.step(s,[{axis:1,jump:t%70===0},{jump:l.jumpSwap&&t%70===0}]);
 assert.equal(s.won,false);assert.ok(s.players[0].x+s.players[0].w<=l.gates[1].x,'不能跳過未開的接應門');
});
test('朋友離開壓板，腳下的橋立即失去支撐',()=>{
 let s=G.fresh(4);stand(s,0,285);stand(s,1,140);s=run(s,2);assert.equal(s.players[0].y,356);
 s=run(s,120,{}, {axis:-1});assert.equal(s.failed,true);assert.equal(s.fallen,0);
});
test('日月橋需要壓板與正確日月同時成立，不能只跳一下變出橋',()=>{
 let s=G.fresh(id('ice-phase')),bridge=G.levels[s.level].platforms[0];s.mode=1;
 assert.equal(G.platformActive(s,bridge),false);stand(s,1,140);assert.equal(G.platformActive(s,bridge),true);
 s.mode=0;assert.equal(G.platformActive(s,bridge),false);
});
for(const name of ['ice-lifts'])test(`${name} 不能自己按地面電梯，接回隊友需要上層角色`,()=>{
 let s=G.fresh(id(name));stand(s,0,140);stand(s,1,20);s=run(s,220);assert.equal(s.lifts[0],400);
 stand(s,0,300);stand(s,1,140);
 s=run(s,230);assert.equal(s.lifts[0],240);assert.equal(s.players[0].y+s.players[0].h,240);
 stand(s,0,550,240);stand(s,1,210);s=run(s,230);assert.equal(s.lifts[0],400);
 stand(s,0,450,240);stand(s,1,300);
 s=run(s,230);assert.equal(s.lifts[0],240);assert.equal(s.players[1].y+s.players[1].h,240);
});
test('交換跳躍必須靠近朋友，冰面只用左右控制速度',()=>{
 let s=G.fresh(id('ice-swap'));stand(s,0,320);stand(s,1,20);
 assert.equal(G.canHelp(s,G.levels[s.level]),false);let n=run(s,1,{}, {jump:true});assert.equal(n.players[0].grounded,true);
 stand(s,1,180);n=run(s,1,{}, {jump:true});assert.ok(n.players[0].vy<0);
});
test('窄冰岸滑行直接取鑰匙；不調整會掉落，反向減速可以停住',()=>{
 let s=G.fresh(id('ice-gaps'));stand(s,1,170);stand(s,0,320);s.players[0].vx=240;s=run(s,1);assert.equal(s.collected[0],true);
 assert.equal(run(s,160).failed,true);
 for(let i=0;i<50&&Math.abs(s.players[0].vx)>5;i++)s=run(s,1,{axis:-Math.sign(s.players[0].vx)});
 s=run(s,30);assert.equal(s.failed,false);assert.equal(s.players[0].vx,0);
});
test('斷頂關不能沿天花板一路通過，向上飄出也算失敗',()=>{
 let s=G.fresh(id('ice-gravity'));s.gravity[0]=-1;Object.assign(s.players[0],{x:330,y:100,vx:240,grounded:true});stand(s,1,140);
 s=run(s,180,{axis:1});assert.equal(s.failed,true);assert.equal(s.fallen,0);assert.ok(s.players[0].y+s.players[0].h< -40);
 const terminal=JSON.stringify(s);assert.equal(JSON.stringify(run(s,100,{}, {special:true})),terminal);
});
test('下落時翻重力可救回朋友，掉出後不能救；一人到家也不能豁免',()=>{
 let s=G.fresh(id('ice-gravity'));Object.assign(s.players[0],{x:250,y:430,grounded:false,vy:300});
 s=run(s,120,{}, {special:true});assert.equal(s.failed,false);assert.equal(s.players[0].y,100);
 s=G.fresh(s.level);s.players[1].exited=true;Object.assign(s.players[0],{x:250,y:G.levels[s.level].fallY+10,grounded:false});
 s=run(s,1);assert.equal(s.failed,true);assert.equal(s.won,false);assert.ok(s.collected.every(v=>!v));
 const terminal=JSON.stringify(s);assert.equal(JSON.stringify(run(s,100,{}, {special:true})),terminal);
});
test('終極關平台始終移動，幫跳換路會讓另一種橋消失',()=>{
 let s=G.fresh(id('final')),l=G.levels[s.level];stand(s,1,140);s.mode=1;
 Object.assign(s.players[0],{x:280,y:356,grounded:true});s=run(s,10);const before=s.players[0].y;
 s=run(s,80,{}, {special:true});assert.ok(s.clock>.5);assert.notEqual(s.players[0].y,before);assert.equal(s.failed,false);
 s=run(s,1,{}, {jump:true});assert.equal(s.mode,0);assert.equal(G.platformActive(s,l.movers[0]),false);
 s=run(s,150);assert.equal(s.failed,true);
});
for(const direction of [-1,1])test(`重箱向${direction>0?'右':'左'}推時，後排必須貼近，不能隔空合推`,()=>{
 let s=G.fresh(7),b=s.boxes[0],front=direction>0?b.x-38:b.x+b.w;
 s.players[0].x=front;s.players[1].x=front-direction*72;
 const original=b.x;s=run(s,1,{axis:direction},{axis:direction});assert.equal(s.boxes[0].x,original);
 let moving=0;
 for(let i=0;i<100;i++){
  const previous=s.boxes[0].x;s=run(s,1,{axis:direction},{axis:direction});
  if(s.boxes[0].x!==previous){moving++;assert.ok(Math.abs(s.players[0].x-s.players[1].x)-38<=3.01,'推動時兩人保持接觸');}
 }
 assert.ok(moving>5);
 s=G.fresh(7);b=s.boxes[0];s.players[0].x=direction>0?b.x-38:b.x+b.w;s.players[1].x=s.players[0].x-direction*38;
 const before=b.x;s=run(s,1,{axis:direction},{axis:direction,jump:true});assert.equal(s.boxes[0].x,before,'後排跳開不能繼續提供推力');
});
