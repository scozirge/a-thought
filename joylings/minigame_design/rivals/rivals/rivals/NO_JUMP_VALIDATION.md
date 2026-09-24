# 移除跳躍與正式發布

日期：2026-09-24。依使用者要求，Web、手機觸控與 Windows 全面移除跳躍。

- 移除鍵盤 Space 的跳躍輸入、遊戲動作列舉與角色跳躍呼叫；角色 prefab 與重新產生角色的設定均將跳躍衝量設為 0。
- 移除手機跳躍按鈕及跳躍短按保留邏輯；右側保留裝填、瞄準與射擊，射擊按鈕置於右欄中央。衝刺、移動、射擊、瞄準、裝填維持原有操作。
- 停用原跳躍輸入位元 2，其他控制保留原本的編號；舊觸控輸入即使送進橋接也不再觸發跳躍。
- 原生暫停選單、使用說明及 README 移除跳躍提示。教學目錄與課程入口更新為 [移除跳躍最新版](https://scozirge.github.io/a-thought/rivals/?v=no-jump-20260924)。課程中的技能發想範例仍是未實作的創意討論。
- 連線版本更新為 `rivals-web-18-no-jump`。新舊規則分開配對，同玩者需重新整理網頁或更新 Windows 包，載入相同新版。

驗證包含 Chromium／WebKit 手機版面與觸控橋接，並在實際 Photon 對戰中確認 Space 不會改變角色高度、舊手機跳躍輸入無效，以及移動、衝刺、射擊、瞄準、裝填與 Web／Windows 互連。

手機檢查使用瀏覽器觸控模擬，未聲稱完成 Android／iPhone 實機測試；報告保存於 `Logs/NoJump/`。

## 最終正式版本驗證

- Unity 6000.3.11f1 的 WebGL 與 Windows x64 非開發版建置成功。
- Chromium／WebKit 共 14 組尺寸與安全邊距檢查通過，所有尺寸均無跳躍按鈕，剩餘操作按鈕無重疊、未超出畫面。
- 13 項觸控橋接檢查通過；短按裝填仍會保留到下一次輸入輪詢，點按瞄準可同時射擊、轉向。
- 正式 Unity 遊戲的 8 種桌面／手機尺寸通過 HUD 邊界與按鈕交集檢查，已檢視手機三鍵實際畫面。
- 真實 Photon 桌面測試加入每方向 90 ms 的 WebSocket 延遲，持續按住 Space 並逐次比對客戶端與房主位置，未發生跳躍；測得高度變化約 `2.24e-8` 公尺，為浮點微差。射擊、裝填、移動、停止後位置收斂、滑行已移除及斷線 Bot 補位檢查均通過。
- 真實 Photon 手機／桌面共 12 項通過，包含移除跳躍按鈕、舊跳躍位元無法改變高度、三指操作、瞄準切換、短按射擊、裝填、衝刺、全螢幕、失焦與選單恢復、雙向開房與房主離開；本輪觸控回饋最長 56 ms。
- 教學 H5 建置成功，300 個引用檢查通過。
- Web／Windows 互連 4 項通過：Windows 開房供 Web 加入、Windows 房主離開後 Web 返回大廳、Web 開房供 Windows 加入、Windows 訪客離開後 Web 由 Bot 補位；雙向均為 8 名角色、2 位真人及 6 位 Bot，無遊戲執行例外。報告為 `CrossPlay/cross-play-check.json`。

報告：`Layout/mobile-layout-check.json`、`Bridge/mobile-bridge-check.json`、`Visual/visual-check.json`、`Network/network-web-lag-check.json`、`Mobile/web-mobile-check.json`，均位於 `Logs/NoJump/`。

## 正式成品

來源提交為 `f9084a6534f48a0c3c59540a5ec4cb311122f479`。沿用 `Builds/Release-20260924-Mobile/` 與原本 ZIP 下載路徑，更新完整 Web、Windows、使用說明及版本資訊。

| 成品 | 檔案數 | ZIP 位元組數 | ZIP SHA-256 |
| --- | ---: | ---: | --- |
| Web | 22 | 30,095,136 | `ee989243cabb3a00be9eebb753e1827da9d41122110d16728df079a642d1a208` |
| Windows x64 | 203 | 48,648,718 | `30bae22de9b6bc306a28c703ff41affc5679e4d96227d9f8f9444bd1f48a1762` |

兩個 ZIP 的 CRC、完整檔案清單及解壓後逐檔 SHA-256 均通過比對。版本資訊的來源雜湊包含角色 prefab，能追溯已停用的跳躍衝量；總清單為 `Builds/Release-20260924-Mobile/release-manifest.json`。

## 推送與公開部署

- `master` 的成品提交為 `9904821bf3912d66ecfe4cafc7a2c46c0333c238`，已推送成功。GitHub 遠端的 228 個成品 blob 與本機一致，Web 與 Windows ZIP 均回傳 HTTP 200 且長度符合清單。
- `gh-pages` 發布提交為 `050d513c238913a03a01aac791398a6fa420f518`，GitHub Pages API 已確認狀態為 `built`。
- 教學目錄、課程與新資源共 10 個檔案通過公開站 SHA-256 比對。1440 px 桌面與 390 px 手機的展開問題、鍵盤操作、目錄及段落導覽通過，無水平溢出或頁面例外。
- 已從兩個教學入口實際開啟新版遊戲分頁，確認網址為 `?v=no-jump-20260924`，頁面中沒有跳躍或滑行按鈕。
- 公開站完整 22 個遊戲檔案逐檔 SHA-256 均符合本次正式包，WebAssembly 的 MIME type 為 `application/wasm`。本輪多人遊戲測試使用本機供應的相同正式檔案與真實 Photon 服務；公開站另做完整檔案與教學入口驗證。

發布報告：`Logs/NoJump/remote-artifacts.json`、`Logs/NoJump/Public/public-artifact-check.json`；教學報告位於 `hatchbeasts/outputs/rivals-no-jump-public.json` 與 `hatchbeasts/outputs/rivals-no-jump/live-results.json`。
