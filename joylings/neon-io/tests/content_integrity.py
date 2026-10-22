"""Compare the migration with the actual source assets, not a hand-written count."""
from pathlib import Path
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path("E:/Projects/Neon-IO/Neon IO/Assets")
TARGET = ROOT / "unity/Assets"
binary_types = {".png", ".jpg", ".jpeg", ".wav", ".mp3", ".ogg", ".ttf", ".otf", ".psb", ".shader", ".anim", ".controller"}
failures = []
binary_count = 0
prefab_count = 0
# Only the twenty explicitly requested flat-art replacements may differ from
# the upstream media. Pin both versions; this is not a directory-wide exemption.
art_manifest = ROOT / "design/background-flat-v1/replacement-manifest.json"
approved_art = {}
if art_manifest.exists():
    approved_art = {item["path"]: item for item in json.loads(art_manifest.read_text(encoding="utf-8"))["files"]}
    expected = {"Resources/Images/Role/god.psb"}
    expected.update(f"Resources/Images/Scene/hand-{i}.png" for i in range(1, 10))
    expected.update(f"Resources/Images/Scene/cloud{i}-{j}.png" for i in range(1, 6) for j in (1, 2))
    if set(approved_art) != expected:
        failures.append("Flat-art replacement manifest must contain exactly the requested 20 assets")
for source in SOURCE.rglob("*"):
    if not source.is_file() or source.relative_to(SOURCE).parts[0] == "Photon":
        continue
    relative = source.relative_to(SOURCE)
    target = TARGET / relative
    if not target.exists():
        target = ROOT / "legacy-assets/Assets" / relative
    if not target.exists():
        failures.append("Missing original asset: " + str(relative))
        continue
    if source.suffix.lower() in binary_types:
        binary_count += 1
        original_hash = hashlib.sha256(source.read_bytes()).hexdigest()
        current_hash = hashlib.sha256(target.read_bytes()).hexdigest()
        approved = approved_art.get(relative.as_posix())
        if approved:
            if original_hash != approved["originalSha256"] or current_hash != approved["replacementSha256"]:
                failures.append("Flat-art replacement hash mismatch: " + str(relative))
            if hashlib.sha256(target.with_name(target.name + ".meta").read_bytes()).hexdigest() != approved["metadataSha256"]:
                failures.append("Flat-art import metadata changed: " + str(relative))
        elif original_hash != current_hash:
            failures.append("Changed original media/animation: " + str(relative))
    if source.suffix == ".prefab":
        prefab_count += 1
    if source.suffix == ".meta":
        original_guid = re.search(rb"guid: ([a-f0-9]+)", source.read_bytes())
        current_guid = re.search(rb"guid: ([a-f0-9]+)", target.read_bytes())
        if original_guid and (not current_guid or current_guid[1] != original_guid[1]):
            failures.append("Changed original GUID: " + str(relative))

source_features = (SOURCE / "Resources/Json/Feature.json").read_bytes()
target_features = (TARGET / "Resources/Json/Feature.json").read_bytes()
if source_features != target_features:
    failures.append("Original feature definitions changed")
encoding = "utf-16" if target_features.startswith((b"\xff\xfe", b"\xfe\xff")) else "utf-8-sig"
features = json.loads(target_features.decode(encoding), strict=False)["Feature"]
if len(features) != 95:
    failures.append("Expected original 95 feature definitions")
for path in TARGET.rglob("PhotonUnityNetworking.asmdef"):
    failures.append("Old PUN runtime still included: " + str(path))

result = {"passed": not failures, "original_media_animation_shader_files": binary_count,
          "approved_flat_art_replacements": len(approved_art),
          "original_prefabs": prefab_count, "features": len(features), "failures": failures}
print(json.dumps(result, ensure_ascii=False, indent=2))
raise SystemExit(1 if failures else 0)
