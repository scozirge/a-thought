(() => {
  'use strict';
  const G=Supply,A=Art,$=id=>document.getElementById(id),key='robot-supply-simple-v2';
  const symbols={'+':'＋','-':'−','*':'×','/':'÷','>':'＞','<':'＜','=':'＝'};
  let current=0,drafts=G.levels.map((_,i)=>G.slotsFor(i).map(()=>null)),completed=[];
  let held=null,selected=null,timer=null,token=0,caseIndex=0,results=[],state={};
  try{
    const saved=JSON.parse(localStorage.getItem(key));
    if(saved){
      drafts=drafts.map((empty,i)=>G.validCards(i,saved.drafts?.[i])?saved.drafts[i]:empty);
      if(Number.isInteger(saved.current)&&saved.current>=0&&saved.current<3)current=saved.current;
    }
    const old=saved||JSON.parse(localStorage.getItem('robot-supply-v1'));
    completed=Array.isArray(old?.completed)?old.completed.filter(id=>G.levels.some(l=>l.id===id)):[];
  }catch(_){}
  const level=()=>G.levels[current],cards=()=>G.cardsFor(current),choices=()=>drafts[current];
  const save=()=>{try{localStorage.setItem(key,JSON.stringify({current,drafts,completed}));}catch(_){}};
  function stop(){clearTimeout(timer);token++;}
  function cardFace(card){
    if(card.kind==='math')return `<span class="math-symbol">${symbols[card.op]}</span>`;
    if(card.kind==='condition')return `${A.icon('bolt')}<span>電量</span><b>${symbols[card.op]} ${card.target}</b>`;
    return `${A.icon(card.icon)}<span>${card.label}</span>`;
  }
  function slot(i){
    const card=cards().find(c=>c.id===choices()[i]),kind=G.slotsFor(current)[i];
    return `<button class="slot ${kind} ${card?'filled':''}" data-slot="${i}" data-kind="${kind}" aria-label="${i===0?(current===0?'放計算方塊':'放條件方塊'):i===1?'放如果的行動':'放否則的行動'}">${card?cardFace(card):'<span class="empty-label">放這裡</span>'}</button>`;
  }
  function renderBoard(){
    if(current===0){
      $('board').innerHTML=`<div class="sum-line"><div class="fixed-battery blue">${A.icon('blue')}<span>藍電池</span></div>${slot(0)}<div class="fixed-battery yellow">${A.icon('yellow')}<span>黃電池</span></div></div><div class="down-arrow">↓</div><div class="end-point">${A.icon('bolt')}裝進機器人</div>`;
    }else{
      $('board').innerHTML=`<div class="condition-row"><strong>如果</strong>${slot(0)}</div><div class="fork" aria-hidden="true"></div><div class="branches"><div class="branch" data-branch="yes"><span class="branch-label">是 ↓</span>${slot(1)}</div><div class="branch" data-branch="no"><span class="branch-label">否則 ↓</span>${slot(2)}</div></div>`;
    }
    const groups=current===0?['math']:['condition','action'];
    $('palette').innerHTML=groups.map(kind=>`<div class="card-row">${cards().filter(c=>c.kind===kind).map(c=>`<button class="card ${kind}" draggable="true" data-card="${c.id}" data-kind="${kind}" aria-label="${c.kind==='math'?symbols[c.op]:c.kind==='condition'?'電量 '+symbols[c.op]+' '+c.target:c.label}">${cardFace(c)}</button>`).join('')}</div>`).join('');
    paintSelection();
    $('play').disabled=!G.compileCards(current,choices());
    $('play').innerHTML=A.icon('play')+'再跑一次';
    $('reset').disabled=choices().every(c=>c===null);
  }
  function paintSelection(){
    document.querySelectorAll('[data-card]').forEach(el=>{
      el.classList.toggle('chosen',el.dataset.card===held);
      el.setAttribute('aria-pressed',String(el.dataset.card===held));
    });
    const kind=cards().find(c=>c.id===held)?.kind;
    document.querySelectorAll('[data-slot]').forEach(el=>{
      el.classList.toggle('ready',el.dataset.kind===kind);
      el.classList.toggle('selected',Number(el.dataset.slot)===selected);
    });
  }
  function renderLevels(){
    $('levels').innerHTML=G.levels.map((l,i)=>`<button data-level="${i}" ${current===i?'aria-current="step"':''}><span>${i+1}</span>${l.name}${completed.includes(l.id)?'<span class="level-check">✓</span>':''}</button>`).join('');
  }
  function paintWorld(happy=false){
    $('robot').innerHTML=A.robot(happy);
    $('robot').className='robot '+(state.zone?'sent-'+state.zone:'');
    $('energy').textContent=state.energy;
    $('cases').innerHTML=level().cases.map((c,i)=>`<div class="case ${i===caseIndex?'current':''} ${results[i]===true?'passed':results[i]===false?'failed':''}"><span>${results[i]===true?'✓':results[i]===false?'!':i+1}</span><b>${current===0?`${c.blue}＋${c.yellow}`:`${A.icon('bolt')}${c.energy}`}</b></div>`).join('');
    $('battery-inputs').innerHTML=current===0?`<span class="blue">${A.icon('blue')}<b>${state.blue}</b></span><span class="yellow">${A.icon('yellow')}<b>${state.yellow}</b></span>`:'';
    $('destinations').innerHTML=current===1?`<span class="${state.zone==='mail'?'arrived':''}">${A.icon('mail')}送信</span><span class="${state.zone==='cargo'?'arrived':''}">${A.icon('cargo')}搬貨</span>`:'';
  }
  function resetWorld(){
    caseIndex=0;results=[];state={...level().cases[0],zone:null};paintWorld();
    $('readout').textContent='';$('readout').className='readout';$('success').hidden=true;
    document.querySelectorAll('.active,.branch-lit').forEach(el=>el.classList.remove('active','branch-lit'));
  }
  function place(i,id){
    const card=cards().find(c=>c.id===id);
    if(!card||card.kind!==G.slotsFor(current)[i])return;
    stop();choices()[i]=id;held=null;selected=null;save();resetWorld();renderBoard();
    // Completing the route starts it automatically, without another Run click.
    if(G.compileCards(current,choices()))timer=setTimeout(run,450);
  }
  function choose(id){
    const card=cards().find(c=>c.id===id);
    if(selected!==null&&G.slotsFor(current)[selected]===card.kind){place(selected,id);return;}
    const empty=G.slotsFor(current).findIndex((kind,i)=>kind===card.kind&&choices()[i]===null);
    if(empty!==-1){place(empty,id);return;}
    const targets=G.slotsFor(current).map((kind,i)=>kind===card.kind?i:-1).filter(i=>i!==-1);
    if(targets.length===1){place(targets[0],id);return;}
    held=held===id?null:id;selected=null;paintSelection();
  }
  function mark(path,branch){
    document.querySelectorAll('.active').forEach(el=>el.classList.remove('active'));
    const i=current===0?0:path.includes('.yes')?1:path.includes('.no')?2:0;
    document.querySelector(`[data-slot="${i}"]`)?.classList.add('active');
    if(branch)document.querySelectorAll('[data-branch]').forEach(el=>el.classList.toggle('branch-lit',el.dataset.branch===branch));
  }
  function run(){
    const program=G.compileCards(current,choices());if(!program)return;
    stop();held=null;selected=null;paintSelection();resetWorld();
    const runToken=token,events=[];
    for(let i=0;i<level().cases.length;i++){
      const input=level().cases[i],result=G.trace(program,level(),input);
      events.push({kind:'start',i,state:{...input,zone:null},text:''});
      for(const event of result.events)events.push({...event,kind:'event',i});
      const shortErrors={'加入的電不能小於 0':current===2?'電量已經超過 8 了':'電量不能小於 0','放掉的電不能小於 0':'電量還不到 8','電量要是整數':'要剛好一整格'};
      events.push({...result,kind:'result',i,text:result.ok?'完成！':shortErrors[result.error]||result.error});
      if(!result.ok)break;
    }
    let step=0;
    function tick(){
      if(runToken!==token)return;
      const event=events[step++];caseIndex=event.i;state=event.state;
      if(event.kind==='start')document.querySelectorAll('.branch-lit,.active').forEach(el=>el.classList.remove('branch-lit','active'));
      else mark(event.path||'',event.branch);
      $('readout').textContent=event.branch?'':event.text;
      $('readout').className='readout '+(event.kind==='result'?(event.ok?'good':'error'):'');
      if(event.kind==='result')results[event.i]=event.ok;
      paintWorld(event.kind==='result'&&event.ok);
      if(step<events.length){timer=setTimeout(tick,event.kind==='result'?700:500);return;}
      if(results.length===3&&results.every(Boolean)){
        if(!completed.includes(level().id))completed.push(level().id);
        save();renderLevels();$('success').hidden=false;
      }
    }
    tick();
  }
  function start(index){
    stop();current=index;held=null;selected=null;
    $('task').textContent=level().task;$('next').textContent=current===2?'再玩一次':'下一關 →';
    renderLevels();renderBoard();resetWorld();save();
  }
  $('palette').addEventListener('click',e=>{const c=e.target.closest('[data-card]');if(c)choose(c.dataset.card);});
  $('board').addEventListener('click',e=>{
    const target=e.target.closest('[data-slot]');if(!target)return;
    const i=Number(target.dataset.slot);
    if(held){place(i,held);return;}
    selected=selected===i?null:i;paintSelection();
  });
  $('palette').addEventListener('dragstart',e=>{
    const c=e.target.closest('[data-card]');if(!c)return;
    held=c.dataset.card;selected=null;e.dataTransfer.setData('text/plain',held);e.dataTransfer.effectAllowed='copy';paintSelection();
  });
  $('board').addEventListener('dragover',e=>{
    const s=e.target.closest('[data-slot]');
    if(s&&cards().find(c=>c.id===held)?.kind===s.dataset.kind){e.preventDefault();e.dataTransfer.dropEffect='copy';s.classList.add('hover');}
  });
  $('board').addEventListener('dragleave',e=>e.target.closest('[data-slot]')?.classList.remove('hover'));
  $('board').addEventListener('drop',e=>{
    e.preventDefault();const s=e.target.closest('[data-slot]');
    if(s)place(Number(s.dataset.slot),held);
    document.querySelectorAll('.hover').forEach(el=>el.classList.remove('hover'));
  });
  document.addEventListener('dragend',()=>{held=null;paintSelection();document.querySelectorAll('.hover').forEach(el=>el.classList.remove('hover'));});
  function cancel(){held=null;selected=null;paintSelection();}
  document.addEventListener('keydown',e=>{if(e.key==='Escape')cancel();});
  document.addEventListener('contextmenu',e=>{if(held||selected!==null){e.preventDefault();cancel();}});
  $('reset').addEventListener('click',()=>{drafts[current]=G.slotsFor(current).map(()=>null);start(current);});
  $('play').addEventListener('click',run);
  $('next').addEventListener('click',()=>start(current===2?0:current+1));
  $('levels').addEventListener('click',e=>{const b=e.target.closest('[data-level]');if(b)start(Number(b.dataset.level));});
  $('brand-icon').innerHTML=A.icon('bolt');$('reset').innerHTML=A.icon('reset')+'重來';
  start(current);
})();
