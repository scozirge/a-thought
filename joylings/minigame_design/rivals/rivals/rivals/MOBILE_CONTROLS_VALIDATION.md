# 手機操作與全螢幕驗證

測試日期：2026-09-24。Unity 6000.3.11f1，IL2CPP Release WebAssembly，非 Development Build。

## 功能與修正

- 大廳提供「鍵盤滑鼠／手機觸控」，依裝置選擇初始模式並記住手動選擇；禁止 localStorage 時仍能切換。
- 觸控模式提供左側搖桿、右側拖曳轉向，以及射擊、瞄準、跳躍、衝刺、裝填、滑行。射擊與瞄準按鈕可同時拖曳轉向，多根手指各自追蹤與放開。
- 手機與鍵鼠使用相同 Photon 房間及既有輸入結構；連線版本維持 `rivals-web-16-kill-race`，先達 30 擊殺、死亡三秒後隨機復活。
- 手機選單支援繼續、聲音開關、回到大廳。以 Pointer Events 處理第二根手指操作選單，防止缺少相容 click 事件或合成滑鼠事件搶走遊戲焦點。
- 跳躍、裝填、滑行的極短點按保留 180 ms，並保留尚未讀取的按下事件；射擊採累積次數，避免短點按遺失或重複播放。取消、失焦、死亡、復活、選單與操作模式變更清除觸控及短按保留狀態。
- 鍵盤的跳躍、裝填、滑行累積到 Fusion 讀取後的下一次 Update 才清除，並讀取持續按住狀態，避免同一畫面更新中多次 OnInput 讀取時只留下第一個 tick。實作依據 [Photon 玩家輸入文件](https://doc.photonengine.com/fusion/v2/manual/input/player-input#avoiding_missed_inputs)。
- 兩種模式都可進出原生全螢幕；API 不存在或拒絕時，改用填滿可用視窗的版面並保留退出按鈕。此降級方式可能保留瀏覽器網址列，符合 [Fullscreen API 的支援限制](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen)。
- 手機橫向版面填滿可用空間、處理安全區邊距，直向提示旋轉但仍可操作；觸控裝置最高以 1 倍像素比繪製，降低高密度螢幕的 GPU 負擔。

## 測試方式

`Tools/MobileBridgeChecks.cjs` 直接載入正式 HTML 的控制程式與 `.jslib`，由 Chrome CDP 發送真正多指觸控事件；Unity 狀態在此獨立檢查中為模擬。12 項通過，涵蓋三指操作、短按、分別放開、取消、失焦、死亡、第二指點選單、原生全螢幕、拒絕／缺少 API 降級、直向觸控目標、模式切換與禁止儲存。既有 `Tools/PointerBridgeChecks.cjs` 的 8 種滑鼠鎖定／iframe 情境亦通過。

`Tools/WebMobileSmokeTest.cjs` 則載入實際正式遊戲，以兩個隔離的 Chrome 瀏覽器環境經 Photon 連線：鍵鼠視窗 1440 × 1000，手機模擬視窗 844 × 390、觸控及行動裝置模式。透過正常大廳和真實輸入操作，沒有血量、位置、分數或計時器修改介面。

可加 `--lag` 對手機 WebSocket 收送各增加 90 ms；加 `--respawn` 透過觸控走向敵隊 Bot，由實際戰鬥產生死亡。所有腳本接受 `RIVALS_WEB_URL`、`RIVALS_PLAYWRIGHT_MODULE`、`RIVALS_CHROME`、`RIVALS_TEST_OUTPUT`，實際遊戲腳本另接受 `RIVALS_STARTUP_TIMEOUT_MS`。

## 正式成品實測

`Logs/MobileControls/web-build-input.log`：`RIVALS_WEB_BUILD_OK`，Unity 結束碼 0。建置後比對 HTML 控制程式與來源一致。

- 一般手機／鍵鼠混合連線：`Logs/MobileControls/Final/web-mobile-check.json`，12 項通過，含手機當訪客及房主、雙端移動與射擊同步、6 次 35 ms 點射、35 ms 裝填、瞄準、跳躍、衝刺、滑行、全螢幕、選單、失焦恢復、離房與大廳切換操作模式。射擊畫面回饋最慢 60.4 ms，該次 RTT 181.3 ms，無瀏覽器／Unity 例外。
- 衝刺加速完成後 0.9 秒移動 7.33 公尺；短按滑行移動 5.06 公尺。衝刺速度量測排除起步加速階段。
- 實際死亡至復活約 2,983 ms，新位置與死亡位置相距 46.29 公尺；恢復 300 生命、手槍及 12 發子彈。保留原本手指接觸仍不移動或射擊，新的觸碰可以正常開槍。
- 鍵鼠回歸：`Logs/MobileControls/KeyboardFinal/network-web-check.json`，8 次快速射擊、60 ms 裝填、雙端彈藥／射擊次數、移動與離線 Bot 補位均通過。射擊畫面回饋最慢 13.1 ms，RTT 176.2 ms，停止後雙端位置差約 0.00025 公尺。
- 手機延遲測試：`Logs/MobileControls/LagFinal/web-mobile-check.json`，收送各額外 90 ms，11 項通過，該次 RTT 388.6 ms、射擊畫面回饋最慢 54.5 ms；35 ms 點按裝填仍與房主一致。此輪不重複等待 Bot 造成死亡。
- 鍵鼠延遲回歸：`Logs/MobileControls/KeyboardLagFinal/network-web-lag-check.json`，收送各額外 90 ms，RTT 386.7 ms、射擊畫面回饋最慢 13.1 ms；60 ms 裝填、射擊、移動及離線補位通過，停止後雙端位置差約 0.00020 公尺。

手機大廳、橫向戰鬥、三秒復活倒數的截圖保存在 `Logs/MobileControls/Final/`；上述量測來自同一部電腦上的隔離瀏覽器，連線經實際 Photon 雲端，不能代表不同手機硬體或各地行動網路的效能。

## 成品與限制

正式成品：`Builds/Release-20260924-Mobile/Web/`；完整 ZIP：`Builds/RIVALS-Web-20260924-mobile.zip`。成品附使用說明、版本來源雜湊、全部素材授權；`Builds/Release-20260924-Mobile/release-manifest.json` 記錄 ZIP 與每個檔案的 SHA-256。

- 程式來源提交：`6cd1cf45e12c7377b1e7e74bb4cf0805b4b77ee3`。
- ZIP 大小：30,090,980 bytes，21 個檔案、展開後 75,695,927 bytes；CRC 與全部檔案 SHA-256 比對通過。
- ZIP SHA-256：`e226247a1e9bd210114cca3fb7614844358d291ff2a7a94d39cbed18cfb10897`。
- 正式 WASM：`Build/3cc0adbfd463c6202046db4718a92b45.wasm`，50,681,811 bytes。
- 發布到 `gh-pages` 的提交：`6a4faf8094347f5d272de1aa65fe326a2c318667`。發布區的 21 個檔案及 Git 暫存內容逐檔與正式包比對一致，僅更新 `rivals/`。
- GitHub Pages API 已確認該提交狀態為 `built`，完成時間為 2026-09-24 14:24:14（台北）。公開站點下載的 21 個檔案 SHA-256 全部與正式包相同，WASM 回傳 `application/wasm`，原課程頁仍為 HTTP 200。紀錄：`Logs/MobileControls/Public/public-artifact-check.json`。
- 兩個全新的瀏覽器直接開啟公開網址，完成正式資源下載後執行相同混合連線測試：11 項全部通過，手機與鍵鼠能互相開房、加入，操作與裝填同步、全螢幕、選單及離房返回大廳正常。射擊畫面回饋最慢 55.8 ms，未記錄到瀏覽器／Unity 例外；紀錄與公開遊戲截圖在 `Logs/MobileControls/Public/`。此輪未額外注入延遲，也未重跑 Bot 致死測試。

公開網址：[紅藍槍戰](https://scozirge.github.io/a-thought/rivals/)。首次下載仍可能需要數分鐘，請等待遊戲載入完畢。房主需保持瀏覽器運作，背景節流與房主遷移限制沿用既有版本。

本次手機測試使用 Windows Chrome 的行動裝置與多點觸控模擬，尚未取得 Android 或 iPhone 實機驗證。Safari／iOS 的效能、記憶體壓力、瀏海及原生全螢幕行為仍需實機回饋；不將模擬結果視為所有手機相容性保證。
