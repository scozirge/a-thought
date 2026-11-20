const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../core.js');
const layouts = require('./layouts.cjs');
const advance = (s, seconds) => { for (let i = 0; i < Math.round(seconds * 60); i++) G.step(s, 1 / 60); };
const finish = s => { for (let i = 0; i < 12000 && s.phase === 'running'; i++) G.step(s, 1 / 60); };
const deploy = (s, layout) => {
  for (const b of [...s.buildings]) if (!layout.some(p => p[0] === b.kind && p[1] === b.c && p[2] === b.r)) assert.equal(G.remove(s, b.c, b.r).ok, true);
  for (const p of layout) if (!G.at(s, p[1], p[2])) assert.equal(G.build(s, ...p).ok, true, `第 ${s.level + 1} 關預算不足：${p}`);
};

test('十個主線關卡各一波，隱藏關有三段攻勢；各關數量、總血量與預算遞增', () => {
  assert.equal(G.BONUS_LEVEL, 10);
  assert.equal(G.LEVELS.length, 11);
  let budget = G.LEVELS[0].money, hp = 0, count = 0;
  for (const l of G.LEVELS) {
    assert.equal(l.money, budget); budget += l.reward;
    assert.equal(l.waves.length, l === G.LEVELS[G.BONUS_LEVEL] ? 3 : 1);
    assert.deepEqual(l.rocks, G.LEVELS[0].rocks); assert.deepEqual(l.water, G.LEVELS[0].water);
    const nextHp = l.waves.flat().reduce((n, g) => n + g.hp * g.count, 0), nextCount = l.waves.flat().reduce((n, g) => n + g.count, 0);
    assert.ok(nextHp > hp && nextCount > count); hp = nextHp; count = nextCount;
  }
});

test('依關卡間距出怪，後三關加入上、下方入口，開始只排入當關隊列', () => {
  assert.equal(G.SPAWN_INTERVAL / G.BATTLE_SPEED, 0.25);
  for (let level = 0; level < G.LEVELS.length; level++) {
    const s = G.createState(level), entries = G.entrances(level);
    const before = JSON.stringify(s); advance(s, 20); assert.equal(JSON.stringify(s), before);
    G.startWave(s); assert.equal(s.queue.length, G.LEVELS[level].waves.flat().reduce((n,g) => n + g.count, 0));
    assert.ok(s.queue.every((e,i) => e.position.x === entries[i % entries.length].c && e.position.y === entries[i % entries.length].r));
    if (level === G.BONUS_LEVEL) {
      assert.deepEqual(entries.map(e => e.side).sort(), ['bottom','left','right','top']);
      assert.ok(G.previews(s).every(plan => G.isHome(level, plan.path.at(-1).c, plan.path.at(-1).r)));
    } else assert.ok(entries.every(e=>e.side==='right' || (level>=7 && e.c>=5 && (e.r===0 || e.r===7))));
    const births = [], seen = new Set(), expected = s.queue.slice(0, Math.max(entries.length,3));
    for (let i = 0; i < 600 && births.length < expected.length; i++) {
      G.step(s, 1 / 60);
      for (const e of s.enemies) if (!seen.has(e.id)) {
        seen.add(e.id); births.push(e.bornAt);
        const entry=entries[(births.length-1)%entries.length];
        if (e.kind!==expected[births.length-1].kind) throw Error('出怪順序錯誤');
        assert.equal(e.c,entry.c);assert.equal(e.r,entry.r);
        assert.ok(Math.hypot(e.x-entry.c,e.y-entry.r)<0.03);
      }
    }
    assert.equal(births.length, expected.length);
    births.forEach((t,i) => assert.ok(Math.abs(t - G.SPAWN_INTERVAL - i * G.LEVELS[level].spawnInterval) <= 1 / 60 + 1e-7));
  }
});

test('同關蟲種交界持續出怪，不清除火焰、冷卻、子彈或建築損傷', () => {
  const s = G.createState(); G.build(s, 'pea', 2, 0); G.build(s, 'wall', 7, 0); G.startWave(s);
  const firstCount = G.LEVELS[0].waves[0][0].count;
  advance(s, G.SPAWN_INTERVAL + G.LEVELS[0].spawnInterval * firstCount - 1 / 60);
  G.ignite(s, 9, 7); const fireId = s.fires[0].id, money = s.money;
  const tower = G.at(s, 2, 0), wall = G.at(s, 7, 0); tower.cooldown = 2; wall.hp = 1;
  const target = s.enemies.at(-1);
  s.shots.push({ id: s.nextId++, kind: 'flame', target: target.id, c: 2, r: 5, impactX: target.x, impactY: target.y, age: 0, duration: 0.5 });
  advance(s, 2 / 60);
  assert.equal(s.level, 0); assert.equal(s.phase, 'running'); assert.equal(s.enemies.at(-1).kind, 'bug');
  assert.equal(s.fires[0].id, fireId); assert.ok(s.fires[0].life > 4);
  assert.equal(s.shots.length, 1); assert.ok(tower.cooldown > 1); assert.equal(wall.hp, 1); assert.equal(s.money, money);
});

test('戰鬥與暫停不能建造、拆塔或撤回；暫停凍結所有狀態', () => {
  const s = G.createState(); G.build(s, 'wall', 7, 0); G.startWave(s); advance(s, 3);
  for (const paused of [false, true]) {
    if (paused) G.togglePause(s);
    const before = JSON.stringify(s);
    assert.equal(G.build(s, 'wall', 7, 2).ok, false); assert.equal(G.remove(s, 7, 0).ok, false); assert.equal(G.undo(s), false);
    assert.equal(JSON.stringify(s), before);
  }
  const before = JSON.stringify(s); advance(s, 30); assert.equal(JSON.stringify(s), before);
  G.togglePause(s); advance(s, 0.2); assert.equal(s.phase, 'running');
});

test('過關只發一次固定獎金，保留塔的身分、位置與耐久，小屋補滿生命後進入下一關部署', () => {
  const s = G.createState(); deploy(s, layouts[0]); s.hearts = 4; s.buildings[0].hp = 1;
  const before = s.buildings.map(({id,kind,c,r,hp}) => ({id,kind,c,r,hp})), money = s.money;
  G.startWave(s); finish(s);
  assert.equal(s.level, 1); assert.equal(s.phase, 'planning'); assert.equal(s.hearts, 5);
  assert.deepEqual(s.buildings.map(({id,kind,c,r,hp}) => ({id,kind,c,r,hp})), before);
  assert.equal(s.money, money + G.LEVELS[0].reward); assert.equal(s.lastReward, G.LEVELS[0].reward);
  assert.equal(s.queue.length, 0); assert.equal(s.enemies.length, 0); assert.equal(s.checkpoint, null); assert.equal(s.undo.length, 0);
  const idle = JSON.stringify(s); advance(s, 100); assert.equal(JSON.stringify(s), idle);
  const restored = G.restore(G.snapshot(s)); assert.equal(restored.level, 1); assert.equal(restored.money, s.money);
  advance(restored, 100); assert.equal(restored.money, s.money);
});

test('關間部署可單獨拆除舊塔全額退款並撤回，按開始才出下一關怪物', () => {
  const s = G.createState(); deploy(s, layouts[0]); G.startWave(s); finish(s);
  const tower = s.buildings.find(b => b.kind !== 'wall'), money = s.money, id = tower.id;
  assert.equal(G.remove(s, tower.c, tower.r).ok, true); assert.equal(s.money, money + G.TOOLS[tower.kind].cost);
  assert.ok(!s.buildings.some(b => b.id === id)); G.undo(s); assert.equal(s.money, money); assert.ok(s.buildings.some(b => b.id === id));
  const before = JSON.stringify(s); advance(s, 30); assert.equal(JSON.stringify(s), before);
  G.startWave(s); assert.equal(s.phase, 'running'); assert.equal(s.level, 1); assert.equal(s.fires.length, 0);
  assert.equal(s.queue.length, G.LEVELS[1].waves.flat().reduce((n,g) => n + g.count, 0));
  assert.equal(G.startWave(s), false); advance(s, 0.5); assert.ok(s.enemies.length > 0);
});

test('十關可用正常累積獎金連續通關，關間可退款重佈，保留未拆除的牆', () => {
  assert.equal(layouts.length, 11); const s = G.createState(); let shared = 0;
  for (let level = 0; level < 10; level++) {
    assert.equal(s.level, level); assert.equal(s.phase, 'planning'); assert.equal(s.hearts, 5); const ids = new Set(s.buildings.map(b => b.id));
    // Use the same full-refund action available to players to replace damaged
    // walls before the next stage; intact walls retain their identity.
    for (const b of [...s.buildings]) if (b.kind !== 'wall' || b.hp < G.TOOLS[b.kind].hp) G.remove(s, b.c, b.r);
    deploy(s, layouts[level]); shared += s.buildings.filter(b => ids.has(b.id)).length;
    const money = s.money;
    const invested = s.buildings.reduce((sum,b) => sum + b.paidCost, 0);
    G.startWave(s); finish(s);
    assert.ok(s.hearts > 0, `第 ${level + 1} 關`);
    const survivingValue = s.buildings.reduce((sum,b) => sum + b.paidCost, 0);
    assert.equal(s.money + survivingValue, money + invested + G.LEVELS[level].reward);
    assert.equal(s.phase, level === 9 ? 'won' : 'planning');
  }
  assert.ok(shared > 0); assert.equal(s.completed, true);
  const saved = G.snapshot(s), restored = G.restore(saved); assert.equal(restored.phase, 'won'); assert.equal(restored.level, 9);
  const before = JSON.stringify(restored); advance(restored, 100); assert.equal(JSON.stringify(restored), before); assert.equal(G.startWave(restored), false);
});

test('失敗重試回到當關部署，保留前關成果；不重領獎金也不回到第一關', () => {
  const s = G.createState(4); G.build(s, 'wall', 7, 0);
  const prepared = G.snapshot(s); G.startWave(s); finish(s);
  assert.equal(s.phase, 'lost'); assert.equal(s.money, prepared.money);
  const before = JSON.stringify(s); advance(s, 100); assert.equal(JSON.stringify(s), before);
  const retry = G.retry(s); assert.equal(retry.level, 4); assert.equal(retry.phase, 'planning');
  assert.equal(retry.buildings[0].lastDamage, 0);
  prepared.buildings[0].lastDamage = 0;
  assert.deepEqual(G.snapshot(retry), prepared); assert.equal(retry.hearts, 5);
});

test('普通雙塔和窮舉找到的舊版冰砲組合都守不住三路開局', () => {
  const cannon = ['cannon',1,5], frost = ['frost',1,3];
  for (const layout of [[], [['pea',5,4],['pea',8,4]], [cannon,frost], [frost,cannon]]) {
    const state = G.createState();
    deploy(state,layout);
    G.startWave(state); finish(state);
    assert.equal(state.phase,'lost');
  }
});

test('預算內解答能完成混合防線，少建火力會降低通關數', () => {
  const previous = [42,52,64,76,90,104,120,136,154,182], wins = [0,0];
  for (const level of [4,7,9]) {
    for (let mode = 0; mode < 2; mode++) {
      const s = G.createState(level); if (mode === 0) s.money = previous[level];
      for (const placement of layouts[level]) {
        const result=G.build(s,...placement); if(mode===1)assert.equal(result.ok,true);
      }
      G.startWave(s); finish(s); if (s.phase !== 'lost') wins[mode]++;
    }
  }
  assert.ok(wins[1] > wins[0], `舊預算通關 ${wins[0]}，新預算通關 ${wins[1]}`);
});

test('第五至十關的解答要靠牆延長路線，同樣數量的牆若沒有延長路線就會失守', () => {
  for (let level = 4; level < G.BONUS_LEVEL; level++) {
    const full = G.createState(level), misplaced = G.createState(level);
    const layout = layouts[level];
    for (const p of layout) {
      assert.ok(G.build(full, ...p).ok);
      if (p[0] !== 'wall') assert.ok(G.build(misplaced, ...p).ok);
    }
    const short = G.previews(misplaced);
    const long = G.previews(full);
    assert.ok(long.every(route => !route.breaking));
    const gain = long.reduce((total, route, i) => total + route.path.length - short[i].path.length, 0);
    assert.ok(gain / long.length >= 4, `第 ${level+1} 關的石牆要延長地面路線`);
    const distances = short.map(route => route.path.length);
    let remaining = layout.filter(([kind]) => kind === 'wall').length;
    for (let r = 0; r < G.ROWS && remaining; r++) {
      for (let c = 1; c < G.COLS - 1 && remaining; c++) {
        if (!G.build(misplaced,'wall',c,r).ok) continue;
        // Several equally short routes may exist. Keep the wall only if every entrance still has one.
        if (G.previews(misplaced).some((p, i) => p.breaking || p.path.length !== distances[i])) G.remove(misplaced,c,r);
        else remaining--;
      }
    }
    assert.equal(remaining, 0);
    assert.equal(misplaced.money, full.money);
    assert.deepEqual(G.previews(misplaced).map(p => p.path.length), distances);
    G.startWave(misplaced); finish(misplaced);
    assert.equal(misplaced.phase, 'lost', `第 ${level+1} 關亂擺牆不應過關`);
  }
});

test('舊存檔通過第十關即可解鎖，新開局與未過關的存檔仍隱藏', () => {
  const finished = G.snapshot(G.createState(9));
  delete finished.bonusUnlocked;
  for (const version of [6, 9, 10]) {
    assert.equal(G.restore({ ...finished, version, completed: false }).bonusUnlocked, false);
    const legacy = G.restore({ ...finished, version, completed: true });
    assert.equal(legacy.phase, 'won');
    assert.equal(G.restore(G.snapshot(legacy)).bonusUnlocked, true);
    assert.equal(G.restore({ ...finished, version, level: 10, hearts: 1 }), null);
  }
  assert.equal(G.createState().bonusUnlocked, false);
  assert.equal(G.restore({ ...G.snapshot(G.createState(10)), bonusUnlocked: false }), null);
});

test('隱藏關中央小屋有五顆心，空盤失守後可重試，解答能守住三段攻勢', () => {
  const s = G.createState(10);
  assert.equal(s.money, 250);
  assert.equal(s.hearts, 5);
  G.startWave(s); finish(s);
  assert.equal(s.phase, 'lost');
  assert.equal(G.retry(s).hearts, 5);
  const challenge = require('../solutions.js').create(10);
  G.startWave(challenge); finish(challenge);
  assert.equal(challenge.wave, 2);
  assert.equal(challenge.phase, 'won');
  assert.ok(challenge.hearts > 0 && challenge.hearts <= 5);
  assert.equal(G.restore(G.snapshot(challenge)).phase, 'won');
});

test('隱藏關移除導引石牆或撤掉雷射火力，這套解答就會失守', () => {
  const answer = layouts[G.BONUS_LEVEL];
  const plans = [
    answer.filter(([kind]) => kind !== 'wall'),
    answer.map(([kind, c, r]) => [kind === 'pierce' ? 'wall' : kind, c, r])
  ];
  for (const plan of plans) {
    const s = G.createState(G.BONUS_LEVEL);
    deploy(s, plan); G.startWave(s); finish(s);
    assert.equal(s.phase, 'lost');
  }
});

test('終關打開兩格捷徑就會失守', () => {
  const open = G.createState(9);
  deploy(open, layouts[9]);
  assert.ok(G.remove(open,5,5).ok);
  assert.ok(G.remove(open,5,6).ok);
  G.startWave(open); finish(open);
  assert.equal(open.phase,'lost');
});

test('後兩關解答的雷射能一次貫穿多隻蟲，終關分子砲會對巨蟲發射電漿', () => {
  for (const level of [8, 9]) {
    const s = G.createState(level);
    deploy(s, layouts[level]);
    G.startWave(s);
    let piercedGroup = false, firedAtGiant = false;
    for (let tick = 0; tick < 12000 && s.phase === 'running'; tick++) {
      G.step(s, 1 / 60);
      piercedGroup ||= s.effects.some(e => e.kind === 'laser' && e.hitDistances.length >= 3);
      firedAtGiant ||= s.shots.some(shot => shot.kind === 'molecular' &&
        s.enemies.some(e => e.id === shot.target && e.kind === 'giant'));
    }
    assert.ok(piercedGroup, `第 ${level + 1} 關雷射要打到成排的蟲`);
    if (level === 9) assert.ok(firedAtGiant, '終關分子砲要實際向巨蟲開火');
    assert.equal(s.phase, level === 9 ? 'won' : 'planning');
  }
});

test('只把第八關的分子砲或第九關的雷射砲換成石牆，路線相同但現有火力會失守', () => {
  for (const [level, kind] of [[7, 'molecular'], [8, 'pierce']]) {
    const answer = G.createState(level), without = G.createState(level);
    deploy(answer, layouts[level]);
    deploy(without, layouts[level].map(([k,c,r]) => [k === kind ? 'wall' : k,c,r]));
    assert.deepEqual(G.previews(without), G.previews(answer));
    G.startWave(without); finish(without);
    assert.equal(without.phase, 'lost', `第 ${level + 1} 關`);
  }
});

test('上版花完預算的無牆通關陣形守不住新版終關', () => {
  const towers = [
    ['pea',5,4], ['flame',2,3], ['molecular',9,5], ['frost',6,2], ['cannon',8,2],
    ['flame',7,3], ['flame',6,3], ['pea',7,4], ['flame',7,5], ['pea',8,3],
    ['pea',5,2], ['pea',2,2], ['cannon',7,2], ['push',5,1], ['pea',9,2],
    ['frost',3,2], ['pea',10,3], ['pea',3,3], ['cannon',5,3], ['pea',4,7],
    ['pea',4,6], ['pea',5,5], ['pea',3,1], ['pea',2,1], ['push',5,6],
    ['push',3,0], ['pea',3,6], ['cannon',9,4], ['cannon',7,0], ['pea',10,0],
    ['pea',8,0],
  ];
  const state = G.createState(9);
  for (const placement of towers) assert.ok(G.build(state, ...placement).ok);
  assert.equal(state.money, 4, '分子砲降價後多出四枚金幣');
  G.startWave(state);
  for (let tick = 0; state.phase === 'running' && tick < 14400; tick++) G.step(state, 1 / 60);
  assert.equal(state.phase, 'lost');
  assert.equal(state.hearts, 0);
});

test('第九版七種砲塔及石牆照實付價格退款，新造的塔使用新版售價', () => {
  const prices = { pea: 4, cannon: 12, frost: 8, flame: 8, pierce: 12, push: 16, molecular: 32, wall: 1 };
  for (const [kind, paidCost] of Object.entries(prices)) {
    const data = G.snapshot(G.createState());
    data.version = 9;
    data.money -= paidCost;
    data.buildings = [{ kind, c: 5, r: 4, paidCost, hp: G.TOOLS[kind].hp }];
    const state = G.restore(G.snapshot(G.restore(data)));
    assert.equal(state.money, 48 - paidCost);
    assert.ok(G.remove(state, 5, 4).ok);
    assert.equal(state.money, 48);
    assert.ok(G.build(state, kind, 5, 4).ok);
    assert.equal(state.money, 48 - G.TOOLS[kind].cost);
  }
});

test('調價前的塔保留原購買價，拆塔、撤回、讀檔與重試都不改退款', () => {
  const prices={pea:6,cannon:9,frost:8,flame:10,pierce:10,push:9,molecular:14,wall:1};
  for(const [kind,oldCost] of Object.entries(prices)) {
    const s=G.createState(); G.build(s,kind,6,5);
    const data={...G.snapshot(s),version:7,money:60-oldCost}; delete data.buildings[0].paidCost;
    let restored=G.restore(data); assert.equal(restored.buildings[0].paidCost,oldCost);
    restored=G.restore(G.snapshot(restored)); G.startWave(restored); restored=G.retry(restored);
    assert.equal(restored.buildings[0].paidCost,oldCost); assert.equal(restored.money,48-oldCost);
    G.remove(restored,6,5); assert.equal(restored.money,48);
    G.undo(restored); assert.equal(restored.money,48-oldCost); assert.equal(restored.buildings[0].paidCost,oldCost);
    G.remove(restored,6,5); G.build(restored,kind,6,5);
    assert.equal(restored.buildings[0].paidCost,G.TOOLS[kind].cost);
    restored=G.restore(G.snapshot(restored)); G.remove(restored,6,5); assert.equal(restored.money,48);
  }
  const invalid=G.createState(); G.build(invalid,'molecular',3,4);
  const save=G.snapshot(invalid); save.buildings[0].paidCost=1000; assert.equal(G.restore(save),null);
});

test('第六版十關存檔補足已累積資金一次，保留塔與關卡並補滿部署生命，完成存檔不重領', () => {
  const previous = [42,52,64,76,90,104,120,136,154,182];
  assert.equal(G.LEVELS[0].money,48); assert.equal(G.LEVELS[9].money,226);
  assert.deepEqual(G.LEVELS.map(l=>l.reward),[12,14,14,16,18,20,24,24,36,24,0]);
  for (let level = 0; level < 10; level++) for (const completed of level === 9 ? [false,true] : [false]) {
    const s = G.createState(level); G.build(s,'molecular',3,4); s.hearts = 3; s.buildings[0].hp = 2;
    const legacy = {...G.snapshot(s),version:6,money:previous[level]-14+(completed?20:0),completed};
    const restored = G.restore(legacy);
    assert.equal(restored.money,G.LEVELS[level].money-14+(completed?G.LEVELS[level].reward:0));
    assert.equal(restored.level,level); assert.equal(restored.hearts,completed?3:5); assert.equal(restored.buildings[0].hp,2);
    assert.equal(restored.phase,completed?'won':'planning');
    assert.equal(G.restore(G.snapshot(restored)).money,restored.money);
    if (!completed) {G.startWave(restored); const retried=G.retry(restored);assert.equal(retried.money,restored.money);}
  }
});

test('舊存檔保留盤面、調整金錢，不延續舊子波次；新版不重複調整', () => {
  for (let level = 0; level < 3; level++) {
    const s = G.createState(level); G.build(s, 'pea', 8, 5);
    for (const version of [4,5]) {
      const data = { ...G.snapshot(s), version, wave: 3, money: 10, autoWaveTime: 5, autoWavePaused: true };
      const restored = G.restore(data);
      assert.equal(restored.money, Math.max(0,10 + (version === 4 ? [38,55,72][level] : 0) + G.LEVELS[level].money - [60,75,93][level]));
      assert.equal(restored.level, level); assert.equal(restored.wave, 0); assert.equal(restored.buildings.length, 1);
      assert.equal(Object.hasOwn(restored, 'autoWaveTime'), false);
      assert.equal(G.restore(G.snapshot(restored)).money, restored.money);
    }
  }
  assert.equal(G.restore({...G.snapshot(G.createState()),completed:true}), null);
});

test('新版降低閒置資金一次，保留買好的塔，讀檔及重試不再扣款', () => {
  const oldBudgets=[60,75,93,111,132,153,177,201,228,270];
  for(let level=0;level<10;level++) {
    const s=G.createState(level);G.build(s,'pea',5,3);
    const old={...G.snapshot(s),version:8,money:oldBudgets[level]-4}; old.buildings[0].paidCost=4;
    const current=G.restore(old);assert.equal(current.money,G.LEVELS[level].money-4);
    assert.equal(current.buildings.length,1);assert.equal(current.buildings[0].paidCost,4);
    assert.equal(G.restore(G.snapshot(current)).money,current.money);
    G.startWave(current);assert.equal(G.retry(current).money,current.money);
    old.money=0;const spent=G.restore(old);assert.equal(spent.money,0);assert.equal(spent.buildings.length,1);
  }
});

test('後期新增入口不能蓋塔，前關已蓋在新入口的建築全額退款，其他塔保留', () => {
  const s=G.createState(6);G.build(s,'pea',8,0);G.build(s,'wall',10,7);G.build(s,'frost',5,5);
  const original=s.buildings[2],money=s.money;s.phase='running';G.step(s,1/60);
  assert.equal(s.level,7);assert.equal(s.money,money+G.LEVELS[6].reward+G.TOOLS.pea.cost+1);
  assert.deepEqual(s.buildings,[original]);
  assert.equal(G.build(s,'wall',8,0).ok,false);assert.equal(G.build(s,'wall',10,7).ok,false);
  assert.equal(G.build(s,'wall',9,0).ok,true);
  const late=G.createState(7);G.build(late,'pea',9,0);const old=G.snapshot(late);
  old.version=8;old.buildings[0].c=8;old.buildings[0].paidCost=4;old.money=201-4;
  const migrated=G.restore(old);assert.equal(migrated.money,G.LEVELS[7].money);assert.equal(migrated.buildings.length,0);
  old.version=9;old.money=G.LEVELS[7].money-4;
  assert.equal(G.restore(old).money,G.LEVELS[7].money); assert.equal(G.restore(old).buildings.length,0);
  old.version=10;assert.equal(G.restore(old),null);
});

test('四面守園保護中央格，舊盤面搬家會退還原價與晶石且只退一次', () => {
  const level=G.BONUS_LEVEL, s=G.createState(level), goal=G.LEVELS[level].goal;
  assert.deepEqual(goal,{c:5,r:3});
  assert.equal(G.build(s,'pea',5,3).ok,false);
  const old=G.snapshot(s); old.version=13; old.hearts=1; old.money-=27; old.upgradeItems=0;
  old.buildings=[
    {kind:'molecular',c:5,r:3,hp:5,paidCost:22,upgraded:true,lastDamage:30},
    {kind:'pea',c:5,r:7,hp:5,paidCost:5,upgraded:false,lastDamage:1}
  ];
  const migrated=G.restore(old);
  assert.equal(migrated.hearts,5); assert.equal(migrated.money,250);
  assert.equal(migrated.upgradeItems,10); assert.equal(migrated.buildings.length,0);
  assert.equal(G.restore(G.snapshot(migrated)).upgradeItems,10);
  assert.equal(G.restore(G.snapshot(migrated)).money,250);
  s.phase='running';
  for (const entry of G.entrances(level)) G.spawn(s,'flyer',5,entry.r,{x:entry.c,y:entry.r});
  let homeHits=0;
  while(s.phase==='running') {
    const hearts=s.hearts; G.step(s,1/60);
    if(s.hearts<hearts) {
      const impact=s.effects.find(e=>e.kind==='home' && e.x===goal.c && e.y===goal.r);
      assert.ok(impact);homeHits+=hearts-s.hearts;
    }
  }
  assert.equal(homeHits,4);assert.equal(s.hearts,1);assert.equal(s.phase,'won');
});

test('中央關跳蟲從四面都朝小屋跳，擊退讓飛蟲遠離中央', () => {
  const lvl=G.BONUS_LEVEL, {c,r}=G.LEVELS[lvl].goal;
  for(const entry of G.entrances(lvl)) {
    const s=G.createState(lvl);
    const bug=G.spawn(s,'hopper',10,entry.r,{x:entry.c,y:entry.r});
    const land=G.jumpLanding(s,bug);
    assert.ok(Math.hypot(land.c-c,land.r-r)<Math.hypot(bug.x-c,bug.y-r));
  }
  const s=G.createState(lvl), fly=G.spawn(s,'flyer',10,r,{x:c-2,y:r});
  G.pushEnemy(s,fly);assert.ok(Math.hypot(fly.push.x-c,fly.push.y-r)>2);
});
