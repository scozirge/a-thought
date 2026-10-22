param([ValidateRange(15,60)][int]$MasterSeconds = 25)
$ErrorActionPreference = 'Stop'
$neonRoot = Split-Path -Parent $PSScriptRoot
$neonExe = Join-Path $neonRoot 'Builds/Windows/NeonImpact.exe'
if (!(Test-Path -LiteralPath $neonExe)) { throw '請先執行 build-windows.ps1' }
$neonRoom = 'neon-lifecycle-' + [Guid]::NewGuid().ToString('N').Substring(0,12)
$neonRun = Join-Path $neonRoot ('logs/' + $neonRoom)
New-Item -ItemType Directory -Path $neonRun -Force | Out-Null
$neonProcesses = [System.Collections.Generic.List[System.Diagnostics.Process]]::new()

function Start-NeonPeer([string]$PeerName, [int]$Duration) {
    $peerReport = Join-Path $neonRun ($PeerName + '.json')
    $peerLog = Join-Path $neonRun ($PeerName + '.log')
    $peerArguments = @('-batchmode','-screen-width','1280','-screen-height','800','-neonSmoke',
        '-neonName',$PeerName,'-neonSeconds',$Duration,'-neonRoom',$neonRoom,'-neonMinPeers','2',
        '-neonReport',('"' + $peerReport + '"'),'-logFile',('"' + $peerLog + '"'))
    $peerProcess = Start-Process -FilePath $neonExe -ArgumentList $peerArguments -WindowStyle Hidden -PassThru
    $neonProcesses.Add($peerProcess)
    return $peerProcess
}

function Wait-NeonLog([string]$PeerName, [string]$Pattern, [System.Diagnostics.Process]$PeerProcess, [int]$TimeoutSeconds = 80) {
    $peerLog = Join-Path $neonRun ($PeerName + '.log')
    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    while ([DateTime]::UtcNow -lt $deadline) {
        if ((Test-Path -LiteralPath $peerLog) -and (Select-String -LiteralPath $peerLog -Pattern $Pattern -Quiet)) { return }
        if ($PeerProcess.HasExited) { throw "$PeerName 在等待 $Pattern 時提早退出；請查看 $peerLog" }
        Start-Sleep -Milliseconds 500
    }
    throw "$PeerName 等待 $Pattern 逾時；請查看 $peerLog"
}

function Wait-NeonExit([System.Diagnostics.Process]$PeerProcess, [int]$TimeoutSeconds) {
    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    while (!$PeerProcess.HasExited -and [DateTime]::UtcNow -lt $deadline) { Start-Sleep -Milliseconds 500 }
    if (!$PeerProcess.HasExited) { throw "程序 $($PeerProcess.Id) 未在期限內結束。" }
    if ($PeerProcess.ExitCode -ne 0) { throw "程序 $($PeerProcess.Id) 回傳錯誤碼 $($PeerProcess.ExitCode)。" }
}

try {
    Write-Output "生命週期測試輸出：$neonRun"
    $masterPeer = Start-NeonPeer 'Lifecycle-A' $MasterSeconds
    Wait-NeonLog 'Lifecycle-A' 'NEON_FUSION_SCENE_READY Battle' $masterPeer
    # B joins an already running battle, so existing AI and world objects must be restored from state.
    Start-Sleep -Seconds 3
    $survivorPeer = Start-NeonPeer 'Lifecycle-B' ($MasterSeconds + 60)
    Wait-NeonLog 'Lifecycle-B' 'NEON_FUSION_SCENE_READY Battle' $survivorPeer
    Wait-NeonExit $masterPeer ($MasterSeconds + 30)
    Wait-NeonLog 'Lifecycle-B' 'NEON_FUSION_MASTER_CHANGED.*local=True' $survivorPeer 35
    # C joins after the original master exited. B must keep the same live room and world.
    $latePeer = Start-NeonPeer 'Lifecycle-C' 25
    Wait-NeonLog 'Lifecycle-C' 'NEON_FUSION_SCENE_READY Battle' $latePeer
    Wait-NeonExit $latePeer 80
    Wait-NeonExit $survivorPeer ($MasterSeconds + 90)
    $results = @()
    foreach ($peerName in @('Lifecycle-A','Lifecycle-B','Lifecycle-C')) {
        $reportPath = Join-Path $neonRun ($peerName + '.json')
        if (!(Test-Path -LiteralPath $reportPath)) { throw "缺少測試報告 $reportPath" }
        $result = Get-Content -LiteralPath $reportPath -Raw | ConvertFrom-Json
        $results += $result
        if (!$result.passed -or $result.errors -ne 0 -or $result.maxPeers -lt 2 -or $result.maxActors -lt 2) {
            throw "$peerName 驗證失敗：$($result.failure)"
        }
        Write-Output ($result | Select-Object name,passed,connected,maxPeers,maxActors,errors,elapsed | ConvertTo-Json -Compress)
    }
    [ordered]@{ passed = $true; room = $neonRoom; lateJoin = $true; masterTransfer = $true; joinAfterTransfer = $true; reports = $results } |
        ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $neonRun 'lifecycle-summary.json') -Encoding utf8
    Write-Output 'NEON_LIFECYCLE_OK：晚加入、原房主離開、接管後加入均完成；細部AI/Boss狀態仍需搭配遊戲內驗證。'
}
finally {
    # Only terminate processes started by this test; never affect an existing player or Editor session.
    foreach ($peerProcess in $neonProcesses) {
        if (!$peerProcess.HasExited) { Stop-Process -Id $peerProcess.Id -Force -ErrorAction SilentlyContinue }
    }
}
