(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SnackGame = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const kinds = {
    fire: { name: '暖暖龍', flavor: 'warm', wish: '熱呼呼', color: '#ec987c' },
    snow: { name: '雪棉兔', flavor: 'cold', wish: '冰涼涼', color: '#a5cbd5' },
    slime: { name: '布丁怪', flavor: 'jam', wish: '加果醬', color: '#b6c57e' },
    mushroom: { name: '蘑菇仔', flavor: 'plain', wish: '原味', color: '#c3a4c9' },
  };
  const flavors = { plain: '原味', warm: '熱呼呼', cold: '冰涼涼', jam: '加果醬' };
  const order = (x, y, kind = 'fire', extra = {}) => ({ x, y, kind, serve: true, flavor: null, ...extra });
  const levels = [
    { title: '第一份點心', topic: '照順序做', goal: '點心準備好了，送給客人吧！', hint: '加入「送餐」，再按「開始」。', blocks: ['serve'], orders: [order(3, 3)] },
    { title: '再多一顆', topic: 'x ＋ 1', goal: '每盤都少一顆，補好再送餐。', hint: '先把 x 加 1，再送餐。', blocks: ['add', 'serve'], orders: [order(2, 3), order(4, 5), order(6, 7, 'snow')] },
    { title: '偷偷多出來', topic: 'x − 1', goal: '每盤都多一顆，拿掉再送餐。', hint: '先把 x 減 1，再送餐。', blocks: ['add', 'sub', 'serve'], orders: [order(4, 3), order(6, 5, 'slime'), order(3, 2)] },
    { title: '剛剛好才送', topic: 'if · ＝', goal: '只送份量剛好的；其他留在廚房。', hint: '把「送餐」放進 if 裡，判斷 x 是否等於 y。', blocks: ['if', 'serve'], orders: [order(3, 3), order(2, 4, 'snow', { serve: false }), order(5, 3, 'slime', { serve: false }), order(6, 6)] },
    { title: '小胃口，大胃口', topic: 'if · ＜', goal: '不夠就加一顆，每位客人都要收到餐。', hint: '只有 x < y 才加 1；送餐要放在 if 外面。', blocks: ['if', 'add', 'serve'], orders: [order(2, 3), order(5, 5, 'snow'), order(3, 4, 'slime'), order(6, 6)] },
    { title: '滿出來的盤子', topic: 'if · ＞', goal: '太多就拿走一顆，再把點心送出去。', hint: '只有 x > y 才減 1；相等時也要送餐。', blocks: ['if', 'sub', 'serve'], orders: [order(4, 3), order(5, 5), order(6, 5, 'snow'), order(2, 2, 'slime')] },
    { title: '兩條小路', topic: 'if / else', goal: '剛好就送餐；否則補一顆再送。', hint: 'if 裡送餐；else 裡先加 1，再送餐。', blocks: ['ifElse', 'add', 'serve'], orders: [order(3, 3), order(4, 5, 'snow'), order(6, 6, 'slime'), order(1, 2)] },
    { title: '一多一少', topic: '比較與分支', goal: '每盤不是多一顆，就是少一顆。調好再送！', hint: 'x < y 就加 1，否則減 1；最後送餐。', blocks: ['ifElse', 'add', 'sub', 'serve'], orders: [order(2, 3), order(6, 5, 'snow'), order(4, 5), order(3, 2, 'slime')] },
    { title: '雙倍點心魔法', topic: 'x × 2', goal: '把每盤點心變成兩倍，再送餐。', hint: '把 x 設為 x × 2。乘號 × 和變數 x 不一樣喔。', blocks: ['mul', 'add', 'serve'], orders: [order(2, 4), order(3, 6, 'slime'), order(4, 8, 'snow')] },
    { title: '一人一半', topic: 'x ÷ 2', goal: '每盤留一半給客人，另一半收進廚房。', hint: '把 x 設為 x ÷ 2，再送餐。', blocks: ['div', 'sub', 'serve'], orders: [order(6, 3), order(8, 4, 'snow'), order(10, 5, 'slime')] },
    { title: '怪獸專屬菜單', topic: 'switch / case', goal: '照怪獸種類做口味，蘑菇仔吃原味。', hint: '選中每個 case 的空格，再加入對應口味；最後在 switch 外送餐。', blocks: ['switch', 'warm', 'cold', 'jam', 'plain', 'serve'], orders: [order(3, 3, 'fire', { flavor: 'warm' }), order(4, 4, 'snow', { flavor: 'cold' }), order(2, 2, 'slime', { flavor: 'jam' }), order(5, 5, 'mushroom', { flavor: 'plain' })] },
    { title: '今天你當店長', topic: '綜合挑戰', goal: '調好份量、做好口味，招待每一位怪獸！', hint: '少一顆就加，多一顆就減；用 switch 做口味，最後送餐。', blocks: ['if', 'ifElse', 'switch', 'add', 'sub', 'mul', 'div', 'warm', 'cold', 'jam', 'plain', 'serve'], orders: [order(2, 3, 'fire', { flavor: 'warm' }), order(5, 4, 'snow', { flavor: 'cold' }), order(3, 3, 'slime', { flavor: 'jam' }), order(6, 5, 'mushroom', { flavor: 'plain' }), order(4, 5, 'slime', { flavor: 'jam' })] },
  ];
  const palette = {
    serve: { label: '送餐', icon: '↗', group: 'action' },
    add: { label: '加點心', icon: '＋', group: 'math' },
    sub: { label: '拿點心', icon: '−', group: 'math' },
    mul: { label: '變成幾倍', icon: '×', group: 'math' },
    div: { label: '平均分', icon: '÷', group: 'math' },
    if: { label: '如果 if', icon: '?', group: 'logic' },
    ifElse: { label: '如果／否則', icon: '⑂', group: 'logic' },
    switch: { label: '選菜單 switch', icon: '⋈', group: 'switch' },
    warm: { label: '烤熱', icon: '♨', group: 'flavor' },
    cold: { label: '冰鎮', icon: '❄', group: 'flavor' },
    jam: { label: '加果醬', icon: '♥', group: 'flavor' },
    plain: { label: '保持原味', icon: '○', group: 'flavor' },
  };
  let serial = 0;
  function createBlock(type) {
    if (!palette[type]) throw new Error('未知的方塊');
    const block = { id: `b-${Date.now().toString(36)}-${++serial}`, type };
    if (['add', 'sub', 'mul', 'div'].includes(type)) block.value = ['mul', 'div'].includes(type) ? '2' : '1';
    if (type === 'if' || type === 'ifElse') Object.assign(block, { left: 'x', op: '=', right: 'y', then: [] });
    if (type === 'ifElse') block.else = [];
    if (type === 'switch') block.cases = { fire: [], snow: [], slime: [], default: [] };
    return block;
  }
  function children(block) {
    if (block.type === 'if') return [block.then];
    if (block.type === 'ifElse') return [block.then, block.else];
    if (block.type === 'switch') return Object.values(block.cases || {});
    return [];
  }
  function validate(program, allowed = Object.keys(palette)) {
    let count = 0;
    const ids = new Set();
    function walk(list, depth) {
      if (!Array.isArray(list) || depth > 4) throw new Error('方塊最多套四層');
      for (const b of list) {
        if (!b || !allowed.includes(b.type) || typeof b.id !== 'string' || ids.has(b.id)) throw new Error('這一關不能使用這個方塊');
        ids.add(b.id);
        if (++count > 36) throw new Error('先試試用 36 個以內的方塊');
        if (['add', 'sub', 'mul', 'div'].includes(b.type)) checkOperand(b.value);
        if (b.type === 'if' || b.type === 'ifElse') {
          checkOperand(b.left); checkOperand(b.right);
          if (!['=', '<', '>'].includes(b.op)) throw new Error('請選擇比較符號');
        }
        if (b.type === 'switch' && (!b.cases || ['fire', 'snow', 'slime', 'default'].some(k => !Array.isArray(b.cases[k])))) throw new Error('菜單需要完整的分支');
        for (const list of children(b)) walk(list, depth + 1);
      }
    }
    walk(program, 0);
    return count;
  }
  function checkOperand(value) {
    if (!['x', 'y'].includes(value) && !/^(?:[0-9]|1[0-2])$/.test(String(value))) throw new Error('請選 x、y 或 0～12');
  }
  function execute(program, order, allowed) {
    const trace = [];
    const state = { x: order.x, y: order.y, kind: order.kind, flavor: 'plain', served: false };
    const push = (id, message, extra = {}) => trace.push({ id, message, state: { ...state }, ...extra });
    const value = operand => operand === 'x' ? state.x : operand === 'y' ? state.y : Number(operand);
    let currentId = null;
    try {
      validate(program, allowed);
      function walk(list) {
        for (const b of list) {
          if (state.served) return;
          currentId = b.id;
          if (['add', 'sub', 'mul', 'div'].includes(b.type)) {
            const before = state.x, n = value(b.value);
            if (b.type === 'div' && n === 0) throw new Error('不能分成 0 份，換個數字吧');
            const next = ({ add: () => before + n, sub: () => before - n, mul: () => before * n, div: () => before / n })[b.type]();
            if (!Number.isInteger(next)) throw new Error('點心不能切碎，請平均分成整顆');
            if (next < 0) throw new Error('盤子沒有那麼多點心可以拿');
            if (next > 24) throw new Error('盤子最多放 24 顆，太多了');
            state.x = next;
            const symbol = { add: '＋', sub: '−', mul: '×', div: '÷' }[b.type];
            push(b.id, `${before} ${symbol} ${n} ＝ ${next}`);
          } else if (b.type === 'if' || b.type === 'ifElse') {
            const a = value(b.left), c = value(b.right);
            const yes = b.op === '=' ? a === c : b.op === '<' ? a < c : a > c;
            push(b.id, `${a} ${b.op} ${c}？${yes ? '成立 ✓' : '不成立'}${!yes && b.type === 'ifElse' ? '，走否則' : ''}`, { branch: yes ? 'then' : 'else' });
            walk(yes ? b.then : (b.else || []));
          } else if (b.type === 'switch') {
            const key = Object.hasOwn(b.cases, state.kind) ? state.kind : 'default';
            push(b.id, `${kinds[state.kind].name} → ${key === 'default' ? '其他 default' : '專屬菜單'}`, { branch: key });
            walk(b.cases[key]);
          } else if (['warm', 'cold', 'jam', 'plain'].includes(b.type)) {
            state.flavor = b.type;
            push(b.id, `點心變成${flavors[b.type]}`);
          } else if (b.type === 'serve') {
            if (!order.serve) throw new Error('這盤還不符合條件，應該留在廚房');
            if (state.x !== state.y) throw new Error(state.x < state.y ? `還少 ${state.y - state.x} 顆，再看看規則` : `多了 ${state.x - state.y} 顆，再看看規則`);
            if (order.flavor && order.flavor !== state.flavor) throw new Error(`客人想吃${flavors[order.flavor]}，口味不對喔`);
            state.served = true;
            push(b.id, '剛剛好！謝謝招待 ♥', { delivered: true });
          }
        }
      }
      walk(program);
      if (order.serve && !state.served) throw new Error('還沒送餐，幫小幫手加上「送餐」');
      if (!order.serve && (state.x !== order.x || state.flavor !== 'plain')) throw new Error('這盤要原樣留在廚房');
      push(null, state.served ? '這位客人吃飽了！' : '判斷正確，這盤留在廚房', { done: true, success: true });
      return { success: true, state, trace };
    } catch (error) {
      push(currentId, error.message, { done: true, success: false });
      return { success: false, state, trace, error: error.message };
    }
  }
  return { kinds, flavors, levels, palette, createBlock, children, validate, execute };
});
