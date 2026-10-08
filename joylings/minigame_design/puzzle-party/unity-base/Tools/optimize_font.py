"""Keep all encoded characters; discard alternate vertical/regional UI glyphs.

Requires fonttools==4.65.0. The unmodified OFL source is stored outside Assets,
so Unity doesn't include it in Resources. The derivative keeps the same asset
path/GUID for existing references, with a distinct embedded font family name.
"""
from pathlib import Path
import hashlib
import json
import fontTools
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "Tools/Fonts/NotoSansCJKtc-Regular.otf"
OUTPUT = ROOT / "Assets/Rivals/Resources/Fonts/NotoSansTC-Regular.otf"


def main():
    if fontTools.__version__ != '4.65.0':
        raise RuntimeError('Install fonttools==4.65.0 for reproducible font output')
    font = TTFont(SOURCE, recalcTimestamp=False)
    original_cmap = font.getBestCmap().copy()
    original_metrics = {code: font['hmtx'][glyph] for code, glyph in original_cmap.items()}
    options = subset.Options()
    # Keep ordinary shaping (including decomposed Hangul), but this horizontal
    # Traditional Chinese UI doesn't select vertical or other regional forms.
    options.layout_features = ['ccmp', 'calt', 'liga', 'kern', 'mark', 'mkmk', 'ljmo', 'vjmo', 'tjmo']
    options.name_IDs = ['*']
    options.name_languages = ['*']
    options.name_legacy = True
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=original_cmap)
    subsetter.subset(font)
    names = {1: 'Rivals CJK UI', 2: 'Regular', 3: 'RivalsCJKUI-Regular-1',
             4: 'Rivals CJK UI Regular', 6: 'RivalsCJKUI-Regular',
             16: 'Rivals CJK UI', 17: 'Regular'}
    for record in list(font['name'].names):
        if record.nameID in names:
            font['name'].setName(names[record.nameID], record.nameID,
                                 record.platformID, record.platEncID, record.langID)
    cff = font['CFF '].cff
    cff.fontNames = ['RivalsCJKUI-Regular']
    cff.topDictIndex[0].FamilyName = 'Rivals CJK UI'
    cff.topDictIndex[0].FullName = 'Rivals CJK UI Regular'
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    font.save(OUTPUT)
    rebuilt = TTFont(OUTPUT)
    current_cmap = rebuilt.getBestCmap()
    assert original_cmap.keys() == current_cmap.keys(), 'Encoded character coverage changed'
    assert all(rebuilt['hmtx'][current_cmap[c]] == original_metrics[c] for c in original_cmap), 'Glyph advances changed'
    result = {'sourceSha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
              'outputSha256': hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),
              'originalBytes': SOURCE.stat().st_size, 'optimizedBytes': OUTPUT.stat().st_size,
              'encodedCharacters': len(current_cmap), 'glyphs': len(rebuilt.getGlyphOrder()),
              'allCharacterWidthsPreserved': True, 'fonttoolsVersion': '4.65.0'}
    (ROOT / 'Tools/font-optimization.json').write_text(json.dumps(result, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(result))


if __name__ == '__main__':
    main()
