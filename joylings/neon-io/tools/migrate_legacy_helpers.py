from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "unity/Assets"
obsolete = {"PhotonRigidbody2DView", "PhotonStatsGui", "PhotonLagSimulationGui"}
guids = set()
for meta in (ROOT / "legacy-photon").rglob("*.cs.meta"):
    if meta.name[:-8] in obsolete:
        guids.add(re.search(r"guid: (\w+)", meta.read_text())[1])
removed = 0
for path in ASSETS.rglob("*"):
    if path.suffix not in (".prefab", ".unity"):
        continue
    text = path.read_text(encoding="utf-8-sig")
    parts = re.split(r"(?=^--- !u!)", text, flags=re.M)
    ids = []
    keep = []
    for part in parts:
        if any("guid: " + guid in part for guid in guids):
            ids.append(re.match(r"--- !u!\d+ &(-?\d+)", part)[1])
        else:
            keep.append(part)
    if not ids:
        continue
    text = "".join(keep)
    for identifier in ids:
        text = re.sub(r"^  - component: \{fileID: " + identifier + r"\}\n", "", text, flags=re.M)
        text = re.sub(r"^  - \{fileID: " + identifier + r"\}\n", "", text, flags=re.M)
    path.write_text(text, encoding="utf-8")
    removed += len(ids)
    print(path.relative_to(ASSETS), "removed PUN helpers", len(ids))
print("Removed obsolete helper components:", removed)

# These game presentation scripts are owned by the integration task.
for name in ("Battle/BattleUI.cs", "Battle/LeaderBoardUI.cs"):
    path = ASSETS / "Scripts" / name
    raw = path.read_bytes()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("cp950")
    for namespace in ("Photon.Pun", "Photon.Realtime", "ExitGames.Client.Photon"):
        text = text.replace("using " + namespace + ";", "using Neon.Networking;")
    lines = text.splitlines()
    found = False
    result = []
    for line in lines:
        if line == "using Neon.Networking;":
            if found:
                continue
            found = True
        result.append(line)
    path.write_text("\n".join(result) + "\n", encoding="utf-8")
