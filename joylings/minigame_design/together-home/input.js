(function (root) {
  'use strict';
  // Human keys and recorded solutions share the same rising-edge input rules.
  const codes = ['KeyA', 'KeyD', 'KeyW', 'KeyS', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
  const actions = ['left', 'right', 'jump', 'special'];
  const mapping = Object.fromEntries(codes.map((code, i) => [code, [Math.floor(i / 4), actions[i % 4]]]));
  function mask(commands) {
    return commands.reduce((bits, c, i) => bits | ((c.axis < 0 ? 1 : c.axis > 0 ? 2 : 0) | (c.jump ? 4 : 0) | (c.special ? 8 : 0)) << (i * 4), 0);
  }
  function create() {
    const held = new Set(), jumps = [false, false], specials = [false, false];
    function pulse(i, action) {
      if (action === 'jump') jumps[i] = true;
      if (action === 'special') specials[i] = true;
    }
    function down(code, repeat = false) {
      const a = mapping[code];
      if (!a) return;
      if (!held.has(code) && !repeat) pulse(...a);
      held.add(code);
    }
    const up = code => held.delete(code);
    const consume = () => { jumps.fill(false); specials.fill(false); };
    return {
      down, up, pulse, consume,
      isDown: code => held.has(code),
      clear() { held.clear(); consume(); },
      setMask(bits) { codes.forEach((code, i) => { if (!(bits & (1 << i))) up(code); }); codes.forEach((code, i) => { if (bits & (1 << i)) down(code); }); },
      read(touch = [new Set(), new Set()]) {
        const active = (i, action) => held.has(codes[i * 4 + actions.indexOf(action)]) || touch[i].has(action);
        return [0, 1].map(i => ({ axis: Number(active(i, 'right')) - Number(active(i, 'left')), jump: jumps[i], special: specials[i] }));
      }
    };
  }
  const api = { codes, mapping, mask, create };
  if (typeof module !== 'undefined') module.exports = api; else root.TogetherInput = api;
})(globalThis);
