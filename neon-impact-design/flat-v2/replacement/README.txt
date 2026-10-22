Neon Impact 平面素材修正版 V2

用途
本包是供美術確認的替換候選素材。本次沒有套用至正式遊戲，也沒有更動程式、Prefab、動畫或課程內容。

內容
- 3 組角色配件，共 9 張 180×180 RGBA PNG：騎士＋羽翼、阿努比斯＋星盤、甲蟲＋鞘翼。
- god.psb：1000×1000，保留原 9 層，其中 8 層為可見部件。
- 每個素材均附原本的 .meta，保留 GUID、PPU、樞紐與 PSB 的骨架設定。

對應路徑
Assets/Resources/Images/Role/Head/knight.png
Assets/Resources/Images/Role/Body/knight.png
Assets/Resources/Images/Role/Back/featherWing.png
Assets/Resources/Images/Role/Head/anubis.png
Assets/Resources/Images/Role/Body/anubis.png
Assets/Resources/Images/Role/Back/discWing.png
Assets/Resources/Images/Role/Head/beetle.png
Assets/Resources/Images/Role/Body/beetle.png
Assets/Resources/Images/Role/Back/beetle.png
Assets/Resources/Images/Role/god.psb

替換方式
確認美術後，將包內 Assets 目錄合併至目前 Unity 專案的 Assets 目錄，保留相同檔名與路徑。附帶 .meta 與目前專案原檔一致。造星神必須使用分層 god.psb；preview 內的合成 PNG 僅供觀看。

驗證
已於獨立 Unity 6000.3.11f1 專案先匯入原檔，再覆寫本包候選檔，比對全部 17 個 Sprite。GUID、local file ID、名稱、尺寸、樞紐、PPU、bounds，以及造星神的頂點、三角形、骨架、骨骼權重與綁定姿勢資料一致。
造星神的圖層名稱、圖層識別碼、位置、每層透明通道及其他原始圖層紀錄均保留。
本次驗證範圍是素材匯入與骨架資料相容性，尚未在正式遊戲場景執行替換後的遊玩測試。

公開對照
https://scozirge.github.io/a-thought/neon-impact-design/flat-v2/
