const {test}=require('node:test'),assert=require('node:assert/strict'),G=require('../core.js');
test('完整方塊的三關解法都能處理三組資料',()=>{
  [['+'],['>','cargo','mail'],['<','fill','drain']].forEach((ids,i)=>{
    const program=G.compileCards(i,ids);
    assert.ok(G.valid(program,G.levels[i]));
    for(const input of G.levels[i].cases)assert.equal(G.trace(program,G.levels[i],input).ok,true);
  });
});
test('拒絕未放滿、錯類型與未知方塊',()=>{
  for(const ids of [[null,'cargo','mail'],['cargo','>','mail'],['>','missing','mail'],['>']])assert.equal(G.compileCards(1,ids),null);
});
test('等於邊界和錯誤動作仍依原本規則判斷',()=>{
  assert.equal(G.trace(G.compileCards(1,['>','cargo','mail']),G.levels[1],{energy:5}).state.zone,'mail');
  assert.equal(G.trace(G.compileCards(1,['=','cargo','mail']),G.levels[1],{energy:5}).ok,false);
  assert.equal(G.trace(G.compileCards(2,['<','plus2','drain']),G.levels[2],{energy:3}).ok,false);
  assert.equal(G.trace(G.compileCards(2,['>','drain','fill']),G.levels[2],{energy:8}).ok,true);
});
