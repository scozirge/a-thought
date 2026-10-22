"""Package the built Windows player, excluding Unity's developer-only artifacts."""
from hashlib import sha256
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import shutil


ROOT = Path(__file__).resolve().parents[1]
PLAYER = ROOT / "Builds" / "Windows"
ARCHIVE = ROOT / "Builds" / "NeonImpact-Windows-Unity6-Fusion.zip"


def main():
    for required in ("NeonImpact.exe", "UnityPlayer.dll", "NeonImpact_Data/globalgamemanagers"):
        if not (PLAYER / required).is_file():
            raise SystemExit(f"Missing build file: {required}; run tools/build-windows.ps1 first.")
    for source in (ROOT / "docs" / "PLAYER_GUIDE.txt", ROOT / "MIGRATION_REPORT.md"):
        shutil.copy2(source, PLAYER / source.name)

    files = [
        path for path in sorted(PLAYER.rglob("*"))
        if path.is_file()
        and not any("_donotship" in part.lower() for part in path.relative_to(PLAYER).parts)
        and path.suffix.lower() != ".pdb"
    ]
    with ZipFile(ARCHIVE, "w", compression=ZIP_DEFLATED, compresslevel=6) as package:
        for path in files:
            package.write(path, "NeonImpact-Windows/" + path.relative_to(PLAYER).as_posix())
    with ZipFile(ARCHIVE) as package:
        broken = package.testzip()
        if broken:
            raise SystemExit(f"ZIP CRC verification failed: {broken}")
        assert len(package.namelist()) == len(files)
    digest = sha256(ARCHIVE.read_bytes()).hexdigest()
    ARCHIVE.with_suffix(".zip.sha256").write_text(f"{digest}  {ARCHIVE.name}\n", encoding="ascii")
    print(f"NEON_PACKAGE_OK files={len(files)} bytes={ARCHIVE.stat().st_size}")
    print(ARCHIVE)
    print(f"SHA256 {digest}")


if __name__ == "__main__":
    main()
