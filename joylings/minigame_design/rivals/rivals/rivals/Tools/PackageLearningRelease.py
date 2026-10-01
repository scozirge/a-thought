"""Package the verified Web folder; preserve the historical Windows manifest."""
import hashlib
import json
import subprocess
import zipfile
from datetime import datetime, timezone
from pathlib import Path

root = Path(__file__).resolve().parents[1]
release = root / 'Builds/Release-20260924-Mobile'
web = release / 'Web'
assert (web / 'learning.js').is_file() and (web / 'learning.css').is_file()
assert 'learning.js' in (web / 'index.html').read_text(encoding='utf-8')
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
sources = {}
for folder in ['Assets/Rivals/Scripts', 'Assets/Rivals/Resources', 'Assets/WebGLTemplates/Rivals', 'Assets/Plugins/WebGL']:
    for p in sorted((root / folder).rglob('*')):
        if p.is_file() and p.suffix != '.meta':
            sources[p.relative_to(root).as_posix()] = digest(p)
info = {
    'date': '2026-10-01', 'gameSourceCommit': commit, 'target': 'Web',
    'unity': '6000.3.11f1', 'backend': 'IL2CPP / WebAssembly', 'development': False,
    'networkVersion': 'rivals-web-26-respawn-default',
    'uiRevision': 'star-progress-20261001',
    'releaseRevision': 'star-progress-20261001',
    'assetDelivery': 'jsDelivr / SHA-256 verification / original-host fallback / original Unity cache keys',
    'compression': 'Brotli / Unity decompression fallback',
    'releaseChanges': [
        '正式站大型檔案改由 CDN 加速，逐檔核對大小與 SHA-256；失敗或八秒沒有下載進度時改由原站取得。遊戲檔案內容及既有快取不變。',
        '遊戲程式與資源採用無損 Brotli 壓縮，主程式與資料檔皆使用瀏覽器持續快取。',
        '題目下方顯示簡短解鎖提示；答對後以三顆星呈現本輪進度，集滿三顆顯示解鎖的新武器。',
        '五把徽章武器移除地面拾取物與底座，只能解鎖後由復活選單取得。',
        'Bot 分散進攻路線、避讓隊友，反應略快且開火時間小幅延長；射速及瞄準誤差不變。',
        '手機答題後復活自動恢復操作焦點，離房與暫停不會誤觸恢復。',
        '加入十五題武器邏輯挑戰，每次死亡回答一題，答錯下次重出原題。',
        '每三個徽章依序解鎖菜刀、火箭筒、毒藥、加特林與核彈。',
        '每次死亡預設最近解鎖的武器；倒數可改選手槍或其他已解鎖武器，只影響當次復活，場地拾取武器不列入。',
        '核彈解鎖後不再出題；同房保留進度，離開房間重新開始。',
        '手機與鍵鼠皆可答題，房主驗證答案、重複請求及地圖拾取資格。',
        '保留工作區既有菜刀外觀、揮砍與射程調整；精確原始碼以 sourceFiles 雜湊為準。'
    ],
    'sourceFiles': sources,
}
(web / '版本資訊.json').write_text(json.dumps(info, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
archive = root / 'Builds/RIVALS-Web-20260924-mobile.zip'
files = sorted(p for p in web.rglob('*') if p.is_file())
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
    for p in files:
        z.write(p, p.relative_to(web).as_posix())
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert all(hashlib.sha256(z.read(p.relative_to(web).as_posix())).hexdigest() == digest(p) for p in files)
manifest_path = release / 'release-manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8-sig'))
entry = {
    'target': 'Web', 'gameSourceCommit': commit,
    'archive': archive.relative_to(root).as_posix(), 'bytes': archive.stat().st_size,
    'sha256': digest(archive), 'files': len(files),
    'uncompressedBytes': sum(p.stat().st_size for p in files), 'allFilesMatch': True,
    'fileSha256': {p.relative_to(web).as_posix(): digest(p) for p in files},
}
manifest['packages'] = [entry if p['target'] == 'Web' else p for p in manifest['packages']]
manifest['builtAt'] = datetime.now(timezone.utc).isoformat()
manifest['releaseTargets'] = ['Web']
manifest['legacyTargets'] = ['Windows']
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
print(json.dumps({k: entry[k] for k in ['bytes', 'files', 'sha256']}, indent=2))
