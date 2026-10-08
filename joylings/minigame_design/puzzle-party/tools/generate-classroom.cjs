// Fixed seed: regenerate offline only. Each of four choices must remain observable.
const fs=require('node:fs'),path=require('node:path'),R=require('../rules/rules.js');
let seed=1301008;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const pick=n=>Math.floor(random()*n),shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=pick(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const cells=Array.from({length:16},(_,i)=>i),near=(c,n=4)=>[c%n?c-1:-1,c%n<n-1?c+1:-1,c>=n?c-n:-1,c<n*(n-1)?c+n:-1].filter(v=>v>=0);
function connected(mask,n=4){if(!mask.length)return false;const seen=new Set([mask[0]]),q=[mask[0]];for(const c of q)for(const v of near(c,n))if(mask.includes(v)&&!seen.has(v)){seen.add(v);q.push(v);}return seen.size===mask.length;}
function grow(base,size,excluded=[]){const m=base.slice();while(m.length<size){const edge=[...new Set(m.flatMap(c=>near(c)))].filter(c=>!m.includes(c)&&!excluded.includes(c));if(!edge.length)return null;m.push(edge[pick(edge.length)]);}return m.sort((a,b)=>a-b);}
function ownersOf(masks){const o=[];masks.forEach((m,i)=>m.forEach(c=>o[c]=i));return o;}
function crossings(owners){return cells.reduce((sum,c)=>sum+near(c).filter(v=>v>c&&owners[v]!==owners[c]).length,0);}
const sticker=[];
for(let k=0;k<5;k++){
 let masks;const desired=13+k,over=23+k;
 for(let attempt=0;attempt<1000000;attempt++){
  const seeds=shuffle(cells).slice(0,4),m=[cells];
  for(let i=1;i<4;i++)m.push(grow([seeds[i]],7+pick(7),seeds.slice(0,i)));
  if(m.some(v=>!v)||m.reduce((s,v)=>s+v.length,0)-16!==over)continue;
  const owners=ownersOf(m),visible=m.map((_,i)=>owners.filter(v=>v===i).length);
  if(visible.slice(0,3).some(n=>n<2||n>4)||crossings(owners)!==desired)continue;
  masks=m;break;
 }
 if(!masks)throw Error('single '+k);
 const palette=['red','yellow','blue','green'],colors=shuffle(palette),target=Array(16);
 masks.forEach((m,i)=>m.forEach(c=>target[c]=colors[i]));
 sticker.push({id:'sticker-v13-'+(10+k),title:'交錯貼紙 '+(k+1),stage:'挑戰',note:'後貼蓋前貼。',cols:4,rows:4,palette,masks,target});
 console.log('單色',10+k,'交錯邊界',crossings(ownersOf(masks)));
}
const twoColor=[];
for(let k=0;k<5;k++){
 const palette=k<2?['red','blue']:['red','yellow','blue'];let masks,masksB;
 if(k<2){const coordinate=c=>k===0?(c/4|0):c%4;masks=[0,1,2,3].map(i=>cells.filter(c=>coordinate(c)>=i));masksB=masks.map(m=>m.filter(c=>k===0?c%4>=2:(c/4|0)>=2));}
 else for(let attempt=0;attempt<1000000;attempt++){
  const final=grow([pick(16)],4),third=grow(final,8),second=grow(third,12),m=[cells,second,third,final],owners=ownersOf(m);
  if(crossings(owners)!==14+(k-2)*2)continue;
  // Last stamp also bends, instead of a complete row or rectangular block.
  const xs=final.map(c=>c%4),ys=final.map(c=>c/4|0);
  if((Math.max(...xs)-Math.min(...xs)+1)*(Math.max(...ys)-Math.min(...ys)+1)<=4)continue;
  const b=[];
  for(let i=0;i<4;i++){
   let found;
   for(let j=0;j<500;j++){
    const candidate=shuffle(m[i]).slice(0,m[i].length/2).sort((a,b)=>a-b),a=m[i].filter(c=>!candidate.includes(c));
    if(candidate.filter(c=>owners[c]===i).length!==2||!connected(candidate)||!connected(a))continue;
    found=candidate;break;
   }
   if(!found)break;b.push(found);
  }
  if(b.length===4){masks=m;masksB=b;break;}
 }
 if(!masks)throw Error('dual '+k);
 const target=Array(16);masks.forEach((m,i)=>m.forEach(c=>target[c]=palette[(i+k+(masksB[i].includes(c)?1:0))%palette.length]));
 twoColor.push({id:'sticker-v13-'+(16+k),title:k<2?'雙色練習':'雙色交錯 '+(k-1),stage:'挑戰',note:'A、B 各選一色。',cols:4,rows:4,twoColor:true,palette,masks,masksB,target});
 console.log('雙色',16+k,'交錯邊界',crossings(ownersOf(masks)));
}
const penguin=[];
for(let k=0;k<6;k++){
 const n=k<3?4:5,count=3+k,all=Array.from({length:n*n},(_,i)=>i),point=c=>[c%n,c/n|0];let chosen;
 for(let attempt=0;attempt<20000&&!chosen;attempt++){
  const walls=shuffle(all).slice(0,count),floor=all.filter(c=>!walls.includes(c));if(!connected(floor,n))continue;
  const start=point(floor[pick(floor.length)]),board={size:n,start,goal:[-1,-1],walls:walls.map(point)};
  const reached=new Map(),early=new Set(),dirs=['up','right','down','left'];
  function walk(pos,route){if(route.length<4)early.add(pos.join(','));if(route.length===4){const key=pos.join(',');const entry=reached.get(key)||{ways:0,path:route};entry.ways++;reached.set(key,entry);return;}
   for(const d of dirs)walk(R.penguin.slide(board,pos,d).position,[...route,d]);}
  walk(start,[]);
  for(const [key,entry] of reached){if(entry.ways!==1||early.has(key))continue;board.goal=key.split(',').map(Number);
   const l={id:'penguin-v13-'+(5+k),title:'小企鵝回家 '+(k+1),stage:'挑戰',steps:4,note:'四步回家。',boards:[board]};
   const result=R.run('penguin',l,entry.path);if(result.frames.some(f=>f.slides[0].distance===0))continue;
   chosen=l;break;
  }
 }
 if(!chosen)throw Error('penguin '+k);penguin.push(chosen);console.log('單企鵝',5+k,'冰塊',count);
}
fs.writeFileSync(path.resolve(__dirname,'../rules/classroom-levels.js'),'// 由 tools/generate-classroom.cjs 固定產生。\nmodule.exports = '+JSON.stringify({sticker,twoColor,penguin},null,2)+';\n');
