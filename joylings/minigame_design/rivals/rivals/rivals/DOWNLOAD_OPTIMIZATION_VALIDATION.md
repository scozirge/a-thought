# Web 無損壓縮與下載驗證

日期：2026-10-01。發布批次 `compressed-web-20261001`，連線版本仍為 `rivals-web-25-unlock-bots`，介面仍為 `simple-quiz-20261001`。僅更新 Web。

## 改動及內容一致性

- Unity 輸出改用 Brotli 與 Decompression Fallback；保留 Release／OptimizeSpeed、RuntimeSpeed、原有 stripping、記憶體及貼圖設定。
- HTML 快取規則接受 `.data.unityweb`／`.wasm.unityweb`。內容雜湊檔名採 `immutable`，新版載入器可將兩個大檔案保存在 Unity 快取。
- 未修改戰鬥、題庫、解鎖、Bot、畫質、音效或中文字型。`learning.js`／`learning.css` 與上一版逐位元組相同。
- 原正式包來源 `56400f1`；本次基準是上一輪已發布的正式 Web，開始工作時 Git 為 `1154c51`。
- Unity 重建會更新資源包內部 build ID 及序列化順序。本次是純傳輸更新，因此使用 Unity 隨附 Brotli 工具重新壓縮上一版已驗證的原始 `.data`，同時採用 Unity 新產生的解壓載入器。
- `Tools/CompressExistingWebData.cjs` 先驗證來源檔雜湊、Assets 差異僅限建置與 HTML 快取設定、解壓後 WASM／framework 與舊版相同，才允許保留舊 `.data`。此工具僅適用純壓縮更新；日後修改玩法或資源必須正常重建，不可沿用舊資源包。
- `Tools/VerifyCompressedBuild.cjs` 實際解壓三個檔案，以完整位元組及 SHA-256 比對，三者全部通過；沒有只靠檔名判斷。

| 檔案 | 原始 bytes | Brotli bytes | 解壓後與舊版相同 |
| --- | ---: | ---: | --- |
| 資源 data | 24,553,251 | 14,023,719 | 是 |
| 程式 wasm | 50,953,053 | 9,533,352 | 是 |
| framework.js | 463,900 | 80,655 | 是 |

解壓後 SHA-256：

- data：`7896b862a871da41d61a6f251a862640fd82fa9e0e9d9978eacfaaa5f2738c9f`
- wasm：`6c78d6b70efa8e3ff03930a7f824a416c6218a0c615b6848d71fe3a31f7b4146`
- framework：`797b29fc188626b4f1be1853d14c0acfdc1a8033f51e13f68cb00a6b289bfdbe`

Unity 的 Decompression Fallback 會輸出 `.unityweb` 並附帶解壓程式，適合不能設定 `Content-Encoding` 的主機。它會增加解壓及載入器成本，無法沿用原生 WASM 串流編譯；因此同時檢查實際大廳就緒時間及傳輸量。[Unity 官方部署說明](https://docs.unity.com/en-us/engine/6000.5/manual/platform-specific/webgl/building-distribution/deploying)

## 量測方式及基準

由 Chrome 的 Resource Timing 加總 `/Build/` 請求 `transferSize`，含 loader、framework、data、wasm 及回應標頭估計值；不包含 HTML、Photon 連線、遊玩中流量。MB 採十進位。首次使用全新瀏覽器環境，重新整理保留同一環境的快取。兩次均等待大廳可操作。

GitHub Pages 原本已經傳送 gzip，不能把原始約 76 MB 宣稱為實際舊下載量。本次發布前的真實公開站量測：

| 舊版公開站 | 下載 bytes | 大廳就緒 |
| --- | ---: | ---: |
| 首次開啟 | 30,421,795 | 89.025 秒 |
| 重新整理 | 14,162,108 | 63.275 秒 |

舊版 data 可持續快取，但 WASM 每次仍重新下載約 14.16 MB。基準測試的 `--expect-cache` 因此失敗，保留原始失敗紀錄；載入及大廳本身正常。

新版本機 HTTP 伺服器刻意使用 `Cache-Control: no-store` 且不提供 Brotli Content-Encoding，以驗證 Unity 解壓及持續快取，不靠 HTTP 快取掩蓋問題：

| 情境 | 首次 bytes／就緒 | 重新整理 bytes／就緒 | 結果 |
| --- | --- | --- | --- |
| 鍵鼠 | 23,756,819／3.129 秒 | 118,493／2.566 秒 | data 與 WASM 均無須重新下載 |
| 觸控 | 23,756,819／2.872 秒 | 118,493／2.562 秒 | 預設手機模式且大廳可操作 |
| 觸控、拒絕 IndexedDB／Cache Storage | 23,756,819／2.764 秒 | 不適用 | 自動下載並成功進入大廳 |

以上本機時間只代表本機解壓／初始化樣本，不能與公開網路時間直接比較。快取被清除、瀏覽器回收儲存或禁止儲存時，仍須重新下載。

## 新舊版本連線

兩個隔離的瀏覽器，真實 Photon 房間，客戶端 WebSocket 雙向各增加 90 ms 延遲。

| 組合 | 射擊回饋最慢 | RTT | 停止後位置差 | 結果 |
| --- | ---: | ---: | ---: | --- |
| 舊版房主、新版訪客 | 14.6 ms | 404.8 ms | 0.000195 公尺 | 通過 |
| 新版房主、舊版訪客 | 20.8 ms | 389.2 ms | 0.000196 公尺 | 通過 |

兩組均驗證八次射擊無重複或遺漏、換彈、移動收斂、無跳躍／滑行、離房補 Bot，沒有瀏覽器腳本例外。連線協定版本不變，更新期間舊頁與新頁可互相加入。

## 實際遊玩回歸

- 訓練場 37 項通過：鍵鼠及觸控的九種武器、傷害、靶復活、菜刀飛刀、火箭冷卻、毒區減速、核彈及自動復活、離線訓練與多人房間隔離。
- 真實雙人答題 26 項通過：錯題重問、一次死亡僅接受一次答案、房主進度同步、第三個徽章解鎖並預設菜刀、實際持刀復活、離房重入歸零。使用正常移動與 Bot 攻擊觸發死亡，沒有修改遊戲狀態。
- 課程遊戲入口改為新版發布批次，H5 重新建置成功，303 處引用檢查與修改檔案 oxlint 通過；課程及遊戲題庫未改動。

## 重跑及紀錄

本機紀錄位於忽略提交的 `Logs/DownloadOptimization/`，包括 `payload-comparison.json`、`BaselinePublic`、`Load`、`OldHostNewClient`、`NewHostOldClient`、`Gameplay`。

```powershell
# 先啟動正式資料夾的本機 HTTP 服務，另開終端執行。
$env:RIVALS_WEB_URL = 'http://127.0.0.1:8189/'
$env:RIVALS_TEST_OUTPUT = 'Logs/DownloadOptimization/Rerun'
node Tools/WebLoadSmokeTest.cjs --expect-cache
node Tools/WebLoadSmokeTest.cjs --touch --expect-cache
node Tools/WebLoadSmokeTest.cjs --touch --deny-cache
node Tools/ValidateWebRelease.cjs play
# 設定 RIVALS_HOST_WEB_URL 可讓連線測試的房主使用另一版本。
node Tools/WebNetworkSmokeTest.cjs --lag
```

可透過 `RIVALS_LOAD_LABEL` 分開保存各次載入結果。依環境設定 `RIVALS_PLAYWRIGHT_MODULE`／`RIVALS_CHROME`。手機以 Chrome 觸控模擬測試，尚未以實體 Android／iPhone 或 Safari 完整遊玩。
