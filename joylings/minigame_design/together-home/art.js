(function (root) {
  'use strict';
  const ink = '#51483e', cat = '#ec9854', dog = '#f3d8a4';
  function round(c, x, y, w, h, r, fill, stroke) {
    c.beginPath(); c.roundRect(x, y, w, h, r);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 2; c.stroke(); }
  }
  function oval(c, x, y, rx, ry, fill, stroke) {
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}
  }
  function line(c, points, color, width = 2) {
    c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
    c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
  }
  function label(c, value, x, y, color = ink, size = 20) {
    c.font = `800 ${size}px "Microsoft JhengHei", system-ui, sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = color; c.fillText(value, x, y);
  }
  function key(c, x, y, scale = 1, color = '#f9cb4c') {
    c.save(); c.translate(x, y); c.scale(scale, scale);
    c.beginPath(); c.arc(-7, 0, 9, 0, Math.PI * 2); c.moveTo(2, 0); c.lineTo(24, 0); c.lineTo(24, 7); c.moveTo(15, 0); c.lineTo(15, 6);
    c.strokeStyle = '#866326'; c.lineWidth = 9; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke();
    c.strokeStyle = color; c.lineWidth = 5; c.stroke(); c.restore();
  }
  function face(c, i) {
    if (!i) {
      c.beginPath(); c.moveTo(1, 12); c.lineTo(2, -5); c.quadraticCurveTo(3, -8, 7, -5); c.lineTo(17, 3);
      c.lineTo(23, 3); c.lineTo(32, -5); c.quadraticCurveTo(36, -8, 36, -3); c.lineTo(37, 13);
      c.fillStyle = cat; c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#99613e'; c.stroke();
      line(c, [[6, 0], [7, 7]], '#f6c0a6', 4); line(c, [[31, 0], [30, 7]], '#f6c0a6', 4);
      round(c, 0, 3, 38, 29, 12, cat, '#99613e');
      line(c, [[16, 5], [17, 10]], '#ba713b', 2); line(c, [[22, 5], [21, 10]], '#ba713b', 2);
      oval(c, 19, 23, 11, 7, '#fff3d9');
      line(c, [[3, 20], [-3, 18]], '#99613e', 1.5); line(c, [[3, 24], [-3, 25]], '#99613e', 1.5);
      line(c, [[35, 20], [41, 18]], '#99613e', 1.5); line(c, [[35, 24], [41, 25]], '#99613e', 1.5);
    } else {
      round(c, 1, 2, 36, 31, 12, dog, '#95704e');
      oval(c, 0, 13, 6, 14, '#a77451'); oval(c, 38, 13, 6, 14, '#a77451');
      oval(c, 11, 15, 7, 9, '#d7a773'); oval(c, 21, 24, 11, 7, '#fff4df');
    }
    oval(c, 11, 16, 2.3, 3, ink); oval(c, 27, 16, 2.3, 3, ink);
    oval(c, 10.4, 15, .7, .9, '#fff'); oval(c, 26.4, 15, .7, .9, '#fff');
    oval(c, 6, 23, 3.2, 1.7, '#edb1a0'); oval(c, 32, 23, 3.2, 1.7, '#edb1a0');
    oval(c, 19, 22, 2.7, 2, ink);
    c.beginPath(); c.moveTo(19, 24); c.quadraticCurveTo(16, 29, 13, 25); c.moveTo(19, 24); c.quadraticCurveTo(22, 29, 25, 25);
    c.strokeStyle = ink; c.lineWidth = 1.3; c.stroke();
  }
  function character(c, p, i, ghost = false) {
    c.save(); c.translate(p.x, p.y); c.scale((p.w??38)/38,(p.h??44)/44); if (ghost) c.globalAlpha = .16;
    // The feet and body still occupy the original 38 × 44 physics bounds.
    c.beginPath(); c.moveTo(4, 35); c.quadraticCurveTo(-12, 37, -5, 23);
    c.strokeStyle = i ? '#a77451' : cat; c.lineWidth = 5; c.lineCap = 'round'; c.stroke();
    round(c, 6, 27, 26, 15, 7, i ? '#75aba2' : '#e99855', i ? '#4f847c' : '#99613e');
    oval(c, 19, 33, 7, 6, i ? '#d9ede4' : '#fff0d5');
    round(c, 3, 38, 13, 6, 3, i ? dog : cat, i ? '#95704e' : '#99613e');
    round(c, 22, 38, 13, 6, 3, i ? dog : cat, i ? '#95704e' : '#99613e');
    face(c, i);
    round(c, 9, 30, 20, 4, 2, i ? '#417b72' : '#ba6248'); oval(c, 19, 34, 2.5, 2.5, '#f4cc69');
    c.restore();
  }
  function avatar(canvas, i) {
    const c = canvas.getContext('2d'); c.clearRect(0, 0, canvas.width, canvas.height);
    c.save(); c.scale(canvas.width / 72, canvas.height / 72); c.translate(17, 18); character(c, { x: 0, y: 0 }, i); c.restore();
  }
  function cloud(c, x, y, scale = 1) {
    c.save(); c.translate(x, y); c.scale(scale, scale);
    oval(c, 0, 0, 30, 12, '#fffdf3'); oval(c, -17, -6, 17, 14, '#fffdf3'); oval(c, 8, -12, 20, 18, '#fffdf3'); c.restore();
  }
  function background(c, top) {
    const sky = c.createLinearGradient(0, top, 0, 400); sky.addColorStop(0, '#f3f6e9'); sky.addColorStop(1, '#fcf6e5');
    c.fillStyle = sky; c.fillRect(0, top, 1000, 480 - top);
    oval(c, 850, top + 61, 24, 24, '#f4dc91'); cloud(c, 130, top + 48); cloud(c, 420, top + 73, .65); cloud(c, 730, top + 36, .85);
    oval(c, 85, 410, 210, 100, '#e4edd7'); oval(c, 465, 425, 235, 85, '#e9efd9'); oval(c, 900, 420, 210, 105, '#dce8ce');
    c.fillStyle = '#a7c58a'; c.fillRect(0, 400, 1000, 80); c.fillStyle = '#729769'; c.fillRect(0, 400, 1000, 4);
    c.fillStyle = '#e6d9b8'; c.fillRect(0, 414, 1000, 66); c.fillStyle = '#d2c4a0'; c.fillRect(0, 414, 1000, 3);
    for (let x = 22; x < 1000; x += 47) {
      oval(c, x, 438 + (x % 3) * 8, 3, 2, '#ccbc97');
      line(c, [[x, 407], [x + 3, 403], [x + 6, 408]], '#779d69', 1.5);
    }
    for (const x of [52, 134, 360, 691, 862]) {
      line(c, [[x, 400], [x, 389]], '#91ad7b', 2);
      for (let i = 0; i < 5; i++) oval(c, x + Math.cos(i * 1.26) * 3, 387 + Math.sin(i * 1.26) * 3, 3, 3, '#fff7dc');
      oval(c, x, 387, 2, 2, '#dfbc65');
    }
  }
  function mark(c, type, x, y, color, size = 9) {
    if (type === 'lift') { line(c, [[x - 4, y - 3], [x, y - 7], [x + 4, y - 3]], color); line(c, [[x - 4, y + 3], [x, y + 7], [x + 4, y + 3]], color); }
    else if (type === 'check') line(c, [[x - 5, y], [x - 1, y + 4], [x + 6, y - 5]], color, 2.5);
    else if (type === 'diamond') { c.beginPath(); c.moveTo(x, y - size); c.lineTo(x + size, y); c.lineTo(x, y + size); c.lineTo(x - size, y); c.closePath(); c.strokeStyle = color; c.lineWidth = 2; c.stroke(); }
    else { c.beginPath(); c.arc(x, y, size * .75, 0, Math.PI * 2); c.strokeStyle = color; c.lineWidth = 2; c.stroke(); }
  }
  function button(c, b, color, down, type) {
    round(c, b.x - 3, b.y - 5, b.w + 6, 8, 3, '#8c8370');
    round(c, b.x, b.y - (down ? 9 : 16), b.w, down ? 9 : 16, 4, down ? '#81ae80' : color, down ? '#4d7a54' : '#6d6758');
    round(c, b.x + b.w / 2 - 12, b.y - 38, 24, 23, 8, '#fffdf2', down ? '#7ca578' : color);
    mark(c, down ? 'check' : type, b.x + b.w / 2, b.y - 27, down ? '#4d7a54' : color, 6);
  }
  function door(c, d, state) {
    const ready = state.key;
    round(c, d.x - 3, d.y - 5, d.w + 6, d.h + 5, [12, 12, 0, 0], '#eee1bf', '#a28b66');
    c.beginPath(); c.moveTo(d.x - 3, d.y + 3); c.lineTo(d.x + d.w / 2, d.y - 24); c.lineTo(d.x + d.w + 3, d.y + 3); c.closePath(); c.fillStyle = '#bd7860'; c.fill(); c.strokeStyle = '#905f4b'; c.lineWidth = 2; c.stroke();
    round(c, d.x + 5, d.y + 6, d.w - 10, d.h - 6, [18, 18, 0, 0], ready ? '#4e7465' : '#bd9060', '#8f7354');
    if (ready) {
      round(c, d.x + 13, d.y + 14, d.w - 26, d.h - 14, [12, 12, 0, 0], '#d8e8ba');
      line(c, [[d.x + 22, d.y + 44], [d.x + d.w - 20, d.y + 44]], '#547c55', 4);
      line(c, [[d.x + d.w - 27, d.y + 36], [d.x + d.w - 19, d.y + 44], [d.x + d.w - 27, d.y + 52]], '#547c55', 4);
    } else {
      for (let x = d.x + 19; x < d.x + d.w - 9; x += 14) line(c, [[x, d.y + 18], [x, d.y + d.h - 3]], '#aa7e52', 1.5);
      round(c, d.x + d.w / 2 - 10, d.y + 36, 20, 19, 5, '#ffe29a', '#8c7038');
      c.beginPath(); c.arc(d.x + d.w / 2, d.y + 36, 6, Math.PI, 0); c.strokeStyle = '#ffe29a'; c.lineWidth = 4; c.stroke();
      oval(c, d.x + d.w / 2, d.y + 44, 2, 3, '#8c7038');
    }
    for (let i = 0; i < 2; i++) {
      const x = d.x + d.w / 2 - 13 + i * 26;
      oval(c, x, d.y - 37, 10, 10, state.players[i].exited ? '#d9eac6' : '#fffaf0');
      if (state.players[i].exited) mark(c, 'check', x, d.y - 37, '#4d7a54');
      else { c.save(); c.translate(x - 7, d.y - 43); c.scale(.38, .38); face(c, i); c.restore(); }
    }
  }
  function scene(c, canvas, state, G, effects = [], now = 0, showTips = false) {
    const l = G.levels[state.level], top = l.cameraTop ?? 140, view=G.camera(state);
    const screenHeight=l.world?560:480-top;
    if (canvas.height !== screenHeight) canvas.height = screenHeight;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, canvas.width, canvas.height); c.save();c.scale(view.scale,view.scale);c.translate(-view.x,-view.y);
    if(l.world){
      const sky=c.createLinearGradient(0,view.y,0,view.y+view.h);sky.addColorStop(0,'#e6f0ec');sky.addColorStop(1,'#fff6df');c.fillStyle=sky;c.fillRect(view.x,view.y,view.w,view.h);
      for(let x=Math.floor(view.x/500)*500;x<view.x+view.w+500;x+=500){cloud(c,x+140,view.y+75,.9);cloud(c,x+390,view.y+170,.6);oval(c,x+220,460,380,180,'#d7e6d2');}
      const abyss=c.createLinearGradient(0,400,0,500);abyss.addColorStop(0,'#6a9cae');abyss.addColorStop(1,'#304f70');c.fillStyle=abyss;c.fillRect(0,400,l.world.width,100);
      for(const f of l.floor){round(c,f.x,f.y,f.w,100,0,'#e6d9b8');round(c,f.x,f.y,f.w,12,0,'#a7c58a');for(const z of l.ice?[{x:0,w:l.world.width}]:(l.iceZones||[])){if(f.x<z.x+z.w&&f.x+f.w>z.x){const start=Math.max(f.x,z.x),end=Math.min(f.x+f.w,z.x+z.w);round(c,start,f.y,end-start,12,0,'#b9e1eb');}}}
      if(showTips)for(const sign of l.signs||[]){round(c,sign.x-15,sign.y-22,235,44,12,'#fffaf0','#c8b995');label(c,sign.text,sign.x+100,sign.y,'#76694f',22);}
    }else background(c, top);
    if(l.gravityFlip)for(const f of l.ceilingPieces??[{x:0,y:l.ceiling-16,w:1000,h:16}]){round(c,f.x,f.y,f.w,f.h,3,'#c3b7d6','#9381ad');for(let x=f.x+25;x<f.x+f.w-10;x+=65)label(c,'↑',x,f.y-18,'#9381ad',24);}

    if(l.ice&&!l.world){round(c,0,400,1000,16,0,'#b9e1eb','#78b1c2');for(let x=15;x<1000;x+=63)line(c,[[x,408],[x+20,405]],'#e9faff',2);}
    if(l.floor&&!l.world){
      let edge=0;const segments=[...l.floor].sort((a,b)=>a.x-b.x);
      const gap=(x,w)=>{if(w<=0)return;const abyss=c.createLinearGradient(0,400,0,480);abyss.addColorStop(0,'#6a9cae');abyss.addColorStop(1,'#304f70');c.fillStyle=abyss;c.fillRect(x,400,w,80);line(c,[[x,400],[x+4,412],[x,424]],'#deeff1',3);line(c,[[x+w,400],[x+w-4,412],[x+w,424]],'#deeff1',3);for(let j=x+18;j<x+w-8;j+=40)line(c,[[j,450],[j+7,458],[j+14,450]],'#9abed0',2);};
      for(const f of segments){gap(edge,f.x-edge);edge=Math.max(edge,f.x+f.w);}gap(edge,1000-edge);
    }
    const movers=(l.movers||[]).map(f=>({...f,y:f.y+f.range*Math.cos(state.clock*1.2+f.phase),moving:true}));
    (l.movers||[]).forEach(f=>{line(c,[[f.x+f.w/2,f.y-f.range],[f.x+f.w/2,f.y+f.range]],'#b9bbd3',5);});
    for (const p of [...l.platforms,...movers]) {
      const active = G.platformActive(state,p);
      if (!active) {
        c.save(); c.setLineDash([5, 6]); c.strokeStyle = p.mode ? '#b7a4cb' : '#d5b76c'; c.lineWidth = 2; c.strokeRect(p.x, p.y, p.w, p.h); c.restore();
        label(c, showTips && p.number ? `${p.number}${p.mode===undefined?'':p.mode?' ☾':' ☀'}` : p.mode===undefined?'':p.mode?'☾':'☀', p.x + p.w / 2, p.y + 33, '#aaa397', 22); continue;
      }
      if (p.mode === undefined && !p.moving && !p.pads) {
      round(c, p.x + 13, p.y + 12, 8, l.world?36:400 - p.y - 12, 2, '#d1c7a7');
      round(c, p.x + p.w - 21, p.y + 12, 8, l.world?36:400 - p.y - 12, 2, '#d1c7a7');
      }
      round(c, p.x, p.y, p.w, p.h, 4, p.mode === 1 ? '#b79dcc' : p.mode === 0 ? '#e9c267' : p.moving ? '#b0a0cd' : l.ice ? '#b4dce9' : '#bd9465', '#8f7754');
      if (p.mode !== undefined) label(c, p.mode ? '☾' : '☀', p.x + p.w / 2, p.y + 33, p.mode ? '#79618f' : '#ae842c', 23);
      if(showTips&&p.number)label(c,p.number,p.x+16,p.y+30,'#577963',22);
      if(p.moving)label(c,'↕',p.x+p.w-18,p.y+30,'#777498',22);
      round(c, p.x + 1, p.y, p.w - 2, 5, 2, '#e5c58f');
      for (let x = p.x + 20; x < p.x + p.w - 8; x += 48) oval(c, x, p.y + 10, 1.5, 1.5, '#876a4b');
    }
    l.gates.forEach((g, i) => {
      const opened = G.gateOpen(state, i), color = i ? '#9d84ba' : '#6b9db5', type = i ? 'diamond' : 'circle';
      for (const b of g.buttons || (g.button ? [g.button] : [])) {
        const down = l.legacy ? G.pressed(state, g) : G.weighted(state, b);
        c.setLineDash([4, 6]); line(c, [[b.x + b.w / 2, b.y + 10], [g.x + g.w / 2, b.y + 10]], down ? '#7caa76' : color, 2); c.setLineDash([]);
        button(c, b, color, down, type);
      }
      round(c, g.x - 3, g.y, g.w + 6, 11, 4, opened ? '#7ca578' : color, '#62716a');
      if (opened) {
        c.setLineDash([5, 8]); line(c, [[g.x + 2, g.y + 15], [g.x + 2, g.y + g.h - 4]], '#a7bea1', 2);
        line(c, [[g.x + g.w - 2, g.y + 15], [g.x + g.w - 2, g.y + g.h - 4]], '#a7bea1', 2); c.setLineDash([]);
      } else {
        for (const x of [g.x + 3, g.x + g.w / 2, g.x + g.w - 3]) round(c, x - 3, g.y + 8, 6, g.h - 8, 3, color, '#627585');
        round(c, g.x - 2, g.y + g.h - 10, g.w + 4, 10, 3, color, '#627585');
      }
      const badgeY = Math.max(g.y + 36, g.y + g.h - 100);
      const lit = g.mode !== undefined && state.mode === g.mode;
      round(c, g.x - 3, badgeY - 16, g.w + 6, 32, 10, lit ? '#fff0bf' : '#fffaf0', opened ? '#7ca578' : color);
      if (g.mode !== undefined) label(c, g.mode ? '☾' : '☀', g.x + g.w / 2, badgeY, lit ? (g.mode ? '#79628f' : '#b98b30') : '#aaa599', 25);
      else if (showTips && g.number) label(c,g.number,g.x+g.w/2,badgeY,opened?'#4d7a54':color,22);
      else if (g.keyIndices) { key(c, g.x + 8, badgeY, .6, opened ? '#9ac08e' : '#edc66a'); }
      else mark(c, opened ? 'check' : type, g.x + g.w / 2, badgeY, opened ? '#4d7a54' : color);
      if(showTips&&g.mode!==undefined&&g.number){round(c,g.x-3,badgeY-46,g.w+6,26,8,'#fffaf0',color);label(c,g.number,g.x+g.w/2,badgeY-33,color,18);}
    });
    (l.lifts || []).forEach((f, i) => {
      for (const x of [f.x + 8, f.x + f.w - 8]) { line(c, [[x, f.top], [x, f.bottom]], '#d5bf94', 5); line(c, [[x, f.top], [x, f.bottom]], '#f8e6be', 2); }
      for (const b of f.buttons) {
        button(c, b, '#d69d57', G.weighted(state, b), 'lift');
        if (showTips && l.lifts.length > 1) { round(c, b.x + b.w / 2 - 11, b.y - 38, 22, 23, 7, '#fff8e3', '#d69d57'); label(c, b.number ?? i + 1, b.x + b.w / 2, b.y - 26, '#9c7945', 18); }
      }
      round(c, f.x, state.lifts[i], f.w, 14, 5, '#e4ae62', '#9d7848');
      for (let x = f.x + 13; x < f.x + f.w - 6; x += 16) line(c, [[x, state.lifts[i] + 4], [x - 5, state.lifts[i] + 10]], '#fce6b2', 3);
      mark(c, 'lift', f.x + f.w / 2, state.lifts[i] + 30, '#9c7945');
      if (showTips && l.lifts.length > 1) label(c, f.buttons[0]?.number??i + 1, f.x + f.w / 2 + 23, state.lifts[i] + 30, '#9c7945', 18);
    });
    const pressurePads=new Map();
    for(const g of [...l.gates,...l.platforms,...(l.movers||[])])for(const b of g.pads||[])pressurePads.set(`${b.x}/${b.y}/${b.owner}`,b);
    for(const b of pressurePads.values())button(c,b,b.number===1?'#6b9db5':'#9d84ba',G.weighted(state,b),'circle');
    for(const f of l.lifts||[])for(const b of f.buttons)if(b.owner!==undefined)pressurePads.set(`${b.x}/${b.y}/${b.owner}`,b);
    for(const b of pressurePads.values()){
      const down=G.weighted(state,b),color=b.number===1?'#527f96':'#84699b';
      if(showTips){round(c,b.x+b.w/2-14,b.y-39,28,24,7,down?'#d6ebcb':'#fffaf0',color);label(c,b.number,b.x+b.w/2,b.y-26,color,18);}
      c.save();c.translate(b.x+b.w/2-9,b.y-65);c.scale(.5,.5);face(c,b.owner);c.restore();
    }
    if(l.helpRange){
      const [a,b]=state.players,near=G.canHelp(state,l),color=near?'#86ad94':'#c47355';
      c.setLineDash([5,7]);line(c,[[a.x+19,a.y+22],[b.x+19,b.y+22]],color,2);c.setLineDash([]);
      if(showTips&&!near)label(c,'靠近才能幫忙',(a.x+b.x)/2+19,Math.min(a.y,b.y)-28,color,20);
    }
    (l.switches || []).forEach((b, i) => {
      round(c, b.x - 2, b.y - 5, b.w + 4, 8, 3, '#a58c62');
      round(c, b.x, b.y - (state.switches[i] ? 9 : 17), b.w, state.switches[i] ? 9 : 17, 5, '#f0ca66', '#a5853d');
      label(c, '★', b.x + b.w / 2, b.y - 33, '#bb8b34', 27);
    });
    (l.balances||[]).forEach((b,i)=>{
      const unlocked=state.collected[b.lockKey],centers=[b.a.x+b.a.w/2,b.b.x+b.b.w/2];
      line(c,[[centers[0],state.balances[i][0]],[centers[0],115],[centers[1],115],[centers[1],state.balances[i][1]]],'#b5966d',4);
      for(const x of centers){oval(c,x,115,13,13,'#eacb8c','#987744');oval(c,x,115,5,5,'#fff6d8');}
      [b.a,b.b].forEach((p,j)=>{round(c,p.x,state.balances[i][j],p.w,14,5,unlocked?'#a7c798':j?'#b5ccd5':'#e5bc88','#8b8062');label(c,unlocked?'✓':j?'↑':'↓',p.x+p.w/2,state.balances[i][j]+32,'#7d795e',24);});
    });
    (state.boxes || []).forEach(b => {
      round(c, b.x, b.y, b.w, b.h, 5, b.heavy ? '#b98265' : '#d9af78', '#8c684b');
      round(c, b.x + 5, b.y + 5, b.w - 10, b.h - 10, 3, b.heavy ? '#c99170' : '#e7c38e', '#aa8057');
      if (b.heavy) {
        round(c, b.x + 7, b.y + 9, b.w - 14, 25, 5, '#fff1d9'); label(c, '2人', b.x + b.w / 2, b.y + 22, '#805541', 20);
      } else {
        line(c, [[b.x + 7, b.y + 7], [b.x + b.w - 7, b.y + b.h - 7]], '#b68b57', 4);
        line(c, [[b.x + b.w - 7, b.y + 7], [b.x + 7, b.y + b.h - 7]], '#f8dbab', 4);
      }
      for (const x of [b.x + 5, b.x + b.w - 5]) for (const y of [b.y + 5, b.y + b.h - 5]) oval(c, x, y, 1.3, 1.3, '#8c684b');
    });
    if (l.tether && !state.players.some(p => p.exited)) {
      const [a, b] = state.players; c.beginPath(); c.moveTo(a.x + 19, a.y + 33); c.quadraticCurveTo((a.x + b.x) / 2 + 19, Math.max(a.y, b.y) + 62, b.x + 19, b.y + 33);
      c.strokeStyle = Math.abs(a.x - b.x) > l.tether - 8 ? '#bc7358' : '#b29466'; c.lineWidth = 3; c.stroke();
    }
    door(c, l.door, state);
    l.keys.forEach((k, i) => {
      if (state.collected[i]) return;

      oval(c, k.x + 3, k.y, 29, 25, '#fff6d4');
      key(c, k.x, k.y, 1, k.owner === 0 ? '#efa268' : k.owner === 1 ? '#85b8ac' : '#f9cb4c');
      if (k.owner !== undefined) { c.save(); c.translate(k.x - 11, k.y - 44); c.scale(.6, .6); face(c, k.owner); c.restore(); }

    });
    if (showTips && state.level === 0 && !state.key) { character(c, { x: 481, y: 356 }, 0, true); character(c, { x: 481, y: 312 }, 1, true); }
    state.players.forEach((p, i) => {
      if (!p.exited) {
        if(l.gravityFlip&&state.gravity[i]===-1){c.save();c.translate(0,p.y*2+44);c.scale(1,-1);character(c,p,i);c.restore();}
        else {oval(c,p.x+(p.w??38)/2,p.y+(p.h??44)+1,(p.w??38)/2,3,'#53694620');character(c,p,i);}
      }
    });
    if(l.ice||l.iceZones)state.players.forEach((p,i)=>{
      if(p.exited||!G.isIce(p,l))return;
      const w=p.w??38,h=p.h??44,inverted=l.gravityFlip&&state.gravity[i]===-1,skateY=inverted?p.y-3:p.y+h+3;
      line(c,[[p.x+2,skateY],[p.x+w-2,skateY]],'#6babc2',3);
    });
    // Draw held keys last so a nearby teammate cannot hide the badge.
    state.players.forEach((p, i) => {
      const carried = state.collectedBy.filter(actor => actor === i).length;
      if (!carried || p.exited) return;
      const x = Math.min((l.world?.width??1000)-50, Math.max(4, p.x + (carried > 1 ? -2 : 4))), y = l.gravityFlip&&state.gravity[i]===-1 ? p.y+52 : p.y-34;
      round(c, x, y, carried > 1 ? 43 : 31, 22, 10, '#fff5c6', '#bd8e35');
      key(c, x + 11, y + 10, .43); if (carried > 1) label(c, carried, x + 33, y + 11, '#805f25', 16);
    });
    for (const effect of effects) {
      const t = (now - effect.time) / 900; if (t < 0 || t >= 1) continue;
      c.save(); c.globalAlpha = 1 - t; const k = l.keys[effect.key];
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; oval(c, k.x + Math.cos(a) * (20 + t * 35), k.y + Math.sin(a) * (20 + t * 35), 3, 3, '#d8a33f'); }
      round(c, k.x - 21, k.y - 45 - t * 20, 49, 25, 10, '#fff8d9', '#d2a94f'); label(c, '+1', k.x + 4, k.y - 32 - t * 20, '#896223', 19); c.restore();
    }
    c.restore();
    if(l.world)state.players.forEach((p,i)=>{
      if(p.exited)return;const x=(p.x+19-view.x)*view.scale,y=(p.y+22-view.y)*view.scale;
      if(x>22&&x<978&&y>22&&y<538)return;
      const bx=Math.max(30,Math.min(970,x)),by=Math.max(30,Math.min(530,y));round(c,bx-25,by-23,50,46,12,'#fff8df','#af9d75');c.save();c.translate(bx-13,by-13);c.scale(.7,.7);face(c,i);c.restore();
      label(c,x<22?'←':x>978?'→':y<22?'↑':'↓',bx,by+33,'#76694f',22);
    });
  }
  function finale(canvas,seconds){
    const c=canvas.getContext('2d'),t=Math.max(0,seconds),enter=Math.min(1,t/2.4),ease=1-Math.pow(1-enter,3);
    c.clearRect(0,0,900,460);const bg=c.createLinearGradient(0,0,0,460);bg.addColorStop(0,'#263b51');bg.addColorStop(1,'#667077');c.fillStyle=bg;c.fillRect(0,0,900,460);
    for(const x of [260,640]){c.beginPath();c.moveTo(x,12);c.lineTo(x-180,360);c.lineTo(x+180,360);c.closePath();c.fillStyle='#fff1b72b';c.fill();oval(c,x,12,22,10,'#ffe7a0');}
    for(const side of [0,1]){c.save();if(side){c.translate(900,0);c.scale(-1,1);}round(c,0,0,96,340,0,'#ad5f68');for(let x=12;x<95;x+=24)round(c,x,0,12,320,6,'#994f60');c.restore();}
    round(c,0,0,900,24,0,'#b66d72');for(let x=0;x<900;x+=90)oval(c,x+45,24,46,28,'#b66d72');
    oval(c,450,374,375,65,'#b3895e');round(c,75,359,750,55,12,'#ba8c60','#80603f');round(c,75,359,750,12,6,'#f0d4a0');
    round(c,265,322,370,43,9,'#e8bc6b','#ab8248');round(c,286,307,328,18,7,'#ffe3a0');
    for(let i=0;i<2;i++){
      const x=i?755-ease*250:95+ease*260,y=enter<1?292-ease*72+Math.sin(t*15)*3:220-Math.abs(Math.sin((t-2.4)*3))*7;
      c.save();c.translate(x,y);c.scale(2,2);character(c,{x:0,y:0},i);c.restore();
      if(enter===1){line(c,[[x+10,y+70],[x-13,y+52+Math.sin(t*5)*6]],i?'#a77451':'#ec9854',8);line(c,[[x+67,y+70],[x+91,y+52-Math.sin(t*5)*6]],i?'#a77451':'#ec9854',8);}
    }
    if(enter===1){label(c,'★',450,169,'#f8d67c',48);label(c,'20 / 20',450,347,'#886333',24);}
    for(let i=0;i<60;i++){const x=(i*137+Math.sin(t+i)*14)%870+15,y=(i*47+t*(35+i%5*9))%440;c.save();c.translate(x,y);c.rotate(t+i);c.fillStyle=['#f5d97c','#f2a4a0','#a6d7c9','#c0b4df'][i%4];c.fillRect(-3,-5,6,10);c.restore();}
  }
  root.TogetherArt = { scene, avatar, finale };
})(globalThis);
