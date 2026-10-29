const test=require('node:test'),assert=require('node:assert/strict');
const G=require('../core.js'),{mechanismLinks}=require('../art.js');
test('同一組橋、門與兩岸按鈕共用標記，另一座橋可明確區分',()=>{
  const l=G.levels.find(l=>l.preview==='bridge'),links=mechanismLinks(l);
  assert.equal(links.get(l.gates[0]),links.get(l.platforms.find(p=>p.pads)));
  assert.notEqual(links.get(l.gates[0]).color,links.get(l.gates[1]).color);
  assert.notEqual(links.get(l.gates[0]).shape,links.get(l.gates[1]).shape);
});
test('渡船不因共用中島按鈕被誤標為同一艘，岸邊只標能控制的船',()=>{
  const l=G.levels.find(l=>l.puzzle==='ferry'),links=mechanismLinks(l),[a,b]=l.rafts.map(f=>links.get(f));
  assert.notEqual(a,b);assert.notEqual(a.shape,b.shape);
  assert.deepEqual(links.pads.find(e=>e.pad.x===24).links,[a]);
  assert.deepEqual(links.pads.find(e=>e.pad.x===660).links,[a,b]);
  assert.deepEqual(links.pads.find(e=>e.pad.x===1450).links,[b]);
});
test('三層升降台各自配對上下按鈕，移動平台換位置也不換標記',()=>{
  const l=G.levels.find(l=>l.saveKey==='campaign-14-2'),links=mechanismLinks(l);
  assert.equal(new Set(l.lifts.map(f=>links.get(f).shape)).size,3);
  for(const f of l.lifts)for(const b of f.buttons)assert.ok(links.pads.find(e=>e.pad.x===b.x&&e.pad.y===b.y).links.includes(links.get(f)));
  const moving=G.levels.find(l=>l.coop==='moving-relay'),m=mechanismLinks(moving),p=moving.movers[0];
  assert.equal(m.get(p),m.get({...p,y:p.y+20}));
});
test('二十關及原型的配對不改動關卡資料，每組都有獨立顏色與形狀',()=>{
  for(const l of [...G.levels,...require('../lab-levels.js')]){
    const original=JSON.stringify(l),links=mechanismLinks(l);
    assert.equal(JSON.stringify(l),original);
    assert.equal(new Set(links.groups.map(g=>g.color)).size,links.groups.length);
    assert.equal(new Set(links.groups.map(g=>g.shape)).size,links.groups.length);
    for(const {links:refs} of links.pads)assert.ok(refs.length&&refs.every(r=>links.groups.includes(r)));
  }
});
