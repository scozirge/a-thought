// 固定種子；四張貼紙各分 A、B 兩個連通區，八個選色都留下可見線索。
const fs=require('node:fs'),path=require('node:path');
let seed=110016;const random=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
const neighbors=c=>[c%4?c-1:-1,c%4<3?c+1:-1,c>=4?c-4:-1,c<12?c+4:-1].filter(x=>x>=0);
function shape(n){const s=[random(16)];while(s.length<n){const edge=[...new Set(s.flatMap(neighbors))].filter(c=>!s.includes(c));s.push(edge[random(edge.length)]);}return s.sort((a,b)=>a-b);}
const palette=['red','yellow','blue','green'],levels=[];
for(let k=0;k<5;k++){
 let masks,visible;
 do{masks=[Array.from({length:16},(_,i)=>i),shape(10+k%3),shape(8+k%2),shape(5+k%3)];visible=masks.map((m,i)=>m.filter(c=>!masks.slice(i+1).some(x=>x.includes(c))));}while(visible.some(v=>v.length<2));
 const masksB=masks.map((m,i)=>{const owner=new Map([[visible[i][0],0],[visible[i][visible[i].length-1],1]]),queue=[...owner.keys()];for(const c of queue)for(const n of neighbors(c))if(m.includes(n)&&!owner.has(n)){owner.set(n,owner.get(c));queue.push(n);}return m.filter(c=>owner.get(c)===1);});
 const answer=masks.map(()=>{const a=random(4);return [palette[a],palette[(a+1+random(3))%4]];}),target=Array(16).fill(null);
 masks.forEach((m,i)=>m.forEach(c=>target[c]=answer[i][masksB[i].includes(c)?1:0]));
 levels.push({id:'sticker-v11-'+(16+k),title:['雙色貼紙','兩區一起想','找到露出的兩色','藏在後面的線索','雙色工廠大挑戰'][k],stage:'挑戰',note:'每張貼紙的 A、B 區各選一色。共四張，後貼蓋前貼。',cols:4,rows:4,twoColor:true,palette,masks,masksB,target});
}
fs.writeFileSync(path.resolve(__dirname,'../rules/two-color-levels.js'),'// 由 tools/generate-two-color.cjs 固定產生。\nmodule.exports = '+JSON.stringify(levels,null,2)+';\n');
