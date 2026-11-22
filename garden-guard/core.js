(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Garden = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const COLS = 12, ROWS = 8;
  const BATTLE_SPEED = 1.5;
  const SIEGE_INTERVAL = 2 * BATTLE_SPEED;
  const SPAWN_INTERVAL = BATTLE_SPEED * 0.25;
  const ENEMY_HEALTH_MULTIPLIER = 2;
  const GOAL = { c: 0, r: 3 };
  const TOOLS = {
    pea: { name: '砲塔', targets: ['ground', 'air'], cost: 5, range: 3.1, damage: 1, rate: 1.55, effect: '單體傷害', hp: 5, color: '#4b8058' },
    cannon: { name: '大砲', targets: ['ground'], cost: 11, range: 2.8, damage: 2, rate: 1.2, radius: 1.25, effect: '範圍傷害', hp: 5, color: '#b68a43' },
    frost: { name: '寒冰石', targets: ['ground'], cost: 7, range: 2.65, damage: 0, rate: 0.9, piercesShield: true, slowDuration: 2.1, slowMultiplier: .7, effect: '穿盾靈氣，周圍 2.65 格附加冰凍', hp: 5, color: '#619aa9' },
    flame: { name: '火球投石機', targets: ['ground'], cost: 7, range: 5, minRange: 2, damage: 4, rate: 0.45, burnDamage: 1, burnSeconds: 3, burnRadius: 0.75, effect: '超過 2 格、最遠 5 格。火石 0.5 秒落地，打中整格並點燃地面', hp: 5, color: '#d37643' },
    pierce: { name: '雷射砲', targets: ['ground', 'air'], cost: 15, range: 6.2, damage: 1, rate: 0.8, piercesShield: true, stunSeconds: .1, effect: '直線穿盾，觸電停住 0.1 秒', hp: 5, color: '#4a8f88' },
    push: { name: '衝擊拳機', targets: ['ground', 'air'], cost: 9, range: 4, damage: 1, rate: 0.35, knockback: 3, effect: '同格沿路退 3 格・靠近城堡優先', hp: 5, color: '#7882af' },
    molecular: { name: '電漿塔', targets: ['ground', 'air'], cost: 18, range: 6.6, damage: 28, rate: 0.5, aimSeconds: 2, priority: 'highestHp', piercesShield: true, effect: '優先打血量最高的蟲，可穿盾', hp: 5, color: '#a16cab' },
    wall: { name: '石牆', cost: 1, hp: 4, color: '#a48a66' }
  };
  const weapons = { ...TOOLS, castle: { name: '城堡', targets: TOOLS.pea.targets, rate: TOOLS.pea.rate, range: 3, damage: 2, effect: '3 格內自動射箭', color: '#597581' } };
  const upgrades = {
    castle: { name: '雙弩城堡', effect: '同時射兩支箭，城堡多一顆心' },
    pea: { name: '雙管砲塔', rate: TOOLS.pea.rate * 2.5, effect: '雙管輪流射擊' },
    push: { name: '震盪拳機', damage: TOOLS.push.damage + 2, knockback: 4, effect: '同格一起擊退 4 格後暈 1 秒，每少退一格多暈 1 秒' },
    molecular: { name: '連鎖電漿塔', chainRange: 3, effect: '穿盾電漿彈射到 3 格內下一隻蟲，傷害 28 → 9 → 3 → 1' },
    cannon: { name: '巨砲', damage: 4, effect: '巨型砲彈命中後爆炸' },
    frost: { name: '霜凍石', rate: TOOLS.frost.rate * 1.2, damage: 1, effect: '穿盾靈氣，周圍 2.65 格附加冰凍' },
    flame: { name: '大火球投石機', damage: 6, afterburnSeconds: 5, effect: '巨型火石打中整格，離開火地後持續燃燒 5 秒' },
    pierce: { name: '光束砲', damage: 2, stunSeconds: .2, effect: '直線穿盾，觸電停住 0.2 秒' },
    wall: { name: '尖刺石牆', range: 1, targets: ['ground'], rate: .5, damage: 1, stunSeconds: .3, effect: '周圍八格一起出刺，暈眩 0.3 秒，盾牌只擋傷害' }
  };
  for (const kind of Object.keys(upgrades)) upgrades[kind] = { ...weapons[kind], ...upgrades[kind] };
  const toolFor = (kind, upgraded) => upgraded ? upgrades[kind] : weapons[kind];
  const peaCombinations = { cannon: 'tacticalAir', frost: 'iceCannon', flame: 'fireCannon', pierce: 'mapLaser', push: 'impactCannon', molecular: 'magCannon' };
  const cannonCombinations = { frost: 'snowCannon', flame: 'meteorTower', pierce: 'cometCannon', push: 'sonicCannon', molecular: 'crossCoil' };
  const frostCombinations = { flame: 'frostfireJet', pierce: 'cryoBeam', push: 'weatherStation', molecular: 'cryoPlasma' };
  const flameCombinations = { pierce:'heatRay', push:'fireStation', molecular:'moltenMortar' };
  const pierceCombinations = {push:'recoilRay',molecular:'disintegrationBeam'};
  const pushCombinations = {molecular:'gravityCannon'};
  const specialCombinations = { pea: peaCombinations, cannon: cannonCombinations, frost: frostCombinations, flame: flameCombinations, pierce:pierceCombinations, push:pushCombinations };
  const primaryWeapon = b => specialCombinations[b.kind]?.[b.fusionKind] ?? b.kind;
  function secondaryWeapon(b) {
    if (b.kind === 'pea' && b.fusionKind === 'cannon') return 'tacticalGround';
    return specialCombinations[b.kind] ? null : b.fusionKind;
  }
  const derive = (base, name, changes) => ({ ...weapons[base], delivery:base, name, ...changes });
  weapons.tacticalAir = derive('pea', '防空機砲', { rate: weapons.pea.rate * 1.2, targets: ['air'], range: TOOLS.pea.range + 1, effect: '射程 4.1 格，單發射擊' });
  weapons.tacticalGround = derive('cannon', '對地重砲', { rate: weapons.cannon.rate * 1.2, range: TOOLS.cannon.range + 1, effect: '射程 3.8 格，命中後爆炸' });
  weapons.iceCannon = derive('pea', '寒冰砲', { rate: weapons.pea.rate * 1.5, priority: 'unfrozen', effect: '優先打未冰凍的蟲，命中附加冰凍' });
  weapons.fireCannon = derive('pea', '火炮', { targets:['air'], rate:1.8, priority: 'unburned', range: TOOLS.flame.range, burnSeconds: TOOLS.flame.burnSeconds, effect: '射程 5 格，優先點燃尚未燃燒的飛蟲 3 秒' });
  weapons.mapLaser = derive('pierce', '雷管砲', { range: Math.hypot(COLS, ROWS), effect: '全地圖瞄準，直線穿盾，觸電停住 ' + weapons.pierce.stunSeconds + ' 秒' });
  weapons.impactCannon = { name:'衝擊塔', targets:TOOLS.pea.targets, range:2, rate:1/3, damage:1, knockback:1, stunSeconds:.4, color:'#48877f', effect:'震波向四周擴散 2 格，擊退 1 格後暈眩 0.4 秒' };
  weapons.magCannon = derive('molecular', '電磁砲', { damage: weapons.molecular.damage / 2, aimSeconds: weapons.molecular.aimSeconds / 2,
      effect: '優先打血量最高的蟲，可穿盾' });
  const fullRange = Math.hypot(COLS, ROWS);
  const cannonWeapons = {
    snowCannon: { name:'雪砲', targets:['ground'], range:fullRange, rate:.384, damage:0, damagePerCell:2, speed:2.5, knockback:1, burstRadius:1, color:'#458fa6', effect:'向同一直線上地面蟲最多的方向滾動，附加冰凍並沿球路擊退 1 格。碰到建築或地圖邊界時爆裂，半徑 1 格受當前一半傷害，最低 1 點' },
    meteorTower: { name:'隕石塔', targets:['ground'], range:fullRange, rate:TOOLS.flame.rate, damage:6, delay:1, burnSeconds:TOOLS.flame.burnSeconds, color:'#c5653f', effect:'全場召喚。1 秒後打中落點與上下左右共五格，點燃蟲與地面 3 秒' },
    cometCannon: { name:'流星砲', targets:['air'], range:TOOLS.pierce.range+1, rate:TOOLS.pierce.rate, damage:3, splashDamage:1, speed:5.5, radius:2, stunSeconds:.2, color:'#9868ac', effect:'射程 7.2 格，優先瞄準成群飛蟲。周圍 2 格的其他飛蟲各受 1 點，一起暈眩 0.2 秒' },
    sonicCannon: { name:'音波砲', targets:['ground','air'], range:3, rate:TOOLS.push.rate, damage:3, delay:1, stunSeconds:1, color:'#a7763a', effect:'鎖定 3 格內的位置，1 秒後打中十字五格並暈眩 1 秒' },
    crossCoil: { name:'十字電塔', targets:['ground'], range:1, rate:1.5, damage:6, stunSeconds:.1, piercesShield:true, color:'#6960bb', effect:'電擊上下左右相鄰四格，穿盾並暈眩 0.1 秒' }
  };
  Object.assign(weapons, cannonWeapons);
  const frostWeapons = {
    frostfireJet: { name:'冰火噴槍', targets:['ground'], range:1, damage:2, rate:2, piercesShield:true, burnSeconds:TOOLS.flame.burnSeconds, color:'#aa6358', effect:'噴向相鄰一格，整格附加冰凍與 3 秒燃燒' },
    cryoBeam: { ...TOOLS.pierce, name:'急凍光束槍', delivery:'pierce', damage:TOOLS.pierce.damage+1, color:'#4e9eb6', effect:'光束直線穿盾，附加冰凍，觸電停住 0.1 秒' },
    weatherStation: { name:'氣象儀', vortex:'ice', targets:['ground','air'], range:fullRange, rate:1/3, damage:2, radius:1, lifetime:8, speed:1.9, piercesShield:true, color:'#628ab0', effect:'冰龍捲遊走 8 秒，半徑 1 格內附加冰凍' },
    cryoPlasma: { ...TOOLS.molecular, name:'凍結電漿', delivery:'molecular', priority:'notFrozen', freezeSeconds:1.5, bossFreezeSeconds:.5, damage:7, rate:TOOLS.molecular.rate*2, aimSeconds:TOOLS.molecular.aimSeconds/2, flightSeconds:.18, color:'#647eb7', effect:'優先鎖定未冰封的蟲。電漿穿盾，冰封普通蟲 1.5 秒、蟲王 0.5 秒' }
  };
  Object.assign(weapons, frostWeapons);
  const flameWeapons = {
    heatRay: { ...TOOLS.pierce, name:'激光砲', delivery:'pierce', rate:.7, damage:TOOLS.pierce.damage+1, burnSeconds:TOOLS.flame.burnSeconds, color:'#be593c', effect:'熱射線直線穿盾，觸電 0.1 秒，燃燒 3 秒' },
    fireStation: { ...frostWeapons.weatherStation, vortex:'fire', rate:1/2.5, damage:1, lifetime:6, burnSeconds:TOOLS.flame.burnSeconds, color:'#ba6743', effect:'火龍捲遊走 6 秒，點燃半徑 1 格內的蟲 3 秒' },
    moltenMortar: { ...TOOLS.flame, name:'熱熔炸彈塔', delivery:'flame', minRange:0, range:TOOLS.molecular.range, damage:5, rate:.2, flightSeconds:1, fuseSeconds:2, blastDamage:15, color:'#a75443', effect:'1 秒落地，打中整格並點火。火石 2 秒後炸九宮格，各受 15 點傷害並留下火地' }
  };
  Object.assign(weapons, flameWeapons);
  const beamWeapons = {
    recoilRay: {...TOOLS.pierce, name:'反動砲', delivery:'pierce', knockback:1/3, stunSeconds:.2, color:'#5f9988', effect:'直線穿盾，沿路擊退 ⅓ 格，觸電 0.2 秒' },
    disintegrationBeam: {name:'分子崩解光束塔', targets:['ground','air'], range:4, rate:2, damage:1, maxDamage:5, priority:'highestHp', piercesShield:true, color:'#5686af', effect:'鎖定血量最高的蟲。連續命中每次加 1 傷，換目標後重新累積' },
    gravityCannon: {...TOOLS.molecular, name:'黑洞砲', delivery:'molecular', radius:2.5, damage:20, splashDamage:1, minPullPercent:10, stunSeconds:.2, aimSeconds:3.5, color:'#7261a7', effect:'鎖定蟲最多的地格。半徑 2.5 格內最近的一隻受主傷，其餘各受 1 點。往中心吸 10%～100% 的距離，停下後暈 0.2 秒' }
  };
  Object.assign(weapons,beamWeapons);
  const fusionUpgrades = {
    tacticalAir: {rate:weapons.tacticalAir.rate*1.2},
    tacticalGround: {rate:weapons.tacticalGround.rate*1.2},
    iceCannon: {rate:weapons.iceCannon.rate*1.4},
    fireCannon: {rate:weapons.fireCannon.rate*1.1, range:6, effect:'射程 6 格，優先點燃尚未燃燒的飛蟲 3 秒'},
    mapLaser: {rate:weapons.mapLaser.rate*1.1, stunSeconds:.2, effect:'全圖直線穿盾，觸電 0.2 秒'},
    impactCannon: {stunSeconds:.8, knockback:1.2, effect:'半徑 2 格震波，擊退 1.2 格後暈眩 0.8 秒'},
    magCannon: {chainRange:3, chainDamage:5, effect:'優先打高血量蟲，穿盾並連鎖兩次，傷害 14 → 5 → 1'},
    snowCannon: {damagePerCell:3},
    meteorTower: {effect:'落地打中中心與四方向各兩格，共九格，點燃蟲與地面 3 秒'},
    cometCannon: {damage:4,radius:2.5,stunSeconds:.3,effect:'優先瞄準成群飛蟲，周圍 2.5 格其餘飛蟲各受 1 點，一起暈眩 0.3 秒'},
    sonicCannon: {damage:weapons.sonicCannon.damage+1,effect:'鎖定 3 格內的位置，1 秒後打中九宮格並暈眩 1 秒'},
    crossCoil: {damage:8,stunSeconds:.2,effect:'電擊上下左右相鄰四格，穿盾並暈眩 0.2 秒'},
    frostfireJet: {rate:1/.35},
    cryoBeam: {beamWidth:1.7,stunSeconds:.2,effect:'光束加寬 70%，穿盾，附加冰凍與 0.2 秒觸電'},
    weatherStation: {radius:1.2,effect:'冰龍捲遊走 8 秒，對半徑 1.2 格內的蟲附加冰凍'},
    cryoPlasma: {damage:12,freezeSeconds:2,effect:'優先鎖定未結凍的蟲。穿盾，結凍普通蟲 2 秒、蟲王 0.5 秒'},
    heatRay: {beamWidth:1.7,effect:'熱射線加寬 70%，穿盾，觸電 0.1 秒並點燃 3 秒'},
    fireStation: {rate:.25,radius:1.5,damage:2,fireTrail:true,effect:'火龍捲遊走 6 秒，點燃半徑 1.5 格內的蟲，沿途留下 3 秒火地'},
    moltenMortar: {damage:15,blastDamage:20,effect:'落地打中整格並點火，2 秒後炸九宮格，各受 20 點並留下火地'},
    recoilRay: {stunSeconds:.4,effect:'直線穿盾，擊退 ⅓ 格後觸電 0.4 秒'},
    disintegrationBeam: {rate:1/.3},
    gravityCannon: {radius:3,effect:'鎖定蟲最多的地格，吸引半徑 3 格。最近一隻受主傷，其餘各受 1 點。往中心吸 10%～100%，停下後暈 0.2 秒'}
  };
  for (const [id, changes] of Object.entries(fusionUpgrades)) upgrades[id] = {...weapons[id], ...changes};
  for (const [id, spec] of Object.entries(upgrades)) spec.name = weapons[id].name + '+';
  // Each row covers only the later ingredients in this fixed order.
  const ingredients = ['pea', 'cannon', 'frost', 'flame', 'pierce', 'push', 'molecular'];
  const recipeRows = [
    ['戰術砲臺', '寒冰砲', '火炮', '雷管砲', '衝擊塔', '電磁砲'],
    Object.values(cannonCombinations).map(weapon => cannonWeapons[weapon].name),
    Object.values(frostCombinations).map(weapon => frostWeapons[weapon].name),
    Object.values(flameCombinations).map(weapon => flameWeapons[weapon].name),
    Object.values(pierceCombinations).map(weapon=>beamWeapons[weapon].name),
    Object.values(pushCombinations).map(weapon=>beamWeapons[weapon].name)
  ];
  function fusionRecipe(a, b) {
    const x = ingredients.indexOf(a), y = ingredients.indexOf(b);
    if (x < 0 || y < 0 || x === y) return null;
    const lo = Math.min(x, y), hi = Math.max(x, y);
    return { kind: ingredients[lo], fusionKind: ingredients[hi], name: recipeRows[lo][hi - lo - 1] };
  }
  const hammerLevels = [3, 5, 7, 9];
  const earnedHammers = clears => hammerLevels.filter(level => level <= clears).length;
  const buildingName = b => b.fusionKind ? fusionRecipe(b.kind, b.fusionKind).name + (b.upgraded ? '+' : '') : toolFor(b.kind, b.upgraded).name;
  const buildingHP = (kind, second) => second === 'wall' ? TOOLS[kind].hp + TOOLS.wall.hp : TOOLS[kind].hp;
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
    rhinoBoss: { name: '獨角仙王', hp: 125, artSpan: 80, speed: .40, skillSeconds: 10, color: '#58687e' },
    spiderBoss: { name: '織網蜘蛛王', hp: 140, artSpan: 86, speed: .34, skillSeconds: 5, color: '#7c5388' },
    stagBoss: { name: '巨顎鍬形蟲王', hp: 100, artSpan: 89, speed: .36, color: '#8a462e' },
    giant: { name: '金龜蟲', hp: 20, artSpan: 72, speed: 0.35, color: '#9e8266' },
    swift: { name: '長腳蟲', hp: 2, artSpan: 64, speed: 1.65, color: '#c8a14b' }
  };
  const health = (kind, hp) => Math.max(1, hp * ENEMY_HEALTH_MULTIPLIER - (kind === 'flyer' ? 1 : 0));
  for (const [kind, enemy] of Object.entries(ENEMIES)) enemy.hp = health(kind, enemy.hp);
  const group = (kind, hp, count) => ({ kind, hp: health(kind, hp), count });
  const BONUS_LEVEL = 10;
  // Ten campaign stages and an optional challenge. Test selection uses the same
  // total budget that a lossless campaign has earned by the start of that wave.
  const stage = (name, entries, reward, ...waves) => ({ name, entries, reward, rocks: [], water: [], waves });
  const LEVELS = [
    stage('攻擊方向', [3, 1, 6], 12, [group('shield', 3, 8), group('bug', 3, 16)]),
    stage('上下夾擊', [1, 3, 5], 14, [group('shield', 4, 10), group('shield_down', 4, 10), group('bug', 3, 12)]),
    stage('快速包圍', [1, 2, 3, 5, 6], 14, [group('shield', 4, 9), group('shield_down', 4, 9), group('swift', 4, 11), group('bug', 3, 11), group('stagBoss', 100, 1)]),
    stage('越過防線', [1, 2, 3, 5, 6], 16, [group('hopper', 6, 12), group('shield', 6, 8), group('shield_down', 5, 8), group('swift', 5, 10), group('bug', 3, 9)]),
    stage('空中來襲', [1, 2, 3, 5, 6], 18, [group('flyer', 4, 10), group('hopper', 7, 10), group('shield', 6, 8), group('shield_down', 6, 8), group('swift', 5, 10), group('bug', 3, 9)]),
    stage('分裂蟲群', [0, 1, 3, 4, 6, 7], 20, [group('splitter', 8, 10), group('flyer', 5, 10), group('hopper', 8, 10), group('shield', 7, 8), group('shield_down', 7, 7), group('swift', 6, 9), group('bug', 3, 9), group('rhinoBoss', 125, 1)]),
    stage('源源不絕', [0, 1, 3, 4, 6, 7], 24, [group('mother', 14, 3), group('splitter', 9, 9), group('flyer', 5, 12), group('hopper', 9, 10), group('shield', 8, 9), group('shield_down', 8, 9), group('swift', 7, 11), group('bug', 3, 9)]),
    stage('巨蟲壓境', [0, 1, 2, 3, 4, 5, 6, 7], 24, [group('giant', 38, 8), group('mother', 21, 4), group('splitter', 10, 11), group('flyer', 7, 16), group('hopper', 13, 11), group('shield', 11, 8), group('shield_down', 11, 8), group('swift', 10, 12), group('bug', 4, 10)]),
    stage('巨蟲浪潮', [0, 1, 2, 3, 4, 5, 6, 7], 36, [group('giant', 53, 11), group('mother', 27, 5), group('splitter', 12, 13), group('flyer', 9, 17), group('hopper', 16, 13), group('shield', 13, 9), group('shield_down', 13, 9), group('swift', 13, 14), group('bug', 5, 11)]),
    stage('最後防線', [0, 1, 2, 3, 4, 5, 6, 7], 24, [group('giant', 109, 16), group('mother', 45, 7), group('splitter', 24, 15), group('flyer', 13, 20), group('hopper', 26, 14), group('shield', 22, 11), group('shield_down', 22, 11), group('swift', 22, 18), group('bug', 6, 16), group('spiderBoss', 140, 1)]),
    stage('四面守園', [3], 0,
      [group('swift', 17, 12), group('mother', 43, 5), group('flyer', 13, 12), group('shield_down', 22, 12), group('stagBoss', 100, 1)],
      [group('giant', 109, 12), group('flyer', 13, 12), group('splitter', 24, 14), group('hopper', 25, 12), group('rhinoBoss', 125, 1)],
      [group('shield', 22, 12), group('giant', 109, 6), group('swift', 22, 12), group('mother', 40, 4), group('bug', 7, 18), group('spiderBoss', 140, 1)])
  ];
  const largestSpawnHp = Math.max(...LEVELS.flatMap(level => level.waves.flat().filter(g => !g.kind.endsWith('Boss')).map(g => g.hp)));
  const PREVIOUS_BUDGETS = [42, 52, 64, 76, 90, 104, 120, 136, 154, 182];
  const GENEROUS_BUDGETS = [60, 75, 93, 111, 132, 153, 177, 201, 228, 270];
  const SPAWN_GAPS = [.50, .39, .36, .34, .32, .31, .30, .28, .25, .22, .42];
  let budget = 48;
  for (const [i, level] of LEVELS.entries()) {
    level.hearts = 5;
    level.goal = i === BONUS_LEVEL ? { c: 5, r: 3 } : GOAL;
    level.money = budget; budget += level.reward;
    level.spawnInterval = BATTLE_SPEED * SPAWN_GAPS[i];
    level.edgeEntries = i < 7 ? [] : i === 7 ? [{ c: 8, r: 0, side: 'top' }, { c: 10, r: 7, side: 'bottom' }]
      : i === 8 ? [{ c: 7, r: 0, side: 'top' }, { c: 8, r: 7, side: 'bottom' }]
      : i === BONUS_LEVEL ? [{ c: 0, r: level.goal.r, side: 'left' }, { c: level.goal.c, r: 0, side: 'top' }, { c: level.goal.c, r: ROWS - 1, side: 'bottom' }]
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
  function isHome(level, c, r) {
    const goal = LEVELS[level].goal;
    return c === goal.c && r === goal.r;
  }
  function clearReservedBuildings(state) {
    const blocked = state.buildings.filter(b => isEntrance(state.level, b.c, b.r) || isHome(state.level, b.c, b.r));
    if (!blocked.length) return;
    for (const building of blocked) refundBuilding(state, building);
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
    const open = findPath(start, LEVELS[state.level].goal, buildings, solid);
    if (open) return { path: open, breaking: false };
    return { path: findPath(start, LEVELS[state.level].goal, buildings, solid, true) || [], breaking: true };
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
      level, wave: 0, phase: 'planning', upgradeItems: level, fusionHammers: earnedHammers(level), money: LEVELS[level].money, hearts: LEVELS[level].hearts, bonusUnlocked: level === BONUS_LEVEL, completed: false, lastReward: 0,
      castleUpgraded: false, castle: null, buildings: [], enemies: [], shots: [], effects: [], fires: [], vortices: [], queue: [], spawnClock: 0,
      time: 0, revision: 0, nextId: 1, rngState: stageSeed(level), undo: [], checkpoint: null,
      stats: { hits: 0, blocked: 0, defeated: 0, broken: 0, hatched: 0, split: 0, jumped: 0 }, waveStats: { hits: 0, blocked: 0, damageByTower: {} }
    };
  }
  function canBuild(state, kind, c, r) {
    if (state.phase !== 'planning') return '開始後不能建造';
    if (!TOOLS[kind] || !inside(c, r)) return '不能放這裡';
    if (isHome(state.level, c, r)) return '這裡是城堡';
    if (c === 0 || c === COLS - 1 || isEntrance(state.level, c, r) || terrain(state.level).has(key(c, r))) return '留給小蟲走';
    const existing = at(state, c, r);
    if (existing) {
      if (existing.fusionKind) return '這座已融合過了';
      if (kind === 'wall' || existing.kind === 'wall') return '石牆不能融合';
      if (!fusionRecipe(existing.kind, kind)) return '融合需要兩種不同建築';
      if (!state.fusionHammers) return '需要一把融合槌';
    }
    if (state.money < TOOLS[kind].cost) return '金幣不夠';
    return '';
  }
  function remember(state) {
    state.undo.push({ buildings: clone(state.buildings), money: state.money, upgradeItems: state.upgradeItems, fusionHammers: state.fusionHammers, castleUpgraded: state.castleUpgraded, hearts: state.hearts });
    if (state.undo.length > 100) state.undo.shift();
  }
  function refundFusionUpgrade(state, building) {
    if (building.upgraded) {
      building.upgraded = false;
      state.upgradeItems++;
    }
  }
  function build(state, kind, c, r) {
    const error = canBuild(state, kind, c, r);
    if (error) return { ok: false, error };
    remember(state);
    state.money -= TOOLS[kind].cost;
    const base = at(state, c, r);
    if (base) {
      const recipe = fusionRecipe(base.kind, kind);
      const missingHP = TOOLS[base.kind].hp - base.hp;
      refundFusionUpgrade(state, base);
      base.kind = recipe.kind;
      base.fusionKind = recipe.fusionKind;
      base.hp = buildingHP(base.kind, base.fusionKind) - missingHP;
      base.paidCost += TOOLS[kind].cost;
      state.fusionHammers--;
      state.revision++;
      return { ok: true, fused: true };
    }
    state.buildings.push({ id: state.nextId++, kind, c, r, upgraded: false, paidCost: TOOLS[kind].cost, hp: TOOLS[kind].hp, lastDamage: null, cooldown: 0, aim: null, angle: -25, flash: 0 });
    state.revision++;
    return { ok: true };
  }
  function upgrade(state, c, r) {
    if (state.phase !== 'planning') return { ok: false, error: '部署時才能升級' };
    const building = at(state, c, r);
    const home = isHome(state.level, c, r);
    if (!home && !building) return { ok: false, error: '點一座建築升級' };
    if (home ? state.castleUpgraded : building.upgraded) return { ok: false, error: '這座已經升級了' };
    if (state.upgradeItems < 1) return { ok: false, error: '過關可獲得升級水晶' };
    remember(state);
    state.upgradeItems--;
    if (home) { state.castleUpgraded = true; state.hearts++; }
    else building.upgraded = true;
    state.revision++;
    return { ok: true };
  }
  function downgrade(state, c, r) {
    if (state.phase !== 'planning') return { ok: false, error: '部署時才能取消升級' };
    const home = isHome(state.level, c, r), b = at(state, c, r);
    if (!(home ? state.castleUpgraded : b?.upgraded)) return { ok: false, error: '建築尚未升級' };
    remember(state);
    state.upgradeItems++;
    if (home) {
      state.castleUpgraded = false;
      state.hearts = Math.min(state.hearts, LEVELS[state.level].hearts);
    } else b.upgraded = false;
    state.revision++;
    return { ok: true };
  }
  function refundBuilding(state, building) {
    state.money += building.paidCost;
    if (building.fusionKind) state.fusionHammers++;
    if (building.upgraded) state.upgradeItems++;
  }
  function remove(state, c, r) {
    if (state.phase !== 'planning') return { ok: false, error: '開始後不能移除' };
    const building = at(state, c, r);
    if (isHome(state.level, c, r) && state.castleUpgraded) {
      return downgrade(state, c, r);
    }
    if (!building) return { ok: false, error: '點選要移走的物品' };
    remember(state);
    refundBuilding(state, building);
    state.buildings = state.buildings.filter(b => b.id !== building.id);
    state.revision++;
    return { ok: true };
  }
  function undo(state) {
    if (state.phase !== 'planning' || !state.undo.length) return false;
    const previous = state.undo.pop();
    state.castleUpgraded = previous.castleUpgraded; state.hearts = previous.hearts;
    state.fusionHammers = previous.fusionHammers;
    state.buildings = previous.buildings; state.money = previous.money; state.upgradeItems = previous.upgradeItems; state.revision++;
    return true;
  }
  function snapshot(state) {
    return { version: 20, fusionHammers: state.fusionHammers, castleUpgraded: state.castleUpgraded, lastReward: state.lastReward, upgradeItems: state.upgradeItems, bonusUnlocked: state.bonusUnlocked, level: state.level, wave: 0, completed: state.completed, money: state.money, hearts: state.hearts, rngState: state.rngState,
      buildings: state.buildings.map(({ secondary, ...building }) => clone(building)), stats: clone(state.stats) };
  }
  function restore(data) {
    if (!data || !Number.isInteger(data.version) || data.version < 1 || data.version > 20 || !Number.isInteger(data.level) || !LEVELS[data.level]) return null;
    if (data.level === BONUS_LEVEL && (data.version < 11 || data.bonusUnlocked !== true)) return null;
    if (data.version < 6 && data.level > 2) return null;
    if (!Number.isInteger(data.wave) || data.wave < 0 || data.wave >= (data.version < 6 ? 4 : 1)) return null;
    if (data.version >= 6 && (typeof data.completed !== 'boolean' || (data.completed && data.level < BONUS_LEVEL - 1))) return null;
    if (data.version >= 16 && typeof data.castleUpgraded !== 'boolean') return null;
    const castleUpgraded = data.version >= 16 && data.castleUpgraded;
    const maxHearts = LEVELS[data.level].hearts + Number(castleUpgraded);
    if (!Number.isInteger(data.money) || data.money < 0 || data.money > 1000 || !Number.isInteger(data.hearts) || data.hearts < 1 || data.hearts > maxHearts) return null;
    if (!Array.isArray(data.buildings) || data.buildings.length > COLS * ROWS) return null;
    const state = createState(data.level), used = new Set(), solid = terrain(data.level);
    state.castleUpgraded = castleUpgraded;
    const earned = data.level + Number(data.completed === true);
    state.upgradeItems = data.version >= 12 ? data.upgradeItems : earned;
    if (!Number.isInteger(state.upgradeItems) || state.upgradeItems < 0 || state.upgradeItems > earned) return null;
    for (const saved of data.buildings) {
      const b = saved?.kind === 'rapid' ? { ...saved, kind: 'cannon' } : saved;
      if (!b || !Object.hasOwn(TOOLS, b.kind) || !inside(b.c, b.r) || b.c === 0 || b.c === COLS - 1 || solid.has(key(b.c, b.r)) || used.has(key(b.c, b.r))) return null;
      const oldBonusMap = data.level === BONUS_LEVEL && data.version < 14;
      if (!oldBonusMap && data.version >= 10 && (isEntrance(data.level, b.c, b.r) || isHome(data.level, b.c, b.r))) return null;
      const second = data.version >= 17 ? b.fusionKind : undefined;
      const legacyWall = data.version === 17 && b.kind !== 'wall' && second === 'wall';
      if (second !== undefined && !legacyWall && fusionRecipe(b.kind, second)?.fusionKind !== second) return null;
      if (!Number.isInteger(b.hp) || b.hp < 1 || b.hp > buildingHP(b.kind, second)) return null;
      // Price changes never create refund profit or reduce an old purchase's
      // refund. Version 8 saves each building's actual purchase price.
      const paidCost = data.version < 8 ? PREVIOUS_PRICES[b.kind] : b.paidCost;
      const prices = kind => [PREVIOUS_PRICES[kind], VERSION9_PRICES[kind], TOOLS[kind].cost, ...(kind === 'molecular' ? [22] : [])];
      const allowed = second ? [...prices(b.kind).map(p => p + TOOLS[second].cost), ...prices(second).map(p => p + TOOLS[b.kind].cost)] : prices(b.kind);
      if (!allowed.includes(paidCost)) return null;
      if (data.version >= 12 && typeof b.upgraded !== 'boolean') return null;
      if (data.version === 19 && second && b.upgraded) return null;
      const lastDamage = data.version >= 13 ? b.lastDamage ?? null : null;
      if (lastDamage !== null && (!Number.isSafeInteger(lastDamage) || lastDamage < 0)) return null;
      used.add(key(b.c, b.r));
      state.buildings.push({ id: state.nextId++, kind: b.kind, ...(second ? { fusionKind: second } : {}), c: b.c, r: b.r, upgraded: data.version >= 12 && b.upgraded, paidCost, hp: b.hp, lastDamage, cooldown: 0, aim: null, angle: -25, flash: 0 });
    }
    state.fusionHammers = earnedHammers(earned) - state.buildings.filter(b => b.fusionKind).length;
    if (state.fusionHammers < 0 || (data.version >= 17 && state.fusionHammers !== data.fusionHammers)) return null;
    const available = earned - Number(castleUpgraded) - state.buildings.filter(b => b.upgraded).length;
    if (state.upgradeItems > available || (data.version >= 15 && state.upgradeItems !== available)) return null;
    // Older mid-campaign starts and destroyed towers could leave crystals unaccounted for.
    state.upgradeItems = available;
    if (data.completed) state.lastReward = LEVELS[data.level].reward;
    else if (data.level > 0 && data.lastReward === LEVELS[data.level - 1].reward) state.lastReward = data.lastReward;
    // A loaded deployment starts with a full home, including older saves.
    // Completed campaigns keep their final health for the result screen.
    state.money = data.money; state.hearts = data.version >= 6 && data.completed ? data.hearts : maxHearts;
    state.bonusUnlocked = (data.version >= 11 && data.bonusUnlocked === true) || (data.version >= 6 && data.completed === true);
    // Preserve old boards and funds; old sub-batches now restart as one stage.
    if (data.version < 5) state.money = Math.min(1000, state.money + [60, 80, 100][state.level] - [22, 25, 28][state.level]);
    // Normalize earlier economies, then apply the lower budget exactly once.
    // Existing purchases remain intact, with their original refund values.
    if (data.version === 6) state.money = Math.min(1000, state.money + GENEROUS_BUDGETS[state.level] - PREVIOUS_BUDGETS[state.level] + (data.completed ? 10 : 0));
    if (data.version < 9) state.money = Math.max(0, state.money - GENEROUS_BUDGETS[state.level] + LEVELS[state.level].money - (data.completed ? 30 - LEVELS[state.level].reward : 0));
    if (data.version === 17) {
      for (const b of state.buildings.filter(b => b.fusionKind === 'wall')) {
        delete b.fusionKind;
        b.hp = Math.min(b.hp, TOOLS[b.kind].hp);
        b.paidCost -= TOOLS.wall.cost;
        state.money += TOOLS.wall.cost;
        state.fusionHammers++;
      }
    }
    // Convert after validating the old crystal balance and retiring wall recipes.
    if (data.version === 17 || data.version === 18) {
      for (const b of state.buildings) if (b.fusionKind) refundFusionUpgrade(state, b);
    }
    clearReservedBuildings(state);
    if (data.version >= 6 && data.completed) { state.completed = true; state.phase = 'won'; }
    if (Number.isInteger(data.rngState) && data.rngState > 0 && data.rngState <= 0xffffffff) state.rngState = data.rngState;
    if (data.stats) for (const k of Object.keys(state.stats)) if (Number.isInteger(data.stats[k]) && data.stats[k] >= 0) state.stats[k] = data.stats[k];
    return state;
  }
  // One permutation per assignment of three distinct bosses to four gates.
  const bossGates = [];
  for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) for (let c = 0; c < 4; c++) {
    if (a !== b && a !== c && b !== c) bossGates.push([a, b, c]);
  }
  function spawnQueue(level, firstWave = 0, bossPattern = 0) {
    const queue = [];
    let index = 0;
    const entries = entrances(level);
    for (let wave = firstWave; wave < LEVELS[level].waves.length; wave++) {
      const groups = LEVELS[level].waves[wave];
      // Late waves send small mixed squads through the same rotating entrances.
      const boss = groups.find(g => g.kind.endsWith('Boss'));
      const squads = boss ? groups.filter(g => g !== boss) : groups;
      const lineup = [];
      const largestGroup = Math.max(...squads.map(g => g.count));
      const packSize = level === BONUS_LEVEL ? 2 : level === 9 ? 3 : level === 8 ? 6 : largestGroup;
      for (let offset = 0; offset < largestGroup; offset += packSize) {
        for (const g of squads) {
          const end = Math.min(g.count, offset + packSize);
          for (let i = offset; i < end; i++) lineup.push(g);
        }
      }
      // Let the final fifth of the swarm follow the boss through the gates.
      if (boss) lineup.splice(Math.floor(lineup.length * 4 / 5), 0, boss);
      for (const g of lineup) {
        const gate = g === boss && level === BONUS_LEVEL ? bossGates[bossPattern][wave] : index++ % entries.length;
        const entry = entries[gate];
        queue.push({ kind: g.kind, hp: g.hp, wave, row: entry.r, position: { x: entry.c, y: entry.r } });
      }
    }
    return queue;
  }
  function startWave(state, bossPattern, webSeed) {
    if (state.phase !== 'planning') return false;
    // Starting is explicit; no future stage is queued during deployment.
    state.checkpoint = snapshot(state);
    state.checkpoint.lastReward = 0;
    state.undo = []; state.spawnClock = SPAWN_INTERVAL;
    state.fires = []; state.effects = []; state.shots = []; state.vortices = []; state.lastReward = 0;
    state.waveStats = { hits: 0, blocked: 0, damageByTower: {} };
    state.castle = { kind: 'castle', id: 'castle', upgraded: state.castleUpgraded, ...LEVELS[state.level].goal, cooldown: 0, flash: 0, angle: 0 };
    state.bossPattern = state.level === BONUS_LEVEL ? (Number.isInteger(bossPattern) && bossPattern >= 0 && bossPattern < 24 ? bossPattern : Math.floor(Math.random() * 24)) : 0;
    state.webRng = { rngState: (webSeed ?? Math.floor(Math.random() * 4294967296)) >>> 0 || 1 };
    state.weatherRng = { rngState: (state.webRng.rngState ^ 0x61c88647) >>> 0 || 1 };
    state.gravityRng = { rngState: (state.webRng.rngState ^ 0x8acb17ed) >>> 0 || 1 };
    state.queue = spawnQueue(state.level, state.wave, state.bossPattern);
    state.phase = 'running';
    for (const b of state.buildings) {
      const weapon = primaryWeapon(b), tool = toolFor(weapon,b.upgraded);
      b.cooldown = tool.vortex || weapon === 'impactCannon' ? BATTLE_SPEED / tool.rate : 0;
      b.flash = 0; b.aim = null; b.webUntil = 0;
      const second = secondaryWeapon(b);
      if (second) b.secondary = { kind: second, id: b.id, c: b.c, r: b.r, upgraded: b.upgraded, cooldown: 0, angle: -25, flash: 0, aim: null };
    }
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
    const enemy = { id: state.nextId++, kind, hp, maxHp: hp, x, y, facing: 0,
      c, r, next: Math.hypot(x - c, y - r) > 1e-9 ? { c, r } : null, slow: 0, iceStacks: 0, flash: 0, shieldFlash: 0, burnCooldown: 0, burnTicks: 0, burnClock: 0, stun: 0, spikeStun: 0, shock: 0,
      push: null, leap: null, jumped: false, broodClock: BATTLE_SPEED * 3, bornAt: state.time, attackClock: 0.65, attackId: null, dead: false };
    if (kind.endsWith('Boss')) enemy.siegeClock = SIEGE_INTERVAL;
    if (kind === 'stagBoss') { enemy.raided = false; enemy.preyId = null; }
    if (ENEMIES[kind].skillSeconds) enemy.skillAt = state.time + ENEMIES[kind].skillSeconds * BATTLE_SPEED;
    state.enemies.push(enemy);
    return enemy;
  }
  function shieldBlocks(enemy, source) {
    // 'Above' is world/screen vertical, independent of the bug's movement heading.
    const side = ENEMIES[enemy.kind]?.shield;
    if (!side || toolFor(source.weapon ?? source.kind, source.upgraded)?.piercesShield) return false;
    return side === 'up' ? source.r < enemy.y - 0.001 : side === 'down' ? source.r > enemy.y + 0.001 : false;
  }
  // Normalize each drawing's natural span, including legs and armor, to a
  // 34–62 unit silhouette on a 64-unit tile. The boss still occupies a single cell.
  function enemyArtScale(kind, maxHp = ENEMIES[kind].hp) {
    const hp = Math.max(1, Math.min(maxHp, largestSpawnHp));
    if (kind.endsWith('Boss')) return 79 / ENEMIES[kind].artSpan;
    return (34 + 28 * Math.log(hp) / Math.log(largestSpawnHp)) / ENEMIES[kind].artSpan;
  }
  function impactPoint(enemy, source) {
    if (!shieldBlocks(enemy, source)) return { x: enemy.x, y: enemy.y };
    const side = ENEMIES[enemy.kind].shield === 'down' ? 1 : -1;
    const dx = Math.max(-0.44, Math.min(0.44, (source.c - enemy.x) / Math.max(0.1, Math.abs(enemy.y - source.r)) * 0.38));
    const scale = enemyArtScale(enemy.kind, enemy.maxHp);
    return { x: enemy.x + dx * scale, y: enemy.y + side * scale * (0.15 + 0.34 * Math.sqrt(1 - (dx / 0.47) ** 2)) };
  }
  const RECOIL_SECONDS = .38;
  const EFFECT_SECONDS = { home: .95, block: .6, split: .9, hatch: .9, leap: .9, frost: .85, blast: .64, laser: .43, webHit: .36, plasmaArc: .98, spikeHit: .32, spark: .31, flare: .54, molecular: .65 };
  function effect(state, kind, x, y, details = {}) {
    const duration = details.duration ?? EFFECT_SECONDS[kind] ?? 0.45;
    state.effects.push({ kind, x, y, life: duration, duration, ...details });
  }
  function canTarget(kind, enemy, upgraded = false) {
    const air = !!ENEMIES[enemy.kind]?.airborne || !!enemy.leap;
    return !enemy.dead && !!toolFor(kind, upgraded)?.targets?.includes(air ? 'air' : 'ground');
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
        shotKind: incoming.kind, weapon: incoming.weapon, upgraded: incoming.upgraded, enemyId: enemy.id
      });
      return true;
    }
    return false;
  }
  function applyBurn(state, enemy, seconds, owner) {
    const alreadyBurning = enemy.burnTicks > 0;
    enemy.burnTicks = enemy.burnDuration = seconds;
    enemy.burnClock = BATTLE_SPEED;
    enemy.burnAppliedAt = state.time;
    enemy.burnOwner = owner;
    if (alreadyBurning) {
      damageEnemy(state, enemy, 1, owner);
      effect(state, 'burn', enemy.x, enemy.y);
    }
  }
  function freezeEnemy(state, enemy, seconds) {
    if (!(enemy.frozenUntil > state.time)) enemy.frozenAt = state.time;
    enemy.frozenUntil = Math.max(enemy.frozenUntil || 0, state.time + seconds * BATTLE_SPEED);
    enemy.iceStacks = 0;
    enemy.slow = 0;
  }
  function applyIce(state, enemy) {
    if (enemy.dead || enemy.frozenUntil > state.time) return;
    enemy.slow = TOOLS.frost.slowDuration;
    if (++enemy.iceStacks >= 5) freezeEnemy(state,enemy,1);
  }
  function hit(state, enemy, source, options = {}) {
    if (!enemy || enemy.dead) return false;
    const weapon = source.weapon ?? source.kind;
    if (toolFor(weapon, source.upgraded)?.targets && !canTarget(weapon, enemy, source.upgraded)) return false;
    if (options.ground && (enemy.kind === 'flyer' || enemy.leap)) return false;
    const incoming = options.ground ? { ...source, c: enemy.x, r: enemy.y + 1 } : source;
    if (source.kind === 'frost') {
      applyIce(state,enemy);
      if (source.upgraded) damageEnemy(state, enemy, toolFor('frost', true).damage, source.tower);
      return true;
    }
    const tool = toolFor(weapon, source.upgraded);
    if (source.kind === 'wall' && source.upgraded) {
      effect(state, 'spikeHit', enemy.x, enemy.y, { lift: enemyLift(enemy, state.time) });
      enemy.spikeStun = Math.max(enemy.spikeStun, tool.stunSeconds * BATTLE_SPEED);
    }
    if (blockHit(state, enemy, incoming)) return false;
    damageEnemy(state, enemy, options.damage ?? tool?.damage ?? 1, source.tower);
    if (enemy.dead) return true;
    if (!options.burst && ['iceCannon','snowCannon','cryoBeam','frostfireJet'].includes(weapon)) applyIce(state,enemy);
    if (['fireCannon','meteorTower','frostfireJet','heatRay'].includes(weapon)) applyBurn(state,enemy,tool.burnSeconds,source.tower);
    else if (weapon === 'flame' && source.upgraded) applyBurn(state,enemy,tool.afterburnSeconds,source.emberOwner ?? source.tower);
    else if (options.ground && enemy.burnTicks) applyBurn(state,enemy,enemy.burnDuration ?? tool.burnSeconds,source.tower);
    if (enemy.dead) return true;
    if (weapon === 'impactCannon' || weapon === 'recoilRay') {
      if (enemy.leap) {
        // Resolve from a walkable tile once the flight has finished.
        enemy.leap.landingPush = (enemy.leap.landingPush ?? 0) + tool.knockback;
      } else {
        const pending = enemy.push;
        const remaining = pending ? pending.length * (1 - pending.age / pending.duration) ** 2 : 0;
        pushEnemy(state, enemy, tool.knockback + remaining, true);
      }
      stopAfterPush(enemy, weapon === 'recoilRay' ? 'shock' : 'stun', tool.stunSeconds * BATTLE_SPEED);
    }
    if (source.kind === 'push') {
      const limit = toolFor('push', source.upgraded).knockback;
      if (enemy.leap && source.upgraded) enemy.leap.punchLimit = limit;
      else if (!enemy.leap) {
        const distance = pushEnemy(state, enemy, limit);
        if (source.upgraded) stopAfterPush(enemy,'stun',(1 + Math.floor(limit - distance + 1e-8)) * BATTLE_SPEED);
      }
    }
    if (source.kind === 'pierce' && weapon !== 'recoilRay') enemy.shock = Math.max(enemy.shock, tool.stunSeconds * BATTLE_SPEED);
    if (weapon === 'sonicCannon') enemy.stun = Math.max(enemy.stun, tool.stunSeconds * BATTLE_SPEED);
    if (weapon === 'crossCoil') enemy.shock = Math.max(enemy.shock, tool.stunSeconds * BATTLE_SPEED);
    if (weapon === 'cryoPlasma') {
      freezeEnemy(state,enemy,enemy.kind.endsWith('Boss') ? tool.bossFreezeSeconds : tool.freezeSeconds);
    }
    return true;
  }
  function damageEnemy(state, enemy, damage, tower) {
    if (tower != null) {
      const totals = state.waveStats.damageByTower;
      totals[tower] = (totals[tower] ?? 0) + Math.min(enemy.hp, damage);
    }
    enemy.hp = Math.max(0, enemy.hp - damage); enemy.flash = 0.18;
    state.stats.hits++; state.waveStats.hits++;
    if (enemy.hp <= 0) killEnemy(state, enemy);
    if (!enemy.dead && enemy.kind === 'hopper' && !enemy.jumped) startLeap(state, enemy);
  }
  function finishDamage(state, buildings) {
    for (const b of buildings) b.lastDamage = state.waveStats.damageByTower[b.id] ?? 0;
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
      effect(state, 'split', enemy.x, enemy.y, { maxHp: enemy.maxHp, facing: enemy.facing, offspring: hatch(state, enemy, 3) });
    } else effect(state, 'pop', enemy.x, enemy.y);
  }
  function jumpLanding(state, enemy) {
    const c0 = Math.round(enemy.x), r0 = Math.round(enemy.y), candidates = [];
    const goal = LEVELS[state.level].goal;
    const dx = goal.c - c0, dy = goal.r - r0;
    const vertical = state.level === BONUS_LEVEL && Math.abs(dy) > Math.abs(dx);
    const direction = state.level === BONUS_LEVEL ? Math.sign(vertical ? dy : dx) : -1;
    for (let forward = 1; direction && forward <= 2; forward++) for (let side = -2; side <= 2; side++) {
      const c = c0 + (vertical ? side : forward * direction), r = r0 + (vertical ? forward * direction : side);
      if (!freePoint(state, c, r)) continue;
      const plan = travelRoute(state, c, r);
      if (plan.path.length) candidates.push({ c, r, forward, side, breaking: plan.breaking, distance: plan.path.length - 1 });
    }
    candidates.sort((a, b) => Number(a.breaking) - Number(b.breaking) || a.distance - b.distance || b.forward - a.forward || Math.abs(a.side) - Math.abs(b.side) || a.side - b.side);
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
  function stopAfterPush(enemy, kind, duration) {
    if (enemy.push || enemy.leap || enemy.pull) {
      const pending = enemy.landingStop ??= {stun:0,shock:0};
      pending[kind] = Math.max(pending[kind],duration);
    } else enemy[kind] = Math.max(enemy[kind],duration);
  }
  function finishLandingStop(enemy) {
    if (!enemy.landingStop || enemy.push || enemy.pull || enemy.leap) return;
    enemy.shock=Math.max(enemy.shock,enemy.landingStop.shock);
    enemy.stun=Math.max(enemy.stun,enemy.landingStop.stun);
    enemy.landingStop=null;
  }
  function pushEnemy(state, enemy, limit = TOOLS.push.knockback, keepFractionalLanding = false) {
    const goal = LEVELS[state.level].goal;
    const solid = terrain(state.level);
    const flying = ENEMIES[enemy.kind].airborne;
    const blocked = new Set(state.buildings.map(b => key(b.c, b.r)));
    const free = (c, r) => inside(c, r) && (flying || (!solid.has(key(c, r)) && !blocked.has(key(c, r))));
    const directions = [[1, 0], [0, -1], [0, 1], [-1, 0]];
    // Distance to home follows the same open paths as normal ground movement.
    function distances(allowBreak) {
      const field = new Map([[key(goal.c, goal.r), 0]]), queue = [goal];
      for (let i = 0; i < queue.length; i++) for (const [dc, dr] of directions) {
        const c = queue[i].c + dc, r = queue[i].r + dr, k = key(c, r);
        if (!inside(c, r) || solid.has(k) || (!allowBreak && blocked.has(k)) || field.has(k)) continue;
        field.set(k, field.get(key(queue[i].c, queue[i].r)) + 1); queue.push({ c, r });
      }
      return field;
    }
    const origin = { x: enemy.x, y: enemy.y };
    const anchors = [];
    for (const c of new Set([Math.floor(enemy.x), Math.ceil(enemy.x)])) for (const r of new Set([Math.floor(enemy.y), Math.ceil(enemy.y)])) {
      if (!free(c, r)) continue;
      const length = Math.hypot(c - enemy.x, r - enemy.y);
      const samples = Math.max(1, Math.ceil(length * 20));
      if (Array.from({ length: samples }, (_, i) => (i + 1) / samples).some(t => !free(Math.round(enemy.x + (c - enemy.x) * t), Math.round(enemy.y + (r - enemy.y) * t)))) continue;
      anchors.push({ c, r, length, points: length > 1e-9 ? [origin, { x: c, y: r }] : [origin] });
    }
    if (!anchors.length) return 0;
    let field = flying ? null : distances(false);
    // An entirely enclosed group will eventually break out. Its retreat still
    // uses free cells, with the breakable-home distance as a finite fallback.
    if (field && anchors.every(a => !field.has(key(a.c, a.r)))) field = distances(true);
    const scoreCell = (c, r) => flying ? Math.hypot(c - goal.c, r - goal.r) : field.get(key(c, r));
    const approachCost = a => (scoreCell(a.c, a.r) ?? Infinity) + a.length;
    const approach = anchors.reduce((best, a) => approachCost(a) < approachCost(best) ? a : best);
    const initialScore = flying && keepFractionalLanding ? Math.hypot(enemy.x - goal.c, enemy.y - goal.r) : approachCost(approach);
    let best = null;
    const consider = (points, length, score, resume = null) => {
      if (!Number.isFinite(score) || score <= initialScore + 1e-9 || length < 0.01) return;
      const last = points[points.length - 1];
      if (!best || score > best.score + 1e-9 || (Math.abs(score - best.score) < 1e-9 && last.x > best.x + 1e-9)) best = { points, length, score, x: last.x, y: last.y, resume };
    };
    // A short knockback can end before the first grid centre.
    const queue = [], visited = new Map();
    for (const anchor of anchors) {
      if (anchor.length <= limit) {
        queue.push(anchor);
      } else {
        const t = limit / anchor.length;
        const x = enemy.x + (anchor.c - enemy.x) * t, y = enemy.y + (anchor.r - enemy.y) * t;
        const score = flying ? Math.hypot(x - goal.c, y - goal.r) : initialScore + (scoreCell(anchor.c, anchor.r) - initialScore) * t;
        consider([origin, { x, y }], limit, score, { c: approach.c, r: approach.r });
      }
    }
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
        const score = flying ? Math.hypot(x - goal.c, y - goal.r) : scoreCell(current.c, current.r) * (1 - travel) + scoreCell(c, r) * travel;
        consider(points, length, score, travel < 1 ? { c: current.c, r: current.r } : null);
        if (travel === 1) queue.push({ c, r, length, points });
      }
    }
    if (!best) return 0;
    enemy.push = { fromX: enemy.x, fromY: enemy.y, x: best.x, y: best.y, points: best.points, length: best.length, resume: keepFractionalLanding ? best.resume : null, age: 0, duration: 0.3 };
    enemy.next = null; enemy.attackId = null; enemy.attackClock = 0.65;
    return best.length;
  }
  function ignite(state, x, y, upgraded = false, tower) {
    const c = Math.round(x), r = Math.round(y), tool = TOOLS.flame;
    const existing = state.fires.find(f => f.c === c && f.r === r);
    if (existing) {
      existing.life = tool.burnSeconds * BATTLE_SPEED;
      existing.tower = tower;
      if (upgraded) { existing.emberLife = existing.life; existing.emberOwner = tower; }
      return;
    }
    state.fires.push({ id: state.nextId++, c, r, tower, emberOwner: upgraded ? tower : null, bornAt: state.time, emberLife: upgraded ? tool.burnSeconds * BATTLE_SPEED : 0, life: tool.burnSeconds * BATTLE_SPEED, clock: BATTLE_SPEED });
  }
  function updateFires(state, dt, frameEnd) {
    if (!state.fires.length && !state.enemies.some(e => e.burnCooldown > 0 || e.burnTicks)) return;
    for (const enemy of state.enemies) enemy.burnCooldown = Math.max(0, enemy.burnCooldown - dt);
    const emberFires = state.fires.filter(f => f.emberLife > 1e-9);
    const touchingEmber = enemy => canTarget('flame', enemy) && emberFires.find(f => Math.hypot(enemy.x - f.c, enemy.y - f.r) <= TOOLS.flame.burnRadius);
    for (const fire of state.fires) {
      fire.life -= dt; fire.clock -= dt;
      if (fire.clock <= 1e-9) {
        fire.clock += BATTLE_SPEED;
        for (const enemy of [...state.enemies]) {
          if (enemy.dead || enemy.burnCooldown > 1e-9 || Math.hypot(enemy.x - fire.c, enemy.y - fire.r) > TOOLS.flame.burnRadius) continue;
          // Ground fire reaches the underside; overlapping fires never stack damage.
          const ember = fire.emberLife > 1e-9 ? fire : touchingEmber(enemy);
          const damaged = hit(state, enemy, { kind: 'flame', tower: fire.tower, upgraded: !!ember, emberOwner: ember?.emberOwner, c: fire.c, r: fire.r }, { ground: true, damage: TOOLS.flame.burnDamage });
          enemy.burnCooldown = BATTLE_SPEED;
          if (damaged) effect(state, 'burn', enemy.x, enemy.y);
        }
      }
    }
    for (const enemy of state.enemies) {
      if (!enemy.burnTicks || enemy.dead) continue;
      if (touchingEmber(enemy)) { enemy.burnTicks = upgrades.flame.afterburnSeconds; enemy.burnClock = BATTLE_SPEED; continue; }
      if (frameEnd != null && enemy.burnAppliedAt === frameEnd) continue;
      enemy.burnClock -= dt;
      if (enemy.burnClock <= 1e-9) {
        enemy.burnClock += BATTLE_SPEED; enemy.burnTicks--;
        if (enemy.burnCooldown <= 1e-9) {
          damageEnemy(state, enemy, 1, enemy.burnOwner);
          effect(state, 'burn', enemy.x, enemy.y);
        }
      }
    }
    for (const fire of state.fires) fire.emberLife = Math.max(0, fire.emberLife - dt);
    state.fires = state.fires.filter(f => f.life > 1e-9);
  }
  function frostAura(state, source) {
    const tool = TOOLS.frost;
    const nearby = state.enemies.filter(e => canTarget('frost', e) && Math.hypot(e.x - source.c, e.y - source.r) <= tool.range);
    effect(state, 'frost', source.c, source.r, { radius: tool.range, upgraded: source.upgraded });
    for (const enemy of nearby) hit(state, enemy, source);
  }
  function fireLaser(state, source) {
    const angle = source.angle * Math.PI / 180, ux = Math.cos(angle), uy = Math.sin(angle);
    const tool = toolFor(source.weapon ?? source.kind, source.upgraded), length = tool.range;
    const contacts = [];
    for (const enemy of state.enemies) {
      if (!canTarget('pierce', enemy)) continue;
      const dx = enemy.x - source.c, dy = enemy.y - source.r;
      const along = dx * ux + dy * uy;
      if (along >= 0 && along <= length && Math.abs(dx * uy - dy * ux) <= .32 * (tool.beamWidth || 1)) contacts.push({ enemy, along });
    }
    contacts.sort((a, b) => a.along - b.along || a.enemy.id - b.enemy.id);
    const hitDistances = [];
    for (const { enemy, along } of contacts) {
      if (!hit(state, enemy, source)) continue;
      if (!hitDistances.length || along - hitDistances[hitDistances.length - 1] > .35) hitDistances.push(along);
    }
    effect(state, 'laser', source.c, source.r, { tower: source.tower, weapon: source.weapon, angle: source.angle, length, hitDistances, upgraded: source.upgraded });
  }
  const chainFlight = .3 * BATTLE_SPEED;
  function chainPlasma(state, shot, previous, candidates, visited, damage) {
    if (damage < 1) return;
    let next = null, nearest = Infinity;
    for (const enemy of candidates) {
      if (enemy.dead || visited.includes(enemy.id)) continue;
      const distance = Math.hypot(enemy.x - previous.x, enemy.y - previous.y);
      if (distance <= upgrades.molecular.chainRange && distance < nearest) { next = enemy; nearest = distance; }
    }
    if (!next) return;
    effect(state, 'plasmaArc', previous.x, previous.y, { fromEnemy: previous, toEnemy: next, weapon: shot.weapon,
      lift: enemyLift(previous, state.time), toLift: enemyLift(next, state.time), hop: visited.length - 1, damage,
      chain: { shot, candidates, visited: [...visited, next.id] } });
  }
  function updateChains(state, dt) {
    // An arc launched by an arrival starts travelling on the following tick.
    for (let i = 0, count = state.effects.length; i < count; i++) {
      const arc = state.effects[i];
      if (!arc.chain || arc.duration - arc.life + dt < chainFlight - 1e-9) continue;
      const { shot, candidates, visited } = arc.chain;
      arc.chain = null;
      if (hit(state, arc.toEnemy, shot, { damage: arc.damage }))
        chainPlasma(state, shot, arc.toEnemy, candidates, visited, Math.floor(arc.damage / 3));
    }
  }
  function resolveShot(state, shot) {
    if (shot.kind === 'spiderWeb') {
      const tower = state.buildings.find(b => b.id === shot.target);
      if (tower) {
        tower.webUntil = state.time + 7 * BATTLE_SPEED;
        tower.aim = null;
        if (tower.secondary) tower.secondary.aim = null;
        effect(state, 'webHit', tower.c, tower.r);
      }
      return;
    }
    if (shot.kind === 'frost') return frostAura(state, shot);
    if (shot.kind === 'pierce') return fireLaser(state, shot);
    const target = state.enemies.find(e => e.id === shot.target && !e.dead);
    // Instant resolutions can take a target alone. All in-flight shots carry
    // the two coordinates captured when the tower fired.
    const x = shot.impactX ?? target?.x, y = shot.impactY ?? target?.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (shot.weapon === 'gravityCannon') {
      const c=Math.round(x), r=Math.round(y), tool=toolFor(shot.weapon,shot.upgraded);
      const nearby=state.enemies.filter(e=>canTarget(shot.weapon,e) && (e.x-c)**2+(e.y-r)**2<=tool.radius**2);
      let direct=null, closest=Infinity;
      for (const e of nearby) {
        const distance=(e.x-c)**2+(e.y-r)**2;
        if (distance<closest || (distance===closest && e.id<direct.id)) {
          direct=e; closest=distance;
        }
      }
      const rng = state.gravityRng ??= {rngState:state.rngState};
      for (const e of nearby) {
        hit(state,e,shot,{damage:e===direct ? tool.damage : tool.splashDamage});
        if (!e.dead) {
          const percent = tool.minPullPercent + Math.floor(random(rng) * (101 - tool.minPullPercent));
          pullTowardCell(state,e,c,r,percent / 100,tool.stunSeconds*BATTLE_SPEED);
        }
      }
      effect(state,'gravityWell',c,r,{radius:tool.radius,upgraded:shot.upgraded,duration:.30*BATTLE_SPEED});
      return;
    }
    if (shot.kind === 'flame') {
      const c = Math.round(x), r = Math.round(y);
      if (shot.armed) {
        const cells = attackCells(shot.weapon,c,r);
        const targets = occupantsOfCells(state,shot.weapon,cells);
        const blast = { ...shot, kind:shot.weapon, c, r };
        for (const enemy of targets) hit(state,enemy,blast,{damage:toolFor(shot.weapon,shot.upgraded).blastDamage});
        for (const cell of cells) ignite(state,cell.c,cell.r,false,shot.tower);
        effect(state,'moltenBlast',c,r,{cells,upgraded:shot.upgraded,duration:.82});
        return;
      }
      const struck = state.enemies.filter(e => canTarget('flame', e) && Math.round(e.x) === c && Math.round(e.y) === r);
      for (const enemy of struck) hit(state, enemy, shot);
      effect(state, 'stoneImpact', c, r, { upgraded: !!shot.upgraded });
      ignite(state, c, r, !shot.weapon && shot.upgraded, shot.tower);
      if (shot.weapon === 'moltenMortar') {
        shot.armed = true;
        shot.age = 0;
        shot.duration = toolFor(shot.weapon,shot.upgraded).fuseSeconds * BATTLE_SPEED;
      }
      return;
    }
    if (shot.kind === 'push') {
      const c = Math.round(x), r = Math.round(y);
      const targets = state.enemies.filter(e => canTarget('push', e) && Math.round(e.x) === c && Math.round(e.y) === r && Math.hypot(e.x - shot.c, e.y - shot.r) <= TOOLS.push.range);
      for (const enemy of targets) hit(state, enemy, shot);
      return;
    }
    // Sample occupants before damage, so split offspring cannot be hit twice.
    const radius = shot.kind === 'cannon' ? TOOLS.cannon.radius : .4;
    const nearby = state.enemies.filter(e => canTarget(shot.weapon ?? shot.kind, e, shot.upgraded) && Math.hypot(e.x - x, e.y - y) <= radius);
    const distance = e => Math.hypot(e.x - x, e.y - y);
    let contact = null;
    for (const e of nearby) {
      if (distance(e) > .4) continue;
      if (e === target) { contact = e; break; }
      if (!contact || distance(e) < distance(contact)) contact = e;
    }
    const plasma = toolFor(shot.weapon ?? shot.kind,shot.upgraded);
    const chain = contact && shot.kind === 'molecular' && plasma.chainRange ? state.enemies.slice() : null;
    if (contact && !hit(state, contact, shot)) return;
    if (shot.kind === 'cannon') {
      effect(state, 'blast', x, y, { radius, upgraded: shot.upgraded, weapon: shot.weapon });
      for (const other of nearby) if (other !== contact) hit(state, other, shot);
    } else if (contact) {
      if (chain) chainPlasma(state, shot, contact, chain, [contact.id], plasma.chainDamage ?? Math.floor(plasma.damage / 3));
      effect(state, shot.kind === 'molecular' ? 'molecular' : 'spark', x, y,
        { weapon: shot.weapon, upgraded: shot.upgraded, lift: shot.lift ?? 0, angle: shot.angle ?? 0 });
    }
  }
  function enemyLift(enemy, time) {
    if (enemy.pull && enemy.leap) return enemy.pull.lift * Math.max(0,1-enemy.pull.age/enemy.pull.duration);
    if (enemy.leap) return Math.sin(Math.PI * Math.min(1, enemy.leap.age / enemy.leap.duration)) * 50;
    const poseTime = enemy.frozenUntil > time ? enemy.frozenAt : time;
    return enemy.kind === 'flyer' ? 12 + Math.sin(poseTime * 8 + enemy.id) * 2 : 0;
  }
  function faceTravel(enemy, dx, dy) {
    // The unrotated artwork faces left. Keep the last angle while stationary.
    if (dy === 0) {
      if (dx !== 0) enemy.facing = dx < 0 ? 0 : 180;
    } else if (dx === 0) enemy.facing = dy < 0 ? 90 : -90;
    else enemy.facing = Math.round(Math.atan2(-dy, -dx) * 180 / Math.PI);
  }
  function breakBuilding(state, building) {
    state.buildings = state.buildings.filter(b => b !== building);
    refundBuilding(state, building);
    state.stats.broken++; state.revision++;
  }
  function raidPath(state, boss) {
    const solid = terrain(state.level), goal = LEVELS[state.level].goal;
    solid.add(key(goal.c, goal.r));
    const locked = state.buildings.find(b => b.id === boss.preyId);
    let best = null;
    for (const b of locked ? [locked] : state.buildings) {
      if (best && Math.abs(b.c - boss.c) + Math.abs(b.r - boss.r) >= best.length - 1) continue;
      const path = findPath(boss, b, state.buildings.filter(other => other !== b), solid);
      if (path && (!best || path.length < best.length)) { best = path; boss.preyId = b.id; }
    }
    return best;
  }
  function useBossSkill(state, enemy) {
    if (enemy.kind === 'spiderBoss') {
      const towers = state.buildings.filter(b => b.kind !== 'wall');
      if (towers.length) {
        const target = towers[Math.floor(random(state.webRng) * towers.length)];
        state.shots.push({ kind: 'spiderWeb', caster: enemy.id, target: target.id,
          c: enemy.x, r: enemy.y, tipX: target.c, tipY: target.r,
          angle: Math.atan2(target.r - enemy.y, target.c - enemy.x) * 180 / Math.PI,
          age: 0, duration: .8 * BATTLE_SPEED });
      }
    } else {
      if (enemy.push || enemy.leap) return;
      const current = travelRoute(state, Math.round(enemy.x), Math.round(enemy.y));
      const score = path => path.path.length ? path.path.length + (path.breaking ? COLS * ROWS : 0) : Infinity;
      let best = score(current), landing;
      for (let r = Math.ceil(enemy.y - 2); r <= enemy.y + 2; r++) for (let c = Math.ceil(enemy.x - 2); c <= enemy.x + 2; c++) {
        if (Math.hypot(c - enemy.x, r - enemy.y) > 2 + 1e-9 || isHome(state.level, c, r) || !freePoint(state, c, r)) continue;
        const remaining = score(travelRoute(state, c, r));
        if (remaining < best) { best = remaining; landing = { x: c, y: r }; }
      }
      if (landing) {
        enemy.next = null;
        enemy.leap = { ...landing, fromX: enemy.x, fromY: enemy.y, age: 0, duration: .5 * BATTLE_SPEED };
        effect(state, 'leap', enemy.x, enemy.y, { toX: landing.x, toY: landing.y });
      }
    }
    enemy.skillAt = state.time + ENEMIES[enemy.kind].skillSeconds * BATTLE_SPEED;
  }
  function pullTowardCell(state,enemy,c,r,fraction,stunOnArrival) {
    const ground = !ENEMIES[enemy.kind].airborne;
    if (!inside(c,r) || (ground && !freePoint(state,c,r))) {
      enemy.stun=Math.max(enemy.stun,stunOnArrival);
      return;
    }
    let x = c + (enemy.x-c)*(1-fraction), y = r + (enemy.y-r)*(1-fraction);
    // If the desired landing is occupied, continue along the same line towards the open center.
    while (ground && !freePoint(state,x,y)) {
      fraction = Math.min(1,fraction + .1);
      x = c + (enemy.x-c)*(1-fraction); y = r + (enemy.y-r)*(1-fraction);
    }
    const lift=enemyLift(enemy,state.time);
    enemy.pull={fromX:enemy.x,fromY:enemy.y,c:Math.round(x),r:Math.round(y),x,y,lift,age:0,duration:.24*BATTLE_SPEED,stunOnArrival};
    enemy.next=null; enemy.push=null; enemy.attackId=null; enemy.attackClock=.65;
  }
  function moveEnemy(state, enemy, dt) {
    const goal = LEVELS[state.level].goal;
    if (enemy.pull) {
      const p=enemy.pull;
      p.age+=dt;
      const t=Math.min(1,p.age/p.duration), travel=t*(2-t);
      faceTravel(enemy,p.x-p.fromX,p.y-p.fromY);
      enemy.x=p.fromX+(p.x-p.fromX)*travel; enemy.y=p.fromY+(p.y-p.fromY)*travel;
      if (t>=1) {
        enemy.x=p.x; enemy.y=p.y; enemy.c=p.c; enemy.r=p.r;
        enemy.pull=null; enemy.leap=null; enemy.next=null;
        if (p.snowDirection) pushWithSnow(state,enemy,p.snowDirection);
        stopAfterPush(enemy,'stun',p.stunOnArrival);
        finishLandingStop(enemy);
      }
      return;
    }
    if (enemy.leap) {
      const p = enemy.leap; p.age += dt; const t = Math.min(1, p.age / p.duration);
      faceTravel(enemy, p.x - p.fromX, p.y - p.fromY);
      enemy.x = p.fromX + (p.x - p.fromX) * t; enemy.y = p.fromY + (p.y - p.fromY) * t;
      if (t >= 1) {
        enemy.x = enemy.c = p.x; enemy.y = enemy.r = p.y; enemy.next = null; enemy.leap = null;
        if (p.landingPush || p.punchLimit) {
          const distance=pushEnemy(state,enemy,(p.landingPush ?? 0)+(p.punchLimit ?? 0),true);
          if (p.punchLimit) stopAfterPush(enemy,'stun',(1+Math.floor(Math.max(0,p.punchLimit-distance)+1e-8))*BATTLE_SPEED);
        }
        if (p.snowDirection) pushWithSnow(state,enemy,p.snowDirection);
        finishLandingStop(enemy);
      }
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
        if (remaining <= length || i === p.points.length - 1) {
          faceTravel(enemy, b.x - a.x, b.y - a.y);
          break;
        }
        remaining -= length;
      }
      if (t >= 1) {
        enemy.c = Math.round(enemy.x); enemy.r = Math.round(enemy.y);
        enemy.next = p.resume ?? { c: enemy.c, r: enemy.r }; enemy.push = null;
        finishLandingStop(enemy);
      }
      return;
    }
    const speed = ENEMIES[enemy.kind].speed * (enemy.slow > 0 ? TOOLS.frost.slowMultiplier : 1);
    if (enemy.kind === 'flyer') {
      const dx = goal.c - enemy.x, dy = goal.r - enemy.y, distance = Math.hypot(dx, dy);
      faceTravel(enemy, dx, dy);
      const travel = speed * dt;
      if (distance <= travel) {
        enemy.x = goal.c; enemy.y = goal.r; enemy.dead = true; state.hearts = Math.max(0, state.hearts - 1); effect(state, 'home', enemy.x, enemy.y);
      } else { enemy.x += dx / distance * travel; enemy.y += dy / distance * travel; enemy.c = Math.round(enemy.x); enemy.r = Math.round(enemy.y); }
      return;
    }
    const boss = enemy.siegeClock != null;
    if (boss && !enemy.next && Math.abs(goal.c - enemy.c) + Math.abs(goal.r - enemy.r) <= 1) {
      faceTravel(enemy, goal.c - enemy.x, goal.r - enemy.y);
      enemy.siegeClock -= dt;
      if (enemy.siegeClock <= 1e-9) {
        enemy.siegeClock += SIEGE_INTERVAL; state.hearts = Math.max(0, state.hearts - 1);
        effect(state, 'home', goal.c, goal.r);
      }
      return;
    }
    if (boss) enemy.siegeClock = SIEGE_INTERVAL;
    if (enemy.c === goal.c && enemy.r === goal.r && !enemy.next) {
      enemy.dead = true; state.hearts = Math.max(0, state.hearts - 1);
      effect(state, 'home', enemy.x, enemy.y); return;
    }
    if (!enemy.next) {
      const raid = enemy.kind === 'stagBoss' && !enemy.raided ? raidPath(state, enemy) : null;
      const path = raid || travelRoute(state, enemy.c, enemy.r).path;
      if (path.length < 2) return;
      const next = path[1], obstacle = at(state, next.c, next.r);
      if (obstacle) {
        faceTravel(enemy, next.c - enemy.x, next.r - enemy.y);
        if (enemy.attackId !== obstacle.id) { enemy.attackId = obstacle.id; enemy.attackClock = 0.65; }
        enemy.attackClock -= dt;
        if (enemy.attackClock <= 0) {
          enemy.attackClock += 0.65;
          if (raid && obstacle.id === enemy.preyId) { obstacle.hp = 0; enemy.raided = true; effect(state, 'crush', obstacle.c, obstacle.r); }
          else obstacle.hp--;
          if (enemy.kind === 'giant') {
            enemy.lastRamAt = state.time;
            effect(state, 'scarabRam', (enemy.x + obstacle.c) / 2, (enemy.y + obstacle.r) / 2, { facing: enemy.facing });
          } else effect(state, 'chip', obstacle.c, obstacle.r);
          if (obstacle.hp <= 0) breakBuilding(state, obstacle);
        }
        return;
      }
      enemy.attackId = null; enemy.attackClock = 0.65; enemy.next = next;
    }
    const dx = enemy.next.c - enemy.x, dy = enemy.next.r - enemy.y, dist = Math.hypot(dx, dy);
    faceTravel(enemy, dx, dy);
    const step = speed * dt;
    if (dist <= step) {
      enemy.x = enemy.c = enemy.next.c; enemy.y = enemy.r = enemy.next.r; enemy.next = null;
    } else { enemy.x += dx / dist * step; enemy.y += dy / dist * step; }
  }
  const cardinal = [[-1,0],[1,0],[0,-1],[0,1]];
  const cross = [[0,0],...cardinal];
  const attackPatterns = { meteorTower:cross, sonicCannon:cross, crossCoil:cardinal, frostfireJet:cardinal, moltenMortar:[...cross,[-1,-1],[-1,1],[1,-1],[1,1]] };
  const longCross = [...cross,...cardinal.map(([x,y])=>[2*x,2*y])];
  function attackCells(weapon, c, r, upgraded = false) {
    const pattern = upgraded && weapon === 'meteorTower' ? longCross : upgraded && weapon === 'sonicCannon' ? attackPatterns.moltenMortar : attackPatterns[weapon];
    return pattern.map(([dc,dr]) => ({c:c+dc, r:r+dr})).filter(p => inside(p.c,p.r));
  }
  function strikeCells(state, source) {
    const cells = attackCells(source.kind, source.impactX, source.impactY, source.upgraded);
    const targets = occupantsOfCells(state,source.kind,cells);
    for (const e of targets) hit(state, e, source);
    if (source.kind === 'meteorTower') for (const cell of cells) ignite(state,cell.c,cell.r,false,source.tower);
    effect(state, 'cellStrike', source.impactX, source.impactY, { weapon:source.kind, cells, upgraded:source.upgraded,
      ...(source.kind === 'sonicCannon' ? {duration:.86} : {}) });
  }
  function occupantsOfCells(state, weapon, cells) {
    // Select before applying damage so a defeated splitter cannot add new targets.
    return state.enemies.filter(e => canTarget(weapon,e) && cells.some(p => p.c === Math.round(e.x) && p.r === Math.round(e.y)));
  }
  function launchCannonWeapon(state, source, target) {
    const { kind, c, r } = source, tool = toolFor(kind,source.upgraded);
    const shot = {...source, id:state.nextId++, age:0};
    if (tool.delay) {
      shot.impactX = Math.round(target.x); shot.impactY = Math.round(target.y);
      shot.duration = tool.delay * BATTLE_SPEED;
    } else if (kind === 'snowCannon') {
      shot.dx = Math.sign(Math.round(target.x) - c); shot.dy = Math.sign(Math.round(target.y) - r);
      shot.x = c + .33 * shot.dx; shot.y = r + .33 * shot.dy;
      const distance = shot.dx ? (shot.dx > 0 ? COLS - .5 - shot.x : shot.x + .5) : (shot.dy > 0 ? ROWS - .5 - shot.y : shot.y + .5);
      shot.duration = distance / tool.speed * BATTLE_SPEED; shot.hitIds = [];
    } else {
      const radians = source.angle * Math.PI / 180;
      const muzzle = Math.min(.36, Math.hypot(target.x-c,target.y-r));
      shot.x = c + Math.cos(radians)*muzzle; shot.y = r + Math.sin(radians)*muzzle;
      shot.lift = 0; shot.trail = []; shot.duration = 2 * fullRange / tool.speed * BATTLE_SPEED;
    }
    state.shots.push(shot);
  }
  function pushWithSnow(state, enemy, {dx, dy}) {
    const ongoing = enemy.pull || enemy.leap;
    if (ongoing) { ongoing.snowDirection = {dx, dy}; return; }
    const tool = cannonWeapons.snowCannon;
    const c = Math.round(enemy.x) + dx, r = Math.round(enemy.y) + dy;
    let travel = tool.knockback;
    if (!inside(c,r) || at(state,c,r) || isHome(state.level,c,r) || terrain(state.level).has(key(c,r))) {
      const toFace = (c - enemy.x) * dx + (r - enemy.y) * dy - .5;
      travel = Math.min(travel, toFace - .001);
    }
    if (travel <= 0) return;
    const x = enemy.x + dx * travel, y = enemy.y + dy * travel;
    enemy.push = {x, y, points:[{x:enemy.x, y:enemy.y}, {x,y}], length:travel, age:0, duration:.3};
    enemy.next = null; enemy.attackId = null; enemy.attackClock = .65;
  }
  function rollSnow(state, shot, dt) {
    const tool = toolFor(shot.kind,shot.upgraded);
    const fromX = shot.x, fromY = shot.y;
    const fromDistance = (fromX - shot.c) * shot.dx + (fromY - shot.r) * shot.dy;
    let travel = tool.speed * dt / BATTLE_SPEED;
    const nextCell = Math.floor(fromDistance + .5) + 1, face = nextCell - .5;
    const c = shot.c + nextCell * shot.dx, r = shot.r + nextCell * shot.dy;
    const collision = fromDistance + travel >= face - 1e-9 && (!inside(c,r) || isHome(state.level,c,r) || at(state,c,r));
    if (collision) travel = Math.max(0,face - fromDistance);
    shot.x += shot.dx * travel; shot.y += shot.dy * travel;
    for (let i = 0, count = state.enemies.length; i < count; i++) {
      const e = state.enemies[i];
      if (!canTarget(shot.kind, e) || shot.hitIds.includes(e.id)) continue;
      const ahead = (e.x - fromX) * shot.dx + (e.y - fromY) * shot.dy;
      const inLane = shot.dx ? Math.round(e.y) === shot.r : Math.round(e.x) === shot.c;
      if (!inLane || ahead < -.30 || ahead > travel + .30) continue;
      const cell = Math.round(fromDistance + ahead);
      // The front of the ball can touch a bug before its center enters that bug's cell.
      if (fromDistance + travel < cell - .5 || (collision && cell >= nextCell)) continue;
      shot.hitIds.push(e.id);
      const damage = Math.max(0, cell - 1) * tool.damagePerCell;
      if (hit(state, e, shot, {damage})) {
        if (!e.dead) pushWithSnow(state,e,shot);
        effect(state, 'snowContact', e.x, e.y);
      }
    }
    if (!collision) return;
    shot.x = shot.c + face * shot.dx; shot.y = shot.r + face * shot.dy;
    const damage = Math.max(1,Math.floor(Math.max(0,nextCell-2) * tool.damagePerCell / 2));
    const source = {...shot, c:shot.x, r:shot.y};
    for (const e of state.enemies.filter(e => canTarget(shot.kind,e) && Math.hypot(e.x-shot.x,e.y-shot.y) <= tool.burstRadius)) {
      hit(state,e,source,{damage,burst:true});
    }
    effect(state,'snowBurst',shot.x,shot.y,{radius:tool.burstRadius,upgraded:shot.upgraded,duration:.52});
    shot.age = shot.duration;
  }
  // For targeting only, estimate blast coverage on the fixed board. Impact uses exact positions.
  const cometBlastCells = [false,true].map(upgraded => Array.from({length:COLS*ROWS}, (_, index) => {
    const cells = [], radius = toolFor('cometCannon',upgraded).radius, limit = Math.floor(radius);
    const c = index % COLS, r = Math.floor(index / COLS);
    for (let dr = -limit; dr <= limit; dr++) {
      for (let dc = -limit; dc <= limit; dc++) {
        if (dc*dc + dr*dr <= radius*radius && inside(c+dc,r+dr)) cells.push((r+dr)*COLS + c+dc);
      }
    }
    return cells;
  }));
  function chooseCometTarget(air, x, y, range, goal, upgraded) {
    const candidates = air.filter(e => (e.x-x)**2 + (e.y-y)**2 <= range*range);
    if (candidates.length < 2) return candidates[0] ?? null;
    const density = new Uint32Array(COLS * ROWS);
    for (const e of air) {
      const cell = Math.round(e.y)*COLS + Math.round(e.x);
      for (const center of cometBlastCells[+!!upgraded][cell]) density[center]++;
    }
    let best = null, bestCount = 0, bestHome = Infinity;
    for (const e of candidates) {
      const count = density[Math.round(e.y)*COLS + Math.round(e.x)];
      const home = Math.abs(e.x-goal.c) + Math.abs(e.y-goal.r);
      if (count > bestCount || (count === bestCount && (home < bestHome || (home === bestHome && e.id < best.id)))) {
        best = e; bestCount = count; bestHome = home;
      }
    }
    return best;
  }
  function advanceComet(state, shot, dt) {
    const air = state.enemies.filter(e => canTarget(shot.kind,e));
    let target = air.find(e => e.id === shot.target);
    if (!target) {
      if (!air.length) return true;
      target = chooseCometTarget(air, shot.x, shot.y, Infinity, LEVELS[state.level].goal,shot.upgraded);
      shot.target = target.id;
    }
    const dx = target.x-shot.x, dy = target.y-shot.y, distance = Math.hypot(dx,dy);
    const ux = distance ? dx/distance : 1, uy = distance ? dy/distance : 0;
    const travel = Math.min(distance, cannonWeapons.cometCannon.speed * dt / BATTLE_SPEED);
    // First entry into a bug's hit circle along this flight segment.
    let contact = null, first = Infinity;
    for (const e of air) {
      const ox = e.x-shot.x, oy = e.y-shot.y, along = ox*ux + oy*uy, across = ox*uy - oy*ux;
      if (Math.abs(across) > .26) continue;
      const half = Math.sqrt(.26 ** 2 - across ** 2), enter = Math.max(0,along-half);
      if (along+half >= 0 && enter <= travel && enter < first) { contact=e; first=enter; }
    }
    shot.trail.push({x:shot.x,y:shot.y,lift:shot.lift});
    if (shot.trail.length > 6) shot.trail.shift();
    shot.x += ux * Math.min(first,travel); shot.y += uy * Math.min(first,travel);
    shot.angle = Math.atan2(uy,ux)*180/Math.PI;
    shot.lift += (enemyLift(target,state.time)-shot.lift) * Math.min(1,dt*12);
    if (!contact) return false;
    const tool = toolFor(shot.kind,shot.upgraded);
    for (const e of air) if (Math.hypot(e.x-contact.x,e.y-contact.y) <= tool.radius) {
      hit(state,e,shot,{damage:e === contact ? tool.damage : tool.splashDamage});
      if (!e.dead) e.stun = Math.max(e.stun,tool.stunSeconds*BATTLE_SPEED);
    }
    effect(state,'cometBurst',contact.x,contact.y,{lift:enemyLift(contact,state.time),radius:tool.radius,upgraded:shot.upgraded,duration:.85});
    return true;
  }
  function summonVortex(state, tower, weapon) {
    state.vortices.push({ id:state.nextId++, weapon, upgraded:tower.upgraded, tower:tower.id, x:tower.c, y:tower.r, age:0, nextPulse:BATTLE_SPEED,
      destX:tower.c, destY:tower.r, contacts:new Set() });
  }
  function updateVortices(state, dt) {
    for (const v of state.vortices) {
      const tool = toolFor(v.weapon,v.upgraded), duration = tool.lifetime * BATTLE_SPEED;
      const elapsed = Math.min(dt,duration-v.age);
      v.age += elapsed;
      let distance = Math.hypot(v.destX-v.x,v.destY-v.y);
      if (distance < .05) {
        v.destX = random(state.weatherRng)*(COLS-1); v.destY = random(state.weatherRng)*(ROWS-1);
        distance = Math.hypot(v.destX-v.x,v.destY-v.y);
      }
      const travel = distance ? Math.min(1,tool.speed*elapsed/(distance*BATTLE_SPEED)) : 0;
      v.x += (v.destX-v.x)*travel; v.y += (v.destY-v.y)*travel;
      if (tool.fireTrail) {
        const cell = key(Math.round(v.x),Math.round(v.y));
        if (cell !== v.trailCell) { ignite(state,v.x,v.y,false,v.tower); v.trailCell=cell; }
      }
      const pulse = v.age >= v.nextPulse - 1e-9;
      if (pulse) v.nextPulse += BATTLE_SPEED;
      for (let i=0, count=state.enemies.length;i<count;i++) {
        const e=state.enemies[i];
        if (!canTarget(v.weapon,e) || (e.x-v.x)**2+(e.y-v.y)**2 > tool.radius**2) {
          v.contacts?.delete(e.id);
          continue;
        }
        if (pulse || !v.contacts.has(e.id)) {
          if (tool.vortex === 'fire') applyBurn(state,e,tool.burnSeconds,v.tower);
          else applyIce(state,e);
        }
        v.contacts.add(e.id);
        if (pulse) hit(state,e,{kind:v.weapon,upgraded:v.upgraded,tower:v.tower,c:v.x,r:v.y});
      }
    }
    state.vortices = state.vortices.filter(v=>v.age < toolFor(v.weapon,v.upgraded).lifetime * BATTLE_SPEED - 1e-9);
  }
  function chooseGravityCell(state, tower, tool) {
    if (!state.enemies.length) return null;
    const cells=new Map(), goal=LEVELS[state.level].goal;
    const solid=terrain(state.level);
    for (const b of state.buildings) solid.add(key(b.c,b.r));
    for (const e of state.enemies) {
      if (!canTarget('gravityCannon',e) || (e.x-tower.c)**2+(e.y-tower.r)**2>(tool.range+tool.radius)**2) continue;
      for (let r=Math.ceil(e.y-tool.radius); r<=Math.floor(e.y+tool.radius); r++) {
        for (let c=Math.ceil(e.x-tool.radius); c<=Math.floor(e.x+tool.radius); c++) {
          const distance=(e.x-c)**2+(e.y-r)**2;
          if (!inside(c,r) || distance>tool.radius**2 || (c-tower.c)**2+(r-tower.r)**2>tool.range**2 || solid.has(key(c,r))) continue;
          const index=r*COLS+c;
          if (!cells.has(index)) cells.set(index,{x:c,y:r,count:0,spread:0,home:Math.abs(c-goal.c)+Math.abs(r-goal.r)});
          const cell=cells.get(index);
          cell.count++; cell.spread+=distance;
        }
      }
    }
    let best=null;
    for (const cell of cells.values()) {
      if (!best || cell.count>best.count || (cell.count===best.count &&
          (cell.spread<best.spread || (cell.spread===best.spread && cell.home<best.home)))) best=cell;
    }
    return best;
  }
  function chooseSnowLane(state, tower) {
    const goal = LEVELS[state.level].goal;
    const lanes = [];
    for (const e of state.enemies) {
      if (!canTarget('snowCannon', e)) continue;
      const dc = Math.round(e.x)-tower.c, dr = Math.round(e.y)-tower.r;
      if ((dc === 0) === (dr === 0)) continue;
      const index = dc ? (dc > 0 ? 0 : 1) : (dr > 0 ? 2 : 3);
      const home = Math.abs(e.x-goal.c) + Math.abs(e.y-goal.r);
      const lane = lanes[index] ??= {count:0, home, target:e};
      lane.count++;
      if (home < lane.home || (home === lane.home && e.id < lane.target.id)) {
        lane.target = e; lane.home = home;
      }
    }
    let best = null;
    for (const lane of lanes) {
      if (lane && (!best || lane.count > best.count || (lane.count === best.count &&
          (lane.home < best.home || (lane.home === best.home && lane.target.id < best.target.id))))) best = lane;
    }
    return best?.target;
  }
  function chooseTarget(state, tower, weapon, tool) {
    if (weapon === 'snowCannon') return chooseSnowLane(state, tower);
    const goal = LEVELS[state.level].goal;
    const rangeSquared = tool.range * tool.range;
    let best = null, bestPriority = Infinity, bestTie = Infinity, bestHome = Infinity;
    for (const enemy of state.enemies) {
      const dx = enemy.x - tower.c, dy = enemy.y - tower.r;
      let distanceSquared = dx * dx + dy * dy;
      if (weapon === 'sonicCannon' || weapon === 'frostfireJet') {
        const dc = Math.round(enemy.x) - tower.c, dr = Math.round(enemy.y) - tower.r;
        if (weapon === 'frostfireJet' && Math.abs(dc) + Math.abs(dr) !== 1) continue;
        distanceSquared = dc * dc + dr * dr;
      }
      if (distanceSquared > rangeSquared || (tool.minRange && distanceSquared <= tool.minRange ** 2) || !canTarget(weapon, enemy, tower.upgraded)) continue;
      const locked = enemy.id === tower.aim?.target;
      const frozen = enemy.frozenUntil > state.time;
      if (locked && !(tool.priority === 'notFrozen' && frozen)) return enemy;
      const priority = tool.priority === 'highestHp' ? -enemy.hp : Number((tool.priority === 'notFrozen' && frozen) || (tool.priority === 'unfrozen' && (enemy.slow > 0 || frozen)) || (tool.priority === 'unburned' && enemy.burnTicks > 0));
      const tie = tool.priority === 'notFrozen' ? (locked ? -Infinity : -enemy.hp) : 0;
      const home = weapon === 'push' ? (enemy.x - goal.c) ** 2 + (enemy.y - goal.r) ** 2
        : Math.abs(enemy.x - goal.c) + Math.abs(enemy.y - goal.r);
      if (priority < bestPriority || (priority === bestPriority && (tie < bestTie || (tie === bestTie &&
          (home < bestHome || (home === bestHome && enemy.id < best.id)))))) {
        best = enemy; bestPriority = priority; bestTie = tie; bestHome = home;
      }
    }
    return best;
  }
  function updateTower(state, b, dt) {
    b.flash = Math.max(0, b.flash - dt / RECOIL_SECONDS);
    if (b.webUntil > state.time + 1e-9 || (b.kind === 'wall' && !b.upgraded)) return;
    const weapon = primaryWeapon(b), tool = toolFor(weapon, b.upgraded);
    const kind = tool.delivery ?? weapon;
    b.cooldown -= dt;
    if (weapon === 'impactCannon') {
      if (b.cooldown > 1e-9) return;
      b.cooldown += BATTLE_SPEED / tool.rate;
      b.flash = 1;
      effect(state,'impactPulse',b.c,b.r,{radius:tool.range,upgraded:b.upgraded,duration:.65 * BATTLE_SPEED});
      const source = {kind:weapon,upgraded:b.upgraded,tower:b.id,c:b.c,r:b.r};
      state.enemies.forEach(e => {
        if ((e.x-b.c)**2 + (e.y-b.r)**2 <= tool.range**2) hit(state,e,source);
      });
      return;
    }
    if (tool.vortex) {
      if (b.cooldown <= 1e-9) { b.flash=1; b.cooldown+=BATTLE_SPEED/tool.rate; summonVortex(state,b,weapon); }
      return;
    }
    if (weapon === 'crossCoil') {
      if (b.cooldown <= 1e-9) {
        b.flash = 1; b.cooldown += BATTLE_SPEED/tool.rate;
        strikeCells(state,{kind:weapon,upgraded:b.upgraded,tower:b.id,c:b.c,r:b.r,impactX:b.c,impactY:b.r});
      }
      return;
    }
    if (b.kind === 'wall') {
      if (b.cooldown > 1e-9) return;
      const nearby = state.enemies.filter(e => canTarget(b.kind, e, b.upgraded) &&
        Math.max(Math.abs(Math.round(e.x) - b.c), Math.abs(Math.round(e.y) - b.r)) <= tool.range);
      if (nearby.length) {
        b.flash = 1; b.cooldown += BATTLE_SPEED / tool.rate;
        const source = { kind: 'wall', tower: b.id, c: b.c, r: b.r, upgraded: true };
        for (const e of nearby) hit(state, e, source);
      } else b.cooldown = 0;
      return;
    }
    // Acquire the next target only after this tower's previous projectile has
    // resolved, so the priority sees the HP remaining after its own damage.
    if (tool.aimSeconds && state.shots.some(s => s.tower === b.id && s.kind === kind)) return;
    if ((tool.delay || weapon === 'cometCannon' || weapon === 'snowCannon') && b.cooldown > 0) return;
    if (weapon === 'gravityCannon') {
      if (!b.aim) {
        if (b.cooldown>0) return;
        const cell = chooseGravityCell(state,b,tool);
        if (!cell) { b.cooldown=.1*BATTLE_SPEED; return; }
        b.aim = {x:cell.x, y:cell.y, age:0};
        b.angle = Math.atan2(b.aim.y-b.r,b.aim.x-b.c)*180/Math.PI;
      }
      b.aim.age += dt;
      if (b.aim.age >= tool.aimSeconds * BATTLE_SPEED - 1e-9) {
        const {x,y} = b.aim;
        b.flash=1; b.aim=null; b.cooldown=.36*BATTLE_SPEED;
        resolveShot(state,{tower:b.id, upgraded:b.upgraded, kind, weapon, c:b.c, r:b.r, impactX:x, impactY:y});
      }
      return;
    }
    const target = weapon === 'cometCannon'
      ? chooseCometTarget(state.enemies.filter(e => canTarget(weapon,e)), b.c, b.r, tool.range, LEVELS[state.level].goal,b.upgraded)
      : chooseTarget(state, b, weapon, tool);
    if (weapon === 'disintegrationBeam') {
      if (!target) { b.aim=null; return; }
      if (b.aim?.target!==target.id) b.aim={target:target.id,damage:0,nextTick:state.time};
      b.angle=Math.atan2(target.y-b.r,target.x-b.c)*180/Math.PI;
      if (state.time+1e-9>=b.aim.nextTick) {
        b.aim.damage=Math.min(tool.maxDamage,b.aim.damage+1);
        b.aim.nextTick+=BATTLE_SPEED/tool.rate;
        b.flash=1;
        hit(state,target,{kind:weapon,upgraded:b.upgraded,tower:b.id,c:b.c,r:b.r},{damage:b.aim.damage});
        effect(state,'disintegrateHit',target.x,target.y,{lift:enemyLift(target,state.time),strength:b.aim.damage,
          ...(target.dead ? {fromC:b.c,fromR:b.r} : {})});
      }
      return;
    }
    if (tool.aimSeconds) {
      if (!target) b.aim = null;
      else {
        if (b.aim?.target !== target.id) b.aim = { target: target.id, age: 0 };
        b.aim.age += dt;
      }
    }
    if (!target) { b.cooldown = Math.max(0, b.cooldown); return; }
    const lockCell = weapon === 'snowCannon' || weapon === 'frostfireJet' || !!tool.delay;
    const aimX = lockCell ? Math.round(target.x) : target.x;
    const aimY = lockCell ? Math.round(target.y) : target.y;
    b.angle = Math.atan2(aimY - b.r, aimX - b.c) * 180 / Math.PI;
    if (tool.aimSeconds ? b.aim.age >= tool.aimSeconds * BATTLE_SPEED - 1e-9 : b.cooldown <= 0) {
      if (tool.aimSeconds) { b.aim = null; b.cooldown = 0; }
      else b.cooldown += BATTLE_SPEED / tool.rate;
      b.flash = 1;
      const source = { upgraded: b.upgraded, tower: b.id, target: target.id, c: b.c, r: b.r, kind, ...(tool.delivery ? { weapon } : {}), angle: b.angle };
      if (weapon === 'frostfireJet') {
        effect(state,'frostfireSpray',b.c,b.r,{angle:b.angle,impactX:aimX,impactY:aimY,upgraded:b.upgraded});
        const occupants = state.enemies.filter(e => canTarget(weapon,e) && Math.round(e.x) === aimX && Math.round(e.y) === aimY);
        for (const e of occupants) hit(state,e,source);
        return;
      }
      if (cannonWeapons[weapon]) { launchCannonWeapon(state,source,target); return; }
      if (weapon === 'pea' && b.upgraded) {
        b.barrelOffset = b.barrelOffset === 8 ? -8 : 8;
        source.barrelOffset = b.barrelOffset;
      }
      if (kind === 'frost' || kind === 'pierce') resolveShot(state, source);
      else {
        const stone = kind === 'flame';
        let impactX = stone ? Math.round(target.x) : target.x, impactY = stone ? Math.round(target.y) : target.y;
        // Lead a moving target at launch. The plasma projectile then flies straight.
        if (kind === 'molecular' && !(target.frozenUntil > state.time || target.shock || target.stun || target.spikeStun || target.push || target.leap)) {
          const dest = target.kind === 'flyer' ? LEVELS[state.level].goal : target.next;
          if (dest) {
            const dx = dest.c - target.x, dy = dest.r - target.y, distance = Math.hypot(dx, dy);
            const speed = ENEMIES[target.kind].speed * (target.slow ? TOOLS.frost.slowMultiplier : 1);
            const lead = distance ? Math.min(1, speed * (tool.flightSeconds ?? .36) * BATTLE_SPEED / distance) : 0;
            impactX += dx * lead; impactY += dy * lead;
          }
        }
        const tip = stone || kind === 'molecular' ? { x: impactX, y: impactY } : impactPoint(target, source);
        const volley = b.kind === 'castle' && b.upgraded ? [-5, 5] : [source.barrelOffset ?? 0];
        for (const offset of volley) state.shots.push({ ...source, id: state.nextId++, barrelOffset: offset, impactX, impactY,
          tipX: tip.x, tipY: tip.y, lift: stone ? 0 : enemyLift(target, state.time), age: 0, duration: stone ? (tool.flightSeconds ?? .5) * BATTLE_SPEED : kind === 'molecular' ? (tool.flightSeconds ?? .36) * BATTLE_SPEED : .2 });
      }
    }
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
    // New hatchlings begin moving next tick. Capture the count without copying the swarm.
    for (let i = 0, count = state.enemies.length; i < count; i++) {
      const enemy = state.enemies[i];
      if (enemy.dead) continue;
      enemy.slow = Math.max(0, enemy.slow - dt); enemy.flash = Math.max(0, enemy.flash - dt); enemy.shieldFlash = Math.max(0, enemy.shieldFlash - dt);
      const frozen = enemy.frozenUntil > state.time - dt + 1e-9;
      if (!frozen && !enemy.pull && enemy.kind === 'rhinoBoss' && enemy.leap) {
        // Finish the flight before counting down any stun received in the air.
        moveEnemy(state, enemy, dt);
      } else {
        const shocked = enemy.shock > 1e-9, stunned = enemy.stun > 1e-9 && !enemy.push;
        if (shocked) enemy.shock = Math.max(0, enemy.shock - dt);
        if (stunned) enemy.stun = Math.max(0, enemy.stun - dt);
        const spiked = enemy.spikeStun > 1e-9;
        if (spiked) enemy.spikeStun = Math.max(0, enemy.spikeStun - dt);
        if (enemy.pull) moveEnemy(state,enemy,dt);
        else if (!frozen && !shocked && !stunned && !spiked) {
          if (state.time + 1e-9 >= enemy.skillAt) useBossSkill(state, enemy);
          moveEnemy(state, enemy, dt);
        }
      }
      if (!enemy.dead && enemy.kind === 'mother') {
        enemy.broodClock -= dt;
        if (enemy.broodClock <= 1e-9) { enemy.broodClock += BATTLE_SPEED * 3; hatch(state, enemy, 1); state.stats.hatched++; }
      }
      if (state.hearts === 0) { state.phase = 'lost'; break; }
    }
    if (state.phase === 'lost') {
      finishDamage(state, state.buildings);
      if (state.checkpoint) finishDamage(state, state.checkpoint.buildings);
      state.enemies = state.enemies.filter(e => !e.dead);
      return;
    }
    if (state.vortices.length) updateVortices(state, dt);
    for (const b of state.buildings) {
      updateTower(state, b, dt);
      if (b.secondary) {
        b.secondary.webUntil = b.webUntil;
        updateTower(state, b.secondary, dt);
      }
    }
    if (state.castle) updateTower(state, state.castle, dt);
    for (const shot of state.shots) {
      const travelTime = Math.min(dt,shot.duration-shot.age);
      shot.age += dt;
      if (shot.kind === 'snowCannon') rollSnow(state,shot,travelTime);
      else if (shot.kind === 'cometCannon') {
        if (advanceComet(state,shot,travelTime)) shot.age=shot.duration;
      } else if (shot.age >= shot.duration - 1e-9) {
        if (cannonWeapons[shot.kind]?.delay) strikeCells(state,shot);
        else resolveShot(state, shot);
      }
    }
    state.shots = state.shots.filter(s => s.age < s.duration - 1e-9);
    updateChains(state, dt);
    updateFires(state, dt, state.time);
    if (state.enemies.some(e => e.dead)) state.enemies = state.enemies.filter(e => !e.dead);
    for (const e of state.effects) e.life -= dt;
    state.effects = state.effects.filter(e => e.life > 0);
    if (!state.queue.length && !state.enemies.length && !state.shots.length) {
      state.lastReward = LEVELS[state.level].reward;
      state.money += state.lastReward; state.upgradeItems++;
      state.vortices = [];
      if (hammerLevels.includes(state.level + 1)) state.fusionHammers++;
      state.undo = []; state.checkpoint = null; state.castle = null; state.revision++;
      finishDamage(state, state.buildings);
      for (const b of state.buildings) { b.aim = null; b.webUntil = 0; delete b.secondary; }
      if (state.level >= BONUS_LEVEL - 1) { state.bonusUnlocked = true; state.completed = true; state.phase = 'won'; }
      else { state.level++; state.wave = 0; state.hearts = LEVELS[state.level].hearts + Number(state.castleUpgraded); state.rngState = stageSeed(state.level); state.phase = 'planning'; clearReservedBuildings(state); }
      // Surviving buildings and funds carry over; each new stage heals the home.
      // The last fire
      // remains visible during deployment, then clears when the player starts.
    }
  }
  return { COLS, ROWS, BONUS_LEVEL, BATTLE_SPEED, RECOIL_SECONDS, SPAWN_INTERVAL, GOAL, TOOLS, ENEMIES, LEVELS, key, terrain, at, entrances, isEntrance, isHome, findPath, route, previews,
    spawnQueue, toolFor, primaryWeapon, secondaryWeapon, fusionRecipe, attackCells, buildingHP, buildingName, hammerLevels, createState, canBuild, build, upgrade, downgrade, remove, undo, snapshot, restore, startWave, retry, isAdvancing, togglePause, spawn, canTarget, shieldBlocks, enemyArtScale, enemyLift, impactPoint, hit, pushEnemy, ignite, updateFires, resolveShot, jumpLanding, startLeap, step };
});
