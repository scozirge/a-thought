const { test } = require('node:test');
const assert = require('node:assert/strict');
const G = require('../core.js');
const Physics = require('../physics.js')(G.C);
const constrain = require('../collision.js');

const overlaps = (p, g) => p.x + (p.w ?? G.C.w) > g.x + 0.001
  && p.x < g.x + g.w - 0.001 && p.y + (p.h ?? G.C.h) > g.y
  && p.y < g.y + g.h;
function ticks(s, count, commands, dt = 1 / 120) {
  for (let i = 0; i < count; i++) s = G.step(s, commands(s, i), dt);
  return s;
}

test('回歸：舊第十關按鈕放開時身體在牆內，也不能單人穿門', () => {
  // Keep the original close spacing to verify the engine fix independently
  // of the extra clearance in the new level layout.
  const level = structuredClone(G.levels[9]);
  level.gates[0].buttons[0] = { x: 260, y: 400, w: 58 };
  let s = Physics.fresh(level, 9);
  s.players[0].x = 300;
  s.players[1].x = 60;
  for (let i = 0; i < 180; i++) {
    s = Physics.step(s, [{ axis: 1 }, {}], level, 1 / 120);
    if (!Physics.gateOpen(s, level, 0)) assert.equal(overlaps(s.players[0], level.gates[0]), false);
  }
  assert.ok(s.players[0].x < level.gates[0].x);
});

for (const level of G.levels) {
  level.gates.forEach((gate, index) => {
    for (const direction of [-1, 1]) {
      test(`第${level.id + 1}關門${index + 1}：${direction > 0 ? '向右' : '向左'}衝、跳、疊人與掉幀不能穿過關閉的門`, () => {
        for (const dt of [1 / 120, 1 / 30, 1 / 10, 0.25]) {
          for (const stacked of [false, true]) {
            let s = G.fresh(level.id);
            const x = direction > 0 ? gate.x - G.C.w - 2 : gate.x + gate.w + 2;
            s.players[0] = { ...s.players[0], x, y: stacked ? 312 : 356, grounded: true, support: stacked ? 1 : -1 };
            s.players[1] = { ...s.players[1], x, y: 356, grounded: true, exited: !stacked };
            if (gate.mode !== undefined) s.mode = 1 - gate.mode;
            assert.equal(G.gateOpen(s, index), false);
            s = ticks(s, 80, (_, i) => [{ axis: direction, jump: i % 15 === 0 }, { axis: direction }], dt);
            for (const p of s.players.filter(p => !p.exited)) {
              assert.equal(overlaps(p, gate), false);
              assert.ok(direction > 0 ? p.x + G.C.w <= gate.x + 0.001 : p.x >= gate.x + gate.w - 0.001);
            }
          }
        }
      });
    }
    test(`第${level.id + 1}關門${index + 1}：關門夾到角色或箱子，退回進入的一側`, () => {
      for (const w of [G.C.w, 48, 64]) for (const side of [-1, 1]) {
        const previous = { x: gate.x + gate.w / 2 - w / 2, y: 320, w, h: 44, gateSides: [] };
        previous.gateSides[index] = side;
        const body = { ...previous, x: previous.x - side * 12 };
        constrain(body, previous, level.gates, i => i !== index, G.C);
        assert.equal(overlaps(body, gate), false);
        assert.equal(body.x, side < 0 ? gate.x - w : gate.x + gate.w);
      }
    });
  });
}

test('切換門在角色身上關閉時，不能把角色擠到另一側', () => {
  let s = G.fresh(5);
  const l = G.levels[5], gate = l.gates[0];
  s.mode = 0;
  s.players[0].x = gate.x - 20;
  s.players[0].gateSides = [-1, -1];
  s.players[1].x = l.switches[1].x;
  s = G.step(s, [{ axis: 1 }, {}]);
  assert.equal(G.gateOpen(s, 0), false);
  assert.equal(s.players[0].x + G.C.w, gate.x);
});

test('壓按鈕的人跳開的同一刻，門內的隊友不能繼續穿牆', () => {
  let s = G.fresh(2);
  const gate = G.levels[2].gates[0];
  s.boxes[0].x = gate.buttons[0].x;
  s.boxes[1].x = 100;
  s.players[0].x = gate.buttons[1].x;
  s.players[1].x = gate.x - 20;
  s.players[1].gateSides = [-1];
  assert.equal(G.gateOpen(s, 0), true);
  s = G.step(s, [{ jump: true }, { axis: 1 }]);
  assert.equal(G.gateOpen(s, 0), false);
  assert.equal(s.players[1].x + G.C.w, gate.x);
});

test('三個電梯關不能靠地面箱子加疊人直接跳上樓，仍須接應', () => {
  for (const id of [4, 7, 9]) {
    const l = G.levels[id], ledge = l.platforms[0];
    let s = G.fresh(id);
    const crateHeight = Math.max(0, ...s.boxes.map(b => b.h));
    if (s.boxes[0]) s.boxes[0].x = ledge.x - 70;
    const x = ledge.x - 65;
    s.players[0] = { ...s.players[0], x, y: 400 - crateHeight - 44, grounded: true, onBox: crateHeight ? 0 : -1 };
    s.players[1] = { ...s.players[1], x, y: 400 - crateHeight - 88, grounded: true, support: 0 };
    let highestFeet = 400;
    s = ticks(s, 240, (state, i) => {
      highestFeet = Math.min(highestFeet, state.players[1].y + 44);
      return [{}, { axis: 1, jump: i === 0 }];
    });
    assert.ok(highestFeet > ledge.y, `第${id + 1}關平台仍可被跳過`);
    assert.ok(s.players[1].y + 44 > ledge.y);
  }
});

test('每關以雙人亂跳、互推、不同幀率檢查關閉門沒有殘留穿入', () => {
  let seed = 20261028;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
  for (const l of G.levels) {
    let s = G.fresh(l.id);
    for (let t = 0; t < 3000; t++) {
      const commands = [0, 1].map(() => ({ axis: random() < .7 ? 1 : -1, jump: random() < .15 }));
      s = G.step(s, commands, t % 97 === 0 ? .2 : 1 / 60);
      l.gates.forEach((gate, i) => {
        if (!G.gateOpen(s, i)) for (const p of [...s.players.filter(p => !p.exited), ...(s.boxes || [])]) {
          assert.equal(overlaps(p, gate), false, `第${l.id + 1}關門${i + 1}，時間${t}`);
        }
      });
    }
  }
});
