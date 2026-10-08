/* 原生 H5：不使用 fetch、模組載入或外部資源，可直接以 file:// 開啟。 */
(function () {
  'use strict';
  const R = window.PuzzleRules;
  const games = window.PuzzleCatalog.games;
  const V = window.HeroView;
  const I = window.PenguinView;
  const A = window.AnimalView;
  const challengeCount = Object.values(games).reduce((sum, game) => sum + game.levels.length, 0);
  const app = document.getElementById('app');
  const storageKey = 'puzzle-party-v1';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let saved = { completed: [], drafts: {}, speed: 1 };
  try {
    const data = JSON.parse(localStorage.getItem(storageKey));
    if (data && typeof data === 'object') saved = {
      completed: Array.isArray(data.completed) ? data.completed.filter(v => typeof v === 'string') : [],
      drafts: data.drafts && typeof data.drafts === 'object' && !Array.isArray(data.drafts) ? data.drafts : {},
      speed: data.speed === 2 ? 2 : 1
    };
  } catch (_) { /* 私密模式或 file:// 儲存受限時，仍能完整遊玩。 */ }
  let state = null;
  let runToken = 0;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const colorName = color => R.colors[color].name + '色';
  const level = () => games[state.game].levels[state.index];
  function save() { try { localStorage.setItem(storageKey, JSON.stringify(saved)); } catch (_) {} }
  function markComplete(id) { if (!saved.completed.includes(id)) saved.completed.push(id); save(); }
  function isComplete() { return state.settings.every(v => v !== null); }

  function brand(home) {
    return `<header class="topbar"><button class="brand" data-action="home" aria-label="一起想想，回遊戲選單"><span class="brand-mark">✦</span>一起想想</button>${home ? `<span class="tag">本地教師版 · ${challengeCount} 個小挑戰</span>` : '<button class="home-link" data-action="home">← 遊戲選單</button>'}</header>`;
  }
  function artwork(game) {
    const body = game === 'sticker' ? `
      <g transform="rotate(-9 180 110)"><rect x="74" y="35" width="190" height="133" rx="13" fill="#aecbbb"/>
      <rect x="85" y="23" width="190" height="133" rx="13" fill="#fbfaf1" stroke="#839b89" stroke-width="2"/>
      <rect x="105" y="44" width="43" height="43" rx="7" fill="#ed7064"/><rect x="157" y="44" width="43" height="43" rx="7" fill="#f2c85b"/><rect x="209" y="44" width="43" height="43" rx="7" fill="#6b9fdd"/>
      <rect x="105" y="96" width="43" height="38" rx="7" fill="#6b9fdd"/><rect x="157" y="96" width="43" height="38" rx="7" fill="#67b49b"/><rect x="209" y="96" width="43" height="38" rx="7" fill="#f2c85b"/></g>
      <path d="M59 127l-10 7m220-94 10-10m-5 110 12 6" stroke="#688b74" stroke-width="3" stroke-linecap="round"/><circle cx="69" cy="60" r="5" fill="#f2c85b"/>
      <rect x="211" y="145" width="58" height="28" rx="14" fill="#426c57" transform="rotate(8 240 160)"/><text x="239" y="164" text-anchor="middle" fill="#fffdf2" font-size="16">1 2 3</text>` : game === 'hero' ? V.card() : game === 'animal' ? A.card() : I.card();
    return `<svg viewBox="0 0 350 205" aria-hidden="true">${body}</svg>`;
  }
  function home() {
    ++runToken;
    state = null;
    document.title = '一起想想｜解謎遊樂園';
    app.innerHTML = `<div class="shell">${brand(true)}<main>
      <section class="hero"><div class="eyebrow">小小設定，大大發現</div><h1>先想一想，<br>再看看會發生什麼。</h1><p>貼出圖案、送企鵝回家。<br>動手排好你的計畫，播放後，再試試新的想法。</p><svg class="sun" viewBox="0 0 140 140" aria-hidden="true"><path d="m70 10 9 30 27-18-10 31 33 5-29 17 21 25-33-4-2 33-18-28-24 23 4-34-33-1 28-19-23-24 34 3z" fill="#edd997"/><circle cx="62" cy="64" r="3" fill="#647350"/><circle cx="82" cy="64" r="3" fill="#647350"/><path d="M63 79q10 10 20-2" fill="none" stroke="#647350" stroke-width="3" stroke-linecap="round"/></svg></section>
      <section class="game-grid" aria-label="選一款遊戲">${Object.entries(games).map(([game, info], i) => {
        const count = info.levels.filter(l => saved.completed.includes(l.id)).length;
        return `<button class="game-card" data-game="${game}" aria-label="進入${info.name}"><div class="card-art">${artwork(game)}</div><div class="card-body"><div class="card-number">小小挑戰 0${i + 1}</div><h2>${info.name}</h2><p>${info.subtitle}</p><div class="card-bottom"><span class="skill">${info.skill}</span><span class="round-arrow">↗</span></div><div class="progress-dots">${info.levels.map(l => `<span class="dot ${saved.completed.includes(l.id) ? 'done' : ''}"></span>`).join('')}<span style="margin-left:5px">${count} / ${info.levels.length} 已完成</span></div></div></button>`;
      }).join('')}</section>
      <div class="intro-strip"><div class="intro-step"><span class="step-num">1</span>看看目標</div><div class="intro-step"><span class="step-num">2</span>設定好計畫</div><div class="intro-step"><span class="step-num">3</span>播放，再調整</div><span class="intro-note">不用搶快，每次嘗試都是線索。</span></div>
      </main><footer class="footer"><span class="offline-dot"></span>免安裝 · 免連網 · 自由重試<br>每關都有第 1～3 組＋老師組 / 每組只選一次</footer></div>`;
    window.scrollTo(0, 0);
  }

  function openGame(game, index = 0) {
    ++runToken;
    if (!games[game]?.levels[index]) return;
    const l = games[game].levels[index], draft = saved.drafts[l.id];
    const options = R.optionsFor(game, l);
    const settings = Array.isArray(draft) && draft.length === options.length ? draft.map((v, i) => options[i].includes(v) ? v : null) : R.defaults(game, l);
    state = { game, index, settings, running: false, paused: false, result: null, selectedSlot: 3 };
    renderGame();
    window.scrollTo(0, 0);
  }
  function tileBoard(values, l, id, wrong = []) {
    return `<div class="tile-board" style="--cols:${l.cols}" ${id ? `id="${id}"` : ''}>${values.map((color, i) => `<div class="tile ${color ? '' : 'empty'} ${wrong.includes(i) ? 'wrong' : ''}" style="${color ? `background:${R.colors[color].hex}` : ''}" aria-label="第 ${Math.floor(i / l.cols) + 1} 列第 ${i % l.cols + 1} 格：${color ? colorName(color) : '空白'}">${color ? R.colors[color].name : '·'}</div>`).join('')}</div>`;
  }
  function maskGrid(mask, l, color) {
    return `<div class="mask" style="--cols:${l.cols}" role="img" aria-label="貼紙範圍：${mask.map(i => `第${Math.floor(i / l.cols) + 1}列第${i % l.cols + 1}格`).join('、')}">${Array.from({ length: l.cols * l.rows }, (_, i) => `<span class="mask-cell ${mask.includes(i) ? 'ink' : ''}" ${color && mask.includes(i) ? `style="background:${R.colors[color].hex};border-color:${R.colors[color].hex}"` : ''}></span>`).join('')}</div>`;
  }
  function stickerBoard(l) {
    const steps=[];
    l.masks.forEach((_,i)=>{
      steps.push('<span class="layer-step" id="layer-'+i+'"><small>第 '+(i+1)+' 張</small>'+R.groupFor(i)+'</span>');
      if(l.rotateAfter===i+1)steps.push('<span class="layer-step system-turn" id="system-turn">↻ 系統右轉一次</span>');
    });
    return '<div class="sticker-pair"><div><div class="sticker-caption">要做成這樣</div>'+tileBoard(l.target,l)+'</div><div><div class="sticker-caption">你的作品</div><div class="sticker-output-wrap">'+tileBoard(Array(l.cols*l.rows).fill(null),l,'sticker-output')+'</div></div></div><div class="layers">'+steps.join('<span class="layer-arrow">→</span>')+'</div><div class="stage-placeholder" id="stage-copy">填好所有顏色，按播放後依序貼上。</div>';
  }
  function config(l) {
    if(state.game==='hero')return V.config(l,state);
    if(state.game==='penguin')return I.config(l,state);
    if(state.game==='animal')return A.config(l,state);
    return '<p class="config-help">四組各選一種顏色，小圖是各組貼的位置。'+(l.rotateAfter?'第 '+l.rotateAfter+' 張貼完，系統會把整張作品右轉一次。':'')+'</p><div class="machine-list">'+l.masks.map((mask,i)=>'<div class="machine" id="machine-'+i+'">'+maskGrid(mask,l)+'<div class="machine-main"><div class="machine-title"><span class="machine-id">'+(i+1)+'</span>'+R.groupFor(i)+'<span class="group-description">第 '+(i+1)+' 張貼紙</span></div><div class="options" role="group" aria-label="'+R.groupFor(i)+'的顏色">'+l.palette.map(choice=>'<button class="option '+(state.settings[i]===choice?'selected':'')+'" data-machine="'+i+'" data-choice="'+choice+'" aria-pressed="'+(state.settings[i]===choice)+'" aria-label="'+R.groupFor(i)+'：'+R.colors[choice].name+'" '+(state.running?'disabled':'')+'><span class="color-chip" style="--chip:'+R.colors[choice].hex+'"></span>'+R.colors[choice].name+'</button>').join('')+'</div></div></div>'+(l.rotateAfter===i+1?'<div class="system-config" id="system-config"><b>↻ 系統步驟：整張作品右轉一次</b><span>第 '+(i+1)+' 張貼完自動執行，再繼續貼下一張</span></div>':'')).join('')+'</div>';
  }
  function renderGame() {
    const l = level(), info = games[state.game];
    document.title = `${info.name} · ${l.title}｜一起想想`;
    app.innerHTML = `<div class="shell">${brand(false)}<main><div class="game-heading"><h1>${info.name}<small>${info.skill}</small></h1><nav class="levels" aria-label="選擇關卡">${info.levels.map((entry, i) => `<button class="level-button ${i === state.index ? 'active' : ''} ${saved.completed.includes(entry.id) ? 'completed' : ''}" data-level="${i}" aria-label="第 ${i + 1} 關：${entry.title}" ${i === state.index ? 'aria-current="step"' : ''}>${i + 1}</button>`).join('')}</nav></div>
      <div class="rule-banner"><strong>怎麼玩</strong><span>${state.game==='sticker'&&l.rotateAfter ? '四組各選顏色。第 '+l.rotateAfter+' 張貼完，系統把整張作品右轉一次，再繼續貼。' : state.game==='penguin'&&l.boards.length===1 ? '排好全部方向，碰到冰塊或邊界才停。最後要停在家裡。' : state.game==='sticker' ? '四組各選一次顏色，後貼蓋前貼。' : state.game==='penguin' ? '四組各選一個方向，兩隻一起讀四步，最後都要在家。' : info.rule}</span></div>
      <div class="play-layout"><section class="panel"><div class="panel-head"><h2>${state.index + 1}. ${l.title}</h2><span class="label">${l.stage} · 看看目標</span></div><div class="board-content">${({ sticker: stickerBoard, hero: V.board, penguin: I.board, animal: A.board })[state.game](l, state.settings)}<p class="hint">${l.note}</p></div></section>
      <div><section class="panel"><div class="panel-head"><h2>設定你的計畫</h2><span class="label">老師可代填四組</span></div><div class="config-content"><div class="role-identity" id="role-identity"><strong>你是${R.groupFor(state.selectedSlot)}</strong><span>每組只選一次 · 第 ${state.selectedSlot+1} ${state.game==='sticker'?'張貼紙':'步'}</span></div>${config(l)}</div></section><section class="action-panel" aria-label="播放與結果"><div class="action-row"><button class="primary" id="play-button" data-action="${state.running ? 'stop' : 'play'}" ${!state.running && !isComplete() ? 'disabled' : ''}>${state.running ? '■ 停下來修改' : state.game === 'hero' ? '▶ 出發' : '▶ 播放看看'}</button>${state.game !== 'sticker' && state.running ? '<button class="secondary" data-action="pause">暫停</button>' : ''}<button class="speed" data-action="speed" aria-label="切換播放速度，目前 ${saved.speed} 倍">${saved.speed}×</button><button class="secondary" data-action="clear" ${state.running ? 'disabled' : ''}>清空</button></div><div class="status" id="status" role="status" aria-live="polite">${state.running ? '正在播放你的計畫…' : isComplete() ? '準備好了！猜猜會發生什麼，再按播放。' : `還有 ${state.settings.filter(v => v === null).length} ${state.game === 'hero' ? '個空格等你安排' : '個步驟等你設定'}。`}</div><div id="result" aria-live="polite"></div></section></div></div>
      <p class="bottom-note">本地教師模式：四組都由老師代填也可以。修改保留其他設定。</p></main></div>`;
    if (state.game === 'hero') V.paint(l, R.hero.initialRobot(l));
    if (state.game === 'penguin') I.paint(l, l.boards.map(b => b.start));
    if (state.game === 'animal') A.paint(l, l.lineup);
  }
  function select(machine, choice) {
    if (!state || state.running) return;
    const l = level(), allowed = R.optionsFor(state.game, l)[machine];
    if (!allowed || !allowed.includes(choice)) return;
    state.selectedSlot = machine;
    state.settings[machine] = choice;
    saved.drafts[l.id] = state.settings.slice(); save();
    state.result = null;
    renderGame();
    const button = app.querySelector(`[data-machine="${machine}"][data-choice="${choice}"]`);
    if (button) button.focus({ preventScroll: true });
  }
  function chooseHeroSlot(index) {
    if (!Number.isInteger(index) || index < 0 || index >= state.settings.length) return;
    state.selectedSlot = index;
    app.querySelector('.config-content').innerHTML = V.config(level(), state);
    app.querySelector(`[data-hero-slot="${index}"]`).focus({ preventScroll: true });
  }
  function placeHeroCommand(command, target = state.selectedSlot) {
    if (!state || state.game !== 'hero' || state.running || !Object.hasOwn(R.hero.COMMANDS, command)) return;
    if (!Number.isInteger(target) || target < 0 || target >= state.settings.length || !R.optionsFor('hero', level())[target].includes(command)) return;
    state.settings[target] = command;
    const nextEmpty = state.settings.findIndex((value, i) => i > target && value === null);
    const firstEmpty = state.settings.indexOf(null);
    state.selectedSlot = nextEmpty >= 0 ? nextEmpty : firstEmpty >= 0 ? firstEmpty : target;
    state.result = null;
    saved.drafts[level().id] = state.settings.slice(); save();
    renderGame();
    app.querySelector(`[data-command="${command}"]`).focus({ preventScroll: true });
  }
  function clearHeroSlot(index) {
    if (index < 0 || index >= state.settings.length) return;
    state.settings[index] = null; state.selectedSlot = index; state.result = null;
    saved.drafts[level().id] = state.settings.slice(); save();
    renderGame();
    app.querySelector(`[data-hero-slot="${index}"]`).focus({ preventScroll: true });
  }
  function duration(ms) { return reducedMotion.matches ? Math.min(ms, 100) : ms / saved.speed; }
  function animate(ms, token, update) {
    return new Promise(resolve => {
      const total = duration(ms); let previous, elapsed = 0;
      function frame(now) {
        if (token !== runToken) { resolve(false); return; }
        if (previous === undefined) previous = now;
        if (!state.paused) elapsed += now - previous;
        previous = now;
        if (state.paused) { requestAnimationFrame(frame); return; }
        const progress = Math.min(1, elapsed / total);
        if (update) update(progress);
        if (progress < 1) requestAnimationFrame(frame);
        else resolve(true);
      }
      requestAnimationFrame(frame);
    });
  }
  function activeMachine(index) {
    app.querySelectorAll('.machine').forEach((element, i) => element.classList.toggle('active-machine', i === index));
  }
  const setCopy = text => { const element = document.getElementById('stage-copy'); if (element) element.textContent = text; };
  async function playSticker(l,result,token) {
    for(const frame of result.frames) {
      app.querySelectorAll('.layer-step').forEach(e=>e.classList.remove('current'));
      if(frame.type==='rotate') {
        activeMachine(-1);
        const turn=document.getElementById('system-turn');turn.classList.add('current');document.getElementById('system-config').classList.add('current');
        setCopy('第 '+frame.after+' 張貼完：系統把整張作品向右轉一次。');
        const output=document.getElementById('sticker-output');output.classList.add('turning-board');
        if(!await animate(900,token,p=>{output.style.transform='rotate('+(90*p)+'deg) scale('+(1-.18*Math.sin(Math.PI*p))+')';}))return false;
        output.outerHTML=tileBoard(frame.board,l,'sticker-output');turn.classList.add('applied');
        if(!await animate(280,token))return false;document.getElementById('system-config').classList.remove('current');
      } else {
        activeMachine(frame.machine);
        document.getElementById('layer-'+frame.machine).classList.add('current');
        setCopy(R.groupFor(frame.machine)+'：第 '+(frame.machine+1)+' 張，貼上'+colorName(frame.color)+'。');
        if(!await animate(320,token))return false;
        document.getElementById('sticker-output').outerHTML=tileBoard(frame.board,l,'sticker-output');
        frame.mask.forEach(cell=>document.getElementById('sticker-output').children[cell].classList.add('fresh'));
        document.getElementById('layer-'+frame.machine).classList.add('applied');
        if(!await animate(560,token))return false;
      }
    }
    document.getElementById('sticker-output').outerHTML=tileBoard(result.board,l,'sticker-output',result.wrong);
    app.querySelectorAll('.layer-step').forEach(e=>e.classList.remove('current'));
    setCopy('貼好了！和左邊的目標比一比。');return true;
  }
  async function playHero(l,result,token) {
    let robot=R.hero.initialRobot(l);
    for(const frame of result.frames) {
      V.paint(l,robot);
      app.querySelectorAll('.hero-step').forEach(slot=>slot.classList.toggle('current',Number(slot.dataset.step)===frame.index));
      document.getElementById('hero-step-status').textContent='第 '+(frame.index+1)+' / '+l.steps+' 步';
      V.phase('第 '+(frame.index+1)+' 步 · 勇者'+R.hero.COMMANDS[frame.command].label, '先看勇者動作，接著才輪到怪物。','hero');
      setCopy('第 '+(frame.index+1)+' 步 · '+R.hero.COMMANDS[frame.command].label);
      const action=frame.actionRobot||frame.robot;
      const [fromX,fromY]=V.coord(robot.position),[toX,toY]=V.coord(action.position),actor=document.getElementById('hero-sprite');
      const entrance=frame.teleport?V.coord(frame.teleport.from):null;
      app.querySelectorAll('.warp-ring').forEach(e=>e.classList.toggle('warping',!!entrance));
      if(!await animate(entrance?720:500,token,p=>{
        if(entrance) {
          const a=l.portals.findIndex(p=>R.hero.same(p,frame.teleport.from)),names=['A 門','B 門'];
          V.phase(p<.5?'進入 '+names[a]:'從 '+names[1-a]+' 出來',names[a]+' → '+names[1-a]+'：這一步只傳送一次。','portal');
          if(p<.5) {const move=Math.min(1,p/.35);actor.setAttribute('transform','translate('+(fromX+(entrance[0]-fromX)*move)+' '+(fromY+(entrance[1]-fromY)*move)+')');actor.style.opacity=String(p<.35?1:1-(p-.35)/.15);}
          else {actor.setAttribute('transform','translate('+toX+' '+toY+')');actor.style.opacity=String(Math.min(1,(p-.5)/.25));}
        } else {const move=Math.min(1,p/.75);actor.setAttribute('transform','translate('+(fromX+(toX-fromX)*move)+' '+(fromY+(toY-fromY)*move)+')');}
      }))return false;
      actor.style.opacity='1';app.querySelectorAll('.warp-ring').forEach(e=>e.classList.remove('warping'));
      V.paint(l,action);
      if(frame.command==='attack'&&action.monsterDefeated&&!robot.monsterDefeated){V.phase('攻擊成功！'+(l.events?.some(e=>e.fire)?'火龍':'怪物')+'被擊退','出口打開，後續怪物行動會被阻止。','safe');if(!await animate(450,token))return false;}
      let view={...action},flames=[];
      for(const effect of frame.effects||[]) {
        const card=app.querySelector('.world-event[data-after="'+effect.after+'"]');
        card?.classList.add('current');
        if(card)card.querySelector('.event-state').textContent='執行中';
        setCopy('第 '+effect.after+' 步後 · '+effect.message);
        if(effect.kind==='move') {
          V.phase('第 '+effect.after+' 步後 · '+(l.events.some(e=>e.fire)?'火龍':'怪物')+R.hero.COMMANDS[effect.direction].label+'移動','藍圈是這次的移動終點。','move');
          const monster=document.getElementById('monster-sprite'),[sx,sy]=V.coord(effect.from),[tx,ty]=V.coord(effect.to);
          if(!await animate(400,token,p=>monster.setAttribute('transform','translate('+(sx+(tx-sx)*p)+' '+(sy+(ty-sy)*p)+')')))return false;
          view={...view,monsterPosition:effect.to};V.paint(l,view);
        } else if(effect.kind==='fire') {
          V.phase('火龍蓄力！準備'+R.hero.COMMANDS[effect.direction].label+'噴火','第 '+effect.after+' 步後 · 橘框是這次會燒到的格子。','fire');
          document.getElementById('monster-sprite').classList.add('charging');
          if(!await animate(450,token,p=>V.fireEffect(effect,p,true)))return false;
          V.phase('火龍'+R.hero.COMMANDS[effect.direction].label+'噴火！',effect.hit?'勇者在火焰範圍內，這一步失敗了。':'勇者在安全位置；等火熄滅，再繼續。','fire');
          flames=effect.cells;V.paint(l,view,flames);
          if(!await animate(1000,token,p=>V.fireEffect(effect,p)))return false;
          document.getElementById('monster-sprite').classList.remove('charging');
          if(!effect.hit){V.fireEffect(null);V.paint(l,view);flames=[];V.phase('火熄滅了','這次噴火結束，接著執行下一步。','safe');if(!await animate(380,token))return false;}
        } else {V.phase('已阻止！怪物不會再行動','先攻擊成功，所以第 '+effect.after+' 步後的行動取消。','safe');if(!await animate(700,token))return false;}
        if(card){card.classList.remove('current');card.classList.add(effect.kind==='cancel'?'cancelled':'played');card.querySelector('.event-state').textContent=effect.kind==='cancel'?'已阻止':'已執行';}
      }
      robot=frame.robot;V.paint(l,robot,flames);
      setCopy('第 '+(frame.index+1)+' 步 · '+frame.message);
      if(!frame.ok)app.querySelector('[data-step="'+frame.index+'"]').classList.add('failed');
    }
    V.fireEffect(null);if(!result.success)V.phase('第 '+(result.frames.at(-1).index+1)+' 步的結果',result.frames.at(-1).message,'fire');else V.phase('成功走到出口！','拿到寶劍、擊退怪物，完成整段計畫。','safe');
    return animate(350,token);
  }
  function penguinStepText(frame) {
    return frame.slides.map((slide, i) => `${I.names[i]}${slide.distance ? `滑了 ${slide.distance} 格${slide.atHome ? '，停在家裡' : ''}` : '被冰塊或邊界擋住，留在原地'}`).join('；');
  }
  async function playPenguin(l, result, token) {
    for (const frame of result.frames) {
      activeMachine(frame.index);
      app.querySelectorAll('.ice-step').forEach((e, i) => e.classList.toggle('current', i === frame.index));
      const direction = R.penguin.directions[frame.command];
      setCopy(`第 ${frame.index + 1} 步 · ${R.groupFor(frame.index)}：一起${direction.label}滑！`);
      const distance = Math.max(1, ...frame.slides.map(s => s.distance));
      const actors = frame.slides.map((slide, i) => {
        const actor = document.getElementById('ice-penguin-' + i);
        const badge = document.getElementById('ice-arrived-' + i);
        badge.textContent = slide.distance ? '滑行中…' : '前面擋住了';
        if (slide.distance) badge.classList.remove('home');
        return {actor, from: I.coord(l.boards[i], slide.path[0]), to: I.coord(l.boards[i], slide.position), distance: slide.distance};
      });
      // 所有企鵝共用一段時間軸；滑得較短的先停，另一隻繼續。
      if (!await animate(180 + 110 * distance, token, p => actors.forEach(a => {
        const move = a.distance ? Math.min(1, p * distance / a.distance) : 0;
        a.actor.setAttribute('transform', `translate(${a.from[0] + (a.to[0] - a.from[0]) * move} ${a.from[1] + (a.to[1] - a.from[1]) * move})`);
      }))) return false;
      I.paint(l, frame.positions);
      setCopy(`第 ${frame.index + 1} 次 · ${penguinStepText(frame)}。`);
      document.getElementById('ice-step-' + frame.index).classList.add('played');
      if (!await animate(260, token)) return false;
    }
    app.querySelectorAll('.ice-step').forEach(e => e.classList.remove('current'));
    return true;
  }
  async function playAnimal(l,result,token) {
    for(const frame of result.frames) {
      activeMachine(frame.index);
      app.querySelectorAll('.animal-step').forEach((e,i)=>e.classList.toggle('current',i===frame.index));
      const action=R.animal.actions[frame.command],names=R.animal.animals;
      const moving=frame.command==='swap'?names[frame.before[0]].name+'和'+names[frame.before[1]].name+'交換。':names[frame.before[0]].name+'走到隊伍最後。';
      document.getElementById('animal-caption').textContent=R.groups[frame.index]+' · '+action.label;
      setCopy('第 '+(frame.index+1)+' 步：'+moving);
      if(!await animate(320,token))return false;
      if(!await animate(1050,token,p=>A.move(l,frame,p)))return false;
      A.paint(l,frame.board);
      if(!await animate(300,token))return false;
    }
    app.querySelectorAll('.animal-step').forEach(e=>e.classList.remove('current'));
    activeMachine(-1);
    document.getElementById('animal-caption').textContent='四步完成 · 一起拍照！';
    const stage=document.getElementById('animal-stage');
    if(!await animate(420,token,p=>stage.style.backgroundColor='rgba(255,231,162,'+(Math.sin(p*Math.PI)*.7)+')'))return false;
    stage.style.backgroundColor='';A.paint(l,result.board,result.wrong);
    document.getElementById('animal-caption').textContent='合照完成 · 和目標照片比一比';
    setCopy(result.success?'喀嚓！大家站對位置了！':'有驚嘆號的位置和目標不同。設定都還在，可以改一組再試。');
    return true;
  }
  function resultMarkup(l, result) {
    let message, reflection, log;
    if (state.game === 'sticker') {
      message = result.success ? '每一格都和目標一樣。你的貼紙順序成功了！' : `有 ${result.wrong.length} 格和目標不同，已用「!」標出。看看那一格最後被哪台機器蓋住。`;
      reflection = l.rotateAfter ? '想一想：哪些貼紙跟著轉了？如果老師組在轉盤前就貼上，圖案會有什麼不同？' : '想一想：如果把兩台的顏色交換，哪些格子會改變？';
      log = result.frames.map(f => f.type==='rotate' ? '系統：第 '+f.after+' 張貼完，整張作品向右轉一次。' : R.groupFor(f.machine)+'貼上'+colorName(f.color)+'，覆蓋 '+f.mask.length+' 格。');
    } else if (state.game === 'animal') {
      message = result.success ? '喀嚓！四步結束，所有動物都和目標照片站在同樣的位置。' : '有 '+result.wrong.length+' 個位置和目標不同。回想哪一步開始改變了隊伍。';
      reflection = '想一想：第 2 組說的「前兩隻」，和一開始的前兩隻一樣嗎？';
      log = result.frames.map(f => R.groups[f.index]+'：'+R.animal.actions[f.command].label+' → '+f.board.map(id=>R.animal.animals[id].name).join('、'));
    } else if (state.game === 'penguin') {
      message = result.success ? `${l.steps} 次滑行結束，${l.boards.length === 1 ? '小紅已經' : '兩隻企鵝都'}停在家裡！` : `${l.steps} 次滑行結束，${result.arrived.filter(Boolean).length} / ${l.boards.length} 隻停在家裡。看看哪一步開始，位置和你想的不一樣。`;
      reflection = l.boards.length === 1 ? '想一想：這次是冰塊，還是邊界幫你停下來？' : '想一想：同一個方向，為什麼兩隻滑的距離不一樣？哪一次要讓一隻先停下？';
      log = result.frames.map(f => `第 ${f.index + 1} 次${R.penguin.directions[f.command].label}：${penguinStepText(f)}。`);
    } else {
      const last = result.frames[result.frames.length - 1];
      message = result.success ? `四個空格接上了已排好的指令。勇者走完 ${l.steps} 步，拿到劍、打敗怪物，也走到了出口！` : result.robot.failed ? `第 ${last.index + 1} 步「${R.hero.COMMANDS[last.command].label}」：${last.message}` : '指令用完了，勇者還沒走到出口。想想哪一段可以改變。';
      reflection = '想一想：哪些已排好的指令，能幫你推理前面的空格？';
      log = result.frames.map(f => `第 ${f.index + 1} 步 ${R.hero.COMMANDS[f.command].label}：${f.message}`);
    }
    const next = state.index < games[state.game].levels.length - 1;
    return `<div class="result ${result.success ? 'success' : ''}" data-success="${result.success}"><h3>${result.success ? '✓ 計畫成功！' : '再想一下，找到新線索了'}</h3><p>${message}</p><details style="margin-top:10px;font-size:18px;line-height:1.85"><summary style="cursor:pointer">看看這次的過程</summary><ol style="padding-left:20px;margin-bottom:8px">${log.map(text => `<li>${text}</li>`).join('')}</ol></details><div class="reflection">${result.success ? reflection : '設定都還在。改一個地方，再播放看看會有什麼不同。'}</div>${result.success ? `<button class="secondary next" data-action="${next ? 'next' : 'home'}">${next ? '下一個挑戰 →' : '這一區完成了！回遊戲選單 →'}</button>` : ''}</div>`;
  }
  async function play() {
    if (!state || state.running || !isComplete()) return;
    const token = ++runToken, l = level();
    state.running = true; state.paused = false; state.result = null;
    const result = R.run(state.game, l, state.settings.slice());
    renderGame();
    app.querySelector('.board-content').scrollIntoView({ block: 'start', behavior: 'auto' });
    const finished = await ({ sticker: playSticker, hero: playHero, penguin: playPenguin, animal: playAnimal })[state.game](l, result, token);
    if (!finished || token !== runToken) return;
    state.running = false; state.result = result;
    if (result.success) markComplete(l.id);
    activeMachine(-1);
    app.querySelectorAll('[data-machine], [data-command], [data-hero-slot], [data-clear-slot], [data-action="clear"]').forEach(e => { e.disabled = false; });
    app.querySelector('[data-action="pause"]')?.remove();
    app.querySelectorAll('[data-command]').forEach(e => e.draggable = true);
    const playButton = document.getElementById('play-button');
    playButton.dataset.action = 'play'; playButton.textContent = '↻ 再播放一次';
    document.getElementById('status').textContent = '播放結束。可以直接修改設定，繼續試試。';
    document.getElementById('result').innerHTML = resultMarkup(l, result);
    if (result.success) app.querySelector(`[data-level="${state.index}"]`).classList.add('completed');
    if (window.innerWidth <= 680) app.querySelector('.action-panel').scrollIntoView({ block: 'center', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  }
  app.addEventListener('click', event => {
    const button = event.target.closest('[data-action],[data-game],[data-level],[data-machine],[data-command],[data-hero-slot],[data-clear-slot]');
    if (!button || button.disabled) return;
    if (button.dataset.game) { openGame(button.dataset.game); return; }
    if (button.dataset.action === 'home') { home(); return; }
    if (!state) return;
    if (button.dataset.level !== undefined) { openGame(state.game, Number(button.dataset.level)); return; }
    if (button.dataset.machine !== undefined) {
      const choice = button.dataset.choice;
      select(Number(button.dataset.machine), choice); return;
    }
    if (state.game === 'hero' && !state.running) {
      if (button.dataset.heroSlot !== undefined) { chooseHeroSlot(Number(button.dataset.heroSlot)); return; }
      if (button.dataset.command) { placeHeroCommand(button.dataset.command); return; }
      if (button.dataset.clearSlot !== undefined) { clearHeroSlot(Number(button.dataset.clearSlot)); return; }
    }
    switch (button.dataset.action) {
      case 'play': play().catch(error => {
        console.error(error);
        if (!state) return;
        ++runToken; state.running = false; renderGame();
        document.getElementById('status').textContent = '播放暫停了，設定仍保留。請再播放一次。';
      }); break;
      case 'stop': ++runToken; state.running = false; state.paused = false; state.result = null; renderGame(); break;
      case 'pause': state.paused = !state.paused; button.textContent = state.paused ? '繼續' : '暫停'; document.getElementById('status').textContent = state.paused ? '暫停中，可以慢慢看目前的位置。' : '繼續播放你的計畫…'; break;
      case 'speed': saved.speed = saved.speed === 1 ? 2 : 1; save(); button.textContent = saved.speed + '×'; button.setAttribute('aria-label', `切換播放速度，目前 ${saved.speed} 倍`); break;
      case 'clear': state.selectedSlot = 3; state.settings = R.defaults(state.game, level()); state.result = null; saved.drafts[level().id] = state.settings.slice(); save(); renderGame(); break;
      case 'next': openGame(state.game, state.index + 1); break;
    }
  });
  app.addEventListener('keydown', event => {
    if (!state || state.game !== 'hero' || state.running || event.ctrlKey || event.altKey || event.metaKey || event.target.matches('input,textarea,select')) return;
    const directions = { ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', ArrowLeft: 'left' };
    if (directions[event.key]) { event.preventDefault(); placeHeroCommand(directions[event.key]); }
    if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); clearHeroSlot(state.selectedSlot); }
  });
  app.addEventListener('dragstart', event => {
    const command = event.target.closest('[data-command]');
    if (!command || !state || state.running) { event.preventDefault(); return; }
    event.dataTransfer.setData('text/plain', command.dataset.command);
    event.dataTransfer.effectAllowed = 'copy';
  });
  app.addEventListener('dragover', event => {
    if (state?.game === 'hero' && !state.running && event.target.closest('[data-hero-slot]')) event.preventDefault();
  });
  app.addEventListener('drop', event => {
    const slot = event.target.closest('[data-hero-slot]');
    if (!slot || state?.game !== 'hero' || state.running) return;
    event.preventDefault();
    placeHeroCommand(event.dataTransfer.getData('text/plain'), Number(slot.dataset.heroSlot));
  });
  home();
})();
