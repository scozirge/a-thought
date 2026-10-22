(()=>{
'use strict';const G=Treasure,$=id=>document.getElementById(id),storage='treasure-pack-v1';
const names=['綠寶石','皇冠','金杯','魔法書','珍珠','寶劍','金壺','紅寶石','懷錶','月亮石','寶箱','王冠戒','水晶','護身符'];
const locations=['林間小徑','藏寶樹洞','溪邊營地','森林遺跡','古老石門','月光神殿','地下寶庫','巨龍洞穴','國王密室','最後的寶藏'];
const shapes=[
'<path d="M25 23h50l14 22-39 43L11 45z" fill="#82bda1"/><path d="m25 23 11 22 14-22 14 22 11-22M11 45h78M36 45l14 43 14-43" fill="none"/><path d="m31 29 7 12" stroke="#e9ffe3" stroke-width="5"/>',
'<path d="m14 35 21 15 15-29 15 29 21-15-8 43H22z" fill="#eac671"/><path d="M23 68h54M50 39v24"/><circle cx="50" cy="56" r="7" fill="#bd817b"/><circle cx="14" cy="32" r="5" fill="#f4d88e"/><circle cx="50" cy="18" r="5" fill="#f4d88e"/><circle cx="86" cy="32" r="5" fill="#f4d88e"/>',
'<path d="M30 24h40v29q-20 26-40 0zM50 64v18M33 86h34" fill="#e8c77d"/><path d="M30 30H16v12q0 15 20 13M70 30h14v12q0 15-20 13" fill="none"/><path d="M37 30v20" stroke="#fff1b9" stroke-width="5"/>',
'<path d="M24 21h53v63H24q-10-4-10-12V33q0-12 10-12" fill="#a999bd"/><path d="M24 21v63M16 75h61" fill="none"/><path d="m50 34 4 10 12 4-12 4-4 12-4-12-11-4 11-4z" fill="#f4dba2"/>',
'<path d="M15 70Q50 21 85 70q-35 28-70 0" fill="#dcc4b6"/><path d="m24 69 17 9m35-9-17 9" fill="none"/><circle cx="50" cy="55" r="23" fill="#f9efde"/><path d="M37 49q0-11 13-12" stroke="#fff" stroke-width="6" fill="none"/>',
'<path d="m70 15 14 2 1 14-45 44-14-14z" fill="#a7c6cd"/><path d="m32 65 39-39" stroke="#e9f5ec" stroke-width="4"/><path d="m21 55 26 26-8 7-26-26z" fill="#dcb874"/><path d="m25 74-13 14" stroke="#8e6c54" stroke-width="10"/>',
'<path d="M34 18h31v15q25 18 15 43-30 19-60 0-9-25 14-43z" fill="#dcb982"/><path d="M34 27h31M28 66q22 13 44 0" fill="none"/><path d="M73 39q28-3 12 27" fill="none"/><path d="M35 42q-8 9-7 15" stroke="#fce4af" stroke-width="5" fill="none"/>',
'<path d="m28 22 44 0 17 27-39 39L11 49z" fill="#ca8292"/><path d="M11 49h78M28 22l8 27 14-27 14 27 8-27M36 49l14 39 14-39" fill="none"/><path d="m29 30 5 13" stroke="#ffd5df" stroke-width="5"/>',
'<circle cx="50" cy="18" r="9" fill="none"/><circle cx="50" cy="57" r="32" fill="#e5c782"/><circle cx="50" cy="57" r="24" fill="#fbefd2"/><path d="M50 39v19l13 7" fill="none"/><circle cx="50" cy="57" r="3" fill="#ad8757"/>',
'<path d="M67 17a37 37 0 1 0 16 60A36 36 0 0 1 67 17" fill="#e2c888"/><path d="m74 26 3 7 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#a9bfd1"/>',
'<path d="M17 45q0-27 33-27t33 27v36H17z" fill="#ba8a64"/><path d="M17 47h66M29 23v57M71 23v57" fill="none" stroke="#ead39b" stroke-width="7"/><rect x="43" y="43" width="14" height="20" rx="3" fill="#e6c680"/><circle cx="50" cy="51" r="2" fill="#715541"/>',
'<ellipse cx="50" cy="65" rx="24" ry="22" fill="none" stroke="#d9b371" stroke-width="10"/><path d="m33 24 34 0 9 14-26 24-26-24z" fill="#b5a1c8"/><path d="M24 38h52M43 25l7 37 8-37" fill="none"/>',
'<path d="m34 27 16-15 17 17v43L50 89 33 72z" fill="#a6c6d4"/><path d="m34 27 16 13 17-11M50 40v49" fill="none"/><path d="m19 53 13-9 1 29 10 9-17-1z" fill="#b8d8d6"/>',
'<path d="M28 14q0 42 22 54 22-12 22-54" fill="none"/><path d="m50 45 22 23-22 23-22-23z" fill="#cfb786"/><circle cx="50" cy="68" r="10" fill="#91b8a2"/>'
];
function art(i){return '<svg viewBox="0 0 100 100" aria-hidden="true"><g stroke="#705f4e" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">'+shapes[i%shapes.length]+'</g></svg>';}
const weightIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7a3 3 0 1 1 6 0M6 8h12l3 13H3z" fill="currentColor"/></svg>',coinIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#d4a745"/><circle cx="12" cy="12" r="7" fill="none" stroke="#fff1b3"/><path d="M12 7v10M9 9h5q3 3-4 5h5" fill="none" stroke="#8b642f" stroke-width="1.5"/></svg>';
const bagArt='<svg viewBox="0 0 180 150" aria-hidden="true"><ellipse cx="90" cy="140" rx="65" ry="6" fill="#4c59491a"/><path d="M66 38V27q24-26 48 0v11" fill="none" stroke="#82654b" stroke-width="10"/><rect x="26" y="48" width="128" height="88" rx="25" fill="#9d805e" stroke="#6e5945" stroke-width="3"/><path d="M29 57q61-39 122 0l-13 43H42z" fill="#d1b289" stroke="#6e5945" stroke-width="3"/><path d="M39 120h102" stroke="#ba9c76" stroke-dasharray="4 4"/><rect x="79" y="73" width="22" height="38" rx="6" fill="#b89058" stroke="#715a3d" stroke-width="3"/><rect x="82" y="84" width="16" height="13" rx="3" fill="#e3c17b" stroke="#715a3d" stroke-width="2"/><path d="m124 39 5-13 12 3-2 17" fill="#8fa87e" stroke="#5a7754" stroke-width="2"/></svg>';
let restored;try{restored=G.restore(localStorage.getItem(storage));}catch(_){restored=G.restore(null);}
let {level,selected,done}=restored,history=[],drag=null,suppressClick=false;
const l=()=>G.levels[level];
function save(){try{localStorage.setItem(storage,JSON.stringify({version:1,level,selected,done}));}catch(_){}}
function message(text='',bad=false){$('status').textContent=text;$('status').className=bad?'error':'';}
function render(){
 const focused=document.activeElement,focusItem=focused?.dataset.item,focusPacked=focused?.dataset.packed,focusLevel=focused?.dataset.level;
 const t=G.check(level,selected);
 $('levels').innerHTML=G.levels.map((_,i)=>'<button data-level="'+i+'" class="'+(i===level?'active':'')+'" aria-current="'+(i===level?'step':'false')+'" aria-label="第 '+(i+1)+' 關'+(done.includes(i)?'，已完成':'')+'">'+(i+1)+(done.includes(i)?'<span class="tick">✓</span>':'')+'</button>').join('');
 $('difficulty').textContent='第 '+(level+1)+' 關 · '+(level<2?'初次探險':level<5?'開始動腦':level<8?'高手挑戰':'寶藏大師');
 $('title').textContent=locations[level];$('count').textContent=l().items.length+' 件寶物';
 $('items').innerHTML=l().items.map(([w,v],i)=>'<button class="item '+(selected.includes(i)?'chosen':'')+'" data-item="'+i+'" aria-pressed="'+selected.includes(i)+'" aria-label="'+names[i]+'，重量 '+w+'，金幣 '+v+'，'+(selected.includes(i)?'點一下拿出':'點一下放入')+'"><span class="item-state" aria-hidden="true">'+(selected.includes(i)?'✓':'＋')+'</span><div class="item-art">'+art(i)+'</div><span class="item-name">'+names[i]+'</span><div class="item-stats"><span class="item-weight">'+weightIcon+'<b>'+w+'</b></span><span class="item-gold">'+coinIcon+'<b>'+v+'</b></span></div></button>').join('');
 $('weight').textContent=t.weight;$('value').textContent=t.value;$('capacity').textContent=l().capacity;$('target').textContent=l().target;
 $('weight-bar').style.width=Math.min(100,t.weight/l().capacity*100)+'%';$('gold-bar').style.width=Math.min(100,t.value/l().target*100)+'%';
 $('weight-note').textContent=t.over?'超重 '+t.over:'最多 '+l().capacity;
 $('gold-note').textContent=t.short?'還差 '+t.short:'夠了 ✓';
 $('bag').classList.toggle('over',t.over>0);$('bag').classList.toggle('ready',t.won);
 $('finish').classList.toggle('ready',t.won);
 $('packed').innerHTML=selected.length?selected.map(i=>'<button data-packed="'+i+'" aria-label="拿出'+names[i]+'" title="拿出'+names[i]+'">'+art(i)+'<span aria-hidden="true">−</span></button>').join(''):'<span class="empty-bag">把寶物放進來</span>';
 $('undo').disabled=history.length===0;
 const selector=focusItem!==undefined?'[data-item="'+focusItem+'"]':focusPacked!==undefined?(selected.includes(Number(focusPacked))?'[data-packed="'+focusPacked+'"]':'[data-item="'+focusPacked+'"]'):focusLevel!==undefined?'[data-level="'+focusLevel+'"]':null;
 if(selector)document.querySelector(selector)?.focus({preventScroll:true});
}
function change(i,want){if(want!==undefined&&selected.includes(i)===want)return;history.push(selected.slice());selected=G.toggle(level,selected,i);message();save();render();const el=document.querySelector('[data-item="'+i+'"]');if(!matchMedia('(prefers-reduced-motion: reduce)').matches)el?.animate([{transform:'scale(.94)'},{transform:'scale(1)'}],{duration:180});}
function start(n){cancelDrag();level=n;selected=[];history=[];$('win').close();message();save();render();window.scrollTo({top:0,behavior:'instant'});}
function finish(){const t=G.check(level,selected);if(t.over){message('太重了，拿出一些寶物',true);return;}if(t.short){message('還差 '+t.short+' 金幣，再換換看',true);return;}
 if(!done.includes(level))done.push(level);save();render();
 $('win-kicker').textContent=level===9?'最後一關完成':'第 '+(level+1)+' 關完成';$('win-title').textContent=level===9?'寶藏大師！':'寶物帶走了！';
 $('win-loot').innerHTML=selected.map(i=>art(i)).join('');$('win-text').textContent=t.value+' 金幣 · 重量 '+t.weight+' / '+l().capacity;
 $('next').textContent=level===9?(done.length===10?'再玩一次':'挑戰其他關'):'下一關 →';$('win').showModal();
}
function cancelDrag(){if(drag){try{drag.el.releasePointerCapture(drag.id);}catch(_){}drag.ghost?.remove();drag=null;}document.querySelectorAll('.drop-target').forEach(e=>e.classList.remove('drop-target'));document.body.classList.remove('dragging');}
document.addEventListener('pointerdown',e=>{const el=e.target.closest('[data-item],[data-packed]');if(!el||e.button!==0||$('win').open)return;drag={el,id:e.pointerId,item:Number(el.dataset.item??el.dataset.packed),fromBag:el.hasAttribute('data-packed'),x:e.clientX,y:e.clientY,moved:false};el.setPointerCapture(e.pointerId);});
document.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const d=drag;if(!d.moved&&Math.hypot(e.clientX-d.x,e.clientY-d.y)>9){d.moved=true;d.ghost=document.createElement('div');d.ghost.className='drag-ghost';d.ghost.innerHTML=art(d.item);document.body.append(d.ghost);document.body.classList.add('dragging');}
 if(d.moved){e.preventDefault();d.ghost.style.left=e.clientX+'px';d.ghost.style.top=e.clientY+'px';const target=document.elementFromPoint(e.clientX,e.clientY);$('bag').classList.toggle('drop-target',!!target?.closest('#bag'));$('items').classList.toggle('drop-target',!!target?.closest('#items'));}},{passive:false});
document.addEventListener('pointerup',e=>{if(!drag||e.pointerId!==drag.id)return;const d=drag,target=document.elementFromPoint(e.clientX,e.clientY);cancelDrag();if(d.moved){suppressClick=true;setTimeout(()=>suppressClick=false,0);if(target?.closest('#bag'))change(d.item,true);else if(target?.closest('#items'))change(d.item,false);}});
document.addEventListener('pointercancel',cancelDrag);
document.addEventListener('keydown',e=>{if(e.key==='Escape')cancelDrag();});
document.addEventListener('contextmenu',e=>{if(drag){e.preventDefault();cancelDrag();}});
$('items').addEventListener('click',e=>{if(suppressClick)return;const b=e.target.closest('[data-item]');if(b)change(Number(b.dataset.item));});
$('packed').addEventListener('click',e=>{if(suppressClick)return;const b=e.target.closest('[data-packed]');if(b)change(Number(b.dataset.packed));});
$('levels').addEventListener('click',e=>{const b=e.target.closest('[data-level]');if(b)start(Number(b.dataset.level));});
$('undo').addEventListener('click',()=>{if(history.length){selected=history.pop();message();save();render();}});
$('reset').addEventListener('click',()=>start(level));$('finish').addEventListener('click',finish);$('stay').addEventListener('click',()=>$('win').close());$('next').addEventListener('click',()=>start(level<9?level+1:done.length===10?0:G.levels.findIndex((_,i)=>!done.includes(i))));
$('bag-picture').innerHTML=bagArt;$('weight-icon').innerHTML=weightIcon;$('coin-icon').innerHTML=coinIcon;render();
})();