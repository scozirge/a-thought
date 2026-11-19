(function () {
  'use strict';

  // Static drawings are defined once. The board only moves the instances.
  const icons = {
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
    flame: `<g stroke="#6d3c31">
      <path d="M-20-13q3-6 10-5l12 4v26l-17 4q-8 0-8-8Z" fill="#d56b45"/>
      <path d="m-19-9 16-3m-17 18 17 1" stroke="#ffcb85" stroke-width="4"/>
      <path d="M-3-10H9l5 5v12L8 11H-3Z" fill="#6b7375"/><path d="M7-10h7V9H7Z" fill="#ebb969"/>
      <path d="M15 8C8-4 20-7 20-19q5 4 4 11 7-5 10-12 5 16-2 25-7 10-17 3Z" fill="#ff793a"/>
      <path d="M18 6c-2-6 5-8 6-13l1 6 5-5q2 10-6 14-4 1-6-2Z" fill="#ffe266" stroke="none"/></g>`,
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
    molecular: `<g stroke="#453955">
      <path d="M-24-9l9-9 13 3 8 9V6l-8 10-14 2-8-9Z" fill="#6a5982"/>
      <path d="m-22-9 8-6 9 2-8 5Z" fill="#aa9ec2" stroke="none"/>
      <path d="M-9-11 0-15l24 3 6 6-13 2-15-3-11 3Z" fill="#aea3ca"/>
      <path d="m1-12 19 2 4 3-22-2Z" fill="#f0ddf5" stroke="none"/>
      <path d="m-9 10 11-2 15-4 13 2-6 7-25 4-8-3Z" fill="#84729d"/>
      <path d="m2 11 18-5 4 1-5 4-17 3Z" fill="#dfc9ed" stroke="none"/>
      <path d="M-3-3h21l7 3-7 3H-3Z" fill="#4d3b67"/>
      <ellipse cx="-6" rx="12.5" ry="12" fill="#4d365f"/>
      <g stroke="#e4b3f6" stroke-width="3"><path d="M-15-8-3-1-10 9" fill="none"/></g>
      <circle cx="-15" cy="-8" r="3.8" fill="#9edee1" stroke="#634e7c" stroke-width="1.4"/>
      <circle cx="-10" cy="9" r="3.4" fill="#bfa8ef" stroke="#634e7c" stroke-width="1.3"/>
      <circle cx="-3.5" cy="-1.5" r="5.7" fill="#e3a4f0" stroke="#674f85" stroke-width="1.6"/>
      <circle cx="-4.6" cy="-3" r="2" fill="#fff6da" stroke="none"/>
      <g fill="#fff5ab" stroke="none" opacity="var(--core-light,0)">
        <circle cx="-3.5" cy="-1.5" r="4.6"/><path d="M5-1.5h14l6 1.5-6 1.5H5Z"/></g></g>`

  };
  const plinth = `<ellipse cy="23" rx="23" ry="5.5" fill="#214738" opacity=".18"/>
    <path d="m-18 8 6-6h24l7 6-2 12-8 5H-9l-9-5Z" fill="#a56a47" stroke="#5a4937"/>
    <path d="m-18 8 7-6h23l7 6-6 8h-25Z" fill="#edc991" stroke="#6f563c"/>
    <path d="m-10 18 1 4M10 18l-1 4" stroke="#d99b62" stroke-width="2.5"/>`;
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
  function splitPlateAt(index, x = 0, y = 0, scale = 1) {
    return `<use href="#art-splitPlate" transform="translate(${x} ${y}) rotate(${index * 120}) scale(${scale})"/>`;
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
    giant: `<use href="#art-stagElytron"/><use href="#art-stagElytron" transform="scale(1 -1)"/>
      <path d="M-12-12q5-7 13-4l2 6v20l-2 6q-8 3-13-4l-2-6V-6Z" fill="#4d4336" stroke="#352f2a"/>
      <path d="M-9-11q3-3 7-3" fill="none" stroke="#bea178" stroke-width="2.4"/>`,
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
    bug: '<path d="M-10-6 L-16-16 -23-17 M-2-8 L0-19 -4-22 M8-6 L16-16 22-16" stroke="#53563d"/>',
    shield: '<path d="M-14-8 L-28-15 -29-22 -35-23 M-2-11 L0-29 -5-35 -10-35 M11-8 L27-16 29-22 35-23" stroke="#505548"/>',
    hopper: `<path d="M-12-5 L-17-15 -23-16 M-3-6 L-4-18 -10-20" stroke="#51693a"/>
      <path d="M4-5 18-24 27-8 33-11" stroke="#466238" stroke-width="3.6"/>
      <path d="M1-5 15-24q3-3 5 0l-2 7L7-3Z" fill="#abcb58" stroke="#526d39" stroke-width="2"/>`,
    mother: '<path d="M-17-6 L-25-20 -32-22 M-6-9 L-7-24 -13-28 M6-8 L20-23 29-24" stroke="#715467"/>',
    flyer: '<path d="M-13-5 L-18-15 -23-16 M-5-6 L-6-18 -11-20 M5-5 L17-15 23-15" stroke="#755630"/>',
    splitter: '<path d="M-14-7 L-23-18 -29-19 M-2-9 L-2-22 -8-26 M12-8 L23-21 30-20" stroke="#6c4745"/>',
    giant: '<path d="M-12-8l-7-9-3-9-6-2 M0-11l1-11-7-7-1-3 M11-9l7-11 9-4 4-5" stroke="#46382f" stroke-width="3.8"/>',
    swift: '<path d="M-12-5 L-22-19 -31-21 M-3-6 L1-21 -6-29 M7-4 L22-15 30-23" stroke="#875830"/>'
  };
  const wings = `<path d="M-4-5q-12-25-1-27 12-2 17 26Zm2 2q8-22 18-18 8 6-9 18Z" fill="#e4faf2" stroke="#648f98"/>
    <path d="m-4-8-2-17m7 20 12-12" fill="none" stroke="#9cc9c8" stroke-width="1.4"/>`;
  const shield = `<path d="m-28-9 6-14 16-8 17 1 15 9 4 13-6 5h-47Z" fill="var(--plate,#5b8798)" stroke="#364e57"/>
    <path d="m-25-12 6-10 13-6-4 15Z" fill="#eff8ee" opacity=".32" stroke="none"/>
    <path d="m-28-9 7 4h43l7-4-2 7-6 3h-40l-6-3Z" fill="#e4d4a6" stroke="#4a5754"/>
    <g fill="#faf0c5" stroke="none"><circle cx="-20" cy="-10.5" r="2"/><circle cx="20" cy="-10.5" r="2"/></g>`;
  const enemyShapes = {
    bug: { head: -14, shadow: 16 }, shield: { head: -17, shadow: 23 }, shield_down: { head: -17, shadow: 23 },
    hopper: { head: -15, shadow: 23 }, mother: { head: -21, shadow: 26 }, flyer: { head: -15, shadow: 16 },
    splitter: { head: -16, shadow: 22 }, giant: { shadow: 30 }, swift: { head: -14, shadow: 20 }
  };
  const cabin = `<ellipse cy="30" rx="33" ry="8" fill="#204c39" opacity=".29"/>
    <g stroke="#554a37"><path d="M-23-7 0-27 24-8v36l-4 3h-42Z" fill="#ffdea0"/>
    <path d="M13-29v-13h9v22Z" fill="#ae6b50"/><path d="M11-42h13v5H11Z" fill="#f3b67e"/>
    <path d="m-32-7 26-28q6-6 12 0L33-8 28-2 0-23-27 0Z" fill="#ac523a"/>
    <path d="m-31-9 24-27q6-7 14 0L31-11l-3 5L0-28-27-5Z" fill="#dd7d4d"/>
    <path d="m-20-21 8-8m21 6 9 8" stroke="#f9af70" stroke-width="3"/>
    <path d="M-6 30V12q0-9 8-9t8 9v18Z" fill="#50836a"/><path d="M-19 3h9v12h-9Z" fill="#91cdd0"/>
    <path d="M-20 17h12" stroke="#c5854b" stroke-width="3"/><circle cx="6" cy="17" r="1.4" fill="#fff1b9" stroke="none"/>
    <path d="M-10 30h23l3 4h-29Z" fill="#cbb18a"/></g>
    <path d="M-28 28q-11-10-7-16 8 2 10 10 1-10 6-12 4 9-2 18Zm49 4q-4-9 2-13 3 1 3 7 3-9 8-7 2 8-7 13Z" fill="#6b994f" stroke="#426744" stroke-width="1.6"/>
    <circle cx="-29" cy="18" r="3" fill="#ffc94b"/><circle cx="27" cy="21" r="2.7" fill="#f79971"/>`;
  const projectiles = {
    pea: `<circle r="3.8" fill="#a5cf43" stroke="#365131" stroke-width="1.7"/><circle cx="-1" cy="-1.2" r="1.1" fill="#f1ffb2"/>`,
    cannon: `<circle r="12" fill="#394e58" stroke="#24343a" stroke-width="2.3"/><path d="M-8-4q3-6 9-5" fill="none" stroke="#adcbcd" stroke-width="3"/>
      <path d="M4 8q3-1 4-4" fill="none" stroke="#607e85" stroke-width="2"/>`,
    flame: `<path d="M-11 7c-4-7-1-13 5-16l-1-4q6 0 10 4l3-3q8 6 7 14-1 10-12 11-9 0-12-6Z" fill="#f98833" stroke="#aa4529"/>
      <circle cx="1" cy="1" r="8.9" fill="url(#art-fireball-core)"/><path d="M-7 1q0-6 6-8m4 16q4-1 5-5" fill="none" stroke="#ffd257" stroke-width="2"/>`,
    push: `<path d="M-12-8Q-4 0-12 8M-5-11Q7 0-5 11M3-12Q17 0 3 12" fill="none" stroke="#39667b" stroke-width="4.6"/>
      <path d="M-5-9Q5 0-5 9M3-11Q14 0 3 11" fill="none" stroke="#d2faff" stroke-width="2.2"/>`,
    molecular: `<circle r="17.5" fill="#b570ee" fill-opacity=".24" stroke="#a271d8" stroke-width="1.4"/>
      <circle r="13.5" fill="url(#art-plasma-core)" stroke="#7449a5" stroke-width="1.8"/>
      <path d="m-14 0 4-6 1 3 5-7m18 8-5 8-1-4-5 7" fill="none" stroke="#ddfaff" stroke-width="2.1"/>
      <path d="m-6 2 5-8-1 5 7-3-6 10 1-6Z" fill="#fffbe7" stroke="none"/>`
  };
  const firePatch = `<path d="M-12 4c-4-9 4-11 3-20 5 2 7 6 6 10 5-5 8-10 7-17 6 5 7 13 5 17l5-5c2 9-1 17-7 20-7 3-15 1-19-5Z" fill="#ed6735" stroke="#a64c30" stroke-width="1.6"/>
    <path d="M-8 4c-2-5 2-8 3-12l3 5q8-8 7-13 5 7-1 15l6-4C9 8-3 13-8 4Z" fill="#ffad3d" stroke="none"/><path d="M-3 6q-2-4 2-8l2 4 4-3q2 6-3 8Z" fill="#fff1a1" stroke="none"/>`;
  const recoilDistance = { pea: 3.8, cannon: 8, flame: 4.5, pierce: 2, push: 0, molecular: 6 };
  const flightStyles = {
    pea: { muzzle: 26, light: '#edf4a4' }, cannon: { muzzle: 27, light: '#ffe4a1', arc: 23 },
    flame: { muzzle: 28, light: '#ffca55' }, push: { muzzle: 33, light: '#d9f9ff' },
    molecular: { muzzle: 27, light: '#eac6ff' }
  };
  const launchFlare = `<path d="m0 0 3-7 3 4 9-2-4 5 6 2-10 1-2 4Z" fill="currentColor"/><path d="m2 0 4-2 4 1-6 3Z" fill="#fff8da"/>`;
  const snowflake = `<g fill="none" stroke="currentColor" stroke-width="2.5">${[0,60,120].map(a => `<path transform="rotate(${a})" d="M0-10v20m-3-17 3 3 3-3m-6 14 3-3 3 3"/>`).join('')}</g>`;
  function shot(kind, x, y, angle, t = 0) {
    const swell = Math.sin(Math.PI * t);
    let pose = '';
    if (kind === 'cannon') pose = `rotate(${t * 95})`;
    if (kind === 'flame') pose = `rotate(${t * 120}) scale(${1 + .13 * swell} ${1 - .05 * swell})`;
    if (kind === 'molecular') pose = `rotate(${t * 160}) scale(${.87 + .21 * swell})`;
    if (kind === 'push') pose = `scale(${1 - .22 * swell} ${.75 + .6 * t})`;
    return ref('shot-' + kind, `class="shot-${kind}" transform="translate(${x} ${y}) rotate(${angle}) ${pose}"`);
  }
  function flight(kind, cx, cy, tx, ty, t, launchAngle) {
    const style = flightStyles[kind];
    const muzzle = Math.min(style.muzzle, Math.hypot(tx - cx, ty - cy) * .55);
    const angle = launchAngle * Math.PI / 180;
    const sx = cx + Math.cos(angle) * muzzle, sy = cy + Math.sin(angle) * muzzle;
    const vx = tx - sx, vy = ty - sy;
    const arc = Math.min(style.arc || 0, Math.hypot(vx, vy) * .22);
    const x = sx + vx * t, y = sy + vy * t - 4 * arc * t * (1 - t);
    const pulse = Math.max(0, 1 - t * 2.5);
    const flare = pulse > 0 ? ref('launchFlare', `class="fx-accent muzzle-flare" color="${style.light}" opacity="${pulse}" transform="translate(${sx} ${sy}) rotate(${launchAngle}) scale(${.6 + pulse * .7})"`) : '';
    return shot(kind, x, y, Math.atan2(vy - 4 * arc * (1 - 2 * t), vx) * 180 / Math.PI, t) + flare;
  }
  function laser(angle, length, t, hitDistances, flash) {
    const recoil = recoilOffset('pierce', flash);
    const start = laserLensX - recoil;
    const path = `M${start} 0H${Math.max(start, length)}`;
    const intensity = (1 - t) ** 2;
    return `<g transform="translate(0 ${headY}) rotate(${angle})" fill="none" stroke-linecap="round">
      <path d="${path}" stroke="#fc597f" stroke-opacity=".3" stroke-width="${4 + 7 * intensity}"/>
      <path d="${path}" stroke="#d64262" stroke-width="${2 + 3 * intensity}"/><path d="${path}" stroke="#fff4ce" stroke-width="${1 + 2 * intensity}"/>
      <circle class="laser-origin" cx="${start}" r="${2 + 3 * intensity}" fill="#fff5c9"/>
      <g class="fx-accent" stroke="#ffe9b5" stroke-width="1.8">${hitDistances.map(d => `<g transform="translate(${d} 0)"><path d="M-2 ${-3 - 9 * t}l-2-3m4 ${17 + 18 * t} 2 3"/></g>`).join('')}</g></g>`;
  }
  function aura(radius, t) {
    const spread = 1 - (1 - t) ** 2;
    const front = 15 + (radius - 15) * spread;
    return `<circle r="${radius}" fill="#91dce6" fill-opacity=".07" stroke="#74b8c3" stroke-opacity=".42" stroke-dasharray="5 8"/>
      <circle r="${front}" fill="none" stroke="#81d6e2" stroke-opacity=".32" stroke-width="${4 + 6 * (1 - t)}"/>
      <circle r="${front}" fill="none" stroke="#eaffff" stroke-width="2.1"/>
      <g class="fx-accent" fill="none" stroke="#b5f7ff" stroke-width="1.8">
        <circle r="${Math.max(1, front - 15 * spread)}" stroke-dasharray="${front * .46} ${front * .32}" transform="rotate(${t * 16})"/>
        ${[18,78,138,198,258,318].map(angle => ref('snowflake', `color="#ebffff" transform="rotate(${angle}) translate(${front - 4} 0) rotate(${-angle + 38 * t}) scale(${.4 + .4 * Math.sin(Math.PI * t)})"`)).join('')}</g>`;
  }
  function brokenHeart(t) {
    const split = Math.min(1, t / .58), gap = 1 + 5 * split;
    return `<g class="broken-heart" transform="translate(0 ${-8 * t})" opacity="${Math.min(1, (1 - t) * 3)}" stroke="#912b40" stroke-width="1.6" stroke-linejoin="round">
      <g transform="translate(${-gap} 0) rotate(${-11 * split})"><path d="M0-7C-7-18-19-11-16-2c2 6 8 12 16 18l-1-8 4-5-6-4Z" fill="#f45160"/><path d="M-12-7q2-4 5-3" fill="none" stroke="#ffd8c9" stroke-width="2.2" stroke-linecap="round"/></g>
      <g transform="translate(${gap} ${2 * split}) rotate(${11 * split})"><path d="M0-7C8-18 19-10 16-2c-2 6-8 12-16 18l-1-8 4-5-6-4Z" fill="#e93d52"/></g></g>`;
  }
  function chargeGlobe(progress) {
    const radius = 2 + 8 * progress, orbit = radius + 5;
    return `<g class="fx-accent" opacity="${.25 + .7 * progress}">
      <circle r="${radius}" fill="url(#art-plasma-core)" stroke="#bba3e8" stroke-width="1.1"/>
      <g transform="rotate(${progress * 320})" fill="none" stroke="#d6eefe" stroke-width="1.7"><path d="M${-orbit} 0q0 ${-orbit * .7} ${orbit * .8} ${-orbit}M${orbit} 0q0 ${orbit * .7} ${-orbit * .8} ${orbit}"/></g></g>`;
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
  function definitions() {
    const drawings = { plinth, wall, face, wings, shieldPlate: shield, splitPlate, stagElytron, stagHead, stagJaw, cabin, firePatch, snowflake, launchFlare };
    for (const [kind, drawing] of Object.entries(mounts)) drawings['mount-' + kind] = drawing;
    for (const [kind, drawing] of Object.entries(feet)) drawings['feet-' + kind] = `<g fill="none" stroke-width="3.3">${drawing}</g>`;
    for (const [kind, drawing] of Object.entries(projectiles)) drawings['shot-' + kind] = drawing;
    for (const [kind, drawing] of Object.entries(heads)) drawings['tower-' + kind] = drawing;
    for (const [kind, drawing] of Object.entries(shells)) drawings['bug-' + kind] = drawing;
    const whiteShield = '<filter id="art-white-shield" color-interpolation-filters="sRGB"><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/></filter>';
    const coldShell = '<filter id="art-cold-shell" color-interpolation-filters="sRGB"><feColorMatrix values=".065 .16 .025 0 .025  .15 .48 .07 0 .125  .18 .59 .08 0 .27  0 0 0 1 0"/></filter>';
    const energy = `<radialGradient id="art-warm-soil"><stop stop-color="#fd7449" stop-opacity=".84"/><stop offset=".53" stop-color="#e64936" stop-opacity=".79"/><stop offset=".83" stop-color="#cb3f33" stop-opacity=".43"/><stop offset="1" stop-color="#bc443c" stop-opacity="0"/></radialGradient>
      <radialGradient id="art-plasma-core" cx="43%" cy="39%"><stop offset="0" stop-color="#fffceb"/><stop offset=".32" stop-color="#d6ffff"/><stop offset=".62" stop-color="#9dcbff"/><stop offset="1" stop-color="#9852c5"/></radialGradient>
      <radialGradient id="art-fireball-core"><stop offset="0" stop-color="#ffffc3"/><stop offset=".55" stop-color="#ffda58"/><stop offset="1" stop-color="#f86f21"/></radialGradient>`;
    return energy + coldShell + whiteShield + Object.entries(drawings).map(([id, content]) => `<g id="art-${id}" ${pen}>${content}</g>`).join('');
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
  function tower(kind, angle = -25, flash = 0, charge = 0) {
    if (kind === 'wall') return ref('wall');
    const kick = recoilKick(flash);
    if (kind === 'frost') {
      return ref('plinth') + ref('tower-frost', `transform="translate(0 ${-3 - kick * 4}) scale(${1 + kick * .06})"`) +
        (flash > 0 ? `<g class="fx-accent" transform="translate(0 -5)" opacity="${flash}">${ref('snowflake', 'color="#f3ffff" transform="scale(.8)"')}</g>` : '');
    }
    let style = '';
    if (kind === 'push') style = `style="--punch-travel:${kick * 13 + recoilRebound(flash) * 2}px;--spring-stretch:${1 + kick * .7 + recoilRebound(flash) * .12}"`;
    if (kind === 'molecular') style = `style="--core-light:${Math.max(charge, kick)}"`;
    const recoil = recoilOffset(kind, flash);
    return ref(mounts[kind] ? 'mount-' + kind : 'plinth') +
      ref('tower-' + kind, `transform="translate(0 ${headY}) rotate(${angle}) translate(${-recoil} 0)" ${style}`);
  }
  function bug(kind = 'bug', hp = null, time = 0, flash = 0, shieldFlash = 0, slow = false, labelId = '', maxHp) {
    const { head, shadow } = enemyShapes[kind];
    const size = window.Garden.enemyArtScale(kind, maxHp);
    const down = kind === 'shield_down', armored = down || kind === 'shield';
    const stride = Math.sin(time * (kind === 'swift' ? 19 : 12));
    const beat = 0.79 + Math.sin(time * 28) * 0.2;
    const leg = 'feet-' + (down ? 'shield' : kind);
    let health = '';
    if (hp !== null) {
      const label = `<text class="bug-hp" x="0" y="0" fill="${flash > 0 ? '#ffe58e' : '#fffdf0'}">${hp}</text>`;
      health = labelId ? `<defs><g id="${labelId}">${label}</g></defs>` : `<g transform="translate(2 ${down ? -3 : 21})">${label}</g>`;
    }
    const body = ref('bug-' + (down ? 'shield' : kind), kind === 'mother' ? 'class="brood-eggs"' : kind === 'splitter' ? 'class="split-lobes"' : '');
    let faceLayer;
    if (kind === 'giant') {
      const jaw = ref('stagJaw', `transform="rotate(${3.5 * Math.sin(time * 4)} -20 -8)"`);
      faceLayer = jaw + `<g transform="scale(1 -1)">${jaw}</g>` + ref('stagHead');
    } else {
      faceLayer = ref('face', `transform="translate(${head} 0)"`);
    }
    const cold = slow ? 'filter="url(#art-cold-shell)"' : '';
    const shieldLayer = armored ? `<g class="hard-shell ${down ? 'lower-shell' : 'upper-shell'}" transform="scale(1 ${down ? -1 : 1})">
      ${ref('shieldPlate', cold)}${shieldFlash > 0 ? ref('shieldPlate', `class="shield-flash" filter="url(#art-white-shield)" opacity="${Math.min(1, shieldFlash / .12)}"`) : ''}</g>` : '';
    return `<g class="bug-art" transform="scale(${size})"><ellipse cy="${kind === 'flyer' ? 25 : 13}" rx="${shadow}" ry="5" fill="#234b38" opacity=".19"/>
      <g stroke="#3f513e" style="${down ? '--shell-body:#84c1a7;--plate:#477969' : ''}"><g ${slow ? 'class="chilled-shell"' : ''} ${cold}>
      ${kind === 'flyer' ? `<g class="bug-wings" transform="scale(1 ${beat})">${ref('wings')}${ref('wings', 'transform="scale(1 -1)"')}</g>` : ''}
      <g class="bug-legs${kind === 'hopper' ? ' spring-legs' : ''}" transform="skewX(${stride * 5})">
        ${ref(leg)}${ref(leg, 'transform="scale(1 -1)"')}</g>
      ${body}${faceLayer}
      </g>${shieldLayer}</g>
      ${flash > 0 ? `<path d="m-15-16-2-4m10 2 1-4m5 7 3-3" fill="none" stroke="#fff2ae" stroke-width="3" stroke-linecap="round" opacity="${Math.min(1,flash * 8)}"/>` : ''}
      ${slow ? ref('snowflake', 'color="#e1fbff" transform="translate(12 -12) scale(.53)"') : ''}
      </g>${health}`;
  }
  function badge(kind, hp = null) { return `<svg class="bug-icon" viewBox="-45 -39 90 78" aria-hidden="true">${bug(kind, hp)}</svg>`; }
  function tool(kind) { return `<svg class="tool-art" viewBox="-37 -38 74 70" aria-hidden="true">${tower(kind)}</svg>`; }
  window.GardenArt = { definitions, icon, tower, bug, badge, tool, shot, flight, laser, aura, brokenHeart, chargeGlobe, impactBurst, splitPlateAt, house: () => ref('cabin') };
})();
