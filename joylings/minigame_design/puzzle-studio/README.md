# 小小解謎所：四款本地原型

這是玩法比較用的獨立原型，每款 3 關，共 12 關。尚未接入正式課程目錄。

## 啟動
在此資料夾執行：
```sh
npm start
```

開啟 http://127.0.0.1:18125/ 。伺服器只監聽本機，不需要安裝套件。
可使用 ?game=pancake、?game=boxes、?game=rooms、?game=bridges 直接進入指定遊戲。

## 玩法
- 鬆餅店：點選一層，翻轉該層和上方所有鬆餅，排成上小下大。3、4、5 片逐步增加。
- 推箱子：點地板走路、點相鄰箱子推動；也支援方向鍵、WASD 和畫面方向按鈕。只能推，不能拉。
- 矩形分割：拖拉兩角，或依序點兩角。每間長方形房子包含一個數字，面積符合數字，最後填滿棋盤。點已蓋好的房子可以拆除。
- 搭橋問題：點兩座島或拖拉相連；重複連線依序變成單橋、雙橋、拆除。只能水平、垂直連到最近的島，橋不能交叉，所有島必須連通且橋數符合島上數字。

所有遊戲都有退一步、重新開始，可直接選關。沒有倒數或步數懲罰。
四款的目前關卡、操作及通關勾記分開保存在瀏覽器 localStorage 的 puzzle-studio-v1，不使用其他原型的存檔。
重開目前關卡會清空操作，保留完成勾記；切換遊戲則保留未完成的操作。

## 驗證
- npm test：12 個關卡的可解性，以及非法操作、不可變狀態、區域重疊、橋梁交叉與連通性、存檔重播驗證。
- node tests/browser.cjs：隔離瀏覽器存檔，實際操作 12 關、退一步、重整與重來，檢查 900/390/320 寬度及手機觸控點選。
- 瀏覽器測試預設使用本機 Chrome 與已安裝的 Playwright；可透過 PLAYWRIGHT_PATH 指定 Playwright 模組位置。
- npm run build：產生 dist/h5/ 靜態檔案。

關卡驗證保證有解，不保證只有唯一解；符合規則的答案都接受。
窄螢幕推箱子保留可點擊格子的尺寸，必要時可在棋盤內橫向捲動。

## 經典玩法參考
- Pancake sorting：https://mathworld.wolfram.com/PancakeSorting.html
- Sokoban：https://sokoban.jp/rule.html
- Shikaku：https://www.nikoli.co.jp/en/puzzles/shikaku/
- Hashiwokakero：https://www.nikoli.co.jp/en/puzzles/hashiwokakero/
