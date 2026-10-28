'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../game.js');
const solutions = require('./solutions.cjs');
const b = (type, props = {}) => Object.assign(G.createBlock(type), props);
const order = (x, y, extra = {}) => ({ x, y, kind: 'fire', serve: true, flavor: null, ...extra });
test('12 關的解法通過每筆訂單，含相等邊界與 default', () => {
  assert.equal(G.levels.length, 12);
  G.levels.forEach((level, i) => level.orders.forEach((o, j) => {
    const before = JSON.stringify(solutions[i]);
    const result = G.execute(solutions[i], o, level.blocks);
    assert.equal(result.success, true, `第 ${i + 1} 關第 ${j + 1} 筆：${result.error}`);
    assert.equal(JSON.stringify(solutions[i]), before, '執行不得修改工作表');
    assert.equal(result.state.y, o.y, 'y 是唯讀的訂單數量');
    if (o.serve) assert.equal(result.state.x, o.y);
  }));
});
test('單一 if 只執行一次，不會偷偷重複加點心', () => {
  const result = G.execute([b('if', { op: '<', then: [b('add')] }), b('serve')], order(3, 5));
  assert.equal(result.success, false);
  assert.equal(result.state.x, 4);
  assert.match(result.error, /還少 1 顆/);
});
test('if / else 只走其中一個分支，等於邊界也要正確', () => {
  const p = [b('ifElse', { op: '=', then: [b('serve')], else: [b('add'), b('serve')] })];
  assert.equal(G.execute(p, order(3, 3)).state.x, 3);
  assert.equal(G.execute(p, order(2, 3)).success, true);
  assert.equal(G.execute(p, order(4, 3)).success, false);
});
test('switch 只執行對應 case，未列出的種類走 default', () => {
  for (const kind of ['fire', 'snow', 'slime', 'mushroom']) {
    const result = G.execute(solutions[10], order(3, 3, { kind, flavor: G.kinds[kind].flavor }));
    assert.equal(result.success, true);
    assert.equal(result.trace.filter(e => e.message.startsWith('點心變成')).length, 1);
    assert.equal(result.state.flavor, G.kinds[kind].flavor);
  }
});
test('可用 y 作運算數值，並以每位客人當下的值計算', () => {
  const p = [b('sub', { value: 'x' }), b('add', { value: 'y' }), b('serve')];
  assert.equal(G.execute(p, order(2, 7)).success, true);
  assert.equal(G.execute(p, order(8, 3)).success, true);
});
test('算術錯誤停在原方塊，不能負數、除零、非整數或超出盤子容量', () => {
  for (const [type, n, x, message] of [['sub', '5', 3, /沒有那麼多/], ['div', '0', 3, /不能分成 0/], ['div', '2', 3, /不能切碎/], ['mul', '12', 3, /最多放 24/]]) {
    const node = b(type, { value: n });
    const result = G.execute([node, b('serve')], order(x, x));
    assert.equal(result.success, false);
    assert.equal(result.state.x, x);
    assert.equal(result.trace.at(-1).id, node.id);
    assert.match(result.error, message);
  }
});
test('缺少送餐、錯誤口味、錯誤送餐與空程式不能誤判過關', () => {
  assert.equal(G.execute([], order(3, 3)).success, false);
  assert.equal(G.execute([b('serve')], order(3, 3, { flavor: 'cold' })).success, false);
  assert.equal(G.execute([b('serve')], order(3, 5, { serve: false })).success, false);
  assert.equal(G.execute([b('add')], order(3, 5, { serve: false })).success, false);
});
test('送餐結束當前訂單；巢狀分支內送餐也會結束', () => {
  const result = G.execute([b('if', { then: [b('serve')] }), b('add')], order(3, 3));
  assert.equal(result.success, true);
  assert.equal(result.state.x, 3);
});
test('拒絕損壞、過深、重複識別碼和未開放的方塊', () => {
  assert.throws(() => G.validate([b('mul')], ['serve']));
  assert.throws(() => G.validate([b('add', { value: 'alert(1)' })]));
  assert.throws(() => G.validate([b('switch', { cases: {} })]));
  const node = b('serve'); assert.throws(() => G.validate([node, node]));
  let p = [b('serve')]; for (let i = 0; i < 6; i++) p = [b('if', { then: p })];
  assert.throws(() => G.validate(p));
});
