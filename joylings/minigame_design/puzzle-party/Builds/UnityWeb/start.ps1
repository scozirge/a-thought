$ErrorActionPreference='Stop'
$port=8190
$response=$null
try{$response=Invoke-WebRequest -Uri "http://127.0.0.1:$port/" -UseBasicParsing -TimeoutSec 1}catch{}
if($response -and $response.Content -notmatch 'createUnityInstance'){throw '8190 已被其他網頁使用。請先關閉該服務，再開啟遊戲。'}
if(!$response){Start-Process -FilePath 'node' -ArgumentList @(('"'+(Join-Path $PSScriptRoot 'serve.cjs')+'"'),$port) -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
for($i=0;$i -lt 30;$i++){try{$response=Invoke-WebRequest -Uri "http://127.0.0.1:$port/" -UseBasicParsing -TimeoutSec 1;break}catch{Start-Sleep -Milliseconds 200}}
if(!$response){throw '無法啟動本地伺服器，請確認已安裝 Node.js。'}}
Start-Process "http://127.0.0.1:$port/"
