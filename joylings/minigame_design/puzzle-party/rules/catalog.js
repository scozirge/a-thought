// 四步合作題庫；新增題目使用新 ID，避免舊草稿混用。
const R=require('./rules.js'),more=require('./sticker-more.js'),advanced=require('./advanced-levels.js'),classroom=require('./classroom-levels.js');
const games={sticker:{...R.games.sticker,levels:[...R.games.sticker.levels.slice(0,4),...more.slice(0,5),...classroom.sticker,advanced.sticker[4],...classroom.twoColor]},penguin:{...R.games.penguin,levels:[...R.games.penguin.levels.slice(0,4),...classroom.penguin,...advanced.penguin]}};
module.exports={games};
