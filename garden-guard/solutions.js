(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'));
  else root.GardenSolutions = factory(root.Garden);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (G) {
  'use strict';
  // The UI and campaign tests share these verified, normally priced layouts.
  const layouts = [
    // 第 1 關　三路交會處設大砲，前後兩排塔接力
    [["pea",7,4],["pea",5,2],["pea",5,5],["pea",3,4],["cannon",2,2],["pea",6,6]],
    // 第 2 關　從不同方向壓制上下盾
    [["cannon",7,1],["frost",7,2],["cannon",6,5],["frost",6,4],["pea",7,6],["flame",10,7],["pea",10,1],["pea",2,7]],
    // 第 3 關　牆縫集中快蟲，在轉角接應
    [["pea",6,0],["wall",6,2],["wall",6,3],["wall",6,4],["pea",6,5],["push",6,6],["wall",6,7],["flame",9,3],["cannon",4,2],["frost",4,1],["pea",1,6],["pea",2,1],["frost",10,7],["flame",5,0]],
    // 第 4 關　用兩排缺口牆防跳蟲穿過第一線
    [["push",3,0],["wall",3,1],["wall",3,2],["wall",3,3],["wall",3,4],["wall",3,5],["wall",3,6],["frost",6,1],["pea",6,2],["frost",6,3],["wall",6,4],["wall",6,5],["wall",6,6],["cannon",6,7],["cannon",2,5],["cannon",4,4],["pea",7,2],["cannon",8,2]],
    // 第 5 關　引導地面蟲折返，另留對空火力
    [["wall",3,0],["flame",3,1],["wall",3,2],["pea",3,3],["pea",3,4],["pea",3,5],["cannon",3,6],["pea",7,1],["cannon",7,2],["pea",7,3],["pierce",7,4],["cannon",7,5],["pea",7,6],["wall",7,7],["frost",5,0],["push",1,0]],
    // 第 6 關　在折返處減速，讓大砲清理分裂後的幼蟲
    [["wall",2,0],["wall",2,1],["wall",2,2],["wall",2,3],["wall",2,4],["pea",2,5],["wall",1,1],["pea",6,1],["wall",6,2],["cannon",6,3],["wall",6,4],["wall",6,5],["frost",6,6],["wall",6,7],["wall",8,0],["push",8,1],["pea",8,2],["wall",8,3],["frost",8,4],["molecular",8,5],["wall",8,7],["push",10,6],["cannon",10,4],["pea",5,4],["pea",5,1],["pea",9,5]],
    // 第 7 關　前後交錯的牆把產卵區留在射程內
    [["pea",3,0],["pea",3,1],["wall",3,3],["pea",3,4],["wall",3,5],["pea",3,7],["pea",5,1],["wall",5,2],["cannon",5,3],["cannon",5,4],["wall",5,5],["pea",5,6],["wall",5,7],["pea",8,0],["flame",8,1],["wall",8,2],["push",8,3],["wall",8,4],["frost",8,5],["wall",8,7],["molecular",6,5],["wall",6,2],["push",4,7],["molecular",2,2]],
    // 第 8 關　用深淺不同的缺口接住側面來的巨蟲
    [["wall",3,0],["pea",3,2],["pierce",3,3],["pea",3,4],["pea",3,5],["wall",3,6],["flame",3,7],["pierce",6,0],["pea",6,1],["wall",6,2],["pea",6,3],["frost",6,4],["push",6,5],["pea",6,6],["wall",9,1],["frost",9,2],["wall",9,3],["pea",9,4],["cannon",9,5],["push",9,6],["wall",9,7],["wall",7,5],["push",5,2],["wall",1,6],["molecular",1,2],["flame",2,2],["pea",1,0]],
    // 第 9 關　把雷射架在下方缺口，貫穿折返的蟲群
    [["pea",2,1],["push",2,2],["wall",6,2],["pea",2,4],["pea",2,6],["pea",2,7],["flame",4,0],["cannon",4,1],["wall",4,2],["cannon",4,3],["pea",4,4],["pea",4,5],["pierce",4,7],["frost",7,2],["push",7,3],["push",7,4],["wall",7,5],["cannon",7,6],["pea",7,7],["pea",9,0],["wall",10,1],["wall",10,2],["cannon",10,4],["wall",8,6],["pea",9,1],["pea",6,4],["pea",8,5],["flame",1,6],["flame",2,5],["frost",6,6],["pea",3,1]],
    // 第 10 關　用石牆拉長路線，雷射守中路，分子砲從下方鎖定巨蟲
    [["pea",2,3],["wall",2,4],["wall",8,2],["pierce",7,3],["cannon",6,3],["wall",7,4],["push",7,5],["pea",8,3],["cannon",5,2],["wall",7,2],["wall",5,1],["wall",1,3],["frost",3,2],["wall",10,3],["cannon",5,3],["wall",4,7],["molecular",2,7],["pea",6,4],["pea",3,1],["wall",5,6],["push",2,0],["flame",3,6],["wall",9,4],["cannon",7,0],["wall",6,6],["wall",8,0],["wall",10,7],["push",1,2],["wall",7,6],["push",6,5],["wall",4,4],["wall",5,5],["cannon",1,4],["wall",3,0],["push",6,2],["wall",10,1],["wall",10,4],["wall",1,0],["frost",1,5],["cannon",2,1],["wall",2,2],["wall",1,1],["wall",9,6],["pea",4,5],["wall",9,3],["cannon",3,7],["wall",10,6]],
    // 隱藏第 11 關　用兩圈錯開的牆口守中央，沿路集火四面的蟲群
    [["flame",5,5],["push",7,4],["frost",6,6],["pea",6,4],["molecular",5,2],["wall",7,2],["pea",4,3],["pierce",4,4],["push",3,2],["flame",3,3],["pea",3,4],["cannon",9,5],["cannon",4,6],["cannon",9,3],["cannon",9,4],["wall",9,2],["molecular",9,7],["push",8,1],["push",8,6],["push",7,1],["frost",6,5],["pierce",6,1],["wall",1,6],["wall",3,1],["push",5,6],["wall",2,6],["wall",9,1],["wall",1,4],["frost",3,6],["wall",10,7],["pea",4,1],["wall",5,1],["pea",4,2],["wall",2,5],["pea",2,3],["pea",6,2],["pea",1,2]]
  ];
  // The late answers spend crystals earned in earlier stages at their normal cost.
  const upgradeSquares = { 9: [[3,1],[5,2],[0,3],[5,3],[2,3]], 10: [[8,1],[6,5],[5,3],[7,4],[3,2],[5,5],[4,4]] };
  function applyUpgrades(state) {
    for (const [c,r] of upgradeSquares[state.level] ?? []) {
      if (G.isHome(state.level,c,r) ? state.castleUpgraded : G.at(state,c,r)?.upgraded) continue;
      const result = G.upgrade(state,c,r);
      if (!result.ok) throw new Error('解答升級失敗：' + result.error);
    }
  }
  function create(level) {
    if (!Number.isInteger(level) || !layouts[level]) throw new RangeError('無效關卡');
    const state = G.createState(level);
    for (const placement of layouts[level]) {
      const result = G.build(state, ...placement);
      if (!result.ok) throw new Error('解答部署失敗：' + result.error);
    }
    applyUpgrades(state);
    state.undo = [];
    return state;
  }
  for (const layout of layouts) { for (const placement of layout) Object.freeze(placement); Object.freeze(layout); }
  return Object.freeze({ layouts: Object.freeze(layouts), applyUpgrades, create });
});
