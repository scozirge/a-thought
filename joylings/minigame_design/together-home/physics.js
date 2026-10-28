(function(root){
function create(C){
const constrainGates=typeof module!=='undefined'?require('./collision.js'):root.TogetherCollision;
const width=o=>o.w??C.w,height=o=>o.h??C.h;
const hit=(a,b)=>a.x+width(a)>b.x+1&&a.x<b.x+width(b)-1&&a.y+height(a)>b.y+1&&a.y<b.y+height(b)-1;
function weighted(s,b){return [...s.players.filter(p=>!p.exited),...s.boxes].some(p=>p.grounded&&Math.abs(p.y+height(p)-b.y)<4&&p.x+width(p)>b.x+3&&p.x<b.x+b.w-3);}
function open(s,l,i){const g=l.gates[i];return (g.mode===undefined||s.mode===g.mode)&&(!g.buttons||g.buttons.every(b=>weighted(s,b)));}
function fresh(l,level){return {level,players:l.starts.map(x=>({x,y:356,vy:0,grounded:true,support:-1,onBox:-1,exited:false})),boxes:(l.boxes||[]).map(b=>({...b,y:b.y??400-b.h,vy:0,grounded:true})),lifts:(l.lifts||[]).map(f=>f.bottom),switches:(l.switches||[]).map(()=>false),mode:l.mode??0,collected:l.keys.map(()=>false),latched:l.gates.map(()=>false),key:false,won:false};}
function surfaces(s,l){return [...l.platforms,...(l.lifts||[]).map((f,i)=>({...f,y:s.lifts[i],h:12}))];}
function block(o,prev,s,l){constrainGates(o,prev,l.gates,i=>open(s,l,i),C);}
function vertical(o,prev,s,n,l,dt){
 let carried=false;
 (l.lifts||[]).forEach((f,i)=>{if(Math.abs(prev.y+height(o)-s.lifts[i])<2&&prev.x+width(o)>f.x+2&&prev.x<f.x+f.w-2&&o.vy>=0){o.y+=n.lifts[i]-s.lifts[i];carried=true;}});
 o.vy+=C.gravity*dt;o.y+=o.vy*dt;o.grounded=false;
 const floor=[{x:0,y:400,w:1000},...surfaces(n,l)].sort((a,b)=>a.y-b.y);
 for(const f of floor){if(o.vy>=0&&(prev.y+height(o)<=f.y+2||carried&&o.y+height(o)-f.y<6)&&o.y+height(o)>=f.y&&o.x+width(o)>f.x+2&&o.x<f.x+f.w-2){o.y=f.y-height(o);o.vy=0;o.grounded=true;break;}}
}
function step(s,input,l,dt){
 if(s.won)return s;
 const n={...s,players:s.players.map(p=>({...p})),boxes:s.boxes.map(b=>({...b})),lifts:[...s.lifts],switches:[...s.switches],collected:[...s.collected],latched:[...s.latched]};
 (l.lifts||[]).forEach((f,i)=>{const target=f.buttons.some(b=>weighted(s,b))?f.top:f.bottom;n.lifts[i]+=Math.sign(target-s.lifts[i])*Math.min(Math.abs(target-s.lifts[i]),(f.speed||90)*dt);});
 n.boxes.forEach((b,i)=>{
  const prev=s.boxes[i];let dir=0;
  for(let p=0;p<2;p++){const a=s.players[p],axis=input[p]?.axis||0;if(a.exited||!axis||!a.grounded||input[p]?.jump||a.y+C.h<=prev.y+3||a.y>=prev.y+prev.h-3)continue;
   const contact=axis>0&&a.x+C.w<=prev.x+2&&a.x+C.w+axis*C.speed*dt>=prev.x-1||axis<0&&a.x>=prev.x+prev.w-2&&a.x+axis*C.speed*dt<=prev.x+prev.w+1;
   if(!contact)continue;
   const helpers=s.players.filter((q,j)=>!q.exited&&q.grounded&&(input[j]?.axis||0)===axis&&Math.abs(q.y+C.h-(prev.y+prev.h))<4&&(axis>0?q.x+C.w<=prev.x+3&&prev.x-q.x<112:q.x>=prev.x+prev.w-3&&q.x-prev.x-prev.w<78));
   if(!b.heavy||helpers.length===2)dir=axis;
  }
  b.x+=dir*C.speed*dt;
  for(let j=0;j<n.boxes.length;j++)if(j!==i&&hit(b,n.boxes[j]))b.x=prev.x;
  for(const p of s.players)if(!p.exited&&hit(b,p)&&((dir>0&&p.x>=prev.x+prev.w-2)||(dir<0&&p.x+C.w<=prev.x+2)))b.x=prev.x;
  block(b,prev,s,l);vertical(b,prev,s,n,l,dt);
 });
 for(let i=0;i<2;i++){
  const p=n.players[i],old=s.players[i],a=input[i]||{};if(p.exited)continue;
  if(a.jump&&p.grounded){p.vy=-C.jump;p.support=-1;p.onBox=-1;p.grounded=false;}
  p.x+=(a.axis||0)*C.speed*dt;
  if(p.support>=0&&!s.players[p.support].exited)p.x+=(input[p.support]?.axis||0)*C.speed*dt;
  if(p.onBox>=0)p.x+=n.boxes[p.onBox].x-s.boxes[p.onBox].x;
  p.support=-1;p.onBox=-1;
  vertical(p,old,s,n,l,dt);
  n.boxes.forEach((b,j)=>{
   if(p.vy>=0&&old.y+C.h<=s.boxes[j].y+2&&p.y+C.h>=b.y&&p.x+C.w>b.x+2&&p.x<b.x+b.w-2){p.y=b.y-C.h;p.vy=0;p.grounded=b.grounded;p.onBox=j;}
   else if(hit(p,b)){if(old.x+C.w<=s.boxes[j].x+2)p.x=b.x-C.w;else if(old.x>=s.boxes[j].x+b.w-2)p.x=b.x+b.w;}
  });block(p,old,s,l);
 }
 for(let i=0;i<2;i++){
  const p=n.players[i],q=n.players[1-i];if(p.exited||q.exited)continue;
  if(p.vy>=q.vy&&s.players[i].y+C.h<=s.players[1-i].y+2&&p.y+C.h>=q.y&&p.x+C.w>q.x+2&&p.x<q.x+C.w-2){p.y=q.y-C.h;p.vy=q.vy;p.grounded=q.grounded;p.support=1-i;}
 }
 for(let pass=0;pass<3;pass++){
  const [a,b]=n.players;if(!a.exited&&!b.exited&&hit(a,b)&&Math.min(a.y+C.h,b.y+C.h)-Math.max(a.y,b.y)>3){const left=s.players[0].x<=s.players[1].x?0:1,right=1-left,d=n.players[left].x+C.w-n.players[right].x;if(d>0){n.players[left].x-=d/2;n.players[right].x+=d/2;}}
  n.players.forEach((p,i)=>{if(p.exited)return;block(p,s.players[i],s,l);for(const b of n.boxes)if(hit(p,b)){if(s.players[i].x+C.w<=b.x+4)p.x=b.x-C.w;else if(s.players[i].x>=b.x+b.w-4)p.x=b.x+b.w;}});
 }
 if(l.tether&&!n.players.some(p=>p.exited)){
  for(let i=0;i<2;i++){const p=n.players[i],q=n.players[1-i];if(Math.abs(p.x-q.x)>l.tether&&Math.abs(p.x-q.x)>Math.abs(s.players[i].x-q.x))p.x=s.players[i].x;}
 }
 (l.switches||[]).forEach((b,i)=>{const down=weighted(n,b);if(down&&!s.switches[i])n.mode=1-n.mode;n.switches[i]=down;});
 // Recheck after switches, ropes, box pushes and pressure changes this tick.
 // Returning a body can release another pad, so settle the gates together.
 for(let pass=0;pass<=l.gates.length;pass++){
  n.boxes.forEach((b,i)=>block(b,s.boxes[i],n,l));
  n.players.forEach((p,i)=>{if(!p.exited)block(p,s.players[i],n,l);});
 }
 n.players.forEach((p,actor)=>{if(p.exited)return;l.keys.forEach((k,i)=>{if((k.owner===undefined||k.owner===actor)&&p.x<k.x+k.r&&p.x+C.w>k.x-k.r&&p.y<k.y+k.r&&p.y+C.h>k.y-k.r)n.collected[i]=true;});});
 n.key=n.collected.every(Boolean);
 for(const p of n.players)if(!p.exited&&n.key&&p.x+C.w/2>l.door.x+14&&Math.abs(p.y+C.h-(l.door.y+l.door.h))<4){p.exited=true;p.support=-1;}
 n.won=n.players.every(p=>p.exited);return n;
}
return {fresh,step,pressed:weighted,gateOpen:open};
}
if(typeof module!=='undefined')module.exports=create;else root.TogetherPhysics=create;
})(globalThis);
