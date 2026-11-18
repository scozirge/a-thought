const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../core.js');
function enemy(s, kind, hp, x, y) {
  const e = G.spawn(s, kind, hp);
  Object.assign(e, { x, y, c: Math.round(x), r: Math.round(y) });
  return e;
}
function advance(s, seconds) {
  for (let i = 0; i < Math.round(seconds * 60); i++) G.step(s, 1 / 60);
}
function burn(s, seconds) {
  for (let i = 0; i < Math.round(seconds * 60); i++) G.updateFires(s, 1 / 60);
}
function ray(s, c, r, ux, uy, remaining = 6) {
  s.shots.push({ id: s.nextId++, kind: 'pierce', c, r, x: c, y: r, ux, uy, remaining, hitIds: [] });
}

test('大砲只傷害爆炸範圍內的目標，中心不重複扣血', () => {
  const s = G.createState(), a = enemy(s, 'bug', 8, 6, 3), b = enemy(s, 'bug', 8, 7, 3), c = enemy(s, 'bug', 8, 8, 3);
  G.resolveShot(s, { kind: 'cannon', target: a.id, c: 6, r: 5 });
  assert.deepEqual([a.hp, b.hp, c.hp], [6, 6, 8]);
  assert.equal(s.stats.hits, 2); assert.ok(s.effects.some(e => e.kind === 'blast'));
});

test('盾蟲從上方擋住大砲與火焰，不爆炸、不留下火地板', () => {
  for (const kind of ['cannon', 'flame']) {
    const s = G.createState(), a = enemy(s, 'shield', 8, 6, 3), b = enemy(s, 'bug', 8, 7, 3);
    G.resolveShot(s, { kind, target: a.id, c: 6, r: 1 });
    assert.deepEqual([a.hp, b.hp], [8, 8]); assert.equal(s.stats.blocked, 1);
    assert.equal(s.fires.length, 0); assert.ok(s.effects.every(e => e.kind === 'block'));
  }
});

test('火焰命中後在地板燃燒三秒，每實際一秒扣一次血，火區重疊不疊傷', () => {
  const s = G.createState(), a = enemy(s, 'shield', 10, 6, 3);
  G.resolveShot(s, { kind: 'flame', target: a.id, c: 6, r: 5 });
  assert.equal(a.hp, 9); assert.equal(s.fires.length, 1);
  G.ignite(s, 6, 3); assert.equal(s.fires.length, 1, '同格只延長燃燒');
  G.ignite(s, 7, 3); a.x = 6.5;
  burn(s, G.BATTLE_SPEED - 1 / 60); assert.equal(a.hp, 9);
  burn(s, 1 / 60); assert.equal(a.hp, 8);
  burn(s, G.BATTLE_SPEED); assert.equal(a.hp, 7);
  burn(s, G.BATTLE_SPEED); assert.equal(a.hp, 6); assert.equal(s.fires.length, 0);
  assert.equal(s.stats.blocked, 0, '地板火焰從下方造成傷害');
  burn(s, 5); assert.equal(a.hp, 6);
});

test('離開火地板不受持續傷害；火焰不傷到範圍外的怪物', () => {
  const s = G.createState(), a = enemy(s, 'bug', 10, 6, 3), b = enemy(s, 'bug', 10, 8, 3);
  G.ignite(s, 6, 3); burn(s, G.BATTLE_SPEED);
  assert.equal(a.hp, 9); assert.equal(b.hp, 10);
  a.x = 8; burn(s, G.BATTLE_SPEED); assert.equal(a.hp, 9);
});

test('穿透彈沿直線貫穿多隻怪物，每隻只傷害一次，不波及旁邊一排', () => {
  const s = G.createState(); s.phase = 'running';
  const a = enemy(s, 'bug', 5, 4, 3), b = enemy(s, 'bug', 5, 6, 3), c = enemy(s, 'bug', 5, 5, 4);
  ray(s, 2, 3, 1, 0); advance(s, 0.55);
  assert.deepEqual([a.hp, b.hp, c.hp], [4, 4, 5]);
  assert.equal(s.stats.hits, 2); assert.equal(s.shots.length, 0);
});

test('穿透彈被上方盾甲擋住後停止，不穿過盾蟲傷到後方', () => {
  const s = G.createState(); s.phase = 'running';
  const a = enemy(s, 'shield', 5, 6, 2), b = enemy(s, 'bug', 5, 6, 3);
  ray(s, 6, 0, 0, 1); advance(s, 0.5);
  assert.deepEqual([a.hp, b.hp], [5, 5]); assert.equal(s.stats.blocked, 1); assert.equal(s.shots.length, 0);
});

test('擊退沿攻擊方向移動三格，動畫結束後仍可正常尋路', () => {
  const s = G.createState(); s.phase = 'running';
  const a = enemy(s, 'shield', 10, 6, 4);
  G.hit(s, a, { kind: 'push', c: 6, r: 6 });
  assert.equal(a.hp, 9); assert.ok(Math.abs(a.push.y - 1) < 1e-9);
  advance(s, 0.3); assert.ok(Math.abs(a.y - 1) < 1e-9); assert.equal(a.push, null);
  advance(s, 1); assert.ok(a.x < 6); assert.equal(G.at(s, a.c, a.r), undefined);
});

test('斜向擊退也是三格；牆、固定地形與地圖邊界都不能穿過', () => {
  const diagonal = G.createState(), d = enemy(diagonal, 'bug', 10, 5, 3);
  G.hit(diagonal, d, { kind: 'push', c: 3, r: 1 });
  assert.ok(Math.abs(Math.hypot(d.push.x - d.x, d.push.y - d.y) - 3) < 1e-9);
  const s = G.createState(); G.build(s, 'wall', 8, 3);
  const a = enemy(s, 'bug', 10, 6, 3);
  G.hit(s, a, { kind: 'push', c: 4, r: 3 }); assert.ok(a.push.x < 7.5);
  const edge = enemy(s, 'bug', 10, 10, 5);
  G.hit(s, edge, { kind: 'push', c: 8, r: 5 }); assert.ok(edge.push.x <= 11);
  const pool = G.createState(1), e = enemy(pool, 'bug', 10, 5, 4);
  G.hit(pool, e, { kind: 'push', c: 5, r: 6 }); assert.ok(e.push.y >= 3.5);
});

test('盾蟲擋住上方擊退，數字及位置都不變', () => {
  const s = G.createState(), a = enemy(s, 'shield', 10, 6, 3);
  G.hit(s, a, { kind: 'push', c: 6, r: 1 });
  assert.equal(a.hp, 10); assert.equal(a.push, null); assert.equal(s.stats.blocked, 1);
});

test('分子砲單體高傷害，仍受盾甲方向限制，擊殺不重複發獎勵', () => {
  const s = G.createState(), a = enemy(s, 'shield', 10, 6, 3), b = enemy(s, 'bug', 10, 7, 3), money = s.money;
  G.resolveShot(s, { kind: 'molecular', target: a.id, c: 6, r: 1 }); assert.equal(a.hp, 10);
  G.resolveShot(s, { kind: 'molecular', target: a.id, c: 6, r: 5 }); assert.equal(a.hp, 4); assert.equal(b.hp, 10);
  G.resolveShot(s, { kind: 'molecular', target: a.id, c: 6, r: 5 });
  G.resolveShot(s, { kind: 'molecular', target: a.id, c: 6, r: 5 });
  assert.equal(a.hp, 0); assert.equal(s.money, money + 1);
});

test('暫停時火地板、擊退動畫和穿透彈也全部停住', () => {
  const s = G.createState(), a = enemy(s, 'bug', 10, 6, 3);
  G.ignite(s, 6, 3); G.hit(s, a, { kind: 'push', c: 4, r: 3 }); ray(s, 2, 3, 1, 0);
  s.phase = 'paused'; const before = JSON.stringify(s); advance(s, 2);
  assert.equal(JSON.stringify(s), before);
});

test('舊存檔的連發塔轉成大砲，保留進度、種子與盤面', () => {
  const s = G.createState(); G.build(s, 'cannon', 5, 5);
  const save = G.snapshot(s); save.version = 1; save.buildings[0].kind = 'rapid'; save.wave = 2;
  const restored = G.restore(save);
  assert.equal(restored.wave, 2); assert.equal(restored.money, save.money); assert.equal(restored.buildings[0].kind, 'cannon');
  assert.equal(save.buildings[0].kind, 'rapid');
});
