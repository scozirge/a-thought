(function () {
  'use strict';

  // Static drawings are defined once. The board only moves the instances.
  const icons = {
    hammer: `<g transform="rotate(38 12 12)" stroke-linejoin="round" stroke-linecap="round">
      <path d="M10 8h4l.4 12.4-1.1 2h-2.7l-1-2Z" fill="#773e34" stroke="#503037" stroke-width="1.2"/>
      <path d="M10.6 13.3h2.9m-3 2.8 3-.9m-3 3.8 3-.9" stroke="#cf8c58" stroke-width="1.3"/>
      <path d="M3 3.4 6 2l2.5 1.2h6.3L18 2l3 1.3v6.2l-2.8 1.3-3.7-1.6H8.3L5.4 11 3 9.6Z" fill="#ecba59" stroke="#593c33" stroke-width="1.3"/>
      <path d="M5.4 4.4 8 5h7.4L18 3.9v4.7L15 7.5H8l-2.6 1.3Z" fill="#536579"/>
      <path d="m12 4.1 2.3 2.1L12 8.5 9.7 6.2Z" fill="#faf0b4" stroke="#9b702e" stroke-width=".7"/>
      <path d="m3.8 3.9 1.7-.9m13.2.1 1.5.6M10.6 10.2h2.9m-3.2 10.4h3.3" fill="none" stroke="#fff1a3" stroke-width="1.2"/></g>`,
    crystal: '<path d="m12 1 8 6 2 7-10 9L2 14l2-7Z" fill="#ba83de" stroke="#59386a" stroke-width="1.6"/><path d="m12 2 4 6-4 13L7 8Z" fill="#f2d8ff"/><path d="m3 13 4-5 5 13Z" fill="#9061b1"/><path d="m12 2-5 6H5Z" fill="#fff4ff"/>',
    coin: `<circle cx="12" cy="13" r="10" fill="#d89015" stroke="#8c5516" stroke-width="1.4"/>
      <circle cx="11.5" cy="10.8" r="9.2" fill="#ffcc41" stroke="#a06314" stroke-width="1.4"/>
      <circle cx="11.5" cy="10.8" r="6.7" fill="#ffdf72" stroke="#df9b21" stroke-width="1.4"/>
      <path d="m11.5 5.6 3.8 5.2-3.8 5.2-3.8-5.2Z" fill="#e4991b"/><path d="M4.9 8.1q1-3.2 4.1-4.2" fill="none" stroke="#fff5ba" stroke-width="2" stroke-linecap="round"/>`,
    heart: `<path d="M12 21.8C9.5 20 1.5 14.3 1.5 8.4c0-5.7 6.7-8.1 10.5-3.1 3.8-5 10.5-2.6 10.5 3.1 0 5.9-8 11.6-10.5 13.4Z" fill="var(--heart-fill,#ed3947)" stroke="var(--heart-edge,#a62842)" stroke-width="1.5"/>
      <path d="M4.9 8.4q.3-3.2 3.3-2.7" fill="none" stroke="var(--heart-shine,#ffd1cd)" stroke-width="2.3" stroke-linecap="round"/>`,
    leaf: `<path d="M3 19C0 10 8 3 20.8 2.8c.5 11.7-4.7 19.4-14.6 16.4Z" fill="#83b956" stroke="#305c41" stroke-width="1.6"/><path d="M3 22 16.5 8m-7.2 7.2-.4-4.4m3 .7 4.6-.5" fill="none" stroke="#315f43" stroke-width="1.7" stroke-linecap="round"/>`,
    play: '<path d="M6 4.5a1.6 1.6 0 0 1 2.4-1.3L21 10.7a1.6 1.6 0 0 1 0 2.6L8.4 20.8A1.6 1.6 0 0 1 6 19.5Z" fill="currentColor"/>',
    pause: '<path d="M5 4h5v16H5zm9 0h5v16h-5z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
    undo: '<path d="m9 4-6 6 6 5m-5-5h9c5 0 7.5 3.2 7.5 8.5" class="icon-line"/>',
    reset: '<path d="M4.2 10A8 8 0 1 1 5.7 18M4 4v6h6" class="icon-line"/>',
    erase: '<path d="m3 13 9-10a2 2 0 0 1 3 0l6 5a2 2 0 0 1 0 3l-9 10H9l-6-5q-1.5-1.5 0-3Z" fill="#f5a491" stroke="#754d44" stroke-width="1.7"/><path d="m7 9 8 7 6-6-8-7Z" fill="#ffe0ad" stroke="#754d44" stroke-width="1.5"/><path d="M12 21h10" class="icon-line"/>',
    trophy: '<path d="M6.5 3h11v7.3a5.5 5.5 0 0 1-11 0Z" fill="#ffcf4e" stroke="#98601e" stroke-width="1.6"/><path d="M6 5H2.5v3q0 4.2 5.1 4.2M18 5h3.5v3q0 4.2-5.1 4.2M12 16v4m-4.5 1h9" fill="none" stroke="#98601e" stroke-width="2" stroke-linecap="round"/><path d="m12 5 .9 2 2.1.2-1.5 1.5.4 2.1-1.9-1-1.9 1 .4-2.1L9 7.2l2.1-.2Z" fill="#fff6ba"/>'
  };
  const laserLensX = 27, headY = -3;
  // Fractions of the stone's one-second attack, shared by arm and projectile.
  const slingRelease = .14;
  function ease(t) {
    const u = Math.max(0, Math.min(1, t));
    return u * u * (3 - 2*u);
  }
  function slingAngle(t) {
    if (t < .04) return -5 * ease(t / .04);
    if (t < slingRelease) return -5 + 70 * ease((t - .04) / (slingRelease - .04));
    if (t < .24) return 65 + 5 * Math.sin((t - slingRelease) * Math.PI / .1);
    return 65 * (1 - ease((t - .24) / .47));
  }
  function catapult(heavy, mounted = false) {
    const timber = heavy ? '#884932' : '#b17a45', iron = heavy ? '#494b58' : '#826045';
    const rim = heavy ? '#e9ae50' : '#d7a15d';
    const wheels = [-17, 16].map(x => `<g transform="translate(${x} 17)">
      <circle r="8" fill="${iron}" stroke-width="2.3"/><circle r="5.5" fill="${rim}"/>
      <path d="M-4.5 0h9M0-4.5v9" stroke="${iron}" stroke-width="1.6"/><circle r="1.8" fill="#ffe2a0" stroke="none"/></g>`).join('');
    return `<g class="catapult" stroke="#48372c">
      ${mounted ? '' : `<ellipse cx="0" cy="24" rx="27" ry="4" fill="#344534" stroke="none" opacity=".23"/>
      <path d="m-25 9 6-6h38l6 6-3 6h-44Z" fill="${timber}"/>
      <path d="M-22 9h43" stroke="#e7b57a"/>`}
      <path d="m-20 9 15-21h5L16 10h-7L-3-5-14 10Z" fill="${timber}"/>
      <path d="M-16 7-4-9" stroke="#f3cb92" stroke-width="2"/>
      ${heavy ? '<path d="m-11-6 5-7h8l5 8-4 3-4-5-6 5Z" fill="#59616a"/><path d="M-24 9h10v6h-10Zm37 0h10v6H13Z" fill="#d19b4b"/>' : ''}
      ${mounted ? '' : wheels}
      <g style="transform-origin:-2px -7px;transform:rotate(var(--sling-swing,0deg))">
        <path d="m-25-18 3-6L14-1 11 5Z" fill="${timber}"/><path d="M-17-18 8-2" stroke="#f2c281" stroke-width="2"/>
        <path d="m8-3 6 1 2 8-7 1-3-5Z" fill="${iron}"/>
        ${heavy ? '<path d="m-15-19 4 2-3 6-4-2Zm10 6 4 2-3 6-4-2Z" fill="#c3b49c" stroke-width="1"/>' : ''}
        <g transform="translate(-21 -21)">
          <g style="opacity:var(--loaded-stone,1)">
            <g transform="translate(0 -5)"><g style="transform:rotate(var(--upright-fire,0deg))">
              <path d="M-5 2C-9-3-3-5-4-10q3 1 4 5 4-4 3-10 6 5 4 11Q6 3 1 4Z" fill="#f68a38" stroke="none"/>
              <path d="M-3 1q1-3 2-5l2 2 3-5q2 7-2 9Z" fill="#ffdb75" stroke="none"/></g>
              <use href="#art-shot-flame" transform="scale(${heavy ? 1.36 : .91})"/></g></g>
          <path d="${heavy ? 'M-12-6-7-3Q0 1 7-4l5-4-2 10-7 4h-8l-6-4Z' : 'M-9-3Q0 3 9-4L6 3Q0 7-7 2Z'}" fill="${heavy ? '#7a6764' : rim}"/>
          ${heavy ? '<path d="M-9-2q9 7 18-1" fill="none" stroke="#ffc26b" stroke-width="2"/>' : ''}
        </g>
      </g>
      <circle cx="-2" cy="-7" r="4.5" fill="${iron}"/><circle cx="-2" cy="-7" r="1.8" fill="#ffe1a0" stroke="none"/>
      ${heavy ? '<path d="m-9 11 8-2 9 2-2 7H-7Z" fill="#514047"/><path d="m-5 15 3-3 2 2 3-2 2 2" fill="none" stroke="#ffa43b"/>' : ''}
    </g>`;
  }
  function plasmaCoil(upgraded) {
    const sideElectrodes = upgraded ? [-1, 1].map(side => `<g transform="scale(${side} 1)">
      <path d="m15 13 3-17 3-10 6-2-2 14-3 15Z" fill="#554978" stroke="#38344b"/>
      <path d="m16 8 8-1m-6-6 7-1" stroke="#dfa75c" stroke-width="3"/>
      <path d="m18-13 2-9 4-4 4 6-1 6-5 3Z" fill="#b284e2" stroke="#4b3969"/>
      <path d="m21-15 2-8 2 3-1 5Z" fill="#f5dcff" stroke="none"/></g>`).join('') : '';
    const rings = (upgraded ? [[5,16],[-3,12],[-11,9],[-18,6]] : [[3,16],[-7,12],[-16,8]]).map(([y,r]) => `
      <g transform="translate(0 ${y})"><ellipse rx="${r}" ry="4.5" fill="none" stroke="#394257" stroke-width="5"/>
      <path d="M${-r} 0q0 5 ${r} 5t${r}-5" fill="none" stroke="${upgraded ? '#e9ae5f' : '#b0cadd'}" stroke-width="3.4"/>
      <path d="M${-r+2} 1q2 2 5 2" fill="none" stroke="#fff3d9" stroke-width="1.5"/></g>`).join('');
    return `<g stroke="#39435e">
      <path d="M-20 4q20-10 40 0v11q-20 14-40 0Z" fill="${upgraded ? '#50416b' : '#4976ad'}"/>
      <ellipse cy="4" rx="20" ry="7" fill="${upgraded ? '#ab7cb9' : '#86accb'}"/>
      <path d="M-14 10v5m7-3v5m14-5v5m7-7v5" stroke="${upgraded ? '#e1a751' : '#b1d4ee'}" stroke-width="2.6"/>
      ${sideElectrodes}<path d="m-6 4 4-30h4L6 4Z" fill="#4d596b"/>${rings}
      <path d="M0-19v-6" stroke="#f4ce83" stroke-width="3.5"/>
      <circle cy="-26" r="${upgraded ? 7.1 : 5.2}" fill="url(#art-plasma-core)" stroke="${upgraded ? '#674f8f' : '#626e94'}" stroke-width="1.7"/>
      ${upgraded ? '<path d="m-7 13 7-4 7 4-7 7Z" fill="#6b548d" stroke="#342f4e"/><path d="m-4 13 4-2 4 2-4 4Z" fill="#d5b6ff" stroke="none"/>' : ''}</g>`;
  }
  const heads = {
    pea: `<g stroke="#294f43">
      <path d="M-17-13H-2l7 7V7l-7 7h-15l-6-6V-6Z" fill="#52896d"/>
      <path d="M-17-13H-2l7 7H-9l-7 9h-7V-6Z" fill="#9dc88c"/>
      <path d="M-10-8H20v12h-30l-4-4v-4Z" fill="#477665"/>
      <path d="M-8-7h27v4H-9Z" fill="#c7ddaa" stroke="none"/>
      <path d="M12-10h11l4 3V5l-4 3H12Z" fill="#e5ac58"/>
      <ellipse cx="24" cy="-1" rx="4.6" ry="8.2" fill="#f9cf80"/><ellipse cx="24.5" cy="-1" rx="2.3" ry="4.8" fill="#264d42" stroke="none"/>
      <path d="M-18-15h9l2 5h-13Z" fill="#e6b873"/>
      <circle cx="-13" cy="5" r="5" fill="#38614e"/><circle cx="-13" cy="5" r="2.3" fill="#f9d890" stroke="none"/></g>`,
    cannon: `<g stroke="#423e35">
      <path d="M-22 5q0-17 15-18l21-3 6 29-28 6q-13 2-14-14Z" fill="#334f58"/>
      <path d="m-9-10 25-5 2 6-25 6Z" fill="#78919a" stroke="none"/>
      <path d="m11-16 12-2 5 31-13 2Z" fill="#ecae50"/><ellipse cx="25" cy="-2" rx="6" ry="16" transform="rotate(-9 25 -2)" fill="#efc66c"/>
      <ellipse cx="25.8" cy="-2" rx="3.4" ry="10.7" fill="#283d42" stroke-width="1.4"/>
      <path d="m-21 8 24 3-4 8h-21Z" fill="#a06439"/><circle cx="-12" cy="13" r="9" fill="#d79342"/><circle cx="-12" cy="13" r="3" fill="#ffe3a0"/>
      <circle cx="-23" cy="3" r="4" fill="#6a8387"/></g>`,
    frost: `<g stroke="#306a80">
      <path d="m-22 7 6-19 17-8 18 10 6 18-13 12h-22Z" fill="#4f91a2"/>
      <path d="m-20 5 6-15 15-7 15 8 5 14-12 10H-9Z" fill="#a9dce0"/>
      <path d="m-18 6 3-18 11 8 2 13-9 3Zm25-9 11-11 1 18-9 6-8-5Z" fill="#7bd4eb"/>
      <path d="m-10 0 8-22 9 8 6 14-12 11Z" fill="#8de7f3"/><path d="m-2-21 3 29 6-22Z" fill="#e1ffff" stroke="none"/>
      <path d="m-9 14 10-3 10 3-10 5Z" fill="#5daac4"/>
      <path d="M0-6v11m-5-8 10 5m-10 0 10-5" stroke="#f8ffff" stroke-width="2"/></g>`,
    flame: catapult(false),
    pierce: `<g stroke="#344958">
      <path d="m-23-10 7-7H0l10 8v17l-9 8h-18l-7-8Z" fill="#50727b"/>
      <path d="m-21-9 7-5h12l6 4-7 4h-15Z" fill="#b5d7cb" stroke="none"/>
      <path d="M-6-9H19l9 5v8l-9 5H-6l-5-5v-8Z" fill="#354956"/>
      <path d="M-3-8h20l6 3H-4Z" fill="#a9cbc5" stroke="none"/>
      <path d="M-6-12h6v24h-6Zm10 1h5v22H4Z" fill="#7ba7a5"/>
      <path d="m16-10 8 1 6 5v8l-6 5-8 1Z" fill="#efbf80"/>
      <ellipse cx="26" rx="5" ry="8" fill="#633747"/><ellipse cx="${laserLensX}" rx="2.9" ry="5.4" fill="#ff6581" stroke="none"/>
      <path d="m-18-5 6-3 6 4-1 8-6 3-6-5Z" fill="#ea6986" stroke="#703949"/><path d="m-16-4 5-1 3 2" fill="none" stroke="#ffe8cf"/></g>`,
    push: `<g stroke="#344d58">
      <path d="m-25-8 5-5h8v25h-8l-5-5Z" fill="#528ba0"/>
      <path d="M-23-7h6v15h-6Z" fill="#a7d2d2" stroke="none"/>
      <g style="transform:scaleX(var(--spring-stretch,1));transform-origin:-13px 0">
        <path d="M-14-3h19v6h-19Z" fill="#7192a0"/>
        <path d="m-13 7 4-14 3 14 4-14 3 14 4-14" fill="none" stroke-width="4.4"/>
        <path d="m-12 4 3-10m4 10 3-10m4 10 3-10" fill="none" stroke="#d6edf0" stroke-width="1.8"/></g>
      <g style="transform:translateX(var(--punch-travel,0px))">
        <path d="M1-10h8l4 4V9l-5 4H1Z" fill="#e8b459"/>
        <path d="M7-9q0-6 6-7 4-3 8-1 6-1 9 4 5 7 1 16-3 7-12 9l-9-1-4-7Z" fill="#e76250" stroke="#773f39"/>
        <path d="M10-9q2-5 8-5m4 0q4 0 5 3" fill="none" stroke="#ffb89a" stroke-width="3"/>
        <path d="M7 4q-1 7 4 10 5 3 9-2l2-4q1-3-2-4-3-1-6 3" fill="#ef8064" stroke="#994a40" stroke-width="1.7"/>
        <path d="M23 8q4-1 6-5" fill="none" stroke="#c44b42" stroke-width="2.2"/></g></g>`,
    molecular: plasmaCoil(false)
  };
  const plinth = `<ellipse cy="23" rx="23" ry="5.5" fill="#214738" opacity=".18"/>
    <path d="m-18 8 6-6h24l7 6-2 12-8 5H-9l-9-5Z" fill="#a56a47" stroke="#5a4937"/>
    <path d="m-18 8 7-6h23l7 6-6 8h-25Z" fill="#edc991" stroke="#6f563c"/>
    <path d="m-10 18 1 4M10 18l-1 4" stroke="#d99b62" stroke-width="2.5"/>`;
  const upgradedMounts = { cannon: 'siegeCarriage' };
  const mounts = {
    pea: `<ellipse cy="21" rx="22" ry="5" fill="#294f37" opacity=".2"/>
      <path d="m-19 9 9-6 21 1 9 6-2 10-10 5h-17l-10-5Z" fill="#798b80" stroke="#41594d"/>
      <path d="m-19 9 9-6 21 1 9 6-9 6h-21Z" fill="#b9c4ac" stroke="#52685c"/>
      <path d="M-12 17v3m23-4v3" stroke="#d9dfc3" stroke-width="2.3"/>`,
    push: `<ellipse cy="22" rx="22" ry="5" fill="#294f37" opacity=".2"/>
      <path d="m-12 2-9 14v6h12l3-9h11l4 9h12v-6L12 2Z" fill="#508498" stroke="#365569"/>
      <path d="m-17 15 7-11h7l-8 11Zm26 1L4 4h6l6 12Z" fill="#b6d9d5" stroke="none"/>
      <path d="M-22 20h12m20 0h12" stroke="#354d58" stroke-width="4"/>`,
    molecular: `<ellipse cy="22" rx="24" ry="5.5" fill="#294f37" opacity=".2"/>
      <path d="m-20 9 9-9h22l10 9v11l-10 5h-22l-9-5Z" fill="#615875" stroke="#493f59"/>
      <path d="m-20 9 9-9h22l10 9-9 6h-24Z" fill="#a69cb8" stroke="#5e5270"/>
      <path d="M-8 19H8" stroke="#d2a2ef" stroke-width="3" stroke-linecap="round"/>`
  };
  const wall = `<ellipse cy="21" rx="28" ry="6" fill="#31533f" opacity=".19"/>
    <g stroke="#58675d"><path d="m-25-2 8-8h34l9 8v21l-5 4h-43l-4-4Z" fill="#94a39b"/>
    <path d="M-24 8h49m-38-8v8M7-1v9m-9 1v12" fill="none"/>
    <path d="m-24-8 6-8h12v12h8v-12h14l7 7v10h-47Z" fill="#d2d9bb"/>
    <path d="m-23-8 5-7h10m12 1h12" stroke="#f5edd0" stroke-width="3" fill="none"/></g>
    <path d="M-22 20q-6-3-7-10 7 1 10 7-1-7 4-10 3 8-1 13Z" fill="#679657"/>`;

  // Three spotted shell plates meet at a dark seam. A broken plate uses the
  // same shape and orientation as it travels to its newly spawned bug.
  const splitPlate = `<path d="M1 0 6-6Q12-13 19-11c8 1 10 8 6 14-3 5-8 8-15 6L5 4Z" fill="#e98c59" stroke="#623e45" stroke-width="2.1"/>
    <path d="M5 0q8-11 15-9" stroke="#ffdb91" stroke-width="2.6" fill="none"/>
    <path d="M8 5q11 6 16-4" stroke="#bd6050" stroke-width="1.8" fill="none"/>
    <ellipse cx="17" cy="-2" rx="3.5" ry="2.8" fill="#63414a" stroke="none" transform="rotate(-22 17 -2)"/>`;
  function splitPlateAt(index, x = 0, y = 0, scale = 1, facing = 0) {
    return `<use href="#art-splitPlate" transform="translate(${x} ${y}) rotate(${facing + index * 120}) scale(${scale})"/>`;
  }
  // One forewing and one jaw are mirrored around the beetle's midline.
  const stagElytron = `<path d="M-1-1Q-3-8 0-15C9-20 28-16 35-8Q39-4 38-1Z" fill="#985231" stroke="#382c28"/>
    <path d="M4-12Q18-15 29-8" fill="none" stroke="#dfa06a" stroke-width="2.5"/>
    <path d="M9-6Q21-7 30-4" fill="none" stroke="#693b2b" stroke-width="1.4"/>`;
  const stagJaw = `<path d="M-19-5Q-26-6-34-10L-39-13-38-9Q-45-10-49-4Q-48-13-41-17C-35-20-28-16-22-13L-18-11Z" fill="#743e2f" stroke="#302a28"/>
    <path d="M-35-12l2 5 4-4" fill="#743e2f" stroke="#302a28" stroke-width="1.5"/>
    <path d="M-27-13q-7-4-12-2" fill="none" stroke="#c28a60" stroke-width="1.8"/>`;
  const stagHead = `<g fill="none" stroke="#3b312b" stroke-width="2.2">
    <path d="M-19-9l-5-12-7-2m12 32-5 12-7 2"/>
    <path d="m-28-23-2-3m0 3-3-2m5 48-2 3m0-3-3 2"/></g>
    <path d="M-24-8l3-5q6-3 12 1l3 5V7l-3 5q-6 4-12 1l-3-5 2-4v-8Z" fill="#3c3832" stroke="#302c2a"/>
    <path d="M-20-9q4-3 8-1" stroke="#aa9171" fill="none"/>
    <g fill="#f5cb7f" stroke="#302c2a" stroke-width="1.4"><circle cx="-21" cy="-8" r="2.5"/><circle cx="-21" cy="8" r="2.5"/></g>`;
  const shells = {
    rhinoBoss: `<g stroke="#273746" stroke-width="2.4" stroke-linejoin="round">
      <ellipse cx="9" rx="24" ry="18" fill="#384762"/>
      <path d="M6-13q5 13 0 26m8-25q6 12 0 24m8-21q5 9 0 18" fill="none" stroke="#687889" stroke-width="1.8"/>
      <path d="M-19-13Q-12-21 1-17L5-8V8l-5 9q-12 3-21-6Z" fill="#526879"/><ellipse cx="-19" rx="10" ry="10" fill="#303e4d"/>
      <path d="M-15-3q-9-8-18-4l-6-7 1 11-7 4 11 1 4-5 15 9Z" fill="#d4b471"/>
      <path d="m-18-8-4-1m4 17-4 1" stroke="#ffe5a0" stroke-width="3"/></g>`,
    spiderBoss: `<g stroke="#432e4a" stroke-width="2.3">
      <path d="M-4-12Q5-23 21-17q17 7 13 22-5 17-24 13L-4 9Z" fill="#634c76"/>
      <path d="m3-11 9-3 10 4-7 4 8 6-12 9-9-4 6-6Z" fill="#d39881"/>
      <path d="m8-10 8 4-5 4 5 5-6 4" fill="none" stroke="#ffce8c" stroke-width="2"/>
      <ellipse cx="-12" rx="13" ry="12" fill="#514052"/><path d="m-19-8-10-3 2 8 6 3m2 8-10 3 2-8 6-3" fill="#c1ac91"/>
      <g fill="#ffdc7f" stroke-width="1"><circle cx="-21" cy="-4" r="3"/><circle cx="-21" cy="4" r="3"/><circle cx="-16" cy="-8" r="2"/><circle cx="-16" cy="8" r="2"/></g></g>`,
    bug: `<ellipse cx="1" rx="17" ry="13" fill="#dc5844"/>
      <path d="M-10-8Q3-18 13-6" stroke="#fc9380" stroke-width="3.4" fill="none"/>
      <path d="M-9 0h26" stroke="#743e37" stroke-width="1.7"/>
      <g fill="#483c36" stroke="none"><circle cx="-2" cy="-8" r="3.5"/><circle cx="10" cy="-4" r="2.7"/><circle cx="-1" cy="7" r="3.4"/><circle cx="11" cy="5" r="2.4"/></g>`,
    shield: `<path d="M-17-10Q-4-21 15-12q12 8 8 19-8 13-27 9-14-2-13-16Z" fill="var(--shell-body,#d69c52)"/>
      <path d="M-6-11q8 12 1 23M7-12q9 11 2 24" fill="none" stroke="#806342"/>`,
    hopper: `<path d="M-16-5Q-8-16 8-12l20 7-15 12Q0 15-12 8Z" fill="#85b641"/>
      <path d="M-6-5q12-5 29 0L4 3Z" fill="#bcd66b" stroke="#618238" stroke-width="1.4"/>`,
    mother: `<ellipse cx="-7" rx="17" ry="15" fill="#ae6393"/>
      <path d="M-12-12q12-9 24-4l10 8-6 19-21 7-5-12Z" fill="#cb81ab"/>
      <g fill="#fff1cf" stroke="#926473" stroke-width="1.8">
      <ellipse cx="13" cy="-12" rx="7" ry="9"/><ellipse cx="23" cy="-4" rx="7.5" ry="9"/><ellipse cx="24" cy="9" rx="7.5" ry="9"/><ellipse cx="12" cy="13" rx="8" ry="9"/><ellipse cx="12" cy="0" rx="7.5" ry="9"/>
      </g><path d="m12-15 1-1m10 11 1-1m0 13 1-1m-13 6 1-1m-2-11 1-1" stroke="#dbb79b" stroke-width="2.3"/>`,
    flyer: `<path d="M26 0 18-3v6Z" fill="#4e4634"/>
      <ellipse cx="3" rx="20" ry="11" fill="#ffcb4a"/>
      <path d="M0-10q4 10 0 20m10-19q5 8 0 18" fill="none" stroke="#594b38" stroke-width="5"/>
      <ellipse cx="-9" rx="8" ry="10" fill="#e69d3b"/>`,
    splitter: `<g transform="translate(2 0)">
      <path d="M-17-7Q-14-16-7-16L6-12 18-5 21 2 8 13-7 17-15 9Z" fill="#784655" stroke="#583c47"/>
      ${[0, 1, 2].map(index => splitPlateAt(index)).join('')}
      <circle r="2" fill="#754550" stroke="none"/></g>`,
    giant: `<g stroke="#303a2f" transform="scale(1 1.07)">
      <path d="M-16-15q8-8 25-6 18 1 23 13l1 10q-4 15-19 19-18 5-31-6l-5-10Z" fill="#454238" stroke-width="2.8"/>
      <path d="M-13-16Q6-26 24-14q9 7 8 16-2 14-21 18-14 3-26-6Z" fill="url(#art-scarab-shell)"/>
      <path d="M-11-14Q4-23 19-15q10 4 11 12-12-11-30-8l-10 2Z" fill="#d6af56" stroke="none"/>
      <path d="M-8 13q22 8 36-7-3 11-19 14-11 2-19-3Z" fill="#3e5543" stroke="none"/>
      <path d="M4 17q12 1 23-8l-4 6q-9 6-19 5Z" fill="#a88a4d" stroke="#534c35" stroke-width="1.1"/>
      <path d="M10 17v2m9-5 1 2" fill="none" stroke="#efcb70" stroke-width="1.3"/>
      <path d="M-9 0Q9-2 30 0" fill="none" stroke="#3b4332" stroke-width="2.4"/>
      <path d="M-2-9q14-5 24 3M0 8q11 2 20-3" fill="none" stroke="#dec375" stroke-width="1.8"/>
      <path d="M-20-16q7-6 16-3l4 5Q-8 0-1 13l-5 6q-12 3-18-7l-3-10Z" fill="url(#art-scarab-collar)" stroke-width="2.5"/>
      <path d="M-20-12q7-7 14-5l2 3q-9-1-15 7Z" fill="#f1d586" stroke="none"/>
      <path d="M-5-15q-7 15 0 29" fill="none" stroke="#e8bf69" stroke-width="2.5"/>
      <path d="M-26-8q6-2 9 5v7q-4 7-10 4l-5-4v-7Z" fill="#42524a" stroke-width="2.2"/>
      ${[-1,1].map(side => `<g transform="scale(1 ${side})"><path d="m-27-6-4-5-4-1" fill="none" stroke="#4d4934" stroke-width="2.3"/><ellipse cx="-35" cy="-12" rx="3" ry="1.8" fill="#aa8d53" stroke-width="1.2"/><path d="m-26-5 4-1-1 3-3 1Z" fill="#efbf61" stroke-width="1"/></g>`).join('')}
    </g>`,
    stagBoss: `<use href="#art-stagElytron"/><use href="#art-stagElytron" transform="scale(1 -1)"/>
      <path d="M-12-12q5-7 13-4l2 6v20l-2 6q-8 3-13-4l-2-6V-6Z" fill="#4d4336" stroke="#352f2a"/>
      <path d="M-9-11q3-3 7-3" fill="none" stroke="#bea178" stroke-width="2.4"/><path d="m7-9 7 4 7-2-7 6-7-4Zm0 18 7-4 7 2-7-6-7 4Z" fill="#e1b361" stroke="#795125" stroke-width="1"/>`,
    swift: `<path d="M-17-3q3-9 14-7L22-4l4 4-6 5-23 4q-11 0-14-6Z" fill="#d48537"/>
      <path d="m-4-7 11 7-11 7m12-12 8 5-8 5" stroke="#ffe8a0" stroke-width="2.6" fill="none"/>`
  };
  const face = `<path d="m-4-4-9-8m9 16-9 7" fill="none" stroke-width="1.9"/>
    <ellipse rx="7.8" ry="9.8" fill="#425141"/><ellipse cx="-4" cy="-4.5" rx="3.4" ry="3.9" fill="#fff9dc" stroke="none"/>
    <ellipse cx="-4" cy="4.6" rx="3.4" ry="3.8" fill="#fff9dc" stroke="none"/>
    <path d="M-5.3-5.4v1.9m0 7.1v1.9" stroke="#263d39" stroke-width="2.7"/>`;
  // Each path starts at an explicit joint on one flank. Mirror the whole
  // flank so both sets of feet stay attached throughout the walking cycle.
  const feet = {
    rhinoBoss: '<path d="m-13-8-7-13-9-3 M0-12l-1-11-7-7 M14-10l8-13 9-3" stroke="#323a46" stroke-width="4"/><path d="m-22-20-5-2m28-1-5-4m28 5 5-2" stroke="#c3a36d" stroke-width="2"/>',
    spiderBoss: '<path d="m-16-6-8-12-9-5-5-9 m23 25-1-17-11-10-1-5 M-5-8l9-19-4-9 2-5 M4-7l17-10 4-11 10-4" stroke="#463449" stroke-width="4.2" stroke-linecap="round"/><path d="m-25-20-5-2m12-4-5-5m26 2-2-5m22 13 2-5" stroke="#bc8d84" stroke-width="2.2"/>',
    bug: '<path d="M-10-6 L-16-16 -23-17 M-2-8 L0-19 -4-22 M8-6 L18-17 25-18" stroke="#53563d"/>',
    shield: '<path d="M-14-8 L-28-15 -29-22 -35-23 M-2-11 L0-29 -5-35 -10-35 M11-8 L27-16 29-22 35-23" stroke="#505548"/>',
    hopper: `<path d="M-12-5 L-17-15 -23-16 M-3-6 L-4-18 -10-20" stroke="#51693a"/>
      <path d="M4-5 18-24 27-8 33-11" stroke="#466238" stroke-width="3.6"/>
      <path d="M1-5 15-24q3-3 5 0l-2 7L7-3Z" fill="#abcb58" stroke="#526d39" stroke-width="2"/>`,
    mother: '<path d="M-17-6 L-25-20 -32-22 M-6-9 L-7-24 -13-28 M6-8 L20-23 29-24" stroke="#715467"/>',
    flyer: '<path d="M-13-5 L-18-15 -23-16 M-5-6 L-6-18 -11-20 M5-5 L21-18 29-19" stroke="#755630"/>',
    splitter: '<path d="M-14-7 L-23-18 -29-19 M-2-9 L-2-22 -8-26 M12-8 L23-21 30-20" stroke="#6c4745"/>',
    giant: `<g stroke="#414637"><path d="m-16-9-4-9-6-4-5-1 1 4 3 3 6 2 3 7Z" fill="#947742" stroke-width="2"/>
      <path d="m-26-19-3-4m7 6-2-5M-3-14l-2-8-7-5m25 13 9-8 7-1" fill="none" stroke-width="3.7"/>
      <path d="m-6-22-5-4m33 4 5-1" fill="none" stroke="#b69a59" stroke-width="1.7"/></g>`,
    stagBoss: '<path d="M-12-8l-7-9-3-9-6-2 M0-11l1-11-7-7-1-3 M11-9l7-11 9-4 4-5" stroke="#46382f" stroke-width="3.8"/>',
    swift: '<path d="M-12-5 L-22-19 -31-21 M-3-6 L1-21 -6-29 M7-4 L22-15 30-23" stroke="#875830"/>'
  };
  const rhinoWing = `<path d="M-2-7Q15-24 40-16q10 4 7 9C38 2 17 1-2-5Z" fill="#dfefe0" fill-opacity=".88" stroke="#607b80" stroke-width="1.7"/>
    <path d="M0-7q20-6 42-5M8-8l8-8m3 6 10-8m-3 7 11 8" fill="none" stroke="#96b4ae" stroke-width="1.3"/>`;
  const rhinoCover = `<path d="M-2-15C13-23 33-13 33-1Q18 1-1-1Z" fill="#58748b" stroke="#293c50" stroke-width="2.3"/>
    <path d="M3-12q13-6 23 3" fill="none" stroke="#a6c1c8" stroke-width="2.1"/>`;
  const wings = `<path d="M-4-5q-12-25-1-27 12-2 17 26Zm2 2q8-22 18-18 8 6-9 18Z" fill="#e4faf2" stroke="#648f98"/>
    <path d="m-4-8-2-17m7 20 12-12" fill="none" stroke="#9cc9c8" stroke-width="1.4"/>`;
  const shield = `<path d="m-28-9 6-14 16-8 17 1 15 9 4 13-6 5h-47Z" fill="var(--plate,#5b8798)" stroke="#364e57"/>
    <path d="m-25-12 6-10 13-6-4 15Z" fill="#eff8ee" opacity=".32" stroke="none"/>
    <path d="m-28-9 7 4h43l7-4-2 7-6 3h-40l-6-3Z" fill="#e4d4a6" stroke="#4a5754"/>
    <g fill="#faf0c5" stroke="none"><circle cx="-20" cy="-10.5" r="2"/><circle cx="20" cy="-10.5" r="2"/></g>`;
  const enemyShapes = {
    bug: { head: -14, shadow: 16 }, shield: { head: -17, shadow: 23 }, shield_down: { head: -17, shadow: 23 },
    hopper: { head: -15, shadow: 23 }, mother: { head: -21, shadow: 26 }, flyer: { head: -15, shadow: 16 },
    splitter: { head: -16, shadow: 22 }, giant: { shadow: 24 }, stagBoss: { shadow: 32 }, rhinoBoss: { shadow: 30 }, spiderBoss: { shadow: 29 }, swift: { head: -14, shadow: 20 }
  };
  const castle = `<ellipse cy="24" rx="32" ry="7" fill="#344d36" opacity=".24"/>
    <g stroke="#394858"><path d="M0-24v-17m0 0q5-4 12 0l-2 5-10-1Z" fill="#ee9f50"/>
    <path d="M-12-14v-11l12-9 12 9v15Z" fill="#6a86ab"/><path d="m-15-23 15-13 15 13Z" fill="#417391"/><path d="m0-34 11 10H1Z" fill="#71a3b6" stroke="none"/>
    <path d="M-18-12h36v33h-36Z" fill="#bcc9c7"/><path d="M-22-12v-7h6v4h5v-4h6v4h9v-4h6v4h5v-4h6v9Z" fill="#e6ddbe"/>
    ${[-22,22].map(x=>`<g transform="translate(${x} 0)"><path d="M-8-11h16v30l-4 5H-6l-2-4Z" fill="#849ca6"/><path d="M-7-10h5v26h-5Z" fill="#c5d5d2" stroke="none"/>
      <path d="M-11-12 0-29l11 17-3 4H-8Z" fill="#416f91"/><path d="m0-26 7 13H0Z" fill="#80adbe" stroke="none"/><path d="M-1-3v7" stroke-width="3"/>
      <path d="M-7 8h14v5H-7Z" fill="#d5c6a0"/></g>`).join('')}
    <path d="M-13 24V11Q0-6 13 11v13Z" fill="#d0b58a"/><path d="M-9 24V12q9-12 18 0v12Z" fill="#514647"/><path d="M-6 13v9m6-13v13m6-10v10" stroke="#b58e65" stroke-width="2.3"/>
    <path d="M-13 24h26l4 4h-34Z" fill="#e6cc98"/></g>`;
  const keepTower = `<path d="M-8-17H8V18l-3 4h-11l-2-4Z" fill="#947b6b"/>
    <path d="M-7-16h5v31h-5Z" fill="#debc8a" stroke="none"/><path d="M2-14v27h5" fill="none" stroke="#706478"/>
    <path d="M-10-18q5-6 10-17 4 10 10 17l-3 4H-7Z" fill="#9c4552"/>
    <path d="M0-31q-1 7-5 12h6Z" fill="#ea886e" stroke="none"/>
    <path d="M-9-16H9M-8 14H8" stroke="#e1ac53" stroke-width="3"/>
    <path d="M-2-9q2-4 4 0v6h-4Z" fill="#353848" stroke-width="1"/>
    <path d="M-4 3h8v13l-4-3-4 3Z" fill="#a2444b" stroke="#693c43" stroke-width="1.4"/>
    <path d="m0 5 2 3-2 3-2-3Z" fill="#f6cf72" stroke="none"/>`;
  const royalCastle = `<ellipse cy="25" rx="35" ry="7" fill="#344d36" opacity=".25"/>
    <g stroke="#4c4145"><path d="M-17-7v-26H17v26Z" fill="#a89384"/>
      <path d="M-17-23v-18h6v6h6v-6h10v6h6v-6h6v18Z" fill="#efc878"/><path d="M-16-29h32" stroke="#c29650" stroke-width="2"/>
      <path d="m-10-26 10-4 10 4v15h-20Z" fill="#9a483e"/>
      <path d="m-7-24 3 3 4-5 4 5 3-3-2 9H-5Z" fill="#ffda75" stroke="#6b4c30" stroke-width="1.3"/>
      <path d="M-29-5H29v27h-58Z" fill="#a79582"/>
      <path d="M-29 5H29m-58 10H29m-43-10v8m27-8v8M-9 16v6M9 16v6" fill="none" stroke="#78695d" stroke-width="1.6"/>
      ${[-24,24].map(x=>`<g transform="translate(${x} 0)">${keepTower}</g>`).join('')}
      <path d="M-17 21V4l7-7h20l7 7v17Z" fill="#dfb076"/><path d="M-12 22V7Q0-7 12 7v15Z" fill="#403641"/>
      <path d="M-7 4v10l2 3V3M0 1v12l2 3V2m5 2v10l2 3V6" fill="#b58752" stroke="#75593f" stroke-width="1"/>
      <path d="M-14 23h28l5 5h-38Z" fill="#c29a69"/><path d="M-13 25h26" stroke="#f0ca8c" stroke-width="1.6"/>
      <path d="M-18-8v-9h6v4h5v-4h5v4h4v-4h5v4h5v-4h6v9l-6 4H-12Z" fill="#e3c69a"/>
      <path d="M-16-7H16" stroke="#9d663e" stroke-width="2.2"/></g>`;
  const castleBow = `<g style="transform:translateX(var(--bow-kick,0px))"><path d="M-7-9Q10-7 10 0T-7 9" fill="none" stroke="#513e31" stroke-width="3.8"/>
    <g transform="translate(-7 0)"><path d="M0-9-7 0 0 9" style="transform:scaleX(var(--string-pull,1))" fill="none" stroke="#fff0bc" stroke-width="1.5"/></g>
    <path d="M-7 0H9" stroke="#bd8550" stroke-width="3"/><circle r="2.4" fill="#e3b45b" stroke="#5a4a37"/></g>`;
  const projectiles = {
    castle: `<path d="M-10 0H8" stroke="#503c2b" stroke-width="3.5"/><path d="M-8-.6H7" stroke="#e8b562" stroke-width="1.3"/>
      <path d="m-6 0-5-4-5 .6 5 3.4-5 3.4 5 .6Z" fill="#e3674d" stroke="#593d33" stroke-width="1"/>
      <path d="m5-3.5 9 3.5-9 3.5 1-3.5Z" fill="#e3f3ef" stroke="#38565b" stroke-width="1.3"/>`,
    pea: `<circle r="3.8" fill="#a5cf43" stroke="#365131" stroke-width="1.7"/><circle cx="-1" cy="-1.2" r="1.1" fill="#f1ffb2"/>`,
    cannon: `<circle r="12" fill="#394e58" stroke="#24343a" stroke-width="2.3"/><path d="M-8-4q3-6 9-5" fill="none" stroke="#adcbcd" stroke-width="3"/>
      <path d="M4 8q3-1 4-4" fill="none" stroke="#607e85" stroke-width="2"/>`,
    flame: `<path d="M-7.7-1.4q.4-3.2 3.5-5.1 1.4-1.7 3.5-1.2l4.1.8 3 2.7 1.1 4.1-1.9 4.5-4 2.8-4.8-.5-3.4-2.6Z" fill="url(#art-basalt)" stroke="#573f3c" stroke-width="1.2"/>
      <path d="m-6-2 2.8-3.4 3.8-.6-2.3 2.4Z" fill="#c39170" opacity=".79" stroke="none"/>
      <path d="m-5 3.3 2.4-2.5L.3.2 1.6-2.5l2.8-1.3M.3.2l1.9 2.6L5 3.5" fill="none" stroke="#f89649" stroke-width="1.25"/>
      <path d="m-2.5.8 2.8-.6.8-1.6" fill="none" stroke="#ffe19a" stroke-width=".7"/>`,
    push: `<path d="M-12-8Q-4 0-12 8M-5-11Q7 0-5 11M3-12Q17 0 3 12" fill="none" stroke="#39667b" stroke-width="4.6"/>
      <path d="M-5-9Q5 0-5 9M3-11Q14 0 3 11" fill="none" stroke="#d2faff" stroke-width="2.2"/>`,
    molecular: `<circle r="17.5" fill="#b570ee" fill-opacity=".24" stroke="#a271d8" stroke-width="1.4"/>
      <circle r="13.5" fill="url(#art-plasma-core)" stroke="#7449a5" stroke-width="1.8"/>
      <path d="m-14 0 4-6 1 3 5-7m18 8-5 8-1-4-5 7" fill="none" stroke="#ddfaff" stroke-width="2.1"/>
      <path d="m-6 2 5-8-1 5 7-3-6 10 1-6Z" fill="#fffbe7" stroke="none"/>`
  };
  const firePatch = `<path d="M-12 4c-4-9 4-11 3-20 5 2 7 6 6 10 5-5 8-10 7-17 6 5 7 13 5 17l5-5c2 9-1 17-7 20-7 3-15 1-19-5Z" fill="#ed6735" stroke="#a64c30" stroke-width="1.6"/>
    <path d="M-8 4c-2-5 2-8 3-12l3 5q8-8 7-13 5 7-1 15l6-4C9 8-3 13-8 4Z" fill="#ffad3d" stroke="none"/><path d="M-3 6q-2-4 2-8l2 4 4-3q2 6-3 8Z" fill="#fff1a1" stroke="none"/>`;
  const recoilDistance = { pea: 3.8, cannon: 8, pierce: 2, push: 0, molecular: 6 };
  const flightStyles = {
    castle: { muzzle: 0 },
    pea: { muzzle: 26, light: '#edf4a4' }, cannon: { muzzle: 27, light: '#ffe4a1', arc: 23 },
    flame: { muzzle: 0, arc: 110 }, push: { muzzle: 33, light: '#d9f9ff' },
    molecular: { muzzle: 0, light: '#eac6ff' }
  };
  const launchFlare = `<path d="m0 0 3-7 3 4 9-2-4 5 6 2-10 1-2 4Z" fill="currentColor"/><path d="m2 0 4-2 4 1-6 3Z" fill="#fff8da"/>`;
  const snowflake = `<g fill="none" stroke="currentColor" stroke-width="2.5">${[0,60,120].map(a => `<path transform="rotate(${a})" d="M0-10v20m-3-17 3 3 3-3m-6 14 3-3 3 3"/>`).join('')}</g>`;
  // Each upgraded silhouette is drawn at the same pivot and muzzle as its base weapon.
  const advancedHeads = {
    pea: `<g stroke="#294d43">
      <path d="M-28-8l5-12 12-3 8 5v35l-11 5-11-5-3-9Z" fill="#426f58"/>
      <path d="M-24-10l5-7 6-2v34l-7-2-4-8Z" fill="#82ad73"/>
      <path d="M-20-14v6m0 5v6m0 5v6" stroke="#ffe384" stroke-width="3.5"/>
      ${[-8,8].map(y => `<g transform="translate(0 ${y})"><path d="M-13-6h22l4 2h11v8H12l-4 2h-21Z" fill="#386657"/>
        <path d="M-10-5H9v7H-10Z" fill="#85ad7a"/><path d="M-3-5v6m5-6v6" stroke="#436b59"/>
        <path d="M13-6h10l5 4v4l-5 4H13Z" fill="#f2be61"/><ellipse cx="26" rx="2.6" ry="4.1" fill="#263d36"/></g>`).join('')}
      <path d="m-16-6 7-3 5 4v10l-5 4-7-3Z" fill="#d7e4ab"/><path d="M-13-2h5v4h-5Z" fill="#50785b" stroke="none"/></g>`,
    cannon: `<g stroke="#373b41">
      <path d="M-27-9l6-9 12-3 14 4v32l-14 5-14-3-5-10Z" fill="#414e5d"/>
      <path d="m-23-11 8-6 9-1-6 9-10 4Z" fill="#86949d" stroke="none"/>
      <path d="m-10-14 16 1 13-8 8 4 3 32-9 6-15-7-16 1Z" fill="#526571"/>
      <path d="m-7-10 15-1 12-6 1 6-13 6-16 1Z" fill="#9cafb2" stroke="none"/>
      <path d="m-5-15 7 1v28l-7 1Z" fill="#d49b58"/>
      <ellipse cx="24" rx="8" ry="20" fill="#eab66b"/><ellipse cx="26" rx="5.3" ry="14" fill="#263843"/>
      <path d="M26-12q-4 9-1 22" fill="none" stroke="#748894" stroke-width="1.8"/>
      <path d="M-28 0h14l4 5-4 4h-14Z" fill="#927349"/><circle cx="-20" cy="4" r="3" fill="#f9d382"/></g>`,
    push: `<g stroke="#344c58">
      <path d="M-28-11l5-7h11l6 6v25l-7 6h-10l-5-6Z" fill="#366a79"/>
      <path d="m-26-10 6-4h5v7h-11Zm0 20h12v5h-8Z" fill="#95cdcb"/>
      <g style="transform:scaleX(var(--spring-stretch,1));transform-origin:-13px 0">
        <path d="M-14-9H9v6h-23Zm0 13H9v6h-23Z" fill="#c0d6d4"/>
        <path d="m-12 5 4-11 4 12 4-12 4 11" fill="none" stroke="#e8ac59" stroke-width="3.4"/></g>
      <g style="transform:translateX(var(--punch-travel,0px))">
        <path d="M0-14l6-3 7 4v26l-7 5-6-4Z" fill="#f0bf65"/>
        <path d="m7-12 6-6 13-1 6 5 2 15-4 9-12 6-10-3-3-11Z" fill="#bd4b43" stroke="#703b37"/>
        <path d="m10-11 6-5 8-1 5 4-1 6-8-2-8 4Z" fill="#fa9164" stroke="#88473a"/>
        <path d="m25-17 5 2 3 6-7 2-3-4Zm2 11 7-2 1 6-8 3Zm0 9 7-3-2 7-6 3Z" fill="#ffe3a0"/>
        <path d="m8 3 7-4 8 3-1 6-6 7-7-1Z" fill="#e77951" stroke="#84483c"/></g></g>`,
    frost: `<g stroke="#396780">
      <path d="m-24 5 7-13 17-5 17 5 7 13-9 13-15 6-15-6Z" fill="#62899f"/>
      <path d="m-19 6 7-11 12-3 12 3 7 11-8 9H-11Z" fill="#b2ebeb"/>
      ${[0,60,120,180,240,300].map(a => `<g transform="translate(0 -1) rotate(${a})"><path d="m0-29 5 9-2 10-3 5-4-6-1-9Z" fill="#58bcd9"/>
        <path d="M0-28v19l4-12Z" fill="#d9ffff" stroke="none"/></g>`).join('')}
      <path d="m0-19 9 10-2 15-7 6-8-6-1-15Z" fill="#77d9ef"/><path d="m0-17 2 10-2 16-5-7Z" fill="#edffff" stroke="none"/>
      <path d="m0-4 4 4-4 5-4-5Z" fill="white" stroke="#9edfe7" stroke-width="1.2"/></g>`,
    flame: catapult(true),
    pierce: `<g stroke="#314e5d">
      <path d="M-28-7l7-12h13l8 7v24l-8 7h-13l-7-10Z" fill="#407387"/>
      <path d="m-25-8 7-7h8l-5 7Z" fill="#9ddbd4" stroke="none"/>
      ${[-1,1].map(s => `<g transform="scale(1 ${s})"><path d="m-11-11 9-11 15 2 12 7 4 7-8-1-12-6-8-1-7 7Z" fill="#6098a0"/>
        <path d="m-1-17 11 1 10 6" fill="none" stroke="#c7fff0" stroke-width="2.7"/></g>`).join('')}
      <path d="M-9-5H17l8 2v6l-8 2H-9Z" fill="#253b52"/>
      <path d="m-15-7 7-2 5 6-7 9-6-1 7-6Z" fill="#fff097" stroke="#98694d" stroke-width="1.5"/>
      <path d="M-2 0H22" stroke="#ff8b9e" stroke-width="3"/>
      <path d="m20-8 7 2 3 4v4l-3 4-7 2Z" fill="#d0b378"/><ellipse cx="${laserLensX}" rx="3" ry="5.2" fill="#ff567c" stroke="#703a55"/><path d="M27-2v3" stroke="#fff4e4"/></g>`,
    molecular: plasmaCoil(true)
  };
  const siegeCarriage = `<ellipse cy="21" rx="25" ry="6" fill="#294537" opacity=".19"/>
    <path d="m-22 8 8-9h27l10 9-3 13h-40Z" fill="#80715c" stroke="#484339"/>
    <path d="m-18 8 7-6h22l8 6-5 6h-27Z" fill="#cf9c61" stroke="#654c38"/>
    ${[-16,16].map(x => `<g transform="translate(${x} 15)" stroke="#3c4345"><circle r="9" fill="#4b5d63"/><circle r="5.2" fill="#d6a465"/><circle r="2" fill="#545858" stroke="none"/></g>`).join('')}`;
  const spikeHousing = `<g stroke="#455951"><path d="m-22-9 8-11h26l11 10v20L12 22h-26l-10-11Z" fill="#697e76"/>
    <path d="m-23-9 10-10h25l11 10-10 13h-24Z" fill="#b5c3ac"/>
    <path d="m-20 4 8 6h24l8-6v9l-8 6h-24l-8-6Z" fill="#7f9488"/>
    <path d="M-14 9v8m28-8v8M-2 11v8" fill="none"/>
    <path d="m-13-9 7-6H7l8 6-3 10-8 6-10-2-7-6Z" fill="#465f5a"/>
    <path d="m-7-4 7-7 8 7-8 8Z" fill="#dbb568"/><path d="m0-9 5 5-5 1Z" fill="#fff0ba" stroke="none"/></g>`;
  const wallBlade = `<path d="M14-5h8l10 5-10 5h-8Z" fill="#b7c9be" stroke="#465d55" stroke-width="1.9"/>
    <path d="M18-3h4l8 3H18Z" fill="#f7f2da" stroke="none"/>`;
  const upgradedShots = {
    pea: '<path d="m-11-3 13-1 7 4-7 4-13-1Z" fill="#f5ca61" stroke="#617642"/><path d="M-7-1h10" stroke="#fff7c6"/>',
    cannon: '<g transform="scale(1.6)"><use href="#art-shot-cannon"/><path d="M-11 2Q-2 7 10-5" fill="none" stroke="#e1ac58" stroke-width="3"/><circle cx="-4" cy="-6" r="2" fill="#e2efdc"/></g>',
    push: '<use href="#art-shot-push"/><path d="m-15-14 8-3m-8 31 8 3m12-32 5 3m-5 26 5-3" fill="none" stroke="#efbc64" stroke-width="3"/>',
    flame: '<g transform="scale(1.8)"><use href="#art-shot-flame"/><path d="m-4-5 .6 2.4 2.5 1.9M3.8 4.8l-.2 1.2" fill="none" stroke="#ffca6a" stroke-width="1"/></g>',
    molecular: '<use href="#art-shot-molecular"/><ellipse rx="22" ry="9" transform="rotate(-32)" fill="none" stroke="#f7ccff" stroke-width="2"/><circle cx="18" cy="-10" r="3.2" fill="#f9e5ff" stroke="#8752ab"/>'
  };
  function spikeWall(flash) {
    const elapsed = 1 - flash;
    const thrust = flash > 0 ? Math.min(1, elapsed / .13) * Math.min(1, flash / .75) ** 2 : 0;
    const spikes = [0,45,90,135,180,225,270,315].map(a =>
      ref('wallBlade', `transform="rotate(${a}) translate(${16 * thrust} 0)"`)).join('');
    return `<g class="spike-wall">${spikes}${ref('spikeHousing')}</g>`;
  }
  // Airflow bends the attached flame opposite the screen-space velocity. Buoyancy
  // lifts it near the apex. Only the basalt core inherits the stone's spin.
  function meteor(x, y, vx, vy, t, upgraded) {
    const speed = Math.hypot(vx, vy, 105);
    const flowX = -23 * vx / speed, flowY = -23 * vy / speed - 6;
    const reach = Math.hypot(flowX, flowY);
    const wind = Math.atan2(flowY, flowX) * 180 / Math.PI;
    const flutter = Math.sin(t * 25) + .45 * Math.sin(t * 43);
    const radius = (upgraded ? 1.8 : 1) * (.83 + .17 * ease(t / .15));
    const curl = 1.8 * flutter;
    const flame = `<g class="meteor-flame" transform="translate(${x} ${y}) rotate(${wind}) scale(${radius})">
      <circle r="12" fill="url(#art-ember-halo)" stroke="none"/>
      <g transform="scale(${(5 + reach) / 27} 1)" stroke="none">
        <path d="M-3-6C3-10 10-7 16-5Q13-4 13-3C19-2 22 ${curl-1} ${26+flutter} ${curl-3}Q23 ${curl+2} 16 2Q18 4 20 4C12 8 3 9-3 6Z" fill="url(#art-tongue)"/>
        <path d="M-2-5C5-7 9-4 12-4L9-2Q14 0 20 ${curl}Q15 3 10 1Q12 3 14 3C7 6 1 6-2 4Z" fill="#ffc76a"/>
        <path d="M1-3Q6-4 12 0Q7 3 1 3Z" fill="#fff1ac"/></g></g>`;
    const spin = (vx < 0 ? -1 : 1) * (12 + 205 * t);
    const id = upgraded ? 'advanced-shot-flame' : 'shot-flame';
    return flame + ref(id, `class="shot-flame meteor-stone" transform="translate(${x} ${y}) rotate(${spin}) scale(${.83 + .17 * ease(t / .15)})"`);
  }
  function shot(kind, x, y, angle, t = 0, upgraded = false, weapon) {
    if (fusionRounds[weapon]) return ref('round-' + weapon, `class="fusion-round" transform="translate(${x} ${y}) rotate(${angle}) scale(${upgraded ? 1.15 : 1})"`);
    if (kind === 'flame') {
      const a = angle * Math.PI / 180;
      return meteor(x, y, Math.cos(a) * 160, Math.sin(a) * 160, t, upgraded);
    }
    const swell = Math.sin(Math.PI * t);
    let pose = '';
    if (kind === 'cannon') pose = `rotate(${t * 95})`;
    if (kind === 'molecular') pose = `rotate(${t * 160}) scale(${.87 + .21 * swell})`;
    if (kind === 'push') pose = `scale(${1 - .22 * swell} ${.75 + .6 * t})`;
    return ref((upgraded && kind !== 'castle' ? 'advanced-shot-' : 'shot-') + kind, `class="shot-${kind}" transform="translate(${x} ${y}) rotate(${angle}) ${pose}"`);
  }
  function flight(kind, cx, cy, tx, ty, t, launchAngle, upgraded = false, barrelOffset = 0, scale = 1, weapon) {
    if (kind === 'flame') {
      if (t < slingRelease) return ''; // The stone is still visible in the moving spoon.
      t = (t - slingRelease) / (1 - slingRelease);
    }
    const style = flightStyles[weapon] ?? flightStyles[kind];
    const muzzle = Math.min((weapon === 'magCannon' ? 25 : style.muzzle) * scale, Math.hypot(tx - cx, ty - cy) * .55);
    const angle = launchAngle * Math.PI / 180;
    const cupX = kind === 'flame' ? (Math.cos(angle) < 0 ? -7 : 7) : 0;
    const sx = cx + Math.cos(angle) * muzzle - Math.sin(angle) * barrelOffset * scale + cupX * scale;
    // The fully raised stone cup and the plasma orb both release above their carriage.
    const releaseHeight = kind === 'flame' ? 32 : kind === 'molecular' && weapon !== 'magCannon' ? 26 : 0;
    const sy = cy + Math.sin(angle) * muzzle + Math.cos(angle) * barrelOffset * scale - releaseHeight * scale;
    const vx = tx - sx, vy = ty - sy;
    const arc = Math.min(style.arc || 0, Math.hypot(vx, vy) * (kind === 'flame' ? .42 : .22));
    const x = sx + vx * t, y = sy + vy * t - 4 * arc * t * (1 - t);
    const velocityY = vy - 4 * arc * (1 - 2 * t);
    if (kind === 'flame') return meteor(x, y, vx, velocityY, t, upgraded);
    const direction = Math.atan2(velocityY, vx) * 180 / Math.PI;
    const round = shot(kind, x, y, direction, t, upgraded, weapon);
    const pulse = Math.max(0, 1 - t * 2.5);
    const flare = pulse > 0 && style.light ? ref('launchFlare', `class="fx-accent muzzle-flare" color="${style.light}" opacity="${pulse}" transform="translate(${sx} ${sy}) rotate(${launchAngle}) scale(${.6 + pulse * .7})"`) : '';
    return round + flare;
  }
  function plasmaArc(x, y, tx, ty, age, hop, reducedMotion) {
    // Each pulse arrives just as the next link launches.
    const flightTime = .3 * window.Garden.BATTLE_SPEED, afterglow = .52;
    const localAge = age;
    if (localAge < 0 || localAge >= flightTime + afterglow) return '';
    const dx = tx - x, dy = ty - y, length = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const bend = Math.min(19, length * .24) * (hop % 2 ? 1 : -1);
    const size = 1 - hop * .16;
    const t = Math.min(1, localAge / flightTime);
    const decay = Math.max(0, (localAge - flightTime) / afterglow);
    const opacity = 1 - decay;
    // The core and both edges of its ribbon share the same quadratic curve.
    const atY = u => 4 * bend * u * (1 - u);
    const tail = Math.max(0, t - .52) + decay * .52;
    const hx = length * t, hy = atY(t), sx = length * tail, sy = atY(tail);
    const cx = (sx + hx) / 2, cy = sy + 2 * bend * (1 - 2 * tail) * (t - tail);
    const width = Math.min(length * .16, 8 * size) * opacity;
    const track = `M0 0 Q${hx / 2} ${2 * bend * t} ${hx} ${hy}`;
    const ring = 4 + 17 * (1 - opacity ** 2);
    let light;
    if (reducedMotion) {
      light = `<path d="M0 0 Q${length / 2} ${2 * bend} ${length} 0" fill="none" stroke="#8055ad" stroke-width="${2.5 * size}"/>
        <circle cx="${length}" r="${5 * size}" fill="#d8f6ff" stroke="#7950a5" stroke-width="1.6"/>`;
    } else {
      const trail = length < 1 ? '' : `<path d="${track}" fill="none" stroke="#714caa" stroke-width="${4 * size}" stroke-opacity=".65"/>
        <path d="${track}" fill="none" stroke="#e4c5ff" stroke-width="${1.7 * size}"/>
        <path d="M${sx} ${sy} Q${cx} ${cy - width} ${hx} ${hy} Q${cx} ${cy + width} ${sx} ${sy}Z" fill="#a9e9ff" stroke="#9986f0" stroke-width=".8"/>`;
      const pulse = t < 1 ? `<g transform="translate(${hx} ${hy}) scale(${size})">
        <circle r="16" fill="url(#art-chain-glow)"/><circle r="6.5" fill="url(#art-plasma-core)" stroke="#7950ac" stroke-width="1.2"/>
        <g transform="rotate(${-36 + 60 * t})"><ellipse rx="9" ry="3.3" fill="none" stroke="#ede4ff" stroke-width="1.2"/><circle cx="9" r="1.7" fill="#faf5ff"/></g>
        <circle cx="-1.3" cy="-1.5" r="2" fill="#fff"/></g>` : `<g class="plasma-contact" transform="translate(${length} 0) scale(${size})">
        <circle r="${ring}" fill="none" stroke="#8354ae" stroke-width="3"/><circle r="${ring}" fill="none" stroke="#e5e8ff" stroke-width="1.4"/>
        <g transform="rotate(24)" fill="#d6f9ff" stroke="#9668c3" stroke-width="1">${[0,120,240].map(a => `<path transform="rotate(${a}) translate(${ring + 1} 0) scale(${opacity})" d="M-4 0 1-2 7 0 1 2Z"/>`).join('')}</g>
        <path transform="scale(${opacity ** 2})" d="M-8 0-2-2 0-9 2-2 8 0 2 2 0 9-2 2Z" fill="#f4ffff"/></g>`;
      light = trail + pulse;
    }
    return `<g class="plasma-arc" data-hop="${hop}" transform="translate(${x} ${y}) rotate(${angle})" opacity="${opacity}" stroke-linecap="round">${light}</g>`;
  }
  function laser(angle, length, t, hitDistances, flash, upgraded = false, scale = 1, weapon) {
    const recoil = recoilOffset('pierce', flash);
    const start = (laserLensX - recoil) * scale;
    const path = `M${start} 0H${Math.max(start, length)}`;
    const intensity = (1 - t) ** 2;
    const rail = weapon === 'mapLaser';
    if (weapon === 'recoilRay') return `<g class="recoil-ray" transform="translate(0 ${headY*scale}) rotate(${angle})" stroke-linecap="round" fill="none">
      <path d="${path}" stroke="#4e8c83" stroke-width="7" opacity=".65"/><path d="${path}" stroke="#a5f3ca" stroke-width="3.7"/><path d="${path}" stroke="#fffbd1" stroke-width="1.4"/>
      <circle class="laser-origin" cx="${start}" r="4.5" fill="#e4ffc9"/>
      ${hitDistances.map(d=>`<g transform="translate(${d+9*t} 0) scale(${.65+.4*t})"><path d="m-9-9 6 9-6 9m7-18 6 9-6 9" stroke="#397b76" stroke-width="4.4"/><path d="m-9-9 6 9-6 9m7-18 6 9-6 9" stroke="#d9ffbf" stroke-width="2"/></g>`).join('')}</g>`;
    if (weapon === 'heatRay') return `<g class="heat-ray" transform="translate(0 ${headY*scale}) rotate(${angle})" fill="none" stroke-linecap="round">
      <g transform="scale(1 ${upgraded?2:1})"><path d="${path}" stroke="#e96137" stroke-opacity=".43" stroke-width="${9+7*intensity}"/>
      <path d="${path}" stroke="#c64c34" stroke-width="6.4"/><path d="${path}" stroke="#ffae44" stroke-width="4.7"/><path d="${path}" stroke="#ffefb3" stroke-width="2"/>
      <path d="${path}" stroke="#fffbd7" stroke-width="3.8" stroke-dasharray="11 35" stroke-dashoffset="${-58*t}"/></g>
      <ellipse class="laser-origin" cx="${start}" rx="${4+4*intensity}" ry="4" fill="#fff3a0"/>
      ${hitDistances.map(d=>`<g transform="translate(${d} 0) rotate(${-angle})"><path d="m-8-2 4-5-1-6m10 8 4-3 1-4" stroke="#f9ad47" stroke-width="2.3"/>${ref('firePatch',`transform="translate(0 ${-7-6*t}) scale(${.63-.18*t})"`)}</g>`).join('')}</g>`;
    if (weapon === 'cryoBeam') return `<g class="cryo-beam" transform="translate(0 ${headY*scale}) rotate(${angle})" fill="none" stroke-linecap="round">
      <g transform="scale(1 ${upgraded?2:1})"><path d="${path}" stroke="#3476b5" stroke-width="${5+5*intensity}" opacity=".55"/><path d="${path}" stroke="#8befff" stroke-width="4.6"/><path d="${path}" stroke="#fff" stroke-width="1.6"/>
      <path class="fx-accent" d="${path}" stroke="#edfaff" stroke-width="5.8" stroke-dasharray="2 24" stroke-dashoffset="${-48*t}"/></g>
      <circle class="laser-origin" cx="${start}" r="${3+2*intensity}" fill="#f1ffff"/>
      ${hitDistances.map(d=>`<g transform="translate(${d} 0) rotate(${25*t}) scale(${.42+.45*t})">${ref('snowflake','color="#f6ffff" stroke="#559acc"')}</g>`).join('')}</g>`;
    return `<g transform="translate(0 ${headY * scale}) rotate(${angle})" fill="none" stroke-linecap="round">
      <path d="${path}" stroke="${rail ? '#59ddff' : '#fc597f'}" stroke-opacity=".3" stroke-width="${(upgraded ? 6 : 4) + 7 * intensity}"/>
      <path d="${path}" stroke="${rail ? '#397dad' : '#d64262'}" stroke-width="${(upgraded ? 3.5 : 2) + 3 * intensity}"/><path d="${path}" stroke="#fff4ce" stroke-width="${1 + 2 * intensity}"/>
      ${upgraded ? `<path d="M${start} 0${Array.from({length: 16}, (_, i) => `L${start + (length - start) * (i + 1) / 16} ${i === 15 ? 0 : (i % 2 ? -1 : 1) * (2 + 3 * intensity)}`).join('')}" stroke="#9ffaff" stroke-width="2.8"/>` : ''}
      ${rail ? `<path d="${path}" stroke="#98f9ff" stroke-width="2" stroke-dasharray="14 32" stroke-dashoffset="${-120 * t}"/>` : ''}
      <circle class="laser-origin" cx="${start}" r="${2 + 3 * intensity}" fill="#fff5c9"/>
      <g class="laser-hits">${hitDistances.map(d => `<g transform="translate(${d} 0)"><circle r="${4 + t * 12}" stroke="${upgraded ? '#a8efff' : '#ffcb77'}" stroke-width="2.7"/>
        <path transform="rotate(${22 * t}) scale(${1 - .55 * t})" d="m0-13 3 8 8-3-5 7 6 5-9-1-3 9-2-9-8 3 4-7-6-4 8 1Z" fill="#fff5c9" stroke="${upgraded ? '#4e9aa4' : '#c65340'}" stroke-width="1.7"/></g>`).join('')}</g></g>`;
  }
  function aura(radius, t, upgraded = false) {
    const spread = 1 - (1 - t) ** 2;
    const front = 15 + (radius - 15) * spread;
    const crystals = upgraded ? [0,60,120,180,240,300].map(a => `<path transform="rotate(${a + 20 * t}) translate(${front} 0)" d="m-10 0 9-4 7 4-7 4Z" fill="#d1faff" stroke="#448cb9" stroke-width="1.5"/>`).join('') : '';
    return `${crystals}<circle r="${radius}" fill="#91dce6" fill-opacity=".07" stroke="#74b8c3" stroke-opacity=".42" stroke-dasharray="5 8"/>
      <circle r="${front}" fill="none" stroke="#81d6e2" stroke-opacity=".32" stroke-width="${4 + 6 * (1 - t)}"/>
      <circle r="${front}" fill="none" stroke="#eaffff" stroke-width="2.1"/>
      <g class="fx-accent" fill="none" stroke="#b5f7ff" stroke-width="1.8">
        <circle r="${Math.max(1, front - 15 * spread)}" stroke-dasharray="${front * .46} ${front * .32}" transform="rotate(${t * 16})"/>
        ${[18,78,138,198,258,318].map(angle => ref('snowflake', `color="#ebffff" transform="rotate(${angle}) translate(${front - 4} 0) rotate(${-angle + 38 * t}) scale(${.4 + .4 * Math.sin(Math.PI * t)})"`)).join('')}</g>`;
  }
  const silkEdge = 'M0-22Q6-13 20-12Q15 0 20 12Q8 13 0 22Q-7 13-20 12Q-15 0-20-12Q-6-13 0-22Z';
  const silkMesh = 'M0-22V22M-20-12 20 12M20-12-20 12 M0-12Q4-7 11-6Q8 0 11 6Q5 7 0 12Q-4 7-11 6Q-8 0-11-6Q-4-7 0-12Z';
  const silkNet = `<path d="${silkEdge}" fill="#d7ceea" fill-opacity=".28"/>
    <path d="${silkEdge} ${silkMesh}" fill="none" stroke="#655573" stroke-width="4.3"/>
    <path d="${silkEdge} ${silkMesh}" fill="none" stroke="#fff9ff" stroke-width="2.3"/><circle r="2.6" fill="#fff9ff"/>`;
  function spiderWebFlight(x, y, tx, ty, mouthOffset, progress, reducedMotion) {
    const dx = tx - x, dy = ty - y, distance = Math.hypot(dx,dy);
    const muzzle = Math.min(mouthOffset, distance * .48);
    const sx = x + dx * muzzle / (distance || 1), sy = y + dy * muzzle / (distance || 1);
    const arc = reducedMotion ? 0 : Math.min(19, distance * .12);
    // The head and the unspooling silk follow the same shallow arc.
    const point = t => ({ x: sx + (tx-sx)*t, y: sy + (ty-sy)*t - 4*arc*t*(1-t) });
    const head = point(progress), tailT = Math.max(0, (progress - .55) / .45), tail = point(tailT);
    const cy = tail.y + ((ty-sy) - 4*arc*(1-2*tailT)) * (progress-tailT) / 2;
    const thread = `M${tail.x} ${tail.y}Q${(tail.x+head.x)/2} ${cy} ${head.x} ${head.y}`;
    const release = Math.max(0, 1 - progress / .45);
    const size = .38 + .89 * progress;
    return `<g class="spider-silk" stroke-linecap="round">
      <path d="${thread}" fill="none" stroke="#665574" stroke-width="3.8"/><path d="${thread}" fill="none" stroke="#fffbff" stroke-width="2"/>
      ${release ? `<g transform="translate(${sx} ${sy})" opacity="${release}" fill="none"><circle r="${4 + 13*(1-release)}" stroke="#805a86" stroke-width="3.5"/><circle r="${4 + 13*(1-release)}" stroke="#ffefff" stroke-width="1.8"/></g>` : ''}
      <g class="flying-web" transform="translate(${head.x} ${head.y}) rotate(${reducedMotion ? 0 : -24*(1-progress)}) scale(${size})">${ref('silkNet')}</g></g>`;
  }
  function brokenHeart(t) {
    const split = Math.min(1, t / .58), gap = 1 + 5 * split;
    return `<g class="broken-heart" transform="translate(0 ${-8 * t})" opacity="${Math.min(1, (1 - t) * 3)}" stroke="#912b40" stroke-width="1.6" stroke-linejoin="round">
      <g transform="translate(${-gap} 0) rotate(${-11 * split})"><path d="M0-7C-7-18-19-11-16-2c2 6 8 12 16 18l-1-8 4-5-6-4Z" fill="#f45160"/><path d="M-12-7q2-4 5-3" fill="none" stroke="#ffd8c9" stroke-width="2.2" stroke-linecap="round"/></g>
      <g transform="translate(${gap} ${2 * split}) rotate(${11 * split})"><path d="M0-7C8-18 19-10 16-2c-2 6-8 12-16 18l-1-8 4-5-6-4Z" fill="#e93d52"/></g></g>`;
  }
  function chargeGlobe(progress, upgraded = false) {
    const radius = (upgraded ? 5 : 3) + 5 * progress;
    const current = upgraded ? 'M24 5 18 2 17 7 10 3 8 5 0 0' : 'M13 30 8 24 13 21 5 16 8 13 3 7 0 0';
    return `<g class="coil-charge" fill="none" stroke-linecap="round">
      ${[-1,1].map(side => `<g transform="scale(${side} 1)" opacity="${.45 + .55 * progress}">
        <path d="${current}" stroke="${upgraded ? '#9e65e0' : '#7370cb'}" stroke-width="${upgraded ? 4.6 : 3.8}"/>
        <path d="${current}" pathLength="1" stroke-dasharray=".28 .18" stroke-dashoffset="${-progress * 5}" stroke="#e5fbff" stroke-width="2"/></g>`).join('')}
      <circle r="${radius+4}" fill="#b8caff" opacity="${progress*.48}"/><circle r="${radius}" fill="url(#art-plasma-core)" stroke="#a5a4ec" stroke-width="1.3"/><circle cx="-1" cy="-1" r="${1.2+1.4*progress}" fill="#fff"/></g>`;
  }
  function stoneImpact(t, upgraded) {
    const front = 1 - (1 - t) ** 2;
    const chips = (upgraded ? [-161,-121,-72,-24,31,75,138] : [-155,-93,-36,48,145]).map((angle, i) => {
      const a = angle * Math.PI / 180, hop = Math.min(1, t * (i % 2 ? 1.08 : 1.35));
      const spread = (i % 2 ? 18 : 26) * front;
      const x = Math.cos(a)*spread, y = Math.sin(a)*spread*.48 - (i % 2 ? 40 : 60)*hop*(1-hop);
      return `<g transform="translate(${x} ${y}) rotate(${angle+95*hop}) scale(${(i%2 ? .76 : 1)*(1-.35*t)})">
        <path d="m-2.8-1.6 2-1.2 3.3 1.1-.6 2.7-2.3.8-2.2-1Z" fill="#825443"/><path d="m-2.4-1.4 1.8-1 2.2.9-2.5.6Z" fill="#ffd389"/></g>`;
    }).join('');
    return `<g class="stone-impact" transform="scale(${upgraded ? 1.48 : 1})" stroke="none">
      <g transform="scale(1 .5)"><circle r="${5+20*front}" fill="url(#art-ember-halo)" opacity="${1-t}"/></g>
      <ellipse rx="${4+front*21}" ry="${2+front*10}" fill="none" stroke="#ffd78a" stroke-opacity="${.85-.65*t}" stroke-width="${2.3-1.6*t}"/>
      <g class="fx-accent"><path d="m-16 5 7-3 4 1 6-5 5 1 8-4m-17 8 4 3 6-1" transform="scale(${front})" fill="none" stroke="#ffdb89" stroke-linecap="round" stroke-width="1.5"/>${chips}</g></g>`;
  }
  function impactBurst(kind, t) {
    const flame = kind === 'flare', reach = flame ? 23 : 12;
    const spread = 1 - (1 - t) ** 2;
    const bits = flame ? [0, 63, 139, 201, 281] : [20, 145, 255];
    return `<g class="fx-accent"><circle r="${2 + spread * reach}" fill="none" stroke="${flame ? '#ffbd58' : '#e5f7a5'}" stroke-width="${2.8 - 1.6 * t}"/>
      ${bits.map((a,i) => `<g transform="rotate(${a}) translate(${(4 + spread * reach) * (i % 2 ? .82 : 1)} 0) scale(${1 - t * .7})"><path d="m-3 0 3-2 4 2-4 2Z" fill="${flame ? '#ffbc45' : '#b6da6d'}" stroke="${flame ? '#cb6c37' : '#689355'}" stroke-width="1"/></g>`).join('')}</g>`;
  }
  const pen = 'stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"';
  const ref = (name, attrs = '') => `<use href="#art-${name}" ${attrs}/>`;
  const rhinoPair = (name, part) => {
    const side = ref(name, `class="${part}"`);
    return side + `<g transform="scale(1 -1)">${side}</g>`;
  };
  const rhinoWings = `<g class="rhino-wings">${rhinoPair('rhinoWing', 'flight-wing')}</g>`;
  const rhinoCovers = rhinoPair('rhinoCover', 'wing-cover');
  const fusionMaterials = `
    <linearGradient id="gg-painted-steel" x2=".22" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="#c3d5c9"/><stop offset=".55" stop-color="#7d9f9b"/><stop offset="1" stop-color="#476267"/></linearGradient>
    <linearGradient id="gg-olive-armor" x2=".25" y2="1"><stop stop-color="#c6cb97"/><stop offset=".5" stop-color="#93a270"/><stop offset="1" stop-color="#63764e"/></linearGradient>
    <linearGradient id="gg-ice-facet" x2=".3" y2="1"><stop stop-color="#ffffff"/><stop offset=".42" stop-color="#bcf6ff"/><stop offset="1" stop-color="#57b8d8"/></linearGradient>
    <linearGradient id="gg-cast-bronze" x2="0" y2="1"><stop stop-color="#98593e"/><stop offset=".27" stop-color="#f7b65d"/><stop offset=".48" stop-color="#e58d46"/><stop offset="1" stop-color="#934b37"/></linearGradient>
    <linearGradient id="gg-laser-glass" x2="0" y2="1"><stop stop-color="#5b4797"/><stop offset=".3" stop-color="#d6aaff"/><stop offset=".53" stop-color="#a97ce1"/><stop offset="1" stop-color="#614a9d"/></linearGradient>
    <linearGradient id="gg-pressure-enamel" x1="0" y1="0" x2=".15" y2="1"><stop stop-color="#d8f3e4"/><stop offset=".3" stop-color="#75c8b9"/><stop offset=".65" stop-color="#419b94"/><stop offset="1" stop-color="#286b72"/></linearGradient>`;
  const fusionHeads = {
    tacticalAir: `
      <g stroke="#283f43" stroke-width="2">
        <path d="M-14 4q-3-11 6-17 10-4 17 3l2 13-9 7-12-1Z" fill="url(#gg-painted-steel)"/>
        <path d="M-4-12 22-12l3 2-2 4H-4Zm0 14 27 1 2 3-3 3-26-2Z" fill="#46545a"/>
        <path d="M4-11h13M4 3l13 1" stroke="#bacdc5" fill="none"/>
        <path d="M18-13h8v7h-8Zm0 15 8 1v7l-8-1Z" fill="#263b42"/>
        <path d="M-9-3h12v7H-9Z" fill="#acd4cc"/><path d="M-10 5v-8" stroke="#e9c36c"/>
      </g>`,
    tacticalGround: `
      <g stroke="#344337" stroke-width="2.2">
        <path d="M-17 4q-1-14 12-17 12-1 17 9l-1 13q-14 10-26 0Z" fill="url(#gg-olive-armor)"/>
        <path d="M-3-7 20-5l4 4-3 7L-3 7Q-6 0-3-7Z" fill="#7b8b64"/>
        <path d="m4-4 14 1" stroke="#d6d4a2"/>
        <path d="m17-10 10 1 3 4v11l-4 4-11-2Z" fill="#c4bb87"/>
        <ellipse cx="26.5" cy=".2" rx="3.2" ry="7" fill="#28373a"/><path d="M26-4v6" stroke="#0e2025"/>
        <path d="m-12-4 7-4" stroke="#d3d9ac"/>
      </g>`,
    iceCannon: `
      <g stroke="#295979" stroke-width="2">
        <path d="m-9-8 14-2 17 3 8 7-10 8L1 10-11 5Z" fill="#426d96"/>
        <path d="m0-7 18-4 13 10-14 3-17-2Z" fill="url(#gg-ice-facet)"/>
        <path d="m-1 1 19-1 13-1-12 9L3 9Z" fill="#65c5e3"/>
        <path d="m12-5 7-2 7 5" stroke="#f0ffff" fill="none"/>
        <path d="M2-8 5-8 7 7 3 9Z" fill="#6a8bb8"/>
        <circle cx="-7" r="12" fill="#3d93bd"/><circle cx="-7" r="9" fill="#53b6d8" stroke="none"/>
      </g>
      <g transform="translate(-7 0)" fill="none" stroke="#f5ffff" stroke-width="1.5">
        ${[0,60,120,180,240,300].map(a => `<path transform="rotate(${a})" d="M0 0v-8.4m-2.2 2L0-4.5l2.2-1.9"/>`).join('')}
      </g>`,
    fireCannon: `
      <g stroke="#63392d" stroke-width="2">
        <path d="M-14-9q7-6 18-1l10 4 8-2 5-4q5 1 5 12t-5 12l-6-4-7-1-12 5q-14 4-19-7-3-8 3-14Z" fill="url(#gg-cast-bronze)"/>
        <path d="M-7-11q-5 11 0 22l4 1q-4-12 0-24Z" fill="#764b3d"/>
        <path d="M-5-6q6-3 15 0" stroke="#ffe3a2" stroke-width="2.6" fill="none"/>
        <path d="M19-8q-5 8 0 16l5 2q-5-11 0-20Z" fill="#ae6340"/>
        <ellipse cx="27" rx="5" ry="11" fill="#ffa24c"/>
        <ellipse cx="27.8" rx="2.6" ry="7.4" fill="#873b28" stroke-width="1"/>
        <path d="M27 4q-2-4 .5-7 3 6 0 8" fill="#ffe494" stroke="none"/>
      </g>`,
    mapLaser: `
      <g stroke="#393c60" stroke-width="1.9">
        <path d="M-22-5h8v10h-8Z" fill="#718096"/><ellipse cx="-21" rx="2.5" ry="5" fill="#373f59"/>
        <path d="m-16-9 12-2 8 4-1 15-16 2q-6-9-3-19Z" fill="#626889"/>
        <path d="M-7-8 14-7 19-4v9l-5 3-22-1Z" fill="url(#gg-laser-glass)"/>
        <path d="m-4 1 19-2" stroke="#fff4ff" stroke-width="2.4"/><path d="m-1-5 8 0" stroke="#efd4ff"/>
        <path d="M-10-9h4v18h-4Zm23 0h4v18h-4Z" fill="#c5b48c"/>
        <path d="m16-7 9-5 5 3v17l-5 4-9-5Z" fill="#687993"/>
        <ellipse cx="26.5" rx="4.1" ry="9.1" fill="#53d7e7"/><ellipse cx="27" rx="1.9" ry="5.6" fill="#e4ffff" stroke="none"/>
      </g>`,
    impactCannon: `<g stroke="#294c50" stroke-linejoin="round">
      <ellipse cy="3" rx="21.5" ry="15" fill="#3e6967" stroke-width="2"/>
      <g transform="scale(1 .76)">
        <circle r="21.5" fill="#cb9554" stroke-width="2.2"/><circle r="17.6" fill="#36615c" stroke-width="1.6"/>
        <circle r="14.6" fill="url(#gg-pressure-enamel)" stroke="#9edecd" stroke-width="2.3"/>
        <circle r="10.8" fill="#244950" stroke="#304e50"/><circle r="8.1" fill="#78c8b7" stroke="#102f35"/>
        <path d="M-6 0a6 6 0 0 1 9-5" fill="none" stroke="#e5fff0" stroke-width="2"/>
        ${[0,60,120,180,240,300].map(a=>`<path transform="rotate(${a})" d="m-2-21 4 0-.6 3.5h-2.8Z" fill="#ffe19a" stroke="#7e633e" stroke-width=".9"/>`).join('')}
      </g></g>`,
    magCannon: '<path fill="#515d80" d="m-16-8 10-7 14 5 6 10-9 10-16 2-7-7Z"/><path fill="#737aa4" d="M-4-11 19-11 28-7 25-4 4-5 1 0-7-4Z"/><path fill="#738db3" d="m-4 11 23 0 9-4-3-3-21 1-3-5-8 4Z"/><path d="M4-11v6m5-6v6m6-6v6M4 5v6m5-6v6m6-6v6" stroke="#e9a776" stroke-width="2.6"/><path d="M1-3h18m-18 6h18" fill="none" stroke="#87ecff" stroke-width="1.6"/><circle cx="-7" r="5" fill="#81dffd"/><circle cx="-8" cy="-1" r="2" fill="#f3ffff" stroke="none"/>'
  };
  const fusionRounds = {
    gravityCannon: `<g stroke="#59517d" stroke-width="1.4"><circle r="9.8" fill="#8276bc"/><circle r="7.4" fill="#302e51"/><ellipse rx="13" ry="4.8" transform="rotate(-25)" stroke="#c9b8ff" stroke-width="2.6" fill="none"/><path d="M-4-5q3-3 7-1" stroke="#dddeff" fill="none"/></g>`,
    cryoPlasma: `<g stroke="#566a9f" stroke-width="1.6"><ellipse rx="11" ry="8.8" fill="#87c9ea"/><path d="m-8-1 4-6 7-1 6 6-5 6-7 2Z" fill="#c0f4ff"/><path d="m-4 0 5-5 4 3-4 5Z" fill="#fff" stroke="none"/><ellipse rx="5" ry="13" transform="rotate(22)" fill="none" stroke="#b7f8ff" stroke-width="2"/></g>`,
    tacticalAir: '<path d="m-7-2 8-1 6 3-6 3-8-1Z" fill="#ffe6a3"/><path d="M-5-2v4" stroke="#9eaeb0"/>',
    tacticalGround: '<path d="M-8-5-3-8 5-7 10-1 7 6-2 8-9 4Z" fill="#6b7377"/><path d="m-5-6 3 13" stroke="#e8b15a" stroke-width="3"/>',
    iceCannon: '<path d="m-10 0 5-5 9 1 6 4-9 5-7-1Z" fill="#8bdeef" stroke="#357a99"/><path d="m-6 0 7-2 7 2-9 1Z" fill="#efffff" stroke="none"/>',
    fireCannon: '<path d="M-10-4-5-3-7-8 1-5Q9-7 9 0 8 8 0 6l-9 1 4-5-7-2Z" fill="#ff9140" stroke="#a14c36"/><path d="m-4 0 4-3q6-1 6 3 0 4-6 3Z" fill="#ffed9a" stroke="none"/>',
    magCannon: '<path d="m-12 0 10-6 10 3 4 3-6 4-9 2Z" fill="#85b8ff" stroke="#586ca8"/><path d="m-6 0 8-3 6 3-7 2Z" fill="#f1ffff" stroke="none"/><ellipse rx="3" ry="8" transform="rotate(18)" fill="none" stroke="#a0f4ff" stroke-width="1.6"/>'
  };
  const fusionPlatforms = {
    tacticalAir: `
      <g stroke="#424d38" stroke-width="2" stroke-linejoin="round">
        <path d="m-27-9 7-11 22-5 18 9 5 20-10 16-29 1-13-12Z" fill="#62735a"/>
        <path d="m-26-11 8-10 22-4 17 10-2 13-11 12-23-2-11-10Z" fill="url(#gg-olive-armor)"/>
        <path d="m-25 4 8 7 7 1-1 9-9-2-8-8Zm18 9 10 1 2 9-13-1Zm14 0 10-6 6 3-5 10-10 2Z" fill="#b6aa7d"/>
        <path d="m-23 8 9 6m11 3h5m10-2 8-5" stroke="#e3d8ac"/>
        <path d="m-14-16-2-8m-4 3 5-7 5 1q-1 7-10 6Z" fill="#afc6b0"/>
      </g>`,
    iceCannon: `
      <g stroke="#396888" stroke-width="1.7" stroke-linejoin="round">
        <path d="m-25 3 8-13 20-5 20 10 1 13-13 12-25-1-10-8Z" fill="#75b8ce"/>
        <path d="m-25 3 11-11 18-4 20 9-10 11-25 2Z" fill="#c4eff1"/>
        <path d="m-17 7-10-13 2-14 12 8 4 14Z" fill="url(#gg-ice-facet)"/>
        <path d="m-25-18 5 16 4 6" fill="none" stroke="#eaffff"/>
        <path d="m-12 2-5-20 6-13 9 13-3 18Z" fill="#87dff0"/>
        <path d="m-11-29 1 24 7-12Z" fill="#d9ffff" stroke="none"/>
        <path d="m2-9 1-11 9-6 1 12-6 8Z" fill="#a5ebf7"/>
        <path d="m-9 18 4-10 5 10 4-7 3 9" fill="#e8ffff" stroke-width="1.2"/>
      </g>`,
    fireCannon: `
      <g stroke="#633e33" stroke-width="2" stroke-linejoin="round">
        <path d="m-20 4 5-14 23-3 12 14v15l-6 6-26 1-8-6Z" fill="#925342"/>
        <path d="m-22 3 7-15 23-1L22 0l-7 7-28 2Z" fill="#cc8760"/>
        <path d="M-12 19v-5q0-10 12-11 12 1 12 11v5Z" fill="#392f31"/>
        <path d="M-9 18q-4-5 2-10l2 4 6-8q-1 7 4 8l2-3q6 9-1 10Z" fill="#ff7c2d" stroke="none"/>
        <path d="M-5 18q0-3 3-5l2 2 3-5q2 7 0 9Z" fill="#ffe87a" stroke="none"/>
        <path d="M-14 20h29m-22-9v7m12-8v8" fill="none" stroke="#65504a" stroke-width="2.6"/>
        <path d="m-22-3 1-14 10-1 1 17Z" fill="#795043"/><path d="m-24-15 1-5 13-1 1 5Z" fill="#c28960"/>
        <path d="M-21-18q-5-4-1-10l2 3q4-5 3-11 7 6 5 12l3-2q0 9-6 9Z" fill="#ff8136" stroke="#a34f31" stroke-width="1.2"/>
        <path d="M-19-18q-3-3 1-7l1 2 2-6q3 7-1 11Z" fill="#fff19a" stroke="none"/>
      </g>`,
    mapLaser: `
      <g stroke="#3b4857" stroke-width="2" stroke-linejoin="round">
        <path d="m-4 0 2-22 5-3 4 2-3 24Z" fill="#96a6aa"/>
        <path d="m-4 5-15 21-7-2 2-5L-9 1Zm8-4 19 20-1 5-6-1L0 7Z" fill="#aec2bd"/>
        <path d="m-22 19 6 3m33-3 5-3" stroke="#62757c"/>
        <path d="m-24 21 7 3-2 4-8-2Zm40 1 6-4 5 5-7 4Z" fill="#394854"/>
        <path d="M-11 3q0-7 11-8t12 6v7q-11 9-23 0Z" fill="#586e80"/>
        <ellipse cy="1" rx="12" ry="7.7" fill="#acbac0"/>
        <path d="M-8 11v-17l4-4h7l5 4v15l-5 4Z" fill="#566578"/>
      </g>`,
    impactCannon: `<g stroke="#304c4c" stroke-linejoin="round">
      <path d="m-25-2 7-11 17-6 18 5 9 11-1 12-10 10-14 5-17-4-10-10Z" fill="#4b6462"/>
      <ellipse cy="3" rx="24" ry="16" fill="#78948a" stroke-width="2"/>
      <path d="M-17 0q17 13 34 0v9q-16 13-34 0Z" fill="#355353"/>
      <path d="M-16 3q16 12 32 0m-32 4q16 12 32 0" fill="none" stroke="#8fbaaa" stroke-width="2"/>
      ${[-1,1].map(side=>`<g transform="scale(${side} 1)"><path d="m15 13 4-5 8-2 1 7-8 5Z" fill="#bd935d"/><path d="m19 13 5-3" stroke="#ffdda1" stroke-width="1.5"/></g>`).join('')}
      <path d="m-4 19 4 2 4-2" fill="none" stroke="#83dacc" stroke-width="2.2"/>
      </g>`,
    magCannon: '<g stroke="#484e6f"><ellipse cy="6" rx="20" ry="15" fill="#687893"/><path d="m-21-8 6-5 7 4-1 21-6 3-7-4Z" fill="#8e94ad"/><path d="m-20-3 9-3m-9 8 9-3m-9 8 9-3" stroke="#f5b382"/><path d="M-7 16q17 10 27-5" fill="none" stroke="#a9edf9" stroke-width="3"/><circle cx="19" cy="10" r="4" fill="#95e9fa"/></g>'
  };
  const fusionUpgrades = {
    tacticalAir: '<path d="m-19-11-1-10 5-1 2 10Z" fill="#687e7b"/><path d="M-27-21q-2-6 1-11l18 11q-10 7-19 0Z" fill="#e1e8ce"/><path d="m-25-29 17 10m-10-5 4-6" stroke="#536c72"/><circle cx="-14" cy="-30" r="2.1" fill="#f3bd61"/>',
    iceCannon: '<g stroke="#527fb6"><path d="m5 17 4-13 7-4 1 10-7 10Z" fill="#9cd9fa"/><path d="m12 18 7-11 7-1-3 11-9 5Z" fill="#c9faff"/></g>',
    fireCannon: '<path d="m11 1 1-16 9-2 1 17Z" fill="#9e674b"/><path d="m10-12 1-5 11-2 1 6Z" fill="#e2ad61"/><path d="M14-17q-3-4 0-8l3 3 3-8q4 7 0 13Z" fill="#ffb342" stroke="#ab5937"/>',
    mapLaser: '<path d="m-18 16-6-4 0-9 6-6 6 5-1 9Z" fill="#8772af"/><path d="m-23 4 5-5 4 4-5 7Z" fill="#cdbdff"/><path d="m10 12 9 6" fill="none" stroke="#dabd70" stroke-width="3.5"/>',
    magCannon: '<path d="m-23 2 5 3 4 10-6-3Zm44-6-5 2 3 11 5-6Z" fill="#ffcc6d"/><path d="m-3 12 4-4 4 4-4 4Z" fill="#e4bcff"/>'
  };
  const fusionHeadUpgrades = {
    tacticalAir: '<path d="M-13-4q1-10 11-10l3 4-8 5Z" fill="#d2b972"/><path d="M15-13h4v7h-4Zm0 15 4 1v7l-4-1Z" fill="#dbc37d"/>',
    tacticalGround: '<path d="M7-8 13-7 12 8 6 7Z" fill="#eac675"/><path d="M24-10h5l2 3v13l-4 4-4-1Z" fill="#b29b63"/><ellipse cx="28" rx="2.6" ry="6" fill="#253c40"/>',
    iceCannon: '<path d="m-1-10 5-5 12-3-6 9-8 3Z" fill="#b1efff" stroke="#4772aa"/><path d="m2 9 10 1 10-4-7 10-11-1Z" fill="#8fcdea" stroke="#4772aa"/><path d="m4-8 4-1 1 16-4 2Z" fill="#d3b585"/>',
    fireCannon: '<path d="m1-11 5 1q-3 9 0 19l-5 2q-3-11 0-22Z" fill="#f2be67"/><path d="M14-7q-3 8 0 15l4 1q-3-9 0-18Z" fill="#f2be67"/>',
    mapLaser: '<path d="m4-8 6-7 15-1 5 3-10 2-8 5Z" fill="#8ba4ab"/><path d="m5 9 7 5 16 1 2-3-11-2-6-5Z" fill="#82989f"/><path d="m13-12 10-1m-10 24 10 2" stroke="#a3ffff" fill="none"/>',
  };
  const tacticalMounts = { tacticalAir: { x: -10, y: -11, scale: .75 }, tacticalGround: { x: 6, y: 9, scale: .82 } };
  // Each dual-weapon tower has one chassis. The sockets also locate its shots and beams.
  const centeredMount = {x:0,y:0,scale:1};
  function mountFor(building, weapon) {
    return building?.kind === 'pea' && building.fusionKind ? tacticalMounts[weapon] ?? centeredMount : centeredMount;
  }
  const snowball = `<g stroke="#658da2" stroke-linejoin="round"><path d="M-12-4q1-6 8-8 8-3 13 3 7 4 4 12-1 7-9 9-7 2-13-4-6-4-3-12Z" fill="#d9f1f4" stroke-width="1.8"/>
    <path d="M-8 5q7 6 16-1-1 7-10 7Z" fill="#9bc9d8" stroke="none"/><path d="m-7-4 4-4 6-1" stroke="#fff" fill="none" stroke-width="3"/><path d="m5 0 2 1m-10 2 2 1" stroke="#a4ccd8" stroke-width="1.7"/></g>`;
  const fallingRock = `<g stroke="#663b3d" stroke-linejoin="round"><path d="m-13 2 4-12 11-4 10 6 3 11-8 9-13-1Z" fill="#80534c" stroke-width="2"/>
    <path d="m-11 1 5-9 8-3-4 7Z" fill="#bf8365" stroke="none"/><path d="m-9 7 6-7 5 2 6-8m-6 8 3 8" fill="none" stroke="#ffae4c" stroke-width="2.4"/></g>`;
  const cometStar = '<path d="m0-10 3.2 6.3 6.8 1.2-5.1 5 .9 7.1L0 6.3l-6 3.3 1-7.2-5-4.9 6.9-1.2Z" fill="#ffe698" stroke="#80528f" stroke-width="1.6"/><path d="m0-6.5 1.4 5L6-1 1.4 1.4 0 5-1.2 1.2-5-1l4-1Z" fill="#fff9dc"/>';
  const cannonBodies = {
    snowCannon: `<g stroke="#3b627a" stroke-width="2.2"><path d="m-23-10 8-10h25l15 11v20l-9 10h-33l-8-9Z" fill="#668ca2"/>
      <path d="m-23 10 5 10h33l7-7m-44 1-4 4 1 6h18m18-7 6 1-2 7H8" fill="none" stroke="#44708b" stroke-width="3.5"/><path d="m-21-10 7-9H8l13 8-3 6-8-3-8 4-8-4-12 1Z" fill="#e6fcfa"/>
      <circle r="10" fill="#91b6c9"/></g>`,
    meteorTower: `<g stroke="#543b43" stroke-width="2.2"><path d="m-23 10 5-14 18-10L19-5l7 17-10 10-28 1Z" fill="#765351"/>
      <path d="m-23 10 10 5 13 2 17-5 9 0-10 10-28 1Z" fill="#553c43"/><path d="m-12 13 5 3 3-5 6 7 8-4" fill="none" stroke="#fa9746"/>
      <path d="m-20 4-6-23 6-5 8 24Zm31-3 9-23 6 3-5 24Z" fill="#995c4b"/>
      <path d="m-22-19 3 9m39-8-3 8" stroke="#ffbc60"/><ellipse cy="1" rx="13" ry="6" fill="#e48746"/><ellipse cy="1" rx="8" ry="3" fill="#ffdd80" stroke="none"/></g>`,
    cometCannon: `<g stroke="#4f4568" stroke-width="2"><path d="m-20 16 8-18 16-7 12 12 9 14-11 4-9-13-14 14Z" fill="#84769e"/>
      <ellipse cy="8" rx="21" ry="12" fill="#67577f"/><ellipse cy="4" rx="20" ry="10" fill="#a891aa"/>
      <path d="M-21 1q0-20 20-20t23 17" fill="none" stroke="#d4ad67" stroke-width="3"/>
      <path d="m-21-8 3 1m4-9 2 3m10-6v4m12-1-2 3" stroke="#fbdf96"/></g>`,
    sonicCannon: `<g stroke="#484855" stroke-width="2"><path d="m-23-10 9-7 23-3 14 9v23l-9 9-28 1-10-9Z" fill="#636879"/>
      <path d="m-22 9 9 9 29-2 7-7v7l-8 7-29 1-9-8Z" fill="#484e5d"/><path d="m-14 12 4 3m3-4 4 4m3-4 4 3" stroke="#eda859" stroke-width="2.8"/>
      <circle cy="-1" r="11" fill="#a89175"/></g>`,
    crossCoil: `<g stroke="#47405d" stroke-width="2"><path d="m-15-15 15-7 16 8 5 16-7 14-16 7-17-9-3-15Z" fill="#686081"/>
      ${[0,90,180,270].map(a=>`<g transform="rotate(${a})"><path d="M8-5h13l5 5-4 5H8Z" fill="#bf9965"/><path d="M14-5v10m4-10V5" stroke="#78547d"/><circle cx="26" r="4" fill="#ccfaff"/></g>`).join('')}
      <path d="m-11 0 5-12 12 0 6 12-6 10H-5Z" fill="#9476ca"/><path d="m-6-2 8-7-3 7h5l-9 10 3-8Z" fill="#eeffff" stroke="none"/></g>`
  };
  const cannonHeads = {
    snowCannon: `<g stroke="#385870" stroke-width="2"><path d="m-20-8 10-5 25 2 9 5v12l-9 6-25 1-11-6Z" fill="#86bbd0"/>
      <path d="M-13-7 14-7 22 0 14 7h-27Z" fill="#527b95"/>${ref('snowball','transform="translate(-3 -2) scale(.76)"')}
      <path d="M-10 6 20 4l6-4-2 8-9 6-23-2Z" fill="#a3d9e3"/><path d="m-6 8 21 1" stroke="#f3ffff"/></g>`,
    cometCannon: `<g stroke="#514568" stroke-width="2"><path d="M-23-7-15-9 12-8l12-5 5 6v14l-6 5-10-5-27 2-8-5Z" fill="#8066a4"/>
      <path d="M-13-8h4v17h-4Zm24-1 5-1v20l-5-2Z" fill="#e4bc78"/>
      <ellipse cx="24" rx="5" ry="10" fill="#373c63"/><ellipse cx="24" rx="2.6" ry="6" fill="#9ed9ec"/>
      ${ref('cometStar','transform="translate(-2 1) scale(.72)"')}</g>`,
    sonicCannon: `<g stroke="#4e4957" stroke-width="2"><path d="m-21-8 10-6 12 5 19-9 7 4v28l-7 5L1 9l-13 4-9-5Z" fill="#ab825f"/>
      <path d="M-17-6h9m-9 5h9m-9 5h9" stroke="#ead6a2"/><ellipse cx="19" rx="9" ry="18" fill="#e6b465"/>
      <ellipse cx="20" rx="6.6" ry="14" fill="#58505c"/><ellipse cx="21" rx="4.1" ry="9.5" fill="#a78587"/><ellipse cx="22" rx="2.4" ry="5.4" fill="#ffda90"/></g>`
  };
  function cannonFusion(weapon, angle, flash) {
    const kick = recoilKick(flash);
    let head;
    if (weapon === 'meteorTower') head = ref('fallingRock', `transform="translate(0 ${-16-5*kick}) rotate(${-12+14*kick}) scale(.8)"`);
    else if (weapon === 'crossCoil') head = flash > 0 ? `<circle r="${9+7*(1-flash)}" fill="none" stroke="#ddffff" stroke-width="2" opacity="${flash}"/>` : '';
    else {
      const facing = weapon === 'snowCannon' ? Math.round(angle/90)*90 : angle;
      head = ref('cannon-head-'+weapon, `transform="translate(0 -3) rotate(${facing}) translate(${-4*kick} 0)"`);
    }
    return `<g class="fusion-tower" data-weapon="${weapon}">${ref('cannon-body-'+weapon)}${head}</g>`;
  }
  const frostBodies = {
    frostfireJet: `<g stroke="#45535b" stroke-width="2.1"><path d="m-22-8 12-10 24 3 9 10-2 21-13 7-25-4-7-8Z" fill="#667c80"/>
      <path d="m-23 8 11 9 23 1 12-9-1 9-12 6-24-3-9-8Z" fill="#506365"/>
      <rect x="-22" y="-12" width="13" height="29" rx="6" fill="#7dd4e6"/><rect x="8" y="-11" width="13" height="29" rx="6" fill="#d88852"/>
      <path d="M-21 8h11m19 1h11" stroke="#e7d7a6" stroke-width="3"/><circle r="9" fill="#a2b5a7"/></g>`,
    cryoBeam: `<g stroke="#3b597a" stroke-width="2.1"><path d="m-21-6 3-10 17-6 18 6 7 16-7 16-19 8-20-10Z" fill="#557995"/>
      <path d="m-20-4 6-11 13-5 16 6 4 10L7 8l-19 2Z" fill="#a9dbe4"/>
      <path d="m-18 10-7-12 2-8 11 7Zm25 6 8-13 8-1-2 12-12 7Z" fill="url(#gg-ice-facet)"/>
      <circle r="9" fill="#657ea1"/></g>`,
    weatherStation: `<g stroke="#435766" stroke-width="2.2"><path d="m-22 15 8-8h23l12 8-4 6-30 1-10-4Z" fill="#758e97"/>
      <path d="m-14 15 12-23h5l12 23-5 1L1-1l-9 18Z" fill="#cab489"/>
      <path d="M-3 13V-18h5v31Z" fill="#d6e9df"/><path d="M2-10h12l-5 4-7-1Z" fill="#e9aa5c"/>
      <rect x="-11" y="4" width="15" height="10" rx="2" fill="#345667"/><path d="m-8 10 3-2 2 3 3-5" fill="none" stroke="#92ede2" stroke-width="1.5"/></g>`,
    cryoPlasma: `<g stroke="#485076" stroke-width="2"><path d="m-23 8 9-12 24-3 14 13-4 14-18 5-21-5Z" fill="#63749d"/>
      <ellipse cy="8" rx="20" ry="8" fill="#89a8c6"/><path d="M-14 12v5m7-4v5m13-5v4m7-7v4" stroke="#dfbd7e" stroke-width="2.6"/>
      <path d="m-12 6-10-19 3-8 4 3 7 17Zm23 0 11-19-3-8-5 4-7 17Z" fill="url(#gg-ice-facet)"/>
      <path d="m-5 5 3-29h4L7 5Z" fill="#7586b1"/>
      ${[[-2,12],[-10,9],[-17,6]].map(([y,rx])=>`<ellipse cy="${y}" rx="${rx}" ry="3.7" fill="none" stroke="#535880" stroke-width="4"/><path d="M${-rx} ${y}q${rx} 6 ${2*rx} 0" fill="none" stroke="#d1daed" stroke-width="2.1"/>`).join('')}
      <path d="m-5-26 5-8 6 6-3 6-5 2Z" fill="#b4f8ff"/><path d="m0-30 1 7 3-4Z" fill="#fff" stroke="none"/></g>`
  };
  const frostHeads = {
    frostfireJet: `<g stroke="#43505a" stroke-width="1.9"><path d="m-17-10 9-5 13 4 8 9-8 13-14 2-10-7Z" fill="#728692"/>
      <path d="M-7-11h23l9 3v6H-7Z" fill="#75c9db"/><path d="M-7 2h24l9 3v6H-7Z" fill="#d28b58"/>
      <path d="M15-12h8l3 3v8l-9 1Zm1 12 8 1 3 3v8l-10 1Z" fill="#c2baa5"/>
      <ellipse cx="24" cy="-5.5" rx="2.6" ry="4" fill="#c6fcff"/><ellipse cx="25" cy="7" rx="2.6" ry="4" fill="#ffb253"/>
      <path d="M-2-8h12m-12 13h12" stroke="#fff3d3" stroke-width="1.6"/></g>`,
    cryoBeam: `<g stroke="#345779" stroke-width="1.9"><path d="m-19-6 7-8 14 2 6 7v12l-9 6-12-2-7-7Z" fill="#5b80a7"/>
      <path d="m-6-6 24-3 10 7-10 9-24-1Z" fill="#90dbea"/><path d="m-4-4 20-3 8 4-22 2Z" fill="#e8ffff" stroke="none"/>
      <path d="m1-10 6-4 13 1 4 3-16 2Zm0 19 7 2 16-3-4 6-14 2Z" fill="#7194bd"/>
      <path d="m18-7 8-3 5 9-5 9-8-2 5-7Z" fill="#b7fbff"/><path d="m26-5 2 5-2 4" stroke="#fff" fill="none"/></g>`
  };
  const windCups = `<g stroke="#435c71" stroke-width="1.8">${[0,120,240].map(a=>`<g transform="rotate(${a})"><path d="M0 0 13-2" stroke="#5c7584" stroke-width="3"/><path d="M10-5q4-7 12-3l-1 8q-7 4-11-5Z" fill="#88cada"/><path d="m15-6 5-1" stroke="#dcf7fa"/></g>`).join('')}<circle r="4" fill="#efc783"/></g>`;
  function frostFusion(weapon, angle, flash, charge) {
    let active;
    if (weapon === 'weatherStation') active = ref('windCups',`transform="translate(0 -16) scale(1 .64) rotate(${angle})"`);
    else if (weapon === 'cryoPlasma') active = charge || flash ? `<g transform="translate(0 -29)" opacity="${Math.max(charge,flash)}"><circle r="${4+4*charge}" fill="#c9fbff" stroke="#88c5f9"/><path d="m-16 12 5-6 3 2 6-6m16 10-5-5-3 2-5-5" stroke="#c8ffff" fill="none"/></g>` : '';
    else {
      const recoil = weapon === 'cryoBeam' ? recoilOffset('pierce',flash) : 3*recoilKick(flash);
      active = ref('frost-head-'+weapon,`transform="translate(0 -3) rotate(${angle}) translate(${-recoil} 0)"`);
    }
    return `<g class="fusion-tower" data-weapon="${weapon}">${ref('frost-body-'+weapon)}${active}</g>`;
  }
  const flameParts = {
    heatRayBase: `<g stroke="#563e3b" stroke-width="2.3"><path d="m-21-6 9-10 16-2 15 9 4 15-8 14-21 4-15-10Z" fill="#6c5960"/>
      <path d="m-19-4 8-9 16-1 12 8 3 10-8 10-18 3-12-8Z" fill="#b48566"/><ellipse cy="1" rx="14" ry="11" fill="#724b44"/>
      <path d="m-14 9 7 4m10 1 8-3" stroke="#ffc570" stroke-width="3"/></g>`,
    heatRayHead: `<g stroke="#603a3b" stroke-width="2" stroke-linejoin="round">
      <path d="m-17-10 15-4 13 8v13l-13 6-15-6-3-8Z" fill="#9d5145"/>
      <path d="m-16-7 12-4 10 5-11 4-11-2Z" fill="#d88e58"/><path d="M-11 1 2-4h20v10H1l-10 4Z" fill="#c99357"/>
      ${[-4,2,8].map(x=>`<path d="M${x}-10l4 2v16l-4 2Z" fill="#765353"/><path d="m${x+1}-8 1 1v10" stroke="#ffc068" stroke-width="1.5"/>`).join('')}
      <path d="m12-6 9-3 7 3 2 6-3 7-8 1-7-4Z" fill="#af6b4f"/><ellipse cx="26" rx="4.2" ry="7.4" fill="#643c42"/><ellipse cx="27" rx="2.5" ry="5.1" fill="#ffb441" stroke="#f9d178"/><path d="M27-2v3" stroke="#fffbce"/></g>`,
    fireStationBase: `<g stroke="#60423e" stroke-width="2"><path d="m-21 11 6-12 11-5 15 3 9 12-4 7-20 5-15-4Z" fill="#80594d"/>
      <path d="M-14 12-8 0l10-3 10 7 3 11-15 4Z" fill="#b07950"/><path d="M-7 13V7Q-1-3 6 6v7Z" fill="#593d40"/>
      <path d="M-5 12q-2-4 2-6l2 2 2-5q6 5 3 9Z" fill="#ffb545" stroke="#f7833d" stroke-width="1.3"/>
      <path d="M-4-2v-17h6v17Z" fill="#9d7260"/><path d="M-1-20v18" stroke="#e2b879"/><path d="M2-13h13l-5 4-8-1Z" fill="#e47949"/></g>`,
    fireVanes: `<g stroke="#73483e" stroke-width="1.8">${[0,120,240].map(a=>`<g transform="rotate(${a})"><path d="M0 0 14-3" stroke-width="3.6"/><path d="M9-5q1-6 10-7l-2 4 7-2q-1 9-10 12l-5-2Z" fill="#d57748"/><path d="m13-2 5-4-1 4" fill="none" stroke="#ffd172"/></g>`).join('')}<circle r="4.2" fill="#ffe091"/></g>`,
    mortarBase: `<g stroke="#594247" stroke-width="2.4" stroke-linejoin="round"><path d="m-24 9 10-9 26-2 13 9-5 15-13 3-23-2Z" fill="#595564"/>
      <path d="m-23 9 14 7 26-2 7-7-15-7-21 2Z" fill="#947064"/><path d="m-11 17 15 2 9-3" fill="none" stroke="#e98645" stroke-width="2.8"/>
      <path d="m-17 12 11-23 7-3 15 25-6 2L-2-3l-9 19Z" fill="#b38458"/>
      <circle cx="16" cy="13" r="6" fill="#604950"/><circle cx="16" cy="13" r="2.3" fill="#e8a967"/></g>`,
    mortarArm: `<g stroke="#604039" stroke-width="2" stroke-linejoin="round"><path d="m-26-5 8-1L8-2l10-5 2 5-10 7-30-6Z" fill="#c39863"/>
      <path d="m-32-7 4 6 8 2 6-4-1-5-4 3-9-1Z" fill="#81594f"/><circle r="4.8" fill="#9a6f55"/><circle r="2" fill="#ffcd81"/></g>`,
    magmaStone: `<g stroke="#593b40" stroke-linejoin="round" stroke-width="2"><path d="m-13-3 5-9 11-3 10 6 3 11-8 10-13-1-8-7Z" fill="#794944"/>
      <path d="m-12-3 8 1 4-6 4 6 9-1-6 6 1 7-7-5-6 4 1-7Z" fill="#ff9b35" stroke="#bf5733" stroke-width="1"/>
      <path d="m-5 0 5-4 2 4 5 1-6 2-3-1-2 3Z" fill="#ffde68" stroke="none"/><path d="m-7-8 7-3 3 1" stroke="#d19a70" fill="none"/></g>`
  };
  function flameFusion(weapon,angle,flash) {
    let art;
    if (weapon === 'heatRay') {
      art = ref('heatRayBase') + ref('heatRayHead',`transform="translate(0 ${headY}) rotate(${angle}) translate(${-recoilOffset('pierce',flash)} 0)"`);
    } else if (weapon === 'fireStation') {
      art = ref('fireStationBase') + ref('fireVanes',`transform="translate(-1 -18) scale(1 .7) rotate(${angle})"`);
    } else {
      const facing = Math.cos(angle*Math.PI/180)<0 ? -1 : 1;
      const cycle = 1-flash, loaded = cycle<slingRelease ? 1 : ease((cycle-.72)/.2);
      art = `<g transform="scale(${facing} 1)">${ref('mortarBase')}<g transform="translate(1 2) rotate(${slingAngle(cycle)})">
        ${ref('mortarArm')}${ref('magmaStone',`transform="translate(-23 -10) scale(${.56*loaded})"`)}</g></g>`;
    }
    return `<g class="fusion-tower" data-weapon="${weapon}">${art}</g>`;
  }
  function moltenFlight(cx,cy,tx,ty,t) {
    if (t<slingRelease) return '';
    const p=(t-slingRelease)/(1-slingRelease), sy=cy-24;
    const height=Math.min(102,32+Math.hypot(tx-cx,ty-cy)*.24);
    const x=cx+(tx-cx)*p, y=sy+(ty-sy)*p-4*height*p*(1-p);
    const heading=Math.atan2(ty-sy-4*height*(1-2*p),tx-cx)*180/Math.PI;
    return `<g class="molten-flight" transform="translate(${x} ${y})">
      <g transform="rotate(${heading})"><path d="M5-5Q-6-10-22-5l7 4-13 1q11 5 27 6Z" fill="#f49a49"/><path d="m0-4-17 2 7 2-6 2 16 2Z" fill="#ffe398"/></g>
      ${ref('magmaStone',`transform="rotate(${175*p}) scale(${.56+.20*Math.sin(Math.PI*p)})"`)}</g>`;
  }
  const beamParts = {
    recoilBase: `<g stroke="#405957" stroke-width="2.1"><path d="m-22-9 12-7 22 1 10 9-2 19-14 9-20-4-9-12Z" fill="#607a74"/><path d="m-21-8 12-7 20 2 10 8-5 12-22 6-15-9Z" fill="#a6b49a"/><ellipse rx="12" ry="10" fill="#546d68"/><path d="m-14 12 7 3m14-3 7-3" stroke="#eac583"/></g>`,
    recoilHead: `<g stroke="#395655" stroke-width="2"><path d="m-19-8 7-6 13 3 7 8-4 12-17 2-8-6Z" fill="#668d7e"/><path d="M-9-9H16v5H-9Zm0 14h25v5H-9Z" fill="#bbab7e"/>
      <path d="m-7-4 27-1v10L-7 5Z" fill="#719386"/><path d="m-5-5 4 9 3-9 4 9 3-9 3 9" stroke="#e2c389" fill="none"/>
      <path d="m15-9 7-3 7 4 2 7-3 9-10 2-6-6Z" fill="#639d8e"/><ellipse cx="27" rx="3.6" ry="7" fill="#d1ffd3"/><path d="m-16-6 5-4 7 2" stroke="#c1d0a6" fill="none"/></g>`,
    disintegratorBase: `<g stroke="#41496b" stroke-width="2"><path d="m-21-7 8-12 20-2 14 12 3 14-12 15-17 4-15-11Z" fill="#5a6a87"/><path d="m-19-8 8-9 17-2 13 11 1 12-12 11-16 2-11-9Z" fill="#8b9cb6"/><circle r="12" fill="#475579"/><path d="m-13 11 5 3m16-1 6-4" stroke="#9befe1" stroke-width="3.3"/></g>`,
    disintegratorHead: `<g stroke="#424b72" stroke-width="2"><path d="m-18-8 13-6 12 7v15l-12 6-13-7Z" fill="#707aa8"/><path d="m-6-8 10-5 17-1 7 5-18 2-7 5Z" fill="#9aabca"/><path d="m-6 8 10 5 17 1 7-5-18-2-7-5Z" fill="#8793b5"/><path d="m-5 0 8-6 16 2 6 4-8 4-14 2Z" fill="#7aeedc"/><path d="m1 0 7-3 12 2-8 3Z" fill="#e1ffff" stroke="none"/><path d="m9-9 11-2m-11 20 11 2" stroke="#d7d7f0"/></g>`,
    gravityBase: `<g stroke="#4c4568" stroke-width="2.2"><path d="m-23 8 8-11 20-3 16 11-2 12-17 6-22-5Z" fill="#696181"/><ellipse cy="8" rx="19" ry="8" fill="#9887aa"/><path d="m-14 11 6 2m10 2 8-2" stroke="#dfb77c"/>
      <path d="M-7 6-12-3l-8-10 1-10 5 2 5 10L-1-4l8-7 6-14 4-1 2 8-7 15-7 8Z" fill="#82769f"/><path d="m-15-18 4 9 7 6m15-4 6-14" fill="none" stroke="#c7bdfa"/>
      <ellipse cy="-25" rx="10.4" ry="8.6" fill="#37334f"/><ellipse cy="-25" rx="15" ry="4" transform="rotate(-18 0 -25)" fill="none" stroke="#c0a4e5" stroke-width="2.4"/><path d="m-6-29 4-3 6 1" stroke="#e6d9fc" fill="none"/></g>`
  };
  function beamFusion(weapon,angle,flash,charge) {
    let art;
    if (weapon==='gravityCannon') {
      art=ref('gravityBase');
      if (charge || flash) art+=`<g transform="translate(0 -26) scale(${.7+.42*charge}) rotate(${charge*160})" fill="none" opacity="${Math.max(charge,flash)}"><circle r="12" stroke="#cebdff" stroke-dasharray="15 7" stroke-width="2.2"/><circle r="6.5" fill="#343053"/></g>`;
    } else {
      const recoil=weapon==='recoilRay', offset=recoil ? recoilOffset('pierce',flash) : 0;
      art=ref(recoil?'recoilBase':'disintegratorBase')+ref(recoil?'recoilHead':'disintegratorHead',`transform="translate(0 -3) rotate(${angle}) translate(${-offset} 0)"`);
    }
    return `<g class="fusion-tower" data-weapon="${weapon}">${art}</g>`;
  }
  function fusionResult(building, angle = -25, flash = 0, charge = 0, angle2 = building.kind === 'pea' && building.fusionKind === 'cannon' ? 12 : -25, flash2 = 0, charge2 = 0) {
    const { kind, upgraded } = building;
    if (kind === 'pea') return fusionTower(window.Garden.primaryWeapon(building), angle, flash, charge, upgraded, angle2, flash2);
    if (kind === 'cannon') return cannonFusion(window.Garden.primaryWeapon(building), angle, flash);
    if (kind === 'frost') return frostFusion(window.Garden.primaryWeapon(building), angle, flash, charge);
    if (kind === 'flame') return flameFusion(window.Garden.primaryWeapon(building),angle,flash);
    return beamFusion(window.Garden.primaryWeapon(building),angle,flash,charge);
  }
  function fusionTower(weapon, angle = -25, flash = 0, charge = 0, upgraded = false, angle2 = 15, flash2 = 0) {
    const base = `<g stroke="#3e514e" stroke-width="2" stroke-linejoin="round">
      ${fusionPlatforms[weapon]}
      ${upgraded ? fusionUpgrades[weapon] : ''}
      </g>`;
    if (weapon === 'impactCannon') {
      const y = -5 - 3 * charge + 5 * flash;
      const glow = Math.max(charge * .82, flash);
      return `<g class="fusion-tower impact-resonator" data-weapon="impactCannon">${base}
        <g transform="translate(0 ${y})">${ref('fusion-impactCannon')}
          <g transform="scale(1 .76)" fill="none" opacity="${glow}"><circle r="13.8" stroke="#c5ffdf" stroke-width="2.6"/>
            <circle r="7" fill="#b1ffe0" stroke="#f0ffe9" stroke-width="1.6"/></g></g></g>`;
    }
    function head(id, direction, kick) {
      const recoil = id === 'mapLaser' ? recoilOffset('pierce', kick) : recoilKick(kick) * (id === 'tacticalGround' ? 6 : 3);
      const mount = tacticalMounts[id] ?? {x:0, y:0, scale:1};
      const field = id === 'magCannon' && charge ? `<g transform="translate(24 0)" opacity="${.4 + .6 * charge}"><ellipse rx="${3 + charge * 4}" ry="${2 + charge * 3}" fill="#d5fbff"/><path d="m-18-6 4 3 4-2 5 5 5 0m-18 7 5-4 4 1 4-4" stroke="#9beaff" fill="none" stroke-width="1.6"/></g>` : '';
      const equipment = upgraded && fusionHeadUpgrades[id] ? ref('equipment-' + id) : '';
      return `<g transform="translate(${mount.x} ${mount.y}) scale(${mount.scale}) translate(0 ${headY}) rotate(${direction}) translate(${-recoil} 0)">${ref('fusion-' + id)}${equipment}${field}</g>`;
    }
    return `<g class="fusion-tower" data-weapon="${weapon}">${base}${head(weapon,angle,flash)}${weapon === 'tacticalAir' ? head('tacticalGround',angle2,flash2) : ''}</g>`;
  }
  function definitions() {
    const drawings = { plinth, wall, siegeCarriage, spikeHousing, wallBlade, face, wings, rhinoWing, rhinoCover, silkNet, shieldPlate: shield, splitPlate, stagElytron, stagHead, stagJaw, castle, royalCastle, castleBow, firePatch, snowflake, launchFlare };
    Object.assign(drawings, {badgeCrystal:icons.crystal,badgeHammer:icons.hammer,snowball, fallingRock, cometStar, windCups}, flameParts, beamParts);
    for (const [kind, shape] of Object.entries(frostBodies)) drawings['frost-body-' + kind] = shape;
    for (const [kind, shape] of Object.entries(frostHeads)) drawings['frost-head-' + kind] = shape;
    for (const [kind, shape] of Object.entries(cannonBodies)) drawings['cannon-body-' + kind] = shape;
    for (const [kind, shape] of Object.entries(cannonHeads)) drawings['cannon-head-' + kind] = shape;
    drawings['mounted-sling'] = catapult(false, true);
    for (const [id, art] of Object.entries(fusionHeadUpgrades)) drawings['equipment-' + id] = '<g stroke="#454956" stroke-width="1.4">' + art + '</g>';
    for (const [id, art] of Object.entries(fusionHeads)) drawings['fusion-' + id] = '<g stroke="#354650" stroke-width="1.65">' + art + '</g>';
    for (const [id, art] of Object.entries(fusionRounds)) drawings['round-' + id] = '<g stroke="#515b60" stroke-width="1.25">' + art + '</g>';
    for (const [kind, drawing] of Object.entries(mounts)) drawings['mount-' + kind] = drawing;
    for (const [kind, drawing] of Object.entries(feet)) drawings['feet-' + kind] = `<g fill="none" stroke-width="3.3">${drawing}</g>`;
    for (const [kind, drawing] of Object.entries(projectiles)) drawings['shot-' + kind] = drawing;
    for (const [kind, drawing] of Object.entries(advancedHeads)) drawings['advanced-' + kind] = drawing;
    for (const [kind, drawing] of Object.entries(upgradedShots)) drawings['advanced-shot-' + kind] = drawing;
    for (const [kind, drawing] of Object.entries(heads)) drawings['tower-' + kind] = drawing;
    for (const [kind, drawing] of Object.entries(shells)) drawings['bug-' + kind] = drawing;
    const whiteShield = '<filter id="art-white-shield" color-interpolation-filters="sRGB"><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/></filter>';
    const coldShell = '<filter id="art-cold-shell" color-interpolation-filters="sRGB"><feColorMatrix values=".065 .16 .025 0 .025  .15 .48 .07 0 .125  .18 .59 .08 0 .27  0 0 0 1 0"/></filter>';
    const energy = `<radialGradient id="art-ember-halo"><stop offset=".45" stop-color="#ffba42" stop-opacity=".56"/><stop offset="1" stop-color="#ff9e35" stop-opacity="0"/></radialGradient>
      <linearGradient id="art-basalt" x2=".7" y2="1"><stop stop-color="#bc886d"/><stop offset=".4" stop-color="#785347"/><stop offset="1" stop-color="#41363b"/></linearGradient>
      <linearGradient id="art-tongue"><stop stop-color="#ffcb62"/><stop offset=".44" stop-color="#ff9639"/><stop offset="1" stop-color="#e66537" stop-opacity=".78"/></linearGradient>
      <linearGradient id="art-scarab-shell" x1=".15" x2=".75" y1="0" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="#736742"/><stop offset=".18" stop-color="#bfaa58"/><stop offset=".40" stop-color="#80985c"/><stop offset=".65" stop-color="#4d7355"/><stop offset="1" stop-color="#a78943"/></linearGradient>
      <linearGradient id="art-scarab-collar" x1="0" x2=".6" y1="0" y2="1"><stop stop-color="#e2ba6a"/><stop offset=".33" stop-color="#648063"/><stop offset=".72" stop-color="#3c6355"/><stop offset="1" stop-color="#807848"/></linearGradient>
      <radialGradient id="art-warm-soil"><stop stop-color="#fd7449" stop-opacity=".84"/><stop offset=".53" stop-color="#e64936" stop-opacity=".79"/><stop offset=".83" stop-color="#cb3f33" stop-opacity=".43"/><stop offset="1" stop-color="#bc443c" stop-opacity="0"/></radialGradient>
      <radialGradient id="art-plasma-core" cx="43%" cy="39%"><stop offset="0" stop-color="#fffceb"/><stop offset=".32" stop-color="#d6ffff"/><stop offset=".62" stop-color="#9dcbff"/><stop offset="1" stop-color="#9852c5"/></radialGradient>
      <radialGradient id="art-chain-glow"><stop offset="0" stop-color="#efffff"/><stop offset=".47" stop-color="#a7cfff" stop-opacity=".85"/><stop offset="1" stop-color="#a56df2" stop-opacity="0"/></radialGradient>
      <radialGradient id="art-fireball-core"><stop offset="0" stop-color="#ffffc3"/><stop offset=".55" stop-color="#ffda58"/><stop offset="1" stop-color="#f86f21"/></radialGradient>`;
    return fusionMaterials + energy + coldShell + whiteShield + Object.entries(drawings).map(([id, content]) => `<g id="art-${id}" ${pen}>${content}</g>`).join('');
  }
  function icon(name, cls = '') {
    return `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.leaf}</svg>`;
  }
  function recoilKick(flash) {
    return Math.sin(Math.min(1, (1 - flash) / .24) * Math.PI / 2) * flash * flash;
  }
  function recoilRebound(flash) {
    return Math.sin((1 - flash) * Math.PI * 2) * flash;
  }
  function recoilOffset(kind, flash) {
    return (recoilKick(flash) + recoilRebound(flash) * .23) * recoilDistance[kind];
  }
  function tower(kind, angle = -25, flash = 0, charge = 0, upgraded = false, mounted = false) {
    if (kind === 'wall') return upgraded ? spikeWall(flash) : ref('wall');
    const head = mounted && kind === 'flame' ? 'mounted-sling' : (upgraded ? 'advanced-' : 'tower-') + kind;
    const kick = recoilKick(flash);
    if (kind === 'molecular') {
      const coil = (mounted ? '' : ref('mount-molecular')) + ref(head, `transform="translate(0 ${headY})"`);
      if (flash <= 0) return coil;
      const travel = 1 - flash;
      const forks = upgraded ? '<path d="m-23 7 7-6 1 4 8-6m30 8-7-6-1 4-8-6" fill="none" stroke="#cfaeff" stroke-width="2.7"/>' : '';
      return coil + `<g class="coil-discharge fx-accent" transform="translate(0 -29)" opacity="${flash}">
        <ellipse rx="${7 + travel * (upgraded ? 24 : 15)}" ry="${4 + travel * 9}" fill="none" stroke="${upgraded ? '#e3b4ff' : '#aeebff'}" stroke-width="${1 + 2 * flash}"/>
        <circle r="${2 + 5 * flash}" fill="#f5fcff"/>${forks}</g>`;
    }
    if (kind === 'frost') {
      return (mounted ? '' : ref('plinth')) + ref(head, `transform="translate(0 ${-3 - kick * 4}) scale(${1 + kick * .06})"`) +
        (flash > 0 ? `<g class="fx-accent" transform="translate(0 -5)" opacity="${flash}">${ref('snowflake', 'color="#f3ffff" transform="scale(.8)"')}</g>` : '');
    }
    if (kind === 'flame') {
      const facing = Math.cos(angle * Math.PI / 180) < 0 ? -1 : 1;
      const cycle = 1 - flash;
      const stone = cycle < slingRelease ? 1 : ease((cycle - .71) / .19);
      const swing = slingAngle(cycle);
      return ref(head, `transform="translate(0 ${headY}) scale(${facing} 1)" style="--sling-swing:${swing}deg;--upright-fire:${-swing}deg;--loaded-stone:${stone}"`);
    }
    let style = '';
    if (kind === 'push') style = `style="--punch-travel:${kick * 13 + recoilRebound(flash) * 2}px;--spring-stretch:${1 + kick * .7 + recoilRebound(flash) * .12}"`;
    const recoil = recoilOffset(kind, flash);
    const mount = (upgraded && upgradedMounts[kind]) || (mounts[kind] ? 'mount-' + kind : 'plinth');
    return (mounted ? '' : ref(mount)) +
      ref(head, `transform="translate(0 ${headY}) rotate(${angle}) translate(${-recoil} 0)" ${style}`);
  }
  function bugPose(kind, time) {
    return {
      legs: `skewX(${5 * Math.sin(time * (kind === 'swift' ? 19 : 12))})`,
      wings: kind === 'flyer' ? `scale(1 ${0.79 + Math.sin(time * 28) * 0.2})` : '',
      jaw: kind === 'stagBoss' ? `rotate(${3.5 * Math.sin(time * 4)} -20 -8)` : ''
    };
  }
  function bug(kind = 'bug', hp = null, time = 0, flash = 0, shieldFlash = 0, slow = false, labelId = '', maxHp) {
    const { head, shadow } = enemyShapes[kind];
    const size = window.Garden.enemyArtScale(kind, maxHp);
    const down = kind === 'shield_down', armored = down || kind === 'shield';
    const pose = bugPose(kind, time);
    const leg = 'feet-' + (down ? 'shield' : kind);
    let health = '';
    if (hp !== null) {
      const label = `<text class="bug-hp" x="0" y="0" fill="${flash > 0 ? '#ffe58e' : '#fffdf0'}">${hp}</text>`;
      health = labelId ? `<defs><g id="${labelId}">${label}</g></defs>` : `<g transform="translate(2 ${down ? -3 : 21})">${label}</g>`;
    }
    const body = ref('bug-' + (down ? 'shield' : kind), kind === 'mother' ? 'class="brood-eggs"' : kind === 'splitter' ? 'class="split-lobes"' : '');
    const shell = kind === 'giant' ? `<g class="scarab-shell">${body}${flash > 0 ? '<path class="armor-glint fx-accent" d="M-19-11q7-8 14-6m7 0q14-4 23 6" fill="none" stroke="#fff1af" stroke-width="3.2" stroke-linecap="round"/>' : ''}</g>` : body;
    let faceLayer;
    if (kind === 'stagBoss') {
      const jaw = ref('stagJaw', `transform="${pose.jaw}"`);
      faceLayer = jaw + `<g transform="scale(1 -1)">${jaw}</g>` + ref('stagHead');
    } else if (kind === 'giant' || kind === 'rhinoBoss' || kind === 'spiderBoss') {
      faceLayer = '';
    } else {
      faceLayer = ref('face', `transform="translate(${head} 0)"`);
    }
    const cold = slow ? 'filter="url(#art-cold-shell)"' : '';
    const shieldLayer = armored ? `<g class="hard-shell ${down ? 'lower-shell' : 'upper-shell'}" transform="scale(1 ${down ? -1 : 1})">
      ${ref('shieldPlate', cold)}${shieldFlash > 0 ? ref('shieldPlate', `class="shield-flash" filter="url(#art-white-shield)" opacity="${Math.min(1, shieldFlash / .12)}"`) : ''}</g>` : '';
    return `<g class="bug-art" transform="scale(${size})"><ellipse cy="${kind === 'flyer' ? 25 : 13}" rx="${shadow}" ry="5" fill="#234b38" opacity=".19"/>
      <g stroke="#3f513e" style="${down ? '--shell-body:#84c1a7;--plate:#477969' : ''}"><g class="bug-facing${slow ? ' chilled-shell' : ''}" ${cold}>
      ${kind === 'flyer' ? `<g class="bug-wings" transform="${pose.wings}">${ref('wings')}${ref('wings', 'transform="scale(1 -1)"')}</g>` : ''}
      ${kind === 'rhinoBoss' ? rhinoWings : ''}
      <g class="bug-legs${kind === 'hopper' ? ' spring-legs' : ''}" transform="${pose.legs}">
        ${ref(leg)}${ref(leg, 'transform="scale(1 -1)"')}</g>
      ${shell}${kind === 'rhinoBoss' ? rhinoCovers : ''}${armored ? '' : faceLayer}
      </g>${shieldLayer}${armored ? `<g class="bug-facing" ${cold}>${faceLayer}</g>` : ''}</g>
      ${flash > 0 ? `<path class="hit-flash" d="m-15-16-2-4m10 2 1-4m5 7 3-3" fill="none" stroke="#fff2ae" stroke-width="3" stroke-linecap="round" opacity="${Math.min(1,flash * 8)}"/>` : ''}
      ${slow ? ref('snowflake', 'color="#e1fbff" transform="translate(12 -12) scale(.53)"') : ''}
      </g>${health}`;
  }
  function badge(kind, hp = null) { return `<svg class="bug-icon" viewBox="-45 -39 90 78" aria-hidden="true">${bug(kind, hp)}</svg>`; }
  function tool(kind) {
    const bounds = kind === 'flame' ? '-39 -45 78 76' : '-37 -38 74 70';
    return `<svg class="tool-art" viewBox="${bounds}" aria-hidden="true">${tower(kind)}</svg>`;
  }
  function castleBowPosition(barrelOffset = 0) {
    return { x: Math.sign(barrelOffset) * 24, y: barrelOffset ? -6 : -13 };
  }
  function castleArt(upgraded) {
    const bow = ref('castleBow', 'style="transform:rotate(var(--castle-aim,0deg))"');
    if (!upgraded) return ref('castle') + `<g id="castle-bow" transform="translate(0 ${castleBowPosition().y})">${bow}</g>`;
    const stations = [-1, 1].map(side => {
      const {x, y} = castleBowPosition(side);
      return `<g transform="translate(${x} ${y})">${bow}</g>`;
    });
    return ref('royalCastle') + `<g id="castle-bow">${stations.join('')}</g>`;
  }
  window.GardenArt = { definitions, icon, tower, fusionTower, fusionResult, mountFor, tacticalMounts, bug, bugPose, badge, tool, shot, flight, moltenFlight, plasmaArc, laser, aura, spiderWebFlight, brokenHeart, chargeGlobe, stoneImpact, impactBurst, splitPlateAt, castle: castleArt, castleBowPosition };
})();
