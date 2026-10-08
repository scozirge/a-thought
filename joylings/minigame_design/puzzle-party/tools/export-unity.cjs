// 關卡共用資料；Unity 以獨立 C# 引擎執行，不嵌入 H5 或 JavaScript 遊戲。
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const R=require('../rules/rules.js'),{games}=require('../rules/catalog.js'),dest=path.resolve(__dirname,'../unity-game/Assets');
const point=p=>p?{x:p[0],y:p[1]}:{x:-1,y:-1};
const board=b=>({...b,start:point(b.start),goal:point(b.goal),walls:b.walls.map(point)});
const levels=Object.entries(games).flatMap(([game,info])=>info.levels.map((l,index)=>({
  ...l,game,index,steps:R.optionsFor(game,l).length,options:R.optionsFor(game,l)[0],start:point(l.start),sword:point(l.sword),monster:point(l.monster),goal:point(l.goal),
  masks:l.masks?.map(cells=>({cells})),walls:l.walls?.map(point),portals:l.portals?.map(point),boards:l.boards?.map(board),
  events:l.events?.map(e=>({after:e.after,move:e.move||'',fireDirection:e.fire?.direction||'',range:e.fire?.range||0}))
})));
fs.mkdirSync(dest+'/Resources',{recursive:true});fs.mkdirSync(dest+'/PuzzleParty/Editor',{recursive:true});
fs.writeFileSync(dest+'/Resources/levels.json',JSON.stringify({levels}));
// 完整列舉 JS 結果，再由 Unity Editor 用 C# 比對；Editor 資料不打包進遊戲。
const cases=[];let total=0;
for(const [game,info]of Object.entries(games))info.levels.forEach((l,index)=>{
 const hash=crypto.createHash('sha256'),options=R.optionsFor(game,l);let count=0,successCount=0;
 function visit(settings){
  if(settings.length<options.length){options[settings.length].forEach(v=>visit([...settings,v]));return;}
  const r=R.run(game,l,settings),output=game==='sticker'?r.board.map(v=>v||'').join(','):r.positions.map(p=>p.join(',')).join(';');
  hash.update((r.success?'1':'0')+'|'+output+'\\n');count++;if(r.success)successCount++;
 }
 visit([]);if(successCount!==1)throw Error(l.id+' 必須唯一解');
 cases.push({game,index,count,successCount,digest:hash.digest('hex')});total+=count;
 console.log(l.id+': '+count+' 組設定');
});
fs.writeFileSync(dest+'/PuzzleParty/Editor/parity-cases.json',JSON.stringify({cases}));
console.log('已匯出 '+levels.length+' 關；'+total+' 組設定全部列舉，按關卡以 SHA-256 比對所有結果');
