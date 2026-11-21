const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../core.js');
const at = (s, kind, x, y, hp) => G.spawn(s, kind, hp, y, { x, y });
function advance(s, seconds) { for (let i = 0; i < Math.round(seconds * 60); i++) G.step(s, 1 / 60); }

test('一般蟲依初始生命縮放，鍬形蟲王有獨立的大顎輪廓', () => {
  for (const [kind, spec] of Object.entries(G.ENEMIES)) {
    const span = hp => G.enemyArtScale(kind, hp) * spec.artSpan;
    if (kind.endsWith('Boss')) { assert.ok(Math.abs(span(spec.hp) - 79) < 1e-8); continue; }
    const sizes = [1, 6, 18, 40, 76, 106, 218].map(span);
    assert.ok(sizes.every((size, i) => !i || size > sizes[i - 1]));
    assert.ok(Math.abs(sizes[0] - 34) < 1e-8);
    assert.ok(Math.abs(sizes.at(-1) - 62) < 1e-8);
    assert.equal(span(1000), sizes.at(-1));
  }
});

test('金龜蟲蓄力時不扣牆血，撞擊特效與實際扣血出現在同一步', () => {
  const s = G.createState(3);
  for (let row = 0; row < G.ROWS; row++) assert.ok(G.build(s, 'wall', 6, row).ok);
  const wall = G.at(s,6,3), hp = wall.hp;
  G.startWave(s); s.queue = [];
  const scarab = at(s, 'giant', 7, 3, 218);
  advance(s, .4);
  assert.equal(scarab.attackId, wall.id); assert.equal(wall.hp, hp);
  assert.ok(!s.effects.some(e => e.kind === 'scarabRam'));
  for (let i = 0; i < 30 && wall.hp === hp; i++) G.step(s,1/60);
  assert.equal(wall.hp, hp - 1); assert.equal(scarab.lastRamAt, s.time);
  const impact = s.effects.find(e => e.kind === 'scarabRam');
  assert.deepEqual([impact.x, impact.y, impact.facing], [6.5, 3, scarab.facing]);
});

test('第三關蟲王離開直達路線拆一座建築，守在城門每兩秒扣一心', () => {
  const s=G.createState(2); G.build(s,'wall',7,1); G.upgrade(s,7,1); G.build(s,'wall',4,6);
  const wallet=s.money;
  G.startWave(s); assert.deepEqual(s.queue.filter(e=>e.kind==='stagBoss').map(e=>e.hp),[200]);
  s.queue=[]; s.castle=null;
  const boss=at(s,'stagBoss',9,3,200);
  for(let i=0;i<12000 && s.stats.broken===0;i++) G.step(s,1/60);
  assert.equal(s.stats.broken,1); assert.equal(G.at(s,7,1),undefined); assert.equal(s.money,wallet+1);
  assert.equal(s.upgradeItems,2); assert.equal(boss.raided,true);
  for(let i=0;i<12000 && boss.siegeClock>=2*G.BATTLE_SPEED;i++) G.step(s,1/60);
  assert.equal(Math.abs(boss.x)+Math.abs(boss.y-3),1);
  assert.ok(G.at(s,4,6)); assert.equal(s.hearts,5);
  advance(s,2*G.BATTLE_SPEED-2/60); assert.equal(s.hearts,5);
  G.step(s,1/60); assert.equal(s.hearts,4); assert.ok(!boss.dead);
  advance(s,2*G.BATTLE_SPEED); assert.equal(s.hearts,3);
  G.hit(s,boss,{kind:'molecular',c:2,r:3},{damage:200}); G.step(s,1/60); assert.equal(s.phase,'planning');
});

test('飛蟲與跨過石牆的跳蟲都沿實際飛行方向轉頭', () => {
  for (const kind of ['flyer', 'hopper']) {
    const s = G.createState(), e = at(s, kind, 7, 1);
    s.phase = 'running';
    if (kind === 'hopper') assert.ok(G.startLeap(s, e));
    const x = e.x, y = e.y;
    G.step(s, 1 / 60);
    const dx = e.x - x, dy = e.y - y;
    assert.ok(dx < 0 && dy > 0, '這一步沿斜線靠近小屋');
    const angle = e.facing * Math.PI / 180;
    const alignment = -(dx * Math.cos(angle) + dy * Math.sin(angle)) / Math.hypot(dx, dy);
    assert.ok(alignment > .9999, kind);
  }
});

test('十二種蟲維持整數生命，飛蟲在加倍後減一，重新讀檔不會重複調整', () => {
  assert.deepEqual(Object.values(G.ENEMIES).map(e => e.hp), [2, 6, 6, 6, 20, 3, 8, 250, 280, 200, 40, 4]);
  assert.ok(G.LEVELS.every(l => l.waves.flat().every(g => g.hp > 0 && g.hp % 2 === (g.kind === 'flyer' ? 1 : 0))));
  for(let level=4;level<10;level++) {
    const saved=G.snapshot(G.createState(level)), restored=G.restore(saved); G.startWave(restored);
    const flying=restored.queue.filter(e=>e.kind==='flyer');
    assert.ok(flying.length>0); assert.ok(flying.every(e=>e.hp===[7,9,9,13,17,25][level-4]));
    const e=G.spawn(restored,'flyer',flying[0].hp); assert.equal(e.maxHp,[7,9,9,13,17,25][level-4]);
  }
  const s = G.restore(G.snapshot(G.restore(G.snapshot(G.createState()))));
  G.startWave(s); advance(s, 0.6);
  assert.equal(s.enemies[0].hp, 6); assert.equal(s.enemies[0].maxHp, 6);
});

test('九種蟲分十關逐步增加，新生小蟲維持兩血，最後兩關以巨蟲取代爆炸蟲', () => {
  assert.equal(Object.keys(G.ENEMIES).length, 12); assert.equal(G.ENEMIES.bomber,undefined);
  let previous = new Set();
  G.LEVELS.forEach((level, i) => {
    const kinds = new Set(level.waves.flat().map(g => g.kind));
    assert.equal(kinds.delete('stagBoss'), i === 2 || i === 10);
    assert.equal(kinds.delete('rhinoBoss'), i === 5 || i === 10);
    assert.equal(kinds.delete('spiderBoss'), i === 9 || i === 10);
    assert.equal(kinds.size, [2, 3, 4, 5, 6, 7, 8, 9, 9, 9, 9][i]);
    assert.equal(kinds.has('bomber'),false);
    if (i >= 8) assert.equal(level.waves.flat().filter(g => g.kind === 'giant').reduce((n, g) => n + g.count, 0), [11, 16, 18][i - 8]);
    for (const kind of previous) assert.ok(kinds.has(kind));
    for (const g of level.waves.flat()) { assert.ok(G.ENEMIES[g.kind]); if (g.kind === 'bug') assert.ok(g.hp >= G.ENEMIES.bug.hp); }
    previous = kinds;
  });
  assert.equal(G.spawn(G.createState(), 'bug').hp, 2);
  assert.ok(G.ENEMIES.swift.speed > G.ENEMIES.bug.speed * 1.8);
  assert.ok(G.ENEMIES.giant.hp >= 20 && G.ENEMIES.giant.speed < G.ENEMIES.bug.speed / 2);
});

test('獨角仙出場十秒後飛越石牆，每次起飛相隔十秒', () => {
  const s = G.createState(5);
  for (const r of [2,3,4]) G.build(s,'wall',6,r);
  G.startWave(s,0,1); s.queue=[]; s.castle=null;
  const boss = at(s,'rhinoBoss',7,3);
  assert.equal(boss.hp,250);
  // Hold the boss in place until just before takeoff to make the wall crossing measurable.
  assert.equal(boss.skillAt,10 * G.BATTLE_SPEED);
  boss.stun = 10 * G.BATTLE_SPEED - 1/60;
  advance(s,10 * G.BATTLE_SPEED - 1/60); assert.equal(boss.leap,null);
  G.step(s,1/60);
  assert.ok(boss.leap);
  assert.ok(Math.abs(boss.skillAt-s.time-10*G.BATTLE_SPEED)<1e-8);
  const jump = boss.leap;
  assert.deepEqual([jump.x,jump.y],[5,3]);
  const trail = s.effects.find(e=>e.kind==='leap');
  assert.deepEqual([trail.toX,trail.toY],[jump.x,jump.y]);
  assert.equal(G.canTarget('frost',boss),false); assert.equal(G.canTarget('pierce',boss),true);
  advance(s,.5 * G.BATTLE_SPEED); assert.equal(boss.leap,null);
  assert.equal(G.canTarget('flame',boss),true);
  boss.stun = 9.5 * G.BATTLE_SPEED - 1/60;
  advance(s,9.5 * G.BATTLE_SPEED - 1/60); assert.equal(boss.leap,null);
  G.step(s,1/60); assert.ok(boss.leap);
});

test('獨角仙飛行中連續被擊暈仍準時落地，在地面暈完再前進', () => {
  for (const kind of ['push','pierce']) {
    const s=G.createState(5); G.startWave(s,0,1); s.queue=[]; s.castle=null;
    const boss=at(s,'rhinoBoss',9,3,250);
    boss.skillAt=0;
    advance(s,.25*G.BATTLE_SPEED);
    const flight=boss.leap, ticksLeft=Math.round((flight.duration-flight.age)*60);
    assert.ok(G.enemyLift(boss,s.time)>0);
    const source={kind,upgraded:true,c:8,r:4};
    const status=kind==='push'?'stun':'shock';
    for (let i=0;i<ticksLeft;i++) {
      if (i%8===0) assert.ok(G.hit(s,boss,source));
      G.step(s,1/60);
    }
    assert.equal(boss.leap,null); assert.equal(G.enemyLift(boss,s.time),0);
    assert.deepEqual([boss.x,boss.y],[flight.x,flight.y]);
    assert.ok(boss.hp<250 && G.canTarget('frost',boss));
    let seconds=G.toolFor('pierce',true).stunSeconds;
    if (kind==='push') {
      const distance=boss.push?.length ?? 0;
      seconds=1+Math.floor(G.toolFor('push',true).knockback-distance+1e-8);
      if (distance) assert.equal(boss.stun,0);
      while(boss.push) G.step(s,1/60);
    }
    const duration=seconds*G.BATTLE_SPEED, landing=[boss.x,boss.y];
    assert.ok(Math.abs(boss[status]-duration)<1e-8);
    advance(s,duration);
    assert.deepEqual([boss.x,boss.y],landing);
    advance(s,.1); assert.notDeepEqual([boss.x,boss.y],landing);
  }
});

test('三種蟲王皆在城門外持續攻城，每兩秒扣一心，擊殺後停止', () => {
  const {c,r} = G.LEVELS[10].goal;
  for (const [kind,dc,dr] of [['stagBoss',1,0],['rhinoBoss',0,-1],['spiderBoss',-1,0]]) {
    const s=G.createState(10); G.startWave(s,0,9); s.queue=[]; s.castle=null;
    const boss=at(s,kind,c+2*dc,r+2*dr);
    if (kind==='rhinoBoss') boss.skillAt=0;
    for (let i=0;i<600 && (boss.x!==c+dc || boss.y!==r+dr || boss.leap);i++) G.step(s,1/60);
    assert.deepEqual([boss.x,boss.y],[c+dc,r+dr]);
    for (let hit=1;hit<=2;hit++) {
      advance(s,2*G.BATTLE_SPEED-1/60); assert.equal(s.hearts,6-hit);
      G.step(s,1/60); assert.equal(s.hearts,5-hit);
      assert.ok(!boss.dead); assert.deepEqual([boss.x,boss.y],[c+dc,r+dr]);
      assert.ok(s.effects.some(e=>e.kind==='home' && e.x===c && e.y===r));
    }
    G.hit(s,boss,{kind:'molecular',c,r},{damage:boss.hp});
    advance(s,3*G.BATTLE_SPEED); assert.equal(s.hearts,3); assert.equal(s.phase,'won');
  }
});

test('蜘蛛每五秒射出蛛網，飛到砲塔才停火七秒，重複命中會刷新時間', () => {
  const s=G.createState(9); G.build(s,'molecular',6,3); G.build(s,'wall',8,6);
  G.startWave(s,0,17); s.queue=[];
  const boss=at(s,'spiderBoss',11,4,2000), tower=s.buildings[0];
  advance(s,5 * G.BATTLE_SPEED - 1/60);
  assert.equal(tower.webUntil,0);
  G.step(s,1/60);
  const net=s.shots.find(shot=>shot.kind==='spiderWeb');
  assert.equal(net.caster,boss.id); assert.equal(net.target,tower.id);
  assert.equal(net.duration,.8*G.BATTLE_SPEED);
  advance(s,net.duration-2/60); assert.equal(tower.webUntil,0); assert.ok(tower.aim);
  const age=net.age;
  G.togglePause(s); advance(s,2); assert.equal(net.age,age); G.togglePause(s);
  G.step(s,1/60); assert.ok(!s.shots.includes(net));
  assert.ok(Math.abs(tower.webUntil-s.time-7*G.BATTLE_SPEED)<1e-8);
  assert.equal(tower.aim,null); assert.ok(s.effects.some(e=>e.kind==='webHit'));
  assert.ok(!s.buildings[1].webUntil && !s.castle.webUntil);
  const end=tower.webUntil;
  G.togglePause(s); advance(s,2); assert.equal(tower.webUntil,end); G.togglePause(s);
  advance(s,5 * G.BATTLE_SPEED); assert.ok(Math.abs(tower.webUntil-end-5*G.BATTLE_SPEED)<1e-8);
  assert.equal(tower.aim,null); assert.ok(!s.shots.some(shot=>shot.tower===tower.id));
  boss.stun=20 * G.BATTLE_SPEED;
  advance(s,7 * G.BATTLE_SPEED-1/60); assert.equal(tower.aim,null);
  G.step(s,1/60); assert.ok(tower.aim && tower.aim.age<=1/60);
});

test('飛行中的蛛網只會封住發射時選定的塔', () => {
  const s=G.createState(9); G.build(s,'pea',6,3);
  G.startWave(s,0,17); s.queue=[];
  const boss=at(s,'spiderBoss',11,4,2000);
  boss.skillAt=s.time; G.step(s,1/60);
  const net=s.shots.find(shot=>shot.kind==='spiderWeb');
  const replacement={...s.buildings[0],id:s.nextId++}; s.buildings=[replacement];
  advance(s,net.duration);
  assert.equal(replacement.webUntil,0);
  assert.ok(!s.effects.some(e=>e.kind==='webHit'));
});

test('主線蟲王與隱藏關的三隻蟲王都在該段最後一批小蟲前入場', () => {
  for (const [level, expected] of [[2,[33]], [5,[51]], [9,[103]], [10,[33,83,135]]]) {
    const queue=G.spawnQueue(level);
    const positions=queue.flatMap((entry,i)=>entry.kind.endsWith('Boss') ? [i+1] : []);
    assert.deepEqual(positions,expected);
    for (const position of positions) {
      assert.equal(queue[position].wave,queue[position-1].wave);
      assert.ok(!queue[position].kind.endsWith('Boss'));
    }
  }
});

test('隱藏關每段一隻不同蟲王，四選三指派共有二十四種', () => {
  const seen=new Set();
  for (let pattern=0;pattern<24;pattern++) {
    const state=G.createState(10); G.startWave(state,pattern,37);
    const bosses=state.queue.filter(e=>e.kind.endsWith('Boss'));
    assert.deepEqual(bosses.map(e=>[e.wave,e.kind,e.hp]),[[0,'stagBoss',200],[1,'rhinoBoss',250],[2,'spiderBoss',280]]);
    const cells=bosses.map(e=>G.key(e.position.x,e.position.y));
    assert.equal(new Set(cells).size,3); seen.add(cells.join('|'));
    assert.ok(bosses.every(e=>G.isEntrance(10,e.position.x,e.position.y)));
  }
  assert.equal(seen.size,24);
});

test('下盾蟲擋住無穿盾能力的下方攻擊，從上方及同高側面攻擊有效', () => {
  for (const kind of ['pea', 'cannon', 'flame', 'push']) {
    const tool = G.TOOLS[kind];
    const s = G.createState(), e = at(s, 'shield_down', 6, 3, 60);
    assert.equal(G.hit(s, e, { kind, c: 8, r: 5 }), false);
    assert.equal(e.hp, 60); assert.equal(e.slow, 0); assert.equal(e.push, null);
    const block = s.effects.at(-1);
    assert.ok(block.y > e.y && block.vy > 0);
    assert.equal(G.hit(s, e, { kind, c: 8, r: 1 }), true); assert.equal(e.hp, 60 - tool.damage);
    const point = G.impactPoint(e, { c: 8, r: 5 });
    if (block) assert.deepEqual(point, { x: block.x, y: block.y });
    assert.equal(G.shieldBlocks(e, { c: 4, r: 3 }), false);
  }
});

test('地板火焰可傷上盾蟲，下盾蟲會格擋，飛蟲不受地板火焰影響', () => {
  for (const kind of ['shield', 'shield_down', 'flyer']) {
    const s = G.createState(), e = at(s, kind, 6, 3, 5);
    G.ignite(s, 6, 3);
    for (let i = 0; i < G.BATTLE_SPEED * 60; i++) G.updateFires(s, 1 / 60);
    assert.equal(e.hp, kind === 'shield' ? 4 : 5);
    assert.equal(s.stats.blocked, kind === 'shield_down' ? 1 : 0);
  }
});

test('跳蟲第一次受傷跨過牆跳兩格，只觸發一次，落地後繼續尋路', () => {
  const s = G.createState(); s.money = 100;
  for (let r = 0; r < G.ROWS; r++) G.build(s, 'wall', 6, r);
  const e = at(s, 'hopper', 7, 3, 8); s.phase = 'running';
  G.hit(s, e, { kind: 'pea', c: 7, r: 5 });
  assert.equal(e.hp, 7); assert.equal(e.leap.x, 5); assert.equal(e.leap.y, 3);
  advance(s, 0.6); assert.equal(e.leap, null); assert.equal(e.x, 5);
  G.hit(s, e, { kind: 'pea', c: 7, r: 5 }); assert.equal(e.leap, null); assert.equal(s.stats.jumped, 1);
  advance(s, 1); assert.ok(e.x < 5); assert.equal(s.stats.broken, 0);
});

test('跳蟲避開被佔用落點，選擇剩餘路徑最短的安全格子', () => {
  const s = G.createState(); s.money = 100;
  for (let r = 0; r < G.ROWS; r++) G.build(s, 'wall', 6, r);
  G.build(s, 'wall', 5, 3);
  const e = at(s, 'hopper', 7, 3), landing = G.jumpLanding(s, e);
  assert.equal(landing.c, 5); assert.equal(landing.r, 2); assert.equal(landing.breaking, false);
  assert.equal(G.at(s, landing.c, landing.r), undefined);
  for (const level of [1, 2]) {
    const map = G.createState(level), bug = at(map, 'hopper', 7, 3), target = G.jumpLanding(map, bug);
    assert.ok(target); assert.equal(G.terrain(level).has(G.key(target.c, target.r)), false);
  }
});

test('沒有安全落點時不穿牆；首次致命傷不會留下死蟲跳躍', () => {
  const s = G.createState(); s.money = 100;
  for (const c of [5, 6]) for (let r = 1; r <= 5; r++) G.build(s, 'wall', c, r);
  const e = at(s, 'hopper', 7, 3); G.hit(s, e, { kind: 'pea', c: 7, r: 5 });
  assert.equal(e.leap, null); assert.equal(e.x, 7); assert.equal(e.jumped, true);
  const doomed = at(s, 'hopper', 9, 3); G.hit(s, doomed, { kind: 'molecular', c: 9, r: 5 });
  assert.equal(doomed.dead, true); assert.equal(doomed.leap, null);
});

test('跳躍中的跳蟲不被擊退拉回障礙物，落地仍在有效格子', () => {
  const s = G.createState(); G.build(s, 'wall', 6, 3);
  const e = at(s, 'hopper', 7, 3, 10); s.phase = 'running';
  G.hit(s, e, { kind: 'push', c: 7, r: 5 }); advance(s, 0.3);
  G.hit(s, e, { kind: 'push', c: 7, r: 5 }); assert.equal(e.push, null);
  advance(s, 0.3); assert.equal(e.leap, null); assert.equal(G.at(s, e.c, e.r), undefined);
});

test('母蟲每實際三秒產生一隻兩血小蟲，死亡後停止產卵', () => {
  const s = G.createState(), mother = G.spawn(s, 'mother'); s.phase = 'running';
  advance(s, 3 * G.BATTLE_SPEED - 1 / 60); assert.equal(s.stats.hatched, 0);
  advance(s, 1 / 60); assert.equal(s.stats.hatched, 1);
  const baby = s.enemies.find(e => e.kind === 'bug'); assert.equal(baby.hp, 2);
  assert.ok(Math.hypot(baby.x - mother.x, baby.y - mother.y) <= 1 + 1e-9);
  advance(s, 3 * G.BATTLE_SPEED); assert.equal(s.stats.hatched, 2);
  while (!mother.dead) G.hit(s, mother, { kind: 'molecular', c: 8, r: 5 });
  advance(s, 3 * G.BATTLE_SPEED); assert.equal(s.stats.hatched, 2);
});

test('飛蟲直飛小屋，完整牆列與池塘都無法擋住，也不拆牆', () => {
  const s = G.createState(); s.money = 100;
  for (let r = 0; r < G.ROWS; r++) G.build(s, 'wall', 6, r);
  // Keep the stage open so the next stage's healing cannot hide home damage.
  s.queue = [{ kind: 'bug', hp: 2, row: 3, wave: 0 }]; s.spawnClock = 60;
  const e = G.spawn(s, 'flyer'); s.phase = 'running'; advance(s, 6);
  assert.ok(e.x < 6); assert.equal(s.stats.broken, 0); assert.ok(s.buildings.every(b => b.hp === 4));
  advance(s, 6); assert.equal(s.hearts, 4); assert.equal(s.enemies.length, 0);
  assert.equal(s.phase, 'running'); s.queue = []; advance(s, 1 / 60);
  assert.equal(s.phase, 'planning'); assert.equal(s.level, 1); assert.equal(s.hearts, 5);
  const pool = G.createState(1), f = G.spawn(pool, 'flyer'); pool.phase = 'running'; advance(pool, 6);
  assert.ok(f.x < 6); assert.equal(f.attackId, null);
});

test('分裂蟲死亡只分裂一次，三隻小蟲隨機出現在一格內的安全位置', () => {
  const s = G.createState(); G.build(s, 'wall', 7, 3); const e = at(s, 'splitter', 6, 3, 18), money = s.money;
  G.hit(s, e, { kind: 'pea', c: 6, r: 5 }, { damage: 16 });
  G.hit(s, e, { kind: 'cannon', c: 6, r: 5 }); G.hit(s, e, { kind: 'cannon', c: 6, r: 5 });
  const babies = s.enemies.filter(b => b.kind === 'bug'); assert.equal(babies.length, 3); assert.equal(s.stats.split, 1);
  assert.equal(s.effects.find(fx => fx.kind === 'split').maxHp, 18);
  assert.ok(babies.every(b => b.maxHp === 2));
  assert.equal(s.money, money); assert.ok(new Set(babies.map(b => `${b.x},${b.y}`)).size > 1);
  for (const b of babies) { assert.equal(b.hp, 2); assert.ok(Math.hypot(b.x - 6, b.y - 3) <= 1); assert.equal(G.at(s, b.c, b.r), undefined); }
  G.hit(s, babies[0], { kind: 'pea', c: 6, r: 5 }); assert.equal(s.stats.split, 1);
});

test('範圍砲擊殺分裂蟲後，不會把同次爆炸剛出生的小蟲再算進攻擊', () => {
  const s = G.createState(), e = at(s, 'splitter', 6, 3, 2);
  G.resolveShot(s, { kind: 'cannon', target: e.id, c: 6, r: 5 });
  const babies = s.enemies.filter(b => b.kind === 'bug');
  assert.equal(babies.length, 3); assert.ok(babies.every(b => !b.dead && b.hp === 2));
});

test('分裂位置在邊界和密集建築旁也不會落在地圖外或牆上', () => {
  const s = G.createState(); s.money = 100;
  for (let r = 0; r <= 2; r++) G.build(s, 'wall', 1, r);
  const e = at(s, 'splitter', 0, 0, 1); G.hit(s, e, { kind: 'pea', c: 2, r: 2 });
  for (const b of s.enemies.filter(b => b.kind === 'bug')) {
    assert.ok(b.x >= 0 && b.y >= 0 && Math.hypot(b.x, b.y) <= 1); assert.equal(G.at(s, b.c, b.r), undefined);
  }
});

test('巨蟲死亡不炸毀周圍的塔和牆', () => {
  const s = G.createState(); s.money = 100;
  for (let c = 5; c <= 7; c++) for (let r = 2; r <= 4; r++) if (c !== 6 || r !== 3) G.build(s, c % 2 ? 'wall' : 'pea', c, r);
  G.build(s, 'pea', 8, 3);
  const e = at(s, 'giant', 6, 3, 1), revision = s.revision, buildings=JSON.stringify(s.buildings);
  G.hit(s, e, { kind: 'pea', c: 8, r: 5 }); G.hit(s, e, { kind: 'pea', c: 8, r: 5 });
  assert.equal(e.dead,true); assert.equal(JSON.stringify(s.buildings),buildings);
  assert.equal(s.stats.broken,0); assert.equal(s.revision,revision);
});

test('進家消失不觸發分裂或產卵能力', () => {
  for (const kind of ['splitter', 'mother']) {
    const home = G.createState(); home.queue = [{ kind: 'bug', hp: 2, row: 3, wave: 0 }]; home.spawnClock = 60;
    at(home, kind, 0, 3); home.phase = 'running'; advance(home, 1 / 60);
    assert.equal(home.hearts, 4); assert.equal(home.stats.split, 0); assert.equal(home.stats.hatched, 0);
  }
});

test('暫停凍結產卵和跳躍；準備存檔保留隨機種子，重試可重現分裂落點', () => {
  const s = G.createState(), e = at(s, 'hopper', 7, 3); G.spawn(s, 'mother');
  G.hit(s, e, { kind: 'pea', c: 7, r: 5 }); s.phase = 'paused'; const before = JSON.stringify(s); advance(s, 9); assert.equal(JSON.stringify(s), before);
  function positions(state) { const split = at(state, 'splitter', 6, 3, 1); G.hit(state, split, { kind: 'pea', c: 6, r: 5 }); return state.enemies.filter(e => e.kind === 'bug').map(e => [e.x, e.y]); }
  const prepared = G.snapshot(G.createState(2));
  assert.deepEqual(positions(G.restore(prepared)), positions(G.restore(prepared)));
  const changed = { ...prepared, rngState: 12345 }; assert.notDeepEqual(positions(G.restore(prepared)), positions(G.restore(changed)));
});
