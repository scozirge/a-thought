import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_PATH?pathToFileURL(path.join(process.env.PLAYWRIGHT_PATH,'index.mjs')).href:'playwright');
const root=fileURLToPath(new URL('../dist/classroom-site',import.meta.url)),out=fileURLToPath(new URL('../outputs/lesson-seven',import.meta.url));fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{
 let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403).end();return;}
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream'}).end(data);});
});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const base=`http://127.0.0.1:${server.address().port}`,page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/classroom/#seventh-course');await page.evaluate(()=>document.fonts.ready);
 const seventh=page.locator('#seventh-course'),sixth=page.locator('#sixth-course');
 assert.match(await seventh.innerText(),/第 7 週課程/);assert.equal(await sixth.locator('a[href*="together-home"]').count(),0);
 assert.equal(await seventh.locator('a[href="/together-home/"]').count(),1);assert.equal(await seventh.locator('a[href="/together-home/?tip=true"]').count(),1);
 assert.ok(await seventh.evaluate(s=>!!(document.querySelector('#sixth-course').compareDocumentPosition(s)&Node.DOCUMENT_POSITION_FOLLOWING)));
 for(const width of [1280,375,320]){await page.setViewportSize({width,height:1000});await seventh.scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await seventh.screenshot({path:path.join(out,`catalog-${width}.png`)});}
 for(const [href,tips] of [['/together-home/',false],['/together-home/?tip=true',true]]){
  const popupPromise=page.waitForEvent('popup');await seventh.locator(`a[href="${href}"]`).click();const game=await popupPromise;await game.waitForFunction(()=>typeof readGame==='function');
  assert.equal(await game.locator('#levels option').count(),20);assert.equal(await game.locator('#answer-panel').isVisible(),tips);assert.equal(await game.locator('#message').isVisible(),tips);
  assert.equal(await game.locator('#solution-controls').isVisible(),tips);
  if(tips){await game.locator('#solution-play').click();await game.waitForFunction(()=>readGame().won);assert.match(await game.locator('#win-title').innerText(),/示範完成/);}
  await game.close();
 }
 assert.deepEqual(errors,[]);console.log('Built lesson 7 catalog, lesson 6 preservation, desktop/mobile layout and both game links passed.');
}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
