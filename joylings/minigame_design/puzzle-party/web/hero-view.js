// 角色、寶劍、場景繪圖沿用 robot-relay/public/app.js 的原創 SVG。
(function () {
'use strict';
const $ = id => document.getElementById(id);
const H = window.HeroRules;
const same = H.same;
let currentLevel, mapKey = '';
function coord([x,y]) { const step = 450 / currentLevel.size; return [95 + step * (x + .5), 63 + step * (y + .5)]; }
function swordArt(scale = 1) { return `<g transform="scale(${scale})"><path d="M-5 6V-28l5-8 5 8V6Z" fill="#f5efce" stroke="#667c77" stroke-width="2"/><path d="M0-29V4" stroke="#afc7be" stroke-width="2"/><path d="M-11 5h22" stroke="#c7a45b" stroke-width="6" stroke-linecap="round"/><path d="M0 8v12" stroke="#826342" stroke-width="6"/><circle cy="22" r="4" fill="#d3ae60"/></g>`; }
function heroArt(armed) { return `<ellipse cy="17" rx="23" ry="7" fill="#3e50472b"/><path d="M-12-9-21 12q22 12 43 0L12-12" fill="#be764b"/><path d="M-8 9v9m17-9v9" stroke="#554f44" stroke-width="9" stroke-linecap="round"/><path d="M-13-13h26v26h-26Z" fill="#5a8968"/><path d="M-12 4h24" stroke="#cfa86a" stroke-width="5"/><rect x="-18" y="-42" width="36" height="31" rx="14" fill="#eed5a7"/><path d="M-19-30q-3-26 26-20l15 19-19-6-11 10-2-11Z" fill="#6b6449"/><path d="M-24-40q15-26 40-16l9 22-27-8Z" fill="#638365"/><path d="M-26-37q23-8 51 4" stroke="#405f4e" stroke-width="7" stroke-linecap="round"/><path d="M7-53q1-17 15-16l-5 17" fill="#d5ac5c"/><circle cx="-7" cy="-25" r="2.2" fill="#3c4840"/><circle cx="7" cy="-25" r="2.2" fill="#3c4840"/><path d="M-3-18q3 2 6 0" fill="none" stroke="#b98661" stroke-width="2" stroke-linecap="round"/><path d="m-12-7-10 7m34-7 10 7" stroke="#eed5a7" stroke-width="8" stroke-linecap="round"/>${armed ? `<g transform="translate(25 -9) rotate(16)">${swordArt(.65)}</g>` : ''}`; }
function tree(x, y, s = 1) { return `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cy="12" rx="24" ry="8" fill="#486c5020"/><path d="M0 9v-45" stroke="#889579" stroke-width="7"/><path d="M-27-12q-10-17 2-27-1-20 22-24 26-4 29 21 15 19 0 31-22 10-53-1Z" fill="#a7b88f"/><path d="M-21-34q-5-16 13-20" stroke="#bdcaa4" stroke-width="7" fill="none" stroke-linecap="round"/></g>`; }

function dragonArt() {
  return '<ellipse cy="29" rx="39" ry="9" fill="#78412830"/><path d="M-13 14Q-54 36-47-10Q-31 8-15-3" fill="#bf563c" stroke="#8f4435" stroke-width="2"/><path d="M-9-7L-37-48-36-15-55-24-35 10Z" fill="#d4744d" stroke="#a44f39" stroke-width="2"/><path d="M5-8L22-48 31-27 41-31 30 0Z" fill="#d4744d" stroke="#a44f39" stroke-width="2"/><ellipse cy="7" rx="23" ry="25" fill="#db7950"/><ellipse cy="12" rx="12" ry="18" fill="#f5cc82"/><path d="M-14 27h-12m37 0h14" stroke="#a84c39" stroke-width="9" stroke-linecap="round"/><path d="M4-12Q-11-48 12-44Q28-45 29-25L47-23 48-9Q26 0 16-7Z" fill="#df8153" stroke="#a7523d" stroke-width="2"/><path d="M4-40-1-55 13-46M18-43 25-57 27-37" fill="#f5d59a"/><circle cx="23" cy="-30" r="4" fill="#fff5d6"/><circle cx="24" cy="-30" r="2" fill="#4c4937"/><path d="M35-13h11" stroke="#833e33" stroke-width="3" stroke-linecap="round"/><circle cx="41" cy="-21" r="2" fill="#833e33"/>';
}
function doorArt(name) {
  return '<ellipse cy="33" rx="39" ry="10" fill="#644c8730"/><path d="M-32 29V-22Q-32-56 0-56T32-22V29Z" fill="#b49acd" stroke="#77578e" stroke-width="4"/><path d="M-23 27V-23Q-23-46 0-46T23-23V27Z" fill="#6d4c93"/><path d="M-18 22V-20Q-18-39 0-39T18-20V22Z" fill="#b6a0ec"/><path d="M-12-22Q16-39 8-10T-8 16" stroke="#f8eaff" stroke-width="4" fill="none"/><path d="M-37 29h74v9h-74Z" fill="#9b83b7"/><path d="M-31-18h9M22-18h9M-31 6h9M22 6h9" stroke="#ead8f6" stroke-width="3"/><text y="53" text-anchor="middle" font-size="15" font-weight="700" fill="#694388">'+name+' 門</text>';
}
function phase(title,detail,tone) {
  const box=$('hero-cue');if(!box)return;box.dataset.phase=tone;box.querySelector('strong').textContent=title;box.querySelector('span').textContent=detail;
}
function fireEffect(effect,p=0,charge=false) {
  const layer=$('breath-layer');if(!layer)return;
  if(!effect){layer.innerHTML='';return;}
  const [x,y]=coord(effect.from),angle={right:0,down:90,left:180,up:270}[effect.direction],step=450/currentLevel.size;
  const actor=$('monster-sprite').querySelector('.dragon-body');if(actor)actor.setAttribute('transform','rotate('+angle+')');
  if(charge){layer.innerHTML='<circle cx="'+x+'" cy="'+y+'" r="'+(24+12*p)+'" fill="#ffc75a" opacity="'+(.12+.18*p)+'"/>';return;}
  const length=effect.cells.length*step*Math.min(1,p*3.5),width=13+8*Math.sin(p*25);
  layer.innerHTML='<g transform="translate('+x+' '+y+') rotate('+angle+')"><path d="M27-13Q'+length*.6+' '+(-width*2)+' '+(length+24)+' 0Q'+length*.6+' '+width*2+' 27 12Z" fill="#ec722c" opacity=".88"/><path d="M30-6Q'+length*.6+' -16 '+(length+14)+' 0Q'+length*.6+' 16 30 7Z" fill="#ffe18a"/>'+Array.from({length:9},(_,i)=>{const t=(p*1.8+i/9)%1;return '<circle cx="'+(30+length*t)+'" cy="'+Math.sin(i*2+p*18)*(8+18*t)+'" r="'+(2+3*(1-t))+'" fill="#fff0a2" opacity="'+(1-t)+'"/>';}).join('')+'</g>';
}

function eventPreview(level) {
  return H.forecast(level).map(e=>{
    const fire=e.cells.map(p=>{const [x,y]=coord(p),r=450/level.size/2-5;return `<g class="fire-preview"><rect x="${x-r}" y="${y-r}" width="${r*2}" height="${r*2}" rx="7" fill="#f0a057" fill-opacity=".12" stroke="#c87c3c" stroke-width="2" stroke-dasharray="6 4"/><text x="${x+r-13}" y="${y-r+17}" text-anchor="middle" font-size="13" fill="#a6652b">${e.after}</text></g>`;}).join('');
    const [x,y]=coord(e.to),r=450/level.size/2;
    return fire+(e.move?`<g class="move-preview"><circle cx="${x+r-14}" cy="${y-r+15}" r="12" fill="#e1edf6" stroke="#6a97b1" stroke-width="2"/><text x="${x+r-14}" y="${y-r+19}" text-anchor="middle" font-size="12" fill="#376783">${e.after}</text></g>`:'');
  }).join('');
}
function eventTimeline(level) {
  if(!level.events?.length)return '';
  return `<div class="monster-plan"><p><strong>勇者先做一步 → 怪物再行動</strong><br>火遇牆會停，只燒這一步；先擊退怪物，可阻止後續行動。</p><div class="world-events">${level.events.map(e=>`<div class="world-event" data-after="${e.after}"><strong>第 ${e.after} 步後</strong><span>${e.move?`${H.COMMANDS[e.move].icon} 移動一格`:''}${e.fire?`${H.COMMANDS[e.fire.direction].icon} 噴火最多 ${e.fire.range} 格`:''}</span><small class="event-state">預告</small></div>`).join('')}</div><div class="event-legend">藍圈＝移動終點；橘框＝噴火範圍；數字＝第幾步後。</div></div>`;
}
function paint(level, robot, fire = []) {
  currentLevel = level;
  const key = JSON.stringify(level), step = 450 / level.size;
  if (key !== mapKey || !$('hero-sprite')) {
    mapKey = key;
    let tiles = '';
    for (let y = 0; y < level.size; y++) for (let x = 0; x < level.size; x++) {
      const p = [x, y], [cx, cy] = coord(p), half = step / 2 - 2;
      const special = same(p, level.sword) || same(p, level.goal), start = same(p, level.start);
      const fill = special ? '#e5d6ac' : start ? '#c2d0b5' : (x + y) % 2 ? '#d5dbc3' : '#dce2cd';
      tiles += `<g><rect x="${cx-half}" y="${cy-half+7}" width="${half*2}" height="${half*2}" rx="7" fill="#afbea0"/><rect x="${cx-half}" y="${cy-half}" width="${half*2}" height="${half*2}" rx="7" fill="${fill}" stroke="#eff1df70"/>${start ? `<path d="m${cx-11} ${cy+11} 11 -5 11 5 -11 6Z" fill="none" stroke="#8caa7f" stroke-width="2"/>` : ''}</g>`;
    }
    const [sx, sy] = coord(level.sword), [gx, gy] = coord(level.goal), [mx, my] = coord(level.monster);
    $('world').innerHTML = `<defs><radialGradient id="ground"><stop stop-color="#f0f1e1"/><stop offset="1" stop-color="#e5eada"/></radialGradient><linearGradient id="portal" x2="0" y2="1"><stop stop-color="#c7dbb4"/><stop offset="1" stop-color="#83b99c"/></linearGradient><filter id="shadow"><feGaussianBlur stdDeviation="8"/></filter></defs><rect width="640" height="570" fill="url(#ground)"/><ellipse cx="324" cy="518" rx="247" ry="27" fill="#768c6b" opacity=".18" filter="url(#shadow)"/><rect x="81" y="61" width="478" height="470" rx="24" fill="#9caf8c"/><rect x="80" y="48" width="480" height="474" rx="23" fill="#b1c29c"/><rect x="89" y="55" width="462" height="458" rx="16" fill="#b9c7a6"/>${tree(57,157,.8)}${tree(581,108,.85)}${tree(570,433,1)}${tree(67,476,.7)}<g fill="#c3cbae"><ellipse cx="48" cy="353" rx="10" ry="5"/><ellipse cx="591" cy="263" rx="8" ry="4"/><ellipse cx="608" cy="279" rx="5" ry="3"/></g>${tiles}${(level.portals || []).map((p, i) => { const [x,y] = coord(p); return `<g class="warp-ring" data-portal="${i}" transform="translate(${x} ${y})">${doorArt(i===0?'A':'B')}</g>`; }).join('')}<g id="route-line"></g>
      <g transform="translate(${gx} ${gy})"><ellipse cy="23" rx="30" ry="8" fill="#5c786730"/><path d="M-29 22V-17q0-35 29-35t29 35v39" fill="#819487" stroke="#d0d9c5" stroke-width="5"/><path d="M-20 22v-38q0-24 20-24t20 24v38Z" fill="#5c7566"/><path id="portal-light" d="M-20 22v-38q0-24 20-24t20 24v38Z" fill="url(#portal)" opacity=".25"/><path id="gate-bars" d="M-10-31v52M0-36v57M10-31v52M-20-4h40M-20 11h40" stroke="#d0b478" stroke-width="4"/><path d="m-6-46 6-7 6 7-6 7Z" fill="#d9bc74"/><text y="36" text-anchor="middle" font-size="10" fill="#647a62" font-family="sans-serif">出口</text></g>
      ${level.walls.map(p => { const [x,y] = coord(p); const scale = step / 90; return `<g transform="translate(${x} ${y}) scale(${scale})"><ellipse cy="21" rx="31" ry="9" fill="#64745e30"/><path d="m-32 10 5-35 22-8 24 4 14 30-9 17-47-1Z" fill="#859780"/><path d="m-27-25 22-8 24 4 8 15-32 5-24-7Z" fill="#a1b297"/><path d="M-5-9 0 17m-27-15 21 4" fill="none" stroke="#71866d" stroke-width="2"/><path d="m-25-27 16-4 5 8-13 4Z" fill="#b7c4a0"/></g>`; }).join('')}
      ${eventPreview(level)}<g id="fire-layer"></g><g id="sword-sprite" transform="translate(${sx} ${sy})"><ellipse cy="20" rx="24" ry="7" fill="#b39a6740"/><path d="m-21 15 5-15 20-4 17 13-5 14h-33Z" fill="#8d9b83"/>${swordArt(.9)}<path d="m-24-27 2-6 2 6 6 2-6 2-2 6-2-6-6-2Z" fill="#c4a25c"/><text y="36" text-anchor="middle" font-size="10" fill="#8e7446" font-family="sans-serif">寶劍</text></g>
      <g id="monster-sprite" transform="translate(${mx} ${my})"><ellipse cy="20" rx="29" ry="8" fill="#665d7930"/><path d="M-29 13q-6-14 5-22-3-25 24-29 27 4 25 28 13 10 4 24-22 14-58-1Z" fill="#a095b7"/><path d="M-21-13q0-13 15-17" stroke="#b6adc7" stroke-width="6" fill="none" stroke-linecap="round"/><path d="m-21-29-2-11 12 6m23 0 12-6-2 12" fill="#d8cca5"/><circle cx="-9" cy="-9" r="3" fill="#4a465f"/><circle cx="9" cy="-9" r="3" fill="#4a465f"/><path d="M-5 2q5 4 10 0" fill="none" stroke="#5d546b" stroke-width="2"/><text y="36" text-anchor="middle" font-size="10" fill="#7d718e" font-family="sans-serif">怪物</text></g><g id="breath-layer"></g><g id="hero-sprite" class="hero-sprite"></g>`;
  }
  if(level.events?.some(e=>e.fire)) $('monster-sprite').innerHTML='<g class="dragon-body" transform="rotate('+({right:0,down:90,left:180,up:270}[level.events.find(e=>e.fire).fire.direction])+')">'+dragonArt()+'</g><text y="52" text-anchor="middle" font-size="14" fill="#a44b35">火龍</text>';
  const [x, y] = coord(robot.position), hero = $('hero-sprite');
  hero.setAttribute('transform', `translate(${x} ${y})`);
  if (hero.dataset.armed !== String(robot.hasSword)) { hero.innerHTML = heroArt(robot.hasSword); hero.dataset.armed = robot.hasSword; }
  $('sword-sprite').style.opacity = robot.hasSword ? '0' : '1';
  $('monster-sprite').style.opacity = robot.monsterDefeated ? '0' : '1';
  const monster=H.monsterAt(level,robot),[mx,my]=coord(monster);
  $('monster-sprite').setAttribute('transform',`translate(${mx} ${my})`);
  $('world').dataset.monster=monster.join(',');
  $('world').dataset.fire=fire.map(p=>p.join(',')).join(';');
  $('fire-layer').innerHTML=fire.map(p=>{
    const [x,y]=coord(p),r=step/2-4;
    return `<g class="fire-cell" transform="translate(${x} ${y})"><rect x="${-r}" y="${-r}" width="${r*2}" height="${r*2}" rx="8" fill="#f7b55c" fill-opacity=".65" stroke="#df7535" stroke-width="3"/><path d="M0-30C12-14 27-2 22 14Q18 29 0 28Q-24 26-22 5Q-16 9-12-11Q-7 2 0-30Z" fill="#e87d32"/><path d="M1-8Q17 9 9 20Q0 29-10 15Q-13 8 1-8Z" fill="#fff2a0"/></g>`;
  }).join('');
  $('gate-bars').style.opacity = robot.monsterDefeated ? '0' : '1';
  $('portal-light').setAttribute('opacity', robot.monsterDefeated ? '1' : '.25');
  const location = p => `第 ${p[1]+1} 列第 ${p[0]+1} 欄`;
  $('world').dataset.position = robot.position.join(',');
  $('world').dataset.armed = String(robot.hasSword);
  $('world').dataset.defeated = String(robot.monsterDefeated);
  $('world').classList.toggle('hero-failed', robot.failed);
  ['sword','monster','exit'].forEach((id, i) => $('quest-' + id).classList.toggle('done', [robot.hasSword,robot.monsterDefeated,robot.escaped][i]));
  $('world').setAttribute('aria-label', `${level.size} 乘 ${level.size} 地圖。勇者在${location(robot.position)}；寶劍在${location(level.sword)}；怪物在${location(monster)}；出口在${location(level.goal)}。石牆：${level.walls.map(location).join('、')}。${level.portals ? `傳送門在${level.portals.map(location).join('與')}。` : ''}${fire.length?`噴火在${fire.map(location).join('、')}。`:''}`);
}

function board(level) {
  return `<div class="hero-quests" aria-label="冒險目標"><span id="quest-sword">1 拿到寶劍</span><b>→</b><span id="quest-monster">2 打敗怪物</span><b>→</b><span id="quest-exit">3 走到出口</span></div>
    <div id="hero-cue" class="hero-cue" data-phase="ready" role="status" aria-live="polite"><strong>準備出發</strong><span>填好四組指令，再按播放。看亮起的步驟與下方演出。</span></div>${eventTimeline(level)}${level.portals ? '<div class="portal-rule">傳送門：走進 A 門 → 從 B 門出來；走進 B 門 → 從 A 門出來。</div>' : ''}<svg id="world" class="hero-world" viewBox="0 0 640 570" role="img" aria-label="冒險地圖"></svg>
    <div class="hero-board-meta"><span>${level.size} × ${level.size} 地圖</span><span id="hero-step-status">4 組決定 · 共 ${level.steps} 步</span></div>
    <div class="live-copy" id="stage-copy">勇者只照你的指令走。填好四個空格，再按出發。</div>`;
}
function config(level, state) {
  const R = window.PuzzleRules, program = R.expandHero(level, state.settings);
  return `<div class="hero-edit-heading"><p class="config-help">四組各填一格。灰色指令已排好，也會照順序執行。${level.commands ? ` 暖身先用 ${level.commands.length} 種指令。` : ''}</p><span class="hero-count">${state.settings.filter(Boolean).length} / 4 已填</span></div>
    <div class="hero-program" aria-label="完整指令順序">${program.map((command, step) => {
      const group = level.editable.indexOf(step), data = H.COMMANDS[command], editable = group >= 0;
      return `<div class="hero-slot-wrap"><${editable ? 'button' : 'div'} class="hero-slot hero-step ${editable ? 'editable' : 'fixed'} ${data ? 'filled' : ''} ${editable && state.selectedSlot === group ? 'selected' : ''}" data-step="${step}" ${editable ? `data-hero-slot="${group}" aria-label="${R.groups[group]}，第 ${step + 1} 步：${data ? data.label : '空白'}" aria-pressed="${state.selectedSlot === group}" ${state.running ? 'disabled' : ''}` : `aria-label="已排好，第 ${step + 1} 步：${data.label}"`}><span class="slot-number">${step + 1}</span><span class="slot-owner">${editable ? R.groups[group] : '已排好'}</span><span class="slot-icon">${data ? data.icon : '+'}</span><span class="slot-label">${data ? data.label : '選一個動作'}</span></${editable ? 'button' : 'div'}>${editable && data ? `<button class="clear-slot" data-clear-slot="${group}" aria-label="清除${R.groups[group]}的指令" ${state.running ? 'disabled' : ''}>×</button>` : ''}</div>`;
    }).join('')}</div>
    <div class="hero-group-focus" id="hero-group-focus">正在設定：<strong>${R.groups[state.selectedSlot]}</strong> · 第 ${level.editable[state.selectedSlot] + 1} 步</div>
    <div class="hero-deck" role="group" aria-label="選擇指令">${Object.entries(H.COMMANDS).filter(([command]) => R.optionsFor('hero', level)[state.selectedSlot].includes(command)).map(([command, data]) => `<button class="hero-command ${data.kind}" data-command="${command}" draggable="${!state.running}" aria-label="放入${data.label}" ${state.running ? 'disabled' : ''}><span>${data.icon}</span>${data.label}</button>`).join('')}</div>
    <p class="hero-keyboard-note">方向鍵也能放入移動指令。可點選或拖曳到四個空格。</p>`;
}
function card() {
  return `<rect x="64" y="26" width="221" height="151" rx="18" fill="#d0dcc0" stroke="#a6ba95" stroke-width="2"/>
    <path d="M103 143h54v-49h88v-43" fill="none" stroke="#f8f2da" stroke-width="25" stroke-linejoin="round"/>
    <path d="M103 143h54v-49h88v-43" fill="none" stroke="#c1b17b" stroke-width="2" stroke-dasharray="3 7"/>
    <g transform="translate(112 147) scale(1.13)">${heroArt(true)}</g>
    <g transform="translate(240 66)"><path d="M-21 19v-28q0-26 21-26t21 26v28Z" fill="#89a28d"/><path d="M-13 19v-26q0-17 13-17t13 17v26Z" fill="#c6dfb6"/><path d="m-5-29 5-7 5 7-5 7Z" fill="#edc45e"/></g>
    ${tree(285,143,.6)}<circle cx="59" cy="58" r="5" fill="#d3ae60"/><path d="m297 51 8-6m-253 71-8 2" stroke="#9aad7c" stroke-width="3" stroke-linecap="round"/>`;
}
window.HeroView = { dragonArt, doorArt, phase, fireEffect, board, config, paint, card, coord };
})();
