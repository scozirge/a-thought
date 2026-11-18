(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Garden = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const COLS = 12, ROWS = 8;
  const BATTLE_SPEED = 1.5;
  const GOAL = { c: 0, r: 3 };
  const TOOLS = {
    pea: { name: '一般砲塔', cost: 6, range: 3.1, damage: 1, rate: 1.5, effect: '單體傷害', hp: 5, color: '#4b8058' },
    cannon: { name: '大砲範圍塔', cost: 9, range: 2.8, damage: 2, rate: 1.2, radius: 1.25, effect: '範圍傷害', hp: 5, color: '#b68a43' },
    frost: { name: '冰凍塔', cost: 8, range: 2.65, damage: 1, rate: 0.9, effect: '冰凍緩速', hp: 5, color: '#619aa9' },
    flame: { name: '火焰塔', cost: 10, range: 2.8, damage: 1, rate: 0.6, burnDamage: 1, burnSeconds: 3, effect: '地板燃燒 3 秒', hp: 5, color: '#d37643' },
    pierce: { name: '直線穿透塔', cost: 10, range: 4.2, damage: 1, rate: 1.5, effect: '穿透傷害', hp: 5, color: '#4a8f88' },
    push: { name: '擊退塔', cost: 9, range: 3, damage: 1, rate: 0.5, knockback: 3, effect: '擊退 3 格', hp: 5, color: '#7882af' },
    molecular: { name: '分子砲', cost: 14, range: 3.6, damage: 6, rate: 0.4, effect: '單體高傷害', hp: 5, color: '#a16cab' },
    wall: { name: '小石牆', cost: 1, hp: 4, color: '#a48a66' }
  };
  const ENEMIES = {
    bug: { name: '小蟲', hp: 1, speed: 0.82, color: '#bd7657' },
    shield: { name: '上盾蟲', hp: 3, speed: 0.68, shield: 'up', color: '#d3a15d' },
    shield_down: { name: '下盾蟲', hp: 3, speed: 0.68, shield: 'down', color: '#78ad9b' },
    hopper: { name: '跳蟲', hp: 3, speed: 0.85, color: '#8caa55' },
    mother: { name: '母蟲', hp: 10, speed: 0.30, color: '#c58fa9' },
    flyer: { name: '飛蟲', hp: 2, speed: 1, color: '#73a9bd' },
    splitter: { name: '分裂蟲', hp: 4, speed: 0.70, color: '#87b77c' },
    giant: { name: '巨蟲', hp: 20, speed: 0.35, color: '#9e8266' },
    bomber: { name: '爆炸蟲', hp: 4, speed: 0.75, color: '#c96f58' },
    swift: { name: '長腳蟲', hp: 2, speed: 1.65, color: '#c8a14b' }
  };
  const group = (kind, hp, count) => ({ kind, hp, count });
  const LEVELS = [
    { name: '青草地', money: 22, entries: [3], rocks: [], water: [], waves: [
      [group('shield', 3, 5)],
      [group('shield', 4, 3), group('bug', 1, 5)],
      [group('shield_down', 3, 3), group('bug', 1, 6), group('swift', 2, 2)],
      [group('shield', 4, 3), group('shield_down', 4, 3), group('swift', 2, 3), group('bug', 1, 4)]
    ] },
    { name: '小池塘', money: 25, entries: [3], rocks: [], water: [[5, 2], [6, 2], [5, 3], [6, 3]], waves: [
      [group('shield', 4, 4), group('bug', 1, 3)],
      [group('hopper', 3, 4), group('swift', 2, 3), group('shield_down', 3, 2)],
      [group('mother', 9, 2), group('bug', 1, 3), group('shield', 4, 2)],
      [group('flyer', 3, 4), group('hopper', 4, 2), group('mother', 10, 1), group('shield_down', 4, 2), group('swift', 3, 3)]
    ] },
    { name: '兩條路', money: 28, entries: [1, 6], rocks: [[6, 1], [6, 2], [6, 5], [6, 6]], water: [], waves: [
      [group('bug', 1, 5), group('splitter', 4, 3), group('shield_down', 3, 2)],
      [group('giant', 20, 2), group('shield', 4, 2), group('flyer', 3, 3), group('swift', 3, 2)],
      [group('bomber', 4, 3), group('hopper', 4, 2), group('mother', 10, 1), group('bug', 1, 4)],
      [group('shield', 5, 2), group('shield_down', 5, 2), group('hopper', 4, 2), group('mother', 12, 1), group('flyer', 3, 2), group('splitter', 5, 2), group('giant', 24, 1), group('bomber', 5, 2), group('swift', 3, 2), group('bug', 1, 4)]
    ] }
  ];
  const key = (c, r) => `${c},${r}`;
  const inside = (c, r) => Number.isInteger(c) && Number.isInteger(r) && c >= 0 && c < COLS && r >= 0 && r < ROWS;
  const clone = value => JSON.parse(JSON.stringify(value));
  const terrain = level => new Set([...LEVELS[level].rocks, ...LEVELS[level].water].map(([c, r]) => key(c, r)));
  const at = (state, c, r) => state.buildings.find(b => b.c === c && b.r === r);

  // Uniform-cost four-neighbour BFS. Breakable buildings are considered only
  // after proving that no completely open route exists.
  function findPath(start, goal, buildings = [], solid = new Set(), allowBreak = false) {
    if (!inside(start.c, start.r) || !inside(goal.c, goal.r)) return null;
    const blocked = new Set(buildings.map(b => key(b.c, b.r)));
    const startKey = key(start.c, start.r), goalKey = key(goal.c, goal.r);
    const queue = [start], previous = new Map([[startKey, null]]);
    const cells = new Map([[startKey, start]]);
    for (let head = 0; head < queue.length; head++) {
      const current = queue[head], ck = key(current.c, current.r);
      if (ck === goalKey) {
        const path = [];
        for (let k = ck; k !== null; k = previous.get(k)) path.push(cells.get(k));
        return path.reverse();
      }
      // Stable tie-breaking makes the path preview match actual movement.
      for (const [dc, dr] of [[-1, 0], [0, -1], [0, 1], [1, 0]]) {
        const c = current.c + dc, r = current.r + dr, k = key(c, r);
        if (!inside(c, r) || previous.has(k) || solid.has(k) || (!allowBreak && blocked.has(k))) continue;
        const cell = { c, r };
        previous.set(k, ck); cells.set(k, cell); queue.push(cell);
      }
    }
    return null;
  }
  function route(state, start, buildings = state.buildings) {
    const solid = terrain(state.level);
    const open = findPath(start, GOAL, buildings, solid);
    if (open) return { path: open, breaking: false };
    return { path: findPath(start, GOAL, buildings, solid, true) || [], breaking: true };
  }
  function previews(state, buildings = state.buildings) {
    return LEVELS[state.level].entries.map(r => route(state, { c: COLS - 1, r }, buildings));
  }
  function createState(level = 0) {
    level = Number.isInteger(level) && LEVELS[level] ? level : 0;
    return {
      level, wave: 0, phase: 'planning', money: LEVELS[level].money, hearts: 5,
      buildings: [], enemies: [], shots: [], effects: [], fires: [], queue: [], spawnClock: 0,
      time: 0, revision: 0, nextId: 1, rngState: (0x9e3779b9 ^ (level + 1) * 65537) >>> 0, undo: [], checkpoint: null,
      stats: { hits: 0, blocked: 0, defeated: 0, broken: 0, hatched: 0, split: 0, exploded: 0, jumped: 0 }, waveStats: { hits: 0, blocked: 0 }
    };
  }
  function canBuild(state, kind, c, r) {
    if (state.phase !== 'planning') return '這波結束後再蓋';
    if (!TOOLS[kind] || !inside(c, r)) return '不能放這裡';
    if (c === 0 || c === COLS - 1 || terrain(state.level).has(key(c, r))) return '留給小蟲走';
    if (at(state, c, r)) return '這裡已經有了';
    if (state.money < TOOLS[kind].cost) return '種子不夠';
    return '';
  }
  function remember(state) {
    state.undo.push({ buildings: clone(state.buildings), money: state.money });
    if (state.undo.length > 100) state.undo.shift();
  }
  function build(state, kind, c, r) {
    const error = canBuild(state, kind, c, r);
    if (error) return { ok: false, error };
    remember(state);
    state.money -= TOOLS[kind].cost;
    state.buildings.push({ id: state.nextId++, kind, c, r, hp: TOOLS[kind].hp, cooldown: 0, angle: -90, flash: 0 });
    state.revision++;
    return { ok: true };
  }
  function remove(state, c, r) {
    if (state.phase !== 'planning') return { ok: false, error: '這波結束後再移' };
    const building = at(state, c, r);
    if (!building) return { ok: false, error: '點選要移走的物品' };
    remember(state);
    state.money += TOOLS[building.kind].cost;
    state.buildings = state.buildings.filter(b => b.id !== building.id);
    state.revision++;
    return { ok: true };
  }
  function undo(state) {
    if (state.phase !== 'planning' || !state.undo.length) return false;
    const previous = state.undo.pop();
    state.buildings = previous.buildings; state.money = previous.money; state.revision++;
    return true;
  }
  function snapshot(state) {
    return { version: 3, level: state.level, wave: state.wave, money: state.money, hearts: state.hearts, rngState: state.rngState,
      buildings: clone(state.buildings), stats: clone(state.stats) };
  }
  function restore(data) {
    if (!data || ![1, 2, 3].includes(data.version) || !Number.isInteger(data.level) || !LEVELS[data.level]) return null;
    if (!Number.isInteger(data.wave) || data.wave < 0 || data.wave >= LEVELS[data.level].waves.length) return null;
    if (!Number.isInteger(data.money) || data.money < 0 || data.money > 1000 || !Number.isInteger(data.hearts) || data.hearts < 1 || data.hearts > 5) return null;
    if (!Array.isArray(data.buildings) || data.buildings.length > COLS * ROWS) return null;
    const state = createState(data.level), used = new Set(), solid = terrain(data.level);
    for (const saved of data.buildings) {
      const b = saved?.kind === 'rapid' ? { ...saved, kind: 'cannon' } : saved;
      if (!b || !Object.hasOwn(TOOLS, b.kind) || !inside(b.c, b.r) || b.c === 0 || b.c === COLS - 1 || solid.has(key(b.c, b.r)) || used.has(key(b.c, b.r))) return null;
      if (!Number.isInteger(b.hp) || b.hp < 1 || b.hp > TOOLS[b.kind].hp) return null;
      used.add(key(b.c, b.r));
      state.buildings.push({ id: state.nextId++, kind: b.kind, c: b.c, r: b.r, hp: b.hp, cooldown: 0, angle: -90, flash: 0 });
    }
    state.wave = data.wave; state.money = data.money; state.hearts = data.hearts;
    if (Number.isInteger(data.rngState) && data.rngState > 0 && data.rngState <= 0xffffffff) state.rngState = data.rngState;
    if (data.stats) for (const k of Object.keys(state.stats)) if (Number.isInteger(data.stats[k]) && data.stats[k] >= 0) state.stats[k] = data.stats[k];
    return state;
  }
  function startWave(state) {
    if (state.phase !== 'planning') return false;
    state.checkpoint = snapshot(state);
    state.undo = []; state.queue = []; state.spawnClock = 0.5;
    state.waveStats = { hits: 0, blocked: 0 };
    let index = 0;
    for (const g of LEVELS[state.level].waves[state.wave]) {
      for (let i = 0; i < g.count; i++) state.queue.push({ kind: g.kind, hp: g.hp, row: LEVELS[state.level].entries[index++ % LEVELS[state.level].entries.length] });
    }
    state.phase = 'running';
    for (const b of state.buildings) b.cooldown = 0;
    return true;
  }
  function retry(state) { return restore(state.checkpoint) || createState(state.level); }
  function togglePause(state) {
    if (state.phase === 'running') state.phase = 'paused';
    else if (state.phase === 'paused') state.phase = 'running';
  }
  function spawn(state, kind, hp = ENEMIES[kind].hp, row = 3, position = null) {
    const x = position?.x ?? COLS - 1, y = position?.y ?? row, c = Math.round(x), r = Math.round(y);
    const enemy = { id: state.nextId++, kind, hp, maxHp: hp, x, y,
      c, r, next: Math.hypot(x - c, y - r) > 1e-9 ? { c, r } : null, slow: 0, flash: 0, shieldFlash: 0, burnCooldown: 0,
      push: null, leap: null, jumped: false, broodClock: BATTLE_SPEED * 3, bornAt: state.time, attackClock: 0.65, attackId: null, dead: false };
    state.enemies.push(enemy);
    return enemy;
  }
  function shieldBlocks(enemy, source) {
    // 'Above' is world/screen vertical, independent of the bug's movement heading.
    const side = ENEMIES[enemy.kind]?.shield;
    return side === 'up' ? source.r < enemy.y - 0.001 : side === 'down' ? source.r > enemy.y + 0.001 : false;
  }
  function impactPoint(enemy, source) {
    if (!shieldBlocks(enemy, source)) return { x: enemy.x, y: enemy.y };
    const side = ENEMIES[enemy.kind].shield === 'down' ? 1 : -1;
    const dx = Math.max(-0.44, Math.min(0.44, (source.c - enemy.x) / Math.max(0.1, Math.abs(enemy.y - source.r)) * 0.38));
    return { x: enemy.x + dx, y: enemy.y + side * (0.15 + 0.34 * Math.sqrt(1 - (dx / 0.47) ** 2)) };
  }
  function effect(state, kind, x, y, details = {}) {
    const duration = kind === 'block' ? 0.6 : ['split', 'hatch', 'detonate', 'leap'].includes(kind) ? 0.9 : 0.45;
    state.effects.push({ kind, x, y, life: duration, duration, ...details });
  }
  function hit(state, enemy, source, options = {}) {
    if (!enemy || enemy.dead) return false;
    if (options.ground && (enemy.kind === 'flyer' || enemy.leap)) return false;
    const incoming = options.ground ? { ...source, c: enemy.x, r: enemy.y + 1 } : source;
    if (shieldBlocks(enemy, incoming)) {
      enemy.shieldFlash = 0.25;
      state.stats.blocked++; state.waveStats.blocked++;
      const point = impactPoint(enemy, incoming);
      const distance = Math.hypot(enemy.x - incoming.c, enemy.y - incoming.r) || 1;
      const side = ENEMIES[enemy.kind].shield === 'down' ? 1 : -1;
      effect(state, 'block', point.x, point.y, {
        vx: (enemy.x - incoming.c) / distance,
        vy: side * Math.max(0.45, Math.abs(enemy.y - incoming.r) / distance),
        shotKind: source.kind, enemyId: enemy.id
      });
      return false;
    }
    const damage = options.damage ?? TOOLS[source.kind]?.damage ?? 1;
    enemy.hp = Math.max(0, enemy.hp - damage); enemy.flash = 0.18;
    state.stats.hits++; state.waveStats.hits++;
    if (source.kind === 'frost') enemy.slow = 2.1;
    if (enemy.hp <= 0) {
      killEnemy(state, enemy);
    }
    if (!enemy.dead && enemy.kind === 'hopper' && !enemy.jumped) startLeap(state, enemy);
    if (!enemy.dead && !enemy.leap && source.kind === 'push') pushEnemy(state, enemy, source);
    return true;
  }
  function random(state) {
    let x = state.rngState; x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    state.rngState = x >>> 0; return state.rngState / 4294967296;
  }
  function freePoint(state, x, y) {
    const c = Math.round(x), r = Math.round(y);
    return x >= 0 && x <= COLS - 1 && y >= 0 && y <= ROWS - 1 && inside(c, r) && !terrain(state.level).has(key(c, r)) && !at(state, c, r);
  }
  function hatch(state, parent, count) {
    const positions = [];
    for (let i = 0; i < count; i++) {
      let point = { x: parent.x, y: parent.y };
      for (let attempt = 0; attempt < 32; attempt++) {
        const angle = random(state) * Math.PI * 2, radius = 0.25 + 0.75 * Math.sqrt(random(state));
        const x = parent.x + Math.cos(angle) * radius, y = parent.y + Math.sin(angle) * radius;
        if (freePoint(state, x, y) && positions.every(p => Math.hypot(p.x - x, p.y - y) >= 0.4)) { point = { x, y }; break; }
      }
      positions.push(point); spawn(state, 'bug', 1, 3, point);
      effect(state, 'hatch', point.x, point.y);
    }
    return positions;
  }
  function killEnemy(state, enemy) {
    if (enemy.dead) return;
    enemy.dead = true; state.money++; state.stats.defeated++;
    effect(state, 'pop', enemy.x, enemy.y);
    if (enemy.kind === 'splitter') {
      state.stats.split++; effect(state, 'split', enemy.x, enemy.y); hatch(state, enemy, 3);
    } else if (enemy.kind === 'bomber') {
      const c = Math.round(enemy.x), r = Math.round(enemy.y);
      const destroyed = state.buildings.filter(b => Math.max(Math.abs(b.c - c), Math.abs(b.r - r)) <= 1);
      state.buildings = state.buildings.filter(b => !destroyed.includes(b));
      for (const b of destroyed) effect(state, 'chip', b.c, b.r);
      state.stats.broken += destroyed.length; state.stats.exploded++;
      if (destroyed.length) state.revision++;
      effect(state, 'detonate', c, r);
    }
  }
  function jumpLanding(state, enemy) {
    const c0 = Math.round(enemy.x), r0 = Math.round(enemy.y), candidates = [];
    // Two cells forward, with a two-cell sideways search for a safe landing.
    // Prefer an open shortest route; only consider a breaking route if necessary.
    for (let c = Math.max(0, c0 - 2); c < c0; c++) for (let r = Math.max(0, r0 - 2); r <= Math.min(ROWS - 1, r0 + 2); r++) {
      if (!freePoint(state, c, r)) continue;
      const plan = route(state, { c, r });
      if (plan.path.length) candidates.push({ c, r, breaking: plan.breaking, distance: plan.path.length - 1 });
    }
    candidates.sort((a, b) => Number(a.breaking) - Number(b.breaking) || a.distance - b.distance || a.c - b.c || Math.abs(a.r - r0) - Math.abs(b.r - r0) || a.r - b.r);
    return candidates[0] || null;
  }
  function startLeap(state, enemy) {
    enemy.jumped = true;
    const landing = jumpLanding(state, enemy);
    if (!landing) return false;
    enemy.push = null; enemy.next = null; enemy.attackId = null; enemy.attackClock = 0.65;
    enemy.leap = { fromX: enemy.x, fromY: enemy.y, x: landing.c, y: landing.r, age: 0, duration: 0.6 };
    state.stats.jumped++; effect(state, 'leap', enemy.x, enemy.y, { toX: landing.c, toY: landing.r });
    return true;
  }
  function pushEnemy(state, enemy, source) {
    const dx = enemy.x - source.c, dy = enemy.y - source.r, distance = Math.hypot(dx, dy);
    if (distance < 0.001) return;
    const ux = dx / distance, uy = dy / distance, solid = terrain(state.level);
    const free = (c, r) => inside(c, r) && (enemy.kind === 'flyer' || (!solid.has(key(c, r)) && !at(state, c, r)));
    let x = enemy.x, y = enemy.y, pc = Math.round(x), pr = Math.round(y);
    // Sweep the entire ray, including diagonal corners; never teleport through a wall.
    for (let d = 0.05; d <= TOOLS.push.knockback + 1e-9; d += 0.05) {
      const nx = enemy.x + ux * d, ny = enemy.y + uy * d, c = Math.round(nx), r = Math.round(ny);
      if (nx < 0 || nx > COLS - 1 || ny < 0 || ny > ROWS - 1 || !free(c, r)) break;
      if (c !== pc && r !== pr && (!free(c, pr) || !free(pc, r))) break;
      x = nx; y = ny; pc = c; pr = r;
    }
    if (Math.hypot(x - enemy.x, y - enemy.y) < 0.01) return;
    enemy.push = { fromX: enemy.x, fromY: enemy.y, x, y, age: 0, duration: 0.3 };
    enemy.next = null; enemy.attackId = null; enemy.attackClock = 0.65;
    effect(state, 'push', enemy.x, enemy.y, { ux, uy });
  }
  function ignite(state, x, y) {
    const c = Math.round(x), r = Math.round(y), tool = TOOLS.flame;
    const existing = state.fires.find(f => f.c === c && f.r === r);
    if (existing) { existing.life = tool.burnSeconds * BATTLE_SPEED; return; }
    state.fires.push({ id: state.nextId++, c, r, life: tool.burnSeconds * BATTLE_SPEED, clock: BATTLE_SPEED });
  }
  function updateFires(state, dt) {
    for (const enemy of state.enemies) enemy.burnCooldown = Math.max(0, enemy.burnCooldown - dt);
    for (const fire of state.fires) {
      fire.life -= dt; fire.clock -= dt;
      if (fire.clock <= 1e-9) {
        fire.clock += BATTLE_SPEED;
        for (const enemy of [...state.enemies]) {
          if (enemy.dead || enemy.burnCooldown > 1e-9 || Math.hypot(enemy.x - fire.c, enemy.y - fire.r) > 0.75) continue;
          // Ground fire reaches the underside; overlapping fires never stack damage.
          const damaged = hit(state, enemy, { kind: 'flame', c: fire.c, r: fire.r }, { ground: true, damage: TOOLS.flame.burnDamage });
          enemy.burnCooldown = BATTLE_SPEED;
          if (damaged) effect(state, 'burn', enemy.x, enemy.y);
        }
      }
    }
    state.fires = state.fires.filter(f => f.life > 1e-9);
  }
  function resolveShot(state, shot) {
    const enemy = state.enemies.find(e => e.id === shot.target && !e.dead);
    if (!enemy) return;
    const x = enemy.x, y = enemy.y;
    const nearby = shot.kind === 'cannon' ? state.enemies.filter(e => e.id !== enemy.id && !e.dead && Math.hypot(e.x - x, e.y - y) <= TOOLS.cannon.radius) : [];
    if (!hit(state, enemy, shot)) return;
    if (shot.kind === 'cannon') {
      effect(state, 'blast', x, y, { radius: TOOLS.cannon.radius });
      for (const other of nearby) hit(state, other, shot);
    } else if (shot.kind === 'flame') ignite(state, x, y);
    else if (shot.kind === 'molecular') effect(state, 'molecular', x, y);
  }
  function movePiercingShot(state, shot, dt) {
    const travel = Math.min(shot.remaining, 12 * dt);
    const x = shot.x, y = shot.y, nx = x + shot.ux * travel, ny = y + shot.uy * travel;
    const collisions = [];
    for (const enemy of state.enemies) {
      if (enemy.dead || shot.hitIds.includes(enemy.id)) continue;
      const projection = (enemy.x - x) * shot.ux + (enemy.y - y) * shot.uy;
      const t = Math.max(0, Math.min(travel, projection));
      if (Math.hypot(enemy.x - x - shot.ux * t, enemy.y - y - shot.uy * t) <= 0.32) collisions.push({ enemy, t });
    }
    collisions.sort((a, b) => a.t - b.t || a.enemy.id - b.enemy.id);
    for (const { enemy } of collisions) {
      shot.hitIds.push(enemy.id);
      if (!hit(state, enemy, shot)) { shot.remaining = 0; shot.x = enemy.x; shot.y = enemy.y; return; }
    }
    shot.x = nx; shot.y = ny; shot.remaining -= travel;
  }
  function moveEnemy(state, enemy, dt) {
    if (enemy.leap) {
      const p = enemy.leap; p.age += dt; const t = Math.min(1, p.age / p.duration);
      enemy.x = p.fromX + (p.x - p.fromX) * t; enemy.y = p.fromY + (p.y - p.fromY) * t;
      if (t >= 1) { enemy.x = enemy.c = p.x; enemy.y = enemy.r = p.y; enemy.next = null; enemy.leap = null; }
      return;
    }
    if (enemy.push) {
      const p = enemy.push; p.age += dt;
      const t = Math.min(1, p.age / p.duration), eased = 1 - (1 - t) ** 2;
      enemy.x = p.fromX + (p.x - p.fromX) * eased; enemy.y = p.fromY + (p.y - p.fromY) * eased;
      if (t >= 1) {
        enemy.c = Math.round(enemy.x); enemy.r = Math.round(enemy.y);
        enemy.next = { c: enemy.c, r: enemy.r }; enemy.push = null;
      }
      return;
    }
    if (enemy.kind === 'flyer') {
      const dx = GOAL.c - enemy.x, dy = GOAL.r - enemy.y, distance = Math.hypot(dx, dy);
      const travel = ENEMIES.flyer.speed * (enemy.slow > 0 ? 0.48 : 1) * dt;
      if (distance <= travel) {
        enemy.x = GOAL.c; enemy.y = GOAL.r; enemy.dead = true; state.hearts = Math.max(0, state.hearts - 1); effect(state, 'home', enemy.x, enemy.y);
      } else { enemy.x += dx / distance * travel; enemy.y += dy / distance * travel; enemy.c = Math.round(enemy.x); enemy.r = Math.round(enemy.y); }
      return;
    }
    if (enemy.c === GOAL.c && enemy.r === GOAL.r && !enemy.next) {
      enemy.dead = true; state.hearts = Math.max(0, state.hearts - 1);
      effect(state, 'home', enemy.x, enemy.y); return;
    }
    if (!enemy.next) {
      const plan = route(state, { c: enemy.c, r: enemy.r });
      if (plan.path.length < 2) return;
      const next = plan.path[1], obstacle = at(state, next.c, next.r);
      if (obstacle) {
        if (enemy.attackId !== obstacle.id) { enemy.attackId = obstacle.id; enemy.attackClock = 0.65; }
        enemy.attackClock -= dt;
        if (enemy.attackClock <= 0) {
          enemy.attackClock += 0.65; obstacle.hp--; obstacle.flash = 0.2;
          effect(state, 'chip', obstacle.c, obstacle.r);
          if (obstacle.hp <= 0) {
            state.buildings = state.buildings.filter(b => b.id !== obstacle.id);
            state.stats.broken++; state.revision++;
          }
        }
        return;
      }
      enemy.attackId = null; enemy.attackClock = 0.65; enemy.next = next;
    }
    const speed = ENEMIES[enemy.kind].speed * (enemy.slow > 0 ? 0.48 : 1);
    const dx = enemy.next.c - enemy.x, dy = enemy.next.r - enemy.y, dist = Math.hypot(dx, dy);
    const step = speed * dt;
    if (dist <= step) {
      enemy.x = enemy.c = enemy.next.c; enemy.y = enemy.r = enemy.next.r; enemy.next = null;
    } else { enemy.x += dx / dist * step; enemy.y += dy / dist * step; }
  }
  function step(state, dt) {
    if (state.phase !== 'running' || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05);
    state.time += dt;
    state.spawnClock -= dt;
    if (state.queue.length && state.spawnClock <= 0) {
      const item = state.queue.shift(); spawn(state, item.kind, item.hp, item.row);
      state.spawnClock = 1.45;
    }
    for (const enemy of [...state.enemies]) {
      if (enemy.dead) continue;
      enemy.slow = Math.max(0, enemy.slow - dt); enemy.flash = Math.max(0, enemy.flash - dt); enemy.shieldFlash = Math.max(0, enemy.shieldFlash - dt);
      moveEnemy(state, enemy, dt);
      if (!enemy.dead && enemy.kind === 'mother') {
        enemy.broodClock -= dt;
        if (enemy.broodClock <= 1e-9) { enemy.broodClock += BATTLE_SPEED * 3; hatch(state, enemy, 1); state.stats.hatched++; }
      }
      if (state.hearts === 0) { state.phase = 'lost'; break; }
    }
    if (state.phase === 'lost') return;
    for (const b of state.buildings) {
      b.flash = Math.max(0, b.flash - dt);
      if (b.kind === 'wall') continue;
      const tool = TOOLS[b.kind]; b.cooldown -= dt;
      const inRange = state.enemies.filter(e => !e.dead && Math.hypot(e.x - b.c, e.y - b.r) <= tool.range);
      inRange.sort((a, z) => (a.x + Math.abs(a.y - GOAL.r)) - (z.x + Math.abs(z.y - GOAL.r)) || a.id - z.id);
      const target = inRange[0];
      if (!target) { b.cooldown = Math.max(0, b.cooldown); continue; }
      b.angle = Math.atan2(target.y - b.r, target.x - b.c) * 180 / Math.PI;
      if (b.cooldown <= 0) {
        b.cooldown += BATTLE_SPEED / tool.rate; b.flash = 0.15;
        const shot = { id: state.nextId++, target: target.id, c: b.c, r: b.r, kind: b.kind, age: 0, duration: 0.2 };
        if (b.kind === 'pierce') {
          const dx = target.x - b.c, dy = target.y - b.r, distance = Math.hypot(dx, dy) || 1;
          Object.assign(shot, { x: b.c, y: b.r, ux: dx / distance, uy: dy / distance, remaining: tool.range, hitIds: [] });
        }
        state.shots.push(shot);
      }
    }
    for (const shot of state.shots) {
      if (shot.kind === 'pierce') { movePiercingShot(state, shot, dt); continue; }
      shot.age += dt;
      if (shot.age >= shot.duration) resolveShot(state, shot);
    }
    state.shots = state.shots.filter(s => s.kind === 'pierce' ? s.remaining > 1e-9 : s.age < s.duration);
    updateFires(state, dt);
    state.enemies = state.enemies.filter(e => !e.dead);
    for (const e of state.effects) e.life -= dt;
    state.effects = state.effects.filter(e => e.life > 0);
    if (!state.queue.length && !state.enemies.length && !state.shots.length) {
      state.money += 4; state.revision++;
      if (state.wave + 1 === LEVELS[state.level].waves.length) state.phase = 'won';
      else { state.wave++; state.phase = 'planning'; }
      // Repair between waves so planning remains about placement, not upkeep.
      for (const b of state.buildings) { b.hp = TOOLS[b.kind].hp; b.flash = 0; }
      state.effects = [];
      state.fires = [];
    }
  }
  return { COLS, ROWS, BATTLE_SPEED, GOAL, TOOLS, ENEMIES, LEVELS, key, terrain, at, findPath, route, previews,
    createState, canBuild, build, remove, undo, snapshot, restore, startWave, retry, togglePause, spawn, shieldBlocks, impactPoint, hit, pushEnemy, ignite, updateFires, resolveShot, jumpLanding, startLeap, step };
});
