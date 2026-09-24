# Web 載入速度優化驗證

## 交付狀態

依使用者最新指示，只儲存資源與載入流程的修改，停止後續打包、遊玩測試與發布。建置入口已恢復 Wasm RuntimeSpeed／IL2CPP OptimizeSpeed，保留原先 Managed Stripping Low。正在編譯的試驗性 DiskSizeLTO 建置在指示前已完成於 `Builds/WebFast`，該產物未發布，與目前已還原的建置設定不同，不作為本次交付成品。正式網站與 `Builds/Web` 均未替換。本機編輯器的 WebGL CodeOptimization 偏好也已恢復 RuntimeSpeed，未再次啟動 Unity。

## 問題與量測方式

2026-09-24 以 Chrome／Playwright、1280 × 900 畫面測試正式 GitHub Pages。以「Unity 載入畫面消失、Photon 大廳 ready 且可建房」為完成點，不把單純 HTML 顯示當作遊戲可玩。

原版 WebConnection 的四個主要檔案合計 80,195,613 bytes；Unity 檔案未預先壓縮，但正式網站 HTTP 已提供 gzip，瀏覽器實際下載約 34.6 MB。原版未啟用 Unity Data Caching；瀏覽器重新整理後 `.data` 和 `.wasm` 仍再次下載。

為固定網路條件，以 Chrome DevTools Protocol 設定 10 Mbps（1,250,000 bytes/s）、50 ms 額外延遲。使用新的隔離瀏覽器環境完成 cold 載入，然後同一環境再次開啟相同網址量 warm 載入。每個結果為單次量測，不代表所有設備、網路與地區的保證值。

優化前原始紀錄：`Logs/LoadValidation/before-public.json`、`before-public-10mbps.json`。10 Mbps 首次 32.012 秒、34,607,517 bytes；再次載入 31.265 秒、34,503,679 bytes。未限制頻寬的當次結果為 6.746 秒／3.624 秒。

## 實作

- Unity Web 保留 Wasm RuntimeSpeed、IL2CPP OptimizeSpeed／Release 及 Managed Stripping Low；已移除試驗中的程式體積最佳化，不再為這項工作執行 Unity 建置。
- GitHub Pages 已提供 HTTP gzip，保留原生解壓與 WASM 串流編譯，不重複加入 JavaScript 解壓流程。
- 啟用 Unity Data Caching 與內容雜湊檔名；只對具有 32 位十六進位內容雜湊的 `.data`／`.wasm` 設定 immutable。內容變動會產生新檔名，並移除隨 HTML 改版而變動的共用資產版本參數；實際重用範圍仍待後續驗證，WASM 目前尚未通過快取檢查。
- 關閉 Unity 啟動 Logo，載入介面顯示百分比與初始化階段。
- 字型由 16,435,884 bytes 精簡成 11,007,168 bytes；保留全部 44,810 個 Unicode 字元與水平字寬、一般排版及韓文組字功能，移除未使用的區域替代／直排字形。衍生版內部名稱改為 Rivals CJK UI，原始 OFL 字型放到 Unity Assets 外，避免重複打包。
- fontTools 固定 4.65.0，重製工具為 `Tools/optimize_font.py`。`Tools/font-optimization.json` 保存來源／產物 SHA256；`Logs/LoadValidation/font-outline-check.json` 驗證全部遊戲文字與固定隨機抽樣共 866 個字形輪廓一致。

## 已完成的資源驗證

字型的所有 Unicode 字元和水平字寬已由重製腳本逐一比對；866 個 UI 與抽樣字形輪廓完全一致。字型大小減少 5,428,716 bytes（約 33.0%）。這是來源資源的實際減量，尚未量測套用目前設定後的正式遊戲載入秒數。快取與進度顯示為已儲存的程式修改，需日後包版後再驗證實際效果。中止前的試驗性本機檢查顯示資料檔可重用，但 WASM 仍下載，完整的 `--expect-cache` 條件未通過；此待驗證事項保留在 `Logs/LoadValidation/after-local.json`，不宣稱整包遊戲已能免下載重開。

## 日後需要時重現

```powershell
$env:RIVALS_WEB_URL = 'https://scozirge.github.io/a-thought/rivals/'
$env:RIVALS_LOAD_MBPS = '10'
$env:RIVALS_LOAD_LABEL = 'public-10mbps'
node Tools/WebLoadSmokeTest.cjs --expect-cache
```

`RIVALS_PLAYWRIGHT_MODULE`、`RIVALS_CHROME` 可指定已有的工具；`--deny-cache` 可驗證 IndexedDB／CacheStorage 拒絕存取時仍能正常下載及進入大廳。連線遊戲仍需要網路，不宣稱離線遊玩。

參考 [Unity Web 最佳化](https://docs.unity3d.com/6000.3/Documentation/Manual/web-optimization.html)、[Unity Web 快取](https://docs.unity3d.com/6000.3/Documentation/Manual/webgl-caching.html)、[fontTools subset](https://fonttools.readthedocs.io/en/stable/subset/)。
