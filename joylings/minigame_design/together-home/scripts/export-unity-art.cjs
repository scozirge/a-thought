const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage();
 let source=fs.readFileSync(path.join(__dirname,'../art.js'),'utf8');
 source=source.replace('const api={scene,avatar,finale,mechanismLinks,meeting,homecoming};','const api={scene,avatar,finale,mechanismLinks,meeting,homecoming,character,key};');
 await page.addScriptTag({content:source});
 const target=path.join(__dirname,'../unity-game/Assets/Resources/Art');fs.mkdirSync(target,{recursive:true});
 for(const [name,actor]of [['cat',0],['dog',1],['key',-1]]){
  const url=await page.evaluate(actor=>{const c=document.createElement('canvas');c.width=actor<0?192:208;c.height=actor<0?120:224;const ctx=c.getContext('2d');ctx.scale(4,4);ctx.translate(actor<0?18:9,actor<0?15:8);if(actor<0)TogetherArt.key(ctx,0,0);else TogetherArt.character(ctx,{x:0,y:0},actor);return c.toDataURL();},actor);
  fs.writeFileSync(path.join(target,name+'.png'),Buffer.from(url.split(',')[1],'base64'));
 }
 console.log('Exported original cat, dog and key artwork for native Unity rendering.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
