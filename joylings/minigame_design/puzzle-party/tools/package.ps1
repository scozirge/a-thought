$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
& node (Join-Path $PSScriptRoot 'build.cjs')
if ($LASTEXITCODE -ne 0) { throw 'H5 build failed.' }
$files = Get-ChildItem -LiteralPath (Join-Path $projectRoot 'Builds/Web') -File
$archive = Join-Path $projectRoot 'Builds/puzzle-party-h5.zip'
Compress-Archive -LiteralPath $files.FullName -DestinationPath $archive -Force
Write-Output "Exported: $archive"
