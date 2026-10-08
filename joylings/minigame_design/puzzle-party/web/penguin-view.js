(function () {
  'use strict';
  const R = window.PuzzleRules, P = R.penguin;
  const names = ['小紅', '小藍'], colors = ['#d66e67', '#578dbc'];
  const coord = (board, p) => [18 + (p[0] + .5) * 224 / board.size, 18 + (p[1] + .5) * 224 / board.size];
  function penguinArt(index) {
    const color = colors[index];
    return `<ellipse cy="23" rx="19" ry="5" fill="#33577020"/><path d="M-9 18l-11 9 17-1M9 18l11 9-17-1" fill="#e9b052"/>
      <ellipse cy="2" rx="17" ry="24" fill="#365365"/><ellipse cy="6" rx="12" ry="17" fill="#fffdf1"/>
      <path d="M-13-7q-17 10-13 22l14-9M13-7q17 10 13 22L12 6" fill="#365365"/>
      <ellipse cy="-12" rx="14" ry="12" fill="#fffdf1"/><circle cx="-5" cy="-13" r="2" fill="#334651"/><circle cx="5" cy="-13" r="2" fill="#334651"/><path d="m-5-7 5 6 5-6Z" fill="#e8ad4f"/>
      <path d="M-15-2q15 5 30 0" stroke="${color}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M10-1v14" stroke="${color}" stroke-width="5"/>
      ${index === 0 ? `<path d="M-15-21q15-18 30 0" fill="${color}"/><path d="M-15-20h30" stroke="#f8f2df" stroke-width="4"/><circle cy="-31" r="4" fill="${color}"/>` : `<path d="M-16-16q1-21 16-21t16 21" fill="none" stroke="${color}" stroke-width="4"/><circle cx="-16" cy="-16" r="5" fill="${color}"/><circle cx="16" cy="-16" r="5" fill="${color}"/>`}`;
  }
  function scene(board, index) {
    const cell = 224 / board.size;
    const tiles = Array.from({length: board.size ** 2}, (_, i) => {
      const p = [i % board.size, Math.floor(i / board.size)], [x, y] = coord(board, p);
      const wall = board.walls.some(w => P.same(w, p));
      return `<g transform="translate(${x} ${y})"><rect x="${-cell/2+2}" y="${-cell/2+2}" width="${cell-4}" height="${cell-4}" rx="8" fill="${wall ? '#c3dce4' : '#f1f9f8'}" stroke="#bfd8df"/>${wall ? '<path d="m-22 12 2-26 12-10 24 4 8 14-4 23-29 4Z" fill="#8dbccf" stroke="#699aae" stroke-width="1.5"/><path d="m-20-14 12-10 24 4 8 14-28 5Z" fill="#bce0e9"/><path d="m-4-1 2 24m-12-11 4-6" stroke="#d8f0f3" stroke-width="2" fill="none"/>' : ''}</g>`;
    }).join('');
    const [gx, gy] = coord(board, board.goal), [sx, sy] = coord(board, board.start);
    return `<svg class="ice-world" id="ice-world-${index}" viewBox="0 0 260 264" role="img" aria-label="${names[index]}的冰場"><rect x="4" y="4" width="252" height="252" rx="18" fill="#d7e9ee"/>${tiles}
      <g transform="translate(${gx} ${gy})"><rect x="-22" y="-22" width="44" height="44" rx="12" fill="#fffaf0" stroke="${colors[index]}" stroke-width="3" stroke-dasharray="5 3"/><path d="m-15-2 15-14L15-2v18h-30Z" fill="${colors[index]}" opacity=".22"/><text y="10" text-anchor="middle" font-size="21" font-weight="700" fill="${colors[index]}">家</text></g>
      <g id="ice-penguin-${index}" transform="translate(${sx} ${sy})">${penguinArt(index)}</g></svg>`;
  }
  function board(level, settings) {
    return `<p class="ice-mission">${level.boards.length === 1 ? '暖身：先帶小紅回家。' : '同一組箭頭，讓兩隻一起回家。'} <strong>最後停在家裡才算成功。</strong></p>
      <div class="ice-boards ${level.boards.length === 1 ? 'single' : ''}">${level.boards.map((b, i) => `<section class="ice-field"><div class="ice-title"><span style="--scarf:${colors[i]}">${names[i]}的冰場</span><span id="ice-arrived-${i}" class="ice-arrived">還沒回家</span></div>${scene(b, i)}</section>`).join('')}</div>
      <div class="ice-sequence">${settings.map((value, i) => `<div class="ice-step" id="ice-step-${i}"><small>第 ${i+1} 步</small><small>${R.groupFor(i)}</small><b>${value ? P.directions[value].icon : '?'}</b></div>`).join('<span class="ice-next">→</span>')}</div>
      <div class="live-copy" id="stage-copy">先排 ${level.steps} 個方向，按播放後才會開始滑。</div>`;
  }
  function config(level, state) {
    return `<p class="config-help">四組各選一個方向，全部排好再播放。${level.directions ? ' 暖身只用畫面上這幾個方向。' : ''}</p><div class="machine-list ice-config">${state.settings.map((selected, i) => `<div class="machine"><div class="machine-main"><div class="machine-title"><span class="machine-id">${i + 1}</span>${R.groupFor(i)}<span class="group-description">第 ${i + 1} 步</span></div><div class="options" style="--options:${R.optionsFor('penguin',level)[i].length}" role="group" aria-label="${R.groupFor(i)}的方向">${Object.entries(P.directions).filter(([choice])=>R.optionsFor('penguin',level)[i].includes(choice)).map(([choice, d]) => `<button class="option ice-option ${selected === choice ? 'selected' : ''}" data-machine="${i}" data-choice="${choice}" aria-pressed="${selected === choice}" aria-label="${R.groupFor(i)}：${d.label}" ${state.running ? 'disabled' : ''}><b>${d.icon}</b>${d.label}</button>`).join('')}</div></div></div>`).join('')}</div>`;
  }
  function paint(level, positions) {
    level.boards.forEach((b, i) => {
      const p = positions[i], [x, y] = coord(b, p), home = P.same(p, b.goal);
      document.getElementById('ice-penguin-' + i).setAttribute('transform', `translate(${x} ${y})`);
      const world = document.getElementById('ice-world-' + i);
      world.dataset.position = p.join(','); world.dataset.arrived = String(home);
      world.setAttribute('aria-label', `${names[i]}在第 ${p[1]+1} 列、第 ${p[0]+1} 欄；家在第 ${b.goal[1]+1} 列、第 ${b.goal[0]+1} 欄。冰塊在${b.walls.map(w => `第 ${w[1]+1} 列第 ${w[0]+1} 欄`).join('、')}。`);
      const badge = document.getElementById('ice-arrived-' + i);
      badge.textContent = home ? '✓ 停在家裡' : '還沒回家'; badge.classList.toggle('home', home);
    });
  }
  function card() {
    return `<path d="M49 126q33-50 77-21t74-5 95 20v48H49Z" fill="#c3e0e7"/><ellipse cx="171" cy="159" rx="111" ry="21" fill="#f4faf6"/>
      <g transform="translate(125 120) scale(1.5)">${penguinArt(0)}</g><g transform="translate(222 131) scale(1.35)">${penguinArt(1)}</g>
      <path d="M103 176h126m-10-7 12 7-12 7" stroke="#79a9b6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M67 66v16m-8-8h16m204-20v12m-6-6h12" stroke="#80aebb" stroke-width="2"/><circle cx="285" cy="119" r="4" fill="#fffdf5"/>`;
  }
  window.PenguinView = { board, config, paint, coord, card, names };
})();
