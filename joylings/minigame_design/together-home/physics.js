(function(root){
function create(C,hooks={}){
const constrainGates=typeof module!=='undefined'?require('./collision.js'):root.TogetherCollision;
const mechanics=(typeof module!=='undefined'?require('./mechanics.js'):root.TogetherMechanics)(C);
const width=o=>o.w??C.w,height=o=>o.h??C.h;
const hit=(a,b)=>a.x+width(a)>b.x+1&&a.x<b.x+width(b)-1&&a.y+height(a)>b.y+1&&a.y<b.y+height(b)-1;
function weighted(s,b){
 const custom=hooks.weighted?.(s,b);if(custom!==undefined)return custom;
 const bodies=b.owner===undefined?[...s.players.filter(p=>!p.exited),...s.boxes]:s.players.filter((p,i)=>i===b.owner&&!p.exited);
 return bodies.some(p=>p.grounded&&Math.abs((b.ceiling?p.y:p.y+height(p))-b.y)<4&&p.x+width(p)>b.x+3&&p.x<b.x+b.w-3);
}
function active(s,f){return (f.mode===undefined||f.mode===s.mode)&&(!f.pads||f.pads.some(b=>weighted(s,b)));}
function open(s,l,i){const custom=hooks.openGate?.(s,l,i);if(custom!==undefined)return custom;const g=l.gates[i];return (!g.keyIndices||g.keyIndices.every(k=>s.collected[k]))&&active(s,g)&&(!g.buttons||g.buttons.every(b=>weighted(s,b)));}
function fresh(l,level){return {...mechanics.fresh(l),...hooks.fresh?.(l),level,players:l.starts.map((x,i)=>({x,y:(l.startFloors?.[i]??400)-C.h,w:C.w,h:C.h,vy:0,grounded:true,support:-1,onBox:-1,exited:false})),boxes:(l.boxes||[]).map(b=>({...b,y:b.y??400-b.h,vy:0,grounded:true})),lifts:(l.lifts||[]).map(f=>f.bottom),switches:(l.switches||[]).map(()=>false),mode:l.mode??0,collected:l.keys.map(()=>false),collectedBy:l.keys.map(()=>null),latched:l.gates.map(()=>false),flash:0,key:false,won:false,failed:false,fallen:null};}
function surfaces(s,l,actor){return [...l.platforms.filter(p=>active(s,p)&&(p.owner===undefined||p.owner===actor)),...(l.lifts||[]).map((f,i)=>({...f,y:s.lifts[i],h:12})),...mechanics.moving(s,l).filter(p=>active(s,p)),...mechanics.balanced(s,l),...(hooks.platforms?.(s,l)||[])];}
function block(o,prev,s,l){constrainGates(o,prev,l.gates,i=>open(s,l,i),l.world?{...C,width:l.world.width}:C);}
function vertical(o,prev,s,n,l,dt,actor){
 if(l.gravityFlip&&n.gravity[actor]===-1){mechanics.inverted(o,prev,n,l,dt,surfaces(n,l,actor));return;}
 let carried=false;
 const oldMovers=[...mechanics.moving(s,l),...(hooks.platforms?.(s,l)||[])],newMovers=[...mechanics.moving(n,l),...(hooks.platforms?.(n,l)||[])];
 oldMovers.forEach((f,i)=>{if(active(s,f)&&active(n,f)&&Math.abs(prev.y+height(prev)-f.y)<2&&prev.x+width(prev)>f.x+2&&prev.x<f.x+f.w-2&&o.vy>=0){o.y+=newMovers[i].y-f.y;o.x+=newMovers[i].x-f.x;carried=true;}});
 const oldBalances=mechanics.balanced(s,l),newBalances=mechanics.balanced(n,l);
 oldBalances.forEach((f,i)=>{if(Math.abs(prev.y+height(prev)-f.y)<2&&prev.x+width(prev)>f.x+2&&prev.x<f.x+f.w-2&&o.vy>=0){o.y+=newBalances[i].y-f.y;carried=true;}});
 (l.lifts||[]).forEach((f,i)=>{if(Math.abs(prev.y+height(o)-s.lifts[i])<2&&prev.x+width(o)>f.x+2&&prev.x<f.x+f.w-2&&o.vy>=0){o.y+=n.lifts[i]-s.lifts[i];carried=true;}});
 o.vy+=C.gravity*dt;o.y+=o.vy*dt;o.grounded=false;
 const floor=[...(l.floor??[{x:0,y:400,w:1000}]),...surfaces(n,l,actor)].sort((a,b)=>a.y-b.y);
 for(const f of floor){if(o.vy>=0&&(prev.y+height(prev)<=f.y+2||carried&&o.y+height(o)-f.y<6)&&o.y+height(o)>=f.y&&o.x+width(o)>f.x+2&&o.x<f.x+f.w-2){o.y=f.y-height(o);o.vy=0;o.grounded=true;break;}}
}
function step(s,input,l,dt){
 if(s.won||s.failed)return s;
 const n={...s,players:s.players.map(p=>({...p})),boxes:s.boxes.map(b=>({...b})),lifts:[...s.lifts],switches:[...s.switches],collected:[...s.collected],collectedBy:[...s.collectedBy],latched:[...s.latched],flash:Math.max(0,s.flash-dt)};
 if(l.jumpSwap)input=input.map((a,i)=>({...a,jump:mechanics.canHelp(s,l)&&!!input[1-i]?.jump}));
 input=mechanics.begin(s,n,input,l,dt);
 hooks.begin?.(s,n,input,l,dt);
 const linkedDirections=hooks.boxDirections?.(s,input,l,dt,C,{open,hit});
 if(l.phaseOnJump&&input.some((a,i)=>a?.jump&&s.players[i].grounded&&!s.players[i].exited)){n.mode=1-s.mode;n.flash=.3;}
 (l.lifts||[]).forEach((f,i)=>{const target=f.buttons.some(b=>weighted(s,b))?f.top:f.bottom;n.lifts[i]+=Math.sign(target-s.lifts[i])*Math.min(Math.abs(target-s.lifts[i]),(f.speed||90)*dt);});
 n.boxes.forEach((b,i)=>{
  const prev=s.boxes[i];let dir=0;
  for(let p=0;p<2;p++){const a=s.players[p],axis=input[p]?.axis||0;if(a.exited||!axis||!a.grounded||input[p]?.jump||a.y+height(a)<=prev.y+3||a.y>=prev.y+prev.h-3)continue;
   const contact=axis>0&&a.x+width(a)<=prev.x+2&&a.x+width(a)+axis*C.speed*dt>=prev.x-1||axis<0&&a.x>=prev.x+prev.w-2&&a.x+axis*C.speed*dt<=prev.x+prev.w+1;
   if(!contact)continue;
   const j=1-p,q=s.players[j],gap=axis>0?a.x-q.x-width(q):q.x-a.x-width(a);
   const together=!q.exited&&q.grounded&&!input[j]?.jump&&(input[j]?.axis||0)===axis&&Math.abs(q.y+height(q)-(prev.y+prev.h))<4&&gap>=-2&&gap<=3;
   if(!b.heavy||together)dir=axis;
  }
  dir=linkedDirections?.[i]??dir;
  b.x+=dir*C.speed*dt;
  for(let j=0;j<n.boxes.length;j++)if(j!==i&&hit(b,n.boxes[j]))b.x=prev.x;
  for(const p of s.players)if(!p.exited&&hit(b,p)&&(((dir||b.vx)>0&&p.x>=prev.x+prev.w-2)||((dir||b.vx)<0&&p.x+width(p)<=prev.x+2))){b.x=prev.x;}
  block(b,prev,s,l);vertical(b,prev,s,n,l,dt);
 });
 for(let i=0;i<2;i++){
  const p=n.players[i],old=s.players[i],a=input[i]||{};if(p.exited)continue;
  if(a.jump&&p.grounded){p.vy=-C.jump*(n.gravity[i]||1);p.support=-1;p.onBox=-1;p.grounded=false;}
  p.x+=mechanics.horizontal(p,a,n,l,i,dt);
  if(p.support>=0&&!s.players[p.support].exited)p.x+=(input[p.support]?.axis||0)*C.speed*dt;
  if(p.onBox>=0)p.x+=n.boxes[p.onBox].x-s.boxes[p.onBox].x;
  p.support=-1;p.onBox=-1;
  vertical(p,old,s,n,l,dt,i);
  n.boxes.forEach((b,j)=>{
   if(p.vy>=0&&old.y+height(old)<=s.boxes[j].y+2&&p.y+height(p)>=b.y&&p.x+width(p)>b.x+2&&p.x<b.x+b.w-2){p.y=b.y-height(p);p.vy=0;p.grounded=b.grounded;p.onBox=j;}
   else if(hit(p,b)){if(old.x+width(old)<=s.boxes[j].x+2)p.x=b.x-width(p);else if(old.x>=s.boxes[j].x+b.w-2)p.x=b.x+b.w;}
  });block(p,old,s,l);
 }
 for(let i=0;i<2;i++){
  const p=n.players[i],q=n.players[1-i];if(p.exited||q.exited||n.gravity[i]===-1||n.gravity[1-i]===-1)continue;
  if(p.vy>=q.vy&&s.players[i].y+height(s.players[i])<=s.players[1-i].y+2&&p.y+height(p)>=q.y&&p.x+width(p)>q.x+2&&p.x<q.x+width(q)-2){p.y=q.y-height(p);p.vy=q.vy;p.grounded=q.grounded;p.support=1-i;}
 }
 for(let pass=0;pass<3;pass++){
  const [a,b]=n.players;if(!a.exited&&!b.exited&&hit(a,b)&&Math.min(a.y+height(a),b.y+height(b))-Math.max(a.y,b.y)>3){const left=s.players[0].x<=s.players[1].x?0:1,right=1-left,d=n.players[left].x+width(n.players[left])-n.players[right].x;if(d>0){n.players[left].x-=d/2;n.players[right].x+=d/2;}}
  n.players.forEach((p,i)=>{if(p.exited)return;block(p,s.players[i],s,l);for(const b of n.boxes)if(hit(p,b)){if(s.players[i].x+width(s.players[i])<=b.x+4)p.x=b.x-width(p);else if(s.players[i].x>=b.x+b.w-4)p.x=b.x+b.w;}});
 }
 if(l.tether&&!n.players.some(p=>p.exited)){
  for(let i=0;i<2;i++){const p=n.players[i],q=n.players[1-i];if(Math.abs(p.x-q.x)>l.tether&&Math.abs(p.x-q.x)>Math.abs(s.players[i].x-q.x))p.x=s.players[i].x;}
 }
 (l.switches||[]).forEach((b,i)=>{const down=weighted(n,b);if(down&&!s.switches[i])n.mode=1-n.mode;n.switches[i]=down;});
 hooks.afterMove?.(s,n,l);
 // Recheck after switches, ropes, box pushes and pressure changes this tick.
 // Returning a body can release another pad, so settle the gates together.
 for(let pass=0;pass<=l.gates.length;pass++){
  n.boxes.forEach((b,i)=>block(b,s.boxes[i],n,l));
  hooks.afterGates?.(s,n,l,linkedDirections,C,dt);
  n.players.forEach((p,i)=>{if(!p.exited)block(p,s.players[i],n,l);});
 }
 if(l.fallY!==undefined){const fallen=n.players.findIndex(p=>!p.exited&&(p.y>l.fallY||l.fallTop!==undefined&&p.y+height(p)<l.fallTop));if(fallen>=0){n.failed=true;n.fallen=fallen;return n;}}
 n.players.forEach((p,actor)=>{if(p.exited)return;l.keys.forEach((k,i)=>{if(!n.collected[i]&&(k.owner===undefined||k.owner===actor)&&p.x<k.x+k.r&&p.x+width(p)>k.x-k.r&&p.y<k.y+k.r&&p.y+height(p)>k.y-k.r){n.collected[i]=true;n.collectedBy[i]=actor;}});});
 n.key=n.collected.every(Boolean);
 for(const p of n.players)if(!p.exited&&n.key&&p.x+width(p)/2>l.door.x+14&&p.x+width(p)/2<l.door.x+l.door.w-3&&Math.abs(p.y+height(p)-(l.door.y+l.door.h))<4){p.exited=true;p.support=-1;}
 n.won=n.players.every(p=>p.exited);return n;
}
return {fresh,step,pressed:weighted,gateOpen:open,platformActive:active,canHelp:mechanics.canHelp,isIce:mechanics.icy};
}
if(typeof module!=='undefined')module.exports=create;else root.TogetherPhysics=create;
})(globalThis);
