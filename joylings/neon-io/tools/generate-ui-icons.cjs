// Author SVG once; use the same paths for the design sheet and transparent Unity sprites.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),folder=path.join(root,'design/icons-v2'),out=path.join(root,'unity/Assets/Resources/Astral/Symbols');
 const icons=JSON.parse(fs.readFileSync(path.join(folder,'icons.json'),'utf8'));fs.mkdirSync(out,{recursive:true});fs.mkdirSync(path.join(folder,'png'),{recursive:true});
 const svg=body=>`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" color="#C7AD70" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:880},deviceScaleFactor:1});
  for(const [key,icon] of Object.entries(icons)){
   const source=svg(icon.body);fs.writeFileSync(path.join(folder,key+'.svg'),source+'\n');
   const png=await page.evaluate(async source=>{const img=new Image();img.src='data:image/svg+xml;base64,'+btoa(source.replace('#C7AD70','#FFFFFF'));await img.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=256;canvas.getContext('2d').drawImage(img,0,0);return canvas.toDataURL('image/png').split(',')[1];},source);
   fs.writeFileSync(path.join(folder,'png',key+'.png'),Buffer.from(png,'base64'));
  }
  const atlas=await page.evaluate(async sources=>{const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const context=canvas.getContext('2d');for(let i=0;i<sources.length;i++){const img=new Image();img.src='data:image/svg+xml;base64,'+btoa(sources[i].replace('#C7AD70','#FFFFFF'));await img.decode();context.drawImage(img,(i%4)*256,Math.floor(i/4)*256);}return canvas.toDataURL('image/png').split(',')[1];},Object.values(icons).map(i=>svg(i.body)));
  fs.writeFileSync(path.join(out,'Atlas.png'),Buffer.from(atlas,'base64'));
  const cards=Object.entries(icons).map(([key,i])=>`<article><div class="large">${svg(i.body)}</div><h2>${i.label}</h2><p>${i.description}</p><div class="sizes">${[16,24,32].map(s=>`<span style="width:${s}px;height:${s}px">${svg(i.body)}</span>`).join('')}</div></article>`).join('');
  const html=`<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><title>NOVAROVE · 圖示設計</title><style>*{box-sizing:border-box}body{margin:0;padding:48px 56px;background:#10172d;color:#ece8da;font:16px 'Microsoft JhengHei',sans-serif}header{display:flex;justify-content:space-between;align-items:end;margin-bottom:30px;padding-bottom:24px;border-bottom:1px solid #c7ad7040}h1{font-size:29px;letter-spacing:.08em;margin:0 0 10px}header p{color:#a6b0c5;margin:0;font-size:14px}header span{color:#c7ad70;font-size:13px;letter-spacing:.15em}main{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}article{height:310px;padding:30px 20px;background:#18223a;border:1px solid #c7ad702e;border-radius:8px;text-align:center}.large{height:90px;display:grid;place-items:center}.large svg{width:68px;height:68px}h2{font-size:18px;font-weight:500;margin:24px 0 8px}p{font-size:13px;color:#a6b0c5;margin:0}.sizes{height:50px;display:flex;gap:25px;justify-content:center;align-items:center;margin-top:19px}.sizes svg{width:100%;height:100%}footer{color:#a6b0c5;font-size:12px;margin-top:24px;letter-spacing:.06em}</style><header><div><h1>星際遊俠 · 圖示設計</h1><p>香檳金 / 簡潔輪廓 / 統一線寬與留白</p></div><span>NOVAROVE / 02</span></header><main>${cards}</main><footer>下方尺寸為 16 / 24 / 32 px，檢查縮小後的辨識度。遊戲使用透明圖示，不含展示卡片。</footer></html>`;
  fs.writeFileSync(path.join(folder,'index.html'),html+'\n');await page.setContent(html);await page.screenshot({path:path.join(folder,'overview.png'),fullPage:true});
 }finally{await browser.close();}
 console.log('UI_SYMBOLS_OK count='+Object.keys(icons).length);
})().catch(e=>{console.error(e);process.exitCode=1;});
