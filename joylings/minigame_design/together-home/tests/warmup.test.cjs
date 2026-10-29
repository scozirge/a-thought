const test=require('node:test'),assert=require('node:assert/strict'),G=require('../core.js'),Input=require('../input.js'),warmup=require('../warmup.js');
test('第零關是獨立暖身，不改動原二十關編號及存檔',()=>{
  assert.equal(G.levels.length,20);assert.equal(G.levels.warmup.id,-1);assert.equal(G.levels[-1],warmup.level);
  assert.deepEqual(G.levels.map(l=>l.id),Array.from({length:20},(_,i)=>i));assert.ok(G.levels.every(l=>l.saveKey!=='warmup-1'));
});
test('暖身正常按鍵通關，鑰匙固定開門，兩個角色都要到家',()=>{
  let s=G.fresh(-1),frames=0,sawOpen=false,sawOneHome=false;const input=Input.create();
  for(const [n,bits] of warmup.tape.actions)for(let i=0;i<n;i++){
    input.setMask(bits);s=G.step(s,input.read());input.consume();frames++;
    if(s.key){assert.ok(G.gateOpen(s,0));sawOpen=true;}
    if(s.players.filter(p=>p.exited).length===1){sawOneHome=true;assert.ok(!s.won);}
  }
  assert.equal(frames,warmup.tape.frames);assert.ok(sawOpen&&sawOneHome&&s.won);assert.deepEqual(s.collectedBy,[0]);assert.ok(!s.failed);
});
test('暖身必須狗狗壓板，單人跑跳不能穿過門',()=>{
  let s=G.fresh(-1);for(let i=0;i<600;i++)s=G.step(s,[{axis:1,jump:i%90===0},{}]);
  assert.ok(!s.won&&!s.key&&!G.gateOpen(s,0));assert.ok(s.players[0].x+38<=450);
});
test('狗狗照第一句提示向右走即可踩板，不必先讓貓咪跳開',()=>{
  let s=G.fresh(-1);for(let i=0;i<125;i++)s=G.step(s,[{},{axis:1}]);
  assert.ok(G.gateOpen(s,0));assert.equal(s.players[0].x,warmup.level.starts[0]);assert.ok(!s.key);
});
