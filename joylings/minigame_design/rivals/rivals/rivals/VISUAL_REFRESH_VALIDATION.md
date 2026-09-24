# 桌面與手機介面、場地辨識度更新

日期：2026-09-24。依使用者的手機實際畫面，改善文字過小、介面外觀與白色場地過亮的問題。

## 介面與場景

- 戰鬥 HUD 改成等比例的邏輯像素排版，網頁橋接回報 canvas 的 CSS 尺寸及安全邊距。手機不再將整張 1280 × 720 介面壓扁縮小；直向、橫向、全螢幕與高像素密度畫面都重新定位比分、生命與彈藥。
- 比分採大數字與隊伍色彩，四條存活指示取代過小的隊員頭像；手機比分為 32 px、生命為 25–32 px，動作按鈕文字為 14–21 CSS px。一般手機動作按鈕為 60 px、射擊為 80 px，極矮畫面仍保留至少 48 px 觸控目標。
- 統一深藍圓角面板、天藍與珊瑚紅配色。網頁大廳、操作模式、房間清單、觸控選單與 Windows 原生大廳一併調整，保留清楚的控制狀態與文字對比。
- 姓名、目標血量、命中回饋、裝填進度及復活倒數改用同一個響應式座標系。瞄準玩家時不再同時重複顯示兩張姓名牌。
- 地板改為霧面灰藍，牆面為中灰；降低格線反差、關閉場地材質鏡面反射並調整日光與環境光。地形尺寸、掩體位置與碰撞不變。
- 玩家軀幹、雙臂使用更鮮明的整片隊伍色，增加背部識別條，搭配較深的背景提高辨識度。仍遵守遮蔽與姓名顯示距離，不顯示牆後玩家。
- 30 擊殺獲勝、死亡 3 秒復活、手機點按切換瞄準、已移除的滑行及多人連線規則維持不變；連線版本仍為 `rivals-web-17-touch-controls`，本次沒有更動同步資料格式。

圓角面板使用 Unity 原生 GUI 繪製，不增加外部圖片下載或後製特效。[Unity GUI.DrawTexture 文件](https://docs.unity.com/zh-cn/engine/6000.3/script-reference/unityengine/gui/drawtexture)。

## 驗證方式

`Tools/MobileLayoutChecks.cjs` 檢查 Chromium 與 WebKit 各七種尺寸，包含手機安全邊距與極矮的橫向視窗。`Tools/WebVisualSmokeTest.cjs` 則啟動真正的 Unity / Photon 對戰，從唯讀診斷取得 HUD 的實際繪圖邊界，再與 HTML 操作按鈕逐一檢查交集。

實際畫面涵蓋兩種桌面尺寸及六種手機尺寸：1440 × 1000、1024 × 768、844 × 390、812 × 303、568 × 260、390 × 844、320 × 568、1280 × 517。測試包含裝置像素倍率 1.5 / 2、0–59 px 左右安全邊距與 0–34 px 底部安全邊距。

手機測試使用瀏覽器觸控模擬，WebKit 檢查使用實際 DOM 與 CSS；未聲稱已在 Android／iPhone 實機完成測試。截圖與報告保存於 `Logs/VisualRefresh/`。

## 最終版本的本機結果

- Unity WebGL 與 Windows x64 非開發版建置成功。Windows 原生大廳的設定按鈕改在背景完成後繪製，避免被新大廳蓋住。
- Chromium／WebKit 版面檢查共 14 組通過；真實 Unity 遊戲的 HUD 邊界與按鈕檢查共 8 組通過，無溢出、HUD 與按鈕交疊或 JavaScript 例外。已檢視大廳、桌面玩家辨識度、手機橫向及極矮視窗的實際截圖。
- 觸控輸入橋接 13 項、滑鼠鎖定橋接 8 項通過。
- 真實 Photon 手機／電腦連線 13 項通過：雙向開房、移動／瞄準／射擊同時操作、短按射擊與裝填、跳躍與衝刺、兩種全螢幕、選單、失焦清除、實際死亡與 3 秒復活、房主離開、回大廳切換操作方式。此次觸控回饋最長 54.4 ms。
- 桌面連線加入每方向 90 ms 的 WebSocket 延遲仍通過：8 次短按射擊回饋、9 發同步射擊、裝填、斷線 Bot 補位與已移除的 C 鍵滑行檢查。此次 RTT 約 392 ms，停止移動後雙方位置差約 0.0002 公尺。
- Windows 場景離屏渲染與 4 對 4 Bot 對戰成功；原生離屏截圖只檢查場景，不包含 IMGUI，HUD 外觀以正式 Web 版的實際渲染檢查。
- Windows／Web 互連 4 項通過：Windows 開房供 Web 加入、Windows 房主離開後 Web 回到大廳、Web 開房供 Windows 加入、Windows 訪客離開後 Web 以 Bot 補位。雙向皆為 8 名角色、2 位真人、6 位 Bot 與 4 對 4 分隊；無遊戲執行例外。
- 教學 H5 重新建置成功，300 個本機資源引用檢查通過；目錄與課程的遊戲入口更新為 `?v=visual-20260924`。

報告：`LayoutFinal/mobile-layout-check.json`、`VisualFinal/visual-check.json`、`MobileFinal/web-mobile-check.json`、`NetworkFinal/network-web-lag-check.json`，皆位於 `Logs/VisualRefresh/`。

## 正式交付檔案

來源提交：`c6de532de6d5ed835e86ecb3249405ba063b2ed9`。`Builds/Release-20260924-Mobile/` 保留固定下載路徑並替換成此次正式版本；使用者可從原來的 ZIP 連結取得新版。

| 成品 | 完整檔案數 | ZIP 位元組數 | ZIP SHA-256 |
| --- | ---: | ---: | --- |
| Web | 22 | 30,095,270 | `17a70cd0c42d34ea9e5484771922ad0169bd45604e6dafcb34e7af9399e01880` |
| Windows x64 | 203 | 48,648,764 | `d0fea8755f8394433134e3d58a02300812ca3d61d52a4976a8d6674b8618b437` |

兩個 ZIP 的 CRC、檔案清單與解壓後逐檔 SHA-256 均通過比對。Windows 包含 `Rivals.exe`、更新後的 `Assembly-CSharp.dll`、完整 Unity 執行環境及資料；Web 包含此次建置的 HTML、載入器、資料、框架與 WebAssembly。版本資訊保存來源 SHA-256，總清單位於 `release-manifest.json`。

## Git 與公開部署

- `master` 的正式檔案提交為 `774edfea9c4a2ea10ae235a34cc5a975e73343c8`，已推送成功。遠端 GitHub tree 的 228 個成品 blob 與本機完全一致，兩個 ZIP 回傳 HTTP 200，檔案長度與清單相符。
- `gh-pages` 部署提交為 `9d031dadd7dc187d87f14a69a84fd6535e1075b4`。GitHub Pages API 確認此提交狀態為 `built`，公開站 22 個遊戲檔案逐檔 SHA-256 全部吻合，`.wasm` 以 `application/wasm` 提供。
- 教學目錄、紅藍槍戰課程及所需的新資源共 10 個檔案，公開站 SHA-256 全部吻合。1440 px 桌面及 390 px 手機的四組展開問題、鍵盤操作、目錄與段落導覽皆通過，無水平溢出或頁面例外。
- 兩個教學入口的「玩紅藍槍戰」均已實際點擊驗證，會在新分頁開啟 [本次最新版](https://scozirge.github.io/a-thought/rivals/?v=visual-20260924)。
- 從公開網址首次載入兩個獨立瀏覽器後，手機觸控與桌面鍵鼠的真實 Photon 連線共 12 項通過，包括雙向開房加入、同步移動／轉向／射擊、點按瞄準、短按射擊與裝填、跳躍與衝刺、兩種全螢幕、選單、失焦恢復、房主離開及大廳切換模式；無頁面或遊戲執行例外，此輪觸控回饋最長 62.1 ms。公開站測試報告為 `Logs/VisualRefresh/Public/Mobile/web-mobile-check.json`；3 秒復活已另由本機最終正式版本的第 13 項測試驗證。

遠端與部署報告保存於 `Logs/VisualRefresh/remote-artifacts.json`、`Logs/VisualRefresh/Public/public-artifact-check.json`；教學驗證位於 `hatchbeasts/outputs/rivals-visual-public.json` 及 `hatchbeasts/outputs/rivals-visual/live-results.json`。
