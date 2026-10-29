"""Preserve original skill prose; patch changed mechanics and existing numeric claims only."""
import json
import re
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[1]
relative = 'joylings/neon-io/unity/Assets/Resources/Json/String_Feature.json'
baseline = '68ee64704faba2e1a7ea7f8ba7780d7789397a44'

def decode(raw):
    encoding = 'utf-16' if raw[:2] in (b'\xff\xfe', b'\xfe\xff') else 'utf-8-sig'
    return raw.decode(encoding), encoding

original, _ = decode(subprocess.check_output(['git', 'show', baseline + ':' + relative], cwd=root))
originals = {int(row['ID']): row for row in json.loads(original)['String_Feature']}
path = root / 'unity/Assets/Resources/Json/String_Feature.json'
current, encoding = decode(path.read_bytes())

# These are substitutions within the old prose, not replacement descriptions.
zh = {
    5: [('25%傷害', '100點傷害'), ('造成冰凍', '造成緩速60%')],
    9: [('4秒後會爆炸', '5秒後會爆炸')],
    12: [('冷卻3秒', '冷卻2.5秒')],
    14: [('生命低於30%', '生命低於50%'), ('隨機位置', '安全區內的隨機位置'), ('冷卻15秒', '冷卻10秒')],
    16: [('冷卻7秒', '冷卻6秒')],
    19: [('進行連續兩次肉搏攻擊時，第2下攻擊釋放3道', '每次肉搏攻擊命中時釋放1道')],
    20: [('低於40%', '低於3%'), ('恢復4%', '恢復10%')],
    23: [('恢復2.5%', '恢復10%')],
    24: [('冷卻4秒', '冷卻3秒')],
    25: [('冷卻7秒', '冷卻6秒')],
    33: [('上升25%', '上升40%')],
    104: [('增加50%', '增加60%')],
    105: [('並冰凍持續', '並造成緩速60%持續')],
    109: [('隱形1秒', '隱形1.5秒')],
    118: [('無敵1秒', '無敵3秒'), ('冷卻3秒', '冷卻6秒')],
    120: [('冷卻0.7秒', '冷卻0.5秒')],
    121: [('增加20%', '增加50%')],
    130: [('3發羽毛', '6發羽毛')],
    132: [('並冰凍', '並造成緩速60%')],
    204: [('移動50%', '移動70%')],
    206: [('持續1秒', '持續2秒')],
    207: [('敵人冰凍', '敵人緩速60%')],
    209: [('與冰凍持續', '與緩速60%持續')],
    210: [('並冰凍目標', '並使目標緩速60%')],
    216: [('並冰凍', '並造成緩速60%')],
    218: [('冷卻2秒', '冷卻1.5秒')],
    222: [('暈眩持續3秒', '暈眩持續5秒')],
    223: [('並冰凍範圍內敵人', '並使範圍內敵人緩速60%')],
    225: [('冷卻3秒', '冷卻2.5秒')],
    229: [('冷卻4秒', '冷卻3秒')],
}
en = {
    5: [('freeze enemies', 'slow enemies by 60%')],
    9: [('after 4s', 'after 5s')],
    12: [('CD: 3s', 'CD: 2.5s')],
    14: [('below 30%', 'below 50%'), ('a random position', 'a random position inside the safe zone'), ('CD: 15s', 'CD: 10s')],
    16: [('CD: 7s', 'CD: 6s')],
    19: [('Every two melee attacks to generate three electric currents', 'Every melee hit generates one electric current')],
    20: [('below 40%', 'below 3%'), ('heal 4%', 'heal 10%')],
    23: [('heal 2.5%', 'heal 10%')],
    24: [('CD: 4s', 'CD: 3s')],
    25: [('CD: 7s', 'CD: 6s')],
    33: [('by 25%', 'by 40%')],
    104: [('by 50%', 'by 60%')],
    105: [('freeze enemies', 'slow enemies by 60%')],
    118: [('CD: 3s', 'CD: 6s')],
    120: [('CD: 0.7s', 'CD: 0.5s')],
    121: [('by 20%', 'by 50%')],
    130: [('three feathers', 'six feathers')],
    132: [('freeze enemies', 'slow enemies by 60%')],
    204: [('by 50%', 'by 70%')],
    206: [('for 1s', 'for 2s')],
    207: [('freeze enemies', 'slow enemies by 60%')],
    209: [('freeze the enemy', 'slow the enemy by 60%')],
    210: [('freeze them', 'slow them by 60%')],
    216: [('freeze in-range enemies', 'slow in-range enemies by 60%')],
    218: [('CD: 2s', 'CD: 1.5s')],
    223: [('freeze enemies', 'slow enemies by 60%')],
    225: [('CD: 3s', 'CD: 2.5s')],
    229: [('CD: 4s', 'CD: 3s')],
}

def patch_row(match):
    row = json.loads(match[0])
    key = int(row['ID'])
    for language, replacements in [('Chinese', zh), ('English', en)]:
        # Keep current names (including the requested rename), restore the original body.
        if '/' not in originals[key][language]:
            continue
        title = row[language].split('/', 1)[0]
        description = originals[key][language].split('/', 1)[1]
        for old, new in replacements.get(key, []):
            assert old in description, (key, language, old)
            description = description.replace(old, new)
        if key in (11, 122):
            description = ('吸引畫面內的星星飛向自己，' if language == 'Chinese' else
                           'Attract on-screen stars toward yourself. ') + description
        if key == 117:
            description = ('每3秒瞬移到畫面內、安全區中的隨機位置，以半透明分身預告下一次落點' if language == 'Chinese' else
                           'Teleport every 3s to a random on-screen position inside the safe zone. A translucent double previews the next destination.')
        row[language] = title + '/' + description
    return json.dumps(row, ensure_ascii=False)

updated = re.sub(r'\{[^{}]*"ID"[^{}]*\}', patch_row, current)
path.write_bytes(updated.encode(encoding))
print('Restored original descriptions with targeted mechanic/numeric edits.')
