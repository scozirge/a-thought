(()=>{
'use strict';const G=Wood,$=id=>document.getElementById(id),key='wood-exit-v1';
const showAnswers=new URLSearchParams(location.search).get('tip')==='true';
let answerBoard='',answerPath=[];
let saved;try{saved=G.restore(localStorage.getItem(key));}catch(_){saved=G.restore(null);}
let {state:s,actions,best}=saved,drag=null,winTimer=null,pendingMove=null,winNextLevel=0;
const level=()=>G.levels[s.level],reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const visibleCount=()=>showAnswers||G.unlocked(best)?12:10;
if(s.level>=10&&visibleCount()===10){s=G.fresh(G.levels.findIndex((_,i)=>i<10&&!best[i]));actions=[];}
function save(){try{localStorage.setItem(key,JSON.stringify({version:4,level:s.level,actions,best}));}catch(_){}}
function say(text=''){ $('status').textContent=text;}
function renderAnswers(){
 $('answers').hidden=!showAnswers;if(!showAnswers)return;
 const boardKey=s.level+':'+s.pos.join(',');
 if(answerBoard!==boardKey){
  answerBoard=boardKey;
  answerPath=G.won(s)?[]:s.moves===0?level().solution:G.solutionFrom(s);
 }
 const positions=s.pos.slice(),steps=(answerPath||[]).map((a,i)=>{const b=level().blocks[a.block],delta=a.to-positions[a.block],arrow=b.axis==='h'?(delta>0?'→':'←'):(delta>0?'↓':'↑');positions[a.block]=a.to;return '<li'+(i===0?' aria-current="step"':'')+'><span class="answer-block">'+(a.block===0?'紅色木塊':'木塊 '+a.block)+'</span><strong class="answer-direction">'+arrow+'</strong><span>'+(a.block===0&&a.to===6?'移到出口':Math.abs(delta)+' 格')+'</span></li>';}).join('');
 const message=G.won(s)?'已過關':!answerPath?'找不到走法，試試退一步。':answerPath.length>level().limit-s.moves?'剩餘步數不夠，退一步或重新開始。':'從目前位置開始';
 $('answers').innerHTML='<h2 id="answer-title">第 '+(s.level+1)+' 關答案 <span>'+(G.won(s)?'已完成':answerPath?'還要 '+answerPath.length+' 步':'')+'</span></h2><div class="answer-tools"><p id="answer-progress" aria-live="polite">'+message+'</p><button id="answer-reset">重新開始</button></div><ol>'+steps+'</ol>';
}

function render(){
 const active=document.activeElement?.dataset.block,activeLevel=document.activeElement?.dataset.level;
 $('levels').classList.toggle('expanded',visibleCount()===12);
 $('levels').innerHTML=G.levels.slice(0,visibleCount()).map((l,i)=>'<button data-level="'+i+'" class="'+(i===s.level?'active':'')+'" aria-current="'+(i===s.level?'step':'false')+'" aria-label="第 '+(i+1)+' 關'+(best[i]?'，已完成':'')+'">'+(i+1)+(best[i]?'<span class="tick">✓</span>':'')+'</button>').join('');
 $('stage').textContent='第 '+(s.level+1)+' 關 · '+(s.level>=10?'隱藏挑戰':s.level<2?'試試身手':s.level<5?'想想順序':s.level<8?'高手挑戰':'木塊大師');
 $('remaining').textContent=level().limit-s.moves;$('remaining').classList.toggle('empty',s.moves===level().limit);
 $('best').textContent=best[s.level]?'最佳 '+best[s.level]+' 步':'';
 $('board').innerHTML=level().blocks.map((b,i)=>'<button data-block="'+i+'" class="block '+b.axis+(i===0?' target':'')+'" style="left:'+(b.axis==='h'?s.pos[i]:b.fixed)/6*100+'%;top:'+(b.axis==='v'?s.pos[i]:b.fixed)/6*100+'%;width:'+(b.axis==='h'?b.len:1)/6*100+'%;height:'+(b.axis==='v'?b.len:1)/6*100+'%" aria-label="'+(i===0?'紅色目標木塊':'木塊 '+i)+'，'+(b.axis==='h'?'左右移動':'上下移動')+'" '+(G.won(s)?'disabled':'')+'><span class="wood"><i class="grain"></i>'+(i===0?'<span class="target-arrow" aria-hidden="true">→</span>':(showAnswers?'<span class="block-number" aria-hidden="true">'+i+'</span>':'<span class="groove" aria-hidden="true"></span>'))+'</span></button>').join('');
 $('undo').disabled=actions.length===0;
 renderAnswers();
 if(active!==undefined&&!G.won(s))document.querySelector('[data-block="'+active+'"]')?.focus({preventScroll:true});
 else if(activeLevel!==undefined)document.querySelector('[data-level="'+activeLevel+'"]')?.focus({preventScroll:true});
 if(!G.won(s)&&s.moves===level().limit)say('步數用完了，退一步再試試');
}
function celebrate(newlyUnlocked=false){
 clearTimeout(winTimer);const current=s.level;
 winTimer=setTimeout(()=>{
  if(s.level!==current||!G.won(s))return;
  const count=visibleCount(),firstMissing=G.levels.findIndex((_,i)=>i<count&&!best[i]);
  winNextLevel=newlyUnlocked?10:s.level+1<count?s.level+1:firstMissing>=0?firstMissing:0;
  $('win-stage').textContent=newlyUnlocked?'前 10 關全部完成':'第 '+(s.level+1)+' 關完成';
  $('win-title').textContent=newlyUnlocked?'隱藏關解鎖了！':s.level===11?'木塊大師！':'出來了！';
  $('win-score').textContent=newlyUnlocked?'第 11、12 關等你挑戰':'用了 '+s.moves+' 步'+(s.moves===level().minMoves?' · 最短路線！':'');
  $('next').textContent=newlyUnlocked?'挑戰隱藏關 →':s.level+1<count?'下一關 →':firstMissing>=0?'挑戰其他關':'再玩一次';
  $('win').showModal();
 },230);
}
function commit(i,to){const wasUnlocked=G.unlocked(best),before=s.pos[i],r=G.move(s,i,to);if(r.error){say(r.error);render();return;}s=r.state;actions.push({block:i,to});say();if(G.won(s))best[s.level]=Math.min(best[s.level]??Infinity,s.moves);save();render();if(G.won(s))celebrate(!wasUnlocked&&G.unlocked(best));else if(!reduced()){const el=document.querySelector('[data-block="'+i+'"]'),cell=$('board').clientWidth/6,b=level().blocks[i],delta=(before-to)*cell;el.animate([{transform:b.axis==='h'?'translateX('+delta+'px)':'translateY('+delta+'px)'},{transform:'translate(0,0)'}],{duration:120,easing:'ease-out'});}}
function cancel(){if(!drag)return;const d=drag;drag=null;try{d.el.releasePointerCapture(d.pointer);}catch(_){}d.el.style.transform='';d.el.classList.remove('dragging');}
function start(n){if(!Number.isInteger(n)||n<0||n>=visibleCount())return;if(pendingMove!==null){cancelAnimationFrame(pendingMove);pendingMove=null;}cancel();clearTimeout(winTimer);$('win').close();s=G.fresh(n);actions=[];say();save();render();}
$('board').addEventListener('pointerdown',e=>{if(e.button!==0||drag||pendingMove!==null||G.won(s))return;const el=e.target.closest('[data-block]');if(!el)return;if(s.moves===level().limit){say('步數用完了，退一步再試試');return;}const i=Number(el.dataset.block);el.focus({preventScroll:true});el.getAnimations().forEach(a=>a.cancel());drag={el,i,pointer:e.pointerId,x:e.clientX,y:e.clientY,cell:$('board').getBoundingClientRect().width/6,range:G.bounds(s,i),raw:s.pos[i]};el.setPointerCapture(e.pointerId);el.classList.add('dragging');});
function follow(e){if(!drag||e.pointerId!==drag.pointer)return;const d=drag,b=level().blocks[d.i],delta=(b.axis==='h'?e.clientX-d.x:e.clientY-d.y)/d.cell;d.raw=Math.max(d.range.min,Math.min(d.range.max,s.pos[d.i]+delta));const px=(d.raw-s.pos[d.i])*d.cell;d.el.style.transform=b.axis==='h'?'translateX('+px+'px)':'translateY('+px+'px)';}
$('board').addEventListener('pointermove',e=>{if(drag){e.preventDefault();follow(e);}});
$('board').addEventListener('pointerup',e=>{if(!drag||e.pointerId!==drag.pointer)return;follow(e);const d=drag;let to=d.i===0&&d.range.max===6&&d.raw>=3.5?6:Math.round(d.raw);if(d.i===0&&to!==6)to=Math.min(4,to);cancel();if(to!==s.pos[d.i]){if(e.pointerType==='touch'){const before=s;pendingMove=requestAnimationFrame(()=>{pendingMove=null;if(s===before)commit(d.i,to);});}else commit(d.i,to);}});
$('board').addEventListener('pointercancel',cancel);
$('board').addEventListener('lostpointercapture',()=>{if(drag)cancel();});
$('board').addEventListener('contextmenu',e=>{e.preventDefault();cancel();});
$('board').addEventListener('keydown',e=>{const el=e.target.closest('[data-block]');if(!el||G.won(s)||e.repeat)return;const i=Number(el.dataset.block),b=level().blocks[i],d=b.axis==='h'?{ArrowLeft:-1,ArrowRight:1}[e.key]:{ArrowUp:-1,ArrowDown:1}[e.key];if(d){e.preventDefault();cancel();const r=G.bounds(s,i);let to=s.pos[i]+d;if(i===0&&to>=4&&r.max===6)to=6;if(to>=r.min&&to<=r.max)commit(i,to);else say('這裡移不過去');}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')cancel();});
$('levels').addEventListener('click',e=>{const b=e.target.closest('[data-level]');if(b)start(Number(b.dataset.level));});
$('undo').addEventListener('click',()=>{if(!actions.length)return;cancel();clearTimeout(winTimer);$('win').close();actions.pop();s=G.replay(s.level,actions);say();save();render();});
$('answers').addEventListener('click',e=>{if(e.target.closest('#answer-reset'))start(s.level);});
$('reset').addEventListener('click',()=>start(s.level));$('stay').addEventListener('click',()=>$('win').close());$('next').addEventListener('click',()=>start(winNextLevel));

// Complete touch taps directly after a drag; suppress a later compatibility click.
let controlTap=null,lastTouchControl=null;
const controlKey=el=>el.id||'level:'+el.dataset.level;
document.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')return;const el=e.target.closest('#levels button,.controls button');if(el&&!el.disabled)controlTap={el,id:e.pointerId,x:e.clientX,y:e.clientY};});
document.addEventListener('pointercancel',()=>{controlTap=null;});
document.addEventListener('pointerup',e=>{if(!controlTap||e.pointerId!==controlTap.id)return;const t=controlTap;controlTap=null;if(Math.hypot(e.clientX-t.x,e.clientY-t.y)>10||!t.el.contains(e.target))return;e.preventDefault();lastTouchControl={key:controlKey(t.el),time:performance.now()};t.el.click();});
document.addEventListener('click',e=>{if(!e.isTrusted||!lastTouchControl||performance.now()-lastTouchControl.time>800)return;const el=e.target.closest('#levels button,.controls button');if(el&&controlKey(el)===lastTouchControl.key&&(e.pointerType==='touch'||e.sourceCapabilities?.firesTouchEvents)){e.preventDefault();e.stopImmediatePropagation();}},true);

window.addEventListener('blur',cancel);window.addEventListener('resize',cancel);
render();if(G.won(s))say('已過關，可以換下一關');
})();