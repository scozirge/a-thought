const {test}=require('node:test'),assert=require('node:assert/strict'),G=require('./previous-fixture.cjs');
function run(s,n,a={},b={}){for(let i=0;i<n;i++)s=G.step(s,[a,b].map(c=>({...c,jump:i===0&&c.jump,special:i===0&&c.special,ability:i===0&&c.ability})));return s;}
test('已確認玩法保留存檔與地圖，其餘淘汰玩法不回來',()=>{
 assert.equal(G.levels[1].saveKey,'preview-swap-1');assert.equal(G.levels[2].saveKey,'preview-phase-1');assert.equal(G.levels[3].saveKey,'preview-gravity-1');assert.equal(G.levels[3].group,'main');
 assert.deepEqual(G.levels[1].platforms.map(p=>[p.x,p.y,p.w]),[[260,344,180],[440,288,180],[620,232,160],[780,176,220]]);
 assert.deepEqual(G.levels[2].platforms.map(p=>p.mode),[1,undefined,0,undefined,1,undefined]);
 assert.ok(!G.levels.some(l=>['sync','pilot','spring','portal','charge','echo','magnet','relay'].includes(l.preview)));
});
test('交換跳躍由朋友按，左右仍控制自己',()=>{const s=run(G.fresh(1),1,{jump:true,axis:1});assert.ok(s.players[1].vy<0);assert.equal(s.players[0].grounded,true);assert.ok(s.players[0].x>80);});
test('換路只在實際起跳翻轉，同時跳只換一次',()=>{let s=run(G.fresh(2),1,{jump:true},{jump:true});assert.equal(s.mode,1);s=run(s,1,{jump:true},{jump:true});assert.equal(s.mode,1);});
test('換路踏板消失會落下，木台維持安全',()=>{
 let s=G.fresh(2);s.mode=1;Object.assign(s.players[0],{x:270,y:300,grounded:true});s=run(s,8,{}, {jump:true});assert.equal(s.mode,0);assert.ok(s.players[0].y>300);
 s=G.fresh(2);Object.assign(s.players[0],{x:410,y:244,grounded:true});s=run(s,8,{}, {jump:true});assert.equal(s.players[0].y,244);
});
test('重力按鍵翻朋友，慢幀只翻一次，落在天花板後可跳離',()=>{
 const original=G.fresh(3),before=JSON.stringify(original);let s=G.step(original,[{}, {special:true}],.25);
 assert.deepEqual(s.gravity,[-1,1]);assert.equal(JSON.stringify(original),before);s=run(s,100);assert.equal(s.players[0].y,100);assert.equal(s.players[1].y,356);
 s=run(s,1,{jump:true});assert.ok(s.players[0].vy>0);s=run(s,100);assert.equal(s.players[0].y,100);
 s=run(s,120,{}, {special:true});assert.equal(s.players[0].y,356);
});
test('重力玩家不能越過未開門，同伴到家後仍可幫忙翻回',()=>{
 let s=run(G.fresh(3),120,{special:true});s=run(s,260,{}, {axis:1});assert.ok(s.players[1].x+38<=380);
 s.players[0].exited=true;s=run(s,120,{special:true});assert.equal(s.gravity[1],1);assert.equal(s.players[1].y,356);
});
test('隔岸接橋沒有特殊動作，按鍵不凍住角色或時間',()=>{
 const s=G.fresh(4),before=JSON.stringify(s),n=G.step(s,[{special:true,axis:1},{special:true}],.25);
 assert.ok(n.clock>s.clock);assert.ok(n.players[0].x>s.players[0].x);assert.equal(JSON.stringify(s),before);
 assert.ok(!('freezer' in n));
});
test('冰面保留慣性，只用反向減速，特殊鍵不會使朋友停住',()=>{
 let s=G.fresh(6);s.players[0].x=200;s.players[1].x=50;s.players[0].vx=180;
 const n=run(s,1,{}, {special:true});assert.ok(n.players[0].x>s.players[0].x);assert.ok(n.players[0].vx>170);assert.ok(!('brakes' in n));
 const reverse=run(s,20,{axis:-1});assert.ok(Math.abs(reverse.players[0].vx)<80);assert.equal(reverse.failed,false);
});
test('冰上碰到自己的鑰匙就能拿，滑行與空中皆會自動拾取',()=>{
 for(const flying of [false,true]){
  let s=G.fresh(6);Object.assign(s.players[0],{x:250,y:flying?345:356,grounded:!flying,vx:200});s.players[1].x=100;
  s=run(s,1,{axis:1});assert.equal(s.collected[0],true);assert.equal(s.collectedBy[0],0);
 }
 let s=G.fresh(6);s.players[0].x=10;s.players[1].x=261;s=run(s,1);assert.equal(s.collected[0],false,'仍需拿自己的鑰匙');
});
test('低幀率亂按仍保持有限座標、可重來且不修改關卡',()=>{
 const layouts=JSON.stringify(G.levels);
 for(const l of G.levels.filter(l=>l.preview||l.mix)){let s=G.fresh(l.id),initial=JSON.stringify(s);for(let t=0;t<600;t++){
  s=G.step(s,[{axis:t%70<35?1:-1,jump:t%17===0,special:t%51===0},{axis:t%90<45?1:-1,jump:t%23===0,special:t%79===0}],.2);
  for(const p of s.players)assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1000-(p.w??38));
 }assert.equal(JSON.stringify(G.fresh(l.id)),initial);}assert.equal(JSON.stringify(G.levels),layouts);
});
