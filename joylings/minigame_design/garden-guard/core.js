(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Garden = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const COLS = 12, ROWS = 8;
  const BATTLE_SPEED = 1.5;
  const iceSpeedByStack = [1, .90, .88, .86, .84, .82, .80];
  const THAW_IMMUNITY = 1 * BATTLE_SPEED;
  const SIEGE_INTERVAL = 2 * BATTLE_SPEED;
  const MOTHER_SPAWN_INTERVAL = 2 * BATTLE_SPEED;
  const EGG_LAY_INTERVAL = 4 * BATTLE_SPEED;
  const EGG_INCUBATION = 3 * BATTLE_SPEED;
  const SCARAB_DASH_COOLDOWN = 5 * BATTLE_SPEED;
  const SCARAB_DASH_SPEED = 1 / (.24 * BATTLE_SPEED);
  const SPAWN_INTERVAL = BATTLE_SPEED * 0.25;
  const ENEMY_HEALTH_MULTIPLIER = 2;
  const GOAL = { c: 0, r: 3 };
  const TOOLS = {
    pea: { name: '砲塔', targets: ['ground', 'air'], cost: 5, range: 3.1, damage: 1, rate: 1.55, effect: '先打飛蟲，也能打地上的蟲。', hp: 5, color: '#4b8058' },
    cannon: { name: '大砲', targets: ['ground'], cost: 11, range: 2.8, damage: 2, rate: 1.2, radius: 1.25, effect: '大砲彈爆開，一次打中一群蟲。', hp: 5, color: '#b68a43' },
    frost: { name: '寒冰石', targets: ['ground'], cost: 7, range: 2.65, damage: 0, rate: 0.9, piercesShield: true, slowDuration: 1.4 * BATTLE_SPEED, effect: '放出一圈冰氣，讓附近的蟲變慢。', hp: 5, color: '#619aa9' },
    flame: { name: '火球投石機', targets: ['ground'], cost: 7, range: 5, minRange: 2, damage: 5, rate: 0.45, flightSeconds: .5, groundFireSeconds: 4, burnDamage: 1, burnSeconds: 3, burnRadius: 0.75, effect: '把火石丟到最多蟲會經過的格子。', hp: 5, color: '#d37643' },
    pierce: { name: '雷射砲', targets: ['ground', 'air'], cost: 12, range: 6.2, damage: 1, rate: 0.8, piercesShield: true, stunSeconds: .1, effect: '瞄準排成一線的蟲，穿盾電暈牠們。', hp: 5, color: '#4a8f88' },
    push: { name: '衝擊拳機', targets: ['ground', 'air'], cost: 9, range: 4, damage: 1, rate: 0.35, knockback: 3, effect: '把最靠近城堡的蟲推回去。', hp: 5, color: '#7882af' },
    molecular: { name: '電漿塔', targets: ['ground', 'air'], cost: 18, range: 6.6, damage: 38, rate: 1/1.5, aimSeconds: 1.5, priority: 'highestHp', piercesShield: true, effect: '和其他電漿塔分頭打血多的蟲，電漿球能穿盾。', hp: 5, color: '#a16cab' },
    wall: { name: '石牆', cost: 1, hp: 4, effect: '擋住去路，讓蟲繞路。', color: '#a48a66' }
  };
  const weapons = { ...TOOLS, castle: { name: '城堡', targets: TOOLS.pea.targets, rate: TOOLS.pea.rate, range: 3, damage: 2, effect: '自動射箭，守住城門。', color: '#597581' } };
  const upgrades = {
    castle: { name: '雙弩城堡', effect: '一次射兩支箭，城堡多一顆心。' },
    pea: { name: '雙管砲塔', rate: TOOLS.pea.rate * 2.5, effect: '雙管連射，先打飛蟲。' },
    push: { name: '震盪拳機', damage: TOOLS.push.damage + 2, knockback: 4, stunSeconds: 1, effect: '把蟲推回去，每少推一格就多暈 1 秒。' },
    molecular: { name: '連鎖電漿塔', damage: 46, chainRange: 3, effect: '和其他電漿塔分頭瞄準，打中後再彈向附近的蟲。' },
    cannon: { name: '巨砲', damage: 4, effect: '大砲彈爆開，一次打中一群蟲。' },
    frost: { name: '霜凍石', rate: TOOLS.frost.rate * 1.2, damage: 1, effect: '放出一圈冰氣，讓附近的蟲受傷變慢。' },
    flame: { name: '大火球投石機', damage: 7, groundFireSeconds: 5, afterburnSeconds: 5, effect: '火石瞄準蟲群必經的格子，蟲離開後還會燒。' },
    pierce: { name: '光束砲', damage: 2, stunSeconds: .2, effect: '瞄準排成一線的蟲，穿盾電暈牠們。' },
    wall: { name: '尖刺石牆', range: 1, targets: ['ground'], rate: .5, damage: 1, stunSeconds: .3, effect: '向四周伸出尖刺，刺暈靠近的蟲。' }
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
  weapons.tacticalAir = derive('pea', '防空機砲', { damage:TOOLS.pea.damage+1, rate: weapons.pea.rate * 1.2, targets: ['air'], range: TOOLS.pea.range + 1, effect: '用小砲彈追打飛蟲。' });
  weapons.tacticalGround = derive('cannon', '對地重砲', { damage:TOOLS.cannon.damage+1, rate: weapons.cannon.rate * 1.2, range: TOOLS.cannon.range + 1, effect: '用大砲彈炸地上的蟲群。' });
  weapons.iceCannon = derive('pea', '寒冰砲', { rate: weapons.pea.rate * 1.5, priority: 'unfrozen', iceLayers:2, effect: '先打還沒變慢的蟲，讓牠也慢下來。' });
  weapons.fireCannon = derive('pea', '火炮', { targets:['air'], damage:3, rate:1.8, priority: 'unburned', range: TOOLS.flame.range, burnSeconds: TOOLS.flame.burnSeconds, effect: '射出火彈，先點燃還沒著火的飛蟲。' });
  weapons.mapLaser = derive('pierce', '雷管砲', { range: Math.hypot(COLS, ROWS), effect: '雷射能打到全場，沿直線穿過盾牌。' });
  weapons.impactCannon = { name:'衝擊塔', targets:TOOLS.pea.targets, range:2, rate:1/3, damage:1, knockback:1, stunSeconds:.4, color:'#48877f', effect:'向四周放出震波，把蟲推開再震暈。' };
  weapons.magCannon = derive('molecular', '電磁砲', { damage: weapons.molecular.damage / 2, aimSeconds: weapons.molecular.aimSeconds / 2,
      effect: '快速瞄準血最多的蟲，射出穿盾電漿球。' });
  const fullRange = Math.hypot(COLS, ROWS);
  const cannonWeapons = {
    snowCannon: { name:'雪砲', iceLayers:2, targets:['ground'], range:fullRange, rate:.3, damage:8, damagePerCell:1, speed:1.625, muzzleOffset:.33, diameterGrowth:.05, knockback:.5, burstRadius:1, color:'#458fa6', effect:'雪球沿直線越滾越大，推開碰到的蟲。' },
    meteorTower: { name:'隕石塔', targets:['ground'], range:fullRange, rate:TOOLS.flame.rate, damage:6, delay:1, burnSeconds:TOOLS.flame.burnSeconds, color:'#c5653f', effect:'隕石從天而降，燒出十字形火地。' },
    cometCannon: { name:'流星砲', targets:['air'], range:TOOLS.pierce.range+1, rate:TOOLS.pierce.rate, damage:3, splashDamage:1, speed:5.5, radius:2, stunSeconds:.2, color:'#9868ac', effect:'流星追著飛蟲跑，爆開時震暈附近的飛蟲。' },
    sonicCannon: { name:'音波砲', targets:['ground','air'], range:4, rate:TOOLS.push.rate, damage:5, delay:1, stunSeconds:1, color:'#a7763a', effect:'瞄準蟲最多的地方，一樣多就先震飛蟲。' },
    crossCoil: { name:'十字電塔', targets:['ground'], range:1, rate:1.2, damage:6, stunSeconds:.1, piercesShield:true, color:'#6960bb', effect:'放電打中上下左右四格的蟲。' }
  };
  Object.assign(weapons, cannonWeapons);
  const frostWeapons = {
    frostfireJet: { name:'冰火噴槍', targets:['ground'], range:1, damage:2, rate:2, piercesShield:true, burnSeconds:TOOLS.flame.burnSeconds, color:'#aa6358', effect:'噴出冰和火，讓同一格的蟲變慢又著火。' },
    cryoBeam: { ...TOOLS.pierce, name:'急凍光束槍', iceLayers:2, delivery:'pierce', damage:TOOLS.pierce.damage+1, color:'#4e9eb6', effect:'冰光束穿過盾牌，讓一整排蟲變慢。' },
    weatherStation: { name:'氣象儀', vortex:'ice', targets:['ground','air'], range:fullRange, rate:1/3, damage:2, radius:1.3, lifetime:9, speed:1.9, piercesShield:true, color:'#628ab0', effect:'冰龍捲四處移動，讓碰到的蟲變慢。' },
    cryoPlasma: { ...TOOLS.molecular, name:'凍結電漿', delivery:'molecular', priority:'notFrozen', freezeSeconds:1.5, bossFreezeSeconds:.5, damage:7, rate:TOOLS.molecular.rate*2, aimSeconds:TOOLS.molecular.aimSeconds/2, flightSeconds:.18, color:'#647eb7', effect:'冰封一隻蟲，先找還能動的蟲。' }
  };
  Object.assign(weapons, frostWeapons);
  const flameWeapons = {
    heatRay: { ...TOOLS.pierce, name:'激光砲', delivery:'pierce', rate:.7, damage:TOOLS.pierce.damage+1, burnSeconds:TOOLS.flame.burnSeconds, color:'#be593c', effect:'熱光束穿過盾牌，點燃一整排蟲。' },
    fireStation: { ...frostWeapons.weatherStation, vortex:'fire', radius:1, rate:1/2.5, damage:1, lifetime:6, burnSeconds:TOOLS.flame.burnSeconds, color:'#ba6743', effect:'火龍捲四處移動，點燃碰到的蟲。' },
    moltenMortar: { ...TOOLS.flame, name:'熱熔炸彈塔', delivery:'flame', minRange:0, range:TOOLS.molecular.range, damage:5, rate:.2, flightSeconds:1, fuseSeconds:2, blastDamage:15, color:'#a75443', effect:'朝蟲群丟火石，先點火再爆炸。' }
  };
  Object.assign(weapons, flameWeapons);
  const beamWeapons = {
    recoilRay: {...TOOLS.pierce, name:'反動砲', delivery:'pierce', knockback:1/3, stunSeconds:.2, color:'#5f9988', effect:'光束穿過盾牌，把一整排蟲往後推。' },
    disintegrationBeam: {name:'分子崩解光束塔', targets:['ground','air'], range:5, chargeSeconds:.4, rate:2, damage:2, maxDamage:6, priority:'highestHp', piercesShield:true, color:'#5686af', effect:'照著同一隻蟲，光束越來越粗、越打越痛。換蟲要重新瞄準。' },
    gravityCannon: {...TOOLS.molecular, name:'黑洞砲', delivery:'molecular', radius:2.5, damage:20, splashDamage:1, edgePull:.1, stunSeconds:.2, aimSeconds:3, color:'#7261a7', effect:'瞄準蟲群開黑洞，越靠近中心吸力越強。' }
  };
  Object.assign(weapons,beamWeapons);
  const fusionUpgrades = {
    tacticalAir: {rate:weapons.tacticalAir.rate*1.3},
    tacticalGround: {rate:weapons.tacticalGround.rate*1.3},
    iceCannon: {rate:weapons.iceCannon.rate*1.4},
    fireCannon: {rate:weapons.fireCannon.rate*1.1, range:6, damage:weapons.fireCannon.damage+1},
    mapLaser: {rate:1, beamWidth:1.5, stunSeconds:.2, effect:'粗雷射能打到全場，沿直線穿過盾牌。'},
    impactCannon: {stunSeconds:.8, knockback:1.2, effect:'震波把四周的蟲推得更遠，暈得更久。'},
    magCannon: {chainRange:3, chainDamage:5, effect:'電漿球打中血最多的蟲，再彈向其他蟲。'},
    snowCannon: {damagePerCell:2},
    meteorTower: {effect:'隕石從天而降，燒出更大的十字形火地。'},
    cometCannon: {damage:4,radius:2.5,stunSeconds:.3,effect:'流星追著飛蟲跑，爆開時能震暈更大一群。'},
    sonicCannon: {damage:weapons.sonicCannon.damage+1,effect:'震暈九宮格的蟲，一樣多就先震飛蟲。'},
    crossCoil: {damage:8},
    frostfireJet: {rate:2.5,damage:3},
    cryoBeam: {beamWidth:1.7,stunSeconds:.2,effect:'更寬的冰光束穿過盾牌，讓整排蟲變慢。'},
    weatherStation: {radius:1.5,effect:'更大的冰龍捲四處移動，讓蟲變慢。'},
    cryoPlasma: {damage:12,freezeSeconds:2,effect:'冰封一隻蟲，小蟲會被凍住更久。'},
    heatRay: {beamWidth:1.7,effect:'更寬的熱光束穿過盾牌，點燃整排蟲。'},
    fireStation: {rate:.25,radius:1.5,fireTrail:true,effect:'火龍捲點燃蟲群，沿路留下火焰。'},
    moltenMortar: {damage:15,blastDamage:20,effect:'朝蟲群丟火石，點火後炸得更痛。'},
    recoilRay: {stunSeconds:.4,effect:'光束推開一整排蟲，讓牠們停得更久。'},
    disintegrationBeam: {rate:1/.3, damage:3, maxDamage:7},
    gravityCannon: {radius:3}
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
    bug: { name: '螞蟻', trait: '會沿著地上的路爬向城堡。', hp: 1, artSpan: 61, speed: 0.82, color: '#9e523e' },
    roach: { name: '小蟑螂', trait: '從卵裡彈出來，落地後爬向城堡。', hp: 1, artSpan: 64, speed: 0.82, color: '#a36b32' },
    shield: { name: '上盾蟲', trait: '帶著盔甲的蟲蟲，會抵擋來自上方的攻擊。', hp: 3, artSpan: 73, speed: 0.68, shield: 'up', color: '#d3a15d' },
    shield_down: { name: '下盾蟲', trait: '帶著盔甲的蟲蟲，會抵擋來自下方的攻擊。', hp: 3, artSpan: 73, speed: 0.68, shield: 'down', color: '#78ad9b' },
    hopper: { name: '跳蟲', trait: '第一次被打中時會跳起來，能跳過牆。', hp: 3, artSpan: 64, speed: 0.85, color: '#8caa55' },
    mother: { name: '母蟲', trait: '會下黃蛋，蛋裡會孵出飛蟲。', hp: 10, artSpan: 69, speed: 0.30, color: '#c58fa9' },
    flyer: { name: '飛蟲', airborne: true, trait: '會飛過牆，直接飛向城堡。', hp: 2, artSpan: 60, speed: .9, color: '#73a9bd' },
    splitter: { name: '蟑螂卵', trait: '會一路滾，打破會彈出 3 隻小蟑螂。', hp: 4, artSpan: 50, speed: 0.91, color: '#75b5a0' },
    rhinoBoss: { name: '獨角仙王', trait: '會展翅飛一小段，抄近路。', hp: 125, artSpan: 80, speed: .40, skillSeconds: 10, color: '#58687e' },
    spiderBoss: { name: '織網蜘蛛王', trait: '會吐網纏住砲塔，讓砲塔暫時停火。', hp: 190, artSpan: 86, speed: .34, skillSeconds: 5, color: '#7c5388' },
    stagBoss: { name: '巨顎鍬形蟲王', trait: '會用大顎撞壞一座塔或牆。', hp: 100, artSpan: 89, speed: .36, color: '#8a462e' },
    giant: { name: '金龜蟲', trait: '血厚，被打中會向前衝 1 格。', hp: 20, artSpan: 72, speed: 0.35, color: '#9e8266' },
    swift: { name: '蜈蚣', trait: '腳很多，跑得比螞蟻快一倍。', hp: 2, artSpan: 81, speed: 1.65, color: '#c57832' }
  };
  function health(kind, hp) {
    // Flyer groups specify their final hit points for each level.
    return kind === 'flyer' ? hp : hp * ENEMY_HEALTH_MULTIPLIER;
  }
  for (const [kind, enemy] of Object.entries(ENEMIES)) {
    enemy.hp = health(kind, enemy.hp);
    if (kind === 'giant' || kind === 'mother' || kind.endsWith('Boss')) enemy.speed *= 1.15;
  }
  const group = (kind, hp, count) => ({ kind, hp: health(kind, hp), count });
  const BONUS_LEVEL = 10;
  // Ten campaign stages and an optional challenge. Test selection uses the same
  // total budget that a lossless campaign has earned by the start of that wave.
  const stage = (name, entries, reward, ...waves) => ({ name, entries, reward, rocks: [], water: [], waves });
  const LEVELS = [
    stage('攻擊方向', [3, 1, 6], 12, [group('shield', 3, 6), group('bug', 3, 14)]),
    stage('上下夾擊', [1, 3, 5], 14, [group('shield', 4, 8), group('shield_down', 4, 8), group('bug', 3, 10)]),
    stage('快速包圍', [1, 2, 3, 5, 6], 14, [group('shield', 4, 7), group('shield_down', 4, 7), group('swift', 4, 9), group('bug', 3, 10), group('stagBoss', 100, 1)]),
    stage('越過防線', [1, 2, 3, 5, 6], 16, [group('hopper', 6, 10), group('shield', 6, 7), group('shield_down', 5, 7), group('swift', 5, 8), group('bug', 3, 7)]),
    stage('空中來襲', [1, 2, 3, 5, 6], 18, [group('flyer', 5, 8), group('hopper', 7, 8), group('shield', 6, 7), group('shield_down', 6, 7), group('swift', 5, 8), group('bug', 3, 8)]),
    stage('蟑螂卵群', [0, 1, 3, 4, 6, 7], 20, [group('splitter', 8, 8), group('flyer', 6, 8), group('hopper', 8, 8), group('shield', 7, 7), group('shield_down', 7, 6), group('swift', 6, 8), group('bug', 3, 8), group('rhinoBoss', 125, 1)]),
    stage('源源不絕', [0, 1, 3, 4, 6, 7], 24, [group('mother', 14, 3), group('splitter', 9, 9), group('flyer', 6, 12), group('hopper', 9, 10), group('shield', 8, 9), group('shield_down', 8, 9), group('swift', 7, 11), group('bug', 3, 9)]),
    stage('巨蟲壓境', [0, 1, 2, 3, 4, 5, 6, 7], 4, [group('giant', 38, 8), group('mother', 21, 4), group('splitter', 10, 11), group('flyer', 8, 16), group('hopper', 13, 11), group('shield', 11, 8), group('shield_down', 11, 8), group('swift', 10, 12), group('bug', 4, 10)]),
    stage('巨蟲浪潮', [0, 1, 2, 3, 4, 5, 6, 7], 28, [group('giant', 53, 11), group('mother', 27, 5), group('splitter', 12, 13), group('flyer', 11, 17), group('hopper', 16, 13), group('shield', 13, 9), group('shield_down', 13, 9), group('swift', 13, 14), group('bug', 5, 11)]),
    stage('最後防線', [0, 1, 2, 3, 4, 5, 6, 7], 22, [group('giant', 109, 16), group('mother', 45, 7), group('splitter', 24, 15), group('flyer', 14, 20), group('hopper', 26, 14), group('shield', 22, 11), group('shield_down', 22, 11), group('swift', 22, 18), group('bug', 6, 16), group('spiderBoss', 190, 1)]),
    stage('四面守園', [3], 0,
      [group('swift', 17, 12), group('mother', 43, 5), group('flyer', 16, 12), group('shield_down', 22, 12), group('stagBoss', 100, 1)],
      [group('giant', 109, 12), group('flyer', 16, 12), group('splitter', 24, 14), group('hopper', 25, 12), group('rhinoBoss', 125, 1)],
      [group('shield', 22, 12), group('giant', 109, 6), group('swift', 22, 12), group('mother', 40, 4), group('bug', 7, 18), group('spiderBoss', 190, 1)])
  ];
  const largestSpawnHp = Math.max(...LEVELS.flatMap(level => level.waves.flat().filter(g => !g.kind.endsWith('Boss')).map(g => g.hp)));
  const flyerHpByLevel = LEVELS.map(level => level.waves.flat().find(group => group.kind === 'flyer')?.hp ?? ENEMIES.flyer.hp);
  const PREVIOUS_BUDGETS = [42, 52, 64, 76, 90, 104, 120, 136, 154, 182];
  const GENEROUS_BUDGETS = [60, 75, 93, 111, 132, 153, 177, 201, 228, 270];
  const priorLateRewards = {7:24,8:36,9:24};
  const SPAWN_GAPS = [.50, .39, .36, .34, .32, .31, .30, .28, .25, .22, .42];
  let budget = 48;
  for (const [i, level] of LEVELS.entries()) {
    level.hearts = 5;
    level.goal = i === BONUS_LEVEL ? { c: 5, r: 3 } : GOAL;
    level.deploymentBonus = i >= BONUS_LEVEL - 1 ? 10 : 0;
    level.money = budget + level.deploymentBonus; budget += level.reward;
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
      castleUpgraded: false, castle: null, buildings: [], enemies: [], eggs: [], shots: [], effects: [], fires: [], vortices: [], queue: [], spawnClock: 0, nextMotherSpawnAt: 0,
      time: 0, revision: 0, nextId: 1, rngState: stageSeed(level), homeHits: [], undo: [], checkpoint: null,
      stats: { hits: 0, blocked: 0, defeated: 0, broken: 0, hatched: 0, split: 0, jumped: 0 }, waveStats: { hits: 0, blocked: 0, damageByTower: {} }
    };
  }
  function placementError(state, c, r) {
    if (!inside(c, r)) return '不能放這裡';
    if (isHome(state.level, c, r)) return '這裡是城堡';
    if (c === 0 || c === COLS - 1 || isEntrance(state.level, c, r) || terrain(state.level).has(key(c, r))) return '留給小蟲走';
    return '';
  }
  function canBuild(state, kind, c, r) {
    if (state.phase !== 'planning') return '開始後不能建造';
    if (!TOOLS[kind]) return '不能放這裡';
    const error = placementError(state, c, r);
    if (error) return error;
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
  function canMove(state, fromC, fromR, c, r) {
    if (state.phase !== 'planning') return '部署時才能移動';
    if (isHome(state.level, fromC, fromR)) return '城堡固定在這裡';
    if (!at(state, fromC, fromR)) return '請先選一座建築';
    return placementError(state, c, r) || (at(state, c, r) ? '請選空格' : '');
  }
  function moveBuilding(state, fromC, fromR, c, r) {
    const error = canMove(state, fromC, fromR, c, r);
    if (error) return { ok: false, error };
    const building = at(state, fromC, fromR);
    remember(state);
    building.c = c; building.r = r;
    state.revision++;
    return { ok: true };
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
    return { version: 22, fusionHammers: state.fusionHammers, castleUpgraded: state.castleUpgraded, lastReward: state.lastReward, upgradeItems: state.upgradeItems, bonusUnlocked: state.bonusUnlocked, level: state.level, wave: 0, completed: state.completed, money: state.money, hearts: state.hearts, rngState: state.rngState,
      buildings: state.buildings.map(({ secondary, ...building }) => clone(building)), stats: clone(state.stats),
      ...(state.phase === 'cleared' ? { awaitingNext: true } : {}),
      ...(state.replayCheckpoint ? {replayCheckpoint:clone(state.replayCheckpoint)} : {}) };
  }
  function restore(data) {
    if (!data || !Number.isInteger(data.version) || data.version < 1 || data.version > 22 || !Number.isInteger(data.level) || !LEVELS[data.level]) return null;
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
    const awaitingNext = data.awaitingNext === true && data.level < BONUS_LEVEL - 1 && !data.completed;
    const finishedLevel = data.completed || awaitingNext;
    const earned = data.level + Number(!!finishedLevel);
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
      const fusionEraPrices = kind => kind === 'pierce' ? [12, 15] : [TOOLS[kind].cost];
      const prices = kind => [PREVIOUS_PRICES[kind], VERSION9_PRICES[kind], ...fusionEraPrices(kind), ...(kind === 'molecular' ? [22] : [])];
      const fusionPrices = (base, added) => prices(base).flatMap(cost => fusionEraPrices(added).map(extra => cost + extra));
      const allowed = second ? [...fusionPrices(b.kind, second), ...fusionPrices(second, b.kind)] : prices(b.kind);
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
    const cleared = finishedLevel ? data.level : data.level - 1;
    if (cleared >= 0 && (data.completed || data.lastReward > 0)) {
      const reward = LEVELS[cleared].reward;
      if (data.lastReward === reward || (data.lastReward > 0 && data.lastReward === priorLateRewards[cleared])) state.lastReward = data.lastReward;
      else if (data.completed) state.lastReward = reward;
    }
    // A loaded deployment starts with a full home, including older saves.
    // Completed campaigns keep their final health for the result screen.
    state.money = data.money; state.hearts = data.version >= 6 && finishedLevel ? data.hearts : maxHearts;
    state.bonusUnlocked = (data.version >= 11 && data.bonusUnlocked === true) || (data.version >= 6 && data.completed === true);
    // Preserve old boards and funds; old sub-batches now restart as one stage.
    if (data.version < 5) state.money = Math.min(1000, state.money + [60, 80, 100][state.level] - [22, 25, 28][state.level]);
    // Normalize earlier economies, then apply the lower budget exactly once.
    // Existing purchases remain intact, with their original refund values.
    if (data.version === 6) state.money = Math.min(1000, state.money + GENEROUS_BUDGETS[state.level] - PREVIOUS_BUDGETS[state.level] + (data.completed ? 10 : 0));
    if (data.version < 9) state.money = Math.max(0, state.money - GENEROUS_BUDGETS[state.level] + LEVELS[state.level].money - (data.completed ? 30 - LEVELS[state.level].reward : 0));
    // Versions before 9 already use the current opening budget in the conversion above.
    const missedDeploymentBonus = (state.level === BONUS_LEVEL - 1 && data.version < 21) || (state.level === BONUS_LEVEL && data.version < 22);
    if (data.version >= 9 && missedDeploymentBonus) state.money = Math.min(1000, state.money + LEVELS[state.level].deploymentBonus);
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
    if (awaitingNext) state.phase = 'cleared';
    if (data.version >= 6 && data.completed) { state.completed = true; state.phase = 'won'; }
    if (Number.isInteger(data.rngState) && data.rngState > 0 && data.rngState <= 0xffffffff) state.rngState = data.rngState;
    if (data.stats) for (const k of Object.keys(state.stats)) if (Number.isInteger(data.stats[k]) && data.stats[k] >= 0) state.stats[k] = data.stats[k];
    const replay = data.replayCheckpoint;
    if (replay && replay.level === replayLevel(state) && !replay.completed && !replay.lastReward && !replay.replayCheckpoint) {
      const original = restore(replay);
      if (original) state.replayCheckpoint = snapshot(original);
    }
    return state;
  }
  const bonusBossSides = { stagBoss:'right', rhinoBoss:'left', spiderBoss:'top' };
  function spawnQueue(level, firstWave = 0) {
    const queue = [];
    const motherSpacing = Math.ceil(MOTHER_SPAWN_INTERVAL / LEVELS[level].spawnInterval);
    let nextMotherSlot = 0;
    let index = 0;
    const entries = entrances(level);
    for (let wave = firstWave; wave < LEVELS[level].waves.length; wave++) {
      const groups = LEVELS[level].waves[wave];
      const boss = groups.find(g => g.kind.endsWith('Boss'));
      const ordinary = groups.filter(g => g !== boss).sort((a,b) =>
        Number(b.kind === 'giant') - Number(a.kind === 'giant') || b.hp - a.hp);
      const pending = ordinary.flatMap(group => Array(group.count).fill(group));
      const total = pending.length + Number(!!boss);
      for (let slot = 0; slot < total; slot++) {
        let group = boss;
        if (!boss || slot !== 1) {
          const waitForMother = pending[0].kind === 'mother' && queue.length < nextMotherSlot;
          const next = waitForMother ? pending.findIndex(g => g.kind !== 'mother') : 0;
          [group] = pending.splice(Math.max(0, next), 1);
          if (group.kind === 'mother') nextMotherSlot = queue.length + motherSpacing;
        }
        const entry = level === BONUS_LEVEL && group === boss
          ? entries.find(gate => gate.side === bonusBossSides[group.kind])
          : entries[index++ % entries.length];
        queue.push({ kind: group.kind, hp: group.hp, wave, row: entry.r, position: { x: entry.c, y: entry.r } });
      }
    }
    return queue;
  }
  function startWave(state, _legacyBossPattern, webSeed) {
    if (state.phase !== 'planning') return false;
    state.homeHits = [];
    // Starting is explicit; no future stage is queued during deployment.
    state.replayCheckpoint = null;
    state.checkpoint = snapshot(state);
    state.checkpoint.lastReward = 0;
    state.undo = []; state.spawnClock = SPAWN_INTERVAL; state.nextMotherSpawnAt = 0;
    state.fires = []; state.effects = []; state.shots = []; state.vortices = []; state.eggs = []; state.lastReward = 0;
    state.waveStats = { hits: 0, blocked: 0, damageByTower: {} };
    state.castle = { kind: 'castle', id: 'castle', upgraded: state.castleUpgraded, ...LEVELS[state.level].goal, cooldown: 0, flash: 0, angle: 0 };
    state.webRng = { rngState: (webSeed ?? Math.floor(Math.random() * 4294967296)) >>> 0 || 1 };
    state.weatherRng = { rngState: (state.webRng.rngState ^ 0x61c88647) >>> 0 || 1 };
    state.gravityRng = { rngState: (state.webRng.rngState ^ 0x8acb17ed) >>> 0 || 1 };
    state.queue = spawnQueue(state.level, state.wave);
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
  function replayLevel(state) {
    if (state.phase === 'cleared' || state.phase === 'won') return state.level;
    if (state.phase === 'planning' && state.lastReward > 0 && state.level > 0) return state.level - 1;
    return null;
  }
  function replayVictory(state) {
    const level = replayLevel(state);
    if (level === null) return null;
    const original = restore(state.replayCheckpoint);
    if (original) return original;
    // Older victory saves only have the surviving board. Roll back its rewards
    // if that board is legal for the previous level, otherwise use its opening budget.
    const data = snapshot(state);
    data.level=level; data.completed=false; delete data.awaitingNext; data.lastReward=0; data.replayCheckpoint=null;
    data.money-=state.lastReward;
    if (level !== state.level) data.money-=LEVELS[state.level].deploymentBonus;
    data.upgradeItems--;
    if (hammerLevels.includes(level+1)) data.fusionHammers--;
    return restore(data) || createState(level);
  }
  function isAdvancing(state) { return state.phase === 'running'; }
  function togglePause(state) {
    if (state.phase === 'running') state.phase = 'paused';
    else if (state.phase === 'paused') state.phase = 'running';
  }
  function spawn(state, kind, hp = ENEMIES[kind].hp, row = 3, position = null) {
    const x = position?.x ?? COLS - 1, y = position?.y ?? row, c = Math.round(x), r = Math.round(y);
    const enemy = { id: state.nextId++, kind, hp, maxHp: hp, x, y, facing: 0,
      c, r, next: Math.hypot(x - c, y - r) > 1e-9 ? { c, r } : null, slow: 0, iceStacks: 0, flash: 0, shieldFlash: 0, burnCooldown: 0, burnTicks: 0, burnClock: 0, stun: 0, spikeStun: 0, shock: 0,
      push: null, leap: null, jumped: false, bornAt: state.time, attackClock: 0.65, attackId: null, dead: false };
    if (kind === 'mother') enemy.nextEggAt = state.time + EGG_LAY_INTERVAL;
    if (kind === 'splitter') enemy.rollDistance = 0;
    if (kind === 'swift') enemy.strideDistance = 0;
    if (kind === 'giant') { enemy.dashReadyAt = state.time; enemy.dashRemaining = 0; }
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
  const isAirborne = enemy => !!ENEMIES[enemy.kind]?.airborne || !!enemy.leap;
  function canTarget(kind, enemy, upgraded = false) {
    const air = isAirborne(enemy);
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
  function canApplyIce(enemy, time) {
    return enemy.frozenUntil == null || time + 1e-9 >= enemy.frozenUntil + THAW_IMMUNITY;
  }
  function freezeEnemy(state, enemy, seconds) {
    if (!canApplyIce(enemy, state.time)) return;
    enemy.frozenAt = state.time;
    enemy.frozenUntil = state.time + seconds * BATTLE_SPEED;
    enemy.iceStacks = 0;
    enemy.slow = 0;
  }
  function applyIce(state, enemy, layers = 1) {
    if (enemy.dead || !canApplyIce(enemy, state.time)) return;
    enemy.iceStacks += layers;
    if (enemy.iceStacks >= iceSpeedByStack.length) {
      freezeEnemy(state, enemy, enemy.kind.endsWith('Boss') ? .5 : 1.5);
    } else enemy.slow = TOOLS.frost.slowDuration;
  }
  function enemySpeed(enemy) {
    return ENEMIES[enemy.kind].speed * iceSpeedByStack[enemy.iceStacks];
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
      applyStop(enemy, 'spikeStun', tool.stunSeconds * BATTLE_SPEED);
    }
    if (blockHit(state, enemy, incoming)) return false;
    damageEnemy(state, enemy, options.damage ?? tool?.damage ?? 1, source.tower);
    if (enemy.dead) return true;
    if (!options.burst && ['iceCannon','snowCannon','cryoBeam','frostfireJet'].includes(weapon)) applyIce(state,enemy,tool.iceLayers);
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
      applyStop(enemy, weapon === 'recoilRay' ? 'shock' : 'stun', tool.stunSeconds * BATTLE_SPEED, true);
    }
    if (source.kind === 'push') {
      const limit = toolFor('push', source.upgraded).knockback;
      if (enemy.leap && source.upgraded) enemy.leap.punchLimit = limit;
      else if (!enemy.leap) {
        const distance = pushEnemy(state, enemy, limit);
        if (source.upgraded) applyStop(enemy,'stun',(tool.stunSeconds + Math.floor(limit - distance + 1e-8)) * BATTLE_SPEED, true);
      }
    }
    if (source.kind === 'pierce' && weapon !== 'recoilRay') applyStop(enemy, 'shock', tool.stunSeconds * BATTLE_SPEED);
    if (weapon === 'sonicCannon') applyStop(enemy, 'stun', tool.stunSeconds * BATTLE_SPEED);
    if (weapon === 'crossCoil') applyStop(enemy, 'shock', tool.stunSeconds * BATTLE_SPEED);
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
    if (enemy.kind === 'giant' && !enemy.dead && damage > 0 && !enemy.dashRemaining && state.time + 1e-9 >= enemy.dashReadyAt) {
      enemy.dashRemaining = 1;
    }
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
  function splitOffspring(state, parent) {
    const origin = {x:parent.x, y:parent.y};
    const radius = 3, available = [];
    for (let y = Math.ceil(parent.y - radius); y <= parent.y + radius; y++) {
      for (let x = Math.ceil(parent.x - radius); x <= parent.x + radius; x++) {
        if (Math.hypot(x - parent.x, y - parent.y) <= radius && freePoint(state,x,y)) available.push({x,y});
      }
    }
    const choices = available.slice();
    const positions = [];
    // Stage 6 (index 5) starts at 4 HP, then gains one HP per stage.
    const offspringHp = Math.max(ENEMIES.roach.hp, state.level - 1);
    for (let i = 0; i < 3; i++) {
      if (!choices.length) choices.push(...available);
      const [landing = {x:parent.c, y:parent.r}] = choices.splice(Math.floor(random(state) * choices.length), 1);
      const baby = spawn(state, 'roach', offspringHp, parent.r, origin);
      baby.next = null;
      baby.leap = {fromX:parent.x, fromY:parent.y, ...landing, age:0, duration:BATTLE_SPEED, split:true};
      faceTravel(baby, landing.x - parent.x, landing.y - parent.y);
      positions.push(landing);
    }
    return positions;
  }
  function killEnemy(state, enemy) {
    if (enemy.dead) return;
    enemy.dead = true; state.stats.defeated++;
    if (enemy.kind === 'splitter') {
      state.stats.split++;
      effect(state, 'split', enemy.x, enemy.y, { maxHp: enemy.maxHp, facing: enemy.facing, offspring: splitOffspring(state, enemy) });
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
  function dashInProgress(enemy) {
    return enemy.dashRemaining > 0 && enemy.dashRemaining < 1;
  }
  function applyStop(enemy, kind, duration, afterDisplacement = false) {
    const wait = dashInProgress(enemy) || (afterDisplacement && (enemy.push || enemy.leap || enemy.pull));
    const timers = wait ? (enemy.pendingStops ??= {}) : enemy;
    timers[kind] = Math.max(timers[kind] ?? 0, duration);
  }
  function finishMovementStop(enemy) {
    if (!enemy.pendingStops || dashInProgress(enemy) || enemy.push || enemy.pull || enemy.leap) return;
    for (const [kind, duration] of Object.entries(enemy.pendingStops)) enemy[kind] = Math.max(enemy[kind], duration);
    enemy.pendingStops = null;
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
  function ignite(state, x, y, upgraded = false, tower, seconds = toolFor('flame',upgraded).groundFireSeconds) {
    const c = Math.round(x), r = Math.round(y), life = seconds * BATTLE_SPEED;
    const existing = state.fires.find(f => f.c === c && f.r === r);
    if (existing) {
      existing.life = Math.max(existing.life,life);
      existing.tower = tower;
      if (upgraded) { existing.emberLife = life; existing.emberOwner = tower; }
      return;
    }
    state.fires.push({ id: state.nextId++, c, r, tower, emberOwner: upgraded ? tower : null, bornAt: state.time, emberLife: upgraded ? life : 0, life, clock: BATTLE_SPEED });
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
  // Both target selection and damage use the same finite beam.
  function beamContact(dx, dy, ux, uy, length, halfWidth) {
    const along = dx * ux + dy * uy;
    return along >= 0 && along <= length + 1e-9 && Math.abs(dx * uy - dy * ux) <= halfWidth + 1e-9;
  }
  function fireLaser(state, source) {
    const angle = source.angle * Math.PI / 180, ux = Math.cos(angle), uy = Math.sin(angle);
    const tool = toolFor(source.weapon ?? source.kind, source.upgraded), length = tool.range;
    const contacts = [], halfWidth = .32 * (tool.beamWidth || 1);
    for (const enemy of state.enemies) {
      if (!canTarget('pierce', enemy)) continue;
      const dx = enemy.x - source.c, dy = enemy.y - source.r;
      if (beamContact(dx,dy,ux,uy,length,halfWidth)) contacts.push({enemy, along:dx*ux + dy*uy});
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
          pullTowardCell(state,e,{c,r,upgraded:shot.upgraded,strength:.8 + .2*random(rng)});
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
        for (const cell of cells) ignite(state,cell.c,cell.r,false,shot.tower,TOOLS.flame.burnSeconds);
        effect(state,'moltenBlast',c,r,{cells,upgraded:shot.upgraded,duration:.82});
        return;
      }
      const struck = state.enemies.filter(e => canTarget('flame', e) && Math.round(e.x) === c && Math.round(e.y) === r);
      for (const enemy of struck) hit(state, enemy, shot);
      effect(state, 'stoneImpact', c, r, { upgraded: !!shot.upgraded });
      ignite(state,c,r,!shot.weapon && shot.upgraded,shot.tower,shot.weapon ? TOOLS.flame.burnSeconds : undefined);
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
  function pullTowardCell(state,enemy,pull) {
    const {c,r,strength} = pull;
    const {radius,edgePull,stunSeconds} = toolFor('gravityCannon',pull.upgraded);
    const dx = c-enemy.x, dy = r-enemy.y, distance = Math.hypot(dx,dy);
    const depth = Math.max(0, 1-distance/radius);
    const limit = edgePull + (radius-edgePull)*depth**2;
    const travel = Math.min(pull.maxTravel ?? Infinity, strength*Math.min(distance,limit));
    if (enemy.leap?.split) {
      // Landing can only shorten the displacement already earned at impact.
      enemy.leap.pullOnLanding = {...pull,maxTravel:travel};
      return;
    }
    const ground = !ENEMIES[enemy.kind].airborne, stunOnArrival = stunSeconds*BATTLE_SPEED;
    if (!inside(c,r) || (ground && !freePoint(state,c,r))) {
      applyStop(enemy,'stun',stunOnArrival,true);
      return;
    }
    const fraction = distance ? travel/distance : 0;
    let x = enemy.x+dx*fraction, y = enemy.y+dy*fraction;
    if (ground && !freePoint(state,x,y)) {
      if (!freePoint(state,enemy.x,enemy.y)) {
        // A jumping ground bug over an obstacle keeps its existing landing.
        applyStop(enemy,'stun',stunOnArrival,true);
        return;
      }
      // Back up to a free landing without increasing the pull past its distance limit.
      let free = 0, blocked = fraction;
      for (let i=0; i<10; i++) {
        const mid = (free+blocked)/2;
        if (freePoint(state,enemy.x+dx*mid,enemy.y+dy*mid)) free=mid;
        else blocked=mid;
      }
      x = enemy.x+dx*free; y = enemy.y+dy*free;
    }
    const lift=enemyLift(enemy,state.time);
    enemy.pull={fromX:enemy.x,fromY:enemy.y,c:Math.round(x),r:Math.round(y),x,y,lift,age:0,duration:.24*BATTLE_SPEED,stunOnArrival};
    enemy.next=null; enemy.push=null; enemy.attackId=null; enemy.attackClock=.65;
  }
  function damageCastle(state, enemy) {
    const goal = LEVELS[state.level].goal;
    state.hearts--;
    state.homeHits.push(enemy.kind);
    effect(state, 'home', goal.c, goal.r);
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
        applyStop(enemy,'stun',p.stunOnArrival,true);
        finishMovementStop(enemy);
      }
      return;
    }
    if (enemy.leap) {
      const p = enemy.leap; p.age += dt; const t = p.age >= p.duration - 1e-9 ? 1 : p.age / p.duration;
      faceTravel(enemy, p.x - p.fromX, p.y - p.fromY);
      enemy.x = p.fromX + (p.x - p.fromX) * t; enemy.y = p.fromY + (p.y - p.fromY) * t;
      if (t >= 1) {
        enemy.x = enemy.c = p.x; enemy.y = enemy.r = p.y; enemy.next = null; enemy.leap = null;
        if (p.pullOnLanding) pullTowardCell(state,enemy,p.pullOnLanding);
        if (p.landingPush || p.punchLimit) {
          const distance=pushEnemy(state,enemy,(p.landingPush ?? 0)+(p.punchLimit ?? 0),true);
          if (p.punchLimit) applyStop(enemy,'stun',(toolFor('push',true).stunSeconds+Math.floor(Math.max(0,p.punchLimit-distance)+1e-8))*BATTLE_SPEED,true);
        }
        if (p.snowDirection) pushWithSnow(state,enemy,p.snowDirection);
        finishMovementStop(enemy);
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
        finishMovementStop(enemy);
      }
      return;
    }
    const speed = enemySpeed(enemy);
    if (enemy.kind === 'flyer') {
      const dx = goal.c - enemy.x, dy = goal.r - enemy.y, distance = Math.hypot(dx, dy);
      faceTravel(enemy, dx, dy);
      const travel = speed * dt;
      if (distance <= travel) {
        enemy.x = goal.c; enemy.y = goal.r; enemy.dead = true; damageCastle(state, enemy);
      } else { enemy.x += dx / distance * travel; enemy.y += dy / distance * travel; enemy.c = Math.round(enemy.x); enemy.r = Math.round(enemy.y); }
      return;
    }
    const boss = enemy.siegeClock != null;
    if (boss && !enemy.next && Math.abs(goal.c - enemy.c) + Math.abs(goal.r - enemy.r) <= 1) {
      faceTravel(enemy, goal.c - enemy.x, goal.r - enemy.y);
      enemy.siegeClock -= dt;
      if (enemy.siegeClock <= 1e-9) {
        enemy.siegeClock += SIEGE_INTERVAL; damageCastle(state, enemy);
      }
      return;
    }
    if (boss) enemy.siegeClock = SIEGE_INTERVAL;
    if (enemy.c === goal.c && enemy.r === goal.r && !enemy.next) {
      enemy.dead = true; damageCastle(state, enemy); return;
    }
    if (!enemy.next) {
      const raid = enemy.kind === 'stagBoss' && !enemy.raided ? raidPath(state, enemy) : null;
      const path = raid || travelRoute(state, enemy.c, enemy.r).path;
      if (path.length < 2) return;
      const next = path[1], obstacle = at(state, next.c, next.r);
      if (obstacle) {
        // A charge waiting for its first step is still available when the wall falls.
        if (dashInProgress(enemy)) {
          enemy.dashRemaining = 0;
          finishMovementStop(enemy);
        }
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
    const step = enemy.dashRemaining ? Math.min(enemy.dashRemaining, SCARAB_DASH_SPEED * iceSpeedByStack[enemy.iceStacks] * dt) : speed * dt;
    if (enemy.kind === 'swift') enemy.strideDistance += Math.min(dist, step);
    if (enemy.dashRemaining && dist > 0) {
      if (enemy.dashRemaining === 1) enemy.dashReadyAt = state.time - dt + SCARAB_DASH_COOLDOWN;
      enemy.lastDashStepAt = state.time;
      enemy.dashRemaining -= Math.min(dist, step);
      if (enemy.dashRemaining < 1e-9) {
        enemy.dashRemaining = 0;
        finishMovementStop(enemy);
      }
    }
    if (dist <= step) {
      enemy.x = enemy.c = enemy.next.c; enemy.y = enemy.r = enemy.next.r; enemy.next = null;
    } else { enemy.x += dx / dist * step; enemy.y += dy / dist * step; }
  }
  const cardinal = [[-1,0],[1,0],[0,-1],[0,1]];
  const cross = [[0,0],...cardinal];
  const square = [...cross,[-1,-1],[-1,1],[1,-1],[1,1]];
  const attackPatterns = { meteorTower:cross, sonicCannon:cross, crossCoil:cardinal, frostfireJet:square, moltenMortar:square };
  const longCross = [...cross,...cardinal.map(([x,y])=>[2*x,2*y])];
  function attackPattern(weapon, upgraded) {
    if (upgraded && weapon === 'meteorTower') return longCross;
    if (upgraded && weapon === 'sonicCannon') return square;
    return attackPatterns[weapon];
  }
  function attackCells(weapon, c, r, upgraded = false) {
    return attackPattern(weapon,upgraded).map(([dc,dr]) => ({c:c+dc, r:r+dr})).filter(p => inside(p.c,p.r));
  }
  function strikeCells(state, source) {
    const cells = attackCells(source.kind, source.impactX, source.impactY, source.upgraded);
    const targets = occupantsOfCells(state,source.kind,cells);
    for (const e of targets) hit(state, e, source);
    if (source.kind === 'meteorTower') for (const cell of cells) ignite(state,cell.c,cell.r,false,source.tower,TOOLS.flame.burnSeconds);
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
      shot.x = c + tool.muzzleOffset * shot.dx; shot.y = r + tool.muzzleOffset * shot.dy;
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
  function snowRadius(distanceFromTower) {
    const tool = cannonWeapons.snowCannon;
    return (1 + tool.diameterGrowth * Math.max(0,distanceFromTower - tool.muzzleOffset)) / 2;
  }
  function snowDamage(tool, cell) {
    return tool.damage + Math.max(0, cell - 1) * tool.damagePerCell;
  }
  function rollSnow(state, shot, dt) {
    const tool = toolFor(shot.kind,shot.upgraded);
    const fromX = shot.x, fromY = shot.y;
    const fromDistance = (fromX - shot.c) * shot.dx + (fromY - shot.r) * shot.dy;
    const startRadius = snowRadius(fromDistance), growth = tool.diameterGrowth / 2;
    let travel = tool.speed * dt / BATTLE_SPEED;
    const nextCell = Math.floor(fromDistance + .5) + 1, face = nextCell - .5;
    const c = shot.c + nextCell * shot.dx, r = shot.r + nextCell * shot.dy;
    const wallAhead = at(state,c,r)?.kind === 'wall';
    const collision = fromDistance + travel >= face - 1e-9 && (!inside(c,r) || wallAhead);
    if (collision) travel = Math.max(0,face - fromDistance);
    shot.x += shot.dx * travel; shot.y += shot.dy * travel;
    for (let i = 0, count = state.enemies.length; i < count; i++) {
      const e = state.enemies[i];
      if (!canTarget(shot.kind, e) || shot.hitIds.includes(e.id)) continue;
      const ahead = (e.x - fromX) * shot.dx + (e.y - fromY) * shot.dy;
      const across = shot.dx ? e.y - fromY : e.x - fromX;
      // Along this step the center and radius both move linearly. Test the point
      // where squared center distance minus squared radius is smallest.
      const t = Math.max(0, Math.min(travel, (ahead + startRadius * growth) / (1 - growth * growth)));
      const radius = startRadius + t * growth;
      if ((ahead - t) ** 2 + across ** 2 > radius ** 2) continue;
      const cell = Math.round(fromDistance + ahead);
      if (wallAhead && cell >= nextCell) continue;
      shot.hitIds.push(e.id);
      const damage = snowDamage(tool, cell);
      if (hit(state, e, shot, {damage})) {
        if (!e.dead) pushWithSnow(state,e,shot);
        effect(state, 'snowContact', e.x, e.y);
      }
    }
    if (!collision) return;
    shot.x = shot.c + face * shot.dx; shot.y = shot.r + face * shot.dy;
    const damage = Math.max(1,Math.floor(snowDamage(tool, nextCell-1) / 2));
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
      if (!e.dead) applyStop(e, 'stun', tool.stunSeconds * BATTLE_SPEED);
    }
    effect(state,'cometBurst',contact.x,contact.y,{lift:enemyLift(contact,state.time),radius:tool.radius,upgraded:shot.upgraded,duration:.85});
    return true;
  }
  function summonVortex(state, tower, weapon) {
    state.vortices.push({ id:state.nextId++, weapon, upgraded:tower.upgraded, tower:tower.id, x:tower.c, y:tower.r, age:0, nextPulse:BATTLE_SPEED,
      destX:tower.c, destY:tower.r, contacts:new Set() });
  }
  function chooseVortexDestination(state, v) {
    const rng = state.weatherRng;
    v.destX = random(rng)*(COLS-1); v.destY = random(rng)*(ROWS-1);
    if (state.enemies.length < 2 || random(rng) >= .45) return;
    // Compare three random waypoints. A lone bug cannot steer the vortex.
    let bestCount = 1;
    for (let i=0; i<3; i++) {
      const x = i ? random(rng)*(COLS-1) : v.destX, y = i ? random(rng)*(ROWS-1) : v.destY;
      let count = 0;
      for (const e of state.enemies) {
        if (!e.dead && (e.x-x)**2 + (e.y-y)**2 <= 2.5**2) count++;
      }
      if (count > bestCount) { bestCount=count; v.destX=x; v.destY=y; }
    }
  }
  function updateVortices(state, dt) {
    for (const v of state.vortices) {
      const tool = toolFor(v.weapon,v.upgraded), duration = tool.lifetime * BATTLE_SPEED;
      const elapsed = Math.min(dt,duration-v.age);
      v.age += elapsed;
      let distance = Math.hypot(v.destX-v.x,v.destY-v.y);
      if (distance < .05) {
        chooseVortexDestination(state,v);
        distance = Math.hypot(v.destX-v.x,v.destY-v.y);
      }
      const travel = distance ? Math.min(1,tool.speed*elapsed/(distance*BATTLE_SPEED)) : 0;
      v.x += (v.destX-v.x)*travel; v.y += (v.destY-v.y)*travel;
      if (tool.fireTrail) {
        const cell = key(Math.round(v.x),Math.round(v.y));
        if (cell !== v.trailCell) { ignite(state,v.x,v.y,false,v.tower,tool.burnSeconds); v.trailCell=cell; }
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
  function chooseCatapultCell(state, tower, tool) {
    const landing = tool.flightSeconds * BATTLE_SPEED;
    const horizon = landing + tool.groundFireSeconds * BATTLE_SPEED;
    const min = tool.minRange ** 2, max = tool.range ** 2;
    const cells = new Map(), goal = LEVELS[state.level].goal;
    function countVisit(c, r, enter, leave) {
      const distance = (c-tower.c)**2 + (r-tower.r)**2;
      if (distance <= min || distance > max || leave < landing || enter > horizon || isHome(state.level,c,r)) return;
      const index = r*COLS+c;
      let cell = cells.get(index);
      if (!cell) {
        cell = {x:c, y:r, visits:0, atLanding:0, arrival:0, home:Math.abs(c-goal.c)+Math.abs(r-goal.r)};
        cells.set(index,cell);
      }
      cell.visits++;
      if (enter <= landing) cell.atLanding++;
      cell.arrival += Math.max(0,enter-landing);
    }
    for (const e of state.enemies) {
      const distance = (e.x-tower.c)**2 + (e.y-tower.r)**2;
      if (distance <= min || distance > max || !canTarget('flame',e)) continue;
      const c = Math.round(e.x), r = Math.round(e.y);
      const wait = Math.max(e.stun,e.shock,e.spikeStun,(e.frozenUntil ?? 0)-state.time,0);
      const sieging = e.siegeClock != null && !e.next && Math.abs(c-goal.c)+Math.abs(r-goal.r)<=1;
      if (wait >= horizon || e.attackId || sieging || e.push || e.pull) {
        countVisit(c,r,0,horizon);
        continue;
      }
      const next = e.next ?? {c:e.c,r:e.r};
      const route = travelRoute(state,next.c,next.r), speed = enemySpeed(e), halfCell = .5/speed;
      let center = wait + Math.hypot(next.c-e.x,next.r-e.y)/speed;
      const onFirstCell = c===next.c && r===next.r;
      if (!onFirstCell) countVisit(c,r,0,Math.max(wait,center-halfCell));
      for (let i=0;i<route.path.length && center-halfCell<=horizon;i++,center+=1/speed) {
        const p=route.path[i];
        if (route.breaking && at(state,p.c,p.r)) break;
        countVisit(p.c,p.r,i===0 && onFirstCell ? 0 : Math.max(wait,center-halfCell),center+halfCell);
      }
    }
    let best = null;
    for (const cell of cells.values()) {
      if (!best || cell.visits>best.visits || (cell.visits===best.visits && (cell.atLanding>best.atLanding ||
          (cell.atLanding===best.atLanding && (cell.arrival<best.arrival ||
          (cell.arrival===best.arrival && cell.home<best.home)))))) best=cell;
    }
    return best;
  }
  function chooseBlastCell(state, tower, weapon, tool) {
    if (!state.enemies.length) return null;
    const pattern = attackPattern(weapon,tower.upgraded);
    const occupants = new Uint16Array(COLS * ROWS), candidates = new Set();
    const flyers = weapon === 'sonicCannon' ? new Uint16Array(occupants.length) : null;
    const rangeSquared = tool.range ** 2;
    for (const enemy of state.enemies) {
      if (!canTarget(weapon,enemy,tower.upgraded)) continue;
      const c = Math.round(enemy.x), r = Math.round(enemy.y);
      if (!inside(c,r)) continue;
      occupants[r*COLS+c]++;
      if (flyers && isAirborne(enemy)) flyers[r*COLS+c]++;
      // A shot needs a target in reach. Neighbours just outside reach can still be hit.
      const dx = (weapon === 'sonicCannon' ? c : enemy.x) - tower.c;
      const dy = (weapon === 'sonicCannon' ? r : enemy.y) - tower.r;
      if (dx*dx + dy*dy > rangeSquared) continue;
      for (const [dc,dr] of pattern) {
        const x = c-dc, y = r-dr;
        if (inside(x,y) && (x-tower.c)**2+(y-tower.r)**2 <= rangeSquared) candidates.add(y*COLS+x);
      }
    }
    const goal = LEVELS[state.level].goal;
    let best = null, bestCount = 0, bestAir = 0, bestCenter = 0, bestHome = Infinity;
    for (const index of candidates) {
      const x = index % COLS, y = Math.floor(index / COLS);
      let count = 0, air = 0;
      for (const [dc,dr] of pattern) {
        if (!inside(x+dc,y+dr)) continue;
        const cell = (y+dr)*COLS+x+dc;
        count += occupants[cell];
        if (flyers) air += flyers[cell];
      }
      const center = occupants[index], home = Math.abs(x-goal.c)+Math.abs(y-goal.r);
      if (count > bestCount || (count === bestCount &&
          (air > bestAir || (air === bestAir && (center > bestCenter || (center === bestCenter && home < bestHome)))))) {
        best = {x,y}; bestCount = count; bestAir = air; bestCenter = center; bestHome = home;
      }
    }
    return best;
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
  function chooseBeamTarget(state, tower, tool) {
    // Try one actual target per angular sector only when the weapon is ready.
    const sectors = new Array(24), contacts = [], goal = LEVELS[state.level].goal;
    const halfWidth = .32 * (tool.beamWidth || 1), rangeSquared = tool.range ** 2;
    for (const enemy of state.enemies) {
      if (!canTarget('pierce', enemy)) continue;
      const dx = enemy.x - tower.c, dy = enemy.y - tower.r, distanceSquared = dx*dx + dy*dy;
      if (distanceSquared > rangeSquared + halfWidth ** 2) continue;
      contacts.push({dx,dy});
      if (distanceSquared > rangeSquared) continue;
      const angle = Math.atan2(dy,dx);
      const sector = (Math.round(angle * sectors.length / (2*Math.PI)) + sectors.length) % sectors.length;
      const home = Math.abs(enemy.x-goal.c) + Math.abs(enemy.y-goal.r), prior = sectors[sector];
      if (!prior || home < prior.home || (home === prior.home && enemy.id < prior.enemy.id)) {
        sectors[sector] = {enemy, home, ux:Math.cos(angle), uy:Math.sin(angle)};
      }
    }
    let best = null, bestCount = 0;
    for (const candidate of sectors) {
      if (!candidate) continue;
      let count = 0;
      for (const {dx,dy} of contacts) {
        if (beamContact(dx,dy,candidate.ux,candidate.uy,tool.range,halfWidth)) count++;
      }
      if (!best || count > bestCount || (count === bestCount && (candidate.home < best.home ||
          (candidate.home === best.home && candidate.enemy.id < best.enemy.id)))) {
        best = candidate; bestCount = count;
      }
    }
    return best?.enemy;
  }
  function otherPlasmaTargets(state, tower) {
    const counts = new Map();
    function count(target) { counts.set(target, (counts.get(target) ?? 0) + 1); }
    for (const other of state.buildings) {
      if (other !== tower && other.aim?.target != null && primaryWeapon(other) === 'molecular') count(other.aim.target);
    }
    // Keep a target reserved during the handoff from aiming to projectile flight.
    for (const shot of state.shots) {
      if ((shot.weapon ?? shot.kind) === 'molecular' && shot.tower !== tower.id) count(shot.target);
    }
    return counts;
  }
  function chooseTarget(state, tower, weapon, tool) {
    if (weapon === 'flame') return chooseCatapultCell(state,tower,tool);
    if ((tool.delivery ?? weapon) === 'pierce') return chooseBeamTarget(state,tower,tool);
    if (weapon === 'snowCannon') return chooseSnowLane(state, tower);
    if (weapon === 'sonicCannon' || weapon === 'moltenMortar') return chooseBlastCell(state,tower,weapon,tool);
    const goal = LEVELS[state.level].goal;
    const rangeSquared = tool.range * tool.range;
    const plasmaTargets = weapon === 'molecular' && state.enemies.length > 1 ? otherPlasmaTargets(state, tower) : null;
    let best = null, bestPriority = Infinity, bestTie = Infinity, bestHome = Infinity;
    for (const enemy of state.enemies) {
      const dx = enemy.x - tower.c, dy = enemy.y - tower.r;
      let distanceSquared = dx * dx + dy * dy;
      if (weapon === 'frostfireJet') {
        const dc = Math.round(enemy.x) - tower.c, dr = Math.round(enemy.y) - tower.r;
        distanceSquared = Math.max(dc * dc, dr * dr);
      }
      if (distanceSquared > rangeSquared || (tool.minRange && distanceSquared <= tool.minRange ** 2) || !canTarget(weapon, enemy, tower.upgraded)) continue;
      const locked = enemy.id === tower.aim?.target;
      const iceBlocked = !canApplyIce(enemy, state.time);
      const claims = plasmaTargets?.get(enemy.id) ?? 0;
      if (locked && !claims && !(tool.priority === 'notFrozen' && iceBlocked)) return enemy;
      let priority, tie = 0;
      if (plasmaTargets) {
        priority = claims;
        tie = locked ? -Infinity : -enemy.hp;
      } else {
        priority = tool.priority === 'highestHp' ? -enemy.hp : Number((weapon === 'pea' && !isAirborne(enemy)) || (tool.priority === 'notFrozen' && iceBlocked) || (tool.priority === 'unfrozen' && (enemy.slow > 0 || iceBlocked)) || (tool.priority === 'unburned' && enemy.burnTicks > 0));
        if (tool.priority === 'notFrozen') tie = locked ? -Infinity : -enemy.hp;
      }
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
    if ((weapon === 'flame' || kind === 'pierce' || tool.delay || weapon === 'cometCannon' || weapon === 'snowCannon' || weapon === 'moltenMortar') && b.cooldown > 0) return;
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
      if (b.aim?.target !== target.id) b.aim = {target:target.id, damage:0, remaining:tool.chargeSeconds * BATTLE_SPEED};
      b.angle=Math.atan2(target.y-b.r,target.x-b.c)*180/Math.PI;
      b.aim.remaining -= dt;
      if (b.aim.remaining <= 1e-9) {
        b.aim.damage = b.aim.damage ? Math.min(tool.maxDamage, b.aim.damage + 1) : tool.damage;
        b.aim.remaining += BATTLE_SPEED / tool.rate;
        b.flash=1;
        hit(state,target,{kind:weapon,upgraded:b.upgraded,tower:b.id,c:b.c,r:b.r},{damage:b.aim.damage});
        effect(state,'disintegrateHit',target.x,target.y,{lift:enemyLift(target,state.time),strength:b.aim.damage,
          ...(target.dead ? {fromC:b.c,fromR:b.r,upgraded:b.upgraded} : {})});
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
    if (!target) { b.aim = null; b.cooldown = Math.max(0, b.cooldown); return; }
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
        effect(state,'frostfireSpray',b.c,b.r,{angle:b.angle,impactX:aimX,impactY:aimY,upgraded:b.upgraded,duration:.17*BATTLE_SPEED});
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
            const speed = enemySpeed(target);
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
  function advanceLevel(state) {
    if (state.phase !== 'cleared') return false;
    state.level++;
    state.money += LEVELS[state.level].deploymentBonus;
    state.wave = 0;
    state.hearts = LEVELS[state.level].hearts + Number(state.castleUpgraded);
    state.rngState = stageSeed(state.level);
    state.phase = 'planning';
    clearReservedBuildings(state);
    state.revision++;
    return true;
  }
  function step(state, dt, waitForNext = false) {
    if (!isAdvancing(state) || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05);
    state.time += dt;
    state.spawnClock -= dt;
    if (state.queue.length && state.spawnClock <= 0) {
      const item = state.queue.shift();
      if (Number.isInteger(item.wave)) state.wave = item.wave;
      spawn(state, item.kind, item.hp, item.row, item.position);
      state.spawnClock += LEVELS[state.level].spawnInterval;
      if (item.kind === 'mother') state.nextMotherSpawnAt = state.time + MOTHER_SPAWN_INTERVAL;
      if (state.queue[0]?.kind === 'mother') {
        state.spawnClock = Math.max(state.spawnClock, state.nextMotherSpawnAt - state.time);
      }
    }
    // New hatchlings begin moving next tick. Capture the count without copying the swarm.
    for (let i = 0, count = state.enemies.length; i < count; i++) {
      const enemy = state.enemies[i];
      if (enemy.dead) continue;
      const fromX = enemy.x, fromY = enemy.y;
      if (enemy.slow > 0) {
        enemy.slow -= dt;
        if (enemy.slow <= 1e-9) { enemy.slow = 0; enemy.iceStacks = 0; }
      }
      enemy.flash = Math.max(0, enemy.flash - dt); enemy.shieldFlash = Math.max(0, enemy.shieldFlash - dt);
      const frozen = enemy.frozenUntil > state.time - dt + 1e-9;
      if (enemy.leap?.split || (!frozen && !enemy.pull && enemy.kind === 'rhinoBoss' && enemy.leap)) {
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
      if (enemy.kind === 'splitter') enemy.rollDistance += Math.hypot(enemy.x - fromX,enemy.y - fromY);
      if (enemy.kind === 'mother' && !enemy.dead && state.time + 1e-9 >= enemy.nextEggAt) {
        state.eggs.push({c:Math.round(enemy.x), r:Math.round(enemy.y), hatchAt:state.time + EGG_INCUBATION});
        enemy.nextEggAt += EGG_LAY_INTERVAL;
      }
      if (state.hearts === 0) { state.phase = 'lost'; break; }
    }
    if (state.phase === 'lost') {
      finishDamage(state, state.buildings);
      if (state.checkpoint) finishDamage(state, state.checkpoint.buildings);
      state.enemies = state.enemies.filter(e => !e.dead);
      return;
    }
    while (state.eggs.length && state.eggs[0].hatchAt <= state.time + 1e-9) {
      const egg = state.eggs.shift();
      spawn(state, 'flyer', flyerHpByLevel[state.level], egg.r, {x:egg.c, y:egg.r});
      effect(state, 'hatch', egg.c, egg.r);
      state.stats.hatched++;
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
    if (!state.queue.length && !state.enemies.length && !state.eggs.length && state.shots.every(shot => shot.kind === 'snowCannon')) {
      state.shots = [];
      state.lastReward = LEVELS[state.level].reward;
      state.money += state.lastReward; state.upgradeItems++;
      state.vortices = [];
      if (hammerLevels.includes(state.level + 1)) state.fusionHammers++;
      state.replayCheckpoint = state.checkpoint;
      state.undo = []; state.checkpoint = null; state.castle = null; state.revision++;
      finishDamage(state, state.buildings);
      for (const b of state.buildings) { b.aim = null; b.webUntil = 0; delete b.secondary; }
      if (state.level >= BONUS_LEVEL - 1) { state.bonusUnlocked = true; state.completed = true; state.phase = 'won'; }
      else {
        state.phase = 'cleared';
        if (!waitForNext) advanceLevel(state);
      }
      // Surviving buildings and funds carry over; each new stage heals the home.
      // The last fire
      // remains visible during deployment, then clears when the player starts.
    }
  }
  return { COLS, ROWS, BONUS_LEVEL, BATTLE_SPEED, RECOIL_SECONDS, SPAWN_INTERVAL, GOAL, TOOLS, ENEMIES, LEVELS, key, terrain, at, entrances, isEntrance, isHome, findPath, route, previews,
    maxSlowStacks: iceSpeedByStack.length-1, spawnQueue, toolFor, primaryWeapon, secondaryWeapon, fusionRecipe, attackCells, snowRadius, buildingHP, buildingName, hammerLevels, createState, canBuild, build, canMove, moveBuilding, upgrade, downgrade, remove, undo, snapshot, restore, startWave, advanceLevel, retry, replayLevel, replayVictory, isAdvancing, togglePause, spawn, canTarget, shieldBlocks, enemyArtScale, enemyLift, impactPoint, hit, pushEnemy, ignite, updateFires, resolveShot, jumpLanding, startLeap, step };
});
