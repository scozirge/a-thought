// Independent verifier: enumerate every legal straight slide, one slide per move.
function solve(level,limit=150000){
 const {blocks}=level,start=blocks.map(b=>b.start),nodes=[{p:start,parent:-1,a:null}],seen=new Set([start.join('')]);
 for(let at=0;at<nodes.length;at++){
  const p=nodes[at].p,g=Array(36).fill(-1);
  blocks.forEach((b,i)=>{for(let n=0;n<b.len;n++)g[b.axis==='h'?b.fixed*6+p[i]+n:(p[i]+n)*6+b.fixed]=i;});
  let free=true;for(let x=p[0]+blocks[0].len;x<6;x++)if(g[blocks[0].fixed*6+x]!==-1)free=false;
  if(free){const path=[{block:0,to:6}];for(let j=at;nodes[j].parent>=0;j=nodes[j].parent)path.unshift(nodes[j].a);return path;}
  for(let i=0;i<blocks.length;i++){const b=blocks[i];for(const dir of [-1,1])for(let d=1;d<6;d++){
   const to=p[i]+dir*d,edge=dir<0?to:to+b.len-1;if(to<0||to+b.len>6)break;
   const cell=b.axis==='h'?b.fixed*6+edge:edge*6+b.fixed;if(g[cell]!==-1&&g[cell]!==i)break;
   const next=p.slice();next[i]=to;const key=next.join('');if(!seen.has(key)){seen.add(key);nodes.push({p:next,parent:at,a:{block:i,to}});if(nodes.length>limit)throw Error('Search limit');}
  }}
 }
 throw Error('No solution');
}
module.exports={solve};
