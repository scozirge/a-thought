param([string]$Unity = '')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (!$Unity) {
  $Unity = @('C:/Program Files/Unity/Hub/Editor/6000.3.11f1/Editor/Unity.exe', 'E:/Program Files/Unity/Hub/Editor/6000.3.11f1/Editor/Unity.exe') | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}
if (!$Unity) { throw 'Unity 6000.3.11f1 not found; specify -Unity.' }
if (!(Test-Path -LiteralPath $Unity)) { throw "找不到 Unity：$Unity" }
& node (Join-Path $PSScriptRoot 'export-unity.cjs')
if ($LASTEXITCODE -ne 0) { throw '關卡匯出失敗' }
$project = Join-Path $projectRoot 'unity-game'
$logPath = Join-Path $projectRoot 'artifacts/unity-build.log'
New-Item -ItemType Directory -Force (Split-Path -Parent $logPath) | Out-Null
$process = Start-Process -FilePath $Unity -ArgumentList @('-batchmode','-nographics','-quit','-buildTarget','WebGL','-projectPath',('"'+$project+'"'),'-executeMethod','PuzzleBuild.Build','-logFile',('"'+$logPath+'"')) -WindowStyle Hidden -PassThru -Wait
if ($process.ExitCode -ne 0) { throw "Unity 建置失敗，請查看 $logPath" }
Write-Output 'Unity WebGL 已輸出至 Builds/UnityWeb'
