# 手機實機回饋修正

日期：2026-09-24。依使用者提供的 iPhone 橫向畫面，修正操作提示、按鈕重疊及瞄準操作，並依確認移除所有版本的滑行。

## 修改內容

- 手機不再顯示中央「點一下，繼續操作」面板與畫面上的操作提示文字。失焦清除舊輸入，回來後第一個觸碰直接恢復操作；手動開啟的選單仍保留。
- 手機瞄準改為切換：點一下開啟，放開手指後保持瞄準，再點一下關閉。啟用時顯示「瞄準中」並高亮，可同時移動、射擊與拖曳轉向。鍵鼠仍是按住滑鼠右鍵瞄準、放開取消。
- 失焦、取消觸控、選單、死亡、復活、切換全螢幕或操作模式，都會清除觸碰與瞄準狀態，避免下一次操作繼承舊狀態。
- 右側動作改為兩列網格，整組套用同一個安全邊距；左側搖桿與衝刺也由同一個容器定位。直向改成垂直排列左側控制，較矮的橫向視窗使用較小的按鈕，觸控目標至少 48 × 48 CSS px。
- 原本射擊按鈕使用安全邊距，瞄準／其他按鈕卻使用固定 right 值；安全邊距增大時，射擊往內移但鄰近按鈕沒有一起移動。新版以容器一起定位並保留固定間隔，防止這種重疊。[安全區變數說明](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env)。
- 移除手機滑行按鈕、鍵盤 C 輸入、動作列舉與角色滑行速度／計時判定。移除網路狀態欄位後，連線版本更新為 `rivals-web-17-touch-controls`，新版 Web／Windows 一起建置，避免新舊狀態格式混用。

## 瀏覽器控制與版面

`Tools/MobileLayoutChecks.cjs` 在 Chromium 與 WebKit 各測七種視窗，共 14 組通過：1280 × 517、844 × 390、812 × 303、667 × 300、568 × 260、390 × 844、320 × 568。注入 0–59 px 左右安全邊距及 0–34 px 底部安全邊距，逐一比對按鈕邊界、彼此交集、視窗範圍及觸控目標尺寸。

兩個引擎另以觸控事件驗證瞄準切換、射擊時保持瞄準、失焦後無提示直接恢復，以及瀏覽器不提供全螢幕 API 時的放大／返回。檢查用真實 DOM、CSS 與輸入橋接，Unity 狀態為模擬；並非 iPhone 實機測試。結果與截圖：`Logs/TouchFix/mobile-layout-check.json`、`chromium-*.png`、`webkit-*.png`。

`Tools/MobileBridgeChecks.cjs` 的 13 項檢查通過，包括真正多指事件同時移動／轉向／射擊、點按切換瞄準、第二根手指操作、失焦／死亡清理與全螢幕。既有 `Tools/PointerBridgeChecks.cjs` 的 8 種滑鼠鎖定與 iframe 情境亦通過。

## 正式遊戲多人連線

以下使用重新建置的非 Development Web 成品，透過真實 Photon 房間連線；手機為 Chrome 觸控模擬，另一端使用鍵盤滑鼠。

| 測試 | 結果 |
| --- | --- |
| 一般連線與死亡復活 | 13 項通過；往返延遲約 180 ms，六次短按射擊最慢回饋 61.5 ms；實際死亡至復活量測 3009 ms |
| 雙向各增加 90 ms WebSocket 延遲 | 12 項通過；實測往返約 395 ms，六次短按射擊最慢回饋 56.5 ms |
| 鍵鼠多人連線，雙向各增加 90 ms | 八次射擊均由房主確認、無重複視覺回饋，最慢回饋 28.6 ms；往返約 389 ms；停止移動後兩端誤差約 0.0002 公尺 |

手機測試實際驗證移動、轉向與射擊多指並行，短按射擊／裝填，瞄準放開後保持及再次點按取消，瞄準同時射擊／拖曳，跳躍、衝刺、兩種操作模式全螢幕、選單、失焦後直接觸碰恢復，手機／鍵鼠互換房主，房主離線返回大廳，以及離房後切換操作模式。死亡測試另外確認瞄準與舊觸碰歸零，復活不會自行移動或射擊。

鍵鼠測試另驗證 C 鍵不再移動角色（位移 0 公尺），滑鼠右鍵仍維持按住瞄準、放開取消，離線空位由 Bot 補齊。以上執行均未記錄瀏覽器頁面錯誤或遊戲例外。

結果：`Logs/TouchFix/Normal/web-mobile-check.json`、`Logs/TouchFix/Lag/web-mobile-check.json`、`Logs/TouchFix/KeyboardLag/network-web-lag-check.json`。實際遊戲畫面見 `Logs/TouchFix/Normal/phone-battle-landscape.png`，復活倒數見 `phone-respawn-countdown.png`。

## Windows 與網頁互連

Unity 6000.3.11f1 以正式模式重建 Web（IL2CPP／WebAssembly Release）與 Windows x64（Mono），兩者皆成功並回傳退出碼 0。建置紀錄：`Logs/TouchFix/web-build.log`、`windows-build.log`。

`Tools/ReleaseCrossPlaySmokeTest.cjs` 四項通過：Windows 當房主、Web 加入；Windows 房主離線後 Web 返回大廳；Web 當房主、Windows 加入；Windows 訪客離線後 Web 由 Bot 補回。雙向皆維持八個角色、紅藍各四人，並確認超過連線監看時間仍能持續遊玩，沒有遊戲例外。結果：`Logs/TouchFix/CrossPlay/cross-play-check.json`。

Windows 另通過實際繪圖煙霧測試：八個角色、兩隊各四人、一名本機玩家與七名 Bot，完成 24 次射擊；成功擷取遊戲場景及武器畫面。紀錄與截圖：`Logs/TouchFix/windows-render.log`、`windows-render.png`。

## 正式輸出

遊戲來源提交：`883a13a81bf538617ae198a8e2a97917fb983191`。Web 與 Windows 的版本資訊均附相同遊戲原始檔 SHA-256，連線版本為 `rivals-web-17-touch-controls`。輸出放回既有的 `Builds/Release-20260924-Mobile/` 路徑，原下載連結繼續有效。

| ZIP | 位元組 | 檔案數 | SHA-256 |
| --- | ---: | ---: | --- |
| `RIVALS-Web-20260924-mobile.zip` | 30,092,964 | 22 | `c47d68a58a1c65e6b13163649d2d1484457dcd4baf150d52453387461677d54d` |
| `RIVALS-Windows-x64-20260924-mobile.zip` | 48,647,046 | 203 | `4e73ecd21a10c1d3ba1b20e2ca925c3bd9877a9f84df751047459e07855f625f` |

兩個 ZIP 均通過 CRC 與逐檔 SHA-256 比對，未壓縮的執行檔與資料一併提交；Windows PE 架構為 x64。Web 包含公開遊戲連結的 `README.md`、使用說明、本機伺服器與完整素材授權，Windows 排除 Unity 產生的 `DoNotShip` 偵錯資料。檔案清單見 `Builds/Release-20260924-Mobile/release-manifest.json`。

由於移除網路狀態欄位，新版與舊版房間分開；所有人重新整理網頁，Windows 玩家下載新版，再一起開房。

## Git 與公開部署

- 程式與測試提交：`883a13a81bf538617ae198a8e2a97917fb983191`。
- 完整正式輸出提交：`fe82aaef94ef386db396709ceec7420fe9d5f91f`，已推送 `origin/master`。
- 公開網站提交：`8130b2d2c7f3b177d3853a2cf40edf140ebb68c0`，已推送 `origin/gh-pages`。僅更新 `rivals/`，發布前逐檔確認 Git 暫存內容與正式 Web 輸出一致。
- GitHub Pages 回報該提交 `built`，完成時間為 2026-09-24 15:51:54（台北時間）。
- 以 GitHub Git Tree API 確認遠端全部 228 個正式輸出檔案的 Git blob 識別碼與本機相同；兩個 ZIP 下載均回傳 HTTP 200，長度與本機完全一致。驗證報告：`Logs/TouchFix/staged-artifacts.json`、`remote-artifacts.json`、`pages-staged.json`。

公開遊戲：[紅藍槍戰手機操作修正版](https://scozirge.github.io/a-thought/rivals/?v=touch-fix-20260924)。

公開網址的全部 22 個檔案已實際下載並比對 SHA-256，與正式輸出完全相同，`.wasm` 的 Content-Type 為 `application/wasm`；課程頁仍回傳 HTTP 200。驗證報告：`Logs/TouchFix/Public/public-artifact-check.json`。

另直接從公開網址開啟兩個全新瀏覽器環境，完成 `Tools/WebMobileSmokeTest.cjs` 的 12 項多人連線檢查。手機／鍵鼠實際同房、點按瞄準後持續射擊與轉向、再次點按取消、無滑行按鈕、短按射擊／裝填、全螢幕、失焦後觸碰即恢復、互換房主與離房返回皆通過；六次短按射擊最慢回饋 56 ms，沒有頁面錯誤或遊戲例外。結果與公開站截圖：`Logs/TouchFix/Public/web-mobile-check.json`、`phone-lobby.png`、`phone-battle-landscape.png`。此輪包含從 GitHub Pages 首次下載遊戲資源；仍是 Chrome 手機觸控模擬，並非 iPhone／Android 實機執行。
