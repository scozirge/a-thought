const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'Builds/UnityWeb');
const template=path.join(root,'unity-game/Assets/WebGLTemplates/Studio');
const sdk=path.join(root,'unity-game/Assets/Photon');
// Hash the same web assets on both Windows and Linux checkouts.
const webText=file=>fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
for(const file of ['style.css','app.js']) fs.writeFileSync(path.join(out,file),webText(path.join(template,file)));
let html=webText(path.join(out,'index.html'));
html=html.replace(/(Build\/[^'"?]+|app\.js|style\.css)(?:\?v=[a-f0-9]+)?(?=['"])/g,(_,file)=>{
  const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(out,file))).digest('hex').slice(0,12);
  return file+'?v='+hash;
});
fs.writeFileSync(path.join(out,'index.html'),html);
const licenses=path.join(out,'ThirdPartyLicenses');
fs.mkdirSync(licenses,{recursive:true});
for(const [source,dest] of [
  ['Fusion/Plugins/NanoSockets/libnanosockets_LICENSE.txt','NanoSockets-LICENSE.txt'],
  ['PhotonLibs/WebSocket/websocket-sharp.README','WebSocket-README.txt'],
  ['Fusion/build_info.txt','Photon-Fusion-build-info.txt']
]) fs.copyFileSync(path.join(sdk,source),path.join(licenses,dest));
const realtime=fs.readFileSync(path.join(sdk,'PhotonRealtime/Code/RealtimeClient.cs'),'utf8');
fs.writeFileSync(path.join(licenses,'Photon-Realtime-COPYRIGHT.txt'),realtime.slice(0,realtime.indexOf('#if')).trim()+'\n');
fs.copyFileSync(path.join(__dirname,'serve.cjs'),path.join(out,'serve.cjs'));
fs.copyFileSync(path.join(root,'START.cmd'),path.join(out,'START.cmd'));
fs.writeFileSync(path.join(out,'使用說明.txt'),'\uFEFF小小工程師｜Unity 連線版\r\n\r\n電腦安裝 Node.js 後，雙擊 START.cmd。保持視窗開著，同一網路的手機或電腦開啟視窗裡的區網網址。連線需要網際網路。\r\n一人按「開房」，其他人按「加入」。點名字或頭像可以換一組身分。\r\n房主可選難度、換一題，看無題名原圖並描述。師傅預設拿黑色粉筆，也能選六種粉彩。可擦掉、清空或退回上一步。按「畫好了」鎖筆，取消勾選即可繼續畫。\r\n房主按「結束」就揭曉。先單獨展示原圖 3 秒，再輪流展示每位師傅的作品與原圖各 3 秒，最後停在全部作品牆。小小工程師點作品、按「選這張!」，全班會看到得獎作品，3 秒後自動進下一題。整輪都是白紙時，按「下一題」繼續。另一人按「開房」會接手，原出題者退出。房主按「離房」會關閉教室。\r\n');
console.log('已打包 Unity WebGL：'+out);
