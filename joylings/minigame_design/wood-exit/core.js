(function(r,f){if(typeof module==='object'&&module.exports)module.exports=f(require('./levels.js'));else r.Wood=f(r.WoodLevels);})(globalThis,levels=>{
'use strict';
function fresh(level=0){if(!Number.isInteger(level)||!levels[level])throw Error('Invalid level');return {level,pos:levels[level].blocks.map(b=>b.start),moves:0};}
function occupancy(s,skip=-1){const g=Array(36).fill(-1);levels[s.level].blocks.forEach((b,i)=>{if(i===skip||s.pos[i]===6)return;for(let k=0;k<b.len;k++)g[b.axis==='h'?b.fixed*6+s.pos[i]+k:(s.pos[i]+k)*6+b.fixed]=i;});return g;}
function bounds(s,i){const b=levels[s.level].blocks[i];if(!b||won(s))return null;const g=occupancy(s,i),cell=p=>b.axis==='h'?b.fixed*6+p:p*6+b.fixed;let min=s.pos[i],max=min;while(min>0&&g[cell(min-1)]===-1)min--;while(max+b.len<6&&g[cell(max+b.len)]===-1)max++;if(i===0&&max===4)max=6;return {min,max};}
function won(s){return s.pos[0]===6;}
function move(s,i,to){if(won(s))return {error:'已經過關了'};if(s.moves>=levels[s.level].limit)return {error:'步數用完了，退一步再試試'};if(!Number.isInteger(i)||!Number.isInteger(to)||!levels[s.level].blocks[i])return {error:'再試一次'};const b=bounds(s,i);if(to===s.pos[i])return {error:'木塊沒有移動'};if(to<b.min||to>b.max||(i===0&&to===5))return {error:'這裡移不過去'};const pos=s.pos.slice();pos[i]=to;return {state:{level:s.level,pos,moves:s.moves+1}};}
function replay(level,actions){if(!Array.isArray(actions)||actions.length>levels[level]?.limit)throw Error('Invalid history');let s=fresh(level);for(const a of actions){if(!a||typeof a!=='object')throw Error('Invalid action');const r=move(s,a.block,a.to);if(r.error)throw Error(r.error);s=r.state;}return s;}
// Search from the visible board. A straight slide of any length is one move.
function solutionFrom(s){
 if(won(s))return [];
 const blocks=levels[s.level].blocks,nodes=[{pos:s.pos.slice(),parent:-1,action:null}],seen=new Set([s.pos.join(',')]);
 for(let at=0;at<nodes.length;at++){
  const node=nodes[at],state={level:s.level,pos:node.pos,moves:0};
  if(bounds(state,0).max===6){const path=[{block:0,to:6}];for(let n=at;nodes[n].parent>=0;n=nodes[n].parent)path.unshift(nodes[n].action);return path;}
  for(let i=0;i<blocks.length;i++){
   const range=bounds(state,i);
   for(let to=range.min;to<=range.max;to++){
    if(to===node.pos[i])continue;
    const pos=node.pos.slice();pos[i]=to;const key=pos.join(',');
    if(seen.has(key))continue;seen.add(key);nodes.push({pos,parent:at,action:{block:i,to}});
   }
  }
 }
 return null;
}
function unlocked(best){return Array.from({length:10},(_,i)=>i).every(i=>Number.isInteger(best[i])&&best[i]>=levels[i].minMoves&&best[i]<=levels[i].limit);}
function restore(raw){
 const clean=()=>({state:fresh(),actions:[],best:{}});
 try{
  const saved=JSON.parse(raw);if(!saved||![1,2,3,4].includes(saved.version)||!Number.isInteger(saved.level)||saved.level<0||saved.level>=(saved.version===4?12:10))return clean();
  const original=[0,1,2,null,null,3,4,5,6,7],expanded=[0,1,2,3,4,7,8,9,10,11];
  const map=i=>saved.version===4?i:saved.version===1?(original[i]===null?null:expanded[original[i]]):expanded[i];
  const next=map(saved.level),level=next===null?3:next,best={};
  for(let i=0;i<(saved.version===4?12:10);i++){const j=map(i);if(j===null||(saved.version===2&&i>=8))continue;const n=saved.best?.[i];if(Number.isInteger(n)&&n>=levels[j].minMoves&&n<=levels[j].limit)best[j]=n;}
  let actions=next===null||(saved.version===2&&saved.level>=8)?[]:saved.actions,state;
  try{state=replay(level,actions);}catch(_){state=fresh(level);actions=[];}
  return {state,actions,best};
 }catch(_){return clean();}
}
return {levels,fresh,occupancy,bounds,won,move,replay,restore,unlocked,solutionFrom};
});