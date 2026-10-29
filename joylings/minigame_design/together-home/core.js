(function(root){
'use strict';
function create(levels, hooks){
hooks??=(typeof module!=='undefined'?require('./puzzle-rules.js'):root.TogetherPuzzleRules)(levels);
const C={width:1000,height:480,floor:400,w:38,h:44,speed:210,gravity:1600,jump:440};
const constrainGates=typeof module!=='undefined'?require('./collision.js'):root.TogetherCollision;
const physics=(typeof module!=='undefined'?require('./physics.js'):root.TogetherPhysics)(C,hooks);
function fresh(level=0){const l=levels[level];if(!l.legacy)return physics.fresh(l,level);return {level,players:l.starts.map(x=>({x,y:356,vy:0,grounded:true,support:-1,exited:false})),collected:l.keys.map(()=>false),collectedBy:l.keys.map(()=>null),latched:l.gates.map(()=>false),key:false,won:false};}
const overlap=(a,b)=>a.x+C.w>b.x+2&&a.x<b.x+C.w-2;
function pressed(s,g){return s.players.some(p=>!p.exited&&p.grounded&&Math.abs(p.y+C.h-g.button.y)<3&&p.x+C.w>g.button.x&&p.x<g.button.x+g.button.w);}
function gateOpen(s,i){if(!levels[s.level].legacy)return physics.gateOpen(s,levels[s.level],i);return s.latched[i]||pressed(s,levels[s.level].gates[i]);}
function blockGates(p,old,l,s){constrainGates(p,old,l.gates,i=>gateOpen(s,i),C);}
function simulate(s,inputs,dt){
 if(s.won)return s; if(!levels[s.level].legacy)return physics.step(s,inputs,levels[s.level],dt);
 const l=levels[s.level],n={...s,players:s.players.map(p=>({...p})),collected:[...s.collected],collectedBy:[...s.collectedBy],latched:[...s.latched]},old=s.players;
 for(let i=0;i<2;i++){
  const p=n.players[i],input=inputs[i]||{};if(p.exited)continue;
  if(input.jump&&p.grounded){p.vy=-C.jump;p.grounded=false;p.support=-1;}
  p.x+=Math.max(-1,Math.min(1,input.axis||0))*C.speed*dt;
  if(p.support>=0&&!old[p.support].exited)p.x+=(inputs[p.support]?.axis||0)*C.speed*dt;
  p.x=Math.max(0,Math.min(C.width-C.w,p.x));
  p.vy+=C.gravity*dt;p.y+=p.vy*dt;p.grounded=false;p.support=-1;
  if(p.y+C.h>=C.floor){p.y=C.floor-C.h;p.vy=0;p.grounded=true;}
  for(const f of l.platforms){
   if(p.vy>=0&&old[i].y+C.h<=f.y+.1&&p.y+C.h>=f.y&&p.x+C.w>f.x+2&&p.x<f.x+f.w-2){p.y=f.y-C.h;p.vy=0;p.grounded=true;}
  }
  blockGates(p,old[i],l,s);
 }
 // Heads and wooden ledges are one-way platforms: jump up, land on top.
 for(let i=0;i<2;i++){
  const j=1-i,p=n.players[i],q=n.players[j];if(p.exited||q.exited)continue;
  if(overlap(p,q)&&p.vy>=q.vy&&old[i].y+C.h<=old[j].y+2&&p.y+C.h>=q.y){p.y=q.y-C.h;p.vy=q.vy;p.grounded=q.grounded;p.support=j;}
 }
 for(let attempt=0;attempt<2;attempt++){
  const [a,b]=n.players;
  if(!a.exited&&!b.exited&&overlap(a,b)&&Math.min(a.y+C.h,b.y+C.h)-Math.max(a.y,b.y)>3){
   const left=old[0].x<=old[1].x?0:1,right=1-left,gap=n.players[left].x+C.w-n.players[right].x;
   if(gap>0){n.players[left].x-=gap/2;n.players[right].x+=gap/2;}
  }
  n.players.forEach((p,i)=>{blockGates(p,old[i],l,s);p.x=Math.max(0,Math.min(C.width-C.w,p.x));});
 }
 l.gates.forEach((g,i)=>{
  if(gateOpen(s,i)&&n.players.some((p,j)=>!p.exited&&old[j].x<=g.x+g.w+12&&p.x>g.x+g.w+12))n.latched[i]=true;
 });
 n.players.forEach((p,i)=>{if(!p.exited)blockGates(p,old[i],l,n);});
 for(const [actor,p] of n.players.entries()){
  if(p.exited)continue;
  l.keys.forEach((k,i)=>{if(!n.collected[i]&&p.x<k.x+k.r&&p.x+C.w>k.x-k.r&&p.y<k.y+k.r&&p.y+C.h>k.y-k.r){n.collected[i]=true;n.collectedBy[i]=actor;}});
 }
 n.key=n.collected.every(Boolean);
 for(const p of n.players)if(!p.exited&&n.key&&p.x+C.w/2>l.door.x+14&&p.y+C.h>=C.floor-3){p.exited=true;p.support=-1;}
 n.won=n.players.every(p=>p.exited);return n;
}
// Fixed physics slices also protect callers using slow or uneven frame times.
function step(s,inputs,dt=1/120){
 if(!Number.isFinite(dt)||dt<=0)return s;
 const duration=Math.min(dt,.25),count=Math.ceil(duration/(1/120));
 const commands=[0,1].map(i=>({axis:Math.max(-1,Math.min(1,Number(inputs[i]?.axis)||0)),jump:!!inputs[i]?.jump,special:!!inputs[i]?.special}));
 for(let i=0;i<count;i++){s=simulate(s,commands,duration/count);commands.forEach(a=>{a.jump=false;a.special=false;});}
 return s;
}
function camera(s){
 const l=levels[s.level];if(!l.world)return {x:0,y:l.cameraTop??140,w:1000,h:480-(l.cameraTop??140),scale:1};
 const actors=s.players.filter(p=>!p.exited),points=actors.length?actors:s.players;
 const left=Math.min(...points.map(p=>p.x)),right=Math.max(...points.map(p=>p.x+(p.w??38))),top=Math.min(...points.map(p=>p.y)),bottom=Math.max(...points.map(p=>p.y+(p.h??44)));
 const viewportHeight=l.viewHeight??560,scale=Math.max(.65,Math.min(1,1000/(right-left+360),viewportHeight/(bottom-top+220))),w=1000/scale,h=viewportHeight/scale;
 const clamp=(v,min,max)=>Math.max(min,Math.min(Math.max(min,max),v));
 return {x:clamp((left+right)/2-w/2+90,l.world.left??0,l.world.width-w),y:clamp((top+bottom)/2-h/2-30,l.world.top,l.world.bottom-h),w,h,scale};
}
const api={C,levels,fresh,step,camera,pressed,gateOpen,weighted:physics.pressed,platformActive:physics.platformActive,canHelp:physics.canHelp,isIce:physics.isIce};return api;
}
const api=create(typeof module!=='undefined'?require('./levels.js'):root.TogetherLevels);api.create=create;
if(typeof module!=='undefined')module.exports=api;else root.Together=api;
})(globalThis);
