# 字型來源

`NotoSansCJKtc-Regular.otf` 是原始、未修改的 Noto Sans CJK TC Regular。

- 來源：<https://github.com/notofonts/noto-cjk/tree/main/Sans/OTF/TraditionalChinese>
- 授權：SIL OFL 1.1，全文保存在 `../../Assets/ThirdParty/NotoSansTC/OFL.txt`。
- SHA256：`dce08bd4fd91aa8aa76ed8fea4b694c2dfb8550f67871e326843212ddbeb88b4`。

原始檔放在 Unity `Assets` 外，避免被打包。安裝 `fonttools==4.65.0` 後，從 Unity 專案目錄執行 `python Tools/optimize_font.py`，可產生遊戲使用的 Rivals CJK UI 衍生版。結果記錄在 `Tools/font-optimization.json`；既有資產路徑及 GUID 保持不變。

衍生版保留全部原有 Unicode 字元、字寬與一般橫排功能，包含韓文組字；移除遊戲未使用的直排與其他地區替代字形。它不是只保留介面文字的有限字集，玩家仍可輸入原先字型支援的名稱。
