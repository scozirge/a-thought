const {test}=require('node:test'),assert=require('node:assert/strict'),G=require('../core.js');
const id=preview=>G.levels.findIndex(l=>l.preview===preview);
function run(s,n,a={},b={}){for(let i=0;i<n;i++)s=G.step(s,[a,b].map(c=>({...c,jump:i===0&&c.jump,special:i===0&&c.special})));return s;}
function stand(s,i,x,y=400){Object.assign(s.players[i],{x,y:y-44,grounded:true,vy:0,vx:0,support:-1});}
test('保留的試玩關都只需方向與跳躍，整個主線移除煞車與大小狀態',()=>{
 assert.deepEqual(G.levels.filter(l=>l.trial).map(l=>l.preview),['balance','ascent']);
 for(const l of G.levels){assert.ok(!l.sizeSwap&&!l.iceBrake);if(l.legacy)continue;const s=G.fresh(l.id);assert.ok(!('big' in s)&&!('brakes' in s));assert.ok(s.players.every(p=>p.w===38&&p.h===44));if(!l.gravityFlip)assert.deepEqual(run(s,30,{special:true},{special:true}),run(s,30));}
});
test('蹺蹺板兩邊各一人不動，跳起讓朋友變重、兩板反向移動',()=>{
 let s=G.fresh(id('balance'));stand(s,1,310,240);stand(s,0,510,400);s=run(s,30);assert.deepEqual(s.balances[0],[240,400]);
 s=run(s,100,{jump:true});assert.ok(s.balances[0][0]>250);assert.ok(s.balances[0][1]<390);assert.ok(Math.abs(s.balances[0][0]+s.balances[0][1]-640)<.01);
 assert.equal(s.players[1].y+44,s.balances[0][0]);assert.equal(s.players[0].y+44,s.balances[0][1]);
});
test('蹺蹺板不能自己跳著上樓；上樓拿鑰匙後才固定接朋友',()=>{
 let s=G.fresh(id('balance'));stand(s,0,510);stand(s,1,60);
 for(let i=0;i<5;i++)s=run(s,110,{jump:true});assert.equal(s.balances[0][1],400);assert.equal(s.won,false);
 s.balances[0]=[400,240];stand(s,1,310);s.collected[0]=true;s=run(s,200);assert.deepEqual(s.balances[0],[240,240]);assert.equal(s.players[1].y+44,240);
});
