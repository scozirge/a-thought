'use strict';
const G = Together, canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
const select = document.getElementById('levels'), names = ['貓咪', '狗狗'];
const query = new URLSearchParams(location.search), showTips = query.get('tip') === 'true';
const ui = Object.fromEntries(['success', 'failure', 'fail-title', 'retry', 'message', 'key-progress', 'key-count', 'key-slots', 'mode-status', 'mechanic-status', 'home-count', 'win-title', 'next', 'answer-toggle', 'answer-panel', 'answer-label', 'answer-title', 'answer-steps', 'announcement'].map(id => [id, document.getElementById(id)]));
const playerStatuses = names.map((_, i) => document.getElementById(`player-status-${i}`));
const keyIcon = '<svg class="icon" aria-hidden="true"><use href="#key-icon"/></svg>';
let state = G.fresh(), last = 0, accumulator = 0, completed = [], effects = [], hudSignature = '', finaleStarted = 0;
const finale = document.getElementById('finale'), finaleCanvas = document.getElementById('finale-art');
const allComplete = () => G.levels.every(l => completed.includes(l.saveKey));
const progressKey = 'together-home-curated-v4';
try {
  const saved = localStorage.getItem(progressKey);
  if (saved !== null) {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) completed = [...new Set(parsed.filter(key => G.levels.some(l => l.saveKey === key)))];
  } else {
    const old = JSON.parse(localStorage.getItem('together-home-platform-v3') || '[]');
    if (Array.isArray(old)) completed = G.levels.filter(l => l.legacyId !== undefined && old.includes(l.legacyId)).map(l => l.saveKey);
  }
} catch {}
const mainCount = G.levels.filter(l => l.group === 'main').length;
const levelLabel = l => `第 ${l.id + 1} 關`;
const originalControls = [...document.querySelectorAll('[data-action]')].map(b => ({ b, html: b.innerHTML, label: b.getAttribute('aria-label') }));
const held = new Set(), touch = [new Set(), new Set()], jumpQueue = [false, false], specialQueue = [false, false];
const mapping = { KeyA: [0, 'left'], KeyD: [0, 'right'], KeyW: [0, 'jump'], KeyS: [0, 'special'], ArrowLeft: [1, 'left'], ArrowRight: [1, 'right'], ArrowUp: [1, 'jump'], ArrowDown: [1, 'special'] };
function options() {
  select.innerHTML = G.levels.map(l => `<option value="${l.id}">${completed.includes(l.saveKey) ? '✓ ' : ''}${levelLabel(l)} · ${l.name}</option>`).join('');select.value = state.level;
}
function toggleAnswer(open) {
  open = showTips && open;
  ui['answer-toggle'].setAttribute('aria-expanded', String(open)); ui['answer-panel'].hidden = !open;
  ui['answer-label'].textContent = open ? '收起解答' : '看解答';
}
function reset(level = state.level) {
  if(finale.open)finale.close();
  state = G.fresh(level); clearInput(); accumulator = 0; last = 0; effects = []; hudSignature = '';
  ui.success.hidden = true; ui.failure.hidden = true; ui.announcement.textContent = ''; options(); toggleAnswer(showTips);
  document.querySelector('.answer-section').hidden = !showTips; ui.message.hidden = !showTips;
  const l = G.levels[level]; ui['answer-title'].textContent = `${levelLabel(l)} · ${l.name}`;
  ui['answer-steps'].replaceChildren(...(showTips ? l.solution : []).map(step => { const li = document.createElement('li'); li.textContent = step; return li; }));
  ui['key-slots'].innerHTML = l.keys.map((_, i) => `<span class="key-slot" data-key="${i}">${keyIcon}</span>`).join('');
  document.querySelector('.controls').classList.toggle('special-controls', !!l.jumpSwap);
  originalControls.forEach(({ b, html, label }) => { b.innerHTML = html; b.setAttribute('aria-label', label); });
  if (l.jumpSwap) for (let i = 0; i < 2; i++) {
    const b = document.querySelector(`[data-player="${i}"] [data-action="jump"]`);
    b.lastElementChild.textContent = i ? '貓跳' : '狗跳'; b.setAttribute('aria-label', `${names[i]}幫${names[1-i]}跳躍`);
  }
  for (let i = 0; i < 2; i++) {
    const special = document.querySelector(`[data-player="${i}"] [data-action="special"]`);
    const action = l.gravityFlip ? '翻朋友' : '';
    special.hidden = !action;
    special.lastElementChild.textContent = action;
    special.setAttribute('aria-label', `${names[i]}${action}`);
  }
  canvas.focus({ preventScroll: true }); draw(0);
}
function clearInput() { held.clear(); touch.forEach(s => s.clear()); jumpQueue.fill(false); specialQueue.fill(false); document.querySelectorAll('.pressed').forEach(b => b.classList.remove('pressed')); }
function active(i, action) { return touch[i].has(action) || Object.entries(mapping).some(([key, a]) => a[0] === i && a[1] === action && held.has(key)); }
function inputs() { return [0, 1].map(i => ({ axis: Number(active(i, 'right')) - Number(active(i, 'left')), jump: jumpQueue[i], special: specialQueue[i] })); }
window.addEventListener('keydown', e => {
  if(finale.open)return;
  if (state.failed && !e.repeat && (e.code === 'Enter' || e.code === 'KeyR')) { e.preventDefault(); reset(); return; }
  if (e.target.closest('select,input,textarea')) return;
  const a = mapping[e.code]; if (!a) return; e.preventDefault();
  if (!held.has(e.code) && !e.repeat) { if (a[1] === 'jump') jumpQueue[a[0]] = true; if (a[1] === 'special') specialQueue[a[0]] = true; } held.add(e.code);
});
window.addEventListener('keyup', e => { if (mapping[e.code] && !e.target.closest('select,input,textarea')) e.preventDefault(); held.delete(e.code); });
window.addEventListener('blur', clearInput);
document.addEventListener('visibilitychange', () => { clearInput(); last = 0; accumulator = 0; });
for (const b of document.querySelectorAll('[data-action]')) {
  const i = +b.closest('[data-player]').dataset.player, action = b.dataset.action;
  b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); touch[i].add(action); if (action === 'jump') jumpQueue[i] = true; if (action === 'special') specialQueue[i] = true; b.classList.add('pressed'); });
  const release = () => { touch[i].delete(action); b.classList.remove('pressed'); };
  b.addEventListener('pointerup', release); b.addEventListener('pointercancel', release); b.addEventListener('lostpointercapture', release);
}
select.onchange = () => reset(+select.value);
document.getElementById('restart').onclick = () => reset(); document.getElementById('again').onclick = () => reset(); ui.retry.onclick = () => reset();
ui.next.onclick = () => reset((state.level + 1) % G.levels.length);
document.getElementById('finale-close').onclick=()=>finale.close();
finale.addEventListener('close',()=>{clearInput();canvas.focus({preventScroll:true});});
ui['answer-toggle'].onclick = () => { clearInput(); toggleAnswer(ui['answer-panel'].hidden); };
document.querySelectorAll('[data-avatar]').forEach(c => TogetherArt.avatar(c, +c.dataset.avatar));
function updateHud() {
  const l = G.levels[state.level], stage=!l.ascent?-1:l.roof&&Math.min(...state.players.map(p=>p.x))>=3020?4:Math.min(...state.players.map(p=>p.x))<1000?0:!state.collected[0]?1:Math.max(...state.players.map(p=>p.y+44))> -300?2:3;
  const signature = JSON.stringify([state.level,stage,state.mode,state.gravity,state.collected,state.collectedBy,state.players.map(p=>p.exited),state.latched,state.won,state.failed,state.fallen,G.canHelp(state,l)]);
  if (signature === hudSignature) return; hudSignature = signature;
  const count = state.collected.filter(Boolean).length, home = state.players.filter(p => p.exited).length;
  ui['key-count'].textContent = state.key ? `鑰匙齊了 ${count} / ${l.keys.length}` : `鑰匙 ${count} / ${l.keys.length}`;
  ui['key-progress'].classList.toggle('ready', state.key); ui['home-count'].textContent = `到家 ${home} / 2`;
  const status = [];
  if(l.gravityFlip)status.push(`貓 ${state.gravity[0] === -1 ? '↑' : '↓'} · 狗 ${state.gravity[1] === -1 ? '↑' : '↓'}`);
  if(showTips){
    if(l.ice)status.push('冰上會滑');
    if(l.ascent)status.push(['① 日月冰橋','② 重量踏板','③ 雙層接應',l.towerOnly?'④ 合作登頂':'④ 日月登頂','⑤ 雲端接棒'][stage]);
    else if(l.balances)status.push(state.collected[0]?'踏板已固定':'跳起改變重量');
    if(l.helpRange)status.push(G.canHelp(state,l)?'靠近可幫忙':'太遠了，先靠近');
    if(l.fallY!==undefined)status.push('掉落會失敗');
  }
  ui['mechanic-status'].hidden = !status.length; ui['mechanic-status'].textContent = status.join('｜');
  ui['mode-status'].hidden = !l.switches?.length && !l.phaseOnJump;
  ui['mode-status'].textContent = state.mode ? '☾ 月亮亮起' : '☀ 太陽亮起';
  ui['mode-status'].classList.toggle('moon', state.mode === 1);
  [...ui['key-slots'].children].forEach((slot, i) => {
    slot.classList.toggle('collected', state.collected[i]);
    const description = `第 ${i + 1} 把鑰匙：${state.collected[i] ? `${names[state.collectedBy[i]]}已拿到` : l.keys[i].owner !== undefined ? `等${names[l.keys[i].owner]}來拿` : '還沒拿到'}`;
    slot.setAttribute('aria-label', description); slot.title = description;
  });
  playerStatuses.forEach((element, i) => {
    const n = state.collectedBy.filter(actor => actor === i).length, arrived = state.players[i].exited;
    const description = n ? `拿到 ${n} 把鑰匙` : state.key ? '一起回家吧' : '還沒拿到鑰匙';
    element.innerHTML = (n ? keyIcon : '') + (arrived ? `已到家${n ? ` · ${n} 把鑰匙` : ''}` : description);
    element.classList.toggle('has-key', n > 0); element.classList.toggle('arrived', arrived);
  });
  const gatesLeft = l.legacy && state.latched.some(v => !v);
  ui.message.textContent = showTips ? ((l.preview || l.mix) && !state.won ? l.hint : state.key ? (gatesLeft ? '踩住按鈕，讓朋友先過門。' : '鑰匙齊了，一起到小屋！') : l.hint) : '';
  ui.failure.hidden = !state.failed; ui['fail-title'].textContent = state.failed ? `${names[state.fallen]}掉出去了！` : '';
  ui.success.hidden = !state.won; ui['win-title'].textContent = completed.length === mainCount ? `${mainCount} 關全部完成！` : `${levelLabel(l)}完成，一起回家了！`;
  ui.next.textContent = state.level === mainCount - 1 ? '回第一關' : '下一關 →';
  canvas.setAttribute('aria-label', `${levelLabel(l)} ${l.name}。已拿 ${count} 把鑰匙，共 ${l.keys.length} 把；${home} 人到家。`);
}
function draw(time) { TogetherArt.scene(ctx, canvas, state, G, effects, time, showTips); updateHud();if(finale.open)TogetherArt.finale(finaleCanvas,matchMedia('(prefers-reduced-motion: reduce)').matches?4:(time-finaleStarted)/1000); }
function frame(time) {
  if (!last) last = time; accumulator += Math.min((time - last) / 1000, .05); last = time;
  while (accumulator >= 1 / 120) {
    const before = state; state = G.step(state, inputs()); jumpQueue.fill(false); specialQueue.fill(false); accumulator -= 1 / 120;
    if (!before.failed && state.failed) { clearInput(); ui.announcement.textContent = `${names[state.fallen]}掉出去了，按重試本關再挑戰。`; }
    const pickups = [];
    state.collected.forEach((collected, i) => {
      if (collected && !before.collected[i]) { effects.push({ key: i, time }); pickups.push(`${names[state.collectedBy[i]]}拿到第 ${i + 1} 把鑰匙！`); }
    });
    if (pickups.length) ui.announcement.textContent = pickups.join('') + (state.key ? '鑰匙齊了，一起到小屋！' : '');
    if (!before.won && state.won) {
      const previouslyComplete=allComplete();
      clearInput(); ui.announcement.textContent = `${levelLabel(G.levels[state.level])}完成，貓咪和狗狗都到家了！`;
      const key = G.levels[state.level].saveKey;
      if (!completed.includes(key)) { completed.push(key); try { localStorage.setItem(progressKey, JSON.stringify(completed)); } catch {} options(); }
      if(!previouslyComplete&&allComplete()){
        finaleStarted=time;clearInput();finale.showModal();document.getElementById('finale-close').focus();
        ui.announcement.textContent='20 關全部完成！你們是最佳拍檔！';
      }
    }
  }
  effects = effects.filter(effect => time - effect.time < 900); draw(time); requestAnimationFrame(frame);
}
window.readGame = () => JSON.parse(JSON.stringify(state));
window.readCamera = () => G.camera(state);
const preview = G.levels.findIndex(l => l.preview === query.get('preview'));
const requestedLevel = preview >= 0 ? preview : Number(query.get('level')) - 1;
reset(Number.isInteger(requestedLevel) && requestedLevel >= 0 && requestedLevel < G.levels.length ? requestedLevel : 0); requestAnimationFrame(frame);
