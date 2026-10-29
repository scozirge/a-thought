(function(root){
'use strict';
function create(C){
 const w=p=>p.w??C.w,h=p=>p.h??C.h;
 function fresh(l){return {gravity:[1,1],clock:0,balances:(l.balances||[]).map(b=>[...b.initial])};}
 function icy(p,l){return !!l.ice||(l.iceZones||[]).some(z=>p.x+w(p)/2>=z.x&&p.x+w(p)/2<z.x+z.w&&p.y+h(p)>=z.y&&p.y<z.y+z.h);}
 function canHelp(s,l){return !l.helpRange||Math.hypot(s.players[0].x+w(s.players[0])/2-s.players[1].x-w(s.players[1])/2,s.players[0].y+h(s.players[0])/2-s.players[1].y-h(s.players[1])/2)<=l.helpRange;}
 function moving(s,l){return (l.movers||[]).map(f=>({...f,y:f.y+f.range*Math.cos(s.clock*1.2+f.phase)}));}
 function balanced(s,l){return (l.balances||[]).flatMap((b,i)=>[b.a,b.b].map((p,j)=>({...p,y:s.balances[i][j],h:14})));}
 function begin(s,n,input,l,dt){
  const action=input.map(a=>!!a.special);
  n.gravity=[...s.gravity];n.balances=s.balances.map(b=>[...b]);
  if(l.gravityFlip)input.forEach((a,i)=>{const j=1-i;if(action[i]&&!s.players[j].exited){n.gravity[j]*=-1;Object.assign(n.players[j],{vy:0,grounded:false,support:-1,onBox:-1});n.flash=.3;}});
  n.clock=s.clock+dt;
  (l.balances||[]).forEach((b,i)=>{
   const shift=(value,target)=>value+Math.sign(target-value)*Math.min(Math.abs(target-value),b.speed*dt);
   if(s.collected[b.lockKey]){n.balances[i]=s.balances[i].map(y=>shift(y,b.top));return;}
   const weight=[b.a,b.b].map((f,j)=>s.players.filter((p,k)=>!p.exited&&p.grounded&&!input[k]?.jump&&Math.abs(p.y+h(p)-s.balances[i][j])<3&&p.x+w(p)>f.x+2&&p.x<f.x+f.w-2).length);
   const direction=Math.sign(weight[0]-weight[1]);
   if(direction){n.balances[i][0]=shift(s.balances[i][0],direction>0?b.bottom:b.top);n.balances[i][1]=b.top+b.bottom-n.balances[i][0];}
  });
  return input;
 }
 function inverted(p,old,n,l,dt,platforms){
  p.vy-=C.gravity*dt;p.y+=p.vy*dt;p.grounded=false;
  const surfaces=[...(l.ceilingPieces??[{x:0,y:l.ceiling-12,w:1000,h:12}]),...platforms].sort((a,b)=>b.y-a.y);
  for(const f of surfaces){const bottom=f.y+(f.h||12);if(p.vy<=0&&old.y>=bottom-2&&p.y<=bottom&&p.x+w(p)>f.x+2&&p.x<f.x+f.w-2){p.y=bottom;p.vy=0;p.grounded=true;break;}}
 }
 function horizontal(p,a,n,l,i,dt){
  if(!icy(p,l)){p.vx=0;return (a.axis||0)*C.speed*dt;}
  const vx=p.vx||0,axis=a.axis||0;
  const acceleration=700,friction=30;
  p.vx=axis?Math.max(-240,Math.min(240,vx+axis*acceleration*dt)):Math.sign(vx)*Math.max(0,Math.abs(vx)-friction*dt);
  return p.vx*dt;
 }
 return {fresh,begin,inverted,moving,balanced,horizontal,canHelp,icy};
}
if(typeof module!=='undefined')module.exports=create;else root.TogetherMechanics=create;
})(globalThis);
