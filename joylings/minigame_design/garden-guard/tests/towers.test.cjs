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
function ray(s, c, r, ux, uy, remaining = 6) {
  s.shots.push({ id: s.nextId++, kind: 'pierce', c, r, x: c, y: r, ux, uy, remaining, hitIds: [] });
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

test('分子砲兩發擊殺第八關的五十六血巨蟲', () => {
  const hp=G.LEVELS[7].waves.flat().find(g=>g.kind==='giant').hp;
  const s=G.createState(7), target=enemy(s,'giant',hp,6,3);
  assert.equal(hp,56);
  const shot={kind:'molecular',target:target.id,c:6,r:5};
  G.resolveShot(s,shot); assert.equal(target.hp,28); assert.equal(target.dead,false);
  G.resolveShot(s,shot); assert.equal(target.hp,0); assert.equal(target.dead,true); assert.equal(s.stats.hits,2);
});

test('穿透塔可命中原射程以外的直線目標，子彈延伸至六點二格', () => {
  const s = G.createState(); G.build(s, 'pierce', 3, 3); s.phase = 'running';
  const a = enemy(s, 'giant', 20, 8.5, 3), b = enemy(s, 'giant', 20, 9, 3), outside = enemy(s, 'giant', 20, 10.5, 3);
  G.step(s, 1 / 60); assert.equal(s.shots[0].target, a.id);
  assert.ok(Math.abs(s.shots[0].remaining - (6.2 - 12 / 60)) < 1e-9);
  advance(s, 0.55); assert.deepEqual([a.hp, b.hp, outside.hp], [19, 19, 20]); assert.equal(s.shots.length, 0);
});

test('分子砲優先射程內剩餘血量最高者，忽略射程外、死亡及高上限但殘血目標', () => {
  const s = G.createState(); G.build(s, 'molecular', 2, 3); s.phase = 'running';
  const small = enemy(s, 'bug', 2, 3, 3), injured = enemy(s, 'giant', 100, 4, 3);
  injured.hp = 1;
  const high = enemy(s, 'giant', 40, 8.5, 3), outside = enemy(s, 'giant', 200, 10, 3);
  const dead = enemy(s, 'giant', 300, 5, 3); dead.dead = true;
  G.step(s, 1 / 60); assert.equal(s.buildings[0].aim.target, high.id); assert.equal(s.shots.length, 0);
  advance(s, 2.5 * G.BATTLE_SPEED - 2 / 60); assert.equal(s.shots.length, 0); assert.equal(high.hp, 40);
  G.step(s, 1 / 60); assert.equal(s.shots[0].target, high.id);
  advance(s, 0.25); assert.deepEqual([small.hp, injured.hp, high.hp, outside.hp], [2, 1, 12, 200]);
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

test('分子砲持續追蹤同一目標，暫停凍結瞄準，每次射擊前都需二點五秒', () => {
  const s=G.createState(); G.build(s,'molecular',3,5); s.phase='running';
  const first=enemy(s,'giant',50,8,3), tower=s.buildings[0];
  advance(s,1.5); const age=tower.aim.age;
  const later=enemy(s,'giant',100,8,4);
  G.togglePause(s); const paused=JSON.stringify(s); advance(s,20); assert.equal(JSON.stringify(s),paused);
  G.togglePause(s); advance(s,2.5*G.BATTLE_SPEED-age-1/60);
  assert.equal(tower.aim.target,first.id); assert.equal(s.shots.length,0);
  G.step(s,1/60); assert.equal(s.shots[0].target,first.id);
  advance(s,0.25); assert.equal(first.hp,22); assert.equal(later.hp,100); assert.equal(tower.aim.target,later.id);
  advance(s,2.5*G.BATTLE_SPEED-tower.aim.age-1/60); assert.equal(s.shots.length,0);
  G.step(s,1/60); assert.equal(s.shots[0].target,later.id);
});

test('分子砲失去死亡或離開射程的目標時重新瞄準完整二點五秒', () => {
  for(const reason of ['dead','outside']) {
    const s=G.createState(); G.build(s,'molecular',2,5); s.phase='running';
    const first=enemy(s,'giant',40,6,3), backup=enemy(s,'giant',20,5,4), tower=s.buildings[0];
    advance(s,2); assert.equal(tower.aim.target,first.id);
    if(reason==='dead') first.dead=true;
    else Object.assign(first,{x:11,y:0,c:11,r:0,next:null});
    G.step(s,1/60); assert.equal(tower.aim.target,backup.id); assert.equal(tower.aim.age,1/60);
    advance(s,2.5*G.BATTLE_SPEED-2/60); assert.equal(s.shots.length,0); assert.equal(backup.hp,20);
    G.step(s,1/60); assert.equal(s.shots[0].target,backup.id);
  }
});

test('分子砲命中後才重新選敵，不會以扣血前的數字再次鎖定原目標', () => {
  const s=G.createState(); G.build(s,'molecular',5,5); s.phase='running';
  const first=enemy(s,'giant',56,8,3), other=enemy(s,'giant',45,8,4), tower=s.buildings[0];
  advance(s,2.5*G.BATTLE_SPEED); assert.equal(s.shots[0].target,first.id);
  advance(s,0.1); assert.equal(first.hp,56); assert.equal(tower.aim,null);
  advance(s,0.15); assert.equal(first.hp,28); assert.equal(tower.aim.target,other.id);
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

test('火焰與大砲不對飛蟲開火，其餘五種塔可選中並傷害飛蟲', () => {
  for (const kind of Object.keys(G.TOOLS).filter(k => k !== 'wall')) {
    const s = G.createState(); G.build(s, kind, 6, 4); s.phase = 'running';
    const flying = enemy(s, 'flyer', 100, 7, 3), groundOnly = ['cannon', 'flame'].includes(kind);
    assert.equal(G.canTarget(kind, flying), !groundOnly);
    advance(s, kind === 'molecular' ? 2.5 * G.BATTLE_SPEED + 0.25 : 0.5);
    assert.equal(flying.hp, groundOnly ? 100 : 100 - G.TOOLS[kind].damage);
    assert.equal(s.stats.hits, groundOnly ? 0 : 1);
    if (groundOnly) { assert.equal(s.shots.length, 0); assert.equal(s.fires.length, 0); assert.equal(s.buildings[0].cooldown, 0); }
  }
});

test('地面塔略過較靠近家的飛蟲，直接選中射程內的地面蟲', () => {
  for (const kind of ['cannon', 'flame']) {
    const s = G.createState(); G.build(s, kind, 6, 4); s.phase = 'running';
    const flying = enemy(s, 'flyer', 20, 5, 3), ground = enemy(s, 'bug', 20, 7, 3);
    G.step(s, 1 / 60); assert.equal(s.shots[0].target, ground.id);
    advance(s, 0.25); assert.equal(flying.hp, 20); assert.equal(ground.hp, 20 - G.TOOLS[kind].damage);
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
    const jumping = enemy(s, 'hopper', 20, 7, 3);
    G.step(s, 1 / 60); assert.equal(s.shots[0].target, jumping.id);
    G.hit(s, jumping, { kind: 'pea', c: 6, r: 5 }); assert.ok(jumping.leap);
    advance(s, 0.25); assert.equal(jumping.hp, 19); assert.equal(s.stats.hits, 1); assert.equal(s.fires.length, 0);
    assert.equal(G.canTarget(kind, jumping), false);
    advance(s, 0.4); assert.equal(jumping.leap, null); assert.equal(G.canTarget(kind, jumping), true);
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

test('盾蟲從上方擋住大砲、火焰與冰凍，不爆炸、不點火、不擴散緩速', () => {
  for (const kind of ['cannon', 'flame', 'frost']) {
    const s = G.createState(), a = enemy(s, 'shield', 8, 6, 3), b = enemy(s, 'bug', 8, 7, 3);
    G.resolveShot(s, { kind, target: a.id, c: 6, r: 1 });
    assert.deepEqual([a.hp, b.hp], [8, 8]); assert.equal(s.stats.blocked, 1);
    assert.equal(s.fires.length, 0); assert.equal(b.slow, 0); assert.ok(s.effects.every(e => e.kind === 'block'));
  }
});

test('冰凍命中後緩速半徑一格內所有地空目標，周圍只緩速、不額外扣血', () => {
  const s = G.createState(), center = enemy(s, 'bug', 10, 6, 3);
  const edge = enemy(s, 'bug', 10, 7, 3), diagonal = enemy(s, 'bug', 10, 6.6, 3.6);
  const flying = enemy(s, 'flyer', 10, 6, 2.5), hopper = enemy(s, 'hopper', 10, 5.5, 3);
  const outside = enemy(s, 'bug', 10, 7, 4);
  G.resolveShot(s, {kind:'frost',target:center.id,c:6,r:5});
  assert.equal(center.hp, 9); assert.equal(s.stats.hits, 1);
  for (const e of [center,edge,diagonal,flying,hopper]) assert.equal(e.slow, G.TOOLS.frost.slowDuration);
  for (const e of [edge,diagonal,flying,hopper,outside]) assert.equal(e.hp, 10);
  assert.equal(outside.slow, 0); assert.equal(hopper.jumped, false);
  assert.ok(s.effects.some(e=>e.kind==='frost' && e.radius===1));
  s.phase='running'; advance(s, 2.2);
  for (const e of [center,edge,diagonal,flying,hopper]) assert.equal(e.slow, 0);
});

test('冰凍範圍各自檢查盾甲方向，中心致命傷仍緩速周圍，剛分裂的小蟲不追溯受影響', () => {
  const s = G.createState(), center = enemy(s,'splitter',1,6,3);
  const up = enemy(s,'shield',10,6.2,3), down = enemy(s,'shield_down',10,5.8,3);
  G.resolveShot(s,{kind:'frost',target:center.id,c:6,r:5});
  assert.equal(center.dead,true); assert.equal(up.slow,G.TOOLS.frost.slowDuration); assert.equal(down.slow,0);
  assert.deepEqual([up.hp,down.hp],[10,10]); assert.equal(s.stats.blocked,1);
  const babies=s.enemies.filter(e=>e.kind==='bug'); assert.equal(babies.length,3);
  assert.ok(babies.every(e=>e.hp===2 && e.slow===0));
});

test('火焰命中後在地板燃燒三秒，每實際一秒扣一次血，火區重疊不疊傷', () => {
  const s = G.createState(), a = enemy(s, 'shield', 10, 6, 3);
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

test('穿透彈沿直線貫穿多隻怪物，每隻只傷害一次，不波及旁邊一排', () => {
  const s = G.createState(); s.phase = 'running';
  const a = enemy(s, 'bug', 5, 4, 3), b = enemy(s, 'bug', 5, 6, 3), c = enemy(s, 'bug', 5, 5, 4);
  ray(s, 2, 3, 1, 0); advance(s, 0.55);
  assert.deepEqual([a.hp, b.hp, c.hp], [4, 4, 5]);
  assert.equal(s.stats.hits, 2); assert.equal(s.shots.length, 0);
});

test('穿透彈被上方盾甲擋住後停止，不穿過盾蟲傷到後方', () => {
  const s = G.createState(); s.phase = 'running';
  const a = enemy(s, 'shield', 5, 6, 2), b = enemy(s, 'bug', 5, 6, 3);
  ray(s, 6, 0, 0, 1); advance(s, 0.5);
  assert.deepEqual([a.hp, b.hp], [5, 5]); assert.equal(s.stats.blocked, 1); assert.equal(s.shots.length, 0);
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
  assert.deepEqual(s.effects.filter(e=>e.kind==='push-cell').map(e=>[e.x,e.y]),[[7,3]]);
});

test('擊退塔每次冷卻只攻擊一格，射程四格並優先最近目標', () => {
  const s=G.createState(); G.build(s,'push',6,3); s.phase='running';
  const a=enemy(s,'bug',10,7,2), b=enemy(s,'bug',10,7.2,2);
  const homeward=enemy(s,'bug',10,3,3), farther=enemy(s,'bug',10,6,5);
  G.step(s,1/60); assert.equal(s.shots.length,1); assert.equal(s.shots[0].target,a.id);
  advance(s,0.25); assert.deepEqual([a.hp,b.hp],[9,9]); assert.ok(a.push && b.push);
  assert.deepEqual([homeward.hp,farther.hp],[10,10]);
  assert.equal(s.stats.hits,2); assert.ok(s.buildings[0].cooldown>2.7);
  assert.equal(s.effects.filter(e=>e.kind==='push-cell').length,1);
  const ranged=G.createState(); G.build(ranged,'push',2,3); ranged.phase='running';
  const distant=enemy(ranged,'giant',10,5.8,3); enemy(ranged,'giant',10,6.2,3);
  G.step(ranged,1/60); assert.equal(ranged.shots[0].target,distant.id);
  advance(ranged,0.25); assert.equal(distant.hp,9); assert.equal(ranged.enemies[1].hp,10);
});

test('擊退彈原目標先死亡，仍只影響最後瞄準的一格', () => {
  const s=G.createState(); G.build(s,'push',6,5); s.phase='running';
  const target=enemy(s,'bug',10,7,4), same=enemy(s,'bug',10,7.1,4), other=enemy(s,'bug',10,7,3);
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

test('分子砲單體高傷害，仍受盾甲方向限制，擊殺不重複發獎勵', () => {
  const s = G.createState(), a = enemy(s, 'shield', 56, 6, 3), b = enemy(s, 'bug', 10, 7, 3), money = s.money;
  G.resolveShot(s, { kind: 'molecular', target: a.id, c: 6, r: 1 }); assert.equal(a.hp, 56);
  G.resolveShot(s, { kind: 'molecular', target: a.id, c: 6, r: 5 }); assert.equal(a.hp, 28); assert.equal(b.hp, 10);
  G.resolveShot(s, { kind: 'molecular', target: a.id, c: 6, r: 5 });
  G.resolveShot(s, { kind: 'molecular', target: a.id, c: 6, r: 5 });
  assert.equal(a.hp, 0); assert.equal(s.money, money);
});

test('暫停時火地板、擊退動畫和穿透彈也全部停住', () => {
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

test('火焰彈飛行途中目標先被擊殺，仍落在最後位置並點燃地板', () => {
  const s = G.createState(); G.build(s, 'flame', 6, 5); s.phase = 'running';
  const a = enemy(s, 'bug', 1, 6, 3); G.step(s, 1 / 60);
  assert.equal(s.shots.length, 1); const impact = [s.shots[0].impactX, s.shots[0].impactY];
  G.hit(s, a, { kind: 'pea', c: 6, r: 5 }); advance(s, 0.3);
  assert.equal(s.fires.length, 1); assert.equal(s.fires[0].c, Math.round(impact[0])); assert.equal(s.fires[0].r, Math.round(impact[1]));
});
