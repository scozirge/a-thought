# Neon Impact 扁平 UI 第三版提案

這是獨立的 HTML / CSS 互動設計稿，不修改 Unity、正式遊戲規則或存檔，也不連線 Photon。

- A 留白構圖：左側主操作、右側角色，細線與少量實色重點。
- B 競技面板：下方橫向操作列、直角與緊湊數值面板。
- C 柔和卡片：左側角色、右側模式卡片，平面色塊整理資訊。
- 各含大廳、戰鬥、收藏、配裝、教學、設定與結算，以及確認視窗。
- 原尺寸原型會依實際瀏覽器尺寸排版；提案首頁內的裝置比較框為縮圖。
- 角色、美術與技能圖沿用既有素材，技能名稱與說明來自原專案；收藏展示每部位前九項，共 27 項，全遊戲仍為 95 項。
- 戰鬥數字、配對與操作流程是設計展示，不代表正式遊戲已更換介面。

## 資訊與操作層級

主要模式文字電腦為 20–22 px、手機橫向為 18 px；主要通用按鈕高 60 / 48 px，模式卡片更高。教學正文 18 / 16 px；生命值 24 / 20 px。次要設定、返回與翻頁保留至少 44 px 觸控高度。低優先標籤使用 12–14 px；不把核心正文縮成標籤尺寸。

小螢幕使用重新分欄與文件捲動。戰鬥介面固定在畫面邊緣；內容頁允許垂直捲動，避免因瀏覽器工具列降低可用高度而縮小所有內容。正式遊戲的橫向提示與轉向行為不在這個原型內變更。

## 重現

1. `python prepare.py` 複製原始技能圖並輸出 `skills.js`，圖檔內容不變。
2. `python subset-fonts.py` 以提案實際文字建立 Noto Sans TC / Cinzel WOFF2 子集；原始 OFL 授權隨附。
3. 在此目錄啟動本機 HTTP 伺服器，開啟 `index.html`。
4. `prototype.html?variant=a&screen=lobby` 可直接開原尺寸介面。

公開提案：<https://scozirge.github.io/a-thought/neon-impact-design/ui-flat-v3/>

## 驗證範圍

- `verification.json` 記錄 172 個瀏覽器版面案例：Chromium 的三版 × 七畫面 × 七種尺寸、四個提案首頁尺寸，以及 WebKit 的三版 × 七畫面手機橫向檢查。
- 另在四個尺寸重查提案卡片文字裁切、三版 iframe 導覽與原尺寸連結。
- 檢查水平溢出、缺圖、操作範圍、戰鬥資訊面板相撞；實際點選收藏、配裝、確認視窗、教學與音量設定。
- 以上是桌面瀏覽器與行動尺寸模擬，不等於實體 iPhone 驗證；這次沒有變更或重建 Unity 遊戲，也沒有把 UI 原型測試當成 Photon 測試。
- `verify.cjs`、`verify-gallery.cjs`、`export-sheets.cjs` 使用 Playwright。可用 `PLAYWRIGHT_MODULE`、`CHROME_PATH`、`PREVIEW_URL` 指定本機環境；`CHECK_WEBKIT=1` 加跑 WebKit。
- 公開站只包含網頁、素材與設計圖；驗證工具與報告保留於來源專案。
