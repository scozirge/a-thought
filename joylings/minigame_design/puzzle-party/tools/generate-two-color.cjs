// 三題規則形狀、每區至少露兩格；後貼的貼紙有更高比例直接可見。
const fs=require('node:fs'),path=require('node:path'),levels=[];
for(let k=0;k<3;k++){
 const palette=k===0?['red','blue']:['red','yellow','blue'];
 const coordinate=c=>k===1?c%4:k===2?3-(c/4|0):(c/4|0);
 const masks=Array.from({length:4},(_,i)=>Array.from({length:16},(_,c)=>c).filter(c=>coordinate(c)>=i));
 const masksB=masks.map(m=>m.filter(c=>k===1?(c/4|0)>=2:c%4>=2));
 const answer=masks.map((_,i)=>[palette[(i+k)%palette.length],palette[(i+k+1)%palette.length]]),target=Array(16).fill(null);
 masks.forEach((m,i)=>m.forEach(c=>target[c]=answer[i][masksB[i].includes(c)?1:0]));
 levels.push({id:'sticker-v12-'+(18+k),title:['雙色小階梯','雙色排排站','雙色往上貼'][k],stage:'挑戰',note:'A、B 各選一色。後貼蓋前貼，先找每張露出的那一排。',cols:4,rows:4,twoColor:true,palette,masks,masksB,target});
}
fs.writeFileSync(path.resolve(__dirname,'../rules/two-color-levels.js'),'// 由 tools/generate-two-color.cjs 固定產生。\nmodule.exports = '+JSON.stringify(levels,null,2)+';\n');
