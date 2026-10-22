# 星際遊俠共用圖示

延續遊戲的午夜藍與香檳金，使用 24 × 24 座標、1.65 單位筆畫、圓角端點與少量實心細節。`index.html`／`overview.png` 展示大尺寸及實際 16／24／32 px；展示卡片不是遊戲素材。

`icons.json` 保存八個原創 SVG 路徑。`tools/generate-ui-icons.cjs` 以同一組路徑生成金色 SVG、白色透明 PNG 及 `unity/Assets/Resources/Astral/Symbols/Atlas.png`；Unity 以元件顏色染成金色或戰場離場的淡白色。圖集為四欄、兩列，每格 256 × 256，依序為 Infinity、Duel、Collection、Gear、Book、Exit、Back、Currency；此順序須與 `AstralSymbols.cs` 的索引一致。

圖示置中等比縮放，不含底板、不改變點擊區。各頁使用共用 `AstralGraphic.Shape`，因此設定、返回與離場可維持一致外觀。來源圖集採無損透明度，網頁仍由 Unity 正式建置壓縮下載檔。
