const {test}=require('node:test'),assert=require('node:assert/strict'),G=require('../core.js'),{solve}=require('./solver.cjs');
G.levels.forEach((l,i)=>test('level '+(i+1)+' valid layout and shortest solution',()=>{const occupied=new Set();l.blocks.forEach((b,id)=>{assert.ok(['h','v'].includes(b.axis));assert.ok(b.len===2||b.len===3);assert.ok(b.start>=0&&b.start+b.len<=6);assert.ok(b.fixed>=0&&b.fixed<6);for(let k=0;k<b.len;k++){const cell=b.axis==='h'?b.fixed*6+b.start+k:(b.start+k)*6+b.fixed;assert.ok(!occupied.has(cell),'overlap');occupied.add(cell);}});assert.equal(l.blocks[0].axis,'h');assert.equal(l.blocks[0].fixed,2);assert.equal(l.blocks[0].len,2);const path=solve(l);assert.equal(path.length,l.minMoves);assert.ok(l.limit>=path.length);if(i)assert.ok(l.minMoves>=G.levels[i-1].minMoves);const s=G.replay(i,path);assert.ok(G.won(s));assert.equal(s.moves,path.length);}));
test('collision and wall cannot be crossed; non-integer and partial exit rejected',()=>{const s=G.fresh();for(const to of [-1,2,4,5,6,1.5])assert.ok(G.move(s,0,to).error);assert.ok(G.move(s,9,0).error);});
test('any distance in a straight slide is one move; immutable state',()=>{const s=G.fresh(),r=G.move(s,1,4);assert.equal(r.state.moves,1);assert.deepEqual(s,G.fresh());assert.equal(r.state.pos[1],4);const exit=G.move(r.state,0,6);assert.ok(G.won(exit.state));assert.equal(exit.state.moves,2);assert.ok(G.move(exit.state,1,1).error);});
test('budget stops further movement; can replay shorter history to undo',()=>{const actions=[{block:1,to:3},{block:1,to:4},{block:1,to:3},{block:1,to:4}],s=G.replay(0,actions);assert.equal(s.moves,G.levels[0].limit);assert.ok(G.move(s,0,6).error);const undo=G.replay(0,actions.slice(0,-1));assert.ok(G.won(G.move(undo,0,6).state));});
test('no-op and bad save do not consume moves',()=>{const s=G.fresh();assert.ok(G.move(s,1,1).error);assert.equal(s.moves,0);assert.throws(()=>G.replay(0,[{block:0,to:6}]));assert.deepEqual(G.restore('bad').state,s);const restored=G.restore(JSON.stringify({version:1,level:0,actions:[{block:1,to:4}],best:{0:2,1:99}}));assert.equal(restored.state.moves,1);assert.deepEqual(restored.best,{0:2});});


test('twelve levels follow requested order and difficulty',()=>{assert.deepEqual(G.levels.map(l=>l.minMoves),[2,3,5,11,13,14,15,16,19,22,22,22]);assert.deepEqual(G.levels.map(l=>l.limit),[4,5,7,14,16,17,18,20,23,26,26,26]);assert.equal(new Set(G.levels.map(l=>l.blocks.map(b=>[b.axis,b.fixed,b.len,b.start].join(',')).sort().join(';'))).size,12);});
test('v1 original completed progress maps into retained base levels',()=>{const old=require('./legacy-save.json'),r=G.restore(JSON.stringify(old));assert.equal(r.state.level,9);assert.ok(G.won(r.state));assert.equal(r.state.moves,22);assert.deepEqual(r.best,{0:2,1:3,2:5,3:11,4:13,7:16,8:19,9:22});assert.deepEqual(r.actions,old.actions);const again=G.restore(JSON.stringify({version:4,level:r.state.level,actions:r.actions,best:r.best}));assert.deepEqual(again,r);});
test('v2 changed final-level answers are discarded, old base scores retained',()=>{for(const oldLevel of [8,9]){const r=G.restore(JSON.stringify({...require('./v2-save.json'),level:oldLevel}));assert.equal(r.state.level,oldLevel+2);assert.equal(r.state.moves,0);assert.deepEqual(r.actions,[]);assert.deepEqual(r.best,{0:2,9:22});}});
test('v3 old final levels move to hidden levels without solving inserted levels',()=>{const r=G.restore(JSON.stringify(require('./v3-save.json')));assert.equal(r.state.level,11);assert.ok(G.won(r.state));assert.equal(r.best[10],22);assert.equal(r.best[11],22);assert.equal(r.best[5],undefined);assert.equal(r.best[6],undefined);assert.equal(G.unlocked(r.best),false);});
test('v4 hidden progress reloads without another migration',()=>{const l=11,r=G.restore(JSON.stringify({version:4,level:l,actions:G.levels[l].solution,best:{9:22,10:22,11:22}}));assert.ok(G.won(r.state));assert.equal(r.state.level,11);assert.deepEqual(r.best,{9:22,10:22,11:22});});
test('unlock requires all first ten completed, hidden wins do not count',()=>{const all=Object.fromEntries(G.levels.slice(0,10).map((l,i)=>[i,l.minMoves]));assert.equal(G.unlocked(all),true);for(let i=0;i<10;i++){const missing={...all,10:22,11:22};delete missing[i];assert.equal(G.unlocked(missing),false);}assert.equal(G.unlocked({10:22,11:22}),false);});
test('teacher answers match every shortest solution and finish within budget',()=>{for(let i=0;i<G.levels.length;i++){const l=G.levels[i];assert.equal(l.solution.length,l.minMoves);assert.ok(G.won(G.replay(i,l.solution)));}});

test('current-board answers are legal after a different move in every level',()=>{
 for(let i=0;i<G.levels.length;i++){
  let state=G.fresh(i);const first=G.levels[i].solution[0],range=G.bounds(state,first.block);
  const other=Array.from({length:range.max-range.min+1},(_,n)=>range.min+n).find(to=>to!==state.pos[first.block]&&to!==first.to);
  state=G.move(state,first.block,other??first.to).state;
  const path=G.solutionFrom(state);assert.ok(path);
  const shifted={...G.levels[i],blocks:G.levels[i].blocks.map((b,n)=>({...b,start:state.pos[n]}))};assert.equal(path.length,solve(shifted).length);
  for(const a of path){const r=G.move({...state,moves:0},a.block,a.to);assert.ok(r.state);state=r.state;}
  assert.ok(G.won(state));assert.deepEqual(G.solutionFrom(state),[]);
 }
});
test('screenshot level seven never asks the rightmost block two to move right',()=>{
 const state={level:6,moves:11,pos:[0,0,3,3,1,1,3,4,4,4,0,1,4]},path=G.solutionFrom(state);
 assert.ok(path.length);assert.ok(!(path[0].block===2&&path[0].to>3));
 for(const a of path){const r=G.move({...state,moves:0},a.block,a.to);assert.ok(r.state);Object.assign(state,r.state);}
 assert.ok(G.won(state));
});
