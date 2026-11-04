const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const url=process.env.STUDIO_URL||'http://127.0.0.1:18136/';
const output=path.resolve(__dirname,'../artifacts/online');
fs.mkdirSync(output,{recursive:true});
const logs=[];
const record=(name,data={})=>{logs.push({time:new Date().toISOString(),name,...data});console.log(name);};
async function open(browser,name,mobile=false) {
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1080,height:830},isMobile:mobile,hasTouch:mobile});
  const page=await context.newPage();
  page.on('console',m=>{if(/Exception|error|failed|shutdown|disconnect|joined room/i.test(m.text()))record(name+' console',{text:m.text().slice(0,320)});});
  page.on('pageerror',e=>record('pageerror',{name,error:e.message}));
  page.on('websocket',socket=>record(name+' socket',{address:new URL(socket.url()).host}));
  const cdp=await context.newCDPSession(page);
  await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:true});
  // Observe only the WebGL view events already sent to the player's browser.
  await page.addInitScript(()=>{
    let ui;Object.defineProperty(window,'paperStudio',{get:()=>ui,set(value){
      ui=value;const render=ui.view;
      window.exhibitTimes=[];window.awardTimes={};
      ui.view=v=>{
        window.roomView=v;render(v);
        if(v.phase==='reveal' && v.winner>0 && !window.awardTimes[v.round]){
          window.awardTimes[v.round]={shown:Date.now(),text:document.querySelector('#award-title').textContent};
        }
        const award=window.awardTimes[v.round-1];
        if(v.phase==='draw' && award && !award.next)award.next=Date.now();
        const previous=window.exhibitTimes.at(-1);
        if(v.phase==='reveal' && (previous?.round!==v.round||previous.slide!==v.slide))
          window.exhibitTimes.push({round:v.round,slide:v.slide,time:Date.now()});
      };
    }});
  });
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.roomView && !document.getElementById('join').disabled,null,{timeout:120000});
  return {context,page,cdp,name};
}
const view=p=>p.page.evaluate(()=>window.roomView);
const wait=(p,fn,arg,ms=45000)=>p.page.waitForFunction(fn,arg,{timeout:ms});
async function pickAlias(p,avatar){
  for(let i=0;i<400;i++){
    const old=(await view(p)).identity;if(old===avatar)return;
    await p.page.click('#identity');await wait(p,n=>roomView.identity!==n,old);
  }
  throw Error('隨機身分未抽到測試角色');
}
async function checkSelf(p,role){
  const self=await p.page.evaluate(()=>document.querySelector('#avatar').textContent+' '+document.querySelector('#name').textContent);
  assert.equal(await p.page.locator('#self-id').innerText(),'你是'+role+' · '+self);
  assert.ok(await p.page.locator('#self-id').isVisible());
}
async function snapshot(p,file){await p.page.screenshot({path:path.join(output,file+'.png')});}
async function inkPixels(p){
  const png=await p.page.locator('#unity-canvas').screenshot();
  return p.page.evaluate(async data=>{
    const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();
    const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
    const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
    // Sample the drawing area. Frame decorations and transient join notifications sit at the edges.
    const rgba=ctx.getImageData(Math.floor(img.width*.1),Math.floor(img.height*.1),Math.floor(img.width*.8),Math.floor(img.height*.65)).data;
    let n=0;for(let i=0;i<rgba.length;i+=4)if(Math.min(rgba[i],rgba[i+1],rgba[i+2])<220)n++;
    return n;
  },png.toString('base64'));
}
async function stroke(p,mobile=false) {
  const box=await p.page.locator('#unity-canvas').boundingBox();
  const pts=[[.2,.3],[.4,.25],[.5,.64],[.7,.65]].map(([x,y])=>({x:box.x+x*box.width,y:box.y+y*box.height}));
  if(mobile){
    const touch=(type,points)=>p.cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
    await touch('touchStart',[pts[0]]);for(const pt of pts.slice(1))await touch('touchMove',[pt]);await touch('touchEnd',[]);
  }else{
    await p.page.mouse.move(pts[0].x,pts[0].y);await p.page.mouse.down();
    for(const pt of pts.slice(1))await p.page.mouse.move(pt.x,pt.y,{steps:3});
    await p.page.mouse.up();
  }
}
async function run(){
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
  const players=[];
  try{
    const host=await open(browser,'host'),a=await open(browser,'first'),b=await open(browser,'late',true);
    players.push(host,a,b);
    await snapshot(host,'01-home');const prev=(await view(a)).identity;
    await a.page.click('#identity');await wait(a,n=>roomView.identity!==n,prev);
    await a.page.click('#join');await wait(a,()=>roomView.phase==='home' && !roomView.busy && !document.querySelector('#toast').hidden && /開房/.test(document.querySelector('#toast').textContent));
    record('無房與更換身分');
    await pickAlias(a,0); // 貓貓怪
    await host.page.click('#host');await wait(host,()=>roomView.host && roomView.phase==='wait');
    await a.page.click('#join');await wait(a,()=>roomView.phase==='wait');await wait(host,()=>roomView.people.length===1);
    await checkSelf(host,'小工程師');await checkSelf(a,'師傅');
    assert.equal(await a.page.locator('#roster .self-tag').count(),1);
    assert.equal(await host.page.locator('#difficulty option').count(),5);
    assert.equal(await a.page.locator('#prompt-tools').isVisible(),false);
    await host.page.selectOption('#difficulty','1');await wait(host,()=>roomView.level===1);
    await host.page.waitForTimeout(250);
    const preview=await host.page.locator('#unity-canvas').screenshot();
    await host.page.click('#reroll');await host.page.waitForTimeout(250);
    assert.ok(!preview.equals(await host.page.locator('#unity-canvas').screenshot()));
    await host.page.click('#start');await wait(a,()=>roomView.phase==='draw');
    const first=await view(a);
    assert.equal(first.original,'');assert.ok(first.seconds>=177 && first.seconds<=180);
    assert.equal(await host.page.locator('#draw-title').isVisible(),false);assert.ok(!('title' in await view(host)));
    assert.equal(await host.page.locator('#role').innerText(),'大聲說出你的作品 讓師傅們幫你完工!');
    assert.equal(await a.page.locator('[data-chalk]').count(),7);assert.ok(await inkPixels(host)>40);
    assert.equal(await a.page.getByRole('button',{name:'黑色粉筆'}).getAttribute('aria-pressed'),'true');
    await snapshot(host,'02-host-prompt');
    assert.equal(await inkPixels(a),0);
    await stroke(a);await a.page.waitForTimeout(400);assert.ok(await inkPixels(a)>40);
    await a.page.click('#undo');await a.page.waitForTimeout(400);assert.equal(await inkPixels(a),0);
    await a.page.getByRole('button',{name:'黑色粉筆'}).click();await stroke(a);
    const colored=await inkPixels(a);await a.page.click('[data-tool=eraser]');await stroke(a);assert.equal(await inkPixels(a),0);
    await a.page.click('#undo');assert.equal(await inkPixels(a),colored);
    await a.page.click('#clear');assert.equal(await inkPixels(a),0);
    await a.page.click('#undo');assert.equal(await inkPixels(a),colored);
    await a.page.click('#mark');await wait(host,()=>roomView.people[0]?.done);
    await wait(a,()=>roomView.done&&!roomView.markPending);
    assert.ok(await a.page.locator('#undo').isDisabled());const lockedInk=await inkPixels(a);
    assert.ok(await a.page.locator('#clear').isDisabled());assert.ok(await a.page.locator('[data-tool=eraser]').isDisabled());
    const seconds=(await view(a)).seconds;
    await host.page.selectOption('#difficulty','4');await wait(host,()=>roomView.level===4);
    await wait(a,()=>document.querySelector('#toast').textContent==='出題者換題了');
    assert.equal((await view(a)).done,true);assert.equal((await view(a)).round,first.round);
    assert.ok((await view(a)).seconds<=seconds);assert.equal(await inkPixels(a),lockedInk);
    const originalInk=await inkPixels(host);
    await a.page.mouse.click((await a.page.locator('#unity-canvas').boundingBox()).x+180,360);
    assert.equal(await inkPixels(a),lockedInk);
    if([0,7].includes((await view(b)).identity))await pickAlias(b,1);
    await b.page.click('#join');await wait(b,()=>roomView.phase==='draw');
    const late=await view(b),now=await view(host);assert.ok(!('title' in late));assert.ok(late.seconds<180);
    assert.ok(Math.abs(now.seconds-late.seconds)<=2);await checkSelf(b,'師傅');
    await wait(b,()=>roomView.people.some(p=>p.avatar===0&&p.online&&p.done));
    const beforeLeave=(await view(a)).me;await a.page.click('#leave');await wait(a,()=>roomView.phase==='home');
    await wait(host,()=>!roomView.people[0]?.online && document.querySelector('#roster').innerText.includes('已離開'));
    assert.equal(await host.page.locator('#who').innerText(),'1 位師傅');
    await pickAlias(a,7); // 兔耳朵
    await a.page.click('#join');await wait(a,()=>roomView.phase==='draw'&&roomView.me>0);
    assert.equal((await view(a)).me,beforeLeave);await a.page.waitForTimeout(400);
    for(const p of [host,a,b]){
      await wait(p,id=>roomView.people.some(x=>x.id===id&&x.avatar===7&&x.online&&x.done),beforeLeave);
      assert.equal((await view(p)).people.length,2);
      assert.match(await p.page.locator('#roster li[data-id="'+beforeLeave+'"]').textContent(),/🐰\s*兔耳朵/);
      assert.ok(!(await p.page.locator('#roster').innerText()).includes('貓貓怪'));
    }
    await checkSelf(a,'師傅');
    record('貓貓怪離房換兔耳朵，同座位與作品保留，三端皆顯示新名字和頭像');
    assert.equal(await inkPixels(a),lockedInk);assert.ok((await view(a)).done);
    await a.page.click('#mark');await wait(a,()=>!roomView.done&&!roomView.markPending);
    await a.page.locator('[data-chalk="2"]').click();await a.page.locator('[data-tool=box]').click();await stroke(a);assert.ok(await inkPixels(a)>lockedInk);
    await a.page.click('#mark');await wait(host,()=>roomView.people[0].done);
    record('勾選鎖筆、名單離席、重連還原完成狀態、取消後可再畫');
    assert.notEqual(late.identity,(await view(a)).identity);
    assert.equal(await b.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await b.page.locator('[data-chalk="5"]').click();await b.page.locator('[data-tool=tri]').click();await stroke(b,true);await snapshot(b,'03-late-phone');
    record('手機中途加入並以觸控繪圖',{seconds:late.seconds});
    const replacement=await open(browser,'new-host');players.push(replacement);
    const until=(await view(host)).seconds;await replacement.page.click('#host');
    await wait(replacement,()=>roomView.host && roomView.phase==='draw');
    await wait(host,()=>roomView.phase==='home');
    await checkSelf(replacement,'小工程師');await pickAlias(host,7); // Taken by the existing artist.
    assert.equal((await view(replacement)).round,first.round);assert.equal((await view(replacement)).level,4);
    assert.ok(Math.abs(until-(await view(replacement)).seconds)<15);
    await wait(replacement,()=>roomView.people.filter(p=>p.online).length===2 && roomView.people.some(p=>p.done));
    assert.equal(await inkPixels(replacement),originalInk);
    await wait(b,()=>roomView.people.some(p=>p.done));
    record('新開房者接手同一題、倒數、名單與勾選；原出題者退場');
    assert.ok(await b.page.locator('#end').isHidden());
    await replacement.page.click('#end');
    const audience=[replacement,a,b];
    await Promise.all(audience.map(async p=>{
      await wait(p,()=>roomView.phase==='reveal' && roomView.slide===-2 && document.querySelectorAll('#gallery img').length===1);
      assert.equal(await p.page.locator('#gallery .tile').count(),1);
      assert.equal(await p.page.locator('#gallery .original strong').innerText(),'原圖');
      assert.ok(await p.page.locator('#next').isHidden());
      await checkSelf(p,p===replacement?'小工程師':'師傅');
    }));
    await snapshot(replacement,'04-answer-only');
    for(const i of [0,1]){
      const expectedLabel=await (i===0?a:b).page.evaluate(()=>document.querySelector('#avatar').textContent+' '+document.querySelector('#name').textContent);
      await Promise.all(audience.map(async p=>{
        await wait(p,n=>roomView.phase==='reveal'&&roomView.slide===n&&document.querySelectorAll('#gallery img').length===2,i);
        const s=await view(p);
        assert.deepEqual(s.showOrder,[first.me,late.me]);
        assert.equal(await p.page.locator('#gallery .original strong').innerText(),'原圖');
        assert.equal(await p.page.locator('#show-status').innerText(),`作品 ${i+1} / 2`);
        assert.equal(await p.page.locator('#gallery .tile:not(.original) strong').innerText(),expectedLabel);
        assert.ok(await p.page.locator('#next').isHidden());
      }));
      if(i===0){
        await Promise.all([snapshot(replacement,'04-single-work'),snapshot(b,'04-single-phone')]);
        await replacement.page.locator('#next').evaluate(el=>el.click());
        assert.equal((await view(replacement)).phase,'reveal');
        // Join during the first sheet so room setup can overlap the next transition.
        await host.page.click('#join');
      }else{
        await wait(host,()=>roomView.phase==='reveal' && roomView.me>0);
        assert.deepEqual((await view(host)).showOrder,[first.me,late.me]);
        assert.notEqual((await view(host)).identity,7);await checkSelf(host,'師傅');
      }
    }
    for(const p of [...audience,host]){
      await wait(p,()=>roomView.phase==='reveal'&&roomView.slide===-1&&document.querySelectorAll('#gallery img').length===3);
      assert.ok((await view(p)).original);
      assert.equal(await p.page.locator('#gallery .original strong').innerText(),'原圖');
      const colors=await p.page.evaluate(async()=>{
        const lists=[];
        for(const img of document.querySelectorAll('#gallery img')){
          await img.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
          const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
          const bytes=ctx.getImageData(0,0,256,256).data,used=new Set();
          for(let i=0;i<bytes.length;i+=4)used.add(((bytes[i]<<16)|(bytes[i+1]<<8)|bytes[i+2]).toString(16).toUpperCase().padStart(6,'0'));
          lists.push([...used].map(c=>'#'+c));
        }
        return lists;
      });
      const palette=(await view(p)).palette;
      assert.ok(colors[0].length>=3&&!colors[0].includes(palette[7]));
      assert.ok(colors[1].includes(palette[7])&&colors[1].includes(palette[2]));
      assert.ok(colors[2].includes(palette[5]));
    }
    const transitions=await Promise.all(audience.map(p=>p.page.evaluate(()=>window.exhibitTimes.filter(x=>x.round===1))));
    for(const events of transitions){
      assert.deepEqual(events.map(x=>x.slide),[-2,0,1,-1]);
      for(let i=1;i<=3;i++)assert.ok(Math.abs(events[i].time-events[i-1].time-3000)<850,'答案及每人作品各展示三秒');
    }
    for(const i of [1,2,3]){
      const times=transitions.map(log=>log[i].time);
      assert.ok(Math.max(...times)-Math.min(...times)<850,'各端應同步輪播');
    }
    record('先展示答案三秒，再同步逐人展示三秒，中途加入跟上現有畫面',{transitions});
    record('提前結束立即揭曉，保留已勾選及未勾選的作品');
    const pick='button.tile:not(.original)';
    await replacement.page.locator(pick).first().waitFor({state:'visible'});
    assert.equal(await a.page.locator(pick).count(),0);
    assert.ok(await replacement.page.locator('#next').isHidden());
    assert.equal(await replacement.page.locator('#confirm-pick').innerText(),'選這張!');
    assert.ok(await replacement.page.locator('#confirm-pick').isDisabled());
    assert.ok(await a.page.locator('#confirm-pick').isHidden());
    assert.ok(await a.page.locator('#next').isHidden());await a.page.locator('#next').evaluate(el=>el.click());
    await replacement.page.locator(pick).last().click();
    await replacement.page.locator(pick).first().click();
    assert.equal(await replacement.page.locator(pick).first().getAttribute('aria-pressed'),'true');
    assert.equal(await replacement.page.locator(pick).last().getAttribute('aria-pressed'),'false');
    await replacement.page.locator('#next').evaluate(el=>el.click());
    await snapshot(replacement,'04-gallery');await snapshot(b,'05-phone-gallery');
    await a.page.waitForTimeout(5500);
    for(const p of audience){
      assert.equal((await view(p)).winner,-1);assert.equal((await view(p)).round,1);
      assert.ok(await p.page.locator('#award').isHidden());
    }
    await host.page.click('#leave');await wait(host,()=>roomView.phase==='home');
    const awardText=(await a.page.locator('#name').textContent())+'的作品最棒!';
    await replacement.page.click('#confirm-pick');
    await Promise.all(audience.map(async p=>{
      await wait(p,id=>roomView.phase==='reveal' && roomView.winner===id,first.me);
      assert.equal(await p.page.locator('#award-title').innerText(),awardText);
      assert.ok(await p.page.locator('#award-art').isVisible());
      assert.ok(await p.page.locator('#next').isHidden());
    }));
    await replacement.page.locator('#next').evaluate(el=>el.click());
    await Promise.all([snapshot(replacement,'06-award'),snapshot(b,'06-phone-award')]);
    // Request another teacher while the award clock is running.
    await host.page.click('#host');
    await wait(a,()=>roomView.phase==='draw'&&roomView.round===2);
    await wait(b,()=>roomView.phase==='draw'&&roomView.round===2);
    await wait(host,()=>roomView.host && roomView.phase==='draw'&&roomView.round===2);
    await wait(replacement,()=>roomView.phase==='home');
    const awards=await Promise.all([a,b].map(p=>p.page.evaluate(()=>window.awardTimes[1])));
    for(const award of awards){
      assert.equal(award.text,awardText);
      assert.ok(Math.abs(award.next-award.shown-3000)<900,'公布三秒後才進下一題');
    }
    record('可以改選，確認後全班看到得獎作品，三秒後自動開下一題',{awards});
    const began=awards[0].next;assert.ok((await view(host)).host);assert.equal((await view(b)).host,false);
    assert.equal((await view(a)).done,false);
    assert.equal((await view(a)).original,'');assert.equal((await view(a)).winner,-1);
    assert.equal(await inkPixels(a),0);
    await wait(host,()=>roomView.phase==='reveal',null,195000);
    const elapsed=(Date.now()-began)/1000;assert.ok(elapsed>175 && elapsed<188,'180 秒實時計時：'+elapsed);
    record('下一輪清空完成狀態，正常倒數仍在三分鐘結束',{elapsed});
    // The participating blank sheets each get their own turn; switching teachers mid-show
    // must carry the existing shared schedule forward.
    await wait(a,()=>roomView.slide===0&&document.querySelector('#gallery .blank')?.textContent==='白紙');
    await replacement.page.click('#host');await wait(replacement,()=>roomView.host&&roomView.phase==='reveal');
    await wait(host,()=>roomView.phase==='home');
    await wait(replacement,()=>roomView.slide===-1&&roomView.canPick);
    await wait(a,()=>roomView.phase==='reveal'&&roomView.slide===-1);
    const blankTimes=await a.page.evaluate(()=>window.exhibitTimes.filter(x=>x.round===2));
    assert.deepEqual(blankTimes.map(x=>x.slide),[-2,0,1,-1]);
    assert.ok(Math.abs(blankTimes[3].time-blankTimes[1].time-6000)<850);
    record('空白作品與出題者交接沿用原展示時間',{blankTimes});
    for(const p of [a,b]){await p.page.click('#leave');await wait(p,()=>roomView.phase==='home');}
    await wait(replacement,()=>roomView.people.every(p=>!p.online));
    await replacement.page.click('#next');await wait(replacement,()=>roomView.phase==='draw'&&roomView.round===3);
    await replacement.page.click('#end');await wait(replacement,()=>roomView.phase==='reveal'&&roomView.slide===-2);
    assert.equal(await replacement.page.locator('#gallery .original img').count(),1);
    await wait(replacement,()=>roomView.slide===-1 && roomView.canPick&&roomView.showOrder.length===0);
    await b.page.click('#join');await wait(b,()=>roomView.phase==='reveal'&&roomView.slide===-1);
    replacement.page.once('dialog',d=>d.accept());await replacement.page.click('#leave');
    await wait(b,()=>roomView.phase==='home',null,65000);
    record('僅房主可選、身分固定、下一輪清空、房主離開關房');
    assert.ok(!logs.some(e=>e.name==='pageerror'));
  }catch(e){
    for(const p of players){try{await snapshot(p,'failure-'+p.name);record('failure-view',{player:p.name,view:await view(p)});}catch{}}
    throw e;
  } finally{
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(logs,null,2));await browser.close();
  }
}
run().catch(e=>{console.error(e);process.exitCode=1;});
