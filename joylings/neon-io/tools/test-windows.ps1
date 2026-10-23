param([ValidateSet('Offline','Multiplayer','Combat','Challenge','ChallengeAI','ChallengeCombat','LootStress','DeathLoot','Reconnect','Arena','ArenaMigration')][string]$Mode = 'Multiplayer', [int]$Seconds = 35, [switch]$Render, [switch]$Palette, [switch]$Audit, [switch]$CancelCheck, [ValidateRange(1,10)][int]$Clients = 2)
$ErrorActionPreference = 'Stop'
$neonRoot = Split-Path -Parent $PSScriptRoot
$neonExe = Join-Path $neonRoot 'Builds/Windows/NeonImpact.exe'
if (!(Test-Path -LiteralPath $neonExe)) { throw '請先執行 build-windows.ps1' }
$neonRoom = 'neon-validation-' + [Guid]::NewGuid().ToString('N').Substring(0,12)
$neonRun = Join-Path $neonRoot ('logs/' + $neonRoom)
New-Item -ItemType Directory -Path $neonRun -Force | Out-Null
$neonProcesses = @()
$neonCount = if ($Mode -in @('Offline','ChallengeAI')) { 1 } else { 2 }
if ($Mode -in @('Multiplayer','Arena','ArenaMigration')) { $neonCount = $Clients }
if ($Mode -eq 'DeathLoot') { $neonCount = 3 }
for ($index = 0; $index -lt $neonCount; $index++) {
  $neonName = '驗證' + ($index + 1)
  $neonReport = Join-Path $neonRun ('peer-' + $index + '.json')
  $neonLog = Join-Path $neonRun ('peer-' + $index + '.log')
  $neonArgs = @('-batchmode','-screen-width','1280','-screen-height','800','-neonSmoke','-neonName',$neonName,'-neonSeconds',$Seconds,'-neonReport',('"' + $neonReport + '"'),'-logFile',('"' + $neonLog + '"'))
  if ($Render) { $neonArgs = @($neonArgs | Where-Object { $_ -ne '-batchmode' }) }
  elseif ($neonCount -gt 2) { $neonArgs += '-nographics' }
  if ($Mode -eq 'Offline') { $neonArgs += @('-neonOffline','-neonSkills') }
  else { $neonArgs += @('-neonRoom',$neonRoom,'-neonMinPeers',$neonCount) }
  if ($Mode -in @('Combat','ChallengeCombat')) { $neonArgs += '-neonCombatCheck' }
  if ($Mode -in @('Challenge','ChallengeAI','ChallengeCombat')) { $neonArgs += '-neonChallenge' }
  if ($Mode -eq 'Reconnect') { $neonArgs += '-neonReconnect' }
  if ($Mode -eq 'ArenaMigration') { $neonArgs += @('-neonArena','-neonArenaMigration') }
  if ($Mode -eq 'Arena') { $neonArgs += '-neonArena' }
  if ($Mode -eq 'DeathLoot') { $neonArgs += '-neonDeathLoot' }
  if ($Mode -eq 'LootStress') { $neonArgs += '-neonLootStress' }
  if ($Palette) { $neonArgs += '-neonPalette' }
  if ($Audit) { $neonArgs += '-neonAudit' }
  if ($CancelCheck) { $neonArgs += '-neonCancelCheck' }
  $neonProcesses += Start-Process -FilePath $neonExe -ArgumentList $neonArgs -WindowStyle Hidden -PassThru
}
Write-Output "測試輸出：$neonRun"
foreach ($neonProcess in $neonProcesses) {
  if (!$neonProcess.WaitForExit(180000)) { Stop-Process -Id $neonProcess.Id -Force; throw 'Windows test exceeded 180 seconds' }
  if ($neonProcess.ExitCode -ne 0) { throw "Windows player $($neonProcess.Id) exited with $($neonProcess.ExitCode); inspect $neonRun" }
}
$neonPassed = $true
foreach ($neonReport in Get-ChildItem -LiteralPath $neonRun -Filter 'peer-?.json') {
  $neonResult = Get-Content -LiteralPath $neonReport.FullName -Raw | ConvertFrom-Json
  Write-Output ($neonResult | Select-Object passed,failure,features,testedSkills,maxPeers,maxActors,errors,elapsed | ConvertTo-Json)
  $neonPassed = $neonPassed -and $neonResult.passed
}
if (@(Get-ChildItem -LiteralPath $neonRun -Filter 'peer-?.json').Count -ne $neonCount -or !$neonPassed) { throw "測試失敗，請查看 $neonRun" }
