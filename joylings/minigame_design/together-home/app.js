'use strict';
const G=Together,C=G.C,canvas=document.getElementById('game'),ctx=canvas.getContext('2d'),select=document.getElementById('levels');
let state=G.fresh(),last=0,accumulator=0,completed=[];
try{const saved=JSON.parse(localStorage.getItem('together-home-platform-v3')||'[]');if(Array.isArray(saved))completed=[...new Set(saved.filter(i=>Number.isInteger(i)&&i>=0&&i<G.levels.length))];}catch{}
const held=new Set(),touch=[new Set(),new Set()],jumpQueue=[false,false];
const mapping={KeyA:[0,'left'],KeyD:[0,'right'],KeyW:[0,'jump'],ArrowLeft:[1,'left'],ArrowRight:[1,'right'],ArrowUp:[1,'jump']};
function options(){select.innerHTML=G.levels.map((l,i)=>`<option value="${i}">${completed.includes(i)?'✓ ':''}第 ${i+1} 關 · ${l.name}</option>`).join('');select.value=state.level;}
function reset(level=state.level){state=G.fresh(level);clearInput();accumulator=0;last=0;document.getElementById('success').hidden=true;options();canvas.focus({preventScroll:true});draw();}
function clearInput(){held.clear();touch.forEach(s=>s.clear());jumpQueue.fill(false);document.querySelectorAll('.pressed').forEach(b=>b.classList.remove('pressed'));}
function inputs(){return [0,1].map(i=>({axis:Number(active(i,'right'))-Number(active(i,'left')),jump:jumpQueue[i]}));}
function active(i,action){return touch[i].has(action)||Object.entries(mapping).some(([key,a])=>a[0]===i&&a[1]===action&&held.has(key));}
window.addEventListener('keydown',e=>{if(e.target.closest('select,input,textarea'))return;const a=mapping[e.code];if(!a)return;e.preventDefault();if(!held.has(e.code)&&!e.repeat&&a[1]==='jump')jumpQueue[a[0]]=true;held.add(e.code);});
window.addEventListener('keyup',e=>{if(mapping[e.code]&&!e.target.closest('select,input,textarea'))e.preventDefault();held.delete(e.code);});
window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',()=>{clearInput();last=0;accumulator=0;});
for(const b of document.querySelectorAll('[data-action]')){
 const i=+b.closest('[data-player]').dataset.player,action=b.dataset.action;
 b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);touch[i].add(action);if(action==='jump')jumpQueue[i]=true;b.classList.add('pressed');});
 const release=()=>{touch[i].delete(action);b.classList.remove('pressed');};
 b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);
}
select.onchange=()=>reset(+select.value);
document.getElementById('restart').onclick=()=>reset();document.getElementById('again').onclick=()=>reset();
document.getElementById('next').onclick=()=>reset((state.level+1)%G.levels.length);
function rounded(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function character(p,i,ghost=false){
 ctx.save();ctx.translate(p.x,p.y);if(ghost)ctx.globalAlpha=.15;
 const color=i?'#80b4e2':'#eea44c',dark=i?'#396a93':'#a75e2d';
 rounded(1,36,13,9,4,dark);rounded(24,36,13,9,4,dark);
 if(i){rounded(5,-17,10,24,5,color);rounded(23,-17,10,24,5,color);rounded(8,-13,4,14,2,'#ffd6cc');rounded(26,-13,4,14,2,'#ffd6cc');}
 else{ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,10);ctx.lineTo(1,-11);ctx.lineTo(16,4);ctx.moveTo(22,4);ctx.lineTo(37,-11);ctx.lineTo(38,10);ctx.fill();}
 rounded(0,0,38,40,11,color);rounded(5,20,28,16,8,i?'#eaf5fc':'#fff0dc');
 ctx.fillStyle='#34453d';ctx.beginPath();ctx.arc(11,16,2.5,0,7);ctx.arc(27,16,2.5,0,7);ctx.fill();ctx.beginPath();ctx.arc(19,27,2,0,7);ctx.fill();
 ctx.restore();
}
function drawKey(k){ctx.save();ctx.translate(k.x,k.y);ctx.strokeStyle='#9c731b';ctx.lineWidth=12;ctx.beginPath();ctx.arc(-9,0,12,0,Math.PI*2);ctx.moveTo(3,0);ctx.lineTo(29,0);ctx.lineTo(29,9);ctx.moveTo(19,0);ctx.lineTo(19,9);ctx.stroke();ctx.strokeStyle=k.owner===0?'#eea44c':k.owner===1?'#80b4e2':'#f8cf51';ctx.lineWidth=7;ctx.stroke();if(k.owner!==undefined){ctx.font='22px system-ui';ctx.textAlign='center';ctx.fillText(k.owner?'🐰':'🦊',0,-25);}ctx.restore();}
function draw(){
 const l=G.levels[state.level];const top=l.cameraTop??140;if(canvas.height!==480-top)canvas.height=480-top;
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.translate(0,-top);ctx.fillStyle='#eef7e5';ctx.fillRect(0,0,1000,480);
 ctx.fillStyle='#e1edcf';ctx.beginPath();ctx.ellipse(120,410,160,110,0,0,7);ctx.ellipse(790,420,200,120,0,0,7);ctx.fill();
 ctx.fillStyle='#b4cf86';ctx.fillRect(0,400,1000,80);ctx.fillStyle='#87b35d';ctx.fillRect(0,400,1000,9);
 ctx.fillStyle='#9bbc70';for(let x=22;x<1000;x+=78){ctx.beginPath();ctx.moveTo(x,440);ctx.lineTo(x+5,431);ctx.lineTo(x+10,440);ctx.fill();}
 for(const f of l.platforms){
  rounded(f.x+12,f.y+12,8,400-f.y-12,3,'#c3b692');rounded(f.x+f.w-20,f.y+12,8,400-f.y-12,3,'#c3b692');
  rounded(f.x,f.y,f.w,f.h,5,'#b3814d');rounded(f.x,f.y,f.w,5,2,'#e6bd76');
 }
 function button(b,color,down){rounded(b.x-3,b.y-5,b.w+6,8,4,'#71816b');rounded(b.x,b.y-(down?7:13),b.w,down?7:13,5,down?'#a3c96d':color);}
 l.gates.forEach((g,i)=>{
  const open=G.gateOpen(state,i),color=i?'#9275b0':'#528fb2',buttons=g.buttons||(g.button?[g.button]:[]);
  for(const b of buttons){const down=state.level<2?G.pressed(state,g):G.weighted(state,b);ctx.strokeStyle=down?'#73a756':color;ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(b.x+b.w/2,b.y+10);ctx.lineTo(g.x+g.w/2,b.y+10);ctx.stroke();ctx.setLineDash([]);button(b,color,down);}
  if(open){rounded(g.x,g.y,g.w,14,4,'#73a756');}
  else{rounded(g.x,g.y,6,g.h,3,color);rounded(g.x+g.w-6,g.y,6,g.h,3,color);rounded(g.x+g.w/2-2,g.y,4,g.h,2,color);rounded(g.x,g.y,g.w,8,3,color);rounded(g.x,g.y+g.h-8,g.w,8,3,color);rounded(g.x+4,g.y+g.h/2-8,g.w-8,24,4,'#f3cb65');}
  if(g.mode!==undefined){ctx.font='26px system-ui';ctx.textAlign='center';ctx.fillStyle=g.mode?'#725391':'#b48720';ctx.fillText(g.mode?'☾':'☀',g.x+14,g.y+32);}
 });
 (l.lifts||[]).forEach((f,i)=>{
  ctx.strokeStyle='#bbc8b7';ctx.lineWidth=4;for(const x of [f.x+8,f.x+f.w-8]){ctx.beginPath();ctx.moveTo(x,f.top);ctx.lineTo(x,f.bottom);ctx.stroke();}
  for(const b of f.buttons)button(b,'#d3904e',G.weighted(state,b));
  rounded(f.x,state.lifts[i],f.w,14,5,'#d3904e');ctx.font='24px system-ui';ctx.fillStyle='#805729';ctx.textAlign='center';ctx.fillText('↕',f.x+f.w/2,state.lifts[i]+35);
 });
 (l.switches||[]).forEach((b,i)=>{rounded(b.x,b.y-18,b.w,18,5,state.switches[i]?'#e6bd51':'#f7dfa0');ctx.font='26px system-ui';ctx.fillStyle='#ad7939';ctx.textAlign='center';ctx.fillText('★',b.x+b.w/2,b.y-23);});
 (state.boxes||[]).forEach(b=>{rounded(b.x,b.y,b.w,b.h,5,b.heavy?'#956251':'#c58b54');ctx.strokeStyle=b.heavy?'#d5ad8d':'#eac193';ctx.lineWidth=3;ctx.strokeRect(b.x+4,b.y+4,b.w-8,b.h-8);if(b.heavy){ctx.font='20px system-ui';ctx.textAlign='center';ctx.fillStyle='white';ctx.fillText('2人',b.x+b.w/2,b.y+28);}else{ctx.beginPath();ctx.moveTo(b.x+5,b.y+5);ctx.lineTo(b.x+b.w-5,b.y+b.h-5);ctx.moveTo(b.x+b.w-5,b.y+5);ctx.lineTo(b.x+5,b.y+b.h-5);ctx.stroke();}});
 if(l.tether&&!state.players.some(p=>p.exited)){const [a,b]=state.players;ctx.strokeStyle=Math.abs(a.x-b.x)>l.tether-8?'#b55d42':'#bda46c';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(a.x+19,a.y+24);ctx.quadraticCurveTo((a.x+b.x)/2+19,Math.max(a.y,b.y)+55,b.x+19,b.y+24);ctx.stroke();}
 const d=l.door;rounded(d.x-8,d.y-9,d.w+16,d.h+9,18,'#c6b79b');rounded(d.x,d.y,d.w,d.h,13,state.key?'#50744e':'#a9784e');
 if(!state.key){ctx.strokeStyle='#825a38';ctx.lineWidth=3;for(let x=d.x+17;x<d.x+d.w;x+=17){ctx.beginPath();ctx.moveTo(x,d.y+6);ctx.lineTo(x,d.y+d.h);ctx.stroke();}rounded(d.x+23,d.y+35,24,22,5,'#f5d36d');ctx.strokeStyle='#f5d36d';ctx.lineWidth=5;ctx.beginPath();ctx.arc(d.x+35,d.y+35,8,Math.PI,0);ctx.stroke();}
 else{ctx.save();ctx.translate(d.x+20,d.y-318);ctx.fillStyle='#d9f0a8';ctx.beginPath();ctx.moveTo(0,350);ctx.lineTo(22,350);ctx.lineTo(15,343);ctx.lineTo(20,339);ctx.lineTo(36,357);ctx.lineTo(20,375);ctx.lineTo(15,371);ctx.lineTo(22,364);ctx.lineTo(0,364);ctx.fill();ctx.restore();}
 ctx.font=`${Math.max(26,18/(canvas.clientWidth/1000))}px system-ui`;ctx.textAlign='right';ctx.fillStyle='#54774c';ctx.fillText(state.players.filter(p=>p.exited).length+'/2',d.x+d.w-6,d.y-22);
 l.keys.forEach((k,i)=>{if(!state.collected[i])drawKey(k);});
 if(state.level===0&&!state.key){character({x:481,y:356},0,true);character({x:481,y:312},1,true);}
 state.players.forEach((p,i)=>{if(!p.exited)character(p,i);});
 const gatesLeft=state.level<2&&state.latched.some(v=>!v);
 document.getElementById('message').textContent=state.key?(gatesLeft?'踩住按鈕，讓朋友先過門。':'鑰匙齊了，兩人都要到出口。'):l.hint;
 document.getElementById('success').hidden=!state.won;
 document.getElementById('win-title').textContent=state.level===9?'第 10 關也過了！':'一起過關了！';
 document.getElementById('next').textContent=state.level===9?'回第一關':'下一關 →';
 canvas.setAttribute('aria-label',`第${state.level+1}關 ${l.name}。已拿${state.collected.filter(Boolean).length}把鑰匙，共${l.keys.length}把；${state.players.filter(p=>p.exited).length}人到出口。`);
}
function frame(time){
 if(!last)last=time;accumulator+=Math.min((time-last)/1000,.05);last=time;
 while(accumulator>=1/120){const wasWon=state.won;state=G.step(state,inputs());jumpQueue.fill(false);accumulator-=1/120;
  if(!wasWon&&state.won){clearInput();if(!completed.includes(state.level)){completed.push(state.level);try{localStorage.setItem('together-home-platform-v3',JSON.stringify(completed));}catch{}options();}}
 }
 draw();requestAnimationFrame(frame);
}
window.readGame=()=>JSON.parse(JSON.stringify(state));
reset(0);requestAnimationFrame(frame);
