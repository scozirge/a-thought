const G=require('../core.js');
function solveFrogs(level){
 const first=G.frogs(level),queue=[{state:first,path:[]}],seen=new Set([first.board.join(',')]);
 for(let j=0;j<queue.length;j++){
  const {state,path}=queue[j];if(G.solved(state))return path;
  for(const from of G.moves(state)){
   const next=G.jump(state,from).state,key=next.board.join(',');
   if(!seen.has(key)){seen.add(key);queue.push({state:next,path:[...path,from]});}
  }
 }
 throw Error('No solution');
}
const candidates=s=>Array.from({length:s.sides.length},(_,i)=>i+1).filter(id=>s.log.every(l=>(l.left.includes(id)?1:0)-(l.right.includes(id)?1:0)===l.result));
module.exports={solveFrogs,candidates};
