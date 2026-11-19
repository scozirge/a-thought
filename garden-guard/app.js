(function () {
  'use strict';
  const G = window.Garden, A = window.GardenArt;
  const $ = id => document.getElementById(id);
  const S = 64, OX = 76, OY = 40, X = c => OX + (c + 0.5) * S, Y = r => OY + (r + 0.5) * S;
  const STORAGE = 'garden-guard-v1';
  const BATTLE_SPEED = G.BATTLE_SPEED;
  let state = G.createState(), selected = 'pea', hover = null, focusCell = { c: 6, r: 5 };
  let lastWorldTime = -1, lastPhase = '', lastLevel = -1, lastRevision = -1, uiSignature = '', lastFrame = 0, accumulator = 0, rewardTimer = 0;
  let infoAnchor = null, infoTimer = 0;
  try { const saved = G.restore(JSON.parse(localStorage.getItem(STORAGE))); if (saved) state = saved; } catch {}
  $('level-select').innerHTML = G.LEVELS.map((_, i) => `<option value="${i}">第 ${i + 1} 關</option>`).join('');
  $('garden-art').innerHTML = A.definitions();
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = A.icon(el.dataset.icon); });
  $('tools').innerHTML = Object.entries(G.TOOLS).map(([kind, tool]) => `<button class="tool-card" data-tool="${kind}" aria-pressed="false" aria-label="${tool.name}，${tool.cost} 枚金幣">${A.tool(kind)}<span class="tool-cost">${A.icon('coin')}${tool.cost}</span></button>`).join('');

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
    info.innerHTML = `<strong>${tool.name}</strong><p>傷害 ${tool.damage}${tool.burnDamage ? ` · 燃燒 ${tool.burnDamage}/s` : ''}</p><p>攻擊 ${tool.rate}次/s</p><p class="info-target">目標 ${tool.targets.map(t => t === 'ground' ? '地' : '空').join('/')}</p><p class="info-effect">${tool.effect}</p>`;
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
    const data = state.phase === 'planning' || state.phase === 'won' ? G.snapshot(state) : state.checkpoint;
    if (!data) return;
    try { localStorage.setItem(STORAGE, JSON.stringify(data)); } catch {}
  }
  function feedback(text, c, r) {
    $('status').textContent = text;
    const cell = $('hit-layer').querySelector(`[data-c="${c}"][data-r="${r}"]`);
    if (cell) { cell.classList.add('invalid'); setTimeout(() => cell.classList.remove('invalid'), 700); }
  }
  function ground() {
    let s = `<rect x="70" y="36" width="780" height="522" rx="13" fill="#3e5739" opacity=".38"/>
      <rect x="72" y="36" width="776" height="520" rx="10" fill="none" stroke="#70583a" stroke-width="6"/>
      <rect x="73" y="37" width="774" height="518" rx="9" fill="#d0de9e" fill-opacity=".39" stroke="#e6c18a" stroke-width="3"/>
      <path d="M90 34h62m6 0h18m540 524h57m9 0h45" stroke="#fce0ab" stroke-width="1.3" stroke-linecap="round"/>`;
    const solid = G.terrain(state.level);
    const water = new Set(G.LEVELS[state.level].water.map(([c, r]) => G.key(c, r)));
    let hits = '';
    for (let r = 0; r < G.ROWS; r++) {
      hits += '<g role="row">';
      for (let c = 0; c < G.COLS; c++) {
        const x = X(c), y = Y(r), reserved = c === 0 || c === G.COLS - 1 || G.isEntrance(state.level, c, r) || solid.has(G.key(c, r));
        const turf = reserved ? '#ecdfac' : (c + r) % 2 ? '#c6dea3' : '#def0be';
        s += `<rect x="${x - 31.5}" y="${y - 31.5}" width="63" height="63" rx="4" fill="${turf}" fill-opacity=".8"/>`;
        if ((c * 3 + r) % 7 === 0) s += `<path d="M${x + 16} ${y + 23}l-3-4m4 4 1-6m1 6 3-3" stroke="#7c9e5c" opacity=".32" stroke-width="1.5" stroke-linecap="round"/>`;
        if (water.has(G.key(c, r))) {
          s += `<g transform="translate(${x} ${y})"><rect x="-30" y="-30" width="60" height="60" rx="13" fill="#74baba" stroke="#508d83" stroke-width="2"/>
            <path d="M-22-9q8 5 16 0m-7 21q8 5 16 0m7 7h8" stroke="#d5f3df" stroke-width="2.5" stroke-linecap="round" fill="none"/>
            <path d="M13-14l10 1a11 8 0 1 1-4-7Z" fill="#87b569" stroke="#518252" stroke-width="1.8"/></g>`;
        } else if (solid.has(G.key(c, r))) {
          s += `<g transform="translate(${x} ${y})" stroke-linejoin="round"><ellipse cy="21" rx="26" ry="6" fill="#30563a" opacity=".2"/>
            <path d="m-25 9 7-22 22-9 20 12 4 17-10 13h-33Z" fill="#a2afa2" stroke="#586b60" stroke-width="2"/>
            <path d="m-18-13 22-9 9 13L2 4-24 9Z" fill="#d0d5b9"/><path d="M2 4 13-9l11-1 4 17-10 13H4Z" fill="#87998b"/>
            <path d="m-19-8 5-5 9-3m-18 34 4-4 5 3 5-4 4 6" stroke="#bdd092" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;
        }
        const label = `${r + 1} 排 ${c + 1} 格${reserved ? '，通道或地形' : '，草地'}`;
        hits += `<rect class="cell-hit ${reserved ? 'reserved' : ''}" role="gridcell" tabindex="${c === focusCell.c && r === focusCell.r ? 0 : -1}" data-c="${c}" data-r="${r}" aria-label="${label}" x="${x - 31}" y="${y - 31}" width="62" height="62" rx="7"/>`;
      }
      hits += '</g>';
    }
    s += `<g transform="translate(38 ${Y(G.GOAL.r)})">
      <path d="M27 2q6-4 13-1m5-2 9-1" stroke="#c7ae79" stroke-width="6" stroke-linecap="round"/>
      ${A.house()}</g>`;
    for (const entry of G.entrances(state.level)) {
      const x = entry.side === 'right' ? 877 : X(entry.c), y = entry.side === 'right' ? Y(entry.r) : entry.side === 'top' ? 19 : 573;
      const angle = entry.side === 'top' ? -90 : entry.side === 'bottom' ? 90 : 0;
      s += `<g class="entrance" data-side="${entry.side}" data-c="${entry.c}" data-r="${entry.r}" transform="translate(${x} ${y}) rotate(${angle})" stroke-linejoin="round">
      <path d="M2 2h5v23H2Z" fill="#926c42" stroke="#5f5436" stroke-width="1.8"/>
      <path d="m-18 0 9-10h23v20H-9Z" fill="#ffe4a2" stroke="#715a38" stroke-width="2.4"/>
      <path d="M8 0H-7l5-5m-5 5 5 5" stroke="#77552f" stroke-width="3.2" fill="none" stroke-linecap="round"/></g>`;
    }
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
  function drawEnemies(lift) {
    const sprites = [], labels = [], occupied = [];
    const flying = enemy => Number(!!enemy.leap || enemy.kind === 'flyer');
    for (const e of state.enemies.slice().sort((a, b) => flying(a) - flying(b))) {
      const x = X(e.x), y = Y(e.y) - lift(e), id = `bug-hp-${e.id}`;
      sprites.push(`<g data-enemy="${e.id}" data-kind="${e.kind}" data-hp="${e.hp}" data-jumping="${!!e.leap}" transform="translate(${x} ${y})">
        ${A.bug(e.kind, e.hp, state.time + e.id, e.flash, e.shieldFlash, e.slow > 0, id, e.maxHp)}</g>`);
      // Prefer the free side of the shell. Nearby numbers can use the other
      // edge of the same insect, so two health values don't read as one.
      const upper = e.kind === 'shield_down', lowerEdge = 25, upperEdge = -5;
      const first = upper ? upperEdge : lowerEdge, other = upper ? lowerEdge : upperEdge;
      const halfWidth = String(e.hp).length * 8 + 3;
      let bestX = x + 2, bestY = y + first, leastOverlap = Infinity;
      for (const [dx, dy] of [[2, first], [2, other], [-13, first], [14, other]]) {
        const cx = x + dx, cy = y + dy;
        let overlap = 0;
        for (const box of occupied) {
          const w = Math.max(0, halfWidth + box.halfWidth - Math.abs(box.x - cx));
          overlap += w * Math.max(0, 25 - Math.abs(box.y - cy));
        }
        if (overlap < leastOverlap) { bestX = cx; bestY = cy; leastOverlap = overlap; }
        if (!overlap) break;
      }
      occupied.push({x: bestX, y: bestY, halfWidth});
      labels.push(`<use href="#${id}" x="${bestX}" y="${bestY}"/>`);
    }
    $('bug-layer').innerHTML = sprites.join('');
    $('health-layer').innerHTML = labels.join('');
  }
  function aimProgress(b) {
    return b.aim ? Math.min(1, b.aim.age / (G.TOOLS[b.kind].aimSeconds * BATTLE_SPEED)) : 0;
  }
  function renderWorld() {
    const lift = e => e.leap ? Math.sin(Math.PI * Math.min(1, e.leap.age / e.leap.duration)) * 50 : e.kind === 'flyer' ? 12 + Math.sin(state.time * 8 + e.id) * 2 : 0;
    $('fire-layer').innerHTML = state.fires.map(f => {
      const radius = G.TOOLS.flame.burnRadius * S;
      const flicker = Math.sin(state.time * 9 + f.id * 3);
      const rise = (state.time * 1.7 + f.id * .37) % 1;
      return `<g class="ground-fire" transform="translate(${X(f.c)} ${Y(f.r)})" opacity="${Math.min(1, f.life / .8)}">
        <circle r="${radius}" fill="#e97835" opacity=".13"/><circle r="${radius - 1}" fill="none" stroke="#b86237" stroke-width="1.8" stroke-dasharray="8 6" opacity=".65"/>
        <ellipse cy="7" rx="30" ry="14" fill="#a65336" opacity=".28"/>
        <path d="m-25 11 9-4 8 3 8-7 8 2 10-7m-19 8 5 6 9 1" stroke="#f7ac55" stroke-width="2.8" fill="none" stroke-linecap="round"/>
        <use href="#art-firePatch" transform="translate(-17 8) scale(.68 ${.7 + flicker * .12})"/>
        <use href="#art-firePatch" transform="translate(3 1) skewX(${flicker * 6}) scale(.9 ${1 - flicker * .13})"/>
        <use href="#art-firePatch" transform="translate(19 12) scale(.58 ${.65 + flicker * .1})"/>
        <path class="fx-accent" d="m-12-8 2-3m15-3 1-2m7 6 2-3" transform="translate(${rise * 5} ${-rise * 14})" opacity="${1 - rise}" stroke="#ffd576" stroke-width="2.5" stroke-linecap="round"/></g>`;
    }).join('');
    $('building-layer').innerHTML = state.buildings.map(b => {
      const hp = G.TOOLS[b.kind].hp;
      const damage = b.hp < hp ? `<path d="M-6-12 0-3-5 7 4 18" fill="none" stroke="#7d6253" stroke-width="2"/><g transform="translate(${-hp * 4} 29)">${Array.from({ length: hp }, (_, i) => `<circle cx="${i * 8}" r="2.5" fill="${i < b.hp ? '#ae8b65' : '#d4cbb7'}"/>`).join('')}</g>` : '';
      return `<g transform="translate(${X(b.c)} ${Y(b.r)})" data-building="${b.kind}" data-c="${b.c}" data-r="${b.r}">${A.tower(b.kind, b.angle, b.flash, aimProgress(b))}${damage}</g>`;
    }).join('');
    drawEnemies(lift);
    const aiming = ['running', 'paused'].includes(state.phase) ? state.buildings.map(b => {
      if (!b.aim) return '';
      const target = state.enemies.find(e => e.id === b.aim.target && !e.dead);
      if (!target) return '';
      const progress = aimProgress(b);
      const x = X(target.x), y = Y(target.y) - lift(target), radius = 28, length = 2 * Math.PI * radius;
      const muzzleAngle = b.angle * Math.PI / 180;
      return `<g class="molecular-aim" data-tower="${b.id}" data-target="${target.id}">
        <path class="aim-line" d="M${X(b.c) + 25 * Math.cos(muzzleAngle)} ${Y(b.r) - 3 + 25 * Math.sin(muzzleAngle)}L${x} ${y}" stroke="#8552a2" stroke-width="2.3" stroke-linecap="round" stroke-dasharray="4 6" opacity="${.5 + progress * .4}"/>
        <g transform="translate(${x} ${y})" fill="none"><circle r="${radius}" stroke="#fff2d9" stroke-opacity=".85" stroke-width="3"/>
        <circle class="aim-charge" r="${radius}" stroke="#9657b0" stroke-width="3.8" stroke-dasharray="${length * progress} ${length}" transform="rotate(-90)"/>
        <path d="M-33 0h9m48 0h9M0-33v9m0 48v9" stroke="#794e90" stroke-width="2.6"/></g></g>`;
    }).join('') : '';
    $('shot-layer').innerHTML = aiming + state.shots.map(s => {
      if (s.kind === 'pierce') {
        const range = G.TOOLS.pierce.range;
        return A.flight(s.kind, X(s.c), Y(s.r), X(s.c + s.ux * range), Y(s.r + s.uy * range), 1 - s.remaining / range, s.angle);
      }
      const target = state.enemies.find(e => e.id === s.target);
      const point = target ? G.impactPoint(target, s) : ['flame', 'push'].includes(s.kind) && Number.isFinite(s.impactX) ? { x: s.impactX, y: s.impactY } : null;
      if (!point) return '';
      return A.flight(s.kind, X(s.c), Y(s.r) - 3, X(point.x), Y(point.y) - (target ? lift(target) : 0), Math.min(1, s.age / s.duration), s.angle);
    }).join('');
    $('effects-layer').innerHTML = state.effects.map(e => {
      const t = 1 - e.life / e.duration, x = X(e.x), y = Y(e.y);
      const at = `transform="translate(${x} ${y})" opacity="${1 - t}"`;
      if (e.kind === 'frost') {
        const radius = e.radius * S, front = (.32 + .68 * t) * radius;
        return `<g class="frost-area-effect" ${at}><circle r="${radius}" fill="#a7ebf3" fill-opacity=".13"/>
          <circle r="${front}" fill="none" stroke="#438eac" stroke-width="2.5"/><circle r="${Math.max(1,front - 3)}" fill="none" stroke="#e5ffff" stroke-width="2"/>
          ${[15,105,195,285].map(a => `<g transform="rotate(${a}) translate(${front - 3} 0)"><path d="m-8 0 6-3 5 3-5 3Z" fill="#baf4ff" stroke="#579cb4" stroke-width="1.2"/></g>`).join('')}
          <use href="#art-snowflake" color="#e7ffff" transform="scale(${1.2 - t * .5})"/></g>`;
      }
      if (e.kind === 'push-cell') return `<g class="push-cell-effect" ${at}><rect x="-31" y="-31" width="62" height="62" rx="7" fill="#96cee1" fill-opacity=".14"/>
        <path d="M-29-15v-8q0-6 6-6h8m30 0h8q6 0 6 6v8m0 30v8q0 6-6 6h-8m-30 0h-8q-6 0-6-6v-8" fill="none" stroke="#4b8399" stroke-width="3.2" stroke-linecap="round"/>
        <circle r="${8 + t * 21}" fill="none" stroke="#e1faff" stroke-width="${3 - t}"/></g>`;
      if (e.kind === 'hatch') return `<g class="hatch-effect" ${at} fill="#ffefc7" stroke="#a77f63" stroke-width="2">
        <path transform="translate(${-t * 9} ${-t * 7}) rotate(${-t * 25})" d="M-9 1q-1-15 7-17 8 0 10 12L4-6 0-1-4-5Z"/>
        <path transform="translate(${t * 9} ${t * 6}) rotate(${t * 20})" d="m-10 3 6-3 4 4 4-6 6 3C9 17-8 17-10 3Z"/></g>`;
      if (e.kind === 'split') {
        const start = G.enemyArtScale('splitter', e.maxHp);
        const plates = e.offspring.map((child, i) => {
          const dx = (child.x - e.x) * S * t + 2 * start * (1 - t);
          const dy = (child.y - e.y) * S * t;
          return A.splitPlateAt(i, dx, dy, start * (1 - t));
        });
        return `<g class="split-effect" ${at}>${plates.join('')}</g>`;
      }
      if (e.kind === 'leap') return `<path class="leap-effect" d="M${x} ${y}Q${(x + X(e.toX)) / 2} ${Math.min(y, Y(e.toY)) - 75} ${X(e.toX)} ${Y(e.toY)}" fill="none" stroke="#688a38" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="2 8" opacity="${(1 - t) * .75}"/>`;
      if (e.kind === 'blast') {
        const front = (.22 + t * .78) * e.radius * S;
        return `<g class="blast-effect" ${at}><circle r="${front}" fill="#f3a74b" fill-opacity=".1" stroke="#af7340" stroke-width="2.5"/>
          <circle r="${front - 4}" fill="none" stroke="#ffe5a8" stroke-width="2"/>
          ${[15,78,142,204,274,325].map(a => `<g class="fx-accent" transform="rotate(${a}) translate(${front - 8} 0) scale(${1 - .45 * t})"><path d="M-8 1q-2-5 2-6 2-5 7-2 6-1 6 4 5 4 0 6-5 2-8 0-6 2-7-2Z" fill="#d3b18c" stroke="#a17e57" stroke-width="1.1"/></g>`).join('')}
          <path transform="scale(${1 - t})" d="m0-20 6 12 10-4-4 11 10 4-13 3 1 11-10-7-9 6 1-12-10-4 12-4-2-10Z" fill="#ffd170" stroke="#ce7437" stroke-width="2"/></g>`;
      }
      if (e.kind === 'molecular') return `<g class="molecular-effect" ${at}><g transform="rotate(${t * 55}) scale(${.65 + t * .7})" fill="none" stroke="#8554a6" stroke-width="2.4">
        <ellipse rx="24" ry="8" transform="rotate(32)"/><ellipse rx="24" ry="8" transform="rotate(-32)"/>
        <g fill="#b6eeee" stroke="#735292" stroke-width="1.5"><circle cx="20" cy="-12" r="3.5"/><circle cx="-20" cy="-12" r="3"/></g></g>
        <path transform="scale(${1 - .7 * t})" d="m0-15 4 11 11 4-11 4-4 12-4-12-11-4 11-4Z" fill="#fff1b7" stroke="#af7dbd" stroke-width="1.6"/></g>`;
      if (e.kind === 'push') return `<g class="push-effect" transform="translate(${x + e.ux * t * 68} ${y + e.uy * t * 68}) rotate(${Math.atan2(e.uy, e.ux) * 180 / Math.PI})" opacity="${1 - t}" fill="none" stroke-linecap="round"><path d="m-24-10 13 2m-16 7h12m-10 9 12-2" stroke="#6996aa" stroke-width="2.5"/><path d="M-7-11Q7 0-7 11" stroke="#497c95" stroke-width="4.5"/><path d="M-6-9Q4 0-6 9" stroke="#d8fbff" stroke-width="2.2"/></g>`;
      if (e.kind === 'burn') return `<g class="burn-effect" ${at}><use href="#art-firePatch" transform="translate(11 ${8 - t * 16}) scale(${.62 - t * .32})"/></g>`;
      if (e.kind === 'block') {
        const bx = e.vx * t * 60, by = e.vy * t * 60;
        const color = G.TOOLS[e.shotKind]?.color || '#6a8d58';
        return `<g class="block-effect" data-blocked-enemy="${e.enemyId}" opacity="${1 - t}" transform="translate(${x} ${y})">
          <circle r="${5 + t * 21}" fill="none" stroke="#f6d77c" stroke-width="${3 * (1 - t)}"/>
          <path d="m0-11 3 7 8-3-5 7 5 4-8-1-3 8-3-8-8 1 5-4-5-7 8 3Z" fill="#fff4bc" stroke="#d5a34c" stroke-width="1.3" transform="scale(${1 + t * 0.7})"/>
          ${[-150, -115, -75, -35].map(a => { const r = a * Math.PI / 180 * (e.vy > 0 ? -1 : 1), d = 11 + t * 26; return `<path d="M${Math.cos(r) * d} ${Math.sin(r) * d}l${Math.cos(r) * 7} ${Math.sin(r) * 7}" stroke="#dbaa52" stroke-width="2.5" stroke-linecap="round"/>`; }).join('')}
          <path d="M${bx - e.vx * 12} ${by - e.vy * 12}L${bx} ${by}" stroke="${color}" stroke-width="3" stroke-linecap="round" opacity=".55"/>
          <g class="ricochet" transform="translate(${bx} ${by}) scale(.65)">${G.TOOLS[e.shotKind]?.rate ? A.shot(e.shotKind, 0, 0, Math.atan2(e.vy, e.vx) * 180 / Math.PI) : '<circle r="5" fill="#efaf55"/>'}</g>
        </g>`;
      }
      if (e.kind === 'home') return `<g ${at}><g transform="translate(-14 ${-12 - t * 16}) scale(1.15)">${A.icon('heart')}</g></g>`;
      const color = e.kind === 'chip' ? '#aa7d51' : '#75a450';
      return `<g opacity="${1 - t}">${[0, 1, 2, 3, 4, 5].map(i => `<circle cx="${x + Math.cos(i * Math.PI / 3) * (10 + t * 27)}" cy="${y + Math.sin(i * Math.PI / 3) * (10 + t * 27)}" r="${4 * (1 - t) + 1}" fill="${color}"/>`).join('')}</g>`;
    }).join('');
  }
  function updateUI(force = false) {
    const advancing = G.isAdvancing(state);
    const signature = [state.level, state.wave, state.phase, state.money, state.hearts, state.undo.length, selected].join(':');
    if (!force && signature === uiSignature) return;
    uiSignature = signature;
    $('money').textContent = state.money;
    $('coins').setAttribute('aria-label', `可用金幣 ${state.money}`);
    $('health').textContent = state.hearts;
    $('hearts').setAttribute('aria-label', `小屋生命 ${state.hearts}`);
    $('level-select').value = String(state.level);
    document.querySelectorAll('[data-tool]').forEach(b => {
      b.classList.toggle('selected', b.dataset.tool === selected); b.setAttribute('aria-pressed', String(b.dataset.tool === selected));
      // Keep low-budget tools selectable to inspect their range.
      b.setAttribute('aria-disabled', String(state.phase !== 'planning'));
    });
    $('remove').disabled = state.phase !== 'planning'; $('remove').classList.toggle('active', selected === 'remove'); $('remove').setAttribute('aria-pressed', String(selected === 'remove'));
    $('undo').disabled = state.phase !== 'planning' || state.undo.length === 0;
    $('reset').setAttribute('aria-label', state.phase === 'planning' ? '清空部署，全額退款' : state.phase === 'won' ? '回到第一關' : '重試這關');
    const label = advancing ? '暫停' : state.phase === 'paused' ? '繼續' : state.phase === 'won' ? '看成果' : state.phase === 'lost' ? '再試一次' : state.level > 0 ? '下一關' : '開始';
    $('action').innerHTML = state.phase === 'planning' ? label : A.icon(advancing ? 'pause' : 'play');
    $('action').setAttribute('aria-label', label);
    $('action').classList.toggle('pause-state', advancing);
  }
  function outcome() {
    hideInfo();
    const won = state.phase === 'won';
    $('result-art').innerHTML = A.icon(won ? 'trophy' : 'leaf');
    $('result-title').textContent = won ? '十關完成！' : '再試一次';
    $('result-hearts').innerHTML = Array.from({ length: 5 }, (_, i) => A.icon('heart', i < state.hearts ? '' : 'empty')).join('');
    $('result-primary').textContent = won ? '再玩一次' : '重試這關';
    $('result-secondary').textContent = won ? '看看花園' : '回到第一關';
    if (!$('result').open) $('result').showModal();
  }
  function sync(force = false) {
    if (lastLevel !== state.level) { hideInfo(); hover = null; lastLevel = state.level; ground(); }
    if (force || lastRevision !== state.revision) {
      selection(); lastRevision = state.revision;
      for (const cell of $('hit-layer').querySelectorAll('[data-c]')) {
        const b = G.at(state, +cell.dataset.c, +cell.dataset.r);
        cell.setAttribute('aria-label', `${+cell.dataset.r + 1} 排 ${+cell.dataset.c + 1} 格，${b ? G.TOOLS[b.kind].name : G.terrain(state.level).has(G.key(+cell.dataset.c, +cell.dataset.r)) ? '地形' : '空地'}`);
      }
      if (infoAnchor?.classList.contains('cell-hit')) showCellInfo(infoAnchor);
    }
    if (lastPhase !== state.phase) {
      const finished = lastPhase === 'running' && (state.phase === 'planning' || state.phase === 'won');
      lastPhase = state.phase;
      if (state.phase === 'planning' || state.phase === 'running' || state.phase === 'won') save();
      if (finished) {
        $('status').textContent = `過關，獲得 ${state.lastReward} 枚金幣${state.phase === 'planning' ? '，可以部署下一關' : ''}`;
        $('reward').textContent = `+${state.lastReward}`; $('reward').hidden = false;
        clearTimeout(rewardTimer); rewardTimer = setTimeout(() => { $('reward').hidden = true; }, 3000);
      }
      selection();
      if (state.phase === 'won' || state.phase === 'lost') outcome();
    }
    updateUI(force);
    if (force || state.time !== lastWorldTime) { renderWorld(); lastWorldTime = state.time; }
  }
  function loadLevel(level, replacement = null) {
    hideInfo();
    if ($('result').open) $('result').close();
    state = replacement || G.createState(level); selected = 'pea'; hover = null; $('status').textContent = ''; accumulator = 0;
    clearTimeout(rewardTimer); $('reward').hidden = true;
    lastPhase = ''; lastLevel = -1; lastRevision = -1; uiSignature = ''; save(); sync(true);
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
  $('reset').addEventListener('click', () => {
    if (state.checkpoint) loadLevel(state.level, G.retry(state));
    else if (state.phase === 'planning') {
      // Reorganise the current budget without erasing earned campaign funds.
      for (const b of [...state.buildings]) G.remove(state, b.c, b.r);
      state.undo = []; save(); sync(true);
    } else loadLevel(0);
  });
  $('level-select').addEventListener('change', event => loadLevel(Number(event.target.value)));
  $('solution').addEventListener('click', () => {
    loadLevel(state.level, window.GardenSolutions.create(state.level));
    $('status').textContent = '已重設本關並放上解答，按開始出怪';
  });
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
    else loadLevel(0);
  });
  $('result-secondary').addEventListener('click', () => { if (state.phase === 'lost') loadLevel(0); else $('result').close(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.isAdvancing(state)) { G.togglePause(state); save(); sync(true); }
    accumulator = 0; lastFrame = 0;
  });

  // Deterministic fixed simulation step; pause does not bank elapsed time.
  function frame(now) {
    const elapsed = lastFrame ? Math.min((now - lastFrame) / 1000, 0.1) : 0; lastFrame = now;
    if (G.isAdvancing(state)) {
      accumulator += elapsed * BATTLE_SPEED;
      while (accumulator >= 1 / 60) { G.step(state, 1 / 60); accumulator -= 1 / 60; }
    } else accumulator = 0;
    sync(); requestAnimationFrame(frame);
  }
  // Read-only diagnostics for verification. No test controls ship in normal play.
  window.gardenDebug = { getState: () => JSON.parse(JSON.stringify(state)), getRoutes: () => G.previews(state) };
  ground(); sync(true); requestAnimationFrame(frame);
})();
