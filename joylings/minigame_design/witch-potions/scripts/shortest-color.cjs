'use strict';
const G = require('../game.js');

// Check the shortest path for one color, including pouring it into the pot.
// A bounded search keeps the difficulty check independent of the supplied hint.
function shortestColor(capacities, target, limit = 5) {
  const level = { capacities, recipe: [target, 0, 0] };
  const queue = [{ state: G.initial(level), actions: [] }];
  const seen = new Set([JSON.stringify(queue[0].state)]);
  const actions = [];
  capacities.forEach((_, source) => {
    actions.push(['fill', source, 0], ['pot', source], ['empty', source]);
    capacities.forEach((_, destination) => {
      if (source !== destination) actions.push(['pour', source, destination]);
    });
  });
  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    if (item.state.pot[0] === target) return item.actions;
    if (item.actions.length >= limit) continue;
    for (const action of actions) {
      const next = G.apply(level, item.state, action);
      if (!next.ok || next.state.pot[0] > target) continue;
      const key = JSON.stringify(next.state);
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ state: next.state, actions: [...item.actions, action] });
    }
  }
  return null;
}
module.exports = { shortestColor };
