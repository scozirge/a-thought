const test=require('node:test'),assert=require('node:assert/strict'),G=require('../core.js');
for(const level of G.levels)test(level.name+'：同一份程式通過三組資料，輸入保持不變',()=>{
 for(const input of level.cases){const before=G.clone(input),code=G.clone(level.solution);const result=G.trace(code,level,input);assert.equal(result.ok,true,result.error);assert.deepEqual(input,before);assert.deepEqual(code,level.solution);assert.ok(result.events.length);}
});
test('固定答案只通過一台；加法規則會處理其他資料',()=>{
 const l=G.levels[0],fixed=[G.action('set',G.num(7))];assert.deepEqual(l.cases.map(c=>G.trace(fixed,l,c).ok),[true,false,false]);
});
test('大於不包含等於；5 格必須走否則分支',()=>{
 const l=G.levels[1],r=G.trace(l.solution,l,{energy:5});assert.equal(r.state.zone,'mail');assert.ok(r.events.some(e=>e.decision===false));
});
test('算式可嵌套，乘除優先順序由方塊結構決定',()=>{
 const a=G.calc('*',G.calc('+',G.num(3),G.num(2)),G.num(2));const b=G.calc('+',G.num(3),G.calc('*',G.num(2),G.num(2)));
 assert.equal(G.trace([G.action('set',a)],G.levels[0],{blue:5,yellow:5,energy:0}).state.energy,10);
 assert.equal(G.trace([G.action('set',b)],G.levels[0],{blue:5,yellow:5,energy:0}).state.energy,7);
 assert.equal(G.trace([G.action('set',G.calc('/',G.num(8),G.num(2)))],G.levels[0],{blue:2,yellow:2,energy:0}).ok,true);
});
test('除以零、分數電量、負電量與空格以錯誤停止，不改目前電量',()=>{
 for(const [expr,error] of [[G.calc('/',G.num(3),G.num(0)),'不能除以 0'],[G.calc('/',G.num(3),G.num(2)),'電量要是整數'],[null,'還有空格喔']]){
  const result=G.trace([G.action('set',expr)],G.levels[0],{blue:2,yellow:2,energy:0});assert.equal(result.error,error);assert.equal(result.state.energy,0);
 }
 assert.equal(G.trace([G.action('drain',G.num(5))],G.levels[2],{energy:3}).error,'電不夠放掉了');
});
test('後續算式讀取更新後的電量；放電 0 不會出錯',()=>{
 const p=[G.action('charge',G.num(2)),G.action('drain',G.calc('-',G.value('energy'),G.num(8)))];
 const r=G.trace(p,G.levels[2],{energy:8});assert.equal(r.ok,true);assert.equal(r.state.energy,8);
 assert.equal(G.trace(G.levels[2].solution,G.levels[2],{energy:8}).ok,true);
});
test('拒絕非法型別、未知數值與過深的程式',()=>{
 assert.equal(G.valid([{type:'set',expr:{type:'send',zone:'mail'}}],G.levels[0]),false);
 assert.equal(G.valid([{type:'set',expr:G.value('prototype')}],G.levels[0]),false);
 assert.equal(G.valid([G.action('set',G.num(Infinity))],G.levels[0]),false);
 let expr=G.num(1);for(let i=0;i<20;i++)expr=G.calc('+',expr,G.num(1));assert.equal(G.valid([G.action('set',expr)],G.levels[0]),false);
});
test('送出後不再執行另一個出口，沒有送出不能過關',()=>{
 const l=G.levels[1];assert.equal(G.trace([{type:'send',zone:'mail'},{type:'send',zone:'cargo'}],l,{energy:3}).state.zone,'mail');
 assert.equal(G.trace([G.branch(G.compare('=',G.num(1),G.num(1)))],l,{energy:3}).ok,false);
});
