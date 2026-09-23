# 免費資源與套用紀錄

本次從作者官方頁面或作者在 OpenGameArt 的發布頁下載。模型、貼圖與多數音效為 CC0 1.0；槍聲壓縮檔內附 CC BY 3.0，本專案遵照附檔進行署名。原始 License.txt／creativecommons.txt 與下載來源保存在 Assets/ThirdParty。這些是免費替代素材，不是 Roblox RIVALS 官方資產。

| 資源 | 作者／授權 | 本次使用 |
|---|---|---|
| [Ultimate Guns Pack](https://quaternius.com/packs/ultimategun.html) | Quaternius／CC0 | 步槍、手槍、霰彈槍、狙擊槍 FBX；修正模型軸向、重新配色、調整比例並添加槍托／瞄具／彈殼細節 |
| [Toon Shooter Game Kit](https://quaternius.com/packs/toonshootergamekit.html) | Quaternius／CC0 | 使用 Knife_1 短刀；其餘下載模型保留為備選 |
| [Animated Guns Pack](https://quaternius.com/packs/animatedguns.html) | Quaternius／CC0 | 已下載 Rifle 作為比較備選，未用於目前成品 |
| [Blocky Characters](https://kenney.nl/assets/blocky-characters) | Kenney／CC0 | 保留先前下載資源；目前角色改為專案自行製作 |
| [Blaster Kit](https://kenney.nl/assets/blaster-kit) | Kenney／CC0 | 保留箱子與標靶備選，目前場地未放置 |
| [Prototype Textures](https://kenney.nl/assets/prototype-textures) | Kenney／CC0 | 保留備選，目前格線貼圖由專案程式生成 |
| [Crosshair Pack](https://kenney.nl/assets/crosshair-pack) | Kenney／CC0 | 射擊準星 |
| [Impact Sounds](https://kenney.nl/assets/impact-sounds) | Kenney／CC0 | 水泥腳步、命中提示 |
| [Gunshot Sounds](https://opengameart.org/content/gunshot-sounds) | Vincent Sevedge（Tabasco）／CC BY 3.0 | 四種槍聲；擷取第一發、轉單聲道、調整音量及淡出 |
| [Gun Reload Sounds](https://opengameart.org/content/gun-reload-sounds) | SpringySpringo／CC0 | 換彈聲 |
| [Noto Sans CJK TC](https://github.com/notofonts/noto-cjk) | Noto／SIL OFL 1.1 | 完整繁體中文字型，隨遊戲附帶；授權保存在 `Assets/ThirdParty/NotoSansTC/OFL.txt` |

下載與查核日期：2026-09-22。`Assets/ThirdParty/sources.json` 保留來源頁、下載 URL 及可用的檔案 SHA256。Quaternius 官方下載連結指向作者的公開 Google Drive，已下載所選 FBX 與原始授權文件。OpenGameArt 原始槍聲與加工後的單發版本都保留。

中文字型於 2026-09-23 從 Noto 官方儲存庫下載，使用未修改的 Traditional Chinese Regular OTF；介面所有中文字都已通過字型字元覆蓋檢查。

`Kenney-sci-fi-sounds` 與額外模型／貼圖為已下載備選，目前遊戲沒有使用科幻雷射槍聲。2026-09-23 追加下載 Toon Shooter Game Kit 的六個模型與 Animated Guns Pack 的 Rifle；實際採用 Toon Shooter 的 Knife_1。新增下載的來源與 SHA256 記錄於 `Assets/ThirdParty/rivals-art-downloads.json`。兩包新增素材的 `License.txt` 是本專案整理的作者、官方頁面及 CC0 授權紀錄。

## 本次整合範圍

- 第一人稱與其他玩家手上的槍械換成低多邊形模型。
- 角色由本專案自行製作，使用方塊四肢、圓柱笑臉、帽子／髮型和 8 組外觀搭配，保留藍紅隊伍識別。
- 新增霰彈槍與狙擊槍；沿用 Fusion 房主判定的彈藥、傷害與回合同步。
- 地板與牆面改為自行生成的白灰格線，搭配門框掩體、側邊樓梯與高台。
- 步槍改橘黑配色、手槍深色、短刀銀刃黑柄、霰彈槍追加紅色彈殼、狙擊槍改綠色槍身；武器圖示由實際模型渲染產生。
- 接上槍聲、換彈、腳步與命中提示；聲音只在呈現端播放，不在網路重算時重播。

角色、模型與音效可以繼續替換，但並未還原原作全部武器動畫、地圖或遊戲系統。

槍聲來源頁標示 CC0，但下載檔 `creativecommons.txt` 寫明 Copyright (c) 2009 Vincent Sevedge、CC BY 3.0。本專案依附檔署名，列出來源、授權連結與「擷取、單聲道、調整音量／淡出」修改資訊；遊戲 F8 老師設定中的「素材與授權」和發行資料夾都有相同標示。
