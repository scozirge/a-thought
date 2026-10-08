(() => {
  const overlay=document.createElement('section');
  overlay.id='learning-overlay';overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','learning-title');
  const star='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.5 2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.52l-5.88 3.09 1.12-6.55-4.76-4.64 6.58-.96Z"/></svg>';
  overlay.innerHTML='<div class="learning-card"><h2 id="learning-title" tabindex="-1"></h2><p id="learning-context"></p><p id="learning-hint" hidden>累積答對更多問題，可以解鎖新武器</p><div id="learning-stars" role="img" hidden>'+star.repeat(3)+'</div><div id="learning-options"></div><p id="learning-feedback" role="status"></p><div id="learning-weapons" aria-label="復活武器"></div><button id="learning-next" type="button">繼續</button></div>';
  document.getElementById('stage').append(overlay);
  const get=id=>document.getElementById('learning-'+id);
  const names={1:'手槍',2:'菜刀',6:'火箭筒',8:'毒藥',5:'加特林',7:'核彈'};
  let current=null,key='',pending=false;
  const command=value=>window.rivalsLearningCommand?.(value);
  const readable=value=>window.rivalsTouch?.mode?(value||'').replaceAll('按下滑鼠左鍵','點一下射擊按鈕').replaceAll('按住滑鼠左鍵','按住射擊按鈕'):(value||'');
  get('next').onclick=()=>{if(!current||pending)return;pending=true;get('next').disabled=true;window.rivalsLook?.prepareRespawn?.();command(`learning:continue:${current.life}`);};
  overlay.addEventListener('keydown',event=>{
    if(event.key!=='Tab')return;
    const buttons=[...overlay.querySelectorAll('button:not(:disabled)')].filter(b=>!b.hidden&&b.offsetParent!==null),first=buttons[0],last=buttons.at(-1);
    if(event.shiftKey&&(document.activeElement===first||document.activeElement===get('title'))){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  });
  window.rivalsReceiveLearning=state=>{
    const wasVisible=!overlay.hidden,wasCountingDown=current?.state===3;overlay.hidden=!state.visible;current=state;
    // Read-only presentation data; commands are validated again by the room host.
    window.rivalsLearningState=state;
    if(!state.visible){
      key='';pending=false;
      // Unity reports the hidden lesson before updating this frame's touch state.
      // Restore focus after a respawn, but never steal it in the lobby,
      // on the victory screen, while paused, or in a background tab.
      if(wasVisible&&wasCountingDown)requestAnimationFrame(()=>{
        const touch=window.rivalsTouch;
        if(current?.visible)return;
        if(touch?.mode){if(touch.playable&&!touch.paused&&document.hasFocus()&&!document.hidden)window.rivalsLook?.resume?.();}
        else window.rivalsLook?.resumeAfterRespawn?.();
      });
      else if(wasVisible)window.rivalsLook?.cancelRespawn?.();
      return;
    }
    const nextKey=[state.life,state.state,state.question].join(':');
    const changed=nextKey!==key;
    if(changed){key=nextKey;pending=false;overlay.querySelector('.learning-card').scrollTop=0;}
    overlay.dataset.state=String(state.state);
    get('title').textContent=state.state===3?(state.seconds>0?`${state.seconds} 秒後復活`:'準備復活'):state.state===2?(state.correct?(state.unlocked?`解鎖新武器：${state.reward}`:'答對了'):'答錯了'):readable(state.title);
    get('context').textContent=state.state===1?readable(state.context):'';
    get('hint').hidden=state.state!==1;
    const stars=get('stars'),filled=Math.max(0,Math.min(3,Number(state.badges)||0));
    stars.hidden=state.state!==2||!state.correct;
    stars.setAttribute('aria-label',`已集滿 ${filled} 顆星，共 3 顆`);
    [...stars.children].forEach((star,index)=>star.classList.toggle('is-filled',index<filled));
    const options=get('options');options.hidden=state.state!==1;
    if(changed){
      options.replaceChildren();
      if(state.state===1)(state.options||[]).forEach((label,index)=>{
        const button=document.createElement('button');button.type='button';button.dataset.option=String(index);button.textContent=`${index+1}. ${readable(label)}`;
        button.disabled=state.state!==1;
        button.onclick=()=>{if(pending||current.state!==1)return;pending=true;for(const b of options.children)b.disabled=true;options.setAttribute('aria-busy','true');command(`learning:answer:${state.life}:${state.question}:${index}`);};
        options.append(button);
      });
    }
    if(!pending)options.removeAttribute('aria-busy');
    const feedback=get('feedback');feedback.hidden=state.state!==2;feedback.textContent=state.state===2?readable(state.explanation):'';
    const weapons=get('weapons');weapons.hidden=state.state!==3;
    if(changed){weapons.replaceChildren();if(state.state===3)for(const kind of state.weapons){const button=document.createElement('button');button.type='button';button.dataset.weapon=String(kind);button.textContent=names[kind];button.onclick=()=>{window.rivalsLook?.prepareRespawn?.();command(`learning:weapon:${state.life}:${kind}`);};weapons.append(button);}}
    for(const button of weapons.children)button.setAttribute('aria-pressed',String(Number(button.dataset.weapon)===state.selected));
    get('next').hidden=state.state!==2;get('next').disabled=pending;
    if(!wasVisible||changed)get('title').focus({preventScroll:true});
  };
})();
