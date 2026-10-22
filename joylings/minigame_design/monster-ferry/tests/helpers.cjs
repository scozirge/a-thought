const G=require('../core.js');
function solve(level){
 const q=[{state:G.fresh(level),path:[]}],seen=new Set(['0'.repeat(G.levels[level].ids.length)+',0']);
 for(let at=0;at<q.length;at++){
  const {state,path}=q[at];if(G.won(state))return path;
  for(let mask=0;mask<2**state.positions.length;mask++){
   const cargo=state.positions.map((_,i)=>i).filter(i=>mask>>i&1);
   if(cargo.length>G.levels[level].seats||cargo.some(i=>state.positions[i]!==state.bank))continue;
   const r=G.cross({...state,cargo});if(r.error)continue;
   const key=r.state.positions.join('')+','+r.state.bank;
   if(!seen.has(key)){seen.add(key);q.push({state:r.state,path:[...path,cargo]});}
  }
 }
 throw Error('No solution for '+level);
}
module.exports={solve};
if(require.main===module)G.levels.forEach((l,i)=>console.log(l.name,JSON.stringify(solve(i))));
