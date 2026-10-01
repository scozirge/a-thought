// Real browser downloads and lobby readiness; optional controlled bandwidth.
const {chromium}=require(process.env.RIVALS_PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.resolve(process.env.RIVALS_TEST_OUTPUT||path.join(__dirname,'../Logs/LoadValidation'));
const url=new URL(process.env.RIVALS_WEB_URL||'http://localhost:8186/');url.searchParams.set('diagnostics','1');
const mbps=Number(process.env.RIVALS_LOAD_MBPS||0),expectCache=process.argv.includes('--expect-cache'),denyCache=process.argv.includes('--deny-cache'),touch=process.argv.includes('--touch');
const label=process.env.RIVALS_LOAD_LABEL||'load';fs.mkdirSync(output,{recursive:true});
const primeOrigin=process.argv.includes('--prime-origin'),blockCdn=process.argv.includes('--block-cdn'),stallCdn=process.argv.includes('--stall-cdn');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.RIVALS_CHROME||undefined,headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const results={url:url.href,mbps,latencyMs:mbps?50:0,denyCache,touch,runs:[]};
 try{
  const context=await browser.newContext(touch?{viewport:{width:844,height:390},hasTouch:true,isMobile:true}:{viewport:{width:1280,height:900}});
  if(blockCdn)await context.route('https://cdn.jsdelivr.net/**',route=>route.abort());
  if(stallCdn)await context.route('https://cdn.jsdelivr.net/**',async route=>{await new Promise(resolve=>setTimeout(resolve,12000));await route.abort().catch(()=>{});});
  if(denyCache)await context.addInitScript(()=>{
   IDBFactory.prototype.open=function(){throw new DOMException('QA storage denied','SecurityError');};
   CacheStorage.prototype.open=function(){return Promise.reject(new DOMException('QA cache denied','SecurityError'));};
  });
  const page=await context.newPage(),cdp=await context.newCDPSession(page);let errors=[],cacheMessages=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.text().startsWith('[UnityCache]'))cacheMessages.push(m.text());});
  await cdp.send('Network.enable');await cdp.send('Network.clearBrowserCache');
  if(mbps)await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:50,downloadThroughput:mbps*1000000/8,uploadThroughput:mbps*1000000/8,connectionType:'wifi'});
  for(const pass of denyCache?['cold']:['cold','warm']){
   errors=[];cacheMessages=[];const begin=Date.now();const visit=new URL(url);
   if(primeOrigin&&pass==='cold')visit.searchParams.set('asset-source','origin');
   await page.goto(visit.href);
   await page.waitForFunction(()=>window.rivalsLobbyState?.ready&&!window.rivalsLobbyState.busy&&document.getElementById('loading').style.display==='none',null,{timeout:180000});
   const readyMs=Date.now()-begin;await page.waitForTimeout(700);
   const resources=await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.name.includes('/Build/')).map(r=>({name:r.name,ms:r.duration,transfer:r.transferSize,encoded:r.encodedBodySize,decoded:r.decodedBodySize})));
   const delivery=await page.evaluate(()=>window.rivalsAssetDelivery||null);
   if(visit.searchParams.get('asset-source')==='cdn')assert.ok(delivery?.enabled,'CDN delivery hook is active');
   const run={pass,readyMs,transferBytes:resources.reduce((sum,r)=>sum+r.transfer,0),resources,delivery,cacheMessages:[...cacheMessages],errors:[...errors]};results.runs.push(run);
   if(delivery&&pass==='cold'&&!primeOrigin)assert.equal(delivery.transfers.filter(t=>t.source===(blockCdn||stallCdn?'origin':'cdn')).length,2);
   if(delivery&&pass==='warm'&&expectCache)assert.equal(delivery.transfers.length,0,'cached assets never request CDN again');
   assert.deepEqual(errors,[]);assert.equal(await page.locator('#create-room').isEnabled(),true);
   if(touch)assert.equal(await page.locator('#mode-touch').getAttribute('aria-pressed'),'true');
   console.log('WEB_LOAD_PASS '+JSON.stringify({pass,readyMs,transferBytes:run.transferBytes,cacheMessages:run.cacheMessages}));
  }
  if(expectCache&&!denyCache){
   const [cold,warm]=results.runs;assert.ok(warm.transferBytes<cold.transferBytes*.1,'warm load must not download the large game files again');
   assert.ok(warm.cacheMessages.filter(s=>s.includes('without revalidation')).length>=2,'both data and wasm must use the persistent cache');
  }
  results.ok=true;await page.screenshot({path:path.join(output,label+'.png')});
 }finally{fs.writeFileSync(path.join(output,label+'.json'),JSON.stringify(results,null,2));await browser.close();}
 console.log('WEB_LOAD_OK');
})().catch(e=>{console.error(e);process.exit(1);});
