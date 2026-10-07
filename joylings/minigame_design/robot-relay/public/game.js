export const COMMANDS = {
  up: { label: '向上', icon: '↑', kind: 'move' },
  right: { label: '向右', icon: '→', kind: 'move' },
  down: { label: '向下', icon: '↓', kind: 'move' },
  left: { label: '向左', icon: '←', kind: 'move' },
  take: { label: '拿劍', icon: '⚔', kind: 'action' },
  attack: { label: '攻擊', icon: '✦', kind: 'action' },
  wait: { label: '等待', icon: 'Ⅱ', kind: 'wait' }
};

export const STEP_MS = 500;
export const MAX_STEPS = 8;

export const LEVELS = [
  { id: 'first', name: '森林的入口', difficulty: '先後順序', size: 4, start: [0, 3], sword: [1, 3], monster: [2, 2], goal: [2, 1], walls: [[0, 1], [1, 1], [3, 1], [3, 3]], hint: '先向右拿劍，再走到怪物旁邊攻擊。' },
  { id: 'detour', name: '拿劍再回頭', difficulty: '回頭思考', size: 4, start: [1, 3], sword: [0, 3], monster: [2, 2], goal: [2, 1], walls: [[0, 2], [0, 1], [1, 1], [3, 1]], hint: '先向左拿劍，再回到原來的位置往前走。' },
  { id: 'ruins', name: '繞過小石牆', difficulty: '繞路練習', size: 4, start: [0, 3], sword: [1, 3], monster: [3, 1], goal: [3, 0], walls: [[0, 0], [1, 0], [2, 0], [1, 2]], hint: '拿劍後先往右走，繞過前面的石牆。' },
  { id: 'labyrinth', name: '左邊的城門', difficulty: '換個方向', size: 4, start: [2, 3], sword: [3, 3], monster: [0, 2], goal: [0, 1], walls: [[3, 2], [2, 2], [1, 1]], hint: '先向右拿劍，再往左邊的城門出發。' }
];

export const clone = value => JSON.parse(JSON.stringify(value));
export const same = (a, b) => a[0] === b[0] && a[1] === b[1];
export function validateLevel(level) {
  if (!level || ![4, 5, 6].includes(level.size) || typeof level.name !== 'string' || !level.name.trim() || level.name.length > 40) throw new Error('地圖格式不正確。');
  const point = p => Array.isArray(p) && p.length === 2 && p.every(n => Number.isInteger(n) && n >= 0 && n < level.size);
  const objects = [level.start, level.sword, level.monster, level.goal];
  if (!objects.every(point) || !Array.isArray(level.walls) || level.walls.length > level.size ** 2 - 4 || !level.walls.every(point)) throw new Error('地圖的位置不正確。');
  if (new Set(objects.map(p => p.join(','))).size !== 4) throw new Error('起點、寶劍、怪物與出口要放在不同格。');
  if (level.walls.some(w => objects.some(p => same(p, w)))) throw new Error('重要位置不能放障礙物。');
  return true;
}

export function initialRobot(level) { return { position: [...level.start], hasSword: false, monsterDefeated: false, escaped: false, failed: false }; }
export function stepRobot(level, robot, command) {
  const next = clone(robot);
  if (!Object.hasOwn(COMMANDS, command)) throw new Error('未知指令。');
  if (next.failed) return { robot: next, message: '先修正前面的指令，再試一次。', ok: false };
  let message = '';
  if (['up', 'right', 'down', 'left'].includes(command)) {
    const delta = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] }[command];
    const target = next.position.map((n, i) => n + delta[i]);
    if (target.some(n => n < 0 || n >= level.size)) message = '走到地圖邊緣了！換個方向試試。';
    else if (level.walls.some(w => same(w, target))) message = '前面有石牆，換條路走吧。';
    else if (same(target, level.monster) && !next.monsterDefeated) message = '怪物擋住了路！先拿劍，站在牠旁邊攻擊。';
    else if (same(target, level.goal) && !next.monsterDefeated) message = '出口還沒打開，先拿劍打敗怪物。';
    else { next.position = target; message = `${COMMANDS[command].label}走一格。`; }
    if (!same(next.position, target)) next.failed = true;
  } else if (command === 'take') {
    if (next.hasSword) message = '已經拿到劍了，接著找怪物吧。';
    else if (!same(next.position, level.sword)) message = '這裡沒有寶劍。先走到寶劍那格，再按拿劍。';
    else { next.hasSword = true; message = '拿到寶劍！去找擋路的怪物。'; }
    if (!next.hasSword || robot.hasSword) next.failed = true;
  } else if (command === 'attack') {
    const distance = next.position.reduce((sum, n, i) => sum + Math.abs(n - level.monster[i]), 0);
    if (!next.hasSword) message = '還沒有寶劍，先拿到劍才能攻擊。';
    else if (next.monsterDefeated) message = '怪物已經逃走了，前往出口吧。';
    else if (distance !== 1) message = '離怪物太遠了。站在牠的上、下、左或右一格再攻擊。';
    else { next.monsterDefeated = true; message = '怪物逃走了！出口打開，繼續前進。'; }
    if (!next.monsterDefeated || robot.monsterDefeated) next.failed = true;
  } else message = '停一格，等一下。我們慢慢來。';
  next.escaped = next.monsterDefeated && same(next.position, level.goal);
  return { robot: next, message, ok: !next.failed };
}

export function simulate(level, commands) {
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

export function solveLevel(level) {
  validateLevel(level);
  const queue = [{ robot: initialRobot(level), path: [] }];
  const seen = new Set();
  for (let i = 0; i < queue.length; i++) {
    const { robot, path } = queue[i];
    if (robot.escaped) return path;
    const key = `${robot.position}:${robot.hasSword}:${robot.monsterDefeated}`;
    if (seen.has(key)) continue;
    seen.add(key);
    for (const command of Object.keys(COMMANDS).filter(c => c !== 'wait')) {
      const { robot: next, ok } = stepRobot(level, robot, command);
      if (ok) queue.push({ robot: next, path: [...path, command] });
    }
  }
  return null;
}

export function makeRound(level, members, perPlayer = 2, roundId = 1) {
  validateLevel(level);
  if (![1, 2].includes(perPlayer)) throw new Error('每位隊員可分配 1 或 2 步。');
  const solution = solveLevel(level);
  if (!solution) throw new Error('寶劍、怪物或出口被擋住了，請留一條可以走的路。');
  if (solution.length > MAX_STEPS) throw new Error(`這張地圖有點長，請縮短路線到 ${MAX_STEPS} 步以內。`);
  const children = members.filter(m => !m.isHost);
  const host = members.find(m => m.isHost);
  if (!host) throw new Error('需要一位老師。');
  const count = Math.max(solution.length, members.length);
  if (count > MAX_STEPS || members.length > 7) throw new Error('這個 demo 最多支援 1 位老師與 6 位隊員。');
  // Give every child and the host at least one step without lengthening the puzzle for a two-step preference.
  let remaining = count;
  const owners = children.flatMap((m, i) => {
    const assigned = Math.min(perPlayer, remaining - (children.length - i - 1) - 1);
    remaining -= assigned;
    return Array(assigned).fill(m.id);
  });
  while (owners.length < count) owners.push(host.id);
  return { roundId, level: clone(level), perPlayer, owners, commands: Array(count).fill(null), participants: members.map(({id,name,isHost,color}) => ({id,name,isHost,color})), assignmentVersion: 0, submitted: [], phase: 'editing', playIndex: -1, robot: initialRobot(level), message: '先一起想想路線，再放進自己負責的指令。', success: false, paused: false, lastActiveAt: Date.now() };
}

export function makeLobby(level, host, perPlayer = 2, roundId = 1) {
  const round = makeRound(level, [host], perPlayer, roundId);
  return { ...round, phase: 'lobby', owners: [], commands: [], participants: [], message: '等待房主開始本題。開始時才依在線人數分配，只有房主也可以玩。' };
}

// Removal never reassigns anybody else's steps or restarts a playing round.
export function transferToHost(round, removedId, hostId) {
  if (round.phase !== 'editing' || !round.owners.includes(removedId)) return false;
  round.seedCommands = round.commands.map((command, i) => command ?? round.seedCommands?.[i] ?? null);
  round.owners = round.owners.map(id => id === removedId ? hostId : id);
  round.submitted = round.submitted.filter(id => id !== removedId && id !== hostId);
  round.assignmentVersion++;
  round.message = '離開隊員的步驟已交給房主。其他人的答案保留，請房主補齊後重新送交。';
  return true;
}

export function formatSteps(indices) {
  if (!indices.length) return '';
  const groups = [];
  let start = indices[0], end = start;
  for (const n of indices.slice(1)) {
    if (n === end + 1) end = n;
    else { groups.push(start === end ? `${start + 1}` : `${start + 1}–${end + 1}`); start = end = n; }
  }
  groups.push(start === end ? `${start + 1}` : `${start + 1}–${end + 1}`);
  return groups.join('、');
}

export function submitProgram(round, memberId, commands, roundId) {
  if (round.roundId !== roundId) throw new Error('回合已更新，請使用新的步驟重新送交。');
  if (round.phase !== 'editing') throw new Error('這回合已經開始執行了。');
  if (round.submitted.includes(memberId)) throw new Error('已經送交囉，請等其他隊員。');
  const slots = round.owners.map((owner, i) => owner === memberId ? i : -1).filter(i => i >= 0);
  if (!slots.length || !Array.isArray(commands) || commands.length !== slots.length || commands.some(c => !Object.hasOwn(COMMANDS, c))) throw new Error('請把自己負責的指令都填好。');
  slots.forEach((slot, i) => { round.commands[slot] = commands[i]; });
  round.submitted.push(memberId);
  const ready = [...new Set(round.owners)].every(id => round.submitted.includes(id));
  if (ready) { round.phase = 'playing'; round.message = '指令到齊，冒險開始！'; }
  return ready;
}

export function advanceRound(round) {
  if (round.phase !== 'playing' || round.paused) return false;
  const index = round.playIndex + 1;
  if (index >= round.commands.length) {
    round.phase = 'result'; round.success = false;
    round.message = '指令用完了，還沒抵達出口。再想一條路吧。';
    clearFailedProgram(round);
    return true;
  }
  const { robot, message, ok } = stepRobot(round.level, round.robot, round.commands[index]);
  round.robot = robot; round.playIndex = index; round.message = message;
  if (!ok || index === round.commands.length - 1) {
    round.phase = 'result'; round.success = robot.escaped && ok;
    if (ok && !robot.escaped) round.message = '指令用完了，還沒抵達出口。再想一條路吧。';
    if (round.success) round.message = '成功！拿到寶劍、打敗怪物，冒險通關。';
    else clearFailedProgram(round);
  }
  return true;
}

function clearFailedProgram(round) {
  // Keep the failed position and explanation visible, but never reuse an answer after failure.
  round.commands.fill(null);
  delete round.seedCommands;
  round.submitted = [];
}
