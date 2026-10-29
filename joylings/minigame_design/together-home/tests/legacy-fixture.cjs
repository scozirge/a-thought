// Fixed early layouts for physics regressions, independent of current order.
const core=require('../core.js');
const levels=[0,10,11,12,14,15,16,17,18,19].map(id=>core.levels.catalog[id]);
levels[0]=core.levels.previous[0];
Object.defineProperty(levels,'catalog',{value:core.levels.catalog});
module.exports=core.create(levels);
