# Neon Impact 平面素材修正版 V2

公開頁面：https://scozirge.github.io/a-thought/neon-impact-design/flat-v2/

依使用者修正，維持原作的平面色塊、細描線與原本姿態，僅做線條清理與少量裝飾。設計目標是能依原路徑替換的素材，原正式遊戲沒有套用這批圖檔。

- 三組配件：騎士＋羽翼、阿努比斯＋星盤、甲蟲＋鞘翼。
- 角色配件維持 180×180 RGBA PNG、原透明留白範圍、中心樞紐、PPU 與原 .meta。遊戲依 Back → Body → Head 的順序組合顯示。
- 造星神維持 1000×1000 PSB、原 9 個圖層（8 層可見）、名稱、識別碼、範圍與每層透明通道。保留原骨架、網格、權重、動畫連結及 .meta。

## 製作與交付

使用內建 image_gen 編輯原始平面素材，逐件製作；完整提示詞在 `prompts.json`，生成母圖保留在 `generated/`。

`package-assets.cjs` 將角色母圖整理為有限平面色盤、抗鋸齒透明 PNG，對齊原畫布與素材範圍。造星神以原 PSB 為模板，保留各層透明通道及原紀錄，轉入平面色盤與內部裝飾；遮擋下的部位不烘入其他部件的裝飾。PSB 封裝依 [Adobe 檔案格式規格](https://www.adobe.com/devnet-apps/photoshop/fileformatashtml/) 處理。

`replacement/` 是正式格式的候選檔，`neon-impact-flat-v2.zip` 包含相同內容。`preview/` 是依原組合位置產生的展示圖；造星神合成 PNG 不用來替代 PSB。

## 驗證範圍

`contract-check.json` 記錄原檔與候選檔雜湊、尺寸、透明範圍、PSB 圖層與原透明通道雜湊。

獨立的 Unity 6000.3.11f1 專案先匯入原檔，再於該驗證專案覆寫候選檔。全部 17 個 Sprite 的 GUID、local file ID、名稱、rect、pivot、PPU、bounds 相同；造星神的頂點、三角形、骨架、權重、bind poses 也一致。結果與前後快照雜湊在 `unity-verification.json`，驗證程式在 `verification/VerifyFlatAssets.cs`。

本次通過的是素材匯入與資料相容性比對，未在正式遊戲場景執行替換後的遊玩測試。正式專案的程式、素材、Prefab、動畫和線上遊戲版本均未更動。
