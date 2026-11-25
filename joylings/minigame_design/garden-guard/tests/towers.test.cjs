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
test('七種砲塔的 21 組融合可交換次序，退回材料塔的水晶，重試、拆除及復原守恆', () => {
  const kinds = Object.keys(G.TOOLS).filter(k => k !== 'wall'), recipes = new Set();
  for (const [i, a] of kinds.entries()) for (const b of kinds.slice(i + 1)) {
    const recipe = G.fusionRecipe(a, b);
    recipes.add([G.primaryWeapon(recipe), G.secondaryWeapon(recipe)].join('/'));
    assert.deepEqual(recipe, G.fusionRecipe(b, a));
    for (const [first, second] of [[a, b], [b, a]]) {
      const s = G.createState(3), initial = s.money, crystals = s.upgradeItems;
      const c = 5, r = 4;
      assert.ok(G.build(s, first, c, r).ok);
      assert.ok(G.upgrade(s, c, r).ok);
      assert.ok(G.build(s, second, c, r).fused);
      const tower = G.at(s, c, r);
      assert.deepEqual([tower.kind, tower.fusionKind], [recipe.kind, recipe.fusionKind]);
      assert.equal(tower.hp, 5);
      assert.equal(s.money, initial - G.TOOLS[a].cost - G.TOOLS[b].cost);
      assert.equal(s.fusionHammers, 0);
      assert.equal(G.build(s, first, c, r).ok, false);
      assert.equal(tower.upgraded, false);
      assert.equal(G.buildingName(tower), recipe.name);
      const graded = G.restore(G.snapshot(s));
      assert.ok(G.upgrade(graded, c, r).ok);
      assert.equal(G.upgrade(graded, c, r).ok, false);
      assert.equal(graded.upgradeItems, crystals - 1);
      const resumed = G.restore(G.snapshot(graded));
      assert.equal(G.buildingName(G.at(resumed,c,r)), recipe.name + '+');
      assert.ok(G.downgrade(resumed,c,r).ok);
      assert.deepEqual(G.snapshot(resumed), G.snapshot(s));
      assert.equal(s.upgradeItems, crystals);
      assert.ok(G.undo(s)); assert.equal(G.at(s, c, r).kind, first);
      assert.ok(G.at(s, c, r).upgraded); assert.equal(s.upgradeItems, crystals - 1); assert.equal(s.fusionHammers, 1);
      assert.ok(G.build(s, second, c, r).fused);
      const saved = G.snapshot(s);
      assert.ok(G.restore(saved)); assert.equal(G.restore({...saved, fusionHammers: 1}), null);
      for (const version of [17, 18]) {
        const old = {...saved, version, upgradeItems: crystals - 1, buildings: saved.buildings.map(b => ({...b, upgraded: true}))};
        const migrated = G.restore(old);
        assert.deepEqual(G.snapshot(migrated), saved);
        assert.deepEqual(G.snapshot(G.restore(G.snapshot(migrated))), saved);
        assert.equal(G.restore({...old, version: 19}), null);
      }
      assert.ok(G.startWave(s)); s.queue = [];
      for (const dx of [1, 2.5]) enemy(s, 'giant', 10000, c + dx, r).shock = 1000;
      enemy(s, 'flyer', 10000, c + 2, r).shock = 1000;
      const fired = new Set();
      for (let frame = 0; frame < 600; frame++) {
        G.step(s, 1/60);
        const primary = G.at(s, c, r);
        for (const module of [primary, primary.secondary]) if (module?.flash === 1) fired.add(G.primaryWeapon(module));
      }
      assert.deepEqual(fired, new Set([G.primaryWeapon(tower), G.secondaryWeapon(tower)].filter(Boolean)), recipe.name);
      const retry = G.retry(s);
      assert.equal(retry.fusionHammers, 0); assert.equal(retry.buildings.length, 1);
      assert.ok(G.remove(retry, c, r).ok);
      assert.deepEqual([retry.money, retry.upgradeItems, retry.fusionHammers], [initial, crystals, 1]);
      assert.ok(G.undo(retry)); assert.equal(retry.fusionHammers, 0);
    }
  }
  assert.equal(recipes.size, 21);
  assert.equal(G.fusionRecipe('frost','push').name,'氣象儀');
  assert.equal(G.fusionRecipe('flame','push').name,'氣象儀');
});
test('八種單塔都能取消升級，位置、耐久、金幣與上局傷害保留，重按不重複退水晶', () => {
  for (const kind of Object.keys(G.TOOLS)) {
    const s = G.createState(3);
    assert.ok(G.build(s, kind, 5, 4).ok);
    const b = G.at(s, 5, 4), funds = s.money;
    b.hp--; b.lastDamage = 13;
    assert.ok(G.upgrade(s,5,4).ok);
    assert.ok(G.downgrade(s,5,4).ok);
    assert.equal(G.downgrade(s,5,4).ok,false);
    const loaded = G.restore(G.snapshot(s)), tower = G.at(loaded,5,4);
    assert.deepEqual([tower.kind,tower.hp,tower.upgraded,tower.lastDamage],[kind,G.TOOLS[kind].hp-1,false,13]);
    assert.deepEqual([loaded.money,loaded.upgradeItems,loaded.fusionHammers],[funds,3,1]);
    assert.ok(G.undo(s)); assert.ok(G.at(s,5,4).upgraded);
  }
});
test('融合槌依通關關數各發一次，舊存檔補齊，城堡取消升級不拆除', () => {
  const s = G.createState();
  let hammers = 0;
  assert.ok(G.build(s, 'pea', 5, 4).ok);
  assert.equal(G.build(s, 'cannon', 5, 4).ok, false);
  for (let level = 1; level <= 10; level++) {
    G.startWave(s); s.queue = []; G.step(s, .01);
    if ([3,5,7,9].includes(level)) hammers++;
    assert.equal(s.fusionHammers, hammers);
    G.step(s, .01); assert.equal(s.fusionHammers, hammers);
    assert.equal(G.restore({ ...G.snapshot(s), version: 16, fusionHammers: undefined }).fusionHammers, hammers);
  }
  const home = G.createState(1), {c,r} = G.LEVELS[1].goal;
  assert.ok(G.upgrade(home,c,r).ok); assert.ok(G.downgrade(home,c,r).ok);
  assert.equal(home.hearts,G.LEVELS[1].hearts); assert.equal(home.upgradeItems,1);
  assert.ok(G.undo(home)); assert.ok(home.castleUpgraded); assert.equal(home.upgradeItems,0);
});
function fusionBattle(second, c = 5, r = 4) {
  const s = G.createState(3);
  assert.ok(G.build(s, second, c, r).ok);
  assert.ok(G.build(s, 'pea', c, r).fused);
  G.startWave(s); s.queue = []; s.castle = null;
  return s;
}
function artillery(material,base='cannon') {
  const s = G.createState(3);
  assert.ok(G.build(s,base,5,4).ok);
  assert.ok(G.build(s,material,5,4).fused);
  G.startWave(s,0,4242); s.queue=[]; s.castle=null;
  assert.equal(s.buildings[0].secondary,undefined);
  return s;
}
function stationary(s, kind, x, y) {
  const e = enemy(s,kind,50,x,y);
  e.spikeStun = 100;
  return e;
}
function upgradedFusion(first, second) {
  const s = G.createState(3);
  assert.ok(G.build(s,first,5,4).ok);
  assert.ok(G.build(s,second,5,4).fused);
  assert.ok(G.upgrade(s,5,4).ok);
  G.startWave(s,0,4242); s.queue=[]; s.castle=null;
  return s;
}
test('砲塔移除後，已發射的彈藥仍使用發射時的升級命中特效', () => {
  const cases = [
    ['pea','cannon','spark','tacticalAir'],
    ['pea','cannon','blast','tacticalGround'],
    ['pea','frost','spark','iceCannon'],
    ['frost','molecular','molecular','cryoPlasma'],
    ['cannon','pierce','cometBurst'],
    ['cannon','frost','snowBurst']
  ];
  for (const upgraded of [false,true]) for (const [first,second,kind,weapon] of cases) {
    const s = G.createState(3);
    assert.ok(G.build(s,first,5,4).ok && G.build(s,second,5,4).fused);
    if (upgraded) assert.ok(G.upgrade(s,5,4).ok);
    G.startWave(s,0,4242); s.queue=[]; s.castle=null;
    stationary(s,'giant',6,4);
    stationary(s,'flyer',6,4);
    for (let i=0;i<240 && !s.shots.length;i++) G.step(s,1/60);
    assert.ok(s.shots.length);
    const shotTimeout = Math.ceil(Math.max(...s.shots.map(shot=>shot.duration)) * 60) + 60;
    s.buildings=[];
    let impact;
    for (let i=0;i<shotTimeout && !impact;i++) {
      G.step(s,1/60);
      impact=s.effects.find(e=>e.kind===kind && (!weapon || e.weapon===weapon));
    }
    assert.equal(impact?.upgraded,upgraded,weapon || kind);
  }
});
test('不同砲塔共用冰凍層數，第七層凍住普通蟲 1.5 秒、三種蟲王 0.5 秒', () => {
  for (const [kind,seconds] of [['giant',1.5],['rhinoBoss',.5],['stagBoss',.5],['spiderBoss',.5]]) {
    const s=G.createState(3);
    G.startWave(s); s.queue=[]; s.castle=null;
    const e=enemy(s,kind,100,7,4);
    const chill = weapon => G.hit(s,e,{kind:weapon==='iceCannon'?'pea':'frost',weapon,c:7,r:4});
    for(const weapon of ['frost','iceCannon','frost','iceCannon']) chill(weapon);
    assert.equal(e.iceStacks,6); assert.ok(e.slow>0); assert.ok(!e.frozenUntil);
    chill('iceCannon'); const until=e.frozenUntil, x=e.x, y=e.y;
    const duration = seconds * G.BATTLE_SPEED;
    assert.equal(until-s.time,duration); assert.equal(e.iceStacks,0); assert.equal(e.slow,0);
    advance(s,duration-1/60); chill('frost'); assert.equal(e.frozenUntil,until);
    G.step(s,1/60); assert.deepEqual([e.x,e.y,e.slow,e.iceStacks],[x,y,0,0]);
    advance(s,G.BATTLE_SPEED - 1/60); assert.ok(Math.hypot(e.x-x,e.y-y)>0);
    chill('iceCannon'); assert.deepEqual([e.iceStacks,e.slow],[0,0]);
    G.step(s,1/60);
    chill('frost'); assert.equal(e.iceStacks,1);
  }
});
test('凍結電漿與疊冰共用解凍後一秒免疫，冰系直擊仍扣血，暫停不消耗免疫時間', () => {
  for (const kind of ['giant','rhinoBoss']) for (const upgraded of [false,true]) {
    const s=G.createState(3); G.startWave(s); s.queue=[]; s.castle=null;
    const e=enemy(s,kind,200,8,4);
    const plasma={kind:'molecular',weapon:'cryoPlasma',upgraded,c:7,r:4};
    const frost={kind:'frost',upgraded:true,c:7,r:4};
    G.hit(s,e,plasma);
    const until=e.frozenUntil;
    advance(s,until-1/60); G.hit(s,e,plasma);
    assert.equal(e.frozenUntil,until,'冰封中再次命中不會延後解凍');
    G.step(s,1/60);
    const hp=e.hp;
    G.hit(s,e,frost); G.hit(s,e,plasma);
    assert.equal(e.hp,hp-1-(upgraded ? 12 : 7));
    assert.deepEqual([e.slow,e.iceStacks,e.frozenUntil],[0,0,until]);
    G.togglePause(s); advance(s,2*G.BATTLE_SPEED); G.togglePause(s);
    advance(s,G.BATTLE_SPEED-1/60); G.hit(s,e,plasma);
    assert.equal(e.frozenUntil,until);
    G.step(s,1/60); G.hit(s,e,plasma);
    assert.equal(e.frozenAt,s.time); assert.ok(e.frozenUntil>s.time);
  }
});
test('寒冰砲、急凍光束與雪球兩級每次命中疊兩層，達到或超過七層只結凍一次', () => {
  for (const [kind,weapon] of [['pea','iceCannon'],['pierce','cryoBeam'],['snowCannon','snowCannon']]) for (const upgraded of [false,true]) {
    for (const start of [0,1]) {
      const s=G.createState(), e=G.spawn(s,'giant',50);
      if (start) G.hit(s,e,{kind:'frost',c:7,r:3});
      const shot={kind,weapon,upgraded,c:7,r:3};
      G.hit(s,e,shot); assert.equal(e.iceStacks,start+2);
      G.hit(s,e,shot); assert.equal(e.iceStacks,start+4);
      if (!start) { G.hit(s,e,shot); assert.equal(e.iceStacks,6); }
      G.hit(s,e,shot); assert.equal(e.iceStacks,0);
      assert.equal(e.frozenUntil-s.time,1.5*G.BATTLE_SPEED);
    }
  }
});

test('再次命中刷新緩速時間，消退時清掉所有層數，下次從一層開始', () => {
  const s=G.createState(); s.phase='running';
  const e=enemy(s,'giant',30,8,3), frost={kind:'frost',c:8,r:3};
  G.hit(s,e,frost); advance(s,G.BATTLE_SPEED);
  G.hit(s,e,frost); assert.equal(e.iceStacks,2);
  advance(s,1.4*G.BATTLE_SPEED-1/60); assert.ok(e.slow>0); assert.equal(e.iceStacks,2);
  G.step(s,1/60); assert.deepEqual([e.slow,e.iceStacks],[0,0]);
  const x=e.x; advance(s,.1); assert.ok(Math.abs(x-e.x-.1*G.ENEMIES.giant.speed)<1e-8);
  G.hit(s,e,frost); assert.equal(e.iceStacks,1);
});
test('電磁砲+ 順序打出 19、5、1 傷，第四隻不再連鎖', () => {
  const s=upgradedFusion('pea','molecular');
  const targets=[6,7,8,9].map((x,i)=>stationary(s,'giant',x,4));
  targets[0].hp=80;
  advance(s,.75*G.BATTLE_SPEED); assert.equal(s.shots[0].weapon,'magCannon'); s.buildings=[];
  advance(s,2.5);
  assert.deepEqual(targets.map(e=>e.hp),[61,45,49,50]);
});
test('寒冰砲優先攻擊還沒被冰凍或結凍的蟲', () => {
  const s=upgradedFusion('pea','frost');
  const near=stationary(s,'giant',4,4), far=stationary(s,'giant',7,4);
  for(let i=0;i<7;i++) G.hit(s,near,{kind:'frost',c:5,r:4});
  assert.equal(near.slow,0); assert.ok(near.frozenUntil>0);
  G.step(s,1/60);
  assert.equal(s.shots[0].target,far.id);
});
test('升級攻擊格形與光束的實際寬度', () => {
  const cells=weapon=>G.attackCells(weapon,5,4,true).map(p=>[p.c,p.r]);
  assert.deepEqual(cells('meteorTower').sort(),[[5,4],[4,4],[6,4],[5,3],[5,5],[3,4],[7,4],[5,2],[5,6]].sort());
  assert.deepEqual(cells('sonicCannon').sort(),[3,4,5].flatMap(r=>[4,5,6].map(c=>[c,r])).sort());
  for (const [material,insideY,outsideY,damage] of [['pea',4.479,4.481,1],['frost',4.54,4.55,2],['flame',4.54,4.55,2]]) for (const graded of [false,true]) {
    const s=graded ? upgradedFusion(material,'pierce') : artillery('pierce',material);
    const edge=stationary(s,'giant',3,insideY), outside=stationary(s,'giant',3,outsideY);
    G.resolveShot(s,{kind:'pierce',weapon:G.primaryWeapon(s.buildings[0]),upgraded:graded,c:5,r:4,angle:180,tower:s.buildings[0].id});
    assert.equal(edge.hp,graded?50-damage:50); assert.equal(outside.hp,50);
  }
});
test('穿透雷射和四種融合的兩級都會放棄近城單蟲，沿斜線一次打中三隻', () => {
  for(const material of [null,'pea','frost','flame','push']) for(const graded of [false,true]) {
    const s=G.createState(3);
    G.build(s,'pierce',5,4);
    if(material) G.build(s,material,5,4);
    if(graded) G.upgrade(s,5,4);
    G.startWave(s); s.castle=null; s.queue=[];
    const lone=stationary(s,'giant',2,4);
    const row=[[6,3],[7,2],[8,1]].map(([x,y],i)=>stationary(s,i===1?'flyer':'shield',x,y));
    G.step(s,1/60);
    assert.equal(lone.hp,50); assert.ok(row.every(e=>e.hp<50));
  }
});
test('兩級砲塔先打射程內的飛蟲，飛蟲消失後改打地面蟲', () => {
  for(const graded of [false,true]) {
    const s=G.createState(3); G.build(s,'pea',5,4);
    if(graded) G.upgrade(s,5,4);
    G.startWave(s); s.queue=[]; s.castle=null;
    const near=stationary(s,'giant',3,4), sky=stationary(s,'flyer',7,4);
    stationary(s,'flyer',9,4); G.step(s,1/60);
    assert.equal(s.shots[0].target,sky.id); sky.dead=true;
    s.buildings[0].cooldown=0; G.step(s,1/60);
    assert.equal(s.shots.at(-1).target,near.id);
  }
});
test('音波砲可命中數相同時先打飛蟲較多的一群', () => {
  for (const upgraded of [false,true]) {
    const s=upgraded ? upgradedFusion('cannon','push') : artillery('push');
    for(let i=0;i<3;i++){ stationary(s,'giant',2,4); stationary(s,i?'flyer':'bug',8,4); }
    G.step(s,1/60); assert.deepEqual([s.shots[0].impactX,s.shots[0].impactY],[8,4]);
  }
});
test('兩種龍捲的兩級都偏好蟲群附近，仍保留遠離蟲群的路線', () => {
  for(const material of ['frost','flame']) for(const upgraded of [false,true]) {
    const trials=256, near=[0,0];
    for(const [mode,count] of [1,5].entries()){
      const s=upgraded ? upgradedFusion(material,'push') : artillery('push',material);
      for(let n=0;n<count;n++) stationary(s,n%2?'flyer':'bug',8,4);
      s.buildings[0].cooldown=0; G.step(s,1/60); s.buildings=[];
      const v=s.vortices[0];
      for(let i=1;i<=trials;i++){
        Object.assign(v,{x:1,y:1,destX:1,destY:1,age:0});
        s.weatherRng.rngState=Math.imul(i,0x9e3779b9)>>>0;
        G.step(s,1/60);
        assert.ok(v.destX>=0 && v.destX<G.COLS && v.destY>=0 && v.destY<G.ROWS);
        if(Math.hypot(v.destX-8,v.destY-4)<=2.5) near[mode]++;
      }
    }
    assert.ok(near[1]>near[0]+15 && near[1]<trials*.65,JSON.stringify(near));
  }
});
test('火氣象儀+ 本體每秒 1，火路使用同一格普通地火；冰龍捲接觸不按畫面幀疊層', () => {
  for(const material of ['flame','frost']){
    const s=upgradedFusion(material,'push'), fire=material==='flame';
    const e=stationary(s,'flyer',5,4);
    advance(s,(fire?4:3)*G.BATTLE_SPEED); assert.equal(s.vortices.length,1);
    s.buildings=[]; const v=s.vortices[0]; const firstHp=e.hp;
    for(let i=0;i<60*G.BATTLE_SPEED;i++){
      e.x=v.x; e.y=v.y; G.step(s,1/60);
      if(!fire && i===20) assert.equal(e.iceStacks,1);
    }
    if(fire){
      assert.equal(e.hp,firstHp-2); // One direct damage plus one repeated ignition.
      assert.ok(s.fires.length>1); assert.ok(s.fires.every(f=>!f.emberLife && f.life<=3*G.BATTLE_SPEED));
      assert.equal(new Set(s.fires.map(f=>G.key(f.c,f.r))).size,s.fires.length);
      const f=s.fires[0], ground=stationary(s,'giant',f.c,f.r); f.clock=.01;
      G.updateFires(s,.02); assert.equal(ground.hp,49);
      advance(s,5*G.BATTLE_SPEED-1/60); assert.equal(s.vortices.length,1);
      G.step(s,1/60); assert.equal(s.vortices.length,0);
    } else {
      assert.equal(e.hp,firstHp-2); assert.equal(e.iceStacks,2);
    }
  }
});
test('雪球四向滾動，每格增加一傷並沿球路擊退半格，邊界爆裂獨立計傷', () => {
  const weapon = G.toolFor('snowCannon');
  assert.deepEqual([weapon.rate,weapon.speed,weapon.damage],[.3,1.625,8]);
  for (const [x,y,angle] of [[11,4,0],[0,4,180],[5,0,-90],[5,7,90]]) {
    const s=artillery('frost');
    const towerId=s.buildings[0].id;
    const off=stationary(s,'giant',4,3), air=stationary(s,'flyer',6,4);
    G.step(s,1/60); assert.equal(s.shots.length,0);
    const far=stationary(s,'giant',x,y);
    G.step(s,1/60); assert.equal(s.shots[0].angle,angle);
    assert.equal(far.hp,50);
    s.buildings=[];
    const dx=Math.sign(x-5), dy=Math.sign(y-4);
    const near=stationary(s,'giant',5+dx,4+dy);
    const second=stationary(s,'giant',5+1.55*dx,4+1.55*dy);
    advance(s,.4); assert.equal(near.hp,42); assert.ok(near.slow>0); assert.equal(far.hp,50);
    assert.deepEqual([near.push.x,near.push.y],[5+1.5*dx,4+1.5*dy]);
    near.spikeStun=0;
    for(let i=0; i<30 && near.push; i++) G.step(s,1/60);
    assert.deepEqual([near.x,near.y,near.push],[5+1.5*dx,4+1.5*dy,null]);
    near.spikeStun=100;
    advance(s,8);
    const distance=Math.abs(x-5)+Math.abs(y-4);
    const farDamage = 8 + distance-1;
    const blastDamage = Math.floor(farDamage/2);
    assert.deepEqual([far.hp,second.hp,near.hp,off.hp,air.hp],[50-farDamage-blastDamage,41,42,50,50]);
    assert.equal(s.waveStats.damageByTower[towerId],8 + 9 + farDamage + blastDamage);
    assert.equal(s.shots.length,0);
  }
});
test('雪球直徑從一格起每滾一格加寬 5%，橫向與縱向都能擦中鄰排', () => {
  const offset=G.toolFor('snowCannon').muzzleOffset;
  for (const d of [0,1,3,5]) assert.equal(G.snowRadius(offset+d)*2,1+.05*d);
  for (const [dx,dy] of [[1,0],[0,-1]]) for (const upgraded of [false,true]) {
    const s=upgraded ? upgradedFusion('cannon','frost') : artillery('frost');
    const put=(dist,side,kind='giant')=>stationary(s,kind,5+dx*dist-dy*side,4+dy*dist+dx*side);
    put(3,0); const near=put(.8,.56), inside=put(3,.56), outside=put(3,.575), air=put(3,.56,'flyer');
    G.step(s,1/60); const shot=s.shots[0];
    s.buildings=[];
    advance(s,G.BATTLE_SPEED);
    assert.ok(Math.abs((shot.x-5)*dx+(shot.y-4)*dy-offset-1.625*(1+1/60/G.BATTLE_SPEED))<1e-7);
    advance(s,1.2*G.BATTLE_SPEED);
    assert.ok(shot.hitIds.includes(inside.id)); assert.equal(inside.hp,50-(upgraded?12:10));
    for (const missed of [near,outside,air]) assert.ok(!shot.hitIds.includes(missed.id));
    assert.equal(shot.hitIds.filter(id=>id===inside.id).length,1);
  }
});
test('雪球在普通牆與升級牆的近側爆裂，濺射半徑一格，只打地面蟲', () => {
  for (const upgradedWall of [false,true]) {
    const s=artillery('frost'), tower=s.buildings[0];
    const dx=1, c=8, r=4;
    tower.c=c-3*dx; tower.r=r;
    const trigger=stationary(s,'giant',c-dx,r);
    G.step(s,1/60); s.buildings=[];
    s.buildings.push({kind:'wall',c,r,upgraded:upgradedWall,cooldown:100,hp:4});
    const face=c-.5*dx, edge=stationary(s,'giant',face,r+1), air=stationary(s,'flyer',face,r);
    const outside=stationary(s,'giant',face,r+1.001), behind=stationary(s,'giant',c+2*dx,r);
    while(s.shots.length) G.step(s,1/60);
    const burst=s.effects.find(e=>e.kind==='snowBurst');
    assert.deepEqual([burst.x,burst.y,burst.radius,edge.hp,air.hp,outside.hp,behind.hp],[face,r,1,46,50,50,50]);
    assert.equal(trigger.hp,37);
    assert.ok((face-trigger.push.x)*dx>0,'無法推過障礙物');
    assert.equal(edge.push,null);
  }
});
test('普通與升級雪球穿過砲塔和中央城堡，打中後排的蟲再於邊界爆裂', () => {
  for (const upgraded of [false,true]) {
    const s=G.createState(G.BONUS_LEVEL), {c,r}=G.LEVELS[s.level].goal;
    assert.ok(G.build(s,'cannon',c+3,r).ok && G.build(s,'frost',c+3,r).fused);
    if (upgraded) assert.ok(G.upgrade(s,c+3,r).ok);
    assert.ok(G.build(s,'pea',c+1,r).ok);
    G.startWave(s); s.queue=[]; s.castle=null;
    G.at(s,c+1,r).cooldown=100;
    const target=stationary(s,'giant',c-1,r);
    G.step(s,1/60); assert.equal(s.shots[0].kind,'snowCannon');
    G.at(s,c+3,r).cooldown=100;
    while (s.shots.length) G.step(s,1/60);
    const bursts=s.effects.filter(e=>e.kind==='snowBurst');
    assert.deepEqual(bursts.map(e=>[e.x,e.y]),[[-.5,r]]);
    assert.equal(target.hp,50-8-3*(upgraded ? 2 : 1));
  }
});
test('雪球出膛即碰牆，爆裂造成基礎傷害的一半',()=>{
  const s=artillery('frost');
  const enemy=stationary(s,'giant',6,4); G.step(s,1/60);
  s.buildings=[{kind:'wall',c:6,r:4,hp:4}];
  advance(s,.25);
  assert.equal(enemy.hp,46); assert.equal(s.effects.filter(e=>e.kind==='snowBurst').length,1);
});
test('末蟲被雪球擊倒當下就結算一次，場上有幼蟲或仍待出怪時雪球繼續滾動', () => {
  for (const [level,kind,pending] of [[3,'bug',false],[9,'bug',false],[10,'bug',false],[3,'splitter',false],[3,'bug',true]]) {
    const s=G.createState(level);
    assert.ok(G.build(s,'cannon',5,4).ok); assert.ok(G.build(s,'frost',5,4).fused);
    G.startWave(s,0,42); s.queue=pending ? s.queue.slice(-1) : []; s.spawnClock=30; s.castle=null;
    const e=enemy(s,kind,1,6,4), money=s.money, crystals=s.upgradeItems;
    G.step(s,1/60);
    const ball=s.shots.find(shot=>shot.kind==='snowCannon'); assert.ok(ball);
    for(let frame=0;frame<60 && !e.dead;frame++) G.step(s,1/60);
    assert.ok(e.dead); assert.ok(ball.age<ball.duration && ball.x<7);
    if (pending || kind==='splitter') {
      assert.equal(s.phase,'running'); assert.ok(s.shots.includes(ball)); assert.equal(s.money,money);
      assert.ok(pending ? s.queue.length : s.enemies.some(bug=>!bug.dead));
    } else {
      assert.equal(s.phase,level===3 ? 'planning' : 'won'); assert.equal(s.shots.length,0);
      advance(s,2*G.BATTLE_SPEED);
      assert.equal(s.upgradeItems,crystals+1); assert.equal(s.money,money+G.LEVELS[level].reward);
    }
  }
});
test('雪砲分開計算四條射線，只選地面蟲最多的一側，同數時優先守城堡',()=>{
  const s=artillery('frost'), tower=s.buildings[0];
  stationary(s,'giant',4,4); stationary(s,'giant',3,4);
  for(const y of [3,2,1]) stationary(s,'giant',5,y);
  for(let i=0;i<4;i++) {
    stationary(s,'flyer',2,4); stationary(s,'giant',4,3);
  }
  G.step(s,1/60); assert.deepEqual([s.shots[0].dx,s.shots[0].dy],[0,-1]);
  stationary(s,'giant',2,4); tower.cooldown=0;
  G.step(s,1/60); assert.deepEqual([s.shots[1].dx,s.shots[1].dy],[-1,0]);
});
test('隕石全圖鎖定原格，一秒後打十字五格的地面蟲並持續燃燒，邊界裁切', () => {
  const s=artillery('flame'), lure=stationary(s,'giant',1,1);
  G.step(s,1/60); const shot=s.shots[0]; assert.deepEqual([shot.impactX,shot.impactY],[1,1]);
  lure.x=4; s.buildings=[];
  const targets=[[1,1],[0,1],[2,1],[1,0],[1,2]].map(([x,y])=>stationary(s,'giant',x,y));
  const off=stationary(s,'giant',0,0), air=stationary(s,'flyer',1,1);
  advance(s,G.BATTLE_SPEED-2/60); assert.ok(targets.every(e=>e.hp===50));
  G.step(s,1/60); assert.ok(targets.every(e=>e.hp===44 && e.burnTicks===3));
  assert.deepEqual(s.fires.map(f=>[f.c,f.r]),G.attackCells('meteorTower',1,1).map(p=>[p.c,p.r]));
  const late=stationary(s,'giant',2,1);
  targets[0].y=3; advance(s,3*G.BATTLE_SPEED);
  assert.equal(targets[0].hp,41);
  assert.ok(targets.slice(1).every(e=>e.hp===38)); assert.deepEqual([off.hp,air.hp,lure.hp],[50,50,50]);
  assert.equal(late.hp,47);assert.equal(s.fires.length,0);
  assert.deepEqual(G.attackCells('meteorTower',0,0),[{c:0,r:0},{c:1,r:0},{c:0,r:1}]);
});
test('音波砲鎖格後打十字 5 傷，升級打九宮格 6 傷，兩者都暈眩一秒', () => {
  for (const upgraded of [false,true]) {
    const s=upgraded ? upgradedFusion('cannon','push') : artillery('push');
    const lure=stationary(s,'giant',10,4);
    assert.equal(G.toolFor('sonicCannon',upgraded).range,4);
    assert.equal(G.toolFor('sonicCannon',upgraded).rate,G.TOOLS.push.rate);
    G.step(s,1/60); assert.equal(s.shots.length,0);
    lure.x=9; G.step(s,1/60); assert.deepEqual([s.shots[0].impactX,s.shots[0].impactY],[9,4]);
    lure.y=6; s.buildings=[];
    const targets=[[9,4],[8,4],[10,4],[9,3],[9,5]].map(([x,y],i)=>stationary(s,i%2?'flyer':'giant',x,y));
    const corner=stationary(s,'giant',10,5);
    advance(s,G.BATTLE_SPEED-2/60); assert.ok(targets.every(e=>e.hp===50));
    G.step(s,1/60);
    assert.ok(targets.every(e=>e.hp===(upgraded?44:45) && e.stun===G.BATTLE_SPEED));
    assert.equal(corner.hp,upgraded?44:50); assert.equal(lure.hp,50);
  }
});
test('音波砲依十字或九宮格挑選能打中最多地空蟲的落點', () => {
  for (const upgraded of [false,true]) {
    const s=upgraded ? upgradedFusion('cannon','push') : artillery('push');
    stationary(s,'giant',1,4);
    for (const [x,y] of [[5,1],[4,1],[6,1]]) stationary(s,'giant',x,y);
    for (const [x,y] of [[7,4],[9,4],[7,6],[9,6]]) stationary(s,'flyer',x,y);
    G.step(s,1/60);
    const shot=s.shots[0];
    assert.deepEqual([shot.impactX,shot.impactY],upgraded ? [8,5] : [5,1]);
  }
});
test('熱熔炸彈挑九格裡地面蟲最多的落點，忽略飛蟲、死蟲和落單的蟲', () => {
  for (const upgraded of [false,true]) {
    const s=upgraded ? upgradedFusion('flame','molecular') : artillery('molecular','flame');
    stationary(s,'giant',1,4);
    for (let i=0;i<6;i++) {
      stationary(s,'flyer',1,4);
      stationary(s,'giant',2,4).dead=true;
    }
    for (const [x,y] of [[6,3],[8,5],[6,5],[8,3]]) stationary(s,'bug',x,y);
    G.step(s,1/60);
    assert.deepEqual([s.shots[0].impactX,s.shots[0].impactY],[7,4]);
  }
});
test('追尾流星直擊三傷，兩格內其餘飛蟲各受一傷並暈眩', () => {
  const s=artillery('pierce'), land=stationary(s,'giant',4,4);
  assert.equal(G.toolFor('cometCannon').rate,G.TOOLS.pierce.rate);
  G.step(s,1/60); assert.equal(s.shots.length,0);
  const far=stationary(s,'flyer',1,4); G.step(s,1/60); const shot=s.shots[0];
  assert.equal(shot.target,far.id);s.buildings=[];far.y=2;
  G.step(s,1/60);assert.ok(shot.y<4);assert.ok(shot.angle<0);
  far.y=4;
  const first=stationary(s,'flyer',3.5,4), near=stationary(s,'flyer',3.5,6), off=stationary(s,'flyer',3.5,6.01);
  for(let i=0;i<80 && s.shots.length;i++) G.step(s,1/60);
  assert.equal(s.shots.length,0);assert.deepEqual([first.hp,near.hp,off.hp,far.hp,land.hp],[47,49,50,50,50]);
  assert.deepEqual([first.stun,near.stun,off.stun,land.stun],[.2*G.BATTLE_SPEED,.2*G.BATTLE_SPEED,0,0]);
  assert.equal(s.effects.find(e=>e.kind==='cometBurst').radius,2);
});
test('流星砲在 7.2 格內優先鎖定飛蟲群，忽略地面蟲，失去目標後重新找群', () => {
  const s=artillery('pierce'), tower=s.buildings[0];
  assert.equal(G.toolFor('cometCannon').range,7.2);
  tower.c=0; tower.r=4;
  const edge=stationary(s,'flyer',7.21,4);
  G.step(s,1/60); assert.equal(s.shots.length,0);
  edge.x=7.2;
  const lone=stationary(s,'flyer',1,3);
  for(let i=0;i<5;i++) stationary(s,'giant',1,3);
  stationary(s,'flyer',8,4);
  G.step(s,1/60);
  const shot=s.shots[0]; assert.equal(shot.target,edge.id);
  s.buildings=[]; edge.dead=true;
  stationary(s,'flyer',7,6);
  const center=stationary(s,'flyer',8,5);
  G.step(s,1/60); assert.equal(shot.target,center.id);
  assert.notEqual(shot.target,lone.id);
});
test('普通和升級冰火噴槍可挑九宮格任一格，射程在地圖邊緣裁切', () => {
  const area = G.attackCells('frostfireJet',5,4);
  assert.equal(area.length,9); assert.equal(G.attackCells('frostfireJet',0,0).length,4);
  for (const {c,r} of area) for (const upgraded of [false,true]) {
    const s=upgraded ? upgradedFusion('frost','flame') : artillery('flame','frost');
    const pair=[stationary(s,'giant',c,r), stationary(s,'giant',c+.25,r-.25)];
    const air=stationary(s,'flyer',c,r), outside=stationary(s,'giant',3.49,4);
    G.step(s,1/60);
    const pulse=s.effects.find(e=>e.kind==='frostfireSpray');
    assert.deepEqual([pulse.impactX,pulse.impactY,pulse.upgraded],[c,r,upgraded]);
    assert.ok(pair.every(e=>e.hp===(upgraded?47:48) && e.slow>0 && e.burnTicks===3));
    assert.deepEqual([air.hp,outside.hp],[50,50]);
  }
});
test('冰火噴槍每次命中噴射一次，兩發之間收束，依攻速結算整格傷害', () => {
  for (const upgraded of [false,true]) {
    const rate=upgraded ? 2.5 : 2;
    assert.equal(G.toolFor('frostfireJet',upgraded).rate,rate);
    const s=upgraded ? upgradedFusion('flame','frost') : artillery('flame','frost');
    const targets=[stationary(s,'giant',6,4),stationary(s,'shield',6.24,4.2)];
    const others=[stationary(s,'flyer',6,4),stationary(s,'giant',6,5),stationary(s,'giant',7,4)];
    G.step(s,1/60);
    assert.ok(targets.every(e=>e.hp===(upgraded?47:48) && e.slow>0 && e.burnTicks===3));
    advance(s,G.BATTLE_SPEED/rate-2/60); assert.ok(targets.every(e=>e.hp===(upgraded?47:48)));
    assert.ok(!s.effects.some(e=>e.kind==='frostfireSpray'));
    advance(s,2/60); assert.ok(targets.every(e=>e.hp===(upgraded?43:45)));
    s.buildings=[]; advance(s,G.BATTLE_SPEED*3);
    assert.ok(targets.every(e=>e.hp===(upgraded?40:42))); assert.ok(others.every(e=>e.hp===50 && !e.burnTicks && !e.slow));
  }
});
test('急凍光束沿用雷射射程與射速，穿盾直線對地空各造成兩點、緩速與觸電', () => {
  const s=artillery('pierce','frost'), spec=G.toolFor('cryoBeam');
  assert.deepEqual([spec.range,spec.rate,spec.damage],[G.TOOLS.pierce.range,G.TOOLS.pierce.rate,G.TOOLS.pierce.damage+1]);
  const ground=stationary(s,'shield',5,5), air=stationary(s,'flyer',5,6);
  G.step(s,1/60); const beam=s.effects.find(e=>e.kind==='laser');
  assert.equal(beam.weapon,'cryoBeam'); assert.equal(beam.hitDistances.length,2);
  assert.ok([ground,air].every(e=>e.hp===48 && e.iceStacks===2 && e.shock===G.TOOLS.pierce.stunSeconds*G.BATTLE_SPEED));
});
test('冰龍捲每 3 秒召喚、普通火龍捲每 2.5 秒召喚，各最多三個，暫停與清場正確', () => {
  for (const element of ['frost','flame']) {
    const s=artillery('push',element);
    stationary(s,'giant',0,0);
    const interval = (element==='frost' ? 3 : 2.5)*G.BATTLE_SPEED;
    for (let count=1;count<=3;count++) {
      advance(s,interval-1/60); assert.equal(s.vortices.length,count-1);
      G.step(s,1/60); assert.equal(s.vortices.length,count);
    }
    const oldest=s.vortices[0], before=[oldest.age,oldest.x,oldest.y];
    G.togglePause(s); advance(s,1); assert.deepEqual([oldest.age,oldest.x,oldest.y],before);
    G.togglePause(s); advance(s,interval-1/60);
    assert.equal(s.vortices.length,element==='frost' ? 3 : 2);
    G.step(s,1/60); assert.equal(s.vortices.length,3);
    assert.equal(s.vortices.includes(oldest),false);
    advance(s,.5*G.BATTLE_SPEED); assert.equal(s.vortices.length,3); assert.ok(!s.vortices.includes(oldest));
    s.enemies=[];G.step(s,1/60);assert.equal(s.vortices.length,0);assert.ok(!G.isAdvancing(s));
  }
});
test('冰龍捲升級擴大半徑，兩種等級都打九次，圈外地面蟲不受影響', () => {
  for (const [upgraded,radius] of [[false,1.3],[true,1.5]]) {
    const s=upgraded ? upgradedFusion('frost','push') : artillery('push','frost');
    const tower=s.buildings[0].id;
    const ground=stationary(s,'shield',6,4), sky=stationary(s,'flyer',6,4), outside=stationary(s,'giant',6,4);
    advance(s,3*G.BATTLE_SPEED);
    const v=s.vortices[0]; s.buildings=[];
    for(let i=0;i<9*60*G.BATTLE_SPEED;i++){
      ground.x=v.x+radius-.05; sky.x=v.x-radius+.05; outside.x=v.x+radius+.05;
      ground.y=sky.y=outside.y=v.y;
      G.step(s,1/60);
      assert.ok(v.x>=0 && v.x<G.COLS && v.y>=0 && v.y<G.ROWS);
    }
    assert.equal(s.vortices.length,0); assert.deepEqual([ground.hp,sky.hp,outside.hp],[32,32,50]);
    assert.ok(ground.slow && sky.slow); assert.equal(outside.slow,0); assert.equal(s.waveStats.damageByTower[tower],36);
  }
});
test('凍結電漿優先未冰封者，0.75 秒瞄準、7 點傷害，穿盾並冰封普通蟲 1.5 秒', () => {
  const s=artillery('molecular','frost'), tower=s.buildings[0];
  const a=stationary(s,'giant',6,4),b=stationary(s,'shield',5,5);a.hp=80;b.slow=5;
  G.step(s,1/60);assert.equal(tower.aim.target,a.id);
  a.frozenAt=s.time;a.frozenUntil=s.time+10;
  G.step(s,1/60);assert.equal(tower.aim.target,b.id);
  advance(s,.75*G.BATTLE_SPEED-2/60);assert.equal(s.shots.length,0);
  G.step(s,1/60);assert.equal(s.shots[0].weapon,'cryoPlasma');
  assert.equal(s.shots[0].duration,.18*G.BATTLE_SPEED);
  s.buildings=[];advance(s,.18*G.BATTLE_SPEED+.02);assert.equal(b.hp,43);
  assert.ok(Math.abs(b.frozenUntil-b.frozenAt-1.5*G.BATTLE_SPEED)<1e-9);assert.equal(b.stun,0);
  b.spikeStun=0;const pos=[b.x,b.y];
  while(s.time+1/60<=b.frozenUntil+1e-9) G.step(s,1/60);
  assert.deepEqual([b.x,b.y],pos); advance(s,.25);assert.notDeepEqual([b.x,b.y],pos);
});
test('敵人全被冰封仍可瞄準，空中獨角仙解凍後接續飛行並落地', () => {
  const s=artillery('molecular','frost'), tower=s.buildings[0];
  const rhino=enemy(s,'rhinoBoss',180,9,4);
  assert.ok(G.startLeap(s,rhino));advance(s,.2);
  const source={kind:'molecular',weapon:'cryoPlasma',c:5,r:4,tower:tower.id};
  assert.ok(G.hit(s,rhino,source));
  const pose=[rhino.x,rhino.y,rhino.leap.age,G.enemyLift(rhino,s.time)];
  G.step(s,1/60);assert.equal(tower.aim.target,rhino.id);
  assert.ok(Math.abs(rhino.frozenUntil-rhino.frozenAt-.5*G.BATTLE_SPEED)<1e-9);
  s.buildings=[];advance(s,.5*G.BATTLE_SPEED-1/60);
  assert.deepEqual([rhino.x,rhino.y,rhino.leap.age,G.enemyLift(rhino,s.time)],pose);
  advance(s,.7);assert.equal(rhino.leap,null);assert.notDeepEqual([rhino.x,rhino.y],pose.slice(0,2));
});
test('凍結電漿瞄準加上飛行的連續發射週期縮短一半',()=>{
  function interval(s) {
    stationary(s,'giant',6,4).hp=999;
    const frames=[];
    for(let i=0;i<650 && frames.length<3;i++){
      G.step(s,1/60);
      if(s.buildings[0].flash===1) frames.push(i);
    }
    assert.equal(frames.length,3);
    return frames[2]-frames[0];
  }
  const normal=G.createState(3);G.build(normal,'molecular',5,4);G.startWave(normal);normal.queue=[];normal.castle=null;
  assert.ok(Math.abs(2*interval(artillery('molecular','frost'))-interval(normal))<=2);
});
test('激光砲沿雷射直線穿盾打地空，附加一點傷害、觸電與持續三秒的灼燒', () => {
  const s=artillery('pierce','flame'), spec=G.toolFor('heatRay'), id=s.buildings[0].id;
  assert.deepEqual([spec.range,spec.rate,spec.damage],[G.TOOLS.pierce.range,.7,G.TOOLS.pierce.damage+1]);
  const a=stationary(s,'shield',5,5), b=stationary(s,'flyer',5,6);
  G.step(s,1/60);s.buildings=[];
  assert.equal(s.effects.find(e=>e.kind==='laser').weapon,'heatRay');
  for(const e of [a,b]) assert.deepEqual([e.hp,e.burnTicks,e.shock,e.slow],[48,3,.1*G.BATTLE_SPEED,0]);
  const off=stationary(s,'giant',6,5);advance(s,3*G.BATTLE_SPEED);
  assert.deepEqual([a.hp,b.hp,off.hp,s.waveStats.damageByTower[id]],[45,45,50,10]);
});
test('再次點燃由新塔立即扣一血、刷新完整三秒，燃燒自己的每秒傷害只結算一次',()=>{
  const s=artillery('pierce','flame');s.buildings=[];
  const e=stationary(s,'flyer',7,4);
  const laser={kind:'pierce',weapon:'heatRay',c:5,r:4,tower:71};
  G.hit(s,e,laser);assert.equal(e.hp,48);
  advance(s,G.BATTLE_SPEED*.8);
  G.hit(s,e,{kind:'pea',weapon:'fireCannon',tower:72,c:5,r:4});
  assert.deepEqual([e.hp,e.burnTicks,e.burnClock],[44,3,G.BATTLE_SPEED]);
  advance(s,G.BATTLE_SPEED-1/60);assert.equal(e.hp,44);
  G.step(s,1/60);assert.equal(e.hp,43);
  advance(s,2*G.BATTLE_SPEED);assert.deepEqual([e.hp,e.burnTicks],[41,0]);
  assert.deepEqual(s.waveStats.damageByTower,{71:2,72:7});
});
test('火龍捲每 2.5 秒召喚、維持六秒，圈內地空每秒一傷另附燃燒，離圈後繼續燃燒', () => {
  const s=artillery('push','flame'), id=s.buildings[0].id;
  const ground=stationary(s,'giant',6,4), sky=stationary(s,'flyer',6,4), off=stationary(s,'giant',7,4);
  advance(s,2.5*G.BATTLE_SPEED-1/60);assert.equal(s.vortices.length,0);
  G.step(s,1/60);const v=s.vortices[0];assert.equal(v.weapon,'fireStation');
  let overlapping=false;
  for(let i=1;i<=6*60*G.BATTLE_SPEED;i++) {
    ground.x=v.x+.85;sky.x=v.x-.85;off.x=v.x+1.25;ground.y=sky.y=off.y=v.y;
    G.step(s,1/60);
    if (i===60*G.BATTLE_SPEED) assert.deepEqual([ground.hp,sky.hp],[48,48]);
    if (s.vortices.length===2) {
      overlapping=true; s.buildings=[];s.vortices=s.vortices.filter(w=>w.id===v.id);
    }
  }
  assert.ok(overlapping);assert.ok(Math.hypot(v.x-5,v.y-4)>1);
  assert.equal(s.vortices.length,0);assert.deepEqual([ground.hp,sky.hp,off.hp],[38,38,50]);
  assert.equal(ground.slow,0);assert.equal(off.burnTicks,0);
  // Leave immediately after the final damage pulse. Remaining ticks use the shared burn clock.
  const remaining=ground.burnTicks;assert.ok(remaining>0);
  advance(s,3*G.BATTLE_SPEED);
  assert.deepEqual([ground.hp,sky.hp],[38-remaining,38-remaining]);
  assert.equal(s.waveStats.damageByTower[id],2*(12+remaining));
});
test('熱熔炸彈鎖定原格，一秒落地、兩秒引爆，九格地面各十五點並留下火地', () => {
  const s=artillery('molecular','flame'), id=s.buildings[0].id;
  const lure=stationary(s,'giant',8,4);
  G.step(s,1/60);const shot=s.shots[0];assert.deepEqual([shot.impactX,shot.impactY],[8,4]);
  lure.x=10;s.buildings=[];
  const cells=G.attackCells('moltenMortar',8,4);
  assert.equal(cells.length,9);assert.equal(G.attackCells('moltenMortar',0,0).length,4);
  const occupants=cells.map(p=>stationary(s,'giant',p.c,p.r));
  const sky=stationary(s,'flyer',8,4);
  advance(s,G.BATTLE_SPEED-2/60);assert.ok(occupants.every(e=>e.hp===50));assert.equal(s.fires.length,0);
  G.step(s,1/60);assert.ok(shot.armed);assert.equal(shot.age,0);assert.equal(s.fires.length,1);
  assert.equal(occupants[0].hp,45);assert.ok(occupants.slice(1).every(e=>e.hp===50));
  G.togglePause(s);advance(s,2);G.togglePause(s);assert.equal(shot.age,0);
  advance(s,2*G.BATTLE_SPEED-1/60);assert.equal(s.fires.length,1);
  const entrant=stationary(s,'bug',9,5);G.step(s,1/60);
  assert.equal(s.shots.length,0);assert.equal(s.fires.length,9);
  assert.deepEqual(s.effects.find(e=>e.kind==='moltenBlast').cells,cells);
  assert.ok(occupants.slice(1).every(e=>e.hp===35));assert.equal(entrant.hp,35);
  assert.deepEqual([sky.hp,lure.hp],[50,50]);assert.ok(s.fires.every(f=>f.tower===id));
  advance(s,G.BATTLE_SPEED);assert.ok(occupants.slice(1).every(e=>e.hp===34));
});
test('熱熔炸彈使用電漿射程、只打地面，可打近處，每五秒才投下一顆', () => {
  const s=artillery('molecular','flame'), spec=G.toolFor('moltenMortar');
  assert.deepEqual([spec.range,spec.minRange,spec.rate],[G.TOOLS.molecular.range,0,.2]);
  stationary(s,'flyer',6,4);const bug=stationary(s,'giant',11,7);
  G.step(s,1/60);assert.equal(s.shots.length,0);
  bug.x=6;bug.y=4;G.step(s,1/60);const first=s.shots[0];assert.equal(first.impactX,6);
  advance(s,5*G.BATTLE_SPEED-2/60);assert.equal(s.shots.length,0);
  advance(s,3/60);assert.equal(s.shots.length,1);assert.notEqual(s.shots[0].id,first.id);
});
test('十字電塔每秒電擊相鄰四格地面蟲 1.2 次，飛蟲、中心、斜角與兩格外皆不受擊', () => {
  for (const [upgraded,damage] of [[false,6],[true,8]]) {
    const s=upgraded ? upgradedFusion('cannon','molecular') : artillery('molecular');
    const targets=[[4,4],[6,4],[5,3],[5,5]].map(([x,y])=>stationary(s,'giant',x,y));
    const others=[[5,4],[6,5],[7,4]].map(([x,y])=>stationary(s,'giant',x,y));
    others.push(stationary(s,'flyer',4,4));
    G.step(s,1/60);assert.ok(targets.every(e=>e.hp===50-damage && e.shock===.1*G.BATTLE_SPEED));
    advance(s,G.BATTLE_SPEED/1.2-2/60);assert.ok(targets.every(e=>e.hp===50-damage && e.shock<1e-9));
    G.step(s,1/60);assert.ok(targets.every(e=>e.hp===50-2*damage)); assert.ok(others.every(e=>e.hp===50));
  }
  assert.deepEqual(G.attackCells('crossCoil',0,0),[{c:1,r:0},{c:0,r:1}]);
});
test('反動砲從正面穿盾，一束擊中多蟲，各觸電 0.2 秒並沿路擊退三分之一格',()=>{
  const s=artillery('push','pierce');
  const a=stationary(s,'shield',5,5), b=stationary(s,'flyer',5,6);
  G.step(s,1/60);assert.equal(s.effects.find(e=>e.kind==='laser').weapon,'recoilRay');
  for(const e of [a,b]) {
    assert.equal(e.hp,49);assert.equal(e.shock,0);e.spikeStun=0;
    assert.ok(e.push);assert.ok(Math.abs(e.push.length-1/3)<1e-8);
  }
  s.buildings=[];G.step(s,1/60);
  assert.ok(b.push.age>0 && b.shock===0);
  while(b.push) G.step(s,1/60);
  assert.equal(b.shock,.2*G.BATTLE_SPEED);
  const position=[b.x,b.y];advance(s,.2*G.BATTLE_SPEED);
  assert.deepEqual([b.x,b.y],position);
});
test('崩解光束在五格內先掃描 0.4 秒，持續照射到滿階，換目標重新集氣', () => {
  const dt=1/60, charge=.4*G.BATTLE_SPEED;
  for (const [upgraded,initial,maximum,interval] of [[false,2,6,.5],[true,3,7,.3]]) {
    const s=upgraded ? upgradedFusion('pierce','molecular') : artillery('molecular','pierce');
    const tower=s.buildings[0];
    const a=stationary(s,'shield',10,4), b=stationary(s,'flyer',6,4), outside=stationary(s,'giant',10.01,4);
    a.hp=100; outside.hp=150;
    advance(s,charge-dt); assert.equal(tower.aim.target,a.id); assert.equal(a.hp,100);
    b.hp=120; G.step(s,dt); assert.equal(a.hp,100-initial);
    for (let i=1; i<=maximum-initial+1; i++) {
      const hp=a.hp; advance(s,interval*G.BATTLE_SPEED-dt); assert.equal(a.hp,hp);
      G.step(s,dt); assert.equal(hp-a.hp,Math.min(initial+i,maximum));
    }
    assert.equal(outside.hp,150); assert.equal(b.hp,120);
    a.x=10.01; advance(s,charge-dt); assert.equal(tower.aim.target,b.id); assert.equal(b.hp,120);
    G.step(s,dt); assert.equal(b.hp,120-initial);
    b.x=10.01; G.step(s,dt); assert.equal(tower.aim,null);
    b.x=6; advance(s,charge-dt); assert.equal(b.hp,120-initial);
    G.step(s,dt); assert.equal(b.hp,120-2*initial);
  }
});

test('雷射新購收十二金，舊雷射和融合塔讀檔後依原始材料支出退款', () => {
  for (const [fusion,paid] of [[false,12],[false,15],[true,30],[true,33],[true,37]]) {
    const s=G.createState(4), budget=s.money;
    assert.ok(G.build(s,'pierce',5,4).ok); assert.equal(s.money,budget-12);
    if (fusion) {assert.ok(G.build(s,'molecular',5,4).ok);assert.equal(s.money,budget-30);}
    const saved=G.snapshot(s); saved.buildings[0].paidCost=paid; saved.money=budget-paid;
    const loaded=G.restore(saved); assert.ok(loaded); assert.ok(G.remove(loaded,5,4).ok);
    assert.equal(loaded.money,budget);
  }
});
test('黑洞砲優先選能吸最多蟲的地格，瞄準 3 秒後在原地格爆發',()=>{
  for (const upgraded of [false,true]) {
    const s=upgraded ? upgradedFusion('push','molecular') : artillery('molecular','push');
    const tower=s.buildings[0];
    const lone=stationary(s,'giant',1,4);lone.hp=500;
    const target=stationary(s,'giant',7.2,4), left=stationary(s,'giant',6.1,4);
    const nearby=stationary(s,'flyer',7,5);
    G.step(s,1/60); assert.deepEqual([tower.aim.x,tower.aim.y],[7,4]);
    target.x=11;left.x=11;
    advance(s,3*G.BATTLE_SPEED-2/60); assert.equal(nearby.hp,50);assert.equal(tower.aim.x,7);
    G.step(s,1/60);
    assert.ok(nearby.pull);assert.equal(nearby.hp,30);assert.equal(target.hp,50);assert.equal(lone.hp,500);
    assert.ok(s.effects.some(e=>e.kind==='gravityWell' && e.x===7 && e.y===4));assert.equal(s.shots.length,0);
  }
});
test('普通及升級黑洞都依各自吸引半徑挑蟲群，地面和空中一起計數', () => {
  for (const upgraded of [false,true]) {
    const s=upgraded ? upgradedFusion('push','molecular') : artillery('molecular','push');
    const lone=stationary(s,'giant',1,4); lone.hp=999;
    for (const [x,y] of [[7,2],[7,6],[9,4]]) stationary(s,'flyer',x,y);
    G.step(s,1/60);
    const aim=s.buildings[0].aim, radius=G.toolFor('gravityCannon',upgraded).radius;
    assert.ok(s.enemies.filter(e=>e!==lone).every(e=>Math.hypot(e.x-aim.x,e.y-aim.y)<=radius));
    assert.ok(Math.hypot(lone.x-aim.x,lone.y-aim.y)>radius);
  }
});
test('黑洞砲半徑 2.5 格內最近一隻受二十傷、其餘各一傷，地空蟲按各自原距離內移後暈 0.2 秒',()=>{
  const s=artillery('molecular','push'), tower=s.buildings[0];s.buildings=[];
  const a=stationary(s,'giant',7.1,4), ground=stationary(s,'shield',7,6.5);
  const air=stationary(s,'flyer',6.2,4), outside=stationary(s,'giant',7,6.501);
  a.hp=20;
  const second=stationary(s,'giant',7.2,4);
  const shot={kind:'molecular',weapon:'gravityCannon',tower:tower.id,c:5,r:4,impactX:7,impactY:4};
  G.resolveShot(s,shot);assert.ok(a.dead);assert.equal(s.effects.at(-1).kind,'gravityWell');
  assert.equal(s.effects.at(-1).radius,2.5);
  const landings = [ground,air,second].map(e=>[e.pull.x,e.pull.y]);
  for (const e of [ground,air,second]) {
    const dx=e.x-7, dy=e.y-4, px=e.pull.x-7, py=e.pull.y-4;
    assert.ok(Math.abs(dx*py-dy*px)<1e-9);
    assert.ok(dx*px+dy*py>=0 && Math.hypot(px,py)<Math.hypot(dx,dy));
  }
  G.step(s,1/60);assert.ok(air.x>6.2 && air.x<7);
  advance(s,.24*G.BATTLE_SPEED-1/60);
  for(const [i,e] of [ground,air,second].entries()) {
    const [x,y]=landings[i];
    assert.deepEqual([e.x,e.y,e.c,e.r,e.hp,e.pull],[x,y,Math.round(x),Math.round(y),49,null]);
    assert.equal(e.stun,.2*G.BATTLE_SPEED);
  }
  assert.equal(new Set([ground,air,second].map(e=>e.x+','+e.y)).size,3);
  advance(s,.2*G.BATTLE_SPEED);assert.ok(ground.stun<1e-9);
  assert.equal(s.waveStats.damageByTower[tower.id],23);
  assert.ok(!outside.pull);assert.deepEqual([outside.x,outside.y,outside.hp],[7,6.501,50]);
});
test('黑洞在角落也將蟲分散到合法落點，相同種子可重播、不同種子會改變位置',()=>{
  function positions(seed) {
    const s=G.createState(3); G.startWave(s,0,seed);
    const bugs=Array.from({length:8},()=>stationary(s,'flyer',.8,.1));
    G.resolveShot(s,{kind:'molecular',weapon:'gravityCannon',c:3,r:1,impactX:0,impactY:0});
    return bugs.map(e=>[e.pull.x,e.pull.y]);
  }
  const points=positions(4743);
  assert.ok(points.every(([x,y])=>x>=0 && x<=.72+1e-9 && y>=0 && y<=.09+1e-9 && Math.abs(x-8*y)<1e-9));
  assert.ok(new Set(points.map(p=>p.join(','))).size>1);
  assert.deepEqual(points,positions(4743));
  assert.notDeepEqual(points,positions(4744));
});
test('兩級黑洞的吸力由內往外減弱，最外圈只移動 0.08～0.10 格',()=>{
  for (const upgraded of [false,true]) {
    const radius=G.toolFor('gravityCannon',upgraded).radius;
    for (const seed of [1,8192,15872]) {
      const s=artillery('molecular','push');
      s.gravityRng={rngState:seed};
      const bugs=[0,.25,.5,.9,1,1.01].map((ratio,i)=>stationary(s,i%2 ? 'flyer' : 'bug',6+ratio*radius,4));
      G.resolveShot(s,{kind:'molecular',weapon:'gravityCannon',upgraded,c:5,r:4,impactX:6,impactY:4});
      const moved=bugs.slice(0,-1).map(e=>e.x-e.pull.x);
      assert.equal(moved[0],0);
      assert.ok(moved[1]>=.8*.25*radius-1e-9 && moved[1]<=.25*radius);
      assert.ok(moved[1]/(.25*radius)>moved[2]/(.5*radius));
      assert.ok(moved[2]>moved[3] && moved[3]<=.13);
      assert.ok(moved[4]>=.08-1e-9 && moved[4]<=.10+1e-9);
      assert.equal(bugs.at(-1).pull,undefined);
    }
  }
});
test('黑洞落點被牆擋住時就縮短地面蟲位移，飛蟲可以照常被拉動',()=>{
  const s=artillery('molecular','push');
  s.buildings.push({kind:'wall',c:8,r:4});
  const ground=stationary(s,'bug',8.51,4), flyer=stationary(s,'flyer',8.51,4);
  G.resolveShot(s,{kind:'molecular',weapon:'gravityCannon',c:5,r:4,impactX:7,impactY:4});
  assert.ok(ground.pull.x>=8.5 && ground.pull.x<8.51);
  assert.ok(flyer.pull.x<8.5);
});
test('彈射中的小蟑螂落地才被吸，位移受爆發時與落地時的外圈吸力限制',()=>{
  for (const [fromX,toX] of [[6.8,9],[9,7]]) {
    const s=artillery('molecular','push'); s.buildings=[];
    const bug=stationary(s,'roach',fromX,4);
    bug.leap={fromX,fromY:4,x:toX,y:4,age:0,duration:.1,split:true};
    G.resolveShot(s,{kind:'molecular',weapon:'gravityCannon',upgraded:true,c:5,r:4,impactX:6,impactY:4});
    assert.ok(bug.leap.pullOnLanding); assert.ok(!bug.pull);
    advance(s,.1);
    const displacement=toX-bug.pull.x;
    assert.ok(displacement>=.08-1e-9 && displacement<=.10+1e-9);
  }
});
test('黑洞吸到半空中的獨角仙會落回實際落點，再次正常行走',()=>{
  const s=artillery('molecular','push'), id=s.buildings[0].id;s.buildings=[];
  const rhino=enemy(s,'rhinoBoss',180,8,4);
  assert.ok(G.startLeap(s,rhino));advance(s,.15);
  const c=Math.round(rhino.x),r=Math.round(rhino.y),bug=stationary(s,'giant',c,r);
  const lift=G.enemyLift(rhino,s.time);
  G.resolveShot(s,{kind:'molecular',weapon:'gravityCannon',tower:id,c:5,r:4,target:bug.id,impactX:c,impactY:r});
  assert.ok(rhino.pull);const {x,y}=rhino.pull;G.step(s,1/60);assert.ok(G.enemyLift(rhino,s.time)<lift);
  advance(s,.24*G.BATTLE_SPEED);assert.ok(!rhino.pull && !rhino.leap);
  assert.deepEqual([rhino.x,rhino.y,rhino.c,rhino.r],[x,y,Math.round(x),Math.round(y)]);
  advance(s,.5);assert.ok(Math.hypot(rhino.x-x,rhino.y-y)>0);
});
test('戰術砲臺兩門砲加一格射程、地空分流，雙目標以各自冷卻開火', () => {
  const s = fusionBattle('cannon'), ground = enemy(s,'giant',100,8.75,4), sky = enemy(s,'flyer',100,9.05,4);
  const wing = enemy(s,'flyer',100,8.8,4.6);
  for (const e of [ground,sky,wing]) e.shock = 100;
  const launches = new Map();
  for (let frame = 0; frame < 90; frame++) {
    G.step(s,1/60);
    for (const shot of s.shots) if (!launches.has(shot.id)) launches.set(shot.id, {weapon:shot.weapon,frame,target:shot.target});
  }
  const shots = [...launches.values()], air = shots.filter(v => v.weapon === 'tacticalAir'), land = shots.filter(v => v.weapon === 'tacticalGround');
  assert.equal(air[0].frame,land[0].frame); assert.ok(air[1].frame < land[1].frame);
  for (const [list, kind] of [[air,'pea'],[land,'cannon']]) {
    const expectedFrames = G.BATTLE_SPEED * 60 / (G.TOOLS[kind].rate * 1.2);
    assert.ok(Math.abs((list[1].frame - list[0].frame) - expectedFrames) <= 1);
  }
  assert.ok(air.every(v => v.target !== ground.id)); assert.ok(land.every(v => v.target === ground.id));
  assert.equal(ground.hp,94); assert.equal(sky.hp + wing.hp,196);
  for (const [kind,targetKind] of [['tacticalAir','bug'],['tacticalGround','flyer']]) {
    const fresh = fusionBattle('cannon'), only = enemy(fresh,targetKind,100,7,4);
    only.shock = 100; G.step(fresh,.01);
    assert.ok(fresh.shots.length); assert.ok(fresh.shots.every(shot => shot.weapon !== kind));
  }
});
test('升級戰術砲臺的兩門砲各比普通版快 30%，對空兩傷、對地三傷', () => {
  const s=upgradedFusion('pea','cannon');
  stationary(s,'flyer',7,3); stationary(s,'bug',7,5);
  const frames={tacticalAir:[],tacticalGround:[]}, launched=new Set();
  for (let i=0;i<120;i++) {
    G.step(s,1/60);
    for (const shot of s.shots) if (!launched.has(shot.id)) {
      launched.add(shot.id); frames[shot.weapon].push(i);
    }
  }
  for (const [k,damage] of [['tacticalAir',2],['tacticalGround',3]]) {
    assert.equal(G.toolFor(k,true).damage,damage);
    const period=60*G.BATTLE_SPEED/(G.toolFor(k).rate*1.3);
    assert.ok(Math.abs(frames[k][1]-frames[k][0]-period)<=1);
  }
});
test('寒冰砲比同級砲塔快 50%，每發重新挑未冰凍蟲，全部緩速後仍可開火', () => {
  const s = fusionBattle('frost'), a = enemy(s,'giant',100,4,4), b = enemy(s,'flyer',100,7,4);
  a.shock = b.shock = 100; a.slow = 10;
  G.step(s,.01); assert.equal(s.shots[0].target,b.id);
  advance(s,.25); assert.equal(b.hp,99); assert.ok(b.slow > 0); assert.equal(a.hp,100);
  advance(s,.78); assert.equal(a.hp,99);
  for (const tier of [false,true]) assert.equal(G.toolFor('iceCannon',tier).rate,G.TOOLS.pea.rate*1.5*(tier ? 1.4 : 1));
});
test('火炮只對空、近身與射程外緣直射，升級只增加直擊傷害，重複點燃立即扣血', () => {
  for (const upgraded of [false,true]) for (const distance of [1,upgraded ? 6 : 5]) {
    const s = upgraded ? upgradedFusion('pea','flame') : fusionBattle('flame');
    const land=stationary(s,'giant',6,4);
    G.step(s,1/60);assert.equal(s.shots.length,0);
    const target = enemy(s,'flyer',100,5+distance,4);
    target.shock = 100; G.step(s,.01); assert.equal(s.shots[0].weapon,'fireCannon');
    const hitPoints = upgraded ? 96 : 97;
    s.buildings=[]; advance(s,.25); assert.equal(target.hp,hitPoints); assert.equal(target.burnTicks,3);
    assert.equal(s.fires.length,0);
    advance(s,G.BATTLE_SPEED*3); assert.equal(target.hp,hitPoints-3); assert.equal(target.burnTicks,0);assert.equal(land.hp,50);
  }
  const s = fusionBattle('flame'), target = enemy(s,'flyer',100,6,4); target.shock=100;
  advance(s,2.2); assert.equal(target.burnTicks,3);
  assert.equal(s.waveStats.damageByTower[s.buildings[0].id],11);
});
test('火炮每發優先選未燃燒飛蟲，全部點燃後繼續開火', () => {
  const s = fusionBattle('flame'), a = enemy(s,'flyer',100,4,4), b = enemy(s,'flyer',100,7,4);
  a.shock = b.shock = 100;
  a.burnTicks=3; a.burnClock=G.BATTLE_SPEED;
  G.step(s,.01); assert.equal(s.shots[0].target,b.id);
  advance(s,.25); assert.equal(b.burnTicks,3);
  advance(s,.55); assert.equal(s.shots.length,0);
  advance(s,.05); assert.equal(s.shots[0].target,a.id);
  advance(s,.2); assert.equal(a.hp,96);
  assert.equal(G.toolFor('fireCannon').rate,1.8);
});
test('雷管砲能瞄準遠角，貫穿同線盾蟲，偏離光束的蟲不受傷', () => {
  const s = fusionBattle('pierce',2,4);
  const near = enemy(s,'shield',100,7,4), far = enemy(s,'giant',100,11,4), off = enemy(s,'giant',100,10,5);
  for (const e of [near,far,off]) e.shock=100;
  G.step(s,.01); assert.deepEqual([near.hp,far.hp,off.hp],[99,99,100]);
  const solo = fusionBattle('pierce',2,4), corner = enemy(solo,'flyer',100,11,0); corner.shock=100;
  G.step(solo,.01); assert.equal(corner.hp,99); assert.equal(solo.effects.find(e=>e.kind==='laser').weapon,'mapLaser');
});
test('雷管砲升級後每秒一發，普通版每秒 0.8 發', () => {
  for (const [upgraded,rate] of [[false,.8],[true,1]]) {
    const s = upgraded ? upgradedFusion('pea','pierce') : fusionBattle('pierce');
    const target = stationary(s,'giant',7,4);
    G.step(s,1/60); assert.equal(target.hp,49);
    assert.equal(G.toolFor('mapLaser',upgraded).rate,rate);
    advance(s,G.BATTLE_SPEED/rate-.05); assert.equal(target.hp,49);
    advance(s,.08); assert.equal(target.hp,48);
  }
});
test('衝擊塔每三秒發動一次震波，半徑兩格含邊界，擊退地空蟲後暈眩 0.4 秒', () => {
  const s = fusionBattle('push'), tower = s.buildings[0], interval = 3 * G.BATTLE_SPEED;
  const outside = stationary(s,'giant',7.01,4);
  advance(s,interval - 1/60);
  assert.equal(tower.flash,0);
  G.step(s,1/60);
  const pulse = s.effects.find(e=>e.kind==='impactPulse');
  assert.deepEqual([pulse.x,pulse.y,pulse.radius,outside.hp],[5,4,2,50]);
  const targets = [[7,4],[3,4],[5,6],[5,2],[6,5]].map(([x,y],i)=>stationary(s,i%2?'flyer':'giant',x,y));
  const corner = stationary(s,'flyer',6.5,5.5), shield = stationary(s,'shield',5,5);
  advance(s,interval - 1/60);
  assert.ok(targets.every(e=>e.hp===50));
  G.step(s,1/60);
  assert.ok(targets.every(e=>e.hp===49 && Math.abs(e.push.length-1)<1e-8));
  assert.ok(targets.every(e=>e.stun===0));
  assert.ok([outside,corner,shield].every(e=>e.stun===0));
  assert.deepEqual([outside.hp,corner.hp,shield.hp,shield.push],[50,50,50,null]);
  assert.equal(s.shots.length,0);
  assert.equal(s.waveStats.damageByTower[tower.id],targets.length);
  assert.equal(s.effects.filter(e=>e.kind==='impactPulse').length,1);
  for(const e of targets)e.spikeStun=0;
  while(targets[0].push)G.step(s,1/60);
  assert.ok(targets.every(e=>!e.push && e.stun===.4*G.BATTLE_SPEED));
});
test('衝擊震波打中跳躍中的蟲，落地後沿路擊退一格', () => {
  const s = fusionBattle('push'), hopper=enemy(s,'hopper',100,6,4);
  hopper.jumped=true;
  hopper.leap={fromX:6,fromY:4,x:7,y:4,age:0,duration:.1};
  s.buildings[0].cooldown=0;
  G.step(s,1/60);
  assert.deepEqual([hopper.hp,hopper.leap.landingPush,hopper.push],[99,1,null]);
  s.buildings=[];advance(s,.12);
  assert.equal(hopper.leap,null);assert.equal(hopper.push.length,1);
  assert.equal(hopper.stun,0);while(hopper.push)G.step(s,1/60);
  assert.equal(hopper.stun,.4*G.BATTLE_SPEED);
});
test('電磁砲 0.75 秒瞄準後穿盾造成 19 傷害，本機測試版只傷害瞄準的目標', () => {
  const s=fusionBattle('molecular'), a=enemy(s,'shield',100,7,5), b=enemy(s,'giant',40,8,5), c=enemy(s,'giant',40,9,5);
  for(const e of [a,b,c]) e.shock=100;
  advance(s,.75*G.BATTLE_SPEED - 1/60); assert.equal(s.shots.length,0); assert.equal(s.buildings[0].aim.target,a.id);
  G.step(s,1/60); assert.equal(s.shots[0].weapon,'magCannon'); s.buildings=[];
  advance(s,2.5); assert.deepEqual([a.hp,b.hp,c.hp],[81,40,40]); assert.equal(s.stats.blocked,0);
});
test('石牆雙向都不能融合。第 17 版七種壁壘保留砲塔、升級、傷害紀錄並只退款一次', () => {
  for(const k of Object.keys(G.TOOLS).filter(k=>k!=='wall')){
    assert.equal(G.fusionRecipe('wall',k),null); assert.equal(G.fusionRecipe(k,'wall'),null);
    for(const [base,add] of [[k,'wall'],['wall',k]]){
      const s=G.createState(3); G.build(s,base,5,4); const before=G.snapshot(s);
      assert.equal(G.build(s,add,5,4).ok,false); assert.deepEqual(G.snapshot(s),before);
    }
    const old=G.createState(3); G.build(old,k,5,4); G.upgrade(old,5,4);
    const snap=G.snapshot(old); snap.version=17; snap.money--; snap.fusionHammers--;
    Object.assign(snap.buildings[0],{fusionKind:'wall',hp:7,paidCost:G.TOOLS[k].cost+1,lastDamage:12});
    const loaded=G.restore(snap), b=loaded.buildings[0];
    assert.deepEqual([b.kind,b.hp,b.upgraded,b.fusionKind,b.lastDamage],[k,5,true,undefined,12]);
    assert.deepEqual([loaded.money,loaded.fusionHammers,b.paidCost],[old.money,1,G.TOOLS[k].cost]);
    assert.deepEqual(G.snapshot(G.restore(G.snapshot(loaded))),G.snapshot(loaded));
    assert.equal(G.restore({...snap,version:18}),null);
  }
});
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

test('分子砲對第八關巨蟲每發扣三十八血，第二發擊殺', () => {
  const hp=G.LEVELS[7].waves.flat().find(g=>g.kind==='giant').hp;
  const s=G.createState(7), target=enemy(s,'giant',hp,6,3);
  assert.equal(hp,76);
  const shot={kind:'molecular',target:target.id,c:6,r:5};
  G.resolveShot(s,shot); assert.equal(target.hp,38); assert.equal(target.dead,false);

  G.resolveShot(s,shot); assert.equal(target.hp,0); assert.equal(target.dead,true); assert.equal(s.stats.hits,2);
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
  advance(s, 1.5 * G.BATTLE_SPEED - 2 / 60); assert.equal(s.shots.length, 0); assert.equal(high.hp, 40);
  G.step(s, 1 / 60); assert.equal(s.shots[0].target, high.id);
  advance(s, .36 * G.BATTLE_SPEED); assert.deepEqual([small.hp, injured.hp, high.hp, outside.hp], [2, 1, 2, 200]);
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

test('分子砲持續追蹤同一目標，暫停凍結瞄準，每次射擊前都需1.5 秒', () => {
  const s=G.createState(); G.build(s,'molecular',3,5); s.phase='running';
  const first=enemy(s,'giant',50,8,3), tower=s.buildings[0];
  advance(s,1.5); const age=tower.aim.age;
  const later=enemy(s,'giant',100,8,4);
  G.togglePause(s); const paused=JSON.stringify(s); advance(s,20); assert.equal(JSON.stringify(s),paused);
  G.togglePause(s); advance(s,1.5*G.BATTLE_SPEED-age-1/60);
  assert.equal(tower.aim.target,first.id); assert.equal(s.shots.length,0);
  G.step(s,1/60); assert.equal(s.shots[0].target,first.id);
  advance(s,.36 * G.BATTLE_SPEED + 1/60); assert.equal(first.hp,12); assert.equal(later.hp,100); assert.equal(tower.aim.target,later.id);
  advance(s,1.5*G.BATTLE_SPEED-tower.aim.age-1/60); assert.equal(s.shots.length,0);
  G.step(s,1/60); assert.equal(s.shots[0].target,later.id);
});

test('分子砲失去死亡或離開射程的目標時重新瞄準完整1.5 秒', () => {
  for(const reason of ['dead','outside']) {
    const s=G.createState(); G.build(s,'molecular',2,5); s.phase='running';
    const first=enemy(s,'giant',40,6,3), backup=enemy(s,'giant',20,5,4), tower=s.buildings[0];
    advance(s,2); assert.equal(tower.aim.target,first.id);
    if(reason==='dead') first.dead=true;
    else Object.assign(first,{x:11,y:0,c:11,r:0,next:null});
    G.step(s,1/60); assert.equal(tower.aim.target,backup.id); assert.equal(tower.aim.age,1/60);
    advance(s,1.5*G.BATTLE_SPEED-2/60); assert.equal(s.shots.length,0); assert.equal(backup.hp,20);
    G.step(s,1/60); assert.equal(s.shots[0].target,backup.id);
  }
});

test('分子砲命中後才重新選敵，不會以扣血前的數字再次鎖定原目標', () => {
  const s=G.createState(); G.build(s,'molecular',5,5); s.phase='running';
  const first=enemy(s,'giant',56,8,3), other=enemy(s,'giant',45,8,4), tower=s.buildings[0];
  advance(s,1.5*G.BATTLE_SPEED); assert.equal(s.shots[0].target,first.id);
  advance(s,0.1); assert.equal(first.hp,56); assert.equal(tower.aim,null);
  advance(s,.36 * G.BATTLE_SPEED - .1 + 1/60); assert.equal(first.hp,18); assert.equal(tower.aim.target,other.id);
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
  const s=G.createState();G.build(s,'push',9,6);s.phase='running';
  // 在邊角固定目標，讓兩發都在射程內，單獨測量射速。
  enemy(s,'giant',1000,11,7).shock=1000;const tower=s.buildings[0];
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
    G.step(s, 1 / 60);
    if (kind==='flame') assert.deepEqual([s.shots[0].impactX,s.shots[0].impactY],[8,3]);
    else assert.equal(s.shots[0].target, ground.id);
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
    jumping.spikeStun=10;
    G.step(s, 1 / 60); jumping.spikeStun=0;
    if (kind==='flame') assert.deepEqual([s.shots[0].impactX,s.shots[0].impactY],[8,3]);
    else assert.equal(s.shots[0].target, jumping.id);
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

test('冰凍靈氣無視上下盾，一血蟑螂卵只緩速，升級每隻盾蟲各扣一血', () => {
  const s = G.createState(), center = enemy(s,'splitter',1,6,3);
  const up = enemy(s,'shield',10,6.2,3), down = enemy(s,'shield_down',10,5.8,3);
  G.resolveShot(s,{kind:'frost',target:center.id,c:6,r:5});
  assert.equal(center.dead,false); assert.equal(center.hp,1); assert.equal(center.flash,0); assert.equal(up.slow,G.TOOLS.frost.slowDuration); assert.equal(down.slow,G.TOOLS.frost.slowDuration);
  assert.deepEqual([up.hp,down.hp],[10,10]); assert.equal(s.stats.blocked,0);
  assert.equal(s.stats.split,0); assert.deepEqual(s.effects.map(e=>e.kind),['frost']);
  G.resolveShot(s,{kind:'frost',upgraded:true,c:6,r:1});
  assert.deepEqual([up.hp,down.hp,up.shieldFlash,down.shieldFlash,s.stats.blocked],[9,9,0,0,0]);
});

test('火焰命中後在地板燃燒四秒，每實際一秒扣一次血，火區重疊不疊傷', () => {
  const s = G.createState(), a = enemy(s, 'shield', 13, 6, 3);
  G.resolveShot(s, { kind: 'flame', target: a.id, c: 6, r: 5 });
  assert.equal(a.hp, 8); assert.equal(s.fires.length, 1);
  G.ignite(s, 6, 3); assert.equal(s.fires.length, 1, '同格只延長燃燒');
  G.ignite(s, 7, 3); a.x = 6.5;
  burn(s, G.BATTLE_SPEED - 1 / 60); assert.equal(a.hp, 8);
  burn(s, 1 / 60); assert.equal(a.hp, 7);
  for (const hp of [6,5,4]) { burn(s, G.BATTLE_SPEED); assert.equal(a.hp,hp); }
  assert.equal(s.fires.length, 0);
  assert.equal(s.stats.blocked, 0, '地板火焰從下方造成傷害');
  burn(s, 5); assert.equal(a.hp, 4);
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

test('同格擊退擊殺多隻分裂目標後仍完成命中，不重複攻擊新生小蟑螂', () => {
  const s=G.createState(); G.build(s,'push',6,3);
  const first=enemy(s,'splitter',1,5,2); enemy(s,'splitter',1,5.2,2); const survivor=enemy(s,'bug',10,5.3,2);
  G.resolveShot(s,{kind:'push',target:first.id,c:6,r:3});
  assert.equal(s.stats.split,2);assert.equal(s.buildings.length,1);
  assert.equal(survivor.hp,9);assert.ok(survivor.push.x>survivor.x);
  const babies=s.enemies.filter(e=>e.kind==='roach');
  assert.equal(babies.length,6);assert.ok(babies.every(e=>e.hp===2 && e.push===null));
});

test('盾蟲擋住上方擊退，數字及位置都不變', () => {
  const s = G.createState(), a = enemy(s, 'shield', 10, 6, 3);
  G.hit(s, a, { kind: 'push', c: 6, r: 1 });
  assert.equal(a.hp, 10); assert.equal(a.push, null); assert.equal(s.stats.blocked, 1);
});

test('分子砲從盾面命中上下盾蟲本體，每發只扣單一目標 38 血', () => {
  for (const [kind, r] of [['shield', 1], ['shield_down', 5]]) {
    const s = G.createState(), target = enemy(s, kind, 56, 6, 3);
    const neighbor = enemy(s, 'bug', 10, 6.1, 3), money = s.money;
    const shot = { kind: 'molecular', target: target.id, c: 6, r };
    assert.deepEqual(G.impactPoint(target, shot), { x: target.x, y: target.y });
    G.resolveShot(s, shot);
    assert.equal(target.hp, 18);
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

test('火焰塔一擊殺死剩一血小蟲，仍留下四秒火地板並傷害後續目標', () => {
  const s = G.createState(), a = enemy(s, 'bug', 1, 6, 3);
  G.resolveShot(s, { kind: 'flame', target: a.id, c: 6, r: 5 });
  assert.equal(a.dead, true); assert.equal(s.fires.length, 1);
  assert.equal(s.fires[0].life, G.TOOLS.flame.groundFireSeconds * G.BATTLE_SPEED);
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
  G.hit(s, a, source); assert.equal(a.hp, 97); assert.equal(a.push.length, 4); assert.equal(a.stun, 0);
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

test('連鎖電漿從實際命中的蟲彈射，按 46、15、5、1 衰減，不折返也不跨越三格空隙', () => {
  const s = G.createState();
  const targets = [1,3,5,7,9].map(x => enemy(s, 'shield', 50, x, 3));
  G.resolveShot(s, {kind: 'molecular', upgraded: true, c: 1, r: 1, target: targets[0].id});
  s.phase = 'running';
  targets.forEach(e => e.shock = 5);
  for (const [hop, expected] of [[0,[4,50,50,50,50]], [1,[4,35,50,50,50]], [2,[4,35,45,50,50]]]) {
    assert.deepEqual(targets.map(e => e.hp), expected);
    assert.equal(s.effects.find(arc => arc.kind === 'plasmaArc' && arc.hop === hop).damage, [15,5,1][hop]);
    advance(s, .3 * G.BATTLE_SPEED);
  }
  assert.deepEqual(targets.map(e => e.hp), [4,35,45,49,50]);
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
  a.y = 4; burn(s, .5 * G.BATTLE_SPEED); assert.equal(a.hp, 9);
  a.y = 6;
  for (const hp of [8,7,6,5,4,4]) { burn(s, G.BATTLE_SPEED); assert.equal(a.hp, hp); }
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

test('兩級投石機都會先燒蟲群即將經過的空格，地火依來源持續四或五秒', () => {
  for (const upgraded of [false,true]) {
    const s=G.createState(3); G.build(s,'flame',5,5);
    if (upgraded) G.upgrade(s,5,5);
    G.startWave(s,0,42); s.queue=[]; s.castle=null;
    stationary(s,'bug',2,5);
    for (const x of [8,9,9.4]) {
      const e=enemy(s,'bug',50,x,3); e.c=Math.ceil(x); e.next={c:e.c-1,r:3};
    }
    G.step(s,1/60);
    const shot=s.shots[0]; assert.deepEqual([shot.impactX,shot.impactY],[7,3]);
    assert.ok(s.enemies.every(e=>Math.round(e.x)!==7)); s.buildings=[];
    while(s.shots.length) G.step(s,1/60);
    const fire=s.fires[0]; assert.deepEqual([fire.c,fire.r],[7,3]);
    const remaining=fire.life;
    assert.ok(Math.abs(remaining+1/60-(upgraded?5:4)*G.BATTLE_SPEED)<1e-8);
    G.ignite(s,7,3,false,22,3);
    assert.equal(s.fires.length,1); assert.equal(s.fires[0].life,remaining);
  }
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
  assert.deepEqual([edge.hp,same.hp,far.hp,close.hp,next.hp,air.hp],[15,15,15,20,20,20]);
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
  const s = G.createState(), a = enemy(s, 'giant', 14, 4, 3);
  G.resolveShot(s, {kind:'flame', tower:1, upgraded:true, target:a.id, c:3, r:3});
  assert.equal(a.hp, 7); assert.equal(a.burnTicks, 5);
  G.ignite(s, 4, 3, false, 2);
  burn(s, G.BATTLE_SPEED);
  assert.equal(a.hp, 5);
  a.y = 5; burn(s, 5 * G.BATTLE_SPEED);
  assert.equal(a.hp, 0);
  assert.deepEqual(s.waveStats.damageByTower, {1:13,2:1});
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

test('冰凍每層緩速 10%、12%、14%、16%、18%、20%，普通與升級冰塔依各自的對空能力命中', () => {
  for (const weapon of ['frost','iceCannon']) for (const kind of ['bug','flyer']) {
    const distance = (stacks,upgraded) => {
      const s = G.createState(); s.phase = 'running';
      const a = enemy(s,kind,20,5,3);
      for (let i=0;i<stacks;i++) G.hit(s,a,{kind:weapon==='frost'?'frost':'pea',weapon,c:5,r:2,upgraded});
      advance(s, .5);
      return 5 - a.x;
    };
    const normal=distance(0,false);
    for (const [stacks,multiplier] of [1,.90,.88,.86,.84,.82,.80].entries()) for (const upgraded of [false,true]) {
      const expected=weapon==='iceCannon' ? [1,.88,.84,.80,0,0,0][stacks] : kind==='flyer' ? 1 : multiplier;
      assert.ok(Math.abs(distance(stacks,upgraded)/normal-expected)<1e-8);
    }
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
