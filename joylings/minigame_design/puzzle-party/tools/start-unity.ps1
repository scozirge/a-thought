$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$port = 8190
$response = $null
try { $response = Invoke-WebRequest -Uri "http://127.0.0.1:$port/" -UseBasicParsing -TimeoutSec 2 } catch {}
if ($response -and $response.Content -notmatch 'createUnityInstance') {
  Write-Output '8190 已被其他網頁使用，改用 8191。'
  $port = 8191
  $response = $null
  try { $response = Invoke-WebRequest -Uri "http://127.0.0.1:$port/" -UseBasicParsing -TimeoutSec 2 } catch {}
  if ($response -and $response.Content -notmatch 'createUnityInstance') { throw '8190 與 8191 均被其他網頁使用，請先關閉其中一個服務。' }
}
if (!$response) {
  $serverPath = Join-Path $projectRoot 'tools/serve.cjs'
  Start-Process -FilePath 'node' -ArgumentList @(('"'+$serverPath+'"'),$port,'--unity') -WorkingDirectory $projectRoot -WindowStyle Hidden
  for ($i=0;$i -lt 30;$i++) {
    try { $response = Invoke-WebRequest -Uri "http://127.0.0.1:$port/" -UseBasicParsing -TimeoutSec 1; break } catch { Start-Sleep -Milliseconds 200 }
  }
  if (!$response) { throw '本機伺服器尚未啟動，請確認已安裝 Node.js。' }
}
Start-Process "http://127.0.0.1:$port/"
