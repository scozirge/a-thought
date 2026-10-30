'use strict';
(()=>{
 const el=id=>document.getElementById(id),roomDialog=el('room-dialog'),answer=el('answer-dialog'),progressKey='together-home-curated-v4';
 let view=null,actor=0,configured=false,epoch=-1,lastConnected=false,leaving=false,listKey='',levelList='',saved='',lastMask=-1,stickPointer=null,stickAxis=0,screenLock=null;
 const held=new Set(),touch=new Map(),keyBits={KeyA:1,KeyD:2,KeyW:4,KeyS:8,ArrowLeft:16,ArrowRight:32,ArrowUp:64,ArrowDown:128};
 const send=(method,value)=>window.unityInstance?.SendMessage('TogetherHome',method,typeof value==='string'?value:JSON.stringify(value));
 const room=request=>send('RoomCommand',request),action=type=>send('GameAction',type);
 function emit(){let mask=0;for(const key of held)mask|=keyBits[key]||0;for(const bit of touch.values())mask|=bit<<(actor*4);if(stickAxis)mask|=(stickAxis>0?2:1)<<(actor*4);if(mask!==lastMask){lastMask=mask;send('InputState',{mask});}}
 function clear(){held.clear();touch.clear();stickAxis=0;stickPointer=null;el('knob').style.transform='';lastMask=-1;emit();el('jump').classList.remove('pressed');el('flip').classList.remove('pressed');}
 function availability(){clear();send('Availability',String(!document.hidden&&!roomDialog.open&&!answer.open));}
 function modalOpen(dialog){clear();dialog.showModal();availability();}
 function canInput(){return !!view&&view.phase==='game'&&!view.demo&&!view.waiting&&!view.state.won&&!view.state.failed&&!roomDialog.open&&!answer.open;}
 window.configureTogether=()=>{
  if(configured||!window.unityInstance||!window.togetherEngineReady)return;configured=true;
  const query=new URLSearchParams(location.search);let completed=[];try{const data=JSON.parse(localStorage.getItem(progressKey)||'[]');if(Array.isArray(data))completed=data;}catch{}
  const requested=query.has('level')?Number(query.get('level')):-1;
  send('Configure',{tips:query.get('tip')==='true',level:Number.isInteger(requested)&&requested>=0&&requested<=20?requested:-1,completed});
  const code=query.get('room');if(code&&/^\d{6}$/.test(code)){el('room-code').value=code;modalOpen(roomDialog);room({type:'browse'});}
 };
 document.addEventListener('keydown',e=>{if(e.target.closest('input,select,textarea'))return;if(keyBits[e.code]){e.preventDefault();if(canInput()){held.add(e.code);emit();}}else if(e.code==='Escape'&&view?.phase==='intro')action('skip');});
 document.addEventListener('keyup',e=>{if(keyBits[e.code]){held.delete(e.code);emit();}});
 window.addEventListener('blur',()=>{clear();send('Availability','false');});window.addEventListener('focus',availability);document.addEventListener('visibilitychange',availability);
 const stick=el('stick');
 function moveStick(e){if(e.pointerId!==stickPointer)return;const r=stick.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,limit=r.width*.32,d=Math.hypot(x,y),scale=d>limit?limit/d:1;el('knob').style.transform=`translate(${x*scale}px,${y*scale}px)`;stickAxis=Math.abs(x)>r.width*.12?Math.sign(x):0;emit();}
 stick.addEventListener('pointerdown',e=>{if(!canInput()||stickPointer!==null)return;e.preventDefault();stickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);moveStick(e);});stick.addEventListener('pointermove',moveStick);
 function releaseStick(e){if(e.pointerId!==stickPointer)return;stickPointer=null;stickAxis=0;el('knob').style.transform='';emit();}
 for(const event of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(event,releaseStick);
 for(const button of [el('jump'),el('flip')]){
  button.addEventListener('pointerdown',e=>{if(!canInput())return;e.preventDefault();button.setPointerCapture(e.pointerId);touch.set(e.pointerId,+button.dataset.bit);button.classList.add('pressed');emit();});
  const release=e=>{touch.delete(e.pointerId);button.classList.remove('pressed');emit();};for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,release);
 }
 el('actor').onclick=()=>{if(view?.room.connected)return;clear();actor=1-actor;renderControls();};
 function renderControls(){if(!view)return;const r=view.room;if(r.connected)actor=r.isHost?0:1;el('actor').textContent=actor?'🐶 狗狗':'🐱 貓咪';el('actor').disabled=r.connected;el('jump').textContent=view.jumpSwap?'幫朋友跳':'跳躍';el('flip').hidden=!view.gravityFlip;
  el('owner-keys').textContent=view.state.collectedBy.map((owner,i)=>owner===null?'':`${owner?'狗狗':'貓咪'}拿到第 ${i+1} 把鑰匙`).filter(Boolean).join(' · ');
  el('jump').classList.toggle('pressed',!!(view.mask&(4<<(actor*4))));el('flip').classList.toggle('pressed',!!(view.mask&(8<<(actor*4))));
 }
 for(const [id,type]of [['restart','restart'],['retry','restart'],['next','next'],['demo','demo'],['stop','stop'],['skip','skip']])el(id).onclick=()=>{clear();action(type);};
 el('levels').onchange=()=>{clear();action('level:'+el('levels').value);};
 el('tips').onclick=()=>modalOpen(answer);el('answer-close').onclick=()=>answer.close();answer.addEventListener('close',availability);
 el('room-open').onclick=()=>{modalOpen(roomDialog);if(!view?.room.connected)room({type:'browse'});};el('room-close').onclick=()=>roomDialog.close();roomDialog.addEventListener('close',availability);
 el('create').onclick=()=>connect('create');el('join').onclick=()=>connect('join');el('browse').onclick=()=>room({type:'browse'});
 function connect(type){const name=el('player-name').value.trim(),code=el('room-code').value.trim();if(!name){el('room-error').textContent='請輸入名字。';el('player-name').focus();return;}if(type==='join'&&!/^\d{6}$/.test(code)){el('room-error').textContent='請輸入六位房號。';return;}clear();room({type,name,code});}
 el('leave').onclick=()=>{leaving=true;clear();room({type:'leave'});};
 el('copy').onclick=async()=>{const url=new URL(location.href);url.searchParams.delete('tip');url.searchParams.delete('level');url.searchParams.set('room',view.room.code);try{await navigator.clipboard.writeText(url.href);el('room-status').textContent='已複製，傳給朋友就能加入。';}catch{el('room-status').textContent='房號：'+view.room.code;}};
 el('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{document.body.classList.toggle('fullscreen-fallback');}};
 async function wake(){if(!view?.room.connected||document.hidden||screenLock||!navigator.wakeLock)return;try{screenLock=await navigator.wakeLock.request('screen');screenLock.addEventListener('release',()=>{screenLock=null;});}catch{}}
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)wake();});
 window.renderTogether=s=>{
  view=s;if(s.epoch!==epoch){epoch=s.epoch;clear();}
  const r=s.room,host=!r.connected||r.isHost;
  const options=JSON.stringify([s.levels,s.completed]);if(options!==levelList){levelList=options;el('levels').replaceChildren(...s.levels.map(l=>{const o=document.createElement('option');o.value=l.index;o.textContent=(s.completed.includes(l.saveKey)?'✓ ':'')+(l.index?`第 ${l.index} 關`:'第 0 關 · 暖身')+' · '+l.name;return o;}));}
  el('levels').value=s.state.level;el('levels').disabled=el('restart').disabled=!host;
  el('keys').textContent=`鑰匙 ${s.state.collected.filter(Boolean).length} / ${s.state.collected.length}`;el('home').textContent=`到家 ${s.state.players.filter(p=>p.exited).length} / 2`;
  el('mechanic').textContent=s.gravityFlip?`貓 ${s.state.gravity[0]<0?'↑':'↓'} · 狗 ${s.state.gravity[1]<0?'↑':'↓'}`:s.phaseOnJump?(s.state.mode?'☾ 月亮':'☀ 太陽'):s.jumpSwap?'幫朋友跳':'';
  el('identity').textContent=r.connected?`${r.isHost?'🐱 你是貓咪':'🐶 你是狗狗'} · ${r.code}`:'同機雙人';
  el('teacher').hidden=!s.tips;el('demo').hidden=!host;el('stop').hidden=!host||!s.demo;el('demo').textContent=s.demo?(s.state.won?'↻ 再播一次':s.paused?'▶ 繼續播放':'Ⅱ 暫停'):'▶ 播放解題';el('demo-status').textContent=s.demo?(s.state.won?'示範完成！':s.paused?'已暫停':'示範中'):'從起點示範，不記入通關。';
  el('answer-title').textContent=`第 ${s.state.level} 關 · ${s.name}`;if(answer.dataset.level!==String(s.state.level)){answer.dataset.level=s.state.level;el('answer-steps').replaceChildren(...s.solution.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));}
  el('result').hidden=s.phase!=='game'||!(s.state.won||s.state.failed);el('result-title').textContent=s.state.failed?(s.state.lostCargo?'貨物掉下去了！':`${s.state.fallen?'狗狗':'貓咪'}掉出去了！`):s.demo?'示範完成！':'一起回家了！';el('retry').hidden=!host;el('next').hidden=!host||!s.state.won;el('next').textContent=s.state.level===0?'開始第 1 關':s.state.level===20?'回第 1 關':'下一關';
  el('skip').hidden=!host||s.phase==='game';el('skip').textContent=s.phase==='ending'?'繼續選關':'略過動畫';
  el('waiting').hidden=!s.waiting;el('waiting').textContent=r.connected&&!r.guest?'等朋友加入 · 房號 '+r.code:'已暫停，等朋友回來。';
  el('room-form').hidden=r.connected;el('room-connected').hidden=!r.connected;el('room-error').textContent=r.error;el('create').disabled=el('join').disabled=r.busy;el('browse').disabled=r.busy||r.lobbyBusy;el('leave').disabled=r.busy&&leaving;
  el('code').textContent=r.code;el('room-role').textContent=r.isHost?'你是貓咪，朋友加入後是狗狗。':'你是狗狗，和貓咪一起出發！';el('members').textContent=r.isHost?(r.guest?`貓咪：${r.hostName} · 狗狗：${r.guestName}`:`貓咪：${r.hostName} · 等待狗狗`):`狗狗：${r.guestName}`;
  if(r.busy)el('room-status').textContent='正在連線…';else if(el('room-status').textContent==='正在連線…')el('room-status').textContent='';
  el('list-status').textContent=r.lobbyBusy?'正在找房間…':r.lobbyError||(r.lobbyReady&&!r.rooms.length?'還沒有人開房。':'');
  const listing=JSON.stringify(r.rooms);if(listing!==listKey){listKey=listing;el('room-list').replaceChildren(...r.rooms.map(item=>{const b=document.createElement('button');b.textContent=`${item.name} · ${item.code} · ${item.count}/2`;b.disabled=!item.open;b.onclick=()=>{el('room-code').value=item.code;connect('join');};return b;}));}
  if(r.connected&&!lastConnected){roomDialog.close();availability();wake();}
  if(!r.connected&&lastConnected&&!leaving&&!roomDialog.open)modalOpen(roomDialog);
  if(leaving&&!r.busy&&!r.connected){leaving=false;roomDialog.close();availability();}
  if(!r.connected&&screenLock){screenLock.release().catch(()=>{});screenLock=null;}
  lastConnected=r.connected;renderControls();
  const progress=JSON.stringify(s.completed);if(s.initialized&&progress!==saved){saved=progress;try{localStorage.setItem(progressKey,progress);}catch{}}
 };
})();
