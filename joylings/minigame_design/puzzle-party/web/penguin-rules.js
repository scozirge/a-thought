(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PenguinRules = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const directions = {
    up: { label: '向上', icon: '↑', delta: [0, -1] },
    right: { label: '向右', icon: '→', delta: [1, 0] },
    down: { label: '向下', icon: '↓', delta: [0, 1] },
    left: { label: '向左', icon: '←', delta: [-1, 0] }
  };
  const same = (a, b) => a[0] === b[0] && a[1] === b[1];
  function slide(board, start, direction) {
    const move = directions[direction];
    if (!move) throw new Error('未知的滑行方向。');
    let position = start.slice();
    const path = [position];
    while (true) {
      const next = position.map((v, i) => v + move.delta[i]);
      if (next.some(v => v < 0 || v >= board.size) || board.walls.some(w => same(w, next))) break;
      position = next; path.push(position);
    }
    return { position, path, distance: path.length - 1, atHome: same(position, board.goal) };
  }
  function run(level, commands) {
    let positions = level.boards.map(b => b.start.slice());
    const frames = commands.map((command, index) => {
      // 所有企鵝讀取同一步的開始狀態；彼此在獨立冰場，不存在先後碰撞。
      const slides = level.boards.map((b, i) => slide(b, positions[i], command));
      positions = slides.map(s => s.position);
      return { index, command, slides, positions };
    });
    const arrived = positions.map((p, i) => same(p, level.boards[i].goal));
    return { frames, positions, arrived, success: arrived.every(Boolean) };
  }
  return { directions, same, slide, run };
});
