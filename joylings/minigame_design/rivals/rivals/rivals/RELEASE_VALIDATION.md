# 正式網頁與 Windows 版（2026-09-24）

後續多人連線追加測試發現並修正 Bot 貼牆避障漏判，已重新建置 Web 與 Windows 至 `Builds/Release-20260924-Multiplayer/`；更新包為 `Builds/RIVALS-Web-20260924-multiplayer.zip` 與 `Builds/RIVALS-Windows-x64-20260924-multiplayer.zip`。新一輪結果、版本雜湊與限制見 [網頁多人連線追加驗證](WEB_MULTIPLAYER_VALIDATION.md)。下文保留首次正式打包的紀錄。

## 版本與輸出

- 遊戲基礎提交：`39e8840c97b54f6e022094eeb6a77b9353c9f8ac`。
- 本次新增正式 Windows 建置入口，並修正實測發現的房主突然消失後卡住問題；交付內的來源雜湊保存本次實際程式狀態。
- Unity：6000.3.11f1；Fusion：2.1.2；連線版本：`rivals-web-16-kill-race`。
- 規則：4 對 4、先達 30 擊殺獲勝、死亡 3 秒後安全隨機復活。
- Web：`Builds/Release-20260924/Web`，IL2CPP Release／Wasm RuntimeSpeed，正式建置。
- Windows：`Builds/Release-20260924/Windows/Rivals.exe`，64 位元 Mono，`BuildOptions.None`，非 Development Build。
- 兩版皆直接使用目前場景及資源，附完整第三方授權、使用說明與版本資訊；Windows 的 Burst 除錯資料保留在 Logs，不隨遊戲出貨。

## 建置入口

Unity 選單 `RIVALS > Build current Web scene` 與 `RIVALS > Build current Windows release`。批次入口分別為：

```text
-buildTarget WebGL -executeMethod RivalsPrototype.Editor.WebBuild.BuildCurrent -rivalsWebOutput Builds/Release-20260924/Web
-buildTarget Win64 -executeMethod RivalsPrototype.Editor.WindowsBuild.BuildCurrent -rivalsOutput Builds/Release-20260924/Windows
```

正式建置紀錄存於 `Logs/ReleaseValidation/web-build-final.log` 與 `windows-build-final.log`。Windows 使用現有 Mono 後端及原生圖形管線，不需要玩家另外安裝 Unity。

## 房主同步中斷修正

首次跨版本測試確認 Windows 可當房主、Web 可加入，但強制終止 Windows 房主後，Web 在 90 秒內仍留在舊對戰。此時頁面仍更新、沒有遊戲例外，也沒有觸發原有關閉回呼；重現紀錄為 `Logs/ReleaseValidation/cross-play-stale-host-before.json`。

客戶端現在追蹤 Fusion `LatestServerTick`，若連續 15 秒沒有新的房主確認 tick，就使用既有的離房清理流程，釋放控制、清除對戰並返回大廳。房主、單人練習、連線建立中與尚未載入對戰的狀態不套用；本機掛起或主執行緒停頓超過 2 秒後，重新給予完整等待窗口，避免剛恢復前景就被誤判。此修正不改網路資料格式，也不加入房主遷移。

SDK 的 `LatestServerTick` 語意已核對本機 `Fusion.Runtime.xml`。Photon 的連線恢復功能與遊戲狀態同步是不同層次，參考 [Photon Connection Lost & Quick Reconnect](https://doc.photonengine.com/fusion/v2/manual/connection-and-matchmaking/lost-connection-handling)；本次判定依據是實際房主 tick 的更新。

## 驗證

- 第一輪 Web：8 次短按全部同步，含進場共 9 發／9 次特效，最慢回饋 13.1 ms；換彈、移動、停止後收斂及離線補 Bot 通過。
- 第一輪 Windows：單人練習、原生房主／客戶端皆成功，8 個座位、兩隊各 4 人。紀錄 `windows-practice.log`、`windows-host.log`、`windows-client.log`。
- 第一輪 Windows 圖形：使用實際 NVIDIA GeForce RTX 3060 啟動，渲染截圖 `windows-render.png` 已檢視；`RIVALS_CAPTURE` 與 `RIVALS_SMOKE_OK` 均成立。
- 最終建置：Web 與 Windows 均退出碼 0，分別包含 `RIVALS_WEB_BUILD_OK` 與 `RIVALS_WINDOWS_RELEASE_BUILD_OK target=StandaloneWindows64 development=false`。已確認建置期間程式來源無變動。
- 最終 Web 延遲回歸：WebSocket 收送各額外延遲 90 ms，實測 RTT 386.7 ms；8 次短按皆同步，含進場共 9 發／9 次特效，最慢本機回饋 12.3 ms。換彈、移動、停止後收斂及離線補 Bot 通過，位置誤差約 0.000328 單位。紀錄 `Logs/ReleaseValidation/Final/network-web-lag-check.json`。
- 最終跨版本：Windows 房主／Web 客戶端與 Web 房主／Windows 客戶端皆通過，正常連線維持超過 15 秒監測窗口，不會誤踢。強制終止 Windows 房主後，Web 實測 **16.052 秒**返回大廳，含清理時間；確認觸發 `RIVALS_HOST_SNAPSHOT_TIMEOUT`。同一 Web 頁面可重新開房讓 Windows 加入，Windows 客戶端離線後補回 Bot。紀錄 `Logs/ReleaseValidation/Final/cross-play-check.json`。
- 最終 Windows 單人與雙端連線均通過，包含 8 座位、兩隊各 4 人、真人與 Bot 補位。最終圖形程序正常退出，截圖已檢視。紀錄在 `Logs/ReleaseValidation/Final/windows-*.log`，圖形截圖為同目錄 `windows-render.png`。
- 沒有未處理的 JavaScript 或 Unity 遊戲例外。Windows `.exe` 的 PE Machine 欄位已確認為 `0x8664`（x64）。

`Tools/ReleaseCrossPlaySmokeTest.cjs` 使用實際正式 `.exe`、Chrome 及 Photon 房間，測試 Windows 房主／Web 客戶端與反向加入、4 對 4、房主被終止後離房，以及客戶端離線後補 Bot。額外維持正常連線超過逾時窗口，檢查不會誤踢仍同步中的玩家。

## 完整交付包

| 版本 | 檔案 | ZIP 大小 | 檔案數 |
| --- | --- | ---: | ---: |
| Web | `Builds/RIVALS-Web-20260924.zip` | 30,136,820 bytes | 21 |
| Windows x64 | `Builds/RIVALS-Windows-x64-20260924.zip` | 48,812,744 bytes | 203 |

兩份 ZIP 均已解讀並逐檔 SHA256 比對建置目錄，全部一致；Windows 包含執行所需的 DLL、Mono 執行環境與遊戲資料，不包含 `DoNotShip` 除錯資料。各包的 `版本資訊.json` 保存基礎提交、本次修正項目與實際程式 SHA256。

完整清單及雜湊為 `Builds/Release-20260924/release-manifest.json`，驗證紀錄為 `Logs/ReleaseValidation/Final/artifact-check.json`。本機 Web 預覽 <http://127.0.0.1:8187/> 的 HTML 與 WASM 均回應 200 且逐位元組吻合；WASM MIME 為 `application/wasm`。

本次測試在同一台 Windows 電腦執行；不代表所有顯示卡、作業系統與網路環境。30 擊殺及三秒復活的完整規則整合結果見 [KILL_RACE_VALIDATION.md](KILL_RACE_VALIDATION.md)。網站打包不等於部署，公開網站尚未因本次打包而更新。
