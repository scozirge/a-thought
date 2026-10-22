"""Preserve original content while preparing the Unity 6/Fusion project."""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / "unity"
manifest = PROJECT / "Packages/manifest.json"
old = json.loads(manifest.read_text(encoding="utf-8-sig"))
dependencies = {k: v for k, v in old["dependencies"].items() if k.startswith("com.unity.modules.")}
dependencies.update({
    "com.unity.2d.animation": "13.0.6",
    "com.unity.2d.psdimporter": "12.0.2",
    "com.unity.2d.sprite": "1.0.0",
    "com.unity.ugui": "2.0.0",
    "com.unity.nuget.mono-cecil": "1.10.2",
    "com.unity.test-framework": "1.6.0",
    "com.unity.timeline": "1.8.11",
})
manifest.write_text(json.dumps({"dependencies": dependencies}, indent=2) + "\n", encoding="utf-8")
(PROJECT / "ProjectSettings/ProjectVersion.txt").write_text("m_EditorVersion: 6000.3.11f1\nm_EditorVersionWithRevision: 6000.3.11f1 (3000ef702840)\n", encoding="utf-8")
settings = PROJECT / "ProjectSettings/ProjectSettings.asset"
text = settings.read_text(encoding="utf-8-sig")
text = text.replace("PHOTON_UNITY_NETWORKING;PUN_2_0_OR_NEWER;PUN_2_OR_NEWER", "FUSION_WEAVER")
text = text.replace("  gcIncremental: 0", "  gcIncremental: 1")
text = text.replace("  allowUnsafeCode: 0", "  allowUnsafeCode: 1")
settings.write_text(text, encoding="utf-8")
print("Unity 6000.3.11f1 manifest/settings prepared; gameplay and assets preserved.")
