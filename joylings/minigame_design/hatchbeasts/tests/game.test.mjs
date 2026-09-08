import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import {
  gameReducer,
  getBeast,
  initialState,
  HATCH_TAPS,
  PLACES,
  ACTIVITIES,
} from '../lib/game.ts';

const expected = {
  11: '小花熊',
  12: '香草兔',
  13: '木妖',
  21: '影蛇',
  22: '回聲菇',
  23: '記憶石獸',
  31: '瀑布精靈',
  32: '泡泡龜',
  33: '彩虹梟',
};
const send = (state, type, value) => gameReducer(state, { type, value });
function choose(place, activity) {
  let state = send(initialState, 'SELECT', place);
  state = send(state, 'NEXT');
  state = send(state, 'SELECT', activity);
  return send(state, 'NEXT');
}
for (const [combination, name] of Object.entries(expected)) {
  test(`${combination} 孵出 ${name}，點滿前不能破殼，完成後可重玩`, () => {
    let state = choose(combination[0], combination[1]);
    assert.equal(state.stage, 'egg');
    assert.equal(getBeast(state)?.name, name);
    state = send(state, 'REVEAL');
    assert.equal(state.stage, 'egg');
    for (let taps = 1; taps < HATCH_TAPS; taps++) {
      state = send(state, 'TAP');
      assert.equal(state.stage, 'egg');
      assert.equal(state.taps, taps);
    }
    state = send(state, 'TAP');
    assert.equal(state.stage, 'hatching');
    for (let taps = 0; taps < 30; taps++) state = send(state, 'TAP');
    assert.equal(state.taps, HATCH_TAPS);
    state = send(state, 'REVEAL');
    assert.equal(state.stage, 'result');
    assert.equal(getBeast(state)?.name, name);
    assert.deepEqual(send(state, 'RESET'), initialState);
  });
}
test('未選答案不能前進；無效答案與非孵化階段點擊不改變狀態', () => {
  for (const action of ['NEXT', 'BACK', 'TAP', 'REVEAL'])
    assert.deepEqual(send(initialState, action), initialState);
  assert.deepEqual(send(initialState, 'SELECT', '9'), initialState);
  const state = send(send(initialState, 'SELECT', '1'), 'NEXT');
  assert.equal(send(state, 'NEXT').stage, 'activity');
});
test('返回上一題後能改選，結果使用更新後的組合', () => {
  let state = send(send(initialState, 'SELECT', '1'), 'NEXT');
  state = send(state, 'SELECT', '2');
  state = send(state, 'BACK');
  assert.equal(state.place, '1');
  state = send(state, 'SELECT', '3');
  state = send(send(state, 'NEXT'), 'NEXT');
  assert.equal(getBeast(state)?.name, '泡泡龜');
});
test('每個選項都有本機圖片', () => {
  for (const choice of [...PLACES, ...ACTIVITIES]) {
    assert.ok(
      existsSync(
        new URL(`../public/images/${choice.image}.png`, import.meta.url),
      ),
      choice.image,
    );
  }
});
