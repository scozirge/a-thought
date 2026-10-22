"""Preserve the 1.1.1 gameplay audit reports and the exact binaries tested."""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'verification/2026-10-22-gameplay'
RUNS = {
    'windows-skills-audit': ('neon-validation-2e87f0821bf4', 1),
    'windows-ten-player': ('neon-validation-6a9758fff211', 10),
    'windows-cancel-retry': ('neon-validation-f6a616264137', 2),
    'windows-challenge': ('neon-validation-b15c37279902', 2),
    'windows-reconnect': ('neon-validation-4702d8330257', 2),
    'windows-loot': ('neon-validation-ba71bd749562', 2),
}


def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def save(name, data):
    (OUT / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def copy_report(source, name):
    data = read(source)
    assert data['passed'], (source, data.get('failure'))
    shutil.copy2(source, OUT / name)
    return data


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for label, (run, count) in RUNS.items():
        for i in range(count):
            data = copy_report(ROOT / 'logs' / run / f'peer-{i}.json', f'{label}-{i}.json')
            assert data['errors'] == 0
    copy_report(ROOT / 'logs/neon-lifecycle-4448366b1f4c/lifecycle-summary.json', 'windows-lifecycle.json')
    ui = copy_report(ROOT / 'logs/audit-ui-isolated/report.json', 'windows-ui.json')
    for run in ('web-audit-final-local', 'web-audit-public'):
        data = copy_report(ROOT / 'logs' / run / 'report.json', run + '.json')
        assert data['errors'] == [] and data['gameplayAudit']['passed']
        assert min(data['peerCounts']) >= 2
    deployment = read(ROOT / 'logs/gameplay-publish/public-deployment.json')
    assert deployment['public_assets_match_local'] and deployment['deployment']['conclusion'] == 'success'
    save('public-deployment.json', deployment)
    package = read(ROOT / 'logs/gameplay-publish/windows-package.json')
    assert package['sha256'] == sha(ROOT / 'Builds' / package['file'])
    save('windows-package.json', package)

    integrity = json.loads(subprocess.check_output(
        [sys.executable, str(ROOT / 'tests/content_integrity.py')], text=True, encoding='utf-8'))
    assert integrity['passed']
    save('source-integrity.json', integrity)
    original = Path('E:/Projects/Neon-IO/Neon IO/Assets')
    assets = ROOT / 'unity/Assets'
    intro = [assets / 'Scenes/Init.unity', *(assets / 'Resources/Animator/Logo').glob('*')]
    comparisons = [{'path': p.relative_to(assets).as_posix(), 'sha256': sha(p),
                    'matches_original': sha(p) == sha(original / p.relative_to(assets))}
                   for p in intro if p.is_file()]
    assert all(p['matches_original'] for p in comparisons)
    save('original-intro.json', {'passed': True, 'files': comparisons})
    paths = [ROOT / 'Builds/Windows/NeonImpact.exe',
             ROOT / 'Builds/Windows/NeonImpact_Data/Managed/Assembly-CSharp.dll',
             *(ROOT / 'Builds/WebGL').rglob('*')]
    files = [{'path': p.relative_to(ROOT).as_posix(), 'bytes': p.stat().st_size, 'sha256': sha(p)}
             for p in paths if p.is_file()]
    save('build-identity.json', {'versions': ['1.1.1-fusion', '1.1.1-web'], 'files': files})
    build_checks = {}
    for log in ('windows.log', 'web-build.log'):
        lines = (ROOT / 'logs' / log).read_text(encoding='utf-8-sig', errors='replace').splitlines()
        build_checks[log] = [line for line in lines if line.startswith('NEON_') and '_OK' in line]
        assert any('BUILD_OK' in line for line in build_checks[log])
    save('build-checks.json', build_checks)

    # Keep failed observations too; they are not presented as successful tests.
    failures = OUT / 'earlier-observations'
    failures.mkdir(exist_ok=True)
    for label, run in [('counter-unavailable', 'neon-validation-7a05ebcf2cbf'),
                       ('expected-sdk-cancellation', 'neon-validation-611dec41da7d'),
                       ('concurrent-loot-timeout', 'neon-validation-9bffaf7fddfe')]:
        for source in (ROOT / 'logs' / run).glob('peer-?.json'):
            shutil.copy2(source, failures / (label + '-' + source.name))
    shutil.copy2(ROOT / 'logs/audit-ui-release/report.json', failures / 'concurrent-ui.json')

    gallery = ROOT / 'design/gameplay-audit'
    gallery.mkdir(parents=True, exist_ok=True)
    for name in ('intro.png', 'lobby-0.png', 'collection.png', 'battle-live-0.png', 'battle-live-1.png'):
        shutil.copy2(ROOT / 'logs/web-audit-public' / name, gallery / name)
    figures = ''.join(f'<figure><img src="{p.name}" loading="lazy"><figcaption>{p.stem}</figcaption></figure>'
                      for p in gallery.glob('*.png'))
    (gallery / 'index.html').write_text('<!doctype html><meta charset="utf-8"><title>Neon Impact 1.1.1 實測</title>'
        '<style>body{background:#10172b;color:#eee;font:18px system-ui;max-width:1280px;margin:30px auto}'
        'img{max-width:100%}figure{margin:24px 0}</style><h1>Neon Impact 1.1.1 公開版實際畫面</h1>' + figures,
        encoding='utf-8')
    print(json.dumps({'reports': len(list(OUT.glob('*.json'))), 'ui_screens': len(ui['screens']),
                      'ui_assertions': len(ui['checks']), 'original_media': integrity['original_media_animation_shader_files']}))


if __name__ == '__main__':
    main()
