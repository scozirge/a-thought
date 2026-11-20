(function () {
  'use strict';
  const G = window.Garden, A = window.GardenArt;
  const $ = id => document.getElementById(id);
  const S = 64, OX = 76, OY = 40, X = c => OX + (c + 0.5) * S, Y = r => OY + (r + 0.5) * S;
  const castleX = () => X(G.LEVELS[state.level].goal.c);
  const castleY = () => Y(G.LEVELS[state.level].goal.r);
  const castleScale = () => state.level === G.BONUS_LEVEL ? .78 : 1;
  const STORAGE = 'garden-guard-v1';
  const UNLOCK = 'garden-guard-bonus-unlocked';
  const BATTLE_SPEED = G.BATTLE_SPEED;
  const enemyHealth = $('enemy-health'), showRoutes = $('route-toggle');
  let state = G.createState(), selected = 'pea', hover = null, focusCell = { c: 6, r: 5 };
  let lastWorldTime = -1, lastPhase = '', lastRevision = -1, uiSignature = '', lastFrame = 0, accumulator = 0;
  let finishAge = null, resultAfterHeart = false, frameId = null;
  let infoAnchor = null, infoTimer = 0, unlockSaved = false;
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE));
    const saved = G.restore(data);
    if (saved) {
      state = saved;
      showRoutes.checked = data.showRoutes !== false;
      enemyHealth.checked = typeof data.showEnemyHealth === 'boolean' ? data.showEnemyHealth : state.level === 0;
    }
    unlockSaved = localStorage.getItem(UNLOCK) === '1';
    if (unlockSaved) state.bonusUnlocked = true;
  } catch {}
  let lastLevel = state.level;
  $('level-select').innerHTML = G.LEVELS.slice(0, G.BONUS_LEVEL).map((_, i) => `<option value="${i}">第 ${i + 1} 關</option>`).join('');
  $('garden-art').innerHTML = A.definitions() + `<clipPath id="field-bounds"><rect x="${OX}" y="${OY}" width="${G.COLS * S}" height="${G.ROWS * S}" rx="6"/></clipPath>`;
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = A.icon(el.dataset.icon); });
  $('tools').innerHTML = Object.entries(G.TOOLS).map(([kind, tool]) => `<button class="tool-card" data-tool="${kind}" aria-pressed="false" aria-label="${tool.name}，${tool.cost} 枚金幣">${A.tool(kind)}<span class="tool-cost">${A.icon('coin')}${tool.cost}</span></button>`).join('');

  function hideInfo() {
    clearTimeout(infoTimer); $('tower-info').hidden = true;
    infoAnchor?.removeAttribute('aria-describedby'); infoAnchor = null;
  }
  function deferHideInfo() { clearTimeout(infoTimer); infoTimer = setTimeout(hideInfo, 140); }
  function showInfo(kind, anchor, upgraded = false, building = null) {
    const tool = G.toolFor(kind, upgraded), next = G.toolFor(kind, true);
    if (!tool || (!tool.rate && !state.upgradeItems && !building)) { hideInfo(); return; }
    hideInfo(); infoAnchor = anchor;
    const info = $('tower-info');
    info.dataset.kind = kind;
    const stats = tool.rate ? `<p>傷害 ${tool.damage}${tool.burnDamage ? ` · 燃燒 ${tool.burnDamage}/s` : ''}</p><p>攻擊 ${tool.rate}次/s</p><p class="info-target">目標 ${tool.targets.map(t => t === 'ground' ? '地' : '空').join('/')}</p><p class="info-effect">${tool.effect}</p>` : '<p>擋住去路，引導蟲群繞行。</p>';
    info.innerHTML = `<strong>${tool.name}</strong>${building ? `<p class="last-damage">${building.lastDamage == null ? '尚無上局傷害紀錄' : `上局傷害 ${building.lastDamage} 點`}</p>` : ''}${stats}${next && !upgraded && state.upgradeItems ? `<p class="next-upgrade">升級為${next.name}<br>${next.effect}</p>` : ''}`;
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
    const c = +cell.dataset.c, r = +cell.dataset.r, b = G.at(state, c, r);
    if (b) showInfo(b.kind, cell, b.upgraded, b);
    else if (G.isHome(state.level, c, r)) showInfo('castle', cell);
    else hideInfo();
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
    try {
      if (state.bonusUnlocked && !unlockSaved) {
        localStorage.setItem(UNLOCK, '1');
        unlockSaved = true;
      }
      localStorage.setItem(STORAGE, JSON.stringify({ ...data, showRoutes: showRoutes.checked, showEnemyHealth: enemyHealth.checked }));
    } catch {}
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
        const x = X(c), y = Y(r), reserved = c === 0 || c === G.COLS - 1 || G.isEntrance(state.level, c, r) || G.isHome(state.level, c, r) || solid.has(G.key(c, r));
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
    $('home-layer').innerHTML = `<g class="garden-home" transform="translate(${castleX()} ${castleY()}) scale(${castleScale()})">${A.castle()}</g>`;
    for (const entry of G.entrances(state.level)) {
      const horizontal = entry.side === 'left' || entry.side === 'right';
      const x = horizontal ? (entry.side === 'right' ? 877 : 38) : X(entry.c);
      const y = horizontal ? Y(entry.r) : entry.side === 'top' ? 19 : 573;
      const angle = { left: 180, right: 0, top: -90, bottom: 90 }[entry.side];
      s += `<g class="entrance" data-side="${entry.side}" data-c="${entry.c}" data-r="${entry.r}" transform="translate(${x} ${y}) rotate(${angle})" stroke-linejoin="round">
      <path d="M2 2h5v23H2Z" fill="#926c42" stroke="#5f5436" stroke-width="1.8"/>
      <path d="m-18 0 9-10h23v20H-9Z" fill="#ffe4a2" stroke="#715a38" stroke-width="2.4"/>
      <path d="M8 0H-7l5-5m-5 5 5 5" stroke="#77552f" stroke-width="3.2" fill="none" stroke-linecap="round"/></g>`;
    }
    $('ground-layer').innerHTML = s; $('hit-layer').innerHTML = hits;
  }
  function drawRoutes() {
    const layer = $('route-layer');
    if (state.phase !== 'planning' || !showRoutes.checked) { layer.replaceChildren(); return; }
    const segments = new Map(), fliers = new Map();
    for (const plan of G.previews(state)) {
      for (let i = 1; i < plan.path.length; i++) {
        const a = plan.path[i - 1], b = plan.path[i];
        const key = `${a.c},${a.r}/${b.c},${b.r}`;
        // Shared sections need just one line, even when several entrances merge.
        if (!segments.has(key) || !plan.breaking) segments.set(key, { a, b, breaking: plan.breaking });
      }
    }
    for (const item of G.spawnQueue(state.level)) {
      if (G.ENEMIES[item.kind].airborne) fliers.set(G.key(item.position.x, item.position.y), item.position);
    }
    const air = [...fliers.values()].map(p => `M${X(p.x)} ${Y(p.y)} L${X(G.LEVELS[state.level].goal.c)} ${Y(G.LEVELS[state.level].goal.r)}`).join(' ');
    const ground = [...segments.values()].map(({a, b, breaking}) => {
      const x = X(a.c), y = Y(a.r), dx = X(b.c) - x, dy = Y(b.r) - y;
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      const color = breaking ? '#a56137' : '#527b49';
      return `<g class="ground-route" transform="translate(${x} ${y}) rotate(${angle})" stroke="${color}"><path d="M0 0h${S}" stroke-width="2.5" stroke-dasharray="3 5"/><path d="m27-3 5 3-5 3" stroke-width="2.4" stroke-linejoin="round"/></g>`;
    }).join('');
    layer.innerHTML = `<g fill="none" stroke-linecap="round" opacity=".73">${ground}${air ? `<path class="air-route" d="${air}" stroke="#417c99" opacity=".65" stroke-width="2" stroke-dasharray="8 7"/>` : ''}</g>`;
  }
  function selection() {
    $('hover-layer').innerHTML = ''; $('range-layer').innerHTML = '';
    if (!hover) return;
    const x = X(hover.c), y = Y(hover.r), existing = G.at(state, hover.c, hover.r);
    const home = G.isHome(state.level, hover.c, hover.r);
    const kind = home ? 'castle' : existing?.kind ?? selected;
    const tool = G.toolFor(kind, existing?.upgraded || (existing && selected === 'upgrade'));
    if (tool?.range) $('range-layer').innerHTML = `<circle cx="${x}" cy="${y}" r="${tool.range * S}" fill="${tool.color}" fill-opacity=".065" stroke="${tool.color}" stroke-width="2" stroke-opacity=".42" stroke-dasharray="5 6"/>`;
    if (home || state.phase !== 'planning') return;
    const valid = selected === 'upgrade' ? existing && !existing.upgraded && state.upgradeItems > 0 : selected === 'remove' ? !!existing : selected && !G.canBuild(state, selected, hover.c, hover.r);
    const color = selected === 'remove' ? '#bb8967' : existing || valid ? '#7c9b6b' : '#c38c75';
    $('hover-layer').innerHTML = `<rect x="${x - 30}" y="${y - 30}" width="60" height="60" rx="8" fill="${color}" fill-opacity=".12" stroke="${color}" stroke-width="2.5"/>${valid && selected !== 'remove' && !existing ? `<g transform="translate(${x} ${y})" opacity=".5">${A.tower(selected)}</g>` : ''}`;
  }
  const svg = tag => document.createElementNS('http://www.w3.org/2000/svg', tag);
  const enemyViews = new Map();
  function placeAfter(parent, node, previous) {
    const next = previous ? previous.nextElementSibling : parent.firstElementChild;
    if (node !== next) parent.insertBefore(node, next);
  }
  function updateEnemy(view, enemy, showHealth) {
    const time = state.time + enemy.id, slow = enemy.slow > 0;
    const hp = showHealth ? enemy.hp : null;
    const burning = enemy.burnTicks > 0, stunned = enemy.stun > 1e-9 && !enemy.push, shocked = enemy.shock > 1e-9;
    const appearance = [hp, slow, burning, stunned, shocked, enemy.flash > 0, enemy.shieldFlash > 0].join('/');
    if (view.appearance !== appearance) {
      const node = view.node;
      node.innerHTML = A.bug(enemy.kind, hp, time, enemy.flash, enemy.shieldFlash, slow, view.labelId, enemy.maxHp);
      if (burning || shocked || stunned) {
        node.insertAdjacentHTML('beforeend', `<g class="bug-status">
          ${burning ? '<use href="#art-firePatch" transform="translate(13 -9) scale(.44)"/>' : ''}
          ${shocked ? '<path d="m-22-12 7-5-1 8 7-3m18 21 6-9 1 6 6-5" fill="none" stroke="#315f88" stroke-width="4.5"/><path d="m-22-12 7-5-1 8 7-3m18 21 6-9 1 6 6-5" fill="none" stroke="#befbff" stroke-width="2.2"/>' : ''}
          ${stunned ? '<g stroke="#a17533" fill="#ffe795" stroke-width="1.2"><path d="m-11-19 1-4 3 3 4 1-4 2-2 4-1-4-4-1Zm17-3 2-4 2 3 4 2-4 1-2 4-1-4-4-2Z"/></g>' : ''}</g>`);
      }
      view.legs = node.querySelector('.bug-legs');
      view.wings = node.querySelector('.bug-wings');
      view.jaws = enemy.kind === 'giant' ? node.querySelectorAll('use[href="#art-stagJaw"]') : null;
      view.hit = node.querySelector('.hit-flash');
      view.block = node.querySelector('.shield-flash');
      view.appearance = appearance;
    } else {
      const pose = A.bugPose(enemy.kind, time);
      view.legs.setAttribute('transform', pose.legs);
      if (view.wings) view.wings.setAttribute('transform', pose.wings);
      if (view.jaws) for (const jaw of view.jaws) jaw.setAttribute('transform', pose.jaw);
      if (view.hit) view.hit.setAttribute('opacity', Math.min(1, enemy.flash * 8));
      if (view.block) view.block.setAttribute('opacity', Math.min(1, enemy.shieldFlash / .12));
    }
    if (view.facing !== enemy.facing) {
      view.node.style.setProperty('--bug-facing', enemy.facing + 'deg');
      view.facing = enemy.facing;
    }
    if (view.hp !== enemy.hp) {
      view.node.dataset.hp = enemy.hp;
      view.hp = enemy.hp;
    }
    const jumping = !!enemy.leap;
    if (view.jumping !== jumping) {
      view.node.dataset.jumping = jumping;
      view.jumping = jumping;
    }
  }
  function drawEnemies(lift) {
    const layer = $('bug-layer'), labels = $('health-layer'), occupied = [];
    const showHealth = enemyHealth.checked;
    const living = new Set(state.enemies);
    for (const [enemy, view] of enemyViews) {
      if (living.has(enemy)) continue;
      view.node.remove(); view.label?.remove(); enemyViews.delete(enemy);
    }
    const flying = enemy => Number(!!enemy.leap || enemy.kind === 'flyer');
    let previous = null, previousLabel = null;
    for (const e of state.enemies.slice().sort((a, b) => flying(a) - flying(b))) {
      let view = enemyViews.get(e);
      if (!view) {
        view = { node: svg('g'), labelId: `bug-hp-${e.id}` };
        view.node.dataset.enemy = e.id; view.node.dataset.kind = e.kind;
        enemyViews.set(e, view);
      }
      const x = X(e.x), y = Y(e.y) - lift(e);
      updateEnemy(view, e, showHealth);
      view.node.setAttribute('transform', `translate(${x} ${y})`);
      placeAfter(layer, view.node, previous);
      previous = view.node;
      if (!showHealth) {
        if (view.label) { view.label.remove(); view.label = null; }
        continue;
      }
      // Prefer the free side of the shell. Nearby numbers can use the other
      // edge of the same insect, so two health values don't read as one.
      const upper = e.kind === 'shield_down', lowerEdge = 25, upperEdge = -5;
      const first = upper ? upperEdge : lowerEdge, other = upper ? lowerEdge : upperEdge;
      const halfWidth = String(e.hp).length * 6.5 + 2;
      let bestX = x + 2, bestY = y + first, leastOverlap = Infinity;
      for (const [dx, dy] of [[2, first], [2, other], [-13, first], [14, other]]) {
        const cx = x + dx, cy = y + dy;
        let overlap = 0;
        for (const box of occupied) {
          const w = Math.max(0, halfWidth + box.halfWidth - Math.abs(box.x - cx));
          overlap += w * Math.max(0, 21 - Math.abs(box.y - cy));
        }
        if (overlap < leastOverlap) { bestX = cx; bestY = cy; leastOverlap = overlap; }
        if (!overlap) break;
      }
      occupied.push({x: bestX, y: bestY, halfWidth});
      if (!view.label) {
        view.label = svg('use');
        view.label.setAttribute('href', '#' + view.labelId);
      }
      view.label.setAttribute('x', bestX); view.label.setAttribute('y', bestY);
      placeAfter(labels, view.label, previousLabel);
      previousLabel = view.label;
    }
  }
  function aimProgress(b) {
    return b.aim ? Math.min(1, b.aim.age / (G.TOOLS[b.kind].aimSeconds * BATTLE_SPEED)) : 0;
  }
  let buildingBoard, buildingRevision, buildingViews;
  function drawBuildings(beams, visibleFlash) {
    if (buildingBoard !== state || buildingRevision !== state.revision) {
      buildingBoard = state; buildingRevision = state.revision;
      buildingViews = state.buildings.map(b => {
        const node = svg('g');
        node.setAttribute('transform', `translate(${X(b.c)} ${Y(b.r)})`);
        node.dataset.upgraded = b.upgraded; node.dataset.building = b.kind; node.dataset.c = b.c; node.dataset.r = b.r;
        return { building: b, node };
      });
      $('building-layer').replaceChildren(...buildingViews.map(view => view.node));
    }
    for (const view of buildingViews) {
      const b = view.building, angle = beams.get(b.id)?.angle ?? b.angle;
      const flash = visibleFlash(b), charge = aimProgress(b);
      if (view.angle === angle && view.flash === flash && view.charge === charge && view.hp === b.hp) continue;
      view.angle = angle; view.flash = flash; view.charge = charge; view.hp = b.hp;
      const hp = G.TOOLS[b.kind].hp;
      const damage = b.hp < hp ? `<path d="M-6-12 0-3-5 7 4 18" fill="none" stroke="#7d6253" stroke-width="2"/><g transform="translate(${-hp * 4} 29)">${Array.from({ length: hp }, (_, i) => `<circle cx="${i * 8}" r="2.5" fill="${i < b.hp ? '#ae8b65' : '#d4cbb7'}"/>`).join('')}</g>` : '';
      view.node.innerHTML = A.tower(b.kind, angle, flash, charge, b.upgraded) + damage;
    }
  }
  function renderWorld() {
    $('castle-bow').setAttribute('transform', `rotate(${state.castle?.angle ?? 0})`);
    const lift = e => G.enemyLift(e, state.time);
    const settled = finishAge ?? 0;
    const beams = new Map(state.effects.filter(e => e.kind === 'laser' && e.life > settled).map(e => [e.tower, e]));
    const visibleFlash = b => Math.max(0, b.flash - settled / G.RECOIL_SECONDS);
    const auras = state.effects.filter(e => e.kind === 'frost' && e.life > settled).map(e => {
      const opacity = (e.life - settled) / e.duration;
      return `<g class="frost-area-effect" opacity="${opacity}" transform="translate(${X(e.x)} ${Y(e.y)})">${A.aura(e.radius * S, 1 - opacity, e.upgraded)}</g>`;
    }).join('');
    $('fire-layer').innerHTML = auras + state.fires.map(f => {
      const radius = G.TOOLS.flame.burnRadius * S;
      const flicker = Math.sin(state.time * 9 + f.id * 3);
      const bloom = .55 + .45 * Math.min(1, (state.time + settled - f.bornAt) / .28);
      return `<g class="ground-fire" transform="translate(${X(f.c)} ${Y(f.r)}) scale(${bloom})" opacity="${Math.min(1, f.life / .65)}">
        <circle class="heated-soil" r="${radius}" fill="url(#art-warm-soil)" opacity="${.91 + .07 * flicker}"/>
        <path d="m-25 7 8-3 6 2 9-5 7 3 10-5m-24 8 5 6 7-1" fill="none" stroke="#ffa079" stroke-width="1.7" opacity=".72" stroke-linecap="round"/>
        ${f.emberLife > 0 ? `<g fill="#ffd174" stroke="#cb5f34" stroke-width="1.1"><circle cx="-10" cy="${-7 - flicker * 3}" r="2"/><circle cx="8" cy="${4 + flicker * 2}" r="1.7"/></g>` : ''}
        <use href="#art-firePatch" transform="translate(-16 6) skewX(${flicker * 5}) scale(.30 ${.32 + flicker * .05})"/>
        <use href="#art-firePatch" transform="translate(15 -4) scale(.23 ${.25 - flicker * .05})"/>
        <use href="#art-firePatch" transform="translate(6 13) scale(.16 ${.18 + flicker * .04})"/></g>`;
    }).join('');
    drawBuildings(beams, visibleFlash);
    drawEnemies(lift);
    const aiming = ['running', 'paused'].includes(state.phase) ? state.buildings.map(b => {
      if (!b.aim) return '';
      const target = state.enemies.find(e => e.id === b.aim.target && !e.dead);
      if (!target) return '';
      const progress = aimProgress(b);
      const x = X(target.x), y = Y(target.y) - lift(target), radius = 28, length = 2 * Math.PI * radius;
      const muzzleAngle = b.angle * Math.PI / 180;
      return `<g class="molecular-aim" data-tower="${b.id}" data-target="${target.id}">
        <path class="aim-line" d="M${X(b.c) + 25 * Math.cos(muzzleAngle)} ${Y(b.r) - 3 + 25 * Math.sin(muzzleAngle)}L${x} ${y}" stroke="#8552a2" stroke-width="2.3" stroke-linecap="round" stroke-dasharray="4 6" stroke-dashoffset="${-progress * 40}" opacity="${.5 + progress * .4}"/>
        <g transform="translate(${X(b.c) + 25 * Math.cos(muzzleAngle)} ${Y(b.r) - 3 + 25 * Math.sin(muzzleAngle)})">${A.chargeGlobe(progress)}</g>
        <g transform="translate(${x} ${y})" fill="none"><circle r="${radius}" stroke="#fff2d9" stroke-opacity=".85" stroke-width="3"/>
        <circle class="aim-charge" r="${radius}" stroke="#9657b0" stroke-width="3.8" stroke-dasharray="${length * progress} ${length}" transform="rotate(-90)"/>
        <path d="M-33 0h9m48 0h9M0-33v9m0 48v9" stroke="#794e90" stroke-width="2.6"/></g></g>`;
    }).join('') : '';
    $('shot-layer').innerHTML = aiming + state.shots.map(s =>
      A.flight(s.kind, X(s.c), Y(s.r) - (s.kind === 'castle' ? 13 * castleScale() : 3), X(s.tipX), Y(s.tipY) - s.lift, Math.min(1, s.age / s.duration), s.angle, s.upgraded, s.barrelOffset)
    ).join('');
    $('effects-layer').innerHTML = state.effects.map(e => {
      const life = e.life - settled;
      if (life <= 0 || e.kind === 'frost') return '';
      const t = 1 - life / e.duration, x = X(e.x), y = Y(e.y) - (e.lift ?? 0);
      const at = `transform="translate(${x} ${y})" opacity="${1 - t}"`;
      if (e.kind === 'laser') {
        const tower = state.buildings.find(b => b.id === e.tower);
        return `<g clip-path="url(#field-bounds)"><g class="laser-beam" ${at}>${A.laser(e.angle, e.length * S, t, e.hitDistances.map(d => d * S), tower ? visibleFlash(tower) : 0, e.upgraded)}</g></g>`;
      }
      if (e.kind === 'plasmaArc') {
        const dx = X(e.toX) - x, dy = Y(e.toY) - e.toLift - y, length = Math.hypot(dx, dy) || 1;
        const age = e.duration - life - e.hop * .12;
        if (age < 0) return '';
        const progress = Math.min(1, age / .21), fade = Math.min(1, life / .25);
        const bend = Math.min(13, length * .23);
        const points = [0, .18, .32, .56, .72, .9, 1].map((u, i) => {
          const shift = i === 0 || i === 6 ? 0 : (i % 2 ? 1 : -1) * bend * (.75 + .25 * Math.sin(age * 24 + i));
          return `${dx * u - dy * shift / length},${dy * u + dx * shift / length}`;
        }).join(' ');
        const stroke = `points="${points}" pathLength="1" stroke-dasharray="${progress} 2"`;
        return `<g class="plasma-arc" transform="translate(${x} ${y})" opacity="${fade}" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <polyline ${stroke} stroke="#ae61ed" stroke-width="12" opacity=".4"/><polyline ${stroke} stroke="#7440a1" stroke-width="6.5"/><polyline ${stroke} stroke="#f5deff" stroke-width="3.1"/>
          <circle cx="${dx * progress}" cy="${dy * progress}" r="4.8" fill="#fff6b0" stroke="#9754c5" stroke-width="2"/>
          ${progress === 1 ? `<circle cx="${dx}" cy="${dy}" r="${6 + Math.min(1, age) * 16}" stroke="#e0c2ff" stroke-width="2.6"/>` : ''}</g>`;
      }
      if (e.kind === 'spikeHit') {
        return `<g class="spike-hit" ${at} fill="none" stroke-linecap="round"><circle r="${3 + t * 12}" stroke="#fff3b4" stroke-width="2.5"/>${[15,135,255].map(a => `<path transform="rotate(${a})" d="M${6 + 8 * t} 0h6" stroke="#866744" stroke-width="3"/>`).join('')}</g>`;
      }
      if (e.kind === 'spark' || e.kind === 'flare') return `<g class="${e.kind}-effect" ${at}><g transform="rotate(${e.angle ?? 0})">${A.impactBurst(e.kind, t)}</g></g>`;
      if (e.kind === 'hatch') return `<g class="hatch-effect" ${at} fill="#ffefc7" stroke="#a77f63" stroke-width="2">
        <path transform="translate(${-t * 9} ${-t * 7}) rotate(${-t * 25})" d="M-9 1q-1-15 7-17 8 0 10 12L4-6 0-1-4-5Z"/>
        <path transform="translate(${t * 9} ${t * 6}) rotate(${t * 20})" d="m-10 3 6-3 4 4 4-6 6 3C9 17-8 17-10 3Z"/></g>`;
      if (e.kind === 'split') {
        const start = G.enemyArtScale('splitter', e.maxHp);
        const angle = e.facing * Math.PI / 180, offset = 2 * start * (1 - t);
        const plates = e.offspring.map((child, i) => {
          const dx = (child.x - e.x) * S * t + offset * Math.cos(angle);
          const dy = (child.y - e.y) * S * t + offset * Math.sin(angle);
          return A.splitPlateAt(i, dx, dy, start * (1 - t), e.facing);
        });
        return `<g class="split-effect" ${at}>${plates.join('')}</g>`;
      }
      if (e.kind === 'leap') return `<path class="leap-effect" d="M${x} ${y}Q${(x + X(e.toX)) / 2} ${Math.min(y, Y(e.toY)) - 75} ${X(e.toX)} ${Y(e.toY)}" fill="none" stroke="#688a38" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="2 8" opacity="${(1 - t) * .75}"/>`;
      if (e.kind === 'blast') {
        const front = (.18 + .82 * (1 - (1 - t) ** 2)) * e.radius * S;
        return `<g class="blast-effect" ${at}>${e.upgraded ? `<circle r="${front * .78}" fill="none" stroke="#fbbf68" stroke-width="${7 * (1 - t)}"/>` : ''}<circle r="${front}" fill="#f3a74b" fill-opacity=".1" stroke="#af7340" stroke-width="2.5"/>
          <circle r="${front - 4}" fill="none" stroke="#ffe5a8" stroke-width="2"/>
          ${[15,78,142,204,274,325].map(a => `<g class="fx-accent" transform="rotate(${a}) translate(${front - 8} 0) rotate(${t * 32}) scale(${.6 + .5 * Math.sin(Math.PI * t)})"><path d="M-8 1q-2-5 2-6 2-5 7-2 6-1 6 4 5 4 0 6-5 2-8 0-6 2-7-2Z" fill="#d3b18c" stroke="#a17e57" stroke-width="1.1"/></g>`).join('')}
          <path transform="scale(${1 - t})" d="m0-20 6 12 10-4-4 11 10 4-13 3 1 11-10-7-9 6 1-12-10-4 12-4-2-10Z" fill="#ffd170" stroke="#ce7437" stroke-width="2"/></g>`;
      }
      if (e.kind === 'molecular') {
        const spread = 1 - (1 - t) ** 2, radius = 7 + 23 * spread;
        return `<g class="molecular-effect" ${at}><circle r="${radius}" fill="#bc9aec" fill-opacity=".13" stroke="#a47bc8" stroke-width="${3 - t}"/>
          <g class="fx-accent" transform="rotate(${t * 45})" fill="none" stroke-linecap="round">
          ${[15,130,255].map(angle => `<path transform="rotate(${angle}) translate(${radius - 5} 0)" d="m-7-7 5 2-2 5 5-2 2 6" stroke="#e6fbff" stroke-width="2.2"/>`).join('')}</g>
          <path transform="scale(${(1 - t) ** 2})" d="m0-15 4 11 11 4-11 4-4 12-4-12-11-4 11-4Z" fill="#fff4c7" stroke="#a879b9" stroke-width="1.6"/></g>`;
      }
      if (e.kind === 'burn') return `<g class="burn-effect" ${at}><use href="#art-firePatch" transform="translate(11 ${8 - t * 16}) scale(${.62 - t * .32})"/></g>`;
      if (e.kind === 'block') {
        const bx = e.vx * t * 60, by = e.vy * t * 60;
        return `<g class="block-effect" data-blocked-enemy="${e.enemyId}" opacity="${1 - t}" transform="translate(${x} ${y})">
          <circle r="${5 + t * 21}" fill="none" stroke="#f6d77c" stroke-width="${3 * (1 - t)}"/>
          <path d="m0-11 3 7 8-3-5 7 5 4-8-1-3 8-3-8-8 1 5-4-5-7 8 3Z" fill="#fff4bc" stroke="#d5a34c" stroke-width="1.3" transform="scale(${1 + t * 0.7})"/>
          ${[-150, -115, -75, -35].map(a => { const r = a * Math.PI / 180 * (e.vy > 0 ? -1 : 1), d = 11 + t * 26; return `<path d="M${Math.cos(r) * d} ${Math.sin(r) * d}l${Math.cos(r) * 7} ${Math.sin(r) * 7}" stroke="#dbaa52" stroke-width="2.5" stroke-linecap="round"/>`; }).join('')}
          ${e.shotKind === 'wall' || e.shotKind === 'pierce' ? '' : `<g class="ricochet" transform="translate(${bx} ${by}) scale(.65)">${A.shot(e.shotKind, 0, 0, Math.atan2(e.vy, e.vx) * 180 / Math.PI, 0, e.upgraded)}</g>`}
        </g>`;
      }
      if (e.kind === 'home') return `<g class="home-damage" transform="translate(${castleX()} ${castleY() - 49})">${A.brokenHeart(t)}</g>`;
      const color = e.kind === 'chip' ? '#aa7d51' : '#75a450';
      return `<g opacity="${1 - t}">${[0, 1, 2, 3, 4, 5].map(i => `<circle cx="${x + Math.cos(i * Math.PI / 3) * (10 + t * 27)}" cy="${y + Math.sin(i * Math.PI / 3) * (10 + t * 27)}" r="${4 * (1 - t) + 1}" fill="${color}"/>`).join('')}</g>`;
    }).join('');
  }
  function updateUI(force = false) {
    const advancing = G.isAdvancing(state);
    const signature = [state.level, state.wave, state.phase, state.money, state.hearts, state.undo.length, state.upgradeItems, selected].join(':');
    if (!force && signature === uiSignature) return;
    uiSignature = signature;
    const upgrading = selected === 'upgrade' && state.phase === 'planning' && state.upgradeItems > 0;
    const button = $('upgrade');
    button.hidden = state.level === 0 && !state.upgradeItems;
    button.disabled = state.phase !== 'planning' || state.upgradeItems === 0;
    button.setAttribute('aria-pressed', String(upgrading));
    button.setAttribute('aria-label', `升級建築，剩餘 ${state.upgradeItems} 顆晶石`);
    $('upgrade-count').textContent = state.upgradeItems;
    $('board').classList.toggle('upgrade-mode', upgrading);
    $('money').textContent = state.money;
    $('coins').setAttribute('aria-label', `可用金幣 ${state.money}`);
    $('health').textContent = state.hearts;
    $('hearts').setAttribute('aria-label', `城堡生命 ${state.hearts}`);
    const selector = $('level-select');
    if (state.bonusUnlocked && selector.options.length === G.BONUS_LEVEL) {
      const option = new Option('第 11 關', G.BONUS_LEVEL);
      option.title = G.LEVELS[G.BONUS_LEVEL].name;
      selector.add(option);
    }
    selector.value = String(state.level);
    document.querySelectorAll('[data-tool]').forEach(b => {
      b.classList.toggle('selected', b.dataset.tool === selected); b.setAttribute('aria-pressed', String(b.dataset.tool === selected));
      // Keep low-budget tools selectable to inspect their range.
      b.setAttribute('aria-disabled', String(state.phase !== 'planning'));
    });
    $('remove').disabled = state.phase !== 'planning'; $('remove').classList.toggle('active', selected === 'remove'); $('remove').setAttribute('aria-pressed', String(selected === 'remove'));
    $('undo').disabled = state.phase !== 'planning' || state.undo.length === 0;
    $('reset').setAttribute('aria-label', state.phase === 'planning' ? '清空部署，全額退款' : state.phase === 'won' ? '回到第一關' : '重試這關');
    const label = advancing ? '暫停' : state.phase === 'paused' ? '繼續' : state.phase === 'won' ? '看成果' : state.phase === 'lost' ? '再試一次' : state.level > 0 && state.level < G.BONUS_LEVEL ? '下一關' : '開始';
    $('action').innerHTML = state.phase === 'planning' ? label : A.icon(advancing ? 'pause' : 'play');
    $('action').setAttribute('aria-label', label);
    $('action').classList.toggle('pause-state', advancing);
  }
  function victoryLoot(gold) {
    return `<span>${A.icon('coin')}金幣 +${gold}</span><span>${A.icon('crystal')}升級晶石 +1</span>`;
  }
  function outcome() {
    resultAfterHeart = false;
    hideInfo();
    const won = state.phase === 'won', bonus = state.level === G.BONUS_LEVEL;
    $('win-crystal').hidden = !won;
    if (won) $('win-crystal').innerHTML = victoryLoot(state.lastReward);
    $('result-art').innerHTML = A.icon(won ? 'trophy' : 'leaf');
    $('result-title').textContent = won ? (bonus ? '隱藏關勝利！' : '第 10 關勝利！') : '再試一次';
    const invite = $('bonus-invite');
    invite.hidden = !(won && !bonus);
    invite.textContent = invite.hidden ? '' : '隱藏關「四面守園」已開啟，守住中央的城堡！';
    $('result-hearts').innerHTML = Array.from({ length: G.LEVELS[state.level].hearts }, (_, i) => A.icon('heart', i < state.hearts ? '' : 'empty')).join('');
    $('result-primary').textContent = won ? (bonus ? '再玩一次' : '挑戰第 11 關') : '重試這關';
    $('result-secondary').textContent = won ? '看看花園' : '回到第一關';
    if (!$('result').open) $('result').showModal();
  }
  function sync(force = false, settling = false) {
    if (lastLevel !== state.level) {
      enemyHealth.checked = state.level === 0;
      hideInfo(); hover = null; lastLevel = state.level; ground();
    }
    if (force || lastRevision !== state.revision || lastPhase !== state.phase) drawRoutes();
    if (force || lastRevision !== state.revision) {
      selection(); lastRevision = state.revision;
      const solid = G.terrain(state.level);
      for (const cell of $('hit-layer').querySelectorAll('[data-c]')) {
        const b = G.at(state, +cell.dataset.c, +cell.dataset.r);
        cell.classList.toggle('upgradable', !!b && !b.upgraded);
        cell.setAttribute('aria-label', `${+cell.dataset.r + 1} 排 ${+cell.dataset.c + 1} 格，${b ? G.toolFor(b.kind, b.upgraded).name : G.isHome(state.level, +cell.dataset.c, +cell.dataset.r) ? '城堡' : solid.has(G.key(+cell.dataset.c, +cell.dataset.r)) ? '地形' : '空地'}`);
      }
      if (infoAnchor?.classList.contains('cell-hit')) showCellInfo(infoAnchor);
    }
    if (lastPhase !== state.phase) {
      const finished = lastPhase === 'running' && (state.phase === 'planning' || state.phase === 'won');
      const ended = state.phase === 'won' || state.phase === 'lost';
      resultAfterHeart = ended && lastPhase === 'running' && state.effects.some(e => e.kind === 'home');
      finishAge = finished || resultAfterHeart ? 0 : null;
      lastPhase = state.phase;
      if (state.phase !== 'paused') save();
      const showVictory = state.phase === 'planning' && state.lastReward > 0;
      $('victory').hidden = !showVictory;
      if (showVictory) {
        $('victory-title').textContent = `第 ${state.level} 關勝利！`;
        $('victory-loot').innerHTML = victoryLoot(state.lastReward);
      }
      if (finished) $('status').textContent = `勝利！獲得 ${state.lastReward} 枚金幣和 1 顆升級晶石`;
      selection();
      if (ended && !resultAfterHeart) outcome();
    }
    updateUI(force);
    if (force || settling || state.time !== lastWorldTime) { renderWorld(); lastWorldTime = state.time; }
    scheduleFrame();
  }
  function loadLevel(level, replacement = null) {
    if (level === G.BONUS_LEVEL && !state.bonusUnlocked) return;
    hideInfo();
    if ($('result').open) $('result').close();
    const next = replacement || G.createState(level);
    next.bonusUnlocked ||= state.bonusUnlocked;
    state = next; selected = 'pea'; hover = null; accumulator = 0;
    $('status').textContent = level === G.BONUS_LEVEL ? '守住中央城堡，小蟲會從四面進攻！' : '';
    lastPhase = ''; lastRevision = -1; uiSignature = ''; sync(true);
  }
  function interact(c, r) {
    if (!selected) { selected = G.at(state, c, r)?.kind || 'pea'; updateUI(true); return; }
    const result = selected === 'upgrade' ? G.upgrade(state, c, r) : selected === 'remove' ? G.remove(state, c, r) : G.build(state, selected, c, r);
    if (!result.ok) feedback(result.error, c, r);
    else {
      if (selected === 'upgrade') {
        const building = G.at(state, c, r);
        $('status').textContent = `已升級為${G.toolFor(building.kind, true).name}，剩 ${state.upgradeItems} 顆晶石`;
        showCellInfo($('hit-layer').querySelector(`[data-c="${c}"][data-r="${r}"]`));
        if (!state.upgradeItems) selected = building.kind;
      } else $('status').textContent = '';
      save();
    }
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
  $('upgrade').addEventListener('click', () => {
    selected = selected === 'upgrade' ? null : 'upgrade';
    hideInfo(); hover = null; selection(); updateUI(true);
    $('status').textContent = selected ? '點選框起來的塔或石牆升級' : '';
  });
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
  enemyHealth.closest('details').addEventListener('toggle', ({ currentTarget }) => {
    if (currentTarget.open) currentTarget.scrollIntoView({ block: 'nearest' });
  });
  showRoutes.addEventListener('change', () => { drawRoutes(); save(); });
  enemyHealth.addEventListener('change', () => {
    save();
    renderWorld();
  });
  $('level-select').addEventListener('change', event => loadLevel(Number(event.target.value)));
  const solution = $('solution');
  if (new URLSearchParams(location.search).get('tip') === 'true') {
    solution.hidden = false;
    solution.addEventListener('click', () => {
      const demo = window.GardenSolutions.create(state.level);
      loadLevel(state.level, demo);
      $('status').textContent = '已重設本關並放上解答，按開始出怪';
    });
  } else solution.remove();
  $('action').addEventListener('click', () => {
    hideInfo();
    hover = null; $('status').textContent = ''; selection();
    if (state.phase === 'planning') { save(); G.startWave(state); }
    else if (state.phase === 'running' || state.phase === 'paused') G.togglePause(state);
    else if (state.phase === 'lost') { loadLevel(state.level, G.retry(state)); return; }
    else outcome();
    sync(true);
  });
  $('hit-layer').addEventListener('click', event => {
    const cell = event.target.closest('[data-c]'); if (!cell) return;
    if (G.isHome(state.level, +cell.dataset.c, +cell.dataset.r)) { showCellInfo(cell); return; }
    if (event.pointerType === 'touch' && selected !== 'remove' && selected !== 'upgrade' && G.at(state, +cell.dataset.c, +cell.dataset.r)) { showCellInfo(cell); return; }
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
    if (cell.getAttribute('tabindex') !== '0') {
      $('hit-layer').querySelector('[tabindex="0"]')?.setAttribute('tabindex', '-1');
      cell.setAttribute('tabindex', '0');
    }
    focusCell = hover = { c: +cell.dataset.c, r: +cell.dataset.r }; selection();
    showCellInfo(cell);
  });
  $('hit-layer').addEventListener('focusout', deferHideInfo);
  $('hit-layer').addEventListener('keydown', event => {
    const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (moves[event.key]) {
      event.preventDefault(); const [dc, dr] = moves[event.key];
      focusCell = { c: Math.max(0, Math.min(G.COLS - 1, focusCell.c + dc)), r: Math.max(0, Math.min(G.ROWS - 1, focusCell.r + dr)) };
      $('hit-layer').querySelector(`[data-c="${focusCell.c}"][data-r="${focusCell.r}"]`).focus();
    } else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); interact(focusCell.c, focusCell.r); }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !$('result').open) { hideInfo(); selected = null; hover = null; selection(); updateUI(true); }
  });
  $('result-primary').addEventListener('click', () => {
    if (state.phase === 'lost') loadLevel(state.level, G.retry(state));
    else if (state.level === G.BONUS_LEVEL - 1) {
      loadLevel(G.BONUS_LEVEL);
    } else loadLevel(0);
  });
  $('result-secondary').addEventListener('click', () => { if (state.phase === 'lost') loadLevel(0); else $('result').close(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.isAdvancing(state)) { G.togglePause(state); save(); sync(true); }
    accumulator = 0; lastFrame = 0;
    scheduleFrame();
  });

  // Deterministic fixed simulation step; pause does not bank elapsed time.
  function scheduleFrame() {
    if (!document.hidden && (G.isAdvancing(state) || (finishAge !== null && finishAge < 1))) {
      if (frameId === null) frameId = requestAnimationFrame(frame);
    } else {
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null; lastFrame = 0; accumulator = 0;
    }
  }
  function frame(now) {
    frameId = null;
    const elapsed = lastFrame ? Math.min((now - lastFrame) / 1000, 0.1) : 0; lastFrame = now;
    if (G.isAdvancing(state)) {
      accumulator += elapsed * BATTLE_SPEED;
      while (accumulator >= 1 / 60) { G.step(state, 1 / 60); accumulator -= 1 / 60; }
    } else accumulator = 0;
    // Finish the last impact in deployment without stepping the next wave.
    const settling = finishAge !== null && finishAge < 1;
    if (settling) finishAge = Math.min(1, finishAge + elapsed * BATTLE_SPEED);
    sync(false, settling);
    if (settling && finishAge === 1 && resultAfterHeart) outcome();
  }
  // Read-only diagnostics for verification. No test controls ship in normal play.
  window.gardenDebug = { getState: () => JSON.parse(JSON.stringify(state)), getRoutes: () => G.previews(state) };
  ground(); sync(true);
})();
