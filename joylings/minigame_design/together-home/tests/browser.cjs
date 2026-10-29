const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),G=require('../core.js'),{playLevel}=require('./play-level.cjs');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Advance only through tick(): screenshots and assertions must not keep moving players.
 await page.clock.install({time:new Date('2026-10-28T00:00:00Z')});await page.clock.pauseAt(new Date('2026-10-28T00:00:01Z'));
 const teacherUrl=new URL(process.env.TOGETHER_URL||'http://127.0.0.1:18128/');teacherUrl.searchParams.set('tip','true');await page.goto(teacherUrl.href);
 const read=()=>page.evaluate(()=>readGame()),output=path.join(__dirname,'../test-output'),down=new Set();fs.mkdirSync(output,{recursive:true});
 const keys=[{left:'a',right:'d',jump:'w',special:'s'},{left:'ArrowLeft',right:'ArrowRight',jump:'ArrowUp',special:'ArrowDown'}];
 async function release(){for(const k of down)await page.keyboard.up(k);down.clear();}
 async function tick(frames,commands){
  const before=await read();
  const wanted=new Set();commands.forEach((c,i)=>{if(c.axis)wanted.add(c.axis>0?keys[i].right:keys[i].left);if(c.jump)wanted.add(keys[i].jump);if(c.special)wanted.add(keys[i].special);});
  for(const k of [...down])if(!wanted.has(k)){await page.keyboard.up(k);down.delete(k);}
  for(const k of wanted)if(!down.has(k)){await page.keyboard.down(k);down.add(k);}
  await page.clock.runFor(Math.round(frames*1000/120));
  for(const k of [keys[0].jump,keys[1].jump,keys[0].special,keys[1].special])if(down.has(k)){await page.keyboard.up(k);down.delete(k);}
  const after=await read();
  if(after.collected.some((v,i)=>v&&!before.collected[i])){
   assert.equal(await page.locator('.key-slot.collected').count(),after.collected.filter(Boolean).length);
   for(let i=0;i<2;i++){const n=after.collectedBy.filter(actor=>actor===i).length;if(n)assert.match(await page.locator(`#player-status-${i}`).innerText(),new RegExp(`${n} 把鑰匙`));}
   if([0,4].includes(after.level))await page.screenshot({path:path.join(output,`level-${after.level+1}-key-${after.collected.filter(Boolean).length}.png`),fullPage:true});
  }
 }
 assert.equal(await page.title(),'貓狗一起回家｜合作通關');
 assert.equal(await page.locator('#levels option').count(),G.levels.length);
 await page.evaluate(()=>localStorage.setItem('together-home-platform-v3',JSON.stringify([0,1,10,19])));await page.reload();
 assert.equal(await page.locator('#levels option').filter({hasText:'✓'}).count(),3,'依舊關卡識別碼對應精選進度');
 assert.equal(await page.locator('#levels optgroup,[data-campaign],[data-trial]').count(),0,'只有平面 1～20 關選單');
 assert.ok(!(await page.locator('#levels option').allTextContents()).slice(10).some(t=>t.startsWith('✓')),'重製後十關不誤標已完成');
 await page.evaluate(()=>localStorage.setItem('together-home-curated-v4',JSON.stringify(['original-0','preview-swap-1','preview-phase-1','preview-gravity-1','preview-magnet-1','preview-relay-1'])));await page.reload();
 assert.equal(await page.locator('#levels option').filter({hasText:'✓'}).count(),4,'三種保留玩法的進度仍保留，新玩法不誤標');
 assert.match(await page.locator('#levels option[value="1"]').innerText(),/^✓/);
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('together-home-platform-v3'))),[0,1,10,19],'遷移不覆寫舊存檔');
 await page.evaluate(()=>{localStorage.removeItem('together-home-curated-v4');localStorage.removeItem('together-home-platform-v3');});await page.reload();
 if(!process.env.TOGETHER_UI_ONLY){
 // A single dog jumps over the untouched crate, walks off the blue pad,
 // and keeps running/jumping at the wall. No direct state setup is used.
 await page.selectOption('#levels','9');
 await tick(10,[{}, {axis:1}]);await tick(120,[{}, {axis:1,jump:true}]);
 await tick(240,[{}, {axis:1}]);await tick(120,[{}, {axis:1,jump:true}]);
 let regression=await read();assert.equal(regression.boxes[0].x,120);assert.equal(G.gateOpen(regression,0),false);assert.ok(regression.players[1].x+38<=G.levels[9].gates[0].x);
 console.log('Level 10 single-player wall exploit blocked via real keyboard.');
 const from=Number(process.env.TOGETHER_FROM||1),proof=from===1?[]:JSON.parse(fs.readFileSync(path.join(output,'twenty-playthrough.json'),'utf8')).filter(p=>p.level<from);
 assert.equal(proof.length,from-1,'續測必須有每一關先前的實玩紀錄');
 for(const [i,p] of proof.entries()){assert.equal(p.level,i+1);assert.equal(p.name,G.levels[i].name);assert.ok(p.won&&p.collected.every(Boolean)&&p.exited.every(Boolean));}
 if(proof.length){await page.evaluate(saved=>localStorage.setItem('together-home-curated-v4',JSON.stringify(saved)),proof.map(p=>G.levels[p.level-1].saveKey));await page.reload();console.log(`Resume at level ${from}; ${proof.length} earlier keyboard wins retained.`);}
 for(const l of G.levels.slice(from-1)){
  await release();await page.selectOption('#levels',String(l.id));
  assert.equal(await page.locator('#answer-panel').isVisible(),true);
  for(const i of [0,1])assert.ok(await page.locator(`[data-player="${i}"] .special-action:visible`).count()<=1);
  const initial=await read();
  assert.equal(await page.locator('#answer-toggle').getAttribute('aria-expanded'),'true');
  assert.match(await page.locator('#answer-title').innerText(),new RegExp(`第 ${l.id+1} 關`));
  assert.ok(await page.locator('#answer-steps li').count()>=3);
  assert.deepEqual((await read()).collected,initial.collected,'看解答不會給鑰匙或過關');
  await page.locator('#answer-toggle').click();await page.locator('#game').focus();
  await page.screenshot({path:path.join(output,`level-${l.id+1}.png`),fullPage:true});
  let ticks=0;await playLevel({read,tick:async(n,c)=>{ticks++;await tick(n,c);}},l);
  const end=await read();assert.ok(end.won);assert.ok(end.collected.every(Boolean));assert.ok(end.players.every(p=>p.exited));assert.ok(await page.locator('#success').isVisible());
  assert.equal(await page.locator('#finale').evaluate(d=>d.open),l.id===19,'只有全二十關完成才出現舞台');
  proof.push({level:l.id+1,name:l.name,keyboardSteps:ticks,won:end.won,collected:end.collected,exited:end.players.map(p=>p.exited)});
  fs.writeFileSync(path.join(output,'twenty-playthrough.json'),JSON.stringify(proof,null,2));
  await page.screenshot({path:path.join(output,`level-${l.id+1}-won.png`),fullPage:true});console.log(`Browser level ${l.id+1} passed (${ticks} keyboard steps)`);

 }
 await release();assert.deepEqual((await page.evaluate(()=>JSON.parse(localStorage.getItem('together-home-curated-v4')))).sort(),G.levels.map(l=>l.saveKey).sort());
 assert.equal(await page.locator('#finale-title').innerText(),'你們是最佳拍檔！');assert.ok(await page.locator('#finale-close').evaluate(b=>b===document.activeElement));
 const opening=await page.locator('#finale-art').evaluate(c=>c.toDataURL());await page.clock.runFor(3200);assert.notEqual(await page.locator('#finale-art').evaluate(c=>c.toDataURL()),opening,'貓狗走上舞台');
 await page.screenshot({path:path.join(output,'twenty-finale-desktop.png'),fullPage:true});
 for(const width of [375,320]){await page.setViewportSize({width,height:800});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await page.locator('#finale').evaluate(d=>d.scrollWidth<=d.clientWidth));await page.screenshot({path:path.join(output,`twenty-finale-${width}.png`),fullPage:true});}
 await page.locator('#finale-close').click();await page.setViewportSize({width:1280,height:900});
 await page.locator('#next').click();assert.equal((await read()).level,0);assert.equal((await read()).won,false);await page.reload();assert.equal(await page.locator('#levels option').filter({hasText:'✓'}).count(),G.levels.length);assert.equal(await page.locator('#finale').evaluate(d=>d.open),false);
 }
 await page.keyboard.down('w');await page.clock.runFor(1200);assert.ok((await read()).players[0].grounded,'no auto jump on hold');await page.keyboard.up('w');
 await page.keyboard.down('d');await page.keyboard.down('ArrowRight');await page.clock.runFor(200);let s=await read();assert.ok(s.players[0].x>180&&s.players[1].x>290);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));const x=(await read()).players[0].x;await page.clock.runFor(200);assert.equal((await read()).players[0].x,x);await page.keyboard.up('d');await page.keyboard.up('ArrowRight');
 await page.selectOption('#levels','9');await page.setViewportSize({width:375,height:800});await page.screenshot({path:path.join(output,'ten-levels-mobile.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const touch=page.locator('[data-player="0"] [data-action="right"]');await touch.scrollIntoViewIfNeeded();const box=await touch.boundingBox();const before=(await read()).players[0].x;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.clock.runFor(200);await page.mouse.up();assert.ok((await read()).players[0].x>before);
 await page.setViewportSize({width:320,height:800});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.ok(await page.locator('#answer-steps li').evaluateAll(nodes=>nodes.every(node=>parseFloat(getComputedStyle(node).fontSize)>=18)));
 await page.screenshot({path:path.join(output,'answers-mobile-320.png'),fullPage:true});
 await page.locator('#restart').click();assert.equal((await read()).level,9);assert.ok((await read()).collected.every(v=>!v));assert.ok((await read()).collectedBy.every(v=>v===null));assert.equal(await page.locator('.key-slot.collected').count(),0);assert.equal(await page.locator('#answer-panel').isVisible(),true);assert.ok((await read()).latched.every(v=>!v));assert.deepEqual(errors,[]);
 await page.goto(new URL('?level=11&tip=true',process.env.TOGETHER_URL||'http://127.0.0.1:18128/').href);assert.equal((await read()).level,10);
 for(const width of [375,320]){await page.setViewportSize({width,height:800});await page.selectOption('#levels','9');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(output,`advanced-mobile-${width}.png`),fullPage:true});}
 for(const {preview,id} of G.levels.filter(l=>l.preview)){
  await page.goto(new URL(`?preview=${preview}&tip=true`,process.env.TOGETHER_URL||'http://127.0.0.1:18128/').href);assert.equal((await read()).level,id);
  assert.equal(await page.locator('#levels').inputValue(),String(id));
  for(const width of [1280,375,320]){
   await page.setViewportSize({width,height:900});await page.screenshot({path:path.join(output,`preview-${preview}-${width}.png`),fullPage:true});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert.ok(await page.locator('.pad button:visible').evaluateAll(buttons=>buttons.every(b=>[...b.children].every(span=>{const r=span.getBoundingClientRect(),p=b.getBoundingClientRect();return r.left>=p.left-1&&r.right<=p.right+1;}))), `${preview}/${width} 按鈕文字不溢出`);
  }
  if(preview==='swap'){
   assert.match(await page.locator('[data-player="0"] [data-action=jump]').innerText(),/狗跳/);
   await tick(10,[{jump:true},{}]);let s=await read();assert.ok(s.players[1].vy<0);assert.equal(s.players[0].grounded,true);
  }
 }
 assert.deepEqual(errors,[]);
 console.log(process.env.TOGETHER_UI_ONLY?'Interface, touch, migration, deep links and mobile layouts passed.':'All campaign levels passed via real keyboard. Migration, answers, pickups, controls, deep links and mobile layouts passed.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
