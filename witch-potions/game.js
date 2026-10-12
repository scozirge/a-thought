(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Potions = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const ingredients = [
    { id: 'A', name: '玫瑰露', symbol: '✿', description: '讓心情冒出粉紅泡泡' },
    { id: 'B', name: '月光水', symbol: '☾', description: '盛著一小片溫柔月光' },
    { id: 'C', name: '幽靈黏液', symbol: '✧', description: '黏答答的變身魔法' }
  ];
  const levels = [
    {
      id: 'love', name: '可愛藥水', customer: '想變可愛的狼人', character: 'wolf',
      quote: '我想變得可愛！可以讓我變可愛，身旁冒出愛心泡泡嗎？',
      capacities: [5, 3], recipe: [2, 3, 0], lesson: '用容量差，留下需要的份量。',
      hint: '先把 3 份月光水加進鍋裡。空下來的小杯，可以從 5 份玫瑰露裡分走 3 份。',
      success: '噗！狼人變得好可愛，身旁冒出一顆顆愛心泡泡，開心地搖起尾巴。',
      failure: '噗嚕！泡泡大到把狼人的鼻子包住了！再調整一下配方吧。',
      solution: [['fill', 1, 1], ['pot', 1], ['fill', 0, 0], ['pour', 0, 1], ['pot', 0]]
    },
    {
      id: 'poison', name: '除草毒藥', customer: '骷髏園丁', character: 'skeleton',
      quote: '花園的魔法雜草一直咬我的鏟子！幫我調一瓶除草毒藥吧。',
      capacities: [3, 2], recipe: [0, 3, 1], lesson: '沒有 1 份杯，也能量出 1 份。',
      hint: '先加入 3 份月光水。把 3 份幽靈黏液倒滿 2 份杯，原來的杯裡會剩下多少？',
      success: '咻！亂咬人的雜草縮成小豆芽，骷髏園丁終於能安心種花了。',
      failure: '哎呀！雜草打了一個嗝，竟然長出了蝴蝶結。配方還差一點！',
      solution: [['fill', 0, 1], ['pot', 0], ['fill', 0, 2], ['pour', 0, 1], ['pot', 0]]
    },
    {
      id: 'frog', name: '青蛙變身藥水', customer: '掉了戒指的騎士', character: 'knight',
      quote: '我的戒指掉進池塘了！想變成青蛙，潛下去找找看。',
      capacities: [3, 2], recipe: [1, 2, 3], lesson: '安排順序，讓空杯接著派上用場。',
      hint: '先用小杯加入 2 份月光水。再用它分走大杯裡的 2 份玫瑰露，留下 1 份玫瑰露。',
      success: '呱！騎士變成戴頭盔的小青蛙，一個漂亮的跳水，找回了戒指！',
      failure: '呱？只有頭盔變成青蛙了！騎士和頭盔一起眨了眨眼睛。',
      solution: [['fill', 1, 1], ['pot', 1], ['fill', 0, 0], ['pour', 0, 1], ['pot', 0], ['fill', 0, 2], ['pot', 0]]
    },
    {
      id: 'cat', name: '黑貓變身藥水', customer: '想溜進城堡的南瓜精', character: 'pumpkin',
      quote: '城堡的門鎖住了，但旁邊有個小洞。讓我變成黑貓鑽進去吧！',
      capacities: [4, 3], recipe: [2, 1, 0], lesson: '利用杯子剩下的空間，再分出需要的量。',
      hint: '先用 4 − 3 留下 1 份月光水。量玫瑰露時，讓大杯先裝 3 份，它就只能再接收 1 份。',
      success: '喵！南瓜精變成戴南瓜帽的黑貓，尾巴一甩，輕輕鑽進了城堡。',
      failure: '喵嗚！南瓜精只有耳朵變成貓耳，圓圓的肚子還是卡在洞口。',
      solution: [['fill', 0, 1], ['pour', 0, 1], ['pot', 0], ['empty', 1], ['fill', 1, 0], ['pour', 1, 0], ['fill', 1, 0], ['pour', 1, 0], ['pot', 1]]
    }
  ];
  function initial() { return { cups: [{ ingredient: null, amount: 0 }, { ingredient: null, amount: 0 }], pot: [0, 0, 0] }; }
  function copy(state) { return { cups: state.cups.map(cup => ({ ...cup })), pot: [...state.pot] }; }
  function cupName(index) { return index === 0 ? '大杯' : '小杯'; }
  function describe(action) {
    const [kind, index, other] = action;
    if (kind === 'fill') return `${ingredients[other].name} → ${cupName(index)}（補滿）`;
    if (kind === 'pour') return `${cupName(index)} → ${cupName(other)}`;
    if (kind === 'pot') return `${cupName(index)} → 大鍋（倒空）`;
    if (kind === 'empty') return `${cupName(index)} → 廢液桶（倒空）`;
    return '';
  }
  function apply(level, state, action) {
    const fail = message => ({ ok: false, state, message });
    if (!Array.isArray(action)) return fail('請先選擇來源。');
    const [kind, index, other] = action;
    if (![0, 1].includes(index)) return fail('請選擇一個量杯。');
    const next = copy(state);
    const source = next.cups[index];
    let moved = 0;
    if (kind === 'fill') {
      if (![0, 1, 2].includes(other)) return fail('請選擇原料。');
      if (source.amount && source.ingredient !== other) return fail(`杯裡還有${ingredients[source.ingredient].name}，先倒空才能換原料。`);
      moved = level.capacities[index] - source.amount;
      if (moved <= 0) return fail('這個杯子已經滿了。');
      source.ingredient = other;
      source.amount = level.capacities[index];
    } else if (kind === 'pour') {
      if (![0, 1].includes(other) || other === index) return fail('請選另一個杯子。');
      const target = next.cups[other];
      if (!source.amount) return fail('這個杯子是空的，先裝一點原料吧。');
      if (target.amount && target.ingredient !== source.ingredient) return fail('不同原料要在大鍋裡混合；請先把接收的杯子倒空。');
      moved = Math.min(source.amount, level.capacities[other] - target.amount);
      if (moved <= 0) return fail('接收的杯子已經滿了。');
      target.ingredient = source.ingredient;
      target.amount += moved;
      source.amount -= moved;
      if (!source.amount) source.ingredient = null;
    } else if (kind === 'pot' || kind === 'empty') {
      if (!source.amount) return fail('這個杯子是空的。');
      moved = source.amount;
      if (kind === 'pot') {
        if (next.pot.reduce((sum, amount) => sum + amount, 0) + moved > 100) return fail('大鍋裝不下了，請重來或返回上一步。');
        next.pot[source.ingredient] += moved;
      }
      source.amount = 0;
      source.ingredient = null;
    } else return fail('不認得這個動作。');
    return { ok: true, state: next, moved, message: describe(action) };
  }
  function verdict(level, state) {
    return { success: level.recipe.every((amount, i) => state.pot[i] === amount), differences: level.recipe.map((amount, i) => Math.sign(state.pot[i] - amount)) };
  }
  function replay(level, actions) {
    let state = initial();
    for (const action of actions) {
      const result = apply(level, state, action);
      if (!result.ok) throw new Error(result.message);
      state = result.state;
    }
    return state;
  }
  return { ingredients, levels, initial, apply, verdict, replay, describe, cupName };
});
