import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import warmup from '../../together-home/warmup.js';
const {chromium}=await import(process.env.PLAYWRIGHT_PATH?pathToFileURL(path.join(process.env.PLAYWRIGHT_PATH,'index.mjs')).href:'playwright');
const root=process.env.CLASSROOM_ROOT?path.resolve(process.env.CLASSROOM_ROOT):fileURLToPath(new URL('../dist/classroom-site',import.meta.url)),out=fileURLToPath(new URL('../outputs/lesson-seven',import.meta.url));fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{
 let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403).end();return;}
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream'}).end(data);});
});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const base=`http://127.0.0.1:${server.address().port}`,page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];
 const watch=tab=>{tab.on('pageerror',e=>errors.push(e.message));tab.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base)&&!r.url().endsWith('/favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});};watch(page);
 page.on('popup',watch);
 await page.goto(base+'/classroom/#seventh-course');await page.evaluate(()=>document.fonts.ready);
 const seventh=page.locator('#seventh-course'),sixth=page.locator('#sixth-course');
 assert.match(await seventh.innerText(),/第 7 週課程/);assert.equal(await sixth.locator('a[href*="together-home"]').count(),0);
 assert.equal(await seventh.locator('a[href="/together-home/"]').count(),1);assert.equal(await seventh.locator('a[href="/together-home/?tip=true"]').count(),1);
 assert.ok(await seventh.evaluate(s=>!!(document.querySelector('#sixth-course').compareDocumentPosition(s)&Node.DOCUMENT_POSITION_FOLLOWING)));
 for(const width of [1280,375,320]){await page.setViewportSize({width,height:1000});await seventh.scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await seventh.screenshot({path:path.join(out,`catalog-${width}.png`)});}
 for(const [href,tips] of [['/together-home/',false],['/together-home/?tip=true',true]]){
  const popupPromise=page.waitForEvent('popup');await seventh.locator(`a[href="${href}"]`).click();const game=await popupPromise;await game.waitForFunction(()=>typeof readGame==='function');
  assert.equal(await game.locator('#levels option').count(),21);assert.equal(await game.locator('#answer-panel').isVisible(),tips);
  assert.equal(await game.locator('#solution-controls').isVisible(),tips);
  await game.clock.install();await game.clock.pauseAt(Date.now()+1000);await game.addStyleTag({content:'button{transition:none!important}'});
  if(tips){assert.equal(await game.locator('#intro').isVisible(),false);await game.locator('#solution-play').click();await game.clock.runFor(15000);assert.ok(await game.evaluate(()=>readGame().won));assert.match(await game.locator('#win-title').innerText(),/示範完成/);}
  else{
   assert.equal(await game.locator('#intro').evaluate(d=>d.matches(':modal')),true);await game.locator('#intro-start').click();await game.clock.runFor(2600);assert.equal(await game.locator('#intro-bubble').isVisible(),true);assert.match(await game.locator('#intro-line').innerText(),/你也要回家/);
   await game.clock.runFor(11500);assert.equal(await game.evaluate(()=>readGame().level),-1);assert.equal(await game.locator('#message').isVisible(),true);assert.equal(await game.locator('#intro').isVisible(),false);
   const codes=['a','d','w','s','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'];let held=0;
   for(const [frames,mask] of warmup.tape.actions){for(let i=0;i<codes.length;i++){if((held&(1<<i))&&!(mask&(1<<i)))await game.keyboard.up(codes[i]);if(!(held&(1<<i))&&(mask&(1<<i)))await game.keyboard.down(codes[i]);}held=mask;await game.clock.runFor(Math.round(frames*1000/120));}
   await game.clock.runFor(200);for(let i=0;i<codes.length;i++)if(held&(1<<i))await game.keyboard.up(codes[i]);assert.ok(await game.evaluate(()=>readGame().won));await game.locator('#next').click();assert.equal(await game.evaluate(()=>readGame().level),0);
  }
  assert.equal(await game.evaluate(()=>localStorage.getItem('together-home-curated-v4')),null,'暖身及教師示範不寫入正式通關');
  await game.close();
 }
 assert.deepEqual(errors,[]);console.log('Built catalog, desktop/mobile layout, student link → bubbles → real-keyboard warmup → level 1, and teacher link → solution playback passed without missing assets.');
}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
