# 星際遊俠 NOVAROVE 1.1.6 驗證

工作始於 2026-10-22，2026-10-23 完成兩平台建置、本機遊戲及公開網址驗證。使用 Unity 6000.3.11f1；Windows 為 `1.1.6-fusion`，WebGL 為 `1.1.6-web`。公開入口沿用 https://scozirge.github.io/a-thought/neon-impact/ 。

## 本輪變更

- 新顯示名稱、中英文共 26 張透明標題字圖；來源為字型輪廓 SVG，可由工具重建。
- 平面午夜藍底與細金邊；兩個模式同尺寸同底色，設定、教學與離開集中在左側，返回統一圖示。
- 網頁載入完成直接播放原雙星開場。手機直向會等待橫放，旋轉不重播；聲音解鎖獨立處理。
- 移除玩家與 NPC 的常駐紅藍光暈，技能保留敵我配色。造星神維持原青金材質，胸前星與頭部排序調整，使用細青色血條。
- 生命及經驗條修正實際填充比例；小型等級放在經驗條旁。

## 實際驗證

| 範圍 | 結果與報告 |
| --- | --- |
| Windows 正式執行檔 | 71 張畫面、5,088 項檢查、0 個執行錯誤，見 `windows-ui.json`。包含五種尺寸、雙語標題、實際經驗升級餘數與血條／經驗條渲染寬度、造星神層級及材質。 |
| Chromium 完整 WebGL 手機模擬 | 55 組版面及操作，見 `web-mobile-chromium.json`。844×390、667×375、844×300、844×240；真正 CDP 觸控、搖桿移動、多指、取消、旋轉、瀏海安全區、離場與結算。 |
| 英文觸控及跨裝置對決 | 15 組流程，見 `web-touch-flows.json`。真正文字輸入及尺寸變化、英文標題字圖、配對取消、手機及桌機兩個 Photon 玩家進入同一對決房間。 |
| 桌機 WebGL | `web-desktop.json`：兩個真實 Photon 玩家、持續連線超過 43 秒、滑鼠移動與懸停、95 技能預設全開、免費配裝與重新載入保存，另執行遊戲核心回歸。 |
| 自動開場與音訊 | `web-autostart.json`：允許與禁止自動出聲都會自動進入原開場及大廳；禁止情境在點擊前確認沒有 user activation。點擊後實際取到聲音樣本，且沒有重播或重新載入。 |
| Chrome／WebKit 外框 | `web-viewport.json`：拒絕方向／全螢幕 API、反覆旋轉、僅 visualViewport 改變、Windows 觸控筆電保留滑鼠。這項測試使用 Unity stub。 |
| 原資源與開場 | `content-integrity.json`、`original-intro.json`、`protected-content.json`：470 個原媒體／動畫／Shader、548 個 prefab、95 筆技能及 20 個已核准平面替換通過雜湊比對；原雙星動畫、大廳演出資料保留。 |
| 技能配色 | `skill-palette.json`：95 技能與粒子目錄測試。造星神最終呈現另由 Windows 正式執行檔驗證。 |

手機測試是 Chromium 裝置模擬，不代表 iPhone／Android 實機或完整 Safari 遊戲已通過。結算排版採明確標示的零獎勵 fixture，沒有當作完整對戰結算測試。效能數字與本機載入時間只代表該次測試環境。

`mobile-test-attempts.json` 保留三次測試工具與流程問題：手勢落入姓名輸入框、固定時間讀取位置的假設，以及多人戰鬥中死亡後原教學仍阻擋操作。最終測試使用實際捲動手勢、等待實際位置變化並記錄起終點，且完成死亡／教學流程後才檢查操作，沒有略過對應斷言。

## 發布與交付

- `build-checks.json` 保存兩平台正式建置及資源、RPC 協定、核心檢查。
- `build-identity.json` 記錄首載 **32,869,419 bytes**，原版為 32,028,426 bytes；722 個其他發布檔案完全未變。舊雜湊版本保留供快取 HTML 使用。
- `deployment.json` 記錄 Pages 部署成功日誌：2026-10-22 16:39:02 UTC 回報成功；`public-files.json` 確認公開 HTML 與四個 Unity 載入檔的長度及 SHA-256 全部符合正式包。GitHub 官方當時標示 Actions 服務降級，jobs API 狀態回報仍落後，因此另保存實際部署成功日誌與公開檔案證據。
- `web-mobile-public.json` 已通過公開網址的 11 組觸控、旋轉、安全區與結算回歸，0 個執行錯誤；完整選單矩陣另見正式包測試。
- `windows-package.json` 保存 Windows ZIP 大小及 SHA-256，封裝工具也完成 187 個檔案的 CRC 檢查。
- `screens/` 為本版實際遊戲截圖；`guardian-original-palette.png` 使用明確建立的離線造星神 fixture 檢查外觀與層級。

公開 URL、執行檔名稱及內部存檔識別維持相容，改顯示名稱不會重設玩家資料。
