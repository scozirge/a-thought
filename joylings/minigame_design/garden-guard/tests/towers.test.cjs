const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../core.js');
function enemy(s, kind, hp, x, y) {
  const e = G.spawn(s, kind, hp);
  Object.assign(e, { x, y, c: Math.round(x), r: Math.round(y) });
  return e;
}
function advance(s, seconds) {
  for (let i = 0; i < Math.round(seconds * 60); i++) G.step(s, 1 / 60);
}
function burn(s, seconds) {
  for (let i = 0; i < Math.round(seconds * 60); i++) G.updateFires(s, 1 / 60);
}
function ray(s, c, r, ux, uy) {
  G.resolveShot(s, { kind: 'pierce', c, r, angle: Math.atan2(uy, ux) * 180 / Math.PI });
}

test('所有直接與燃燒傷害都是整數，穿透塔以慢攻速維持每發一傷害', () => {
  for(const tool of Object.values(G.TOOLS).filter(t=>t.rate)) {
    assert.ok(Number.isInteger(tool.damage));
    if(tool.burnDamage) assert.ok(Number.isInteger(tool.burnDamage));
  }
  const s=G.createState(); G.build(s,'pierce',2,3); s.phase='running';
  const target=enemy(s,'giant',100,6,3);
  advance(s,0.5); assert.equal(target.hp,99);
  advance(s,1.3); assert.equal(target.hp,99,'原本快攻速的時間點不再多射一發');
  advance(s,0.7); assert.equal(target.hp,98); assert.equal(s.stats.hits,2);
});

test('分子砲對第八關巨蟲每發扣二十八血，第三發才擊殺', () => {
  const hp=G.LEVELS[7].waves.flat().find(g=>g.kind==='giant').hp;
  const s=G.createState(7), target=enemy(s,'giant',hp,6,3);
  assert.equal(hp,76);
  const shot={kind:'molecular',target:target.id,c:6,r:5};
  G.resolveShot(s,shot); assert.equal(target.hp,48); assert.equal(target.dead,false);
  G.resolveShot(s,shot); assert.equal(target.hp,20); assert.equal(target.dead,false);
  G.resolveShot(s,shot); assert.equal(target.hp,0); assert.equal(target.dead,true); assert.equal(s.stats.hits,3);
});

test('雷射在開火當下貫穿同線目標，光束最長六點二格', () => {
  const s = G.createState(); G.build(s, 'pierce', 3, 3); s.phase = 'running';
  const a = enemy(s, 'giant', 20, 8.5, 3), b = enemy(s, 'giant', 20, 9, 3), outside = enemy(s, 'giant', 20, 10.5, 3);
  G.step(s, 1 / 60);
  assert.equal(s.shots.length, 0);
  assert.equal(s.effects.find(e => e.kind === 'laser').length, G.TOOLS.pierce.range);
  assert.deepEqual([a.hp, b.hp, outside.hp], [19, 19, 20]);
});

test('分子砲優先射程內剩餘血量最高者，忽略射程外、死亡及高上限但殘血目標', () => {
  const s = G.createState(); G.build(s, 'molecular', 2, 3); s.phase = 'running';
  const small = enemy(s, 'bug', 2, 3, 3), injured = enemy(s, 'giant', 100, 4, 3);
  injured.hp = 1;
  const high = enemy(s, 'giant', 40, 8.5, 3), outside = enemy(s, 'giant', 200, 10, 3);
  const dead = enemy(s, 'giant', 300, 5, 3); dead.dead = true;
  G.step(s, 1 / 60); assert.equal(s.buildings[0].aim.target, high.id); assert.equal(s.shots.length, 0);
  advance(s, 2 * G.BATTLE_SPEED - 2 / 60); assert.equal(s.shots.length, 0); assert.equal(high.hp, 40);
  G.step(s, 1 / 60); assert.equal(s.shots[0].target, high.id);
  advance(s, .36 * G.BATTLE_SPEED); assert.deepEqual([small.hp, injured.hp, high.hp, outside.hp], [2, 1, 12, 200]);
  const flying = enemy(s, 'flyer', 250, 7, 3); high.dead = true;
  G.step(s, 1 / 60); assert.equal(s.buildings[0].aim.target, flying.id, '重新瞄準也可選空中目標');
});

test('分子砲不射擊六點六格以外的目標，血量相同則先選靠近家的目標', () => {
  const s = G.createState(); G.build(s, 'molecular', 2, 3); s.phase = 'running';
  enemy(s, 'giant', 100, 8.8, 3); G.step(s, 1 / 60); assert.equal(s.shots.length, 0);
  const far = enemy(s, 'giant', 40, 8, 3), close = enemy(s, 'giant', 40, 4, 3);
  enemy(s, 'giant', 40, 4, 3); G.step(s, 1 / 60); assert.equal(s.buildings[0].aim.target, close.id);
  assert.notEqual(s.buildings[0].aim.target, far.id);
  const ordinary = G.createState(); G.build(ordinary, 'pea', 2, 3); ordinary.phase = 'running';
  const first = enemy(ordinary, 'bug', 2, 3, 3); enemy(ordinary, 'giant', 40, 4, 3);
  G.step(ordinary, 1 / 60); assert.equal(ordinary.shots[0].target, first.id, '其他塔仍優先靠近家的目標');
});

test('分子砲持續追蹤同一目標，暫停凍結瞄準，每次射擊前都需兩秒', () => {
  const s=G.createState(); G.build(s,'molecular',3,5); s.phase='running';
  const first=enemy(s,'giant',50,8,3), tower=s.buildings[0];
  advance(s,1.5); const age=tower.aim.age;
  const later=enemy(s,'giant',100,8,4);
  G.togglePause(s); const paused=JSON.stringify(s); advance(s,20); assert.equal(JSON.stringify(s),paused);
  G.togglePause(s); advance(s,2*G.BATTLE_SPEED-age-1/60);
  assert.equal(tower.aim.target,first.id); assert.equal(s.shots.length,0);
  G.step(s,1/60); assert.equal(s.shots[0].target,first.id);
  advance(s,.36 * G.BATTLE_SPEED + 1/60); assert.equal(first.hp,22); assert.equal(later.hp,100); assert.equal(tower.aim.target,later.id);
  advance(s,2*G.BATTLE_SPEED-tower.aim.age-1/60); assert.equal(s.shots.length,0);
  G.step(s,1/60); assert.equal(s.shots[0].target,later.id);
});

test('分子砲失去死亡或離開射程的目標時重新瞄準完整兩秒', () => {
  for(const reason of ['dead','outside']) {
    const s=G.createState(); G.build(s,'molecular',2,5); s.phase='running';
    const first=enemy(s,'giant',40,6,3), backup=enemy(s,'giant',20,5,4), tower=s.buildings[0];
    advance(s,2); assert.equal(tower.aim.target,first.id);
    if(reason==='dead') first.dead=true;
    else Object.assign(first,{x:11,y:0,c:11,r:0,next:null});
    G.step(s,1/60); assert.equal(tower.aim.target,backup.id); assert.equal(tower.aim.age,1/60);
    advance(s,2*G.BATTLE_SPEED-2/60); assert.equal(s.shots.length,0); assert.equal(backup.hp,20);
    G.step(s,1/60); assert.equal(s.shots[0].target,backup.id);
  }
});

test('分子砲命中後才重新選敵，不會以扣血前的數字再次鎖定原目標', () => {
  const s=G.createState(); G.build(s,'molecular',5,5); s.phase='running';
  const first=enemy(s,'giant',56,8,3), other=enemy(s,'giant',45,8,4), tower=s.buildings[0];
  advance(s,2*G.BATTLE_SPEED); assert.equal(s.shots[0].target,first.id);
  advance(s,0.1); assert.equal(first.hp,56); assert.equal(tower.aim,null);
  advance(s,.36 * G.BATTLE_SPEED - .1 + 1/60); assert.equal(first.hp,28); assert.equal(tower.aim.target,other.id);
  assert.ok(tower.aim.age<0.1); assert.equal(other.hp,45);
});

test('擊退依走回家的路程選最遠落點，狹窄走廊可往下退，封死時不穿建築', () => {
  const s=G.createState();
  for(let r=1;r<8;r++) G.build(s,'wall',6,r);
  for(let r=0;r<7;r++) G.build(s,'wall',8,r);
  const target=enemy(s,'bug',10,7,3), before=G.route(s,{c:7,r:3}).path.length;
  G.pushEnemy(s,target); assert.deepEqual([target.push.x,target.push.y],[7,6]);
  assert.equal(G.route(s,{c:7,r:6}).path.length,before+3);
  s.phase='running'; advance(s,0.3); assert.equal(target.push,null); assert.equal(target.y,6);
  advance(s,1); assert.ok(target.y<6); assert.equal(G.at(s,target.c,target.r),undefined);
  const closed=G.createState(); for(const [c,r] of [[4,3],[6,3],[5,2],[5,4]]) G.build(closed,'wall',c,r);
  const trapped=enemy(closed,'bug',10,5,3); G.pushEnemy(closed,trapped); assert.equal(trapped.push,null);
});

test('擊退塔降低三成攻速，實際間隔約二點八六秒', () => {
  const s=G.createState();G.build(s,'push',8,5);s.phase='running';
  enemy(s,'giant',1000,9,3);const tower=s.buildings[0];
  G.step(s,1/60);assert.ok(Math.abs(tower.cooldown-G.BATTLE_SPEED/0.35+1/60)<1e-9);
  advance(s,2.5*G.BATTLE_SPEED);assert.equal(s.stats.hits,1);
  advance(s,0.6*G.BATTLE_SPEED);assert.equal(s.stats.hits,2);
});

test('分子砲讀檔與重試不保留戰鬥瞄準進度，無目標不空射', () => {
  const s=G.createState(); G.build(s,'molecular',3,5); G.startWave(s); s.queue=[];
  const target=enemy(s,'giant',40,8,3); advance(s,1);
  assert.ok(s.buildings[0].aim.age>0);
  assert.equal(G.restore(G.snapshot(s)).buildings[0].aim,null);
  assert.equal(G.retry(s).buildings[0].aim,null);
  target.dead=true; G.step(s,1/60);
  assert.equal(s.buildings[0].aim,null); assert.equal(s.shots.length,0);
});

test('冰凍、火焰與大砲只對地，其餘四種砲塔可對空', () => {
  for (const kind of Object.keys(G.TOOLS).filter(k => k !== 'wall')) {
    const s = G.createState(); G.build(s, kind, 6, 4); s.phase = 'running';
    const flying = enemy(s, 'flyer', 100, 7, 3), groundOnly = ['cannon', 'flame', 'frost'].includes(kind);
    assert.equal(G.canTarget(kind, flying), !groundOnly);
    advance(s, kind === 'molecular' ? 2.36 * G.BATTLE_SPEED + 1/60 : 0.5);
    assert.equal(flying.hp, groundOnly ? 100 : 100 - G.TOOLS[kind].damage);
    assert.equal(s.stats.hits, groundOnly ? 0 : 1);
    if (kind === 'frost') assert.equal(flying.slow, 0);
    if (groundOnly) { assert.equal(s.shots.length, 0); assert.equal(s.fires.length, 0); assert.equal(s.buildings[0].cooldown, 0); }
  }
});

test('地面塔略過較靠近家的飛蟲，直接選中射程內的地面蟲', () => {
  for (const kind of ['cannon', 'flame']) {
    const s = G.createState(); G.build(s, kind, 6, 4); s.phase = 'running';
    const flying = enemy(s, 'flyer', 20, 5, 3), ground = enemy(s, 'bug', 20, 8, 3);
    ground.shock = 2;
    G.step(s, 1 / 60); assert.equal(s.shots[0].target, ground.id);
    advance(s, kind === 'flame' ? G.BATTLE_SPEED : .25); assert.equal(flying.hp, 20); assert.equal(ground.hp, 20 - G.TOOLS[kind].damage);
  }
});

test('大砲爆炸只波及地面目標，同範圍內的飛蟲與跳躍中跳蟲不受傷', () => {
  const s = G.createState(), center = enemy(s, 'bug', 10, 6, 3), nearby = enemy(s, 'bug', 10, 7, 3);
  const flying = enemy(s, 'flyer', 10, 6, 3), jumping = enemy(s, 'hopper', 10, 6, 3);
  G.startLeap(s, jumping);
  G.resolveShot(s, { kind: 'cannon', target: center.id, c: 6, r: 5 });
  assert.deepEqual([center.hp, nearby.hp, flying.hp, jumping.hp], [8, 8, 10, 10]);
  assert.equal(s.stats.hits, 2);
});

test('地面子彈飛行途中跳蟲起跳則不命中，落地後恢復可攻擊', () => {
  for (const kind of ['cannon', 'flame']) {
    const s = G.createState(); G.build(s, kind, 6, 4); s.phase = 'running';
    const jumping = enemy(s, 'hopper', 20, 8, 3);
    G.step(s, 1 / 60); assert.equal(s.shots[0].target, jumping.id);
    G.hit(s, jumping, { kind: 'pea', c: 6, r: 5 }); assert.ok(jumping.leap);
    if (kind === 'flame') jumping.shock = G.BATTLE_SPEED;
    advance(s, kind === 'flame' ? G.BATTLE_SPEED : .25); assert.equal(jumping.hp, 19); assert.equal(s.stats.hits, 1); assert.equal(s.fires.length, kind === 'flame' ? 1 : 0);
    assert.equal(G.canTarget(kind, jumping), false);
    advance(s, 0.65); assert.equal(jumping.leap, null); assert.equal(G.canTarget(kind, jumping), true);
    G.resolveShot(s, { kind, target: jumping.id, c: 6, r: 4 });
    assert.equal(jumping.hp, 19 - G.TOOLS[kind].damage);
  }
});

test('大砲只傷害爆炸範圍內的目標，中心不重複扣血', () => {
  const s = G.createState(), a = enemy(s, 'bug', 8, 6, 3), b = enemy(s, 'bug', 8, 7, 3), c = enemy(s, 'bug', 8, 8, 3);
  G.resolveShot(s, { kind: 'cannon', target: a.id, c: 6, r: 5 });
  assert.deepEqual([a.hp, b.hp, c.hp], [6, 6, 8]);
  assert.equal(s.stats.hits, 2); assert.ok(s.effects.some(e => e.kind === 'blast'));
});

test('盾蟲從上方擋住直接傷害，火石仍在落點點火', () => {
  for (const kind of ['cannon', 'flame']) {
    const s = G.createState(), a = enemy(s, 'shield', 8, 6, 3), b = enemy(s, 'bug', 8, 7, 3);
    G.resolveShot(s, { kind, target: a.id, c: 6, r: 1 });
    assert.deepEqual([a.hp, b.hp], [8, 8]); assert.equal(s.stats.blocked, 1);
    assert.equal(s.fires.length, Number(kind === 'flame')); assert.equal(b.slow, 0); assert.equal(s.effects.filter(e => e.kind === 'block').length, 1);
  }
});

test('冰凍靈氣從塔中心緩速地面目標，全體維持原血量', () => {
  const s = G.createState(), center = enemy(s, 'bug', 10, 6, 3);
  const edge = enemy(s, 'bug', 10, 6, 5 - G.TOOLS.frost.range), diagonal = enemy(s, 'bug', 10, 6.6, 3.6);
  const flying = enemy(s, 'flyer', 10, 6, 2.5), hopper = enemy(s, 'hopper', 10, 5.5, 3);
  const outside = enemy(s, 'bug', 10, 6, 5 - G.TOOLS.frost.range - .01);
  G.resolveShot(s, {kind:'frost',target:center.id,c:6,r:5});
  assert.equal(center.hp, 10); assert.equal(s.stats.hits, 0);
  for (const e of [center,edge,diagonal,hopper]) assert.equal(e.slow, G.TOOLS.frost.slowDuration);
  assert.equal(flying.slow, 0);
  for (const e of [edge,diagonal,flying,hopper,outside]) assert.equal(e.hp, 10);
  assert.equal(outside.slow, 0); assert.equal(hopper.jumped, false);
  assert.ok(s.effects.some(e=>e.kind==='frost' && e.radius===G.TOOLS.frost.range && e.x===6 && e.y===5));
  s.phase='running'; advance(s, 2.2);
  for (const e of [center,edge,diagonal,flying,hopper]) assert.equal(e.slow, 0);
});

test('冰凍靈氣無視上下盾，一血分裂蟲只緩速，升級每隻盾蟲各扣一血', () => {
  const s = G.createState(), center = enemy(s,'splitter',1,6,3);
  const up = enemy(s,'shield',10,6.2,3), down = enemy(s,'shield_down',10,5.8,3);
  G.resolveShot(s,{kind:'frost',target:center.id,c:6,r:5});
  assert.equal(center.dead,false); assert.equal(center.hp,1); assert.equal(center.flash,0); assert.equal(up.slow,G.TOOLS.frost.slowDuration); assert.equal(down.slow,G.TOOLS.frost.slowDuration);
  assert.deepEqual([up.hp,down.hp],[10,10]); assert.equal(s.stats.blocked,0);
  assert.equal(s.stats.split,0); assert.deepEqual(s.effects.map(e=>e.kind),['frost']);
  G.resolveShot(s,{kind:'frost',upgraded:true,c:6,r:1});
  assert.deepEqual([up.hp,down.hp,up.shieldFlash,down.shieldFlash,s.stats.blocked],[9,9,0,0,0]);
});

test('火焰命中後在地板燃燒三秒，每實際一秒扣一次血，火區重疊不疊傷', () => {
  const s = G.createState(), a = enemy(s, 'shield', 13, 6, 3);
  G.resolveShot(s, { kind: 'flame', target: a.id, c: 6, r: 5 });
  assert.equal(a.hp, 9); assert.equal(s.fires.length, 1);
  G.ignite(s, 6, 3); assert.equal(s.fires.length, 1, '同格只延長燃燒');
  G.ignite(s, 7, 3); a.x = 6.5;
  burn(s, G.BATTLE_SPEED - 1 / 60); assert.equal(a.hp, 9);
  burn(s, 1 / 60); assert.equal(a.hp, 8);
  burn(s, G.BATTLE_SPEED); assert.equal(a.hp, 7);
  burn(s, G.BATTLE_SPEED); assert.equal(a.hp, 6); assert.equal(s.fires.length, 0);
  assert.equal(s.stats.blocked, 0, '地板火焰從下方造成傷害');
  burn(s, 5); assert.equal(a.hp, 6);
});

test('離開火地板不受持續傷害；火焰不傷到範圍外的怪物', () => {
  const s = G.createState(), a = enemy(s, 'bug', 10, 6, 3), b = enemy(s, 'bug', 10, 8, 3);
  G.ignite(s, 6, 3); burn(s, G.BATTLE_SPEED);
  assert.equal(a.hp, 9); assert.equal(b.hp, 10);
  a.x = 8; burn(s, G.BATTLE_SPEED); assert.equal(a.hp, 9);
});

test('雷射沿直線貫穿多隻怪物，每隻只傷害一次，不波及旁邊一排', () => {
  const s = G.createState(); s.phase = 'running';
  const a = enemy(s, 'bug', 5, 4, 3), b = enemy(s, 'bug', 5, 6, 3), c = enemy(s, 'bug', 5, 5, 4);
  ray(s, 2, 3, 1, 0); advance(s, 0.55);
  assert.deepEqual([a.hp, b.hp, c.hp], [4, 4, 5]);
  assert.equal(s.stats.hits, 2); assert.equal(s.shots.length, 0);
});

test('雷射從盾面貫穿上盾蟲和下盾蟲，並繼續命中盾後的蟲', () => {
  for (const [kind, row, direction] of [['shield', 0, 1], ['shield_down', 7, -1]]) {
    const s = G.createState();
    const front = enemy(s, kind, 5, 6, row + 2 * direction);
    const behind = enemy(s, 'bug', 5, 6, row + 3 * direction);
    ray(s, 6, row, 0, direction);
    const beam = s.effects.find(e => e.kind === 'laser');
    assert.equal(beam.length, G.TOOLS.pierce.range);
    assert.deepEqual(beam.hitDistances, [2, 3]);
    assert.deepEqual([front.hp, behind.hp], [4, 4]);
    assert.equal(s.stats.hits, 2);
    assert.equal(s.stats.blocked, 0);
    assert.equal(front.shieldFlash, 0);
    assert.ok(!s.effects.some(e => e.kind === 'block'));
  }
});

test('空地擊退往離家更遠的方向三格，動畫結束後仍可正常尋路', () => {
  const s = G.createState(); s.phase = 'running';
  const a = enemy(s, 'shield', 10, 6, 4);
  G.hit(s, a, { kind: 'push', c: 6, r: 6 });
  assert.equal(a.hp, 9); assert.ok(Math.abs(a.push.x - 9) < 1e-9); assert.equal(a.push.y, 4);
  advance(s, 0.3); assert.ok(Math.abs(a.x - 9) < 1e-9); assert.equal(a.y, 4); assert.equal(a.push, null);
  advance(s, 1); assert.ok(a.x < 9); assert.equal(G.at(s, a.c, a.r), undefined);
});

test('擊退方向不受砲塔角度影響，遇牆繞行、邊界轉向，動畫不穿牆', () => {
  for (const [c,r] of [[3,1],[5,1],[5,5],[3,3],[7,3]]) {
    const s=G.createState(), e=enemy(s,'bug',10,5,3);
    G.hit(s,e,{kind:'push',c,r}); assert.ok(Math.abs(e.push.x-8)<1e-9); assert.equal(e.push.y,3);
  }
  const s = G.createState(); G.build(s, 'wall', 8, 3); s.phase='running';
  const a = enemy(s, 'bug', 10, 7, 3);
  G.hit(s, a, { kind: 'push', c: 4, r: 3 }); assert.equal(a.push.length,3); assert.ok(a.push.x>8); assert.notEqual(a.push.y,3);
  for(let i=0;i<19;i++) {G.step(s,1/60);assert.equal(G.at(s,Math.round(a.x),Math.round(a.y)),undefined);}
  const edge = enemy(s, 'bug', 10, 10, 5);
  G.hit(s, edge, { kind: 'push', c: 8, r: 5 }); assert.equal(edge.push.length,3); assert.ok(edge.push.x <= 11); assert.ok(edge.push.y<=7);
  const pool = G.createState(1); G.build(pool, 'wall', 7, 4); const e = enemy(pool, 'bug', 10, 5, 4);
  G.hit(pool, e, { kind: 'push', c: 5, r: 6 }); assert.equal(e.push.length,3); assert.notEqual(e.push.y,4);
  const flying=enemy(pool,'flyer',10,5,4); G.hit(pool,flying,{kind:'push',c:5,r:6});
  assert.ok(Math.abs(flying.push.x-8)<1e-9); assert.equal(flying.push.y,4);
});

test('擊退只影響命中格內地空目標，相鄰格不受影響', () => {
  const s=G.createState(); G.build(s,'push',5,5);
  const targets=[[7,3],[7.2,3.1],[6.8,2.8]].map(([x,y])=>enemy(s,'bug',10,x,y));
  targets.push(enemy(s,'flyer',10,7,3));
  const outside=enemy(s,'bug',10,6.49,3);
  G.resolveShot(s,{kind:'push',target:targets[0].id,c:5,r:5});
  for (const e of targets) {assert.equal(e.hp,9);assert.ok(e.push.x>e.x);assert.ok(e.push.length<=3+1e-9);assert.ok(e.push.points.length>=2);}
  assert.equal(outside.hp,10); assert.equal(outside.push,null); assert.equal(s.stats.hits,targets.length);
  assert.deepEqual(s.effects, []);
  G.resolveShot(s,{kind:'push',upgraded:true,target:targets[0].id,c:5,r:5});
  assert.deepEqual(targets.map(e=>e.hp),[6,6,6,6]); assert.equal(outside.hp,10);
});

test('擊退塔每次冷卻只攻擊一格，射程四格並優先最靠近小屋的目標', () => {
  const s=G.createState(); G.build(s,'push',6,3); s.phase='running';
  const a=enemy(s,'bug',10,7,2), b=enemy(s,'bug',10,7.2,2);
  const homeward=enemy(s,'bug',10,3,3), companion=enemy(s,'bug',10,3.1,3), farther=enemy(s,'bug',10,6,5);
  G.step(s,1/60); assert.equal(s.shots.length,1); assert.equal(s.shots[0].target,homeward.id);
  advance(s,0.25); assert.deepEqual([homeward.hp,companion.hp],[9,9]); assert.ok(homeward.push && companion.push);
  assert.deepEqual([a.hp,b.hp,farther.hp],[10,10,10]);
  assert.equal(s.stats.hits,2); assert.ok(s.buildings[0].cooldown>2.7);
  assert.deepEqual(s.effects, []);
  const ranged=G.createState(); G.build(ranged,'push',2,3); ranged.phase='running';
  const distant=enemy(ranged,'giant',10,5.8,3); enemy(ranged,'giant',10,6.2,3);
  G.step(ranged,1/60); assert.equal(ranged.shots[0].target,distant.id);
  advance(ranged,0.25); assert.equal(distant.hp,9); assert.equal(ranged.enemies[1].hp,10);
});

test('擊退彈原目標先死亡，仍只影響最後瞄準的一格', () => {
  const s=G.createState(); G.build(s,'push',6,5); s.phase='running';
  const target=enemy(s,'bug',10,7,4), same=enemy(s,'bug',10,7.1,4), other=enemy(s,'bug',10,8,4);
  G.step(s,1/60); assert.equal(s.shots[0].target,target.id); target.dead=true;
  advance(s,0.25); assert.equal(same.hp,9); assert.ok(same.push); assert.equal(other.hp,10);
});

test('同格擊退擊殺多隻分裂目標後仍完成命中，不重複攻擊新生小蟲', () => {
  const s=G.createState(); G.build(s,'push',6,3);
  const first=enemy(s,'splitter',1,5,2); enemy(s,'splitter',1,5.2,2); const survivor=enemy(s,'bug',10,5.3,2);
  G.resolveShot(s,{kind:'push',target:first.id,c:6,r:3});
  assert.equal(s.stats.split,2);assert.equal(s.buildings.length,1);
  assert.equal(survivor.hp,9);assert.ok(survivor.push.x>survivor.x);
  const babies=s.enemies.filter(e=>e.kind==='bug'&&e.id!==survivor.id);
  assert.equal(babies.length,6);assert.ok(babies.every(e=>e.hp===2 && e.push===null));
});

test('盾蟲擋住上方擊退，數字及位置都不變', () => {
  const s = G.createState(), a = enemy(s, 'shield', 10, 6, 3);
  G.hit(s, a, { kind: 'push', c: 6, r: 1 });
  assert.equal(a.hp, 10); assert.equal(a.push, null); assert.equal(s.stats.blocked, 1);
});

test('分子砲從盾面命中上下盾蟲本體，每發只扣單一目標 28 血', () => {
  for (const [kind, r] of [['shield', 1], ['shield_down', 5]]) {
    const s = G.createState(), target = enemy(s, kind, 56, 6, 3);
    const neighbor = enemy(s, 'bug', 10, 6.1, 3), money = s.money;
    const shot = { kind: 'molecular', target: target.id, c: 6, r };
    assert.deepEqual(G.impactPoint(target, shot), { x: target.x, y: target.y });
    G.resolveShot(s, shot);
    assert.equal(target.hp, 28);
    assert.equal(s.effects.at(-1).kind, 'molecular');
    G.resolveShot(s, shot);
    G.resolveShot(s, shot);
    assert.equal(target.hp, 0);
    assert.equal(neighbor.hp, 10);
    assert.equal(s.stats.hits, 2);
    assert.equal(s.stats.blocked, 0);
    assert.equal(target.shieldFlash, 0);
    assert.ok(!s.effects.some(e => e.kind === 'block'));
    assert.equal(s.money, money);
  }
});

test('暫停時火地板、擊退動畫和雷射光束也全部停住', () => {
  const s = G.createState(), a = enemy(s, 'bug', 10, 6, 3);
  G.ignite(s, 6, 3); G.hit(s, a, { kind: 'push', c: 4, r: 3 }); ray(s, 2, 3, 1, 0);
  s.phase = 'paused'; const before = JSON.stringify(s); advance(s, 2);
  assert.equal(JSON.stringify(s), before);
});

test('舊存檔的連發塔轉成大砲，保留進度與盤面並補足開局金錢差額', () => {
  const s = G.createState(); G.build(s, 'cannon', 5, 5);
  const save = G.snapshot(s); save.version = 1; save.buildings[0].kind = 'rapid'; save.wave = 2;
  const restored = G.restore(save);
  assert.equal(restored.wave, 0); assert.equal(restored.money, save.money + 48 - 22); assert.equal(restored.buildings[0].kind, 'cannon');
  assert.equal(save.buildings[0].kind, 'rapid');
});

test('火焰塔一擊殺死剩一血小蟲，仍留下三秒火地板並傷害後續目標', () => {
  const s = G.createState(), a = enemy(s, 'bug', 1, 6, 3);
  G.resolveShot(s, { kind: 'flame', target: a.id, c: 6, r: 5 });
  assert.equal(a.dead, true); assert.equal(s.fires.length, 1);
  assert.equal(s.fires[0].life, G.TOOLS.flame.burnSeconds * G.BATTLE_SPEED);
  const next = enemy(s, 'bug', 2, 6, 3); burn(s, G.BATTLE_SPEED);
  assert.equal(next.hp, 1); assert.ok(s.fires.length > 0);
});

test('火焰塔擊殺整關最後一隻怪物，結算畫面仍保留地面火焰', () => {
  const s = G.createState(9); s.phase = 'running';
  const a = enemy(s, 'bug', 1, 6, 3);
  s.shots.push({ id: s.nextId++, kind: 'flame', target: a.id, c: 6, r: 5, age: 0.19, duration: 0.2 });
  G.step(s, 1 / 60);
  assert.equal(s.phase, 'won'); assert.equal(s.enemies.length, 0);
  assert.equal(s.fires.length, 1); assert.ok(s.fires[0].life > 4);
});

test('火球飛行途中目標先被擊殺，仍落在發射時的位置並點燃地板', () => {
  const s = G.createState(); G.build(s, 'flame', 6, 6); s.phase = 'running';
  const a = enemy(s, 'bug', 1, 6, 3); G.step(s, 1 / 60);
  assert.equal(s.shots.length, 1); const impact = [s.shots[0].impactX, s.shots[0].impactY];
  G.hit(s, a, { kind: 'pea', c: 6, r: 5 }); advance(s, G.BATTLE_SPEED);
  assert.equal(s.fires.length, 1); assert.equal(s.fires[0].c, Math.round(impact[0])); assert.equal(s.fires[0].r, Math.round(impact[1]));
});

test('冰凍塔直接釋放靈氣，盾蟲和範圍內地面蟲同時緩速', () => {
  const s = G.createState(); G.build(s, 'frost', 6, 3); s.phase = 'running';
  const shield = enemy(s, 'shield', 8, 5, 4), nearby = enemy(s, 'bug', 12, 8, 3);
  G.step(s, 1 / 60);
  assert.equal(s.shots.length, 0);
  assert.equal(shield.hp, 8); assert.ok(shield.slow > 0);
  assert.equal(nearby.hp, 12); assert.ok(nearby.slow > 0);
  assert.ok(s.effects.some(e => e.kind === 'frost' && e.x === 6 && e.y === 3));
});

test('開火後落點固定，蟲走開時以原位置判定命中、點火與爆炸', () => {
  for (const kind of ['pea', 'cannon', 'flame', 'push', 'molecular']) {
    const s = G.createState(); G.build(s, kind, 6, 4); s.phase = 'running';
    const original = enemy(s, 'giant', 50, 8, 3);
    if (kind === 'molecular') s.buildings[0].aim = { target: original.id, age: 2 * G.BATTLE_SPEED };
    G.step(s, 1 / 60);
    const shot = s.shots[0], { impactX, impactY, tipX, tipY } = shot;
    Object.assign(original, { x: 2, y: 1, c: 2, r: 1, next: null });
    const replacement = enemy(s, 'giant', 45, impactX, impactY);
    G.step(s, 1 / 60);
    assert.deepEqual([shot.impactX, shot.impactY, shot.tipX, shot.tipY], [impactX, impactY, tipX, tipY], kind);
    replacement.shock = 2;
    advance(s, kind === 'flame' ? .5 * G.BATTLE_SPEED : kind === 'molecular' ? .36 * G.BATTLE_SPEED : .23);
    assert.equal(original.hp, 50, kind);
    assert.equal(replacement.hp, 45 - G.TOOLS[kind].damage, kind);
    if (kind === 'flame') assert.deepEqual(s.fires.map(f => [f.c, f.r]), [[8, 3]]);
    if (kind === 'cannon') assert.ok(s.effects.some(e => e.kind === 'blast' && e.x === impactX && e.y === impactY));
  }
});

test('升級晶石只在通關時發一次，拆除與復原同步還原晶石和建築', () => {
  const s = G.createState();
  G.build(s, 'pea', 3, 3);
  assert.equal(G.upgrade(s, 3, 3).ok, false);
  G.startWave(s); s.queue = []; G.step(s, 1 / 60);
  assert.equal(s.upgradeItems, 1);
  G.step(s, 1 / 60); assert.equal(s.upgradeItems, 1);
  assert.equal(G.upgrade(s, 4, 3).ok, false);
  const money = s.money;
  assert.equal(G.upgrade(s, 3, 3).ok, true);
  assert.equal(G.upgrade(s, 3, 3).ok, false);
  assert.equal(s.upgradeItems, 0); assert.equal(s.money, money);
  assert.equal(G.undo(s), true);
  assert.equal(s.upgradeItems, 1); assert.equal(G.at(s, 3, 3).upgraded, false);
  G.upgrade(s, 3, 3); G.remove(s, 3, 3);
  assert.equal(s.money, money + G.TOOLS.pea.cost); assert.equal(s.upgradeItems, 1);
  G.undo(s);
  assert.equal(s.money, money); assert.equal(s.upgradeItems, 0);
  assert.equal(G.at(G.restore(G.snapshot(s)), 3, 3).upgraded, true);
  G.startWave(s); assert.equal(G.upgrade(s, 3, 3).ok, false);
  assert.equal(G.at(G.retry(s), 3, 3).upgraded, true);
  const old = { ...s.checkpoint, version: 11 };
  const migrated = G.restore(old);
  assert.equal(migrated.upgradeItems, 1); assert.equal(G.at(migrated, 3, 3).upgraded, false);
  assert.equal(G.restore({ ...s.checkpoint, upgradeItems: 1 }), null);
});

test('摧毀升級塔退回原價與晶石，重試不重複退款，過關另得一顆', () => {
  const s = G.createState(1); s.upgradeItems = 1;
  for (let r = 0; r < G.ROWS; r++) G.build(s, r === 3 ? 'pea' : 'wall', 8, r);
  G.upgrade(s, 8, 3); const money = s.money;
  G.startWave(s); s.queue = [];
  for (let i = 0; i < 4; i++) enemy(s, 'shield', 100, 9, 3);
  for (let i = 0; i < 3000 && !s.stats.broken; i++) G.step(s, 1 / 60);
  assert.equal(s.stats.broken, 1); assert.equal(s.money, money + G.TOOLS.pea.cost); assert.equal(s.upgradeItems, 1);
  const retry = G.retry(s);
  assert.equal(G.at(retry, 8, 3).upgraded, true); assert.equal(retry.money, money); assert.equal(retry.upgradeItems, 0);
  advance(s, 30);
  const next = G.restore(G.snapshot(s));
  assert.equal(next.level, 2); assert.equal(G.at(next, 8, 3), undefined);
  assert.equal(next.money, money + G.TOOLS.pea.cost + G.LEVELS[1].reward); assert.equal(next.upgradeItems, 2);
});

test('選關、舊部署與完成存檔的晶石總數等於已過關數，重讀不會重複補發', () => {
  for (let level = 0; level < G.LEVELS.length; level++) {
    assert.equal(G.createState(level).upgradeItems, level);
  }
  for (const completed of [false, true]) {
    const s = G.createState(9);
    G.build(s, 'pea', 3, 3); G.upgrade(s, 3, 3);
    const old = { ...G.snapshot(s), version: 14, completed, upgradeItems: 2 };
    const restored = G.restore(old), available = (completed ? 10 : 9) - 1;
    assert.equal(restored.upgradeItems, available);
    assert.equal(G.at(restored, 3, 3).upgraded, true);
    assert.equal(G.restore(G.snapshot(restored)).upgradeItems, available);
  }
});

test('連射塔的實際射速為原本的 2.5 倍，重裝大砲的直擊和爆風同為四點', () => {
  const intervals = [false, true].map(upgraded => {
    const s = G.createState(1); s.upgradeItems = 1; G.build(s, 'pea', 4, 2);
    if (upgraded) G.upgrade(s, 4, 2);
    s.phase = 'running'; enemy(s, 'giant', 100, 5, 3);
    const times = [];
    for (let i = 0; i < 130 && times.length < 2; i++) {
      G.step(s, 1 / 60);
      if (s.buildings[0].flash === 1) times.push(s.time);
    }
    return times[1] - times[0];
  });
  assert.ok(Math.abs(intervals[1] - intervals[0] / 2.5) <= 1 / 60);
  const s = G.createState(), a = enemy(s, 'giant', 20, 4, 3), b = enemy(s, 'bug', 8, 5, 3);
  G.resolveShot(s, { kind: 'cannon', upgraded: true, target: a.id, c: 3, r: 2 });
  assert.deepEqual([a.hp, b.hp], [16, 4]);
});

test('震盪拳擊退四格後才開始暈眩，完全無路可退時暈五秒', () => {
  const s = G.createState(); s.phase = 'running';
  const a = enemy(s, 'giant', 100, 4, 3), source = { kind: 'push', upgraded: true, c: 2, r: 3 };
  G.hit(s, a, source); assert.equal(a.hp, 97); assert.equal(a.push.length, 4); assert.equal(a.stun, G.BATTLE_SPEED);
  while (a.push) G.step(s, 1 / 60);
  assert.equal(a.stun, G.BATTLE_SPEED);
  const x = a.x, y = a.y;
  advance(s, G.BATTLE_SPEED); assert.deepEqual([a.x, a.y], [x, y]);
  advance(s, .1); assert.notDeepEqual([a.x, a.y], [x, y]);
  const closed = G.createState();
  for (const [c,r] of [[4,3],[6,3],[5,2],[5,4]]) G.build(closed, 'wall', c, r);
  const b = enemy(closed, 'bug', 10, 5, 3);
  G.hit(closed, b, source); assert.equal(b.hp, 7); assert.equal(b.push, null); assert.equal(b.stun, 5 * G.BATTLE_SPEED);
});

test('連鎖電漿從實際命中的蟲彈射，按 28、9、3、1 衰減，不折返也不跨越三格空隙', () => {
  const s = G.createState();
  const targets = [1,3,5,7,9].map(x => enemy(s, 'shield', 50, x, 3));
  G.resolveShot(s, {kind: 'molecular', upgraded: true, c: 1, r: 1, target: targets[0].id});
  s.phase = 'running';
  targets.forEach(e => e.shock = 5);
  for (const [hop, expected] of [[0,[22,50,50,50,50]], [1,[22,41,50,50,50]], [2,[22,41,47,50,50]]]) {
    assert.deepEqual(targets.map(e => e.hp), expected);
    assert.equal(s.effects.find(arc => arc.kind === 'plasmaArc' && arc.hop === hop).damage, [9,3,1][hop]);
    advance(s, .3 * G.BATTLE_SPEED);
  }
  assert.deepEqual(targets.map(e => e.hp), [22,41,47,49,50]);
  const sparse = G.createState(), a = enemy(sparse, 'bug', 20, 1, 3), far = enemy(sparse, 'flyer', 20, 4.01, 3);
  G.resolveShot(sparse, {kind: 'molecular', upgraded: true, c: 1, r: 1, target: a.id});
  assert.equal(a.dead, true); assert.equal(far.hp, 20);
});

test('霜晶直接傷害並緩速，電弧穿盾並讓同線每隻蟲停住 0.2 秒', () => {
  const s = G.createState(); s.phase = 'running';
  const a = enemy(s, 'giant', 10, 4, 3), b = enemy(s, 'shield', 10, 5, 3);
  const aura = {kind:'frost', c:4, r:2, upgraded:true};
  assert.equal(G.toolFor('frost', true).rate, 1.08);
  G.resolveShot(s, aura); assert.deepEqual([a.hp,b.hp], [9,9]);
  G.resolveShot(s, aura); assert.deepEqual([a.hp,b.hp], [8,8]);
  G.resolveShot(s, {kind:'pierce', c:3, r:3, angle:0, upgraded:true});
  assert.deepEqual([a.hp,b.hp], [6,6]);
  assert.equal(b.shock, .2 * G.BATTLE_SPEED);
  advance(s, .2 * G.BATTLE_SPEED); assert.deepEqual([a.x,b.x], [4,5]);
  advance(s, .1); assert.ok(a.x < 4 && b.x < 5);
});

test('餘燼火地燒到的蟲離開後完整灼燒五秒，重疊與重新進入火地不重複疊傷', () => {
  const s = G.createState(), a = enemy(s, 'giant', 12, 4.5, 4);
  G.ignite(s, 4, 4, true); G.ignite(s, 5, 4, true);
  burn(s, G.BATTLE_SPEED); assert.equal(a.hp, 11);
  a.y = 6; burn(s, .5 * G.BATTLE_SPEED); assert.equal(a.hp, 11);
  a.y = 4; burn(s, .5 * G.BATTLE_SPEED); assert.equal(a.hp, 10);
  a.y = 6;
  for (const hp of [9,8,7,6,5,5]) { burn(s, G.BATTLE_SPEED); assert.equal(a.hp, hp); }
  assert.equal(a.burnTicks, 0);
});

test('尖刺石牆一次暈住周圍八格內每隻地面蟲，正面盾牌仍擋傷害', () => {
  const s = G.createState(1); G.build(s, 'wall', 5, 3); G.upgrade(s, 5, 3);
  s.phase = 'running';
  const targets = [];
  for (const dy of [-1, 0, 1]) for (const dx of [-1, 0, 1]) {
    if (dx || dy) targets.push(enemy(s, 'bug', 10, 5 + dx, 3 + dy));
  }
  const flyer = enemy(s, 'flyer', 10, 6.49, 4.49);
  const shields = [enemy(s, 'shield', 10, 6, 4), enemy(s, 'shield_down', 10, 4, 2)];
  const far = enemy(s, 'giant', 10, 6.51, 4);
  for (const e of s.enemies) e.shock = 1 / 60;
  G.step(s, 1 / 60);
  assert.ok(targets.every(e => e.hp === 9));
  assert.equal(flyer.hp,10); assert.equal(flyer.spikeStun,0);
  assert.ok(shields.every(e => e.hp === 10 && e.shieldFlash > 0));
  assert.equal(far.hp, 10); assert.equal(far.spikeStun, 0);
  const struck = [...targets, ...shields];
  assert.ok(struck.every(e => e.spikeStun === .3 * G.BATTLE_SPEED));
  assert.equal(s.effects.filter(e => e.kind === 'spikeHit').length, struck.length);
  const positions = struck.map(e => [e.x, e.y]);
  advance(s, .3 * G.BATTLE_SPEED);
  assert.deepEqual(struck.map(e => [e.x, e.y]), positions);
  G.step(s, 1 / 60);
  assert.ok(struck.some((e, i) => e.x !== positions[i][0] || e.y !== positions[i][1]));
});

test('尖刺牆旁只有飛蟲和起跳的跳蟲時不出刺，跳蟲落地後才攻擊', () => {
  const s = G.createState(1); G.build(s,'wall',5,3); G.upgrade(s,5,3); s.phase='running';
  const wall = G.at(s,5,3), fly = enemy(s,'flyer',12,6,3), hopper = enemy(s,'hopper',12,6,4);
  G.startLeap(s,hopper); hopper.shock = 1;
  G.step(s,1/60);
  assert.equal(wall.flash,0); assert.equal(wall.cooldown,0);
  assert.equal(G.hit(s,fly,{kind:'wall',upgraded:true,c:5,r:3}),false);
  assert.deepEqual([fly.hp,hopper.hp,fly.spikeStun,hopper.spikeStun],[12,12,0,0]);
  assert.ok(!s.effects.some(e=>e.kind==='spikeHit'));
  hopper.leap=null; G.step(s,1/60);
  assert.equal(hopper.hp,11); assert.ok(hopper.spikeStun>0); assert.equal(fly.hp,12);
});

test('尖刺石牆持續出刺每 2 秒 1 次，暈眩也能立即停住擊退中的蟲', () => {
  const s = G.createState(1); G.build(s, 'wall', 5, 3); G.upgrade(s, 5, 3);
  s.phase = 'running';
  const held = enemy(s, 'bug', 20, 6, 4); held.shock = 20 * G.BATTLE_SPEED;
  const pushed = enemy(s, 'bug', 20, 5, 4);
  G.hit(s, pushed, {kind:'push', c:2, r:4, upgraded:true});
  G.step(s, 1 / 60);
  const age = pushed.push.age, landingStun = pushed.stun;
  advance(s, .3 * G.BATTLE_SPEED);
  assert.equal(pushed.push.age, age);
  assert.equal(pushed.stun, landingStun);
  G.step(s, 1 / 60); assert.ok(pushed.push.age > age);
  while (s.time < 10 * G.BATTLE_SPEED - .02) G.step(s, 1 / 60);
  assert.equal(held.hp, 15);
  advance(s, .05); assert.equal(held.hp, 14);
});

test('各塔分別記錄實際扣血，沿用舊紀錄到結算，忽略格擋與溢傷', () => {
  const s = G.createState(5);
  G.build(s, 'molecular', 4, 1); G.build(s, 'pea', 3, 1);
  const [plasma, pea] = s.buildings;
  plasma.lastDamage = 2;
  G.startWave(s); s.queue = [];
  const a = enemy(s, 'shield', 5, 4, 3), b = enemy(s, 'bug', 8, 6, 3);
  G.hit(s, a, {kind:'pea', tower:pea.id, c:3, r:1});
  assert.equal(a.hp, 5);
  G.resolveShot(s, {kind:'molecular', tower:plasma.id, upgraded:true, target:a.id, c:4, r:1});
  assert.equal(plasma.lastDamage, 2); assert.equal(a.dead, true); assert.equal(b.dead, false);
  s.castle = null; pea.cooldown = 5;
  advance(s,.3 * G.BATTLE_SPEED); assert.equal(b.dead, true);
  G.step(s, 1 / 60);
  assert.equal(plasma.lastDamage, 13); assert.equal(pea.lastDamage, 0);
  const saved = G.restore(G.snapshot(s));
  assert.deepEqual(saved.buildings.map(b => b.lastDamage), [13,0]);
  G.startWave(saved); saved.queue = []; G.step(saved, 1 / 60);
  assert.deepEqual(saved.buildings.map(b => b.lastDamage), [0,0]);
});

test('火石只鎖定兩格外至五格的地面目標，半秒後命中固定格內全部地面蟲', () => {
  const s = G.createState(2); G.build(s,'flame',5,3); s.phase = 'running';
  const close = enemy(s,'bug',20,3,3), far = enemy(s,'bug',20,10.01,3), air = enemy(s,'flyer',20,7,2);
  for (const e of s.enemies) e.shock = 5;
  G.step(s,1/60); assert.equal(s.shots.length,0);
  const edge = enemy(s,'bug',20,10,3); edge.shock = 5;
  G.step(s,1/60); assert.deepEqual([s.shots[0].impactX,s.shots[0].impactY],[10,3]);
  const same = enemy(s,'bug',20,10.45,3.45), next = enemy(s,'bug',20,9.49,3);
  same.shock = next.shock = 5; air.x = 10; air.y = 3;
  advance(s,.5 * G.BATTLE_SPEED-2/60); assert.equal(s.fires.length,0); assert.equal(edge.hp,20);
  G.step(s,1/60);
  assert.deepEqual([edge.hp,same.hp,far.hp,close.hp,next.hp,air.hp],[16,16,16,20,20,20]);
  assert.equal(s.fires.length,1); assert.ok(s.effects.some(e=>e.kind==='stoneImpact'));
});

test('城堡升級耗一晶石，多一心、同時雙箭，支援復原、重試、過關與舊存檔', () => {
  const s = G.createState(2), {c,r} = G.LEVELS[2].goal;
  const old = G.snapshot(s); delete old.castleUpgraded; old.version = 15;
  assert.equal(G.restore(old).castleUpgraded,false);
  assert.ok(G.upgrade(s,c,r).ok); assert.equal(s.upgradeItems,1); assert.equal(s.hearts,6);
  assert.equal(G.upgrade(s,c,r).ok,false);
  assert.ok(G.undo(s)); assert.equal(s.hearts,5); assert.equal(s.upgradeItems,2);
  G.upgrade(s,c,r); assert.ok(G.remove(s,c,r).ok); assert.equal(s.upgradeItems,2);
  G.undo(s); const loaded=G.restore(G.snapshot(s)); assert.equal(loaded.hearts,6);
  G.startWave(loaded); const retry=G.retry(loaded); assert.ok(retry.castleUpgraded); assert.equal(retry.upgradeItems,1);
  loaded.queue=[]; const target=enemy(loaded,'bug',4,c+2,r); target.shock=3;
  G.step(loaded,1/60); assert.deepEqual(loaded.shots.map(a=>a.barrelOffset),[-5,5]);
  advance(loaded,.22); assert.equal(loaded.phase,'planning'); assert.equal(loaded.hearts,6);
  assert.equal(loaded.upgradeItems,2); assert.ok(G.restore(G.snapshot(loaded)).castleUpgraded);
});

test('火球、地板、離開後的餘燼，各點傷害只歸屬一次', () => {
  const s = G.createState(), a = enemy(s, 'giant', 13, 4, 3);
  G.resolveShot(s, {kind:'flame', tower:1, upgraded:true, target:a.id, c:3, r:3});
  assert.equal(a.hp, 7); assert.equal(a.burnTicks, 5);
  G.ignite(s, 4, 3, false, 2);
  burn(s, G.BATTLE_SPEED);
  assert.equal(a.hp, 6);
  a.y = 5; burn(s, 5 * G.BATTLE_SPEED);
  assert.equal(a.hp, 1);
  assert.deepEqual(s.waveStats.damageByTower, {1:11,2:1});
});

test('普通雷射暈眩 0.1 秒、尖刺石牆暈眩 0.3 秒，尖刺只在命中時留下特效', () => {
  const s = G.createState(1);
  const a = enemy(s, 'giant', 10, 4, 3);
  G.resolveShot(s, {kind:'pierce', c:2, r:3, angle:0, tower:1});
  assert.equal(a.shock, .1 * G.BATTLE_SPEED);
  G.hit(s, a, {kind:'wall', upgraded:true, c:3, r:3, tower:2});
  assert.equal(a.spikeStun, .3 * G.BATTLE_SPEED);
  assert.equal(s.effects.filter(e => e.kind === 'spikeHit').length, 1);
  assert.deepEqual(s.waveStats.damageByTower, {1:1,2:1});
});

test('分子砲新買付十八，舊塔保留實付二十二，摧毀後金幣守恆', () => {
  const old = G.createState(1);
  for (let r = 0; r < G.ROWS; r++) G.build(old, r === 3 ? 'molecular' : 'wall', 8, r);
  const data = G.snapshot(old); data.version = 12; data.money -= 4;
  data.buildings.find(b => b.kind === 'molecular').paidCost = 22;
  const s = G.restore(data); assert.ok(s); assert.equal(G.TOOLS.molecular.cost,18);
  G.startWave(s); s.queue = [];
  for (let i=0; i<4; i++) enemy(s, 'shield', 200, 9, 3);
  advance(s, 30); assert.equal(s.level, 2);
  assert.equal(s.money, data.money + 22 + G.LEVELS[1].reward);
  assert.equal(G.restore(G.snapshot(s)).money, s.money);
});

test('兩種冰塔都讓地面蟲以原速 70% 移動，飛蟲維持原速', () => {
  for (const kind of ['giant','flyer']) {
    const distance = upgraded => {
      const s = G.createState(); s.phase = 'running';
      const a = enemy(s,kind,20,5,3);
      if (upgraded !== null) G.hit(s, a, {kind:'frost', c:5, r:2, upgraded});
      advance(s, .5);
      return 5 - a.x;
    };
    const normal = distance(null);
    for (const upgraded of [false,true]) assert.ok(Math.abs(distance(upgraded) / normal - (kind === 'flyer' ? 1 : .7)) < 1e-8);
  }
});

test('普通與升級冰塔都略過飛蟲和跳在空中的蟲，落地才重新成為目標', () => {
  for (const upgraded of [false, true]) {
    const s = G.createState(), flying = enemy(s, 'flyer', 9, 6, 3);
    const hopper = enemy(s, 'hopper', 9, 6, 4);
    G.startLeap(s, hopper);
    const aura = { kind: 'frost', c: 5, r: 3, upgraded };
    G.resolveShot(s, aura);
    assert.deepEqual([flying.slow, hopper.slow, flying.hp, hopper.hp], [0, 0, 9, 9]);
    hopper.leap = null;
    G.resolveShot(s, aura);
    assert.equal(hopper.hp, upgraded ? 8 : 9);
    assert.ok(hopper.slow > 0);
    assert.deepEqual([flying.hp, flying.slow], [9, 0]);
  }
});

test('主線及中央城堡用普通砲射速朝固定落點射箭，射程三格、單體兩傷', () => {
  for (const level of [0, G.BONUS_LEVEL]) {
    const s = G.createState(level), {c, r} = G.LEVELS[level].goal;
    G.startWave(s); s.queue = [];
    const air = enemy(s, 'flyer', 12, c + 3.05, r);
    air.shock = 10;
    G.step(s, 1 / 60);
    assert.equal(s.shots.length, 0);
    air.x = c + 3;
    const ground = enemy(s, 'giant', 12, c + 3, r); ground.shock = 10;
    G.step(s, 1 / 60);
    assert.deepEqual([s.shots[0].kind, s.shots[0].target, s.shots[0].c, s.shots[0].r], ['castle', air.id, c, r]);
    assert.ok(Math.abs(s.castle.cooldown + 1 / 60 - G.BATTLE_SPEED / G.TOOLS.pea.rate) < .001);
    advance(s, .25);
    assert.deepEqual([air.hp, ground.hp, s.waveStats.damageByTower.castle], [10, 12, 2]);
    advance(s, .5);
    assert.equal(s.shots.length, 0);
    air.x = c + 4;
    advance(s, .25);
    assert.equal(s.shots[0].target, ground.id);
    ground.x = c + 1;
    advance(s, .25);
    assert.equal(ground.hp, 12);
    assert.equal(s.buildings.length, 0);
    assert.equal(s.money, G.LEVELS[level].money);
  }
});
