// 離線、固定種子的題庫建置器。只輸出題目；遊玩時沒有隨機或臨時生成。
const fs=require('node:fs'),path=require('node:path');
let seed=1002071;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const pick=n=>Math.floor(random()*n),shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=pick(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const steps=Array(10).fill(4),palette=['red','yellow','blue','green'];
const sticker=[],penguin=[];
const near=(v,n)=>[v%n>0?v-1:-1,v%n<n-1?v+1:-1,v>=n?v-n:-1,v<n*(n-1)?v+n:-1].filter(v=>v>=0);
const names=['交錯的四張貼紙','重疊裡找線索','沿著小缺口找','四層交會處','藏在同色裡','被遮住的輪廓','小角落的證據','從最後一張倒推','兩種顏色四張貼紙','四張貼紙大偵探'];
for(let k=0;k<10;k++){
 // 前十關最多覆蓋 23 次；後段逐題增加覆蓋，但四組仍各選一次。
 // 早期貼紙從露出 2～4 格，漸進至最後兩關各保留一格有效線索。
 const count=steps[k],overpaint=24+k,minVisible=k<4?2:1,maxVisible=k<4?4:k<8?2:1;let chosen,visible;
 for(let attempt=0;attempt<200000;attempt++){
  const seeds=shuffle(Array.from({length:16},(_,i)=>i)).slice(0,count),masks=[Array.from({length:16},(_,i)=>i)];
  for(let i=1;i<count;i++){
   const protectedCells=new Set(seeds.slice(0,i)),cells=[seeds[i]],size=7+pick(8);
   while(cells.length<size){const edge=[...new Set(cells.flatMap(c=>near(c,4)))].filter(c=>!protectedCells.has(c)&&!cells.includes(c));if(!edge.length)break;cells.push(edge[pick(edge.length)]);}
   masks.push(cells.sort((a,b)=>a-b));
  }
  const depth=Array(16).fill(0),owners=Array(16);masks.forEach((m,i)=>m.forEach(c=>{depth[c]++;owners[c]=i;}));
  const over=depth.reduce((s,v)=>s+v-1,0);
  const remaining=masks.map((_,i)=>owners.filter(v=>v===i).length);
  if(over!==overpaint||remaining.slice(0,3).some(n=>n<minVisible||n>maxVisible))continue;
  chosen=masks;visible=remaining;break;
 }
 if(!chosen)throw Error('找不到貼紙 '+k);
 // 先練四個不同顏色，後段容許不同組同色，需辨認覆蓋位置。
 const colors=shuffle(palette);if(k>=4)colors[2]=colors[0];if(k>=8)colors[3]=colors[1];
 const target=Array(16);chosen.forEach((m,i)=>m.forEach(c=>target[c]=colors[i]));
 const note=k<4?'每組只貼一次。重疊處看最後一張，沒被蓋住的地方也有線索。':k<8?'每組只貼一次。不同組可以選一樣的顏色，沿著形狀找出還露出的部分。':'前面三張各留下小小一格。四組都只貼一次，從最後一張往前想。';
 sticker.push({id:'sticker-v10-'+(k+11),title:names[k],stage:'挑戰',note,cols:4,rows:4,palette,masks:chosen,target});
 console.log('貼紙 '+(k+11)+'：'+count+' 次選擇，覆蓋 '+overpaint+' 次，各層可見 '+visible);
}
const delta=[[0,-1],[1,0],[0,1],[-1,0]];
function makeBoard(n,wallCount){
 const walls=new Set(shuffle(Array.from({length:n*n},(_,i)=>i)).slice(0,wallCount));
 const floor=Array.from({length:n*n},(_,i)=>i).filter(i=>!walls.has(i)),start=floor[pick(floor.length)],seen=new Set([start]),queue=[start];
 for(const p of queue)for(const next of near(p,n))if(!walls.has(next)&&!seen.has(next)){seen.add(next);queue.push(next);}
 if(seen.size!==floor.length)return null;
 const table=Array.from({length:n*n},(_,i)=>delta.map(([dx,dy])=>{
  let x=i%n,y=Math.floor(i/n);while(x+dx>=0&&x+dx<n&&y+dy>=0&&y+dy<n&&!walls.has((y+dy)*n+x+dx)){x+=dx;y+=dy;}return y*n+x;
 }));
 return {size:n,start,walls:[...walls],table};
}
function candidates(a,b,depth){
 const base=b.size*b.size,key=(x,y)=>x*base+y,root=key(a.start,b.start);
 const seen=new Map([[root,0]]);let states=new Map([[root,{ways:1,path:[]}]]);
 for(let step=1;step<=depth;step++){
  const next=new Map();
  for(const [key0,data] of states){const x=Math.floor(key0/base),y=key0%base;
   for(let d=0;d<4;d++){
    const nx=a.table[x][d],ny=b.table[y][d],k=key(nx,ny);
    if(seen.has(k)&&seen.get(k)<step)continue;
    if(!seen.has(k))seen.set(k,step);
    if(next.has(k))next.get(k).ways=Math.min(2,next.get(k).ways+data.ways);
    else next.set(k,{ways:data.ways,path:[...data.path,d]});
   }
  }
  states=next;
 }
 return [...states].filter(([k,v])=>v.ways===1&&Math.floor(k/base)!==a.start&&k%base!==b.start).map(([k,v])=>({goals:[Math.floor(k/base),k%base],path:v.path}));
}
function soloWays(b,goal,steps){let states=new Map([[b.start,1]]);for(let i=0;i<steps;i++){const next=new Map();for(const [p,count]of states)for(const q of b.table[p])next.set(q,(next.get(q)||0)+count);states=next;}return states.get(goal)||0;}
const iceTitles=['冰牆的新停點','同方向，不同終點','借冰塊停一下','兩邊輪流前進','家在冰場裡面','看清中途停在哪','一邊停，一邊走','四步雙重推理','先到家，還要再出發','最後一步一起到家'];
for(let k=0;k<10;k++){
 const depth=steps[k],n=5,wallCount=k<4?5:k<8?6:7;let found;
 for(let attempt=0;attempt<200000&&!found;attempt++){
  const a=makeBoard(n,wallCount),b=makeBoard(n,wallCount);if(!a||!b)continue;
  for(const c of shuffle(candidates(a,b,depth))){
   const solo=[soloWays(a,c.goals[0],depth),soloWays(b,c.goals[1],depth)];if(solo.some(n=>n<2))continue;
   let positions=[a.start,b.start],blocked=0,departures=0,interiorStops=0;
   for(const d of c.path){const next=[a.table[positions[0]][d],b.table[positions[1]][d]];
    positions.forEach((p,i)=>{if(p===next[i])blocked++;if(p===c.goals[i]&&p!==next[i])departures++;
     const q=next[i],x=q%n,y=Math.floor(q/n);if(p!==q&&x>0&&x<n-1&&y>0&&y<n-1)interiorStops++;
    });positions=next;
   }
   // 同樣四步：冰塊作煞車 → 不同步停靠 → 中途到家後還要離開。
   const interiorGoals=c.goals.filter(p=>p%n>0&&p%n<n-1&&Math.floor(p/n)>0&&Math.floor(p/n)<n-1).length;
   if(k<4&&(blocked!==2||interiorStops<2||departures!==0))continue;
   if(k>=4&&k<8&&(blocked<3||interiorGoals<1||interiorStops<2))continue;
   if(k>=8&&(departures<1||blocked<2||interiorGoals<1))continue;
   found={a,b,c,solo,blocked,departures,interiorStops};break;
  }
 }
 if(!found)throw Error('找不到企鵝 '+k);
 const {a,b,c,solo,blocked,departures,interiorStops}=found;
 const point=(p,n)=>[p%n,Math.floor(p/n)];
 const note=k<4?'每組只選一個方向，共四步。冰塊可以幫企鵝停在新的位置，兩邊都要看。':k<8?'每組只選一個方向，共四步。一隻停住時，另一隻可能還能走；想好兩邊下一步的停點。':'每組只選一個方向，共四步。到家後仍會繼續讀方向，要看全部四步的終點。';
 penguin.push({id:'penguin-v10-'+(k+11),title:iceTitles[k],stage:'挑戰',steps:depth,note,boards:[a,b].map((b,i)=>({size:b.size,start:point(b.start,b.size),goal:point(c.goals[i],b.size),walls:b.walls.sort((a,b)=>a-b).map(p=>point(p,b.size))}))});
 console.log('企鵝 '+(k+11)+'：最短 '+depth+' 步且唯一；單邊解 '+solo+'，停住 '+blocked+' 次，場中停點 '+interiorStops+' 次，離家 '+departures+' 次');
}
const payload={sticker,penguin},out=path.resolve(__dirname,'../rules/advanced-levels.js');
fs.writeFileSync(out,"(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AdvancedLevels=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){return "+JSON.stringify(payload,null,2)+";});\n");
