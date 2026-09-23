param([string]$Exe = (Join-Path $PSScriptRoot '..\Builds\Windows\Rivals.exe'))
$ErrorActionPreference = 'Stop'
$Exe = (Resolve-Path -LiteralPath $Exe).Path
$testRoot = Join-Path $env:TEMP ('RivalsClassroom-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testRoot | Out-Null
$room = 'class-' + [guid]::NewGuid().ToString('N').Substring(0,16)
$owned = @()
function Start-Player([string]$Mode, [string]$Name) {
    $log = Join-Path $testRoot ($Name + '.log')
    $arguments = "-batchmode -nographics -duelSmoke $Mode -expectedPlayers 8 -room $room -logFile `"$log`""
    $process = Start-Process -FilePath $Exe -ArgumentList $arguments -WindowStyle Hidden -PassThru
    return @{ Process=$process; Log=$log; Name=$Name }
}
function Wait-Log($Run, [string]$Pattern, [int]$Seconds=30) {
    $deadline = [DateTime]::UtcNow.AddSeconds($Seconds)
    while (!(Test-Path -LiteralPath $Run.Log) -or !(Select-String -LiteralPath $Run.Log -Pattern $Pattern -Quiet)) {
        if ([DateTime]::UtcNow -gt $deadline -or $Run.Process.HasExited) { throw ($Run.Name + ': missing ' + $Pattern) }
        Start-Sleep -Milliseconds 200
    }
}
try {
    $hostRun = Start-Player '-auto' 'host'; $owned += $hostRun
    Wait-Log $hostRun 'RIVALS_CONNECTED AutoHostOrClient'
    foreach ($number in 1..7) {
        $mode = if ($number -eq 1) { '-auto' } else { '-client' }
        $clientRun = Start-Player $mode ('client-' + $number); $owned += $clientRun
        $connectedMode = if ($number -eq 1) { 'AutoHostOrClient' } else { 'Client' }
        Wait-Log $clientRun ('RIVALS_CONNECTED ' + $connectedMode)
    }
    Wait-Log $hostRun 'RIVALS_PLAYER_SPAWN seat=7'
    $fullRun = Start-Player '-client' 'ninth-player'; $owned += $fullRun
    Wait-Log $fullRun 'RIVALS_CONNECT_FAILED.*GameIsFull' 20
    if (Select-String -LiteralPath $fullRun.Log -Pattern 'RIVALS_CONNECTED Client' -Quiet) { throw 'Ninth player entered a full room' }
    Stop-Process -Id $fullRun.Process.Id -ErrorAction SilentlyContinue
    Write-Output 'PASS: ninth player was rejected because the room is full.'
    foreach ($run in ($owned | Where-Object { $_.Name -ne 'ninth-player' })) {
        if (!$run.Process.WaitForExit(60000)) { throw ($run.Name + ' timed out') }
        if ($run.Process.ExitCode -ne 0) { throw ($run.Name + ' failed with exit code ' + $run.Process.ExitCode) }
        $result = Select-String -LiteralPath $run.Log -Pattern 'RIVALS_SMOKE_OK players=8 bluePlayers=4 redPlayers=4'
        if (!$result) { throw ($run.Name + ' did not reach a balanced eight-player match') }
        if (Select-String -LiteralPath $run.Log -Pattern '^(InvalidOperationException|NullReferenceException|MissingReferenceException|ArgumentException):' -Quiet) { throw ($run.Name + ' has runtime errors') }
        Write-Output ($run.Name + ': ' + $result.Line)
    }
    Write-Output ('PASS. Logs: ' + $testRoot)
} finally {
    foreach ($run in $owned) {
        if (!$run.Process.HasExited) { Stop-Process -Id $run.Process.Id -ErrorAction SilentlyContinue }
    }
    Write-Output ('Test logs: ' + $testRoot)
}
