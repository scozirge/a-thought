# 紅藍槍戰｜RIVALS Web 連線原型

Unity 6000.3.11f1 / URP / Photon Fusion 2.1.2 stable 2279。當前交付目標為 Web。

公開遊戲：[紅藍槍戰](https://scozirge.github.io/a-thought/rivals/)。課堂教材：[第二次課程｜紅藍槍戰](https://scozirge.github.io/a-thought/hatchbeasts/classroom/red-blue-battle/)。

GitHub Pages 使用 `gh-pages` 分支根目錄；將完整 `Builds/Web/` 發布到 `rivals/`，保留 `Build/`、`ASSET_CREDITS.txt` 與 `ThirdPartyLicenses/`。課程中的新增武器與技能是發想範例，並非現有功能。

## 開始玩

網頁先顯示房間大廳。預設從 100 個簡短的中文動物名字挑一個，也能自行輸入最多 10 字的名字。房間名稱固定為「房主名字的房間」，修改名字或抽取新名字時立即更新預覽，不能單獨輸入房間名稱。按「建立房間」開始，或在即時房間清單選一間按「加入房間」。同名房主的房間使用不同連線識別碼，仍能分別建立。清單顯示真人數與是否已滿；房間容量為 8 位真人，Bot 不占連線名額。

進房後固定 4 對 4，空位由 Bot 補齊。真人加入會接替 Bot，優先挑選仍存活的座位；接替時保留原座位的血量、位置和武器，避免離線／重加入復活。真人離線也由 Bot 接手原狀態。真人、Bot 都有名字；活著、沒有被牆壁遮住且距離小於 14 公尺的角色才顯示小型頭頂名字，11–14 公尺逐漸淡出，陣亡後隱藏。

進入小局倒數就顯示中央準心；開打後點「開始操作」取得瀏覽器滑鼠鎖定，使用 `movementX/movementY` 相對位移，可連續轉任意圈。鎖定時隱藏游標，按 Esc 或失焦時恢復游標、清除輸入並停止操作；重新點擊後才恢復。

若內嵌瀏覽器拒絕 Pointer Lock、API 不存在，或 1.5 秒內沒有實際取得鎖定，會自動切換相容操作，不再用錯誤視窗擋住遊戲：按住右鍵拖曳轉向，放開後把滑鼠移回，再次拖曳即可繼續轉身。右鍵仍會瞄準，左鍵射擊、WASD 移動照常。只有按住右鍵拖曳期間才隱藏游標；滑鼠停止、放開或失焦後不會自轉。右鍵拖曳使用每次按下建立的新座標起點，並以 pointer capture 接收畫面外的放開事件；不使用邊緣自轉或 Q／E 模擬轉向。

相容模式的單次拖曳仍受螢幕邊界限制，需放開重新拖曳；要一般 FPS 的連續自由轉向，請在獨立 Chrome／Edge 開啟，再點畫面或「切換自由轉向」。網站無法自行修改外層 iframe 的 sandbox 權限；自行架設嵌入頁需允許 `allow-pointer-lock`。參考 [MDN Pointer Lock](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API)。

鎖定請求在瀏覽器點擊事件直接執行，以實際 `pointerlockchange` 為準；相容操作期間不會每次開槍都重試鎖定。Unity 的 `WebGLInput.stickyCursorLock` 設為 false，避免保留過期狀態。全螢幕與滑鼠鎖定同時要求時先要求鎖定，避免全螢幕消耗點擊授權。發布版本對 Unity 檔案加上版本查詢參數，避免 HTML 更新後仍取用瀏覽器中舊的遊戲檔案。

| 操作 | 按鍵 |
| --- | --- |
| 移動／衝刺 | WASD／Shift |
| 自由轉向 | 點擊取得滑鼠鎖定後，移動滑鼠 |
| 相容模式轉向 | 按住右鍵拖曳；放開移回後可再次拖曳 |
| 跳躍／滑行 | Space／C |
| 射擊／瞄準 | 滑鼠左鍵／右鍵 |
| 裝填 | R |
| 撿槍 | 靠近四角武器，自動替換目前的槍 |
| 選單、聲音、離開房間 | Esc |

## 武器與拾取

每次小局開始只有手槍，每人只持有目前這一把槍；撿到另一種就替換，不能累積或用數字鍵切回舊槍。下方只顯示目前的槍、彈藥和裝填進度。

| 武器 | 彈匣 | 行為 |
| --- | --- | --- |
| 手槍 | 12 | 出生武器，基礎傷害 28 |
| 散彈槍 | 6 | 準心命中且命中距離在 5 公尺內，300 傷害直接擊倒；超過 5 公尺傷害快速遞減（10 公尺約 79、15 公尺約 29），射程 30 公尺；一次射擊顯示 9 條散開的彈道 |
| 狙擊槍 | 1 | 準心方向沒有隨機偏移，全地圖距離命中均為 150 傷害，滿血需要兩槍；每發自動重新裝填 2.2 秒，期間不能開第二發 |
| 步槍 | 30 | 前 3 發準確，持續連射逐漸增加偏移；瞄準會略為收斂但仍會失準，遠處偏差更大；停止連射後恢復，準心間距反映當下偏移幅度 |

所有玩家與 Bot 的滿血為 300；手槍、步槍傷害維持原值。換彈時槍保持可見，左手進行退出／裝入彈匣、霰彈裝填或狙擊退殼與推栓，準心下方顯示目前步驟、剩餘秒數和進度條。擊殺紀錄的姓名牌採不透明的藍／紅底色。

散彈傷害採一次中央射線判定，散射線是視覺特效；不模擬或同步多顆子彈。真人射擊保留 Fusion 延遲補償與牆壁遮擋。步槍偏移使用可重演的種子，客戶端預測和房主判定一致。

四個拾取點分別位於地圖四角（X/Z ±30），兩處步槍、一處散彈、一處狙擊。散彈和狙擊每小局交換兩個對角的位置，步槍分布在另外兩角。撿走後 5 秒在原位置重生；如果已拿同款，即使缺彈也不會再次撿走或補彈。Bot 使用相同拾取規則。地圖為 80 × 80，新增四向對稱的 0.95 公尺矮牆、3.6 公尺高柱、附樓梯的 1.5 公尺側翼平台與角落入口掩體。中央另有三面 4.4 公尺高的錯位屏障：中間一面寬 14 公尺，左右各一面寬 12 公尺，保留彎折的中央通道和兩側外路，阻擋各出生位置直接看見對手。

Bot 採較寬鬆的難度，進攻積極度略高於前版：移動上限 3.8 公尺／秒，每 5 秒約有 3 秒接近敵人、2 秒停頓；敵人可見且在 17 公尺內便不繼續直衝。撿槍時每 5 秒移動 3.8 秒。看到敵人後仍約 0.8–1.1 秒才可能開火，追瞄每秒最多轉 85 度，含上下與左右瞄準誤差；狙擊 Bot 也會瞄偏，真人狙擊仍沿準心射出。Bot 每 3 秒有 1.4 秒的開火窗口，手槍／步槍／散彈／狙擊最短射擊間隔維持 0.7／0.5／1.3／2.9 秒。

## 小局與大局

- 每小局先顯示「你是 X 隊，要打敗 Y 隊」和 4 秒倒數，再開始 60 秒戰鬥。
- 頂部左右顯示紅藍雙方角色頭像與存活人數；死亡頭像僅壓灰，移除刪除線與頭像下方名字，自己的頭像以淡金色框提示。五格小局進度記錄已拿下的勝場。
- 隊伍全部陣亡即結束小局。時間到比較兩隊平均剩餘血量，相同則平手，不增加勝場。
- 陣亡玩家保持倒地，等小局結束；小局結果停留 3 秒後，全員恢復 300 生命並拿手槍，進入下一次隊伍倒數。
- 先贏 5 小局即拿下本大局，直接進入最終展示。勝隊四個角色（含這小局曾陣亡者）帶著名字登上舞台，舉手慶祝並灑彩紙。
- 展示以房主同步的 10 秒倒數自動結束，重新分配真人與 Bot 隊伍、清空小局勝場，開始下一大局。真人盡可能平均分到兩隊；每隊仍為 4 人。不累計三大局。

對戰介面改用精簡的方塊卡片：頂部集中顯示隊伍、勝場格與時間；血量與目前武器分置底部角落，移除占據整條下緣的操作列。右側擊殺紀錄最多 4 筆，各保留 6 秒並淡出；擊殺者／被擊殺者名字採各自隊伍的紅藍底色，中間顯示武器與「擊倒」。紀錄由房主在致命傷害時寫入網路環形陣列，保存當下名字、隊伍，換隊或離線不會改寫紀錄。

死亡動畫、受擊閃色／紅邊與震動、命中提示、自己與目標血量沿用。預設靜音，可從 Esc 選單開啟。

## 建置與本地執行

Unity Hub 開啟此資料夾，在 `RIVALS > Build current Web scene` 建置目前場景，產物為 `Builds/Web`。需要對應 Unity 的 Web Build Support。批次可執行 `RivalsPrototype.Editor.WebBuild.BuildCurrent`，以 `-rivalsWebOutput` 指定其他輸出目錄。`Build Web test` 會先重新產生原型場景與網路 Prefab，有手動調整時應使用前述 current 選項。

```powershell
python Tools/serve_web.py --port 8184
```

開啟 <http://localhost:8184/>，不可直接雙擊 HTML。服務只監聽本機；正式分享需把整個 Web 目錄放到支援 WebAssembly 的 HTTP(S) 主機。建置採 IL2CPP Release、Wasm RuntimeSpeed、未壓縮檔案；服務提供 WASM MIME type 和 no-store 快取設定。

連線版本為 `rivals-web-15-pointer-lock`；同玩者需載入同版。房間清單透過 Photon ClientServer lobby，預設區域 asia。真人開槍、彈藥及裝填在本機預測，槍聲／後座／彈道先顯示，傷害和比分由房主決定。網路與模擬為 60 Hz，遠端動作插值、Bot 決策分散更新、彈道採物件池。

房主離開後，其他玩家會返回大廳；目前沒有房主遷移或斷線重連。房主瀏覽器需保持運作，背景節流仍可能影響其他玩家。

## 驗證

連線生命週期、斷線恢復與 9 人競爭 8 人房間的檢查，見 [連線修正與驗證](CONNECTION_VALIDATION.md)。`Tools/WebConnectionLifecycleSmokeTest.cjs` 可驗證反覆進出房、姓名保留、設定中房主斷線、清單重連與失敗重試；`Tools/WebRoomCapacitySmokeTest.cjs` 驗證滿房競爭及空位釋出後重新加入。設定 `RIVALS_TEST_OUTPUT` 可將這些測試及 `WebNetworkSmokeTest.cjs` 的輸出存到獨立目錄。

- `Tools/PointerBridgeChecks.cjs`：獨立載入正式 HTML 的滑鼠橋接程式，涵蓋正常鎖定、Promise 拒絕、舊式錯誤、沒有回覆、API 不存在、假成功六種狀態；確認未按右鍵的移動與畫面邊緣不會自轉、右鍵拖曳可持續轉圈、放開可重新定位、失焦取消拖曳，解除限制後可重試成功，另以真正的 iframe sandbox 驗證允許／拒絕鎖定。
- `Tools/WebFocusSmokeTest.cjs`：在實際 Web 版驗證失焦／回到畫面、意外解除鎖定、一次點擊恢復、Tab、防止按鍵卡住、Esc 選單；`--before` 保存舊版控制狀態與滑鼠不一致的重現紀錄。

- `Tools/WebBalanceSmokeTest.cjs`：驗證 300 血、四角槍械配置、實際換彈步驟與瞄準穩定、撿槍／同款不重複拾取、登上新增平台，並保存換彈與紅藍擊殺底色截圖。

- `Tools/WebCameraOwnershipSmokeTest.cjs`：兩個真實 Web 玩家輪流移動與轉向，另一端保持不操作；比對本機輸入方向、實際相機角度、位置及唯一輸入權，另檢查 Bot 移動與房主離場。
- `Tools/WebSoloCameraSmokeTest.cjs`：以 1 真人、7 Bot 觀察滑鼠靜止時的實際相機方向，涵蓋 Bot 移動／射擊、玩家受傷／倒地及小局切換。`--fallback` 僅驗證瀏覽器拒絕滑鼠鎖定的情境。
- `Tools/WebInterfaceSmokeTest.cjs`：確認名字修改／隨機名稱即時更新不可編輯的房間預覽、實際建立／加入房間、近距與死亡名稱限制、雙端擊殺事件一致，並保存大廳／倒數／戰鬥／暫停畫面。

- `Tools/WebLobbySmokeTest.cjs --podium`：兩個瀏覽器以自訂名字建立／加入真實房間，驗證清單、4 對 4、真人替換 Bot、離線補位和四角拾取；持續觀察一場實際對戰至五勝舞台，再確認自動開始下一大局。
- `Tools/WebWeaponViewSmokeTest.cjs`：透過鍵盤走到角落撿步槍，驗證瞄準畫面、持續連射偏移及停火恢復，保留實際遊戲截圖。
- `Tools/WebLookSmokeTest.cjs`：透過真實大廳建房，驗證正常鎖定時連續轉圈、上下看、瞄準與 Esc／恢復；拒絕或沒有回應時，驗證相容模式反覆拖曳超過 360 度、邊緣／靜止／放開不自轉、移動射擊正常及失焦恢復。
- `Tools/WebNetworkSmokeTest.cjs`：兩個 Web 玩家從房間清單加入，驗證短按射擊、即時特效、雙端彈藥、裝填、移動與離線補 Bot。`--lag` 對測試客戶端 WebSocket 收送各增加 90 ms，不會寫入正式遊戲。
- 使用 Node.js 和 Playwright，環境變數 `RIVALS_PLAYWRIGHT_MODULE`、`RIVALS_CHROME`、`RIVALS_WEB_URL` 可指定既有套件、Chrome 和測試網址。
- Unity 編輯器批次以 `-executeMethod RivalsPrototype.Editor.BattleRulesChecks.Run -battleSmoke` 驗證真實遊戲規則；不加 `-quit`，測試完成自行退出。涵蓋 144 條出生視線遮擋、中央繞行與外側通道、散彈貼近擊倒／距離衰減、狙擊近遠距兩槍擊倒、裝填限制、步槍連射與恢復、單槍拾取、5 秒重生、等待復活、小局輪替、勝隊舞台和 10 秒後重分隊。
- `?diagnostics=1` 提供唯讀 `window.rivalsDiagnostics`；一般玩家不啟用。編輯器測試驅動程式不包含在 Web 成品。

詳細結果與限制見 `VALIDATION.md`。舊有 Windows／舊玩法腳本是歷史工具，不代表當前 Web 版已執行的測試。

## 素材與來源

本作品為非官方原型。使用 Quaternius 槍械、Kenney 素材、原創方塊角色與場地；槍聲依 Tabasco 的 CC BY 3.0 署名，中文字型 Noto Sans CJK TC 使用 SIL OFL 1.1。完整授權在 `ASSET_CREDITS.txt` 與隨 Web 產物附上的 `ThirdPartyLicenses`。

- [Photon Fusion 房間與大廳](https://doc.photonengine.com/fusion/v2/manual/connection-and-matchmaking/matchmaking)
- [Photon Fusion 玩家輸入](https://doc.photonengine.com/fusion/v2/manual/input/player-input)
- [RIVALS 官方介紹](https://www.roblox.com/games/17625359962/RIVALS)
