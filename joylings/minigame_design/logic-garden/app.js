(()=>{
 'use strict';
 const G=Garden,A=GardenArt,$=id=>document.getElementById(id),key='logic-garden-v1';
 const randomOdd=n=>{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%n+1;};
 const freshScale=level=>G.scale(level,randomOdd(G.counts[level]));
 let data={version:1,scale:freshScale(0),frogs:G.frogs(0),done:{scale:[],frogs:[]}};
 try{
  const saved=JSON.parse(localStorage.getItem(key));
  if(saved?.version===1&&G.validScale(saved.scale)&&G.validFrogs(saved.frogs)&&['scale','frogs'].every(g=>Array.isArray(saved.done?.[g])&&saved.done[g].every(n=>Number.isInteger(n)&&n>=0&&n<=2)))data=saved;
 }catch(_){}
 let game=new URLSearchParams(location.search).get('game')==='frogs'?'frogs':'scale',selected=null,guessing=false,dragged=null,busy=false,animation=null,timer=null;
 const save=()=>{try{localStorage.setItem(key,JSON.stringify(data));}catch(_){}};
 const gem=(id)=>`<button class="gem ${selected===id?'selected':''}" data-gem="${id}" aria-label="寶石 ${id}" aria-pressed="${selected===id}" draggable="${!guessing&&!data.scale.won}" ${data.scale.won?'disabled':''}>${A.gem}<span>${id}</span></button>`;
 const message=(type,text='',error=false)=>{$(type+'-message').textContent=text;$(type+'-message').className='message'+(error?' error':'');};
 function finishMotion(){clearTimeout(timer);animation?.cancel();animation=null;busy=false;}
 function render(){
  document.body.dataset.game=game;
  document.querySelectorAll('[data-game]').forEach(b=>{b.classList.toggle('active',b.dataset.game===game);b.setAttribute('aria-pressed',String(b.dataset.game===game));});
  $('scale-game').hidden=game!=='scale';$('frogs-game').hidden=game!=='frogs';
  $('title').textContent=game==='scale'?'找出比較重的寶石':'讓青蛙交換位置';
  $('eyebrow').textContent=game==='scale'?'寶石鑑定室':'荷葉小池塘';
  $('levels').innerHTML=(game==='scale'?G.counts:G.sizes).map((n,i)=>`<button data-level="${i}" class="${data[game].level===i?'active':''}" aria-pressed="${data[game].level===i}">${game==='scale'?n+' 顆寶石':'每邊 '+n+' 隻'}${data.done[game].includes(i)?'<span class="check" aria-label="已完成">✓</span>':''}</button>`).join('');
  if(game==='scale')renderScale();else renderFrogs();
 }
 function renderScale(){
  const s=data.scale;
  for(const [side,id] of [[-1,'left-gems'],[0,'rack-gems'],[1,'right-gems']])$(id).innerHTML=s.sides.map((v,i)=>v===side?gem(i+1):'').join('');
  $('scale-game').classList.toggle('guessing',guessing);
  $('scale-instruction').textContent=s.won?'找到比較重的寶石了！':guessing?'點出你覺得比較重的寶石':'點寶石，再點天平';
  $('guess').textContent=s.won?'再玩一次':guessing?'取消':'找到了';
  $('guess').classList.toggle('active',guessing);
  $('weigh').disabled=s.won;$('clear').disabled=s.won||s.sides.every(v=>v===0);
  $('comparison').textContent=s.result===null?'?':s.result===0?'＝':s.result===1?'＞':'＜';
  $('comparison').classList.toggle('has-result',s.result!==null);
  $('comparison').setAttribute('aria-label',s.result===null?'還沒秤重':s.result===0?'一樣重':s.result===1?'左邊比較重':'右邊比較重');
  const tilt=s.result===null?0:s.result;
  $('beam').style.transform=`rotate(${-tilt*7}deg)`;
  const shift=$('balance-art').getBoundingClientRect().height/240*30;
  document.querySelector('.pan.left').style.transform=`translateY(${tilt*shift}px)`;
  document.querySelector('.pan.right').style.transform=`translateY(${-tilt*shift}px)`;
  document.querySelectorAll('[data-drop]').forEach(el=>el.classList.toggle('drop-ready',selected!==null&&!guessing));
  $('weigh-log').innerHTML=s.log.length?s.log.map((l,i)=>`<div class="log-row"><div class="log-side">${l.left.map(n=>`<span class="chip">${n}</span>`).join('')}</div><strong>${l.result===0?'＝':l.result===1?'＞':'＜'}</strong><div class="log-side">${l.right.map(n=>`<span class="chip">${n}</span>`).join('')}</div><small>${l.result===0?'一樣重':l.result===1?'左邊比較重':'右邊比較重'}</small></div>`).join(''):'<div class="log-empty"><span class="symbol">⚖</span>秤過就會留下線索</div>';
 }
 function renderFrogs(){
  const s=data.frogs,won=G.solved(s);
  $('frog-board').style.setProperty('--pads',s.board.length);
  $('frog-board').innerHTML=s.board.map((v,i)=>`<button class="pad ${v===0?'empty':''}" data-pad="${i}" aria-label="${v===1?'皇冠青蛙，向右':v===-1?'花朵青蛙，向左':'空荷葉'}，第 ${i+1} 格" ${v===0||busy||won?'disabled':''}>${v?`<span class="frog">${A.frog(v)}</span><span class="direction" aria-hidden="true">${v===1?'→':'←'}</span>`:'<span class="empty-dot" aria-hidden="true">·</span>'}</button>`).join('');
  $('undo').disabled=!s.history.length||busy;
  $('undo').classList.toggle('attention',!won&&G.moves(s).length===0);
  message('frog',won?'兩隊都到家了！':G.moves(s).length===0?'卡住了，退一步試試':'');
 }
 function changeGame(next,update=true){
  finishMotion();selected=null;guessing=false;dragged=null;$('modal').close();game=next;
  if(update){const url=new URL(location.href);url.searchParams.set('game',game);history.replaceState({},'',url);}
  message('scale');render();
 }
 function changeLevel(level){
  finishMotion();selected=null;guessing=false;dragged=null;
  data[game]=game==='scale'?freshScale(level):G.frogs(level);$('modal').close();save();message('scale');render();
 }
 function complete(){
  const level=data[game].level;if(!data.done[game].includes(level))data.done[game].push(level);
  save();render();
  $('modal-art').innerHTML=game==='scale'?A.gem:A.frog(1);
  $('modal-title').textContent=game==='scale'?'找到比較重的寶石了！':'大家換好位置了！';
  $('modal-text').textContent=game==='scale'?`${data.scale.odd} 號寶石 · 秤了 ${data.scale.log.length} 次`:'兩隊都到對面了';
  $('modal-next').textContent=level<2?'下一關 →':'換個遊戲 →';
  $('modal').showModal();
 }
 function selectGem(id){
  if(data.scale.won)return;
  if(guessing){
   if(id===data.scale.odd){data.scale.won=true;guessing=false;selected=null;complete();}
   else{guessing=false;selected=null;renderScale();message('scale','還不是這顆，再秤看看',true);}
   return;
  }
  selected=selected===id?null:id;message('scale');renderScale();
 }
 function place(side,id=selected){
  if(guessing||data.scale.won)return;
  if(id===null){message('scale','先選一顆寶石',true);return;}
  const r=G.place(data.scale,id,side);if(r.error){message('scale',r.error,true);return;}
  data.scale=r.state;selected=null;dragged=null;save();message('scale');renderScale();
 }
 $('scale-game').addEventListener('click',e=>{
  const g=e.target.closest('[data-gem]');if(g){selectGem(Number(g.dataset.gem));return;}
  const target=e.target.closest('[data-drop]');if(target)place(Number(target.dataset.drop));
 });
 $('scale-game').addEventListener('dragstart',e=>{
  const g=e.target.closest('[data-gem]');if(!g||guessing||data.scale.won){e.preventDefault();return;}
  dragged=Number(g.dataset.gem);selected=dragged;
  e.dataTransfer.setData('text/plain',String(dragged));e.dataTransfer.effectAllowed='move';
  g.classList.add('selected');document.querySelectorAll('[data-drop]').forEach(el=>el.classList.add('drop-ready'));
 });
 $('scale-game').addEventListener('dragover',e=>{const p=e.target.closest('[data-drop]');if(p&&dragged!==null){e.preventDefault();e.dataTransfer.dropEffect='move';p.classList.add('drop-hover');}});
 $('scale-game').addEventListener('dragleave',e=>{e.target.closest('[data-drop]')?.classList.remove('drop-hover');});
 $('scale-game').addEventListener('drop',e=>{e.preventDefault();const p=e.target.closest('[data-drop]');if(p&&dragged!==null)place(Number(p.dataset.drop),dragged);document.querySelectorAll('.drop-hover').forEach(el=>el.classList.remove('drop-hover'));});
 document.addEventListener('dragend',()=>{dragged=null;document.querySelectorAll('.drop-hover').forEach(el=>el.classList.remove('drop-hover'));if(game==='scale')renderScale();});
 $('weigh').addEventListener('click',()=>{
  const r=G.weigh(data.scale);if(r.error){message('scale',r.error,true);return;}
  data.scale=r.state;selected=null;guessing=false;save();renderScale();
  const row=$('weigh-log').lastElementChild;row?.classList.add('new');$('weigh-log').scrollTop=$('weigh-log').scrollHeight;
  message('scale',r.state.result===0?'一樣重':r.state.result===1?'左邊比較重':'右邊比較重');
 });
 $('clear').addEventListener('click',()=>{data.scale.sides.fill(0);data.scale.result=null;selected=null;guessing=false;save();message('scale');renderScale();});
 $('guess').addEventListener('click',()=>{
  if(data.scale.won){changeLevel(data.scale.level);return;}
  guessing=!guessing;selected=null;message('scale');renderScale();
 });
 function cancel(){selected=null;guessing=false;dragged=null;message('scale');if(game==='scale')renderScale();}
 document.addEventListener('contextmenu',e=>{if(game==='scale'&&(selected!==null||guessing)){e.preventDefault();cancel();}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('modal').open)cancel();});
 $('frog-board').addEventListener('click',e=>{
  const pad=e.target.closest('[data-pad]');if(!pad||busy)return;
  const from=Number(pad.dataset.pad),r=G.jump(data.frogs,from);
  if(r.error){message('frog',G.moves(data.frogs).length===0?'卡住了，退一步試試':r.error,true);return;}
  const origin=pad.getBoundingClientRect();data.frogs=r.state;save();busy=true;renderFrogs();
  const target=document.querySelector(`[data-pad="${r.to}"]`),end=target.getBoundingClientRect(),dx=origin.left-end.left;
  const duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:340;
  animation=target.querySelector('.frog').animate([{transform:`translate(${dx}px,0)`},{transform:`translate(${dx/2}px,-45px)`},{transform:'translate(0,0)'}],{duration,easing:'ease-in-out'});
  timer=setTimeout(()=>{busy=false;animation=null;renderFrogs();if(G.solved(data.frogs))complete();},duration);
 });
 function showDestination(e){
  document.querySelectorAll('.destination').forEach(el=>el.classList.remove('destination'));
  const pad=e.target.closest('[data-pad]');if(!pad||busy)return;
  const to=G.destination(data.frogs.board,Number(pad.dataset.pad));
  if(to>=0)document.querySelector(`[data-pad="${to}"]`)?.classList.add('destination');
 }
 $('frog-board').addEventListener('pointerover',showDestination);$('frog-board').addEventListener('focusin',showDestination);
 $('frog-board').addEventListener('pointerleave',()=>document.querySelectorAll('.destination').forEach(el=>el.classList.remove('destination')));
 $('undo').addEventListener('click',()=>{if(busy)return;const r=G.undo(data.frogs);if(r.error)return;data.frogs=r.state;save();renderFrogs();});
 $('frog-reset').addEventListener('click',()=>{finishMotion();data.frogs=G.frogs(data.frogs.level);save();renderFrogs();});
 $('levels').addEventListener('click',e=>{const b=e.target.closest('[data-level]');if(b)changeLevel(Number(b.dataset.level));});
 document.querySelectorAll('[data-game]').forEach(b=>b.addEventListener('click',()=>changeGame(b.dataset.game)));
 $('modal-close').addEventListener('click',()=>$('modal').close());
 $('modal-next').addEventListener('click',()=>{if(data[game].level<2)changeLevel(data[game].level+1);else changeGame(game==='scale'?'frogs':'scale');});
 $('balance-art').innerHTML=A.balance;document.querySelectorAll('.blossom').forEach(el=>el.innerHTML=A.lotus);
 if(G.solved(data.frogs)&&!data.done.frogs.includes(data.frogs.level))data.done.frogs.push(data.frogs.level);
 render();save();
})();
