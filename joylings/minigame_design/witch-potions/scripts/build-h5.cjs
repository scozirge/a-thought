'use strict';
const assert = require('node:assert/strict');
const { copyFileSync, mkdirSync, readFileSync } = require('node:fs');
const path = require('node:path');
const game = require('../game.js');
const manager = require('../manager.js');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist', 'h5');
const files = ['index.html', 'styles.css', 'game.js', 'manager.js', 'app.js'];
assert.equal(manager.questions.length, 5);
for (const [index, question] of manager.questions.entries()) {
  assert.ok(question.choices.length >= 1 && question.choices.length <= 3);
  assert.equal(question.choices.filter((_, choice) => manager.correct(index, choice)).length, 1);
}
for (const level of game.levels) {
  assert.ok(game.verdict(level, game.replay(level, level.solution)).success, `Invalid solution: ${level.id}`);
}
mkdirSync(output, { recursive: true });
for (const name of files) copyFileSync(path.join(root, name), path.join(output, name));
for (const match of readFileSync(path.join(output, 'index.html'), 'utf8').matchAll(/(?:src|href)="([^"]+)"/g)) {
  assert.ok(files.includes(match[1].split(/[?#]/)[0]), `Unexpected external or missing reference: ${match[1]}`);
}
console.log(`Verified ${game.levels.length} potion orders and local references. H5 ready: ${output}`);
