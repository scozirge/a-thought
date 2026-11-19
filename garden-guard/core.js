(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Garden = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const COLS = 12, ROWS = 8;
  const BATTLE_SPEED = 1.5;
  const SPAWN_INTERVAL = BATTLE_SPEED * 0.25;
  const ENEMY_HEALTH_MULTIPLIER = 2;
  const GOAL = { c: 0, r: 3 };
  const TOOLS = {
    pea: { name: '一般砲塔', targets: ['ground', 'air'], cost: 5, range: 3.1, damage: 1, rate: 1.55, effect: '單體傷害', hp: 5, color: '#4b8058' },
    cannon: { name: '大砲範圍塔', targets: ['ground'], cost: 11, range: 2.8, damage: 2, rate: 1.2, radius: 1.25, effect: '範圍傷害', hp: 5, color: '#b68a43' },
    frost: { name: '冰凍塔', targets: ['ground', 'air'], cost: 7, range: 2.65, damage: 0, rate: 0.9, slowDuration: 2.1, effect: '塔周圍 2.65 格緩速', hp: 5, color: '#619aa9' },
    flame: { name: '火焰塔', targets: ['ground'], cost: 7, range: 3.2, damage: 1, rate: 0.6, burnDamage: 1, burnSeconds: 3, burnRadius: 0.75, effect: '地板燃燒 3 秒', hp: 5, color: '#d37643' },
    pierce: { name: '雷射砲', targets: ['ground', 'air'], cost: 15, range: 6.2, damage: 1, rate: 0.8, effect: '直線雷射穿透', hp: 5, color: '#4a8f88' },
    push: { name: '擊退塔', targets: ['ground', 'air'], cost: 9, range: 4, damage: 1, rate: 0.35, priority: 'nearest', knockback: 3, effect: '同格沿路退 3 格・最近優先', hp: 5, color: '#7882af' },
    molecular: { name: '分子砲', targets: ['ground', 'air'], cost: 22, range: 6.6, damage: 28, rate: 0.4, aimSeconds: 2.5, priority: 'highestHp', effect: '高血量優先・瞄準 2.5 秒', hp: 5, color: '#a16cab' },
    wall: { name: '小石牆', cost: 1, hp: 4, color: '#a48a66' }
  };
  const VERSION9_PRICES = { pea: 4, cannon: 12, frost: 8, flame: 8, pierce: 12, push: 16, molecular: 32, wall: 1 };
  const PREVIOUS_PRICES = { pea: 6, cannon: 9, frost: 8, flame: 10, pierce: 10, push: 9, molecular: 14, wall: 1 };
  const ENEMIES = {
    bug: { name: '小蟲', hp: 1, artSpan: 52, speed: 0.82, color: '#bd7657' },
    shield: { name: '上盾蟲', hp: 3, artSpan: 73, speed: 0.68, shield: 'up', color: '#d3a15d' },
    shield_down: { name: '下盾蟲', hp: 3, artSpan: 73, speed: 0.68, shield: 'down', color: '#78ad9b' },
    hopper: { name: '跳蟲', hp: 3, artSpan: 64, speed: 0.85, color: '#8caa55' },
    mother: { name: '母蟲', hp: 10, artSpan: 69, speed: 0.30, color: '#c58fa9' },
    flyer: { name: '飛蟲', airborne: true, hp: 2, artSpan: 60, speed: 1, color: '#73a9bd' },
    splitter: { name: '分裂蟲', hp: 4, artSpan: 62, speed: 0.70, color: '#87b77c' },
    giant: { name: '巨蟲', hp: 20, artSpan: 89, speed: 0.35, color: '#9e8266' },
    swift: { name: '長腳蟲', hp: 2, artSpan: 64, speed: 1.65, color: '#c8a14b' }
  };
  const health = (kind, hp) => Math.max(1, hp * ENEMY_HEALTH_MULTIPLIER - (kind === 'flyer' ? 1 : 0));
  for (const [kind, enemy] of Object.entries(ENEMIES)) enemy.hp = health(kind, enemy.hp);
  const group = (kind, hp, count) => ({ kind, hp: health(kind, hp), count });
  // One battlefield, ten manually started waves. Test selection uses the same
  // total budget that a lossless campaign has earned by the start of that wave.
  const stage = (name, entries, reward, groups) => ({ name, entries, reward, rocks: [], water: [], waves: [groups] });
  const LEVELS = [
    stage('攻擊方向', [3, 1, 6], 12, [group('shield', 3, 8), group('bug', 3, 16)]),
    stage('上下夾擊', [1, 3, 5], 14, [group('shield', 4, 10), group('shield_down', 4, 10), group('bug', 3, 12)]),
    stage('快速包圍', [1, 2, 3, 5, 6], 14, [group('shield', 4, 9), group('shield_down', 4, 9), group('swift', 4, 11), group('bug', 3, 11)]),
    stage('越過防線', [1, 2, 3, 5, 6], 16, [group('hopper', 6, 12), group('shield', 6, 8), group('shield_down', 5, 8), group('swift', 5, 10), group('bug', 3, 9)]),
    stage('空中來襲', [1, 2, 3, 5, 6], 18, [group('flyer', 4, 10), group('hopper', 7, 10), group('shield', 6, 8), group('shield_down', 6, 8), group('swift', 5, 10), group('bug', 3, 9)]),
    stage('分裂蟲群', [0, 1, 3, 4, 6, 7], 20, [group('splitter', 8, 10), group('flyer', 5, 10), group('hopper', 8, 10), group('shield', 7, 8), group('shield_down', 7, 7), group('swift', 6, 9), group('bug', 3, 9)]),
    stage('源源不絕', [0, 1, 3, 4, 6, 7], 24, [group('mother', 14, 3), group('splitter', 9, 9), group('flyer', 5, 12), group('hopper', 9, 10), group('shield', 8, 9), group('shield_down', 8, 9), group('swift', 7, 11), group('bug', 3, 9)]),
    stage('巨蟲壓境', [0, 1, 2, 3, 4, 5, 6, 7], 24, [group('giant', 38, 8), group('mother', 21, 4), group('splitter', 10, 11), group('flyer', 7, 16), group('hopper', 13, 11), group('shield', 11, 8), group('shield_down', 11, 8), group('swift', 10, 12), group('bug', 4, 10)]),
    stage('巨蟲浪潮', [0, 1, 2, 3, 4, 5, 6, 7], 36, [group('giant', 53, 11), group('mother', 27, 5), group('splitter', 12, 13), group('flyer', 9, 17), group('hopper', 16, 13), group('shield', 13, 9), group('shield_down', 13, 9), group('swift', 13, 14), group('bug', 5, 11)]),
    stage('最後防線', [0, 1, 2, 3, 4, 5, 6, 7], 24, [group('giant', 109, 16), group('mother', 45, 7), group('splitter', 24, 15), group('flyer', 13, 20), group('hopper', 26, 14), group('shield', 22, 11), group('shield_down', 22, 11), group('swift', 22, 18), group('bug', 6, 16)])
  ];
  const largestSpawnHp = Math.max(...LEVELS.flatMap(level => level.waves.flat().map(g => g.hp)));
  const PREVIOUS_BUDGETS = [42, 52, 64, 76, 90, 104, 120, 136, 154, 182];
  const GENEROUS_BUDGETS = [60, 75, 93, 111, 132, 153, 177, 201, 228, 270];
  const SPAWN_GAPS = [.50, .39, .36, .34, .32, .31, .30, .28, .25, .22];
  let budget = 48;
  for (const [i, level] of LEVELS.entries()) {
    level.money = budget; budget += level.reward;
    level.spawnInterval = BATTLE_SPEED * SPAWN_GAPS[i];
    level.edgeEntries = i < 7 ? [] : i === 7 ? [{ c: 8, r: 0, side: 'top' }, { c: 10, r: 7, side: 'bottom' }]
      : i === 8 ? [{ c: 7, r: 0, side: 'top' }, { c: 8, r: 7, side: 'bottom' }]
      : [5, 9].flatMap(c => [{ c, r: 0, side: 'top' }, { c, r: 7, side: 'bottom' }]);
  }
  const key = (c, r) => `${c},${r}`;
  const inside = (c, r) => Number.isInteger(c) && Number.isInteger(r) && c >= 0 && c < COLS && r >= 0 && r < ROWS;
  const clone = value => JSON.parse(JSON.stringify(value));
  const terrain = level => new Set([...LEVELS[level].rocks, ...LEVELS[level].water].map(([c, r]) => key(c, r)));
  const at = (state, c, r) => state.buildings.find(b => b.c === c && b.r === r);
  const stageSeed = level => (0x9e3779b9 ^ (level + 1) * 65537) >>> 0;
  const entrances = level => [...LEVELS[level].entries.map(r => ({ c: COLS - 1, r, side: 'right' })), ...LEVELS[level].edgeEntries];
  const isEntrance = (level, c, r) => entrances(level).some(e => e.c === c && e.r === r);
  function clearEntrances(state) {
    const blocked = state.buildings.filter(b => isEntrance(state.level, b.c, b.r));
    if (!blocked.length) return;
    state.money += blocked.reduce((sum, b) => sum + b.paidCost, 0);
    state.buildings = state.buildings.filter(b => !blocked.includes(b));
    state.revision++;
  }

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
  // Enemies repeatedly ask for the same route until a building changes the board.
  const travelRoutes = new WeakMap();
  function travelRoute(state, c, r) {
    let cache = travelRoutes.get(state);
    if (!cache || cache.revision !== state.revision || cache.level !== state.level || cache.buildings !== state.buildings) {
      cache = { revision: state.revision, level: state.level, buildings: state.buildings, cells: new Map() };
      travelRoutes.set(state, cache);
    }
    const cell = r * COLS + c;
    if (!cache.cells.has(cell)) cache.cells.set(cell, route(state, { c, r }));
    return cache.cells.get(cell);
  }
  function previews(state, buildings = state.buildings) {
    return entrances(state.level).map(entry => route(state, entry, buildings));
  }
  function createState(level = 0) {
    level = Number.isInteger(level) && LEVELS[level] ? level : 0;
    return {
      level, wave: 0, phase: 'planning', money: LEVELS[level].money, hearts: 5, completed: false, lastReward: 0,
      buildings: [], enemies: [], shots: [], effects: [], fires: [], queue: [], spawnClock: 0,
      time: 0, revision: 0, nextId: 1, rngState: stageSeed(level), undo: [], checkpoint: null,
      stats: { hits: 0, blocked: 0, defeated: 0, broken: 0, hatched: 0, split: 0, jumped: 0 }, waveStats: { hits: 0, blocked: 0 }
    };
  }
  function canBuild(state, kind, c, r) {
    if (state.phase !== 'planning') return '開始後不能建造';
    if (!TOOLS[kind] || !inside(c, r)) return '不能放這裡';
    if (c === 0 || c === COLS - 1 || isEntrance(state.level, c, r) || terrain(state.level).has(key(c, r))) return '留給小蟲走';
    if (at(state, c, r)) return '這裡已經有了';
    if (state.money < TOOLS[kind].cost) return '金幣不夠';
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
    state.buildings.push({ id: state.nextId++, kind, c, r, paidCost: TOOLS[kind].cost, hp: TOOLS[kind].hp, cooldown: 0, aim: null, angle: -25, flash: 0 });
    state.revision++;
    return { ok: true };
  }
  function remove(state, c, r) {
    if (state.phase !== 'planning') return { ok: false, error: '開始後不能移除' };
    const building = at(state, c, r);
    if (!building) return { ok: false, error: '點選要移走的物品' };
    remember(state);
    state.money += building.paidCost;
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
    return { version: 10, level: state.level, wave: 0, completed: state.completed, money: state.money, hearts: state.hearts, rngState: state.rngState,
      buildings: clone(state.buildings), stats: clone(state.stats) };
  }
  function restore(data) {
    if (!data || ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10].includes(data.version) || !Number.isInteger(data.level) || !LEVELS[data.level]) return null;
    if (data.version < 6 && data.level > 2) return null;
    if (!Number.isInteger(data.wave) || data.wave < 0 || data.wave >= (data.version < 6 ? 4 : 1)) return null;
    if (data.version >= 6 && (typeof data.completed !== 'boolean' || (data.completed && data.level !== LEVELS.length - 1))) return null;
    if (!Number.isInteger(data.money) || data.money < 0 || data.money > 1000 || !Number.isInteger(data.hearts) || data.hearts < 1 || data.hearts > 5) return null;
    if (!Array.isArray(data.buildings) || data.buildings.length > COLS * ROWS) return null;
    const state = createState(data.level), used = new Set(), solid = terrain(data.level);
    for (const saved of data.buildings) {
      const b = saved?.kind === 'rapid' ? { ...saved, kind: 'cannon' } : saved;
      if (!b || !Object.hasOwn(TOOLS, b.kind) || !inside(b.c, b.r) || b.c === 0 || b.c === COLS - 1 || solid.has(key(b.c, b.r)) || used.has(key(b.c, b.r))) return null;
      if (data.version >= 10 && isEntrance(data.level, b.c, b.r)) return null;
      if (!Number.isInteger(b.hp) || b.hp < 1 || b.hp > TOOLS[b.kind].hp) return null;
      // Price changes never create refund profit or reduce an old purchase's
      // refund. Version 8 saves each building's actual purchase price.
      const paidCost = data.version < 8 ? PREVIOUS_PRICES[b.kind] : b.paidCost;
      if (![PREVIOUS_PRICES[b.kind], VERSION9_PRICES[b.kind], TOOLS[b.kind].cost].includes(paidCost)) return null;
      used.add(key(b.c, b.r));
      state.buildings.push({ id: state.nextId++, kind: b.kind, c: b.c, r: b.r, paidCost, hp: b.hp, cooldown: 0, aim: null, angle: -25, flash: 0 });
    }
    // A loaded deployment starts with a full home, including older saves.
    // Completed campaigns keep their final health for the result screen.
    state.money = data.money; state.hearts = data.version >= 6 && data.completed ? data.hearts : 5;
    // Preserve old boards and funds; old sub-batches now restart as one stage.
    if (data.version < 5) state.money = Math.min(1000, state.money + [60, 80, 100][state.level] - [22, 25, 28][state.level]);
    // Normalize earlier economies, then apply the lower budget exactly once.
    // Existing purchases remain intact, with their original refund values.
    if (data.version === 6) state.money = Math.min(1000, state.money + GENEROUS_BUDGETS[state.level] - PREVIOUS_BUDGETS[state.level] + (data.completed ? 10 : 0));
    if (data.version < 9) state.money = Math.max(0, state.money - GENEROUS_BUDGETS[state.level] + LEVELS[state.level].money - (data.completed ? 30 - LEVELS[state.level].reward : 0));
    clearEntrances(state);
    if (data.version >= 6 && data.completed) { state.completed = true; state.phase = 'won'; }
    if (Number.isInteger(data.rngState) && data.rngState > 0 && data.rngState <= 0xffffffff) state.rngState = data.rngState;
    if (data.stats) for (const k of Object.keys(state.stats)) if (Number.isInteger(data.stats[k]) && data.stats[k] >= 0) state.stats[k] = data.stats[k];
    return state;
  }
  function startWave(state) {
    if (state.phase !== 'planning') return false;
    // Starting is explicit; no future stage is queued during deployment.
    state.checkpoint = snapshot(state);
    state.undo = []; state.queue = []; state.spawnClock = SPAWN_INTERVAL;
    state.fires = []; state.effects = []; state.shots = []; state.lastReward = 0;
    state.waveStats = { hits: 0, blocked: 0 };
    let index = 0;
    const entries = entrances(state.level);
    for (let wave = state.wave; wave < LEVELS[state.level].waves.length; wave++) {
      const groups = LEVELS[state.level].waves[wave];
      // Late waves send small mixed squads through the same rotating entrances.
      const largestGroup = Math.max(...groups.map(g => g.count));
      const packSize = state.level === 9 ? 3 : state.level === 8 ? 6 : largestGroup;
      for (let offset = 0; offset < largestGroup; offset += packSize) {
        for (const g of groups) {
          const end = Math.min(g.count, offset + packSize);
          for (let i = offset; i < end; i++) {
            const entry = entries[index++ % entries.length];
            state.queue.push({ kind: g.kind, hp: g.hp, wave, row: entry.r, position: { x: entry.c, y: entry.r } });
          }
        }
      }
    }
    state.phase = 'running';
    for (const b of state.buildings) { b.cooldown = 0; b.flash = 0; b.aim = null; }
    return true;
  }
  function retry(state) { return restore(state.checkpoint) || createState(state.level); }
  function isAdvancing(state) { return state.phase === 'running'; }
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
  // Normalize each drawing's natural span, including legs and armor, to a
  // 48–63 unit silhouette on a 64-unit tile. Collision rules use board units.
  function enemyArtScale(kind, maxHp = ENEMIES[kind].hp) {
    const hp = Math.max(1, Math.min(maxHp, largestSpawnHp));
    return (48 + 15 * Math.log(hp) / Math.log(largestSpawnHp)) / ENEMIES[kind].artSpan;
  }
  function impactPoint(enemy, source) {
    if (!shieldBlocks(enemy, source)) return { x: enemy.x, y: enemy.y };
    const side = ENEMIES[enemy.kind].shield === 'down' ? 1 : -1;
    const dx = Math.max(-0.44, Math.min(0.44, (source.c - enemy.x) / Math.max(0.1, Math.abs(enemy.y - source.r)) * 0.38));
    const scale = enemyArtScale(enemy.kind, enemy.maxHp);
    return { x: enemy.x + dx * scale, y: enemy.y + side * scale * (0.15 + 0.34 * Math.sqrt(1 - (dx / 0.47) ** 2)) };
  }
  const RECOIL_SECONDS = .38;
  const EFFECT_SECONDS = { home: .95, block: .6, split: .9, hatch: .9, leap: .9, frost: .85, blast: .64, laser: .34, spark: .31, flare: .54, molecular: .65 };
  function effect(state, kind, x, y, details = {}) {
    const duration = EFFECT_SECONDS[kind] ?? 0.45;
    state.effects.push({ kind, x, y, life: duration, duration, ...details });
  }
  function canTarget(kind, enemy) {
    const air = !!ENEMIES[enemy.kind]?.airborne || !!enemy.leap;
    return !enemy.dead && !!TOOLS[kind]?.targets?.includes(air ? 'air' : 'ground');
  }
  function blockHit(state, enemy, incoming) {
    if (shieldBlocks(enemy, incoming)) {
      enemy.shieldFlash = 0.25;
      state.stats.blocked++; state.waveStats.blocked++;
      const point = impactPoint(enemy, incoming);
      const distance = Math.hypot(enemy.x - incoming.c, enemy.y - incoming.r) || 1;
      const side = ENEMIES[enemy.kind].shield === 'down' ? 1 : -1;
      effect(state, 'block', point.x, point.y, {
        vx: (enemy.x - incoming.c) / distance,
        vy: side * Math.max(0.45, Math.abs(enemy.y - incoming.r) / distance),
        shotKind: incoming.kind, enemyId: enemy.id
      });
      return true;
    }
    return false;
  }
  function hit(state, enemy, source, options = {}) {
    if (!enemy || enemy.dead) return false;
    if (TOOLS[source.kind]?.targets && !canTarget(source.kind, enemy)) return false;
    if (options.ground && (enemy.kind === 'flyer' || enemy.leap)) return false;
    const incoming = options.ground ? { ...source, c: enemy.x, r: enemy.y + 1 } : source;
    if (source.kind === 'frost') {
      if (shieldBlocks(enemy, incoming)) {
        state.stats.blocked++; state.waveStats.blocked++;
        return false;
      }
      enemy.slow = TOOLS.frost.slowDuration;
      return true;
    }
    if (blockHit(state, enemy, incoming)) return false;
    const damage = options.damage ?? TOOLS[source.kind]?.damage ?? 1;
    enemy.hp = Math.max(0, enemy.hp - damage); enemy.flash = 0.18;
    state.stats.hits++; state.waveStats.hits++;
    if (enemy.hp <= 0) killEnemy(state, enemy);
    if (!enemy.dead && enemy.kind === 'hopper' && !enemy.jumped) startLeap(state, enemy);
    if (!enemy.dead && !enemy.leap && source.kind === 'push') pushEnemy(state, enemy);
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
      positions.push(point); spawn(state, 'bug', ENEMIES.bug.hp, 3, point);
      if (parent.kind === 'mother') effect(state, 'hatch', point.x, point.y);
    }
    return positions;
  }
  function killEnemy(state, enemy) {
    if (enemy.dead) return;
    enemy.dead = true; state.stats.defeated++;
    if (enemy.kind === 'splitter') {
      state.stats.split++;
      effect(state, 'split', enemy.x, enemy.y, { maxHp: enemy.maxHp, offspring: hatch(state, enemy, 3) });
    } else effect(state, 'pop', enemy.x, enemy.y);
  }
  function jumpLanding(state, enemy) {
    const c0 = Math.round(enemy.x), r0 = Math.round(enemy.y), candidates = [];
    // Two cells forward, with a two-cell sideways search for a safe landing.
    // Prefer an open shortest route; only consider a breaking route if necessary.
    for (let c = Math.max(0, c0 - 2); c < c0; c++) for (let r = Math.max(0, r0 - 2); r <= Math.min(ROWS - 1, r0 + 2); r++) {
      if (!freePoint(state, c, r)) continue;
      const plan = travelRoute(state, c, r);
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
  function pushEnemy(state, enemy) {
    const solid = terrain(state.level);
    const flying = ENEMIES[enemy.kind].airborne;
    const blocked = new Set(state.buildings.map(b => key(b.c, b.r)));
    const free = (c, r) => inside(c, r) && (flying || (!solid.has(key(c, r)) && !blocked.has(key(c, r))));
    const directions = [[1, 0], [0, -1], [0, 1], [-1, 0]];
    // Distance to home follows the same open paths as normal ground movement.
    function distances(allowBreak) {
      const field = new Map([[key(GOAL.c, GOAL.r), 0]]), queue = [GOAL];
      for (let i = 0; i < queue.length; i++) for (const [dc, dr] of directions) {
        const c = queue[i].c + dc, r = queue[i].r + dr, k = key(c, r);
        if (!inside(c, r) || solid.has(k) || (!allowBreak && blocked.has(k)) || field.has(k)) continue;
        field.set(k, field.get(key(queue[i].c, queue[i].r)) + 1); queue.push({ c, r });
      }
      return field;
    }
    const origin = { x: enemy.x, y: enemy.y }, limit = TOOLS.push.knockback;
    const anchors = [];
    for (const c of new Set([Math.floor(enemy.x), Math.ceil(enemy.x)])) for (const r of new Set([Math.floor(enemy.y), Math.ceil(enemy.y)])) {
      if (!free(c, r)) continue;
      const length = Math.hypot(c - enemy.x, r - enemy.y);
      const samples = Math.max(1, Math.ceil(length * 20));
      if (Array.from({ length: samples }, (_, i) => (i + 1) / samples).some(t => !free(Math.round(enemy.x + (c - enemy.x) * t), Math.round(enemy.y + (r - enemy.y) * t)))) continue;
      anchors.push({ c, r, length, points: length > 1e-9 ? [origin, { x: c, y: r }] : [origin] });
    }
    if (!anchors.length) return;
    let field = flying ? null : distances(false);
    // An entirely enclosed group will eventually break out. Its retreat still
    // uses free cells, with the breakable-home distance as a finite fallback.
    if (field && anchors.every(a => !field.has(key(a.c, a.r)))) field = distances(true);
    const scoreCell = (c, r) => flying ? Math.hypot(c - GOAL.c, r - GOAL.r) : field.get(key(c, r));
    const initialScore = Math.min(...anchors.map(a => (scoreCell(a.c, a.r) ?? Infinity) + a.length));
    let best = null;
    const consider = (points, length, score) => {
      if (!Number.isFinite(score) || score <= initialScore + 1e-9 || length < 0.01) return;
      const last = points[points.length - 1];
      if (!best || score > best.score + 1e-9 || (Math.abs(score - best.score) < 1e-9 && last.x > best.x + 1e-9)) best = { points, length, score, x: last.x, y: last.y };
    };
    const queue = [...anchors], visited = new Map();
    while (queue.length) {
      queue.sort((a, b) => a.length - b.length);
      const current = queue.shift(), k = key(current.c, current.r);
      if (visited.has(k)) continue;
      visited.set(k, current.length);
      consider(current.points, current.length, scoreCell(current.c, current.r));
      const travel = Math.min(1, limit - current.length);
      if (travel <= 1e-9) continue;
      for (const [dc, dr] of directions) {
        const c = current.c + dc, r = current.r + dr;
        if (!free(c, r) || visited.has(key(c, r))) continue;
        const x = current.c + dc * travel, y = current.r + dr * travel;
        const points = [...current.points, { x, y }], length = current.length + travel;
        const score = flying ? Math.hypot(x - GOAL.c, y - GOAL.r) : scoreCell(current.c, current.r) * (1 - travel) + scoreCell(c, r) * travel;
        consider(points, length, score);
        if (travel === 1) queue.push({ c, r, length, points });
      }
    }
    if (!best) return;
    enemy.push = { fromX: enemy.x, fromY: enemy.y, x: best.x, y: best.y, points: best.points, length: best.length, age: 0, duration: 0.3 };
    enemy.next = null; enemy.attackId = null; enemy.attackClock = 0.65;
  }
  function ignite(state, x, y) {
    const c = Math.round(x), r = Math.round(y), tool = TOOLS.flame;
    const existing = state.fires.find(f => f.c === c && f.r === r);
    if (existing) { existing.life = tool.burnSeconds * BATTLE_SPEED; return; }
    state.fires.push({ id: state.nextId++, c, r, bornAt: state.time, life: tool.burnSeconds * BATTLE_SPEED, clock: BATTLE_SPEED });
  }
  function updateFires(state, dt) {
    for (const enemy of state.enemies) enemy.burnCooldown = Math.max(0, enemy.burnCooldown - dt);
    for (const fire of state.fires) {
      fire.life -= dt; fire.clock -= dt;
      if (fire.clock <= 1e-9) {
        fire.clock += BATTLE_SPEED;
        for (const enemy of [...state.enemies]) {
          if (enemy.dead || enemy.burnCooldown > 1e-9 || Math.hypot(enemy.x - fire.c, enemy.y - fire.r) > TOOLS.flame.burnRadius) continue;
          // Ground fire reaches the underside; overlapping fires never stack damage.
          const damaged = hit(state, enemy, { kind: 'flame', c: fire.c, r: fire.r }, { ground: true, damage: TOOLS.flame.burnDamage });
          enemy.burnCooldown = BATTLE_SPEED;
          if (damaged) effect(state, 'burn', enemy.x, enemy.y);
        }
      }
    }
    state.fires = state.fires.filter(f => f.life > 1e-9);
  }
  function frostAura(state, source) {
    const tool = TOOLS.frost;
    const nearby = state.enemies.filter(e => canTarget('frost', e) && Math.hypot(e.x - source.c, e.y - source.r) <= tool.range);
    effect(state, 'frost', source.c, source.r, { radius: tool.range });
    for (const enemy of nearby) hit(state, enemy, source);
  }
  function fireLaser(state, source) {
    const angle = source.angle * Math.PI / 180, ux = Math.cos(angle), uy = Math.sin(angle);
    let length = TOOLS.pierce.range;
    const contacts = [];
    for (const enemy of state.enemies) {
      if (!canTarget('pierce', enemy)) continue;
      const dx = enemy.x - source.c, dy = enemy.y - source.r;
      const along = dx * ux + dy * uy;
      if (along >= 0 && along <= length && Math.abs(dx * uy - dy * ux) <= .32) contacts.push({ enemy, along });
    }
    contacts.sort((a, b) => a.along - b.along || a.enemy.id - b.enemy.id);
    const hitDistances = [];
    for (const { enemy, along } of contacts) {
      if (!hit(state, enemy, source)) {
        const point = impactPoint(enemy, source);
        length = Math.max(0, Math.min(length, (point.x - source.c) * ux + (point.y - source.r) * uy));
        break;
      }
      if (!hitDistances.length || along - hitDistances[hitDistances.length - 1] > .35) hitDistances.push(along);
    }
    effect(state, 'laser', source.c, source.r, { tower: source.tower, angle: source.angle, length, hitDistances });
  }
  function resolveShot(state, shot) {
    if (shot.kind === 'frost') return frostAura(state, shot);
    if (shot.kind === 'pierce') return fireLaser(state, shot);
    const target = state.enemies.find(e => e.id === shot.target && !e.dead);
    // Instant resolutions can take a target alone. All in-flight shots carry
    // the two coordinates captured when the tower fired.
    const x = shot.impactX ?? target?.x, y = shot.impactY ?? target?.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (shot.kind === 'push') {
      const c = Math.round(x), r = Math.round(y);
      const targets = state.enemies.filter(e => canTarget('push', e) && Math.round(e.x) === c && Math.round(e.y) === r && Math.hypot(e.x - shot.c, e.y - shot.r) <= TOOLS.push.range);
      for (const enemy of targets) hit(state, enemy, shot);
      return;
    }
    // Sample occupants before damage, so split offspring cannot be hit twice.
    const radius = shot.kind === 'cannon' ? TOOLS.cannon.radius : .4;
    const nearby = state.enemies.filter(e => canTarget(shot.kind, e) && Math.hypot(e.x - x, e.y - y) <= radius);
    const distance = e => Math.hypot(e.x - x, e.y - y);
    let contact = null;
    for (const e of nearby) {
      if (distance(e) > .4) continue;
      if (e === target) { contact = e; break; }
      if (!contact || distance(e) < distance(contact)) contact = e;
    }
    if (contact && !hit(state, contact, shot)) return;
    if (shot.kind === 'cannon') {
      effect(state, 'blast', x, y, { radius });
      for (const other of nearby) if (other !== contact) hit(state, other, shot);
    } else if (shot.kind === 'flame') {
      effect(state, 'flare', x, y);
      ignite(state, x, y);
    } else if (contact) {
      effect(state, shot.kind === 'molecular' ? 'molecular' : 'spark', x, y,
        { lift: shot.lift ?? 0, angle: shot.angle ?? 0 });
    }
  }
  function enemyLift(enemy, time) {
    if (enemy.leap) return Math.sin(Math.PI * Math.min(1, enemy.leap.age / enemy.leap.duration)) * 50;
    return enemy.kind === 'flyer' ? 12 + Math.sin(time * 8 + enemy.id) * 2 : 0;
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
      let remaining = p.length * eased;
      for (let i = 1; i < p.points.length; i++) {
        const a = p.points[i - 1], b = p.points[i], length = Math.hypot(b.x - a.x, b.y - a.y);
        const progress = Math.min(1, remaining / length);
        enemy.x = a.x + (b.x - a.x) * progress; enemy.y = a.y + (b.y - a.y) * progress;
        if (remaining <= length) break;
        remaining -= length;
      }
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
      const plan = travelRoute(state, enemy.c, enemy.r);
      if (plan.path.length < 2) return;
      const next = plan.path[1], obstacle = at(state, next.c, next.r);
      if (obstacle) {
        if (enemy.attackId !== obstacle.id) { enemy.attackId = obstacle.id; enemy.attackClock = 0.65; }
        enemy.attackClock -= dt;
        if (enemy.attackClock <= 0) {
          enemy.attackClock += 0.65; obstacle.hp--;
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
    if (!isAdvancing(state) || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05);
    state.time += dt;
    state.spawnClock -= dt;
    if (state.queue.length && state.spawnClock <= 0) {
      const item = state.queue.shift();
      if (Number.isInteger(item.wave)) state.wave = item.wave;
      spawn(state, item.kind, item.hp, item.row, item.position);
      state.spawnClock += LEVELS[state.level].spawnInterval;
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
      b.flash = Math.max(0, b.flash - dt / RECOIL_SECONDS);
      if (b.kind === 'wall') continue;
      const tool = TOOLS[b.kind]; b.cooldown -= dt;
      // Acquire the next target only after this tower's previous projectile has
      // resolved, so the priority sees the HP remaining after its own damage.
      if (tool.aimSeconds && state.shots.some(s => s.tower === b.id)) continue;
      const inRange = state.enemies.filter(e => canTarget(b.kind, e) && Math.hypot(e.x - b.c, e.y - b.r) <= tool.range);
      inRange.sort((a, z) => (tool.priority === 'highestHp' ? z.hp - a.hp : tool.priority === 'nearest' ? Math.hypot(a.x - b.c, a.y - b.r) - Math.hypot(z.x - b.c, z.y - b.r) : 0) ||
        (a.x + Math.abs(a.y - GOAL.r)) - (z.x + Math.abs(z.y - GOAL.r)) || a.id - z.id);
      let target = inRange[0];
      if (tool.aimSeconds) {
        // Keep tracking the same enemy. Losing it restarts the full aim time;
        // a newly arrived high-HP enemy cannot steal an existing lock.
        const locked = inRange.find(e => e.id === b.aim?.target);
        if (locked) target = locked;
        else b.aim = target ? { target: target.id, age: 0 } : null;
        if (b.aim) b.aim.age += dt;
      }
      if (!target) { b.cooldown = Math.max(0, b.cooldown); continue; }
      b.angle = Math.atan2(target.y - b.r, target.x - b.c) * 180 / Math.PI;
      if (tool.aimSeconds ? b.aim.age >= tool.aimSeconds * BATTLE_SPEED - 1e-9 : b.cooldown <= 0) {
        if (tool.aimSeconds) { b.aim = null; b.cooldown = 0; }
        else b.cooldown += BATTLE_SPEED / tool.rate;
        b.flash = 1;
        const source = { tower: b.id, target: target.id, c: b.c, r: b.r, kind: b.kind, angle: b.angle };
        if (b.kind === 'frost' || b.kind === 'pierce') resolveShot(state, source);
        else {
          const tip = impactPoint(target, source);
          state.shots.push({ ...source, id: state.nextId++, impactX: target.x, impactY: target.y,
            tipX: tip.x, tipY: tip.y, lift: enemyLift(target, state.time), age: 0, duration: 0.2 });
        }
      }
    }
    for (const shot of state.shots) {
      shot.age += dt;
      if (shot.age >= shot.duration) resolveShot(state, shot);
    }
    state.shots = state.shots.filter(s => s.age < s.duration);
    updateFires(state, dt);
    state.enemies = state.enemies.filter(e => !e.dead);
    for (const e of state.effects) e.life -= dt;
    state.effects = state.effects.filter(e => e.life > 0);
    if (!state.queue.length && !state.enemies.length && !state.shots.length) {
      state.lastReward = LEVELS[state.level].reward;
      state.money += state.lastReward;
      state.undo = []; state.checkpoint = null; state.revision++;
      for (const b of state.buildings) b.aim = null;
      if (state.level === LEVELS.length - 1) { state.completed = true; state.phase = 'won'; }
      else { state.level++; state.wave = 0; state.hearts = 5; state.rngState = stageSeed(state.level); state.phase = 'planning'; clearEntrances(state); }
      // Surviving buildings and funds carry over; each new stage heals the home.
      // The last fire
      // remains visible during deployment, then clears when the player starts.
    }
  }
  return { COLS, ROWS, BATTLE_SPEED, RECOIL_SECONDS, SPAWN_INTERVAL, GOAL, TOOLS, ENEMIES, LEVELS, key, terrain, at, entrances, isEntrance, findPath, route, previews,
    createState, canBuild, build, remove, undo, snapshot, restore, startWave, retry, isAdvancing, togglePause, spawn, canTarget, shieldBlocks, enemyArtScale, enemyLift, impactPoint, hit, pushEnemy, ignite, updateFires, resolveShot, jumpLanding, startLeap, step };
});
