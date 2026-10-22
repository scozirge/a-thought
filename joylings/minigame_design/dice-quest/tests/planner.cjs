// Explore a round's legal moves to check that all battles have viable strategies.
const G=require('../core.js');
function key(s){
  return JSON.stringify([s.hp,s.enemyHp,s.shield,s.slow,s.dice.map(d=>d.value).sort((a,b)=>a-b),[...s.used].sort(),[...s.tools].sort(),s.phase]);
}
function actions(s){
  const list=[];
  for(const d of s.dice){
    for(const c of G.cards)if(!G.preview(s,c.id,d.id).error)list.push({type:'cast',card:c.id,die:d.id});
    if(!s.tools.includes('plus'))list.push({type:'tool',id:'plus',die:d.id});
    if(!s.tools.includes('split')&&d.value%2===0)list.push({type:'tool',id:'split',die:d.id});
    if(!s.tools.includes('merge'))for(const e of s.dice)if(e.id>d.id)list.push({type:'tool',id:'merge',die:d.id,other:e.id});
  }
  return list;
}
function score(s,start,defense){
  if(s.phase==='lost')return -100000;
  if(s.phase==='won'||s.phase==='reward')return 10000+s.hp*defense;
  const remainingHp=s.hp-Math.max(0,G.intent(s).attack-s.shield);
  if(remainingHp<=0)return -10000;
  return (start.enemyHp-s.enemyHp)+remainingHp*defense;
}
function plan(s,defense=1.35){
  let frontier=[{state:s,path:[]}],best={state:s,path:[],score:score(s,s,defense)};
  const visited=new Set([key(s)]);
  for(let depth=0;depth<8&&frontier.length;depth++){
    const next=[];
    for(const node of frontier){
      if(node.state.phase!=='player')continue;
      for(const a of actions(node.state)){
        const r=G.act(node.state,a);if(r.error)throw Error(r.error);
        const k=key(r.state);if(visited.has(k))continue;visited.add(k);
        const candidate={state:r.state,path:[...node.path,a],score:score(r.state,s,defense)};
        if(candidate.score>best.score)best=candidate;
        next.push(candidate);
      }
    }
    next.sort((a,b)=>b.score-a.score);
    frontier=next.slice(0,110);
  }
  return best.path;
}
function campaign(rewards=['frost','extra'],defense=1.35){
  let s=G.fresh(),rounds=0;const log=[];
  while(s.phase!=='won'&&s.phase!=='lost'&&rounds<40){
    if(s.phase==='reward'){s=G.act(s,{type:'reward',id:rewards[s.stage]}).state;continue;}
    const path=plan(s,defense),before={stage:s.stage,round:s.round,hp:s.hp,enemyHp:s.enemyHp};
    for(const action of path){const r=G.act(s,action);if(r.error)throw Error(r.error);s=r.state;}
    if(s.phase==='player')s=G.act(s,{type:'end'}).state;
    log.push({...before,actions:path,afterHp:s.hp,afterEnemy:s.enemyHp});rounds++;
  }
  return {state:s,log};
}
module.exports={plan,campaign};
if(require.main===module){
  for(const rewards of [['flame','vitality'],['frost','extra']]){
    const {state,log}=campaign(rewards);
    console.log(JSON.stringify({rewards,phase:state.phase,hp:state.hp,rounds:log.map(l=>({stage:l.stage+1,round:l.round,hp:l.afterHp,enemy:l.afterEnemy,moves:l.actions.length}))},null,2));
  }
}
