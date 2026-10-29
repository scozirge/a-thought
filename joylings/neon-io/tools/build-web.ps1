param([switch]$Test)
$ErrorActionPreference = 'Stop'
$neonRoot = Split-Path -Parent $PSScriptRoot
$neonUnity = 'E:/Program Files/Unity/Hub/Editor/6000.3.11f1/Editor/Unity.exe'
$neonProject = Join-Path $neonRoot 'unity'
$neonLog = Join-Path $neonRoot $(if ($Test) { 'logs/web-test-build.log' } else { 'logs/web-build.log' })
$neonMethod = if ($Test) { 'Neon.Editor.NeonWebBuild.BuildTest' } else { 'Neon.Editor.NeonWebBuild.Build' }
$neonProcess = Start-Process -FilePath $neonUnity -ArgumentList @('-batchmode','-nographics','-quit','-accept-apiupdate','-buildTarget','WebGL','-projectPath',('"' + $neonProject + '"'),'-executeMethod',$neonMethod,'-logFile',('"' + $neonLog + '"')) -WindowStyle Hidden -PassThru
$neonProcess.WaitForExit()
if ($neonProcess.ExitCode -ne 0) { throw "Unity exit $($neonProcess.ExitCode), log: $neonLog" }
Get-Content -LiteralPath $neonLog | Select-String 'NEON_.*_OK'
