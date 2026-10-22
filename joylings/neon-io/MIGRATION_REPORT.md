# Neon IO 移植紀錄與驗證範圍

日期：2026-10-22。來源：`scozirge/Neon-IO`，提交 `396e4f8`。原始下載保留於 `E:/Projects/Neon-IO`。

## 交付內容

Unity 專案位於 `unity/`，版本 **6000.3.11f1**，Photon Fusion **2.1.2 Stable 2279 / Shared Mode**。Windows x64 執行檔為 `Builds/Windows/NeonImpact.exe`；執行與散布須保留同目錄的資料、DLL 與授權文件。`tools/build-windows.ps1 -Action Windows` 產生非 Development 建置；若需 Profiler，可改用 `WindowsDevelopment`。

原遊戲是 **NEON IMPACT**：滑鼠指向移動的霓虹 2D 對戰遊戲，有無際戰場（最多 10 名玩家、AI、撿星升級、頭／身／背技能及造星神）和頂尖對決（雙人或配對等待後 AI，預選 5 技能）。原角色、95 筆技能、美術、音效、音樂、動畫與粒子保留；UI 採用午夜藍與香檳金，並依後續回饋恢復大廳原動態背景、刪除額外文案；原 UI 控制器與素材繼續保存。原企劃表、美術原檔及 PHP 後端分別保留於 `Designer/`、`Arts/`、`Server/`。

## 主要修改

- 將 PUN 傳輸移出 Unity，接上課堂現有 Fusion 設定。保留原呼叫介面的 `Neon.Networking` 相容層，底層房間、權限、物件和狀態由 Fusion 執行；以獨立 AppVersion、lobby、模式與 schema 隔離其他課堂遊戲。
- 場景載入與本機 session 完成後才生成角色，修正同步生成失敗；連線取消、逾時、離房、重連與 runner 清理有明確生命週期。同步重連測試另找到兩人同時入房時房間人數已為 2、舊條件不載入戰場的競態，已改由場景權限端啟動無際戰場，不再以人數等於 1 判斷。
- 連線成功後停用並釋放 40 秒 startup 取消計時器，避免建立連線用的取消條件延伸到已開始的遊戲；額外記錄 Fusion 原始 ShutdownReason。Shared tick/send 明確設為 32/16，與先前 SDK 自動回退值相同，並加入設定斷言。
- 遠端角色使用持久快照取得生命、技能、Buff、等級、星幣及死亡狀態；晚加入不重播累積的 buffered RPC。AI、掉落和 Boss 隨 Shared master 接手，Boss 階段與剩餘時間一起保存。
- 傷害交由受害角色的權限端處理保命、扣血與死亡；吸血按實際傷害回覆，死亡通知、掉落與擊殺計分去重。對決由 master 一次發布勝者／敗者並鎖定結果，避免後到死亡改寫勝負。
- 修正實測發現的 Fusion heap 耗盡：角色狀態改成二進位，四個 byte 打包成一個 network word，每角色預留 1 KiB；全 20 個 Buff 加最大長度中日文字串的測試封包為 771 bytes。heap 調整為 32 MiB，星星池上限 512 個物件，滿池合併星星價值，不丟棄總值。
- 修正拾取競態、物件重用狀態、彈藥空參照、重複 Buff、粒子索引、部分拋物線計算、HUD 初始化、離線鏡頭跟拍和 Boss 測試字串。Windows 不再顯示瀏覽器硬體加速提示。
- 補齊 Unity 6 的 Timeline、2D Animation、PSD Importer、UGUI 等套件，修復舊 UGUI 腳本及墨汁音效參照，保留藏在 PUN 範例中的字型、箭頭與粒子材質。

## 已完成的回歸驗證

以下為 UI 更新前的移植基準，均為實際執行結果；星儀版本另有後續回歸紀錄。初期失敗紀錄仍保留在 `logs/`，不計入成功結果。移植基準的成功報告 JSON 保存於 `verification/2026-10-22/`；該版本建置識別與選定檔案 SHA256 見該目錄的 `build-identity.json`。

本輪先以 Windows 非 Development 建置通過離線、對決戰鬥、星星滿池及 10 人測試，再修正無際戰場同步重連場景條件、成功連線後的取消計時器及 Shared tick 設定，重新建置並回歸連線生命週期。對決配對與戰鬥分支保留。下面特別標註仍使用先前 Development 建置的補充結果。

| 檢查 | 結果 | 對應紀錄 |
| --- | --- | --- |
| 原始內容比對 | 470 個媒體／動畫／Shader 原檔逐位元一致，548 個原 Prefab 保留，95 技能資料一致，原 `.meta` GUID 保留 | `python tests/content_integrity.py` |
| Unity 資源與協定 | 4 個建置場景、Resources Prefab、95 技能與圖示；封包邊界、Unicode、全部 Buff、聚合星星、非法遠端 properties 寫入 | `logs/windows.log` 的 `NEON_CONTENT_OK`、`NEON_PROTOCOL_CHECKS_OK` |
| 正式版離線技能載入 | 95 種技能逐一掛載、比對 ID，0 執行錯誤；實際渲染角色、背景與 UI | `logs/neon-validation-81d14e39d3c7/` |
| 雙端傷害與死亡（Development 補充） | 兩端均為傷害後 950 HP、吸血後攻擊者 525 HP；無敵後仍 950 HP；致死後 0 HP、一次擊殺；0 錯誤 | `logs/neon-validation-82d7751f43c4/` |
| 正式版對決勝負 | 雙端通過傷害、吸血、無敵、死亡、一次擊殺；勝方在結算前也死亡仍不翻轉勝負；畫面分別顯示勝利／失敗，0 錯誤 | `logs/neon-validation-61d4af2ecb17/` |
| 正式版星星滿池 | 注入 700 星星價值，兩端同步 512 個物件、701 總值（含一次自然掉落），獎勵完整保留，0 錯誤 | `logs/neon-validation-5d0a3b65fd5a/` |
| 最終版 10 人 Photon 房 | 10 個 Windows 程序全部通過，各觀察到 10 名玩家及角色，0 錯誤、全部正常退出；約 72 秒，持續遊玩階段 60 秒 | `logs/neon-validation-db62451cfc95/` |
| 最終版晚加入與房主接手 | A 建房、B 晚加入、A 離開、B 接手、C 再加入；三端通過，B 運行約 96 秒、0 錯誤，最後為主動正常退出 `reason=Ok` | `logs/neon-lifecycle-4d7214766f47/lifecycle-summary.json` |
| 最終版離房重連 | 修正競態與取消器後，兩端 Battle → Lobby → Battle，`reconnected=true`，0 錯誤，約 23.4 秒；四次關閉均為主動正常清理 | `logs/neon-validation-36bf94fcfd4a/` |
| 雙人對決進場（Development 補充） | 原 UI 配對、技能交換及 Challenge 場景，2 玩家／0 AI，兩端 0 錯誤 | `logs/neon-validation-97a99d69fa95/` |
| 對決等待後 AI（Development 補充） | 原 UI 等待及 AI 流程，Challenge 場景，1 玩家／1 AI，0 錯誤 | `logs/neon-validation-6658bbc444af/` |

上表多人測試為同一台 Windows 電腦的獨立程序，實際連線至 Photon Asia。這能驗證服務連線及同步程式，不能等同多地區網路品質測試。截圖使用明確啟用的驗證工具手動渲染既有相機；工具不會啟用原本停用的相機，並保存相機／UI 診斷。隱藏視窗的 ScreenCapture backbuffer 曾產生全黑圖，因此沒有拿那些圖當作畫面通過的依據。

`docs/screenshots/arena.png` 是雙端傷害回歸的 Development 畫面；`challenge-win.png` 與 `challenge-lose.png` 是上述正式版對決測試的結果畫面。未執行的子測試物件也會被 Unity JSON 序列化為預設值，因此例如 Offline 報告內的 `combat.passed=false` 不表示 Offline 失敗；請看頂層 `passed` 與該次模式實際啟用的檢查。

## 首輪服務與後續 Web 範圍（歷史紀錄）

此節記錄最初 Windows 移植時的狀態；網頁版已於後續建置並公開發布，最新結果見本文末「部位全開、網頁壓縮與課程發布」。

預設使用本機進度。原 PHP／Kongregate 程式保留為可選整合；課堂 Photon AppId 無法代替帳號、全球排行榜、Kreds 付款及購買驗證。未接原服務時，這些付款功能會明確顯示服務未設定，沒有捏造購買成功，也沒有擅自將付費商品改成星幣價格。

目前交付 Windows。Fusion Shared 可延續到 WebGL，Photon 有 [Fusion 2.1.2 WebGL 範例](https://doc.photonengine.com/fusion/v2/technical-samples/fusion-webgl)。本專案保留 WebSocket、IL2CPP 反射保留設定與基本 Web 建置設定，但尚未實際建置或驗收瀏覽器版。後續至少包括瀏覽器背景分頁時的 master 行為、下載與記憶體、音訊啟用、HTTPS／壓縮標頭，以及 Windows ↔ Web 同房測試。

另有一項已知 Web 專用待辦：目前連線取消使用 `CancellationTokenSource(TimeSpan)`；Unity Web 不支援其 Timer timeout，轉 Web 時應以主迴圈 realtime 計時呼叫 Cancel。Windows 不受此項限制。[Unity Web .NET 限制](https://docs.unity3d.com/6000.3/Documentation/Manual/web-dotnet-api-support.html)

尚未完成長時間惡劣網路、所有 95 技能的全部交互組合、跨裝置存檔與外部付款服務驗收。Shared 為玩家權限架構，目前不是專用權威伺服器的競技防作弊方案。這些限制不應寫成已通過。

## 星儀神殿 UI 交付驗證

日期：2026-10-22。以下均以最終 Windows 非 Development 建置執行，識別與成功報告保存在 `verification/2026-10-22-astral/`。本節不以先前移植版本的測試取代新建置驗證。

新版以 Screen Space Overlay Canvas、安全區及 1920×1080 設計座標的等比例縮放建立版面；模態遮罩填滿實際視窗，長清單／文字使用可捲動區域。實作檔案位於 `unity/Assets/Scripts/Astral/`，保留原控制器、價格、配裝、資料儲存及 Fusion 連線邏輯。

涵蓋大廳、收藏、技能詳情與購買、五格配裝、技能選擇、配對／VS、設定選項、喊話、製作名單、完整教學、載入、確認／錯誤彈窗、HUD、排行／戰鬥紀錄、技能／升級通知、結算及原有付費服務入口。組隊模式維持停用。原角色動畫透過獨立預覽鏡頭與金色線稿材質呈現；技能只在 UI 中重新取景、著色，原圖與玩法素材不改動。

| 最終建置檢查 | 實際結果 | 紀錄 |
| --- | --- | --- |
| 完整 UI 與操作 | 67 張畫面、751 項斷言，0 執行錯誤；確認按鈕可被射線點擊、控制項在畫面內、滑桿填色在軌道內；真實 Photon 配對後取消、再次出戰成功 | `logs/astral-ui-release/` |
| 畫面適配 | 1280×800、1920×1080、2560×1080、1024×768、960×540；主選單、收藏、選擇、配裝、設定、喊話、教學、HUD、結算；中英文抽查 | 同上 |
| 真實雙端對決 | 透過新版 Challenge／配對按鈕進入；兩端 damage、lifeSteal、immortal、death、singleKill、challengeResult、lateDeathDidNotFlipResult 全通過，0 錯誤；含 VS 與勝負實機截圖 | `logs/neon-validation-85ece6b9025a/` |
| 真實 10 人同步 | 10 個獨立 Windows 程序，均看見 10 peers／10 player actors；進場後執行 45 秒，各程序總計約 57 秒，全部通過、0 錯誤 | `logs/neon-validation-31ffdf2ddc3f/` |
| 離房與重連 | 雙端返回大廳再加入同一驗證房間，均恢復角色，reconnected=true，0 錯誤 | `logs/neon-validation-e1c80621f326/` |
| 95 技能載入 | 原 95 技能逐一掛載、ID 比對成功、0 錯誤；有實際渲染輸出 | `logs/neon-validation-1b9f4273660e/` |
| 原始內容 | 470 個原媒體／動畫／Shader 逐位元一致、548 原 Prefab／95 定義與 GUID 保留 | `tests/content_integrity.py` |

修正實測發現的大標題行高裁切、預覽鏡頭在批次截圖未更新、技能原圖留白過大、滑桿填色溢出、捲軸把手超界、再次出戰少關閉結算、冷卻遮罩方向，以及非 16:9 模態遮罩未覆蓋整個視窗。細線加上幾何邊緣淡化，未另加全畫面後處理。

實機預覽在 `design/astral-implemented/index.html`。UI 測試的 `result-layout-fixture`／`result-fixture` 截圖使用明確的合成數字檢查排版；真正的對決勝負截圖與報告另存於 challenge 紀錄，未混為真實戰果。測試取消購買，未完成任何付款。字體 OFL 授權隨建置放在 `ThirdPartyLicenses/AstralFonts/`。

本次驗證為 Windows；WebGL、手機與實體多螢幕 DPI 組合尚未建置／驗證。95 技能載入不等於所有技能組合皆完成多人對戰驗證。先前的房主接手、滿星星池測試屬於移植基準；本次 UI 更新未再次執行這兩項。


## 2026-10-22 標註回饋修訂：原大廳演出、精簡 UI 與藍紅陣營

此章為本次交付，前面的移植基準與早期介面測試保留作歷史紀錄。本輪重新建置 Windows 非 Development 版；下列 UI、離線素材配色、雙端配色與對決戰鬥皆使用同一最終執行檔。

### 畫面變更

- 恢復 Init 原動畫與大廳原 World Space Canvas 背景、原角色、流星、光效、開場爆破及原音樂時序。移除遮住原場景的不透明覆蓋與金色角色複製品。大廳只更換選單與文字呈現。
- 大廳只留一組 NEON IMPACT 標題；移除各頁額外品牌、世界觀字樣、頁尾與不必要副標。戰場無品牌標誌，擊殺訊息／排行榜／生命／技能依標註定位於四角。
- 確認框依訊息高度調整、長文可捲動。無際戰場結算移除大徽章、RESULTS 與額外標題，保留數據和操作；中文時間使用「分／秒」。對決仍顯示必要的勝負結果。
- 隱藏舊介面採用 CanvasGroup，保留 MyText 啟用與語言更新；本機結算不顯示未接上的復活／Premium 服務。
- 戰場 HUD 依 safe area 四角定位；選單及彈窗維持等比例縮放。檢查尺寸為 960×540、1024×768、1280×800、1920×1080、2560×1080。

### 陣營配色

- 自己／我方為藍色系；敵方玩家、敵對 AI 及 Boss 為紅色系。使用每位觀看者的 Force 判定，不把發送端的相對陣營直接傳給另一端。
- 原角色紋理、粒子、技能外觀、尾跡、準備／命中／死亡效果保留；Shader 在紋理與頂點顏色合成後調整色系，保留亮部、明暗及透明度。背景、流星和拾取物保持原色。
- 分離於角色之外的效果明確攜帶施放者陣營；反彈後重新套用子彈及其子特效的陣營。近戰命中效果於接收端依原攻擊者網路 ID 判定顏色。
- 快取共用材質並用 MaterialPropertyBlock 傳入陣營，沒有每幀建立整套材質。原 470 個美術／動畫／音訊／Shader 檔案未改色、未替換。

### 資料目前存在哪裡

- 遊戲定義：95 技能等內容在本機 Resources／JSON。
- 玩家名稱、星星、已解鎖技能、喊話、紀錄、配裝及設定：本機 PlayerPrefs；Windows 一般執行使用 HKCU\Software\Starbro\Neon Impact。
- 多人房間與戰鬥狀態：Photon Fusion；不是跨裝置帳號／進度資料庫。
- 專案保留 Server/ 舊 PHP 原始碼，但目前沒有啟用 NeonServiceSettings 後端資產，沒有配置正在使用的遠端進度 DB。未新增帳號或雲端存檔。
- 明確使用 -neonSmoke／-neonUiCheck 的測試程序透過 ProfilePreferences 使用各自記憶體存檔；一般遊玩仍沿用既有 PlayerPrefs 格式。

### 本輪驗證

| 檢查 | 結果 | 紀錄 |
| --- | --- | --- |
| 原內容完整性 | 470 原媒體／動畫／Shader 逐位元一致、548 Prefab 保留、95 定義一致 | tests/content_integrity.py |
| Unity 編譯／建置 | 4 場景、95 技能、協定檢查通過，無 C#／Shader 編譯錯誤 | logs/windows.log |
| UI、原開場及操作 | 71 張實際截圖、4133 項斷言、5 種尺寸，中英文／捲動／點擊／原音樂與粒子播放檢查，0 執行錯誤 | logs/ui-refinement-release/ |
| 全素材陣營檢查 | 95 技能在我／敵角色掛載、258 個原粒子 Prefab 兩種陣營、實際子彈反彈換色，0 執行錯誤 | logs/neon-validation-ce41590ae534/ |
| 真實 Photon 雙端 | 兩個程序均通過；同一網路 ID 在雙方視角的 local 狀態相反，角色與彈藥配色檢查通過；約 30 秒、0 執行錯誤 | logs/neon-validation-0b08406e419f/ |
| 真實 Photon 對決戰鬥 | 雙端傷害、吸血、無敵、死亡、單次擊殺、勝負、遲到死亡不翻轉結果均通過；0 執行錯誤 | logs/neon-validation-2eecdae46947/ |

成功報告、最終建置 SHA256 與驗證範圍保存在 verification/2026-10-22-ui-refinement/。實機畫面索引為 design/ui-refinement/index.html。

UI 結算數值是明確的排版測試資料；258 粒子檢查及 95 技能掛載驗證不代表 95 技能的所有多人組合或平衡都已窮舉。雙端配色截圖將角色移近以方便比較；完整技能展示會殘留尚未消失的前一技能特效。這次沒有新增十人效能基準，也沒有交付 WebGL／手機或雲端存檔。

## 2026-10-22 部位全開、網頁壓縮與課程發布

本節是最新交付。網頁版 `1.1.0-web` 已部署，Windows 版 `1.1.0-fusion` 也已重新建置。前面各節的「尚未交付 Web」是先前版本的歷史紀錄。

### 公開入口與部位規則

- 遊戲：[Neon Impact 網頁版](https://scozirge.github.io/a-thought/neon-impact/)。載入完成後按「開始遊戲」，才開始原 STARBRO 雙星動畫及音樂。
- 課程：[第 6 堂課](https://scozirge.github.io/classroom/#sixth-course)，提供「木塊出走」及「Neon Impact」兩個遊戲入口。原木塊關卡、老師答案及其他課堂內容保留；[舊課程網址](https://scozirge.github.io/a-thought/hatchbeasts/classroom/#sixth-course) 同步更新。
- 頭部、身體、背部合計 95 個技能預設全開，新存檔及既有存檔皆適用。原價格定義保留，不增加或扣除星星、不模擬購買。喊話等其他商品不受此規則影響。
- 初版 Web 實測發現 Auto 區域讓兩個瀏覽器分到 Asia 與香港，房名相同仍無法相遇；現已將預設區域統一為 Asia，保留手動選區。
- 原 Init 場景、Logo 動畫及控制器逐位元與原始專案一致。Web 啟動閘門只暫停時間與音訊，待實際點擊後解鎖瀏覽器音訊，未新增會改變 Fusion 場景索引的啟動場景。

### 載入量與壓縮

| 項目 | 最終設定或實測 |
| --- | --- |
| 327 張 TextureImporter 貼圖 | Web 專用 DXT／Crunch，品質 80；特效紋理上限 512、一般圖片 1024。PSB 骨架及切片資料保留 |
| 94 段音訊 | AAC；音樂 44.1 kHz／品質 0.45，音效 22.05 kHz／品質 0.5；播放前解碼，保留開場與爆破節奏 |
| 字型 | Web 建置暫時將 18 個舊 UI 字型參照共用至 Noto Sans TC，避免同時包入大型舊 CJK 字型；完成後還原來源檔及原字型位置 |
| 發布檔 | Gzip、GitHub Pages 解壓相容設定、內容雜湊檔名、Unity 資料快取 |
| 首次載入核心檔案 | 首次可用建置 42,347,877 bytes → 最終 31,825,021 bytes，減少 10,522,856 bytes（24.85%） |
| 公開網址冷載入 | 兩個全新瀏覽器 context 測得約 2.92 秒、1.62 秒至「開始遊戲」可用；僅代表本機當時網路及 CDN 狀態 |

上述下載量包含 HTML、loader、framework、WASM 與 data 檔，不包含未在啟動時請求的授權文字；CDN 額外壓縮 loader 後實際傳輸量略小。首次建置已啟用圖音壓縮，24.85% 是在該基準上進一步精簡字型及最終程式的結果，並非原 PNG／MP3 原檔與發布檔的直接比較。一般寬頻仍須下載約 32 MB，無法保證各校網路有相同載入秒數。

原 470 個媒體／動畫／Shader 原檔保留未改；壓縮套用於 Web 匯入及輸出。Windows 素材不因 Web 壓縮設定而換成較低規格。

### 此次實際驗證

| 檢查 | 結果與範圍 | 紀錄 |
| --- | --- | --- |
| WebGL 正式建置 | Unity 6000.3.11f1、IL2CPP、4 個原場景、95 技能；建置成功 | `logs/web-build.log` |
| 原開場與音訊 | 載入時停在 Init；點擊後播放原動畫，AudioContext 為 running，實際音訊取樣非靜音；進入原動態大廳 | `verification/2026-10-22-web/web-public-release.json` |
| 全開與保存 | 新瀏覽器 0 星星即擁有 95 技能；配裝原付費頭部技能 11 不扣星星，重新載入後配裝及全開狀態仍在 | 同上 |
| 公開版 Photon 雙人 | 兩個獨立 Chrome context，1280×800／1024×768，真實 WebSocket 進入同一 Asia 測試房，兩端均看到 2 peers，持續 43 秒後仍連線；0 執行錯誤 | 同上 |
| 本機 Web 回歸 | 同樣的開場、配裝、重載與雙人連線流程全部通過 | `verification/2026-10-22-web/web-local-asia.json` |
| Windows 95 技能 | 部位全開版本逐一載入 95 技能、0 錯誤；此測試先於僅調整預設區域的最終重建 | `verification/2026-10-22-web/windows-skills-peer-0.json` |
| 最終 Windows 雙人 | 最終重建後兩個實際 Photon 程序均達到 2 peers／2 actors、0 錯誤 | `verification/2026-10-22-web/windows-multiplayer-peer-*.json` |
| 課程頁 | 兩種發布路徑各 336 個資源參照檢查通過；1365／390 寬度的雙入口排版無橫向溢出，公開兩個課程網址都有兩款遊戲 | `logs/web-course/`、`verification/2026-10-22-web/public-deployment.json` |
| 發布完整性 | 兩個 Pages workflow 成功；公開 HTML 與 4 個建置檔 SHA256 均與本機成品相同；164 個其他遊戲／版本檔案保持原樣 | 同上、`logs/web-publish/staged.json` |
| 原內容 | 470 原媒體檔、548 Prefab、95 定義與 GUID 檢查通過；原 Init／Logo 另存比對 | `verification/2026-10-22-web/source-integrity.json`、`original-intro.json` |

實機畫面索引為 `design/web-release/index.html`。瀏覽器測試使用 `neonQA=1` 開啟唯讀診斷；另以不公開的指定測試房隔離一般玩家，實際點擊遊戲 UI，未使用強制勝利或配裝作弊。畫面與音訊取自公開 Pages 成品，沒有以本機結果代替公開測試。

### 發布識別

- `scozirge/a-thought` 的 `gh-pages`：`9059ec6d8cd8f262882653a5c75141ac366770b6`，已推送，發布 Neon Impact 與舊課程入口。[成功部署紀錄](https://github.com/scozirge/a-thought/actions/runs/39687390245)
- `scozirge/scozirge.github.io` 的 `main`：`21a92cf6fa99ad25f69544f1d86946b06edbda45`，已推送，更新根網址課程頁。[成功部署紀錄](https://github.com/scozirge/scozirge.github.io/actions/runs/39687400566)

上述提交為發布成品；Unity 與課程原始碼保留在本工作區，沒有將工作區內其他尚未提交的子專案一起納入發布。

### 本版邊界

此次是電腦瀏覽器版，實測 Chrome；沒有完成手機觸控、Safari、Windows 與 Web 混合房、背景分頁房主切換、長時間斷線重連或所有 95 技能交互組合的驗收。初始連線失敗的 Web Timer／取消相容性尚未另做故障注入；目前仍沿用既有 CancellationTokenSource 期限，不能將正常連線通過視為該分支已驗證。

網頁進度保存在該瀏覽器的 PlayerPrefs 儲存區，重新載入會保存，但不與 Windows 或其他裝置同步。這次沒有新增帳號／遠端 DB。原 PHP 後端保持未啟用，Photon 只負責房間和戰鬥同步。
