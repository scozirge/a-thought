const {test}=require('node:test'),assert=require('node:assert/strict'),G=require('../core.js');
for(const [i,l] of G.levels.entries())test(l.name+'：所有訂單通過，程式與輸入不變',()=>{
 const before=JSON.stringify(l);
 for(const input of l.cases)assert.equal(G.trace(i,l.solution,input).ok,true);
 assert.equal(JSON.stringify(l),before);
});
test('除法使用精確分數，中途不是整數也可繼續運算',()=>{
 const result=G.trace(0,{a:'div2',b:'mul3',c:'add6'},{X:3,target:10.5});
 assert.equal(G.format(result.value),'21/2');assert.equal(result.ok,true);
 assert.equal(G.format(G.rational(8,4)),'2');assert.equal(G.format(G.rational(-3,-6)),'1/2');
 assert.throws(()=>G.rational(1,0),/不能除以 0/);
});
test('順序不能只靠首筆資料判斷，同值的其他做法也可接受',()=>{
 const alternate={a:'add6',b:'mul3',c:'div2'};
 for(const input of G.levels[0].cases)assert.equal(G.trace(0,alternate,input).ok,true);
 const wrong={a:'mul3',b:'add6',c:'div2'};
 assert.equal(G.trace(0,wrong,G.levels[0].cases[0]).ok,false);
});
test('第二關可反轉比較和兩條分支；等於 8 要得到 0',()=>{
 const p={test:'gt8',yes:'sub8',no:'reverse8',finish:'mul3'};
 for(const input of G.levels[1].cases)assert.equal(G.trace(1,p,input).ok,true);
 assert.equal(G.trace(1,p,{X:8,target:0}).value.n,0);
});
test('第三關比較加工後的總數；18 等於門檻時必須走否則',()=>{
 const p=G.levels[2].solution,result=G.trace(2,p,{X:9,Y:9,target:40});
 assert.equal(result.events[1].branch,'no');assert.equal(result.events[1].before.n,18);
 assert.equal(result.ok,true);
 const above=G.trace(2,p,{X:11,Y:9,target:7});
 assert.equal(above.events[1].branch,'yes');assert.equal(above.ok,true);
});
test('錯運算會顯示實際值；拒絕未知方塊、錯類型和不完整程式',()=>{
 const wrong=G.trace(0,{a:'mul3',b:'add6',c:'div2'},{X:2,target:12});
 assert.match(wrong.error,/做出 6，目標 12/);
 assert.equal(G.ready(0,G.blank(0)),false);
 assert.equal(G.valid(0,{a:'gt8',b:'add6',c:'mul3'}),false);
 assert.equal(G.valid(2,{...G.levels[2].solution,yes1:'javascript'}),false);
 assert.equal(G.valid(0,{...G.blank(0),extra:null}),false);
});
