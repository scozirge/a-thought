const fs=require('node:fs'),path=require('node:path');
const out=path.resolve(__dirname,'../Builds/UnityWeb');
if(!fs.existsSync(out+'/Build/UnityWeb.wasm'))throw new Error('請先執行 npm run build:unity');
// 公開站沿用相同檔名，以內容雜湊避免新頁面混用瀏覽器快取的舊引擎檔。
let webIndex=fs.readFileSync(path.join(out,'index.html'),'utf8');
for(const name of ['UnityWeb.loader.js','UnityWeb.framework.js','UnityWeb.data','UnityWeb.wasm']){
 const digest=require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(out,'Build',name))).digest('hex').slice(0,12);
 const pattern=new RegExp('Build/'+name.replaceAll('.','\\.')+'(?:\\?v=[a-f0-9]+)?','g');
 if(!webIndex.includes('Build/'+name))throw new Error('Unity 頁面缺少資源：'+name);
 webIndex=webIndex.replace(pattern,'Build/'+name+'?v='+digest);
}
fs.writeFileSync(path.join(out,'index.html'),webIndex);
fs.copyFileSync(path.resolve(__dirname,'../unity-game/Assets/Resources/NotoSansTC-OFL.txt'),out+'/NotoSansTC-OFL.txt');
const sdk=path.resolve(__dirname,'../unity-game/Assets/Photon'),licenses=path.join(out,'ThirdPartyLicenses');
const sdkDocuments=[
 ['Fusion/Plugins/NanoSockets/libnanosockets_LICENSE.txt','NanoSockets-LICENSE.txt'],
 ['PhotonLibs/WebSocket/websocket-sharp.README','Photon-WebSocket-README.txt'],
 ['Fusion/build_info.txt','Photon-Fusion-build-info.txt']
];
// 保留隨 SDK 提供的原文；Photon 只有原始碼版權標頭，不能標成 NanoSockets 的 MIT 授權。
const photonSource=fs.readFileSync(path.join(sdk,'PhotonRealtime/Code/RealtimeClient.cs'),'utf8');
const photonHeader=photonSource.slice(0,photonSource.indexOf('#if')).trim();
if(!photonHeader.includes('Copyright')||!photonHeader.includes('Exit Games GmbH'))throw new Error('找不到 Photon SDK 原始版權聲明');
for(const [source]of sdkDocuments)if(!fs.existsSync(path.join(sdk,source)))throw new Error('缺少 SDK 授權／聲明文件：'+source);
fs.mkdirSync(licenses,{recursive:true});
for(const [source,target]of sdkDocuments)fs.copyFileSync(path.join(sdk,source),path.join(licenses,target));
fs.writeFileSync(path.join(licenses,'Photon-Realtime-COPYRIGHT.txt'),photonHeader+'\n');
fs.writeFileSync(path.join(licenses,'README.txt'),'\uFEFF'+[
 'Unity WebGL v0.10.1 第三方聲明與授權資料',
 '',
 'NanoSockets-LICENSE.txt：直接複製 Photon Fusion SDK 隨附的 NanoSockets MIT 授權全文。',
 'Photon-WebSocket-README.txt：直接複製 SDK 隨附的 websocket-sharp 來源與授權說明。',
 'Photon-Realtime-COPYRIGHT.txt：原樣保留 PhotonRealtime/Code/RealtimeClient.cs 的版權及作者標頭。',
 'Photon-Fusion-build-info.txt：直接複製所使用 Fusion SDK 的建置資訊。',
 '',
 '此 SDK 未隨附 Photon 的獨立完整授權文件；Photon 版權聲明不應誤稱 MIT 授權。',
 'NanoSockets 的 MIT 文件適用該元件，不代表整個 Photon SDK。',
 'Noto Sans TC 字體授權另置於上一層 NotoSansTC-OFL.txt。',
 '分享或重新打包時保留本資料夾與原始文件。',''
].join('\r\n'));

fs.writeFileSync(out+'/serve.cjs',`const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const port=Number(process.argv[2]||8190),root=__dirname;
http.createServer((req,res)=>{if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}let url;try{url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end();}const file=path.resolve(root,'.'+(url==='/'?'/index.html':url));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}const mime={'.wasm':'application/wasm','.js':'application/javascript','.html':'text/html; charset=utf-8','.data':'application/octet-stream'};res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);}).listen(port,'127.0.0.1',()=>console.log('Unity: http://127.0.0.1:'+port));
`);
fs.writeFileSync(out+'/start.ps1','\uFEFF'+`$ErrorActionPreference='Stop'
$port=8190
$response=$null
try{$response=Invoke-WebRequest -Uri "http://127.0.0.1:$port/" -UseBasicParsing -TimeoutSec 1}catch{}
if($response -and $response.Content -notmatch 'createUnityInstance'){throw '8190 已被其他網頁使用。請先關閉該服務，再開啟遊戲。'}
if(!$response){Start-Process -FilePath 'node' -ArgumentList @(('"'+(Join-Path $PSScriptRoot 'serve.cjs')+'"'),$port) -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
for($i=0;$i -lt 30;$i++){try{$response=Invoke-WebRequest -Uri "http://127.0.0.1:$port/" -UseBasicParsing -TimeoutSec 1;break}catch{Start-Sleep -Milliseconds 200}}
if(!$response){throw '無法啟動本地伺服器，請確認已安裝 Node.js。'}}
Start-Process "http://127.0.0.1:$port/"
`);
fs.writeFileSync(out+'/START.cmd','@echo off\r\ncd /d "%~dp0"\r\npowershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"\r\nif errorlevel 1 pause\r\n');
fs.writeFileSync(out+'/使用說明.txt','\uFEFF'+[
 '一起想想｜Unity WebGL v0.10.1：本地教師＋跨網連線',
 '',
 '這是真正的 Unity WebGL 輸出，含 .wasm、.data 與 C# 遊戲規則。',
 '解壓後雙擊 START.cmd，再於瀏覽器開啟 http://127.0.0.1:8190/。',
 '啟動工具使用已安裝的 Node.js。請透過 HTTP 服務載入，不要直接雙擊 index.html。',
 '本地單機不需外部網路；建立／加入 Photon 房間需要網際網路。',
 '',
 '貼紙工廠 20 關、帶企鵝回家 20 關，共 40 關。動物拍照隊與傻瓜勇者已移除。',
 '每關固定第 1、2、3 組＋老師組各選一次，總共四次，沒有第二輪。',
 '老師可在本地代填全部四組；連線時可代填沒有學生加入的缺席組。',
 '作答區清楚顯示「你是第 X 組／老師組」與步號。',
 '主要文字 18px，按鈕 20px；窄螢幕可捲動，不把整張畫面縮小。',
 '貼紙不旋轉，後貼蓋前貼，亮黃色表示目前貼哪一張。後段形狀重疊更密、露出線索更少，仍只選四次。',
 '企鵝兩隻同步讀四個方向，碰冰塊或邊界才停，四步結束都在家才成功。',
 '第 11 關起 5×5；後面冰塊與停點更複雜，最後兩關到家後仍可能離開。',
 '前三關簡單暖身。四組填完才可播放；停止、失敗與重試保留四組設定。',
 '',
 '跨網連線',
 '1. 各裝置啟動同版本 Unity 分享包，或載入同版本的公開網頁。',
 '2. 老師開啟連線介面並建立房間，取得六位數房號。',
 '3. 學生輸入房號、名字，選第 1、2 或 3 組。每組一台，已占用的組別不能重複加入。',
 '4. 老師選遊戲與關卡。學生可同時填答案，但只能修改自己的那一格；老師設定老師組及代答缺席組。',
 '5. 四格填完由老師播放；切關、清空、播放、暫停／繼續、停止及速度由老師控制。',
 '6. 學生離開會保留答案，空出的組別可重新加入；老師離房即結束本次連線。',
 'Photon 使用 asia 區域與獨立 puzzle-party-v10 版本，不加入原 RIVALS 房間；不需要同一個區域網路。',
 '127.0.0.1 是各自電腦的本地地址，不能當作遠方學生的下載連結。',
 '公開連線版：https://scozirge.github.io/a-thought/puzzle-party/；直接開啟網頁即可，不需本地伺服器。',
 '公開頁與本地 Unity 分享包使用相同建置，可輸入同一房號一起玩。',
 '目前僅維護 Unity WebGL 版本，支援單機與多人連線。',
 '',
 '單機完成紀錄與草稿保存在各自瀏覽器；換瀏覽器或清除網站資料會重置。連線中的答案以老師房間狀態為準。',
 '中文字體沿用來源專案 Noto Sans TC，授權見 NotoSansTC-OFL.txt。',
 'Photon SDK 聲明與 NanoSockets 等授權文件見 ThirdPartyLicenses/，分享包須保留此資料夾。',
 ''
].join('\r\n'));
console.log('已補齊 Unity 啟動工具、跨網連線說明與第三方授權資料');
