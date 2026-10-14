'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../game.js');

for (const level of G.levels) {
  test(`${level.name}：實際解法符合容量、停止條件與正確配方`, () => {
    let state = G.initial(level);
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
  const level = { capacities: [4, 3], recipe: [2, 1, 0] };
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
  const level = { capacities: [5, 3], recipe: [2, 3, 0] };
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


test('前七關每色最多四次，後三關最多五次，含入鍋與必要清空', () => {
  assert.equal(G.levels.length, 10);
  assert.equal(new Set(G.levels.map(level => level.id)).size, 10);
  assert.ok(G.levels[0].solution.every(action => ['fill', 'pot'].includes(action[0])));
  assert.deepEqual(G.levels.map(level => level.capacities.length), [2,2,2,2,3,3,4,4,5,5]);
  for (const [index, level] of G.levels.entries()) {
    let state = G.initial(level);
    const counts = [0,0,0];
    for (const action of level.solution) {
      const ingredient = action[0] === 'fill' ? action[2] : state.cups[action[1]].ingredient;
      assert.notEqual(ingredient, null);
      counts[ingredient]++;
      const result = G.apply(level, state, action);
      assert.equal(result.ok, true);
      state = result.state;
    }
    assert.ok(counts.every(count => count <= (index < 7 ? 4 : 5)), `${level.name}: ${counts}`);
    assert.ok(level.solution.length <= (index < 7 ? 12 : 15));
    assert.equal(G.verdict(level, state).success, true);
  }
});

test('五杯可選取、分裝、清空、撤回，且不會互相污染', () => {
  const level = { capacities: [15,12,8,5,3], recipe: [1,4,7] };
  const actions = [['fill',1,0],['pour',1,2],['pour',1,4],['pot',1]];
  const state = G.replay(level, actions);
  assert.equal(state.cups.length, 5);
  assert.deepEqual(state.pot,[1,0,0]);
  assert.equal(state.cups[2].amount, 8);
  assert.equal(state.cups[4].amount, 3);
  assert.equal(G.replay(level, actions.slice(0,-1)).cups[1].amount, 1);
  assert.equal(G.apply(level, state, ['fill',4,1]).ok, false);
  assert.equal(G.apply(level, state, ['pour',2,5]).ok, false);
  const emptied = G.apply(level, state, ['empty',4]).state;
  assert.equal(G.apply(level, emptied, ['fill',4,1]).ok, true);
  assert.equal(emptied.cups[2].amount, 8);
});


test('後三關的玫瑰露確實需要五次操作才能入鍋，四次以內無解', () => {
  const { shortestColor } = require('../scripts/shortest-color.cjs');
  for (const level of G.levels.slice(7)) {
    assert.equal(shortestColor(level.capacities, level.recipe[0], 4), null);
    const solution = shortestColor(level.capacities, level.recipe[0], 5);
    assert.equal(solution.length, 5);
    assert.equal(G.replay(level, solution).pot[0], level.recipe[0]);
  }
});

test('十位客人角色不重複，藥水名稱及效果符合訂單', () => {
  assert.equal(new Set(G.levels.map(level => level.character)).size,10);
  assert.equal(new Set(G.levels.map(level => level.customer)).size,10);
  assert.deepEqual(G.levels.map(level => level.name), ['戀愛藥水','除草毒藥','好夢藥水','黑貓變身藥水','人魚藥水','漂浮藥水','誠實藥水','隱身藥水','發光藥水','年輕藥水']);
  assert.ok(G.levels.every(level => level.effect));
});

test('最後一關三色解法各五次，至少兩色確實需要五次', () => {
  const { shortestColor } = require('../scripts/shortest-color.cjs');
  const level = G.levels[9];
  let state = G.initial(level);
  const counts = [0,0,0];
  for (const action of level.solution) {
    counts[action[0] === 'fill' ? action[2] : state.cups[action[1]].ingredient]++;
    state = G.apply(level, state, action).state;
  }
  assert.deepEqual(counts, [5,5,5]);
  for (const ingredient of [0,1]) {
    assert.equal(shortestColor(level.capacities, level.recipe[ingredient], 4), null);
    assert.equal(shortestColor(level.capacities, level.recipe[ingredient], 5).length, 5);
  }
  assert.equal(G.verdict(level, state).success, true);
});
