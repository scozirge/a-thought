"""Collect successful release evidence and unmodified player captures locally."""
import hashlib
import html
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNS = {
    "ui": "astral-ui-release",
    "challenge": "neon-validation-85ece6b9025a",
    "multiplayer10": "neon-validation-31ffdf2ddc3f",
    "reconnect": "neon-validation-e1c80621f326",
    "offline95": "neon-validation-1b9f4273660e",
}
DEST = ROOT / "verification/2026-10-22-astral"
GALLERY = ROOT / "design/astral-implemented"


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    GALLERY.mkdir(parents=True, exist_ok=True)
    reports = {}
    for kind, folder in RUNS.items():
        source = ROOT / "logs" / folder
        paths = [source / "report.json"] if kind == "ui" else sorted(source.glob("peer-?.json"))
        expected = {"ui": 1, "challenge": 2, "multiplayer10": 10, "reconnect": 2, "offline95": 1}[kind]
        assert len(paths) == expected, (kind, len(paths))
        reports[kind] = []
        (DEST / kind).mkdir(exist_ok=True)
        for path in paths:
            data = json.loads(path.read_text(encoding="utf-8"))
            assert data["passed"], (kind, data.get("failure"))
            assert not data.get("errors"), (kind, data.get("errors"))
            reports[kind].append(data)
            shutil.copy2(path, DEST / kind / path.name)
    assert reports["offline95"][0]["testedSkills"] == 95
    assert all(p["maxPeers"] == 10 and p["maxActors"] == 10 for p in reports["multiplayer10"])
    assert all(p["reconnected"] for p in reports["reconnect"])
    assert all(p["combat"]["passed"] for p in reports["challenge"])
    release = ROOT / "Builds/Windows"
    files = ["NeonImpact.exe", "NeonImpact_Data/Managed/Assembly-CSharp.dll", "NeonImpact_Data/globalgamemanagers", "NeonImpact_Data/resources.assets"]
    identity = {
        "date": "2026-10-22", "theme": "B / Astral Sanctum", "unity": "6000.3.11f1", "fusion": "2.1.2 Stable 2279 Shared", "platform": "Windows x64", "developmentBuild": False,
        "runs": RUNS, "uiScreens": len(reports["ui"][0]["screens"]), "uiChecks": len(reports["ui"][0]["checks"]),
        "sha256": {name: hashlib.sha256((release / name).read_bytes()).hexdigest() for name in files},
        "scope": "UI resolution and interaction checks; real Photon challenge, ten peers and reconnect; 95 offline skill attachments. UI result-fixture images contain explicitly synthetic layout values. Not a WebGL/mobile build or exhaustive 95-skill multiplayer test.",
    }
    (DEST / "build-identity.json").write_text(json.dumps(identity, ensure_ascii=False, indent=2), encoding="utf-8")
    build_log = (ROOT / "logs/windows.log").read_text(encoding="utf-8", errors="replace")
    assert "Shader error" not in build_log and "error CS" not in build_log
    markers = [line for line in build_log.splitlines() if ("NEON_" in line and "_OK" in line) or "ASTRAL_ICON_FRAMING_OK" in line]
    (DEST / "build-validation.txt").write_text("\n".join(markers) + "\n", encoding="utf-8")
    cards = []

    def add(kind, filename, title, group="主要介面", note="Windows 執行檔實際渲染"):
        source = ROOT / "logs" / RUNS[kind] / (filename + ".png")
        target = kind + "-" + filename + ".png"
        assert source.is_file(), source
        shutil.copy2(source, GALLERY / target)
        cards.append({"file": target, "title": title, "group": group, "note": note})

    for filename, title in [
        ("01-lobby-1280x800", "主選單／原角色金色線稿"),
        ("02-collection-head", "收藏／頭部技能"),
        ("03-collection-body", "收藏／身體技能"),
        ("04-collection-back", "收藏／背部技能"),
        ("06-loadout", "頂尖對決／五格配裝"),
        ("07-select-skill", "技能選擇與說明"),
        ("08-matchmaking", "實際 Photon 配對等待"),
        ("09-settings", "音量、音樂、語言與地區"),
        ("10-region-options", "地區選項"),
        ("11-shouts", "喊話設定"),
        ("12-credits", "製作名單"),
        ("13-tutorial", "遊玩教學"),
        ("guide-page-5", "附加狀態教學／長內容捲動"),
        ("05-purchase-confirm", "原價格購買確認／測試中取消"),
        ("15-connection-notice", "通知與錯誤視窗／訊息排版測試"),
        ("18-battle-hud", "戰鬥 HUD／原技能與特效"),
    ]:
        add("ui", filename, title)
    add("challenge", "peer-0.versus", "真實雙端配對／VS", note="兩個 Windows 程序透過 Photon 配對")
    add("challenge", "peer-0", "對決勝利結算", note="實際多人傷害與勝負回歸測試結果")
    add("challenge", "peer-1", "對決失敗結算", note="同一場測試的另一端結果")
    for filename, title in [
        ("lobby-2560x1080", "2560 × 1080／超寬螢幕"),
        ("lobby-1920x1080", "1920 × 1080／16:9"),
        ("loadout-1024x768", "1024 × 768／4:3 配裝"),
        ("settings-960x540", "960 × 540／小視窗設定"),
        ("guide-960x540", "960 × 540／教學與遮罩"),
        ("16-lobby-english", "英文主選單"),
        ("collection-english", "英文收藏與技能說明"),
    ]:
        add("ui", filename, title, "比例與語言")
    (GALLERY / "screens.json").write_text(json.dumps(cards, ensure_ascii=False, indent=2), encoding="utf-8")
    content = "".join(
        '<article data-group="' + html.escape(c["group"]) + '"><button class="shot" data-file="' + html.escape(c["file"]) + '" aria-label="放大：' + html.escape(c["title"]) + '"><img loading="lazy" src="' + html.escape(c["file"]) + '" alt="' + html.escape(c["title"]) + '"></button><div class="caption"><h2>' + html.escape(c["title"]) + '</h2><p>' + html.escape(c["note"]) + '</p></div></article>' for c in cards
    )
    page = '''<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NEON IMPACT · 星儀神殿實機介面</title>
<style>*{box-sizing:border-box}body{margin:0;background:#10172d;color:#ece8da;font-family:system-ui,"Microsoft JhengHei",sans-serif}header{max-width:1500px;margin:auto;padding:56px 28px 26px}.eyebrow{color:#c7ad70;letter-spacing:.25em;font-size:14px}h1{font-size:clamp(30px,4vw,48px);font-weight:500;margin:12px 0 20px}header p{color:#adb7cb;max-width:900px;line-height:1.8}nav{display:flex;gap:12px;flex-wrap:wrap;margin:25px 0}button{font:inherit;cursor:pointer}nav button,#close{background:#19233b;color:#ece8da;border:1px solid #867448;padding:12px 24px;border-radius:4px}nav button.active{background:#c7ad70;color:#10172d}main{max-width:1500px;margin:auto;padding:0 28px 60px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:26px}article{border:1px solid #655b43;background:#172139;overflow:hidden;border-radius:8px}.shot{width:100%;padding:0;border:0;display:block;background:#0b1121}.shot img{width:100%;height:auto;display:block}.caption{padding:18px 22px}h2{font-size:20px;font-weight:500;margin:0 0 10px}.caption p{font-size:14px;color:#adb7cb;margin:0}dialog{background:#080d19;color:#ece8da;border:1px solid #c7ad70;padding:14px;width:95vw;max-width:1800px}dialog::backdrop{background:#000d}dialog img{display:block;max-width:100%;max-height:82vh;margin:auto;object-fit:contain}#close{display:block;margin:0 0 12px auto}article[hidden]{display:none}@media(max-width:800px){main{grid-template-columns:1fr;padding:0 16px 40px}header{padding:28px 16px}h2{font-size:18px}}</style>
<header><div class="eyebrow">NEON IMPACT / ASTRAL SANCTUM</div><h1>星儀神殿 · 遊戲實機介面</h1><p>第二款設計已實作於 Unity 6／Fusion Windows 版本。下列為執行檔截圖，可點擊放大；角色、動畫、技能與特效沿用原遊戲。介面驗證涵蓋 67 張畫面、751 項版面與操作檢查。對決勝負畫面來自兩端 Photon 實際測試。</p><nav><button class="active" data-filter="全部">全部畫面</button><button data-filter="主要介面">主要介面</button><button data-filter="比例與語言">比例與語言</button></nav></header><main>''' + content + '''</main><dialog id="viewer"><button id="close">關閉 ×</button><img id="large" alt="放大遊戲畫面"></dialog>
<script>const viewer=document.querySelector('#viewer');document.querySelectorAll('.shot').forEach(b=>b.onclick=()=>{document.querySelector('#large').src=b.dataset.file;document.querySelector('#large').alt=b.getAttribute('aria-label');viewer.showModal()});document.querySelector('#close').onclick=()=>viewer.close();viewer.onclick=e=>{if(e.target===viewer)viewer.close()};document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('article').forEach(x=>x.hidden=b.dataset.filter!=='全部'&&x.dataset.group!==b.dataset.filter)})</script></html>'''
    (GALLERY / "index.html").write_text(page, encoding="utf-8")
    for card in cards:
        assert (GALLERY / card["file"]).is_file()
    report_path = ROOT / "MIGRATION_REPORT.md"
    existing = report_path.read_text(encoding="utf-8")
    marker = "\n## 星儀神殿 UI 交付驗證\n"
    existing = existing.split(marker)[0].rstrip()
    section = '''
## 星儀神殿 UI 交付驗證

日期：2026-10-22。以下均以最終 Windows 非 Development 建置執行，識別與成功報告保存在 `verification/2026-10-22-astral/`。本節不以先前移植版本的測試取代新建置驗證。

新版以 Screen Space Overlay Canvas、安全區及 1920×1080 設計座標的等比例縮放建立版面；模態遮罩填滿實際視窗，長清單／文字使用可捲動區域。實作檔案位於 `unity/Assets/Scripts/Astral/`，保留原控制器、價格、配裝、資料儲存及 Fusion 連線邏輯。

涵蓋大廳、收藏、技能詳情與購買、五格配裝、技能選擇、配對／VS、設定選項、喊話、製作名單、完整教學、載入、確認／錯誤彈窗、HUD、排行／戰鬥紀錄、技能／升級通知、結算及原有付費服務入口。組隊模式維持停用。原角色動畫透過獨立預覽鏡頭與金色線稿材質呈現；技能只在 UI 中重新取景、著色，原圖與玩法素材不改動。

| 最終建置檢查 | 實際結果 | 紀錄 |
| --- | --- | --- |
| 完整 UI 與操作 | 67 張畫面、751 項斷言，0 執行錯誤；確認按鈕可被射線點擊、控制項在畫面內、滑桿填色在軌道內；真實 Photon 配對後取消、再次出戰成功 | `logs/astral-ui-release/` |
| 畫面適配 | 1280×800、1920×1080、2560×1080、1024×768、960×540；主選單、收藏、選擇、配裝、設定、喊話、教學、HUD、結算；中英文抽查 | 同上 |
| 真實雙端對決 | 透過新版 Challenge／配對按鈕進入；兩端 damage、lifeSteal、immortal、death、singleKill、challengeResult、lateDeathDidNotFlipResult 全通過，0 錯誤；含 VS 與勝負實機截圖 | `logs/neon-validation-85ece6b9025a/` |
| 真實 10 人同步 | 10 個獨立 Windows 程序，均看見 10 peers／10 player actors；進場後執行 45 秒，各程序總計約 57 秒，全部通過、0 錯誤 | `logs/neon-validation-31ffdf2ddc3f/` |
| 離房與重連 | 雙端返回大廳再加入同一驗證房間，均恢復角色，reconnected=true，0 錯誤 | `logs/neon-validation-e1c80621f326/` |
| 95 技能載入 | 原 95 技能逐一掛載、ID 比對成功、0 錯誤；有實際渲染輸出 | `logs/neon-validation-1b9f4273660e/` |
| 原始內容 | 470 個原媒體／動畫／Shader 逐位元一致、548 原 Prefab／95 定義與 GUID 保留 | `tests/content_integrity.py` |

修正實測發現的大標題行高裁切、預覽鏡頭在批次截圖未更新、技能原圖留白過大、滑桿填色溢出、捲軸把手超界、再次出戰少關閉結算、冷卻遮罩方向，以及非 16:9 模態遮罩未覆蓋整個視窗。細線加上幾何邊緣淡化，未另加全畫面後處理。

實機預覽在 `design/astral-implemented/index.html`。UI 測試的 `result-layout-fixture`／`result-fixture` 截圖使用明確的合成數字檢查排版；真正的對決勝負截圖與報告另存於 challenge 紀錄，未混為真實戰果。測試取消購買，未完成任何付款。字體 OFL 授權隨建置放在 `ThirdPartyLicenses/AstralFonts/`。

本次驗證為 Windows；WebGL、手機與實體多螢幕 DPI 組合尚未建置／驗證。95 技能載入不等於所有技能組合皆完成多人對戰驗證。先前的房主接手、滿星星池測試屬於移植基準；本次 UI 更新未再次執行這兩項。
'''
    report_path.write_text(existing + "\n" + section, encoding="utf-8")
    print(json.dumps({"passed": True, "reports": sum(len(v) for v in reports.values()), "uiScreens": identity["uiScreens"], "uiChecks": identity["uiChecks"], "galleryImages": len(cards), "gallery": str(GALLERY / "index.html"), "identity": str(DEST / "build-identity.json")}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
