(function () {
  'use strict';
  const G = window.Garden, A = window.GardenArt;
  const $ = id => document.getElementById(id);
  const S = 64, OX = 76, OY = 40, X = c => OX + (c + 0.5) * S, Y = r => OY + (r + 0.5) * S;
  const STORAGE = 'garden-guard-v1';
  const BATTLE_SPEED = G.BATTLE_SPEED;
  let state = G.createState(), selected = 'pea', hover = null, focusCell = { c: 6, r: 5 };
  let lastPhase = '', lastRevision = -1, uiSignature = '', lastFrame = 0, accumulator = 0;
  let infoAnchor = null, infoTimer = 0;
  try { const saved = G.restore(JSON.parse(localStorage.getItem(STORAGE))); if (saved) state = saved; } catch {}
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = A.icon(el.dataset.icon); });
  $('tools').innerHTML = Object.entries(G.TOOLS).map(([kind, tool]) => `<button class="tool-card" data-tool="${kind}" aria-pressed="false" aria-label="${tool.name}，${tool.cost} 顆種子">${A.tool(kind)}<span class="tool-cost">${A.icon('seed')}${tool.cost}</span></button>`).join('');

  function hideInfo() {
    clearTimeout(infoTimer); $('tower-info').hidden = true;
    infoAnchor?.removeAttribute('aria-describedby'); infoAnchor = null;
  }
  function deferHideInfo() { clearTimeout(infoTimer); infoTimer = setTimeout(hideInfo, 140); }
  function showInfo(kind, anchor) {
    const tool = G.TOOLS[kind];
    if (!tool?.rate) { hideInfo(); return; }
    hideInfo(); infoAnchor = anchor;
    const info = $('tower-info');
    info.dataset.kind = kind;
    info.innerHTML = `<strong>${tool.name}</strong><p>傷害 ${tool.damage}${tool.burnDamage ? ` · 燃燒 ${tool.burnDamage}/s` : ''}</p><p>攻擊 ${tool.rate.toFixed(1)}次/s</p><p class="info-effect">${tool.effect}</p>`;
    info.hidden = false; anchor.setAttribute('aria-describedby', 'tower-info');
    const zoom = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    const rect = anchor.getBoundingClientRect(), box = info.getBoundingClientRect();
    const w = box.width / zoom, h = box.height / zoom, vw = innerWidth / zoom, vh = innerHeight / zoom;
    const left = Math.max(8, Math.min(vw - w - 8, (rect.left + rect.width / 2) / zoom - w / 2));
    let top = rect.top / zoom - h - 10;
    if (top < 8) top = rect.bottom / zoom + 10;
    info.style.left = `${left}px`; info.style.top = `${Math.max(8, Math.min(vh - h - 8, top))}px`;
  }
  function showCellInfo(cell) {
    const b = G.at(state, +cell.dataset.c, +cell.dataset.r);
    if (b) showInfo(b.kind, cell); else hideInfo();
  }
  function repositionInfo() {
    if (!infoAnchor) return;
    const anchor = infoAnchor, rect = anchor.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth || (!anchor.matches(':hover') && document.activeElement !== anchor)) { hideInfo(); return; }
    if (anchor.dataset.tool) showInfo(anchor.dataset.tool, anchor); else showCellInfo(anchor);
  }

  function save() {
    if (state.phase !== 'planning') return;
    try { localStorage.setItem(STORAGE, JSON.stringify(G.snapshot(state))); } catch {}
  }
  function feedback(text, c, r) {
    $('status').textContent = text;
    const cell = $('hit-layer').querySelector(`[data-c="${c}"][data-r="${r}"]`);
    if (cell) { cell.classList.add('invalid'); setTimeout(() => cell.classList.remove('invalid'), 700); }
  }
  function ground() {
    let s = '<rect x="69" y="33" width="782" height="526" rx="24" fill="#d2ddbc"/><rect x="72" y="36" width="776" height="520" rx="22" fill="#e4ebd5"/>';
    const solid = G.terrain(state.level);
    const water = new Set(G.LEVELS[state.level].water.map(([c, r]) => G.key(c, r)));
    let hits = '';
    for (let r = 0; r < G.ROWS; r++) {
      hits += '<g role="row">';
      for (let c = 0; c < G.COLS; c++) {
        const x = X(c), y = Y(r), reserved = c === 0 || c === G.COLS - 1 || solid.has(G.key(c, r));
        s += `<rect x="${x - 31}" y="${y - 31}" width="62" height="62" rx="7" fill="${(c + r) % 2 ? '#e0e9cf' : '#e4ecd7'}"/><rect x="${x - 31}" y="${y - 31}" width="62" height="62" rx="7" fill="url(#grass)"/>`;
        if (water.has(G.key(c, r))) {
          s += `<rect x="${x - 30}" y="${y - 30}" width="60" height="60" rx="13" fill="#b7d3d0"/><path d="M${x - 18} ${y - 9}q8 4 16 0m-7 20q8 4 16 0" stroke="#e1efdf" stroke-width="2.5" stroke-linecap="round" fill="none"/><ellipse cx="${x + 13}" cy="${y - 13}" rx="9" ry="6" fill="#88ad86"/>`;
        } else if (solid.has(G.key(c, r))) {
          s += `<g transform="translate(${x} ${y})"><ellipse cy="20" rx="26" ry="7" fill="#40543812"/><path d="m-25 11 7-25 25-6 19 19-5 22h-39Z" fill="#b7bdab"/><path d="m-18-14 25-6-5 24-27 7Z" fill="#ccd1bd"/><path d="m2 4 24-5-5 22h-19Z" fill="#a8b29e"/><path d="m-23 20 3-7 5 3 5-3 4 9" fill="#8aa575"/></g>`;
        }
        const label = `${r + 1} 排 ${c + 1} 格${reserved ? '，通道或地形' : '，草地'}`;
        hits += `<rect class="cell-hit ${reserved ? 'reserved' : ''}" role="gridcell" tabindex="${c === focusCell.c && r === focusCell.r ? 0 : -1}" data-c="${c}" data-r="${r}" aria-label="${label}" x="${x - 31}" y="${y - 31}" width="62" height="62" rx="7"/>`;
      }
      hits += '</g>';
    }
    s += `<g transform="translate(35 ${Y(G.GOAL.r)}) scale(.85)">${A.house()}</g>`;
    for (const r of G.LEVELS[state.level].entries) s += `<g transform="translate(883 ${Y(r)})"><circle r="22" fill="#efecd9"/><path d="M10 0h-20m7-7-7 7 7 7" stroke="#aa9c78" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    for (const [x, y, a] of [[93, 20, -20], [825, 572, 30], [41, 489, 10], [876, 82, -15]]) s += `<g transform="translate(${x} ${y}) rotate(${a})" opacity=".55"><path d="M0 9q-12-5-11-13Q1-3 0 9m1 0q12-5 11-13Q0-3 1 9" fill="#a6b98a"/><circle cx="16" cy="10" r="3" fill="#dbc78c"/></g>`;
    $('ground-layer').innerHTML = s; $('hit-layer').innerHTML = hits;
  }
  function selection() {
    $('hover-layer').innerHTML = ''; $('range-layer').innerHTML = '';
    if (!hover) return;
    const x = X(hover.c), y = Y(hover.r), existing = G.at(state, hover.c, hover.r);
    const kind = existing ? existing.kind : selected;
    if (kind && G.TOOLS[kind]?.range) $('range-layer').innerHTML = `<circle cx="${x}" cy="${y}" r="${G.TOOLS[kind].range * S}" fill="${G.TOOLS[kind].color}" fill-opacity=".065" stroke="${G.TOOLS[kind].color}" stroke-width="2" stroke-opacity=".42" stroke-dasharray="5 6"/>`;
    if (state.phase !== 'planning') return;
    const valid = selected === 'remove' ? !!existing : selected && !G.canBuild(state, selected, hover.c, hover.r);
    const color = selected === 'remove' ? '#bb8967' : existing || valid ? '#7c9b6b' : '#c38c75';
    $('hover-layer').innerHTML = `<rect x="${x - 30}" y="${y - 30}" width="60" height="60" rx="8" fill="${color}" fill-opacity=".12" stroke="${color}" stroke-width="2.5"/>${valid && selected !== 'remove' && !existing ? `<g transform="translate(${x} ${y})" opacity=".5">${A.tower(selected)}</g>` : ''}`;
  }
  function renderWorld() {
    const lift = e => e.leap ? Math.sin(Math.PI * Math.min(1, e.leap.age / e.leap.duration)) * 50 : e.kind === 'flyer' ? 12 + Math.sin(state.time * 8 + e.id) * 2 : 0;
    $('fire-layer').innerHTML = state.fires.map(f => {
      const pulse = 0.85 + Math.sin(state.time * 10 + f.id) * 0.15;
      return `<g class="ground-fire" transform="translate(${X(f.c)} ${Y(f.r)})" opacity="${Math.min(1, f.life / 0.5)}"><rect x="-30" y="-30" width="60" height="60" rx="12" fill="#ec9a4b" opacity=".38"/><ellipse rx="29" ry="24" fill="#df6b38" opacity=".3"/>${[-17, 0, 17].map((x, i) => `<g transform="translate(${x} ${i % 2 ? -9 : 10}) scale(${pulse})"><path d="M0-19C7-9 13-5 10 3 6 14-9 10-10 2-12-6-4-8 0-19Z" fill="#e77535"/><path d="M0-8C6 0 5 7 0 8-6 7-5 0 0-8Z" fill="#ffe094"/></g>`).join('')}</g>`;
    }).join('');
    $('building-layer').innerHTML = state.buildings.map(b => {
      const hp = G.TOOLS[b.kind].hp;
      const damage = b.hp < hp ? `<path d="M-6-12 0-3-5 7 4 18" fill="none" stroke="#7d6253" stroke-width="2"/><g transform="translate(${-hp * 4} 29)">${Array.from({ length: hp }, (_, i) => `<circle cx="${i * 8}" r="2.5" fill="${i < b.hp ? '#ae8b65' : '#d4cbb7'}"/>`).join('')}</g>` : '';
      return `<g transform="translate(${X(b.c)} ${Y(b.r)})" data-building="${b.kind}" data-c="${b.c}" data-r="${b.r}">${A.tower(b.kind, b.angle, b.flash)}${damage}</g>`;
    }).join('');
    $('bug-layer').innerHTML = state.enemies.slice().sort((a, b) => Number(!!a.leap || a.kind === 'flyer') - Number(!!b.leap || b.kind === 'flyer')).map(e => `<g data-enemy="${e.id}" data-kind="${e.kind}" data-hp="${e.hp}" data-jumping="${!!e.leap}" transform="translate(${X(e.x)} ${Y(e.y) - lift(e)})">${A.bug(e.kind, e.hp, state.time + e.id, e.flash, e.shieldFlash, e.slow > 0)}</g>`).join('');
    $('shot-layer').innerHTML = state.shots.map(s => {
      if (s.kind === 'pierce') return `<g class="piercing-shot"><path d="M${X(s.x - s.ux * 0.34)} ${Y(s.y - s.uy * 0.34)}L${X(s.x)} ${Y(s.y)}" stroke="#4a8f88" stroke-width="7" stroke-linecap="round"/><circle cx="${X(s.x)}" cy="${Y(s.y)}" r="4" fill="#edffdf"/></g>`;
      const target = state.enemies.find(e => e.id === s.target);
      if (!target) return '';
      const point = G.impactPoint(target, s);
      const t = Math.min(1, s.age / s.duration), x = X(s.c + (point.x - s.c) * t), y = Y(s.r + (point.y - s.r) * t) - lift(target) * t;
      const radius = { cannon: 8, frost: 6, flame: 7, molecular: 9, push: 7 }[s.kind] || 4.5;
      return `<g class="shot-${s.kind}"><circle cx="${x}" cy="${y}" r="${radius}" fill="${G.TOOLS[s.kind].color}" stroke="#fffde9" stroke-width="1.5"/>${s.kind === 'molecular' ? `<circle cx="${x}" cy="${y}" r="14" fill="none" stroke="#c4a0cd" stroke-width="2"/>` : ''}${s.kind === 'push' ? `<circle cx="${x}" cy="${y}" r="11" fill="none" stroke="#b7bedb" stroke-width="2"/>` : ''}</g>`;
    }).join('');
    $('effects-layer').innerHTML = state.effects.map(e => {
      const t = 1 - e.life / e.duration, x = X(e.x), y = Y(e.y);
      if (e.kind === 'hatch') return `<g class="hatch-effect" transform="translate(${x} ${y})" opacity="${1 - t}"><ellipse rx="${8 + t * 20}" ry="${12 + t * 13}" fill="none" stroke="#efe7b6" stroke-width="3"/><path d="m-11-8 7-5 3 7 7-5 6 7" fill="none" stroke="#fffde6" stroke-width="3"/></g>`;
      if (e.kind === 'split') return `<g class="split-effect" opacity="${1 - t}">${[0, 1, 2].map(i => { const a = i * Math.PI * 2 / 3; return `<circle cx="${x + Math.cos(a) * t * 42}" cy="${y + Math.sin(a) * t * 42}" r="${12 * (1 - t) + 4}" fill="#c5dfa1" stroke="#79a06b" stroke-width="2"/>`; }).join('')}</g>`;
      if (e.kind === 'detonate') return `<g class="detonate-effect" opacity="${1 - t}"><rect x="${x - 96}" y="${y - 96}" width="192" height="192" rx="16" fill="#d9814522" stroke="#da8551" stroke-width="3"/><circle cx="${x}" cy="${y}" r="${15 + t * 77}" fill="#f5c66b" fill-opacity=".25" stroke="#d57549" stroke-width="5"/>${Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return `<path d="M${x + Math.cos(a) * t * 65} ${y + Math.sin(a) * t * 65}l${Math.cos(a) * 14} ${Math.sin(a) * 14}" stroke="#e6a54c" stroke-width="4" stroke-linecap="round"/>`; }).join('')}</g>`;
      if (e.kind === 'leap') return `<path class="leap-effect" d="M${x} ${y}Q${(x + X(e.toX)) / 2} ${Math.min(y, Y(e.toY)) - 75} ${X(e.toX)} ${Y(e.toY)}" fill="none" stroke="#a5b881" stroke-width="3" stroke-dasharray="3 8" opacity="${(1 - t) * 0.65}"/>`;
      if (e.kind === 'blast') return `<g class="blast-effect" opacity="${1 - t}"><circle cx="${x}" cy="${y}" r="${(0.25 + t * 0.75) * e.radius * S}" fill="#eec970" fill-opacity=".25" stroke="#c49946" stroke-width="4"/><circle cx="${x}" cy="${y}" r="${10 + t * 25}" fill="#ffedb0"/></g>`;
      if (e.kind === 'molecular') return `<g class="molecular-effect" transform="translate(${x} ${y})" opacity="${1 - t}"><circle r="${10 + t * 32}" fill="#dfc2ed" fill-opacity=".35" stroke="#a16cab" stroke-width="3"/><path d="M-22 0h44M0-22v44m-16-16 32 32m-32 0 32-32" stroke="#f8e5ff" stroke-width="3"/></g>`;
      if (e.kind === 'push') return `<g class="push-effect" transform="translate(${x + e.ux * t * 80} ${y + e.uy * t * 80}) rotate(${Math.atan2(e.uy, e.ux) * 180 / Math.PI})" opacity="${1 - t}" fill="none" stroke="#8491bf" stroke-width="4"><path d="m-15-15 13 15-13 15m14-30 13 15-13 15"/></g>`;
      if (e.kind === 'burn') return `<circle class="burn-effect" cx="${x}" cy="${y}" r="${14 + t * 14}" fill="none" stroke="#ef9c49" stroke-width="3" opacity="${1 - t}"/>`;
      if (e.kind === 'block') {
        const bx = e.vx * t * 60, by = e.vy * t * 60;
        const color = G.TOOLS[e.shotKind]?.color || '#6a8d58';
        return `<g class="block-effect" data-blocked-enemy="${e.enemyId}" opacity="${1 - t}" transform="translate(${x} ${y})">
          <circle r="${5 + t * 21}" fill="none" stroke="#f6d77c" stroke-width="${3 * (1 - t)}"/>
          <path d="m0-11 3 7 8-3-5 7 5 4-8-1-3 8-3-8-8 1 5-4-5-7 8 3Z" fill="#fff4bc" stroke="#d5a34c" stroke-width="1.3" transform="scale(${1 + t * 0.7})"/>
          ${[-150, -115, -75, -35].map(a => { const r = a * Math.PI / 180 * (e.vy > 0 ? -1 : 1), d = 11 + t * 26; return `<path d="M${Math.cos(r) * d} ${Math.sin(r) * d}l${Math.cos(r) * 7} ${Math.sin(r) * 7}" stroke="#dbaa52" stroke-width="2.5" stroke-linecap="round"/>`; }).join('')}
          <path d="M${bx - e.vx * 12} ${by - e.vy * 12}L${bx} ${by}" stroke="${color}" stroke-width="3" stroke-linecap="round" opacity=".55"/>
          <circle class="ricochet" cx="${bx}" cy="${by}" r="${e.shotKind === 'frost' ? 5 : 4}" fill="${color}" stroke="#fff8db" stroke-width="1.5"/>
        </g>`;
      }
      const color = e.kind === 'chip' ? '#b4976e' : e.kind === 'home' ? '#c88570' : '#9da96c';
      return `<g opacity="${1 - t}">${[0, 1, 2, 3, 4, 5].map(i => `<circle cx="${x + Math.cos(i * Math.PI / 3) * (10 + t * 27)}" cy="${y + Math.sin(i * Math.PI / 3) * (10 + t * 27)}" r="${4 * (1 - t) + 1}" fill="${color}"/>`).join('')}</g>`;
    }).join('');
  }
  function updateUI(force = false) {
    const signature = [state.level, state.wave, state.phase, state.money, state.hearts, state.undo.length, selected].join(':');
    if (!force && signature === uiSignature) return;
    uiSignature = signature;
    $('money').textContent = state.money;
    $('seeds').setAttribute('aria-label', `可用種子 ${state.money}`);
    $('health').textContent = state.hearts;
    $('hearts').setAttribute('aria-label', `小屋生命 ${state.hearts}`);
    document.querySelectorAll('[data-level]').forEach(b => { const active = Number(b.dataset.level) === state.level; b.classList.toggle('active', active); b.setAttribute('aria-current', active ? 'step' : 'false'); });
    document.querySelectorAll('[data-tool]').forEach(b => {
      b.classList.toggle('selected', b.dataset.tool === selected); b.setAttribute('aria-pressed', String(b.dataset.tool === selected));
      // Keep low-budget tools selectable to inspect their range.
      b.setAttribute('aria-disabled', String(state.phase !== 'planning'));
    });
    $('remove').disabled = state.phase !== 'planning'; $('remove').classList.toggle('active', selected === 'remove'); $('remove').setAttribute('aria-pressed', String(selected === 'remove'));
    $('undo').disabled = state.phase !== 'planning' || state.undo.length === 0;
    const label = state.phase === 'running' ? '暫停' : state.phase === 'paused' ? '繼續' : state.phase === 'won' ? '看成果' : state.phase === 'lost' ? '再試一次' : '放小蟲';
    $('action').innerHTML = A.icon(state.phase === 'running' ? 'pause' : 'play');
    $('action').setAttribute('aria-label', label);
    $('action').classList.toggle('pause-state', state.phase === 'running');
  }
  function outcome() {
    hideInfo();
    const won = state.phase === 'won';
    $('result-art').innerHTML = A.icon(won ? 'trophy' : 'leaf');
    $('result-title').textContent = won ? '守住了！' : '再試一次';
    $('result-hearts').innerHTML = Array.from({ length: 5 }, (_, i) => A.icon('heart', i < state.hearts ? '' : 'empty')).join('');
    $('result-primary').textContent = won ? state.level < G.LEVELS.length - 1 ? '下一園' : '再玩一次' : '重試這波';
    $('result-secondary').textContent = won ? '看看花園' : '重新開始';
    if (!$('result').open) $('result').showModal();
  }
  function sync(force = false) {
    if (force || lastRevision !== state.revision) {
      selection(); lastRevision = state.revision;
      for (const cell of $('hit-layer').querySelectorAll('[data-c]')) {
        const b = G.at(state, +cell.dataset.c, +cell.dataset.r);
        cell.setAttribute('aria-label', `${+cell.dataset.r + 1} 排 ${+cell.dataset.c + 1} 格，${b ? G.TOOLS[b.kind].name : G.terrain(state.level).has(G.key(+cell.dataset.c, +cell.dataset.r)) ? '地形' : '空地'}`);
      }
      if (infoAnchor?.classList.contains('cell-hit')) showCellInfo(infoAnchor);
    }
    if (lastPhase !== state.phase) {
      lastPhase = state.phase;
      if (state.phase === 'planning') save();
      if (state.phase === 'won' || state.phase === 'lost') outcome();
    }
    updateUI(force); renderWorld();
  }
  function loadLevel(level, replacement = null) {
    hideInfo();
    if ($('result').open) $('result').close();
    state = replacement || G.createState(level); selected = 'pea'; hover = null; $('status').textContent = ''; accumulator = 0;
    lastPhase = ''; lastRevision = -1; uiSignature = ''; ground(); save(); sync(true);
  }
  function interact(c, r) {
    if (!selected) { selected = G.at(state, c, r)?.kind || 'pea'; updateUI(true); return; }
    const result = selected === 'remove' ? G.remove(state, c, r) : G.build(state, selected, c, r);
    if (!result.ok) feedback(result.error, c, r);
    else { $('status').textContent = ''; save(); }
    sync(true);
  }
  $('tools').addEventListener('click', event => {
    const tool = event.target.closest('[data-tool]'); if (!tool) return;
    showInfo(tool.dataset.tool, tool);
    if (state.phase !== 'planning') return;
    selected = tool.dataset.tool; hover = null; selection(); updateUI(true);
  });
  for (const button of $('tools').querySelectorAll('[data-tool]')) {
    button.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') showInfo(button.dataset.tool, button); });
    button.addEventListener('pointerleave', deferHideInfo);
    button.addEventListener('focus', () => showInfo(button.dataset.tool, button));
    button.addEventListener('blur', deferHideInfo);
  }
  $('tower-info').addEventListener('pointerenter', () => clearTimeout(infoTimer));
  $('tower-info').addEventListener('pointerleave', deferHideInfo);
  document.addEventListener('pointerdown', event => { if (!event.target.closest('#tower-info, [data-tool]')) hideInfo(); });
  window.addEventListener('resize', repositionInfo);
  document.addEventListener('scroll', repositionInfo, true);
  $('remove').addEventListener('click', () => { selected = selected === 'remove' ? null : 'remove'; selection(); updateUI(true); });
  $('undo').addEventListener('click', () => { if (G.undo(state)) { save(); sync(true); } });
  $('reset').addEventListener('click', () => loadLevel(state.level));
  document.querySelectorAll('[data-level]').forEach(b => b.addEventListener('click', () => loadLevel(+b.dataset.level)));
  $('action').addEventListener('click', () => {
    hideInfo();
    hover = null; $('status').textContent = ''; selection();
    if (state.phase === 'planning') { save(); G.startWave(state); }
    else if (state.phase === 'running' || state.phase === 'paused') G.togglePause(state);
    else outcome();
    sync(true);
  });
  $('hit-layer').addEventListener('click', event => {
    const cell = event.target.closest('[data-c]'); if (!cell) return;
    if (event.pointerType === 'touch' && selected !== 'remove' && G.at(state, +cell.dataset.c, +cell.dataset.r)) { showCellInfo(cell); return; }
    interact(+cell.dataset.c, +cell.dataset.r);
  });
  $('hit-layer').addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    const cell = event.target.closest('[data-c]'); if (!cell) return;
    if (hover?.c === +cell.dataset.c && hover?.r === +cell.dataset.r) return;
    hover = { c: +cell.dataset.c, r: +cell.dataset.r }; selection();
    showCellInfo(cell);
  });
  $('board').addEventListener('pointerleave', () => { hover = null; selection(); deferHideInfo(); });
  $('hit-layer').addEventListener('focusin', event => {
    const cell = event.target.closest('[data-c]'); if (!cell) return;
    focusCell = hover = { c: +cell.dataset.c, r: +cell.dataset.r }; selection();
    showCellInfo(cell);
  });
  $('hit-layer').addEventListener('focusout', deferHideInfo);
  $('hit-layer').addEventListener('keydown', event => {
    const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (moves[event.key]) {
      event.preventDefault(); const [dc, dr] = moves[event.key];
      focusCell = { c: Math.max(0, Math.min(G.COLS - 1, focusCell.c + dc)), r: Math.max(0, Math.min(G.ROWS - 1, focusCell.r + dr)) };
      $('hit-layer').querySelectorAll('[tabindex="0"]').forEach(el => el.setAttribute('tabindex', '-1'));
      const next = $('hit-layer').querySelector(`[data-c="${focusCell.c}"][data-r="${focusCell.r}"]`); next.setAttribute('tabindex', '0'); next.focus();
    } else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); interact(focusCell.c, focusCell.r); }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !$('result').open) { hideInfo(); selected = null; hover = null; selection(); updateUI(true); }
  });
  $('result-primary').addEventListener('click', () => {
    if (state.phase === 'lost') loadLevel(state.level, G.retry(state));
    else loadLevel(state.level < G.LEVELS.length - 1 ? state.level + 1 : state.level);
  });
  $('result-secondary').addEventListener('click', () => { if (state.phase === 'lost') loadLevel(state.level); else $('result').close(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.phase === 'running') { G.togglePause(state); sync(true); }
    accumulator = 0; lastFrame = 0;
  });

  // Deterministic fixed simulation step; pause does not bank elapsed time.
  function frame(now) {
    const elapsed = lastFrame ? Math.min((now - lastFrame) / 1000, 0.1) : 0; lastFrame = now;
    if (state.phase === 'running') {
      accumulator += elapsed * BATTLE_SPEED;
      while (accumulator >= 1 / 60) { G.step(state, 1 / 60); accumulator -= 1 / 60; }
    } else accumulator = 0;
    sync(); requestAnimationFrame(frame);
  }
  // Read-only diagnostics for verification. No test controls ship in normal play.
  window.gardenDebug = { getState: () => JSON.parse(JSON.stringify(state)), getRoutes: () => G.previews(state) };
  ground(); sync(true); requestAnimationFrame(frame);
})();
