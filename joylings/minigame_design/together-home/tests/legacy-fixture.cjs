// Retain the earlier hard puzzle layouts for focused physics regressions.
const campaign=require('../core.js'),physics=require('../physics.js')(campaign.C);
const levels=[0,10,11,12,14,15,16,17,18,19].map(id=>campaign.levels.catalog[id]);
Object.defineProperty(levels,'catalog',{value:campaign.levels.catalog});
module.exports={...campaign,levels,
 fresh:(id=0)=>id===0?campaign.fresh(0):physics.fresh(levels[id],id),
 gateOpen:(s,i)=>s.level===0?campaign.gateOpen(s,i):physics.gateOpen(s,levels[s.level],i),
 step(s,input,dt=1/120){
  if(s.level===0)return campaign.step(s,input,dt);
  if(!Number.isFinite(dt)||dt<=0)return s;
  const duration=Math.min(dt,.25),count=Math.ceil(duration/(1/120));
  const commands=[0,1].map(i=>({...input[i]}));
  for(let i=0;i<count;i++){
   s=physics.step(s,commands,levels[s.level],duration/count);
   commands.forEach(c=>{c.jump=false;c.special=false;c.ability=false;});
  }
  return s;
 }
};
