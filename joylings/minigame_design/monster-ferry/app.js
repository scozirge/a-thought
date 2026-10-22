(()=>{
 'use strict';const G=Ferry,A=FerryArt,$=id=>document.getElementById(id),key='monster-ferry-v1';
 let state=G.fresh(),done=[],busy=false,token=0,animations=[],timer=null;
 try{const s=JSON.parse(localStorage.getItem(key));if(s?.version===1&&G.valid(s.state)&&Array.isArray(s.done)&&s.done.every(v=>Number.isInteger(v)&&v>=0&&v<5)){state=s.state;done=s.done;}}catch(_){}
 const save=()=>{try{localStorage.setItem(key,JSON.stringify({version:1,state,done}));}catch(_){}};
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const say=(text='',error=false)=>{$('message').textContent=text;$('message').className=error?'error':'';};
 const level=()=>G.levels[state.level];
 function render(){
  const l=level();document.body.dataset.theme=l.theme;$('scene').classList.toggle('crowded',l.ids.length>4);$('level-name').textContent=l.name;
  $('levels').innerHTML=G.levels.map((v,i)=>`<button data-level="${i}" class="${state.level===i?'active':''}" aria-label="第 ${i+1} 關 ${v.name}${done.includes(i)?'，已完成':''}" aria-pressed="${state.level===i}">${i+1}${done.includes(i)?'<span class="done" aria-hidden="true">✓</span>':''}</button>`).join('');
  $('seats').textContent=`座位 ${state.cargo.length} / ${l.seats}`;
  $('weight').hidden=l.limit===null;$('weight').textContent=`重量 ${G.weight(state)} / ${l.limit}`;
  $('weight').classList.toggle('over',l.limit!==null&&G.weight(state)>l.limit);
  for(let side=0;side<2;side++){
   const stone=l.ids.indexOf('stone'),protectedBank=stone>=0&&state.positions[stone]===side&&!state.cargo.includes(stone);
   const guard=$('bank-'+side).querySelector('.guard');
   guard.innerHTML=state.bank===side?`<span class="lamp">${A.lantern}</span>船長在`:protectedBank?'✦ 有保護':'';
   guard.classList.toggle('stone',state.bank!==side&&protectedBank);$('bank-'+side).classList.toggle('protected',protectedBank);
   $('people-'+side).innerHTML=l.ids.map((id,i)=>state.positions[i]===side&&!state.cargo.includes(i)?`<button data-person="${i}" class="resident" ${busy||state.bank!==side||G.won(state)?'disabled':''} aria-label="${G.actors[id].name}${l.limit!==null?'，重量 '+G.actors[id].weight:''}，上船"><span class="portrait">${A.actor(id)}</span><span class="name">${G.actors[id].name}</span>${l.limit!==null?`<span class="mass" aria-hidden="true">${G.actors[id].weight}</span>`:''}</button>`:'').join('');
  }
  $('cargo').innerHTML=Array.from({length:l.seats},(_,slot)=>{
   const i=state.cargo[slot];return i===undefined?'<span class="seat empty" aria-hidden="true">·</span>':`<button class="seat" data-cargo="${i}" aria-label="${G.actors[l.ids[i]].name}，下船" ${busy?'disabled':''}>${A.actor(l.ids[i])}</button>`;
  }).join('');
  $('boat').style.left=state.bank===0?'35%':'65%';
  $('sail').textContent=G.won(state)?'完成 ✓':state.bank===0?(state.cargo.length?'出發 →':'空船 →'):(state.cargo.length?'← 回去':'← 空船');
  $('sail').disabled=busy||G.won(state);$('undo').disabled=busy||!state.history.length;
  $('instruction').textContent=G.won(state)?'大家都平安到啦！':'點角色上船，再按出發';
  $('relations').innerHTML=l.edges.map(([a,b,verb])=>`<div class="relation" aria-label="${G.actors[a].name}會${verb}${G.actors[b].name}"><span class="mini">${A.actor(a)}</span><span class="relation-middle">${verb}<b>→</b></span><span class="mini">${A.actor(b)}</span></div>`).join('');
  $('stone-rule').hidden=!l.ids.includes('stone');$('stone-rule').innerHTML=`<span class="mini">${A.actor('stone')}</span><span>守護石在岸上，大家都安全</span>`;
 }
 function stop(){token++;clearTimeout(timer);timer=null;animations.forEach(a=>a.cancel());animations=[];busy=false;$('boat').classList.remove('sailing','bump');$('splash').classList.remove('show');}
 function newLevel(index){stop();state=G.fresh(index);$('modal').close();say();save();$('boat').style.transition='none';render();void $('boat').offsetWidth;$('boat').style.transition='';}
 function complete(){
  if(!done.includes(state.level))done.push(state.level);save();render();
  $('celebration').innerHTML=level().ids.map(id=>`<span>${A.actor(id)}</span>`).join('');
  $('next').textContent=state.level<4?'下一關 →':'再玩一次';
  $('modal').showModal();
 }
 function board(index,element){
  if(busy)return;const r=G.load(state,index);if(r.error){say(r.error,true);return;}
  const rect=element.getBoundingClientRect(),wasLoaded=state.cargo.includes(index);
  state=r.state;save();busy=true;say();render();
  const target=document.querySelector(wasLoaded?`[data-person="${index}"] .portrait`:`[data-cargo="${index}"]`),end=target.getBoundingClientRect();
  const duration=reduced()?0:240;
  animations=[target.animate([{transform:`translate(${rect.left-end.left}px,${rect.top-end.top}px) scale(1.1)`,opacity:.7},{transform:'translate(0,0) scale(1)',opacity:1}],{duration,easing:'ease-out'})];
  const current=++token;timer=setTimeout(()=>{if(current!==token)return;busy=false;animations=[];render();},duration);
 }
 function sail(){
  if(busy)return;const r=G.cross(state);
  if(r.error){
   say(r.error,true);$('boat').classList.remove('bump');void $('boat').offsetWidth;$('boat').classList.add('bump');
   document.querySelectorAll('.trouble').forEach(el=>el.classList.remove('trouble'));
   if(r.conflict)for(const id of [r.conflict.a,r.conflict.b])document.querySelector(`[data-person="${level().ids.indexOf(id)}"]`)?.classList.add('trouble');
   return;
  }
  busy=true;say();render();const current=++token,duration=reduced()?0:1100;
  $('boat').classList.add('sailing');$('boat').style.left=r.state.bank===0?'35%':'65%';
  timer=setTimeout(()=>{
   if(current!==token)return;state=r.state;busy=false;$('boat').classList.remove('sailing');save();render();
   $('splash').style.left=state.bank===0?'29%':'59%';$('splash').classList.remove('show');void $('splash').offsetWidth;$('splash').classList.add('show');
   if(G.won(state))complete();
  },duration);
 }
 $('scene').addEventListener('click',e=>{
  const b=e.target.closest('[data-person],[data-cargo]');if(b)board(Number(b.dataset.person??b.dataset.cargo),b);
 });
 $('sail').addEventListener('click',sail);
 $('undo').addEventListener('click',()=>{if(busy)return;const r=G.undo(state);if(r.error)return;state=r.state;say();save();$('boat').style.transition='none';render();void $('boat').offsetWidth;$('boat').style.transition='';});
 $('reset').addEventListener('click',()=>newLevel(state.level));
 $('levels').addEventListener('click',e=>{const b=e.target.closest('[data-level]');if(b)newLevel(Number(b.dataset.level));});
 $('stay').addEventListener('click',()=>$('modal').close());
 $('next').addEventListener('click',()=>newLevel(state.level<4?state.level+1:0));
 $('captain').innerHTML=A.actor('captain');$('hull').innerHTML=A.boat;
 if(G.won(state)&&!done.includes(state.level))done.push(state.level);
 render();save();
})();
