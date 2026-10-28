(function (root) {
  'use strict';

  // Remember the last side on which the whole body was clear of each gate.
  // A gate closing around a body must return it to that side, never teleport
  // it through the remaining thickness of the wall.
  function constrainGates(body, previous, gates, isOpen, constants) {
    const w = body.w ?? constants.w;
    const h = body.h ?? constants.h;
    const sides = [...(previous.gateSides || [])];
    for (let i = 0; i < gates.length; i++) {
      const gate = gates[i];
      const left = gate.x - w;
      const right = gate.x + gate.w;
      const previousSide = previous.x <= left + 0.001 ? -1
        : previous.x >= right - 0.001 ? 1
          : sides[i] || (previous.x + w / 2 < gate.x + gate.w / 2 ? -1 : 1);
      if (!isOpen(i)) {
        const crossesHeight = Math.max(previous.y + h, body.y + h) > gate.y
          && Math.min(previous.y, body.y) < gate.y + gate.h;
        if (crossesHeight) {
          if (previousSide < 0 && body.x > left) body.x = left;
          if (previousSide > 0 && body.x < right) body.x = right;
        }
      }
      sides[i] = body.x <= left + 0.001 ? -1
        : body.x >= right - 0.001 ? 1 : previousSide;
    }
    body.x = Math.max(0, Math.min(constants.width - w, body.x));
    body.gateSides = sides;
  }

  if (typeof module !== 'undefined') module.exports = constrainGates;
  else root.TogetherCollision = constrainGates;
})(globalThis);
