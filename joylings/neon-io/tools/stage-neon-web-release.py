"""Stage a tested Neon Web player without touching other published games/art."""
from pathlib import Path
import argparse
import hashlib
import json
import re
import shutil
import subprocess

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--publish', type=Path, required=True)
parser.add_argument('--report-dir', type=Path, required=True)
args = parser.parse_args()
publish, reports = args.publish.resolve(), args.report_dir.resolve()
source = root / 'Builds/WebGL'
destination = publish / 'neon-impact'
assert publish in destination.resolve().parents, 'Neon destination must stay inside the Pages checkout'

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def refs(index):
    return set(re.findall(r'''Build/([^'"<>\s]+)''', index.read_text(encoding='utf-8')))

assert (publish / '.git').exists(), 'Expected the existing Pages checkout'
assert not subprocess.check_output(['git', '-C', str(publish), 'status', '--porcelain']).strip(), 'Pages checkout must be clean'
for name in ('web-mobile-chromium.json', 'web-desktop.json', 'web-viewport.json', 'content-integrity.json'):
    assert json.loads((reports / name).read_text(encoding='utf-8'))['passed'], f'{name} did not pass'
index = source / 'index.html'
version = re.search(r"productVersion:'([^']+)'", index.read_text(encoding='utf-8')).group(1)
assert version in (root / 'unity/Assets/Editor/NeonWebBuild.cs').read_text(encoding='utf-8')
protected = {p.relative_to(publish).as_posix(): sha(p) for p in publish.rglob('*')
             if p.is_file() and p.relative_to(publish).parts[0] not in ('.git', 'neon-impact')}
before = (destination/'index.html').stat().st_size + sum((destination/'Build'/n).stat().st_size for n in refs(destination/'index.html'))
for p in source.rglob('*'):
    if not p.is_file():
        continue
    out = destination / p.relative_to(source)
    assert destination.resolve() in out.resolve().parents
    out.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(p, out)
# Keep the previous content-hashed build available to browsers with cached HTML.
assert all(sha(publish / p) == h for p, h in protected.items()), 'Unrelated published content changed'
files = {name: {'bytes': (destination/name).stat().st_size, 'sha256': sha(destination/name)}
         for name in ['index.html'] + sorted('Build/'+n for n in refs(destination/'index.html'))}
report = {'version': version, 'previous_initial_bytes': before, 'initial_bytes': sum(v['bytes'] for v in files.values()),
          'protected_published_files': len(protected), 'protected_unchanged': True, 'files': files}
(reports / 'build-identity.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
print(json.dumps({k: v for k, v in report.items() if k != 'files'}))
