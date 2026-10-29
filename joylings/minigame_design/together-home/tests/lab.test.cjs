const test=require('node:test'),assert=require('node:assert/strict');
const levels=require('../lab-levels.js'),G=require('../core.js').create(levels,require('../lab-rules.js')(levels));
const Input=require('../input.js'),tapes=require('../lab-solutions.js');
const place=(s,i,x,floor=400)=>Object.assign(s.players[i],{x,y:floor-44,vy:0,grounded:true,support:-1,onBox:-1});
function ticks(s,n,a=[{},{}]){for(let t=0;t<n;t++)s=G.step(s,a.map(c=>({...c,jump:t===0&&c.jump})));return s;}
test('三個獨立試關只使用方向和跳躍，正式二十關不變',()=>{
  assert.equal(levels.length,3);assert.equal(require('../core.js').levels.length,20);
  for(const l of levels){assert.ok(!l.jumpSwap&&!l.gravityFlip&&!l.ice);assert.ok(l.hint.length<30);assert.ok(l.lab);}
});
for(const l of levels)test(`${l.name}：正常按鍵從起點拿齊鑰匙，兩人一起進門`,()=>{
  const tape=tapes.levels[l.saveKey],keyboard=Input.create();let s=G.fresh(l.id),frames=0;
  const original=JSON.stringify(s);
  for(const [n,bits] of tape.actions)for(let t=0;t<n;t++){
    keyboard.setMask(bits);s=G.step(s,keyboard.read());keyboard.consume();frames++;
    assert.ok(!s.failed);
    if(l.linkedBoxes)assert.ok(Math.abs(s.boxes[1].x-s.boxes[0].x-700)<1e-7);
  }
  assert.equal(frames,tape.frames);assert.ok(s.won&&s.players.every(p=>p.exited)&&s.collected.every(Boolean));
  assert.equal(JSON.stringify(G.fresh(l.id)),original);
});
test('渡船：真人離開就停，箱子不能代駕，反向箭頭相抵',()=>{
  let s=G.fresh();place(s,0,250,350);place(s,1,350);
  const old=s;s=ticks(s,60);assert.ok(s.rafts[0]>290);assert.ok(s.players[1].x>350);assert.equal(old.rafts[0],290);
  const stopped=s.rafts[0];place(s,0,200);s=ticks(s,60);assert.equal(s.rafts[0],stopped);
  s.boxes[0]={...s.boxes[0],x:250,y:308};s=ticks(s,60);assert.equal(s.rafts[0],stopped);
  place(s,0,250,350);place(s,1,660,350);s=ticks(s,60);assert.equal(s.rafts[0],stopped);
});
test('渡船帶著乘客和貨物一起水平移動，停靠不超過岸邊',()=>{
  let s=G.fresh();place(s,0,250,350);place(s,1,300);s.boxes[0].x=355;
  s=ticks(s,240);assert.equal(s.rafts[0],500);assert.ok(Math.abs(s.players[1].x-510)<.01);assert.ok(Math.abs(s.boxes[0].x-565)<.01);
});
test('貨物門必須兩個箱子各放一岸，真人站上去不能頂替',()=>{
  let s=G.fresh();place(s,0,725);place(s,1,1410);assert.equal(G.gateOpen(s,0),false);
  s.boxes[0].x=725;assert.equal(G.gateOpen(s,0),false);s.boxes[1].x=1410;assert.equal(G.gateOpen(s,0),true);
  s.boxes[1].x=1480;assert.equal(G.gateOpen(s,0),false);
});
test('貨箱掉進河裡會立即提示重試，重來恢復兩船兩箱',()=>{
  let s=G.fresh();s.boxes[0].x=500;s.boxes[0].y=660;s.boxes[0].grounded=false;
  s=G.step(s,[{},{}]);assert.ok(s.failed&&s.lostCargo);assert.deepEqual(G.fresh().rafts,[290,840]);
});
test('影子：每人只能留一個，新腳印換掉舊影子，單人無法開雙影門',()=>{
  let s=G.fresh(1);place(s,0,170);s=G.step(s,[{},{}]);assert.deepEqual(s.echoes,[0,null]);
  place(s,0,350);s=G.step(s,[{},{}]);assert.deepEqual(s.echoes,[1,null]);assert.equal(G.gateOpen(s,0),false);
  place(s,1,170);s=G.step(s,[{},{}]);assert.equal(G.gateOpen(s,0),true);
});
test('影子：跳過腳印不覆寫；拿到鑰匙後該扇門保持開啟',()=>{
  let s=G.fresh(1);s.echoes=[0,1];place(s,0,282);s=ticks(s,70,[{axis:1,jump:true},{}]);assert.equal(s.echoes[0],0);
  s.collected[0]=true;s.echoes=[2,2];assert.equal(G.gateOpen(s,0),true);assert.equal(G.gateOpen(s,1),false);
});
test('影子：最後一門還要真人踩普通按鈕，影子不會取代第三個工作',()=>{
  let s=G.fresh(1);s.echoes=[0,2];assert.equal(G.gateOpen(s,2),false);
  place(s,1,1345);s=G.step(s,[{},{}]);assert.equal(G.gateOpen(s,2),true);assert.deepEqual(s.echoes,[0,2]);
});
test('連動箱子：對方門關著時兩箱一起停，不能各自穿門',()=>{
  let s=G.fresh(2);s.boxes[0].x=228;s.boxes[1].x=928;place(s,1,976);place(s,0,80);
  s=ticks(s,240,[{},{axis:-1}]);assert.ok(s.boxes[1].x>=928);
  assert.ok(Math.abs(s.boxes[1].x-s.boxes[0].x-700)<1e-7);
});
test('連動箱子：同時反向推不動；隊友擋住任一箱，兩箱一起停',()=>{
  let s=G.fresh(2);place(s,0,222);place(s,1,1008);
  s=ticks(s,120,[{axis:1},{axis:-1}]);assert.deepEqual(s.boxes.map(b=>b.x),[260,960]);
  s=G.fresh(2);place(s,0,222);place(s,1,1008);s=ticks(s,60,[{axis:1},{}]);
  assert.ok(s.boxes[0].x<262&&Math.abs(s.boxes[1].x-s.boxes[0].x-700)<1e-7);
});
test('連動箱子：踩板者走開關門時仍保持間距，不夾穿角色',()=>{
  let s=G.fresh(2);s.boxes[0].x=199;s.boxes[1].x=899;place(s,0,552);place(s,1,947);
  s=ticks(s,80,[{axis:1},{axis:-1}]);
  assert.ok(Math.abs(s.boxes[1].x-s.boxes[0].x-700)<1e-7);assert.ok(s.boxes[1].x>=928);
  assert.ok(s.players[1].x>=s.boxes[1].x+s.boxes[1].w-1);
});
for(const l of levels)for(let g=0;g<l.gates.length;g++)test(`${l.name} 門 ${g+1}：慢幀與反覆跳躍不能穿關閉的門`,()=>{
  let s=G.fresh(l.id);const gate=l.gates[g];s.echoes=[null,null];
  place(s,0,gate.x-38);place(s,1,30);s.players[1].exited=true;
  for(let t=0;t<80;t++)s=G.step(s,[{axis:1,jump:t%2===0},{}],.25);
  assert.ok(s.players[0].x+38<=gate.x+.01);assert.equal(s.won,false);
});
