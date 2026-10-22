# 1.1.7 共用圖示更新

本輪重畫無際戰場、頂尖對決、收藏、設定、教學、離開、返回、星幣八個圖示。使用香檳金、圓角筆畫與少量實心細節；大廳、頁首及戰場共用圖集。保留原按鈕事件、手機點擊範圍、版面定位與遊戲規則。

設計來源及小尺寸預覽位於 `design/icons-v2/`。八個圖示共用一張 1024 × 512 RGBA 圖集，來源 PNG 為 44,085 bytes；遊戲不載入展示頁卡片。`screens/icons-overview.png` 是設計預覽，其餘 `screens/` 圖檔是遊戲實際截圖。

- `windows-ui.json`：正式 Windows 執行檔完成 71 張畫面、5,088 項既有檢查，執行錯誤為 0；涵蓋五種解析度、雙語、導覽、設定、教學、配裝及戰場。
- `content-integrity.json`：470 個原媒體／動畫／Shader、548 個 prefab、95 個技能資料及 20 個已核准美術替換比對通過。
- `web-viewport.json`：Chromium／WebKit 外框驗證通過，涵蓋方向 API 拒絕、旋轉與可視區變化。這項測試使用 Unity stub，不能當作完整 WebKit 遊戲驗證。
- `windows-package.json`：Windows ZIP 共 187 個檔案，封裝 CRC 驗證通過，記錄大小與 SHA-256。
- `build-checks.json`：Unity 6000.3.11f1 正式 Windows／WebGL 建置、資源與協定檢查通過。
- `web-mobile-chromium.json`：實際執行 WebGL，完成 55 組版面與操作；四種橫向尺寸、44 CSS 像素點擊區、搖桿、多指、取消觸控、旋轉、安全區及結算排版均通過，執行錯誤為 0。
- `web-desktop.json`：兩個真實瀏覽器進入同一 Photon 房間，滑鼠實際位移、技能懸停、配裝保存及超過 43 秒持續連線通過，執行錯誤為 0。起終點保存在 `mouseMovement`。
- `protected-content.json`、`original-intro.json`：比對上一版受保護檔案及原始雙星開場資料，均無變更。
- `build-identity.json`：首載 32,889,113 bytes，比 1.1.6 增加 19,694 bytes；722 個其他發布檔案雜湊不變，保留舊內容雜湊檔供快取頁面載入。

手機瀏覽器測試為裝置模擬，不代表 iPhone／Android 實機通過；結算排版使用既有零獎勵測試 fixture，並非完整對戰結算驗證。

`web-desktop-first-attempt.json` 與 `web-desktop-first-state.json` 保留首次桌機測試：兩個玩家已進入相同 Photon 房間，但固定等待 700 ms 後的位移斷言失敗；最後快照仍存活、連線且輸入未被介面阻擋。工具改成最多等待 8 秒觀察實際向右位移並記錄起終點，仍要求超過同一個距離門檻，沒有略過移動檢查或修改遊戲輸入。
