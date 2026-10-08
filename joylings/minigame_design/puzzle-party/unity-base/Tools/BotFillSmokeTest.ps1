param([string]$Exe = (Join-Path $PSScriptRoot '..\Builds\Windows\Rivals.exe'))
$ErrorActionPreference = 'Stop'
$Exe = (Resolve-Path -LiteralPath $Exe).Path
$testRoot = Join-Path $env:TEMP ('RivalsBotFill-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testRoot | Out-Null
$room = 'bots-' + [guid]::NewGuid().ToString('N').Substring(0,16)
$owned = @()
function Start-Player([string]$Mode, [string]$Name, [int]$Humans=1) {
    $log = Join-Path $testRoot ($Name + '.log')
    $arguments = "-batchmode -nographics -duelSmoke $Mode -keepAlive -smokeSeconds 5 -expectedHumans $Humans -room $room -logFile `"$log`""
    $process = Start-Process -FilePath $Exe -ArgumentList $arguments -WindowStyle Hidden -PassThru
    return @{ Process=$process; Log=$log; Name=$Name }
}
function Line-Count($Run) {
    if (Test-Path -LiteralPath $Run.Log) { return @(Get-Content -LiteralPath $Run.Log).Count }
    return 0
}
function Wait-Log($Run, [string]$Pattern, [int]$After=0, [int]$Seconds=45) {
    $deadline = [DateTime]::UtcNow.AddSeconds($Seconds)
    do {
        if (Test-Path -LiteralPath $Run.Log) {
            $match = Get-Content -LiteralPath $Run.Log | Select-Object -Skip $After | Select-String -Pattern $Pattern | Select-Object -Last 1
            if ($match) { return $match.Line }
        }
        if ($Run.Process.HasExited) { throw ($Run.Name + ' exited before: ' + $Pattern) }
        Start-Sleep -Milliseconds 200
    } while ([DateTime]::UtcNow -lt $deadline)
    throw ($Run.Name + ': missing ' + $Pattern)
}
function Wait-Roster($Run, [int]$Humans, [int]$After=0) {
    $bots = 8 - $Humans
    return Wait-Log $Run "RIVALS_ROSTER players=8 humans=$Humans bots=$bots bluePlayers=4 redPlayers=4 uniqueSeats=8 " $After
}
try {
    $hostRun = Start-Player '-auto' 'host'; $owned += $hostRun
    Write-Output (Wait-Roster $hostRun 1)
    Write-Output (Wait-Log $hostRun 'RIVALS_SMOKE_OK .*humans=1 bots=7 phase=[1-4] local=True')
    $clients = @()
    foreach ($number in 1..7) {
        $cursor = Line-Count $hostRun
        $mode = if ($number -eq 1) { '-auto' } else { '-client' }
        $run = Start-Player $mode ('client-' + $number) ($number + 1)
        $owned += $run; $clients += $run
        $line = Wait-Roster $hostRun ($number + 1) $cursor
        if ($line -notmatch 'phase=[1-4] round=[1-9]') { throw 'Joining reset the ongoing match' }
        Write-Output $line
        Write-Output (Wait-Roster $run ($number + 1))
    }
    $fullRun = Start-Player '-client' 'ninth-player'; $owned += $fullRun
    Write-Output (Wait-Log $fullRun 'RIVALS_CONNECT_FAILED.*GameIsFull')
    Stop-Process -Id $fullRun.Process.Id -ErrorAction SilentlyContinue
    $cursor = Line-Count $hostRun
    Stop-Process -Id $clients[0].Process.Id
    Write-Output (Wait-Roster $hostRun 7 $cursor)
    $cursor = Line-Count $hostRun
    # A force-killed client leaves Fusion simulation before its Photon Cloud actor times out.
    # Retry only GameIsFull while that stale cloud slot is released; other failures still fail.
    $rejoinDeadline = [DateTime]::UtcNow.AddSeconds(60)
    $attempt = 0
    do {
        $attempt++
        $replacement = Start-Player '-client' ('replacement-' + $attempt) 8; $owned += $replacement
        $connection = Wait-Log $replacement 'RIVALS_CONNECTED Client|RIVALS_CONNECT_FAILED'
        if ($connection -match 'RIVALS_CONNECTED Client') { break }
        if ($connection -notmatch 'GameIsFull' -or [DateTime]::UtcNow -gt $rejoinDeadline) { throw $connection }
        Stop-Process -Id $replacement.Process.Id -ErrorAction SilentlyContinue
        Write-Output 'Waiting for Photon Cloud to release the disconnected player slot.'
        Start-Sleep -Seconds 2
    } while ($true)
    Write-Output (Wait-Roster $hostRun 8 $cursor)
    Write-Output (Wait-Roster $replacement 8)
    $cursor = Line-Count $hostRun
    foreach ($run in $clients[1..6] + @($replacement)) {
        if (!$run.Process.HasExited) { Stop-Process -Id $run.Process.Id }
    }
    $line = Wait-Roster $hostRun 1 $cursor
    if ($line -notmatch 'phase=[1-4] round=[1-9]') { throw 'Leaving reset the ongoing match' }
    Write-Output $line
    foreach ($run in $owned) {
        if (Test-Path -LiteralPath $run.Log) {
            if (Select-String -LiteralPath $run.Log -Pattern '^(InvalidOperationException|NullReferenceException|MissingReferenceException|ArgumentException):|RIVALS_SMOKE_TIMEOUT' -Quiet) {
                throw ($run.Name + ' has runtime errors')
            }
        }
    }
    Write-Output 'PASS: solo start, 1-8 humans replacing bots, full-room rejection, disconnect refill, rejoin, and return to 1 human + 7 bots.'
} finally {
    foreach ($run in $owned) {
        if (!$run.Process.HasExited) { Stop-Process -Id $run.Process.Id -ErrorAction SilentlyContinue }
    }
    Write-Output ('Test logs: ' + $testRoot)
}
