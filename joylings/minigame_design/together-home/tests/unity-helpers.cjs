const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.TOGETHER_UNITY_URL||'http://127.0.0.1:18130/';
const output=path.resolve(__dirname,'../artifacts/browser');fs.mkdirSync(output,{recursive:true});
const launch=()=>chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
async function open(browser,query='',mobile=false){
 const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:900},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:1});
 const page=await context.newPage(),errors=[],logs=[],sockets=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/Exception|CATDOG|Error/.test(m.text()))logs.push(m.text());});page.on('websocket',socket=>sockets.push(socket.url()));
 const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:true});
 await page.goto(base+query,{waitUntil:'domcontentloaded',timeout:90000});await page.waitForFunction(()=>window.togetherUnityState?.initialized&&window.unityInstance,null,{timeout:180000});
 return {context,page,cdp,errors,logs,sockets};
}
const state=player=>player.page.evaluate(()=>window.togetherUnityState);
const wait=(player,predicate,arg,timeout=30000)=>player.page.waitForFunction(predicate,arg,{timeout});
async function level(player,index){await player.page.selectOption('#levels',String(index));await wait(player,i=>window.togetherUnityState.state.level===i&&!window.togetherUnityState.state.won,index);}
async function touch(player,type,points){await player.cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(p=>({radiusX:7,radiusY:7,force:1,...p}))});}
async function point(player,selector,dx=0){const r=await player.page.locator(selector).boundingBox();return {x:r.x+r.width/2+dx,y:r.y+r.height/2};}
module.exports={base,output,launch,open,state,wait,level,touch,point};
