param([string]$Unity = 'E:/Program Files/Unity/Hub/Editor/6000.3.11f1/Editor/Unity.exe')
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
& node (Join-Path $PSScriptRoot 'setup.cjs')
if ($LASTEXITCODE -ne 0) { throw 'Unity 專案準備失敗' }
$project = Join-Path $root 'unity-game'
$log = Join-Path $root 'artifacts/build.log'
New-Item -ItemType Directory -Force (Split-Path -Parent $log) | Out-Null
$job = Start-Process -FilePath $Unity -ArgumentList @('-batchmode','-nographics','-quit','-buildTarget','WebGL','-projectPath',('"{0}"' -f $project),'-executeMethod','StudioBuild.Build','-logFile',('"{0}"' -f $log)) -WindowStyle Hidden -PassThru -Wait
if ($job.ExitCode -ne 0) { throw "Unity 建置失敗，請查看 $log" }
& node (Join-Path $PSScriptRoot 'package.cjs')
if ($LASTEXITCODE -ne 0) { throw 'WebGL 打包失敗' }
Compress-Archive -Path (Join-Path $root 'Builds/UnityWeb/*') -DestinationPath (Join-Path $root 'Builds/shape-studio-web.zip') -Force
