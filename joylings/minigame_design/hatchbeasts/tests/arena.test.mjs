import test from 'node:test';
import assert from 'node:assert/strict';
import { canStand, moveInArena, turnView, resolveRound, awardRound } from '../lib/arena.ts';

test('players cannot enter cover or leave the arena', () => {
  assert.equal(canStand(0, 12), true);
  assert.equal(canStand(-5, 5), false);
  assert.equal(canStand(17, 0), false);
  assert.equal(canStand(-7.3, 5), false);
});

test('movement slides along cover while preserving a free axis', () => {
  const position = { x: -7.5, z: 5 };
  moveInArena(position, 0.2, 0.2);
  assert.equal(position.x, -7.5);
  assert.equal(position.z, 5.2);
});

test('mouse deltas turn the view in both axes and clamp vertical rotation', () => {
  const view = turnView(0, 0, 100, -50, 0.0025);
  assert.equal(view.yaw, -0.25);
  assert.equal(view.pitch, 0.125);
  assert.equal(turnView(0, 0, 0, -9999, 0.0025).pitch, 1.15);
  assert.equal(turnView(0, 0, 0, 9999, 0.0025).pitch, -1.15);
});

test('duels resolve timeout by remaining health, including a draw', () => {
  assert.equal(resolveRound(80, 40), 'player');
  assert.equal(resolveRound(20, 60), 'opponent');
  assert.equal(resolveRound(100, 100), 'draw');
  assert.equal(resolveRound(0, 100), 'opponent');
});

test('first to five ends the match and drawn rounds do not award points', () => {
  assert.deepEqual(awardRound(4, 4, 'player'), { player: 5, opponent: 4, result: 'won' });
  assert.deepEqual(awardRound(4, 4, 'opponent'), { player: 4, opponent: 5, result: 'lost' });
  assert.deepEqual(awardRound(4, 4, 'draw'), { player: 4, opponent: 4, result: null });
  assert.deepEqual(awardRound(0, 0, 'player'), { player: 1, opponent: 0, result: null });
});
