param([string]$Exe = (Join-Path $PSScriptRoot '..\Builds\Windows\Rivals.exe'))
$ErrorActionPreference = 'Stop'
$Exe = (Resolve-Path -LiteralPath $Exe).Path
$testRoot = Join-Path $env:TEMP ('RivalsSmoke-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testRoot | Out-Null
$room = 'test-' + [guid]::NewGuid().ToString('N').Substring(0,16)
$owned = @()
function Start-Duel([string]$mode, [string]$name) {
    $log = Join-Path $testRoot ($name + '.log')
    $humans = if ($name -eq 'practice') { 1 } else { 2 }
    $arguments = "-batchmode -nographics -duelSmoke $mode -expectedHumans $humans -room $room -logFile `"$log`""
    $process = Start-Process -FilePath $Exe -ArgumentList $arguments -WindowStyle Hidden -PassThru
    return @{ Process=$process; Log=$log; Name=$name }
}
try {
    $practice = Start-Duel '' 'practice'; $owned += $practice
    $hostRun = Start-Duel '-host' 'host'; $owned += $hostRun
    $deadline = [DateTime]::UtcNow.AddSeconds(30)
    while (!(Test-Path $hostRun.Log) -or !(Select-String -Path $hostRun.Log -Pattern 'RIVALS_CONNECTED Host' -Quiet)) {
        if ([DateTime]::UtcNow -gt $deadline -or $hostRun.Process.HasExited) { throw 'Host did not connect. Inspect logs.' }
        Start-Sleep -Milliseconds 500
    }
    $clientRun = Start-Duel '-client' 'client'; $owned += $clientRun
    foreach ($run in $owned) {
        if (!$run.Process.WaitForExit(60000)) { throw ($run.Name + ' timed out') }
        if ($run.Process.ExitCode -ne 0) { throw ($run.Name + ' failed with exit code ' + $run.Process.ExitCode) }
        if (!(Select-String -Path $run.Log -Pattern 'RIVALS_SMOKE_OK' -Quiet)) { throw ($run.Name + ' missing success marker') }
        if (Select-String -Path $run.Log -Pattern '^(InvalidOperationException|NullReferenceException|MissingReferenceException|ArgumentException):' -Quiet) { throw ($run.Name + ' has runtime errors') }
        Write-Output ($run.Name + ': ' + (Select-String -Path $run.Log -Pattern 'RIVALS_SMOKE_OK').Line)
    }
    Write-Output ('PASS. Logs: ' + $testRoot)
} finally {
    foreach ($run in $owned) {
        if (!$run.Process.HasExited) { Stop-Process -Id $run.Process.Id -ErrorAction SilentlyContinue }
    }
    Write-Output ('Test logs: ' + $testRoot)
}
