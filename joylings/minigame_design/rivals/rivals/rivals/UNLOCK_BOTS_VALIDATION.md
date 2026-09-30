# 解鎖武器取得方式與 Bot 分散行動驗證

日期：2026-10-01。僅建置與發布 Web，保留 Windows 歷史成品。

## 變更

- 菜刀、火箭筒、毒藥、加特林、核彈不再出現在地面拾取狀態，不生成模型或底座。對戰只保留四角兩把步槍、一把散彈與一把狙擊；換場仍維持此配置。
- 五把徽章武器維持每三個徽章解鎖、復活預設裝備新武器、倒數可選已解鎖武器、離房重置。訓練場保留自由試用選單，地面只放四種一般槍械。
- Bot 依座位分配四種接近路線；3.5 公尺內避讓隊友，重疊時向相反方向分開。目標距離相近時減少集中攻擊同一人，並降低多人搶同一拾取點的傾向。
- 反應等待由 0.8–1.1 秒改成 0.65–0.95 秒；每三秒的開火時段由 1.4 秒改成 1.6 秒；一般接敵移動由每五秒 3 秒改成 3.2 秒。射速、傷害、移動速度、轉向速度及瞄準誤差保留。
- 課程目錄新增新版玩法入口，題庫頁補上取得方式、Bot 分散行動與訓練場試用說明。

## 已完成檢查

- `LearningChecks.Run -learningSmoke`：120 項通過，含全部 15 題、每階段解鎖、答錯重問、重複與過期請求、實際倒數、選定裝備、同房保留與離房清除；另確認只有四個拾取物及四個展示底座。
- `BotNavigationChecks.Run`：四路分散、近距避讓、完全重疊分離、貼牆與矮掩體避障通過。
- `BattleRulesChecks.Run -battleSmoke`：794 項通過，含出生遮擋、通道、武器傷害／裝填／後座、一般拾取與五秒補充、死亡及上一條命輸入隔離、64 次隨機復活、30 殺勝負、舞台與下一場。此戰鬥測試將教學進度設為完成，答題門檻另由 LearningSmoke 驗證。
- `LearningMenuChecks.cjs`：72 組，含手機復活焦點恢復與離房不誤恢復；`MobileBridgeChecks.cjs`：14 項；`PointerBridgeChecks.cjs`：8 種情境，全部通過。
- 課程 H5 建置成功，303 處引用檢查通過；兩個修改頁面通過 oxlint。1280 與 390 像素畫面確認題庫與新版規則可讀、手機無水平溢出。

## 正式 Web 驗證

- 正式 Web／IL2CPP Release 建置成功，來源成品 `Builds/UnlockBots/Web`，沒有啟用測試修改介面或 Development Build。
- `WebBotDistributionSmokeTest.cjs`：90 秒實際連線觀察，7 項通過。七隻 Bot 都有開火，排除復活瞬移後各自移動約 44–128 公尺；同隊兩隻 Bot 距離小於 2 公尺的配對樣本約 0.095%。此數據只描述這次測試，不保證每場皆相同。
- `WebTrainingSmokeTest.cjs`：鍵鼠與觸控共 37 項通過，涵蓋九種武器、傷害、後座、冷卻、投擲、自傷、減速、自動復活、離線訓練及多人房間隔離。
- `WebLearningSmokeTest.cjs`：兩個真實 Photon 玩家共 26 項通過，含雙方只有四個一般拾取物、答錯重問、一次死亡一次提交、進度同步、三徽章解鎖、持刀復活及離房重置。
- 手機連線回歸發現答題後已復活但焦點仍留在隱藏對話框，已在 `learning.js` 補上倒數結束後的焦點恢復；只在可操作的前景觸控遊戲恢復，離房、暫停及勝利畫面不會搶焦點。此修正屬獨立網頁資源，正式 WebAssembly 保持不變。

- `WebMobileSmokeTest.cjs --respawn` 重測 13 項全部通過：觸控／桌面互相開房，多指移動、射擊與裝填同步，全螢幕、暫停、失焦、死亡答題、取得徽章、三秒復活自動恢復操作、沒有殘留輸入、房主離場與操作模式切換。

## 正式包

- 版本 `rivals-web-25-unlock-bots`；來源提交 `e406da6`，包內另記錄各來源檔案的 SHA-256。
- Web ZIP：30,260,360 bytes、24 個檔案；CRC 與逐檔 SHA-256 校驗通過。
- ZIP SHA-256：`a8299efd455ebee9bfe017280addfc95b3c2e7fa05a06843d159fe7532b8c590`。
- 發布資料夾逐檔與正式包一致；Windows 成品及原有 manifest 項目不變。公開站保留舊雜湊資源，避免快取中的舊入口發生資源遺失。

## 公開發布

- `master` 正式成品提交 `ce460d8`；`gh-pages` 發布提交 `58ef357`，兩者均已推送。
- GitHub Pages 發布流程 [36782736272](https://github.com/scozirge/a-thought/actions/runs/36782736272) 成功。
- `WebPublishedReleaseSmokeTest.cjs` 公開站 11 項全部通過：新版 metadata、真實開房及七隻 Bot、僅四個一般武器拾取點、新房進度歸零、15 題、武器與 Bot 說明、最新遊戲連結、展開答案、手機窄版、目錄入口及無腳本例外。
- 正式遊戲：https://scozirge.github.io/a-thought/rivals/?v=unlock-bots-20261001
- 更新教學：https://scozirge.github.io/a-thought/hatchbeasts/classroom/red-blue-battle/#game-updates

手機測試使用 Chrome 觸控模擬，不等同實體 Android／iPhone 測試。
