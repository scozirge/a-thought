const {test}=require('node:test'),assert=require('node:assert/strict'),G=require('../core.js'),{solve}=require('./helpers.cjs');
test('every level is solvable, valid throughout, and undo restores previous shore',()=>{
 G.levels.forEach((l,i)=>{
  let s=G.fresh(i);const route=solve(i);assert.ok(route.length>=3&&route.length<=9);
  for(const cargo of route){
   const before=G.clone(s);
   for(const index of cargo){const r=G.load(s,index);assert.equal(r.error,undefined);s=r.state;}
   const r=G.cross(s);assert.equal(r.error,undefined);s=r.state;assert.ok(G.valid(s));
   assert.deepEqual(G.undo(s).state,before);
  }
  assert.ok(G.won(s));assert.ok(G.cross(s).error);
 });
});
test('unsafe departures preserve the entire input and identify the conflict',()=>{
 let s=G.fresh(1);s=G.load(s,0).state;const before=G.clone(s),r=G.cross(s);
 assert.ok(r.error);assert.deepEqual(r.conflict,{a:'fuzz',b:'cake',verb:'偷吃',bank:0});assert.deepEqual(s,before);
 assert.ok(G.cross(G.fresh(1)).conflict);
});
test('captain and guardian independently protect the unattended bank',()=>{
 const s=G.fresh(3);
 assert.equal(G.conflict(s),null);
 const guarded={...s,bank:1};assert.equal(G.conflict(guarded),null);
 const withoutStone={...guarded,positions:[0,0,0,0,1]};
 assert.ok(G.conflict(withoutStone));
 let transported=G.load(s,0).state;transported=G.cross(transported).state;
 assert.ok(G.valid(transported));assert.equal(transported.bank,1);
});
test('seat and weight constraints are independent, unloading and empty return work',()=>{
 let s=G.fresh(1);s=G.load(s,1).state;
 assert.match(G.load(s,0).error,/滿/);
 s=G.load(s,1).state;assert.equal(s.cargo.length,0);
 s=G.load(s,1).state;s=G.cross(s).state;
 assert.ok(G.load(s,0).error);
 const back=G.cross(s);assert.equal(back.error,undefined);assert.equal(back.state.bank,0);
 let heavy=G.fresh(2);heavy=G.load(heavy,0).state;heavy=G.load(heavy,1).state;
 assert.equal(G.weight(heavy),4);assert.match(G.cross(heavy).error,/太重/);assert.ok(G.valid(heavy));
});
test('stored state rejects invalid passengers, shores and unsafe banks',()=>{
 assert.equal(G.valid(null),false);assert.ok(G.valid(G.fresh()));
 for(const modify of [s=>s.cargo=[0,0],s=>s.bank=3,s=>s.positions[0]=9,s=>s.level=9,s=>s.bank=1]){
  const s=G.fresh();modify(s);assert.equal(G.valid(s),false);
 }
});
