# 驗證紀錄（2026-09-22）

目前玩法已改為先達 30 擊殺獲勝、死亡三秒後隨機復活；最新規則與實測結果見 [KILL_RACE_VALIDATION.md](KILL_RACE_VALIDATION.md)。以下五小局、60 秒與等待小局結束的描述保留為歷史紀錄。

連線生命週期與滿房競爭的本次修正，另見 [CONNECTION_VALIDATION.md](CONNECTION_VALIDATION.md)。

## Web 原生滑鼠鎖定與中央遮擋牆（2026-09-24）

- 使用者仍回報邊界自轉與無法繼續轉向。查閱 [MDN Pointer Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API)、[requestPointerLock](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestPointerLock)、[Unity Web 輸入](https://docs.unity.com/en-us/engine/6000.7/manual/platform-specific/webgl/develop/input) 與 [stickyCursorLock](https://docs.unity.com/en-us/engine/6000.0/script-reference/unityengine/webglinput/stickycursorlock)：FPS 使用真正的 Pointer Lock 取得不受邊界限制的相對位移；隱藏游標不等於鎖定，sandbox iframe 必須由宿主允許 `allow-pointer-lock`，全螢幕可能消耗使用者點擊授權。
- 完全移除上版絕對座標滑鼠輸入、邊緣計時自轉、Q／E 轉向、空白邊按鍵轉送及方向浮牌。控制必須同時符合遊戲可操作、已點擊取得控制、前景焦點、可見且 `document.pointerLockElement === canvas`，僅在真正鎖定時讀取 `movementX/movementY`。未鎖定不移動、開槍或隱藏游標。失焦／解鎖清除待處理輸入並要求重新點擊。
- 鎖定失敗或 1.5 秒未回覆，顯示重試、新視窗開啟及複製網址提示，請使用獨立 Chrome／Edge；不再把拒絕鎖定當成可玩的備援。Promise 回報成功但實際沒有鎖定也不授予控制。Unity 設定 `WebGLInput.stickyCursorLock=false`，全螢幕按鈕先在同步點擊事件請求鎖定，之後才要求全螢幕。
- `Tools/PointerBridgeChecks.cjs` 通過 8 種瀏覽器情境：正常、Promise 拒絕、舊式錯誤、無回覆、API 不存在、假成功，以及真正 sandbox iframe 的拒絕／允許。前 6 種測試可控 API 行為，後 2 種使用原生瀏覽器限制，沒有替換鎖定 API。檢查未鎖定時四邊與 Q／E 不產生輸入、游標可見及提示；解除拒絕後重試可鎖定，原生相對位移可達 4,000 px，停手不產生輸入、Tab、失焦與 Esc 正常。紀錄 `Logs/pointer-lock-bridge-check.json`。
- 地圖中央新增三面 4.4 m 高、1.2 m 厚的格線牆：中央 X/Z=(0,0)、寬 14 m；兩翼 X/Z=(-12,-5)、(12,5)、各寬 12 m，頂端加深色細條。採 180 度對稱錯位，擋住出生位置互相對望，保留彎折中央路及兩側外路。
- 編輯器完整戰鬥驗證通過：144 條出生視線（4×4 對手位置、3 個身體高度、3 個橫向偏移）均被遮擋；沿兩條中央繞行路及兩條外側通道以角色膠囊取樣檢查可通行。既有 Bot、傷害、重裝填、拾取、300 血、回合與勝隊舞台回歸通過；`Logs/pointer-lock-editor-test.log` 含 `RIVALS_SPAWN_SCREENS_OK`、`RIVALS_BATTLE_RULES_OK`、`RIVALS_BATTLE_SMOKE_OK`。

- 最終 Web 建置成功，`Logs/pointer-lock-web-build.log` 含 `RIVALS_WEB_BUILD_OK` 且 Unity 正常退出，沒有產出桌面版。網路版本為 `rivals-web-15-pointer-lock`，所有同玩者需載入此版。建置後已還原本次工作前備份的非本次自動生成資產，保留網路 Prefab 烘焙結果。
- 實際 Chrome Web 遊戲驗證通過：正常鎖定水平／垂直位移正確、連續旋轉 768 度後停手沒有漂移；右鍵瞄準、Esc／恢復正常。模擬拒絕與請求無回應時，移到畫面四邊、按移動／開槍／E 都不影響玩家，游標可見且顯示獨立瀏覽器提示。紀錄 `Logs/look-web-check.json`，未直接操作使用者的內嵌分頁。
- `Tools/WebFocusSmokeTest.cjs` 驗證正常鎖定下的 Tab、DOM 與視窗失焦、意外解鎖、按鍵清除、一鍵恢復、Esc 以及全螢幕同時取得滑鼠鎖定，全數通過。160 px 滑鼠轉向約 19.2 度；紀錄 `Logs/focus-web-check.json`。
- `Tools/WebEntryCrosshairSmokeTest.cjs` 通過：從開場倒數就顯示準心，出生點準心沒有對面玩家目標，點擊後取得控制；已檢視 `Logs/pointer-lock-walls-entry-countdown.png` 與鎖定被拒絕的提示截圖，中央高牆可見、提示不遮準心。
- 雙 Web 真人連線回歸通過：8 次短按全數同步，包含進場點擊共 9 發／9 次特效；最慢本機回饋 13.9 ms、RTT 約 183 ms。換彈、遠端移動、離線補 Bot 皆正常，停止後位置誤差約 0.000395，沒有未處理 JavaScript 或遊戲例外；紀錄 `Logs/network-web-check.json`。
- 完整交付 `Builds/RIVALS-Web-pointer-lock-walls.zip`（34,407,924 bytes，18 檔），逐檔比對與 `Builds/Web` 相同。HTTP HTML／WASM 回應 200、no-store，WASM MIME 為 application/wasm；WASM SHA256 `03d361e9fd991cc868196fc9502ba405c5692d674ba03ef97b1e8a81f0e14fa0`。紀錄 `Logs/pointer-lock-artifact-check.json`。以下為歷史行為，當前控制模式以本節及 README 為準。

## Web 操作時隱藏游標（2026-09-24）

- HTML 模板與目前 `Builds/Web/index.html` 同步新增游標顯示狀態：只有實際取得遊戲控制時，canvas 和左右空白邊才使用 `cursor: none`；頁面按鈕仍可顯示游標。正常鎖定和鎖定受限的備援皆適用。
- 失焦、Esc、意外解除鎖定及停用控制立即恢復 CSS 游標狀態，不依賴背景分頁可能暫停的動畫幀；恢復操作時再次隱藏。準心與既有視角、Bot 平衡維持上一版。
- 實際 Web 成品以兩種 Chrome 情境驗證：正常 Pointer Lock、Promise 拒絕鎖定。確認大廳游標可見、遊戲操作時 canvas／左右空白邊隱藏、頁面按鈕可見、DOM 失焦立即恢復、Esc 恢復、點擊繼續後再隱藏，沒有未處理 JavaScript 例外。驗證讀取瀏覽器 computed cursor 與控制狀態；未直接操作使用者的內嵌分頁。紀錄 `Logs/hide-cursor-web-check.json`。
- 僅更新 Web 模板，未重建 Unity 或桌面版；WASM 與上一版相同，連線版本仍為 `rivals-web-14-mouse-look`。完整下載包 `Builds/RIVALS-Web-hide-cursor.zip` 已逐檔驗證與 Web 目錄一致；HTTP HTML／WASM 一致且回應 200、no-store。紀錄 `Logs/hide-cursor-artifact-check.json`。

## Web 開場準心、滑鼠邊緣轉向與 Bot 微調（2026-09-24）

- 使用者回報滑鼠移到邊界後仍不能轉向。原生 Pointer Lock 保留無限相對位移；受限時新增主動往外推的邊緣轉向，左右約 126 度／秒、上下約 84 度／秒（預設靈敏度）。進入邊緣 36 px 區域且往外推至少 8 px 才啟動，任一向內位移立刻停止；單純點擊邊緣、恢復焦點與小幅來回抖動不會啟動。方向小牌只在持續轉向時顯示。
- 左右空白邊也接續輸入，快速移到視窗邊界不會跳過轉向區域。實際 Web 測試另抓到此處的開火按鍵未送到 Unity；已保留 canvas 焦點並將空白邊按下／放開轉送一次，驗證在該處開火仍計入子彈。離開網頁、移到遊戲上／下方、失焦、暫停和停用控制均清除轉向狀態，Q／E 備援仍可用。
- 準心在第 1 階段（開場 4 秒倒數）及第 2 階段（戰鬥）都會顯示，恢復操作按鈕移到畫面下方。`Tools/WebEntryCrosshairSmokeTest.cjs` 通過：直接按 HTML 建立房間，尚未點擊取得控制即擷取倒數；正式開打但未取得焦點，以及點擊開始操作也皆擷取。已檢視三張 `Logs/mouse-look-entry-*.png`，並確認中央與四臂白色像素；紀錄 `mouse-look-entry-check.json`、`mouse-look-crosshair-pixels.json`。
- Bot 僅略加積極度：速度 3.4 → 3.8 m/s，普通接近時間每 5 秒 2.5 → 3 秒、停止直衝的可見敵人距離 20 → 17 m，撿槍移動時間 3.6 → 3.8 秒，開火窗口每 3 秒 1.25 → 1.4 秒。反應 0.8–1.1 秒、追瞄 85 度／秒、瞄準誤差及各槍射擊間隔都維持前版。編輯器完整戰鬥整合通過，`Logs/mouse-look-editor-test.log` 含 `RIVALS_BATTLE_RULES_OK`、`RIVALS_BOT_TUNING_OK`、`RIVALS_BATTLE_SMOKE_OK`；Bot 狙擊觀察期間 1 發、觀測瞄準誤差約 2.67 度。原有血量、武器傷害、拾取、死亡等待、五勝舞台及重分隊規則亦通過。
- `Tools/PointerBridgeChecks.cjs` 使用來源模板驗證原生鎖定、Promise 拒絕、舊式錯誤、請求無回應、API 不存在五種情境。包含邊緣恢復不自轉、連續轉向、2 px 向內停止、抖動不重啟、再次主動推可重啟、快速移到視窗邊界、垂直停止、Tab、失焦與請求逾時恢復，全部通過；紀錄 `Logs/mouse-look-bridge-check.json`。
- 最終 Web 四種滑鼠情境均通過。正常鎖定連續旋轉 768 度；拒絕／舊式錯誤／API 不存在時，純滑鼠連續旋轉約 479／470／477 度，未按 Q／E。皆驗證正常水平／垂直滑鼠位移、右鍵瞄準、Esc 與恢復；備援另驗證左右邊緣停止、重新點擊邊緣不自轉、側邊空白處開槍及失焦，沒有 JavaScript 或 Unity 遊戲例外。紀錄 `Logs/look-web-check.json`。
- 失焦回歸 `Tools/WebFocusSmokeTest.cjs` 三種情境通過：正常鎖定、拒絕、無回應；恢復後 160 px 滑鼠輸入均轉約 19.2 度，沒有黏住的移動／轉向。確認意外解除鎖定、Tab、Esc 和一鍵恢復；紀錄 `Logs/focus-web-check.json`。測試使用本機 Chrome，受限情境由替換 Pointer Lock API 模擬，未直接控制使用者目前的內嵌分頁。
- 最終版本雙 Web 真人連線回歸通過：8 次短按全部同步，包含進場點擊共 9 發與 9 次特效，本機回饋最慢 12.8 ms、RTT 約 182.7 ms；換彈、角色移動、真人替換 Bot 與離線補位均正常。停止後雙端位置誤差約 0.000265 單位，沒有未處理遊戲或 JavaScript 例外；紀錄 `Logs/network-web-check.json`。
- 僅建置 Web，網路版本 `rivals-web-14-mouse-look`。`Logs/mouse-look-web-build.log` 含 `RIVALS_WEB_BUILD_OK`，Unity 正常退出；Web 模板與成品前後段一致。建置過程產生的非本次來源資產已還原至本次工作前備份。
- 交付 `Builds/RIVALS-Web-mouse-look.zip`（34,408,859 bytes，18 個檔案），逐檔比對與 `Builds/Web` 一致。HTTP HTML／WASM 均 200、`Cache-Control: no-store`，WASM MIME 為 `application/wasm`；WASM SHA256 `4eca4a9e4796fff4fec9930fcd6ff68f2ca23c396c4870bca3374e25896aa9ea`。紀錄 `Logs/mouse-look-artifact-check.json`。以下保留歷史驗證，當前操作與平衡以本節和 README 為準。

## Web 失焦恢復與 Bot 難度降低（2026-09-24）

- 舊版 `?v=balance` 已重現焦點不同步：在真實 Web 遊戲中把 DOM 焦點移到頁面的全螢幕按鈕，再讓 canvas 取得焦點但不點擊，C# 診斷仍報 `controls=true`，滑鼠卻不轉向。原生鎖定和 DOM focus 仍在，但 JS 的 engaged 已被 blur 清除；舊版亦沒有顯示恢復提示。`Tools/WebFocusSmokeTest.cjs --before` 通過重現斷言，紀錄 `Logs/focus-web-before.json`。這證明一個可導致相同症狀的缺陷，不能據此確認使用者每一次解除鎖定的外部觸發原因。
- 將「目前可玩」與「已取得滑鼠控制」分開。Web 的 ControlsActive 現在採用瀏覽器橋接的 enabled、engaged、真正焦點和可見狀態，不再以可能過期的 Unity Cursor.lockState 當作控制權。失焦／意外解鎖時停止移動、射擊與轉向，清除暫存動作及 Unity 鍵鼠狀態；恢復點擊在同一個使用者手勢內取得焦點並請求鎖定。
- 新增小型「點一下，恢復操作」按鈕，只有可以操作角色而尚未取得控制時出現。Esc 的暫停選單不會被覆蓋，選單繼續可一次點擊恢復。操作中的 Tab 不會把焦點跳走；失焦時不會自動搶回滑鼠。鎖定請求 1.5 秒沒有回覆就解除 pending，可再次重試；過期鎖定回覆不會在使用者已離開畫面後重新接管輸入。
- 保留原本的 Pointer Lock 不可用備援：滑鼠位移轉向、明確按住 Q/E 連續轉身、停止滑鼠不自行轉圈。新增唯讀 `window.rivalsPointer` 僅在 `?diagnostics=1` 記錄本頁控制狀態與最近焦點事件，方便排查。
- Bot 移動上限由 5.5 降為 3.4 公尺／秒，分段接近，20 公尺內可見敵人時停止持續追上去。看到目標後等待約 0.8–1.1 秒，水平追瞄最多每秒 85 度；瞄準改為身體，含上下、左右誤差，狙擊 Bot 也會瞄偏。每 3 秒只有 1.25 秒開火窗口；手槍／步槍／散彈／狙擊的最短開火間隔為 0.7／0.5／1.3／2.9 秒。真人槍械傷害、偏移、裝填與 300 HP 規則不變。
- `Tools/PointerBridgeChecks.cjs` 對正式 HTML 的橋接程式進行獨立測試：正常鎖定、Promise 拒絕、舊式 pointerlockerror、完全不回覆及 API 不存在五種狀態全部通過。包含 Tab、失焦提示、點擊恢復、實際滑鼠位移、Esc 和無回覆重試；這是橋接層測試，另以實際 Web 成品驗證整合。紀錄 `Logs/focus-bridge-check.json`。
- 編輯器完整規則回歸通過。加入實際 Bot 測試，確認沒有瞬間首發、緩慢轉向；受控的 6 秒觀察中狙擊 Bot 開 2 槍，觀察到最大約 2.69 度瞄準誤差。原有傷害、裝填、拾取、復活、五勝展示和重分隊測試均通過。`Logs/focus-editor-test-final.log` 含 `RIVALS_BOT_TUNING_OK` 及 `RIVALS_BATTLE_SMOKE_OK`。首次轉向測試直接改寫運作中的 Bot Look，會被上一個決策快取覆蓋；測試改在 ResetRound 清除快取後設定初始方向再啟用 Bot。


- WebGL / IL2CPP Release / Wasm RuntimeSpeed 成功重新輸出，`Logs/focus-web-build.log` 含 `RIVALS_WEB_BUILD_OK`，連線版本 `rivals-web-13-focus`。只建置 Web；美術／場景／設定的附帶重生變動已還原至本輪前備份，保留目前網路 Prefab。
- `Tools/WebFocusSmokeTest.cjs` 實際 Web 三種狀態全部通過：正常鎖定、拒絕鎖定、完全沒有回覆。失焦後 controls=false 且有恢復按鈕，點一次後真實滑鼠 160 像素帶來約 19.2 度轉向；另確認 Tab 不移走焦點、意外解除鎖定、按鍵鬆開不再移動、失焦清除 Q/E、Esc 隱藏恢復覆蓋層及選單一次返回。無未處理 JS／Unity 例外。`Logs/focus-web-check.json`。
- `Tools/WebLookSmokeTest.cjs` 四模式全通過：正常鎖定連續轉約 768 度；拒絕、舊式錯誤和 API 不存在時，Q/E 分別轉約 512／465／479 度；左右邊緣靜止皆 0 度變化。瞄準、Esc、重新取得焦點均正常。`Logs/look-web-check.json`，前版保存為 `look-web-check-before-focus.json`。
- 完整成品 `Builds/Web` 與 `Builds/RIVALS-Web-focus.zip`（34,407,734 bytes、18 檔）逐檔相同。來源模板與建置 HTML 一致；本機 HTTP 的 HTML／WASM 與檔案相同，HTTP 200、WASM MIME 正確、no-store。WASM SHA256 `f9c84f8d2828d02c704d6ffdab2ababe946d03da481368d78cf821ffe4311ed7`，紀錄 `Logs/focus-artifact-check.json`。

- 最終 `Tools/WebNetworkSmokeTest.cjs` 雙 Web 連線回歸通過：8 次短按（含入場共 9 發／9 次特效），本機最慢回饋約 13.2 ms，該次 RTT 約 182.7 ms；裝填、移動、停止後同步與離線補 Bot 均正常，停止後位置誤差約 0.000265。沒有未處理 JS／Unity 例外。`Logs/network-web-check.json`，前版保存為 `network-web-check-before-focus.json`。
- 本次瀏覽器整合測試使用同機 Chrome 和真實 Photon 房間；DOM 焦點移轉／原生解鎖為實際操作，window blur/focus 部分以瀏覽器事件模擬邊界，未宣稱涵蓋所有作業系統或內嵌瀏覽器造成解鎖的原因。

## Web 300 血、四角拾取與換彈更新（2026-09-24）

- 使用者確認新規則：滿血 300；散彈很近一槍擊倒、距離增加後大幅衰減；狙擊滿血兩槍。散彈以 5 公尺為近距離界線，300 傷害，之後指數衰減至 10 公尺約 79、15 公尺約 29、30 公尺約 15。狙擊固定 150 傷害，仍然每發強制裝填 2.2 秒。手槍／步槍傷害維持 28／20。自身／目標血條、低血提示與新局復活均採 300 上限。
- 四角 X/Z ±30 各有一個拾取點；兩處步槍，一處散彈，一處狙擊。散彈／狙擊每小局交換對角位置，另外兩角為步槍。5 秒重生、同槍不再拾取與只持有一把槍規則保留。網路拾取陣列改為 4 格，連線版本更新為 `rivals-web-12-balance`。
- 新增四向對稱的矮牆、高柱、側翼平台／階梯和角落入口掩體。編輯器實際 Physics 測試確認低牆 0.95 公尺、高柱 3.6 公尺、平台 1.5 公尺與四角角色膠囊不碰撞；Web 正常 WASD 操作亦成功走上階梯，腳底高度約 1.58（含 CharacterController skin），測試時仍為 300 HP。截圖 `Logs/balance-web-deck.png`。
- 第一人稱換彈加入左手／手臂、可見彈匣、霰彈或狙擊子彈與拉栓／退殼。動作由既有網路裝填計時驅動，不新增逐幀網路動畫資料；槍保持在畫面內，準心下方有步驟、剩餘秒數和進度。Web 實際射擊與 R 裝填測試確認手槍／步槍三階段、補滿 12／30 發，期間 look 完全不變。截圖 `Logs/balance-web-pistol-*.png`、`balance-web-rifle-*.png`。
- 擊殺姓名牌改成不透明藍／紅底色。檢視實際 Web 截圖後，另讀取卡片內側像素驗證：紅隊 RGB (196,42,56)、藍隊 RGB (42,77,206)，顏色與對應擊殺事件隊伍一致。紀錄 `Logs/balance-color-check.json`、`balance-web-killfeed.png`。
- `BattleRulesChecks.Run -battleSmoke` 通過。確認散彈 4 公尺實際擊倒 300 HP、23 公尺傷害衰減；狙擊 6／65 公尺均先扣至 150、重新裝填後第二發擊倒；另驗證步槍偏移／恢復、單槍拾取與重生、換局 300 HP、五勝舞台與自動重分隊。`Logs/balance-editor-test.log` 含 `RIVALS_BATTLE_SMOKE_OK`。
- WebGL / IL2CPP Release / Wasm RuntimeSpeed 建置成功，`Logs/balance-web-build.log` 含 `RIVALS_WEB_BUILD_OK`，只輸出 Web。建置產生的美術、場景與設定附帶變動已還原至本輪之前備份，保留目前網路 Prefab。
- `Tools/WebBalanceSmokeTest.cjs` 通過，包含 300 血、四角 0/0/3/4 槍種、正常輸入撿步槍、同款重生後不再取走、手槍／步槍換彈與視角穩定、真實擊殺紀錄及平台通行。首次平台步行因前面的換彈測試長時間暴露在 Bot 火力下而陣亡；改用新建正常房間直接步行後成功，沒有新增補血或傳送測試介面。紀錄 `Logs/balance-web-check.json`。


- `Tools/WebNetworkSmokeTest.cjs` 雙 Web 實際連線回歸通過：8 次短按射擊，含入場點擊共 9 發／9 次特效，最慢本機回饋約 19.6 ms，該次 RTT 約 183.2 ms；雙端彈藥／裝填一致，停止移動後位置誤差約 0.000263，真人離線後正常補 Bot。沒有未處理 JavaScript 或 Unity 執行期例外。紀錄 `Logs/network-web-check.json`；前版紀錄保存於 `network-web-before-balance.json`。
- 成品 `Builds/Web` 與 `Builds/RIVALS-Web-balance.zip`（34,406,813 bytes、18 個檔案）逐檔一致。來源 HTML 與建置模板一致；本機 HTTP 的 HTML／WASM 與成品雜湊一致，HTTP 200、WASM MIME 正確、no-store。WASM SHA256 `5c0d26964f55b1e9ac8b63b1ecffe540886226b7d8d1965684434e0af6dd8ea4`；紀錄 `Logs/balance-artifact-check.json`。
- 上述連線及畫面驗證為同機 Chrome 和真正 Photon 房間；未新增八台裝置或廣域網路測試。

## Web 視角自行轉動排查（2026-09-24）

- 使用者最初描述為「其他玩家移動時，我的視角也跟著動」，後續補充其實是單人進房，其他角色都是 Bot，且尚不確定觸發原因。先重現了另一個確定存在的輸入問題：在 Pointer Lock 被拒絕時，滑鼠停於畫面右側後完全不動，0.8 秒內 yaw 仍增加 146.28 度；當時持續為正常對戰階段、100 HP，排除死亡與換局。紀錄 `Logs/camera-drift-before.json`。根因是 Web 模板每個 animation frame 按邊緣位置持續注入滑鼠位移。
- 移除邊緣自動轉動；滑鼠停止移動便不再產生轉向。正常 Pointer Lock 操作不變。未鎖定時仍可移動滑鼠轉向，連續轉圈改為明確按住 Q／E，放開、失焦、移出畫面或 Esc 立即清除持續轉向。備援提示與 README 已同步更新。
- 實際 Web 的四種視角模式重測通過：正常鎖定連續轉 768 度；拒絕／舊式錯誤／API 不可用的左右邊緣靜置測試皆為 0 度變化，明確按住 E 分別轉約 456／449／465 度。另驗證 Q 左轉、鬆鍵停止、瞄準、Esc／恢復，以及按住 E 時失焦仍會停止。紀錄 `Logs/look-web-check.json`，修正前紀錄為 `look-web-before-idle-fix.json`。
- 第一輪雙 Web 測試中，另一端移動約 4 公尺、轉向 26.4 度，停止操作端的輸入方向均不變；Bot 移動亦未改寫本機方向。該輪尚未直接讀取實際 Camera transform，不能單憑此結果斷定使用者所見畫面變動的原因。
- 同輪回歸發現離場／換人時，唯讀診斷仍可能讀取已移除 AimTarget 的 Seat。角色取消註冊時現在同步清除目標參照，診斷讀取也加上 IsReady 檢查；額外加入實際相機位置、角度與本機輸入權數量的唯讀資訊，以便區分輸入方向、畫面位移與遠端角色控制。
- 最終重新建置 Web 成功，`Logs/camera-web-build.log` 含 `RIVALS_WEB_BUILD_OK`。`Tools/WebCameraOwnershipSmokeTest.cjs` 在正常鎖定／鎖定拒絕兩種模式、雙端交互測試均通過：另一端實際移動 4.0–4.1 公尺、轉向 26.4 度時，保持操作啟用但不輸入的觀察端，其輸入 yaw／pitch、實際相機 yaw／pitch、水平位置均為 0 變化；每端只有 1 位輸入權擁有者。Bot 活動時相機也未轉動，房主離場後客戶端正常返回大廳，沒有執行期例外。紀錄 `Logs/camera-ownership-web-check.json`。
- 依單人情境另執行 `Tools/WebSoloCameraSmokeTest.cjs`：確保 1 真人 7 Bot，滑鼠不動，觀察 Bot 走動、開槍、實際命中、死亡與下一小局。正常鎖定和拒絕鎖定皆通過；觀察到約 480 次 Bot 位移取樣，存活期間的輸入與實際相機 yaw／pitch 變化皆為 0。死亡時只有既有倒地傾斜／降低鏡頭，新小局才重設朝向。第一輪備援測試的小局在玩家未受傷前就結束，因此延長觀察條件後重跑備援；兩個通過模式彙整於 `Logs/solo-camera-final-check.json`，保留原始分次紀錄。
- `Tools/WebNetworkSmokeTest.cjs` 在最終 Web 重跑通過：8 次短按全部同步，含進場點擊共 9 發／9 次特效，本機回饋最慢 15.2 ms、RTT 182.9 ms；換彈、移動與離線補 Bot 正常，停止位置誤差 0.000265，無執行期例外。
- 最終交付為 `Builds/Web` 與 `Builds/RIVALS-Web-camera-fix.zip`（34,405,732 bytes，18 個檔案）。逐檔比對壓縮包，並驗證本機 HTTP 的 HTML／WASM 與成品相同、MIME 正確且 no-store。WASM SHA256：`54d83006ba8b3ffe5c7e1f710f8d347e1d76edafd11ccdba3997be795732d8a0`；紀錄 `Logs/camera-artifact-check.json`。
- 可確定修正的是停邊自轉，以及診斷讀取已離場目標的問題；上述實測沒有重現 Bot 或真人移動直接改寫本機相機方向，不能據此宣稱已確定使用者當時所有畫面變動的唯一原因。

## Web 介面重設、房主房名與擊殺紀錄（2026-09-24）

- 對戰 UI 維持方塊頭像與紅藍隊色，頂部改為 596 × 62 的集中隊伍／時間列；原版三大面板合計 136,256 平方設計像素，新版面板合計 35,464，約為原本 26%。死亡頭像只壓灰，移除斜線與頭像下的大名字；自己的頭像加淡金色框。血量、單槍彈藥縮到兩個底角，移除全寬操作列。暫停、設定、回合提示與勝利畫面使用相同方塊卡片樣式。
- 大廳改為格線背景、方塊表情圖示、玩家資料卡與即時清單。房間預覽是不可編輯的 HTML output，玩家名字修改與隨機抽名會立即更新為「名字的房間」；房主建房時由 C# 再次產生名稱，忽略傳入的自訂房名。房間顯示名稱來自房主屬性，連線使用獨立 GUID，因此同名房主可分別開房。
- 頭頂名稱縮為 12 號字／19 高的小標籤，只在活著、有視線且距離小於 14 公尺時顯示；11–14 公尺淡出。瞄準遠處時目標血量仍保留，但不顯示遠方玩家名字。已檢視 `Logs/ui-web-near-names.png`，近處隊友的名字貼近頭頂，不再使用大型面板。
- 右側擊殺紀錄由房主在致命傷害時寫入 NetworkArray 環形紀錄，保存擊殺者／被擊殺者名字、當時隊伍、武器、序號及 6 秒有效時間；客戶端最多顯示最近 4 筆，各名字用所屬隊伍底色，中間顯示武器與「擊倒」，最後 1 秒淡出。新小局不會重播上一小局的紀錄。
- Unity WebGL / IL2CPP Release / Wasm RuntimeSpeed 建置成功，`Logs/ui-web-build.log` 含 `RIVALS_WEB_BUILD_OK`。連線版本更新為 `rivals-web-11-ui`；僅建置 Web。保留目前網路 Prefab，建置附帶的美術／場景／設定重生內容已還原至這輪修改前備份。
- `Tools/WebInterfaceSmokeTest.cjs` 實際 Web 驗證通過：改名與隨機名同步房間預覽、無房名輸入欄、真實清單與雙人進房、自訂名字同步、近距存活名稱限制、死亡／遠方名字隱藏、擊殺紀錄無重複，兩端的同一事件在名字／隊伍／武器上完全相同。追加實際建立兩間「奶茶貓貓的房間」，確認獨立識別碼及選擇第二間只會加入第二間。沒有未處理 JavaScript 或 Unity 執行期例外；紀錄 `Logs/ui-web-check.json`。
- 已檢視實際 Web 的 `ui-web-combat.png`、`ui-web-near-names.png`、`ui-web-pause.png`，確認小型隊伍列、灰色陣亡頭像、隊色擊殺紀錄、近距名稱與暫停版面。大廳的版面預覽使用固定清單資料；真正房間驗證與截圖另存 `ui-web-lobby.png`、`ui-web-room-list.png`，不把預覽資料視為連線證據。
- 最終 Web 回歸 `Tools/WebLookSmokeTest.cjs` 四種模式皆通過：正常滑鼠鎖定轉向 768 度，拒絕鎖定／舊式錯誤事件／API 不可用分別約 578／562／565 度；上下看、瞄準、改版暫停選單的繼續按鈕、失焦停止正常。`Tools/WebNetworkSmokeTest.cjs` 通過 8 次短按，含進場點擊合計 9 發／9 次特效，最慢本機特效回饋 14 ms，RTT 177.5 ms；換彈、移動及離線補 Bot 正常，停止後兩端位置誤差 0.000265。兩組均沒有未處理 JavaScript 或 Unity 執行期例外；紀錄為 `Logs/look-web-check.json`、`network-web-check.json`，前版紀錄保留於 `*-before-interface.json`。
- 完整成品為 `Builds/Web` 與 `Builds/RIVALS-Web-interface.zip`（34,405,160 bytes，18 個檔案），逐檔驗證壓縮包一致。來源 HTML 模板與建置內容相同；本機 HTTP 提供的 HTML／WASM 與成品一致，回應 200、WASM MIME 正確、快取為 no-store。WASM SHA256：`a209042f2eba18f6d13ceee25cc2ef4c81b557403a3efdf32e8d8b2fa8e8cad7`，紀錄 `Logs/ui-artifact-check.json`。
- 上述為同機 Chrome、真實 Photon 房間的 Web 驗證，沒有重新進行八台實體裝置或人工延遲測試。網路玩法、武器傷害和小局／大局流程沿用前版；本次新增的擊殺紀錄只在發生擊倒時寫入，沒有額外建立逐幀射擊事件。

## Web 房間大廳、單槍拾取與五勝展示（2026-09-24）

- 賽制以使用者最後確認為準：先贏 5 小局即完成一大局，直接展示勝隊 10 秒，再重分真人與 Bot 隊伍、開始下一大局。沒有三大局累計。小局開場倒數 4 秒，戰鬥上限 60 秒，普通小局結果停留 3 秒；陣亡不會在當局復活。
- 新增原生 HTML 房間大廳與中文名字輸入，透過 Photon ClientServer lobby 列出真正房間；預設名字為 20 種動物 × 5 種前綴，共 100 個。自訂名字透過連線 token 交給房主，再以 NetworkString 同步。網路版本更新為 `rivals-web-10-lobby`。
- Unity 編輯器規則驗證通過，`Logs/battle-rules-editor.log` 含 `RIVALS_BATTLE_SMOKE_OK` 和 `RIVALS_BATTLE_RULES_OK`：散彈近距 100 傷害、遠距遞減及 9 條視覺散射線；狙擊近距與 65 公尺命中都為 100 傷害、無偏移、每發裝填且裝填期間不能再開火；步槍前 3 發準確、連射增大偏移、停止後恢復。
- 同一套規則測試涵蓋：只持有一把槍、同款即使缺彈也不消耗拾取物、中央三種武器各一把、真實等候 5 秒重生、替換槍丟棄舊持有權、死亡等待小局結束、新小局全血手槍、第五勝觸發四名勝者舞台、舞台持續 10 秒後自動重分隊並開始下一大局。編輯器測試程式以 `UNITY_EDITOR` 限定，不會打包至正式 Web。
- 第一輪 Web 成品實際以兩個 Chrome 瀏覽器，使用「房主貓貓／訪客兔兔」建立與加入房間。`Tools/WebLobbySmokeTest.cjs --podium` 通過：房間清單顯示真人 1/8、名字雙端同步、8 名角色中 2 真人 6 Bot、紅藍各 4 人；第二位離線後補回 7 Bot；實際走到中央取得步槍且持有權只剩目前一把。觀察完整對戰至第五勝，確認四位具名勝者、10 秒後新大局開始且勝場歸零。紀錄 `Logs/battle-web-check.json`，含 `WEB_LOBBY_OK`、`WEB_PODIUM_OK` 的執行輸出。
- Web 步槍試玩通過：實際走路拾槍、右鍵瞄準、連續射擊 10 發及停止 0.95 秒後恢復。已檢視 `Logs/battle-web-rifle-aim.png`（槍模低於準心）、`battle-web-rifle-spray.png`（散布準心與彈道）；紀錄 `Logs/battle-web-weapon-check.json`。另已檢視開場頭像／隊伍倒數與 `battle-web-podium.png` 的勝隊四人、名字和彩紙。
- 新大廳流程重跑四種 Web 視角情境全數通過：正常 Pointer Lock 旋轉 768 度，拒絕鎖定／舊式錯誤／API 不可用三種備援旋轉約 555–568 度。水平與垂直轉向、右鍵瞄準、Esc／恢復、邊缘停止與失焦處理均正常，無未處理 JavaScript 或遊戲例外。紀錄 `Logs/look-web-check.json`，上一版紀錄另存 `look-web-before-rooms.json`。
- 第一輪連線回歸抓到真人接替 Bot 時偶發讀取已移除角色的 Seat；已將角色註冊延後到 Spawned 完成，並在 Despawn 前從名單移除，畫面與射線也略過尚未完成生成／已移除的角色。最終重新建置成功，`Logs/rooms-web-final-build.log` 含 `RIVALS_WEB_BUILD_OK`，沒有重建桌面版。
- 最終 Web 成品重跑一般與延遲雙人連線皆通過，沒有未處理 JavaScript 或遊戲執行期例外。一般 RTT 約 182.5 ms，8 次短按全部同步，本機特效最慢 16.1 ms；延遲測試為 WebSocket 收送各增加 90 ms，實測 RTT 366.3 ms，本機特效最慢 11.4 ms。兩組皆確認彈藥、換彈、移動、真人替换 Bot、離線補位；包含進場點擊共 9 發／9 次特效，停止移動後雙端誤差分別為 0.000261／0.000193 單位。紀錄 `Logs/network-web-check.json`、`network-web-lag-check.json`；修正前紀錄另存 `network-web-before-lifecycle.json`。本機回饋量測為瀏覽器事件至遊戲特效，不包含硬體延遲。
- 完整 Web 交付為 `Builds/Web`、`Builds/RIVALS-Web-rooms.zip`（34,382,513 bytes，18 個檔案）。已逐檔比對壓縮包，並確認 `http://localhost:8184/` 的 HTML／WASM 與建置一致，回應 200、`Cache-Control: no-store`、WASM MIME 為 `application/wasm`。最終 WASM SHA256 為 `a079a52892532b941e2ff1106d93f7fab2e58b3692d1e912cedf10cb7063bd4e`；紀錄 `Logs/rooms-artifact-check.json`。
- 以上瀏覽器驗證使用本機 Chrome、真正 Photon 房間及實際 Web 成品；尚未做多台實體裝置的長時間對戰。房主遷移仍未實作。以下較早紀錄保留歷史行為，當前玩法以上述本節及 README 為準。

## Web 滑鼠視角修正（2026-09-24）

- 重現問題：拒絕 Pointer Lock 時，點擊遊戲後以真實滑鼠移動 250 px，原版 yaw 仍為 0；原本只接受右鍵拖曳。修正後，同樣操作在正常鎖定與拒絕鎖定兩種情境皆旋轉 30 度。前後紀錄為 `Logs/look-before.jsonl`、`Logs/look-after.jsonl`。
- Web 模板改為在畫面點擊事件直接要求滑鼠鎖定；鎖定失敗時自動接受一般滑鼠移動，不需按住右鍵。未鎖定時，游標停在畫面左右 32 px 邊緣區域會持續轉向，移回中央停止。移出畫面、失焦、背景分頁與 Esc 清除累積輸入，避免回來時鏡頭跳動；失敗通知不再偽造 `pointerlockchange` 清除當下輸入。
- `node Tools/WebLookSmokeTest.cjs` 通過四種 Chrome 情境：正常鎖定、Promise 拒絕、舊式 `pointerlockerror`、沒有鎖定 API。正常鎖定實測連續旋轉 768 度；三種備援分別旋轉約 571、559、591 度。各情境皆驗證一般滑鼠水平／垂直轉向、右鍵瞄準和 Esc／繼續玩；備援另驗證邊緣轉動停止、移出畫面停止、失焦停止及點擊恢復，沒有未處理 JavaScript 或遊戲例外。
- 測試直接使用 Playwright 滑鼠／鍵盤操作實際 Unity Web 成品，沒有注入合成 mousemove 或修改遊戲狀態。結果 `Logs/look-web-check.json`，四種情境各保留 `Logs/look-web-*.png`；已檢視正常鎖定及拒絕鎖定的實際畫面。內嵌瀏覽器限制以拒絕／停用 API 模擬，未直接控制使用者目前的內嵌分頁。
- 修改滑鼠按下事件後，重跑雙 Web 玩家連線回歸通過：8 次短按均計算，含進場點擊共 9 發／9 次特效；最慢本機回饋 14.3 ms、RTT 約 182 ms；換彈、遠端移動及離線補 Bot 正常，停止後雙端位置誤差 0.0000525。結果 `Logs/network-web-check.json`；前次紀錄保留於 `Logs/network-web-before-look-fix.json`。
- 本次只更新 Web HTML、來源模板、操作說明及瀏覽器驗證腳本，既有 WASM SHA256 仍為 `12AD8B343DBD7AB7882FCFB5910EF3473B0575DBC4935726E85953C33162FC00`。`Builds/RIVALS-Web-network.zip` 已更新（34,372,456 bytes，18 個檔案），逐檔比對與 `Builds/Web` 相同；`http://localhost:8184/` 回傳的 HTML 也一致，`Cache-Control: no-store`。紀錄 `Logs/look-artifact-check.json`。

## 連線與射擊回饋最佳化（2026-09-24）

- 最終交付為 Web：`Builds/Web` 與 `Builds/RIVALS-Web-network.zip`（34,371,802 bytes，18 個檔案）。Unity WebGL / IL2CPP Release / Wasm RuntimeSpeed 建置成功，日誌 `Logs/network-reliable-web-build.log`。網路版本 `rivals-classroom-9-network`，需重新整理所有一起玩的分頁。
- 兩個 Chrome 的 Web 測試通過：8 次實際滑鼠短按全部被房主計算，包含進場點擊共 9 發／9 次特效，雙端彈藥一致；手動換彈、角色移動與離線補 Bot 正常。一般連線 RTT 約 183 ms，8 次短按觸發特效為 2.2～13.4 ms；日誌 `Logs/network-web-check.json`，截圖 `Logs/network-web-client.png`。
- 純 Web 延遲測試通過：`node Tools/WebNetworkSmokeTest.cjs --lag` 在測試客戶端 WebSocket 收、送各加 90 ms，實測 RTT 約 366 ms，8 次短按全部計算且不重播，本機特效最慢 14.2 ms 觸發。移動中本機預測領先房主 1.285 單位，放開按鍵並等候同步後位置誤差 0.000405 單位；換彈與補 Bot 均正常，沒有未處理 JavaScript 或遊戲執行期例外。日誌 `Logs/network-web-lag-check.json`。時間量測是瀏覽器滑鼠事件到 Render 特效事件，未包含實體滑鼠與螢幕的硬體延遲。
- Web 回歸曾抓到短按未留在後續輸入封包造成漏發，因此新增累計開火按下序號 `FirePress`，房主記錄已消耗的序號；即使該瞬間的按鈕狀態遺失，後續輸入仍攜帶請求，並只處理一次。最終上述兩組 Web 測試確認實際發數與特效發數一致。
- 最終 Web.wasm SHA256：`12AD8B343DBD7AB7882FCFB5910EF3473B0575DBC4935726E85953C33162FC00`。壓縮包 18 個檔案逐一比對相同，本機 HTTP 提供的 WASM 也與成品相同，使用 `application/wasm`、`Cache-Control: no-store`。紀錄 `Logs/network-artifact-check.json`。
- 開槍、彈藥、換彈改為本機預測，傷害仍僅由房主寫入；本機只對新的 forward simulation 射擊播放槍聲／後座力／彈道，重模擬與回傳確認不重播，也不會因射擊計數校正而吞掉下一次短按。真人使用 400 ms Fusion 命中歷史與 SubtickAccuracy，角色歷史 Hitbox 與當下 PhysX 移動碰撞體分開查詢；Bot 維持當下場景判定。
- 模擬與雙向傳送明確設定為 60 Hz，保留 NetworkCharacterController 快照插值，遠端持槍俯仰改讀插值快照。玩家快取依生成／離場事件更新；Bot 決策改為分散的 10 Hz，移動仍為 60 Hz；射線查詢重用緩衝區、彈道物件池、受傷時才更新材質及生死切換才調整碰撞體，減少主執行緒工作與垃圾配置。
- Windows Development Build：`Builds/NetworkValidation4/Rivals.exe`。`Tools/NetworkSmokeTest.ps1 -Exe Builds/NetworkValidation4/Rivals.exe -DelayMs 200` 通過，兩端啟用 Fusion 延遲、20 ms jitter、2% 丟包設定；實測 RTT 216～266 ms。四種槍合計 25 發，顯示也是 25 次，房主彈藥依序為手槍 10、步槍 25、霰彈 3、狙擊 2，含手槍打空後自動換彈。
- 在相同測試中，25 發本機特效全部早於房主處理；房主處理時間比本機特效晚 128～167 ms，中位數 146 ms。此數值是同機兩程序 UTC 時戳差，並非完整滑鼠到螢幕的延遲。Fusion 收取開火輸入到 Render 的最長時間 5.64 ms。日誌：`Logs/network-host.log`、`Logs/network-client.log`、`Logs/network-latency-results.json`。
- 追加移動目標測試：3 次命中、目標剩 16 HP，至少 1 次回溯命中的射線已經無法命中目標當下的 CharacterController；`RIVALS_LAG_COMPENSATION_OK hits=3 rewindOnlyHits=1`。
- 新版本重跑完整戰鬥測試通過：出生手槍、三類拾取、滿彈拒絕拾取、命中與閃色、生命條、雙方倒地、18 秒移位重生、回合重置、720 度視角與 80 × 80 地圖。日誌 `Logs/network-combat-regression.log`，成功標記 `RIVALS_COMBAT_SMOKE_OK`。
- `Tools/SmokeTest.ps1 -Exe Builds/NetworkValidation4/Rivals.exe` 通過離線／Host／Client：皆為 8 位角色；練習 1 真人 7 Bot，雙人連線 2 真人 6 Bot；沒有遊戲執行期例外。日誌 `C:/Users/USER/AppData/Local/Temp/RivalsSmoke-d8317ac35f304920bc8c28d9e48207ba`。
- 以上為同一台電腦、真實 Photon 房間與人工網路條件的自動驗證；不代表所有實體網路都達到固定延遲。房主遷移與瀏覽器背景節流仍未處理。

## 戰鬥回饋、武器拾取與擴大地圖（2026-09-24）

- 出生及新回合只配手槍，移除小刀操作；鍵位改為 1 手槍、2 霰彈槍、3 狙擊槍、4 步槍。持有權由房主驗證，不能切換未撿取的武器。地板長寬由 40 × 40 擴為 80 × 80，新增外側掩體與通道。
- 房主同步 9 個隨機拾取點，三種進階槍各 3 個；靠近拾取並自動裝備，重複拾取可補滿彈匣，滿彈不消耗拾取物。18 秒後更換位置重生；避開障礙物、其他拾取點和玩家周圍，且隔牆不能拾取。Bot 也會尋找武器。
- 命中角色使用獨立材質屬性短暫閃白／紅，不改動共用材質；命中記號、傷害數字、擊倒提示、自己／目標生命值已接上。受傷有紅色邊緣、來源方向與短暫鏡頭側震；死亡時角色在 0.65 秒內倒地，自己的鏡頭降至 0.32 公尺並側倒，下一回合恢復。
- Windows Development 驗證成品為 `Builds/CombatValidation`，建置紀錄 `Logs/combat-windows-build.log`。`-duelSmoke -combatSmoke -keepAlive` 通過真實遊戲流程：手槍出生、拒絕未取得的步槍與小刀、三種武器拾取／自動裝備／彈藥、滿彈重複拾取限制、命中傷害／目標血量／閃色、敵人與自己的死亡狀態、18 秒重生換位、回合重置、地圖尺寸與正反向多圈轉向。紀錄 `Logs/combat-smoke.log` 包含 `RIVALS_COMBAT_SMOKE_OK`。此測試用背景執行，原生螢幕截圖為黑畫面，畫面驗收以下述 Web 實測為準。
- `Tools/SmokeTest.ps1 -Exe Builds/CombatValidation/Rivals.exe` 的練習、Host、Client 三個執行個體通過；練習有 39 次射擊、7 次命中；Host／Client 比分均為 0：1，真人／Bot 人數一致，無遊戲執行期例外。紀錄 `%TEMP%/RivalsSmoke-d9f6859a978a4e7e8a08bd27fc3c3f2d`。
- Web 建置成功，`Logs/combat-web-build.log` 包含 `RIVALS_WEB_BUILD_OK`。Chrome 實測連續兩圈水平轉向、上下方向、未取得步槍的切換限制、第二真人加入／離開與 Bot 補位、兩端 9 個拾取物種類與座標同步，以及實際走到武器旁自動拾取。
- 另外以瀏覽器拒絕 Pointer Lock 的情境測試，發現原有拒絕通知會清除右鍵拖曳狀態；已修正 Web 模板與輸出的 `index.html`。重測 4 次真實滑鼠右鍵拖曳，累積轉向約 384 度，期間 Pointer Lock 維持未取得。這項最後修正只涉及 HTML，WASM 與上述成功建置相同。
- Web 實際對戰取得並檢查 `Logs/combat-web-hit-flash.png`、`combat-web-target-health.png`、`combat-web-received-hit.png`、`combat-web-enemy-down.png`、`combat-web-local-down.png`、`combat-web-pickup.png`：命中顯示目標血量與傷害值，受擊畫面泛紅，敵人倒地，自己死亡鏡頭降低並側倒，拾取後顯示新槍與持有狀態。測試紀錄 `Logs/combat-web-check.json`，結果 `WEB_COMBAT_OK`，無未處理 JavaScript 例外或遊戲執行期例外。
- Web.wasm SHA256：`9E5BB287F9C9F9FBCE01496FAC07C81D5228B8DBA747C2B2A369588028CBB31C`。本機 `http://localhost:8184/` 持續提供最新版，完整成品為 `Builds/RIVALS-Web-combat.zip`。網路版本更新為 `rivals-classroom-7-combat`，一起玩的分頁須使用新版。
- 上述為同機 Windows／Chrome 驗證，尚未全面測試不同實體裝置、GPU、跨網路延遲或長時間對戰。Bot 的繞障礙屬於簡單轉向，未使用完整導航網格；房主遷移仍未實作。

## 槍口彈道與準心修正（2026-09-23）

- 四種槍械 Prefab 新增實際槍管前端的 Muzzle；本機彈道校正持槍鏡頭與場景鏡頭的不同 FOV，遠端玩家及 Bot 使用各自的世界槍口。短刀不再顯示子彈軌跡。準心改用白色十字加深色外框；後座動畫作用於槍身，避免鏡頭準心偏離射擊方向。
- Unity 編輯器驗證 `GunPresentationChecks.Validate` 通過：四種槍械、96 組投影（16:9／4:3／21:9，80／65／52／24 度 FOV，兩種後座姿態），並確認短刀沒有槍口。紀錄為 `Logs/gun-presentation-checks.log`；已檢查 `Logs/gun-muzzle-review.png` 的四種槍口標記均在槍管前端。
- Web 建置成功，紀錄 `Logs/gun-fix-web-build.log` 包含 `RIVALS_WEB_BUILD_OK`。此輪更新 `Builds/Web`，沒有重建 Windows 成品。
- Chrome 實際操作四種槍械，各自驗證一般持槍與右鍵瞄準：8 個狀態的畫面中心均檢出白色準心與深色外框，並拍攝連續射擊畫面。已目視確認步槍、手槍、霰彈槍、狙擊槍的彈道由槍口接出，狙擊放大後仍對齊。短刀攻擊與暫停流程正常，暫停面板不顯示準心。紀錄：`Logs/gun-fix-web-check.json`；截圖：`Logs/gun-web-*.png`。
- 新版重跑雙 Chrome 分頁流程通過：自動進房後 1 位真人加 7 位 Bot，第二位真人加入後兩頁皆為 2 位真人加 6 位 Bot，第二頁離開後恢復 1 位真人加 7 位 Bot；返回首頁不會自動重入。紀錄：`Logs/bot-fill-web-check.json`。兩組瀏覽器測試均無 JavaScript 未處理例外或遊戲執行期例外。
- 最終 Web.wasm SHA256：`F01DAAD3894C55376E23A7AB02E1C8D571092368102E75F42EAB38104FD41822`。本機網址為 `http://localhost:8184/`，HTTP／WASM 回應正常且快取為 `no-store`；完整壓縮檔為 `Builds/RIVALS-Web-gun-fix.zip`。
- 實測使用本機 Chrome；不同實體裝置、GPU 與瀏覽器的相容性尚未全面驗證。

## 自動進房與 Bot 補位（2026-09-23）

- Unity 6000.3.11f1 Windows 與 Web 建置成功，分別記錄於 `Logs/bot-fill-windows-build.log`、`Logs/bot-fill-web-build.log`。Windows 驗證成品位於 `Builds/BotValidation`，保留正在試玩的舊 Windows 成品。Web 最後另加入下述出生視角修正，最終建置紀錄為 `Logs/bot-fill-web-final.log`。
- `Tools/BotFillSmokeTest.ps1 -Exe Builds/BotValidation/Rivals.exe` 通過真實 Photon 連線測試：單一真人加 7 位 Bot 立即進入回合；真人逐一加入至 8 位，Bot 逐一減至 0；第 9 位收到 `GameIsFull`。
- 每個加入階段均確認 8 個不重複座位、藍紅各 4 位，加入過程比分與回合持續。移除一位真人後補回 1 位 Bot，重新加入後移除 Bot；其他真人全部離開後回到 1 位真人加 7 位 Bot，保留第 6 回合與 1：5 比分。
- 強制終止程式時，Fusion 的離線事件早於 Photon Cloud 釋放連線名額，測試中重新加入曾短暫收到 `GameIsFull`。測試只對這個已知名額釋放延遲進行有上限重試，確認後續可重新加入；其他錯誤仍會令測試失敗。這不代表已實作斷線重連或房主遷移。
- 成功連線測試原始紀錄：`%TEMP%/RivalsBotFill-e7ca7db6836c4c3fb4ddbd04aba1e183`，另存於 `Logs/bot-fill-native-tests`。
- 原有 `Tools/SmokeTest.ps1` 的離線練習、Host、Client 均通過：練習為 1 位真人加 7 位 Bot，Host 與 Client 同步為 2 位真人加 6 位 Bot，雙方比分同為 1：0，三個執行個體均有射擊與命中。紀錄：`%TEMP%/RivalsSmoke-904b46e7c67b48ffbb429f411c6f1f90`。
- Chrome Web 實測：不點房間按鈕即自動連線，第一頁 1 位真人加 7 位 Bot；第二頁自動加入後，兩頁均為 2 位真人加 6 位 Bot；關閉第二頁後，第一頁回到 1 位真人加 7 位 Bot。Esc → 回首頁後停留在首頁，沒有再次自動進房。
- 第一輪 Web 畫面驗收發現中途加入的紅隊玩家視角尚未初始化，可能面向外牆。已在取得本機角色時使用同步的出生朝向初始化鏡頭；重新打包並重跑上述雙頁流程，畫面確認紅隊出生後面向場內。
- 瀏覽器紀錄 `Logs/bot-fill-web-check.json` 未出現 JavaScript 未處理例外或遊戲執行期例外；已檢查 `Logs/bot-fill-web-solo.png`、`Logs/bot-fill-web-two-humans.png` 的場景與真人／電腦人數介面。瀏覽器分頁圖示未提供而有 `favicon.ico` 404，不影響遊戲。
- 最終 Web.wasm SHA256：`2FE2D40857243B58E16D2D7DCA8F0FEF98F8BD6380AE50A6758EA819294B121C`。本機使用 `http://localhost:8184/`，WASM 回應為 `application/wasm`，快取為 `no-store`；完整成品另存 `Builds/RIVALS-Web-bot-fill.zip`。
- 以上連線驗證均在同一台電腦進行，尚未做八台實體電腦或跨網路長時間測試。連線版本為 `rivals-classroom-6-bots`，新舊成品不會混入同一房間；房主離開仍會結束目前房間。

## 角色、武器與場地視覺更新（2026-09-23）

- 最終 Web 建置成功，`Logs/visual-web-final.log` 包含 `RIVALS_WEB_BUILD_OK`；Web.wasm SHA256：`1E36E8A87993A5C96EE9BB57FDF68DF32F37328524CAE9D5DBC75E6DA2ECDDEB`，本地服務成品與驗證成品一致。
- 瀏覽器確認白灰格線場地、方塊笑臉角色、橘黑步槍、紅色彈殼霰彈槍、綠色狙擊槍、五個武器圖示與綠色生命條。首頁保留兩個加入按鈕，齒輪開關設定正常，Esc 顯示「聲音：關」。
- 第一輪 Web 檢查發現執行期建立 Cylinder 時，Unity 裁掉其自動建立的 CapsuleCollider。新增 `Assets/Rivals/link.xml` 保留此類型，確認原生註冊碼包含它；重新打包、進入練習並切換霰彈槍後，瀏覽器 error 紀錄為空。
- 背景內嵌瀏覽器仍會顯示滑鼠鎖定重試提示；完整持續滑鼠鎖定與跨電腦手感尚待一般瀏覽器前景人工驗收。
- Windows 建置成功，`Logs/visual-windows.log` 包含 `RIVALS_BUILD_OK`；Assembly-CSharp.dll SHA256：`CE8600EB33F908C6411DAF70E5DE2F9878EA8084904054C5833B83DC30C79B46`，與驗證成品相同。
- 連線版本更新為 `rivals-classroom-5`，避免新版場地與舊版客戶端混用。
- 已檢查 `Logs/game-art-review.png` 的五種武器與八組角色外觀，包含模型正向、配色、笑臉、髮型與帽子。
- 五種武器各跑離線練習，全部回報 `RIVALS_SMOKE_OK`。步槍、手槍、霰彈槍、狙擊槍均有命中；短刀測試只檢查切換及執行，未在自動遠距離路線中命中。
- 已檢查 `Logs/visual-weapon-captures` 的實際持槍和場景截圖；霰彈槍固定截圖時間碰到換彈，視覺另外透過模型預覽及瀏覽器切換確認。
- 八個 Windows 程式經 Photon 連線，全部回報 8 人、藍紅各 4 人，並同步至比分 4：0；第 9 人收到 `GameIsFull`。紀錄保留於 `Logs/visual-classroom`。
- 以上是同一台電腦上的多程式驗證，未做八台課堂電腦或跨網路測試。外觀為免費模型與原創造型調整，並非原作全部角色皮膚、武器與動畫的完整還原。

## 設定齒輪（2026-09-23）

- 首頁與 Esc 選單加入右上角小齒輪；設定內容預設收起，對戰時齒輪隱藏。F8 仍可開關設定。
- 齒輪圖示由程式繪製，不依賴中文字型缺少的齒輪符號。
- Web 建置成功，紀錄為 `Logs/settings-gear-web-build.log`。Web.wasm SHA256：`36EF1B065433C3F22B5B1982B3C07AE9EF2123273F681D6672688785815EE0F9`，與驗證建置相同。
- 瀏覽器實測點齒輪展開／收起設定，並用離線練習確認對戰時隱藏、Esc 選單中顯示。

## 繁體中文與 8 人教室版（2026-09-23）

- Unity Windows 建置成功，使用 `Tools/ClassroomSmokeTest.ps1` 執行 8 人真實 Photon 連線測試。
- 測試使用與「開房間」相同的 AutoHostOrClient 流程建立房間，第二名玩家也使用相同按鈕流程加入既有房間，其餘玩家使用 Client 加入。
- 8 個玩家都收到 `players=8 bluePlayers=4 redPlayers=4`，並同步遊戲結束比分 5：0；房主記錄 72 次射擊、30 次命中。
- 第 9 人加入收到 `GameIsFull`，未成功連線；測試結束後所有測試程式都已關閉。
- 8 份執行紀錄未出現 NullReferenceException、InvalidOperationException、MissingReferenceException 或 ArgumentException。
- 測試紀錄：`%TEMP%/RivalsClassroom-417843131e9f44f68434835afb819620`，已複製至 `Logs/classroom-eight-player`。
- Noto Sans CJK TC Regular OTF 共包含 44,810 個字元映射，介面程式碼內的中文字都有對應字形。
- 最新 Web 建置成功：`Logs/classroom-web-build.log` 包含 `RIVALS_WEB_BUILD_OK`。專案成品與驗證成品 Web.wasm SHA256 同為 `74769074FD6BD80E8E55FB3C701A73448FF57E25AE19E836CCB845D76AC26035`。
- 瀏覽器畫面確認首頁只有「開房間／加入房間」，未開房提示、等朋友、回合、體力、五種武器、Esc 選單均為繁體中文且無缺字。Esc 顯示「聲音：關」。
- F8 開啟老師設定，可查看房間代號、區域與素材授權；一般首頁不顯示這些內容。
- 最終 Web 版使用兩個瀏覽器分頁：第一個點「開房間」，第二個直接點「加入房間」，沒有輸入任何代號；兩邊生成本機及遠端角色，進入同一回合，藍、紅隊各 1 人。
- 本地首頁與 WASM 回應 200，WASM MIME type 為 application/wasm、Cache-Control 為 no-store；Web 成品包含 Noto 字型授權。
- Windows 成品同步更新，Assembly-CSharp.dll SHA256：`B5414A252620617566F9B268B88CBA19AA525196B3FB2FF0BAC037161075CB11`。
- 8 人測試為同一台電腦上的 Windows 程式經 Photon 連線，尚未進行 8 台實體電腦的課堂測試。

## Web 與持槍修正（2026-09-23）

- Unity 6000.3.11f1 WebGL / IL2CPP 建置成功，最後紀錄為 `Logs/web-build.log` 的 `RIVALS_WEB_BUILD_OK`。
- 第一人稱槍械縮放與手臂位置調整；獨立 URP Overlay Camera 顯示武器，避免世界瞄準倍率把槍械放得過大。
- 修正文字編碼、拆開五個武器快捷鍵欄位、分離彈藥顯示；暫停時不繪製或接受底下回合結束面板的按鈕輸入。
- 每次啟動 `AudioListener.pause = true`、音量為 0；音效播放也受 AudioEnabled 控制。首頁與選單確認顯示 SOUND: OFF。
- 背景瀏覽器實測：載入、離線練習、回合與比分變化、滑鼠拖曳改變視角和射擊、數字鍵切換武器、Esc 選單、離開對戰回首頁。
- 畫面確認新版手槍手部貼合握把，HUD 快捷鍵及彈藥沒有重疊；暫停面板沒有混入回合提示文字。
- 同一機器兩個 Web 分頁以 Host / Client 加入 Photon asia 的同一測試房，兩邊都生成本機及遠端角色，Client 記錄 players=2，並進入回合。
- 本地 HTTP 首頁和 WASM 都回應 200；WASM 使用 application/wasm，回應 Cache-Control: no-store。
- 最後 Web.wasm SHA256：`80d39e3e2ac887396d2026028be2f09ef9bbb76a33cb1e85e05c4a9399d195a1`，專案成品與驗證建置相同。
- 背景內嵌瀏覽器會拒絕真正的 Pointer Lock；模板現在會處理同步例外及 Promise rejection，顯示重新啟用提示，重測未再出現未處理的錯誤視窗。一般瀏覽器前景的持續滑鼠鎖定、完整手感、跨電腦網路仍須人工驗收。
- WebGL 日誌有 Unity 內建 URP Shader 不支援訊息；本次測試的場景、武器、角色、介面均有繪製。尚未做不同 GPU／瀏覽器的完整相容性測試。

下列 Windows 驗證屬於先前版本；這次交付更新的是 `Builds/Web`。

- Unity 6000.3.11f1 Windows x64 Development Build 成功。
- 使用提供的 Photon Fusion 2.1.2 stable 2279 套件與 App ID，區域 asia。
- 自動測試三個 Windows 執行個體：離線練習、Host、Client，皆正常結束。
- 練習：兩名角色、62 次射擊、8 次命中，比分 2：0。
- Host：兩名角色、42 次射擊、12 次命中，比分 3：0。
- Client：兩名角色、39 次射擊，收到相同比分 3：0。
- 未出現 NullReferenceException、InvalidOperationException、MissingReferenceException 或 ArgumentException。
- 已以正常 Windows 視窗執行並檢查遊戲輸出截圖，確認場景、第一人稱武器、血量、彈藥、比分及回合提示可見。
- 打包成品與驗證成品的 Assembly-CSharp.dll SHA256 相同。

這些是同一台電腦上的多程式測試；尚未實測兩台不同電腦、不同網路、延遲模擬、長時間連線或大量玩家。滑鼠鎖定與按鍵已實作，未進行完整人工手感驗收。

重新驗證方式見 README 與 Tools/SmokeTest.ps1。

## 免費素材整合版本

- 匯入 Quaternius 四種槍械、Kenney 方塊角色與 Legacy 動畫、場景道具、格紋貼圖、準星和腳步／命中聲。
- 匯入 Tabasco 槍聲與 SpringySpringo 換彈聲；依槍聲壓縮檔內 CC BY 3.0 文件署名，Windows 目錄內有 ASSET_CREDITS.txt 和原始 ThirdPartyLicenses。
- 新增霰彈槍、狙擊槍與彈匣同步。
- Unity Windows 最後打包成功；practice、host、client 三執行個體測試全部通過。練習比分 2：0，Host／Client 同步比分 3：0。
- 額外指定武器測試：霰彈槍 14 次射擊／8 次命中／比分 1：0；狙擊槍 10 次射擊／1 次命中／比分 1：0。
- 已檢查 Unity 直接渲染的場景截圖，確認角色貼圖、槍械材質、槍口方向、地板及樓梯顯示正常。
- 最後成品 Assembly-CSharp.dll SHA256：CE6310BF9DA0460CBD56DEF487A9E7D88CB6C483AFD8D63A0216D88E4886E58D，與測試成品一致。
- 尚未人工完整驗收音量混音、所有動畫銜接及跨電腦連線延遲；不代表原作全功能或手感已完整還原。


## 2026-09-24：滑鼠相容操作與正式發布

- 修正內嵌瀏覽器拒絕滑鼠鎖定後整場無法操作的問題。原生 Pointer Lock 仍使用無邊界相對位移；失敗、無 API、逾時或假成功時自動允許右鍵拖曳。放開滑鼠可重新定位，靜止、移到邊緣及未按右鍵時都不產生轉向；切換視窗、Esc、遊戲階段改變會清除拖曳狀態。
- `PointerBridgeChecks.cjs` 八種情境通過：原生鎖定、Promise 拒絕、舊式錯誤、無回應、無 API、假成功及真正 iframe sandbox 允許／拒絕；包含拖曳輸入、重定位、游標隱藏、失焦與切回原生鎖定。
- `WebLookSmokeTest.cjs` 在真正 Unity Web 遊戲通過三種情境。原生鎖定累計轉向 768 度；拒絕及無回應兩種相容模式各累計 432 度，移動、射擊、右鍵瞄準、放開／靜止不自轉與失焦恢復通過。沒有未處理瀏覽器／遊戲例外。
- `WebFocusSmokeTest.cjs` 通過 Tab、失焦後一次點擊恢復、意外解除鎖定、清除按鍵、Esc 選單及全螢幕鎖定，恢復後實際轉向約 19.2 度。
- `WebConnectionLifecycleSmokeTest.cjs` 對合併後的本機 Web 成品重跑，13 項全部通過，包括反覆進出房、保留名字、清除舊診斷、設定中房主斷線、大廳連線恢復、連續重新整理與失敗後重試。紀錄在 `Logs/PublishValidation/connection-lifecycle-check.json`。
- Unity 遊戲程式使用已驗證的 `WebConnection` 建置，複製前比對 `Logs/connection-build-inputs.json`；除本次更新的 HTML 模板外，建置輸入與目前來源相符。本次無 C# 改動，不重新生成場景／Prefab。
- `Builds/RIVALS-Web-controls-connection.zip` 為 34,439,932 bytes，18 個檔案，已逐檔驗證與 `Builds/Web` 一致；保留所有素材授權。WASM SHA256 為 `706506b769722576a2d54b111b7c66119dbed193bc90fb42ee2ac91a9f1fa9c6`。
- 教材以 Node 22 執行 H5 建置，14 條路由預先產生、300 個資產引用驗證成功，修改頁面 lint 通過。操作說明涵蓋原生與相容模式；正式教學頁在桌面與手機寬度都通過四題展開及遊戲連結檢查，沒有橫向溢出或未處理錯誤。
- 已推送發布提交 `9609776` 至 `gh-pages`，GitHub Pages 的 [部署流程](https://github.com/scozirge/a-thought/actions/runs/35930100320) 成功。正式 HTML 顯示 `20260924-controls-connection`，教學頁含相容操作說明；線上 WASM HTTP 200、MIME `application/wasm`，內容雜湊與本機一致。檢查紀錄在 `Logs/PublishValidation/public-artifact-check.json`、`lesson-check.json`。
- 正式網址執行 `WebNetworkSmokeTest.cjs` 通過雙人真實 Photon 房間：8 次短按全部同步，加上入場點擊共 9 發／9 次即時特效，本機回饋最慢約 28.1 ms、RTT 約 181.1 ms；裝填、移動與離線補 Bot 通過，停止後位置差約 0.000135。紀錄在 `Logs/PublishValidation/network-web-check.json`。
- 正式遊戲：https://scozirge.github.io/a-thought/rivals/ 。第二次課程：https://scozirge.github.io/a-thought/hatchbeasts/classroom/red-blue-battle/ 。發布時保留 `hatchbeasts/v1` 的 26 個檔案，核對內容完全相同。

相容拖曳的單次滑動仍受螢幕邊界限制，需放開移回後再拖曳；網站無法繞過外層瀏覽器對 Pointer Lock 的限制。需要連續自由轉向時，使用支援鎖定的獨立 Chrome／Edge。此結果沒有宣稱 Codex 內嵌視窗已取得原生鎖定權限。
