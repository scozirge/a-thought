(() => {
  'use strict';
  const G = window.SnackGame, A = window.SnackArt;
  const $ = id => document.getElementById(id);
  const storageKey = 'monster-snack-v1';
  const esc = text => String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  let saved = { level: 0, completed: [], programs: {} };
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey));
    if (raw && typeof raw === 'object') {
      saved.level = Number.isInteger(raw.level) && raw.level >= 0 && raw.level < G.levels.length ? raw.level : 0;
      saved.completed = Array.isArray(raw.completed) ? [...new Set(raw.completed.filter(n => Number.isInteger(n) && n >= 0 && n < G.levels.length))] : [];
      for (let i = 0; i < G.levels.length; i++) {
        const program = raw.programs?.[i];
        if (program) { try { G.validate(program, G.levels[i].blocks); saved.programs[i] = program; } catch { /* Ignore obsolete or damaged drafts. */ } }
      }
    }
  } catch { $('storage-warning').hidden = false; }
  let levelIndex = saved.level;
  let program = structuredClone(saved.programs[levelIndex] || []);
  let selected = 'root', history = [], currentOrder = 0, statuses = [];
  let session = null, autoplay = false, timer = null;
  let dragData = null;
  const level = () => G.levels[levelIndex];
  function persist() {
    saved.level = levelIndex;
    saved.programs[levelIndex] = structuredClone(program);
    try { localStorage.setItem(storageKey, JSON.stringify(saved)); }
    catch { $('storage-warning').hidden = false; }
  }
  function feedback(message, kind = '') {
    $('message').textContent = message;
    $('feedback').className = `feedback ${kind}`;
    $('feedback').querySelector('.feedback-icon').textContent = kind === 'error' ? '!' : kind === 'success' ? '✓' : '✦';
  }
  function findBlock(id, list = program) {
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) return { block: list[i], list, index: i };
      for (const child of G.children(list[i])) { const match = findBlock(id, child); if (match) return match; }
    }
    return null;
  }
  function getList(key) {
    if (key === 'root') return program;
    const [id, branch] = key.split(':');
    const b = findBlock(id)?.block;
    if (!b) return null;
    return branch.startsWith('case-') ? b.cases?.[branch.slice(5)] : b[branch];
  }
  function checkpoint() { history.push(structuredClone(program)); if (history.length > 30) history.shift(); }
  function edited() {
    if (!getList(selected)) selected = 'root';
    persist(); renderEditor(); statuses = []; currentOrder = 0; renderScene(); renderQueue();
    feedback('工作表準備好了，就按「開始」試試看。');
  }
  function option(value, label, active) { return `<option value="${esc(value)}"${String(active) === String(value) ? ' selected' : ''}>${esc(label)}</option>`; }
  function operand(field, current, id) {
    return `<select data-field="${field}" data-owner="${esc(id)}" aria-label="${field === 'left' ? '比較左邊' : field === 'right' ? '比較右邊' : '運算數值'}">${['x', 'y', ...Array.from({ length: 13 }, (_, i) => String(i))].map(v => option(v, v, current)).join('')}</select>`;
  }
  function slot(key, rootEmpty = false) {
    return `<button class="drop-slot ${selected === key ? 'selected' : ''} ${rootEmpty ? 'empty-root' : ''}" data-slot="${esc(key)}" aria-pressed="${selected === key}">${rootEmpty ? '把第一個方塊放進來' : selected === key ? '＋ 加到這裡' : '＋ 選這裡放方塊'}</button>`;
  }
  function renderList(list, key) { return list.map(b => blockHTML(b)).join('') + slot(key, key === 'root' && !list.length); }
  function branchHTML(b, key, label, list) { return `<div class="branch"><div class="branch-label">${label}</div>${renderList(list, `${b.id}:${key}`)}</div>`; }
  function blockHTML(b) {
    const meta = G.palette[b.type];
    let title = `${meta.icon} ${meta.label}`, fields = '', branches = '';
    if (['add', 'sub', 'mul', 'div'].includes(b.type)) {
      title = '把 x 設為';
      fields = `<div class="block-fields"><b>x ${meta.icon}</b> ${operand('value', b.value, b.id)}</div>`;
    }
    if (b.type === 'if' || b.type === 'ifElse') {
      title = '如果 if';
      fields = `<div class="block-fields">${operand('left', b.left, b.id)}<select data-field="op" data-owner="${esc(b.id)}" aria-label="比較符號">${['=', '<', '>'].map(op => option(op, op, b.op)).join('')}</select>${operand('right', b.right, b.id)}</div>`;
      branches = branchHTML(b, 'then', '成立，就做 ↓', b.then);
      if (b.type === 'ifElse') branches += branchHTML(b, 'else', '否則 else ↓', b.else);
    }
    if (b.type === 'switch') {
      title = '依怪獸種類 switch';
      for (const key of ['fire', 'snow', 'slime', 'default']) branches += branchHTML(b, `case-${key}`, key === 'default' ? '其他 default' : `當作是 ${G.kinds[key].name} · case`, b.cases[key]);
    }
    return `<div class="code-block ${meta.group}" data-node="${esc(b.id)}"><div class="code-header"><span class="code-title">${title}</span><div class="code-actions"><button class="grip" draggable="true" data-drag-id="${esc(b.id)}" title="拖動方塊；也可以用上下按鈕" aria-label="拖動${esc(meta.label)}">⠿</button><button data-action="up" data-id="${esc(b.id)}" aria-label="上移${esc(meta.label)}">↑</button><button data-action="down" data-id="${esc(b.id)}" aria-label="下移${esc(meta.label)}">↓</button><button data-action="delete" data-id="${esc(b.id)}" aria-label="刪除${esc(meta.label)}">×</button></div></div>${fields}${branches}</div>`;
  }
  function renderEditor() {
    $('palette').innerHTML = level().blocks.map(type => `<button class="palette-block ${G.palette[type].group}" draggable="true" data-type="${type}" aria-label="加入${esc(G.palette[type].label)}"><span aria-hidden="true">${G.palette[type].icon}</span>${G.palette[type].label}</button>`).join('');
    $('program').innerHTML = renderList(program, 'root');
    $('undo-button').disabled = !history.length || !!session;
    $('clear-button').disabled = !program.length || !!session;
    syncControls();
  }
  function initialState() { const order = level().orders[currentOrder]; return { ...order, flavor: 'plain', served: false }; }
  function renderScene(state = initialState()) {
    const order = level().orders[currentOrder];
    $('guest-name').textContent = G.kinds[order.kind].name;
    $('guest-wish').textContent = `我想吃 ${order.y} 顆！`;
    $('flavor-wish').hidden = !order.flavor;
    $('flavor-wish').textContent = order.flavor ? `要${G.flavors[order.flavor]}的` : '';
    $('monster').innerHTML = A.monster(order.kind, state.served);
    $('helper').innerHTML = A.helper();
    $('snacks').className = `snacks ${state.x > 12 ? 'many' : ''}`;
    $('snacks').innerHTML = Array.from({ length: state.x }, () => A.cookie(state.flavor)).join('');
    $('snacks').setAttribute('aria-label', `盤子裡有 ${state.x} 顆${G.flavors[state.flavor]}點心`);
    $('x-value').innerHTML = `${state.x} <small>顆</small>`;
    $('y-value').innerHTML = `${state.y} <small>顆</small>`;
    $('flavor-label').textContent = `${G.flavors[state.flavor]}點心`;
    $('order-count').textContent = `客人 ${currentOrder + 1} / ${level().orders.length}`;
    $('shop-scene').classList.toggle('delivered', state.served);
    $('reaction').textContent = state.served ? '♥' : '';
  }
  function renderQueue() {
    $('queue').innerHTML = level().orders.map((o, i) => `<button class="queue-card ${i === currentOrder ? 'current' : ''} ${statuses[i] || ''}" data-order="${i}" aria-label="查看第 ${i + 1} 位${G.kinds[o.kind].name}，盤子 ${o.x} 顆，需要 ${o.y} 顆${o.flavor ? '，' + G.flavors[o.flavor] : ''}${o.serve ? '' : '，應留在廚房'}"${session ? ' disabled' : ''}>${A.monster(o.kind)}<span>${o.x} → ${o.y}</span>${statuses[i] === 'passed' ? '✓' : statuses[i] === 'failed' ? '!' : ''}</button>`).join('');
  }
  function renderLevel() {
    $('level-number').textContent = `訂單 ${String(levelIndex + 1).padStart(2, '0')}`;
    $('level-title').textContent = level().title;
    $('goal').textContent = level().goal;
    $('topic').textContent = level().topic;
    $('footer-level').textContent = levelIndex + 1;
    $('progress').textContent = `${saved.completed.length} / ${G.levels.length}`;
    $('help-text').textContent = level().hint;
    $('editor-tip').textContent = '點方塊加入，也可以拖到工作表。';
    renderEditor(); renderScene(); renderQueue();
    feedback(levelIndex === 0 ? '點「送餐」方塊，再按「開始」。' : '先看看訂單，再幫小幫手安排工作。');
  }
  function selectLevel(index) {
    stop(); persist();
    levelIndex = index; program = structuredClone(saved.programs[index] || []);
    selected = 'root'; history = []; currentOrder = 0; statuses = [];
    persist(); renderLevel();
  }
  function changeProgram(operation) {
    if (session) return;
    const before = structuredClone(program);
    try {
      operation();
      G.validate(program, level().blocks);
      history.push(before); if (history.length > 30) history.shift();
      edited();
    } catch (error) { program = before; renderEditor(); feedback(error.message, 'error'); }
  }
  function addBlock(type) {
    if (session || !level().blocks.includes(type)) return;
    changeProgram(() => (getList(selected) || program).push(G.createBlock(type)));
    const target = [...$('program').querySelectorAll('[data-slot]')].find(el => el.dataset.slot === selected);
    target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function syncControls() {
    document.body.classList.toggle('running', !!session);
    $('shop-scene').classList.toggle('busy', autoplay);
    $('run-button').textContent = autoplay ? 'Ⅱ 暫停' : session ? '▶ 繼續' : '▶ 開始';
    $('run-button').disabled = !program.length;
    $('step-button').disabled = !program.length || autoplay;
    $('levels-button').disabled = !!session;
    $('undo-button').disabled = !history.length || !!session;
    $('clear-button').disabled = !program.length || !!session;
    for (const node of document.querySelectorAll('.palette-block, .code-actions button, .block-fields select, .drop-slot')) node.disabled = !!session;
  }
  function stop() {
    clearTimeout(timer); timer = null; autoplay = false; session = null; dragData = null;
    document.querySelectorAll('.executing,.error-block').forEach(el => el.classList.remove('executing', 'error-block'));
    syncControls();
  }
  function reset() {
    stop(); currentOrder = 0; statuses = []; renderScene(); renderQueue(); syncControls();
    document.querySelector('.workspace').scrollTop = 0;
    feedback('回到第一位客人，工作表還在喔。');
  }
  function prepare() {
    if (!program.length) return false;
    const events = [];
    for (let i = 0; i < level().orders.length; i++) {
      events.push({ start: true, order: i });
      const result = G.execute(program, level().orders[i], level().blocks);
      events.push(...result.trace.map(e => ({ ...e, order: i })));
      if (!result.success) break;
    }
    session = { events, cursor: 0 };
    statuses = []; currentOrder = 0; syncControls(); renderQueue();
    return true;
  }
  function highlight(id, error = false) {
    document.querySelectorAll('.executing,.error-block').forEach(el => el.classList.remove('executing', 'error-block'));
    const element = [...document.querySelectorAll('[data-node]')].find(el => el.dataset.node === id);
    if (element) {
      element.classList.add('executing'); if (error) element.classList.add('error-block');
      const workspace = document.querySelector('.workspace');
      const a = element.getBoundingClientRect(), b = workspace.getBoundingClientRect();
      if (a.top < b.top || a.top > b.bottom - 70) workspace.scrollTop += a.top - b.top - 18;
    }
  }
  function nextStep() {
    if (!session && !prepare()) return;
    let event = session.events[session.cursor++];
    if (event.start) {
      currentOrder = event.order; renderScene(); renderQueue();
      event = session.events[session.cursor++];
    }
    currentOrder = event.order;
    renderScene(event.state); highlight(event.id, event.success === false);
    feedback(event.message, event.done ? event.success ? 'success' : 'error' : '');
    if (event.done) {
      statuses[event.order] = event.success ? 'passed' : 'failed';
      renderQueue();
      if (!event.success) {
        const id = event.id; stop(); highlight(id, true); renderQueue();
        return;
      }
    }
    if (session && session.cursor >= session.events.length) {
      stop(); renderQueue();
      if (!saved.completed.includes(levelIndex)) saved.completed.push(levelIndex);
      persist(); $('progress').textContent = `${saved.completed.length} / ${G.levels.length}`;
      $('success-art').innerHTML = A.monster(level().orders[0].kind, true);
      $('success-title').textContent = levelIndex === G.levels.length - 1 ? '你是怪獸點心屋的店長了！' : '今天的點心，剛剛好！';
      $('success-copy').textContent = `${level().orders.length} 筆訂單都通過了。${levelIndex === G.levels.length - 1 ? '也可以回去試試不同的解法。' : '和同伴交換工作，再挑戰下一關吧。'}`;
      $('next-button').textContent = levelIndex === G.levels.length - 1 ? '看看關卡 →' : '下一關 →';
      $('success-dialog').showModal();
    }
  }
  function tick() {
    if (!autoplay) return;
    nextStep();
    if (autoplay && session) timer = setTimeout(tick, Number($('speed').value));
  }
  $('run-button').addEventListener('click', () => {
    if (autoplay) { clearTimeout(timer); autoplay = false; syncControls(); return; }
    if (!session && !prepare()) return;
    autoplay = true; syncControls(); tick();
  });
  $('step-button').addEventListener('click', () => { if (!autoplay) nextStep(); });
  $('reset-button').addEventListener('click', reset);
  $('palette').addEventListener('click', e => { const button = e.target.closest('[data-type]'); if (button) addBlock(button.dataset.type); });
  $('program').addEventListener('click', e => {
    if (session) return;
    const slot = e.target.closest('[data-slot]');
    if (slot) {
      selected = slot.dataset.slot; renderEditor();
      $('editor-tip').textContent = selected === 'root' ? '點方塊加入，也可以拖到工作表。' : '位置選好了，點方塊盒加入這個分支。';
      return;
    }
    const button = e.target.closest('[data-action]');
    if (!button) return;
    changeProgram(() => {
      const match = findBlock(button.dataset.id);
      if (!match) return;
      if (button.dataset.action === 'delete') match.list.splice(match.index, 1);
      else {
        const newIndex = match.index + (button.dataset.action === 'up' ? -1 : 1);
        if (newIndex >= 0 && newIndex < match.list.length) {
          match.list.splice(match.index, 1); match.list.splice(newIndex, 0, match.block);
        }
      }
    });
  });
  $('program').addEventListener('change', e => {
    if (session || !e.target.dataset.field) return;
    const { field, owner } = e.target.dataset;
    const value = e.target.value;
    changeProgram(() => { findBlock(owner).block[field] = value; });
  });
  $('undo-button').addEventListener('click', () => { if (history.length && !session) { program = history.pop(); edited(); } });
  $('clear-button').addEventListener('click', () => { if (program.length && !session) { checkpoint(); program = []; selected = 'root'; edited(); } });
  $('queue').addEventListener('click', e => {
    const button = e.target.closest('[data-order]');
    if (button && !session) { currentOrder = Number(button.dataset.order); renderScene(); renderQueue(); feedback('先看看這位客人的點心；執行時會從第一位開始。'); }
  });
  document.addEventListener('dragstart', e => {
    if (session) { e.preventDefault(); return; }
    const source = e.target.closest('[data-type],[data-drag-id]');
    if (!source) return;
    dragData = source.dataset.type ? { type: source.dataset.type } : { id: source.dataset.dragId };
    e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = dragData.id ? 'move' : 'copy';
  });
  $('program').addEventListener('dragover', e => {
    if (!dragData || session) return;
    const target = e.target.closest('[data-slot],[data-node]');
    if (target) {
      e.preventDefault(); document.querySelectorAll('.drop-hover').forEach(el => el.classList.remove('drop-hover')); target.classList.add('drop-hover');
      e.dataTransfer.dropEffect = dragData.id ? 'move' : 'copy';
    }
  });
  document.addEventListener('dragend', () => { dragData = null; document.querySelectorAll('.drop-hover').forEach(el => el.classList.remove('drop-hover')); });
  $('program').addEventListener('drop', e => {
    if (!dragData || session) return;
    const target = e.target.closest('[data-slot],[data-node]');
    if (!target) return;
    e.preventDefault(); const data = dragData; dragData = null;
    changeProgram(() => {
      const match = target.dataset.node ? findBlock(target.dataset.node) : null;
      const list = target.dataset.slot ? getList(target.dataset.slot) : match?.list;
      let index = target.dataset.slot ? list?.length : match?.index;
      if (!list) throw new Error('請放進工作表的空格');
      const source = data.id ? findBlock(data.id) : null;
      if (source) {
        function containsList(b) { return G.children(b).some(child => child === list || child.some(containsList)); }
        if (containsList(source.block)) throw new Error('方塊不能放進自己裡面');
        if (source.list === list && source.index < index) index--;
        source.list.splice(source.index, 1); list.splice(index, 0, source.block);
      } else if (data.type && level().blocks.includes(data.type)) list.splice(index, 0, G.createBlock(data.type));
      else throw new Error('這個方塊還不能使用');
      if (target.dataset.slot) selected = target.dataset.slot;
    });
  });
  function showLevels() {
    $('level-grid').innerHTML = G.levels.map((l, i) => `<button class="level-card ${i === levelIndex ? 'current' : ''} ${saved.completed.includes(i) ? 'completed' : ''}" data-level="${i}"><span class="level-number">${saved.completed.includes(i) ? '✓ 完成' : '訂單 ' + String(i + 1).padStart(2, '0')}</span><strong>${l.title}</strong><span class="level-topic">${l.topic}</span></button>`).join('');
    $('levels-dialog').showModal();
  }
  $('levels-button').addEventListener('click', showLevels);
  $('level-grid').addEventListener('click', e => { const button = e.target.closest('[data-level]'); if (button) { $('levels-dialog').close(); selectLevel(Number(button.dataset.level)); } });
  $('help-button').addEventListener('click', () => $('help-dialog').showModal());
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  $('next-button').addEventListener('click', () => { $('success-dialog').close(); if (levelIndex < G.levels.length - 1) selectLevel(levelIndex + 1); else showLevels(); });
  for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('click', e => {
    if (e.target === dialog) {
      const box = dialog.getBoundingClientRect();
      if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) dialog.close();
    }
  });
  window.addEventListener('pagehide', () => { clearTimeout(timer); persist(); });
  renderLevel();
})();
