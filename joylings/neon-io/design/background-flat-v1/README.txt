Neon Impact：造星神與背景平面改版（2026-10-22）

本輪依使用者要求把確認的造星神 V2 套用到遊戲，並重新設計雲與大手。
Unity 專案與 1.1.2-web 使用這 20 個資產；其他 9 個角色配件候選圖沒有套用。
既有 Windows 安裝包仍是 1.1.1-fusion。

造星神：沿用 character-flat-v2 已確認的 PSB，9 層中有 8 個可見部件。
每層識別碼、範圍、透明資料及原 .meta 保留；先前隔離 Unity 專案已驗證匯入的頂點、骨架、權重與綁定資料相同。
這次實際 WebGL 建置與大廳顯示亦通過。沒有把合成 PNG 直接蓋掉分層 PSB。

背景：大手先以 3000 × 4000 全圖設計，再切回原 9 個區塊；5 組雲各以 2000 × 1000 全圖設計，再切回原本左右兩片。
最終 19 張 PNG 均為 1000 × 1000 RGBA，保留原透明輪廓與原 .meta。原場景配置、動畫、音樂、流星與爆破時序不改。

生成方式：內建 image_gen 編輯，transparent_background=true。
prompts.json 保存六個生成提示及原圖／風格參考路徑；generated/ 保存生成原檔。
references/ 是原圖切片重組；preview/ 是確實輸出的遊戲素材重組，並非未適配的 AI 草圖。
export.cjs 整理平面色盤與反鋸齒、對齊原尺寸、保留原輪廓，檢查切片與 PSB 後輸出至 replacement/。
使用 --apply 才會複製 20 個圖檔回 Unity；不覆寫 .meta。
prepare.cjs 是第一次替換前的基準擷取，已有 baseline.json 時會拒絕覆蓋，以免改版後誤用新版當原作。

驗證：
- replacement-manifest.json：20 個原作／替換檔 SHA-256、.meta 雜湊、切片位置與透明資料證明。
- baseline.json：原始提交與 711 個受保護場景、Prefab、動畫及音訊檔雜湊。
- verification.json：靜態檢查、Unity 建置與兩個真實瀏覽器 Photon 測試範圍。
- gallery-check.json：展示頁桌機／窄螢幕載入與排版檢查。
- build-identity.json：實際遊戲入口引用的壓縮檔與大小；未將舊的未引用檔計入下載量。
- publication.json：公開發布與遠端檢查紀錄。

建置成功不代表所有技能、裝置、網路條件都已逐一測完。詳細範圍以 verification.json 為準。

公開展示：https://scozirge.github.io/a-thought/neon-impact-design/background-v1/
網頁遊戲：https://scozirge.github.io/a-thought/neon-impact/
