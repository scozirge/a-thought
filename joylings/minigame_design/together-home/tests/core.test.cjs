const {test}=require('node:test'),assert=require('node:assert/strict'),Campaign=require('../core.js'),G=require('./legacy-fixture.cjs'),{playLevel}=require('./play-level.cjs');
function run(s,n,a={},b={}){for(let k=0;k<n;k++)s=G.step(s,[{...a,jump:k===0&&a.jump,special:k===0&&a.special,ability:k===0&&a.ability},{...b,jump:k===0&&b.jump,special:k===0&&b.special,ability:k===0&&b.ability}]);return s;}
for(const l of Campaign.levels)test(`第${l.id+1}關 ${l.name} 可合作通關`,async()=>{
 let s=Campaign.fresh(l.id);
 await playLevel({read:async()=>s,tick:async(frames,commands)=>{
  for(let i=0;i<frames;i++)s=Campaign.step(s,commands.map(c=>({...c,jump:i===0&&c.jump,special:i===0&&c.special,ability:i===0&&c.ability})));
  assert.equal(!!s.failed,false);for(const p of s.players)assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
 }},l);
 assert.ok(s.won);assert.ok(s.collected.every(Boolean));assert.ok(s.collectedBy.every(actor=>actor===0||actor===1));
});
test('20 關共用單一選單，後十關延長地圖並使用新的完成紀錄',()=>{
 assert.equal(Campaign.levels.length,20);assert.ok(Campaign.levels.every(l=>l.group==='main'&&!l.chapter));
 assert.deepEqual(Campaign.levels.slice(1,7).map(l=>l.preview),['swap','phase','gravity','bridge','balance','ice']);
 assert.equal(Campaign.levels.filter(l=>l.ice).length,7);assert.equal(Campaign.levels.filter(l=>l.fallY).length,12);
 assert.ok(Campaign.levels.slice(10).every(l=>l.coop&&l.world));
 assert.ok(Campaign.levels.slice(10,18).every(l=>l.saveKey.startsWith('campaign-')));
 assert.ok(Campaign.levels.every(l=>!l.timeFreeze));assert.ok(!('freezer' in Campaign.fresh(4)));
 assert.equal(new Set(Campaign.levels.map(l=>l.saveKey)).size,20);
});
test('第一關單人跳不到鑰匙',()=>{let s=G.fresh();s.players[0].x=481;for(let t=0;t<250;t++)s=G.step(s,[{jump:t%90===0},{}]);assert.equal(s.key,false);});
test('多按鈕門需要全部重量，過門不會自動鎖開',()=>{let s=G.fresh(2);const g=G.levels[2].gates[0];s.boxes[0].x=g.buttons[0].x;assert.equal(G.gateOpen(s,0),false);s.boxes[1].x=g.buttons[1].x;assert.equal(G.gateOpen(s,0),true);s.players[1].x=720;s.boxes[0].x=100;s=run(s,5);assert.equal(G.gateOpen(s,0),false);assert.equal(s.latched[0],false);});
test('重箱一人推不動，兩人一起推才移動',()=>{let s=G.fresh(1),x=s.boxes[0].x;s.players[0].x=x-38;s.players[1].x=x-78;let one=run(s,60,{axis:1});assert.equal(one.boxes[0].x,x);let both=run(s,40,{axis:1},{axis:1});assert.ok(both.boxes[0].x>x+40);});
test('切換開關每次踩下只翻轉一次，可走開再切回',()=>{let s=G.fresh(4);s.players[0].x=175;const original=s.mode;s=run(s,120);assert.equal(s.mode,1-original);assert.equal(G.gateOpen(s,0),true);s.players[0].x=60;s=run(s,2);s.players[0].x=175;s=run(s,2);assert.equal(s.mode,original);});
test('升降台會載人、放開下降；上層按鈕可接下一人',()=>{let s=G.fresh(3),f=G.levels[3].lifts[0];s.boxes=[];s.players[0].x=f.buttons[0].x;s.players[1].x=f.x+50;s=run(s,260);assert.equal(s.lifts[0],240);assert.equal(s.players[1].y+44,240);s.players[0].x=60;s=run(s,260);assert.equal(s.lifts[0],400);s.players[1].x=f.buttons[1].x;s.players[1].y=196;s.players[1].grounded=true;s=run(s,260);assert.equal(s.lifts[0],240);});
test('繩索阻止單人走散，同行可繼續前進',()=>{let s=G.fresh(2);s.boxes=[];s=run(s,500,{}, {axis:1});assert.ok(Math.abs(s.players[0].x-s.players[1].x)<=181);const x=s.players[0].x;s=run(s,120,{axis:1},{axis:1});assert.ok(s.players[0].x>x+100);});
test('同色鑰匙不能由另一個角色代拿',()=>{let s=G.fresh(5);const k=G.levels[5].keys[0];s.players[1].x=k.x;s.players[1].y=k.y;s=run(s,1);assert.equal(s.collected[0],false);s.players[0].x=k.x;s.players[0].y=k.y;s=run(s,1);assert.equal(s.collected[0],true);});
test('兩人都必須進門，重來還原箱子與機關',()=>{let s=G.fresh();s.collected=[true];s.key=true;s.players[0].x=920;s=run(s,2);assert.ok(s.players[0].exited);assert.equal(s.won,false);s.players[1].x=920;s=run(s,2);assert.ok(s.won);const f=G.fresh(9),saved=JSON.stringify(f);run(f,200,{axis:1},{axis:1});assert.equal(JSON.stringify(G.fresh(9)),saved);});

for (const level of [0, 2]) test(`第${level + 1}關：持有標示記錄第一次拾取者，不被隊友經過覆寫`, () => {
  const original = G.fresh(level), k = G.levels[level].keys[0];
  original.players[1].x = k.x; original.players[1].y = k.y;
  let s = run(original, 1);
  assert.equal(s.collectedBy[0], 1);
  assert.equal(original.collectedBy[0], null, '不更動前一個狀態');
  s.players[1].x = 20; s.players[0].x = k.x; s.players[0].y = k.y;
  s = run(s, 1); assert.equal(s.collectedBy[0], 1);
  assert.ok(G.fresh(level).collectedBy.every(actor => actor === null));
});

test('專屬鑰匙的持有標示與角色限制一致', () => {
  let s = G.fresh(5); const k = G.levels[5].keys[0];
  s.players[1].x = k.x; s.players[1].y = k.y; s = run(s, 1);
  assert.equal(s.collectedBy[0], null);
  s.players[0].x = k.x; s.players[0].y = k.y; s = run(s, 1);
  assert.equal(s.collectedBy[0], 0);
});

test('返程關拿齊鑰匙仍要走回小屋，站在右側不會直接完成', () => {
  for (const id of [5, 8]) {
    let s = G.fresh(id); s.collected.fill(true); s.key = true;
    s.players[0].x = 750; s.players[1].x = 850;
    s = run(s, 3); assert.ok(s.players.every(p => !p.exited)); assert.equal(s.won, false);
    s.players[0].x = 45; s = run(s, 2); assert.equal(s.players[0].exited, true); assert.equal(s.won, false);
    s.players[1].x = 45; s = run(s, 2); assert.equal(s.won, true);
  }
});

test('最後一關需要地面重箱與頂樓貨箱，月亮亮起不能單獨開門', () => {
  let s = G.fresh(9);
  assert.equal(G.gateOpen(s, 0), false); assert.equal(G.gateOpen(s, 1), false);
  s.mode = 1; assert.equal(G.gateOpen(s, 1), false);
  s.boxes[0].x = 185; assert.equal(G.gateOpen(s, 0), true);
  s.boxes[1].x = 860; s.boxes[1].y = 38;
  assert.equal(G.gateOpen(s, 1), true);
  s.mode = 0; assert.equal(G.gateOpen(s, 1), false);
});
