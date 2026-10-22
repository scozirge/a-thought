"""Stage the verified Web player and both classroom URLs in existing publish checkouts."""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
games = Path('E:/Projects/a-thought-publish-learning')
course = Path('E:/Projects/a-thought-classroom-publish')
classroom = root.parent / 'minigame_design/hatchbeasts/work/web-release'

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def clean(repo):
    if subprocess.check_output(['git', '-C', str(repo), 'status', '--porcelain']).strip():
        if '--resume' not in sys.argv:
            raise RuntimeError(f'Publish checkout has existing changes: {repo}')
        if repo == games:
            changes = subprocess.check_output(['git','-C',str(repo),'status','--porcelain'],text=True).splitlines()
            assert all(line[3:].startswith(('neon-impact/','hatchbeasts/')) for line in changes), 'Unrelated publish checkout changes'

def copy(source, target):
    assert (source/'index.html').is_file(), source
    for p in source.rglob('*'):
        if p.is_file():
            out = target / p.relative_to(source)
            out.parent.mkdir(parents=True, exist_ok=True)
            if not out.exists() or digest(out) != digest(p):
                shutil.copy2(p, out)

for source in (root/'Builds/WebGL',classroom/'h5',classroom/'classroom-site'):
    assert (source/'index.html').is_file(), source
for repo in (games, course):
    clean(repo)
# Existing games and the versioned first lesson must remain byte-identical.
protected = {str(p): digest(p) for name in ('rivals','puzzle-party','witch-potions','wood-exit','foolish-hero','hatchbeasts/v1')
             for p in (games/name).rglob('*') if p.is_file()}
copy(root/'Builds/WebGL', games/'neon-impact')
copy(classroom/'h5', games/'hatchbeasts')
copy(classroom/'classroom-site', course)
assert all(digest(Path(p)) == sha for p, sha in protected.items())
out = root/'logs/web-publish';out.mkdir(parents=True,exist_ok=True)
report = {'protected_files':len(protected),'protected_unchanged':True,
          'game_files':{str(p.relative_to(games/'neon-impact')):digest(p) for p in (games/'neon-impact').rglob('*') if p.is_file()}}
(out/'staged.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(f'Staged Web + both classroom URLs; {len(protected)} existing game files unchanged.')
