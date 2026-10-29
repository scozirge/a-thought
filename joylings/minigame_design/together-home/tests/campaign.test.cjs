const test=require('node:test'),assert=require('node:assert/strict'),G=require('../core.js');
const find=kind=>G.levels.find(l=>l.puzzle===kind);
const stand=(s,i,b)=>Object.assign(s.players[i],{x:b.x+5,y:b.y-44,grounded:true,vy:0});
test('十五張原關卡僅換順序，地圖、規則與存檔識別碼完整保留',()=>{
 const retained=G.levels.filter(l=>!l.puzzle);assert.equal(retained.length,15);
 for(const l of retained){const old=G.levels.previous.find(p=>p.saveKey===l.saveKey);assert.deepEqual({...l,id:old.id},old);}
 const removed=G.levels.previous.filter(p=>!G.levels.some(l=>l.saveKey===p.saveKey));
 assert.deepEqual(removed.map(l=>l.id+1),[1,11,13,16,17]);
 assert.equal(G.levels.length,20);assert.equal(new Set(G.levels.map(l=>l.saveKey)).size,20);
});
test('雙城連動塔：樓下移箱、樓上接手，最後還需要狗狗壓板',()=>{
 const l=find('linked-tower'),s=G.fresh(l.id);s.collected[0]=s.collected[1]=true;
 s.boxes[1].x=1260;s.boxes[0].x=560;assert.ok(G.gateOpen(s,3));assert.ok(!G.gateOpen(s,4));
 s.boxes[1].x=1390;s.boxes[0].x=690;assert.ok(!G.gateOpen(s,3));assert.ok(!G.gateOpen(s,4));
 stand(s,0,l.gates[4].buttons[1]);assert.ok(!G.gateOpen(s,4));
 stand(s,1,l.gates[4].buttons[1]);assert.ok(G.gateOpen(s,4));
 s.collected[2]=true;assert.ok(G.gateOpen(s,3));
});
test('貨運塔：過河鑰匙固定開門後才能取回貨箱，頂樓還要月亮和同一箱',()=>{
 for(const kind of ['ferry-tower','freight-final']){
  const l=find(kind),s=G.fresh(l.id),entry=l.gates.findIndex(g=>g.buttons?.length===2&&g.buttons.every(p=>p.crateOnly));
  assert.ok(!G.gateOpen(s,entry));s.collected[l.gates[entry].openAfterKey]=true;assert.ok(G.gateOpen(s,entry));
  const last=l.gates.length-1,pad=l.gates[last].buttons[0];s.mode=1;assert.ok(!G.gateOpen(s,last));
  stand(s,0,pad);stand(s,1,pad);assert.ok(!G.gateOpen(s,last),'真人不能代替頂樓貨箱');
  Object.assign(s.boxes[l.cargoBox],{x:pad.x,y:pad.y-42,grounded:true});assert.ok(G.gateOpen(s,last));
  s.mode=0;assert.ok(!G.gateOpen(s,last),'貨箱到位但日月錯誤仍不能通過');
 }
});
test('最後一關的連動箱與貨箱分工不同，六把鑰匙及兩人到家缺一不可',()=>{
 const l=find('freight-final'),s=G.fresh(l.id);assert.deepEqual(l.linkedBoxes,[[0,1]]);assert.equal(l.cargoBox,3);assert.equal(l.keys.length,6);
 s.collected[0]=s.collected[1]=true;stand(s,0,{x:l.door.x+20,y:80});stand(s,1,{x:l.door.x+25,y:80});
 const n=G.step(s,[{},{}]);assert.ok(!n.won&&!n.key);assert.ok(n.players.every(p=>!p.exited));
});
