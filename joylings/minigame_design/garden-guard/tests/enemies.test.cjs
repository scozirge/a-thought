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

test('金龜蟲首次受傷後衝一格，受控先停，五秒內的其他攻擊不會重啟衝刺', () => {
  const s = G.createState(); G.startWave(s); s.queue=[]; s.castle=null;
  const beetle = at(s,'giant',9,3,76);
  const hit = () => G.hit(s,beetle,{kind:'pea',c:8,r:3});
  G.hit(s,beetle,{kind:'frost',c:8,r:3});
  assert.equal(beetle.dashRemaining,0);
  hit(); assert.equal(beetle.dashRemaining,1);
  beetle.stun=.25; advance(s,.25);
  assert.equal(beetle.x,9); assert.equal(beetle.dashRemaining,1);
  assert.equal(beetle.dashReadyAt,0);
  const start=s.time;
  G.step(s,1/60);
  const ready=beetle.dashReadyAt;
  assert.ok(Math.abs(ready-start-5*G.BATTLE_SPEED)<1e-9);
  while (beetle.dashRemaining && s.time<2) G.step(s,1/60);
  assert.ok(Math.abs(beetle.x-8)<1e-8); assert.equal(beetle.dashRemaining,0);
  advance(s,ready-s.time-1/60);
  hit(); assert.equal(beetle.dashRemaining,0);
  G.togglePause(s); advance(s,2); G.togglePause(s); hit(); assert.equal(beetle.dashRemaining,0);
  G.step(s,1/60); hit(); assert.equal(beetle.dashRemaining,1);
  const wallState = G.createState();
  for(let r=0;r<G.ROWS;r++) G.build(wallState,'wall',6,r);
  G.startWave(wallState); wallState.queue=[]; wallState.castle=null;
  const blocked = at(wallState,'giant',7,3,76);
  const other = at(wallState,'giant',10,4,76);
  G.hit(wallState,blocked,{kind:'pea',c:5,r:3});
  G.hit(wallState,other,{kind:'pea',c:5,r:4});
  advance(wallState,.4); assert.equal(blocked.x,7); assert.equal(blocked.dashRemaining,1);
  assert.equal(blocked.lastDashStepAt,undefined);
  assert.equal(blocked.dashReadyAt,0);
  assert.equal(other.dashRemaining,0); assert.ok(other.dashReadyAt>wallState.time);
  assert.equal(blocked.attackId,G.at(wallState,6,3).id);
  G.at(wallState,6,3).hp=1;
  for(let i=0;i<120 && blocked.dashRemaining;i++) G.step(wallState,1/60);
  assert.equal(blocked.x,6); assert.equal(blocked.dashRemaining,0);
  assert.ok(blocked.dashReadyAt>other.dashReadyAt);
});

test('金龜蟲起步後中了暈眩、電擊或尖刺仍衝滿一格，之後才倒數完整時間', () => {
  for (const [source, timer] of [
    [{kind:'cannon',weapon:'sonicCannon'}, 'stun'],
    [{kind:'pierce'}, 'shock'],
    [{kind:'wall',upgraded:true}, 'spikeStun']
  ]) {
    const s = G.createState(); G.startWave(s); s.queue=[]; s.castle=null;
    const beetle = at(s,'giant',9,3,76);
    G.hit(s,beetle,{kind:'pea',c:8,r:3});
    advance(s,.1);
    assert.ok(beetle.x<9 && beetle.x>8);
    const duration=G.toolFor(source.weapon ?? source.kind,source.upgraded).stunSeconds*G.BATTLE_SPEED;
    G.hit(s,beetle,{...source,c:8,r:3});
    assert.equal(beetle[timer],0);
    G.togglePause(s); const paused=beetle.x; advance(s,1);
    assert.equal(beetle.x,paused); G.togglePause(s);
    for (let tick=0;beetle.dashRemaining && tick<60;tick++) {
      const before=beetle.x; G.step(s,1/60); assert.ok(beetle.x<before);
    }
    assert.ok(Math.abs(beetle.x-8)<1e-8); assert.equal(beetle[timer],duration);
    const endX = beetle.x;
    advance(s,duration); assert.equal(beetle.x,endX);
    advance(s,2/60); assert.ok(beetle.x<8);
  }
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

test('各蟲維持正整數生命，各關飛蟲依設定血量出場且讀檔不重複扣血', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(G.ENEMIES).map(([kind,e]) => [kind,e.hp])),
    {bug:2,roach:2,shield:6,shield_down:6,hopper:6,mother:20,flyer:2,splitter:8,rhinoBoss:250,spiderBoss:380,stagBoss:200,giant:40,swift:4});
  assert.ok(G.LEVELS.every(l => l.waves.flat().every(g => Number.isInteger(g.hp) && g.hp > 0)));
  assert.ok(G.spawnQueue(10).filter(e=>e.kind==='flyer').every(e=>e.hp===16));
  for(let level=4;level<10;level++) {
    const saved=G.snapshot(G.createState(level)), restored=G.restore(saved); G.startWave(restored);
    const flying=restored.queue.filter(e=>e.kind==='flyer');
    const expected=[5,6,6,8,11,14][level-4];
    assert.ok(flying.length>0); assert.ok(flying.every(e=>e.hp===expected));
    const e=G.spawn(restored,'flyer',flying[0].hp); assert.equal(e.maxHp,expected);
  }
  const s = G.restore(G.snapshot(G.restore(G.snapshot(G.createState()))));
  G.startWave(s); advance(s, 0.6);
  assert.equal(s.enemies[0].hp, 6); assert.equal(s.enemies[0].maxHp, 6);
});

test('九種蟲分十關逐步增加，小蟑螂依關卡增加血量，最後兩關以巨蟲取代爆炸蟲', () => {
  assert.equal(Object.keys(G.ENEMIES).length, 13); assert.equal(G.ENEMIES.bomber,undefined);
  let previous = new Set();
  G.LEVELS.forEach((level, i) => {
    const kinds = new Set(level.waves.flat().map(g => g.kind));
    assert.equal(kinds.delete('stagBoss'), i === 2 || i === 10);
    assert.equal(kinds.delete('rhinoBoss'), i === 5 || i === 10);
    assert.equal(kinds.delete('spiderBoss'), i === 9 || i === 10);
    assert.equal(kinds.size, [2, 3, 4, 5, 6, 7, 8, 9, 9, 9, 9][i]);
    assert.equal(kinds.has('bomber'),false);
    if (i >= 8) assert.equal(level.waves.flat().filter(g => g.kind === 'giant').reduce((n, g) => n + g.count, 0), [11, 16, 18][i - 8]);
    if (kinds.has('splitter')) {
      const state = G.createState(i), egg = at(state,'splitter',6,3,1);
      G.hit(state,egg,{kind:'pea',c:7,r:3});
      const babies = state.enemies.filter(e => e.leap?.split);
      assert.equal(babies.length,3);
      const hp = [4,5,6,7,8,9][i-5];
      assert.ok(babies.every(e => e.kind === 'roach' && e.hp === hp && e.maxHp === hp));
    }
    for (const kind of previous) assert.ok(kinds.has(kind));
    for (const g of level.waves.flat()) { assert.ok(G.ENEMIES[g.kind]); if (g.kind === 'bug') assert.ok(g.hp >= G.ENEMIES.bug.hp); }
    previous = kinds;
  });
  assert.equal(G.spawn(G.createState(), 'bug').hp, 2);
  assert.ok(G.ENEMIES.swift.speed > G.ENEMIES.bug.speed * 1.8);
  assert.ok(G.ENEMIES.giant.hp >= 20);
  for (const [kind,speed] of Object.entries({giant:.35,mother:.3,stagBoss:.36,rhinoBoss:.40,spiderBoss:.34})) {
    assert.equal(G.ENEMIES[kind].speed,speed*1.15);
  }
  assert.equal(G.ENEMIES.shield.speed,.68);
  assert.equal(G.ENEMIES.flyer.speed,.9);
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

test('每波金龜蟲打頭陣、蟲王第二隻，穿插母蟲後其餘普通蟲仍依初始血量出場', () => {
  for (const [level,stage] of G.LEVELS.entries()) {
    const queue=G.spawnQueue(level);
    stage.waves.forEach((groups,wave) => {
      const batch=queue.filter(e=>e.wave===wave);
      if (groups.some(g=>g.kind==='giant')) assert.equal(batch[0].kind,'giant');
      if (groups.some(g=>g.kind.endsWith('Boss'))) assert.ok(batch[1].kind.endsWith('Boss'));
      const ordinary=batch.filter(e=>!e.kind.endsWith('Boss') && e.kind!=='giant' && e.kind!=='mother');
      assert.deepEqual(ordinary.map(e=>e.hp),ordinary.map(e=>e.hp).sort((a,b)=>b-a));
      for (const g of groups) assert.equal(batch.filter(e=>e.kind===g.kind && e.hp===g.hp).length,g.count);
    });
  }
});

test('各關所有入口共用母蟲兩秒間隔，有其他蟲時穿插出場，只剩母蟲時等待', () => {
  for (const level of [6,7,8,9,10]) {
    for (const mothersOnly of [false,true]) {
      const s=G.createState(level); G.startWave(s,0,42); s.castle=null;
      if (mothersOnly) s.queue=s.queue.filter(e=>e.kind==='mother');
      const expected=s.queue.filter(e=>e.kind==='mother').length;
      const mothers=[];
      let slots=0, ticks=0;
      while (s.queue.length && ticks++<20000) {
        G.step(s,ticks%2 ? 1/60 : .027);
        for (const enemy of s.enemies) {
          if (enemy.kind==='mother') mothers.push({time:enemy.bornAt,slot:slots});
          slots++;
        }
        s.enemies=[];
      }
      assert.equal(mothers.length,expected);
      for (let i=1;i<mothers.length;i++) {
        assert.ok(mothers[i].time-mothers[i-1].time>=2*G.BATTLE_SPEED-1e-9);
        if (!mothersOnly) assert.ok(mothers[i].slot-mothers[i-1].slot>1);
      }
    }
  }
});

test('城堡依實際失血順序記下地面、飛蟲與同一蟲王的多次攻擊，重試清空', () => {
  const s=G.createState(3), goal=G.LEVELS[s.level].goal;
  G.startWave(s); s.queue=[]; s.castle=null;
  const boss=G.spawn(s,'stagBoss',200,goal.r,{x:goal.c+1,y:goal.r});
  const leak=kind=>G.spawn(s,kind,99,goal.r,{x:goal.c,y:goal.r});
  boss.siegeClock=0; leak('flyer'); leak('bug'); G.step(s,1/60);
  boss.siegeClock=0; G.step(s,1/60);
  leak('swift'); leak('flyer'); G.step(s,1/60);
  assert.equal(s.phase,'lost');
  assert.deepEqual(s.homeHits,['stagBoss','flyer','bug','stagBoss','swift']);
  const retry=G.retry(s); G.startWave(retry); assert.deepEqual(retry.homeHits,[]);
});
test('隱藏關每段的第二隻都是指定蟲王，第四個入口只出普通蟲', () => {
  const state=G.createState(10); G.startWave(state);
  const bosses=state.queue.filter(e=>e.kind.endsWith('Boss'));
  assert.deepEqual(bosses.map(e=>[e.wave,e.kind,e.hp]),[[0,'stagBoss',200],[1,'rhinoBoss',250],[2,'spiderBoss',380]]);
  for (const boss of bosses) assert.equal(state.queue.filter(e=>e.wave===boss.wave)[1],boss);
  const bottom = state.queue.filter(e=>e.position.y===G.ROWS-1);
  assert.ok(bottom.length && bottom.every(e=>!e.kind.endsWith('Boss')));
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

test('母蟲出場滿四秒在所在格下蛋，母蟲死亡後再過三秒仍只孵出一隻當關血量的飛蟲', () => {
  for (const [level,hp] of [[6,6],[7,8],[8,11],[9,14],[10,16]]) {
    const s=G.createState(level); G.startWave(s,0,42); s.queue=[]; s.castle=null;
    const mother=at(s,'mother',9,3);
    advance(s,4*G.BATTLE_SPEED-1/60);
    assert.equal(s.eggs.length,0);
    G.step(s,1/60);
    assert.equal(s.eggs.length,1); const [egg]=s.eggs;
    assert.deepEqual([egg.c,egg.r],[Math.round(mother.x),Math.round(mother.y)]);
    assert.ok(Math.abs(egg.hatchAt-s.time-3*G.BATTLE_SPEED)<1e-9);
    G.hit(s,mother,{kind:'molecular',c:8,r:3},{damage:1000});
    G.togglePause(s); advance(s,5*G.BATTLE_SPEED); G.togglePause(s);
    advance(s,3*G.BATTLE_SPEED-1/60);
    assert.equal(s.phase,'running'); assert.equal(s.enemies.length,0); assert.equal(s.stats.hatched,0);
    G.step(s,1/60);
    assert.equal(s.eggs.length,0); assert.equal(s.stats.hatched,1);
    assert.equal(s.enemies.length,1);
    const [baby]=s.enemies;
    assert.deepEqual([baby.kind,baby.x,baby.y,baby.hp,baby.maxHp],['flyer',egg.c,egg.r,hp,hp]);
    advance(s,.1); assert.ok(baby.x<egg.c);
    G.hit(s,baby,{kind:'pea',c:8,r:3},{damage:1000}); G.step(s,1/60);
    assert.equal(s.phase,level<9?'planning':'won');
  }
});

test('每隻母蟲獨立每四秒下一顆，停住時照常，暫停遊戲會停表', () => {
  const s=G.createState(6); G.startWave(s,0,42); s.queue=[]; s.castle=null;
  const first=at(s,'mother',9,3);
  first.stun=12*G.BATTLE_SPEED;
  advance(s,G.BATTLE_SPEED);
  const second=at(s,'mother',9,5);
  second.frozenUntil=s.time+12*G.BATTLE_SPEED;
  G.togglePause(s); advance(s,6*G.BATTLE_SPEED); G.togglePause(s);
  const eggs=()=>s.eggs.map(e=>[e.c,e.r]);
  advance(s,3*G.BATTLE_SPEED-1/60); assert.deepEqual(eggs(),[]);
  G.step(s,1/60); assert.deepEqual(eggs(),[[9,3]]);
  advance(s,G.BATTLE_SPEED); assert.deepEqual(eggs(),[[9,3],[9,5]]);
  advance(s,2*G.BATTLE_SPEED); assert.deepEqual(eggs(),[[9,5]]);
  assert.equal(s.stats.hatched,1);
  advance(s,G.BATTLE_SPEED); assert.deepEqual(eggs(),[[9,3]]);
  assert.equal(s.stats.hatched,2);
  advance(s,G.BATTLE_SPEED); assert.deepEqual(eggs(),[[9,3],[9,5]]);
});

test('飛蟲直飛小屋，完整牆列與池塘都無法擋住，也不拆牆', () => {
  const s = G.createState(); s.money = 100;
  for (let r = 0; r < G.ROWS; r++) G.build(s, 'wall', 6, r);
  // Keep the stage open so the next stage's healing cannot hide home damage.
  s.queue = [{ kind: 'bug', hp: 2, row: 3, wave: 0 }]; s.spawnClock = 60;
  const e = G.spawn(s, 'flyer'); s.phase = 'running'; advance(s, 6);
  assert.ok(Math.abs(e.x - (11 - 6 * .9)) < 1e-8); assert.equal(s.stats.broken, 0); assert.ok(s.buildings.every(b => b.hp === 4));
  advance(s, 6); assert.equal(s.hearts, 5);
  advance(s, .25); assert.equal(s.hearts, 4); assert.equal(s.enemies.length, 0);
  assert.equal(s.phase, 'running'); s.queue = []; advance(s, 1 / 60);
  assert.equal(s.phase, 'planning'); assert.equal(s.level, 1); assert.equal(s.hearts, 5);
  const pool = G.createState(1), f = G.spawn(pool, 'flyer'); pool.phase = 'running'; advance(pool, 6);
  assert.ok(f.x < 6); assert.equal(f.attackId, null);
});

test('蜈蚣的步伐依實際前進距離變化，暈眩、結凍或被擊退時停步', () => {
  const s=G.createState(), runner=at(s,'swift',9,3,8);
  s.phase='running';
  advance(s,.25);
  assert.ok(runner.strideDistance>0);
  assert.ok(Math.abs(runner.strideDistance - (9-runner.x))<1e-8);
  const stride=runner.strideDistance;
  runner.stun=.5; advance(s,.25); assert.equal(runner.strideDistance,stride);
  runner.stun=0; runner.frozenUntil=s.time+.5; advance(s,.25); assert.equal(runner.strideDistance,stride);
  runner.frozenUntil=0; G.pushEnemy(s,runner,1);
  assert.ok(runner.push); advance(s,1/60); assert.equal(runner.strideDistance,stride);
});

test('滾動球卵提速三成，爆開的三隻小蟑螂從原地彈射一秒才落在三格內', () => {
  const s = G.createState(); G.build(s, 'wall', 7, 3); const e = at(s, 'splitter', 6, 3, 18), money = s.money;
  assert.ok(Math.abs(G.ENEMIES.splitter.speed-.70*1.30)<1e-9);
  G.hit(s, e, { kind: 'pea', c: 6, r: 5 }, { damage: 16 });
  G.hit(s, e, { kind: 'cannon', c: 6, r: 5 }); G.hit(s, e, { kind: 'cannon', c: 6, r: 5 });
  const babies = s.enemies.filter(b => b.kind === 'roach'); assert.equal(babies.length, 3); assert.equal(s.stats.split, 1);
  assert.equal(s.effects.find(fx => fx.kind === 'split').maxHp, 18);
  assert.ok(babies.every(b => b.maxHp === 2));
  assert.equal(s.money, money);
  const landings=babies.map(b=>[b.leap.x,b.leap.y]);
  assert.equal(new Set(landings.map(p=>p.join(','))).size,3);
  for (const b of babies) {
    assert.deepEqual([b.x,b.y],[6,3]); assert.equal(b.hp,2);
    assert.ok(Math.hypot(b.leap.x-6,b.leap.y-3)<=3);
    assert.equal(G.at(s,b.leap.x,b.leap.y),undefined);
    assert.equal(G.canTarget('cannon',b),false); assert.equal(G.canTarget('fireCannon',b),true);
  }
  s.phase='running';
  babies[0].stun=2*G.BATTLE_SPEED;
  advance(s,G.BATTLE_SPEED/2); assert.ok(babies.every(b=>G.enemyLift(b,s.time)>45));
  G.togglePause(s); const paused=JSON.stringify(babies); advance(s,2);
  assert.equal(JSON.stringify(babies),paused); G.togglePause(s);
  advance(s,G.BATTLE_SPEED/2-1/60); assert.ok(babies.every(b=>b.leap));
  G.step(s,1/60);
  assert.deepEqual(babies.map(b=>[b.x,b.y]),landings);
  assert.ok(babies.every(b=>!b.leap && G.canTarget('cannon',b) && !G.canTarget('fireCannon',b)));
  G.hit(s, babies[0], { kind: 'pea', c: 6, r: 5 }); assert.equal(s.stats.split, 1);
});

test('範圍砲擊殺蟑螂卵後，不會把同次爆炸剛出生的小蟑螂再算進攻擊', () => {
  const s = G.createState(), e = at(s, 'splitter', 6, 3, 2);
  G.resolveShot(s, { kind: 'cannon', target: e.id, c: 6, r: 5 });
  const babies = s.enemies.filter(b => b.kind === 'roach');
  assert.equal(babies.length, 3); assert.ok(babies.every(b => !b.dead && b.hp === 2));
});

test('分裂位置在邊界和密集建築旁也不會落在地圖外或牆上', () => {
  const s = G.createState(); s.money = 100;
  for (let r = 0; r <= 2; r++) G.build(s, 'wall', 1, r);
  const e = at(s, 'splitter', 0, 0, 1); G.hit(s, e, { kind: 'pea', c: 2, r: 2 });
  for (const b of s.enemies.filter(b => b.kind === 'roach')) {
    const {x,y}=b.leap; assert.ok(x>=0 && y>=0 && Math.hypot(x,y)<=3); assert.equal(G.at(s,x,y),undefined);
  }
});

test('卵團的隨機落點包含原地和整整三格', () => {
  const s=G.createState(), distances=new Set();
  for(let i=0;i<64;i++) {
    const parent=at(s,'splitter',6,3,1);
    G.hit(s,parent,{kind:'pea',c:7,r:3});
    for(const {x,y} of s.effects.at(-1).offspring) distances.add(Math.hypot(x-6,y-3));
  }
  assert.ok(distances.has(0)); assert.equal(Math.max(...distances),3);
});

test('蟑螂卵能把小蟑螂彈過整排牆，落地後接著走地面路線', () => {
  const s=G.createState(); s.money=100;
  for(let r=0;r<G.ROWS;r++) G.build(s,'wall',5,r);
  s.phase='running';
  let child;
  for(let i=0;i<32 && !child;i++) {
    const egg=at(s,'splitter',6,3,1);
    G.hit(s,egg,{kind:'pea',c:7,r:3});
    child=s.enemies.find(e=>e.leap?.x===4 && e.leap.y===3);
  }
  assert.ok(child); advance(s,G.BATTLE_SPEED/2);
  assert.equal(Math.round(child.x),5); assert.ok(G.enemyLift(child,s.time)>0);
  advance(s,G.BATTLE_SPEED/2); assert.equal(child.x,4); assert.equal(child.leap,null);
  advance(s,.2); assert.ok(child.x<4);
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
  function positions(state) { const split = at(state, 'splitter', 6, 3, 1); G.hit(state, split, { kind: 'pea', c: 6, r: 5 }); return state.enemies.filter(e => e.kind === 'roach').map(e => [e.leap.x, e.leap.y]); }
  const prepared = G.snapshot(G.createState(2));
  assert.deepEqual(positions(G.restore(prepared)), positions(G.restore(prepared)));
  const changed = { ...prepared, rngState: 12345 }; assert.notDeepEqual(positions(G.restore(prepared)), positions(G.restore(changed)));
});
