(()=>{
'use strict';const G=Studio,$=id=>document.getElementById(id),key='puzzle-studio-v1';
const meta={pancake:['鬆餅店','小片在上，大片在下','點一層，連同上面一起翻'],boxes:['推箱子','把箱子推到星星上','點地板走路，方向鍵推箱子'],rooms:['矩形分割','幫怪獸蓋好房子','拉出長方形，格數要和數字一樣'],bridges:['搭橋問題','讓所有島連在一起','點兩座島搭橋，再連一次變雙橋']};
let game=Object.hasOwn(meta,new URLSearchParams(location.search).get('game'))?new URLSearchParams(location.search).get('game'):'pancake';
let entries={},done={},states={},anchor=null,gesture=null;
for(const g of Object.keys(meta)){entries[g]={level:0,actions:[]};done[g]=[];states[g]=G.fresh(g);}
try{const saved=JSON.parse(localStorage.getItem(key));if(saved?.version===1)for(const g of Object.keys(meta)){try{const state=G.replay(g,saved.entries[g]);states[g]=state;entries[g]=saved.entries[g];if(Array.isArray(saved.done[g]))done[g]=saved.done[g].filter(i=>Number.isInteger(i)&&i>=0&&i<3);}catch(_){}}}catch(_){}
const state=()=>states[game],save=()=>{try{localStorage.setItem(key,JSON.stringify({version:1,entries,done}));}catch(_){}};
function say(text='',error=false){$('status').textContent=text;$('status').className=error?'error':'';}
const buddy='<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="88" rx="29" ry="6" fill="#42594d22"/><path d="M23 75V43c0-35 54-35 54 0v32q-27 23-54 0" fill="#8bac8d" stroke="#567967" stroke-width="3"/><ellipse cx="50" cy="66" rx="20" ry="17" fill="#d6dfb4"/><circle cx="38" cy="41" r="4" fill="#3a4d42"/><circle cx="62" cy="41" r="4" fill="#3a4d42"/><path d="M43 52q7 9 14 0" stroke="#647453" stroke-width="3" fill="none"/><path d="m30 25 4-14 12 10 11-12 8 18" fill="#e7c77f" stroke="#b99757" stroke-width="2"/></svg>';
function render(){
 const s=state();document.body.dataset.game=game;
 $('games').innerHTML=Object.entries(meta).map(([g,m])=>'<button data-game="'+g+'" class="'+(g===game?'active':'')+'" aria-pressed="'+(g===game)+'">'+m[0]+'</button>').join('');
 $('game-name').textContent=meta[game][0];$('goal').textContent=meta[game][1];$('hint').textContent=meta[game][2];
 $('levels').innerHTML=[0,1,2].map(i=>'<button data-level="'+i+'" class="'+(s.level===i?'active':'')+'" aria-label="第 '+(i+1)+' 關'+(done[game].includes(i)?'，已完成':'')+'">'+(i+1)+(done[game].includes(i)?' ✓':'')+'</button>').join('');
 $('undo').disabled=entries[game].actions.length===0;
 if(game==='pancake'){
  $('play').innerHTML='<div class="cafe"><div class="customer">'+buddy+'<span>我的鬆餅呢？</span></div><div class="pancake-area"><div class="stack">'+s.stack.map((n,i)=>'<button class="pancake-row" data-flip="'+(i+1)+'" '+(i===0?'disabled':'')+' aria-label="翻上面 '+(i+1)+' 片"><span class="pancake" style="--size:'+n+'"><b>'+n+'</b></span>'+(i?'<span class="flip-icon" aria-hidden="true">↻</span>':'')+'</button>').join('')+'</div><div class="plate"></div></div><div class="order"><span>目標</span><div class="mini-stack">'+s.stack.map((_,i)=>'<i style="width:'+(35+i*14)+'px"></i>').join('')+'</div></div></div>';
 }else if(game==='boxes'){
  $('play').innerHTML='<div class="warehouse"><div class="board-frame"><div class="box-board" style="--cols:'+s.w+'">'+Array.from({length:s.w*s.h},(_,i)=>{
   const wall=s.walls.includes(i),box=s.boxes.includes(i),goal=s.goals.includes(i),player=s.player===i;
   return '<button class="tile '+(wall?'wall':'floor')+(goal?' goal':'')+'" data-cell="'+i+'" '+(wall?'disabled':'')+' aria-label="'+(wall?'牆':player?'小怪獸':box?'箱子':goal?'星星':'地板')+'，第 '+(i+1)+' 格">'+(goal?'<span class="star">★</span>':'')+(box?'<span class="crate '+(goal?'placed':'')+'"><i></i></span>':'')+(player?'<span class="player">'+buddy+'</span>':'')+'</button>';
  }).join('')+'</div></div><div class="dpad" aria-label="移動方向"><button data-dir="up" aria-label="往上">↑</button><button data-dir="left" aria-label="往左">←</button><button data-dir="down" aria-label="往下">↓</button><button data-dir="right" aria-label="往右">→</button></div></div>';
 }else if(game==='rooms'){
  $('play').innerHTML='<div class="room-wrap"><div class="room-board" style="--cols:'+s.w+'">'+Array.from({length:s.w*s.h},(_,i)=>{
   const room=s.rects.findIndex(r=>G.cells(s,...r).includes(i)),clue=s.clues.find(c=>c[0]===i);
   let borders='';if(room>=0){const cells=G.cells(s,...s.rects[room]);borders=(!cells.includes(i-s.w)?' top':'')+(!cells.includes(i+s.w)?' bottom-edge':'')+(i%s.w===0||!cells.includes(i-1)?' left-edge':'')+(i%s.w===s.w-1||!cells.includes(i+1)?' right-edge':'');}
   return '<button data-room="'+i+'" class="room-cell '+(room>=0?'filled color-'+room%6:'')+borders+'" aria-label="第 '+(i+1)+' 格'+(clue?'，要 '+clue[1]+' 格':'')+(room>=0?'，點一下拆除':'')+'">'+(clue?'<b>'+clue[1]+'</b>':'')+'</button>';
  }).join('')+'</div><div class="room-caption">一間一個數字 · 不能留空格</div></div>';
 }else{
  const totals=G.totals(s),point=n=>[10+n[0]*20,10+n[1]*20];
  $('play').innerHTML='<div class="island-wrap"><div class="bridge-board"><div class="sea-lines"></div><svg class="bridges" viewBox="0 0 100 100" aria-hidden="true">'+s.edges.map(([a,b],i)=>{
   if(!s.links[i])return '';const [x,y]=point(s.nodes[a]),[u,v]=point(s.nodes[b]),vertical=x===u;
   return Array.from({length:s.links[i]},(_,j)=>{const o=s.links[i]===2?(j?1.1:-1.1):0;return '<line class="bridge-shadow" x1="'+(x+(vertical?o:0))+'" y1="'+(y+(vertical?0:o))+'" x2="'+(u+(vertical?o:0))+'" y2="'+(v+(vertical?0:o))+'"/><line class="bridge-line" x1="'+(x+(vertical?o:0))+'" y1="'+(y+(vertical?0:o))+'" x2="'+(u+(vertical?o:0))+'" y2="'+(v+(vertical?0:o))+'"/>';}).join('');
  }).join('')+'<line id="preview-line" hidden/></svg>'+s.nodes.map((n,i)=>'<button data-island="'+i+'" class="island '+(totals[i]===n[2]?'satisfied':totals[i]>n[2]?'over':'')+'" style="left:'+(10+n[0]*20)+'%;top:'+(10+n[1]*20)+'%" aria-label="島 '+(i+1)+'，需要 '+n[2]+' 座橋，目前 '+totals[i]+' 座"><b>'+n[2]+'</b><small>'+(totals[i]===n[2]?'✓':totals[i]>n[2]?'多 '+(totals[i]-n[2]):'缺 '+(n[2]-totals[i]))+'</small></button>').join('')+'</div><div class="bridge-caption">島上數字＝橋數</div></div>';
  if(totals.every((v,i)=>v===s.nodes[i][2])&&!G.connected(s))say('橋數對了，還有島沒連在一起');
 }
}
function commit(a){const r=G.act(state(),a);if(r.error){clearPreview();anchor=null;say(r.error,true);return false;}entries[game].actions.push(a);states[game]=r.state;anchor=null;gesture=null;save();say();render();
 if(game==='pancake'&&!matchMedia('(prefers-reduced-motion: reduce)').matches)document.querySelectorAll('.pancake-row').forEach((el,i)=>{if(i<a.n)el.animate([{transform:'scaleY(.3)',opacity:.5},{transform:'scaleY(1)',opacity:1}],{duration:260});});
 if(G.won(state())){if(!done[game].includes(state().level))done[game].push(state().level);save();render();$('win-title').textContent=game==='pancake'?'鬆餅上桌！':game==='boxes'?'搬好了！':game==='rooms'?'大家都有家了！':'小島都連起來了！';$('next').textContent=state().level<2?'下一關 →':'換個遊戲 →';$('modal').showModal();}return true;
}
function switchGame(g){game=g;anchor=null;gesture=null;$('modal').close();say();const u=new URL(location.href);u.searchParams.set('game',g);history.replaceState({},'',u);render();}
function reset(level=state().level){entries[game]={level,actions:[]};states[game]=G.fresh(game,level);anchor=null;gesture=null;$('modal').close();say();save();render();}
function clearPreview(){document.querySelectorAll('.preview,.selected').forEach(el=>el.classList.remove('preview','selected'));$('preview-line')?.setAttribute('hidden','');}
function roomPreview(a,b){clearPreview();const cells=G.cells(state(),a,b);cells.forEach(i=>document.querySelector('[data-room="'+i+'"]')?.classList.add('preview'));say(cells.length+' 格');}
function chooseRoom(i){if(anchor!==null){const a=anchor;anchor=null;commit({type:'rect',a,b:i});return;}if(state().rects.some(r=>G.cells(state(),...r).includes(i))){commit({type:'remove',cell:i});return;}anchor=i;roomPreview(i,i);}
function chooseIsland(i){if(anchor===null){anchor=i;clearPreview();document.querySelector('[data-island="'+i+'"]').classList.add('selected');return;}if(anchor===i){anchor=null;clearPreview();return;}const a=anchor;anchor=null;commit({type:'link',a,b:i});}
const dirs={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
function move(dir){if(game!=='boxes'||$('modal').open)return;const [dx,dy]=dirs[dir];commit({type:'move',dx,dy});}
$('play').addEventListener('click',e=>{
 const flip=e.target.closest('[data-flip]');if(flip){commit({type:'flip',n:Number(flip.dataset.flip)});return;}
 const direction=e.target.closest('[data-dir]');if(direction){move(direction.dataset.dir);return;}
 const tile=e.target.closest('[data-cell]');if(tile){const i=Number(tile.dataset.cell),s=state();if(s.boxes.includes(i)){const dx=i%s.w-s.player%s.w,dy=Math.floor(i/s.w)-Math.floor(s.player/s.w);if(Math.abs(dx)+Math.abs(dy)!==1){say('走到箱子旁，再推',true);return;}commit({type:'move',dx,dy});}else commit({type:'walk',to:i});return;}
 if(e.detail===0){const room=e.target.closest('[data-room]'),island=e.target.closest('[data-island]');if(room)chooseRoom(Number(room.dataset.room));if(island)chooseIsland(Number(island.dataset.island));}
});
$('play').addEventListener('pointerdown',e=>{
 const cell=e.target.closest('[data-room]'),island=e.target.closest('[data-island]');if(!cell&&!island||e.button!==0)return;
 gesture={kind:cell?'room':'island',start:Number(cell?cell.dataset.room:island.dataset.island),pointer:e.pointerId};$('play').setPointerCapture(e.pointerId);
});
$('play').addEventListener('pointermove',e=>{
 if(!gesture)return;const target=document.elementFromPoint(e.clientX,e.clientY);
 if(gesture.kind==='room'){const cell=target?.closest('[data-room]');if(cell)roomPreview(gesture.start,Number(cell.dataset.room));}
 else{const board=document.querySelector('.bridge-board').getBoundingClientRect(),n=state().nodes[gesture.start],line=$('preview-line');line.removeAttribute('hidden');line.setAttribute('x1',10+n[0]*20);line.setAttribute('y1',10+n[1]*20);line.setAttribute('x2',(e.clientX-board.left)/board.width*100);line.setAttribute('y2',(e.clientY-board.top)/board.height*100);}
});
$('play').addEventListener('pointerup',e=>{
 if(!gesture)return;const g=gesture;gesture=null;$('play').releasePointerCapture(e.pointerId);
 const target=document.elementFromPoint(e.clientX,e.clientY)?.closest(g.kind==='room'?'[data-room]':'[data-island]');
 if(!target){anchor=null;clearPreview();say();return;}
 const end=Number(g.kind==='room'?target.dataset.room:target.dataset.island);
 if(end!==g.start){anchor=null;commit(g.kind==='room'?{type:'rect',a:g.start,b:end}:{type:'link',a:g.start,b:end});}
 else if(g.kind==='room')chooseRoom(end);else chooseIsland(end);
});
$('play').addEventListener('pointercancel',()=>{gesture=null;anchor=null;clearPreview();say();});
$('play').addEventListener('pointerover',e=>{const b=e.target.closest('[data-flip]');if(!b)return;document.querySelectorAll('.pancake-row').forEach((el,i)=>el.classList.toggle('preview',i<Number(b.dataset.flip)));});
$('play').addEventListener('pointerleave',()=>{if(game==='pancake')clearPreview();});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){anchor=null;gesture=null;clearPreview();say();return;}
 if(game!=='boxes'||$('modal').open||e.target.closest('#games,#levels,.controls'))return;
 const dir={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'}[e.key];if(dir){e.preventDefault();move(dir);}
});
document.addEventListener('contextmenu',e=>{if(anchor!==null||gesture){e.preventDefault();anchor=null;gesture=null;clearPreview();say();}});
$('games').addEventListener('click',e=>{const b=e.target.closest('[data-game]');if(b)switchGame(b.dataset.game);});
$('levels').addEventListener('click',e=>{const b=e.target.closest('[data-level]');if(b)reset(Number(b.dataset.level));});
$('undo').addEventListener('click',()=>{if(!entries[game].actions.length)return;entries[game].actions.pop();states[game]=G.replay(game,entries[game]);anchor=null;gesture=null;say();save();render();});
$('reset').addEventListener('click',()=>reset());
$('stay').addEventListener('click',()=>$('modal').close());
$('next').addEventListener('click',()=>{if(state().level<2)reset(state().level+1);else{const keys=Object.keys(meta);switchGame(keys[(keys.indexOf(game)+1)%keys.length]);}});
render();save();
})();