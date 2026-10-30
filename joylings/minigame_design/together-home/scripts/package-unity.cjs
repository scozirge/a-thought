const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=path.join(root,'Builds/UnityWeb'),sdk=path.join(root,'unity-game/Assets/Photon');
let html=fs.readFileSync(path.join(out,'index.html'),'utf8');
html=html.replace(/(Build\/[^'"?]+|controller\.js|style\.css)(?:\?v=[a-f0-9]+)?(?=['"])/g,(_,file)=>{
 const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(out,file))).digest('hex').slice(0,12);return file+'?v='+hash;
});fs.writeFileSync(path.join(out,'index.html'),html);
fs.copyFileSync(path.join(root,'unity-game/Assets/Resources/NotoSansTC-OFL.txt'),path.join(out,'NotoSansTC-OFL.txt'));
const licenses=path.join(out,'ThirdPartyLicenses');fs.mkdirSync(licenses,{recursive:true});
for(const [source,target]of [['Fusion/Plugins/NanoSockets/libnanosockets_LICENSE.txt','NanoSockets-LICENSE.txt'],['PhotonLibs/WebSocket/websocket-sharp.README','Photon-WebSocket-README.txt'],['Fusion/build_info.txt','Photon-Fusion-build-info.txt']])fs.copyFileSync(path.join(sdk,source),path.join(licenses,target));
const photon=fs.readFileSync(path.join(sdk,'PhotonRealtime/Code/RealtimeClient.cs'),'utf8');fs.writeFileSync(path.join(licenses,'Photon-Realtime-COPYRIGHT.txt'),photon.slice(0,photon.indexOf('#if')).trim()+'\n');
const serve=fs.readFileSync(path.join(__dirname,'serve-unity.cjs'),'utf8').replace("path.resolve(__dirname,'../Builds/UnityWeb')",'__dirname');fs.writeFileSync(path.join(out,'serve.cjs'),serve);
fs.writeFileSync(path.join(out,'START.cmd'),'@echo off\r\ncd /d "%~dp0"\r\nstart "" http://127.0.0.1:18130/\r\nnode serve.cjs 18130\r\n');
fs.writeFileSync(path.join(out,'使用說明.txt'),'\uFEFF貓狗一起回家｜Unity 雙人連線版\r\n\r\n安裝 Node.js 後，雙擊 START.cmd，以 HTTP 開啟遊戲。不要直接雙擊 index.html。\r\n開房者是貓咪，加入者是狗狗，最多兩人。使用六位房號或邀請連結加入。\r\n手機拖動搖桿左右移動，按跳躍；重力關另有「翻朋友」。可一邊移動一邊跳。\r\n兩位都能用 A/D/W/S 或方向鍵控制自己的角色；同機模式保留各自鍵盤。\r\n房主選關與重來；朋友離開時暫停，重新加入會重開本關。房主離開就關房。\r\n網址加 ?tip=true 開啟老師版，可看解答和播放正常按鍵示範。\r\n請保持遊戲在前景。連線需網際網路；單機可用本地 HTTP 玩。\r\nNoto 字體與 Photon SDK 相關授權文件隨包保留。\r\n');
console.log('Packaged native Unity WebGL, versioned resources, local launcher and third-party notices.');
