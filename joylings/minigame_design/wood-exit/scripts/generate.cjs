// Deterministic offline generation; each puzzle is measured by breadth-first search.
const fs=require('node:fs');let seed=724192;function random(n){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.floor(seed/4294967296*n);}
function grid(blocks,pos){const g=new Int8Array(36).fill(-1);blocks.forEach((b,i)=>{for(let k=0;k<b.len;k++)g[b.axis==='h'?b.fixed*6+pos[i]+k:(pos[i]+k)*6+b.fixed]=i;});return g;}
function range(blocks,pos,i,g=grid(blocks,pos)){const b=blocks[i],p=pos[i];let lo=p,hi=p;const cell=x=>b.axis==='h'?b.fixed*6+x:x*6+b.fixed;while(lo>0&&g[cell(lo-1)]===-1)lo--;while(hi+b.len<6&&g[cell(hi+b.len)]===-1)hi++;return [lo,hi];}
function* neighbors(blocks,p){const g=grid(blocks,p);for(let i=0;i<blocks.length;i++){const [lo,hi]=range(blocks,p,i,g);for(let to=lo;to<=hi;to++){if(to===p[i])continue;const next=p.slice();next[i]=to;yield {pos:next,action:{block:i,to}};}}}
const key=p=>p.join('');
function component(blocks,start){const q=[start],index=new Map([[key(start),0]]),goals=[];for(let i=0;i<q.length;i++){const p=q[i];if(range(blocks,p,0)[1]===4)goals.push(i);for(const {pos} of neighbors(blocks,p)){const k=key(pos);if(!index.has(k)){index.set(k,q.length);q.push(pos);if(q.length>24000)return null;}}}if(!goals.length)return null;
 const dist=new Int16Array(q.length).fill(-1),todo=goals.slice();for(const i of goals)dist[i]=1;for(let j=0;j<todo.length;j++){const at=todo[j];for(const {pos} of neighbors(blocks,q[at])){const i=index.get(key(pos));if(dist[i]===-1){dist[i]=dist[at]+1;todo.push(i);}}}return {q,dist};}
function layout(){const blocks=[{axis:'h',fixed:2,len:2,start:0}],pos=[0];const target=8+random(6);for(let tries=0;tries<100&&blocks.length<target;tries++){const axis=random(2)?'h':'v',len=random(5)?2:3,fixed=random(6),start=random(7-len);if(axis==='h'&&fixed===2)continue;const g=grid(blocks,pos);let valid=true;for(let k=0;k<len;k++)if(g[axis==='h'?fixed*6+start+k:(start+k)*6+fixed]!==-1)valid=false;if(valid){blocks.push({axis,fixed,len,start});pos.push(start);}}return {blocks,pos};}
const wants=[2,3,5,7,9,11,13,16,19,22],found=new Map();
const manual=[
 [{axis:'h',fixed:2,len:2,start:0},{axis:'v',fixed:3,len:2,start:1}],
 [{axis:'h',fixed:2,len:2,start:0},{axis:'v',fixed:3,len:3,start:1},{axis:'h',fixed:4,len:2,start:2}]
];
manual.forEach((blocks,i)=>found.set(wants[i],{blocks,minMoves:wants[i],limit:wants[i]+2}));
for(let attempt=0;attempt<2500&&found.size<wants.length;attempt++){
 const {blocks,pos}=layout(),c=component(blocks,pos);if(!c)continue;const max=Math.max(...c.dist);
 for(const wanted of wants){if(found.has(wanted)||max<wanted)continue;let chosen=-1;for(let i=0;i<c.q.length;i++)if(c.dist[i]===wanted&&c.q[i][0]===0){chosen=i;break;}if(chosen<0)continue;
 found.set(wanted,{blocks:blocks.map((b,i)=>({...b,start:c.q[chosen][i]})),minMoves:wanted,limit:wanted+(wanted<7?2:wanted<16?3:4)});console.log('Found',wanted,'moves;',blocks.length,'blocks;',c.q.length,'states');
 break; // Keep successive puzzles structurally different.
 }
 if(attempt%100===0)console.log('search',attempt,'found',found.size);
}
if(found.size!==wants.length)throw Error('Missing '+wants.filter(n=>!found.has(n)));
const levels=wants.map(n=>found.get(n));
fs.writeFileSync('levels.js','(function(r){const levels='+JSON.stringify(levels,null,2)+';if(typeof module==="object"&&module.exports)module.exports=levels;else r.WoodLevels=levels;})(globalThis);\n');
console.log('Generated',levels.map(l=>({min:l.minMoves,limit:l.limit,blocks:l.blocks.length})));
