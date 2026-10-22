// Render code-native SVG artwork to lossless transparent UI sprites.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),source=path.join(root,'design/wordmarks'),out=path.join(root,'unity/Assets/Resources/Astral/Titles');
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),page=await browser.newPage();
 try{for(const name of fs.readdirSync(source).filter(n=>n.endsWith('.svg'))){
  const png=await page.evaluate(async svg=>{const img=new Image();img.src='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(svg)));await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d').drawImage(img,0,0);return c.toDataURL('image/png').split(',')[1];},fs.readFileSync(path.join(source,name),'utf8'));
  fs.writeFileSync(path.join(out,name.replace('.svg','.png')),Buffer.from(png,'base64'));
 }}finally{await browser.close();}
 console.log('Rendered bilingual title sprites');
})().catch(e=>{console.error(e);process.exitCode=1;});
