const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PUZZLE_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),dest=root+'/unity-game/Assets/Resources/Art';
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});try{
 const page=await browser.newPage({viewport:{width:1300,height:1000}});await page.goto('http://127.0.0.1:8190/');await page.locator('[data-game="hero"]').click();
 const art=await page.evaluate(()=>{const l=PuzzleRules.games.hero.levels[0],r=HeroRules.initialRobot(l),a={};
  a.dragon=HeroView.dragonArt();a.doorA=HeroView.doorArt('A');a.doorB=HeroView.doorArt('B');
  a.monster=document.querySelector('#monster-sprite').innerHTML;a.sword=document.querySelector('#sword-sprite').innerHTML;
  a.hero=document.querySelector('#hero-sprite').innerHTML;HeroView.paint(l,{...r,hasSword:true});a.heroArmed=document.querySelector('#hero-sprite').innerHTML;return a;
 });
 await page.locator('.home-link').click();await page.locator('[data-game="penguin"]').click();await page.locator('[data-level="4"]').click();
 Object.assign(art,await page.evaluate(()=>({penguinRed:document.querySelector('#ice-penguin-0').innerHTML,penguinBlue:document.querySelector('#ice-penguin-1').innerHTML})));
 art.flame='<path d="M0-48C15-25 38-6 32 17Q26 47 0 45Q-39 43-31 7Q-23 18-16-14Q-7 6 0-48Z" fill="#ed762d"/><path d="M0-18Q26 6 16 28Q0 52-17 27Q-24 14 0-18Z" fill="#ffe59a"/>';
 for(const [name,svg]of Object.entries(art)){
  await page.setContent('<html><body style="margin:0;background:transparent"><svg width="384" height="384" viewBox="-64 -64 128 128" xmlns="http://www.w3.org/2000/svg">'+svg+'</svg></body></html>');
  await page.locator('svg').screenshot({path:dest+'/'+name+'.png',omitBackground:true});
 }
 console.log('已將原創 SVG 角色、火龍、門與火焰匯出為 Unity 素材');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
