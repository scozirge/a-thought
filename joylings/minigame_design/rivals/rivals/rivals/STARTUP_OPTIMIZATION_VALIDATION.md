# 遊戲載入加速驗證（2026-10-01）

正式站：[紅藍槍戰](https://scozirge.github.io/a-thought/rivals/?v=cdn-load-20261001)。課程：[第三次課程](https://scozirge.github.io/a-thought/hatchbeasts/classroom/weapon-logic/)。

## 結果

同一台電腦以無頭 Chrome、清空瀏覽器快取量測，從導覽開始到遊戲完成初始化、大廳連線就緒且載入畫面關閉。

| 正式站量測 | 首次載入 | 已有快取 |
| --- | ---: | ---: |
| 更新前樣本 | 45.261 秒 | 2.565 秒 |
| 更新後第 1 次 | 4.916 秒 | 2.659 秒 |
| 更新後第 2 次 | 4.487 秒 | 2.580 秒 |
| 更新後第 3 次 | 4.075 秒 | 2.573 秒 |

更新後首次載入中位數為 4.487 秒，相對更新前樣本減少約 90.1%。首次指瀏覽器尚未儲存遊戲資源，CDN 本身可以使用邊緣快取；實際時間受網路、地區、裝置及伺服器狀態影響。候選版在限制 10 Mbps／50 ms 延遲時首次載入 21.869 秒，再次載入 3.185 秒。

前後正式站的 `Build/` 資源首次傳輸量同為 23,727,696 bytes，再次載入為 300 bytes（框架檔的重新驗證）。這次改善來源是下載路徑，沒有再次縮減遊戲資源或降低畫質。以上傳輸統計只計 `Build/` 檔案，不含網頁、介面和新增的約 4 KB 下載輔助程式。

## 實作與相容性

- 大型 `.data.unityweb` 與 `.wasm.unityweb` 使用 jsDelivr 分發同一個公開儲存庫的既有檔案；正式站從網站來源提供預期長度和 SHA-256，下載後完整核對才交給 Unity。
- CDN 被封鎖、回應錯誤、內容不符，或八秒沒有下載進度時，取消該次下載並回原站；持續有進度的慢速下載不會只因超過八秒而中斷。取消整個請求時不啟動多餘的備援請求。
- 保留原始 Unity 快取鍵與雜湊檔名。舊版已下載的資料和主程式可直接重用；再次載入不會先向 CDN 重抓。禁止 IndexedDB／Cache Storage 時仍能正常進入大廳。
- 僅正式站預設啟用加速；自行架站及本機 ZIP 預設讀同站檔案。`?asset-source=cdn` 可供測試，`?asset-source=origin` 可比對原站。缺少驗證功能或清單時直接使用原本載入流程。
- Unity 編輯器 `WebBuild.BuildCurrent` 在建置後產生清單；`WebBuild.PrepareDeliveryCurrent -rivalsWebOutput <Web 資料夾>` 可以更新已驗證套件的傳輸層。這次執行後編輯器正常結束，未重新編譯遊戲執行檔。
- 四個 `Build/` 核心檔案逐一核對 SHA-256 與更新前完全相同。連線版本維持 `rivals-web-26-respawn-default`，發布批次改為 `cdn-load-20261001`。Windows 歷史套件及其 manifest 項目原封保留。

## 驗證

| 項目 | 結果 |
| --- | --- |
| `AssetDeliveryChecks.cjs` | 16 項：正確內容、進度、錯誤雜湊、截斷、過大、404、部分回應、封鎖、無回應、串流卡住、取消、相容性與非目標請求 |
| `WebLoadSmokeTest.cjs` | CDN 冷／暖啟動、封鎖 CDN、CDN 卡住、舊快取轉入、手機禁用快取、10 Mbps 限速均通過 |
| 實際瀏覽器逾時備援 | CDN 卡住時約八秒開始原站備援，12.668 秒進大廳；暖啟動 3.323 秒 |
| `WebLearningSmokeTest.cjs` | 40 項通過：實際死亡、答題、徽章、解鎖、倒數改選、下一次恢復最新武器、離房重設 |
| `WebMobileSmokeTest.cjs --lag --respawn` | 13 項通過：手機與鍵鼠同房、操作、射擊／換彈、答題死亡復活、離房 |
| `WebNetworkSmokeTest.cjs --lag` | 兩個真實連線玩家，雙向各增加 90 ms；移動、射擊、換彈、Bot 補位正常，本機候選版量到 RTT 約 349 ms |
| 正式站三輪載入測試 | 每輪首次兩個大型檔案均使用 CDN 且完成驗證；暖啟動均沒有 CDN 請求 |
| 正式站雙人延遲連線 | 同樣雙向各增加 90 ms，實測 RTT 約 382 ms；9 發與 9 次射擊呈現一致，操作回饋最慢 12.2 ms，停止後位置差約 0.00019 公尺 |
| `WebPublishedReleaseSmokeTest.cjs` | 17 項通過：版本、CDN、真實房間、武器拾取、簡化介面、課程 15 題、新版入口、手機版面 |
| 課程 H5 | `npm run build:h5` 通過，335 個靜態引用正確；更新檔案通過 lint |
| 正式套件 | ZIP 25 個檔案，23,515,889 bytes；解壓後逐檔雜湊一致 |

正式 ZIP SHA-256：`58d3640603a8a72beaea3768efc305f811c0b8602416699842ecff6311dd881a`。

來源提交：`a77c6a6`。發布提交：`2d7f5b9`。[GitHub Pages 部署](https://github.com/scozirge/a-thought/actions/runs/36821820382) 已成功。公開部署保留先前遊戲資源與 45 個桌面介面圖庫檔案。

可核對的數據、逐檔雜湊及檢查項目保存在 [驗證資料](STARTUP_OPTIMIZATION_VALIDATION.json)。本次用來比較分段下載的原型沒有採用；本次測試暫存檔案及本機預覽伺服器在整理後移除，原有桌面介面圖庫交付檔保留。
