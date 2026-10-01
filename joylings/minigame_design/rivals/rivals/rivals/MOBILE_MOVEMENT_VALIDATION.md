# 手機移動與橫向操作驗證（2026-10-01）

發布批次：`mobile-controls-20261001`。保留 `star-progress-20261001` 答題介面及 `rivals-web-26-respawn-default` 連線版本。

## 問題與修正

- **已重現的移動中斷**：舊版在每個 `resize` 事件都呼叫 `touch.reset()`。用真正的多點觸控按住搖桿，再送出未轉向的尺寸通知，移動值立即歸零，回歸檢查失敗。修正後，網址列高度變動或重複尺寸通知會保留移動；真正旋轉時才清除舊手勢，以免卡住移動。
- 左下方 44% 寬、下半部 55% 高的區域可直接拖曳移動。搖桿以手指落點為中心，不必精準按圓圈中央；顯示位置避開瀏海與底部安全邊界，放開後回原位置。
- 手指取消事件只釋放該手指；取消射擊手指不會一起清掉移動。失焦、離房、死亡及全部手指取消仍會清理輸入。
- 手機按鈕改為「橫向全螢幕」。進入原生全螢幕後，在支援的瀏覽器呼叫 `screen.orientation.lock('landscape')`，退出時釋放；拒絕或不支援時仍可放大。直向時顯示「請橫放手機；若沒轉向，請解除螢幕方向鎖定」，轉橫後提示消失。
- 遊戲畫布及 HUD 隨實際可視區域更新。沒有用 CSS 旋轉畫布，因此操作座標不需要額外翻轉。

## 驗證

- `MobileBridgeChecks.cjs`：21 項通過，包含真正多指操作、網址列高度變動、偏離圓心與圓圈外起手、安全區、單指取消、直橫切換、方向 API 成功／拒絕／缺少、焦點和死亡清理。
- `MobileLayoutChecks.cjs`：Chromium 與 WebKit 各 7 種尺寸，共 14 組版面通過，包含瀏海安全區、短畫面、手機直向及橫向；另確認瞄準切換、恢復控制與全螢幕備援。已檢視 WebKit 橫向截圖。
- `PointerBridgeChecks.cjs`：8 種鍵鼠情境通過，包含原生滑鼠鎖定、拒絕、逾時、無 API、錯誤成功及 iframe 限制。
- `WebMobileSmokeTest.cjs --lag --respawn`：15 項通過。手機觸控與鍵鼠玩家真實連線，雙向各增加 90 ms 延遲，確認左下方移動、尺寸變化後繼續移動、多指射擊與換彈同步、直橫切換、暫停、死亡答題與復活。
- 隔離測試的路由一併補上外部 JS／CSS 檔案；原先將 CDN 載入輔助程式當 HTML 回傳會造成測試中的語法錯誤，與正式遊戲檔案無關。
- 課程 H5 建置成功，335 個資源引用通過；更新的課程檔案通過 lint。
- 四個 `Build/` 核心檔案 SHA-256 與上一版完全一致，既有壓縮、CDN 與快取保留。未重新建置 Unity，Windows 歷史檔案保留。

## 正式站驗證

- [GitHub Pages 部署](https://github.com/scozirge/a-thought/actions/runs/36828833714) 已成功，公開版本資訊的 `releaseRevision` 與 `mobileRevision` 均為 `mobile-controls-20261001`，來源為 `5f8ffea`。
- [正式遊戲](https://scozirge.github.io/a-thought/rivals/?v=mobile-controls-20261001)執行 `WebPublishedReleaseSmokeTest.cjs`：18 項通過，確認 CDN、新觸控區域、房間及 Bot、場地武器、答題介面、全部 15 題與[第三次課程入口](https://scozirge.github.io/a-thought/hatchbeasts/classroom/weapon-logic/)，沒有腳本例外。
- 正式站執行 `WebMobileSmokeTest.cjs --lag`：14 項通過。手機觸控模擬與鍵鼠玩家互相建立及加入房間；雙向各增加 90 ms 延遲，驗證拖曳移動、多指射擊、換彈、瞄準、衝刺、全螢幕、直橫切換、暫停、焦點恢復及離房。兩個玩家均無腳本例外。
- 正式站的 6 次短按射擊，本機畫面回饋最慢 68.9 ms；此數字是本次桌面瀏覽器模擬的量測，不代表所有手機效能。
- 發布時保留原有 45 個介面展示檔案。

以上是桌面上 Chromium、WebKit 的手機模擬與真實伺服器連線，**未在使用者的實體手機上驗證**。使用者的手機型號、瀏覽器與螢幕方向鎖定狀態尚未取得，不能判定原先無法橫向的確切裝置原因。

## 手機方向的限制

網頁方向鎖定不是所有瀏覽器都支援，通常需要全螢幕；不支援時需由手機本身允許旋轉。[MDN ScreenOrientation.lock](https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation/lock)

- iPhone：在控制中心解除直向鎖定，再將手機橫放。[Apple 螢幕旋轉說明](https://support.apple.com/zh-tw/118226)
- Android：開啟自動旋轉；設定名稱可能依廠牌不同。[Google Pixel 顯示設定](https://support.google.com/pixelphone/answer/6111557?hl=zh-Hant)

來源提交：`5f8ffea`。發布提交：`f4d780c`。Web ZIP 25 個檔案、23,517,667 bytes，CRC 與逐檔雜湊驗證通過；SHA-256：`880621c3401b0bceeda9cd4abec8e8aef9a148ff0da51077e0e0a45104990cf1`。
