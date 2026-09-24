# 正式網頁版多人連線追加驗證（2026-09-24）

## 測試版本

- 程式基礎：`de93efeae4438ea8a837bc2ae043b5e1dfd1cf32`。
- 修正前成品：`Builds/Release-20260924/Web`；網址：`http://127.0.0.1:8187/`。
- 修正後成品：`Builds/Release-20260924-Multiplayer/Web`；網址：`http://127.0.0.1:8188/`。
- Unity 6000.3.11f1、Photon Fusion 2.1.2、Photon asia、協定 `rivals-web-16-kill-race`。
- 規則為 4 對 4、先達 30 擊殺獲勝、死亡 3 秒後安全隨機復活。
- 修正前先核對正式建置來源清單的 31 個檔案 SHA256。修正後另保存 32 個程式與模板等建置輸入 SHA256，重新產生 Web 與 Windows 正式成品。

## 長局發現與修正

修正前完整對戰觀察約 810 秒，25 次復活皆正常，雙端同時停在 13：12。額外 Web 訪客中途加入讀取角色狀態，確認數個 Bot 靠牆不再前進或開槍；主機和客戶端仍正常更新與同步，問題來自 Bot 避障。定位後主動結束該次瀏覽器測試並保存最後狀態，不將它列為完整對戰通過。

`DuelPlayer` 原本只使用半徑 0.4 的 SphereCast。角色半徑 0.32，貼牆時探測球可能已與牆面重疊，而 [Unity SphereCast 文件](https://docs.unity.com/en-us/engine/6000.3/script-reference/unityengine/physics/spherecast) 說明這類初始重疊不會回報碰撞。Bot 因而持續嘗試走進牆裡。

現在使用較低的射線補足前方障礙偵測，保留原本球形探測的側向寬度，仍允許沿牆或退離牆面。規則、網路資料欄位及玩家操作未改變，連線協定版本維持相同。

`Assets/Rivals/Editor/BotNavigationChecks.cs` 使用實測卡住位置與相同牆體尺寸，在真正 Unity 物理環境重現舊偵測漏判；11 項檢查通過，包含牆兩側、沿牆左右移動、退離牆面、平台矮掩體及開放側道。此測試只編譯進 Editor，沒有加入正式遊戲控制接口。

## 追加情境

新增 `Tools/WebMultiplayerRecoverySmokeTest.cjs`，使用四個隔離的 Chrome 瀏覽器環境與真實 Photon 房間。遊戲操作來自大廳按鈕、鍵盤及滑鼠，狀態只透過 `?diagnostics=1` 讀取。

1. 三位訪客同時加入一位房主；四端的角色、隊伍、名字及座位一致，每端只有一個本機輸入權。
2. 暫存一位訪客雙向 WebSocket 資料 2.5 秒，再依序恢復傳送，模擬短暫傳輸停頓。複製送出的記憶體，避免 Unity 重用緩衝區造成測試自己破壞封包。
3. 停頓期間按移動、放開並開槍；恢復後檢查位置收斂，再確認新的短按只增加一次房主確認的射擊。
4. 遊戲中關閉訪客的 WebSocket 並阻擋新連線，確認回到大廳、釋放滑鼠鎖定、清除舊狀態，其餘三人繼續對戰且 Bot 補位；恢復網路後同頁重加。
5. 暫存房主的傳輸資料，三位訪客均須在 30 秒內離開失去同步的戰局、釋放控制並恢復可用的大廳。
6. 原訪客不重新整理頁面即可建立新房。
7. 另一位玩家用相同名字另開房，確認兩個不同連線 ID；訪客選擇其中一間，只影響該房的人數。
8. 原房主離開後，重播舊房間按鈕的事件處理函式，模擬清單更新後才送達的點擊；確認顯示房間已離開清單，不會誤入同名房間，仍可正常加入存活的房間。

房主失聯可由 Photon 關房通知或本機 15 秒快照監測觸發清理。首次新增測試只接受快照監測訊息，但本次 Photon 約 5 秒即先通知斷線，遊戲已正常回大廳。測試已修正為驗證兩種正常通知路徑與實際清理結果，並只查看此次失聯之後的訊息。

## 修正後結果

| 測試 | 結果 |
| --- | --- |
| 連線生命週期 | 13 項通過：反覆離房重加、名字保留、設定中房主離線、清單斷線恢復、重新整理後沒有多餘連線、失敗後重試 |
| 9 個瀏覽器競爭 8 人房 | 通過：兩位訪客競爭最後一席、額滿失敗者回可操作大廳、滿房按鈕停用、釋出空位後重加、8 個唯一座位 |
| 4 人恢復與房間隔離 | 8 項通過；停頓暫存 212 筆傳輸資料、停止移動後雙端位置差約 0.000315 單位；房主失去資料後三位訪客全部在 5.095 秒內離房 |
| 增加延遲的雙人射擊與移動 | 雙向各加 90 ms；實測 RTT 約 389.2 ms；8 次短按全數同步，含入場點擊共 9 發／9 次特效；本機回饋最慢 26.4 ms；換彈、補 Bot 通過；停止後位置差約 0.000326 單位 |
| 一般雙人射擊與移動 | RTT 約 197.9 ms；8 次短按全數同步，含入場點擊共 9 發／9 次特效；本機回饋最慢 13.1 ms；換彈、補 Bot 通過；停止後位置差約 0.000135 單位 |
| Web／Windows 雙向互連 | 4 項通過；雙方均可當房主，Windows 房主被強制結束後 Web 在 16.046 秒回大廳；同頁可再建房、Windows 訪客離線補 Bot |
| 完整 30 擊殺對戰與中途參戰 | 約 1,149 秒觀察，最終藍隊 30：26，雙端勝負及分數一致，下一場歸零；55 次復活（真人 18、Bot 37），63 組雙端出生位置及方向一致；實際取樣復活間隔約 2.915～3.090 秒 |

修正版長局在 16：26 仍出現無人操作時的掩體僵持；沒有將它解讀為網路斷線，或宣稱已完成完整 Bot 尋路。後段使用 `Tools/WebActiveParticipant.cjs`，另開 Web 玩家以真實鍵盤／滑鼠走位接近敵方 Bot，對戰自然達到 30 擊殺並通過換場驗證。此參戰腳本不修改任何遊戲狀態，也沒有直接設定擊殺或復活。

以上連線與完整戰局測試沒有未處理的 JavaScript 或 Unity 遊戲例外。完整對戰不代表所有 Bot 無人對戰必定在固定時間內結束。

修正前證據保存於 `Logs/WebMultiplayer/Before/`，修正後的原始紀錄、瀏覽器與遊戲訊息及截圖在 `Logs/WebMultiplayer/Final/`。Logs 依專案既有設定不提交至 Git；本文件保留測試版本、方法、結果與限制。

## 更新的正式交付包

| 版本 | ZIP | 大小 | 檔案數 |
| --- | --- | ---: | ---: |
| Web | `Builds/RIVALS-Web-20260924-multiplayer.zip` | 30,137,635 bytes | 21 |
| Windows x64 | `Builds/RIVALS-Windows-x64-20260924-multiplayer.zip` | 48,812,931 bytes | 203 |

兩包均為正式建置，含使用說明、版本資訊與完整第三方授權。Windows `.exe` 已確認為 x64，`DoNotShip` 除錯資料移至 Logs。ZIP 已逐檔解讀並比對 SHA256，與建置目錄一致。

- Web ZIP SHA256：`ecce9d2b722e6d2e51bcb6ffc8b0f6c0c813e018733bf7abbd3d1402cac99678`。
- Windows ZIP SHA256：`59321491334a34f076f75bd771d82242da148dc7a70433431ad30efe7dd37312`。
- 建置紀錄：`Logs/WebMultiplayer/web-build.log`、`windows-build.log`，Unity 正常結束且有對應正式建置成功訊息。
- 成品清單：`Builds/Release-20260924-Multiplayer/release-manifest.json`，包含建置輸入及各檔案 SHA256；包驗證紀錄為 `Logs/WebMultiplayer/Final/artifact-check.json`。
- 本機 HTTP HTML／WASM 皆回應 200 且與成品逐位元組一致，WASM MIME 為 `application/wasm`；見 `Logs/WebMultiplayer/Final/http-check.json`。

## 重跑方式

使用 Node.js 20 以上、Playwright、Chrome／Chromium。可設定 `RIVALS_PLAYWRIGHT_MODULE` 與 `RIVALS_CHROME` 指向既有安裝。先啟動同一份正式建置：

```powershell
python Tools/serve_web.py --directory Builds/Release-20260924-Multiplayer/Web --port 8188
```

另一個終端設定測試輸出，依序執行，避免 9 人容量測試與其他測試爭用機器及 Photon 連線資源：

```powershell
$env:RIVALS_WEB_URL = 'http://127.0.0.1:8188/'
$env:RIVALS_TEST_OUTPUT = 'Logs/WebMultiplayer/Final'
node Tools/WebConnectionLifecycleSmokeTest.cjs
node Tools/WebRoomCapacitySmokeTest.cjs
node Tools/WebMultiplayerRecoverySmokeTest.cjs
node Tools/WebNetworkSmokeTest.cjs
node Tools/WebNetworkSmokeTest.cjs --lag
node Tools/WebKillRaceSmokeTest.cjs --complete-game
$env:RIVALS_EXE = 'Builds/Release-20260924-Multiplayer/Windows/Rivals.exe'
node Tools/ReleaseCrossPlaySmokeTest.cjs
```

對應紀錄為 `connection-lifecycle-check.json`、`room-capacity-check.json`、`multiplayer-recovery-check.json`、`network-web-check.json`、`network-web-lag-check.json`、`kill-race-web-check.json`、`cross-play-check.json`。完整對戰透過實際擊殺達標，不修改分數、不跳過倒數。

重跑長局時，可在另一個終端使用相同環境變數，等主測試印出 `respawn restores controls without another click` 後執行 `node Tools/WebActiveParticipant.cjs`，讓測試玩家繼續實際參戰。腳本只自動選取唯一一間 `擊殺xxxxxx的房間` 格式的測試房；若同時有多場測試，設定 `RIVALS_PARTICIPANT_ROOM` 為精確房名。結果保存在 `active-participant-check.json`。

## 公開發布與線上驗證

2026-09-24 已將上述正式 Web 成品發布到 [公開遊戲](https://scozirge.github.io/a-thought/rivals/)。GitHub Pages 使用 `gh-pages` 根目錄，部署提交為 `8287d178ba92d8da208d9c142b3fa1fbaddefc02`，對應程式提交 `c149541b23bbbfcc283be259204d6e7148ea6f92`。Pages API 確認該提交為 `built`，完成時間為臺灣時間 13:02:35；變更僅限 `rivals/`，教材及其他網站內容保留。

- 重新核對 32 個建置來源 SHA256，皆符合正式成品記錄。
- 從公開 HTTPS 網址讀取全部 21 個檔案，SHA256 與正式成品逐一相符。大型 `.data` 與 `.wasm` 使用 HTTP Range 206 分段讀取並完整組合後比對，其他檔案回應 200；WASM MIME 為 `application/wasm`。原有紅藍槍戰教材頁回應 200。
- 兩個隔離 Chrome 玩家透過公開網址與 Photon asia 建房、加入並完成射擊、換彈、移動同步與離線補 Bot：8 次短按皆同步，含入場點擊共 9 發／9 次特效，本機回饋最慢 13.1 ms，RTT 約 196.4 ms，停止後雙端位置差約 0.000189 單位。沒有未處理的 JavaScript 或 Unity 遊戲例外。
- 公開下載曾出現逾時：首次四人測試碰到 Playwright 預設 30 秒導覽上限，第二次未在 120 秒內載入可操作大廳；當時沒有遊戲例外。獨立下載 `.data` 的一次完整 gzip 請求耗時約 154 秒。連線與恢復腳本改為先等待 HTML，再以可操作大廳判定完成；可用 `RIVALS_STARTUP_TIMEOUT_MS` 指定啟動等待時間，預設 120 秒。
- 第三次公開四人測試使用 300 秒啟動窗口，房主成功載入並建房，但第二個隔離瀏覽器在 300 秒內仍未完成大廳載入，因此中止；**此次公開四人測試沒有通過**，不能套用上方本機正式版四人通過的結論。另一次冷載入觀察中，進度持續增加，約 163 秒完成 `.data` 下載與快取，171 秒仍顯示「正在準備戰場」；首次載入效能仍受外部下載狀況影響，未宣稱已解決。

原始線上紀錄保存於 `Logs/PublicMultiplayer/`，包括 `public-artifact-check.json`、`network-web-check.json`、`network-web-client.png`、`public-load-probe.json`，及 `multiplayer-recovery-check-first-attempt.json`、`multiplayer-recovery-check-second-attempt.json`、`multiplayer-recovery-check-third-attempt.json`。這次線上驗證仍在同一台電腦使用隔離的瀏覽器環境，尚未代表不同實體裝置或 ISP 的外部測試。

外部參與者請使用電腦版 Chrome／Edge，由一人建立房間，其他人在即時房間清單加入。最多 8 位真人；所有人應載入新版「先達 30 擊殺」介面。若仍顯示「5 小局」，按 `Ctrl + Shift + R` 強制重新載入；首次載入需下載大型資源，請等待進度完成。房主應保持遊戲頁面運作，離開後其他玩家會回大廳。

## 範圍與限制

- 測試使用同一台 Windows 電腦上的隔離 Chrome 環境與真實 Photon asia 服務，沒有宣稱完成多台實體裝置、跨 ISP 或長時間壓力測試。
- 模擬的是 WebSocket 傳輸延遲／停頓及實際關閉連線，不代表涵蓋所有弱網條件。
- 房主離開後返回大廳；未實作房主遷移或保留原玩家身分的斷線續局。
- Bot 仍使用簡易方向避障，沒有完整導航尋路；玩家都站定時仍可能在掩體後僵持。本次修正針對已重現的貼牆探測漏判。
- 修正回歸的主要驗證對象為本機正式成品；後續公開部署與線上驗證另記於上節。
