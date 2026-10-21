// Deterministic offline generation; each puzzle is measured by breadth-first search.
const fs=require('node:fs');let seed=724192;function random(n){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.floor(seed/4294967296*n);}
function grid(blocks,pos){const g=new Int8Array(36).fill(-1);blocks.forEach((b,i)=>{for(let k=0;k<b.len;k++)g[b.axis==='h'?b.fixed*6+pos[i]+k:(pos[i]+k)*6+b.fixed]=i;});return g;}
function range(blocks,pos,i,g=grid(blocks,pos)){const b=blocks[i],p=pos[i];let lo=p,hi=p;const cell=x=>b.axis==='h'?b.fixed*6+x:x*6+b.fixed;while(lo>0&&g[cell(lo-1)]===-1)lo--;while(hi+b.len<6&&g[cell(hi+b.len)]===-1)hi++;return [lo,hi];}
function* neighbors(blocks,p){const g=grid(blocks,p);for(let i=0;i<blocks.length;i++){const [lo,hi]=range(blocks,p,i,g);for(let to=lo;to<=hi;to++){if(to===p[i])continue;const next=p.slice();next[i]=to;yield {pos:next,action:{block:i,to}};}}}
const key=p=>p.join('');
function component(blocks,start){const q=[start],index=new Map([[key(start),0]]),goals=[];for(let i=0;i<q.length;i++){const p=q[i];if(range(blocks,p,0)[1]===4)goals.push(i);for(const {pos} of neighbors(blocks,p)){const k=key(pos);if(!index.has(k)){index.set(k,q.length);q.push(pos);if(q.length>24000)return null;}}}if(!goals.length)return null;
 const dist=new Int16Array(q.length).fill(-1),todo=goals.slice();for(const i of goals)dist[i]=1;for(let j=0;j<todo.length;j++){const at=todo[j];for(const {pos} of neighbors(blocks,q[at])){const i=index.get(key(pos));if(dist[i]===-1){dist[i]=dist[at]+1;todo.push(i);}}}return {q,dist};}
function layout(){const blocks=[{axis:'h',fixed:2,len:2,start:0}],pos=[0];const target=8+random(6);for(let tries=0;tries<100&&blocks.length<target;tries++){const axis=random(2)?'h':'v',len=random(5)?2:3,fixed=random(6),start=random(7-len);if(axis==='h'&&fixed===2)continue;const g=grid(blocks,pos);let valid=true;for(let k=0;k<len;k++)if(g[axis==='h'?fixed*6+start+k:(start+k)*6+fixed]!==-1)valid=false;if(valid){blocks.push({axis,fixed,len,start});pos.push(start);}}return {blocks,pos};}

const old=require('../levels.js'),wanted=[26,30],found=new Map(),pool=[];
const signature=bs=>bs.map(b=>[b.axis,b.fixed,b.len].join(',')).sort().join(';');
const seen=new Set();
function consider(blocks,c){const max=Math.max(...c.dist);let at=c.dist.indexOf(max);if(pool.every(p=>p.sig!==signature(blocks))){pool.push({blocks:blocks.map((b,i)=>({...b,start:c.q[at][i]})),score:max,sig:signature(blocks)});pool.sort((a,b)=>b.score-a.score);pool.splice(18);}
for(const n of wanted){if(found.has(n)||max<n)continue;let index=c.dist.findIndex((d,i)=>d===n&&c.q[i][0]===0);if(index<0)index=c.dist.indexOf(n);found.set(n,{blocks:blocks.map((b,i)=>({...b,start:c.q[index][i]})),minMoves:n,limit:n+4});console.log('FOUND',n,'blocks',blocks.length,'max',max);break;}}
for(const l of old.slice(5)){const c=component(l.blocks,l.blocks.map(b=>b.start));if(c)consider(l.blocks,c);}
function mutate(base){let blocks=base.map(b=>({...b}));const count=1+random(3);for(let k=0;k<count&&blocks.length>7;k++)blocks.splice(1+random(blocks.length-1),1);
const target=Math.min(14,Math.max(10,base.length+random(3)-1));
for(let tries=0;tries<100&&blocks.length<target;tries++){const axis=random(2)?'h':'v',len=random(5)?2:3,fixed=random(6),start=random(7-len);if(axis==='h'&&fixed===2)continue;const g=grid(blocks,blocks.map(b=>b.start));let valid=true;for(let k=0;k<len;k++)if(g[axis==='h'?fixed*6+start+k:(start+k)*6+fixed]!==-1)valid=false;if(valid)blocks.push({axis,fixed,len,start});}return blocks;}
for(let attempt=0;attempt<5000&&found.size<2;attempt++){
const blocks=random(10)===0?layout().blocks:mutate(pool[random(Math.min(pool.length,10))].blocks);
const sig=signature(blocks)+blocks.map(b=>b.start).join('');if(seen.has(sig))continue;seen.add(sig);
const c=component(blocks,blocks.map(b=>b.start));if(c)consider(blocks,c);
if(attempt%100===0)console.log('attempt',attempt,'best',pool[0].score,'found',Array.from(found.keys()));
}
fs.mkdirSync('dist',{recursive:true});fs.writeFileSync('dist/hard-candidates.json',JSON.stringify({found:Array.from(found.values()),pool},null,2));
if(found.size<2)throw Error('Search incomplete');
console.log('Hard candidates ready');
