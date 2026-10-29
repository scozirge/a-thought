const { test } = require('node:test'), assert = require('node:assert/strict');
const G = require('../core.js'), Input = require('../input.js'), solutions = require('../solutions.js');
test('解題紀錄正好對應目前 20 關', () => {
  assert.equal(solutions.fps, 120);
  assert.deepEqual(Object.keys(solutions.levels), G.levels.map(l => l.saveKey));
});
for (const l of G.levels) test(`第 ${l.id + 1} 關：按鍵紀錄自然拿齊鑰匙、兩人進門`, () => {
  const tape = solutions.levels[l.saveKey], keyboard = Input.create();
  let state = G.fresh(l.id), frames = 0;
  for (const [duration, bits] of tape.actions) {
    assert.ok(Number.isInteger(duration) && duration > 0);
    assert.ok(Number.isInteger(bits) && bits >= 0 && bits <= 255);
    assert.notEqual(bits & 3, 3); assert.notEqual(bits & 48, 48);
    if (!l.gravityFlip) assert.equal(bits & 136, 0, '一般關卡沒有特殊鍵');
    for (let i = 0; i < duration; i++) {
      assert.equal(state.won, false, '錄製到真正通關即結束');
      keyboard.setMask(bits); state = G.step(state, keyboard.read()); keyboard.consume(); frames++;
      assert.ok(!state.failed); assert.ok(state.players.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)));
    }
  }
  assert.equal(frames, tape.frames); assert.ok(state.won);
  assert.ok(state.collected.every(Boolean)); assert.ok(state.players.every(p => p.exited));
});
test('長按跳躍／翻重力只觸發一次；放開再按才重新觸發', () => {
  const keyboard = Input.create();
  keyboard.down('KeyW'); keyboard.down('ArrowDown');
  assert.equal(keyboard.read()[0].jump, true); assert.equal(keyboard.read()[1].special, true);
  keyboard.consume(); keyboard.down('KeyW', true); keyboard.down('ArrowDown');
  assert.equal(keyboard.read()[0].jump, false); assert.equal(keyboard.read()[1].special, false);
  keyboard.up('KeyW'); keyboard.down('KeyW'); assert.equal(keyboard.read()[0].jump, true);
  keyboard.clear(); assert.deepEqual(keyboard.read(), [{ axis: 0, jump: false, special: false }, { axis: 0, jump: false, special: false }]);
});
