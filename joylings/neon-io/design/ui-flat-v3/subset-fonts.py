"""Build self-hosted, licensed font subsets from the actual prototype copy."""
from pathlib import Path
from fontTools import subset

folder = Path(__file__).resolve().parent
fonts = folder.parents[1] / 'unity/Assets/Resources/Astral/Fonts'
text = ''.join(p.read_text(encoding='utf-8') for pattern in ('*.html', '*.js', '*.css') for p in folder.glob(pattern))
text += ''.join(chr(n) for n in range(32, 127)) + '↗→⚙✦'
for source, target, chars in [('NotoSansTC-Medium.ttf', 'neon-tc.woff2', text), ('Cinzel-SemiBold.ttf', 'neon-display.woff2', 'NEON IMPACT0123456789')]:
    options = subset.Options()
    options.flavor = 'woff2'
    font = subset.load_font(str(fonts / source), options)
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=chars)
    subsetter.subset(font)
    subset.save_font(font, str(folder / 'assets' / target), options)
    print(target, (folder / 'assets' / target).stat().st_size)
