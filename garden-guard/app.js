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
  const settings = document.querySelector('.display-settings');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let state = G.createState(), selected = 'pea', hover = null, focusCell = { c: 6, r: 5 };
  let lastWorldTime = -1, lastPhase = '', lastRevision = -1, uiSignature = '', lastFrame = 0, accumulator = 0;
  let finishAge = null, resultAfterHeart = false, frameId = null;
  let infoAnchor = null, infoTimer = 0, unlockSaved = false;
  const entryGuide = $('entry-guide'), guidePageSize = 3;
  let guideKinds = [], guidePage = 0;
  let seenRewardLevel = null, menuCell = null, moving = null;
  const movePrompt = '點空格移動，點原位取消';
  const resetActions = {
    planning: ['reset', '重置', '清空部署，全額退款'],
    running: ['pause', '暫停', '暫停戰鬥'],
    paused: ['surrender', '放棄', '放棄這次戰鬥，回到開戰前'],
    cleared: ['reset', '重置', '重玩此關'],
    lost: ['reset', '重置', '重試這關'],
    won: ['reset', '重置', '回到第一關']
  };
  const cellAt = (c, r) => $('hit-layer').querySelector(`[data-c="${c}"][data-r="${r}"]`);
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE));
    const saved = G.restore(data);
    if (saved) {
      state = saved;
      seenRewardLevel = data.seenRewardLevel ?? null;
      showRoutes.checked = data.showRoutes !== false;
      enemyHealth.checked = typeof data.showEnemyHealth === 'boolean' ? data.showEnemyHealth : state.level === 0;
    }
    unlockSaved = localStorage.getItem(UNLOCK) === '1';
    if (unlockSaved) state.bonusUnlocked = true;
  } catch {}
  let lastLevel = state.level;
  $('level-select').innerHTML = G.LEVELS.slice(0, G.BONUS_LEVEL).map((_, i) => `<option value="${i}">第 ${i + 1} 關</option>`).join('');
  $('garden-art').innerHTML = A.definitions() + `<clipPath id="field-bounds"><rect x="${OX}" y="${OY}" width="${G.COLS * S}" height="${G.ROWS * S}" rx="6"/></clipPath>
    <radialGradient id="yellow-eggshell" cx="33%" cy="25%" r="80%"><stop stop-color="#fff8ac"/><stop offset=".52" stop-color="#ffda4d"/><stop offset="1" stop-color="#e59b28"/></radialGradient>
    <g id="brood-shell"><path d="M0-17C7-17 14-5 14 3c0 8-6 12-14 12s-14-4-14-12c0-8 7-20 14-20Z" fill="url(#yellow-eggshell)" stroke="#916122" stroke-width="2.2"/>
      <ellipse cx="-5" cy="-7" rx="2.7" ry="4" transform="rotate(24 -5 -7)" fill="#fffbdc"/><path d="M7 4l2-2m-12 8 2 .6" fill="none" stroke="#c38a24" stroke-width="2.4" stroke-linecap="round"/></g>
    <radialGradient id="rolling-snow-light" cx="34%" cy="27%" r="78%"><stop stop-color="#fff"/><stop offset=".57" stop-color="#e5f7ff"/><stop offset=".85" stop-color="#add6e6"/><stop offset="1" stop-color="#7aaabc"/></radialGradient>`;
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = A.icon(el.dataset.icon); });
  $('tools').innerHTML = Object.entries(G.TOOLS).map(([kind, tool]) => `<button class="tool-card" data-tool="${kind}" aria-pressed="false" aria-label="${tool.name}，${tool.cost} 枚金幣">${A.tool(kind)}<span class="tool-cost">${A.icon('coin')}${tool.cost}</span></button>`).join('');

  function hideInfo() {
    clearTimeout(infoTimer); $('tower-info').hidden = true; $('tower-info').replaceChildren();
    infoAnchor?.removeAttribute('aria-describedby'); infoAnchor = null;
  }
  function deferHideInfo() { clearTimeout(infoTimer); infoTimer = setTimeout(hideInfo, 140); }
  function attackTiming(tool) {
    if (tool.aimSeconds) return `瞄準 ${tool.aimSeconds} 秒`;
    if (tool.vortex) return `每 ${1 / tool.rate} 秒召喚一次`;
    return `攻擊 ${+tool.rate.toFixed(3)}次/s`;
  }
  function distanceStats(kind, tool) {
    if (!tool.range) return [];
    let range = `${tool.range} 格`;
    if (kind === 'snowCannon') range = `橫向最遠 ${G.COLS - 1} 格、直向最遠 ${G.ROWS - 1} 格`;
    else if (tool.range >= Math.hypot(G.COLS - 1, G.ROWS - 1)) range = `全圖（${G.COLS}×${G.ROWS} 格）`;
    else if (tool.minRange) range = `超過 ${tool.minRange} 格，最遠 ${range}`;
    else if (kind === 'crossCoil') range = `上下左右 ${range}`;
    else if (kind === 'wall' || kind === 'frostfireJet') range = `周圍 ${range}（含斜角）`;
    const details = [`射程 ${range}`];
    if (tool.radius || tool.burstRadius) {
      const label = tool.vortex ? '龍捲半徑' : kind === 'gravityCannon' ? '吸引半徑' : '爆炸半徑';
      details.push(`${label} ${tool.radius ?? tool.burstRadius} 格`);
    }
    if (tool.knockback) details.push(`擊退最多 ${tool.knockback === 1/3 ? '1/3' : tool.knockback} 格`);
    if (tool.chainRange) details.push(`連鎖距離 ${tool.chainRange} 格`);
    return details;
  }
  function towerStats(kind, tool) {
    if (!tool.rate) return `<p>耐久 ${tool.hp} · ${tool.cost} 金幣</p><p class="info-effect">${tool.effect}</p>`;
    let damage = tool.damage;
    if (tool.damagePerCell) damage = `第一格 ${tool.damage}，之後每格 +${tool.damagePerCell}`;
    if (tool.maxDamage) damage = `${tool.damage} → ${tool.maxDamage}`;
    if (tool.vortex) damage = `每秒 ${tool.damage}`;
    const burn = kind === 'flame' ? ` · 地火 ${tool.groundFireSeconds} 秒，每秒 ${tool.burnDamage} 傷` : tool.burnDamage ? ` · 燃燒 ${tool.burnDamage}/s` : '';
    const targets = tool.targets.map(t => t === 'ground' ? '地' : '空').join('/');
    const status = [
      tool.chargeSeconds && `瞄準 ${tool.chargeSeconds} 秒`,
      tool.stunSeconds && `暈眩 ${tool.stunSeconds} 秒`,
      tool.freezeSeconds && `冰封 ${tool.freezeSeconds} 秒（蟲王 ${tool.bossFreezeSeconds} 秒）`,
      tool.iceLayers && `冰凍 +${tool.iceLayers} 層`
    ].filter(Boolean).map(text => `<p>${text}</p>`).join('');
    return `<p>傷害 ${damage}${burn}</p><p>${attackTiming(tool)}</p><p class="info-distance">${distanceStats(kind, tool).join(' · ')}</p>${status}<p class="info-target">目標 ${targets}</p><p class="info-effect">${tool.effect}</p>`;
  }
  function upgradePreview(kind, title) {
    const current = G.toolFor(kind), next = G.toolFor(kind, true);
    const changes = [];
    if (current.damagePerCell !== next.damagePerCell) changes.push(`滾動每格 +${next.damagePerCell} 傷`);
    if (current.damage !== next.damage || current.maxDamage !== next.maxDamage) changes.push(`傷害 ${next.damage}${next.maxDamage ? ' → ' + next.maxDamage : ''}`);
    if (kind === 'flame') changes.push(`地火 ${next.groundFireSeconds} 秒`);
    if (current.stunSeconds !== next.stunSeconds) changes.push(`暈眩 ${next.stunSeconds} 秒`);
    if (current.freezeSeconds !== next.freezeSeconds) changes.push(`冰封 ${next.freezeSeconds} 秒（蟲王 ${next.bossFreezeSeconds} 秒）`);
    if (current.rate !== next.rate || current.aimSeconds !== next.aimSeconds) changes.push(attackTiming(next));
    const previousDistances = distanceStats(kind, current);
    changes.push(...distanceStats(kind, next).filter(detail => !previousDistances.includes(detail)));
    const effect = next.effect !== current.effect ? next.effect : '';
    return `<p class="next-upgrade">${[`升級為${title || next.name}`, changes.join(' · '), effect].filter(Boolean).join('<br>')}</p>`;
  }
  function showInfo(kind, anchor, upgraded = false, building = null, preview = false) {
    const tool = G.toolFor(kind, upgraded);
    if (!tool) { hideInfo(); return; }
    hideInfo(); infoAnchor = anchor;
    const info = $('tower-info');
    info.dataset.kind = kind;
    const kinds = building?.fusionKind ? [G.primaryWeapon(building), G.secondaryWeapon(building)].filter(Boolean) : [kind];
    const name = building ? G.buildingName(building) : tool.name;
    const ingredients = building?.fusionKind ? [G.TOOLS[building.kind].name, G.TOOLS[building.fusionKind].name]
      : upgraded ? [G.toolFor(kind).name, '升級水晶'] : null;
    const durability = building?.fusionKind ? `<p>耐久 ${building.hp}／${G.buildingHP(building.kind, building.fusionKind)}</p>` : '';
    const details = durability + kinds.map(k => {
      const spec = G.toolFor(k, upgraded);
      return (kinds.length > 1 ? `<b>${spec.name}</b>` : '') + towerStats(k, spec);
    }).join('');
    const next = preview ? kinds.map(k => upgradePreview(k, building?.fusionKind && kinds.length === 1 ? G.buildingName(building) + '+' : null)).join('') : '';
    info.innerHTML = `<strong>${name}</strong>${ingredients ? `<p class="info-ingredients">（${ingredients.join('＋')}）</p>` : ''}${building ? `<p class="last-damage">${building.lastDamage == null ? '尚無上局傷害紀錄' : `上局傷害 ${building.lastDamage} 點`}</p>` : ''}${details}${next}`;
    if (preview) {
      const art = building?.fusionKind ? A.fusionResult({...building, upgraded:true})
        : kind === 'castle' ? A.castle(true,true) : A.tower(kind,-25,0,0,true);
      info.querySelector('.next-upgrade').insertAdjacentHTML('afterbegin', `<svg class="grade-portrait" viewBox="-43 -46 86 82" aria-hidden="true">${art}</svg>`);
    }
    positionInfo(anchor);
  }
  function positionInfo(anchor) {
    const info = $('tower-info');
    info.hidden = false; anchor.setAttribute('aria-describedby', 'tower-info');
    const zoom = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    info.style.maxHeight = '';
    const rect = anchor.getBoundingClientRect(), box = info.getBoundingClientRect();
    const w = box.width / zoom, h = box.height / zoom, vw = innerWidth / zoom, vh = innerHeight / zoom;
    const above = rect.top / zoom - 18, below = vh - rect.bottom / zoom - 18;
    let left = Math.max(8, Math.min(vw - w - 8, (rect.left + rect.width / 2) / zoom - w / 2));
    let top;
    if (anchor.classList.contains('entrance')) {
      const side = anchor.dataset.side;
      if (side === 'right') left = rect.left / zoom - w - 8;
      if (side === 'left') left = rect.right / zoom + 8;
      left = Math.max(8, Math.min(vw - w - 8, left));
      top = side === 'top' ? rect.bottom / zoom + 8 : side === 'bottom' ? rect.top / zoom - h - 8 : (rect.top + rect.height / 2) / zoom - h / 2;
      top = Math.max(8, Math.min(vh - h - 8, top));
    } else if (h <= above) top = rect.top / zoom - h - 10;
    else if (h <= below) top = rect.bottom / zoom + 10;
    else if (rect.right / zoom + w + 18 <= vw || rect.left / zoom >= w + 18) {
      left = rect.right / zoom + w + 18 <= vw ? rect.right / zoom + 10 : rect.left / zoom - w - 10;
      top = Math.max(8, Math.min(vh - h - 8, (rect.top + rect.height / 2) / zoom - h / 2));
    } else {
      info.style.maxHeight = Math.max(0, above, below) + 'px';
      top = above > below ? 8 : rect.bottom / zoom + 10;
    }
    info.style.left = left + 'px'; info.style.top = top + 'px';
  }
  function showCellInfo(cell) {
    if (moving) { hideInfo(); return; }
    const c = +cell.dataset.c, r = +cell.dataset.r, b = G.at(state, c, r);
    if (b) showInfo(b.kind, cell, b.upgraded, b);
    else if (G.isHome(state.level, c, r)) showInfo('castle', cell, state.castleUpgraded);
    else hideInfo();
  }
  function showEntranceInfo(marker) {
    if (menuCell || entryGuide.open) return;
    hideInfo();
    hover = null; selection();
    infoAnchor = marker;
    const info = $('tower-info'), kinds = marker.dataset.kinds.split(' ');
    const boss = marker.dataset.boss;
    const icons = kinds.filter(kind => kind !== boss).map(kind =>
      `<span class="entry-enemy" data-kind="${kind}" role="img" aria-label="${G.ENEMIES[kind].name}" title="${G.ENEMIES[kind].name}">${A.badge(kind)}</span>`).join('');
    info.dataset.kind = 'entrance';
    info.innerHTML = `<strong>入口蟲蟲</strong>${boss ? `<div class="entry-boss" data-kind="${boss}">${A.badge(boss)}${G.ENEMIES[boss].name}</div>` : ''}<div class="entry-icons">${icons}</div>`;
    positionInfo(marker);
  }
  function showGuidePage(page) {
    const pages = Math.ceil(guideKinds.length / guidePageSize);
    guidePage = Math.max(0, Math.min(page, pages - 1));
    const start = guidePage * guidePageSize;
    $('entry-cards').innerHTML = guideKinds.slice(start, start + guidePageSize).map(kind => {
      const { name, trait } = G.ENEMIES[kind];
      return `<article class="guide-card${kind.endsWith('Boss') ? ' guide-boss' : ''}" data-kind="${kind}">
        <div class="guide-portrait">${A.badge(kind)}</div><h3>${name}</h3><p>${trait}</p></article>`;
    }).join('');
    $('entry-cards').scrollTop = 0;
    $('entry-pages').hidden = pages <= 1;
    const focused = document.activeElement;
    $('entry-prev').disabled = guidePage === 0;
    $('entry-next').disabled = guidePage === pages - 1;
    if (pages > 1 && focused === $('entry-next') && focused.disabled) $('entry-prev').focus();
    if (pages > 1 && focused === $('entry-prev') && focused.disabled) $('entry-next').focus();
    $('entry-page-count').textContent = `${guidePage + 1} / ${pages}`;
  }
  function openEntranceGuide(marker) {
    if (!marker || menuCell || entryGuide.open) return;
    const boss = marker.dataset.boss;
    guideKinds = marker.dataset.kinds.split(' ');
    if (boss) guideKinds = [boss, ...guideKinds.filter(kind => kind !== boss)];
    $('entry-guide-location').textContent = marker.dataset.location;
    showGuidePage(0);
    marker.focus({preventScroll:true});
    hideInfo();
    entryGuide.showModal();
  }
  function closeEntranceGuide() {
    if (!entryGuide.open) return;
    entryGuide.close();
    hideInfo();
  }
  function repositionInfo() {
    if (!infoAnchor) return;
    const anchor = infoAnchor, rect = anchor.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth || (!anchor.matches(':hover') && document.activeElement !== anchor)) { hideInfo(); return; }
    if (anchor.classList.contains('entrance')) showEntranceInfo(anchor);
    else if (anchor.dataset.unavailable) showShortage(anchor);
    else if (anchor === $('edit-grade')) previewGrade();
    else if (anchor.dataset.tool) showInfo(anchor.dataset.tool, anchor); else showCellInfo(anchor);
  }

  function save() {
    const data = ['planning', 'cleared', 'won'].includes(state.phase) ? G.snapshot(state) : state.checkpoint;
    if (!data) return;
    try {
      if (state.bonusUnlocked && !unlockSaved) {
        localStorage.setItem(UNLOCK, '1');
        unlockSaved = true;
      }
      localStorage.setItem(STORAGE, JSON.stringify({ ...data, seenRewardLevel, showRoutes: showRoutes.checked, showEnemyHealth: enemyHealth.checked }));
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
    $('ground-layer').innerHTML = s; $('hit-layer').innerHTML = hits;
    drawEntrances();
  }
  function drawEntrances() {
    closeEntranceGuide();
    const entries = G.entrances(state.level);
    const kindsByCell = new Map(entries.map(e => [G.key(e.c,e.r), new Set()]));
    for (const {kind,position} of G.spawnQueue(state.level)) {
      kindsByCell.get(G.key(position.x,position.y)).add(kind);
    }
    $('entrance-layer').innerHTML = entries.map(entry => {
      const kinds = [...kindsByCell.get(G.key(entry.c,entry.r))], boss = kinds.find(kind => kind.endsWith('Boss'));
      const horizontal = entry.side === 'left' || entry.side === 'right';
      const x = horizontal ? (entry.side === 'right' ? 877 : 38) : X(entry.c);
      const y = horizontal ? Y(entry.r) : entry.side === 'top' ? 23 : 569;
      const angle = { left: 180, right: 0, top: -90, bottom: 90 }[entry.side];
      const side = { left:'左', right:'右', top:'上', bottom:'下' }[entry.side];
      const location = `${side}側入口，${horizontal ? `第 ${entry.r+1} 排` : `第 ${entry.c+1} 欄`}`;
      return `<g class="entrance" role="button" tabindex="0" aria-haspopup="dialog" aria-controls="entry-guide" aria-label="${location}${boss ? '，'+G.ENEMIES[boss].name : ''}" data-location="${location}" data-side="${entry.side}" data-c="${entry.c}" data-r="${entry.r}"
        data-kinds="${kinds.join(' ')}" ${boss ? `data-boss="${boss}"` : ''} transform="translate(${x} ${y})" stroke-linejoin="round">
        <rect x="-30" y="-28" width="60" height="56" fill="transparent"/>
        <g transform="rotate(${angle})">
          <path class="entry-sign" d="M-28 0-10-17H16q5 0 5 5v24q0 5-5 5h-26Z" stroke-width="3.6"/>
          <path d="m-24 0 16-14h23" fill="none" stroke="#ffe6aa" stroke-width="1.8" stroke-linecap="round"/>
          <path d="m-16 0 12-10v6h16v8H-4v6Z" fill="#fff9de" stroke="#60391e" stroke-width="1.9"/>
        </g>${boss ? `<g class="entry-crown" transform="translate(${entry.side === 'left' ? -18 : 18} ${horizontal ? -15 : 0})">
          <circle r="12" fill="#642943" stroke="#fff0b9" stroke-width="2"/>
          <path d="m-8-4 4 3 4-6 4 6 4-3-2 9H-6Z" fill="#ffd96c" stroke="#724522" stroke-width="1.2"/>
          <path d="M-5 6H5" stroke="#fff1b1" stroke-width="1.8"/></g>` : ''}</g>`;
    }).join('');
  }
  function drawRoutes() {
    const layer = $('route-layer');
    if (state.phase !== 'planning' || !showRoutes.checked) { layer.replaceChildren(); return; }
    const segments = new Map();
    for (const plan of G.previews(state)) {
      for (let i = 1; i < plan.path.length; i++) {
        const a = plan.path[i - 1], b = plan.path[i];
        const key = `${a.c},${a.r}/${b.c},${b.r}`;
        // Shared sections need just one line, even when several entrances merge.
        if (!segments.has(key) || !plan.breaking) segments.set(key, { a, b, breaking: plan.breaking });
      }
    }
    const ground = [...segments.values()].map(({a, b, breaking}) => {
      const x = X(a.c), y = Y(a.r), dx = X(b.c) - x, dy = Y(b.r) - y;
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      const color = breaking ? '#a56137' : '#527b49';
      return `<g class="ground-route" transform="translate(${x} ${y}) rotate(${angle})" stroke="${color}"><path d="M0 0h${S}" stroke-width="2.5" stroke-dasharray="3 5"/><path d="m27-3 5 3-5 3" stroke-width="2.4" stroke-linejoin="round"/></g>`;
    }).join('');
    layer.innerHTML = `<g fill="none" stroke-linecap="round" opacity=".73">${ground}</g>`;
  }
  function selection() {
    $('hover-layer').innerHTML = ''; $('range-layer').innerHTML = '';
    if (moving) {
      let marks = `<g fill="#fff4b8" fill-opacity=".15" stroke="#735324" stroke-width="3" stroke-dasharray="7 4">${tileMark(moving.c, moving.r)}</g>`;
      if (hover && (hover.c !== moving.c || hover.r !== moving.r)) {
        const valid = !G.canMove(state, moving.c, moving.r, hover.c, hover.r);
        const color = valid ? '#27664a' : '#a74635';
        marks += `<g fill="${color}" fill-opacity=".12" stroke="${color}" stroke-width="3">${tileMark(hover.c, hover.r)}</g>`;
        if (valid) {
          const art = moving.fusionKind ? A.fusionResult(moving) : A.tower(moving.kind, moving.angle, 0, 0, moving.upgraded);
          marks += `<g transform="translate(${X(hover.c)} ${Y(hover.r)})" opacity=".65">${art}</g>`;
        }
      }
      $('hover-layer').innerHTML = marks + `<g aria-hidden="true" transform="translate(460 19)"><rect x="-125" y="-16" width="250" height="32" rx="13" fill="#fffbe9" stroke="#48674f" stroke-width="2"/><text text-anchor="middle" y="6" font-size="18" font-weight="700" fill="#294e39">${movePrompt}</text></g>`;
      return;
    }
    if (!hover) return;
    const x = X(hover.c), y = Y(hover.r), existing = G.at(state, hover.c, hover.r);
    const home = G.isHome(state.level, hover.c, hover.r);
    const kind = home ? 'castle' : existing?.kind ?? selected;
    const ranges = (existing ? [G.primaryWeapon(existing), G.secondaryWeapon(existing)] : [kind]).filter(Boolean).map(weapon => {
      const tool = G.toolFor(weapon, home ? state.castleUpgraded : existing?.upgraded);
      if (!tool?.range) return '';
      const radius = tool.range * S;
      let shape;
      if (weapon === 'crossCoil' || weapon === 'frostfireJet') shape = G.attackCells(weapon,hover.c,hover.r).map(p => tileMark(p.c,p.r)).join('');
      else if (weapon === 'snowCannon') shape = `<rect x="${OX}" y="${y-S/2}" width="${G.COLS*S}" height="${S}"/><rect x="${x-S/2}" y="${OY}" width="${S}" height="${G.ROWS*S}"/>`;
      else shape = tool.vortex || ['mapLaser','meteorTower'].includes(weapon) ? `<rect x="${OX}" y="${OY}" width="${G.COLS * S}" height="${G.ROWS * S}"/>` : weapon === 'wall'
        ? `<rect x="${x - radius - S / 2}" y="${y - radius - S / 2}" width="${2 * radius + S}" height="${2 * radius + S}" clip-path="url(#field-bounds)"/>`
        : `<circle cx="${x}" cy="${y}" r="${radius}"/>`;
      return `<g fill="${tool.color}" fill-opacity=".065" stroke="${tool.color}" stroke-width="2" stroke-opacity=".42" stroke-dasharray="5 6">${shape}${tool.minRange ? `<circle cx="${x}" cy="${y}" r="${tool.minRange * S}" fill="#bd5c45" fill-opacity=".13" stroke="#a14a37"/>` : ''}</g>`;
    });
    $('range-layer').innerHTML = ranges.join('');
    if (home || state.phase !== 'planning') return;
    const valid = selected && !G.canBuild(state, selected, hover.c, hover.r);
    const color = existing || valid ? '#7c9b6b' : '#c38c75';
    $('hover-layer').innerHTML = `<rect x="${x - 30}" y="${y - 30}" width="60" height="60" rx="8" fill="${color}" fill-opacity=".12" stroke="${color}" stroke-width="2.5"/>${valid && !existing ? `<g transform="translate(${x} ${y})" opacity=".5">${A.tower(selected)}</g>` : ''}`;
  }
  const svg = tag => document.createElementNS('http://www.w3.org/2000/svg', tag);
  const enemyViews = new Map();
  function placeAfter(parent, node, previous) {
    const next = previous ? previous.nextElementSibling : parent.firstElementChild;
    if (node !== next) parent.insertBefore(node, next);
  }
  function updateEnemy(view, enemy, showHealth) {
    const frozen = enemy.frozenUntil > state.time;
    const time = (frozen ? enemy.frozenAt : state.time) + enemy.id;
    const hp = showHealth ? enemy.hp : null;
    const burning = enemy.burnTicks > 0, stunned = enemy.spikeStun > 1e-9 || (enemy.stun > 1e-9 && !enemy.push), shocked = enemy.shock > 1e-9;
    const appearance = [hp, enemy.iceStacks, frozen, burning, stunned, shocked, enemy.flash > 0, enemy.shieldFlash > 0].join('/');
    if (view.appearance !== appearance) {
      const node = view.node;
      node.innerHTML = A.bug(enemy.kind, hp, time, enemy.flash, enemy.shieldFlash, frozen ? G.maxSlowStacks : enemy.iceStacks, view.labelId, enemy.maxHp);
      if (enemy.iceStacks) node.insertAdjacentHTML('beforeend', `<g class="ice-stacks" fill="#baf5ff" stroke="#347697" stroke-width="1.2">${Array.from({length:enemy.iceStacks},(_,i)=>`<path transform="translate(${(i-(enemy.iceStacks-1)/2)*5} -22)" d="m0-3 2.5 3L0 3l-2.5-3Z"/>`).join('')}</g>`);
      if (frozen) {
        const size = G.enemyArtScale(enemy.kind,enemy.maxHp) * G.ENEMIES[enemy.kind].artSpan / 54;
        node.insertAdjacentHTML('beforeend', `<g class="ice-prison" transform="scale(${size})" stroke-linejoin="round">
          <path d="M-28-8-14-23 10-25 25-12 28 9 12 23-13 21-26 9Z" fill="#8ee6fa" fill-opacity=".24" stroke="#377aab" stroke-width="3.8"/>
          <path d="M-28-8-14-23 10-25 25-12 28 9 12 23-13 21-26 9Z M-27-8-16-5-14-22 M11-24 8-14 24-12 M12 21 16 11 27 9" fill="none" stroke="#e1ffff" stroke-width="2.2"/>
          <path d="m-24 9 8-5 5 7-6 8Z M7-21l10 7-11 1Z" fill="#c9f8ff" fill-opacity=".6"/></g>`);
      }
      if (burning || shocked || stunned) {
        node.insertAdjacentHTML('beforeend', `<g class="bug-status">
          ${burning ? '<use href="#art-firePatch" transform="translate(13 -9) scale(.44)"/>' : ''}
          ${shocked ? '<path d="m-22-12 7-5-1 8 7-3m18 21 6-9 1 6 6-5" fill="none" stroke="#315f88" stroke-width="4.5"/><path d="m-22-12 7-5-1 8 7-3m18 21 6-9 1 6 6-5" fill="none" stroke="#befbff" stroke-width="2.2"/>' : ''}
          ${stunned ? '<g stroke="#a17533" fill="#ffe795" stroke-width="1.2"><path d="m-11-19 1-4 3 3 4 1-4 2-2 4-1-4-4-1Zm17-3 2-4 2 3 4 2-4 1-2 4-1-4-4-2Z"/></g>' : ''}</g>`);
      }
      view.legs = node.querySelector('.bug-legs');
      view.eggRoll = enemy.kind === 'splitter' ? node.querySelector('.egg-roll') : null;
      view.centipede = enemy.kind === 'swift' ? node.querySelector('.centipede-run') : null;
      view.splitShadow = enemy.leap?.split ? node.querySelector('.bug-shadow') : null;
      view.wings = node.querySelector('.bug-wings');
      if (enemy.kind === 'rhinoBoss') {
        view.flightWings = node.querySelectorAll('.flight-wing');
        view.wingCovers = node.querySelectorAll('.wing-cover');
      }
      view.jaws = enemy.kind === 'stagBoss' ? node.querySelectorAll('use[href="#art-stagJaw"]') : null;
      view.scarabShell = enemy.kind === 'giant' ? node.querySelector('.scarab-shell') : null;
      view.hit = node.querySelector('.hit-flash');
      view.block = node.querySelector('.shield-flash');
      view.appearance = appearance;
    } else {
      const pose = A.bugPose(enemy.kind, time);
      if (view.legs) view.legs.setAttribute('transform', pose.legs);
      if (view.wings) view.wings.setAttribute('transform', pose.wings);
      if (view.jaws) for (const jaw of view.jaws) jaw.setAttribute('transform', pose.jaw);
      if (view.hit) view.hit.setAttribute('opacity', Math.min(1, enemy.flash * 8));
      if (view.block) view.block.setAttribute('opacity', Math.min(1, enemy.shieldFlash / .12));
    }
    if (view.centipede) {
      const frame = A.centipedeHref(reducedMotion.matches ? 0 : enemy.strideDistance);
      if (view.centipede.getAttribute('href') !== frame) view.centipede.setAttribute('href', frame);
    }
    if (view.eggRoll) {
      const frame = A.splitRollHref(reducedMotion.matches ? 0 : enemy.rollDistance);
      if (view.eggRoll.getAttribute('href') !== frame) view.eggRoll.setAttribute('href', frame);
    }
    if (view.splitShadow) {
      const height = G.enemyLift(enemy,state.time);
      view.splitShadow.setAttribute('transform', `scale(${1-height/150} ${1-height/110})`);
      view.splitShadow.setAttribute('opacity', .19-height*.0018);
      if (!enemy.leap) view.splitShadow = null;
    }
    if (view.scarabShell && !reducedMotion.matches) {
      const dashing = state.time - (enemy.lastDashStepAt ?? -Infinity) < .12 * BATTLE_SPEED &&
        enemy.attackId === null && !frozen && !shocked && !stunned && !enemy.spikeStun && !enemy.push && !enemy.pull;
      if (view.dashing !== dashing) { view.node.dataset.dashing = dashing; view.dashing = dashing; }
      const sinceRam = state.time - (enemy.lastRamAt ?? -Infinity);
      const ram = Math.max(0, 1 - sinceRam / .23);
      const brace = enemy.attackId !== null ? Math.max(0, 1 - enemy.attackClock / .34) : 0;
      const recoil = enemy.flash / .18;
      // The sprite faces left in its own coordinates, even when moving vertically.
      view.scarabShell.setAttribute('transform', `translate(${4 * brace - 9 * ram + 3 * recoil} ${-2 * brace}) rotate(${-5 * brace + 4 * ram})`);
    } else if (view.scarabShell) {
      view.scarabShell.removeAttribute('transform');
      if (view.dashing) { view.node.dataset.dashing = false; view.dashing = false; }
    }
    const cast = enemy.kind === 'spiderBoss' && state.shots.find(s => s.caster === enemy.id && s.age < s.duration * .55);
    const facing = cast ? cast.angle + 180 : enemy.facing;
    if (view.facing !== facing) {
      view.node.style.setProperty('--bug-facing', facing + 'deg');
      view.facing = facing;
    }
    if (view.hp !== enemy.hp) {
      view.node.dataset.hp = enemy.hp;
      view.hp = enemy.hp;
    }
    const jumping = !!enemy.leap;
    if (view.flightWings && (jumping || view.jumping)) {
      const progress = jumping ? Math.min(1, enemy.leap.age / enemy.leap.duration) : 0;
      const spread = Math.min(1, progress / .18, (1 - progress) / .20);
      const beat = reducedMotion.matches ? 0 : Math.sin(progress * Math.PI * 10);
      const wingAngle = -spread * (68 + 16 * beat);
      for (const wing of view.flightWings) wing.setAttribute('transform', `rotate(${wingAngle} -2 -6)`);
      for (const cover of view.wingCovers) cover.setAttribute('transform', `rotate(${-38 * spread} -2 -9)`);
    }
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
        view.node.setAttribute('aria-label', G.ENEMIES[e.kind].name);
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
    if (!b.aim) return 0;
    const tool=G.toolFor(G.primaryWeapon(b), b.upgraded);
    if (tool.maxDamage) return b.aim.damage/tool.maxDamage;
    return tool.aimSeconds ? Math.min(1,b.aim.age/(tool.aimSeconds*BATTLE_SPEED)) : 0;
  }
  function trackingAngle(b,target) {
    return Math.atan2(Y(target.y)-G.enemyLift(target,state.time)-(Y(b.r)-3),X(target.x)-X(b.c))*180/Math.PI;
  }
  function disintegrationWidth(damage, upgraded) {
    const tool = G.toolFor('disintegrationBeam', upgraded);
    const stage = (damage - tool.damage) / (tool.maxDamage - tool.damage);
    return 2 + stage * (upgraded ? 18 : 14);
  }
  const towerWeb = '<use class="tower-web" href="#art-silkNet" transform="scale(1.27)"/>';
  function fusionPortrait(building) {
    const frame = building.upgraded ? '-39 -39 78 74' : '-36 -35 72 66';
    return `<svg class="fusion-portrait" viewBox="${frame}" aria-hidden="true" focusable="false">${A.fusionResult(building)}</svg>`;
  }
  function recipeEquation(base, material, recipe) {
    return `<span class="recipe-equation" aria-hidden="true">${A.tool(base)}<b>+</b>${A.tool(material)}<b>=</b>${fusionPortrait(recipe)}</span>`;
  }
  let buildingBoard, buildingRevision, buildingViews;
  function drawBuildings(beams, visibleFlash) {
    if (buildingBoard !== state || buildingRevision !== state.revision) {
      buildingBoard = state; buildingRevision = state.revision;
      buildingViews = state.buildings.map(b => {
        const node = svg('g');
        node.setAttribute('transform', `translate(${X(b.c)} ${Y(b.r)})`);
        if (b.fusionKind) node.dataset.fusion = b.fusionKind;
        node.dataset.upgraded = b.upgraded; node.dataset.building = b.kind; node.dataset.c = b.c; node.dataset.r = b.r;
        return { building: b, node };
      });
      $('building-layer').replaceChildren(...buildingViews.map(view => view.node));
    }
    for (const view of buildingViews) {
      const b = view.building;
      // Keep the throwing arm on the same shot clock and facing as its stone.
      const stone = b.kind === 'flame' && state.shots.find(s => s.tower === b.id && s.kind === 'flame' && !s.armed);
      const weapon = G.primaryWeapon(b);
      const spinning = G.toolFor(weapon,b.upgraded).vortex && ['running','paused'].includes(state.phase) && !reducedMotion.matches && !(b.webUntil > state.time);
      const tracked = weapon==='disintegrationBeam' && b.aim && state.enemies.find(e=>e.id===b.aim.target && !e.dead);
      const angle = tracked ? trackingAngle(b,tracked) : spinning ? -25 + state.time * 90 : stone?.angle ?? (['pierce','mapLaser','cryoBeam','heatRay','recoilRay'].includes(weapon) ? beams.get(b.id)?.angle : null) ?? b.angle;
      const flash = stone ? Math.max(0, 1 - stone.age / stone.duration) : visibleFlash(b);
      const charge = weapon === 'impactCannon' && (state.phase === 'running' || state.phase === 'paused')
        ? Math.round(Math.max(0, 1 - b.cooldown * G.toolFor(weapon,b.upgraded).rate / BATTLE_SPEED) * 16) / 16
        : aimProgress(b);
      const webbed = b.webUntil > state.time && ['running','paused'].includes(state.phase);
      const secondary = b.secondary;
      const stone2 = secondary?.kind === 'flame' && state.shots.find(s => s.tower === b.id && s.kind === 'flame');
      const angle2 = stone2?.angle ?? (secondary?.kind === 'pierce' ? beams.get(b.id)?.angle : null) ?? secondary?.angle ?? (b.kind === 'pea' && b.fusionKind === 'cannon' ? 12 : -25);
      const flash2 = stone2 ? Math.max(0, 1 - stone2.age / stone2.duration) : secondary ? visibleFlash(secondary) : 0;
      const charge2 = secondary ? aimProgress(secondary) : 0;
      if (view.angle2 === angle2 && view.flash2 === flash2 && view.charge2 === charge2 && view.webbed === webbed && view.angle === angle && view.flash === flash && view.charge === charge && view.hp === b.hp) continue;
      view.angle = angle; view.flash = flash; view.charge = charge; view.hp = b.hp; view.webbed = webbed;
      view.angle2 = angle2; view.flash2 = flash2; view.charge2 = charge2;
      const hp = G.buildingHP(b.kind, b.fusionKind);
      const damage = b.hp < hp ? `<path d="M-6-12 0-3-5 7 4 18" fill="none" stroke="#7d6253" stroke-width="2"/><g transform="translate(${-hp * 4} 29)">${Array.from({ length: hp }, (_, i) => `<circle cx="${i * 8}" r="2.5" fill="${i < b.hp ? '#ae8b65' : '#d4cbb7'}"/>`).join('')}</g>` : '';
      const art = b.fusionKind ? A.fusionResult(b, angle, flash, charge, angle2, flash2, charge2)
        : A.tower(b.kind, angle, flash, charge, b.upgraded);
      view.node.innerHTML = art + damage + (webbed ? towerWeb : '') + buildingBadges(b.upgraded,b.fusionKind);
    }
  }
  function buildingBadges(upgraded, fused) {
    const badge = (kind,x) => `<g class="board-badge" data-badge="${kind}" transform="translate(${x} 14)" pointer-events="none"><rect x="-1" y="-1" width="18" height="18" rx="5" fill="#fff4d6" stroke="#5f523b" stroke-width="1.3"/><use href="#art-badge${kind}" transform="scale(.68)"/></g>`;
    return (upgraded ? badge('Crystal',-30) : '') + (fused ? badge('Hammer',upgraded ? -11 : -30) : '');
  }
  function tileMark(c,r) {
    return `<rect x="${X(c)-S/2+2}" y="${Y(r)-S/2+2}" width="${S-4}" height="${S-4}" rx="6"/>`;
  }
  function frostfireSpray(e,t) {
    const distance = Math.hypot(e.impactX-e.x,e.impactY-e.y)*S;
    const reach = distance ? Math.min(26,distance) + Math.max(0,distance-26)*Math.min(1,t*5) : 0;
    const wav = reducedMotion.matches ? 0 : 4*Math.sin(t*9);
    if (e.upgraded) {
      const end = reach;
      const mid = 25+(end-25)*.5, phase = reducedMotion.matches ? 0 : Math.sin(t*11)*3;
      const jets = [[-1,'#438bb3','#bffaff'],[1,'#c4663e','#ffcf71']].map(([side,edge,light])=>{
        const d=`M25 ${7*side}Q${mid-7} ${(14+phase)*side} ${mid} 0T${end} ${3*side}`;
        return `<path d="${d}" stroke="${edge}" stroke-width="7"/><path d="${d}" stroke="${light}" stroke-width="4.3"/>`;
      }).join('');
      const steam = Math.max(0,Math.min(1,(t-.12)*4));
      return `<g class="frostfire-spray braided-jet" transform="translate(${X(e.x)} ${Y(e.y)-3}) rotate(${e.angle})" opacity="${Math.min(1,2.4*(1-t))}" stroke-linecap="round" fill="none">
        ${jets}<g transform="translate(${end} 0) rotate(${-e.angle}) scale(${steam})" stroke="#97b3b8" stroke-width="2">
        <path d="M-10 2q-8-2-6-8 1-5 7-4-1-6 5-8 7-2 9 5 8-2 10 5 6 7-3 10" transform="translate(0 ${-7*t})" fill="#f4f6e6" fill-opacity=".78"/>
        <path d="m-7-7 2-4m6 0 2 3" stroke="#fff"/></g></g>`;
    }
    return `<g class="frostfire-spray" transform="translate(${X(e.x)} ${Y(e.y)-3}) rotate(${e.angle})" opacity="${Math.min(1,2.1*(1-t))}" stroke-linecap="round">
      <path d="M23-6 Q43 ${-13+wav} ${reach+4} ${-8-wav} Q${reach-4} 0 24-3Z" fill="#adf5ff" stroke="#439fc1" stroke-width="2"/>
      <path d="M24 6 Q40 ${13-wav} ${reach+6} ${8+wav} L${reach-1} 4 ${reach+3} 1 Q43 5 25 3Z" fill="#ffca5c" stroke="#cf6340" stroke-width="2"/>
      <path d="M26-6 Q42 ${-10+wav} ${reach} -7 M26 6 Q42 11 ${reach} 6" fill="none" stroke="#fff6d9" stroke-width="1.6"/>
      <g transform="translate(${reach} -7) rotate(${25*t}) scale(${.35+.35*t})" color="#ebffff"><use href="#art-snowflake"/></g>
      <g transform="translate(${reach+3} 9) rotate(${-e.angle}) scale(${.38+.2*t})"><use href="#art-firePatch"/></g></g>`;
  }
  function vortexArt(v) {
    const tool=G.toolFor(v.weapon,v.upgraded), age=v.age/G.BATTLE_SPEED, span=tool.lifetime;
    const pulse=age%1, spin=reducedMotion.matches ? 0 : age*5.6+v.id;
    const position=`transform="translate(${X(v.x)} ${Y(v.y)})" opacity="${Math.min(1,.35+age*4,(span-age)*4)}"`;
    if (tool.vortex === 'fire') {
      if (v.upgraded) {
        const radius=tool.radius*S, drift=4*Math.sin(spin);
        const leaves=[0,1,2,3,4].map(i=>{
          const a=spin+i*Math.PI*2/5, w=19+3*(i%2);
          return `<use href="#art-firePetal" transform="translate(${Math.cos(a)*w} ${-27+Math.sin(a)*8}) rotate(${a*180/Math.PI+55}) scale(.65)"/>`;
        }).join('');
        return `<g class="fire-vortex furnace-vortex" ${position}>
          <circle class="vortex-boundary" r="${radius}" fill="#ed8547" fill-opacity=".08" stroke="#cd7446" stroke-opacity=".72" stroke-dasharray="7 6"/>
          <ellipse rx="21" ry="8" fill="#ac4d3b" fill-opacity=".4"/><path d="M-14 1Q0 9 14 0M-9 3Q-2 8 7 4" fill="none" stroke="#ffbc66" stroke-width="2.5"/>
          <g transform="skewX(${drift})"><path d="M0 4C-12-5 6-14-12-21q-10-8-10-17 8 7 15 6-3-14 4-20 2 11 10 14 9 3 14-8 2 12-6 21C0-11 5-6 0 4Z" fill="#fa9643" stroke="#b95f43" stroke-width="2"/>
          <path d="M0 0q-3-11 3-18 5-8-3-18 12 5 13-1 2 10-5 16Q1-10 0 0Z" fill="#ffe793"/>
          <path d="M-21-33C-8-21 8-36 23-32Q11-23-10-22T6-14Q-10-8-1 0" fill="none" stroke="#ad5143" stroke-width="5" stroke-linecap="round"/>
          <path d="M-21-34C-8-22 8-37 23-33Q11-24-10-23T6-15Q-10-9-1 0" fill="none" stroke="#ffd37c" stroke-width="2.6" stroke-linecap="round"/></g>${leaves}</g>`;
      }
      const coils=[0,1,2].map(i=>{
        const w=8+6*i, shift=3*Math.sin(spin+i);
        return `<g transform="translate(${shift} ${-9-9*i})"><path d="M${-w} -5 Q-1 4 ${w} -6 Q${w+5} 4 ${-w+4} 12 Q6 4 ${-w} 1Z" fill="${i===2?'#ffad49':'#e97a3e'}" stroke="#b2573d" stroke-width="1.6"/>
          <path d="M${-w+2} -4 Q2 2 ${w-1} -5" fill="none" stroke="#ffe28a" stroke-width="2.5"/></g>`;
      }).join('');
      const sparks=[0,1,2,3,4].map(i=>{
        const a=spin+i*1.26;
        return `<path d="M0 3q-4-2-2-5l3-5q2 3 1 5l2-1q1 4-4 6Z" transform="translate(${Math.cos(a)*(17+i*1.6)} ${-24+9*Math.sin(a)-i*1.6}) scale(.65)" fill="#ffc968" stroke="#c36a42"/>`;
      }).join('');
      return `<g class="fire-vortex" ${position}><circle class="vortex-boundary" r="${tool.radius*S}" fill="#f18946" fill-opacity=".09" stroke="#c46242" stroke-opacity=".7" stroke-dasharray="6 7"/>
        <circle r="${6+(tool.radius*S-6)*pulse}" fill="none" stroke="#ffba68" stroke-width="2.5" opacity="${.8*(1-pulse)}"/>
        <path d="M1 5Q-12-6-4-16q5-6 3-12-1-4 5-10 1 5 7 9 8 8 1 16-6 5-11 18Z" fill="#ffb449" stroke="#c46040"/>
        <path d="M1 1q-1-7 5-12l2-8q3 7-1 12Z" fill="#ffed9b"/>${coils}${sparks}</g>`;
    }
    const ribbons=[0,1,2].map(i=>{
      const y=-8-i*9, width=(10+i*6)*(v.upgraded ? 1.2 : 1), shift=3*Math.sin(spin+i);
      return `<g transform="translate(${shift} ${y})"><path d="M${-width} -4 C${-width+4} 5 ${width-2} 3 ${width} -4 Q${width+4} 6 ${-width+6} 12 Q${width/2} 5 ${-width} 1Z" fill="${i===2?'#d4f8ff':'#8fd5e9'}" stroke="#579bb8" stroke-width="1.4"/>
        <path d="M${-width+4} -3 Q1 3 ${width-3} -4" fill="none" stroke="#f2ffff" stroke-width="2.4"/></g>`;
    }).join('');
    const flakes=[0,1,2,3].map(i=>{
      const a=spin+i*Math.PI/2;
      return `<path d="m0-3 2 3-2 3-2-3Z" transform="translate(${Math.cos(a)*(20+i*2)} ${-22+Math.sin(a)*12-i*2})" fill="#edffff" stroke="#6caec8"/>`;
    }).join('');
    return `<g class="ice-vortex" ${position}>
      <circle class="vortex-boundary" r="${tool.radius*S}" fill="#c4f6ff" fill-opacity=".08" stroke="#66b1c5" stroke-opacity=".48" stroke-dasharray="5 8"/>
      <circle r="${5+(tool.radius*S-5)*pulse}" fill="none" stroke="#f2ffff" stroke-width="2" opacity="${.65*(1-pulse)}"/>
      <path d="M-5-10Q-8-1 1 5Q-2-1 6-9" fill="#a8e4f2" stroke="#67acc2"/>${ribbons}${flakes}</g>`;
  }
  const snowFacets = [[-.65,0],[-.65,2.8],[-.28,1.4],[-.28,4.6],[.1,.35],[.1,3.5],[.5,1.8],[.5,4.9],[.77,.7],[.77,3.8]];
  function rollingSnowArt(s) {
    const distance = (s.x-s.c)*s.dx + (s.y-s.r)*s.dy;
    const radius = G.snowRadius(distance), scale = S * radius / 14;
    // Integrate distance / radius as the sphere grows. The top surface moves in the travel direction.
    const phase = reducedMotion.matches ? 0 : 2 * Math.log(radius / .5) / G.toolFor('snowCannon').diameterGrowth;
    const facets = snowFacets.map(([lane, start]) => {
      const angle = phase + start, front = Math.cos(angle);
      if (front <= 0) return '';
      const x = 13 * Math.sqrt(1-lane*lane) * Math.sin(angle);
      return `<g transform="translate(${x} ${13*lane}) scale(${front} 1)"><path d="m-2.8-.6 1.4-1 2.4.6 1.1 1.1-2.3.7Z" fill="#83b7ca"/><path d="m-2.6-.8 1.3-1.1 2.4.7" fill="none" stroke="#fff" stroke-width=".8"/></g>`;
    }).join('');
    return `<g clip-path="url(#field-bounds)"><g class="rolling-snow" transform="translate(${X(s.x)} ${Y(s.y)}) scale(${scale})">
      <circle r="14" fill="url(#rolling-snow-light)" stroke="#5c91a7" stroke-width="1.3"/>
      <g class="snow-surface" transform="rotate(${s.angle})">${facets}${s.upgraded ? [0,2.1,4.2].map(a=>{
        const front=Math.cos(phase+a);
        return front<=0 ? '' : `<g transform="translate(${12*Math.sin(phase+a)} 0) scale(${front} 1)"><path d="m-3-10 5 4-3 6 3 5-4 5-3-5 2-5-2-6Z" fill="#8dcfe4" stroke="#5a99b9" stroke-width="1"/><path d="m-1-7 1 3-1 3" fill="none" stroke="#fff"/></g>`;
      }).join('') : ''}</g>
      <path d="M-10-6q2-4 6-5" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/></g></g>`;
  }
  function snowBurstArt(e,t) {
    const radius = S * e.radius, spread = 1-(1-t)**3;
    const shards = [9,58,97,141,190,226,275,318].map((angle,i) => {
      const reach = radius*(.65 + (i%3)*.14)*spread;
      return `<g transform="rotate(${angle}) translate(${reach} 0) rotate(${t*75})">${e.upgraded ? '<use href="#art-breakIce" transform="rotate(80) scale(.78)"/>' : '<path d="m-5 1 3-4 6 2-1 4-6 1Z" fill="#e7fbff" stroke="#6da6bc" stroke-width="1.3"/>'}</g>`;
    }).join('');
    return `<g clip-path="url(#field-bounds)"><g class="snow-burst" transform="translate(${X(e.x)} ${Y(e.y)})" opacity="${1-t*t}">
      <circle r="${radius*spread}" fill="#d7f9ff" fill-opacity="${.28*(1-t)}" stroke="#eefcff" stroke-width="${3*(1-t)}"/>${shards}</g></g>`;
  }
  function magneticBurst(e,t) {
    const radius=e.radius*S, spread=Math.min(1,t/.60), front=5+(radius-5)*(1-(1-spread)**2);
    const arcs=[0,60,120,180,240,300].map((a,i)=>{
      const arc=`M${front*.86} ${-front*.36} l${front*.12} ${front*.16} -5 2 6 4 -4 3 3 5 L${front*.93} ${front*.28}`;
      return `<g transform="rotate(${a+8*Math.sin(8*t+i)})"><path d="${arc}" stroke="#6453ad" stroke-width="4.8"/><path d="${arc}" stroke="#bbffff" stroke-width="2.1"/></g>`;
    }).join('');
    return `<g clip-path="url(#field-bounds)"><g class="comet-burst" transform="translate(${X(e.x)} ${Y(e.y)})" fill="none" opacity="${Math.min(1,(1-t)*3.6)}">
      <circle class="emp-boundary" r="${radius}" fill="#9383ed" fill-opacity=".1" stroke="#6c60ad" stroke-width="2.2" stroke-dasharray="7 4"/>
      <circle r="${front}" stroke="#8e73d0" stroke-width="5"/><circle r="${front}" stroke="#d1fdff" stroke-width="1.7"/>
      ${e.upgraded ? `<g class="comet-constellation" transform="scale(${front/radius})">
        <path d="M0 -${radius*.83} ${radius*.72} -${radius*.42} ${radius*.72} ${radius*.42} 0 ${radius*.83} -${radius*.72} ${radius*.42} -${radius*.72} -${radius*.42}Z" stroke="#dfbb75" stroke-width="2" stroke-dasharray="13 5"/>
        ${[0,60,120,180,240,300].map(a=>`<use href="#art-cometStar" transform="rotate(${a}) translate(0 ${-radius*.83}) scale(.62)"/>`).join('')}</g>` : ''}
      <g stroke-linecap="round" stroke-linejoin="round">${arcs}</g>
      <use href="#art-cometStar" transform="translate(0 ${-e.lift}) scale(${Math.max(0,1.2-1.8*t)})"/></g></g>`;
  }
  function moltenShotArt(s) {
    const x=X(s.impactX), y=Y(s.impactY), t=Math.min(1,s.age/s.duration);
    if (!s.armed) return `<g class="molten-target"><g fill="#d66e43" fill-opacity=".09" stroke="#be724a" stroke-dasharray="5 6">${tileMark(s.impactX,s.impactY)}</g>
      ${A.moltenFlight(X(s.c),Y(s.r),x,y,t,s.upgraded)}</g>`;
    const cells=G.attackCells(s.weapon,s.impactX,s.impactY).map(p=>tileMark(p.c,p.r)).join('');
    const glow=reducedMotion.matches ? t : .5+.5*Math.sin(t*Math.PI*(5+5*t));
    return `<g class="armed-firestone"><g fill="#ed7b40" fill-opacity="${.04+.09*t}" stroke="#a65c42" stroke-dasharray="5 8" opacity="${.35+.45*t}">${cells}</g>
      <g transform="translate(${x} ${y})"><circle r="17" fill="none" stroke="#734844" stroke-width="3.6"/>
      <circle r="17" fill="none" stroke="#ffd275" stroke-width="3.2" pathLength="1" stroke-dasharray="${1-t} 1" transform="rotate(-90)"/>
      <circle r="${15+3*glow}" fill="url(#art-ember-halo)"/><use href="#art-${s.upgraded ? 'moltenBomb' : 'magmaStone'}" transform="translate(0 -2) scale(${(s.upgraded ? 1 : .76)+.13*t})"/>
      <path d="m-7-3 4 1 4-5 2 6 6-1" stroke="#fff0a3" opacity="${glow}" stroke-width="2" fill="none"/></g></g>`;
  }
  function moltenBlastArt(e,t) {
    const x=X(e.x), y=Y(e.y), front=1-(1-t)**2;
    const bursts=e.cells.map(p=>{
      const edge=p.c!==e.x || p.r!==e.y;
      const u=edge?Math.max(0,(front-.18)/.82):front;
      const px=X(p.c), py=Y(p.r);
      return `<g transform="translate(${x+(px-x)*u} ${y+(py-y)*u})" opacity="${1-.65*t}"><ellipse rx="${5+19*u}" ry="${3+8*u}" fill="#ed894b" fill-opacity=".45"/>
        <use href="#art-firePatch" transform="translate(0 ${-4-7*t}) scale(${(edge?.85:1.4)*(1-.4*t)})"/></g>`;
    }).join('');
    return `<g class="molten-blast" clip-path="url(#field-bounds)" opacity="${Math.min(1,(1-t)*3)}">
      <g fill="#ffaf4b" fill-opacity="${.3*(1-t)}" stroke="#de8644" stroke-opacity="${1-t}">${e.cells.map(p=>tileMark(p.c,p.r)).join('')}</g>${bursts}
      <g transform="translate(${x} ${y})">${A.stoneImpact(t,true)}</g>${e.upgraded ? `<g class="molten-fracture">${e.cells.filter(p=>p.c!==e.x || p.r!==e.y).map(p=>{
        const angle=Math.atan2(p.r-e.y,p.c-e.x)*180/Math.PI, d=Math.hypot(p.c-e.x,p.r-e.y)*S*front;
        return `<g transform="translate(${x} ${y}) rotate(${angle})"><path d="M4 0 ${d*.38} 3 ${d*.54} -3 ${d*.76} 1 ${d} 0" fill="none" stroke="#ffdf83" stroke-width="${3-1.5*t}"/>
          <use href="#art-hotFragment" transform="translate(${d} ${-9*Math.sin(Math.PI*t)}) rotate(${85*t}) scale(${1-.55*t})"/></g>`;
      }).join('')}</g>` : ''}</g>`;
  }
  function delayedStrikeArt(s) {
    const t = Math.min(1,s.age/s.duration), meteor = s.kind === 'meteorTower';
    const x = X(s.impactX), y = Y(s.impactY), ink = meteor ? '#b25a38' : '#8c5b45';
    const cells = G.attackCells(s.kind,s.impactX,s.impactY,s.upgraded).map(p=>tileMark(p.c,p.r)).join('');
    let incoming;
    if (meteor) {
      const fall = Math.max(0,(t-.4)/.6) ** 1.6;
      incoming = `<g transform="translate(${x+53*(1-fall)} ${y-188*(1-fall)})" opacity="${Math.min(1,t*6)}">
        <path d="M-10-5q1-20 16-43l-2 24 11-16-5 26-6 13Z" fill="#fc9650" stroke="#c96948" stroke-width="1.7"/>
        <path d="m-3-7 5-15 2 7 7-10-5 19Z" fill="#ffe493"/>
        <use href="#art-fallingRock" transform="rotate(${t*75}) scale(${s.upgraded ? 1.24 : 1})"/></g>`;
    } else {
      const sx=X(s.c), sy=Y(s.r)-3, a=Math.atan2(y-sy,x-sx)*180/Math.PI;
      const d=Math.hypot(x-sx,y-sy), start=Math.min(22,d);
      incoming = `<g class="sonic-transmission" fill="none" stroke-linecap="round" transform="rotate(${a} ${sx} ${sy})">
        ${[0,.18,.36,.54].map(offset=>{
          const u=Math.max(0,(t-offset)/(1-offset)), px=sx+start+(d-start)*u;
          return `<g transform="translate(${px} ${sy}) scale(${.62+.6*u})" opacity="${t>=offset?.98:0}"><path d="M-5-18Q12 0-5 18" stroke="#775080" stroke-width="7"/><path d="M-5-18Q12 0-5 18" stroke="#ffdf89" stroke-width="3.4"/></g>`;
        }).join('')}</g>
        <g transform="translate(${x} ${y})" stroke="#926098" stroke-width="3.4" fill="none"><circle r="${25-12*t}"/><circle r="${31-12*t}" stroke-dasharray="9 7" transform="rotate(${t*65})"/></g>`;
    }
    return `<g class="strike-warning" data-weapon="${s.kind}" clip-path="url(#field-bounds)"><g fill="${meteor?'#ff9d53':'#ffd67c'}" fill-opacity="${(meteor?.09:.16)+.12*t}" stroke="${ink}" stroke-width="${meteor?2:3}" stroke-dasharray="7 5">${cells}</g>
      <circle cx="${x}" cy="${y}" r="${18-9*t}" fill="none" stroke="${ink}" stroke-width="2.3"/>${incoming}</g>`;
  }
  function cellStrikeArt(e,t) {
    const x=X(e.x), y=Y(e.y);
    const marks=e.cells.map(p=>tileMark(p.c,p.r)).join('');
    const color=G.toolFor(e.weapon).color;
    const waves = e.cells.map(p=>{
      const ex=X(p.c),ey=Y(p.r);
      if (e.weapon === 'crossCoil') {
        const angle=Math.atan2(ey-y,ex-x)*180/Math.PI;
        if (e.upgraded) {
          const fork = 6+3*(1-t);
          const wires=[-1,1].map(side=>{
            const d=`M18 ${side*4} 28 ${side*fork} 34 ${side*3} 41 ${side*11} 49 ${side*5} 56 ${side*7} 64 0`;
            return `<path d="${d}" stroke="#7355a0" stroke-width="5"/><path d="${d}" stroke="${side===1?'#a2f8ff':'#e6bcff'}" stroke-width="2.4"/>`;
          }).join('');
          return `<g class="forked-discharge" transform="translate(${x} ${y}) rotate(${angle})" fill="none" stroke-linejoin="round">${wires}<circle cx="64" r="${4+8*t}" stroke="#e9edff" stroke-width="2.2"/></g>`;
        }
        const bolt=`M12 0 25 -4 30 3 37 -5 46 4 49 -2 62 0`;
        return `<g transform="translate(${x} ${y}) rotate(${angle})" fill="none" stroke-linejoin="round"><path d="${bolt}" stroke="#7751ac" stroke-width="6"/><path d="${bolt}" stroke="#dbffff" stroke-width="2.6"/><circle cx="62" r="${2+5*(1-t)}" fill="#efffff"/></g>`;
      }
      if (e.weapon === 'meteorTower') return `<g transform="translate(${ex} ${ey}) scale(${.9-.2*t})">${A.stoneImpact(t,e.upgraded && p.c===e.x && p.r===e.y)}</g>`;
      const wave=4+23*Math.min(1,t*1.65);
      return `<g class="sonic-impact" fill="none" transform="translate(${ex} ${ey})">
        <circle r="${wave}" stroke="#785584" stroke-width="6"/><circle r="${wave}" stroke="#fff0a4" stroke-width="2.8"/>
        <circle r="${3+17*t}" stroke="#b1789a" stroke-width="2.6"/>
        <path d="M-21 1h8l3-5 4 9 4-17 4 22 4-13 3 4h12" fill="none" stroke="#683d75" stroke-width="4.8"/>
        <path d="M-21 1h8l3-5 4 9 4-17 4 22 4-13 3 4h12" fill="none" stroke="#ffecab" stroke-width="2.1"/></g>`;
    }).join('');
    return `<g class="cell-strike" data-weapon="${e.weapon}" clip-path="url(#field-bounds)" opacity="${1-t}"><g fill="${color}" fill-opacity=".16">${marks}</g>${waves}</g>`;
  }
  function eggArt(egg) {
    const remaining = (egg.hatchAt - state.time) / BATTLE_SPEED;
    const cracking = Math.max(0, 1 - remaining);
    const wobble = reducedMotion.matches ? 0 : cracking * 10 * Math.sin(remaining * 24);
    return `<g class="brood-egg" transform="translate(${X(egg.c)} ${Y(egg.r)})">
      <ellipse cy="12" rx="14" ry="4" fill="#665830" opacity=".2"/>
      <g transform="rotate(${wobble} 0 12)"><use href="#brood-shell"/>
        <path d="m-11 1 6-3 3 4 5-6 3 3 5-3" fill="none" stroke="#916122" stroke-width="1.8" opacity="${cracking}"/></g></g>`;
  }
  function renderWorld() {
    const lift = e => G.enemyLift(e, state.time);
    const settled = finishAge ?? 0;
    const beams = new Map(state.effects.filter(e => e.kind === 'laser' && e.life > settled).map(e => [e.tower, e]));
    const visibleFlash = b => Math.max(0, b.flash - settled / G.RECOIL_SECONDS);
    const bow = $('castle-bow').style, snap = state.castle ? visibleFlash(state.castle) : 0;
    bow.setProperty('--castle-aim', `${state.castle?.angle ?? 0}deg`);
    bow.setProperty('--string-pull', 1 - 1.8 * snap * snap);
    bow.setProperty('--bow-kick', `${-3 * Math.sin((1 - snap) * Math.PI) * snap}px`);
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
    }).join('') + state.eggs.map(eggArt).join('');
    drawBuildings(beams, visibleFlash);
    drawEnemies(lift);
    const aiming = ['running', 'paused'].includes(state.phase) ? state.buildings.map(building => {
      const b = building.secondary?.aim ? building.secondary : building;
      if (!b.aim) return '';
      const groundAim = G.primaryWeapon(b) === 'gravityCannon';
      const progress = aimProgress(b);
      if (groundAim) {
        const x=X(b.aim.x), y=Y(b.aim.y);
        const wobble=reducedMotion.matches ? 0 : progress*2.6;
        const dx=wobble*Math.sin(state.time*67), dy=wobble*Math.sin(state.time*91);
        const core=3+14*progress, orbit=34-14*progress;
        return `<g class="gravity-charge" data-cell="${b.aim.x},${b.aim.y}" transform="translate(${x} ${y})">
          <rect x="-29" y="-29" width="58" height="58" rx="5" fill="#735a99" fill-opacity=".14" stroke="#75618e" stroke-width="2" stroke-dasharray="10 5"/>
          <g transform="translate(${dx} ${dy})"><circle r="${core+4}" fill="#9173bb" opacity=".38"/>
          <g transform="rotate(${reducedMotion.matches?0:progress*160})" fill="none" stroke="#b7a4e8" stroke-width="2.4" stroke-linecap="round">
          ${[0,120,240].map(a=>`<path transform="rotate(${a})" d="M${orbit} 0Q${orbit} ${-orbit*.7} ${core*.6} ${-core*.7}"/>`).join('')}</g>
          ${b.upgraded ? `<g class="gravity-lens" transform="rotate(-24)" fill="none" stroke-linecap="round">
            <ellipse rx="${core+13}" ry="${core*.5+4}" stroke="#f4c383" stroke-width="2.3"/>
            ${[0,120,240].map(a=>{const phi=a*Math.PI/180+(reducedMotion.matches?0:progress*6), orbitRadius=core+14+(1-progress)*15;
              return `<path transform="translate(${Math.cos(phi)*orbitRadius} ${Math.sin(phi)*orbitRadius*.55}) rotate(${a+progress*80})" d="m-4 0 4-2 4 2-4 2Z" fill="#fff0b7" stroke="#ad819f"/>`;
            }).join('')}</g>` : ''}
          <circle class="gravity-core" r="${core}" fill="#201b33" stroke="#d0baff" stroke-width="2"/></g></g>`;
      }
      const target = state.enemies.find(e => e.id === b.aim.target && !e.dead);
      if (!target) return '';
      const x = X(target.x), y = Y(target.y) - lift(target), radius = 28, length = 2 * Math.PI * radius;
      if (G.primaryWeapon(b)==='disintegrationBeam') {
        const cx=X(b.c), cy=Y(b.r)-3, distance=Math.hypot(x-cx,y-cy), start=Math.min(24,distance), power=b.aim.damage;
        if (b.webUntil > state.time) return '';
        const transform=`translate(${cx} ${cy}) rotate(${trackingAngle(b,target)})`;
        const line=`M${start} 0H${distance}`;
        if (!power) {
          const charge = 1 - b.aim.remaining / (G.toolFor('disintegrationBeam', b.upgraded).chargeSeconds * BATTLE_SPEED);
          const sweep = reducedMotion.matches ? 0 : -9 + 18 * charge;
          return `<g class="disintegration-charge" transform="${transform}" fill="none" stroke-linecap="round">
            <path class="disintegration-scan-line" d="${line}" stroke="#376b80" stroke-width="1.8" stroke-dasharray="4 5" stroke-dashoffset="${reducedMotion.matches ? 0 : -18 * charge}"/>
            <g transform="translate(${distance} 0)"><path d="M-5 -10h-5v5m15 15h5V5" stroke="#376b80" stroke-width="1.8"/>
              <path d="M${sweep} -8v16" stroke="#affff0" stroke-width="2"/></g></g>`;
        }
        const width = disintegrationWidth(power,b.upgraded);
        return `<g class="disintegration-beam" data-power="${power}" transform="${transform}" fill="none" stroke-linecap="round">
          <path d="${line}" stroke="#585396" stroke-width="${width}" opacity=".72"/><path d="${line}" stroke="#75edda" stroke-width="${width*.65}"/><path d="${line}" stroke="#edffff" stroke-width="${width*.22}"/>
          <path d="${line}" stroke="#fff" stroke-width="${width*.19}" stroke-dasharray="${b.upgraded ? '6 8' : '3 13'}" stroke-dashoffset="${reducedMotion.matches?0:-state.time*(b.upgraded ? 38 : 22)}"/>
          ${b.upgraded && width>2 ? `<g class="beam-packets">${Array.from({length:power},(_,i)=>{
            const p=((reducedMotion.matches ? .5 : state.time*1.6)+i/power)%1;
            return `<g transform="translate(${start+(distance-start)*p} 0) skewX(-12)"><ellipse rx="${width*.16}" ry="${width*.5}" stroke="#4d7592" stroke-width="2"/><ellipse rx="${width*.16}" ry="${width*.5}" stroke="#c3ffde" stroke-width="1"/></g>`;
          }).join('')}</g>` : ''}
          <g transform="translate(${distance} 0) rotate(${reducedMotion.matches?0:state.time*32})"><circle r="${3.8+power}" stroke="#dcfff1" stroke-width="2"/>
          <circle r="${7+power}" stroke="#6abfca" stroke-width="2" stroke-dasharray="5 5"/></g></g>`;
      }
      const mount = A.mountFor(building, b.kind);
      const magnetic = G.primaryWeapon(b) === 'magCannon';
      const cold = G.primaryWeapon(b) === 'cryoPlasma';
      const radians = b.angle * Math.PI / 180;
      const coilX = X(b.c) + mount.x + (magnetic ? Math.cos(radians) * 24 : 0);
      const coilY = Y(b.r) + mount.y + (magnetic ? Math.sin(radians) * 24 - 3 : -29 * mount.scale);
      return `<g class="molecular-aim" data-tower="${b.id}" data-target="${target.id}">
        <path class="aim-line" d="M${coilX} ${coilY}L${x} ${y}" stroke="${cold?'#4287ab':'#8552a2'}" stroke-width="2.3" stroke-linecap="round" stroke-dasharray="4 6" stroke-dashoffset="${-progress * 40}" opacity="${.5 + progress * .4}"/>
        <g transform="translate(${coilX} ${coilY})">${magnetic || cold ? '' : A.chargeGlobe(progress, b.upgraded)}</g>
        <g transform="translate(${x} ${y})" fill="none"><circle r="${radius}" stroke="#fff2d9" stroke-opacity=".85" stroke-width="3"/>
        <circle class="aim-charge" r="${radius}" stroke="${cold?'#46aacd':'#9657b0'}" stroke-width="3.8" stroke-dasharray="${length * progress} ${length}" transform="rotate(-90)"/>
        <path d="M-33 0h9m48 0h9M0-33v9m0 48v9" stroke="#794e90" stroke-width="2.6"/></g></g>`;
    }).join('') : '';
    const storms = state.vortices.length ? `<g clip-path="url(#field-bounds)">${state.vortices.map(vortexArt).join('')}</g>` : '';
    $('shot-layer').innerHTML = storms + aiming + state.shots.map(s => {
      if (s.weapon === 'moltenMortar') return moltenShotArt(s);
      if (s.kind === 'snowCannon') return rollingSnowArt(s);
      if (s.kind === 'cometCannon') {
        const x=X(s.x), y=Y(s.y)-s.lift-3;
        const track=[...s.trail.map(p=>[X(p.x),Y(p.y)-p.lift-3]),[x,y]];
        const path=track.map(([px,py],i)=>(i?'L':'M')+px+' '+py).join(' ');
        return `<g class="homing-comet"><g fill="none" stroke-linecap="round"><path d="${path}" stroke="#a876b9" stroke-width="7"/><path d="${path}" stroke="#ffe2b3" stroke-width="3"/></g><g transform="translate(${x} ${y}) rotate(${s.angle+16})">${s.upgraded ? '<ellipse rx="13" ry="6" transform="rotate(-30)" fill="none" stroke="#c6c4ff" stroke-width="2"/>' : ''}<use href="#art-cometStar"/></g></g>`;
      }
      if (s.kind === 'meteorTower' || s.kind === 'sonicCannon') return delayedStrikeArt(s);
      if (s.kind === 'spiderWeb') {
        return A.spiderWebFlight(X(s.c), Y(s.r), X(s.tipX), Y(s.tipY), 26 * G.enemyArtScale('spiderBoss'), s.age / s.duration, reducedMotion.matches);
      }
      const station = s.kind === 'castle' && A.castleBowPosition(s.barrelOffset);
      const mount = A.mountFor(G.at(state, s.c, s.r), s.weapon ?? s.kind);
      const x = X(s.c) + (station ? station.x * castleScale() : mount.x);
      const y = Y(s.r) + (station ? station.y * castleScale() : mount.y - 3 * mount.scale);
      const offset = s.weapon === 'tacticalAir' ? (s.id % 2 ? -9 : 6) : s.barrelOffset;
      return A.flight(s.kind, x, y, X(s.tipX), Y(s.tipY) - s.lift, Math.min(1, s.age / s.duration), s.angle, s.upgraded, station ? 0 : offset, mount.scale, s.weapon);
    }).join('');
    const raider = state.enemies.find(e => e.kind === 'stagBoss' && !e.raided && e.preyId != null);
    const marked = raider && state.buildings.find(b => b.id === raider.preyId);
    const warning = marked ? `<g transform="translate(${X(marked.c)} ${Y(marked.r)})" fill="none" stroke="#a84a35" stroke-width="3"><path d="M-27-14v-12h12m30 0h12v12m0 28v12H15m-30 0h-12V14"/></g>` : '';
    $('effects-layer').innerHTML = warning + state.effects.map(e => {
      const life = e.life - settled;
      if (life <= 0 || e.kind === 'frost') return '';
      const t = 1 - life / e.duration, x = X(e.x), y = Y(e.y) - (e.lift ?? 0);
      const at = `transform="translate(${x} ${y})" opacity="${1 - t}"`;
      if (e.kind === 'cellStrike') return cellStrikeArt(e,t);
      if (e.kind === 'moltenBlast') return moltenBlastArt(e,t);
      if (e.kind === 'gravityWell') {
        const edge=e.radius*S;
        const collapse=t<.1 ? .52+.48*t/.1 : ((1-t)/.9)**1.65;
        const r=Math.max(.3,edge*collapse);
        return `<g class="gravity-well" clip-path="url(#field-bounds)"><g ${at} fill="none">
          <circle class="gravity-collapse" r="${r}" fill="${e.upgraded ? 'url(#art-gravity-field)' : '#251c38'}" fill-opacity=".82" stroke="#ceb7fc" stroke-opacity=".8" stroke-width="2.4"/>
          <g transform="rotate(${reducedMotion.matches?0:110*t})">${[0,90,180,270].map(a=>`<path transform="rotate(${a})" d="M${r} 0Q${r} ${-r*.62} 4 -6" stroke="#675391" stroke-opacity=".55" stroke-width="4"/><path transform="rotate(${a})" d="M${r} 0Q${r} ${-r*.62} 4 -6" stroke="#e0d2ff" stroke-opacity=".8" stroke-width="1.5"/>`).join('')}</g>
          ${e.upgraded ? `<g transform="rotate(-24) scale(${r/100})" stroke-linecap="round">
            <g class="gravity-infall" transform="rotate(${reducedMotion.matches ? 0 : t*96})">
              ${[0,120,240].map(a=>`<g transform="rotate(${a})"><path d="M88 0C85 39 31 48 15 20Q6 5 0 0" stroke="#d7ae7d" stroke-width="2.5"/><path d="m80-1 7-5 7 5-7 4Z" fill="#e4d0a4" stroke="#705178"/></g>`).join('')}</g>
            <ellipse rx="73" ry="23" stroke="url(#art-accretion)" stroke-width="4.2"/>
            <path d="M-64 6C-36 29 43 21 69 5M-67-5C-58-18-27-25-6-23" stroke="#ede2ff" stroke-width="1.6"/>
            <ellipse rx="31" ry="12" fill="#8065ac" fill-opacity=".36"/>
            <circle r="15" fill="#211b32" stroke="#c8a4eb" stroke-width="2.4"/>
            <path d="M-53 8Q-13 26 40 12" stroke="url(#art-accretion)" stroke-width="4.5"/>
            <path d="M-39 14Q-16 20 4 18" stroke="#fff2cd" stroke-width="1.6"/></g>` : `<circle r="${Math.max(.2,r*.24)}" fill="#171322"/>`}</g></g>`;
      }
      if (e.kind==='disintegrateHit') {
        let lastPulse='';
        if (e.fromC!=null) {
          const dx=X(e.fromC)-x, dy=Y(e.fromR)-3-y, distance=Math.hypot(dx,dy);
          const muzzle=distance ? Math.max(0,1-24/distance) : 0;
          const line=`M${dx*muzzle} ${dy*muzzle}L0 0`;
          const width = disintegrationWidth(e.strength,e.upgraded);
          lastPulse=`<g class="disintegration-flash" opacity="${(1-t)**2}" stroke-linecap="round"><path d="${line}" stroke="#6970a7" stroke-width="${width}"/><path d="${line}" stroke="#affde6" stroke-width="${width*.65}"/></g>`;
        }
        return `<g ${at} fill="#a1f7e3" stroke="#686493">${lastPulse}${[20,125,235].map(a=>`<rect transform="rotate(${a}) translate(${6+13*t} 0) rotate(25)" width="${2+e.strength}" height="4"/>`).join('')}</g>`;
      }
      if (e.kind === 'snowContact') return `<g ${at} color="#ecffff" stroke="#76b3c6"><use href="#art-snowflake" transform="scale(${.6+.55*t})"/></g>`;
      if (e.kind === 'frostfireSpray') return frostfireSpray(e,t);
      if (e.kind === 'snowBurst') return snowBurstArt(e,t);
      if (e.kind === 'cometBurst') return magneticBurst(e,t);
      if (e.kind === 'laser') {
        const tower = state.buildings.find(b => b.id === e.tower);
        const mount = A.mountFor(tower, 'pierce'), gun = tower?.secondary?.kind === 'pierce' ? tower.secondary : tower;
        return `<g clip-path="url(#field-bounds)"><g class="laser-beam" transform="translate(${x + mount.x} ${y + mount.y})" opacity="${1 - t}">${A.laser(e.angle, e.length * S, t, e.hitDistances.map(d => d * S), gun ? visibleFlash(gun) : 0, e.upgraded, mount.scale, e.weapon, reducedMotion.matches)}</g></g>`;
      }
      if (e.kind === 'plasmaArc') {
        const from = e.fromEnemy, to = e.toEnemy;
        return A.plasmaArc(X(from.x), Y(from.y) - (from.dead ? e.lift : lift(from)),
          X(to.x), Y(to.y) - (to.dead ? e.toLift : lift(to)), e.duration - life, e.hop, reducedMotion.matches, e.weapon);
      }
      if (e.kind === 'webHit') {
        return `<g class="web-hit" ${at} fill="none" stroke="#fff8ff" stroke-width="2.4" stroke-linecap="round">
          ${[30,90,150,210,270,330].map(a => `<path transform="rotate(${a})" d="M${26+t*6} 0h${6*(1-t)}"/>`).join('')}</g>`;
      }
      if (e.kind === 'stoneImpact') return `<g ${at}>${A.stoneImpact(t, e.upgraded)}</g>`;
      if (e.kind === 'scarabRam') {
        return `<g class="scarab-ram" ${at}><g transform="rotate(${e.facing})" fill="none" stroke-linecap="round">
          <path d="M-1-8q-5 8 0 16" stroke="#ffe2a1" stroke-width="${4-2*t}"/>
          <g class="fx-accent" stroke="#ba8757" stroke-width="2.5">${[-55,0,55].map(a => `<path transform="rotate(${a})" d="M${-6-12*t} 0h-5"/>`).join('')}</g></g></g>`;
      }
      if (e.kind === 'crush') {
        return `<g class="boss-crush" ${at}>
          <ellipse rx="${7 + t * 21}" ry="${3 + t * 13}" fill="none" stroke="#dfc7a3" stroke-width="${4 - 3*t}"/>
          ${[0,61,125,186,248,304].map(a=>`<path transform="rotate(${a}) translate(${4+t*20} 0) rotate(${t*64})" d="m-3-2 4-2 3 3-2 3-4-1Z" fill="#8e7b64" stroke="#dbccac" stroke-width="1.3"/>`).join('')}</g>`;
      }
      if (e.kind === 'spikeHit') {
        return `<g class="spike-hit" ${at} fill="none" stroke-linecap="round"><circle r="${3 + t * 12}" stroke="#fff3b4" stroke-width="2.5"/>${[15,135,255].map(a => `<path transform="rotate(${a})" d="M${6 + 8 * t} 0h6" stroke="#866744" stroke-width="3"/>`).join('')}</g>`;
      }
      if (e.kind === 'impactPulse') {
        const edge = e.radius * S;
        const travel = reducedMotion.matches ? 1 : 1 - (1 - Math.min(1,t / .66)) ** 2;
        const front = 16 + (edge - 16) * travel;
        const echo = reducedMotion.matches ? edge - 8 : Math.max(13,front - 8 - 9*Math.sin(Math.PI*travel));
        return `<g clip-path="url(#field-bounds)"><g class="impact-pulse" transform="translate(${x} ${y})" fill="none" opacity="${Math.min(1,(1-t)*2.7)}">
          <circle class="impact-ring" r="${front}" stroke="#366d6c" stroke-width="${5-2*travel}" opacity=".84"/>
          ${e.upgraded ? `<circle r="${Math.max(1,front-5)}" stroke="#f7d98d" stroke-width="3" stroke-dasharray="14 7 3 7"/>` : ''}
          <circle r="${front-1}" stroke="#d7ffdb" stroke-width="2.5"/>
          <circle r="${echo}" stroke="#77d2bd" stroke-width="${4-2*travel}" opacity="${.85-.45*travel}"/>
          <g class="fx-accent" stroke-linecap="round" stroke="#fff1b6" opacity="${.85*(1-t)}">
            ${[0,45,90,135,180,225,270,315].map(a=>`<path transform="rotate(${a})" d="M${front-9} 0h6" stroke-width="2.5"/>`).join('')}
          </g></g></g>`;
      }
      if (e.kind === 'spark' && e.weapon === 'iceCannon') {
        if (e.upgraded) return `<g class="ice-impact ice-trident" ${at}><g transform="rotate(${e.angle+90})">
          ${[-36,0,36].map(a=>`<use href="#art-iceSpear" transform="rotate(${a}) translate(0 ${-2-13*t}) scale(${1.12-.24*t})"/>`).join('')}
          <path d="M-7 3Q0 10 7 3" fill="none" stroke="#f0ffff" stroke-width="2"/></g></g>`;
        return `<g class="ice-impact" ${at}>${[0,72,144,216,288].map(a => `<path transform="rotate(${a}) translate(0 ${-4 - t * 11})" d="m0-5 2 4-2 4-2-4Z" fill="#dbffff" stroke="#69aec4"/>`).join('')}</g>`;
      }
      if (e.kind === 'spark' && e.weapon === 'tacticalAir' && e.upgraded) return `<g class="airburst-glint" ${at}><g transform="rotate(${e.angle})">
        <path d="M-12-3-4-2 0-10 2-3 12-7 6 0 14 4 3 4-2 10-3 3Z" transform="scale(${.8+.45*t})" fill="#fff2ac" stroke="#c77b43" stroke-width="1.4"/>
        <path d="M6-5l6-4m-3 10 7 2" transform="translate(${8*t} 0)" fill="none" stroke="#ffc770" stroke-width="2"/></g></g>`;
      if (e.kind === 'spark' && e.weapon === 'fireCannon') return `<g class="ember-impact" ${at}><use href="#art-firePatch" transform="translate(0 ${4 - 7 * t}) scale(${.68 - t * .32})"/></g>`;
      if (e.kind === 'spark' || e.kind === 'flare') return `<g class="${e.kind}-effect" ${at}><g transform="rotate(${e.angle ?? 0})">${A.impactBurst(e.kind, t)}</g></g>`;
      if (e.kind === 'hatch') return `<g class="hatch-effect" ${at} fill="#ffdb58" stroke="#916122" stroke-width="2">
        <path transform="translate(${-t * 9} ${-t * 7}) rotate(${-t * 25})" d="M-9 1q-1-15 7-17 8 0 10 12L4-6 0-1-4-5Z"/>
        <path transform="translate(${t * 9} ${t * 6}) rotate(${t * 20})" d="m-10 3 6-3 4 4 4-6 6 3C9 17-8 17-10 3Z"/></g>`;
      if (e.kind === 'split') {
        const start = G.enemyArtScale('splitter', e.maxHp);
        const plates = e.offspring.map((child, i) => {
          const dx = (child.x - e.x) * S * .32 * t;
          const dy = (child.y - e.y) * S * .32 * t - 12 * Math.sin(Math.PI*t);
          return A.splitPlateAt(i, dx, dy, start * (1 - .6*t), e.facing + (i%2 ? -80 : 65)*t);
        });
        return `<g class="split-effect" ${at}><ellipse rx="${11+24*t}" ry="${6+11*t}" fill="none" stroke="#ffdf93" stroke-width="${3*(1-t)}"/>${plates.join('')}</g>`;
      }
      if (e.kind === 'leap') return `<path class="leap-effect" d="M${x} ${y}Q${(x + X(e.toX)) / 2} ${Math.min(y, Y(e.toY)) - 75} ${X(e.toX)} ${Y(e.toY)}" fill="none" stroke="#688a38" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="2 8" opacity="${(1 - t) * .75}"/>`;
      if (e.kind === 'blast') {
        const front = (.18 + .82 * (1 - (1 - t) ** 2)) * e.radius * S;
        if (e.upgraded && e.weapon === 'tacticalGround') return `<g class="blast-effect shell-impact" ${at} fill="none">
          <circle r="${front}" stroke="#e9af6a" stroke-width="3.3" stroke-dasharray="12 4"/>
          <circle r="${front*.73}" stroke="#fff0a7" stroke-width="2"/>
          ${[30,150,270].map(a=>`<path transform="rotate(${a}) scale(${front})" d="m.08 -.08 .21 -.12 .1 .06 .32 -.22 -.18 .25 -.18 .02 -.18 .14Z" fill="#f5a25b" stroke="#b97b54" stroke-width=".035"/>`).join('')}</g>`;
        return `<g class="blast-effect" ${at}>${e.upgraded ? `<circle r="${front * .78}" fill="none" stroke="#fbbf68" stroke-width="${7 * (1 - t)}"/>` : ''}<circle r="${front}" fill="#f3a74b" fill-opacity=".1" stroke="#af7340" stroke-width="2.5"/>
          <circle r="${front - 4}" fill="none" stroke="#ffe5a8" stroke-width="2"/>
          ${[15,78,142,204,274,325].map(a => `<g class="fx-accent" transform="rotate(${a}) translate(${front - 8} 0) rotate(${t * 32}) scale(${.6 + .5 * Math.sin(Math.PI * t)})"><path d="M-8 1q-2-5 2-6 2-5 7-2 6-1 6 4 5 4 0 6-5 2-8 0-6 2-7-2Z" fill="#d3b18c" stroke="#a17e57" stroke-width="1.1"/></g>`).join('')}
          <path transform="scale(${1 - t})" d="m0-20 6 12 10-4-4 11 10 4-13 3 1 11-10-7-9 6 1-12-10-4 12-4-2-10Z" fill="#ffd170" stroke="#ce7437" stroke-width="2"/></g>`;
      }
      if (e.kind === 'molecular' && e.weapon === 'cryoPlasma' && e.upgraded) {
        const close=1-Math.min(1,t/.34);
        return `<g class="cryo-impact crystal-lock" ${at}>
          <use href="#art-hexCage" transform="scale(${.76+.24*(1-close)})"/>
          ${[0,120,240].map(a=>`<use href="#art-breakIce" transform="rotate(${a}) translate(0 ${-11-12*close}) rotate(180) scale(.62)"/>`).join('')}</g>`;
      }
      if (e.kind === 'molecular' && e.weapon === 'cryoPlasma') return `<g class="cryo-impact" ${at}>
        <circle r="${9+24*t}" stroke="#77c4e2" stroke-width="2.2" fill="#defaff" fill-opacity=".18"/>
        ${[12,76,152,228,305].map(a=>`<path d="m0-8 3 7-3 6-3-5Z" transform="rotate(${a}) translate(0 ${-8-22*t})" fill="#d9ffff" stroke="#5ba9d2"/>`).join('')}</g>`;
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
          ${['wall','pierce','sonicCannon','meteorTower','snowCannon','moltenMortar'].includes(e.shotKind) ? '' : `<g class="ricochet" transform="translate(${bx} ${by}) scale(.65)">${A.shot(e.shotKind, 0, 0, Math.atan2(e.vy, e.vx) * 180 / Math.PI, 0, e.upgraded, e.weapon)}</g>`}
        </g>`;
      }
      if (e.kind === 'home') return `<g class="home-damage" transform="translate(${castleX()} ${castleY() - 49})">${A.brokenHeart(t)}</g>`;
      const color = e.kind === 'chip' ? '#aa7d51' : '#75a450';
      return `<g opacity="${1 - t}">${[0, 1, 2, 3, 4, 5].map(i => `<circle cx="${x + Math.cos(i * Math.PI / 3) * (10 + t * 27)}" cy="${y + Math.sin(i * Math.PI / 3) * (10 + t * 27)}" r="${4 * (1 - t) + 1}" fill="${color}"/>`).join('')}</g>`;
    }).join('');
  }
  function updateUI(force = false) {
    const advancing = G.isAdvancing(state);
    const signature = [state.level, state.wave, state.phase, state.money, state.hearts, state.undo.length, state.upgradeItems, state.fusionHammers, selected].join(':');
    if (!force && signature === uiSignature) return;
    uiSignature = signature;
    $('upgrade-count').textContent = state.upgradeItems;
    $('hammer-count').textContent = state.fusionHammers;
    $('crystals').title = state.upgradeItems ? '升級水晶' : '水晶不足';
    $('hammers').title = state.fusionHammers ? '融合槌' : '合成槌不足';
    const won = state.phase === 'cleared' || state.phase === 'won';
    const completedCount = state.level + Number(won);
    $('crystals').hidden = completedCount < 1;
    $('hammers').hidden = completedCount < 3;
    $('crystals').setAttribute('aria-label', `升級水晶 ${state.upgradeItems} 顆`);
    $('hammers').setAttribute('aria-label', `融合槌 ${state.fusionHammers} 把`);
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
    $('undo').disabled = state.phase !== 'planning' || state.undo.length === 0;
    const [icon, caption, hint] = resetActions[state.phase];
    $('reset').innerHTML = A.icon(icon) + caption;
    $('reset').title = hint;
    $('reset').hidden = won;
    $('replay').hidden = !won || state.level === G.BONUS_LEVEL;
    if (won) $('replay').title = `重玩第 ${state.level+1} 關`;
    const next = won && state.level < G.BONUS_LEVEL;
    const label = advancing ? '暫停' : state.phase === 'paused' ? '繼續' : next ? '下一關' : won || state.phase === 'lost' ? '此關再玩一次' : '開始';
    $('action').innerHTML = next ? '下一關 <span aria-hidden="true">→</span>' : advancing || state.phase === 'paused' ? A.icon(advancing ? 'pause' : 'play') : label;
    $('action').classList.toggle('next-stage', next);
    $('action').classList.toggle('long-label', label === '此關再玩一次');
    $('action').setAttribute('aria-label', label);
    $('action').classList.toggle('pause-state', advancing);
  }
  function victoryLoot(gold) {
    const level = clearedLevel();
    const prize = (type, icon, label, count) => `<span class="loot-${type}">${A.icon(icon)}<span>${label} <b>+${count}</b></span></span>`;
    return prize('coin', 'coin', '金幣', gold)
      + prize('crystal', 'crystal', level === 1 ? '解鎖升級水晶' : '升級水晶', 1)
      + (G.hammerLevels.includes(level) ? prize('hammer', 'hammer', level === 3 ? '解鎖融合槌' : '融合槌', 1) : '');
  }
  const clearedLevel = () => state.level + Number(state.phase === 'won' || state.phase === 'cleared');
  function outcome() {
    closeEntranceGuide();
    resultAfterHeart = false;
    closeMenu(); hideInfo();
    const won = state.phase !== 'lost';
    const bonus = state.level === G.BONUS_LEVEL;
    $('win-crystal').hidden = !won;
    if (won) $('win-crystal').innerHTML = victoryLoot(state.lastReward);
    $('result-art').innerHTML = A.icon(won ? 'trophy' : 'leaf');
    $('result-title').textContent = won ? (bonus ? '隱藏關勝利！' : `第 ${clearedLevel()} 關勝利！`) : '再試一次';
    const invite = $('bonus-invite');
    invite.hidden = !(state.phase === 'won' && !bonus);
    invite.textContent = invite.hidden ? '' : '隱藏關「四面守園」已開啟，守住中央的城堡！';
    $('result-hearts').hidden = state.phase === 'cleared' || state.phase === 'planning';
    if (!$('result-hearts').hidden) $('result-hearts').innerHTML = Array.from({ length: G.LEVELS[state.level].hearts + Number(state.castleUpgraded) }, (_, i) => A.icon('heart', i < state.hearts ? '' : 'empty')).join('');
    $('castle-hits').hidden = won || !state.homeHits.length;
    $('castle-hit-list').innerHTML = won ? '' : state.homeHits.map((kind, i) =>
      `<li><span class="hit-number" aria-hidden="true">${i+1}</span>${A.badge(kind)}<span>${G.ENEMIES[kind].name}</span></li>`).join('');
    $('result-primary').textContent = won ? '繼續' : '重試這關';
    if (won) $('result').setAttribute('aria-describedby', invite.hidden ? 'win-crystal' : 'win-crystal bonus-invite');
    else $('result').removeAttribute('aria-describedby');
    if (!$('result').open) $('result').showModal();
  }
  function dismissOutcome() {
    if (state.phase !== 'lost') {
      seenRewardLevel = clearedLevel();
      save();
    }
    $('result').close();
  }
  function sync(force = false, settling = false) {
    if (lastLevel !== state.level) {
      enemyHealth.checked = state.level === 0;
      hideInfo(); hover = null; lastLevel = state.level; ground();
    }
    if (force || lastRevision !== state.revision || lastPhase !== state.phase) drawRoutes();
    if (force || lastRevision !== state.revision) {
      $('home-layer').innerHTML = `<g class="garden-home" transform="translate(${castleX()} ${castleY()}) scale(${castleScale()})">${A.castle(state.castleUpgraded)}</g>${state.castleUpgraded ? `<g transform="translate(${castleX()} ${castleY()})">${buildingBadges(true,false)}</g>` : ''}`;
      selection(); lastRevision = state.revision;
      const solid = G.terrain(state.level);
      for (const cell of $('hit-layer').querySelectorAll('[data-c]')) {
        const b = G.at(state, +cell.dataset.c, +cell.dataset.r);
        const home = G.isHome(state.level, +cell.dataset.c, +cell.dataset.r);
        cell.classList.toggle('upgradable', home ? !state.castleUpgraded : !!b && !b.upgraded);
        cell.setAttribute('aria-label', `${+cell.dataset.r + 1} 排 ${+cell.dataset.c + 1} 格，${b ? G.buildingName(b) : home ? G.toolFor('castle', state.castleUpgraded).name : solid.has(G.key(+cell.dataset.c, +cell.dataset.r)) ? '地形' : '空地'}`);
      }
      if (infoAnchor?.classList.contains('cell-hit')) showCellInfo(infoAnchor);
    }
    if (lastPhase !== state.phase) {
      closeMenu();
      const finished = lastPhase === 'running' && (state.phase === 'cleared' || state.phase === 'won');
      const ended = state.phase === 'won' || state.phase === 'lost';
      resultAfterHeart = ended && lastPhase === 'running' && state.effects.some(e => e.kind === 'home');
      finishAge = finished || resultAfterHeart ? 0 : null;
      lastPhase = state.phase;
      if (state.phase !== 'paused') save();
      const hasReward = state.phase === 'cleared' || state.phase === 'won' || (state.phase === 'planning' && state.lastReward > 0);
      selection();
      if (!resultAfterHeart && (state.phase === 'lost' || (hasReward && seenRewardLevel !== clearedLevel()))) outcome();
    }
    updateUI(force);
    if (force || settling || state.time !== lastWorldTime) { renderWorld(); lastWorldTime = state.time; }
    scheduleFrame();
  }
  function loadLevel(level, replacement = null) {
    if (level === G.BONUS_LEVEL && !state.bonusUnlocked) return;
    finishMove();
    closeMenu(); hideInfo();
    if ($('lesson').open) $('lesson').close();
    if ($('result').open) $('result').close();
    const next = replacement || G.createState(level);
    next.bonusUnlocked ||= state.bonusUnlocked;
    seenRewardLevel = null;
    state = next; selected = 'pea'; hover = null; accumulator = 0;
    if (lastLevel === state.level) drawEntrances();
    $('status').textContent = level === G.BONUS_LEVEL ? '守住中央城堡，小蟲會從四面進攻！' : '';
    lastPhase = ''; lastRevision = -1; uiSignature = ''; sync(true);
  }
  function closeMenu() {
    if (infoAnchor && $('building-menu').contains(infoAnchor)) hideInfo();
    menuCell = null;
    $('building-menu').hidden = true;
  }
  function finishMove() {
    if (!moving) return;
    moving = null;
    $('status').textContent = '';
    selection();
  }
  function positionMenu() {
    if (!menuCell) return;
    const anchor = cellAt(menuCell.c, menuCell.r).getBoundingClientRect();
    const menu = $('building-menu'), box = menu.getBoundingClientRect();
    const zoom = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    const right = anchor.right + 6, leftSide = anchor.left - box.width - 6;
    const side = right + box.width <= innerWidth - 6 ? right : leftSide >= 6 ? leftSide : null;
    const left = side ?? Math.max(6, Math.min(innerWidth - box.width - 6, anchor.left + (anchor.width - box.width) / 2));
    const top = side !== null ? Math.min(innerHeight - box.height - 6, anchor.top + (anchor.height - box.height) / 2)
      : anchor.top > box.height + 12 ? anchor.top - box.height - 6 : Math.min(innerHeight - box.height - 6, anchor.bottom + 6);
    menu.style.left = left / zoom + 'px'; menu.style.top = Math.max(6, top) / zoom + 'px';
  }
  function showFusionOptions(building) {
    const panel = $('fusion-options'), list = $('fusion-recipes');
    $('fusion-locked').hidden = !building || state.level >= 3 || building.kind === 'wall' || !!building.fusionKind;
    panel.hidden = !building || state.level < 3 || building.kind === 'wall' || !!building.fusionKind;
    list.replaceChildren();
    if (panel.hidden) return;
    $('fusion-label').textContent = state.fusionHammers ? '每次合成用 1 把槌子' : '合成槌不足';
    for (const [material, tool] of Object.entries(G.TOOLS)) {
      const recipe = G.fusionRecipe(building.kind, material);
      if (!recipe) continue;
      const error = state.fusionHammers ? G.canBuild(state, material, building.c, building.r) : '合成槌不足';
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.fuse = material;
      setAvailability(button, error);
      const vortex = G.toolFor(G.primaryWeapon(recipe)).vortex;
      const result = vortex ? recipe.name + (vortex === 'fire' ? '（火龍捲）' : '（冰龍捲）') : recipe.name;
      const weapons = [G.primaryWeapon(recipe), G.secondaryWeapon(recipe)].filter(Boolean);
      const targets = ['ground','air'].filter(t => weapons.some(w => G.toolFor(w).targets.includes(t)));
      const targetLabel = targets.map(t => t === 'ground' ? '地' : '空').join('／');
      button.title = error || `${result}（${targetLabel}）`;
      const pair = G.TOOLS[building.kind].name + '＋' + tool.name;
      button.setAttribute('aria-label', `${pair}合成${result}，目標${targetLabel}，${tool.cost} 金幣、1 把融合槌${error ? '，' + error : ''}`);
      button.innerHTML = `${recipeEquation(building.kind,material,recipe)}<span class="recipe-result">${result}<small class="recipe-target">${targetLabel}</small></span><span class="recipe-cost">${A.icon('coin')}${tool.cost}</span>`;
      list.append(button);
    }
    list.scrollTop = 0;
  }
  function openMenu(c, r) {
    const b = G.at(state, c, r), home = G.isHome(state.level, c, r);
    if (!b && !home) return;
    menuCell = { c, r }; hideInfo();
    const upgraded = home ? state.castleUpgraded : b.upgraded;
    $('building-name').textContent = home ? G.toolFor('castle', upgraded).name : G.buildingName(b);
    if (b?.fusionKind) $('building-name').insertAdjacentHTML('afterbegin', fusionPortrait(b));
    const grade = $('edit-grade');
    grade.innerHTML = A.icon('crystal') + (upgraded ? '取消升級' : '升級');
    grade.hidden = false;
    setAvailability(grade, !upgraded && !state.upgradeItems ? '水晶不足' : '');
    grade.title = grade.dataset.unavailable || (upgraded ? '退回 1 顆升級水晶' : '使用 1 顆升級水晶');
    $('edit-remove').hidden = $('edit-move').hidden = home;
    showFusionOptions(b);
    $('building-menu').hidden = false;
    positionMenu();
    const focusTarget = !$('fusion-options').hidden || grade.dataset.unavailable ? $('building-menu') : grade;
    focusTarget.focus({ preventScroll: true });
  }
  function previewGrade() {
    if (!menuCell || $('edit-grade').dataset.unavailable) return;
    const { c, r } = menuCell, b = G.at(state, c, r);
    if (b?.upgraded || (!b && state.castleUpgraded)) return;
    showInfo(b?.kind || 'castle', $('edit-grade'), false, b, true);
  }
  function editBuilding(remove) {
    if (!menuCell) return;
    const { c, r } = menuCell, b = G.at(state, c, r);
    const upgraded = b ? b.upgraded : state.castleUpgraded;
    const result = remove ? G.remove(state, c, r) : upgraded ? G.downgrade(state, c, r) : G.upgrade(state, c, r);
    if (!result.ok) { feedback(result.error, c, r); return; }
    closeMenu(); hideInfo(); save(); sync(true);
    $('status').textContent = remove ? '已拆除，材料已退回' : upgraded ? '已取消升級，退回一顆升級水晶' : '建築已升級';
    if (remove) cellAt(c, r).focus(); else openMenu(c, r);
  }
  function interact(c, r) {
    const b = G.at(state, c, r), home = G.isHome(state.level, c, r);
    if (state.phase !== 'planning') { showCellInfo(cellAt(c, r)); return; }
    if (moving) {
      if (moving.c === c && moving.r === r) { finishMove(); return; }
      const result = G.moveBuilding(state, moving.c, moving.r, c, r);
      if (!result.ok) { feedback(result.error, c, r); return; }
      const name = G.buildingName(moving);
      finishMove(); save(); sync(true);
      $('status').textContent = name + '已移動';
      return;
    }
    if (home || b) {
      openMenu(c, r); return;
    }
    closeMenu(); hideInfo();
    if (!selected) return;
    const result = G.build(state, selected, c, r);
    if (!result.ok) {
      feedback(result.error, c, r);
    } else {
      $('status').textContent = '';
      save();
    }
    sync(true);
  }
  $('tools').addEventListener('click', event => {
    const tool = event.target.closest('[data-tool]'); if (!tool) return;
    showInfo(tool.dataset.tool, tool);
    if (state.phase !== 'planning') return;
    finishMove(); closeMenu(); selected = tool.dataset.tool; hover = null; selection(); updateUI(true);
  });
  for (const button of $('tools').querySelectorAll('[data-tool]')) {
    button.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') showInfo(button.dataset.tool, button); });
    button.addEventListener('pointerleave', deferHideInfo);
    button.addEventListener('focus', () => showInfo(button.dataset.tool, button));
    button.addEventListener('blur', deferHideInfo);
  }
  $('tower-info').addEventListener('pointerenter', () => clearTimeout(infoTimer));
  $('tower-info').addEventListener('pointerleave', deferHideInfo);
  function setAvailability(button, reason) {
    button.setAttribute('aria-disabled', String(!!reason));
    if (reason) button.dataset.unavailable = reason;
    else delete button.dataset.unavailable;
  }
  function showShortage(button) {
    hideInfo();
    infoAnchor = button;
    const info = $('tower-info');
    info.dataset.kind = 'shortage';
    info.textContent = button.dataset.unavailable;
    positionInfo(button);
  }
  const menu = $('building-menu');
  for (const type of ['pointerover', 'focusin']) menu.addEventListener(type, event => {
    const button = event.target.closest('[data-unavailable]');
    if (button && button !== infoAnchor) showShortage(button);
  });
  for (const type of ['pointerout', 'focusout']) menu.addEventListener(type, event => {
    const button = event.target.closest('[data-unavailable]');
    if (button && !button.contains(event.relatedTarget)) deferHideInfo();
  });
  menu.addEventListener('click', event => {
    const button = event.target.closest('[data-unavailable]');
    if (button) { event.preventDefault(); event.stopPropagation(); showShortage(button); }
  }, true);
  document.addEventListener('click', event => {
    if (menuCell && !menu.contains(event.target)) {
      event.preventDefault(); event.stopPropagation(); closeMenu(); hideInfo();
    }
  }, true);
  document.addEventListener('pointerdown', event => {
    if (menuCell && !menu.contains(event.target)) { event.preventDefault(); return; }
    if (!event.target.closest('#tower-info, [data-tool]')) hideInfo();
    if (settings.open && !settings.contains(event.target)) settings.open = false;
  });
  window.addEventListener('resize', repositionInfo);
  document.addEventListener('scroll', repositionInfo, true);
  document.addEventListener('focusin', event => {
    if (menuCell && !event.target.closest('#building-menu, #hit-layer')) closeMenu();
  });
  window.addEventListener('resize', positionMenu);
  document.addEventListener('scroll', positionMenu, true);
  $('fusion-recipes').addEventListener('click', event => {
    const button = event.target.closest('[data-fuse]');
    if (!button || button.dataset.unavailable || !menuCell || state.phase !== 'planning') return;
    const { c, r } = menuCell, b = G.at(state, c, r);
    if (!b || b.fusionKind || !G.fusionRecipe(b.kind, button.dataset.fuse)) return;
    const result = G.build(state, button.dataset.fuse, c, r);
    if (!result.ok) { openMenu(c, r); feedback(result.error, c, r); return; }
    closeMenu(); hideInfo(); save(); sync(true);
    $('status').textContent = '已融合成' + G.buildingName(b);
    cellAt(c, r).focus({ preventScroll: true });
  });
  $('edit-close').addEventListener('click', () => {
    if (!menuCell) return;
    const cell = cellAt(menuCell.c, menuCell.r);
    closeMenu();
    cell.focus({preventScroll:true});
    hideInfo();
  });
  $('edit-grade').addEventListener('click', () => editBuilding(false));
  $('edit-move').addEventListener('click', () => {
    if (!menuCell || state.phase !== 'planning') return;
    const { c, r } = menuCell;
    moving = G.at(state, c, r);
    if (!moving) return;
    closeMenu(); hideInfo();
    selected = null;
    cellAt(c, r).focus({ preventScroll: true });
    $('status').textContent = movePrompt;
    selection(); updateUI(true);
  });
  $('edit-remove').addEventListener('click', () => editBuilding(true));
  $('edit-grade').addEventListener('pointerenter', previewGrade);
  $('edit-grade').addEventListener('focus', event => { if (event.target.matches(':focus-visible')) previewGrade(); });
  $('edit-grade').addEventListener('keydown', event => { if (event.key === 'Tab') hideInfo(); });
  $('edit-grade').addEventListener('pointerleave', deferHideInfo);
  $('undo').addEventListener('click', () => { finishMove(); if (G.undo(state)) { save(); sync(true); } });
  $('reset').addEventListener('click', () => {
    finishMove();
    if (G.isAdvancing(state)) { G.togglePause(state); sync(true); }
    else if (state.phase === 'paused' || state.phase === 'lost') loadLevel(state.level, G.retry(state));
    else if (state.phase === 'planning') {
      // Reorganise the current budget without erasing earned campaign funds.
      for (const b of [...state.buildings]) G.remove(state, b.c, b.r);
      const goal = G.LEVELS[state.level].goal;
      if (state.castleUpgraded) G.remove(state, goal.c, goal.r);
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
    finishMove(); hideInfo();
    hover = null; $('status').textContent = ''; selection();
    if (state.phase === 'planning') { save(); G.startWave(state); }
    else if (state.phase === 'running' || state.phase === 'paused') G.togglePause(state);
    else if (state.phase === 'lost') { loadLevel(state.level, G.retry(state)); return; }
    else { advanceAfterVictory(); return; }
    sync(true);
  });
  $('hit-layer').addEventListener('click', event => {
    const cell = event.target.closest('[data-c]'); if (!cell) return;
    interact(+cell.dataset.c, +cell.dataset.r);
  });
  const entryLayer = $('entrance-layer');
  for (const type of ['pointerover','focusin']) entryLayer.addEventListener(type, event => {
    const marker = event.target.closest('.entrance');
    if (!marker || (type === 'pointerover' && (event.pointerType === 'touch' || marker.contains(event.relatedTarget)))) return;
    showEntranceInfo(marker);
  });
  entryLayer.addEventListener('pointerout', event => {
    if (!event.target.closest('.entrance')?.contains(event.relatedTarget)) deferHideInfo();
  });
  entryLayer.addEventListener('focusout', deferHideInfo);
  entryLayer.addEventListener('click', event => openEntranceGuide(event.target.closest('.entrance')));
  entryLayer.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); openEntranceGuide(event.target.closest('.entrance'));
    }
  });
  $('entry-guide-close').addEventListener('click', closeEntranceGuide);
  entryGuide.addEventListener('cancel', event => { event.preventDefault(); closeEntranceGuide(); });
  $('entry-prev').addEventListener('click', () => showGuidePage(guidePage - 1));
  $('entry-next').addEventListener('click', () => showGuidePage(guidePage + 1));
  entryGuide.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); showGuidePage(guidePage + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  $('hit-layer').addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || menuCell) return;
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
    if (entryGuide.open) return;
    if (event.key === 'Escape' && settings.open && !$('result').open) {
      settings.open = false; settings.querySelector('summary').focus(); return;
    }
    if (event.key === 'Escape' && !$('result').open && !$('lesson').open) {
      if (menuCell) cellAt(menuCell.c, menuCell.r).focus();
      finishMove(); closeMenu(); hideInfo(); selected = null; hover = null; selection(); updateUI(true); }
  });
  function replayVictory() {
    const original = G.replayVictory(state);
    if (original) loadLevel(original.level, original);
  }
  $('replay').addEventListener('click', replayVictory);
  function advanceAfterVictory() {
    if (state.phase === 'cleared') {
      const nextLevel = state.level + 1;
      if (G.advanceLevel(state)) {
        state.lastReward = 0;
        state.replayCheckpoint = null;
        sync(true);
        if (nextLevel === 1 || nextLevel === 3) openLesson(nextLevel);
      }
    }
    else if (state.phase === 'lost') loadLevel(state.level, G.retry(state));
    else if (state.level === G.BONUS_LEVEL - 1) {
      const bonus = G.createState(G.BONUS_LEVEL);
      if (state.castleUpgraded) { const goal = G.LEVELS[G.BONUS_LEVEL].goal; G.upgrade(bonus, goal.c, goal.r); bonus.undo = []; }
      loadLevel(G.BONUS_LEVEL, bonus);
    } else replayVictory();
  }
  $('result-primary').addEventListener('click', () => {
    if (state.phase === 'lost') loadLevel(state.level, G.retry(state));
    else {
      dismissOutcome();
      $('action').focus();
    }
  });
  function openLesson(level) {
    const fusion = level === 3;
    const step = (picture, caption) => `<figure><div class="lesson-picture">${picture}</div><figcaption>${caption}</figcaption></figure>`;
    const tile = (art, label = '') => `<svg class="lesson-tile" viewBox="-42 -45 84 80" aria-hidden="true"><rect x="-40" y="-42" width="80" height="74" rx="8" fill="#d8e5b1" stroke="#9cae76"/>${art}</svg>${label}`;
    const tower = tile(A.tower('pea'));
    $('lesson-title').textContent = fusion ? '用融合槌合成新塔' : '用水晶升級建築';
    const steps = fusion ? [
      step(tower, '點場上砲塔'),
      step(recipeEquation('pea','cannon',G.fusionRecipe('pea','cannon')), '點選配方'),
      step(tile(A.fusionResult(G.fusionRecipe('pea', 'cannon'))), '戰術砲臺')
    ] : [
      step(tower, '點選建築'),
      step('<span class="lesson-grade">' + A.icon('crystal') + '升級</span>', '按下升級'),
      step(tile(A.tower('pea', -25, 0, 0, true)), '雙管砲塔')
    ];
    $('lesson-steps').innerHTML = steps.join('<span class="lesson-arrow" aria-hidden="true">→</span>');
    $('lesson-cost').textContent = fusion ? '花 1 把融合槌和新塔的金幣。' : '每次用 1 顆水晶，取消升級會退回。';
    $('result').close(); $('lesson').showModal();
  }
  function finishLesson() {
    seenRewardLevel = clearedLevel(); save();
    $('lesson').close(); $('action').focus();
  }
  $('lesson-close').addEventListener('click', finishLesson);
  $('lesson').addEventListener('cancel', event => { event.preventDefault(); finishLesson(); });

  $('result').addEventListener('cancel', event => { event.preventDefault(); dismissOutcome(); });
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
      while (accumulator >= 1 / 60) { G.step(state, 1 / 60, true); accumulator -= 1 / 60; }
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
