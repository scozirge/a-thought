const {test}=require('node:test'),assert=require('node:assert/strict'),G=require('../core.js');
const {solveFrogs,candidates}=require('./helpers.cjs');
test('scale outcomes, unequal-group rejection, move invalidates current reading',()=>{
 let s=G.scale(0,1),original=G.clone(s);
 assert.ok(G.weigh(s).error);
 s=G.place(s,1,-1).state;assert.deepEqual(original,G.scale(0,1));assert.ok(G.weigh(s).error);
 s=G.place(s,2,1).state;s=G.weigh(s).state;assert.equal(s.result,1);
 assert.equal(s.log.length,1);assert.ok(G.validScale(s));
 s=G.place(s,1,0).state;assert.equal(s.result,null);assert.equal(s.log.length,1);
 assert.ok(G.place(s,99,0).error);
 for(const [odd,result] of [[1,1],[2,-1],[3,0]]){
  const t=G.scale(0,odd);t.sides=[-1,1,0];
  assert.equal(G.weigh(t).state.result,result);
 }
});
test('every hidden gem in every level can be found with balanced-group inference',()=>{
 for(let level=0;level<3;level++)for(let odd=1;odd<=G.counts[level];odd++){
  let s=G.scale(level,odd),remaining=candidates(s);
  while(remaining.length>1){
   const group=Math.ceil(remaining.length/3),left=remaining.slice(0,group),right=remaining.slice(group,group*2);
   s.sides=s.sides.map((_,i)=>left.includes(i+1)?-1:right.includes(i+1)?1:0);
   const r=G.weigh(s);assert.equal(r.error,undefined);s=r.state;remaining=candidates(s);
   assert.ok(s.log.length<=2);assert.ok(G.validScale(s));
  }
  assert.deepEqual(remaining,[odd]);
 }
});
test('frog rules allow forward slide or jump over one opposing frog',()=>{
 const s=G.frogs();
 assert.deepEqual(G.moves(s),[1,3]);
 assert.equal(G.destination([1,-1,0],0),2);
 assert.equal(G.destination([1,1,0],0),-1);
 assert.equal(G.destination([0,1,-1],1),-1);
 assert.equal(G.destination([0,-1,1],1),0);
 assert.ok(G.jump(s,0).error);
 const r=G.jump(s,1);assert.deepEqual(s,G.frogs());assert.deepEqual(r.state.board,[1,0,1,-1,-1]);
});
test('all frog levels solve, validate and undo back to start',()=>{
 for(let level=0;level<3;level++){
  let s=G.frogs(level),path=solveFrogs(level);
  assert.equal(path.length,[8,15,24][level]);
  for(const from of path){s=G.jump(s,from).state;assert.ok(G.validFrogs(s));}
  assert.ok(G.solved(s));assert.deepEqual(G.moves(s),[]);
  for(let i=0;i<path.length;i++)s=G.undo(s).state;
  assert.deepEqual(s,G.frogs(level));assert.ok(G.undo(s).error);
 }
});
test('reject malformed or impossible saved states',()=>{
 assert.equal(G.validScale(null),false);assert.equal(G.validFrogs(null),false);
 const s=G.scale();s.odd=0;assert.equal(G.validScale(s),false);
 const f=G.frogs();f.board.reverse();assert.equal(G.validFrogs(f),false);
 const g=G.frogs();g.history=[g.board.slice()];assert.equal(G.validFrogs(g),false);
});
