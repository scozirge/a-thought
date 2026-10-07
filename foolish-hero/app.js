import { COMMANDS, LEVELS, STEP_MS, MAX_STEPS, clone, same, makeRound, formatSteps, submitProgram, advanceRound, initialRobot, solveLevel, stepRobot } from './game.js';

const $ = id => document.getElementById(id);
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SESSION_KEY = 'adventure-relay-session-v2';
const LOCAL_MULTIPLAYER = document.documentElement.dataset.mode !== 'solo';
const solo = { id: 'solo', name: '小勇者', isHost: true, color: '#52866a', online: true };
let state, mode = 'solo', playerId = solo.id, token = '', stream, timer, toastTimer;
let selectedSlot = 0, drafts = new Map(), mapKey = '', showRoute = false, connected = true, pending = false, renderedPhase = '';
let editLevel = clone(LEVELS[0]), brush = 'wall', networkAddresses = [];
const me = () => state.members.find(m => m.id === playerId);
const isHost = () => me()?.isHost;
const slotsFor = id => state.round.owners.flatMap((owner, i) => owner === id ? [i] : []);
const myDraft = () => {
  const key = `${state.round.roundId}:${playerId}`;
  if (!drafts.has(key)) drafts.set(key, slotsFor(playerId).map(i => state.round.seedCommands?.[i] || null));
  return drafts.get(key);
};
const canEdit = () => state.round.phase === 'editing' && slotsFor(playerId).length > 0 && !state.round.submitted.includes(playerId) && connected && !pending;
function toast(text) { $('toast').textContent = text; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 4000); }
function acceptState(next) {
  if (!next.members.some(m => m.id === playerId)) return removedFromRoom();
  const previous = state?.round;
  if (previous?.roundId !== next.round.roundId) { drafts.clear(); selectedSlot = 0; showRoute = false; }
  else if (previous.assignmentVersion !== next.round.assignmentVersion) {
    const key = `${previous.roundId}:${playerId}`, oldSlots = slotsFor(playerId), oldDraft = drafts.get(key) || [];
    drafts.set(key, next.round.owners.flatMap((id, i) => id === playerId ? [oldDraft[oldSlots.indexOf(i)] ?? previous.commands[i] ?? next.round.seedCommands?.[i] ?? null] : []));
  }
  if (next.round.phase === 'result' && !next.round.success) drafts.clear();
  state = next; render();
}
function startSolo(level = LEVELS[0]) {
  stream?.close(); clearInterval(timer); mode = 'solo'; token = ''; playerId = solo.id; connected = true; drafts.clear(); mapKey = '';
  acceptState({ code: '', members: [clone(solo)], round: makeRound(level, [solo], 2, (state?.round.roundId || 0) + 1), messages: [] });
}

// Original SVG scenery and characters; the grid always uses screen-relative directions.
function coord([x, y]) { const n = state.round.level.size, step = 450 / n; return [95 + step * (x + .5), 63 + step * (y + .5)]; }
function swordArt(scale = 1) { return `<g transform="scale(${scale})"><path d="M-5 6V-28l5-8 5 8V6Z" fill="#f5efce" stroke="#667c77" stroke-width="2"/><path d="M0-29V4" stroke="#afc7be" stroke-width="2"/><path d="M-11 5h22" stroke="#c7a45b" stroke-width="6" stroke-linecap="round"/><path d="M0 8v12" stroke="#826342" stroke-width="6"/><circle cy="22" r="4" fill="#d3ae60"/></g>`; }
function heroArt(armed) { return `<ellipse cy="17" rx="23" ry="7" fill="#3e50472b"/><path d="M-12-9-21 12q22 12 43 0L12-12" fill="#be764b"/><path d="M-8 9v9m17-9v9" stroke="#554f44" stroke-width="9" stroke-linecap="round"/><path d="M-13-13h26v26h-26Z" fill="#5a8968"/><path d="M-12 4h24" stroke="#cfa86a" stroke-width="5"/><rect x="-18" y="-42" width="36" height="31" rx="14" fill="#eed5a7"/><path d="M-19-30q-3-26 26-20l15 19-19-6-11 10-2-11Z" fill="#6b6449"/><path d="M-24-40q15-26 40-16l9 22-27-8Z" fill="#638365"/><path d="M-26-37q23-8 51 4" stroke="#405f4e" stroke-width="7" stroke-linecap="round"/><path d="M7-53q1-17 15-16l-5 17" fill="#d5ac5c"/><circle cx="-7" cy="-25" r="2.2" fill="#3c4840"/><circle cx="7" cy="-25" r="2.2" fill="#3c4840"/><path d="M-3-18q3 2 6 0" fill="none" stroke="#b98661" stroke-width="2" stroke-linecap="round"/><path d="m-12-7-10 7m34-7 10 7" stroke="#eed5a7" stroke-width="8" stroke-linecap="round"/>${armed ? `<g transform="translate(25 -9) rotate(16)">${swordArt(.65)}</g>` : ''}`; }
function tree(x, y, s = 1) { return `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cy="12" rx="24" ry="8" fill="#486c5020"/><path d="M0 9v-45" stroke="#889579" stroke-width="7"/><path d="M-27-12q-10-17 2-27-1-20 22-24 26-4 29 21 15 19 0 31-22 10-53-1Z" fill="#a7b88f"/><path d="M-21-34q-5-16 13-20" stroke="#bdcaa4" stroke-width="7" fill="none" stroke-linecap="round"/></g>`; }
function drawWorld() {
  const { level, robot } = state.round, key = JSON.stringify(level), step = 450 / level.size;
  if (key !== mapKey) {
    mapKey = key;
    let tiles = '';
    for (let y = 0; y < level.size; y++) for (let x = 0; x < level.size; x++) {
      const p = [x, y], [cx, cy] = coord(p), half = step / 2 - 2;
      const special = same(p, level.sword) || same(p, level.goal), start = same(p, level.start);
      const fill = special ? '#e5d6ac' : start ? '#c2d0b5' : (x + y) % 2 ? '#d5dbc3' : '#dce2cd';
      tiles += `<g><rect x="${cx-half}" y="${cy-half+7}" width="${half*2}" height="${half*2}" rx="7" fill="#afbea0"/><rect x="${cx-half}" y="${cy-half}" width="${half*2}" height="${half*2}" rx="7" fill="${fill}" stroke="#eff1df70"/>${start ? `<path d="m${cx-11} ${cy+11}11-5 11 5-11 6Z" fill="none" stroke="#8caa7f" stroke-width="2"/>` : ''}</g>`;
    }
    const [sx, sy] = coord(level.sword), [gx, gy] = coord(level.goal), [mx, my] = coord(level.monster);
    $('world').innerHTML = `<defs><radialGradient id="ground"><stop stop-color="#f0f1e1"/><stop offset="1" stop-color="#e5eada"/></radialGradient><linearGradient id="portal" x2="0" y2="1"><stop stop-color="#c7dbb4"/><stop offset="1" stop-color="#83b99c"/></linearGradient><filter id="shadow"><feGaussianBlur stdDeviation="8"/></filter></defs><rect width="640" height="570" fill="url(#ground)"/><ellipse cx="324" cy="518" rx="247" ry="27" fill="#768c6b" opacity=".18" filter="url(#shadow)"/><rect x="81" y="61" width="478" height="470" rx="24" fill="#9caf8c"/><rect x="80" y="48" width="480" height="474" rx="23" fill="#b1c29c"/><rect x="89" y="55" width="462" height="458" rx="16" fill="#b9c7a6"/>${tree(57,157,.8)}${tree(581,108,.85)}${tree(570,433,1)}${tree(67,476,.7)}<g fill="#c3cbae"><ellipse cx="48" cy="353" rx="10" ry="5"/><ellipse cx="591" cy="263" rx="8" ry="4"/><ellipse cx="608" cy="279" rx="5" ry="3"/></g>${tiles}<g id="route-line"></g>
      <g transform="translate(${gx} ${gy})"><ellipse cy="23" rx="30" ry="8" fill="#5c786730"/><path d="M-29 22V-17q0-35 29-35t29 35v39" fill="#819487" stroke="#d0d9c5" stroke-width="5"/><path d="M-20 22v-38q0-24 20-24t20 24v38Z" fill="#5c7566"/><path id="portal-light" d="M-20 22v-38q0-24 20-24t20 24v38Z" fill="url(#portal)" opacity=".25"/><path id="gate-bars" d="M-10-31v52M0-36v57M10-31v52M-20-4h40M-20 11h40" stroke="#d0b478" stroke-width="4"/><path d="m-6-46 6-7 6 7-6 7Z" fill="#d9bc74"/><text y="36" text-anchor="middle" font-size="10" fill="#647a62" font-family="sans-serif">出口</text></g>
      ${level.walls.map(p => { const [x,y] = coord(p); const scale = step / 90; return `<g transform="translate(${x} ${y}) scale(${scale})"><ellipse cy="21" rx="31" ry="9" fill="#64745e30"/><path d="m-32 10 5-35 22-8 24 4 14 30-9 17-47-1Z" fill="#859780"/><path d="m-27-25 22-8 24 4 8 15-32 5-24-7Z" fill="#a1b297"/><path d="M-5-9 0 17m-27-15 21 4" fill="none" stroke="#71866d" stroke-width="2"/><path d="m-25-27 16-4 5 8-13 4Z" fill="#b7c4a0"/></g>`; }).join('')}
      <g id="sword-sprite" transform="translate(${sx} ${sy})"><ellipse cy="20" rx="24" ry="7" fill="#b39a6740"/><path d="m-21 15 5-15 20-4 17 13-5 14h-33Z" fill="#8d9b83"/>${swordArt(.9)}<path d="m-24-27 2-6 2 6 6 2-6 2-2 6-2-6-6-2Z" fill="#c4a25c"/><text y="36" text-anchor="middle" font-size="10" fill="#8e7446" font-family="sans-serif">寶劍</text></g>
      <g id="monster-sprite" transform="translate(${mx} ${my})"><ellipse cy="20" rx="29" ry="8" fill="#665d7930"/><path d="M-29 13q-6-14 5-22-3-25 24-29 27 4 25 28 13 10 4 24-22 14-58-1Z" fill="#a095b7"/><path d="M-21-13q0-13 15-17" stroke="#b6adc7" stroke-width="6" fill="none" stroke-linecap="round"/><path d="m-21-29-2-11 12 6m23 0 12-6-2 12" fill="#d8cca5"/><circle cx="-9" cy="-9" r="3" fill="#4a465f"/><circle cx="9" cy="-9" r="3" fill="#4a465f"/><path d="M-5 2q5 4 10 0" fill="none" stroke="#5d546b" stroke-width="2"/><text y="36" text-anchor="middle" font-size="10" fill="#7d718e" font-family="sans-serif">怪物</text></g><g id="hero-sprite" class="hero-sprite"></g>`;
  }
  const [x, y] = coord(robot.position), hero = $('hero-sprite');
  hero.style.transform = `translate(${x}px,${y}px)`;
  if (hero.dataset.armed !== String(robot.hasSword)) { hero.innerHTML = heroArt(robot.hasSword); hero.dataset.armed = robot.hasSword; }
  $('sword-sprite').style.opacity = robot.hasSword ? '0' : '1';
  $('monster-sprite').style.opacity = robot.monsterDefeated ? '0' : '1';
  $('gate-bars').style.opacity = robot.monsterDefeated ? '0' : '1';
  $('portal-light').setAttribute('opacity', robot.monsterDefeated ? '1' : '.25');
  if (showRoute) {
    let bot = initialRobot(level); const points = [coord(bot.position)];
    for (const command of solveLevel(level) || []) { bot = stepRobot(level, bot, command).robot; points.push(coord(bot.position)); }
    $('route-line').innerHTML = `<polyline points="${points.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#b5904b" stroke-width="4" stroke-dasharray="3 9" stroke-linecap="round" opacity=".7"/>`;
  } else $('route-line').innerHTML = '';
  const location = p => `第 ${p[1]+1} 列第 ${p[0]+1} 欄`;
  $('world').setAttribute('aria-label', `${level.size} 乘 ${level.size} 地圖。勇者在${location(robot.position)}；寶劍在${location(level.sword)}；怪物在${location(level.monster)}；出口在${location(level.goal)}。石牆：${level.walls.map(location).join('、')}。`);
}

function render() {
  const r = state.round, mine = slotsFor(playerId), submitted = r.submitted.includes(playerId), editing = canEdit();
  const failed = r.phase === 'result' && !r.success;
  const draft = myDraft(); if (failed) draft.fill(null);
  const lobby = r.phase === 'lobby', spectator = !lobby && !mine.length, online = mode === 'online';
  const active = [...new Set(r.owners)], ready = active.filter(id => r.submitted.includes(id)).length;
  const onlineCount = state.members.filter(m => m.isHost || m.online).length;
  if (!mine.includes(selectedSlot)) selectedSlot = mine.find((_,i) => !draft[i]) ?? mine[0];
  $('mission-title').textContent = r.level.name;
  $('level-number').textContent = r.level.id === 'custom' ? '自訂' : String(LEVELS.findIndex(l => l.id === r.level.id) + 1).padStart(2,'0');
  $('difficulty').textContent = r.level.difficulty || '自訂';
  $('connection-label').textContent = online ? connected ? `${state.code} · 已連線` : '重新連線中…' : '單人冒險';
  $('room-button').textContent = online ? `房間 ${state.code} ↗` : '一起玩 ↗';
  $('teacher-button').hidden = !isHost(); $('teacher-button').disabled = pending;
  $('route-button').hidden = !isHost(); $('route-button').textContent = showRoute ? '收起提示' : '看提示';
  $('route-button').setAttribute('aria-pressed', showRoute);
  $('route-hint').hidden = !showRoute; $('route-hint').textContent = r.level.hint || '先拿劍，站在怪物旁邊攻擊，再走到出口。';
  const objectives = [r.robot.hasSword, r.robot.monsterDefeated, r.robot.escaped];
  ['quest-sword','quest-monster','quest-exit'].forEach((id,i) => { $(id).className = objectives[i] ? 'done' : i === 0 || objectives[i-1] ? 'active' : ''; $(id).querySelector('span').textContent = objectives[i] ? '✓' : i+1; });
  $('my-assignment').textContent = lobby ? '開始時依人數分工' : spectator ? '下題參加' : online && r.participants.length > 1 ? `我的步驟：${formatSteps(mine)}` : `共 ${r.owners.length} 步 · 全部由你完成`;
  $('phase-badge').className = `phase-badge ${r.phase} ${r.success ? 'success' : ''}`;
  $('phase-badge').textContent = lobby ? '準備中' : r.phase === 'playing' ? r.paused ? '暫停中' : `${Math.max(0,r.playIndex+1)} / ${r.owners.length}` : r.phase === 'result' ? r.success ? '通關！' : '再想一想' : submitted ? '已送交' : '作答中';
  $('round-lobby').hidden = !lobby && !spectator;
  $('lobby-title').textContent = spectator ? '這題先觀戰' : onlineCount === 1 && isHost() ? '一個人，也能出發。' : '隊伍準備中';
  $('lobby-description').textContent = spectator ? '下一題開始時，就會分配你的步驟。' : isHost() ? `${onlineCount} 人在線，開始時分配指令。` : '等待房主開始本題。';
  $('start-round-button').hidden = !lobby || !isHost(); $('start-round-button').disabled = pending || !connected;
  $('editor-workspace').hidden = lobby || spectator;
  $('editor-help').textContent = failed ? '答案已清空，準備重新挑戰。' : r.phase === 'playing' ? '看看每一步，會發生什麼事。' : r.success ? '你完成了這段冒險！' : submitted ? '等隊友送交，就會一起出發。' : '點選指令，依序放進格子。';
  $('clear-button').disabled = !editing || !draft.some(Boolean);
  $('clear-button').textContent = online && r.participants.length > 1 ? '清空我的' : '清空';
  $('timeline').style.gridTemplateColumns = `repeat(${r.owners.length <= 6 ? 3 : 4}, minmax(0, 1fr))`;
  $('timeline').innerHTML = r.owners.map((owner,i) => {
    const member = state.members.find(m => m.id === owner) || r.participants.find(m => m.id === owner), own = owner === playerId;
    const command = failed ? null : own && !submitted ? draft[mine.indexOf(i)] : r.commands[i];
    const data = COMMANDS[command], current = i === r.playIndex && r.phase !== 'editing';
    return `<div class="timeline-slot" style="--person:${member.color}"><button class="slot-button ${data?'filled':''} ${own&&editing&&i===selectedSlot?'selected':''} ${current?'current':''} ${current&&failed?'failed':''}" data-slot="${i}" aria-label="第 ${i+1} 步，${own?'我的':escape(member.name)}，${data?data.label:'空白'}" ${!own||!editing?'disabled':''}><span class="slot-number">${String(i+1).padStart(2,'0')}</span><span class="slot-icon">${data?data.icon:'＋'}</span><span class="slot-label">${data?data.label:'　'}</span></button>${own&&editing&&command?`<button class="clear-slot" data-clear="${i}" aria-label="清除第 ${i+1} 步">×</button>`:''}${online&&r.participants.length>1?`<div class="slot-owner">${escape(member.name)}</div>`:''}</div>`;
  }).join('');
  // Leave these buttons mounted so keyboard focus survives placing a command.
  $('command-deck').querySelectorAll('button').forEach(b => { b.disabled = !editing; });
  $('submit-button').hidden = r.phase === 'result' || r.phase === 'playing';
  $('submit-button').disabled = !editing || draft.some(c => !c);
  $('submit-button').textContent = submitted ? '已送交 ✓' : active.length > 1 ? '送交我的指令 →' : '出發 →';
  $('pause-button').hidden = r.phase !== 'playing' || !isHost(); $('pause-button').disabled = pending || !connected;
  $('pause-button').textContent = r.paused ? '繼續 →' : '暫停';
  $('again-button').hidden = r.phase !== 'result' || !isHost(); $('again-button').disabled = pending || !connected;
  $('again-button').textContent = r.success ? '下一段冒險 →' : '再試一次 →';
  $('submit-hint').textContent = !connected ? '連線中斷，恢復後可繼續。' : failed ? isHost() ? '再試一次，會回到起點。' : '等待房主重新開始。' : r.phase === 'playing' ? '每 0.5 秒，執行一個指令。' : r.success ? '先後順序，就是程式的第一步。' : submitted ? `${ready} / ${active.length} 人已送交` : `已放入 ${draft.filter(Boolean).length} / ${mine.length} 個指令`;
  $('feedback-text').textContent = (r.playIndex >= 0 && r.phase !== 'editing' ? `第 ${r.playIndex+1} 步 · ` : '') + (failed ? `${r.message} 答案已清空。` : r.phase === 'editing' && mode === 'solo' ? '先拿劍，再站在怪物旁邊攻擊。' : r.message);
  $('feedback').className = `feedback ${failed?'error':r.success?'success':''}`;
  $('team-button').hidden = !online;
  $('team-status').textContent = `隊伍與討論 · ${lobby ? onlineCount+' 人在線' : ready+' / '+active.length+' 人送交'}`;
  $('team-list').innerHTML = state.members.map(m => {
    const slots = slotsFor(m.id), ready = r.submitted.includes(m.id);
    const status = !m.online ? '離線' : lobby ? '已加入' : !slots.length ? '觀戰' : ready ? '已送交' : r.phase === 'editing' ? '思考中' : '一起冒險';
    return `<div class="team-member" style="--person:${m.color}"><div class="avatar">${escape(m.name.slice(0,1))}</div><div class="member-text"><strong>${escape(m.name)}${m.isHost?' · 房主':''}${m.id===playerId?' · 我':''}</strong><small>${lobby?'等待開始':slots.length?'第 '+formatSteps(slots)+' 步':'下題參加'}</small></div><span class="member-ready">${status}</span>${online&&isHost()&&!m.isHost?`<button class="member-remove" data-remove="${m.id}" aria-label="踢出 ${escape(m.name)}">踢出</button>`:''}</div>`;
  }).join('');
  const chat = $('chat-messages'), chatMarkup = state.messages.map(m => `<p><b style="color:${m.color}">${escape(m.name)}</b>${escape(m.text)}</p>`).join('') || '<span class="muted">先一起想想路線吧。</span>';
  if (chat.innerHTML !== chatMarkup) { chat.innerHTML = chatMarkup; chat.scrollTop = chat.scrollHeight; }
  drawWorld();
  if (r.phase === 'playing' && renderedPhase !== 'playing' && matchMedia('(max-width:850px)').matches) {
    $('world').parentElement.scrollIntoView({block:'start',behavior:document.body.classList.contains('calm')?'instant':'smooth'});
  }
  renderedPhase = r.phase;
}

function placeCommand(command, target = selectedSlot) {
  if (!canEdit() || !Object.hasOwn(COMMANDS,command)) return;
  const mine = slotsFor(playerId), index = mine.indexOf(target); if (index < 0) return;
  const draft = myDraft(); draft[index] = command;
  selectedSlot = mine.find((_,i) => i > index && !draft[i]) ?? mine.find((_,i) => !draft[i]) ?? target;
  render();
}
function runSolo() { clearInterval(timer); timer = setInterval(() => { advanceRound(state.round); render(); if (state.round.phase !== 'playing') clearInterval(timer); }, STEP_MS); }
async function request(action, data = {}) {
  if (!LOCAL_MULTIPLAYER) throw new Error('公開版直接以單人模式遊玩。');
  const response = await fetch(`/api/${action}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({code:state?.code,token,...data}) });
  const result = await response.json(); if (!response.ok) throw new Error(result.error || '連線失敗，請再試一次。'); return result;
}
async function action(work) {
  if (pending) return; pending = true; render();
  try { await work(); } catch (error) { toast(error.message); } finally { pending = false; render(); }
}
async function changeRound(level = state.round.level, perPlayer = state.round.perPlayer) {
  if (mode === 'solo') { clearInterval(timer); acceptState({...state, round:makeRound(level,state.members,perPlayer,state.round.roundId+1)}); }
  else acceptState((await request('round',{level,perPlayer})).state);
}
function removedFromRoom() {
  stream?.close(); sessionStorage.removeItem(SESSION_KEY);
  document.querySelectorAll('dialog[open]').forEach(d => d.close());
  startSolo(); openRoom(); $('room-error').textContent = '你已被房主移出房間。現在可以自己冒險。';
}
function connect(result) {
  stream?.close(); clearInterval(timer); mode = 'online'; token = result.token || token; playerId = result.playerId; drafts.clear(); connected = true;
  sessionStorage.setItem(SESSION_KEY,JSON.stringify({code:result.state.code,token,playerId})); acceptState(result.state);
  stream = new EventSource(`/api/events?room=${encodeURIComponent(state.code)}&token=${encodeURIComponent(token)}`);
  stream.onmessage = e => { try { connected = true; acceptState(JSON.parse(e.data)); } catch { toast('同步沒有成功，請重新整理。'); } };
  stream.addEventListener('removed',removedFromRoom);
  stream.onopen = () => { connected = true; render(); };
  stream.onerror = () => { connected = false; render(); };
}

function renderEditor() {
  $('level-options').innerHTML = LEVELS.map((l,i) => `<button class="level-option ${l.id===editLevel.id?'selected':''}" data-level="${i}"><span class="level-index">0${i+1}</span><span><strong>${escape(l.name)}</strong><small>${l.difficulty} · ${solveLevel(l).length} 步</small></span><span class="level-stars" aria-hidden="true">${'◆'.repeat(i+1)}</span></button>`).join('');
  const brushes = [['wall','▧ 石牆'],['erase','□ 清除'],['start','⚑ 起點'],['sword','⚔ 寶劍'],['monster','♟ 怪物'],['goal','⌂ 出口']];
  $('map-brushes').innerHTML = brushes.map(([id,label]) => `<button data-brush="${id}" class="${brush===id?'selected':''}">${label}</button>`).join('');
  const n = editLevel.size; $('map-editor').style.gridTemplateColumns = `repeat(${n},1fr)`;
  $('map-editor').innerHTML = Array.from({length:n*n},(_,i) => { const p=[i%n,Math.floor(i/n)], object=['start','sword','monster','goal'].find(k=>same(p,editLevel[k])), wall=editLevel.walls.some(w=>same(w,p));const icons={start:'⚑',sword:'⚔',monster:'♟',goal:'⌂'}, names={start:'起點',sword:'寶劍',monster:'怪物',goal:'出口'}; return `<button data-cell="${i}" class="${wall?'wall':object?'object':''}" aria-label="第 ${p[1]+1} 列第 ${p[0]+1} 欄，${names[object]||(wall?'石牆':'空格')}">${icons[object]||(wall?'▧':'·')}</button>`; }).join('');
  try { const solution = solveLevel(editLevel), valid = solution && solution.length <= MAX_STEPS; $('map-validation').textContent = valid ? `可通關 · 最短 ${solution.length} 步` : solution ? `請把路線縮短到 ${MAX_STEPS} 步以內。` : '沒有通路，請調整石牆。'; $('apply-level-button').disabled = !valid; }
  catch (error) { $('map-validation').textContent = error.message; $('apply-level-button').disabled = true; }
}
function openTeacher() { if (!isHost()) return; editLevel=clone(state.round.level); $('per-player').value=state.round.perPlayer; $('teacher-error').textContent=''; $('apply-level-button').textContent=mode==='solo'?'開始這個冒險 →':'準備這個關卡 →'; renderEditor(); $('teacher-dialog').showModal(); }
function paintCell(index) {
  const n=editLevel.size,p=[index%n,Math.floor(index/n)],objects=['start','sword','monster','goal'];
  if (brush==='erase') editLevel.walls=editLevel.walls.filter(w=>!same(w,p));
  else if (brush==='wall') { if(objects.some(k=>same(editLevel[k],p)))return toast('先把這格的角色或物件移走。'); if(editLevel.walls.some(w=>same(w,p)))editLevel.walls=editLevel.walls.filter(w=>!same(w,p));else editLevel.walls.push(p); }
  else { if(objects.filter(k=>k!==brush).some(k=>same(editLevel[k],p)))return toast('角色與物件要放在不同格。');editLevel[brush]=p;editLevel.walls=editLevel.walls.filter(w=>!same(w,p)); }
  editLevel.name='我們的冒險'; editLevel.id='custom'; editLevel.difficulty='自訂'; delete editLevel.hint; renderEditor();
}
async function openRoom() {
  if (!LOCAL_MULTIPLAYER) return;
  $('room-error').textContent=''; $('room-active').hidden=mode!=='online'; $('room-forms').hidden=mode==='online';
  if (!$('room-dialog').open) $('room-dialog').showModal();
  if (mode==='online') {
    if (!networkAddresses.length) try { networkAddresses=(await(await fetch('/api/network')).json()).addresses; } catch {}
    const hosts=['localhost','127.0.0.1'].includes(location.hostname)?networkAddresses:[location.hostname];
    const sameUrl=`${location.origin}/?room=${state.code}`, url=hosts[0]?`${location.protocol}//${hosts[0]}${location.port?':'+location.port:''}/?room=${state.code}`:sameUrl;
    $('room-active').innerHTML=`<div class="room-code-large">${escape(state.code)}</div><div class="room-link">將這個連結給同一區網的隊友：<input id="share-link" value="${escape(url)}" readonly aria-label="加入房間連結"></div><div class="room-actions"><button class="primary" id="back-to-game-button">返回冒險 →</button><button id="copy-link-button">複製連結</button><button id="open-student-button">開隊員分頁</button><button id="leave-button">回到單人</button></div>`;
    $('back-to-game-button').onclick=()=>$('room-dialog').close();
    $('copy-link-button').onclick=async()=>{try{await navigator.clipboard.writeText(url);toast('已複製連結。');}catch{$('share-link').select();toast('連結已選取，按 Ctrl+C 複製。');}};
    $('open-student-button').onclick=()=>window.open(`${sameUrl}&new=1`,'_blank','noopener');
    $('leave-button').onclick=()=>{sessionStorage.removeItem(SESSION_KEY);history.replaceState(null,'',location.pathname);const level=state.round.level;startSolo(level);$('room-dialog').close();};
  }
}
async function sendMessage(text) { text=text.trim().slice(0,120);if(!text)return;try{acceptState((await request('message',{text})).state);$('chat-input').value='';}catch(error){toast(error.message);} }

$('command-deck').innerHTML=Object.entries(COMMANDS).map(([id,c])=>`<button class="command-button ${c.kind}" data-command="${id}" aria-label="${c.label}" draggable="false"><span aria-hidden="true">${c.icon}</span><span>${c.label}</span></button>`).join('');
let commandDrag = null, consumedDrag = false;
const dragPreview = document.createElement('div'); dragPreview.className='drag-preview'; dragPreview.hidden=true; dragPreview.setAttribute('aria-hidden','true'); document.body.append(dragPreview);
$('command-deck').onclick=e=>{if(consumedDrag){consumedDrag=false;return;}const b=e.target.closest('[data-command]');if(b)placeCommand(b.dataset.command);};
$('timeline').onclick=e=>{const clear=e.target.closest('[data-clear]');if(clear&&canEdit()){const i=Number(clear.dataset.clear);myDraft()[slotsFor(playerId).indexOf(i)]=null;selectedSlot=i;render();$('timeline').querySelector(`[data-slot="${i}"]`)?.focus({preventScroll:true});return;}const slot=e.target.closest('[data-slot]');if(slot&&canEdit()&&state.round.owners[Number(slot.dataset.slot)]===playerId){selectedSlot=Number(slot.dataset.slot);render();$('timeline').querySelector(`[data-slot="${selectedSlot}"]`)?.focus({preventScroll:true});}};
// Pointer capture also supports touch screens, without relying on native HTML drag events.
$('command-deck').onpointerdown=e=>{
  const b=e.target.closest('[data-command]'); consumedDrag=false;
  if(!b||!canEdit()||e.button!==0)return;
  commandDrag={button:b,command:b.dataset.command,id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};
  b.setPointerCapture(e.pointerId);
};
$('command-deck').onpointermove=e=>{
  if(!commandDrag||commandDrag.id!==e.pointerId)return;
  if(Math.hypot(e.clientX-commandDrag.x,e.clientY-commandDrag.y)>8)commandDrag.moved=true;
  if(!commandDrag.moved)return;
  dragPreview.hidden=false;dragPreview.textContent=COMMANDS[commandDrag.command].icon;
  dragPreview.style.left=`${e.clientX}px`;dragPreview.style.top=`${e.clientY}px`;
  document.querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target'));
  const s=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-slot]');
  if(s&&canEdit()&&state.round.owners[Number(s.dataset.slot)]===playerId)s.classList.add('drop-target');
};
function endCommandDrag(e,cancelled=false){
  if(!commandDrag||commandDrag.id!==e.pointerId)return;
  const drag=commandDrag; commandDrag=null; dragPreview.hidden=true;
  document.querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target'));
  if(drag.button.hasPointerCapture(e.pointerId))drag.button.releasePointerCapture(e.pointerId);
  if(drag.moved){consumedDrag=true;const s=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-slot]');if(s&&!cancelled)placeCommand(drag.command,Number(s.dataset.slot));}
}
$('command-deck').onpointerup=e=>endCommandDrag(e);
$('command-deck').onpointercancel=e=>endCommandDrag(e,true);
$('clear-button').onclick=()=>{if(canEdit()){myDraft().fill(null);selectedSlot=slotsFor(playerId)[0];render();}};
$('submit-button').onclick=()=>{if(!canEdit()||myDraft().some(c=>!c))return;const commands=[...myDraft()];action(async()=>{if(mode==='solo'){if(submitProgram(state.round,playerId,commands,state.round.roundId))runSolo();}else acceptState((await request('submit',{commands,roundId:state.round.roundId})).state);});};
$('start-round-button').onclick=()=>action(async()=>acceptState((await request('start',{roundId:state.round.roundId})).state));
$('again-button').onclick=()=>{if(state.round.success)return openTeacher();action(async()=>{if(mode==='solo')await changeRound();else acceptState((await request('retry',{roundId:state.round.roundId})).state);});};
$('pause-button').onclick=()=>action(async()=>{if(mode==='solo')state.round.paused=!state.round.paused;else acceptState((await request('pause')).state);});
$('route-button').onclick=()=>{showRoute=!showRoute;render();};
$('room-button').onclick=openRoom; $('teacher-button').onclick=openTeacher;
$('team-button').onclick=()=>$('team-dialog').showModal(); $('help-button').onclick=()=>$('help-dialog').showModal();
$('calm-button').onclick=()=>{const calm=document.body.classList.toggle('calm');$('calm-button').setAttribute('aria-pressed',calm);localStorage.setItem('robot-relay-calm',String(calm));};
$('level-options').onclick=e=>{const b=e.target.closest('[data-level]');if(b){editLevel=clone(LEVELS[Number(b.dataset.level)]);renderEditor();}};
$('map-brushes').onclick=e=>{const b=e.target.closest('[data-brush]');if(b){brush=b.dataset.brush;renderEditor();}};
$('map-editor').onclick=e=>{const b=e.target.closest('[data-cell]');if(b)paintCell(Number(b.dataset.cell));};
$('apply-level-button').onclick=async()=>{const b=$('apply-level-button');b.disabled=true;try{await changeRound(editLevel,Number($('per-player').value));$('teacher-dialog').close();}catch(error){$('teacher-error').textContent=error.message;}finally{renderEditor();}};
$('create-form').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{const level=clone(state.round.level),perPlayer=state.round.perPlayer;connect(await request('create',{name:$('host-name').value}));await changeRound(level,perPlayer);await openRoom();}catch(error){$('room-error').textContent=error.message;}finally{b.disabled=false;}};
$('join-form').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{connect(await request('join',{name:$('player-name').value,code:$('room-code').value}));history.replaceState(null,'',location.pathname);$('room-dialog').close();}catch(error){$('room-error').textContent=error.message;}finally{b.disabled=false;}};
$('team-list').onclick=e=>{const b=e.target.closest('[data-remove]');if(b)action(async()=>acceptState((await request('remove',{playerId:b.dataset.remove})).state));};
$('chat-form').onsubmit=e=>{e.preventDefault();sendMessage($('chat-input').value);};
document.querySelectorAll('[data-chat]').forEach(b=>b.onclick=()=>sendMessage(b.dataset.chat));
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
async function boot() {
  if(localStorage.getItem('robot-relay-calm')==='true'||matchMedia('(prefers-reduced-motion: reduce)').matches){document.body.classList.add('calm');$('calm-button').setAttribute('aria-pressed','true');}
  startSolo();
  if (!LOCAL_MULTIPLAYER) return;
  const params=new URLSearchParams(location.search); if(params.has('new'))sessionStorage.removeItem(SESSION_KEY);
  const saved=sessionStorage.getItem(SESSION_KEY);
  if(saved&&!params.has('room')&&!params.has('demo'))try{const s=JSON.parse(saved);state.code=s.code;token=s.token;connect({...await request('session'),token});}catch{sessionStorage.removeItem(SESSION_KEY);startSolo();}
  if(params.has('room')){$('room-code').value=params.get('room').replace(/\D/g,'').slice(0,6);await openRoom();$('player-name').focus();}
}
boot();
