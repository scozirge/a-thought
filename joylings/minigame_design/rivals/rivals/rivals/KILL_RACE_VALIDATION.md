# 30 擊殺與三秒復活驗證（2026-09-24）

## 規則與實作

- 取消五小局勝制、60 秒小局計時及全隊陣亡結算，改為紅／藍隊先累積 30 次敵隊擊殺獲勝。真人與 Bot 使用相同規則。
- 致命傷害由房主集中處理：一次死亡只產生一次擊殺紀錄及一分，同隊不受傷。第 30 分立即停止傷害、計分及復活，展示勝隊四人，10 秒後清空比分、重新分隊並開始下一場。
- 死亡時由房主建立 3 秒 TickTimer；60 Hz 下是 180 個 tick。畫面倒數限制在 0–3 秒，避免浮點數 `3.00000024` 向上取整後顯示 4 秒。
- 到期後隨機選擇地圖內可站立的位置，檢查地面、牆壁、存活角色與武器拾取點；距離死亡位置至少 5 公尺，優先距離敵人至少 8 公尺。無有效位置時稍後重試，避免未檢查的固定點復活。
- 每次復活恢復 300 HP、12 發手槍，清除裝填、滑行、後座及死亡姿態，面向中央。房主同步出生位置及生命序號；模擬丟棄上一條命遲到的輸入。按鍵次數也以每條命重新計算，避免新生命初始化吞掉第一發短按。
- 死亡期間保留已取得的滑鼠鎖定，但停用角色操作；Esc、失焦及選單仍按原規則處理。真人／Bot 補位保留剩餘復活時間與死亡計分狀態。
- 頂部分數改為各隊「擊殺數 / 30」，並更新大廳規則、開場提示、死亡倒數及勝利畫面。
- 網路版本為 `rivals-web-16-kill-race`，避免新舊網路欄位混用。同玩者需重新載入相同版本。

## Unity 規則整合測試

Unity 6000.3.11f1 的 `BattleRulesChecks.Run -battleSmoke` 最終版已通過，紀錄為 `Logs/kill-race-editor-final.log`：

- `RIVALS_BATTLE_RULES_OK`
- `RIVALS_RESPAWN_TIMER seconds=3.00000024 ticks=180`
- `RIVALS_KILL_RACE_OK target=30 respawn=3 randomSamples=64`
- `RIVALS_BATTLE_SMOKE_OK`

測試涵蓋：5 殺不結束、重複致命傷不重複加分、同隊傷害、死亡座位補位狀態、真人與 Bot 滿三秒復活、64 次安全隨機位置、復活裝備與姿態、上一條命延遲輸入、復活後首發短按、過期戰鬥計時不結束、全隊陣亡後繼續、紅藍各自第 30 殺、結算後禁止傷害與復活、勝隊舞台及下一場清零。原有地圖通行／遮擋、武器傷害、換彈、拾取及 Bot 行為亦通過。

舞台截圖：`Logs/kill-race-podium-editor.png`。編輯器專用測試驅動不包含在 Web 成品中。

## Web 實際連線測試

最終成品的 `WebKillRaceSmokeTest.cjs` 已通過：觀察 **10 次復活（2 真人、8 Bot）與 18 個兩端共有的生命狀態**，兩端出生位置及方向完全一致。最後比分為 3 : 8 且仍在戰鬥；真人倒數時停用操作並保留滑鼠鎖定，復活後恢復 300 HP／12 發手槍、視角與操作，第一下短按開火也由房主接受。沒有未處理 JavaScript 或 Unity 遊戲例外。紀錄為 `Logs/KillRace/kill-race-web-check.json`，比分板、倒數與復活截圖位於同目錄且已檢視。

這次 Web 回歸觀察實際連線及多次死亡復活，未等待瀏覽器自然交戰到第 30 殺；兩隊第 30 殺即時結算、10 秒後下一場等完整勝負流程由上述 Unity 整合測試驗證。

第一輪雙 Web 測試已通過，觀察 14 次真人／Bot 復活、22 個兩端共有的生命狀態，兩端出生位置與方向完全一致。當次結束比分為 6 : 8，沒有 JavaScript 或 Unity 遊戲例外。另確認死亡停用操作但保留滑鼠鎖定，復活自動恢復操作；截圖已檢視。紀錄為 `Logs/KillRace/kill-race-web-check-first.json`。

同一版的額外延遲測試（WebSocket 收送各增加 90 ms）發現初次取得操作時曾顯示一發本機特效，但房主未接受該發；原因是新生命第一筆輸入直接消耗短按計數。已改用每條命的輸入計數並拒絕舊生命封包，另在編輯器加入「按下封包遺失、只收到計數仍接受首發」回歸。首輪失敗紀錄保留於 `Logs/KillRace/network-web-lag-check-first.json`。

最終成品的 `WebNetworkSmokeTest.cjs --lag` 已通過：8 次短按皆同步，包含進場點擊共 9 發／9 次特效；最慢本機回饋 13.4 ms，實測 RTT 390 ms。換彈、移動、停止後收斂及離線補 Bot 均正常；停止後位置誤差約 0.000124 單位。沒有未處理 JavaScript 或 Unity 遊戲例外。紀錄為 `Logs/KillRace/network-web-lag-check.json`。

`Tools/WebKillRaceSmokeTest.cjs` 使用兩個 Chrome 玩家、真實 Photon 房間、一般鍵鼠輸入與唯讀診斷。檢查兩端比分、真人及 Bot 的復活倒數、出生位置及方向同步、死亡畫面與本機相機。加 `--complete-game` 可持續觀察完整 30 殺至下一場。

相機測試的首次最終版執行在「已復活」的第一筆診斷資料中遇到角度不一致；診斷在 `Update` 讀取，攝影機在 Fusion `Render` 才更新，因此改為等待後續渲染樣本並限制在 1.5 秒內恢復。此次僅修正測試取樣，沒有更動已建置的遊戲程式；原紀錄保留於 `Logs/KillRace/kill-race-web-check-camera-sampling.json`。

## 建置與交付

Web 專用輸出目錄為 `Builds/WebKillRace`，最終建置紀錄為 `Logs/kill-race-web-build-final.log`。本次不覆寫其他工作中的 Web 輸出目錄。

最終建置成功、Unity 退出碼 0，包含 `RIVALS_WEB_BUILD_OK`。已比對建置開始時的程式、瀏覽器橋接與 HTML 來源 SHA256，確認完成後無來源變動。下載包 `Builds/RIVALS-Web-30kills.zip` 為 30,132,726 bytes、18 個檔案，逐檔 SHA256 與輸出目錄一致。HTTP HTML／WASM 均為 200、no-store；WASM MIME 為 `application/wasm`，SHA256 為 `5ae81f50ba4125bae0a81b1d936bddcde179d2dee9660fdfed9f99e1c9b84ce5`。交付驗證紀錄為 `Logs/KillRace/kill-race-artifact-check.json`。

```powershell
python Tools/serve_web.py --directory Builds/WebKillRace --port 8186
```

本機測試網址為 <http://127.0.0.1:8186/>。本文件的測試不代表正式公開網站已更新，也不涵蓋跨裝置／長時間連線或房主遷移。
