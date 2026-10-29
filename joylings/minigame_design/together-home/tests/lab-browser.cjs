const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const levels=require('../lab-levels.js'),{playLab}=require('./play-lab.cjs'),tapes=require('../lab-solutions.js');
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[],held=new Set();
    const base=process.env.TOGETHER_URL||'http://127.0.0.1:18129/lab.html',out=path.join(__dirname,'../test-output');fs.mkdirSync(out,{recursive:true});
    page.on('pageerror',e=>errors.push(e.message));
    await page.clock.install({time:new Date('2026-10-29T00:00:00Z')});await page.clock.pauseAt(new Date('2026-10-29T00:00:01Z'));
    await page.goto(base);
    const mainSave=JSON.stringify([require('../levels.js')[0].saveKey]),mainKey='together-home-curated-v4',labKey='together-home-local-puzzles-v1';
    await page.evaluate(([key,value])=>localStorage.setItem(key,value),[mainKey,mainSave]);
    const read=()=>page.evaluate(()=>readGame()),keys=[['a','d','w'],['ArrowLeft','ArrowRight','ArrowUp']];
    async function release(){for(const k of held)await page.keyboard.up(k);held.clear();}
    async function tick(n,commands){
      const wanted=new Set();commands.forEach((c,i)=>{if(c.axis)wanted.add(keys[i][c.axis>0?1:0]);if(c.jump)wanted.add(keys[i][2]);});
      for(const k of [...held])if(!wanted.has(k)){await page.keyboard.up(k);held.delete(k);}
      for(const k of wanted)if(!held.has(k)){await page.keyboard.down(k);held.add(k);}
      await page.clock.runFor(Math.round(n*1000/120));
      for(const k of ['w','ArrowUp'])if(held.has(k)){await page.keyboard.up(k);held.delete(k);}
    }
    assert.equal(await page.locator('#levels option').count(),3);assert.ok(await page.locator('#message').isVisible());
    assert.equal(await page.locator('#solution-controls').isVisible(),false);assert.equal(await page.locator('.answer-section').isVisible(),false);
    const proof=[];
    for(const l of levels){
      await release();await page.selectOption('#levels',String(l.id));
      await page.screenshot({path:path.join(out,`lab-${l.id+1}-start.png`),fullPage:true});
      await playLab({read,tick,mark:async name=>page.screenshot({path:path.join(out,`lab-${l.id+1}-${name}.png`)})},l);
      await release();const s=await read();assert.ok(s.won&&s.players.every(p=>p.exited)&&s.collected.every(Boolean));
      assert.equal(await page.evaluate(k=>localStorage.getItem(k),mainKey),mainSave);
      proof.push({level:l.id+1,won:s.won,collected:s.collected,exited:s.players.map(p=>p.exited)});
      console.log(`${l.name}：真實鍵盤通關`);
    }
    assert.ok(await page.locator('#finale').isVisible());assert.match(await page.locator('#finale-caption').innerText(),/3 關/);
    await page.locator('#finale-close').click();await page.reload();assert.equal(await page.locator('#levels option').filter({hasText:'✓'}).count(),3);
    const labSave=await page.evaluate(k=>localStorage.getItem(k),labKey);
    // Same-origin main game remains 20 levels, with its original save intact.
    await page.goto(new URL('./',base).href);assert.equal(await page.locator('#levels option').count(),21);
    assert.equal(await page.locator('#levels option').filter({hasText:'✓'}).count(),1);
    const teacher=new URL(base);teacher.searchParams.set('tip','true');await page.goto(teacher.href);
    for(const l of levels){
      await page.selectOption('#levels',String(l.id));await page.locator('#solution-play').click();
      await page.clock.runFor(tapes.levels[l.saveKey].frames*1000/120+250);
      assert.ok((await read()).won);assert.equal(await page.locator('#finale').isVisible(),false);
      assert.equal(await page.evaluate(k=>localStorage.getItem(k),labKey),labSave);
    }
    await page.goto(base);await page.keyboard.down('d');await page.keyboard.down('ArrowRight');await page.clock.runFor(100);
    await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await release();const stopped=await read();await page.clock.runFor(300);
    assert.deepEqual((await read()).players.map(p=>p.x),stopped.players.map(p=>p.x));
    await page.locator('#restart').click();assert.deepEqual((await read()).rafts,[290,840]);
    await page.keyboard.down('ArrowRight');await page.clock.runFor(4000);await page.keyboard.up('ArrowRight');
    assert.ok((await read()).failed);assert.ok(await page.locator('#failure').isVisible());
    assert.doesNotMatch(await page.locator('#fail-title').innerText(),/undefined/);
    await page.locator('#retry').click();assert.ok(!(await read()).failed);assert.deepEqual((await read()).boxes.map(b=>b.x),[100,210]);
    for(const width of [1280,375,320]){
      await page.setViewportSize({width,height:1000});
      for(const l of levels){await page.selectOption('#levels',String(l.id));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(out,`lab-${l.id+1}-${width}.png`),fullPage:true});}
    }
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'lab-playthrough.json'),JSON.stringify(proof,null,2));
    console.log('三關鍵盤操作、教學播放、重來、失焦、手機排版與主線存檔隔離通過。');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
