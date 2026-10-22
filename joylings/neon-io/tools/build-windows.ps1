param([ValidateSet('Prepare','Validate','Windows','WindowsDevelopment')][string]$Action = 'Windows')
$ErrorActionPreference = 'Stop'
$neonRoot = Split-Path -Parent $PSScriptRoot
$neonUnity = 'E:/Program Files/Unity/Hub/Editor/6000.3.11f1/Editor/Unity.exe'
$neonProject = Join-Path $neonRoot 'unity'
$neonLog = Join-Path $neonRoot ('logs/' + $Action.ToLowerInvariant() + '.log')
New-Item -ItemType Directory -Force (Split-Path -Parent $neonLog) | Out-Null
$neonProcess = Start-Process -FilePath $neonUnity -ArgumentList @('-batchmode','-nographics','-quit','-accept-apiupdate','-buildTarget','Win64','-projectPath',('"' + $neonProject + '"'),'-executeMethod',('Neon.Editor.NeonBuild.' + $Action),'-logFile',('"' + $neonLog + '"')) -WindowStyle Hidden -PassThru
# Wait for the Editor itself; package/compiler helper daemons can outlive a failed import.
$neonProcess.WaitForExit()
if ($neonProcess.ExitCode -ne 0) { throw "Unity exit $($neonProcess.ExitCode), log: $neonLog" }
Get-Content -LiteralPath $neonLog | Select-String 'NEON_.*_OK'
