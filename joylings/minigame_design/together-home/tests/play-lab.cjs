// The same controller runs against the simulation or real browser key events.
// It can read state, but its only writes are left/right/jump inputs.
async function playLab(driver, level) {
  const read = driver.read;
  async function tick(n, a = [{}, {}]) {
    await driver.tick(n, a);
    if ((await read()).failed) throw Error('試關掉落：' + JSON.stringify(await read()));
  }
  const wait = (n = 90) => tick(n);
  async function jump(i, axis = 0, frames = 70) {
    const a = [{}, {}]; a[i] = {axis, jump: true}; await tick(frames, a);
  }
  async function move(i, x, floor = 400) {
    for (let t = 0; t < 1100; t++) {
      const s = await read(), p = s.players[i], q = s.players[1-i], dx = x-p.x;
      if (p.exited || Math.abs(dx)<2 && p.grounded && Math.abs(p.y+p.h-floor)<3) return;
      const axis = Math.abs(dx)<1 ? 0 : Math.sign(dx);
      const crossing = !q.exited && Math.abs(p.y-q.y)<45 && Math.abs(p.x-q.x)<74 && (axis>0 ? x>q.x+38 && p.x<q.x : x+38<q.x && p.x>q.x);
      const a = [{}, {}]; a[i] = {axis, jump:p.grounded && (p.y+p.h>floor+3 || crossing)};
      await tick(Math.abs(dx)>24?4:1, a);
    }
    throw Error(`走不到 ${i}: ${x}/${floor}：` + JSON.stringify(await read()));
  }
  async function boat(index, x) {
    for(let t=0;t<1600;t++){
      const s=await read(); if(Math.abs(s.rafts[index]-x)<1)return;
      await tick(Math.abs(s.rafts[index]-x)>20?8:1);
    }
    throw Error('船到不了 '+x+': '+JSON.stringify(await read()));
  }
  if (level.id === 0) {
    // Load the front crate while the pilot stays clear of the controls.
    await move(1,305);
    await move(0,45);await jump(0,1,70);await move(0,250,350);
    await boat(0,500);await move(0,205);
    await driver.mark?.('first-crossing');
    // At the middle dock unload one crate, then send the boat back empty.
    await move(1,865);await move(1,660,350);
    await boat(0,290);await boat(1,840);await move(1,710);
    // Board the second shipment before the middle-island pilot departs.
    await jump(0,-1,70);await move(0,52);await move(0,315);
    await move(1,790,350);await boat(0,500);
    await move(0,687);await move(1,660,350);await boat(1,840);
    await move(0,730,358);await jump(0,1,70);await move(0,865);
    await move(1,790,350);await boat(1,1170);await move(1,740,358);
    await move(0,1372);await move(0,1400,358);await move(0,1500);
    await driver.mark?.('cargo');
    await move(0,1340,350);await boat(1,840);
    await move(1,850);await move(0,1450,350);await boat(1,1170);await move(0,1500);
    await move(1,1360);await move(0,driver.sectionOnly?1680:1638);await move(1,1390,358);await jump(1,1);await move(1,driver.sectionOnly?1605:1638);
  } else if (level.id === 1) {
    await move(1,347);await move(0,170);
    await move(0,282);await jump(0,1);await move(0,630);
    await driver.mark?.('circle-triangle');
    await move(0,825);
    await move(1,762);await jump(1,1);await move(1,1140);
    await driver.mark?.('triangle-square');
    await move(1,895);await jump(1,-1);await move(1,170);
    await move(1,282);await jump(1,1);await move(1,762);await jump(1,1);
    await move(1,1345);await move(0,1530);await driver.mark?.('circle-square');
    await move(0,1668);await move(1,1668);
  } else {
    await move(1,1345);
    await move(0,200);await jump(0,1);await move(0,510);
    await move(1,1010);await move(1,848);await move(1,1345);
    await driver.mark?.('first-position');
    await move(0,112,358);await jump(0);
    await driver.mark?.('cat-key');
    await move(0,52);await move(0,442);
    await move(1,1190,358);await jump(1);
    await driver.mark?.('dog-key');
    if(driver.keysOnly)return;
    await move(1,driver.sectionOnly?1660:1628);await jump(0,1);await move(0,1120);await jump(0,1);await move(0,driver.sectionOnly?1580:1628);
  }
  if(driver.sectionOnly)return;
  await wait(10);
  if (!(await read()).won) throw Error('尚未通關：'+JSON.stringify(await read()));
}
module.exports={playLab};
