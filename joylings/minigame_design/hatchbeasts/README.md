# 破殼怪獸 Hatchbeasts

適合國小生的 H5 孵蛋小遊戲。選擇一個地方、一種休閒活動，再點擊神祕蛋 12 下，孵出對應的怪獸。

## 教學使用

[課程清單與第一課設計單](docs/課程清單.md)：60 分鐘的遊戲開發體驗，從試玩、發想到製作簡單設計文件，附 AI 整理示範與缺課銜接方式。

## 使用

需要 Node.js 22.13 以上。安裝依賴後啟動開發伺服器：

```sh
npm install
npm run dev
```

開啟終端機列出的本機網址。手機版與桌面版共用同一遊戲，支援觸控、滑鼠和鍵盤。沒有帳號、儲存或 API 需求；重新整理會重新開始。

```sh
npm run build
npm run lint
npx tsc --noEmit
npm test
```

`lint` 檢查遊戲原始碼、測試及設定檔；未修改的預裝元件庫保留原樣。

## H5 發布（GitHub Pages）

線上遊戲：https://scozirge.github.io/a-thought/hatchbeasts/

程式碼保存在 `scozirge/a-thought` 的 `master` 分支；靜態檔案放在 `gh-pages` 分支的 `hatchbeasts/`，Pages 發布來源設定為 `gh-pages` 的根目錄，根目錄保留 `.nojekyll`。

建議用 Node.js 22（版本提示見 `.nvmrc`）。Windows 的 Node.js 24.19 在 Vinext 預先渲染結束時曾觸發 libuv assertion；可直接用以下指令以 Node 22 建置：

```sh
npm ci
npx --yes --package=node@22 node scripts/build-h5.mjs
```

若已使用 Node 22，執行 `npm run build:h5` 即可。輸出為 `dist/h5/`，建置會檢查 HTML、CSS、字型及選項圖的路徑。以獨立 checkout 開啟 `gh-pages`，將這個輸出完整同步至其中的 `hatchbeasts/`，commit 後 push；不要把 `dist/server` 或 `node_modules` 放入發布分支。

預設網址前綴是 `/a-thought/hatchbeasts`，可用 `GITHUB_PAGES_BASE_PATH` 環境變數修改。原本的 `npm run build` 仍供 Sites 使用。

## 主要檔案

- `app/page.tsx`：選題、蛋冒出的入場動畫、連點搖蛋與破殼結果。孵蛋畫面只顯示「一顆怪獸蛋出現了!」及稍後閃爍的「連續點點蛋，讓裡面的小怪獸醒過來吧!」，不顯示頁首、進度條、計數或蛋殼說明。
- `app/globals.css`：怪趣手繪與蠟筆配色、全頁塗鴉紙感背景、響應式版面與減少動態效果支援。
- `lib/game.ts`：兩題資料、九種結果及遊戲狀態轉換。調整 `HATCH_TAPS` 可改變需要點擊的次數。
- `public/images/`：六張怪趣手繪選項圖（粗糙輪廓與蠟筆上色），以及滿版重複塗鴉背景；神祕洞穴使用黑紫色調。活動選項以小怪獸玩耍、奇幻遊戲機與魔法學習呈現。
- `public/fonts/`：本機提供的芫荽 Iansui 手寫字型子集與 SIL Open Font License；字型來源：[Iansui 原作者專案](https://github.com/ButTaiwan/iansui)。子集涵蓋原有遊戲文字與新增提示的「吧」，新增文案時可擴充子集。
- `public/images/nest-background.png`：孵蛋專用的蠟筆樹洞與巢穴背景，中央留白讓素色蛋成為主角；背景本身沒有蛋或文字。
- `image-prompts.json`：選項圖片的生成提示與來源紀錄，使用內建 imagegen 工具製作。

## 孵化對應

| 地方     | 遊戲／漫畫／動畫 | 跟朋友玩 | 學習     |
| -------- | ---------------- | -------- | -------- |
| 香氣花園 | 小花熊           | 香草兔   | 木妖     |
| 神祕洞穴 | 影蛇             | 回聲菇   | 記憶石獸 |
| 森林瀑布 | 瀑布精靈         | 泡泡龜   | 彩虹梟   |

孵蛋畫面使用沒有文字與紋樣的素色蛋佔位圖形；怪獸造型仍以佔位圖形標示。每個結果已保留完整蛋殼描述，方便後續替換美術。結果畫面沿用孵蛋時的巢穴背景，只顯示怪獸佔位圖、怪獸名稱和「再孵一顆蛋」按鈕。
