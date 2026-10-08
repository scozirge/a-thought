param([string]$Exe=(Join-Path $PSScriptRoot '../Builds/NetworkValidation4/Rivals.exe'),[int]$DelayMs=200)
$ErrorActionPreference='Stop'
$Exe=(Resolve-Path -LiteralPath $Exe).Path
$testRoot=Join-Path $env:TEMP ('RivalsNetwork-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testRoot | Out-Null
$room='net-'+[guid]::NewGuid().ToString('N').Substring(0,16)
$owned=@()
try {
  $hostLog=Join-Path $testRoot 'host.log'
  $hostProcess=Start-Process -FilePath $Exe -ArgumentList "-batchmode -nographics -duelSmoke -networkSmoke -keepAlive -host -networkDelayMs $DelayMs -room $room -logFile `"$hostLog`"" -WindowStyle Hidden -PassThru
  $owned+=$hostProcess
  $deadline=[DateTime]::UtcNow.AddSeconds(40)
  while(!(Test-Path -LiteralPath $hostLog) -or !(Select-String -LiteralPath $hostLog -Pattern 'RIVALS_CONNECTED Host' -Quiet)) {
    if($hostProcess.HasExited -or [DateTime]::UtcNow -gt $deadline){throw 'Host failed to connect'}
    Start-Sleep -Milliseconds 400
  }
  $clientLog=Join-Path $testRoot 'client.log'
  $clientProcess=Start-Process -FilePath $Exe -ArgumentList "-batchmode -nographics -duelSmoke -networkSmoke -keepAlive -client -networkDelayMs $DelayMs -room $room -logFile `"$clientLog`"" -WindowStyle Hidden -PassThru
  $owned+=$clientProcess
  $deadline=[DateTime]::UtcNow.AddSeconds(100)
  while(!$clientProcess.HasExited -or !$hostProcess.HasExited) {
    if([DateTime]::UtcNow -gt $deadline){throw 'Network regression timed out'}
    Start-Sleep -Milliseconds 400
  }
  foreach($entry in @(@($hostProcess,$hostLog,'HOST'),@($clientProcess,$clientLog,'CLIENT'))) {
    if($entry[0].ExitCode -ne 0){throw ($entry[2]+' failed')}
    if(!(Select-String -LiteralPath $entry[1] -Pattern ('RIVALS_NETWORK_'+$entry[2]+'_OK') -Quiet)){throw ($entry[2]+' missing success marker')}
    if(Select-String -LiteralPath $entry[1] -Pattern 'Exception:|NETWORK_CHECK_FAILED|NETWORK_TIMEOUT' -Quiet){throw ($entry[2]+' has runtime errors')}
    (Select-String -LiteralPath $entry[1] -Pattern 'RIVALS_NETWORK_.*OK|RIVALS_PREDICTED_SHOT').Line
  }
  if(!(Select-String -LiteralPath $hostLog -Pattern 'RIVALS_LAG_COMPENSATION_OK' -Quiet)){throw 'Lag compensation regression missing success marker'}
  (Select-String -LiteralPath $hostLog -Pattern 'RIVALS_LAG_COMPENSATION_OK').Line
}finally {
  foreach($process in $owned){if(!$process.HasExited){Stop-Process -Id $process.Id -ErrorAction SilentlyContinue}}
  Write-Output "Logs: $testRoot"
}
