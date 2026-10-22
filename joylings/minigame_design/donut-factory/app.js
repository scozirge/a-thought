(() => {
  'use strict';
  const G=Factory,A=BakeryArt,$=id=>document.getElementById(id),key='donut-math-v2';
  let current=0,programs=G.levels.map((_,i)=>G.blank(i)),completed=[],history=[],held=null,selected=null;
  let timer=null,pending=null,generation=0,running=false,caseIndex=0,results=[],value=G.rational(0);
  try{
    const saved=JSON.parse(localStorage.getItem(key));
    if(saved){
      programs=programs.map((empty,i)=>G.valid(i,saved.programs?.[i])?saved.programs[i]:empty);
      if(Number.isInteger(saved.current)&&saved.current>=0&&saved.current<3)current=saved.current;
      completed=Array.isArray(saved.completed)?saved.completed.filter(i=>Number.isInteger(i)&&i>=0&&i<3):[];
    }
  }catch(_){}
  const cargo=document.createElement('div');cargo.id='cargo';cargo.hidden=true;document.body.append(cargo);
  const level=()=>G.levels[current],program=()=>programs[current],clone=o=>JSON.parse(JSON.stringify(o));
  const save=()=>{try{localStorage.setItem(key,JSON.stringify({current,programs,completed}));}catch(_){}};
  function stop(){
    generation++;clearTimeout(timer);timer=null;
    if(pending){const resolve=pending;pending=null;resolve(false);}
    running=false;cargo.hidden=true;
  }
  function status(text='',kind=''){$('status').textContent=text;$('status').className=kind;}
  function slot(id){
    const card=G.cards[program()[id]],condition=id==='test';
    return `<button class="slot ${condition?'condition':''} ${card?'filled':'empty'}" data-slot="${id}" data-kind="${condition?'condition':'action'}" ${card?'draggable="true"':''} aria-label="${id} ${card?card.label:'空位'}">${card?card.label:'放機器'}</button>`;
  }
  const arrow='<span class="arrow" aria-hidden="true">→</span>',down='<div class="down" aria-hidden="true">↓</div>';
  function flow(){
    const oven=`<span class="endpoint" data-node="source">${A.oven()}</span>`,box=`<span class="endpoint" data-node="end">${A.box()}</span>`;
    let html='';
    if(current===0)html=`<div class="line">${oven}${arrow}${slot('a')}${arrow}${slot('b')}${arrow}${slot('c')}${arrow}${box}</div>`;
    if(current===1)html=`<div class="condition-line">${oven}<strong>如果</strong>${slot('test')}</div><div class="branches"><div class="branch" data-branch="yes"><div class="branch-label">是 ↓</div>${slot('yes')}</div><div class="branch" data-branch="no"><div class="branch-label">否則 ↓</div>${slot('no')}</div></div>${down}<div class="finish">${slot('finish')}${arrow}${box}</div>`;
    if(current===2)html=`<div class="pre">${oven}<span class="entry-caption">合併</span>${slot('pre')}</div>${down}<div class="condition-line"><strong>如果</strong>${slot('test')}</div><div class="branches"><div class="branch" data-branch="yes"><div class="branch-label">是 ↓</div>${slot('yes1')}${down}${slot('yes2')}</div><div class="branch" data-branch="no"><div class="branch-label">否則 ↓</div>${slot('no1')}${down}${slot('no2')}</div></div>${down}<div class="finish">${box}</div>`;
    $('flow').innerHTML=html;
    const groups=current===0?['action']:['condition','action'];
    $('palette').innerHTML=groups.map(kind=>`<div class="card-row">${level().palette.filter(id=>(G.cards[id].kind||'action')===kind).map(id=>`<button class="card ${kind} ${id==='pass'?'pass':''}" draggable="true" data-card="${id}" aria-label="${G.cards[id].label}">${G.cards[id].label}</button>`).join('')}</div>`).join('');
    selection();controls();
  }
  function controls(){
    $('undo').disabled=history.length===0;$('reset').disabled=Object.values(program()).every(v=>v===null);
    $('play').disabled=!G.ready(current,program());$('play').textContent=running?'■ 停下':'▶ 試跑';
  }
  function selection(){
    const kind=held?(G.cards[held.id].kind||'action'):null;
    document.querySelectorAll('[data-slot]').forEach(el=>{
      el.classList.toggle('selected',el.dataset.slot===selected);
      el.classList.toggle('ready',el.dataset.kind===kind);
    });
    document.querySelectorAll('[data-card]').forEach(el=>{
      el.classList.toggle('chosen',held?.id===el.dataset.card);
      el.setAttribute('aria-pressed',String(held?.id===el.dataset.card));
    });
  }
  function nav(){$('levels').innerHTML=G.levels.map((l,i)=>`<button data-level="${i}" ${current===i?'aria-current="step"':''}>${i+1} ${l.name}${completed.includes(i)?'<span class="check">✓</span>':''}</button>`).join('');}
  function orders(){
    const hasY=current===2;
    $('orders').innerHTML=`<table><thead><tr><th class="x">X</th>${hasY?'<th class="y">Y</th>':''}<th>目標</th><th>做出</th></tr></thead><tbody>${level().cases.map((c,i)=>`<tr class="${i===caseIndex?'current':''} ${results[i]?(results[i].ok?'pass':'fail'):''}" data-case="${i}"><td class="x">${c.X}</td>${hasY?`<td class="y">${c.Y}</td>`:''}<td class="target">${c.target}</td><td class="result">${results[i]?`${G.format(results[i].value)} ${results[i].ok?'✓':'×'}`:'—'}</td></tr>`).join('')}</tbody></table>`;
    $('progress').textContent=`${results.filter(r=>r?.ok).length} / ${level().cases.length} 張完成`;
    $('value').textContent=G.format(value);$('parcel-number').textContent=G.format(value);
  }
  function resetResults(){
    results=[];caseIndex=0;value=G.rational(level().cases[0].X);status();$('next').hidden=true;
    document.querySelectorAll('.active,.branch-lit').forEach(el=>el.classList.remove('active','branch-lit'));
    document.querySelectorAll('.result-badge').forEach(el=>el.remove());orders();
  }
  function start(i){
    stop();current=i;history=[];held=null;selected=null;
    $('title').textContent=level().name;$('task').textContent=level().task;
    $('next').textContent=i===2?'再挑戰':'下一關 →';
    nav();flow();resetResults();save();
  }
  function change(fn){
    stop();history.push(clone(program()));if(history.length>30)history.shift();
    fn();held=null;selected=null;save();flow();resetResults();
  }
  function place(target,id,source=null){
    const card=G.cards[id];if(!card||!level().palette.includes(id))return;
    if((target==='test')!==(card.kind==='condition'))return;
    if(source===target)return;
    change(()=>{
      if(source)program()[source]=program()[target];
      program()[target]=id;
    });
  }
  function choose(id){
    const kind=G.cards[id].kind||'action';
    const matches=s=>(s==='test'?'condition':'action')===kind;
    if(selected&&matches(selected)){place(selected,id);return;}
    const empty=level().slots.find(s=>matches(s)&&program()[s]===null);
    if(empty){place(empty,id);return;}
    held=held?.id===id?null:{id};selected=null;selection();
  }
  $('palette').addEventListener('click',e=>{const c=e.target.closest('[data-card]');if(c)choose(c.dataset.card);});
  $('flow').addEventListener('click',e=>{
    const c=e.target.closest('[data-slot]');if(!c)return;
    if(held){place(c.dataset.slot,held.id,held.source);return;}
    selected=selected===c.dataset.slot?null:c.dataset.slot;selection();
  });
  document.addEventListener('dragstart',e=>{
    const palette=e.target.closest('[data-card]'),machine=e.target.closest('[data-slot]');
    if(!palette&&!machine)return;
    const id=palette?palette.dataset.card:program()[machine.dataset.slot];if(!id){e.preventDefault();return;}
    held={id,source:machine?.dataset.slot||null};selected=null;
    e.dataTransfer.setData('text/plain',id);e.dataTransfer.effectAllowed=machine?'move':'copy';selection();
  });
  $('flow').addEventListener('dragover',e=>{
    const c=e.target.closest('[data-slot]');
    if(c&&held&&c.dataset.kind===(G.cards[held.id].kind||'action')){e.preventDefault();e.dataTransfer.dropEffect=held.source?'move':'copy';c.classList.add('hover');}
  });
  $('flow').addEventListener('dragleave',e=>e.target.closest('[data-slot]')?.classList.remove('hover'));
  $('flow').addEventListener('drop',e=>{
    e.preventDefault();const c=e.target.closest('[data-slot]');if(c&&held)place(c.dataset.slot,held.id,held.source);
    document.querySelectorAll('.hover').forEach(el=>el.classList.remove('hover'));
  });
  document.addEventListener('dragend',()=>{held=null;selection();document.querySelectorAll('.hover').forEach(el=>el.classList.remove('hover'));});
  function cancel(){held=null;selected=null;selection();}
  document.addEventListener('contextmenu',e=>{if(held||selected){e.preventDefault();cancel();}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){cancel();stop();controls();}if(e.key==='Delete'&&selected){const id=selected;change(()=>program()[id]=null);}});
  function pause(ms,runToken){
    return new Promise(resolve=>{
      pending=resolve;timer=setTimeout(()=>{timer=null;pending=null;resolve(runToken===generation);},ms);
    });
  }
  function locate(el){
    let r=el?.getBoundingClientRect();
    if(!r||r.width===0)r=$('value').getBoundingClientRect();
    return {x:r.left+r.width/2,y:r.top+r.height/2};
  }
  function moveTo(el,jump=false){
    const p=locate(el);cargo.style.transition=jump?'none':'';cargo.style.left=p.x+'px';cargo.style.top=p.y+'px';
    if(jump)void cargo.offsetWidth;
  }
  function paintCargo(){cargo.innerHTML=A.donut(current+1)+`<b>${G.format(value)}</b>`;}
  async function run(){
    if(running){stop();controls();return;}
    if(!G.ready(current,program()))return;
    stop();resetResults();held=null;selected=null;selection();running=true;controls();
    const runToken=generation,recipe=clone(program());
    for(let i=0;i<level().cases.length;i++){
      caseIndex=i;value=G.rational(level().cases[i].X);orders();
      document.querySelectorAll('.active,.branch-lit').forEach(el=>el.classList.remove('active','branch-lit'));
      document.querySelectorAll('.result-badge').forEach(el=>el.remove());
      const result=G.trace(current,recipe,level().cases[i]);
      paintCargo();cargo.hidden=false;
      moveTo($('flow').querySelector('[data-node="source"]'),true);
      if(!await pause(200,runToken))return;
      for(const event of result.events){
        const el=$('flow').querySelector(`[data-slot="${event.slot}"]`);
        document.querySelectorAll('.slot.active').forEach(n=>n.classList.remove('active'));
        moveTo(el);
        if(!await pause(350,runToken))return;
        value=event.value;paintCargo();orders();status(event.text);el.classList.add('active');
        if(event.branch)document.querySelectorAll('[data-branch]').forEach(n=>n.classList.toggle('branch-lit',n.dataset.branch===event.branch));
        const badge=document.createElement('span');badge.className='result result-badge';badge.textContent=G.cards[recipe[event.slot]].kind==='condition'?(event.branch==='yes'?'是':'否'):G.format(value);el.append(badge);
        if(!await pause(400,runToken))return;
      }
      moveTo($('flow').querySelector('[data-node="end"]'));
      if(!await pause(350,runToken))return;
      cargo.hidden=true;results[i]=result;orders();
      if(!result.ok){status(result.error,'error');running=false;controls();return;}
      status(`第 ${i+1} 張完成！`,'good');
      if(!await pause(300,runToken))return;
    }
    running=false;status('全部訂單完成！','good');controls();$('next').hidden=false;
    if(!completed.includes(current))completed.push(current);save();nav();
  }
  $('play').addEventListener('click',run);
  $('undo').addEventListener('click',()=>{if(!history.length)return;stop();programs[current]=history.pop();held=null;selected=null;save();flow();resetResults();});
  $('reset').addEventListener('click',()=>change(()=>programs[current]=G.blank(current)));
  $('next').addEventListener('click',()=>start(current===2?0:current+1));
  $('levels').addEventListener('click',e=>{const c=e.target.closest('[data-level]');if(c)start(Number(c.dataset.level));});
  $('logo').innerHTML=A.donut(2);$('parcel-art').innerHTML=A.donut(3);start(current);
})();
