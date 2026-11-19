const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../core.js');

function simulate(state, seconds = 120) {
  for (let i = 0; i < seconds * 60 && state.phase === 'running'; i++) G.step(state, 1 / 60);
  return state;
}
test('最短路徑：空地為 11 步，四方向相鄰且朝左側小屋', () => {
  const plan = G.route(G.createState(), { c: 11, r: 3 });
  assert.equal(plan.breaking, false); assert.equal(plan.path.length - 1, 11);
  assert.deepEqual(plan.path.at(-1), G.GOAL);
  for (let i = 1; i < plan.path.length; i++) assert.equal(Math.abs(plan.path[i].c - plan.path[i - 1].c) + Math.abs(plan.path[i].r - plan.path[i - 1].r), 1);
});
test('仍有路時必須繞牆，不會為了短路徑拆牆', () => {
  const s = G.createState(); G.build(s, 'wall', 6, 3);
  const plan = G.route(s, { c: 11, r: 3 });
  assert.equal(plan.breaking, false); assert.equal(plan.path.length - 1, 13);
  assert.ok(plan.path.every(p => p.c !== 6 || p.r !== 3));
  G.startWave(s); simulate(s);
  assert.equal(s.stats.broken, 0); assert.equal(G.at(s, 6, 3).hp, 4);
});
test('完全封路才沿最短路線拆牆，拆開後重新找路', () => {
  const s = G.createState();
  for (let r = 0; r < G.ROWS; r++) G.build(s, 'wall', 6, r);
  const plan = G.route(s, { c: 11, r: 3 });
  assert.equal(plan.breaking, true); assert.equal(plan.path.length - 1, 11);
  G.startWave(s); simulate(s);
  assert.ok(s.stats.broken >= 1); assert.ok(G.LEVELS[0].entries.some(r => !G.at(s, 6, r)));
  assert.equal(G.at(s, 6, 0).hp, 4); assert.ok(G.previews(s).every(p => !p.breaking));
});
test('破牆路線選步數最短，而不是繞路去找較薄的牆', () => {
  const s = G.createState();
  for (let r = 0; r < G.ROWS; r++) G.build(s, 'wall', 6, r);
  G.at(s, 6, 0).hp = 1;
  assert.ok(G.route(s, { c: 11, r: 3 }).path.some(p => p.c === 6 && p.r === 3));
});
test('十關共用固定地形，所有右側入口都有路；尋路不穿越固定障礙', () => {
  const solids = new Set(['5,3', '5,2']);
  assert.ok(G.findPath({ c: 11, r: 3 }, G.GOAL, [], solids).every(p => !solids.has(G.key(p.c, p.r))));
  for (let level = 0; level < G.LEVELS.length; level++) {
    const s = G.createState(level), terrain = G.terrain(level);
    for (const p of G.previews(s)) {
      assert.ok(p.path.length); assert.ok(p.path.every(cell => !terrain.has(G.key(cell.c, cell.r))));
    }
  }
});
test('全新開局第一波就是盾蟲；七種上方塔都不扣血，下方依塔種扣血或緩速', () => {
  for (const kind of Object.keys(G.TOOLS).filter(kind => kind !== 'wall')) {
    for (const r of [2, 4]) {
      // Restoring a previous first-wave save must also use the updated wave.
      const s = G.restore(G.snapshot(G.createState()));
      assert.equal(G.build(s, kind, 9, r).ok, true);
      G.startWave(s);
      assert.ok(s.queue.slice(0, 3).every(e => e.kind === 'shield' && e.hp === 6));
      s.queue = s.queue.filter(e => e.kind === 'shield');
      simulate(s, kind === 'molecular' ? 5 : 3.5);
      if (r === 2) {
        assert.ok(s.stats.blocked > 0, kind);
        assert.equal(s.stats.hits, 0);
        assert.ok(s.enemies.length > 0);
        assert.ok(s.enemies.every(e => e.kind === 'shield' && e.hp === e.maxHp && e.slow === 0));
      } else {
        if (kind === 'frost') {
          assert.equal(s.stats.hits, 0); assert.ok(s.enemies.some(e => e.slow > 0));
          assert.ok(s.enemies.every(e => e.hp === e.maxHp));
        } else assert.ok(s.stats.hits > 0, kind);
        assert.equal(s.stats.blocked, 0);
      }
    }
  }
});

test('盾蟲抵擋上方：不扣數字、不減速；下方冰凍緩速、一般彈減 1', () => {
  const s = G.createState(), e = G.spawn(s, 'shield', 4);
  e.y = 3;
  assert.equal(G.hit(s, e, { c: 8, r: 1, kind: 'frost' }), false);
  assert.equal(e.hp, 4); assert.equal(e.slow, 0); assert.equal(s.stats.blocked, 1);
  assert.equal(G.hit(s, e, { c: 8, r: 5, kind: 'frost' }), true);
  assert.equal(e.hp, 4); assert.ok(e.slow > 0); assert.equal(e.flash, 0);
  assert.equal(G.hit(s, e, { c: 8, r: 5, kind: 'pea' }), true); assert.equal(e.hp, 3);
});
test('上方子彈停在硬甲外緣並往上彈開，連續格擋不減數字', () => {
  const s = G.createState(), e = G.spawn(s, 'shield', 7);
  for (const c of [e.x - 2, e.x, e.x + 2]) {
    for (const kind of ['pea', 'cannon', 'flame']) {
      const source = { c, r: 1, kind }, point = G.impactPoint(e, source);
      assert.ok(point.y < e.y); assert.ok(Math.abs(point.x - e.x) <= 0.44 + 1e-9);
      G.hit(s, e, source);
      const block = s.effects.at(-1);
      assert.equal(block.kind, 'block'); assert.equal(block.shotKind, kind);
      assert.equal(block.x, point.x); assert.equal(block.y, point.y);
      assert.ok(block.vy < 0); assert.equal(e.hp, 7); assert.equal(e.slow, 0);
    }
  }
  assert.equal(s.stats.hits, 0); assert.equal(s.stats.blocked, 9);
  assert.deepEqual(G.impactPoint(e, { c: e.x, r: 5 }), { x: e.x, y: e.y });
});
test('盾固定朝畫面上方，轉彎不旋轉；同高度為側面有效攻擊', () => {
  const e = { kind: 'shield', x: 6, y: 4, next: { c: 6, r: 3 } };
  assert.equal(G.shieldBlocks(e, { c: 10, r: 3 }), true);
  assert.equal(G.shieldBlocks(e, { c: 2, r: 5 }), false);
  assert.equal(G.shieldBlocks(e, { c: 2, r: 4 }), false);
});
test('傷害 1 的砲塔逐次扣除生命，擊殺不額外產錢', () => {
  for (const kind of ['pea', 'pierce']) {
    const s = G.createState(), e = G.spawn(s, 'bug', 3), before = s.money;
    for (let i = 0; i < 3; i++) { G.hit(s, e, { c: 5, r: 5, kind }); assert.equal(e.hp, 2 - i); }
    assert.equal(e.dead, true); assert.equal(s.money, before);
    G.hit(s, e, { c: 5, r: 5, kind }); assert.equal(s.money, before);
  }
});
test('數量與放置限制、全額退回、撤回與地形驗證', () => {
  const s = G.createState(1), before = s.money;
  assert.equal(G.build(s, 'pea', 5, -1).ok, false);
  assert.equal(G.build(s, 'wall', 0, 3).ok, false);
  assert.equal(G.build(s, 'wall', 11, 3).ok, false);
  assert.equal(G.build(s, 'pea', 6, 5).ok, true); assert.equal(s.money, before - G.TOOLS.pea.cost);
  assert.equal(G.build(s, 'pea', 6, 5).ok, false);
  assert.equal(G.remove(s, 6, 5).ok, true); assert.equal(s.money, before);
  G.undo(s); assert.ok(G.at(s, 6, 5)); assert.equal(s.money, before - G.TOOLS.pea.cost);
  G.undo(s); assert.equal(s.buildings.length, 0); assert.equal(s.money, before);
  s.money = 0; assert.equal(G.build(s, 'pea', 6, 5).ok, false);
});
test('只在準備階段建造；暫停不移動、不射擊、不出怪', () => {
  const s = G.createState(); G.startWave(s); G.togglePause(s);
  const before = JSON.stringify(s); G.step(s, 1); assert.equal(JSON.stringify(s), before);
  assert.equal(G.build(s, 'wall', 5, 3).ok, false);
  G.togglePause(s); simulate(s, 1); assert.ok(s.enemies.length);
});
test('沒有防守會失敗；重試恢復這一波開始前的盤面與資源', () => {
  const s = G.createState(); G.build(s, 'wall', 5, 0);
  const before = G.snapshot(s); G.startWave(s); simulate(s);
  assert.equal(s.phase, 'lost'); assert.equal(s.hearts, 0);
  const retry = G.retry(s); assert.equal(retry.phase, 'planning');
  assert.equal(retry.money, before.money); assert.equal(retry.hearts, before.hearts);
  assert.equal(retry.buildings.length, 1); assert.equal(retry.wave, 0);
});
test('存檔只保留有效準備盤面，拒絕損壞與重疊資料', () => {
  const s = G.createState(); G.build(s, 'pea', 6, 5);
  assert.ok(G.restore(G.snapshot(s))); assert.equal(G.restore(null), null);
  const data = G.snapshot(s); data.buildings.push(data.buildings[0]); assert.equal(G.restore(data), null);
  const invalid = G.snapshot(s); invalid.money = -1; assert.equal(G.restore(invalid), null);
  const off = G.snapshot(s); off.buildings[0].c = 999; assert.equal(G.restore(off), null);
});
test('多隻小蟲同時拆同一座塔不會重複扣除或卡住', () => {
  const s = G.createState(); s.money = 100;
  for (let r = 0; r < G.ROWS; r++) G.build(s, r === 3 ? 'pea' : 'wall', 8, r);
  s.phase = 'running';
  for (let i = 0; i < 4; i++) { const e = G.spawn(s, 'shield', 50); e.c = e.x = 9; }
  simulate(s, 30);
  assert.equal(G.at(s, 8, 3), undefined); assert.equal(s.stats.broken, 1); assert.equal(s.enemies.length, 0);
});
