(() => {
  'use strict';
  const G=DiceQuest,A=QuestArt,$=id=>document.getElementById(id),storageKey='dice-quest-v1';
  let state=G.fresh(),selected=null,mergeBase=null,history=[],busy=false,generation=0,timer=null,pending=null,artStage=-1,modalMode='',lastModal='',lastMessage='';
  try{const saved=JSON.parse(localStorage.getItem(storageKey));if(G.valid(saved))state=saved;}catch(_){}
  const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify(state));}catch(_){}};
  function message(text='',error=false){lastMessage=text;$('message').textContent=text;$('message').className=error?'error':'';}
  function render(){
    if(!state.dice.some(d=>d.id===selected))selected=null;
    if(!state.dice.some(d=>d.id===mergeBase))mergeBase=null;
    $('journey').innerHTML=G.monsters.map((m,i)=>`${i?'<span class="dash"></span>':''}<span class="stop ${state.stage===i?'current':''} ${state.stage>i||state.phase==='won'?'done':''}" title="${m.name}">${state.stage>i||state.phase==='won'?'✓':i+1}</span>`).join('');
    $('hero-hp').textContent=`${state.hp} / ${state.maxHp}`;$('hero-bar').style.width=state.hp/state.maxHp*100+'%';
    $('enemy-name').textContent=G.monster(state).name;
    $('enemy-hp').textContent=`${state.enemyHp} / ${G.monster(state).hp}`;$('enemy-bar').style.width=state.enemyHp/G.monster(state).hp*100+'%';
    $('shield-badge').innerHTML=state.shield?`${A.icon('shield')}${state.shield}`:'';
    $('round').textContent=state.round;
    const intent=G.intent(state);
    $('intent').className='intent '+(intent.charge?'charge':'');
    $('intent').innerHTML=intent.charge?`${A.icon('bolt')}<span>蓄力</span><strong>→18</strong>`:`${A.icon('blade')}<span>攻擊</span>${intent.base!==intent.attack?`<small><s>${intent.base}</s></small>`:''}<strong>${intent.attack}</strong>`;
    $('trait').hidden=!G.monster(state).trait;
    $('trait').innerHTML=G.monster(state).trait?`${A.icon(state.stage===1?'armor':'reflect')}<span>${G.monster(state).trait}</span>`:'';
    if(artStage!==state.stage){$('enemy-art').innerHTML=A.monster(G.monster(state).type);artStage=state.stage;}
    const rewardInfo=G.rewards.flat();
    $('relics').innerHTML=state.upgrades.map(id=>{const r=rewardInfo.find(r=>r.id===id);return `<span title="${r.name}：${r.text}" aria-label="${r.name}：${r.text}">${A.icon(r.icon)}</span>`;}).join('');
    $('dice-hint').textContent=mergeBase!==null?'再選一顆，合成大骰子':'選骰子，放進魔法卡';
    $('dice').innerHTML=state.dice.length?state.dice.map(d=>`<button class="die ${d.id===selected?'selected':''} ${d.id===mergeBase?'merge-base':''}" data-die="${d.id}" draggable="${!busy}" aria-label="骰子 ${d.value}" aria-pressed="${d.id===selected}" ${busy||state.phase!=='player'?'disabled':''}>${d.value}</button>`).join(''):'<span class="dice-empty">骰子用完了</span>';
    $('tools').innerHTML=[
      {id:'plus',label:'＋1',desc:'加一點'},{id:'split',label:'÷2',desc:'偶數平分'},{id:'merge',label:'＋',desc:'合併兩顆'}
    ].map(t=>`<button class="tool ${mergeBase!==null&&t.id==='merge'?'active':''}" data-tool="${t.id}" aria-label="${t.desc}" ${busy||state.phase!=='player'||state.tools.includes(t.id)?'disabled':''}><b>${t.label}</b><small>${state.tools.includes(t.id)?'已用':t.desc}</small></button>`).join('');
    $('cards').innerHTML=G.cards.map(c=>{
      const used=state.used.includes(c.id),effect=selected!==null?G.preview(state,c.id,selected):null;
      let effectText=c.effect,extra=c.extra||'';
      if(c.id==='fire'&&state.upgrades.includes('flame'))effectText='傷害 ×2＋2';
      if(c.id==='ice'&&state.upgrades.includes('frost'))extra='敵人攻擊 −5';
      return `<button class="spell ${c.color} ${used?'used':effect?(effect.error?'invalid':'available'):''}" data-card="${c.id}" aria-label="${c.name}，${c.rule}，${effectText}${extra?'，'+extra:''}" ${used||busy||state.phase!=='player'?'disabled':''}><span class="spell-icon">${A.icon(c.icon)}</span><h2>${c.name}</h2><span class="requirement">${c.rule}</span><span class="effect">${effectText}</span><span class="extra">${extra}</span></button>`;
    }).join('');
    $('undo').disabled=busy||history.length===0||state.phase!=='player';
    $('end-turn').disabled=busy||state.phase!=='player';
    $('restart').disabled=busy;
    if(!busy)showModal();
  }
  function showModal(){
    const mode=modalMode||state.phase;
    if(mode==='player'){$('modal').close();lastModal='';return;}
    const signature=mode+state.stage;
    if(lastModal===signature&&$('modal').open)return;
    lastModal=signature;let html='';
    if(mode==='reward'){
      html=`<h2 id="modal-title">打贏了！選一個強化</h2><p>休息一下，恢復 8 點生命</p><div class="reward-grid">${G.rewards[state.stage].map(r=>`<button class="reward" data-reward="${r.id}">${A.icon(r.icon)}<b>${r.name}</b><span>${r.text}</span></button>`).join('')}</div>`;
    }else if(mode==='won'){
      html=`<div class="modal-art">${A.hero()}</div><h2 id="modal-title">冒險成功！</h2><p>三隻怪物都打贏了</p><div class="stats"><div><strong>${state.stats.biggest}</strong><span>最高一擊</span></div><div><strong>${state.stats.blocked}</strong><span>擋下的傷害</span></div></div><div class="modal-actions"><button class="primary" data-new>再冒險一次</button></div>`;
    }else if(mode==='lost'){
      html=`<div class="modal-art">${A.monster(G.monster(state).type)}</div><h2 id="modal-title">這次沒打贏</h2><p>換個骰子分配，再試一次</p><div class="modal-actions"><button class="primary" data-retry>重試這場</button></div>`;
    }else if(mode==='restart'){
      html='<h2 id="modal-title">從第一場重新開始？</h2><div class="modal-actions"><button class="secondary" data-cancel>繼續玩</button><button class="primary" data-new>重新開始</button></div>';
    }
    $('modal-content').innerHTML=html;
    if(!$('modal').open)$('modal').showModal();
    $('modal-content').querySelector('button')?.focus();
  }
  function wait(ms,token){
    return new Promise(resolve=>{pending=resolve;timer=setTimeout(()=>{pending=null;timer=null;resolve(token===generation);},ms);});
  }
  function stop(){
    generation++;clearTimeout(timer);timer=null;if(pending){const resolve=pending;pending=null;resolve(false);}
    busy=false;$('projectile').hidden=true;
  }
  function float(target,text,kind=''){
    const el=document.createElement('span');el.className='floater '+kind;el.textContent=text;$(target+'-floats').append(el);
    setTimeout(()=>el.remove(),950);
  }
  function animateClass(id,cls){const el=$(id);el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);setTimeout(()=>el.classList.remove(cls),450);}
  async function perform(action){
    if(busy)return;
    const result=G.act(state,action);
    if(result.error){message(result.error,true);return;}
    if(['cast','tool'].includes(action.type)){history.push(G.clone(state));if(history.length>25)history.shift();}
    else history=[];
    selected=null;mergeBase=null;busy=true;render();
    const token=++generation,event=result.event;
    if(event.type==='cast'){
      animateClass('hero-art','cast');
      if(['fire','ice','blade'].includes(event.card)){
        $('projectile').hidden=false;$('projectile').className='projectile '+event.card;
        $('projectile').innerHTML=A.icon(event.card);void $('projectile').offsetWidth;$('projectile').classList.add('fly');
      }
    }
    if(event.type==='enemy'&&!event.charge)animateClass('enemy-art','cast');
    if(!await wait(event.type==='tool'?100:300,token))return;
    state=result.state;save();$('projectile').hidden=true;render();
    if(event.type==='cast'){
      if(event.damage!==undefined){float('enemy','−'+event.damage);animateClass('enemy-art','hit');}
      if(event.reflect){float('hero','−'+event.reflect);animateClass('hero-art','hit');}
      if(event.shield)float('hero','＋'+event.shield,'block');
      if(event.heal)float('hero','＋'+event.heal,'heal');
      message(event.text);
    }else if(event.type==='enemy'){
      if(event.damage){float('hero','−'+event.damage);animateClass('hero-art','hit');}
      else if(!event.charge)float('hero','擋住了','block');
      message(event.text);$('dice').classList.add('rolling');setTimeout(()=>$('dice').classList.remove('rolling'),600);
    }else message(event.text);
    if(!await wait(event.type==='tool'?80:200,token))return;
    busy=false;render();
  }
  function chooseDie(id){
    if(busy||state.phase!=='player')return;
    if(mergeBase!==null){
      if(id===mergeBase){mergeBase=null;selected=id;message('');render();return;}
      perform({type:'tool',id:'merge',die:mergeBase,other:id});return;
    }
    selected=selected===id?null:id;message('');render();
  }
  function tool(id,die=selected){
    if(die===null){message('先選一顆骰子',true);return;}
    if(id==='merge'){
      if(state.tools.includes('merge'))return;
      if(mergeBase!==null&&mergeBase!==die){perform({type:'tool',id:'merge',die:mergeBase,other:die});return;}
      mergeBase=mergeBase===die?null:die;selected=die;message(mergeBase!==null?'再選另一顆骰子':'');render();return;
    }
    perform({type:'tool',id,die});
  }
  $('dice').addEventListener('click',e=>{const d=e.target.closest('[data-die]');if(d)chooseDie(Number(d.dataset.die));});
  $('cards').addEventListener('click',e=>{const c=e.target.closest('[data-card]');if(c)perform({type:'cast',card:c.dataset.card,die:selected});});
  $('tools').addEventListener('click',e=>{const t=e.target.closest('[data-tool]');if(t)tool(t.dataset.tool);});
  $('cards').addEventListener('pointerover',e=>{
    const c=e.target.closest('[data-card]');if(!c||selected===null||busy)return;
    const effect=G.preview(state,c.dataset.card,selected);
    $('message').textContent=effect.error||effect.text;$('message').className=effect.error?'error':'';
  });
  $('cards').addEventListener('pointerleave',()=>{$('message').textContent=lastMessage;$('message').className='';});
  let dragDie=null;
  $('dice').addEventListener('dragstart',e=>{
    const d=e.target.closest('[data-die]');if(!d||busy)return;
    dragDie=Number(d.dataset.die);selected=dragDie;
    e.dataTransfer.setData('text/plain',String(dragDie));e.dataTransfer.effectAllowed='move';
    // Preserve the dragged element; re-rendering it here would cancel native drag.
    document.querySelectorAll('[data-card]').forEach(el=>{const effect=G.preview(state,el.dataset.card,dragDie);el.classList.toggle('available',!effect.error);el.classList.toggle('invalid',!!effect.error&&!state.used.includes(el.dataset.card));});
    d.classList.add('selected');
  });
  document.querySelector('.workbench').addEventListener('dragover',e=>{
    const target=e.target.closest('[data-card],[data-tool]');if(dragDie===null||!target||target.disabled)return;
    e.preventDefault();e.dataTransfer.dropEffect='move';target.classList.add('hover');
  });
  document.querySelector('.workbench').addEventListener('dragleave',e=>e.target.closest('[data-card],[data-tool]')?.classList.remove('hover'));
  document.querySelector('.workbench').addEventListener('drop',e=>{
    e.preventDefault();const target=e.target.closest('[data-card],[data-tool]'),id=dragDie;dragDie=null;
    document.querySelectorAll('.hover').forEach(el=>el.classList.remove('hover'));
    if(!target||target.disabled||id===null)return;
    if(target.dataset.card)perform({type:'cast',card:target.dataset.card,die:id});else tool(target.dataset.tool,id);
  });
  document.addEventListener('dragend',()=>{dragDie=null;document.querySelectorAll('.hover').forEach(el=>el.classList.remove('hover'));if(!busy)render();});
  function cancel(){selected=null;mergeBase=null;message('');render();}
  document.addEventListener('contextmenu',e=>{if(selected!==null||mergeBase!==null){e.preventDefault();cancel();}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('modal').open&&!busy)cancel();});
  $('undo').addEventListener('click',()=>{if(busy||!history.length)return;state=history.pop();selected=null;mergeBase=null;message('');save();render();});
  $('end-turn').addEventListener('click',()=>perform({type:'end'}));
  $('restart').addEventListener('click',()=>{modalMode='restart';showModal();});
  $('modal').addEventListener('cancel',e=>{e.preventDefault();if(modalMode==='restart'){modalMode='';showModal();}});
  $('modal-content').addEventListener('click',e=>{
    if(e.target.closest('[data-cancel]')){modalMode='';showModal();return;}
    if(e.target.closest('[data-new]')){
      stop();state=G.fresh();history=[];selected=null;mergeBase=null;modalMode='';lastModal='';message('');save();render();return;
    }
    const reward=e.target.closest('[data-reward]');
    if(reward){$('modal').close();lastModal='';perform({type:'reward',id:reward.dataset.reward});return;}
    if(e.target.closest('[data-retry]')){$('modal').close();lastModal='';perform({type:'retry'});}
  });
  $('brand-icon').innerHTML=A.icon('dice');$('hero-art').innerHTML=A.hero();render();save();
})();
