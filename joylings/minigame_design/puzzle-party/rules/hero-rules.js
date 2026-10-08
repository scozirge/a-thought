// 沿用 ../robot-relay/public/game.js 的單人規則，來源 62deeaf。
// 基本判定沿用原版；擴充成對傳送門與公開時序的怪物移動、噴火。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HeroRules = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
'use strict';
const COMMANDS = {
  up: { label: '向上', icon: '↑', kind: 'move' },
  right: { label: '向右', icon: '→', kind: 'move' },
  down: { label: '向下', icon: '↓', kind: 'move' },
  left: { label: '向左', icon: '←', kind: 'move' },
  take: { label: '拿劍', icon: '⚔', kind: 'action' },
  attack: { label: '攻擊', icon: '✦', kind: 'action' },
  wait: { label: '等待', icon: 'Ⅱ', kind: 'wait' }
};

const clone = value => JSON.parse(JSON.stringify(value));
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
const DELTA = {up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]};
const monsterAt = (level, robot) => robot.monsterPosition || level.monster;
function fireCells(level, origin, direction, range) {
  const cells=[]; let p=origin.slice();
  for(let i=0;i<range;i++) {
    p=p.map((v,j)=>v+DELTA[direction][j]);
    if(p.some(v=>v<0||v>=level.size)||level.walls.some(w=>same(w,p)))break;
    cells.push(p);
  }
  return cells;
}
function forecast(level) {
  let position=level.monster.slice();
  return (level.events||[]).map(event=>{
    const from=position.slice();
    if(event.move)position=position.map((v,i)=>v+DELTA[event.move][i]);
    return {...event,from,to:position.slice(),cells:event.fire?fireCells(level,position,event.fire.direction,event.fire.range):[]};
  });
}
function validateLevel(level) {
  if (!level || ![4, 5, 6].includes(level.size) || typeof level.name !== 'string' || !level.name.trim() || level.name.length > 40) throw new Error('地圖格式不正確。');
  const point = p => Array.isArray(p) && p.length === 2 && p.every(n => Number.isInteger(n) && n >= 0 && n < level.size);
  const objects = [level.start, level.sword, level.monster, level.goal];
  if (!objects.every(point) || !Array.isArray(level.walls) || level.walls.length > level.size ** 2 - 4 || !level.walls.every(point)) throw new Error('地圖的位置不正確。');
  if (new Set(objects.map(p => p.join(','))).size !== 4) throw new Error('起點、寶劍、怪物與出口要放在不同格。');
  if (level.walls.some(w => objects.some(p => same(p, w)))) throw new Error('重要位置不能放障礙物。');
  if (level.portals && (level.portals.length !== 2 || !level.portals.every(point) || same(...level.portals) || level.portals.some(p => [...objects, ...level.walls].some(q => same(p, q))))) throw new Error('傳送門必須是兩個獨立且空白的格子。');
  let previous=0;
  for(const event of level.events||[]) {
    if(!Number.isInteger(event.after)||event.after<1||event.after<=previous||event.after>(level.steps||20)||(!event.move&&!event.fire))throw new Error('怪物時序格式不正確。');
    if(event.move&&!DELTA[event.move])throw new Error('怪物移動方向不正確。');
    if(event.fire&&(!DELTA[event.fire.direction]||!Number.isInteger(event.fire.range)||event.fire.range<1||event.fire.range>level.size))throw new Error('噴火範圍不正確。');
    previous=event.after;
  }
  if(forecast(level).some(e=>!point(e.to)||level.walls.some(w=>same(w,e.to))))throw new Error('怪物路線碰到牆或超出地圖。');
  return true;
}

function initialRobot(level) { return { position: [...level.start], hasSword: false, monsterDefeated: false, escaped: false, failed: false, ...(level.events?.length ? {turn:0,monsterPosition:level.monster.slice()} : {}) }; }
function stepRobot(level, robot, command) {
  const next = clone(robot);
  const monster=monsterAt(level,robot);
  if (!Object.hasOwn(COMMANDS, command)) throw new Error('未知指令。');
  if (next.failed) return { robot: next, message: '先修正前面的指令，再試一次。', ok: false };
  let message = '', teleport = null;
  if (['up', 'right', 'down', 'left'].includes(command)) {
    const delta = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] }[command];
    const target = next.position.map((n, i) => n + delta[i]);
    if (target.some(n => n < 0 || n >= level.size)) message = '走到地圖邊緣了！換個方向試試。';
    else if (level.walls.some(w => same(w, target))) message = '前面有石牆，換條路走吧。';
    else if (same(target, monster) && !next.monsterDefeated) message = '怪物擋住了路！先拿劍，站在牠旁邊攻擊。';
    else if (same(target, level.goal) && !next.monsterDefeated) message = '出口還沒打開，先拿劍打敗怪物。';
    else { next.position = target; message = `${COMMANDS[command].label}走一格。`; }
    if (!same(next.position, target)) next.failed = true;
    if (!next.failed && level.portals) {
      const entrance = level.portals.findIndex(p => same(p, target));
      if (entrance >= 0) {
        next.position = level.portals[1 - entrance].slice();
        teleport = { from: target, to: next.position.slice() };
        message = `${COMMANDS[command].label}走進傳送門，到另一個紫色圈。`;
        if(!next.monsterDefeated&&same(next.position,monster)){next.failed=true;message='傳送的另一端有怪物！要先看牠這一步的位置。';}
      }
    }
  } else if (command === 'take') {
    if (next.hasSword) message = '已經拿到劍了，接著找怪物吧。';
    else if (!same(next.position, level.sword)) message = '這裡沒有寶劍。先走到寶劍那格，再按拿劍。';
    else { next.hasSword = true; message = '拿到寶劍！去找擋路的怪物。'; }
    if (!next.hasSword || robot.hasSword) next.failed = true;
  } else if (command === 'attack') {
    const distance = next.position.reduce((sum, n, i) => sum + Math.abs(n - monster[i]), 0);
    if (!next.hasSword) message = '還沒有寶劍，先拿到劍才能攻擊。';
    else if (next.monsterDefeated) message = '怪物已經逃走了，前往出口吧。';
    else if (distance !== 1) message = '離怪物太遠了。站在牠的上、下、左或右一格再攻擊。';
    else { next.monsterDefeated = true; message = '怪物逃走了！出口打開，繼續前進。'; }
    if (!next.monsterDefeated || robot.monsterDefeated) next.failed = true;
  } else message = '停一格，等一下。我們慢慢來。';
  const effects=[],actionRobot=clone(next);
  if(level.events?.length) {
    next.turn=(robot.turn||0)+1;
    const event=level.events.find(e=>e.after===next.turn);
    if(!next.failed&&event) {
      if(next.monsterDefeated) {
        effects.push({kind:'cancel',after:next.turn,message:`怪物已被擊退，第 ${next.turn} 步後的行動已取消。`});
      } else {
        if(event.move) {
          const from=next.monsterPosition.slice(),to=from.map((v,i)=>v+DELTA[event.move][i]);
          next.monsterPosition=to;
          const hit=same(to,next.position);
          effects.push({kind:'move',after:next.turn,from,to,direction:event.move,hit,message:hit?'怪物走到勇者這格了！要預先避開牠的路線。':`怪物${COMMANDS[event.move].label}走一格。`});
          if(hit)next.failed=true;
        }
        if(event.fire&&!next.failed) {
          const from=next.monsterPosition.slice(),cells=fireCells(level,from,event.fire.direction,event.fire.range),hit=cells.some(p=>same(p,next.position));
          effects.push({kind:'fire',after:next.turn,from,cells,direction:event.fire.direction,hit,message:hit?'勇者停在噴火範圍裡了！換個位置，或等這次火熄了再過。':`怪物${COMMANDS[event.fire.direction].label}噴火，勇者在安全位置。`});
          if(hit)next.failed=true;
        }
      }
      message += ' '+effects.map(e=>e.message).join(' ');
    }
  }
  next.escaped = next.monsterDefeated && same(next.position, level.goal);
  return { robot: next, message, ok: !next.failed, ...(teleport ? { teleport } : {}), ...(level.events?.length?{actionRobot,effects}: {}) };
}

function simulate(level, commands) {
  let robot = initialRobot(level);
  const frames = [];
  for (let i = 0; i < commands.length; i++) {
    const result = stepRobot(level, robot, commands[i]);
    robot = result.robot;
    frames.push({ ...result, index: i, command: commands[i] });
    if (!result.ok) break;
  }
  return { frames, success: robot.escaped && !robot.failed, robot };
}

function solveLevel(level) {
  validateLevel(level);
  const queue = [{ robot: initialRobot(level), path: [] }];
  const seen = new Set();
  for (let i = 0; i < queue.length; i++) {
    const { robot, path } = queue[i];
    if (robot.escaped) return path;
    const key = `${robot.position}:${robot.hasSword}:${robot.monsterDefeated}:${robot.monsterPosition||''}:${Math.min(robot.turn||0,level.events?.at(-1)?.after||0)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    for (const command of Object.keys(COMMANDS).filter(c => c !== 'wait' || level.events?.length)) {
      const { robot: next, ok } = stepRobot(level, robot, command);
      if (ok) queue.push({ robot: next, path: [...path, command] });
    }
  }
  return null;
}


// BFS 同時統計最短解數；不以 7^步數 窮舉全部指令。
function analyzeLevel(level) {
  validateLevel(level);
  const key = r => `${r.position}:${r.hasSword}:${r.monsterDefeated}:${r.monsterPosition||''}:${Math.min(r.turn||0,level.events?.at(-1)?.after||0)}`;
  const first = initialRobot(level);
  const queue = [{ robot: first, depth: 0, path: [] }];
  const distance = new Map([[key(first), 0]]), ways = new Map([[key(first), 1]]);
  let shortest = Infinity, count = 0, solution = null;
  for (let i = 0; i < queue.length; i++) {
    const {robot, depth, path} = queue[i];
    if (depth > shortest) break;
    if (robot.escaped) { shortest = depth; count += ways.get(key(robot)); solution ||= path; continue; }
    for (const command of Object.keys(COMMANDS).filter(c => c !== 'wait' || level.events?.length)) {
      const {robot: next, ok} = stepRobot(level, robot, command);
      if (!ok) continue;
      const k = key(next), nextDepth = depth + 1;
      if (!distance.has(k)) {
        distance.set(k, nextDepth); ways.set(k, ways.get(key(robot)));
        queue.push({robot: next, depth: nextDepth, path: [...path, command]});
      } else if (distance.get(k) === nextDepth) ways.set(k, ways.get(k) + ways.get(key(robot)));
    }
  }
  return {steps: Number.isFinite(shortest) ? shortest : null, count, solution};
}
return {COMMANDS, clone, same, validateLevel, initialRobot, stepRobot, simulate, solveLevel, analyzeLevel, monsterAt, fireCells, forecast};
});
