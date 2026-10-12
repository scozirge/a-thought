'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../game.js');

for (const level of G.levels) {
  test(`${level.name}：實際解法符合容量、停止條件與正確配方`, () => {
    let state = G.initial();
    for (const action of level.solution) {
      const before = JSON.stringify(state);
      const result = G.apply(level, state, action);
      assert.equal(result.ok, true);
      assert.equal(JSON.stringify(state), before, '不能修改舊狀態，才能正確復原');
      if (action[0] === 'pour') {
        const source = action[1], target = action[2];
        assert.equal(result.state.cups[source].amount + result.state.cups[target].amount, state.cups[source].amount + state.cups[target].amount);
        assert.ok(result.state.cups[source].amount === 0 || result.state.cups[target].amount === level.capacities[target]);
      }
      state = result.state;
      state.cups.forEach((cup, i) => {
        assert.ok(cup.amount >= 0 && cup.amount <= level.capacities[i]);
        assert.equal(cup.ingredient === null, cup.amount === 0);
      });
    }
    assert.deepEqual(state.pot, level.recipe);
    assert.equal(G.verdict(level, state).success, true);
    assert.deepEqual(G.replay(level, level.solution), state);
  });
}
test('不足以倒滿時，來源先倒空；已有液體時只補到容量', () => {
  const level = G.levels[3];
  let state = G.replay(level, [['fill', 1, 0], ['pour', 1, 0]]);
  assert.deepEqual(state.cups.map(c => c.amount), [3, 0]);
  state = G.replay(level, [['fill', 1, 0], ['pour', 1, 0], ['fill', 1, 0], ['pour', 1, 0]]);
  assert.deepEqual(state.cups.map(c => c.amount), [4, 2]);
  const result = G.apply(level, state, ['fill', 1, 0]);
  assert.equal(result.moved, 1);
  assert.equal(result.state.cups[1].amount, 3);
});
test('拒絕杯內混料、滿杯續倒、空杯倒出和非法動作', () => {
  const level = G.levels[0];
  const state = G.replay(level, [['fill', 0, 0], ['fill', 1, 1]]);
  for (const action of [['fill', 0, 1], ['fill', 0, 0], ['pour', 0, 1], ['pour', 0, 0], ['pour', 0, 8], ['fill', 9, 0], ['fill', 0, 99], ['unknown', 0], null]) {
    const result = G.apply(level, state, action);
    assert.equal(result.ok, false, JSON.stringify(action));
    assert.deepEqual(result.state, state);
  }
  assert.equal(G.apply(level, G.initial(), ['pot', 0]).ok, false);
  assert.equal(G.apply(level, G.initial(), ['empty', 0]).ok, false);
  assert.equal(G.apply(level, G.initial(), ['pour', 0, 1]).ok, false);
});
test('大鍋整杯收下，不會為目標配方自動停倒；多一份也失敗', () => {
  const level = G.levels[0];
  const state = G.replay(level, [['fill', 1, 1], ['pot', 1], ['fill', 0, 0], ['pot', 0]]);
  assert.deepEqual(state.pot, [5, 3, 0]);
  assert.deepEqual(G.verdict(level, state), { success: false, differences: [1, 0, 0] });
  assert.equal(G.verdict(level, { cups: G.initial().cups, pot: [2, 3, 1] }).success, false);
});
test('倒掉全部後能換料，撤回動作能恢復杯子和鍋內所有原料', () => {
  const level = G.levels[0];
  const actions = [['fill', 0, 0], ['empty', 0], ['fill', 0, 2], ['pot', 0]];
  assert.deepEqual(G.replay(level, actions).pot, [0, 0, 5]);
  const undone = G.replay(level, actions.slice(0, -1));
  assert.deepEqual(undone.pot, [0, 0, 0]);
  assert.deepEqual(undone.cups[0], { ingredient: 2, amount: 5 });
});
