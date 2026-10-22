"""Stage only the verified Neon player and its art gallery in the Pages checkout."""
from pathlib import Path
import hashlib
import json
import re
import shutil
import subprocess

root = Path(__file__).resolve().parents[1]
publish = Path('E:/Projects/a-thought-publish-learning').resolve()
art = root / 'design/background-flat-v1'

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def copy_tree(source, target):
    assert publish in target.resolve().parents
    for p in source.rglob('*'):
        if p.is_file():
            out = target / p.relative_to(source)
            out.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(p, out)

assert (root/'Builds/WebGL/index.html').is_file()
assert json.loads((art/'verification.json').read_text(encoding='utf-8'))['passed']
assert not subprocess.check_output(['git', '-C', str(publish), 'status', '--porcelain']).strip(), 'Pages checkout must be clean'
protected = {p.relative_to(publish).as_posix(): sha(p) for p in publish.rglob('*')
             if p.is_file() and p.relative_to(publish).parts[0] not in ('.git', 'neon-impact', 'neon-impact-design')}
previous_index = publish/'neon-impact/index.html'
previous_refs = set(re.findall(r'''Build/([^'"<>\s]+)''', previous_index.read_text(encoding='utf-8')))
before = previous_index.stat().st_size + sum((publish/'neon-impact/Build'/name).stat().st_size for name in previous_refs)
copy_tree(root/'Builds/WebGL', publish/'neon-impact')
# Remove only obsolete generated build files inside the checked Neon build directory.
target_build = (publish/'neon-impact/Build').resolve()
current_names = {p.name for p in (root/'Builds/WebGL/Build').iterdir() if p.is_file()}
for p in target_build.iterdir():
    if p.is_file() and p.name not in current_names:
        assert p.resolve().parent == target_build
        p.unlink()
gallery = publish/'neon-impact-design/background-v1'
for directory in ('preview', 'references', 'screens', 'replacement'):
    copy_tree(art/directory, gallery/directory)
for file in ('index.html', 'verification.json', 'neon-background-flat-v1.zip'):
    gallery.mkdir(parents=True, exist_ok=True)
    shutil.copy2(art/file, gallery/file)
shutil.copy2(root/'design/character-flat-v2/index.html', publish/'neon-impact-design/flat-v2/index.html')
assert all(sha(publish/p) == h for p,h in protected.items()), 'Unrelated published files changed'
game_files = {p.relative_to(publish/'neon-impact').as_posix(): {'bytes':p.stat().st_size,'sha256':sha(p)}
              for p in (publish/'neon-impact').rglob('*') if p.is_file()}
current_refs = set(re.findall(r'''Build/([^'"<>\s]+)''', (publish/'neon-impact/index.html').read_text(encoding='utf-8')))
after = game_files['index.html']['bytes'] + sum(game_files['Build/'+name]['bytes'] for name in current_refs)
report = {'version':'1.1.2-web','previous_initial_bytes':before,'initial_bytes':after,'delta_bytes':after-before,
          'protected_published_files':len(protected),'protected_unchanged':True,'files':game_files}
(art/'build-identity.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k != 'files'}))
