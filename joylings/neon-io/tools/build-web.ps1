$ErrorActionPreference = 'Stop'
$neonRoot = Split-Path -Parent $PSScriptRoot
$neonUnity = 'E:/Program Files/Unity/Hub/Editor/6000.3.11f1/Editor/Unity.exe'
$neonProject = Join-Path $neonRoot 'unity'
$neonLog = Join-Path $neonRoot 'logs/web-build.log'
$neonProcess = Start-Process -FilePath $neonUnity -ArgumentList @('-batchmode','-nographics','-quit','-accept-apiupdate','-buildTarget','WebGL','-projectPath',('"' + $neonProject + '"'),'-executeMethod','Neon.Editor.NeonWebBuild.Build','-logFile',('"' + $neonLog + '"')) -WindowStyle Hidden -PassThru
$neonProcess.WaitForExit()
if ($neonProcess.ExitCode -ne 0) { throw "Unity exit $($neonProcess.ExitCode), log: $neonLog" }
Get-Content -LiteralPath $neonLog | Select-String 'NEON_.*_OK'
