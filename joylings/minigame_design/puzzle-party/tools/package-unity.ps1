$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
& node (Join-Path $PSScriptRoot 'package-unity.cjs')
if ($LASTEXITCODE -ne 0) { throw 'Unity package preparation failed' }
$files = Get-ChildItem -LiteralPath (Join-Path $projectRoot 'Builds/UnityWeb') -Force
Compress-Archive -LiteralPath $files.FullName -DestinationPath (Join-Path $projectRoot 'Builds/puzzle-party-unity-webgl.zip') -Force
Write-Output 'Unity WebGL package updated'
