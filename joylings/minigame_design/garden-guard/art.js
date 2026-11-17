(function () {
  'use strict';
  const icons = {
    leaf: '<path d="M5 19C1 6 15 3 21 3c0 12-6 20-15 15" fill="currentColor"/><path d="M5 21 16 9" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/>',
    seed: '<path d="M12 22C2 17 4 8 12 2c8 6 10 15 0 20Z" fill="currentColor"/><path d="M12 17V8" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>',
    heart: '<path d="M12 21S2 15 2 8a5.5 5.5 0 0 1 10-3 5.5 5.5 0 0 1 10 3c0 7-10 13-10 13Z" fill="currentColor"/>',
    play: '<path d="m8 4 13 8-13 8Z" fill="currentColor"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>',
    undo: '<path d="M8 6 3 11l5 5M4 11h10a6 6 0 1 1 0 12" transform="translate(0 -3)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    reset: '<path d="M5 7a8 8 0 1 1-1 9M4 3v5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    erase: '<path d="m5 16-2-2a2 2 0 0 1 0-3l8-8a2 2 0 0 1 3 0l7 7a2 2 0 0 1 0 3l-7 7H9Zm3-9 10 10M9 20h13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    path: '<path d="M3 19h8a3 3 0 0 0 0-6H8a3 3 0 0 1 0-6h12m-4-4 4 4-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    check: '<path d="m5 12 5 5L20 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
    close: '<path d="m6 6 12 12M6 18 18 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    shield: '<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z" fill="currentColor"/><path d="M12 6v11" stroke="white" stroke-opacity=".7" stroke-width="2"/>',
    snow: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7m-12-3L12 7l3-3m-6 16 3-3 3 3M3 11l4-1V6m14 7-4 1v4M3 13l4 1v4m14-7-4-1V6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    trophy: '<path d="M7 3h10v7a5 5 0 0 1-10 0Zm0 2H3v3a5 5 0 0 0 5 5m9-8h4v3a5 5 0 0 1-5 5M12 15v5m-5 1h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
  };
  function icon(name, cls = '') { return `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.leaf}</svg>`; }
  function tower(kind, angle = -90, flash = 0) {
    if (kind === 'wall') return '<ellipse cy="19" rx="24" ry="8" fill="#354a3418"/><path d="m-24-9 10-11h29l11 11v29h-50Z" fill="#c8b799"/><path d="m-24-9 10-11h29l11 11Z" fill="#e3d8bf"/><path d="M-24 3H26M-6-9V3M9 3v17" stroke="#9e8d75" stroke-width="2.2"/><path d="m-22 20 2-7 5 3 5-3 3 7" fill="#7c9566"/><path d="M11-15h8" stroke="#f4ecd9" stroke-width="3" stroke-linecap="round"/>';
    const color = kind === 'pea' ? '#578961' : kind === 'rapid' ? '#d4a448' : '#78a9b7';
    const dark = kind === 'pea' ? '#346247' : kind === 'rapid' ? '#987139' : '#527f94';
    const head = kind === 'rapid'
      ? '<path d="M0-21 6-15l9-3 1 9 8 4-6 7 2 9-10 1-5 8-7-6-9 2-2-9-8-5 6-7-1-8 10-1Z" fill="#e6c46d"/><circle r="13" fill="#a87c38"/><circle cx="15" cy="-6" r="7" fill="#e7b64e"/><circle cx="15" cy="7" r="7" fill="#e7b64e"/><ellipse cx="18" cy="-6" rx="3" ry="4" fill="#765326"/><ellipse cx="18" cy="7" rx="3" ry="4" fill="#765326"/>'
      : kind === 'frost'
        ? '<path d="m0-24 8 10 12-1-4 12 6 10-12 3-6 11-8-10-12 1 4-12-6-10 12-3Z" fill="#b1d6dd" stroke="#77a8b4" stroke-width="1.5"/><circle r="11" fill="#719fac"/><path d="M0-7v14m-6-10 12 6m-12 0 12-6" stroke="#ecfcff" stroke-width="2.5" stroke-linecap="round"/>'
        : `<path d="M-12 12C-28 8-24-10-16-17c9-8 24-4 29 6l7 1v18l-10 1C4 17-4 18-12 12" fill="${color}"/><ellipse cx="19" cy="-1" rx="6" ry="10" fill="${dark}"/><ellipse cx="19" cy="-2" rx="3" ry="5" fill="#233f31"/><path d="M-15-11q7-7 15-3" fill="none" stroke="#9fbf82" stroke-width="4" stroke-linecap="round"/>`;
    return `<ellipse cy="22" rx="24" ry="7" fill="#354a3418"/><path d="M-17 7h34l-4 19h-26Z" fill="#d9c6a2"/><path d="M-18 6h36v7h-36Z" fill="#e9d9b9"/><path d="M0 7V-6" stroke="${dark}" stroke-width="6" stroke-linecap="round"/><path d="M-2 6q-19 3-17-12Q-4-8-2 6M2 10Q20 9 18-4 5-4 2 10" fill="#759765"/><g transform="translate(0 -8) rotate(${angle}) scale(${flash > 0 ? 1.06 : 1})">${head}</g>`;
  }
  function bug(kind = 'bug', hp = null, time = 0, flash = 0, shieldFlash = 0, slow = false) {
    const color = kind === 'shield' ? '#d3a15d' : kind === 'swift' ? '#cfad62' : '#c48769';
    const dark = kind === 'shield' ? '#85633c' : kind === 'swift' ? '#97773c' : '#8c5843';
    const wiggle = Math.sin(time * 14) * 3;
    const legs = [-13, 0, 13].map((x, i) => `<path d="m${x}-10 ${i % 2 ? -5 : 5}-${12 + wiggle}m${x} ${22 + wiggle} ${i % 2 ? 5 : -5} ${12 - wiggle}" fill="none" stroke="${dark}" stroke-width="3" stroke-linecap="round"/>`).join('');
    const shield = kind === 'shield' ? `<g class="hard-shell">
      <path d="m-30-8 6-15 15-9H9l16 10 6 15-6 8h-49Z" fill="#293846" stroke="#253240" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="m-29-10 6-13 14-9H9l15 10 6 12-9 6h-42Z" fill="${shieldFlash > 0 ? '#c7e2ef' : '#536c7c'}"/>
      <path d="m-23-23 14-9-4 23-16-1Z" fill="#7792a0"/><path d="m9-32 15 10 6 12-16 1Z" fill="#3c5263"/>
      <path d="M-9-32H9l5 23h-27Z" fill="${shieldFlash > 0 ? '#f8ffff' : '#688594'}"/>
      <path d="m-29-10 8 6h42l9-6v5l-8 7h-44l-7-7Z" fill="#a4b6bd" stroke="#344957" stroke-width="1.5"/>
      <path d="m-18-23 10-5H6" stroke="#c5d5d8" stroke-width="2.7" stroke-linecap="round" fill="none"/>
      <g fill="#d8e1df" stroke="#344957" stroke-width="1"><circle cx="-21" cy="-12" r="2.4"/><circle cx="0" cy="-11" r="2.4"/><circle cx="21" cy="-12" r="2.4"/></g>
      ${shieldFlash > 0 ? '<path d="m-33-8 7-18 17-10H10l18 12 7 16" fill="none" stroke="#fff0a9" stroke-width="3" stroke-linejoin="round"/>' : ''}
    </g>` : '';
    return `<ellipse cy="19" rx="27" ry="7" fill="#354a3419"/>${legs}<ellipse rx="25" ry="19" fill="${flash > 0 ? '#fff6da' : color}" stroke="${dark}" stroke-width="1.5"/><path d="M7-15v30" stroke="${dark}" stroke-width="1.5" opacity=".35"/><path d="m-23-10-7-8m7 27-7 8" stroke="${dark}" stroke-width="2" stroke-linecap="round"/><circle cx="-23" cy="-7" r="5" fill="#fffaf1"/><circle cx="-23" cy="7" r="5" fill="#fffaf1"/><circle cx="-25" cy="-7" r="2.2" fill="#283d37"/><circle cx="-25" cy="7" r="2.2" fill="#283d37"/>${shield}${slow ? '<circle r="31" fill="none" stroke="#8ccde0" stroke-width="2" stroke-dasharray="3 5"/>' : ''}${hp !== null ? `<text x="3" y="9" text-anchor="middle" font-size="28" font-weight="800" fill="${flash > 0 ? dark : '#fffdf4'}" stroke="${dark}" stroke-width=".7" paint-order="stroke">${hp}</text>` : ''}`;
  }
  function badge(kind, hp = null) { return `<svg class="bug-icon" viewBox="-36 -36 72 72" aria-hidden="true">${bug(kind, hp)}</svg>`; }
  function tool(kind) { return `<svg class="tool-art" viewBox="-36 -40 72 76" aria-hidden="true">${tower(kind)}</svg>`; }
  function house() {
    return '<ellipse cy="39" rx="39" ry="12" fill="#354a341b"/><path d="M-28-5h56v45h-56Z" fill="#f7edd4" stroke="#d9caa7" stroke-width="2"/><path d="M17-40h10v25H17Z" fill="#b57959"/><path d="m-39-6 39-36L39-6l-5 7L0-28-34 1Z" fill="#4f7560"/><path d="m-30-5 30-28L30-5Z" fill="#71927a"/><rect x="-9" y="15" width="18" height="25" rx="8" fill="#b58a63"/><circle cx="5" cy="29" r="1.6" fill="#f5dfab"/><rect x="-22" y="6" width="10" height="12" rx="3" fill="#aac7c3"/><rect x="12" y="6" width="10" height="12" rx="3" fill="#aac7c3"/><path d="M-22 12h10M17 6v12" stroke="#fff6e4" stroke-width="2"/><path d="M-34 40q-10-20-16-5-10-14-12 6m89-1q4-21 12-9 11-15 14 11" fill="#86a06c"/>';
  }
  window.GardenArt = { icon, tower, bug, badge, tool, house };
})();
