(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Garden = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const COLS = 12, ROWS = 8;
  const GOAL = { c: 0, r: 3 };
  const TOOLS = {
    pea: { name: '豆豆塔', cost: 6, range: 3.1, interval: 1.05, hp: 5, color: '#4b8058' },
    rapid: { name: '連發塔', cost: 9, range: 2.2, interval: 0.48, hp: 5, color: '#d49a3b' },
    frost: { name: '冰花塔', cost: 8, range: 2.65, interval: 1.65, hp: 5, color: '#619aa9' },
    wall: { name: '小石牆', cost: 1, hp: 4, color: '#a48a66' }
  };
  const ENEMIES = {
    bug: { name: '小圓蟲', speed: 0.82, color: '#bd7657' },
    shield: { name: '盾蟲', speed: 0.68, color: '#d3a15d' },
    swift: { name: '快腳蟲', speed: 1.13, color: '#c8a14b' }
  };
  const group = (kind, hp, count) => ({ kind, hp, count });
  const LEVELS = [
    { name: '青草地', money: 22, entries: [3], rocks: [], water: [], waves: [
      [group('shield', 3, 5)],
      [group('shield', 4, 5)],
      [group('bug', 5, 3), group('swift', 4, 4)],
      [group('shield', 7, 5), group('bug', 6, 3)]
    ] },
    { name: '小池塘', money: 25, entries: [3], rocks: [], water: [[5, 2], [6, 2], [5, 3], [6, 3]], waves: [
      [group('shield', 4, 5)],
      [group('swift', 5, 6)],
      [group('bug', 7, 4), group('shield', 6, 4)],
      [group('shield', 9, 5), group('swift', 6, 5)]
    ] },
    { name: '兩條路', money: 28, entries: [1, 6], rocks: [[6, 1], [6, 2], [6, 5], [6, 6]], water: [], waves: [
      [group('bug', 4, 6)],
      [group('shield', 5, 6)],
      [group('swift', 6, 6), group('bug', 7, 3)],
      [group('shield', 10, 6), group('swift', 7, 5)]
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
      buildings: [], enemies: [], shots: [], effects: [], queue: [], spawnClock: 0,
      time: 0, revision: 0, nextId: 1, undo: [], checkpoint: null,
      stats: { hits: 0, blocked: 0, defeated: 0, broken: 0 }, waveStats: { hits: 0, blocked: 0 }
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
    return { version: 1, level: state.level, wave: state.wave, money: state.money, hearts: state.hearts,
      buildings: clone(state.buildings), stats: clone(state.stats) };
  }
  function restore(data) {
    if (!data || data.version !== 1 || !Number.isInteger(data.level) || !LEVELS[data.level]) return null;
    if (!Number.isInteger(data.wave) || data.wave < 0 || data.wave >= LEVELS[data.level].waves.length) return null;
    if (!Number.isInteger(data.money) || data.money < 0 || data.money > 1000 || !Number.isInteger(data.hearts) || data.hearts < 1 || data.hearts > 5) return null;
    if (!Array.isArray(data.buildings) || data.buildings.length > COLS * ROWS) return null;
    const state = createState(data.level), used = new Set(), solid = terrain(data.level);
    for (const b of data.buildings) {
      if (!b || !Object.hasOwn(TOOLS, b.kind) || !inside(b.c, b.r) || b.c === 0 || b.c === COLS - 1 || solid.has(key(b.c, b.r)) || used.has(key(b.c, b.r))) return null;
      if (!Number.isInteger(b.hp) || b.hp < 1 || b.hp > TOOLS[b.kind].hp) return null;
      used.add(key(b.c, b.r));
      state.buildings.push({ id: state.nextId++, kind: b.kind, c: b.c, r: b.r, hp: b.hp, cooldown: 0, angle: -90, flash: 0 });
    }
    state.wave = data.wave; state.money = data.money; state.hearts = data.hearts;
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
  function spawn(state, kind, hp, row = 3) {
    const enemy = { id: state.nextId++, kind, hp, maxHp: hp, x: COLS - 1, y: row,
      c: COLS - 1, r: row, next: null, slow: 0, flash: 0, shieldFlash: 0, attackClock: 0.65, attackId: null, dead: false };
    state.enemies.push(enemy);
    return enemy;
  }
  function shieldBlocks(enemy, source) {
    // 'Above' is world/screen vertical, independent of the bug's movement heading.
    return enemy.kind === 'shield' && source.r < enemy.y - 0.001;
  }
  function impactPoint(enemy, source) {
    if (!shieldBlocks(enemy, source)) return { x: enemy.x, y: enemy.y };
    const dx = Math.max(-0.44, Math.min(0.44, (source.c - enemy.x) / Math.max(0.1, enemy.y - source.r) * 0.38));
    return { x: enemy.x + dx, y: enemy.y - 0.15 - 0.34 * Math.sqrt(1 - (dx / 0.47) ** 2) };
  }
  function effect(state, kind, x, y, details = {}) {
    const duration = kind === 'block' ? 0.6 : 0.45;
    state.effects.push({ kind, x, y, life: duration, duration, ...details });
  }
  function hit(state, enemy, source) {
    if (!enemy || enemy.dead) return false;
    if (shieldBlocks(enemy, source)) {
      enemy.shieldFlash = 0.25;
      state.stats.blocked++; state.waveStats.blocked++;
      const point = impactPoint(enemy, source);
      const distance = Math.hypot(enemy.x - source.c, enemy.y - source.r) || 1;
      effect(state, 'block', point.x, point.y, {
        vx: (enemy.x - source.c) / distance,
        vy: -Math.max(0.45, Math.abs(enemy.y - source.r) / distance),
        shotKind: source.kind, enemyId: enemy.id
      });
      return false;
    }
    enemy.hp -= 1; enemy.flash = 0.18;
    state.stats.hits++; state.waveStats.hits++;
    if (source.kind === 'frost') enemy.slow = 2.1;
    if (enemy.hp <= 0) {
      enemy.dead = true; state.money++; state.stats.defeated++;
      effect(state, 'pop', enemy.x, enemy.y);
    }
    return true;
  }
  function moveEnemy(state, enemy, dt) {
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
    for (const enemy of state.enemies) {
      if (enemy.dead) continue;
      enemy.slow = Math.max(0, enemy.slow - dt); enemy.flash = Math.max(0, enemy.flash - dt); enemy.shieldFlash = Math.max(0, enemy.shieldFlash - dt);
      moveEnemy(state, enemy, dt);
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
        b.cooldown += tool.interval; b.flash = 0.15;
        state.shots.push({ id: state.nextId++, target: target.id, c: b.c, r: b.r, kind: b.kind, age: 0, duration: 0.2 });
      }
    }
    for (const shot of state.shots) {
      shot.age += dt;
      if (shot.age >= shot.duration) hit(state, state.enemies.find(e => e.id === shot.target), shot);
    }
    state.shots = state.shots.filter(s => s.age < s.duration);
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
    }
  }
  return { COLS, ROWS, GOAL, TOOLS, ENEMIES, LEVELS, key, terrain, at, findPath, route, previews,
    createState, canBuild, build, remove, undo, snapshot, restore, startWave, retry, togglePause, spawn, shieldBlocks, impactPoint, hit, step };
});
