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
      id: "love",
      name: "戀愛藥水",
      customer: "準備告白的狼人",
      character: "wolf",
      quote: "想勇敢告白，讓我冒出愛心吧！",
      capacities: [5,3],
      recipe: [5,3,0],
      lesson: "裝滿，再倒進大鍋。",
      hint: "大杯裝滿玫瑰露，倒進鍋裡；小杯裝滿月光水，也倒進鍋裡。按「完成」就好囉！",
      success: "狼人冒出愛心，勇敢送出小花！",
      failure: "哎呀！愛心變成大泡泡，把狼人的鼻子包住了。",
      solution: [["fill",0,0],["pot",0],["fill",1,1],["pot",1]],
      effect: "love"
    },
    {
      id: "poison",
      name: "除草毒藥",
      customer: "骷髏園丁",
      character: "skeleton",
      quote: "雜草會咬人！幫我除草吧。",
      capacities: [3,2],
      recipe: [0,3,1],
      lesson: "沒有 1 份杯，也能量出 1 份。",
      hint: "先加入 3 份月光水。把 3 份幽靈黏液倒滿 2 份杯，原來的杯裡會剩下多少？",
      success: "雜草變成小豆芽，可以安心種花了！",
      failure: "哎呀！雜草長出了蝴蝶結。",
      solution: [["fill",0,1],["pot",0],["fill",0,2],["pour",0,1],["pot",0]],
      effect: "poison"
    },
    {
      id: "frog",
      name: "好夢藥水",
      customer: "睡不好的貓頭鷹",
      character: "owl",
      quote: "今晚想做個好夢。",
      capacities: [3,2],
      recipe: [1,2,3],
      lesson: "安排順序，讓空杯接著派上用場。",
      hint: "先用小杯加入 2 份月光水。再用它分走大杯裡的 2 份玫瑰露，留下 1 份玫瑰露。",
      success: "貓頭鷹睡著了，夢見棉花糖雲！",
      failure: "咕？夢見鬧鐘在跳舞！",
      solution: [["fill",1,1],["pot",1],["fill",0,0],["pour",0,1],["pot",0],["fill",0,2],["pot",0]],
      effect: "dream"
    },
    {
      id: "cat",
      name: "黑貓變身藥水",
      customer: "想溜進城堡的南瓜精",
      character: "pumpkin",
      quote: "想變成黑貓，鑽進城堡！",
      capacities: [5,2],
      recipe: [3,2,0],
      lesson: "分走多出來的原料。",
      hint: "先用小杯加入月光水，再把大杯的玫瑰露分給小杯，留下需要的份量。",
      success: "喵！變成黑貓，鑽進城堡了！",
      failure: "喵嗚！南瓜精只有耳朵變成貓耳，圓圓的肚子還是卡在洞口。",
      solution: [["fill",1,1],["pot",1],["fill",0,0],["pour",0,1],["pot",0]],
      effect: "cat"
    },
    {
      id: "glow",
      name: "人魚藥水",
      customer: "想游進珊瑚礁的水手",
      character: "sailor",
      quote: "想長出魚尾，和小魚游泳！",
      capacities: [7,4,2],
      recipe: [3,2,5],
      lesson: "三個杯子，挑出合適的兩個。",
      hint: "玫瑰露用 7 份杯分給 4 份杯；月光水直接用 2 份杯。幽靈黏液要留下 5 份，該分走多少？",
      success: "嘩啦！水手長出閃亮的魚尾，開心地游進珊瑚花園。",
      failure: "噗通！只有鞋子變成小魚，水手還沒長出尾巴。",
      solution: [["fill",2,1],["pot",2],["fill",0,0],["pour",0,1],["pot",0],["empty",1],["fill",0,2],["pour",0,2],["pot",0]],
      effect: "mermaid"
    },
    {
      id: "float",
      name: "漂浮藥水",
      customer: "想摘蘋果的史萊姆",
      character: "slime",
      quote: "想飄上去摘蘋果！",
      capacities: [8,5,2],
      recipe: [3,6,2],
      lesson: "同一個大杯，可以留下不同份量。",
      hint: "8 份分給 5 份杯會剩 3 份，分給 2 份杯會剩 6 份。先把能直接加入的幽靈黏液倒進鍋裡。",
      success: "呼～史萊姆像氣球一樣飄起來，輕輕摘下紅蘋果。",
      failure: "啵！只有頭上的小葉子飄起來，史萊姆還黏在地上。",
      solution: [["fill",2,2],["pot",2],["fill",0,0],["pour",0,1],["pot",0],["empty",1],["fill",0,1],["pour",0,2],["pot",0]],
      effect: "float"
    },
    {
      id: "rainbow",
      name: "誠實藥水",
      customer: "想說實話的小狐狸",
      character: "fox",
      quote: "餅乾是我吃的……想勇敢說實話。",
      capacities: [9,6,4,2],
      recipe: [5,2,3],
      lesson: "四個杯子，找出原料需要的搭配。",
      hint: "玫瑰露想想 9 減掉多少是 5；幽靈黏液想想 9 減掉多少是 3。月光水直接用 2 份杯。",
      success: "小狐狸說：「餅乾是我吃的，對不起！」",
      failure: "哎呀！嘴巴只冒出一串泡泡，還沒說出心裡的話。",
      solution: [["fill",3,1],["pot",3],["fill",0,0],["pour",0,2],["pot",0],["empty",2],["fill",0,2],["pour",0,1],["pot",0]],
      effect: "honesty"
    },
    {
      id: "invisible",
      name: "隱身藥水",
      customer: "想玩捉迷藏的白兔",
      character: "rabbit",
      quote: "想藏好耳朵，玩捉迷藏！",
      capacities: [13,8,5,3],
      recipe: [1,8,2],
      lesson: "先把接收杯放一些原料，再倒一次。",
      hint: "先加入 8 份月光水，再用 5 減 3 量出幽靈黏液。最後把玫瑰露用 3 份杯倒進 5 份杯，再裝滿 3 份杯倒一次，會剩多少？",
      success: "咻！白兔變得透明了，只剩一排小腳印悄悄跳過去。",
      failure: "咦？身體不見了，兩隻長耳朵還在空中晃呀晃。",
      solution: [["fill",1,1],["pot",1],["fill",2,2],["pour",2,3],["pot",2],["empty",3],["fill",3,0],["pour",3,2],["fill",3,0],["pour",3,2],["pot",3]],
      effect: "invisible"
    },
    {
      id: "galaxy",
      name: "發光藥水",
      customer: "找回亮光的螢火蟲",
      character: "firefly",
      quote: "想讓小燈重新亮起來！",
      capacities: [12,10,7,5,2],
      recipe: [6,3,8],
      lesson: "一個小杯，也能分走兩次。",
      hint: "先完成月光水和幽靈黏液，清空 2 份杯。最後用 10 份杯裝玫瑰露，分走 2 份，倒掉小杯後再分走 2 份。",
      success: "亮晶晶！螢火蟲的小燈亮起來，暖暖的光照亮整條小路。",
      failure: "噗！小燈閃了一下，又熄掉了。",
      solution: [["fill",3,1],["pour",3,4],["pot",3],["empty",4],["fill",1,2],["pour",1,4],["pot",1],["empty",4],["fill",1,0],["pour",1,4],["empty",4],["pour",1,4],["pot",1]],
      effect: "glow"
    },
    {
      id: "dragon",
      name: "年輕藥水",
      customer: "想再冒險的老魔法師",
      character: "wizard",
      quote: "想變年輕，再去冒險！",
      capacities: [14,11,8,5,3],
      recipe: [4,7,1],
      lesson: "先安排順序，再用三種不同方法量。",
      hint: "先量 1 份幽靈黏液，清空 5 份杯。月光水可以分兩次加入：先 5 份，再 2 份。最後玫瑰露從 14 份開始，用 5 份杯分走兩次。",
      success: "魔法師變年輕了，背起背包去冒險！",
      failure: "哎呀！只有帽子變得像新的一樣，魔法師還是打了個大哈欠。",
      solution: [["fill",0,2],["pour",0,2],["pour",0,3],["pot",0],["empty",3],["fill",3,1],["pot",3],["fill",3,1],["pour",3,4],["pot",3],["fill",0,0],["pour",0,3],["empty",3],["pour",0,3],["pot",0]],
      effect: "youth"
    }
  ];
  function initial(level = levels[0]) { return { cups: level.capacities.map(() => ({ ingredient: null, amount: 0 })), pot: ingredients.map(() => 0) }; }
  function copy(state) { return { cups: state.cups.map(cup => ({ ...cup })), pot: [...state.pot] }; }
  function cupName(index, level = levels[0]) { return level.capacities.length === 2 ? (index === 0 ? '大杯' : '小杯') : `${level.capacities[index]} 份杯`; }
  function describe(action, level = levels[0]) {
    const [kind, index, other] = action;
    if (kind === 'fill') return `${ingredients[other].name} → ${cupName(index, level)}（裝滿）`;
    if (kind === 'pour') return `${cupName(index, level)} → ${cupName(other, level)}`;
    if (kind === 'pot') return `${cupName(index, level)} → 大鍋`;
    if (kind === 'empty') return `${cupName(index, level)} → 垃圾桶`;
    return '';
  }
  function apply(level, state, action) {
    const fail = message => ({ ok: false, state, message });
    if (!Array.isArray(action)) return fail('請先選擇來源。');
    const [kind, index, other] = action;
    const validCup = value => Number.isInteger(value) && value >= 0 && value < level.capacities.length;
    if (!validCup(index)) return fail('請選擇一個量杯。');
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
      if (!validCup(other) || other === index) return fail('請選另一個杯子。');
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
    return { ok: true, state: next, moved, message: describe(action, level) };
  }
  function verdict(level, state) {
    return { success: level.recipe.every((amount, i) => state.pot[i] === amount), differences: level.recipe.map((amount, i) => Math.sign(state.pot[i] - amount)) };
  }
  function replay(level, actions) {
    let state = initial(level);
    for (const action of actions) {
      const result = apply(level, state, action);
      if (!result.ok) throw new Error(result.message);
      state = result.state;
    }
    return state;
  }
  return { ingredients, levels, initial, apply, verdict, replay, describe, cupName };
});
