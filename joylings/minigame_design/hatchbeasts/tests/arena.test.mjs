import test from 'node:test';
import assert from 'node:assert/strict';
import { canStand, moveInArena, turnView, unlockedWeapon } from '../lib/arena.ts';

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

test('weapon unlocks occur at the announced kill thresholds', () => {
  assert.equal(unlockedWeapon(2), 0);
  assert.equal(unlockedWeapon(3), 1);
  assert.equal(unlockedWeapon(5), 1);
  assert.equal(unlockedWeapon(6), 2);
});
