# 紅藍槍戰｜RIVALS Web 連線原型

## 武器邏輯挑戰（2026-10-01）

- 電腦正式版：修正延遲校正時重複播放射擊效果，以及切換全螢幕後未恢復滑鼠操作；鍵鼠、連線、答題及武器驗證見 [電腦正式版驗證](DESKTOP_RELEASE_VALIDATION.md)。
- 正式教學版：`rivals-web-27-shot-feedback`，介面 `star-progress-20261001`，發布批次 `desktop-release-20261001`。[玩遊戲](https://scozirge.github.io/a-thought/rivals/?v=desktop-release-20261001)。
- 答題提示與三顆星：[介面與連線驗證](STAR_PROGRESS_VALIDATION.md)。每答對一題填滿一顆星，三顆全滿顯示解鎖的新武器。
- 載入加速：[CDN 與備援驗證](STARTUP_OPTIMIZATION_VALIDATION.md)。大型檔案經 SHA-256 驗證後載入，失敗或八秒無進度時改用原站，保留原有快取與相同遊戲內容。
- 復活武器調整：[預設與倒數選擇驗證](RESPAWN_DEFAULT_VALIDATION.md)。每次死亡重新預選最近解鎖的武器，手動改選只套用當次復活。
- 前次下載最佳化：[無損壓縮與快取驗證](DOWNLOAD_OPTIMIZATION_VALIDATION.md)。正式站首次遊戲資源傳輸由 30.42 MB 降至 23.71 MB（約 22%），重新整理可重用程式與資料快取。該次純壓縮更新的解壓後程式與資源和當時上一版完全相同，83 項遊玩檢查、新舊版互連及公開站驗證皆通過。
- 最終整理與廣泛測試：[Web 發布驗證](FINAL_WEB_VALIDATION.md)，涵蓋八人容量、延遲、斷線恢復、鍵鼠／觸控、答題與武器；可用 `Tools/ValidateWebRelease.cjs` 分組重跑。
- 本次更新：[解鎖武器與 Bot 分散行動驗證](UNLOCK_BOTS_VALIDATION.md)，包含正式連線、手機答題復活與課程更新。
- 每次死亡只出一題，固定順序；答對拿一個徽章，答錯不扣徽章，下次仍出原題。
- 每輪三個徽章解鎖下一把：手槍題 → 菜刀 → 火箭筒 → 毒藥 → 加特林 → 核彈。題目下方有一句解鎖提示；答對後顯示三顆星，每題填滿一顆，集滿即顯示解鎖的新武器。
- 答題視窗不放離房、挑戰名稱、徽章門檻與重複規則；題目下方有簡短提示；答對後顯示本輪三顆星進度，集滿顯示新武器，並保留一句說明及「繼續」，倒數只顯示剩餘秒數與已解鎖武器。
- 每次死亡與同房下一場，預設拿最近解鎖的武器；尚未解鎖時拿手槍。倒數可改選手槍或其他已解鎖武器，只影響當次復活；場地撿到的步槍、散彈槍、狙擊槍不列入復活選單，也不改變預設。
- 核彈解鎖後不再出題；同房下一場保留進度，離開／斷線返回大廳後清除。
- 房主判定答案與解鎖，每個生命最多接受一次答案，過期或重複請求不能增加徽章。五款徽章武器不放置於場地，僅在解鎖後由復活選單取得；一般槍械拾取保留。
- 訓練場保留全部武器自由試用，不出題、不計徽章。Bot 不參加答題。
- [課程入口與題庫](https://scozirge.github.io/a-thought/hatchbeasts/classroom/weapon-logic/#weapon-challenges)。[定稿文件](../../../hatchbeasts/docs/紅藍槍戰-武器邏輯題庫.md)。[教學功能驗證](LEARNING_VALIDATION.md)。
- 題庫來源為課程目錄的 `weapon-questions.json`；Unity 使用相同內容的 `Assets/Rivals/Resources/WeaponQuestions.json`。`Tools/LearningMenuChecks.cjs` 會核對兩份內容一致。

Unity 6000.3.11f1 / URP / Photon Fusion 2.1.2 stable 2279。依最新發布範圍，目前只製作、測試與發布 Web 網頁版。

公開遊戲：[紅藍槍戰](https://scozirge.github.io/a-thought/rivals/?v=desktop-release-20261001)。課堂教材：[第三次課程｜武器邏輯](https://scozirge.github.io/a-thought/hatchbeasts/classroom/weapon-logic/)。

正式輸出已隨程式碼一同納入 `master`，可直接下載完整主程式：

- [Windows x64 歷史版本 ZIP](https://github.com/scozirge/a-thought/raw/refs/heads/master/joylings/minigame_design/rivals/rivals/rivals/Builds/RIVALS-Windows-x64-20260924-mobile.zip)：保留上次新武器版（`rivals-web-19-arsenal`），不包含訓練場，也不能加入目前網頁版的房間。
- [Web 正式 ZIP](https://github.com/scozirge/a-thought/raw/refs/heads/master/joylings/minigame_design/rivals/rivals/rivals/Builds/RIVALS-Web-20260924-mobile.zip)：含手機／鍵鼠模式，整包放到 HTTP(S) 主機即可架設。
- 展開後的 [Windows 主程式與資料](Builds/Release-20260924-Mobile/Windows/)、[Web 主程式與資源](Builds/Release-20260924-Mobile/Web/)，以及 [逐檔 SHA-256 清單](Builds/Release-20260924-Mobile/release-manifest.json) 也一併提交。

目前網頁版使用 `rivals-web-27-shot-feedback`，保留無跳躍、無滑行的設定。本次移除跳躍的驗證見 [移除跳躍與正式發布](NO_JUMP_VALIDATION.md)。介面與場地更新見 [桌面與手機視覺更新](VISUAL_REFRESH_VALIDATION.md)：放大手機文字、重新排列 HUD、統一深色圓角介面，並以霧面灰藍場地及鮮明隊服改善玩家辨識度。前次操作修正見 [手機實機回饋修正](MOBILE_TOUCH_FIX_VALIDATION.md)；首次整包上傳紀錄見 [完整主程式上傳驗證](BINARY_RELEASE_VALIDATION.md)。

GitHub Pages 使用 `gh-pages` 分支根目錄。手機操作版成品位於 `Builds/Release-20260924-Mobile/Web/`，完整發布到 `rivals/`，保留 `Build/`、`ASSET_CREDITS.txt` 與 `ThirdPartyLicenses/`。下載檔名保留原路徑，內容會更新，實際來源提交與版本以包內 `版本資訊.json` 為準。提供全部九種武器的單人訓練場，本次將菜刀近砍判定距離從 2.5 加倍至 5 公尺，刀身以握柄為中心放大 25%，保留右上至左下斜劈；實測見 [菜刀距離與尺寸驗證](CLEAVER_REACH_VALIDATION.md)。火箭保留前次增加 30% 的爆炸範圍。

對外測試可直接分享上方公開遊戲網址。電腦可使用 Chrome／Edge，手機在大廳選「手機觸控」，建議橫向遊玩。由一人建立房間，其他人在即時清單按「加入房間」；手機與鍵鼠共用房間，同房最多 8 位真人，不足由 Bot 補齊。首次載入需下載遊戲資源，較慢網路可能需要數分鐘，請等進度完成。若看不到操作方式選擇，請重新整理；電腦可按 `Ctrl + Shift + R`，所有人載入新版後再一起開房。

## 手機移動與橫向（2026-10-01）

完整紀錄：[手機移動與橫向操作驗證](MOBILE_MOVEMENT_VALIDATION.md)。

手機左下方可直接按住拖曳，搖桿以手指落點為中心；網址列高度變動與另一根手指取消不會中斷移動。按「橫向全螢幕」會在支援的瀏覽器要求橫向。若整個網頁仍直向，請解除手機方向鎖定；不支援方向 API 的瀏覽器仍可放大並隨實際畫面尺寸調整。

## 開始玩

大廳可選「鍵盤滑鼠」或「手機觸控」，瀏覽器會記住選擇；首次進入會依觸控能力選擇預設模式。回到大廳後可隨時切換。兩種模式都能按右上角「全螢幕」放大，再按「退出全螢幕」返回。若瀏覽器不提供或拒絕原生全螢幕，改為填滿可用視窗，按「退出放大」返回；此時瀏覽器網址列可能仍會保留。

手機左側搖桿移動，右側空白區滑動轉向；右側有射擊、瞄準與裝填，搖桿旁有衝刺。**瞄準點一下開啟、再點一下關閉**，按鈕顯示「瞄準中」時可放開手指，接著射擊、移動與轉向。按住射擊也能滑動轉向。觸控按鈕依手機安全邊距整組排列，避免橫向時重疊。

手機已移除中央操作提示，失焦返回後直接觸碰操作區即可繼續。右上角「選單」可暫停自己的操作、切換聲音或回到大廳；房間對戰會繼續。失焦、開選單、死亡或切換全螢幕都會清除舊觸碰及瞄準狀態。**Web 與 Windows 都已移除跳躍與滑行**，鍵盤 Space 與 C 鍵不再觸發動作；鍵鼠仍維持按住滑鼠右鍵瞄準、放開取消。修正與驗證見 [觸控操作修正](MOBILE_TOUCH_FIX_VALIDATION.md)。

網頁先顯示房間大廳。預設從 100 個簡短的中文動物名字挑一個，也能自行輸入最多 10 字的名字。房間名稱固定為「房主名字的房間」，修改名字或抽取新名字時立即更新預覽，不能單獨輸入房間名稱。按「建立房間」開始，或在即時房間清單選一間按「加入房間」。同名房主的房間使用不同連線識別碼，仍能分別建立。清單顯示真人數與是否已滿；房間容量為 8 位真人，Bot 不占連線名額。

對戰時會持續顯示自己的名字與紅／藍隊別：電腦寬螢幕放在左上角，手機與較窄視窗整合在上方計分區。開場倒數會顯示本人名字，死亡等待復活、暫停與賽後畫面也保留身分名牌。名字取自本機實際控制的角色，重新分隊後同步更新；最多 10 字的名字會依空間調整字級。

進房後固定 4 對 4，空位由 Bot 補齊。真人加入會接替 Bot，優先挑選仍存活的座位；接替時保留原座位的血量、位置、武器與剩餘復活倒數，避免離線／重加入跳過等待。真人離線也由 Bot 接手原狀態。真人、Bot 都有名字；活著、沒有被牆壁遮住且距離小於 14 公尺的角色才顯示小型頭頂名字，11–14 公尺逐漸淡出，陣亡後隱藏。

進入開場倒數就顯示中央準心。鍵鼠模式開打後點「開始操作」取得瀏覽器滑鼠鎖定，使用 `movementX/movementY` 相對位移，可連續轉任意圈。鎖定時隱藏游標，按 Esc 或失焦時恢復游標、清除輸入並停止操作；重新點擊後才恢復。

若內嵌瀏覽器拒絕 Pointer Lock、API 不存在，或 1.5 秒內沒有實際取得鎖定，會自動切換相容操作，不再用錯誤視窗擋住遊戲：按住右鍵拖曳轉向，放開後把滑鼠移回，再次拖曳即可繼續轉身。右鍵仍會瞄準，左鍵射擊、WASD 移動照常。只有按住右鍵拖曳期間才隱藏游標；滑鼠停止、放開或失焦後不會自轉。右鍵拖曳使用每次按下建立的新座標起點，並以 pointer capture 接收畫面外的放開事件；不使用邊緣自轉或 Q／E 模擬轉向。

相容模式的單次拖曳仍受螢幕邊界限制，需放開重新拖曳；要一般 FPS 的連續自由轉向，請在獨立 Chrome／Edge 開啟，再點畫面或「切換自由轉向」。網站無法自行修改外層 iframe 的 sandbox 權限；自行架設嵌入頁需允許 `allow-pointer-lock`。參考 [MDN Pointer Lock](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API)。

鎖定請求在瀏覽器點擊事件直接執行，以實際 `pointerlockchange` 為準；相容操作期間不會每次開槍都重試鎖定。Unity 的 `WebGLInput.stickyCursorLock` 設為 false，避免保留過期狀態。全螢幕按鈕直接使用該次點擊授權；鍵鼠切換全螢幕後，點遊戲畫面即可重新取得操作。Unity 大檔案使用內容雜湊檔名及 immutable 快取；內容改變會產生新檔名，單純改介面不會讓整包遊戲重新下載。

| 操作 | 按鍵 |
| --- | --- |
| 移動／衝刺 | WASD／Shift |
| 自由轉向 | 點擊取得滑鼠鎖定後，移動滑鼠 |
| 相容模式轉向 | 按住右鍵拖曳；放開移回後可再次拖曳 |
| 攻擊／瞄準 | 滑鼠左鍵／右鍵；菜刀的右鍵為單次飛刀 |
| 裝填 | R |
| 撿武器 | 靠近地圖上的武器，自動替換目前武器 |
| 選單、聲音、離開房間 | Esc |

## 武器與拾取

初次進房拿手槍，之後復活拿答題解鎖或倒數時選定的武器；每人只持有目前這一把武器。撿到另一種就替換，不能累積或用數字鍵切回舊武器。五款特殊武器不會出現在地面拾取點。下方顯示目前武器、彈藥／冷卻和裝填進度。手機拿菜刀時「瞄準」改為「飛刀」，火箭、核彈與毒液會隱藏不適用的瞄準／裝填鍵。

| 武器 | 彈匣 | 行為 |
| --- | --- | --- |
| 手槍 | 12 | 出生武器，基礎傷害 28 |
| 散彈槍 | 6 | 準心命中且命中距離在 5 公尺內，300 傷害直接擊倒；超過 5 公尺傷害快速遞減（10 公尺約 79、15 公尺約 29），射程 30 公尺；一次射擊顯示 9 條散開的彈道 |
| 狙擊槍 | 1 | 準心方向沒有隨機偏移，全地圖身體命中為 150 傷害，爆頭為 300 傷害、滿血一槍擊倒；每發自動重新裝填 2.2 秒，期間不能開第二發 |
| 步槍 | 30 | 前 3 發準確，持續連射逐漸增加偏移；瞄準會略為收斂但仍會失準，遠處偏差更大；停止連射後恢復，準心間距反映當下偏移幅度 |
| 加特林 | 100 | 每 0.06 秒一發、每發 24 傷害、換彈 12 秒；六管旋轉，連射與移動增加散射，遠距離偏移明顯 |
| 無限火箭 | 無限 | 點按才發射，最快每 4 秒一發，不換彈；按住不連發、冷卻點擊不排隊；降低發射力道、縮短拋物線射程，直擊 300，爆心 3.9 公尺內 150、最外 7.8 公尺內 100（兩層半徑增加 30%），牆壁阻擋爆風，附爆炸特效 |
| 核彈 | 單次 | 對地面紅外線標記後立即拿回手槍；半徑 14 公尺紅圈閃爍，7 秒後落彈爆炸，圈內所有人死亡，包含自己與隊友，掩體無法抵擋 |
| 菜刀 | 近砍不限次 | 持有時移動速度增加 30%；5 公尺內揮砍一刀擊倒，刀身放大 25%；0.56 秒完整抬刀至右上、向左下劈砍及下方收刀，自己及他人視角同步。右鍵／手機「飛刀」丟出後立即拿回手槍，飛刀初速由 24 提升至 32，命中同樣 300 傷害 |
| 劇毒藥水 | 無限 | 最快每 3 秒一瓶，加強投擲力道；落地形成半徑 6 公尺、持續 5 秒的綠色毒區，踩入的人每 0.5 秒扣 30 血，移速降低 40%，離開即恢復速度並停止傷害，重疊毒區不疊加緩速或扣血頻率；保留綠色毒液、氣泡和邊界，移除紫色內圈 |

火箭、核彈與毒液都會傷害自己及隊友；友軍／自己的死亡不替任一隊加分。其他槍械與菜刀只傷敵人。火箭傷害層級是互斥的，每個角色每次爆炸只取一層；所有命中、爆炸、毒區與倒數由房主判定並同步。投擲者換回手槍或離線，已發出的攻擊仍保留原姓名、隊伍及武器歸屬。

本次數值、投擲距離與操作修正見 [武器平衡驗證](WEAPON_BALANCE_VALIDATION.md)。

準心四條短線的間距直接換算實際散射角度，連射與移動時擴張、停火後收回；瞄準、螢幕大小和 FOV 都參與換算。火箭與藥水有重力、飛行時間及碰撞，中央準心只表示投擲方向，不保證落點。

所有玩家與 Bot 的滿血為 300；手槍、步槍傷害維持原值。換彈時槍保持可見，左手進行退出／裝入彈匣、霰彈裝填或狙擊退殼與推栓，準心下方顯示目前步驟、剩餘秒數和進度條。擊殺紀錄的姓名牌採不透明的藍／紅底色。

散彈傷害採一次中央射線判定，散射線是視覺特效；不模擬或同步多顆子彈。真人射擊保留 Fusion 延遲補償與牆壁遮擋。步槍偏移使用可重演的種子，客戶端預測和房主判定一致。

地圖只有 4 個拾取點：四角（X/Z ±30）的兩處步槍、一處散彈、一處狙擊；菜刀、火箭筒、毒藥、加特林及核彈不再生成地面武器或底座。散彈和狙擊每場交換兩個對角的位置。一般武器撿走後 5 秒補充；已拿同款，即使缺彈也不會再次撿走或補彈。Bot 使用相同拾取規則。地圖為 80 × 80，有四向對稱的 0.95 公尺矮牆、3.6 公尺高柱、附樓梯的 1.5 公尺側翼平台與角落入口掩體。中央三面 4.4 公尺高的錯位屏障保留彎折中央通道與兩側外路，阻擋各出生位置直接看見對手。

Bot 依座位分散到四條路線，靠近隊友時避讓；敵人距離相近時分配不同目標，也會減少搶同一個拾取點。難度仍較寬鬆，進攻積極度略高於前版：移動上限 3.8 公尺／秒，每 5 秒約有 3.2 秒接近敵人、1.8 秒停頓；敵人可見且在 17 公尺內便不繼續直衝。撿槍時每 5 秒移動 3.8 秒。看到敵人後仍約 0.65–0.95 秒才可能開火，追瞄每秒最多轉 85 度，含上下與左右瞄準誤差；狙擊 Bot 也會瞄偏，真人狙擊仍沿準心射出。Bot 每 3 秒有 1.6 秒的開火窗口，手槍／步槍／散彈／狙擊最短射擊間隔維持 0.7／0.5／1.3／2.9 秒。

## 30 擊殺獲勝與復活

- 每場先顯示隊伍與 4 秒開場倒數，再持續戰鬥；紅隊或藍隊率先累積 **30 擊殺**就獲勝。沒有小局，也不因 60 秒時間到或全隊陣亡結束戰鬥。
- 真人與 Bot 擊倒敵隊都計入同一個隊伍比分。同一次死亡只加 1 分。火箭、核彈與毒液可傷隊友，但不加分；其他武器不傷隊友。
- 真人死亡後先回答一題武器邏輯題，看完說明再開始 **3、2、1 秒復活倒數**；全部解鎖後直接倒數。期間可選手槍或已解鎖特殊武器，時間到恢復 300 生命與所選武器的滿彈匣。Bot 維持三秒自動復活。
- 房主在地圖內隨機選擇新的可站立位置，檢查牆壁與角色重疊，優先與活著的敵人保持至少 8 公尺距離；不會在武器拾取點直接出生。復活時面向場地中央。
- 真人死亡時釋放滑鼠供答題與選武器；復活後點一下繼續操作。Esc 與失焦仍會暫停操作。上一條命延遲送達的操作不會讓新角色誤移動或開槍。
- 頂部顯示兩隊各自的「擊殺數 / 30」與隊員存活頭像；自己的頭像以淡金色框提示。右側擊殺紀錄最多 4 筆，保留 6 秒並淡出。
- 第 30 殺結束對戰；同一次範圍爆炸先完成全部受害者判定，再進入勝利展示，比分上限為 30。勝隊四名角色帶著名字登台，10 秒後重新分隊並清空分數與殘留攻擊；展示期間不會復活或繼續累積比分。

血量與目前武器分置底部角落。擊殺紀錄保存擊殺當下的名字與紅藍隊伍，玩家離線或下一場換隊不會改寫歷史紀錄。

死亡動畫、受擊閃色／紅邊與震動、命中提示、自己與目標血量沿用。預設靜音，可從 Esc 選單開啟。

## 建置與本地執行

正式網頁／Windows 64 位元交付與測試見 [RELEASE_VALIDATION.md](RELEASE_VALIDATION.md)。Windows 使用 `RIVALS > Build current Windows release`，或批次執行 `RivalsPrototype.Editor.WindowsBuild.BuildCurrent -rivalsOutput Builds/WindowsRelease`。此入口直接建置目前場景，使用 `BuildOptions.None` 與 Mono，不會重新產生場景或啟用 Development Build。請完整分發 `.exe` 旁的 `Rivals_Data`、`MonoBleedingEdge`、UnityPlayer.dll 等資料與授權檔。

Unity Hub 開啟此資料夾，在 `RIVALS > Build current Web scene` 建置目前場景，產物為 `Builds/Web`。需要對應 Unity 的 Web Build Support。批次可執行 `RivalsPrototype.Editor.WebBuild.BuildCurrent`，以 `-rivalsWebOutput` 指定其他輸出目錄。`Build Web test` 會先重新產生原型場景與網路 Prefab，有手動調整時應使用前述 current 選項。

```powershell
python Tools/serve_web.py --port 8184
```

開啟 <http://localhost:8184/>，不可直接雙擊 HTML。服務只監聽本機；正式分享需把整個 Web 目錄放到 HTTP(S) 主機。建置保留 IL2CPP Release／OptimizeSpeed、Wasm RuntimeSpeed、內容雜湊檔名與 Unity Data Caching，移除啟動 Splash Screen。使用 Unity Brotli 壓縮及 Decompression Fallback，輸出 `.unityweb`，不需主機另設 `Content-Encoding: br`。Unity 載入器負責解壓，程式及資料檔皆採持續快取；禁止儲存時退回一般下載。本機服務提供 no-store HTTP 標頭，可獨立驗證 Unity 快取。前次純壓縮更新曾驗證解壓內容完全相同；目前版本包含復活武器規則調整，已重新建置與測試。

連線版本為 `rivals-web-27-shot-feedback`；同玩者需重新整理網頁，載入相同版本。本次訓練場版本與舊版分開列出房間。房間清單透過 Photon ClientServer lobby，預設區域 asia。真人開槍、彈藥及裝填在本機預測，槍聲／後座先顯示，傷害和比分由房主決定。網路與模擬為 60 Hz，遠端動作插值、Bot 決策分散更新、子彈彈道採物件池，新武器靜態造型依材質合併以減少繪製次數。

房主離開後，其他玩家會返回大廳；目前沒有房主遷移或斷線重連。房主瀏覽器需保持運作，背景節流仍可能影響其他玩家。

## 載入速度

資源與載入流程最佳化已包含在 `Builds/Release-20260924-Multiplayer/` 正式包，並已發布到公開網站；不啟用耗時的 DiskSizeLTO／IL2CPP OptimizeSize。成品、測試與公開部署紀錄見 [追加驗證](WEB_MULTIPLAYER_VALIDATION.md)。

最新發布改用無損 Brotli 與 Unity 解壓備援；對帶有 `.unityweb` 的內容雜湊檔名也使用 `immutable`，避免每次重新整理再次下載 WASM。不支援或禁止快取時仍可載入。此模式增加解壓步驟，不能同時使用原生 WASM 串流編譯；下載量及實際大廳就緒時間均另外量測，見 [下載最佳化驗證](DOWNLOAD_OPTIMIZATION_VALIDATION.md)。

中文字型使用 Rivals CJK UI 衍生版，保留原始字型全部 44,810 個 Unicode 字元與水平字寬，刪除未使用的直排與其他區域替代字形。來源放在 `Tools/Fonts`，避免被 Unity Resources 重複打包。安裝 `fonttools==4.65.0` 後執行 `python Tools/optimize_font.py` 可重新產生；授權與來源說明在 `ASSET_CREDITS.txt`。

`Tools/WebLoadSmokeTest.cjs` 以實際大廳可操作為載入終點，紀錄冷／熱載入的下載量、時間與 Unity 快取命中；`RIVALS_LOAD_MBPS=10` 可固定 10 Mbps 及 50 ms 延遲，`--expect-cache` 驗證兩個大檔案重用，`--deny-cache` 模擬禁止儲存，`--touch` 以手機觸控模式驗證。設定 `RIVALS_LOAD_LABEL`、`RIVALS_TEST_OUTPUT` 保存不同實驗；歷史量測見 `LOAD_VALIDATION.md`，本次量測見 `DOWNLOAD_OPTIMIZATION_VALIDATION.md`。

## 驗證

五款新武器的規則、64 項遊戲內檢查、真實 Web 訪客逐款武器同步、手機延遲測試與 Windows／Web 互連，見 [新武器與動態準心驗證](ARSENAL_VALIDATION.md)。

手機觸控、兩種操作模式與全螢幕的結果見 [手機操作驗證](MOBILE_CONTROLS_VALIDATION.md)。`Tools/MobileBridgeChecks.cjs` 驗證真正瀏覽器多指事件、短按、取消、全螢幕降級與直向版面；`Tools/WebMobileSmokeTest.cjs` 使用觸控與鍵鼠兩個隔離的 Web 玩家實際連線，`--lag` 增加雙向延遲，`--respawn` 由真人觸控移動接近 Bot，驗證實際死亡及三秒復活。手機瀏覽器模擬測試不等同 Android／iPhone 實機驗證。

本次規則變更與結果見 [30 擊殺與復活驗證](KILL_RACE_VALIDATION.md)。`Tools/WebKillRaceSmokeTest.cjs` 以兩個真實 Web 玩家驗證擊殺同步、真人與 Bot 的三秒倒數、隨機出生位置與本機復活畫面；加 `--complete-game` 可持續觀察至 30 擊殺及下一場。

連線生命週期、斷線恢復與 9 人競爭 8 人房間的檢查，見 [連線修正與驗證](CONNECTION_VALIDATION.md)。`Tools/WebConnectionLifecycleSmokeTest.cjs` 可驗證反覆進出房、姓名保留、設定中房主斷線、清單重連與失敗重試；`Tools/WebRoomCapacitySmokeTest.cjs` 驗證滿房競爭及空位釋出後重新加入。設定 `RIVALS_TEST_OUTPUT` 可將這些測試及 `WebNetworkSmokeTest.cjs` 的輸出存到獨立目錄。

正式 30 擊殺版的追加多人測試見 [網頁多人連線追加驗證](WEB_MULTIPLAYER_VALIDATION.md)。`Tools/WebMultiplayerRecoverySmokeTest.cjs` 使用四個隔離的 Web 玩家，涵蓋同時加入、傳輸停頓與恢復、訪客斷線補位及重加、房主無資料時離房、同名房間隔離與過期清單點擊。只在測試瀏覽器攔截 WebSocket，沒有加入遊戲狀態修改介面。

長局檢查發現並修正 Bot 貼牆時避障漏判。Unity 批次入口 `-executeMethod RivalsPrototype.Editor.BotNavigationChecks.Run` 用實測位置重現漏判，驗證沿牆與退離路徑；修正版正式成品在 `Builds/Release-20260924-Multiplayer/`，Web 與 Windows 的 ZIP 名稱皆以 `-multiplayer.zip` 結尾。

長局可另外啟動 `Tools/WebActiveParticipant.cjs`，用實際瀏覽器輸入保持參戰，避免把無人操作的 Bot 掩體僵持當成連線失敗；啟動時機與房間選擇方式見追加驗證文件。

- `Tools/PointerBridgeChecks.cjs`：獨立載入正式 HTML 的滑鼠橋接程式，涵蓋正常鎖定、Promise 拒絕、舊式錯誤、沒有回覆、API 不存在、假成功六種狀態；確認未按右鍵的移動與畫面邊緣不會自轉、右鍵拖曳可持續轉圈、放開可重新定位、失焦取消拖曳，解除限制後可重試成功，另以真正的 iframe sandbox 驗證允許／拒絕鎖定。
- `Tools/WebFocusSmokeTest.cjs`：在實際 Web 版驗證失焦／回到畫面、意外解除鎖定、一次點擊恢復、Tab、防止按鍵卡住、Esc 選單；`--before` 保存舊版控制狀態與滑鼠不一致的重現紀錄。

- `Tools/WebBalanceSmokeTest.cjs`：驗證 300 血、四角槍械配置、實際換彈步驟與瞄準穩定、撿槍／同款不重複拾取、登上新增平台，並保存換彈與紅藍擊殺底色截圖。

- `Tools/WebCameraOwnershipSmokeTest.cjs`：兩個真實 Web 玩家輪流移動與轉向，另一端保持不操作；比對本機輸入方向、實際相機角度、位置及唯一輸入權，另檢查 Bot 移動與房主離場。
- `Tools/WebSoloCameraSmokeTest.cjs`：以 1 真人、7 Bot 觀察滑鼠靜止時的實際相機方向，涵蓋 Bot 移動／射擊、玩家受傷／倒地及隨機復活。`--fallback` 僅驗證瀏覽器拒絕滑鼠鎖定的情境。
- `Tools/WebInterfaceSmokeTest.cjs`：確認名字修改／隨機名稱即時更新不可編輯的房間預覽、實際建立／加入房間、近距與死亡名稱限制、雙端擊殺事件一致，並保存大廳／倒數／戰鬥／暫停畫面。

- `Tools/WebLobbySmokeTest.cjs --podium`：兩個瀏覽器以自訂名字建立／加入真實房間，驗證清單、4 對 4、真人替換 Bot、離線補位和四角拾取；持續觀察一場實際對戰至 30 擊殺舞台，再確認自動開始下一場。
- `Tools/WebWeaponViewSmokeTest.cjs`：透過鍵盤走到角落撿步槍，驗證瞄準畫面、持續連射偏移及停火恢復，保留實際遊戲截圖。
- `Tools/WebLookSmokeTest.cjs`：透過真實大廳建房，驗證正常鎖定時連續轉圈、上下看、瞄準與 Esc／恢復；拒絕或沒有回應時，驗證相容模式反覆拖曳超過 360 度、邊緣／靜止／放開不自轉、移動射擊正常及失焦恢復。
- `Tools/WebNetworkSmokeTest.cjs`：兩個 Web 玩家從房間清單加入，驗證短按射擊、即時特效、雙端彈藥、裝填、移動與離線補 Bot。`--lag` 對測試客戶端 WebSocket 收送各增加 90 ms，不會寫入正式遊戲。
- 使用 Node.js 和 Playwright，環境變數 `RIVALS_PLAYWRIGHT_MODULE`、`RIVALS_CHROME`、`RIVALS_WEB_URL` 可指定既有套件、Chrome 和測試網址。
- Unity 編輯器批次以 `-executeMethod RivalsPrototype.Editor.BattleRulesChecks.Run -battleSmoke` 驗證真實遊戲規則；不加 `-quit`，測試完成自行退出。涵蓋 144 條出生視線遮擋、中央繞行與外側通道、散彈貼近擊倒／距離衰減、狙擊近遠距兩槍擊倒、裝填限制、步槍連射與恢復、單槍拾取、武器 5 秒重生、死亡 3 秒復活、64 次安全出生位置、上一條命輸入隔離、30 擊殺勝負、勝隊舞台和 10 秒後重分隊。
- `?diagnostics=1` 提供唯讀 `window.rivalsDiagnostics`；一般玩家不啟用。編輯器測試驅動程式不包含在 Web 成品。

詳細結果與限制見 `VALIDATION.md`。舊有 Windows／舊玩法腳本是歷史工具，不代表當前 Web 版已執行的測試。

## 素材與來源

本作品為非官方原型。使用 Quaternius 槍械、Kenney 素材、原創方塊角色與場地；槍聲依 Tabasco 的 CC BY 3.0 署名，中文字型 Noto Sans CJK TC 使用 SIL OFL 1.1。完整授權在 `ASSET_CREDITS.txt` 與隨 Web 產物附上的 `ThirdPartyLicenses`。

- [Photon Fusion 房間與大廳](https://doc.photonengine.com/fusion/v2/manual/connection-and-matchmaking/matchmaking)
- [Photon Fusion 玩家輸入](https://doc.photonengine.com/fusion/v2/manual/input/player-input)
- [RIVALS 官方介紹](https://www.roblox.com/games/17625359962/RIVALS)

## 訓練場

主選單下方按「訓練場」進入獨立的單人打靶模式，不會建立公開房間。遊戲載入後不需 Photon 連線即可練習。

- 七個固定人形靶不走動、不還擊，涵蓋近距離、遠距離與群聚目標。
- 「更換武器」可領取全部九種武器，按鈕通常在右上，小尺寸橫向手機則在下方中央；鍵鼠先按 Esc 釋放游標，手機直接點選。再次選擇同一把可補滿彈藥。射擊線後方僅保留手槍、步槍、散彈槍與狙擊槍的四個拾取站；五款徽章武器可用訓練選單試用，場地不擺放。
- 自己與目標死亡後 3 秒自動復活；靶子回原位，玩家回射擊線並補滿生命與所選武器；已使用的核彈會保留手槍，需要再次選取才可重試。
- 射速、後座散射、裝填、拋物線、核彈七秒倒數及範圍自傷與正式對戰相同。訓練場可重新領取單次武器，沒有 30 殺結束或時間限制。
- 選單可回大廳，繼續正常多人對戰。驗證紀錄見 [訓練場驗證](TRAINING_VALIDATION.md)。
