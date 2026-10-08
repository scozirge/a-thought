(function(){
 'use strict';
 const R=window.PuzzleRules,A=R.animal;
 function face(id){
  const a=A.animals[id],ears=id==='rabbit'?'<ellipse cx="26" cy="21" rx="8" ry="19"/><ellipse cx="54" cy="21" rx="8" ry="19"/>':id==='cat'?'<path d="M15 40V12l24 18 24-18v28Z"/>':id==='dog'?'<ellipse cx="16" cy="38" rx="11" ry="22"/><ellipse cx="64" cy="38" rx="11" ry="22"/>':'<circle cx="18" cy="25" r="12"/><circle cx="62" cy="25" r="12"/>';
  return '<svg viewBox="0 0 80 86" aria-hidden="true"><g fill="'+a.color+'">'+ears+'<rect x="14" y="24" width="52" height="48" rx="23"/></g>'+(id==='panda'?'<ellipse cx="29" cy="43" rx="10" ry="12" fill="#3c5457"/><ellipse cx="51" cy="43" rx="10" ry="12" fill="#3c5457"/>':'')+'<ellipse cx="40" cy="59" rx="16" ry="10" fill="#fff8e9"/><g fill="'+(id==='panda'?'#fff8e9':'#294e45')+'"><circle cx="29" cy="43" r="3"/><circle cx="51" cy="43" r="3"/></g><path d="m36 53 4 5 4-5m-4 5v5" fill="#294e45" stroke="#294e45" stroke-width="2"/><ellipse cx="22" cy="54" rx="5" ry="3" fill="#e5918655"/><ellipse cx="58" cy="54" rx="5" ry="3" fill="#e5918655"/></svg>';
 }
 function lineup(order){return '<div class="animal-lineup">'+order.map((id,i)=>'<div class="animal-photo">'+face(id)+'<b>'+A.animals[id].name+'</b><small>第 '+(i+1)+' 位</small></div>').join('')+'</div>';}
 function board(l,settings){
  return '<div class="animal-target"><strong>目標照片</strong>'+lineup(l.target)+'</div><p class="animal-rule">左邊是最前面。動作都看當時的位置。</p><div class="animal-stage" id="animal-stage" data-order="'+l.lineup.join(',')+'"><div class="animal-stage-caption" id="animal-caption">還沒開始 · 這是出發順序</div>'+l.lineup.map((id,i)=>'<div class="animal-actor" id="animal-'+id+'" style="width:'+(100/l.lineup.length)+'%;left:'+((i+.5)*100/l.lineup.length)+'%">'+face(id)+'<b>'+A.animals[id].name+'</b></div><span class="animal-place" style="left:'+((i+.5)*100/l.lineup.length)+'%">'+(i+1)+'</span>').join('')+'</div><div class="animal-sequence">'+settings.map((s,i)=>'<div class="animal-step" id="animal-step-'+i+'"><small>'+R.groups[i]+'</small><b>'+(s?A.actions[s].short:'？')+'</b></div>').join('')+'</div><div class="live-copy" id="stage-copy">四組先選好，播放後才開始換位。</div>';
 }
 function config(l,state){
  return '<p class="config-help">每組只選一個動作。四步都做完，再拍照比對目標。</p><div class="machine-list animal-config">'+state.settings.map((selected,i)=>'<div class="machine"><div class="machine-main"><div class="machine-title">'+R.groups[i]+'<span class="group-description">第 '+(i+1)+' 步</span></div><div class="options" role="group" aria-label="'+R.groups[i]+'的動作">'+Object.entries(A.actions).map(([choice,a])=>'<button class="option animal-option '+(selected===choice?'selected':'')+'" data-machine="'+i+'" data-choice="'+choice+'" aria-pressed="'+(selected===choice)+'" '+(state.running?'disabled':'')+'><span>'+a.icon+'</span>'+a.label+'</button>').join('')+'</div></div></div>').join('')+'</div>';
 }
 function paint(l,order,wrong=[]){
  document.getElementById('animal-stage').dataset.order=order.join(',');
  order.forEach((id,i)=>{const el=document.getElementById('animal-'+id);el.style.left=((i+.5)*100/order.length)+'%';el.style.transform='translate(-50%,0)';el.classList.toggle('wrong',wrong.includes(i));});
 }
 function move(l,frame,p){
  const n=l.lineup.length;
  frame.before.forEach((id,i)=>{const dest=frame.board.indexOf(id),lead=i===0;
   const y=frame.command==='cycle'?(lead?-54*Math.sin(Math.PI*p):0):i<2?(lead?-32:24)*Math.sin(Math.PI*p):0;
   const el=document.getElementById('animal-'+id);el.style.left=((i+(dest-i)*p+.5)*100/n)+'%';el.style.transform='translate(-50%,'+y+'px)';el.style.zIndex=lead?3:2;
  });
 }
 function card(){return '<g transform="translate(54 45) scale(1.05)">'+face('cat').replace('<svg viewBox="0 0 80 86" aria-hidden="true">','').replace('</svg>','')+'</g><g transform="translate(144 55) scale(1.05)">'+face('rabbit').replace('<svg viewBox="0 0 80 86" aria-hidden="true">','').replace('</svg>','')+'</g><g transform="translate(237 45) scale(1.05)">'+face('bear').replace('<svg viewBox="0 0 80 86" aria-hidden="true">','').replace('</svg>','')+'</g><path d="M84 163h190m-10-8 12 8-12 8" stroke="#a5829b" stroke-width="4" fill="none"/>';}
 window.AnimalView={board,config,paint,move,card,lineup};
})();
