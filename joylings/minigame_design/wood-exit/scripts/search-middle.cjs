// Deterministic offline generation; each puzzle is measured by breadth-first search.
const fs=require('node:fs');let seed=724192;function random(n){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.floor(seed/4294967296*n);}
function grid(blocks,pos){const g=new Int8Array(36).fill(-1);blocks.forEach((b,i)=>{for(let k=0;k<b.len;k++)g[b.axis==='h'?b.fixed*6+pos[i]+k:(pos[i]+k)*6+b.fixed]=i;});return g;}
function range(blocks,pos,i,g=grid(blocks,pos)){const b=blocks[i],p=pos[i];let lo=p,hi=p;const cell=x=>b.axis==='h'?b.fixed*6+x:x*6+b.fixed;while(lo>0&&g[cell(lo-1)]===-1)lo--;while(hi+b.len<6&&g[cell(hi+b.len)]===-1)hi++;return [lo,hi];}
function* neighbors(blocks,p){const g=grid(blocks,p);for(let i=0;i<blocks.length;i++){const [lo,hi]=range(blocks,p,i,g);for(let to=lo;to<=hi;to++){if(to===p[i])continue;const next=p.slice();next[i]=to;yield {pos:next,action:{block:i,to}};}}}
const key=p=>p.join('');
function component(blocks,start){const q=[start],index=new Map([[key(start),0]]),goals=[];for(let i=0;i<q.length;i++){const p=q[i];if(range(blocks,p,0)[1]===4)goals.push(i);for(const {pos} of neighbors(blocks,p)){const k=key(pos);if(!index.has(k)){index.set(k,q.length);q.push(pos);if(q.length>24000)return null;}}}if(!goals.length)return null;
 const dist=new Int16Array(q.length).fill(-1),todo=goals.slice();for(const i of goals)dist[i]=1;for(let j=0;j<todo.length;j++){const at=todo[j];for(const {pos} of neighbors(blocks,q[at])){const i=index.get(key(pos));if(dist[i]===-1){dist[i]=dist[at]+1;todo.push(i);}}}return {q,dist};}
function layout(){const blocks=[{axis:'h',fixed:2,len:2,start:0}],pos=[0];const target=8+random(6);for(let tries=0;tries<100&&blocks.length<target;tries++){const axis=random(2)?'h':'v',len=random(5)?2:3,fixed=random(6),start=random(7-len);if(axis==='h'&&fixed===2)continue;const g=grid(blocks,pos);let valid=true;for(let k=0;k<len;k++)if(g[axis==='h'?fixed*6+start+k:(start+k)*6+fixed]!==-1)valid=false;if(valid){blocks.push({axis,fixed,len,start});pos.push(start);}}return {blocks,pos};}

const levels=require('../levels.js'),found=[],sign=bs=>bs.map(b=>[b.axis,b.fixed,b.len].join(',')).sort().join(';'),used=new Set(levels.map(l=>sign(l.blocks)));
for(let attempt=0;attempt<1500&&found.length<2;attempt++){
const wanted=14+found.length,{blocks,pos}=layout();if(used.has(sign(blocks)))continue;const c=component(blocks,pos);if(!c)continue;const index=c.dist.findIndex((d,i)=>d===wanted&&c.q[i][0]===0);if(index<0)continue;
const l={blocks:blocks.map((b,i)=>({...b,start:c.q[index][i]})),minMoves:wanted,limit:wanted+3};found.push(l);used.add(sign(blocks));console.log('New level',6+found.length-1,'min',wanted,'blocks',blocks.length);
}
if(found.length!==2)throw Error('No suitable candidates');fs.mkdirSync('dist',{recursive:true});fs.writeFileSync('dist/middle-candidates.json',JSON.stringify(found,null,2));
