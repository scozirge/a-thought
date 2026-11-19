(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'));
  else root.GardenSolutions = factory(root.Garden);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (G) {
  'use strict';
  // The UI and campaign tests share these verified, normally priced layouts.
  const layouts = [
    // 第 1 關
    [["wall",8,0],["wall",8,1],["wall",8,2],["wall",8,3],["wall",8,5],["wall",8,6],["wall",8,7],["cannon",6,6],["flame",4,5],["frost",4,6],["pea",2,4]],
    // 第 2 關
    [["wall",8,0],["wall",8,1],["wall",8,2],["wall",8,3],["wall",8,5],["wall",8,6],["wall",8,7],["cannon",4,2],["flame",1,0],["cannon",5,6],["pea",1,1],["pea",3,4]],
    // 第 3 關
    [["wall",8,0],["wall",8,1],["wall",8,2],["wall",8,3],["wall",8,5],["wall",8,6],["wall",8,7],["cannon",7,1],["flame",1,2],["cannon",6,1],["pea",3,3],["pea",3,4],["frost",5,3],["cannon",7,6]],
    // 第 4 關
    [["wall",8,0],["wall",8,1],["wall",8,2],["wall",8,3],["wall",8,5],["wall",8,6],["wall",8,7],["cannon",7,1],["flame",1,2],["cannon",6,1],["pea",3,3],["pea",3,4],["frost",5,3],["cannon",7,6],["pierce",4,5]],
    // 第 5 關
    [["wall",8,0],["wall",8,1],["wall",8,2],["wall",8,3],["wall",8,5],["wall",8,6],["wall",8,7],["cannon",7,5],["frost",3,5],["pea",5,6],["pierce",2,3],["frost",5,3],["pierce",4,0],["frost",6,5],["pierce",5,2],["cannon",3,4]],
    // 第 6 關
    [["wall",8,0],["wall",8,1],["wall",8,2],["wall",8,3],["wall",8,5],["wall",8,6],["wall",8,7],["cannon",7,5],["frost",3,5],["frost",5,6],["pierce",4,1],["pierce",5,3],["pierce",2,0],["frost",5,7],["pierce",5,2],["frost",3,4],["pierce",1,3],["pea",5,4]],
    // 第 7 關
    [["wall",8,0],["wall",8,1],["wall",8,2],["wall",8,3],["wall",8,5],["wall",8,6],["wall",8,7],["cannon",7,5],["pierce",3,5],["frost",5,6],["pierce",4,1],["pierce",5,3],["pierce",7,1],["frost",5,7],["flame",5,2],["pea",3,4],["pierce",1,3],["pierce",2,1],["pierce",1,2],["frost",5,4]],
    // 第 8 關
    [["wall",8,0],["wall",8,1],["wall",8,2],["wall",8,3],["wall",8,5],["wall",8,6],["wall",8,7],["cannon",7,5],["cannon",3,5],["pierce",4,1],["pierce",4,0],["pierce",5,4],["pea",3,4],["pierce",1,3],["pierce",2,1],["pierce",1,2],["flame",7,4],["pea",3,2],["pierce",4,2],["frost",1,5],["pea",6,2],["frost",5,1]],
    // 第 9 關
    [["wall",8,0],["wall",8,1],["wall",8,2],["wall",8,3],["wall",8,5],["wall",8,6],["wall",8,7],["cannon",7,5],["pierce",3,5],["pierce",4,1],["pierce",4,0],["pierce",5,4],["pea",3,4],["pierce",1,3],["pierce",2,1],["pierce",1,2],["pea",3,2],["pierce",4,2],["frost",1,5],["frost",5,3],["cannon",4,6],["push",5,1]],
    // 第 10 關
    [["wall",8,0],["wall",8,1],["wall",8,2],["wall",8,3],["wall",8,5],["wall",8,6],["wall",8,7],["cannon",7,5],["pierce",1,6],["pea",1,3],["pierce",6,7],["frost",4,2],["frost",1,5],["pierce",2,0],["frost",4,7],["pierce",4,4],["pea",6,3],["pierce",4,6],["pierce",2,4],["pierce",5,2],["cannon",7,6],["pea",4,0],["pea",5,1],["pea",5,4],["flame",2,6],["cannon",6,2],["pierce",3,1],["pea",5,6],["cannon",1,1],["pierce",7,2]]
  ];
  function create(level) {
    if (!Number.isInteger(level) || !layouts[level]) throw new RangeError('無效關卡');
    const state = G.createState(level);
    for (const placement of layouts[level]) {
      const result = G.build(state, ...placement);
      if (!result.ok) throw new Error('解答部署失敗：' + result.error);
    }
    state.undo = [];
    return state;
  }
  for (const layout of layouts) { for (const placement of layout) Object.freeze(placement); Object.freeze(layout); }
  return Object.freeze({ layouts: Object.freeze(layouts), create });
});
