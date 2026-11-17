(function () {
  'use strict';
  const G = window.Garden, A = window.GardenArt;
  const $ = id => document.getElementById(id);
  const S = 64, OX = 76, OY = 40, X = c => OX + (c + 0.5) * S, Y = r => OY + (r + 0.5) * S;
  const STORAGE = 'garden-guard-v1';
  const descriptions = { pea: '射程遠 · 每次 −1', rapid: '射程短 · 發射快', frost: '命中 −1 · 小蟲變慢', wall: '' };
  let state = G.createState(), selected = 'pea', hover = null, speed = 1, showRoute = true, focusCell = { c: 6, r: 5 };
  let lastPhase = '', lastRevision = -1, uiSignature = '', lastFrame = 0, accumulator = 0, transient = '', transientUntil = 0;
  try { const saved = G.restore(JSON.parse(localStorage.getItem(STORAGE))); if (saved) state = saved; } catch {}
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = A.icon(el.dataset.icon); });
  $('tools').innerHTML = Object.entries(G.TOOLS).map(([kind, tool]) => `<button class="tool-card" data-tool="${kind}" aria-pressed="false" aria-label="${tool.name}，${tool.cost} 顆種子。${descriptions[kind]}">${A.tool(kind)}${kind === 'wall' ? '' : `<span class="tool-name">${tool.name}</span>`}<span class="tool-cost">${A.icon('seed')}${tool.cost}</span></button>`).join('');

  function save() {
    if (state.phase !== 'planning') return;
    try { localStorage.setItem(STORAGE, JSON.stringify(G.snapshot(state))); } catch {}
  }
  function message(text) { transient = text; transientUntil = performance.now() + 2400; updateHint(); }
  function setHint(text, warning = false) {
    if ($('hint').textContent !== text) $('hint').textContent = text;
    $('hint').classList.toggle('warning', warning);
  }
  function updateHint() {
    if (transient && performance.now() < transientUntil) { setHint(transient, true); return; }
    transient = '';
    if (state.phase === 'paused') { setHint('停下來，看看小蟲走哪裡'); return; }
    if (state.phase === 'running') { setHint(state.enemies.some(e => e.attackId) ? '路堵住了，小蟲正在拆牆' : '', state.enemies.some(e => e.attackId)); return; }
    if (state.phase !== 'planning') { setHint(''); return; }
    const hypothetical = prospective();
    if (G.previews(state, hypothetical).some(p => p.breaking)) { setHint('沒有路了，小蟲會拆牆', true); return; }
    if (selected === 'remove') { setHint('移走物品，退回種子'); return; }
    if (hover && G.at(state, hover.c, hover.r) && selected !== 'remove') {
      const b = G.at(state, hover.c, hover.r); setHint(b.kind === 'wall' ? '' : `${G.TOOLS[b.kind].name} · ${descriptions[b.kind]}`); return;
    }
    setHint(selected ? descriptions[selected] : '點選工具，再點草地');
  }
  function prospective() {
    if (state.phase !== 'planning' || !hover || !selected) return state.buildings;
    if (selected === 'remove') return state.buildings.filter(b => b.c !== hover.c || b.r !== hover.r);
    if (!G.canBuild(state, selected, hover.c, hover.r)) return [...state.buildings, { ...hover, kind: selected }];
    return state.buildings;
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
    s += `<g transform="translate(35 ${Y(G.GOAL.r)}) scale(.85)">${A.house()}</g><text x="35" y="${Y(G.GOAL.r) + 65}" text-anchor="middle" fill="#879477" font-size="20" font-weight="600">家</text>`;
    for (const r of G.LEVELS[state.level].entries) s += `<g transform="translate(883 ${Y(r)})"><circle r="22" fill="#efecd9"/><path d="M10 0h-20m7-7-7 7 7 7" stroke="#aa9c78" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    for (const [x, y, a] of [[93, 20, -20], [825, 572, 30], [41, 489, 10], [876, 82, -15]]) s += `<g transform="translate(${x} ${y}) rotate(${a})" opacity=".55"><path d="M0 9q-12-5-11-13Q1-3 0 9m1 0q12-5 11-13Q0-3 1 9" fill="#a6b98a"/><circle cx="16" cy="10" r="3" fill="#dbc78c"/></g>`;
    $('ground-layer').innerHTML = s; $('hit-layer').innerHTML = hits;
  }
  function routes() {
    if (!showRoute) { $('route-layer').innerHTML = ''; return; }
    const plans = G.previews(state, prospective());
    $('route-layer').innerHTML = plans.map(plan => {
      if (!plan.path.length) return '';
      const points = plan.path.map(p => `${X(p.c)},${Y(p.r)}`).join(' ');
      const color = plan.breaking ? '#b78053' : '#a0a67c';
      const arrows = plan.path.slice(0, -1).filter((p, i) => i % 2 === 0).map(p => {
        const i = plan.path.indexOf(p), next = plan.path[i + 1];
        const angle = Math.atan2(next.r - p.r, next.c - p.c) * 180 / Math.PI;
        return `<path d="m-3-4 4 4-4 4" transform="translate(${(X(p.c) + X(next.c)) / 2} ${(Y(p.r) + Y(next.r)) / 2}) rotate(${angle})" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
      }).join('');
      return `<polyline points="${points}" fill="none" stroke="${plan.breaking ? '#ead2ae' : '#efebd0'}" stroke-width="24" stroke-linejoin="round" stroke-linecap="round" opacity=".7"/><polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="2 10" stroke-linejoin="round" stroke-linecap="round" opacity=".6"/>${arrows}`;
    }).join('');
  }
  function selection() {
    $('hover-layer').innerHTML = ''; $('range-layer').innerHTML = '';
    if (!hover) return;
    const x = X(hover.c), y = Y(hover.r), existing = G.at(state, hover.c, hover.r);
    const kind = existing ? existing.kind : selected;
    if (kind && G.TOOLS[kind]?.range) $('range-layer').innerHTML = `<circle cx="${x}" cy="${y}" r="${G.TOOLS[kind].range * S}" fill="${G.TOOLS[kind].color}" fill-opacity=".065" stroke="${G.TOOLS[kind].color}" stroke-width="2" stroke-opacity=".42" stroke-dasharray="5 6"/>`;
    if (state.phase !== 'planning') return;
    const valid = selected === 'remove' ? !!existing : selected && !G.canBuild(state, selected, hover.c, hover.r);
    const color = selected === 'remove' ? '#bb8967' : valid ? '#7c9b6b' : '#c38c75';
    $('hover-layer').innerHTML = `<rect x="${x - 30}" y="${y - 30}" width="60" height="60" rx="8" fill="${color}" fill-opacity=".12" stroke="${color}" stroke-width="2.5"/>${valid && selected !== 'remove' && !existing ? `<g transform="translate(${x} ${y})" opacity=".5">${A.tower(selected)}</g>` : ''}`;
  }
  function renderWorld() {
    $('building-layer').innerHTML = state.buildings.map(b => {
      const hp = G.TOOLS[b.kind].hp;
      const damage = b.hp < hp ? `<path d="M-6-12 0-3-5 7 4 18" fill="none" stroke="#7d6253" stroke-width="2"/><g transform="translate(${-hp * 4} 29)">${Array.from({ length: hp }, (_, i) => `<circle cx="${i * 8}" r="2.5" fill="${i < b.hp ? '#ae8b65' : '#d4cbb7'}"/>`).join('')}</g>` : '';
      return `<g transform="translate(${X(b.c)} ${Y(b.r)})" data-building="${b.kind}" data-c="${b.c}" data-r="${b.r}">${A.tower(b.kind, b.angle, b.flash)}${damage}</g>`;
    }).join('');
    $('bug-layer').innerHTML = state.enemies.map(e => `<g data-enemy="${e.id}" data-hp="${e.hp}" transform="translate(${X(e.x)} ${Y(e.y)})">${A.bug(e.kind, e.hp, state.time + e.id, e.flash, e.shieldFlash, e.slow > 0)}</g>`).join('');
    $('shot-layer').innerHTML = state.shots.map(s => {
      const target = state.enemies.find(e => e.id === s.target);
      if (!target) return '';
      const point = G.impactPoint(target, s);
      const t = Math.min(1, s.age / s.duration), x = X(s.c + (point.x - s.c) * t), y = Y(s.r + (point.y - s.r) * t);
      return `<circle cx="${x}" cy="${y}" r="${s.kind === 'frost' ? 6 : 4.5}" fill="${G.TOOLS[s.kind].color}" stroke="#fffde9" stroke-width="1.5"/>`;
    }).join('');
    $('effects-layer').innerHTML = state.effects.map(e => {
      const t = 1 - e.life / e.duration, x = X(e.x), y = Y(e.y);
      if (e.kind === 'block') {
        const bx = e.vx * t * 60, by = e.vy * t * 60;
        const color = G.TOOLS[e.shotKind]?.color || '#6a8d58';
        return `<g class="block-effect" data-blocked-enemy="${e.enemyId}" opacity="${1 - t}" transform="translate(${x} ${y})">
          <circle r="${5 + t * 21}" fill="none" stroke="#f6d77c" stroke-width="${3 * (1 - t)}"/>
          <path d="m0-11 3 7 8-3-5 7 5 4-8-1-3 8-3-8-8 1 5-4-5-7 8 3Z" fill="#fff4bc" stroke="#d5a34c" stroke-width="1.3" transform="scale(${1 + t * 0.7})"/>
          ${[-150, -115, -75, -35].map(a => { const r = a * Math.PI / 180, d = 11 + t * 26; return `<path d="M${Math.cos(r) * d} ${Math.sin(r) * d}l${Math.cos(r) * 7} ${Math.sin(r) * 7}" stroke="#dbaa52" stroke-width="2.5" stroke-linecap="round"/>`; }).join('')}
          <path d="M${bx - e.vx * 12} ${by - e.vy * 12}L${bx} ${by}" stroke="${color}" stroke-width="3" stroke-linecap="round" opacity=".55"/>
          <circle class="ricochet" cx="${bx}" cy="${by}" r="${e.shotKind === 'frost' ? 5 : 4}" fill="${color}" stroke="#fff8db" stroke-width="1.5"/>
        </g>`;
      }
      const color = e.kind === 'chip' ? '#b4976e' : e.kind === 'home' ? '#c88570' : '#9da96c';
      return `<g opacity="${1 - t}">${[0, 1, 2, 3, 4, 5].map(i => `<circle cx="${x + Math.cos(i * Math.PI / 3) * (10 + t * 27)}" cy="${y + Math.sin(i * Math.PI / 3) * (10 + t * 27)}" r="${4 * (1 - t) + 1}" fill="${color}"/>`).join('')}</g>`;
    }).join('');
  }
  function updateUI(force = false) {
    const signature = [state.level, state.wave, state.phase, state.money, state.hearts, state.undo.length, selected, speed, showRoute].join(':');
    if (!force && signature === uiSignature) return;
    uiSignature = signature;
    $('chapter').textContent = String(state.level + 1).padStart(2, '0'); $('garden-name').textContent = G.LEVELS[state.level].name;
    $('money').textContent = state.money;
    $('hearts').innerHTML = Array.from({ length: 5 }, (_, i) => A.icon('heart', i < state.hearts ? '' : 'empty')).join('');
    $('hearts').setAttribute('aria-label', `小屋生命 ${state.hearts}`);
    document.querySelectorAll('[data-level]').forEach(b => { const active = Number(b.dataset.level) === state.level; b.classList.toggle('active', active); b.setAttribute('aria-current', active ? 'step' : 'false'); });
    $('wave-title').textContent = `第 ${state.wave + 1} 波`;
    $('wave-dots').innerHTML = G.LEVELS[state.level].waves.map((_, i) => `<span class="wave-dot ${i < state.wave ? 'done' : i === state.wave ? 'current' : ''}"></span>`).join('');
    $('wave-preview').innerHTML = G.LEVELS[state.level].waves[state.wave].map(g => `<div class="wave-group" aria-label="${G.ENEMIES[g.kind].name}，每隻 ${g.hp} 下，共 ${g.count} 隻">${A.badge(g.kind, g.hp)}<span>×${g.count}</span></div>`).join('');
    document.querySelectorAll('[data-tool]').forEach(b => {
      b.classList.toggle('selected', b.dataset.tool === selected); b.setAttribute('aria-pressed', String(b.dataset.tool === selected));
      // Keep low-budget tools selectable so their purpose and cost stay readable.
      b.disabled = state.phase !== 'planning';
    });
    $('remove').disabled = state.phase !== 'planning'; $('remove').classList.toggle('active', selected === 'remove'); $('remove').setAttribute('aria-pressed', String(selected === 'remove'));
    $('undo').disabled = state.phase !== 'planning' || state.undo.length === 0;
    $('route-toggle').classList.toggle('active', showRoute); $('route-toggle').setAttribute('aria-pressed', String(showRoute));
    $('speed').textContent = `${speed}×`; $('speed').setAttribute('aria-label', `速度${speed === 1 ? '一' : '兩'}倍`);
    const label = state.phase === 'running' ? '暫停' : state.phase === 'paused' ? '繼續' : state.phase === 'won' ? '看成果' : state.phase === 'lost' ? '再試一次' : '放小蟲';
    $('action').innerHTML = A.icon(state.phase === 'running' ? 'pause' : 'play') + `<span id="action-label">${label}</span>`;
    $('action').classList.toggle('pause-state', state.phase === 'running');
    updateHint();
  }
  function outcome() {
    const won = state.phase === 'won';
    $('result-art').innerHTML = A.icon(won ? 'trophy' : 'leaf');
    $('result-title').textContent = won ? '守住了！' : '換個位置試試';
    $('result-hearts').innerHTML = Array.from({ length: 5 }, (_, i) => A.icon('heart', i < state.hearts ? '' : 'empty')).join('');
    $('result-note').textContent = won ? '4 波完成' : '';
    $('result-primary').textContent = won ? state.level < G.LEVELS.length - 1 ? '下一園' : '再玩一次' : '重試這波';
    $('result-secondary').textContent = won ? '看看花園' : '重新開始';
    if (!$('result').open) $('result').showModal();
  }
  function sync(force = false) {
    if (force || lastRevision !== state.revision) {
      routes(); selection(); lastRevision = state.revision;
      for (const cell of $('hit-layer').querySelectorAll('[data-c]')) {
        const b = G.at(state, +cell.dataset.c, +cell.dataset.r);
        cell.setAttribute('aria-label', `${+cell.dataset.r + 1} 排 ${+cell.dataset.c + 1} 格，${b ? G.TOOLS[b.kind].name : G.terrain(state.level).has(G.key(+cell.dataset.c, +cell.dataset.r)) ? '地形' : '空地'}`);
      }
    }
    if (lastPhase !== state.phase) {
      lastPhase = state.phase;
      if (state.phase === 'planning') save();
      if (state.phase === 'won' || state.phase === 'lost') outcome();
    }
    updateUI(force); renderWorld();
  }
  function loadLevel(level, replacement = null) {
    if ($('result').open) $('result').close();
    state = replacement || G.createState(level); selected = 'pea'; hover = null; transient = ''; accumulator = 0;
    lastPhase = ''; lastRevision = -1; uiSignature = ''; ground(); save(); sync(true);
  }
  function interact(c, r) {
    if (!selected) { selected = G.at(state, c, r)?.kind || 'pea'; updateUI(true); return; }
    const result = selected === 'remove' ? G.remove(state, c, r) : G.build(state, selected, c, r);
    if (!result.ok) message(result.error);
    else { transient = ''; save(); }
    sync(true);
  }
  $('tools').addEventListener('click', event => {
    const tool = event.target.closest('[data-tool]'); if (!tool) return;
    selected = tool.dataset.tool; transient = ''; hover = null; routes(); selection(); updateUI(true);
  });
  $('remove').addEventListener('click', () => { selected = selected === 'remove' ? null : 'remove'; transient = ''; routes(); selection(); updateUI(true); });
  $('undo').addEventListener('click', () => { if (G.undo(state)) { transient = ''; save(); sync(true); } });
  $('reset').addEventListener('click', () => loadLevel(state.level));
  document.querySelectorAll('[data-level]').forEach(b => b.addEventListener('click', () => loadLevel(+b.dataset.level)));
  $('route-toggle').addEventListener('click', () => { showRoute = !showRoute; routes(); updateUI(true); });
  $('speed').addEventListener('click', () => { speed = speed === 1 ? 2 : 1; updateUI(true); });
  $('action').addEventListener('click', () => {
    hover = null; transient = ''; selection();
    if (state.phase === 'planning') { save(); G.startWave(state); }
    else if (state.phase === 'running' || state.phase === 'paused') G.togglePause(state);
    else outcome();
    routes(); sync(true);
  });
  $('hit-layer').addEventListener('click', event => {
    const cell = event.target.closest('[data-c]'); if (!cell) return;
    interact(+cell.dataset.c, +cell.dataset.r);
  });
  $('hit-layer').addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    const cell = event.target.closest('[data-c]'); if (!cell) return;
    if (hover?.c === +cell.dataset.c && hover?.r === +cell.dataset.r) return;
    hover = { c: +cell.dataset.c, r: +cell.dataset.r }; routes(); selection(); updateHint();
  });
  $('board').addEventListener('pointerleave', () => { hover = null; routes(); selection(); updateHint(); });
  $('hit-layer').addEventListener('focusin', event => {
    const cell = event.target.closest('[data-c]'); if (!cell) return;
    focusCell = hover = { c: +cell.dataset.c, r: +cell.dataset.r }; routes(); selection();
  });
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
    if (event.key === 'Escape' && !$('result').open) { selected = null; hover = null; routes(); selection(); updateUI(true); }
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
      accumulator += elapsed * speed;
      while (accumulator >= 1 / 60) { G.step(state, 1 / 60); accumulator -= 1 / 60; }
    } else accumulator = 0;
    sync(); updateHint(); requestAnimationFrame(frame);
  }
  // Read-only diagnostics for verification. No test controls ship in normal play.
  window.gardenDebug = { getState: () => JSON.parse(JSON.stringify(state)), getRoutes: () => G.previews(state) };
  ground(); sync(true); requestAnimationFrame(frame);
})();
