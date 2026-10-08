# 一起想想｜合作解謎遊樂園

v0.10.1：**貼紙工廠 20 關、帶企鵝回家 20 關，共 40 關；每關固定四組各選一次。** Unity WebGL 支援本地教師操作及 Photon 跨網連線；原生 H5 維持離線單機。選單僅保留這兩款遊戲。

- [Unity 公開連線版](https://scozirge.github.io/a-thought/puzzle-party/)；[Unity 本地測試](http://127.0.0.1:8191/)；[H5 本地測試](http://127.0.0.1:8190/)。
- 第 1、2、3 組與老師組各負責一個顏色／方向，沒有第二輪作答。四個位置填完才可播放。
- 先設定再播放，播放後判定；停止、失敗及重試保留設定，修改只影響該組。
- 清楚顯示「你是第 X 組／老師組」與步號。主要文字至少 18px、按鈕 20px，窄版可捲動。

## 關卡與難度安排

兩款前十關保留既有題目、ID 與本地草稿。第 11～20 關使用新 v10 ID，舊版五至八次的草稿不會套用到新題。前三關維持簡單暖身，後段透過形狀、覆蓋與地形提高推理負荷，四次作答的規則保持一致。

| 關卡 | 貼紙工廠 | 帶企鵝回家 |
| --- | --- | --- |
| 1～3 | 兩色、2×2、四張，先了解後貼蓋前貼 | 一隻企鵝、方向較少，練習碰冰塊或邊界才停 |
| 4～10 | 增加顏色、圖案和重疊；第 9 關起 4×4 | 第 5 關起兩個冰場，第 6 關起必須合看兩側線索 |
| 11～14 | 4×4、目標四色；前三張各露出 2～4 格，增加交錯覆蓋 | 5×5、每場 5 個冰塊，利用場內停點；正解中有兩次單側停住 |
| 15～18 | 不同組可以同色；前三張各露出 1～2 格，辨認被遮住的輪廓 | 每場 6 個冰塊，至少一個家在場內；有 3～4 次單側停住，需推理不同停靠位置 |
| 19～20 | 目標只用兩色，前三張各留一格線索，從最後一張往前推 | 每場 7 個冰塊；途中會先到家又離開，需追蹤至第四步的終點 |

**貼紙工廠**：全部不旋轉，四張形狀固定且連通，每組只選顏色。每張最後至少露出一格，每次選擇都影響結果。後十題的重貼總次數為 24～33，逐題增加；顏色重複並不表示是同一張貼紙。

**帶企鵝回家**：兩隻讀同一組四方向；碰冰塊或邊界才停，經過家不煞車，停在家也繼續讀下一步，四步結束才判定。新增十題兩側單看都多解、合起來唯一，最短共同解恰為四步；每步至少一隻移動，沒有用共同空等湊步數。保留較快演出、暫停與 2 倍速。

這些是可驗證的題目結構；尚未以兒童實測證明逐題解題時間嚴格遞增。

## Unity 連線玩法

參考來源 RIVALS 的 Photon Fusion Host／Client 方式，由老師維持房間狀態。所有裝置都要能上網，但不需要在同一個區域網路。

1. 各裝置開啟**同版本 Unity WebGL**。老師開啟連線介面並建立房間，取得六位數房號。
2. 學生輸入房號、名字，選擇第 1、2 或 3 組加入。每組一台裝置；已有人使用的組別不能重複加入。
3. 老師選遊戲及關卡。學生只能設定自己那一格；三組可同時操作。老師設定老師組，並可代填尚未有學生加入的組別。
4. 四格填完，由老師播放；各端同步顯示過程及結果。切關、清空、播放、暫停、繼續、停止與速度由老師控制。
5. 學生離開時保留該組答案，老師可接手；空出的組別可以重新加入。老師離開或關閉房間即結束本次連線，學生返回本地模式。

沒有三組學生也能開始：老師可代答缺席組；不建立房間時，單機老師可直接操作全部四組。學生端固定顯示自己的組別身分。

跨網同步使用 `asia` 區域與獨立 `AppVersion=puzzle-party-v10`，不會加入來源 RIVALS 的房間。房號只對相同版本有效。連線局的答案由老師房間同步，本地完成紀錄／草稿仍屬於各瀏覽器。

v0.10.1 修正重連的生命週期：斷線清理完成前保持忙碌，舊清理流程不得覆蓋新房間；延遲拒絕只作用於仍被拒絕的連線。老師建房時使用 Fusion 支援的自訂 Realtime Client，將 Photon 的 `PlayerTtl` 設為 `0`，解除重新整理後舊席位保留 15 秒而誤判滿房的情況。房間上限仍是四人；停用 SDK 自動另建房，老師離線後由使用者明確重開／重新加入。

## 本地遊玩與分享

**公開連線版：https://scozirge.github.io/a-thought/puzzle-party/**。不同地點的老師與學生直接開啟這個網址，再以六碼房號透過 Photon 加入，不需要啟動本地伺服器。公開頁發布於獨立 `puzzle-party/` 路徑，原 RIVALS 網頁不變。`127.0.0.1` 仍是各自電腦的本地地址，不能當作遠方學生的分享網址。

Unity 專案測試：雙擊根目錄 `開始 Unity 測試.cmd`，目前使用 [8191](http://127.0.0.1:8191/)。Unity 必須透過 HTTP 載入 `.wasm`、`.data`，不能直接雙擊 HTML。

Unity 分享包：`Builds/puzzle-party-unity-webgl.zip`。解壓後雙擊 `START.cmd`；啟動工具需已安裝 Node.js，包內啟動器預設使用 `http://127.0.0.1:8190/`。本地單機不需外部網路，**建立／加入 Photon 房間需要網際網路**。分享包與公開頁使用相同建置，可以輸入同一房號一起玩。

H5：開啟 `Builds/Web/index.html` 或根目錄 `開始遊戲.cmd`。單檔內含樣式、圖案、程式與題庫，Chrome／Edge 可直接雙擊，不需伺服器或網路；分享包為 `Builds/puzzle-party-h5.zip`。**H5 沒有多人連線**，四組均由同一台裝置代填。

完成紀錄與單機草稿保存在目前瀏覽器。更換瀏覽器、清除網站資料或移動 HTML 位置，可能使用不同進度。

## 開發與驗證

需要 Node.js 18 以上；Unity 使用 6000.3.11f1。H5 與規則測試不需要第三方執行期套件；Unity 連線使用專案內 Photon Fusion SDK。

```powershell
npm test
npm run analyze
npm run test:online
npm run test:resilience
npm run test:published
npm run build
npm run build:unity
node tools/package-unity.cjs
powershell -ExecutionPolicy Bypass -File tools/package.ps1

# 本地服務
node tools/serve.cjs 8191 --unity
node tools/serve.cjs 8190
```

- `web/catalog.js`：兩款各 20 題的開放清單。
- `web/sticker-more.js`：貼紙第 5～10 題；`web/advanced-levels.js`：兩款第 11～20 題。
- `tools/generate-advanced.cjs`：固定種子離線出題器；企鵝以聯合狀態 BFS 篩選唯一最短解，遊玩直接讀固定資料。
- `web/rules.js`、`web/penguin-rules.js`：規則與求解；`web/app.js`、`web/penguin-view.js`：H5 操作及動畫。
- `unity-game/Assets/PuzzleParty/`：獨立 C# 規則、IMGUI 介面與動畫；`PuzzleConnection.cs`／`PuzzleOnline.cs` 處理 Photon 連線及同步，`RoomAuthority.cs` 處理教師權限、角色與房間狀態。
- `tools/export-unity.cjs` 與 `Editor/PuzzleBuild.Check`：JS 與 C# 各完整列舉 **7,990 組設定**，比對案例數、成功數及成敗／最終貼紙格／企鵝位置的有序 SHA-256。摘要只放 Editor。
- `tests/rules.test.cjs`：**56 項測試已通過**，含 40 題唯一解、四組有效作答、可見線索、企鵝最短路線及歷史規則回歸。
- `Editor/PuzzleRoomChecks.cs`：99 個房間權限／狀態檢查，包含同時作答、越權、時序、學生離開重入與老師關房。
- `tests/browser.cjs`、`tests/unity-browser.cjs`：H5 與真正 Unity WebGL 均已完成 Chrome 40 關遊玩，四組各一次、保存／清空、失敗修正、暫停／停止、滑鼠／觸控及 390／945／1365px 檢查通過。以 `PUZZLE_PLAYWRIGHT_MODULE` 指向可用 Playwright 套件執行。
- `tests/online-browser.cjs`：四個隔離瀏覽器以真實 Photon WSS 連線，老師建房、三組同時加入與作答、越權拒絕、兩款遊戲同步播放／暫停、離線代填／重入、錯房號／重複組別及老師關房測試全數通過。報告見 `artifacts/online-v10-report.json`，不是模擬傳輸。
- `tests/online-resilience.cjs`：v0.10.1 的 17 項連續操作／斷線檢查全數通過，包含六輪四組快速改選與兩款切關、調速／暫停／停止／清空／重播、延遲真實封包拒絕舊題指令、三組依序離房重入、學生刷新／直接關頁、播放中切斷原生 WebSocket，以及三輪老師直接關頁後立即重開房並重聚通關。每次加入都檢查 Photon 回讀 `PlayerTtl=0`；沒有替換遊戲狀態或模擬伺服器。報告見 `artifacts/resilience-v10-report.json`。
- `tests/published-browser.cjs`：公開 GitHub Pages 0.10.1 的 Unity 載入、公開端開房、本地端以房號分享連結加入、兩端同步完成貼紙第 20 關、原生 WSS 中斷後的中性提示／同頁重入及關房均已通過；公開老師與學生都回讀到 `PlayerTtl=0`。報告見 `artifacts/published-v10-report.json`。最新發布提交為 `3124675`（首次發布 `c17d63f`），已推送至 `gh-pages`；只更新 `puzzle-party/`，未更動原遊戲路徑。
- `Builds/difficulty-analysis.json`：40 題結構分析，不含答案；指標不能替代兒童實測難度。

## 專案來源與授權資料

依使用者「複製 arival」要求，自倉庫 RIVALS 獨立複製，來源 `../rivals/rivals/rivals/`，提交 `62deeaf`。`unity-base/` 保留原 Assets、Packages、ProjectSettings、Tools；不修改原專案，也不使用原發布網址。

歷史勇者、動物與旋轉題的規則及測試保留供查閱及回歸，不在開放題庫，也不能從 Unity 指令橋開啟。彈珠機關、自動郵局不在選單；企鵝舊名稱「冰原雙胞胎」已停用。

中文字體沿用來源 Noto Sans TC，授權見 `unity-game/Assets/Resources/NotoSansTC-OFL.txt`。`tools/package-unity.cjs` 會附上 `NotoSansTC-OFL.txt`，並把 SDK 內的 NanoSockets MIT 授權、WebSocket README、Photon 原始版權聲明及 Fusion 建置資訊放入 `ThirdPartyLicenses/`。SDK 未隨附 Photon 獨立授權全文；NanoSockets 的 MIT 文件不代表整個 Photon SDK 的授權。打包／分享時保留此資料夾。
