"""Collect this revision's successful player reports and unedited captures."""
from pathlib import Path
import hashlib, html, json, shutil
ROOT=Path(__file__).resolve().parents[1]
RUNS={"ui":"ui-refinement-release","catalog":"neon-validation-ce41590ae534","multiplayer":"neon-validation-0b08406e419f","combat":"neon-validation-2eecdae46947"}
DEST=ROOT/"verification/2026-10-22-ui-refinement"
GALLERY=ROOT/"design/ui-refinement"

def main():
    DEST.mkdir(parents=True,exist_ok=True);GALLERY.mkdir(parents=True,exist_ok=True)
    reports={}
    for kind,run in RUNS.items():
        source=ROOT/"logs"/run
        files=[source/"report.json"] if kind=="ui" else sorted(source.glob("peer-?.json"))
        assert len(files)==(1 if kind in ("ui","catalog") else 2)
        reports[kind]=[];(DEST/kind).mkdir(exist_ok=True)
        for f in files:
            data=json.loads(f.read_text(encoding="utf-8-sig"));assert data["passed"] and not data["errors"],data.get("failure")
            reports[kind].append(data);shutil.copy2(f,DEST/kind/f.name)
    catalog=reports["catalog"][0]["palette"]
    assert catalog["passed"] and catalog["skills"]==95 and catalog["particlePrefabs"]==258 and catalog["reflections"]==1
    for r in reports["multiplayer"]:assert r["palette"]["passed"] and r["maxPeers"]==2
    views=[{a["id"]:a["local"] for a in r["palette"]["actors"]} for r in reports["multiplayer"]]
    assert views[0].keys()==views[1].keys() and all(views[0][k]!=views[1][k] for k in views[0]),"Both viewers must see opposite side colors for the same actors"
    assert all(r["combat"]["passed"] for r in reports["combat"])
    built=ROOT/"Builds/Windows"
    files=["NeonImpact.exe","NeonImpact_Data/Managed/Assembly-CSharp.dll","NeonImpact_Data/resources.assets","NeonImpact_Data/globalgamemanagers"]
    identity={"date":"2026-10-22","platform":"Windows x64","unity":"6000.3.11f1","fusion":"2.1.2 Shared","runs":RUNS,"uiScreens":len(reports["ui"][0]["screens"]),"uiChecks":len(reports["ui"][0]["checks"]),"catalog":catalog,"oppositeViewerColorsVerified":True,"sha256":{f:hashlib.sha256((built/f).read_bytes()).hexdigest() for f in files},"scope":"95 skills attached on both factions; all 258 original particle prefabs checked in both palettes; live projectile reflection; two actual Photon peers with opposite viewer colors; real challenge combat. Catalog and result layout captures are explicit fixtures, not exhaustive 95-skill PvP balance testing. No new ten-player benchmark in this revision."}
    (DEST/"build-identity.json").write_text(json.dumps(identity,ensure_ascii=False,indent=2),encoding="utf-8")
    log=(ROOT/"logs/windows.log").read_text(encoding="utf-8",errors="replace");assert "error CS" not in log and "Shader error" not in log
    (DEST/"build-validation.txt").write_text("\n".join(l for l in log.splitlines() if "NEON_" in l and "_OK" in l)+"\n",encoding="utf-8")
    entries=[]
    def add(run,file,title,note=""):
        target=f"{len(entries)+1:02d}-{file}";shutil.copy2(ROOT/"logs"/run/file,GALLERY/target);entries.append({"image":target,"title":title,"note":note})
    for file,title in [("lobby-1920x1080.png","大廳：原角色動畫、流星與光效"),("02-collection-head.png","收藏"),("05-purchase-confirm.png","依內容縮小的確認框"),("09-settings.png","一般設定"),("11-shouts.png","喊話設定"),("06-loadout.png","頂尖對決配裝"),("13-tutorial.png","原遊玩教學"),("result-fixture-1280x800.png","結算與中文時間"),("hud-2560x1080.png","超寬螢幕四角 HUD"),("lobby-1024x768.png","4:3 大廳"),("lobby-960x540.png","960 × 540 大廳")]:
        add(RUNS["ui"],file,title,"結算數值為排版測試資料。" if "result" in file else "")
    add(RUNS["multiplayer"],"peer-0.palette.png","玩家 1 視角：自己藍、玩家 2 紅","實際 Photon 雙端；測試時將雙方移近以便比對。")
    add(RUNS["multiplayer"],"peer-1.palette.png","玩家 2 視角：自己藍、玩家 1 紅","相同兩個網路角色，顏色依各自視角判定。")
    add(RUNS["catalog"],"peer-0.palette.png","技能與粒子壓力展示","逐一載入 95 技能後的測試展示，包含多個尚未消失的特效。")
    (GALLERY/"screens.json").write_text(json.dumps(entries,ensure_ascii=False,indent=2),encoding="utf-8")
    cards="".join(f'<article><h2>{html.escape(e["title"])}</h2><p>{html.escape(e["note"])}</p><a href="{e["image"]}"><img loading="lazy" src="{e["image"]}" alt="{html.escape(e["title"])}"></a></article>' for e in entries)
    (GALLERY/"index.html").write_text('<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Neon Impact 介面修訂實機畫面</title><style>body{margin:0;background:#0b1121;color:#ece8da;font:16px/1.7 system-ui,sans-serif}main{max-width:1400px;margin:auto;padding:32px}h1,h2{color:#c7ad70;font-weight:500}article{margin:36px 0;padding:20px;background:#18223a}img{display:block;width:100%;height:auto}p{color:#a6b0c5}</style><main><h1>Neon Impact · 介面修訂實機畫面</h1><p>2026-10-22。以下皆為 Windows 執行檔的直接截圖。原美術、音樂及動畫檔維持不變；原大廳動態背景已恢復。</p>'+cards+'</main></html>',encoding="utf-8")
    print(json.dumps({"reports":sum(len(v) for v in reports.values()),"galleryImages":len(entries),"oppositeViewerColorsVerified":True},ensure_ascii=False))
if __name__=="__main__":main()
