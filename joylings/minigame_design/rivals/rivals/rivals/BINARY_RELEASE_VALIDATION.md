# 完整主程式上傳驗證

日期：2026-09-24。依使用者要求，正式輸出與程式碼一起提交到 `master`；Unity 建置快取及歷史測試輸出仍由原有忽略規則管理。

## 完整輸出

| 版本 | 主程式目錄 | 檔案數 | ZIP 大小 |
| --- | --- | ---: | ---: |
| Web | `Builds/Release-20260924-Mobile/Web/` | 21 | 30,090,980 bytes |
| Windows x64 | `Builds/Release-20260924-Mobile/Windows/` | 203 | 48,647,235 bytes |

Windows 包含 `Rivals.exe`、`UnityPlayer.dll`、`UnityCrashHandler64.exe`、`Rivals_Data`、`MonoBleedingEdge`、`D3D12`、全部素材授權、版本資訊及使用說明。ZIP 以 `Builds/RIVALS-Windows-x64-20260924-mobile.zip` 提供，完整解壓縮後執行 `Rivals.exe`。Burst 的 `DoNotShip` 除錯資料不屬於執行套件。

Web 的 ZIP 為 `Builds/RIVALS-Web-20260924-mobile.zip`，內容與已公開發布、測試通過的手機版相同；本次沒有重新產生 Web 成品。兩包 CRC 與每個檔案的 SHA-256 均比對通過。

- Windows ZIP SHA-256：`58811776d33003ddb3b611f54644e3fb21df00e63e2d760c95daa570ca524989`。
- Web ZIP SHA-256：`e226247a1e9bd210114cca3fb7614844358d291ff2a7a94d39cbed18cfb10897`。
- 完整成品清單：`Builds/Release-20260924-Mobile/release-manifest.json`，ZIP 路徑相對於 Unity 專案根目錄。
- `.gitignore` 明確納入這次正式目錄及兩份 ZIP；`.gitattributes` 讓正式輸出保持原始位元組，避免 Git 換行轉換破壞雜湊。

## Windows 建置與連線

Windows 由 `cf586f3a1ebc1dae889ca6cc0bfaf0ee1e914ce6` 的遊戲程式重新建置。遊戲來源逐檔雜湊與既有 Web 版相同。Unity 6000.3.11f1、Mono、`BuildOptions.None`，非 Development Build；PE Machine 為 `0x8664`，確認為 x64 主程式。

`Logs/PublishAll/windows-build.log` 包含 `RIVALS_WINDOWS_RELEASE_BUILD_OK target=StandaloneWindows64 development=false`，Unity 正常以 0 結束。

`Tools/ReleaseCrossPlaySmokeTest.cjs` 載入本次正式 EXE 與 Web 成品，經實際 Photon 房間驗證下列四項全部通過：

1. Windows 當房主，Web 加入，總共八個座位、紅藍兩隊各四人。
2. 終止 Windows 房主後，Web 能返回大廳。
3. 同一 Web 頁面重新開房，Windows 可以加入；雙向連線均維持超過房主同步逾時窗口，不會誤踢仍在同步的玩家。
4. Windows 訪客離線後，Web 房主以 Bot 補齊八個座位。

結果：`Logs/PublishAll/cross-play-check.json`，沒有記錄到遊戲例外。Web 的觸控、全螢幕、公開站點連線與復活結果見 [手機操作驗證](MOBILE_CONTROLS_VALIDATION.md)。

另以實際 NVIDIA GeForce RTX 3060 啟動 Windows 正式版，完成單人練習、八座位模擬與離屏圖形截圖，包含 `RIVALS_CAPTURE` 及 `RIVALS_SMOKE_OK`。已檢視場地、槍械與光照畫面；紀錄及截圖為 `Logs/PublishAll/windows-render-final.log`、`windows-render.png`。

## Git 成品完整性

提交前直接讀取 Git 暫存區的 blob，比對未壓縮成品、兩份 ZIP 與清單：共 227 個檔案、275,325,775 bytes，SHA-256 全部一致。最大單檔為 50,681,811 bytes 的 WASM。Git 納入的 `Builds` 路徑與交付清單完全相同，沒有遺漏執行資料，也沒有混入建置除錯資料。結果：`Logs/PublishAll/staged-artifacts.json`。
