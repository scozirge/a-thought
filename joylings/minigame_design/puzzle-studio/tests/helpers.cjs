const G=require('../core.js');
function solve(game,level){
 const initial=G.fresh(game,level);
 if(game==='rooms')return [
 [[0,3],[4,10],[7,15],[12,14]],
 [[0,7],[3,9],[10,14],[15,22],[18,24]],
 [[0,6],[2,9],[10,17],[13,19],[20,26],[22,29]]
 ][level].map(([a,b])=>({type:'rect',a,b}));
 if(game==='bridges'){
 const assignment=level===0?[[0,1,1],[1,2,1]]:level===1?[[0,1,2],[0,2,2],[1,3,1],[2,3,1]]:[[0,1,1],[1,2,2],[0,3,1],[3,5,2],[2,4,1],[5,6,1],[6,7,2],[3,4,1]];
 return assignment.flatMap(([a,b,n])=>Array.from({length:n},()=>({type:'link',a,b})));
 }
 const key=s=>game==='pancake'?s.stack.join(','):s.player+':'+s.boxes.slice().sort((a,b)=>a-b).join(',');
 const seen=new Set([key(initial)]),q=[{s:initial,parent:-1,a:null}];
 for(let i=0;i<q.length;i++){
  const {s}=q[i];
  if(G.won(s)){const actions=[];for(let j=i;q[j].parent>=0;j=q[j].parent)actions.unshift(q[j].a);return actions;}
  const actions=game==='pancake'?Array.from({length:s.stack.length-1},(_,i)=>({type:'flip',n:i+2})):[[0,1],[1,0],[0,-1],[-1,0]].map(([dx,dy])=>({type:'move',dx,dy}));
  for(const a of actions){const r=G.act(s,a);if(r.error)continue;const k=key(r.state);if(!seen.has(k)){seen.add(k);q.push({s:r.state,parent:i,a});}}
  if(q.length>200000)throw Error('Search limit');
 }
 throw Error('Unsolvable '+game+' '+level);
}
module.exports={solve};
