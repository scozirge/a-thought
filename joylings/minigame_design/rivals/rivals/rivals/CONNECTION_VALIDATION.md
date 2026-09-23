# 連線修正與驗證（2026-09-24）

## 已重現的問題

`Tools/WebConnectionLifecycleSmokeTest.cjs --before` 在修正前的實際 Web 成品中重現：

1. 訪客離房後，Unity 重新載入場景，將原本輸入的名字改成隨機名字；HTML 輸入框仍顯示舊名字，兩邊不一致。
2. 訪客開著設定時，房主關閉瀏覽器，訪客仍停留在設定畫面；等待 90 秒也沒有自動顯示大廳。
3. 離房後 `window.rivalsDiagnostics` 仍包含上一場的角色與階段，可能讓測試誤判已成功重新進房。

修正前的一般雙人連線測試通過：8 次短按均同步，包含入場點擊共 9 發／9 次特效；裝填、移動、離線補 Bot 正常。這些問題集中在進出房與斷線後的狀態清理。

## 修正與整理

- `DuelConnection.cs` 集中建立、加入、離開、逾時、錯誤提示和 Runner 清理；非同步工作持有各自的 Runner，回呼只處理目前的連線。
- 主動離房只結束 Runner 與戰局，保留場景及使用者名稱；同時清除選單、輸入、HUD 目標、角色名冊、相機與測試診斷的舊狀態。
- 意外斷線會關閉設定／授權畫面，恢復大廳；大廳連線與建房／加入均設 30 秒取消期限，失敗後釋放忙碌狀態，大廳每 5 秒重試。
- 大廳狀態與進房錯誤分開保存，重新連接清單不會立刻蓋掉「房間已滿」等原因；加入前也檢查已知的滿房或關閉狀態。
- 對戰中不再每秒四次序列化與傳送已隱藏的大廳清單。
- `WebBuild.BuildCurrent` 使用現有場景與 Prefab，可用 `-rivalsWebOutput` 指定獨立成品目錄，避免一般原型建置重新產生手動調整過的資產。
- 測試採精確房名比對及實際遊戲畫面狀態；`RIVALS_TEST_OUTPUT` 可讓不同測試工作保留各自的紀錄。

Runner 使用方式依照 [Photon Fusion NetworkRunner 文件](https://doc.photonengine.com/fusion/v2/manual/network-runner)：斷線或連線失敗後銷毀舊 Runner，下一次連線建立新的實例。

## 執行方式

需要 Node.js 20 以上、Playwright 與 Chrome／Chromium。可設定 `RIVALS_PLAYWRIGHT_MODULE` 與 `RIVALS_CHROME` 指向現有安裝。

在 Unity 執行 `RIVALS > Build current Web scene` 可更新一般 `Builds/Web`。批次驗證採 `RivalsPrototype.Editor.WebBuild.BuildCurrent -rivalsWebOutput Builds/WebConnection`。

```powershell
python Tools/serve_web.py --directory Builds/WebConnection --port 8185
```

另一個終端依序執行，避免 9 人測試與其他測試互相占用雲端連線名額：

```powershell
$env:RIVALS_WEB_URL = 'http://127.0.0.1:8185/'
$env:RIVALS_TEST_OUTPUT = 'Logs/ConnectionValidation'
node Tools/WebConnectionLifecycleSmokeTest.cjs
node Tools/WebNetworkSmokeTest.cjs
node Tools/WebNetworkSmokeTest.cjs --lag
node Tools/WebRoomCapacitySmokeTest.cjs
```

`--lag` 僅對測試訪客的 WebSocket 收送各增加 90 ms，屬於可重現的延遲情境，不代表涵蓋所有真實弱網條件。9 人測試使用 9 個隔離瀏覽器環境，先加入 7 人，再讓兩位訪客競爭最後一個名額，最後釋出座位供失敗者重試。

## 本次結果

修正後四組實測全部通過，測試使用本機 `http://127.0.0.1:8185/` 的 `Builds/WebConnection`，連接 Photon asia；協定版本維持 `rivals-web-15-pointer-lock`。

| 檢查 | 結果 |
| --- | --- |
| 進出房／斷線生命週期 | 13 項通過：兩次離房重加入、保留姓名、清除舊診斷、設定中房主離線返回大廳、大廳傳輸斷線恢復、連續 3 次重新整理後只有 1 條有效連線、建房連線失敗釋放忙碌狀態、恢復網路後再次建房 |
| 一般雙人連線 | RTT 約 179.6 ms；8 次短按均同步，包含入場點擊為 9 發／9 次特效；本機回饋最慢 24.8 ms；裝填、移動及離線補 Bot 通過；停止後雙端位置差約 0.000254 單位 |
| 增加延遲的雙人連線 | 訪客 WebSocket 每個方向增加 90 ms，RTT 約 365.9 ms；8 次短按均同步，9 發／9 次特效；本機回饋最慢 9.8 ms；裝填、移動及補 Bot 通過；停止後位置差約 0.000395 單位 |
| 9 人競爭 8 人房間 | 先有 7 位真人，兩位訪客同時嘗試加入；額滿失敗者正常返回可操作的大廳，滿房按鈕停用；一人離線後，原失敗者重試成功；房內維持 8 個唯一座位，沒有 Bot 占用真人名額 |

上述測試沒有未處理的瀏覽器或遊戲例外。延遲測試中本機回饋數字較小屬於當次量測差異，不代表增加網路延遲能改善效能。

驗證紀錄：

- 修正前：`Logs/connection-lifecycle-before.json`，包含三類問題的失敗斷言；`Logs/connection-settings-before.png` 顯示已實際開啟設定畫面。
- 修正後：`Logs/ConnectionValidation/connection-lifecycle-check.json`、`network-web-check.json`、`network-web-lag-check.json`、`room-capacity-check.json`。
- 建置：`Logs/connection-web-build.log` 有 `RIVALS_WEB_BUILD_OK`，Unity 正常結束（exit 0）；C# 與 Fusion 程式處理通過。`Logs/connection-build-inputs.json` 保存的程式、橋接與模板雜湊均與最後來源一致。
- 成品：`Builds/RIVALS-Web-connection-fixes.zip`，34,439,352 bytes、18 個檔案，已逐檔驗證和 `Builds/WebConnection` 一致，見 `Logs/ConnectionValidation/artifact-check.json`。
- HTTP HTML／WASM 回應 200，設定 `Cache-Control: no-store`。WASM SHA256：`706506b769722576a2d54b111b7c66119dbed193bc90fb42ee2ac91a9f1fa9c6`。

## 範圍與限制

- 測試連接真實 Photon asia 服務，瀏覽器皆在同一台 Windows 主機；不等於已完成跨裝置、跨 ISP 或長時間壓力測試。
- 房主離開後回到大廳，仍未實作房主遷移與保留同一身分的斷線續局。
- 上述連線專項驗證先以獨立的 `Builds/WebConnection` 交付；2026-09-24 已核對 C#、橋接與設定來源雜湊，將同一份遊戲程式合併新的滑鼠相容操作 HTML 至 `Builds/Web`，並發布到正式網站。後續發布驗證見 `VALIDATION.md`。
