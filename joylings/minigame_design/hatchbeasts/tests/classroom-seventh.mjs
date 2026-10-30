import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_PATH?pathToFileURL(path.join(process.env.PLAYWRIGHT_PATH,'index.mjs')).href:'playwright');
const root=process.env.CLASSROOM_ROOT?path.resolve(process.env.CLASSROOM_ROOT):fileURLToPath(new URL('../dist/classroom-site',import.meta.url)),out=fileURLToPath(new URL('../outputs/lesson-seven',import.meta.url));fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{
 let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403).end();return;}
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream'}).end(data);});
});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});try{
 const base=`http://127.0.0.1:${server.address().port}`,page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];
 const online='https://scozirge.github.io/together-online/',unity=process.env.TOGETHER_UNITY_URL||'http://127.0.0.1:18130/';
 await page.context().route(online+'**',async route=>{const response=await route.fetch({url:unity+route.request().url().slice(online.length)});await route.fulfill({response});});
 const watch=tab=>{tab.on('pageerror',e=>errors.push(e.message));tab.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base)&&!r.url().endsWith('/favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});};watch(page);
 page.on('popup',watch);
 await page.goto(base+'/classroom/#seventh-course');await page.evaluate(()=>document.fonts.ready);
 const seventh=page.locator('#seventh-course'),sixth=page.locator('#sixth-course');
 assert.match(await seventh.innerText(),/第 7 週課程/);assert.equal(await sixth.locator('a[href*="together-home"]').count(),0);
 assert.equal(await seventh.locator('a[href="'+online+'"]').count(),1);assert.equal(await seventh.locator('a[href="'+online+'?tip=true"]').count(),1);assert.match(await seventh.innerText(),/手機.*搖桿/);
 assert.ok(await seventh.evaluate(s=>!!(document.querySelector('#sixth-course').compareDocumentPosition(s)&Node.DOCUMENT_POSITION_FOLLOWING)));
 for(const width of [1280,375,320]){await page.setViewportSize({width,height:1000});await seventh.scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await seventh.screenshot({path:path.join(out,`catalog-${width}.png`)});}
 for(const [href,tips] of [[online,false],[online+'?tip=true',true]]){
  const popupPromise=page.waitForEvent('popup');await seventh.locator(`a[href="${href}"]`).click();const game=await popupPromise;
  await game.waitForFunction(()=>window.togetherUnityState?.initialized&&window.unityInstance,null,{timeout:180000});
  assert.equal(await game.locator('#levels option').count(),21);assert.equal(await game.locator('#teacher').isVisible(),tips);
  if(tips){await game.locator('#demo').click();await game.waitForFunction(()=>window.togetherUnityState.state.won,null,{timeout:35000});assert.match(await game.locator('#result-title').innerText(),/示範完成/);}
  else{assert.equal(await game.evaluate(()=>window.togetherUnityState.phase),'intro');await game.locator('#skip').click();await game.waitForFunction(()=>window.togetherUnityState.phase==='game');assert.equal(await game.evaluate(()=>window.togetherUnityState.state.level),0);}
  assert.equal(await game.evaluate(()=>localStorage.getItem('together-home-curated-v4')),'[]','暖身與示範沒有增加通關紀錄');await game.close();
 }
 assert.deepEqual(errors,[]);console.log('Lesson 7 Unity links, phone controls description, responsive catalog, native game startup and teacher playback passed.');
}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
