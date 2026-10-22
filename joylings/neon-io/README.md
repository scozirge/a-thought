# Neon Impact：Unity 6／Fusion 移植版

本目錄由 [scozirge/Neon-IO](https://github.com/scozirge/Neon-IO) 的 `396e4f8` 提交完整移植。遊戲在原始畫面與教學中稱為 **NEON IMPACT**；原始下載仍保留在 `E:/Projects/Neon-IO`，方便比對。Unity 專案入口是本目錄下的 `unity/`。

這次保留原角色、美術、95 筆技能資料、音樂、音效、粒子特效與兩種遊戲模式，並將連線實作改為 Fusion。畫面介面已換成選定的 **午夜藍／香檳金**：保留原大廳動畫、音樂、流星與爆破，更新控制項與排版。原 UI 控制器與素材仍保留，原始企劃、素材與 PHP 後端也一併保存。

## 1.1.1 遊戲修正與程式整理

Windows `1.1.1-fusion` 與網頁 `1.1.1-web` 修正死亡目標追蹤、視窗邊緣方向提示、同一目標的命中冷卻、低幀率持續傷害、音樂來源重用與連線取消。尋敵改用隨物件啟用／停用維護的清單；近戰與彈藥共用命中期限管理，移除各目標每幀計時更新。原場景、雙星開場、角色美術與技能定義保留。

最新實測範圍、先前失敗紀錄與效能數據見 [MIGRATION_REPORT.md](MIGRATION_REPORT.md) 最後一節；可重現的報告保存於 `verification/2026-10-22-gameplay/`。此輪涵蓋 95 技能載入、十人 Photon 同步、取消／重連／房主接手、對決判傷、滿掉落物池、五種 UI 尺寸與雙瀏覽器測試，不等於所有技能組合、裝置與網路情況都沒有問題。

新增回歸指令（先建置最新版本；重負載測試請分開執行）：

```powershell
./tools/test-windows.ps1 -Mode Offline -Seconds 3 -Audit
./tools/test-windows.ps1 -Mode Multiplayer -Seconds 45 -CancelCheck
./tools/test-windows.ps1 -Mode Multiplayer -Seconds 45 -Clients 10
```

瀏覽器測試可設定 `NEON_AUDIT=1`，在明確啟用的 QA 環境執行相同核心回歸；一般玩家不會觸發測試。UI／連線 PowerShell 工具加入 UTF-8 BOM，讓 Windows PowerShell 5.1 正確讀取繁體中文。

## 遊戲內容

這是一款霓虹風格的 2D 多人混戰遊戲。玩家控制「霓虹漫遊者」，以角色前方的方向指針碰撞敵人，搭配頭部、身體及背部技能攻擊、防禦與移動。擊倒敵人後撿取星之力，可回血、升級並取得技能；戰場也有 AI 與定時出現的「造星神」。

| 模式 | 原有規則 |
| --- | --- |
| 無際戰場 | 多人混戰、人類玩家上限 10 人，含 AI。吃星星升級、取得隨機技能、累積擊殺與星幣。離開戰場邊界會受傷。 |
| 頂尖對決 | 1 對 1，先準備 5 個技能，戰鬥中每 20 秒依順序更換。保留配對等待與 AI 對手流程。 |

95 筆技能定義原檔保留在 `unity/Assets/Resources/Json/Feature.json`；內容包含近戰、追蹤彈、炸彈、護盾、反彈、吸血、隱形與保命等類型。**保留 95 筆資料、成功載入 95 種技能，與逐一驗證其多人互動，是不同的驗證範圍。**

## Windows 遊玩

1. 直接執行 `Builds/Windows/NeonImpact.exe`，或解壓交付的 `Builds/NeonImpact-Windows-Unity6-Fusion.zip` 再執行。散布時須保留完整資料目錄、Unity 執行檔依賴與授權文件；請使用 ZIP。
2. 等載入進入大廳，輸入玩家名稱；右上角「設定」可調整語言、音量、音樂、地區與全螢幕。要一起遊玩的玩家應使用相同版本、相同模式與相同地區。
3. 預設以**滑鼠指向移動**，不必持續按住滑鼠左鍵。游標移回畫面中心可停止移動；用角色前方指針碰撞對手，技能依原規則自動觸發。
4. 透過遊戲內按鈕進行技能選擇、商店購買、喊話設定與離開戰場。請先使用「無際戰場」確認一般操作，再測試「頂尖對決」。

目前玩家 Prefab 預設為滑鼠模式；程式仍保留鍵盤與觸控分支。鍵盤模式可由開發者在 `PlayerRole` Prefab 的 `Control` 設為 `Keyboard` 後使用 WASD／方向鍵，並不是目前預設操作。

依最新課堂需求，頭部、身體、背部共 95 個技能預設全開。新玩家與既有存檔皆可直接選用，不扣星幣、不記錄虛構購買；技能數值與原始價格資料仍保存。一般喊話與付費服務不是本次「部位全開」的變更範圍。

## 遊戲介面

- 大廳、收藏、技能詳細資料與購買、五格配裝、技能選擇、配對／VS、設定、喊話、製作名單、教學、載入、確認／錯誤視窗、戰鬥 HUD、排行榜、戰鬥紀錄及結算統一使用新主題。
- 原角色持續使用原有骨架與動畫；95 個技能使用原圖，僅在 UI 中重新取景與套用金色材質。場內角色、背景、攻擊與粒子仍保留原美術；我方角色與施放特效偏藍，敵方與敵對 AI 偏紅，依觀看者判定。
- 以螢幕座標、安全區及等比例縮放取代原固定世界座標版面，支援視窗即時縮放、16:9、16:10、4:3 與超寬比例。長清單、長說明與教學可捲動，提示框限制在畫面內。
- ESC 可返回收藏／設定、關閉教學及一般彈窗、取消配對；在戰場會詢問是否離開，並不暫停多人遊戲。尚未實作的組隊模式維持停用。
- 新 UI 仍呼叫原控制器；本版部位技能預設全開，原價格資料保留。喊話儲存冷卻、配對與其他付費服務條件沿用原規則。本機模式隱藏未接上的復活／Premium 入口；接上舊服務後仍依原條件顯示。

執行中的 UI 由 `unity/Assets/Scripts/Astral/` 建立；`AstralAssets` 在建置時產生 95 個圖示的取景資料，原圖檔不改動。Noto Sans TC 與 Cinzel 的 OFL 授權隨 Windows 版本放在 `ThirdPartyLicenses/AstralFonts/`。本次實機畫面索引位於 `design/ui-refinement/index.html`，早期介面紀錄保留於 `design/astral-implemented/index.html`。

## 技術基準

| 項目 | 設定 |
| --- | --- |
| Unity | **6000.3.11f1** |
| Photon Fusion | **2.1.2 Stable 2279** |
| 連線模式 | Fusion **Shared Mode** |
| 渲染 | 保留原有 Built-in Render Pipeline、Shader 與粒子內容 |
| 正式建置場景 | `Init`、`Lobby`、`Battle`、`Challenge` |
| 展示場景 | 保留 `ParticleExhibition`，供特效檢查 |
| 本輪建置目標 | Windows x64 與桌機 WebGL |

連線設定沿用本機課堂專案提供的 Fusion Photon 設定。App ID 不寫入說明、測試報告或日誌；請透過 Unity 的 Photon 設定檢查。Neon 使用獨立的 AppVersion 前綴 `neon-io/`、lobby `neon-io-fusion` 與模式屬性，隔離其他課堂遊戲的配對。

`unity/Assets/Scripts/Networking/` 提供原程式呼叫介面的相容層，因此仍可看到 `PhotonNetwork`、`PhotonView` 等名稱；它們位於 `Neon.Networking`，實際房間、物件與狀態傳輸由 Fusion 處理。舊 PUN SDK 保存在 Unity 外的 `legacy-photon/`，不作為本版遊戲連線執行環境。

## 本機進度與舊服務

預設啟用本機訪客進度，啟動不需等待 Kongregate 登入、排行榜或舊 PHP 主機回應。星幣、已購買的星幣技能、一般喊話解鎖與文字、對決技能選擇及設定保存在本機；不提供跨裝置雲端存檔。一般喊話頁可以使用，原本需付費的技能喊話解鎖仍維持原有條件。

原版 Kongregate／PHP 原始碼保留，可選擇重新接上服務。但 **Photon App ID 只處理多人連線，不能代替原帳號、排行榜、購買驗證或支付服務**。未設定付款服務時，Kreds 商品、付費復活與 Premium 入口在本機版結算隱藏；不會捏造付款成功，也沒有將 Kreds 換算成星幣或改動原價格。

要重新接上舊服務：

1. 在 Unity 選擇 `Assets > Create > Neon IO > Optional legacy services`，建立設定資產。
2. 將資產存為 `Assets/Resources/NeonServiceSettings.asset`。
3. 填入實際可用的 `backendUrl`，設定 `requestTimeoutSeconds`，並啟用 `enableLegacyServices`。
4. Kongregate 整合另需原網頁宿主提供的 JavaScript API 與相應帳號／商品配置。Windows 執行檔不會因勾選設定就具備瀏覽器付款能力。

舊服務請求有逾時與回退處理；排行榜不會阻擋進入遊戲。啟用設定仍需要另外驗證服務端、實際商品及登入流程，不能以設定資產存在判定整合完成。

## 建置與驗證

以 Unity Hub 開啟 `unity/`，使用 **6000.3.11f1**。Windows 建置工具預設 Unity 安裝位置為 `E:/Program Files/Unity/Hub/Editor/6000.3.11f1/Editor/Unity.exe`；安裝於其他位置時，請調整 `tools/build-windows.ps1` 的 `$neonUnity`。

在本專案根目錄使用 PowerShell：

```powershell
# 準備 Fusion Prefab、目錄、建置場景與專案設定
powershell -NoProfile -File .\tools\build-windows.ps1 -Action Prepare

# 檢查角色、技能、場景、Missing Script 與程式回歸項目
powershell -NoProfile -File .\tools\build-windows.ps1 -Action Validate

# Windows 正式版建置，包含 Prepare 與 Validate；Profiler 版本改用 WindowsDevelopment
powershell -NoProfile -File .\tools\build-windows.ps1 -Action Windows

# 比對原始媒體、動畫、Shader、GUID 與 95 筆技能資料
python .\tests\content_integrity.py

# 單一 Windows 執行檔：離線啟動與 95 種技能掛載檢查
powershell -NoProfile -File .\tools\test-windows.ps1 -Mode Offline -Seconds 35

# 新 UI：實際點擊、Photon 配對取消、中英文、教學與五種解析度截圖
powershell -NoProfile -File .\tools\test-astral-ui.ps1

# 兩個 Windows 執行檔：透過 Photon 加入同一個驗證房間
powershell -NoProfile -File .\tools\test-windows.ps1 -Mode Multiplayer -Seconds 35

# 10 人、對決戰鬥、星星滿池、離房重連及房主接手
powershell -NoProfile -File .\tools\test-windows.ps1 -Mode Multiplayer -Clients 10 -Seconds 35
powershell -NoProfile -File .\tools\test-windows.ps1 -Mode ChallengeCombat -Render -Seconds 5
powershell -NoProfile -File .\tools\test-windows.ps1 -Mode LootStress -Seconds 20
powershell -NoProfile -File .\tools\test-windows.ps1 -Mode Reconnect -Seconds 5
powershell -NoProfile -File .\tools\test-network-lifecycle.ps1

# 包成可分享的 Windows ZIP，排除 DoNotShip / PDB，並驗證 CRC 與產生 SHA256
python .\tools\package_windows.py
```

`content_integrity.py` 目前以 `E:/Projects/Neon-IO/Neon IO/Assets` 為原始比對來源。`test-windows.ps1` 需先有最新 Windows 建置；多人測試需要網路及可用的 Photon 設定。工具會建立 `logs/neon-validation-*/`，保存各端 JSON 報告、執行日誌與截圖。

也可使用 Unity 選單 `Neon IO > Prepare Fusion project`、`Validate content` 與 `Build Windows`。回歸檢查包含損壞的技能存檔、重複 Buff、粒子群索引與原有資產載入；這些檢查不能替代實際玩家操作與多人驗收。

## 內容保存與資產修復

| 目錄 | 用途 |
| --- | --- |
| `unity/` | Unity 6＋Fusion 可編輯專案 |
| `Arts/`、`Designer/` | 原始美術、截圖與企劃資料 |
| `Server/` | 原 PHP 後端程式，供選用整合與研究 |
| `legacy-photon/` | 原 Photon PUN 套件存檔，位於 Unity 專案外 |
| `legacy-assets/` | 原倉庫中已無引用、且遺失舊腳本的 4 個備份 Prefab；原檔與 `.meta` 完整保留 |
| `tools/`、`tests/` | 準備、建置與驗證工具 |
| `Builds/`、`logs/` | 本機建置輸出與驗證紀錄 |

修復了舊 UGUI DLL 腳本參照，以及 5 個技能彈藥的墨汁命中音效參照。墨汁音效依原倉庫歷史，從已移除的 `ink.mp3` 重新連到現有 `ink.wav`。

原遊戲有 3 個美術資產引用到舊 PUN 範例目錄：下拉箭頭、Orbitron Black 字型與 ParticleAfterburner 材質。這些原檔及原 GUID 保存在 `unity/Assets/Resources/LegacyShared/`，避免移除舊 SDK 時連帶遺失 UI 與特效。

## 驗證範圍與目前限制

本次實測結果與版本範圍列於 [MIGRATION_REPORT.md](MIGRATION_REPORT.md)，成功回歸報告的 JSON 摘存於 `verification/2026-10-22/`。原始成功／失敗日誌仍留在本機 `logs/`，不會將初期失敗當成通過。測試工具需要明確的命令列旗標才會介入玩法；平常雙擊 EXE 不會執行這些測試流程。

網頁版建置工具為 `tools/build-web.ps1`，輸出在 `Builds/WebGL/`。桌機瀏覽器的實測與發布結果見 MIGRATION_REPORT 最新紀錄；手機觸控、長時間連線、延遲／封包遺失與全部技能交互組合仍需後續實測。舊網頁宿主付款整合未啟用。

## 網頁版與第六堂課

- 遊戲：[Neon Impact](https://scozirge.github.io/a-thought/neon-impact/)。載入後按「開始遊戲」，解鎖瀏覽器音訊並從頭播放原版 STARBRO 星星動畫；動畫及場景順序保留。
- 課程：[第六堂課的兩個遊戲](https://scozirge.github.io/classroom/#sixth-course)，並列木塊出走與 Neon Impact；舊課程入口同步更新。
- 預設固定 `asia`，避免自動選區把同班玩家分到香港／亞洲的不同配對區。設定仍可手動選其他區域，一起玩時請選同一區。
- Web 專用匯入設定：327 張貼圖使用桌機 DXT／Crunch 壓縮，特效上限 512、一般圖片上限 1024；PSB 骨架素材原樣保留。94 段音訊使用 AAC，音樂 44.1 kHz、短音效 22.05 kHz。建置時將舊 UI 字型引用共用至新版 Noto Sans TC，完成後還原所有來源檔。
- 發布使用 Gzip 與無自訂伺服器標頭的解壓相容設定、內容雜湊檔名及 Unity 資料快取。載入量以實際建置紀錄為準，不把原 PNG／MP3 檔案大小當成下載量。
- 網頁進度保存在該瀏覽器；與 Windows 存檔各自獨立。Photon 處理連線，這次沒有新增雲端 DB。

## 2026-10-22 介面修訂與陣營配色

依標註調整 HUD 到視窗四角，刪除重複品牌、額外世界觀文字與結算大徽章；短訊息彈窗按內容縮小。大廳直接使用原場景與原 Init 動畫／音樂時序，不再用靜態背景遮住流星與爆破。原 UI 控制器維持啟用，CanvasGroup 隱藏舊控制項，避免中斷 MyText 的語言更新。

`FactionVisuals` 以觀看者的 Force 判定藍／紅，作用於原角色、技能、粒子、尾跡、準備／命中／死亡特效，並更新反彈後子彈。新增 Shader 在合成紋理顏色後改色，保留原圖、透明度、明暗與白色亮部；材質共用快取，陣營值以 MaterialPropertyBlock 傳入。原素材檔不改色，環境及掉落物保留原樣。

自動化測試現在使用 `ProfilePreferences` 的每程序記憶體存檔，不寫入玩家正式 PlayerPrefs；一般啟動仍使用相同儲存格式。`test-windows.ps1 -Palette` 可加跑陣營檢查。新版實測證據與限制見 MIGRATION_REPORT 最新章節。
