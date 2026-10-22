"""Build editable, font-outlined SVG title artwork. No runtime font dependency.

Rasterize with rasterize-wordmarks.cjs after running this file. Fonts are the
project's OFL-licensed Noto Sans TC and Cinzel; their licenses ship alongside them.
"""
import json
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'design/wordmarks'
FONTS = ROOT / 'unity/Assets/Resources/Astral/Fonts'
TITLES = {
    'brand': ('星際遊俠', 'NOVAROVE'),
    'duel': ('頂尖對決', 'CHALLENGE'),
    'infinity': ('無際戰場', 'INFINITY WAR'),
    'collection': ('收藏', 'COLLECTION'),
    'skills': ('選擇技能', 'CHOOSE A SKILL'),
    'settings': ('設定', 'SETTINGS'),
    'matching': ('正在尋找對手', 'FINDING AN OPPONENT'),
    'ready': ('對手已就緒', 'OPPONENT READY'),
    'tutorial': ('遊玩教學', 'HOW TO PLAY'),
    'confirm': ('確認操作', 'CONFIRM'),
    'notice': ('提示', 'NOTICE'),
    'processing': ('正在處理', 'PLEASE WAIT'),
    'options': ('選擇設定', 'SELECT OPTION'),
}


def artwork(value, language, brand):
    font = TTFont(FONTS / ('NotoSansTC-Medium.ttf' if language == 'zh' else 'Cinzel-SemiBold.ttf'))
    glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
    scale = (100 if brand else 80) / font['head'].unitsPerEm
    x, paths, bounds = 2, [], []
    tracking = 12 if language == 'zh' else 6
    for index, char in enumerate(value):
        glyph = glyphs[cmap[ord(char)]]
        pen, box = SVGPathPen(glyphs), BoundsPen(glyphs)
        glyph.draw(pen); glyph.draw(box)
        if box.bounds:
            bounds.append(box.bounds)
            ink = '#cbb477' if brand and index >= (2 if language == 'zh' else 4) else '#eee9dc'
            paths.append(f'<path fill="{ink}" transform="translate({x:.3f},0) scale({scale:.6f},-{scale:.6f})" d="{pen.getCommands()}"/>')
        x += glyph.width * scale + (tracking if char != ' ' else 0)
    top = max(b[3] for b in bounds) * scale
    bottom = -min(b[1] for b in bounds) * scale
    width, height = round(x - tracking + 2), round(top + bottom + (32 if brand else 23))
    # Two flat inks, a short navigation-star underline and deliberate tracking.
    # Paths keep Chinese/English lettering crisp and portable in every build.
    text = ''.join(paths)
    rule_y = height - 8
    line_end = min(width - 4, 180 if brand else 100)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width*3}" height="{height*3}" viewBox="0 0 {width} {height}">
<title>{value}</title>
<defs><mask id="cut"><rect width="100%" height="100%" fill="white"/><path stroke="black" stroke-width="1.1" d="M0 {top*.43+2:.2f}H{width}"/></mask></defs>
<g mask="url(#cut)"><g transform="translate(0,{top+2:.3f})">{text}</g></g>
<g fill="none" stroke="#cbb477" stroke-width="1.5"><path d="M2 {rule_y}H{line_end}"/></g>
<path fill="#cbb477" d="M{line_end+12} {rule_y-5}l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5Z"/>
</svg>'''


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for key, names in TITLES.items():
        for language, title in zip(('zh', 'en'), names):
            (OUT / f'{key}-{language}.svg').write_text(artwork(title, language, key == 'brand'), encoding='utf-8')
    (OUT / 'titles.json').write_text(json.dumps(TITLES, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Outlined {len(TITLES)*2} bilingual title artworks')
