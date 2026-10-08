// 兩款各二十題；每關固定四組各選一次，後段透過題目結構增加難度。
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./rules.js'),require('./sticker-more.js'),require('./advanced-levels.js'),require('./two-color-levels.js'));else root.PuzzleCatalog=factory(root.PuzzleRules,root.StickerMore,root.AdvancedLevels,root.TwoColorLevels);})(typeof globalThis!=='undefined'?globalThis:this,function(R,more,advanced,twoColor){
 const games={sticker:{...R.games.sticker,subtitle:'一層一層，想出最後的模樣',levels:[...R.games.sticker.levels.slice(0,4),...more,...advanced.sticker.slice(0,7),...twoColor]},penguin:{...R.games.penguin,levels:[...R.games.penguin.levels,...advanced.penguin]}};
 return {games};
});
