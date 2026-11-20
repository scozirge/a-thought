// Deterministic combat samples, not a proof that every possible layout is equal.
// Controllers are also measured beside two basic towers so their added firing
// time counts; damage is capped at actual enemy HP, excluding overkill.
const fs = require('node:fs');
const path = require('node:path');
const G = require('./core.js');
const pack = (kind, hp, count) => Array.from({length:count}, () => ({kind,hp,row:3,wave:0}));
const scenarios = {
  '地面蟲群': pack('bug',4,24),
  '空中蟲群': pack('flyer',7,16),
  '上盾蟲群': pack('shield',8,16),
  '巨蟲': pack('giant',56,3),
  '混合蟲群': [...pack('bug',4,12),...pack('giant',56,4),...pack('flyer',7,10)]
};
function sample(queue, kind, support) {
  const s=G.createState(); s.money=1000; s.hearts=1000;
  if(support) for(const [c,r] of [[5,4],[3,4]]) G.build(s,'pea',c,r);
  // A straight lane is the piercing tower's intended placement advantage.
  if(kind) G.build(s,kind,kind==='pierce'?1:6,kind==='pierce'?3:4);
  G.startWave(s); s.castle=null; // Isolate purchased towers from the castle in these damage samples.
  s.queue=queue.map(e=>({...e})); let escaped=0;
  for(let i=0;i<18000 && s.phase==='running';i++) {
    const existing=[...s.enemies]; G.step(s,1/60);
    for(const e of existing) if(e.dead&&e.hp>0) escaped+=e.hp;
  }
  const total=queue.reduce((n,e)=>n+e.hp,0);
  const remaining=s.queue.reduce((n,e)=>n+e.hp,0)+s.enemies.reduce((n,e)=>n+e.hp,0);
  return {damage:total-escaped-remaining,kills:s.stats.defeated,seconds:+(s.time/G.BATTLE_SPEED).toFixed(1),finished:s.phase!=='running'};
}
const rows=[];
for(const [scenario,queue] of Object.entries(scenarios)) {
  const baseline=sample(queue,null,true);
  for(const [kind,tool] of Object.entries(G.TOOLS).filter(([,t])=>t.rate)) {
    const solo=sample(queue,kind,false), combined=sample(queue,kind,true);
    rows.push({scenario,kind,cost:tool.cost,damage:solo.damage,kills:solo.kills,
      damagePer10:+(solo.damage/tool.cost*10).toFixed(2),
      supportGain:combined.damage-baseline.damage,
      supportGainPer10:+((combined.damage-baseline.damage)/tool.cost*10).toFixed(2),finished:solo.finished&&combined.finished});
  }
}
const out=path.join(__dirname,'dist'); fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'balance-report.json'),JSON.stringify({scenarios,rows},null,2));
console.table(rows.map(({scenario,kind,damagePer10,supportGainPer10})=>({scenario,kind,damagePer10,supportGainPer10})));
