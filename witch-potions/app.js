(function () {
  'use strict';
  const G = window.Potions;
  const $ = id => document.getElementById(id);
  const colors = ['#ce577b', '#d9ac47', '#559173'];
  const pale = ['#f4c8d7', '#f5e4ad', '#c8e4d1'];
  const storageKey = 'witch-potions-v1';
  let current = 0;
  let games = G.levels.map(() => []);
  let completed = [];
  let selection = null;
  let state = G.initial();
  let animationTimer;
  let busy = false;
  let pointer = { x: 0, y: 0, mouse: false, inside: false };
  let flightAnimations = [];

  function ingredientMark(i) {
    return [
      '<path d="M20 23V38M20 33Q6 32 9 24Q19 24 20 33M20 29Q32 29 33 21Q22 21 20 29" fill="#659568" stroke="#659568" stroke-width="2"/><path d="M20 4C9 -1 1 12 8 20C4 27 16 31 21 26C30 30 38 20 33 14C36 6 27 0 20 4Z" fill="#ce577b"/><path d="M12 12Q20 4 28 12Q32 21 21 23Q11 23 12 14Q19 10 25 15Q27 20 20 19" fill="none" stroke="#ffe0e8" stroke-width="2.3" stroke-linecap="round"/>',
      '<path d="M28 3C9 -2 -2 20 10 33C22 45 39 34 39 22C22 29 15 12 28 3Z" fill="#e4b95b" stroke="#ae8036" stroke-width="1.3"/><path d="M33 2L35 7L40 9L35 11L33 16L31 11L26 9L31 7Z" fill="#f1d58c"/>',
      '<path d="M7 21C7 0 33 0 33 21L36 36L28 32L21 37L14 32L5 36Z" fill="#8abe9a" stroke="#4a8565" stroke-width="2"/><ellipse cx="15" cy="19" rx="3" ry="4" fill="#365d50"/><ellipse cx="26" cy="19" rx="3" ry="4" fill="#365d50"/><path d="M17 27Q21 30 25 26" fill="none" stroke="#365d50" stroke-width="2" stroke-linecap="round"/>'
    ][i];
  }
  function icon(i) {
    return `<span class="ingredient-icon" role="img" aria-label="${G.ingredients[i].name}" title="${G.ingredients[i].name}"><svg viewBox="0 0 42 42" aria-hidden="true">${ingredientMark(i)}</svg></span>`;
  }
  function iconText(text) {
    return G.ingredients.reduce((value, ingredient, i) => value.replaceAll(ingredient.name, icon(i)), text);
  }
  function recipeMarkup(amounts, showZero = false) {
    return amounts.map((amount, i) => amount || showZero ? `<span class="recipe-term tone-${i}" aria-label="${G.ingredients[i].name} ${amount} 份">${icon(i)}<b>× ${amount}</b></span>` : '').filter(Boolean).join('<span class="recipe-plus" aria-hidden="true">＋</span>');
  }
  function potionArt(type) {
    const effect = {
      love: '<g fill="#d96990"><path d="M43 29C20 11 34 0 44 11C57 -1 69 14 43 29Z"/><path d="M94 22C78 9 88 0 96 7C105 -1 115 9 94 22Z"/><path d="M76 43C61 30 70 23 77 29C85 21 94 32 76 43Z"/></g>',
      poison: '<path d="M72 39V13" stroke="#69894d" stroke-width="4"/><path d="M72 27Q40 26 48 7Q69 7 72 27M72 19Q101 18 97 1Q77 1 72 19" fill="#9ab867"/>',
      frog: '<g fill="#8cae6b" stroke="#57784d" stroke-width="2"><ellipse cx="72" cy="25" rx="25" ry="16"/><circle cx="58" cy="11" r="9"/><circle cx="85" cy="11" r="9"/></g><circle cx="58" cy="11" r="3" fill="#3e5141"/><circle cx="85" cy="11" r="3" fill="#3e5141"/><path d="M62 28Q72 36 83 28" fill="none" stroke="#57784d" stroke-width="2"/>',
      cat: '<path d="M48 17L48 0L63 10Q72 6 81 10L96 0L96 21Q94 41 72 41Q50 41 48 17Z" fill="#554765"/><ellipse cx="62" cy="23" rx="4" ry="6" fill="#efd18c"/><ellipse cx="83" cy="23" rx="4" ry="6" fill="#efd18c"/><path d="M69 31H75L72 34Z" fill="#eeb6bf"/>'
    }[type];
    const liquid={love:'#d987a7',poison:'#a1ad67',frog:'#82b894',cat:'#9183b8'}[type];
    return `<svg viewBox="0 0 145 155" aria-hidden="true"><ellipse cx="72" cy="146" rx="41" ry="5" fill="#d9cddc" opacity=".5"/><path d="M60 51H84V72Q113 88 110 119Q109 143 88 143H57Q35 143 34 121Q31 88 60 72Z" fill="#f7f1ff" stroke="#9684a2" stroke-width="2.5"/><path d="M40 102Q72 96 105 102V120Q103 138 87 138H57Q41 138 40 120Z" fill="${liquid}"/><ellipse cx="72" cy="103" rx="32" ry="5" fill="${liquid}"/><rect x="57" y="47" width="30" height="12" rx="4" fill="#b89a78"/><path d="M48 92L55 84M45 101V116" stroke="white" stroke-width="5" stroke-linecap="round"/>${effect}</svg>`;
  }

  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify({ version: 1, current, games, completed })); } catch (_) { /* The game also works when browser storage is unavailable. */ }
  }
  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(storageKey));
      if (!data || data.version !== 1) return;
      if (Number.isInteger(data.current) && data.current >= 0 && data.current < G.levels.length) current = data.current;
      completed = Array.isArray(data.completed) ? [...new Set(data.completed.filter(id => G.levels.some(level => level.id === id)))] : [];
      if (Array.isArray(data.games)) data.games.slice(0, G.levels.length).forEach((actions, i) => {
        if (!Array.isArray(actions) || actions.length > 5000) return;
        try { G.replay(G.levels[i], actions); games[i] = actions; } catch (_) { /* Ignore an incompatible draft. */ }
      });
    } catch (_) { /* Start fresh if saved data cannot be read. */ }
  }

  function characterArt(type, result) {
    let portrait = '';
    if (result === 'frog') {
      portrait = '<ellipse cx="100" cy="140" rx="48" ry="27" fill="#7fa679"/><ellipse cx="100" cy="96" rx="49" ry="40" fill="#94bb82"/><circle cx="74" cy="70" r="20" fill="#94bb82"/><circle cx="126" cy="70" r="20" fill="#94bb82"/><circle cx="75" cy="70" r="10" fill="#fff7df"/><circle cx="125" cy="70" r="10" fill="#fff7df"/><circle cx="77" cy="71" r="5" fill="#443c54"/><circle cx="123" cy="71" r="5" fill="#443c54"/><path d="M78 108 Q100 124 122 108" fill="none" stroke="#466549" stroke-width="4" stroke-linecap="round"/><path d="M78 48 L82 26 Q100 13 118 26 L122 48Z" fill="#9da5b8"/><path d="M96 24V47" stroke="#e3e4e7" stroke-width="5"/><circle cx="143" cy="133" r="10" fill="none" stroke="#d4ac54" stroke-width="5"/>';
    } else if (result === 'cat') {
      portrait = '<path d="M137 142 Q181 130 157 108" fill="none" stroke="#51465e" stroke-width="16" stroke-linecap="round"/><ellipse cx="101" cy="137" rx="37" ry="29" fill="#51465e"/><path d="M60 79 L62 43 L87 59 Q101 52 116 58 L140 43 L141 89 Q139 121 101 124 Q62 121 60 79" fill="#51465e"/><path d="M71 59 L72 79 L83 68 M129 59 L117 68 L131 79" fill="#b48699"/><ellipse cx="83" cy="88" rx="8" ry="11" fill="#e5c16f"/><ellipse cx="119" cy="88" rx="8" ry="11" fill="#e5c16f"/><path d="M83 81V94 M119 81V94" stroke="#51465e" stroke-width="3"/><path d="M97 101 L105 101 L101 106Z" fill="#dfa8b5"/><ellipse cx="101" cy="47" rx="25" ry="16" fill="#d79757"/><path d="M103 32Q99 22 110 20" fill="none" stroke="#6f8a5d" stroke-width="6" stroke-linecap="round"/>';
    } else if (type === 'wolf') {
      portrait = '<path d="M56 71 L49 28 Q78 30 90 60 L115 59 Q128 29 153 32 L148 79Z" fill="#8c879e"/><path d="M59 42L64 73L80 60 M139 45L125 63L141 75" fill="#d7b5c2"/><path d="M53 134 Q101 115 146 134 L156 168H44Z" fill="#77688d"/><path d="M102 151L87 135L80 157L102 151L122 157L114 135Z" fill="#d6b075"/><path d="M51 76 Q98 37 149 76 L153 106 Q147 142 101 143 Q56 143 48 108Z" fill="#a19bad"/><path d="M54 103Q72 106 84 94Q103 112 117 94Q130 104 148 102Q144 138 101 141Q63 139 54 103" fill="#e4ddd8"/><ellipse cx="81" cy="89" rx="5" ry="7" fill="#443c54"/><ellipse cx="123" cy="89" rx="5" ry="7" fill="#443c54"/><path d="M91 107Q101 102 111 107L101 117Z" fill="#51465e"/><path d="M101 116V123Q109 131 119 120 M101 123Q93 130 84 120" fill="none" stroke="#746879" stroke-width="3" stroke-linecap="round"/>';
    } else if (type === 'skeleton') {
      portrait = '<path d="M61 135Q98 120 138 136L147 169H53Z" fill="#89a18a"/><path d="M79 134L85 162H117L123 134" fill="#d4b98e"/><path d="M57 75Q56 35 100 34Q144 35 145 76L138 113L123 129H77L61 110Z" fill="#f3e7cc"/><ellipse cx="79" cy="83" rx="14" ry="16" fill="#665a72"/><ellipse cx="122" cy="83" rx="14" ry="16" fill="#665a72"/><path d="M96 102L101 94L106 102Z" fill="#998574"/><path d="M78 115H122M87 110V122M101 110V125M115 110V122" stroke="#baa18a" stroke-width="3" stroke-linecap="round"/><path d="M42 56Q100 40 159 57" fill="none" stroke="#a3ad77" stroke-width="13" stroke-linecap="round"/><path d="M63 49L71 25Q100 12 133 28L140 49Z" fill="#a3ad77"/><path d="M157 113V163" stroke="#a18467" stroke-width="7"/><path d="M145 103H169L164 122H150Z" fill="#abb5af"/>';
    } else if (type === 'knight') {
      portrait = '<path d="M57 132Q98 116 141 135L151 169H47Z" fill="#8793a9"/><path d="M56 136L44 168H65L76 127 M133 130L143 168H158L146 139" fill="#b58d9b"/><path d="M54 82Q55 34 101 33Q146 35 148 84L141 124L121 139H79L59 122Z" fill="#a8b1c3"/><path d="M68 75Q100 55 135 77V112Q100 135 68 113Z" fill="#edd6b9"/><circle cx="86" cy="93" r="5" fill="#51465e"/><circle cx="118" cy="93" r="5" fill="#51465e"/><path d="M92 112Q101 118 110 111" fill="none" stroke="#a57370" stroke-width="3" stroke-linecap="round"/><path d="M57 77H145M100 36V75" stroke="#d8dce4" stroke-width="8"/><path d="M100 34Q96 11 119 16" fill="none" stroke="#bc7995" stroke-width="11" stroke-linecap="round"/>';
    } else {
      portrait = '<path d="M64 129Q100 116 138 135L146 170H55Z" fill="#81768e"/><ellipse cx="100" cy="89" rx="55" ry="49" fill="#dba360"/><ellipse cx="101" cy="88" rx="32" ry="48" fill="#e9b16b"/><ellipse cx="101" cy="88" rx="11" ry="46" fill="#efbc79"/><path d="M100 42Q92 24 107 20" fill="none" stroke="#82976b" stroke-width="9" stroke-linecap="round"/><path d="M76 78L63 94H87Z M126 78L114 94H139Z" fill="#685148"/><path d="M81 109Q100 126 121 109" fill="none" stroke="#685148" stroke-width="5" stroke-linecap="round"/><path d="M87 121L98 133L109 122" fill="#685148"/>';
    }
    const decoration = result === 'love' ? '<g fill="#c77798"><path class="spark" d="M30 69C14 56 26 44 34 52C43 42 54 55 34 70Z"/><path class="spark" d="M163 42C149 31 161 20 167 28C177 19 185 33 166 45Z"/><path class="spark" d="M164 112C153 102 163 94 170 102C177 94 185 105 169 116Z"/></g>' : result === 'poison' ? '<g class="spark"><path d="M164 169V145" stroke="#7f9965" stroke-width="4"/><ellipse cx="157" cy="146" rx="10" ry="5" fill="#97b17a" transform="rotate(25 157 146)"/><ellipse cx="172" cy="140" rx="10" ry="5" fill="#97b17a" transform="rotate(-25 172 140)"/></g>' : result === 'failure' ? '<g class="spark" fill="#d7a8cb" opacity=".8"><circle cx="42" cy="103" r="20"/><circle cx="163" cy="61" r="15"/><circle cx="159" cy="121" r="9"/></g>' : '<g fill="#c9b484"><path d="M33 65L36 74L45 77L36 80L33 89L30 80L21 77L30 74Z"/><path d="M165 44L167 49L173 51L167 53L165 59L163 53L157 51L163 49Z"/></g>';
    return `<svg viewBox="0 0 200 185" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="95" r="78" fill="#ede6db"/><ellipse cx="101" cy="170" rx="66" ry="6" fill="#cfc2b5" opacity=".45"/>${portrait}${decoration}</svg>`;
  }
  function bottleArt(i) {
    return `<svg viewBox="0 0 60 90" aria-hidden="true" style="color:${colors[i]}"><path d="M22 9H38V29L47 39Q53 45 52 58V75Q51 84 42 84H18Q8 84 8 74V53Q8 45 14 39L22 29Z" fill="currentColor" opacity=".2"/><path d="M11 50Q30 45 49 50V74Q49 81 41 81H19Q11 81 11 74Z" fill="currentColor" opacity=".75"/><path d="M22 10H38V29L47 39Q52 45 52 54V74Q52 84 42 84H18Q8 84 8 74V54Q8 45 14 39L22 29Z" fill="none" stroke="currentColor" stroke-width="2.5"/><rect x="20" y="5" width="20" height="10" rx="3" fill="#ae8f74"/><rect x="14" y="49" width="32" height="31" rx="7" fill="#fff6e7"/><g transform="translate(17 51) scale(.64)">${ingredientMark(i)}</g><path d="M17 42L22 35" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/></svg>`;
  }
  function cupArt(index, shownState = state, suffix = '') {
    const cup = shownState.cups[index];
    const top = index === 0 ? 22 : 46;
    const bottom = 148;
    const height = (bottom - top - 5) * cup.amount / G.levels[current].capacities[index];
    const color = cup.ingredient === null ? '#d9d0df' : colors[cup.ingredient];
    const clip = `cup-clip-${index}${suffix}`;
    return `<svg viewBox="0 0 145 164"><defs><clipPath id="${clip}"><path d="M27 ${top + 4}H106L99 142Q99 148 91 148H44Q35 148 34 140Z"/></clipPath></defs><path d="M107 ${top + 21}H118Q135 ${top + 21}132 ${top + 44}Q129 ${top + 61}104 ${top + 62}" fill="none" stroke="#b4a7b8" stroke-width="6"/><path d="M24 ${top}H113L106 ${top + 8}L100 142Q100 151 91 151H43Q34 151 32 141Z" fill="#f5f0f5" stroke="#a99bad" stroke-width="2.5"/><g clip-path="url(#${clip})"><rect x="25" y="${bottom - height}" width="90" height="${height + 2}" fill="${color}" opacity=".72"/>${cup.amount ? `<ellipse cx="67" cy="${bottom - height + 1}" rx="40" ry="3" fill="${pale[cup.ingredient]}"/>` : ''}</g><path d="M41 ${top + 17}L45 ${Math.max(top + 30, 115)}" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".8"/><ellipse cx="69" cy="155" rx="48" ry="3" fill="#baaaaf" opacity=".16"/></svg>`;
  }
  function potArt(shownState = state) {
    const total = shownState.pot.reduce((sum, v) => sum + v, 0);
    const active = shownState.pot.map((v, i) => v ? i : -1).filter(i => i >= 0);
    const color = active.length > 1 ? '#9b75b4' : active.length ? colors[active[0]] : '#bfb3c5';
    return `<svg viewBox="0 0 185 164"><path d="M43 140L38 155M140 140L146 155" stroke="#655576" stroke-width="10" stroke-linecap="round"/><path d="M36 79Q16 68 16 90Q15 104 34 103 M150 79Q170 68 170 90Q171 104 151 103" fill="none" stroke="#655576" stroke-width="8"/><path d="M38 70Q22 105 37 129Q48 149 92 150Q140 149 151 126Q163 99 146 70Z" fill="#665477"/><path d="M44 95Q35 118 53 129" fill="none" stroke="#91809d" stroke-width="6" stroke-linecap="round"/><ellipse cx="92" cy="72" rx="61" ry="17" fill="#514260"/><ellipse cx="92" cy="71" rx="53" ry="12" fill="${color}" opacity="${total ? 1 : .4}"/><path d="M62 69Q91 62 116 69" fill="none" stroke="#fff" opacity=".3" stroke-width="3" stroke-linecap="round"/><path d="M84 111L89 121L101 123L92 130L94 141L84 135L74 140L76 128L68 121L80 120Z" fill="#dac592" transform="translate(7 -13) scale(.95)"/>${total ? `<circle cx="73" cy="48" r="5" fill="${color}" opacity=".5"/><circle cx="110" cy="34" r="7" fill="${color}" opacity=".45"/><circle cx="93" cy="54" r="3" fill="${color}" opacity=".6"/>` : '<path d="M86 39Q76 29 86 16M104 43Q116 32 105 20" fill="none" stroke="#cec2cf" stroke-width="3" stroke-linecap="round"/>'}</svg>`;
  }
  function status(message, error) {
    $('status').textContent = message;
    $('status').hidden = !message;
    $('status').classList.toggle('error', !!error);
  }
  function renderOrders() {
    $('orders').innerHTML = G.levels.map((level, i) => `<button class="order-tab" type="button" data-level="${i}" ${i === current ? 'aria-current="step"' : ''}><span class="tab-number">${i + 1}</span><span>${level.name}</span>${completed.includes(level.id) ? '<span class="tab-done" aria-label="已完成">✓</span>' : ''}</button>`).join('');
  }
  function renderLevel() {
    const level = G.levels[current];
    renderOrders();
    $('order-number').textContent = `訂單 ${String(current + 1).padStart(2, '0')} / 04`;
    $('order-name').textContent = level.name;
    $('customer-name').textContent = level.customer;
    $('customer-quote').textContent = `「${level.quote}」`;
    $('customer-art').innerHTML = characterArt(level.character);
    $('recipe').innerHTML = recipeMarkup(level.recipe);
    $('recipe').setAttribute('aria-label', level.recipe.map((amount, i) => amount ? `${G.ingredients[i].name} ${amount} 份` : '').filter(Boolean).join('，'));
    $('target-potion').innerHTML = potionArt(level.id);
    $('target-potion').setAttribute('aria-label', level.name + '：藥水瓶與魔法效果');
    $('hint-lesson').textContent = level.lesson;
    $('hint-text').innerHTML = iconText(level.hint);
    $('solution-list').innerHTML = level.solution.map(action => `<li>${iconText(G.describe(action))}</li>`).join('');
    level.capacities.forEach((capacity, i) => { $('cup-label-' + i).innerHTML = `${G.cupName(i)} <small>容量 ${capacity} 份</small>`; });
    render();
  }
  function render(shownState = state) {
    const level = G.levels[current];
    $('order-complete').hidden = !completed.includes(level.id);
    $('undo').disabled = !games[current].length || busy;
    $('reset').disabled = busy;
    $('brew').disabled = !state.pot.some(Boolean) || busy;
    $('waste').disabled = !selection || selection.kind !== 'cup' || busy;
    $('cancel').hidden = !selection;
    document.querySelectorAll('[data-ingredient]').forEach(button => {
      button.setAttribute('aria-pressed', String(selection?.kind === 'ingredient' && selection.index === Number(button.dataset.ingredient)));
      button.disabled = busy;
    });
    shownState.cups.forEach((cup, i) => {
      const selected = selection?.kind === 'cup' && selection.index === i;
      $('cup-' + i).disabled = busy;
      $('cup-' + i).setAttribute('aria-pressed', String(selected));
      $('cup-' + i).classList.toggle('is-target', !!selection && !selected);
      $('cup-' + i).setAttribute('aria-label', `${G.cupName(i)}，容量 ${level.capacities[i]} 份，${cup.amount ? `裝有${G.ingredients[cup.ingredient].name}` : '空杯'}`);
      $('cup-art-' + i).innerHTML = cupArt(i, shownState);
      $('cup-contents-' + i).innerHTML = cup.amount ? `${icon(cup.ingredient)}${cup.amount === level.capacities[i] ? ' 滿杯' : ''}` : '空杯';
    });
    $('pot').disabled = busy;
    $('pot').classList.toggle('is-target', selection?.kind === 'cup');
    $('pot-art').innerHTML = potArt(shownState);
    $('pot-contents').innerHTML = shownState.pot.some(Boolean) ? shownState.pot.map((amount, i) => amount ? icon(i) : '').join('') : '等你加入魔法';
    $('pot-recipe').innerHTML = shownState.pot.some(Boolean) ? recipeMarkup(shownState.pot) : '<span class="empty-pot">還是空鍋</span>';
    $('selection-guide').innerHTML = !selection ? '點原料裝杯；點有藥液的杯子開始倒。' : selection.kind === 'ingredient' ? `${icon(selection.index)} → 點一個量杯補滿` : `已選${G.cupName(selection.index)} → 點另一杯、大鍋或廢液桶`;
    syncCursor();
  }
  function cursorVisible() {
    return !!selection && pointer.mouse && pointer.inside && !busy && !document.querySelector('dialog[open]');
  }
  function moveCursor() {
    const visible = cursorVisible();
    $('carry-cursor').hidden = !visible;
    document.body.classList.toggle('carrying', visible);
    const x = Math.min(pointer.x + 13, window.innerWidth - 70);
    const y = Math.max(4, Math.min(pointer.y - 24, window.innerHeight - 92));
    $('carry-cursor').style.transform = `translate(${x}px, ${y}px) rotate(-12deg)`;
  }
  function syncCursor() {
    if (selection) $('carry-cursor').innerHTML = selection.kind === 'ingredient' ? bottleArt(selection.index) : cupArt(selection.index, state, '-cursor') + icon(state.cups[selection.index].ingredient);
    moveCursor();
  }
  function cancelSelection() {
    if (!selection) return;
    selection = null; render(); status('已放下容器，可以重新選擇。');
  }
  function finishAnimation() {
    clearTimeout(animationTimer);
    flightAnimations.forEach(animation => animation.cancel());
    flightAnimations = [];
    $('pour-flight').hidden = true;
    $('pour-stream').hidden = true;
    busy = false;
    $('pot').classList.remove('pot-animate');
  }
  function animatePour(action, before) {
    const [kind, from, to] = action;
    const source = kind === 'fill' ? document.querySelector(`[data-ingredient="${to}"] svg`) : $('cup-art-' + from);
    const target = kind === 'fill' ? $('cup-art-' + from) : kind === 'pour' ? $('cup-art-' + to) : kind === 'pot' ? $('pot-art') : $('waste');
    const a = source.getBoundingClientRect(), b = target.getBoundingClientRect();
    const ingredient = kind === 'fill' ? to : before.cups[from].ingredient;
    const flight = $('pour-flight'), stream = $('pour-stream');
    flight.innerHTML = kind === 'fill' ? bottleArt(to) : cupArt(from, before, '-flight');
    flight.dataset.source = kind === 'fill' ? 'ingredient-' + to : 'cup-' + from;
    flight.dataset.target = kind === 'fill' ? 'cup-' + from : kind === 'pour' ? 'cup-' + to : kind;
    flight.hidden = false; stream.hidden = false;
    const mouthX = b.left + b.width * .5;
    const mouthY = b.top + b.height * (kind === 'pot' ? .43 : kind === 'empty' ? .35 : (kind === 'fill' ? from : to) === 0 ? .15 : .3);
    const x = Math.max(0, Math.min(window.innerWidth - 88, mouthX - 67)), y = mouthY - 94;
    const position = (left, top, angle = 0) => `translate(${left}px,${top}px) rotate(${angle}deg)`;
    flightAnimations.push(flight.animate([
      {transform:position(a.left + a.width/2 - 44, a.top), opacity:.8, offset:0},
      {transform:position(x,y), opacity:1, offset:.28},
      {transform:position(x,y,62), opacity:1, offset:.43},
      {transform:position(x,y,62), opacity:1, offset:.8},
      {transform:position(x,y,5), opacity:0, offset:1}
    ], {duration:520,easing:'ease-in-out',fill:'forwards'}));
    stream.style.left = (mouthX - 3) + 'px'; stream.style.top = (mouthY - 33) + 'px'; stream.style.background = colors[ingredient];
    flightAnimations.push(stream.animate([
      {opacity:0,transform:'scaleY(0)',offset:0}, {opacity:0,transform:'scaleY(0)',offset:.4},
      {opacity:.85,transform:'scaleY(1)',offset:.52}, {opacity:.85,transform:'scaleY(1)',offset:.8},
      {opacity:0,transform:'scaleY(.4)',offset:1}
    ], {duration:520,fill:'forwards'}));
    if (kind === 'pot') $('pot').classList.add('pot-animate');
    animationTimer = setTimeout(() => { finishAnimation(); render(); }, 540);
  }
  function act(action) {
    if (busy) return;
    const result = G.apply(G.levels[current], state, action);
    if (!result.ok) { status(result.message, true); return; }
    const before = state;
    games[current].push(action);
    state = result.state;
    selection = null;
    busy = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    render(busy ? before : state);
    status(action[0] === 'pot' ? '' : result.message + '。' + (action[0] === 'pour' ? '來源倒空，或接收杯滿，就會停下來。' : '接下來要倒去哪裡呢？'));
    save();
    if (busy) animatePour(action, before);
  }
  function chooseCup(i) {
    if (busy) return;
    if (selection?.kind === 'ingredient') { act(['fill', i, selection.index]); return; }
    if (selection?.kind === 'cup' && selection.index !== i) { act(['pour', selection.index, i]); return; }
    if (selection?.kind === 'cup') { selection = null; render(); return; }
    if (!state.cups[i].amount) { status('這個杯子是空的。先點一種原料，再點這個杯子。'); return; }
    selection = { kind: 'cup', index: i }; render();
  }
  function switchLevel(index) {
    finishAnimation();
    current = index;
    state = G.replay(G.levels[current], games[current]);
    selection = null;
    renderLevel();
    status(games[current].length ? '已接回這張訂單的調藥進度。' : '先看看客人的配方，再選原料裝杯。');
    save();
  }
  function openDialog(id) { finishAnimation(); selection = null; render(); $(id).showModal(); moveCursor(); }
  function brew() {
    if (busy || !state.pot.some(Boolean)) return;
    const level = G.levels[current];
    const result = G.verdict(level, state);
    const submitted = [...state.pot];
    selection = null;
    if (result.success && !completed.includes(level.id)) { completed.push(level.id); save(); renderOrders(); }
    render();
    $('result-art').innerHTML = characterArt(level.character, result.success ? level.id : 'failure');
    $('result-label').textContent = result.success ? '訂單完成 · 魔法生效了' : '魔法出了點小差錯';
    $('result-title').textContent = result.success ? '就是這個配方！' : '再調整一下就好';
    $('result-story').textContent = result.success ? level.success : level.failure + ' 杯子和大鍋已清空，再調一瓶吧。';
    $('result-feedback').innerHTML = G.ingredients.map((ingredient, i) => {
      if (!level.recipe[i] && !submitted[i]) return '';
      const diff = result.differences[i];
      return `<span class="feedback-chip${diff ? ' wrong' : ''}">${icon(i)} ${diff === 0 ? '剛剛好 ✓' : diff > 0 ? (level.recipe[i] ? '太多了' : '這單不需要') : '還不夠'}</span>`;
    }).join('');
    $('result-next').hidden = !result.success;
    $('result-next').textContent = current < G.levels.length - 1 ? '接下一張訂單 →' : completed.length === G.levels.length ? '四張都完成了！再玩一次' : '回去挑戰其他訂單';
    $('result-back').textContent = result.success ? '回工作臺' : '重新調一瓶';
    if (!result.success) {
      games[current] = []; state = G.initial(); save();
      status('這張訂單已清空。看看女巫小提示，再試一次。');
    }
    openDialog('result-dialog');
  }

  $('ingredients').innerHTML = G.ingredients.map((ingredient, i) => `<button class="ingredient tone-${i}" type="button" data-ingredient="${i}" aria-label="選擇${ingredient.name}" aria-pressed="false">${bottleArt(i)}<span class="ingredient-info"><b>${ingredient.name}</b><small>可補滿</small></span></button>`).join('');
  $('ingredients').addEventListener('click', event => {
    const button = event.target.closest('[data-ingredient]');
    if (!button || busy) return;
    const index = Number(button.dataset.ingredient);
    selection = selection?.kind === 'ingredient' && selection.index === index ? null : { kind: 'ingredient', index };
    render();
  });
  $('orders').addEventListener('click', event => {
    const button = event.target.closest('[data-level]');
    if (button && Number(button.dataset.level) !== current) switchLevel(Number(button.dataset.level));
  });
  [0, 1].forEach(i => $('cup-' + i).addEventListener('click', () => chooseCup(i)));
  $('pot').addEventListener('click', () => selection?.kind === 'cup' ? act(['pot', selection.index]) : status('先點有藥液的杯子，再點大鍋。原料要先用量杯量好。'));
  $('waste').addEventListener('click', () => { if (selection?.kind === 'cup') act(['empty', selection.index]); });
  $('cancel').addEventListener('click', cancelSelection);
  $('undo').addEventListener('click', () => {
    if (busy || !games[current].length) return;
    games[current].pop(); state = G.replay(G.levels[current], games[current]); selection = null;
    render(); save(); status('已回到上一步，換個倒法試試看。');
  });
  $('reset').addEventListener('click', () => {
    if (busy) return;
    games[current] = []; state = G.initial(); selection = null;
    render(); save(); status('杯子和大鍋都清空了，從這張訂單重新開始。');
  });
  $('brew').addEventListener('click', brew);
  $('result-next').addEventListener('click', () => {
    $('result-dialog').close();
    let next = current < G.levels.length - 1 ? current + 1 : G.levels.findIndex(level => !completed.includes(level.id));
    if (next === -1) next = 0;
    if (completed.length === G.levels.length && current === G.levels.length - 1) games[next] = [];
    switchLevel(next);
  });
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } }));
  document.addEventListener('contextmenu', event => { if (selection) { event.preventDefault(); cancelSelection(); } });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') cancelSelection();
    if (event.key === 'Tab') { pointer.mouse = false; moveCursor(); }
  });
  function trackPointer(event) {
    document.body.classList.toggle('touch-input', event.pointerType === 'touch');
    pointer = {x:event.clientX,y:event.clientY,mouse:event.pointerType === 'mouse',inside:true}; moveCursor();
  }
  document.addEventListener('pointermove', trackPointer);
  document.addEventListener('pointerdown', trackPointer);
  document.documentElement.addEventListener('pointerleave', () => { pointer.inside = false; moveCursor(); });
  window.addEventListener('blur', () => { pointer.inside = false; moveCursor(); });
  window.addEventListener('resize', () => { if (busy) { finishAnimation(); render(); } moveCursor(); });
  window.addEventListener('scroll', () => { if (busy) { finishAnimation(); render(); } }, {passive:true});
  load();
  state = G.replay(G.levels[current], games[current]);
  renderLevel();
  if (games[current].length) status('歡迎回來，已保留你上次的調藥進度。');
})();
