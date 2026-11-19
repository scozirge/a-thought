(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'));
  else root.GardenSolutions = factory(root.Garden);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (G) {
  'use strict';
  // The UI and campaign tests share these verified, normally priced layouts.
  const layouts = [
    // 第 1 關　路旁兩座一般砲塔
    [["pea",5,4],["pea",8,4]],
    // 第 2 關　沿用教學塔，再從上下兩側補大砲
    [["pea",5,4],["pea",8,4],["cannon",1,1],["cannon",3,5]],
    // 第 3 關　留出牆縫，讓地面蟲走進砲區
    [["wall",7,0],["wall",7,1],["wall",7,2],["wall",7,3],["wall",7,6],["cannon",6,5],["cannon",4,3]],
    // 第 4 關　擊退與火焰守住牆後的第二線
    [["wall",7,0],["wall",7,1],["wall",7,2],["wall",7,3],["wall",7,5],["wall",7,6],["push",5,3],["cannon",6,5],["cannon",4,3],["pea",3,4],["flame",5,5]],
    // 第 5 關　用雷射顧空中、群攻守地面
    [["wall",8,0],["wall",8,1],["wall",8,2],["wall",8,3],["cannon",7,5],["frost",3,5],["pea",5,6],["pierce",2,3],["frost",5,3],["pierce",4,0],["pierce",5,2]],
    // 第 6 關　在分裂點附近留緩速和後備火力
    [["wall",8,0],["wall",8,1],["wall",8,6],["wall",8,7],["pierce",7,2],["pea",5,5],["flame",6,5],["pea",6,3],["cannon",7,5],["pierce",2,3],["pierce",4,1],["push",2,5],["frost",7,3]],
    // 第 7 關　從不同角度清理母蟲與幼蟲
    [["wall",8,0],["wall",8,2],["wall",8,3],["wall",8,6],["wall",8,7],["cannon",7,5],["pierce",3,5],["pierce",4,1],["pierce",5,3],["pierce",7,1],["flame",5,2],["pea",3,4],["pierce",1,3],["frost",5,4]],
    // 第 8 關　前後分區，控場和輸出交錯
    [["cannon",4,5],["pea",4,3],["push",9,4],["cannon",5,1],["flame",2,2],["pea",8,6],["push",1,2],["push",5,3],["pea",2,3],["flame",8,2],["frost",3,6],["flame",1,3],["pea",10,4],["frost",3,1],["frost",3,2],["flame",6,5],["push",9,2],["pea",3,3],["push",2,0],["cannon",7,6],["push",1,0],["pea",8,7]],
    // 第 9 關　兼顧上下入口，在中線保留穿透火力
    [["wall",8,0],["wall",8,1],["wall",7,3],["wall",8,4],["cannon",7,5],["pierce",3,5],["pierce",3,0],["pierce",4,0],["pierce",5,4],["pierce",1,3],["pierce",2,1],["pierce",1,2],["pea",3,2],["flame",4,2],["frost",1,5],["frost",5,3],["cannon",4,6],["push",6,2],["pea",5,7],["cannon",10,2],["pea",6,5]],
    // 第 10 關　分子砲分區鎖定，拳套與燃燒守入口
    [["wall",8,0],["wall",8,1],["wall",8,2],["wall",8,3],["wall",7,5],["wall",8,7],["pea",1,3],["push",4,2],["frost",1,5],["frost",4,7],["pea",6,3],["cannon",7,6],["pea",4,0],["pea",5,1],["pea",5,4],["flame",2,6],["molecular",1,1],["push",2,0],["frost",3,3],["flame",3,2],["molecular",4,4],["cannon",1,0],["push",4,5],["push",6,1],["cannon",10,4],["cannon",10,5],["pea",1,6],["cannon",3,4],["pea",10,7],["frost",9,2],["flame",3,1]]
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
