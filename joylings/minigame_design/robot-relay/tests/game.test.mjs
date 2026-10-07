import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, STEP_MS, MAX_STEPS, clone, makeRound, makeLobby, transferToHost, formatSteps, submitProgram, advanceRound, solveLevel, simulate, stepRobot, initialRobot } from '../public/game.js';

const team = (children = 2) => [{ id: 'host', isHost: true }, ...Array.from({ length: children }, (_, i) => ({ id: `child-${i}`, isHost: false }))];
const solutionFor = round => { const solution = solveLevel(round.level); return [...solution, ...Array(round.owners.length - solution.length).fill('wait')]; };
const submit = (round, id, solution = solutionFor(round)) => submitProgram(round, id, round.owners.flatMap((owner,i) => owner === id ? [solution[i]] : []), round.roundId);

test('等待區未分配，單人開始能獨自完成全部指令', () => {
  const lobby = makeLobby(LEVELS[0], team(0)[0]);
  assert.equal(lobby.phase, 'lobby');
  assert.deepEqual(lobby.owners, []);
  assert.throws(() => submitProgram(lobby, 'host', [], lobby.roundId));
  const round = makeRound(lobby.level, team(0));
  assert.equal(round.participants.length, 1);
  assert.ok(round.owners.every(id => id === 'host'));
  assert.equal(submit(round, 'host'), true);
  while (round.phase === 'playing') advanceRound(round);
  assert.equal(round.success, true);
});

test('四張小地圖只需 6～8 步，先拿劍、再打怪、最後到出口', () => {
  const lengths = [];
  for (const level of LEVELS) {
    const solution = solveLevel(level), result = simulate(level, solution);
    assert.ok(solution.indexOf('take') < solution.indexOf('attack'));
    assert.equal(result.success, true, level.name);
    assert.equal(result.frames.length, solution.length);
    assert.equal(result.robot.hasSword, true);
    assert.equal(result.robot.monsterDefeated, true);
    assert.equal(result.robot.escaped, true);
    lengths.push(solution.length);
    assert.equal(level.size,4);
    assert.equal(makeRound(level,team(0)).owners.length,solution.length);
  }
  assert.deepEqual(lengths, [6,7,8,8]);
});

test('1 到 7 人都能參與、總共不超過 8 步；隊員每人 1～2 格，其餘歸房主', () => {
  for (const level of LEVELS) for (const perPlayer of [1,2]) for (let n=0; n<=6; n++) {
    const members=team(n), round=makeRound(level,members,perPlayer);
    assert.ok(round.owners.length<=MAX_STEPS);
    for (const child of members.filter(m=>!m.isHost)) {
      const count=round.owners.filter(id=>id===child.id).length;
      assert.ok(count>=1&&count<=perPlayer);
    }
    assert.equal(round.owners.at(-1),'host');
    for (const m of members) submit(round,m.id);
    while(round.phase==='playing')advanceRound(round);
    assert.equal(round.success,true);
  }
});

test('全員送交後播放，拒絕舊題、陌生人、不合法指令、重複送交', () => {
  const round=makeRound(LEVELS[0],team());
  assert.throws(()=>submitProgram(round,'child-0',['right'],1));
  assert.throws(()=>submitProgram(round,'child-0',['right','__proto__'],1));
  assert.throws(()=>submitProgram(round,'child-0',['right','right'],0));
  assert.throws(()=>submitProgram(round,'stranger',[],1));
  assert.equal(submit(round,'host'),false);
  assert.equal(submit(round,'child-1'),false);
  assert.equal(round.playIndex,-1);
  assert.throws(()=>submit(round,'host'));
  assert.equal(submit(round,'child-0'),true);
  assert.deepEqual(round.commands,solveLevel(LEVELS[0]));
  while(round.phase==='playing')advanceRound(round);
  assert.equal(round.success,true);
});

test('踢人只讓房主接手，其餘編號與答案不變；播放中不改分工', () => {
  const round=makeRound(LEVELS[0],team()), solution=solutionFor(round);
  submit(round,'child-1');submit(round,'host');
  assert.equal(transferToHost(round,'child-0','host'),true);
  assert.deepEqual(round.owners.slice(0,4),['host','host','child-1','child-1']);
  assert.deepEqual(round.submitted,['child-1']);
  assert.deepEqual(round.seedCommands.slice(2),solution.slice(2));
  assert.equal(formatSteps([0,1,4,5,6,7]),'1–2、5–8');
  submit(round,'host');
  const before=clone(round);
  assert.equal(transferToHost(round,'child-1','host'),false);
  assert.deepEqual(clone(round),before);
  while(round.phase==='playing')advanceRound(round);
  assert.equal(round.success,true);
});

test('沒有劍、離怪物太遠、斜角攻擊都不行；怪物與未開出口擋路', () => {
  const level=LEVELS[0], hero=initialRobot(level);
  assert.throws(()=>stepRobot(level,hero,'constructor'),/未知指令/);
  assert.match(stepRobot(level,hero,'attack').message,/先拿到劍/);
  assert.equal(stepRobot(level,hero,'take').ok,false);
  assert.equal(stepRobot(level,{...hero,hasSword:true},'attack').ok,false);
  assert.equal(stepRobot(level,{...hero,hasSword:true,position:[1,3]},'attack').ok,false);
  const adjacent={...hero,position:[1,2],hasSword:true};
  assert.equal(stepRobot(level,adjacent,'right').ok,false);
  const attack=stepRobot(level,adjacent,'attack');
  assert.equal(attack.ok,true);
  assert.equal(stepRobot(level,attack.robot,'right').ok,true);
  const aboveGoal={...hero,position:[2,0],hasSword:true};
  assert.equal(stepRobot(level,aboveGoal,'down').ok,false);
  assert.match(stepRobot(level,aboveGoal,'down').message,/出口還沒打開/);
});

test('撞牆與越界停在原位，不會略過失敗繼續走', () => {
  const level=LEVELS[0], initial=initialRobot(level);
  for (const command of ['left','down']) {
    const result=stepRobot(level,initial,command);
    assert.equal(result.ok,false); assert.deepEqual(result.robot.position,level.start);
  }
  const result=simulate(level,['up','up','right']);
  assert.equal(result.frames.length,2);
  assert.match(result.frames[1].message,/石牆/);
});

test('失敗立即清空所有選項、送交名單與草稿種子，仍保留出錯位置', () => {
  for (const command of ['left','wait']) {
    const round=makeRound(LEVELS[0],team(0));
    const program=Array(round.owners.length).fill(command);
    round.seedCommands=[...program];
    submitProgram(round,'host',program,round.roundId);
    while(round.phase==='playing')advanceRound(round);
    assert.equal(round.success,false);
    assert.ok(round.commands.every(c=>c===null));
    assert.deepEqual(round.submitted,[]);
    assert.equal(round.seedCommands,undefined);
    assert.deepEqual(round.robot.position,round.level.start);
    assert.ok(round.message.length>5);
    assert.ok(makeRound(round.level,team(0),2,round.roundId+1).commands.every(c=>c===null));
  }
});

test('每步半秒，可暫停；通關後的等待仍照指令執行', () => {
  assert.equal(STEP_MS,500);
  const members=team(6), round=makeRound(LEVELS[0],members);
  for (const m of members) submit(round,m.id);
  round.paused=true;
  assert.equal(advanceRound(round),false);assert.equal(round.playIndex,-1);
  round.paused=false;
  for(let i=0;i<solveLevel(round.level).length;i++)advanceRound(round);
  assert.equal(round.robot.escaped,true);assert.equal(round.phase,'playing');
  advanceRound(round);
  assert.equal(round.success,true);assert.equal(round.playIndex,6);
});

test('自訂地圖拒絕重疊、無解、非法座標；可用不同路線通關', () => {
  const invalid=clone(LEVELS[0]);invalid.sword=invalid.start;
  assert.throws(()=>makeRound(invalid,team()),/不同格/);
  const trapped=clone(LEVELS[0]);trapped.sword=[3,3];trapped.walls=[[0,2],[1,3]];
  assert.equal(solveLevel(trapped),null);assert.throws(()=>makeRound(trapped,team()),/留一條/);
  const bounds=clone(LEVELS[0]);bounds.monster=[4,0];assert.throws(()=>solveLevel(bounds),/位置/);
  const alternate=clone(LEVELS[0]);alternate.walls=[];
  assert.equal(simulate(alternate,['right','take','right','attack','up','up']).success,true);
});

test('自訂題目超過 8 步不能開題，也不能先建立等待區', () => {
  const longLevel={name:'太長的路',size:5,start:[0,4],sword:[2,4],monster:[4,2],goal:[4,1],walls:[]};
  assert.equal(solveLevel(longLevel).length,9);
  assert.throws(()=>makeRound(longLevel,team()),/8 步以內/);
  assert.throws(()=>makeLobby(longLevel,team(0)[0]),/8 步以內/);
});
