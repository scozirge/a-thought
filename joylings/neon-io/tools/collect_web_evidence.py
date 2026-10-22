from pathlib import Path
import hashlib, json, shutil, subprocess, sys

root=Path(__file__).resolve().parents[1]
out=root/'verification/2026-10-22-web';out.mkdir(parents=True,exist_ok=True)
gallery=root/'design/web-release';gallery.mkdir(parents=True,exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
for name in ('web-local-asia','web-public-release'):
    report=json.loads((root/'logs'/name/'report.json').read_text())
    assert report['passed'] and report['region']=='asia' and min(report['peerCounts'])>=2
    shutil.copy2(root/'logs'/name/'report.json',out/(name+'.json'))
    for file in ('intro.png','lobby-0.png','collection.png','battle-live-0.png','battle-live-1.png'):
        shutil.copy2(root/'logs'/name/file,gallery/(name+'-'+file))
check=json.loads(subprocess.check_output([sys.executable,str(root/'tests/content_integrity.py')],text=True,encoding='utf-8'))
assert check['passed'];(out/'source-integrity.json').write_text(json.dumps(check,indent=2))
files=[{'path':str(p.relative_to(root/'Builds/WebGL')),'bytes':p.stat().st_size,'sha256':sha(p)} for p in (root/'Builds/WebGL').rglob('*') if p.is_file()]
baseline=json.loads((root/'logs/web-baseline-final.json').read_text())
before=sum(p['bytes'] for p in baseline['files'] if p['path'].replace('\\','/').startswith('Build/') or p['path']=='index.html')
after=sum(p['bytes'] for p in files if p['path'].replace('\\','/').startswith('Build/') or p['path']=='index.html')
data={'initial_download_bytes':after,'first_build_download_bytes':before,'saved_bytes':before-after,'saved_percent':round((before-after)*100/before,2),'files':files}
(out/'web-build-identity.json').write_text(json.dumps(data,indent=2))
items=''.join(f'<figure><img src="{p.name}" loading="lazy"><figcaption>{p.stem}</figcaption></figure>' for p in gallery.glob('*.png'))
(gallery/'index.html').write_text('<!doctype html><meta charset="utf-8"><title>Neon Impact Web 驗證</title><style>body{background:#10172b;color:#eee;font:18px system-ui;max-width:1280px;margin:30px auto}img{max-width:100%}figure{margin:24px 0}</style><h1>Neon Impact 網頁版實際畫面</h1>'+items,encoding='utf-8')
print(json.dumps({k:v for k,v in data.items() if k!='files'},indent=2))
