# RIVALS Unity 連線原型

Unity 6000.3.11f1 / URP / Photon Fusion 2.1.2 stable 2279。

## 開啟與執行

以 Unity Hub 開啟本資料夾（含 Assets、Packages、ProjectSettings）。
開啟 `Assets/Rivals/Scenes/Rivals.unity`，按 Play。
若場景尚未生成，執行 `RIVALS > Build prototype scene`。

- 首頁只保留「開房間」與「加入房間」：一位同學開房，其他人直接加入，不需要輸入房名。
- 最多 8 人，自動分成藍、紅兩隊；兩人就會開始，其他人可以中途加入。隊友之間不會造成傷害。
- 同學重複按「開房間」時會加入已存在的同班房間。滿 8 人時顯示繁體中文提示。
- 先贏五回合獲勝，每回合六十秒，平手不加分。
- WASD 移動、滑鼠轉向、左鍵射擊、右鍵瞄準、R 換彈。
- 1 步槍、2 手槍、3 近戰刀、4 霰彈槍、5 狙擊槍；Shift 衝刺、Space 跳躍、C 滑行。
- Esc 開啟選單；線上對戰不因單一玩家開選單而暫停。
- 每次啟動預設靜音；可在 Esc 選單按「聲音：關」開啟聲音。
- 一整隊離開時清除比分並等待朋友；房主離開時返回連線選單。

### 老師設定

點首頁右上角的**小齒輪**，或按 **F8**，開啟平常收起的「老師設定」。房間代號、連線區域、「自己練習」及「素材與授權」都放在這裡。對戰時小齒輪收起，按 Esc 開啟選單後就會顯示。
預設房間為 `classroom-01`，區域為 `asia`。同一班使用相同設定即可；不同班可在遊戲開始前更換房間代號，再按「儲存設定」。各電腦需分別儲存相同設定。
設定保存在目前電腦／瀏覽器。遊戲中不允許修改房間設定；再次點齒輪、按 F8 或「關閉設定」可收起設定畫面。
介面使用隨遊戲附帶的 Noto Sans CJK TC 字型，不依賴電腦是否安裝中文字型。

## 打包

選單 `RIVALS > Build Windows demo` 產生 `Builds/Windows/Rivals.exe`。
本選單會重新建立原型場景與兩個網路 Prefab；手動美術修改前先另存場景。
多個 Windows 執行個體可用「開房間／加入房間」測試。需使用同一個 Fusion App ID、版本和區域。
Fusion App ID 已設定於 PhotonAppSettings；它是用戶端應用識別碼，不是 Dashboard 管理密鑰。

## Web 測試版

Unity 選單 `RIVALS > Build Web test` 產生 `Builds/Web`。需要 Unity Hub 安裝對應版本的 Web Build Support。
在專案目錄執行 `python Tools/serve_web.py`，開啟 <http://localhost:5174/>。請透過 HTTP 開啟，不能直接雙擊 HTML。

- 按「開房間」或「加入房間」，進場後點「點一下，開始玩！」控制滑鼠；Esc 釋放滑鼠並顯示選單。
- 離線練習位於 F8 的「老師設定」內。
- 使用桌面版支援 WebGL 2 的瀏覽器與鍵盤滑鼠。遊戲預設靜音，網頁有全螢幕按鈕。
- Web 版與 Windows 舊成品的連線版本可能不同；Host 與 Join 須使用相同新版。
- 此原型沿用 Fusion Host 模式，已開啟 WebGL Host/Client 設定；房主測試時應保持分頁在前景。瀏覽器在背景可能暫停遊戲迴圈。
- 本地伺服器只監聽 `127.0.0.1`，其他電腦不能直接用這個 localhost 網址連入。正式分享時將整個 `Builds/Web` 部署至支援 WebAssembly 的 HTTP(S) 主機。

打包使用未壓縮檔案及 BuildTimes 編譯設定，方便本地測試；`serve_web.py` 提供正確的 WASM MIME type 並關閉快取，避免讀到舊版。
素材來源及授權也會複製到 Web 成品。

## 實作範圍與差距

這是非官方原型，並非 Roblox RIVALS 的完整復刻。已實作 2～8 人分隊對戰與離線練習、五種武器、回合狀態、比分、移動和基本命中。
目前使用免費槍械及短刀模型，重新調整為橘黑步槍、黑色手槍、銀刃短刀、附紅色彈殼的深色霰彈槍與綠色狙擊槍。角色改為本專案製作的方塊身形、圓柱笑臉、帽子及髮型，依 8 個玩家位置搭配外觀，服裝保留藍紅隊伍辨識。場地為自行搭建的白灰格線競技場，包含門框掩體、樓梯與高台；介面加入武器圖示與綠色生命條。
模型、準星與多數音效為 CC0，槍聲依附檔的 CC BY 3.0 署名。尚未有原作全部地圖、武器、任務、皮膚、商店與排名。
目前命中依房主當下物理場景判定，尚未整合 Fusion Lag Compensation 回溯命中。未包含競技級反作弊、房主遷移或斷線重連。
移動使用 Fusion NetworkCharacterController 的預測與同步；角色輸入由用戶端提供，傷害與比分由房主決定。

## 來源

- [RIVALS 官方介紹：1v1–5v5、先贏五回合](https://www.roblox.com/games/17625359962/RIVALS)
- [Fusion Host／Client 輸入](https://doc.photonengine.com/fusion/v2/manual/input/player-input)
- [Fusion 房間與配對](https://doc.photonengine.com/fusion/v2/manual/connection-and-matchmaking/matchmaking)

## 自動驗證

`Tools/SmokeTest.ps1` 會啟動離線練習、Fusion 房主及客戶端三個程式，使用隨機房名。測試輸入會讓角色移動、瞄準並射擊，檢查角色同步、回合進行及執行期錯誤，結束後保留 TEMP 下的紀錄。需要能連線 Photon。

```powershell
powershell -ExecutionPolicy Bypass -File .\Tools\SmokeTest.ps1
```

`Tools/ClassroomSmokeTest.ps1` 會用與「開房間」相同的流程建立隨機測試房，並確認另一位玩家也按「開房間」時可加入既有房間。接著湊滿 8 人，確認藍、紅隊各 4 人、回合與射擊同步，再確認第 9 人因滿房而無法加入。結束後會關閉自己啟動的測試程式並保留 TEMP 紀錄。

```powershell
powershell -ExecutionPolicy Bypass -File .\Tools\ClassroomSmokeTest.ps1
```

執行檔分享給另一台 Windows 電腦時，請複製整個 `Builds/Windows` 資料夾，不能只複製 exe。由一人按「開房間」，其他人按「加入房間」。

## 免費資源版本

資源明細與直接下載來源見 `FREE_ASSETS.md`；來源原始授權保存在 `Assets/ThirdParty`。`RIVALS > Build Windows demo` 會自動重建 URP 材質與遊戲用 Prefab。
新增的模型、聲音與 UI 資源集中於 `DuelArt.asset`，可在 Unity Inspector 更換。霰彈槍使用七顆散射彈丸，狙擊槍有獨立彈匣與更高倍率瞄準。連線版本號已更新，雙方需使用同一版執行檔。

`RIVALS > Render game art and weapon icons` 可輸出五種武器及八組角色外觀預覽至 `Logs/game-art-review.png`，並更新遊戲使用的武器圖示。角色和持槍呈現由 `DuelAvatar`、`DuelWorld` 產生；`FreeAssetSetup` 負責保留 FBX 原始軸向並重新配色。
