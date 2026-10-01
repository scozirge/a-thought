# Web 最終整理與發布驗證

日期：2026-10-01。發布批次 `final-web-20261001`；連線版本 `rivals-web-25-unlock-bots`；答題介面 `simple-quiz-20261001`。

## 整理範圍

- 保留精簡答題介面：題目與選項、簡短結果、倒數與已解鎖武器。徽章在背景累積，每三題解鎖；不重新加入多餘的標題與規則。
- 統一課程及下載包的最新遊戲入口，課程補上精簡介面說明；移除下載包說明的重複句。
- 新增 `Tools/ValidateWebRelease.cjs`，分成介面、連線、實際遊玩及公開站四組，依序執行並保存各測試的輸出與總表。
- 相機隔離測試的相容模式改用右鍵拖曳，符合正式遊戲操作。原測試只移動滑鼠，無法讓相容模式角色轉向；修正測試後保留原有「確實轉向」及「不可影響另一位玩家」斷言。
- 公開站首次下載與進房分開計時，載入等待預設 180 秒，可由 `RIVALS_STARTUP_TIMEOUT_MS` 調整；另記錄資源下載耗時及失敗時的畫面與狀態。一般進房與玩法斷言維持原限制。
- 91 個正式來源檔的 SHA-256 與既有正式包全數相同。本次未修改戰鬥程式及遊戲介面，沿用已建置的 Release WebAssembly，重新驗證及包裝；未建置 Windows。

## 本次重新執行的檢查

| 項目 | 結果及範圍 |
| --- | --- |
| Unity 教學整合 | 120 項通過；全部 15 題、五階段解鎖、錯題重出、重複及過期請求、倒數選武器、同房保留與離房重置、四個一般武器拾取點及底座。題庫與 Bot 避障／分散路線靜態檢查也通過。 |
| Unity 戰鬥整合 | 794 項通過；出生點遮擋、傷害／裝填／後座、武器拾取、64 次隨機復活、輸入隔離、30 殺勝負、頒獎與下一場。戰鬥測試先完成教學進度，教學限制由前一組獨立驗證。 |
| 答題介面 | 72 組通過；四種尺寸、全部題目、結果與繼續、復活武器選擇及觸控焦點恢復。 |
| 訓練場選單 | Chromium／WebKit 共 12 種尺寸情境通過，九種武器均可點選。 |
| 觸控與版面 | 14 項輸入檢查、Chromium／WebKit 共 14 種安全邊距／橫直向版面通過。 |
| 滑鼠相容性 | 8 種 Pointer Lock 情境通過，包括拒絕、無回應與 iframe；雙人相機隔離在自由轉向及右鍵拖曳兩種模式各 3 項通過。 |
| 雙人網路同步 | 一般及雙向各加 90 ms 延遲皆通過；八次射擊不重複、換彈一致、移動後收斂、無跳躍／滑行、離房補 Bot。 |
| 連線生命週期 | 13 項通過；重複離房／加入、設定畫面中房主離開、大廳斷線重連、反覆整理不殘留連線、連線失敗後重試。 |
| 四人連線恢復 | 8 項通過；三人同時加入、2.5 秒停傳後恢復、客戶斷線重入、房主無回應後返回大廳、重新開房、同名房間隔離及過期加入按鈕。 |
| 八人滿房競爭 | 九個獨立瀏覽器工作階段爭取八人房；最多八人且座位唯一，第九人留在可操作大廳，滿房按鈕停用，空位釋出後可加入。 |
| 訓練場實際遊玩 | 鍵鼠及觸控共 37 項通過；九把武器、傷害與固定靶復活、菜刀揮砍／飛刀、火箭冷卻、毒區實際減速、核彈、自動復活、離線訓練及多人房間隔離。 |
| 真實連線答題 | 26 項通過；兩位 Photon 玩家確認錯題重問、一次死亡只收一次答案、房主進度同步、第三徽章預設菜刀、實際持刀復活及離房歸零。 |
| 手機延遲與復活 | 雙向各加 90 ms 延遲，13 項通過；桌機與手機互相開房、多指同時移動／轉向／射擊、瞄準切換、裝填、全螢幕、暫停及失焦、死亡清除觸碰、答題及三秒復活自動恢復操作。最慢觸控射擊回饋約 63.2 ms。 |
| Bot 持續觀察 | 90 秒實際對戰，7 項通過；七隻 Bot 均移動及開火，排除復活瞬移後移動約 43–122 公尺，同隊距離小於 2 公尺的配對樣本約 0.094%。全程僅四個一般槍械拾取點，沒有徽章武器。 |
| 課程 | H5 建置成功，303 處引用檢查及兩個修改檔案的 oxlint 通過；題庫與遊戲內容相同。 |

一般雙人連線實測 RTT 約 192 ms，加入延遲後約 407 ms；本機射擊回饋最慢約 13.6 ms。停止移動後雙方位置差均小於 0.001 公尺。四人測試停傳共攔截 210 個傳輸事件，恢復後位置差約 0.00036 公尺；房主無回應時，三位訪客約 5.1 秒返回大廳。以上為本次樣本，並非對所有網路的速度保證。

紀錄位於忽略提交的 `Logs/FinalQA/`；包含 Unity 日誌、JSON 結果、控制台輸出及畫面。手機以 Chrome 觸控模擬測試，WebKit 只測網頁選單與版面，未以實體 Android／iPhone 或 Safari 執行完整 Unity 遊戲。

## 重跑方式

先在專案根目錄執行 `python Tools/serve_web.py --port 8188 --directory Builds/Release-20260924-Mobile/Web`，再另開終端執行：

```powershell
$env:RIVALS_WEB_URL = 'http://127.0.0.1:8188/'
$env:RIVALS_TEST_OUTPUT = 'Logs/FinalQA'
# 如未安裝在預設位置，設定 RIVALS_PLAYWRIGHT_MODULE 與 RIVALS_CHROME。
node Tools/ValidateWebRelease.cjs interface network play
```

需要 Node.js、Playwright、Chromium 與 WebKit。測試真的連線至 Photon，會建立暫時房間；每項結束關閉測試瀏覽器。請勿同時啟動另一組大量 WebGL 工作階段，以免測量受資源競爭影響。

Unity 編輯器整合檢查分別使用 `RivalsPrototype.Editor.LearningChecks.Run -learningSmoke` 與 `RivalsPrototype.Editor.BattleRulesChecks.Run -battleSmoke`；兩者使用 `-batchmode`，由測試自行結束，不加 `-quit`，同一專案依序執行。

發布後清除或改設 `RIVALS_WEB_URL`，執行 `node Tools/ValidateWebRelease.cjs public`，驗證公開遊戲、課程入口與實際雙人延遲連線。

## 正式包與發布

- 全部本機驗證通過後封裝，來源提交 `56400f1`。
- Web ZIP：30,259,869 bytes、24 個檔案，CRC 及逐檔 SHA-256 全數通過。
- ZIP SHA-256：`dc25aa3055157e34860fff9cc02f0a8626d6c9a5afebc2a80aae5a190253472b`。
- 發布資料夾逐檔與正式包一致；課程 78 個輸出檔已逐檔核對。保留公開站舊雜湊資源，避免舊入口快取找不到檔案。
- Windows 成品與原有 manifest 項目不變。

- `master` 正式包提交 `7785936`；`gh-pages` 網站提交 `bab4d38`，皆已推送。
- GitHub Pages [發布流程 36807529906](https://github.com/scozirge/a-thought/actions/runs/36807529906) 成功。
- 公開遊戲與課程 15 項通過：正確發布批次、精簡答題介面、實際開房與七隻 Bot、僅四個一般拾取點、新房進度歸零、完整 15 題、答案展開、手機窄版、教學入口及無腳本例外。
- 首次公開載入的 90 秒檢查及雙人測試的 120 秒載入門檻曾超時；增加下載紀錄後確認資料檔 24.6 MB 約 76 秒下載完成、程式檔 51.0 MB 約 143 秒完成，之後正常進入大廳與房間。兩檔並行下載，不能將兩個時間相加。這是本次網路樣本，首次開啟需等待下載進度，不等同實際進房延遲。

- 公開站雙人延遲測試重跑通過。兩個全新瀏覽器分別約 97.3 秒及 119.8 秒完成載入；雙向各加 90 ms，實測 RTT 約 390 ms。八次射擊無重複／遺漏，回饋最慢 15.7 ms，換彈、移動與離房補 Bot 正常，停止後雙方位置差約 0.00019 公尺。沒有瀏覽器或遊戲例外。
- 公開站結果：`Logs/FinalQA/PublicRetry/public/WebPublishedReleaseSmokeTest/results.json`；最後雙人結果：`Logs/FinalQA/PublicNetwork/network-web-lag-check.json`。保留早期超時紀錄，未以失敗結果當作通過。
- 正式遊戲：[紅藍槍戰](https://scozirge.github.io/a-thought/rivals/?v=final-web-20261001)；[課程目錄](https://scozirge.github.io/a-thought/hatchbeasts/classroom/)與[課程題庫](https://scozirge.github.io/a-thought/hatchbeasts/classroom/red-blue-battle/#weapon-challenges)。
