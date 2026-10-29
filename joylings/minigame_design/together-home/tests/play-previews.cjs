async function playPreviews(driver, l) {
  const read = driver.read;
  // Plans describe who should jump; send the partner's actual button in swap mode.
  const tick = (n, commands) => driver.tick(n, l.jumpSwap ? commands.map((a, i) => ({ ...a, jump: !!commands[1 - i]?.jump })) : commands);
  const wait = (n = 100) => tick(n, [{}, {}]);
  async function move(i, x, floor = 400) {
    for (let t = 0; t < 700; t++) {
      const s = await read(), p = s.players[i], q = s.players[1 - i], dx = x - p.x;
      if (p.exited) return;
      if (Math.abs(dx) < 3 && Math.abs(p.y + (p.h??44) - floor) < 3 && p.grounded) return;
      const axis = Math.abs(dx) < 2 ? 0 : Math.sign(dx);
      const crossing = !q.exited && Math.abs(p.x - q.x) < 85 && Math.abs(p.y - q.y) < 45 && (axis > 0 ? x > q.x + (q.w??38) && q.x > p.x : x + (p.w??38) < q.x && q.x < p.x);
      const a = [{}, {}]; a[i] = { axis, jump: p.grounded && (p.y + (p.h??44) > floor + 3 || crossing) };
      await tick(Math.abs(dx) > 45 ? 12 : 2, a);
    }
    throw Error(`Preview ${l.preview} move ${i} -> ${x},${floor}: ${JSON.stringify(await read())}`);
  }
  async function jump(i) { const a = [{}, {}]; a[i].jump = true; await tick(100, a); }
  if (l.preview === 'swap') {
    for (const [edge, x, floor] of [[260, 300, 344], [440, 490, 288], [620, 660, 232], [780, 820, 176]]) {
      await move(1, edge - 42, floor + 56); await move(1, x + 55, floor);
      await move(0, edge - 42, floor + 56); await move(0, x, floor);
      if (floor === 344) { await move(0, 321, floor); await jump(0); }
      if (floor === 288) { await move(1, 511, floor); await jump(1); }
    }
    await move(1, 930, 176); await move(0, 881, 176);
    await tick(18, [{}, { jump: true }]); await tick(28, [{}, { axis: -1 }]); await wait(90);
    if ((await read()).players[1].support !== 0) throw Error(`Swap stack: ${JSON.stringify(await read())}`);
    await jump(1);
  }
  async function special(i) { const a = [{}, {}]; a[i].special = true; await tick(1, a); await wait(120); }
  if (l.preview === 'phase') {
    async function mode(value, actor) { if ((await read()).mode !== value) await jump(actor); }
    await move(1, 60); await move(0, 198); await mode(0, 1);
    await move(0, 280, 344); await move(0, 338, 344); await move(0, 430, 288); await move(0, 480, 288);
    await move(1, 198); await mode(0, 0);
    await move(1, 280, 344); await move(1, 338, 344); await move(1, 410, 288);
    await mode(1, 1); await move(0, 560, 232); await move(0, 618, 232); await move(0, 760, 176);
    await move(1, 478, 288); await mode(1, 0); await move(1, 560, 232); await move(1, 618, 232); await move(1, 720, 176);
    await mode(0, 1); await move(0, 758, 176); await move(0, 840, 120); await move(0, 955, 120);
    await move(1, 758, 176); await mode(0, 1); await move(1, 840, 120); await move(1, 955, 120);
  }
  if(l.preview==='gravity'){
    async function walk(i,x){for(let t=0;t<300;t++){const p=(await read()).players[i];if(p.exited||Math.abs(p.x-x)<3)return;const a=[{},{}];a[i].axis=Math.sign(x-p.x);await tick(Math.abs(x-p.x)>35?10:1,a);}throw Error('Gravity walk blocked '+JSON.stringify(await read()));}
    await special(1);await walk(0,261);await walk(0,440);await walk(1,501);await walk(1,770);
    await walk(0,691);await special(1);await special(0);await walk(1,831);await special(0);
    await walk(1,955);await walk(0,955);await wait(10);
    if(!(await read()).won)throw Error('Gravity route '+JSON.stringify(await read()));return;
  }
  if(l.preview==='ice'){
    async function glide(i,x,floor=400){
      for(let t=0;t<500;t++){
        const s=await read(),p=s.players[i],dx=x-p.x;if(p.exited)return;
        if(Math.abs(dx)<4&&Math.abs(p.vx||0)<8&&Math.abs(p.y+44-floor)<3&&p.grounded){await wait(40);return;}
        const a=[{},{}];a[i]={axis:Math.sign(Math.sign(dx)*Math.min(200,Math.sqrt(1000*Math.abs(dx)))-(p.vx||0)),jump:p.grounded&&floor<400&&p.x>645&&p.x<735&&p.y+44>floor+3};await tick(Math.abs(dx)>35?6:1,a);
      }throw Error('Ice glide '+JSON.stringify(await read()));
    }
    await glide(0,261);await glide(0,450);await glide(1,501);await glide(0,781,344);await glide(1,861);await glide(1,955);await glide(0,955);await wait(30);
    if(!(await read()).won)throw Error('Ice route '+JSON.stringify(await read()));return;
  }
  await move(1, l.door.x + 25, l.door.y + l.door.h);
  await move(0, l.door.x + 25, l.door.y + l.door.h); await wait(5);
  if (!(await read()).won) throw Error(`Preview no win: ${JSON.stringify(await read())}`);
}
module.exports = { playPreviews };
