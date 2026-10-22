param([string]$RunName = ('astral-ui-' + (Get-Date -Format 'yyyyMMdd-HHmmss')))
$ErrorActionPreference = 'Stop'
$neonRoot = Split-Path -Parent $PSScriptRoot
$neonRun = Join-Path $neonRoot ('logs/' + $RunName)
New-Item -ItemType Directory -Force -Path $neonRun | Out-Null
$neonProcess = Start-Process -FilePath (Join-Path $neonRoot 'Builds/Windows/NeonImpact.exe') -ArgumentList @('-batchmode','-screen-width','1280','-screen-height','800','-screen-fullscreen','0','-neonUiCheck','-neonRoom',('astral-validation-'+[Guid]::NewGuid().ToString('N').Substring(0,12)),'-neonUiReport',('"'+$neonRun+'"'),'-logFile',('"'+(Join-Path $neonRun 'player.log')+'"')) -WindowStyle Hidden -PassThru
if (!$neonProcess.WaitForExit(180000)) { Stop-Process -Id $neonProcess.Id -Force; throw 'UI validation exceeded 180 seconds' }
$neonReport = Get-Content -LiteralPath (Join-Path $neonRun 'report.json') -Raw | ConvertFrom-Json
$neonReport | Select-Object passed,failure,@{n='screens';e={$_.screens.Count}},@{n='checks';e={$_.checks.Count}},@{n='errors';e={$_.errors.Count}} | ConvertTo-Json
Write-Output $neonRun
if ($neonProcess.ExitCode -ne 0 -or !$neonReport.passed) { throw 'Astral UI validation failed; inspect report.json and player.log' }
