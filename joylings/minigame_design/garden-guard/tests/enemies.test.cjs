const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../core.js');
const at = (s, kind, x, y, hp) => G.spawn(s, kind, hp, y, { x, y });
function advance(s, seconds) { for (let i = 0; i < Math.round(seconds * 60); i++) G.step(s, 1 / 60); }

test('十種蟲分三關逐步增加為四、七、十種，小蟲固定一血', () => {
  assert.equal(Object.keys(G.ENEMIES).length, 10);
  let previous = new Set();
  G.LEVELS.forEach((level, i) => {
    const kinds = new Set(level.waves.flat().map(g => g.kind));
    assert.equal(kinds.size, [4, 7, 10][i]);
    for (const kind of previous) assert.ok(kinds.has(kind));
    for (const g of level.waves.flat()) { assert.ok(G.ENEMIES[g.kind]); if (g.kind === 'bug') assert.equal(g.hp, 1); }
    previous = kinds;
  });
  assert.equal(G.spawn(G.createState(), 'bug').hp, 1);
  assert.ok(G.ENEMIES.swift.speed > G.ENEMIES.bug.speed * 1.8);
  assert.ok(G.ENEMIES.giant.hp >= 20 && G.ENEMIES.giant.speed < G.ENEMIES.bug.speed / 2);
});

test('下盾蟲擋住七種塔的下方攻擊，從上方及同高側面攻擊有效', () => {
  for (const [kind, tool] of Object.entries(G.TOOLS).filter(([, t]) => t.rate)) {
    const s = G.createState(), e = at(s, 'shield_down', 6, 3, 20);
    assert.equal(G.hit(s, e, { kind, c: 8, r: 5 }), false);
    assert.equal(e.hp, 20); assert.equal(e.slow, 0); assert.equal(e.push, null);
    const block = s.effects.at(-1); assert.ok(block.y > e.y && block.vy > 0);
    assert.equal(G.hit(s, e, { kind, c: 8, r: 1 }), true); assert.equal(e.hp, 20 - tool.damage);
    assert.equal(G.shieldBlocks(e, { c: 4, r: 3 }), false);
  }
});

test('地板火焰可傷上盾蟲，下盾蟲會格擋，飛蟲不受地板火焰影響', () => {
  for (const kind of ['shield', 'shield_down', 'flyer']) {
    const s = G.createState(), e = at(s, kind, 6, 3, 5);
    G.ignite(s, 6, 3);
    for (let i = 0; i < G.BATTLE_SPEED * 60; i++) G.updateFires(s, 1 / 60);
    assert.equal(e.hp, kind === 'shield' ? 4 : 5);
    assert.equal(s.stats.blocked, kind === 'shield_down' ? 1 : 0);
  }
});

test('跳蟲第一次受傷跨過牆跳兩格，只觸發一次，落地後繼續尋路', () => {
  const s = G.createState(); s.money = 100;
  for (let r = 0; r < G.ROWS; r++) G.build(s, 'wall', 6, r);
  const e = at(s, 'hopper', 7, 3, 8); s.phase = 'running';
  G.hit(s, e, { kind: 'pea', c: 7, r: 5 });
  assert.equal(e.hp, 7); assert.equal(e.leap.x, 5); assert.equal(e.leap.y, 3);
  advance(s, 0.6); assert.equal(e.leap, null); assert.equal(e.x, 5);
  G.hit(s, e, { kind: 'pea', c: 7, r: 5 }); assert.equal(e.leap, null); assert.equal(s.stats.jumped, 1);
  advance(s, 1); assert.ok(e.x < 5); assert.equal(s.stats.broken, 0);
});

test('跳蟲避開被佔用落點，選擇剩餘路徑最短的安全格子', () => {
  const s = G.createState(); s.money = 100;
  for (let r = 0; r < G.ROWS; r++) G.build(s, 'wall', 6, r);
  G.build(s, 'wall', 5, 3);
  const e = at(s, 'hopper', 7, 3), landing = G.jumpLanding(s, e);
  assert.equal(landing.c, 5); assert.equal(landing.r, 2); assert.equal(landing.breaking, false);
  assert.equal(G.at(s, landing.c, landing.r), undefined);
  for (const level of [1, 2]) {
    const map = G.createState(level), bug = at(map, 'hopper', 7, 3), target = G.jumpLanding(map, bug);
    assert.ok(target); assert.equal(G.terrain(level).has(G.key(target.c, target.r)), false);
  }
});

test('沒有安全落點時不穿牆；首次致命傷不會留下死蟲跳躍', () => {
  const s = G.createState(); s.money = 100;
  for (const c of [5, 6]) for (let r = 1; r <= 5; r++) G.build(s, 'wall', c, r);
  const e = at(s, 'hopper', 7, 3); G.hit(s, e, { kind: 'pea', c: 7, r: 5 });
  assert.equal(e.leap, null); assert.equal(e.x, 7); assert.equal(e.jumped, true);
  const doomed = at(s, 'hopper', 9, 3); G.hit(s, doomed, { kind: 'molecular', c: 9, r: 5 });
  assert.equal(doomed.dead, true); assert.equal(doomed.leap, null);
});

test('跳躍中的跳蟲不被擊退拉回障礙物，落地仍在有效格子', () => {
  const s = G.createState(); G.build(s, 'wall', 6, 3);
  const e = at(s, 'hopper', 7, 3, 10); s.phase = 'running';
  G.hit(s, e, { kind: 'push', c: 7, r: 5 }); advance(s, 0.3);
  G.hit(s, e, { kind: 'push', c: 7, r: 5 }); assert.equal(e.push, null);
  advance(s, 0.3); assert.equal(e.leap, null); assert.equal(G.at(s, e.c, e.r), undefined);
});

test('母蟲每實際三秒產生一隻一血小蟲，死亡後停止產卵', () => {
  const s = G.createState(), mother = G.spawn(s, 'mother'); s.phase = 'running';
  advance(s, 3 * G.BATTLE_SPEED - 1 / 60); assert.equal(s.stats.hatched, 0);
  advance(s, 1 / 60); assert.equal(s.stats.hatched, 1);
  const baby = s.enemies.find(e => e.kind === 'bug'); assert.equal(baby.hp, 1);
  assert.ok(Math.hypot(baby.x - mother.x, baby.y - mother.y) <= 1 + 1e-9);
  advance(s, 3 * G.BATTLE_SPEED); assert.equal(s.stats.hatched, 2);
  G.hit(s, mother, { kind: 'molecular', c: 8, r: 5 }); G.hit(s, mother, { kind: 'molecular', c: 8, r: 5 });
  advance(s, 3 * G.BATTLE_SPEED); assert.equal(s.stats.hatched, 2);
});

test('飛蟲直飛小屋，完整牆列與池塘都無法擋住，也不拆牆', () => {
  const s = G.createState(); s.money = 100;
  for (let r = 0; r < G.ROWS; r++) G.build(s, 'wall', 6, r);
  const e = G.spawn(s, 'flyer'); s.phase = 'running'; advance(s, 6);
  assert.ok(e.x < 6); assert.equal(s.stats.broken, 0); assert.ok(s.buildings.every(b => b.hp === 4));
  advance(s, 6); assert.equal(s.hearts, 4); assert.equal(s.enemies.length, 0);
  const pool = G.createState(1), f = G.spawn(pool, 'flyer'); pool.phase = 'running'; advance(pool, 6);
  assert.ok(f.x < 6); assert.equal(f.attackId, null);
});

test('分裂蟲死亡只分裂一次，三隻小蟲隨機出現在一格內的安全位置', () => {
  const s = G.createState(); G.build(s, 'wall', 7, 3); const e = at(s, 'splitter', 6, 3, 2), money = s.money;
  G.hit(s, e, { kind: 'cannon', c: 6, r: 5 }); G.hit(s, e, { kind: 'cannon', c: 6, r: 5 });
  const babies = s.enemies.filter(b => b.kind === 'bug'); assert.equal(babies.length, 3); assert.equal(s.stats.split, 1);
  assert.equal(s.money, money + 1); assert.ok(new Set(babies.map(b => `${b.x},${b.y}`)).size > 1);
  for (const b of babies) { assert.equal(b.hp, 1); assert.ok(Math.hypot(b.x - 6, b.y - 3) <= 1); assert.equal(G.at(s, b.c, b.r), undefined); }
  G.hit(s, babies[0], { kind: 'pea', c: 6, r: 5 }); assert.equal(s.stats.split, 1);
});

test('範圍砲擊殺分裂蟲後，不會把同次爆炸剛出生的小蟲再算進攻擊', () => {
  const s = G.createState(), e = at(s, 'splitter', 6, 3, 2);
  G.resolveShot(s, { kind: 'cannon', target: e.id, c: 6, r: 5 });
  const babies = s.enemies.filter(b => b.kind === 'bug');
  assert.equal(babies.length, 3); assert.ok(babies.every(b => !b.dead && b.hp === 1));
});

test('分裂位置在邊界和密集建築旁也不會落在地圖外或牆上', () => {
  const s = G.createState(); s.money = 100;
  for (let r = 0; r <= 2; r++) G.build(s, 'wall', 1, r);
  const e = at(s, 'splitter', 0, 0, 1); G.hit(s, e, { kind: 'pea', c: 2, r: 2 });
  for (const b of s.enemies.filter(b => b.kind === 'bug')) {
    assert.ok(b.x >= 0 && b.y >= 0 && Math.hypot(b.x, b.y) <= 1); assert.equal(G.at(s, b.c, b.r), undefined);
  }
});

test('爆炸蟲死亡炸毀周圍一格的塔和牆（含斜角），範圍外保持完整', () => {
  const s = G.createState(); s.money = 100;
  for (let c = 5; c <= 7; c++) for (let r = 2; r <= 4; r++) if (c !== 6 || r !== 3) G.build(s, c % 2 ? 'wall' : 'pea', c, r);
  G.build(s, 'pea', 8, 3);
  const e = at(s, 'bomber', 6, 3, 1), revision = s.revision;
  G.hit(s, e, { kind: 'pea', c: 8, r: 5 }); G.hit(s, e, { kind: 'pea', c: 8, r: 5 });
  assert.equal(s.buildings.length, 1); assert.equal(s.buildings[0].c, 8); assert.equal(s.buildings[0].hp, 5);
  assert.equal(s.stats.broken, 8); assert.equal(s.stats.exploded, 1); assert.equal(s.revision, revision + 1);
});

test('爆炸拆開封路後重新取得通路；進家消失不觸發死亡能力', () => {
  const s = G.createState(); for (let r = 0; r < G.ROWS; r++) G.build(s, 'wall', 6, r);
  const e = at(s, 'bomber', 7, 3, 1); assert.equal(G.previews(s)[0].breaking, true);
  G.hit(s, e, { kind: 'pea', c: 8, r: 5 }); assert.equal(G.previews(s)[0].breaking, false);
  for (const kind of ['bomber', 'splitter', 'mother']) {
    const home = G.createState(); at(home, kind, 0, 3); home.phase = 'running'; advance(home, 1 / 60);
    assert.equal(home.hearts, 4); assert.equal(home.stats.exploded, 0); assert.equal(home.stats.split, 0); assert.equal(home.stats.hatched, 0);
  }
});

test('暫停凍結產卵和跳躍；準備存檔保留隨機種子，重試可重現分裂落點', () => {
  const s = G.createState(), e = at(s, 'hopper', 7, 3); G.spawn(s, 'mother');
  G.hit(s, e, { kind: 'pea', c: 7, r: 5 }); s.phase = 'paused'; const before = JSON.stringify(s); advance(s, 9); assert.equal(JSON.stringify(s), before);
  function positions(state) { const split = at(state, 'splitter', 6, 3, 1); G.hit(state, split, { kind: 'pea', c: 6, r: 5 }); return state.enemies.filter(e => e.kind === 'bug').map(e => [e.x, e.y]); }
  const prepared = G.snapshot(G.createState(2));
  assert.deepEqual(positions(G.restore(prepared)), positions(G.restore(prepared)));
  const changed = { ...prepared, rngState: 12345 }; assert.notDeepEqual(positions(G.restore(prepared)), positions(G.restore(changed)));
});
