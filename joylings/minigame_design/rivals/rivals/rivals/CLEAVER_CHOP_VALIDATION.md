# 菜刀右上至左下斜劈更新

日期：2026-10-01。發布目標：Web；遊戲規則與連線版本 `rivals-web-22-swing` 維持相容。

[直接玩最新版](https://scozirge.github.io/a-thought/rivals/?v=chop-20261001) · [課堂教學](https://scozirge.github.io/a-thought/hatchbeasts/classroom/red-blue-battle/)

## 動作調整

- 先抬刀到畫面右上，向左下斜劈，落刀後短暫停住，再由下方收回。完整動作 0.56 秒，沿用 0.6 秒攻擊間隔。
- 刀面維持劈砍方向，縮小翻轉幅度；前臂從右下方延伸到握刀手，不再整段繞刀身旋轉。
- 第三人稱同步調整手腕、手臂與刀柄路徑，從右肩上方劈向左下。
- 近砍與飛刀行為沿用既有規則。火箭保留上次擴大後的傷害半徑。

## 驗證方式

- `RivalsPrototype.Editor.CleaverReview.RenderFrames` 使用實際武器模型與動畫，輸出待機、抬刀、劈砍、落刀、收刀及回到待機共六張預覽。
- `Tools/WebCleaverSmokeTest.cjs` 以正常鍵鼠／觸控輸入確認斜劈方向、復位、單次命中、連續揮砍、靶復活及飛刀切回手槍；診斷資料只讀。
- `Tools/WebArsenalSmokeTest.cjs` 可用 `RIVALS_TEST_WEAPONS=2` 專測雙瀏覽器 Photon 連線的菜刀拾取、斜劈、收刀及飛刀同步。
- 手機測試使用 Chrome 觸控模擬，未使用 Android／iPhone 實機。

## 本次結果

- `RIVALS_CLEAVER_REVIEW_OK frames=6`：逐格預覽成功，已檢視抬刀、劈砍與落刀姿勢。
- `RIVALS_WEB_BUILD_OK`：正式非 Development Web 成品建置成功。
- `WEB_CLEAVER_OK 8`：鍵鼠與手機共八組檢查通過，沒有瀏覽器執行錯誤。實測落刀相對抬刀向左約 0.58 公尺、向下約 0.39–0.42 公尺，恢復原位與連續劈砍皆通過。
- `WEB_ARSENAL_OK`：菜刀的兩組雙瀏覽器連線檢查通過，包含第三人稱斜劈方向、收刀復位，以及飛刀切回手槍。
- 已檢視正式 Web 成品的鍵鼠與手機動作截圖。
- 教學頁正式建置成功，301 個 H5 引用核對完成。
