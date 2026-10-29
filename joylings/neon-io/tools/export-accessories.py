"""Export the actual accessory catalog; no Unity process or gameplay test is started."""
import json, re, html, yaml
from pathlib import Path

root = Path(__file__).resolve().parents[1]
assets = root / 'unity/Assets'
def read(path):
    raw=path.read_bytes()
    return raw.decode('utf-16' if raw[:2] in (b'\xff\xfe',b'\xfe\xff') else 'utf-8-sig')
features = json.loads(read(assets/'Resources/Json/Feature.json'))['Feature']
strings = {x['ID']: x for x in json.loads(read(assets/'Resources/Json/String_Feature.json'))['String_Feature']}
parts = {'Head':'頭部','Body':'身體','Back':'背部'}
settings={x['ID']:x['Value'] for x in json.loads(read(assets/'Resources/Json/GameSetting.json'))['GameSetting']}
base_damage=float(settings['Damage']); duel_damage=float(settings['Damage_C'])
buffs=['暈眩','燃燒','緩速60%','虛弱50%','無敵','格擋','全傷害提升','移速提升','幽靈','持續恢復','立即治療','流血','吸星','隱形','傳送','方向提示','肉搏傷害提升','技能傷害提升','擊退減免','圈外詛咒']
triggers=['受擊','死亡','靜止','低血量','任何攻擊命中','技能命中','肉搏命中','受到肉搏','未受傷','取得經驗','週期觸發','取得技能時','結束靜止','受擊且低血量','結束未受傷','受到技能攻擊']
combat=assets/'Resources/Gameobjects/Battle'
prefabs={}
for meta in combat.rglob('*.prefab.meta'):
    guid=re.search(r'^guid: (\w+)',read(meta),re.M)
    if guid:prefabs[guid[1]]=Path(str(meta)[:-5])
def components(path):
    raw=read(path)
    raw=re.sub(r'^%[^\n]*\n','',raw,flags=re.M)
    raw=re.sub(r'^--- !u!\d+ &[^\n]+','---',raw,flags=re.M)
    return list(yaml.safe_load_all(raw))
def combat_values(path,seen=None):
    seen=set() if seen is None else seen
    if path in seen or not path.exists():return []
    seen.add(path); result=[]
    for doc in components(path):
        c=(doc or {}).get('MonoBehaviour')
        if not c:continue
        details=[]
        if 'ValuePercent' in c or 'FixedDamage' in c:
            ratio=float(c.get('ValuePercent',1)); basis='肉搏攻擊力' if c.get('ReplaceAttack') else '技能攻擊力'
            if c.get('FixedDamage',-1)>=0:
                details.append(f'固定基準傷害：{c["FixedDamage"]}／{c["FixedDamage"]}（一般／對決）；仍套用增傷與虛弱比例')
            else:details.append(f'單次接觸傷害係數：{ratio:g} × {basis}；基準傷害 {round(base_damage*ratio)}／{round(duel_damage*ratio)}（一般／對決）')
        if 'RangeScale' in c:details.append(f'作用半徑／視覺縮放：{c["RangeScale"]} 倍')
        if 'WaitToBoomTime' in c:details.append(f'延遲爆炸：{c["WaitToBoomTime"]} 秒')
        for key,label in [('Interval','施放間隔'),('AmmoNum','每次生成數'),('TriggerTargetCD','同目標觸發間隔'),('TriggerCD','接觸觸發間隔'),('LifeTime','存在秒數')]:
            if key in c:details.append(f'{label}：{c[key]}')
        if 'TriggerType' in c:
            t=int(c['TriggerType']);details.append('觸發：'+(triggers[t] if 0<=t<len(triggers) else str(t))+'；條件參數 '+str(c.get('ValueList',[])))
        for key in ['SelfBuffers','Buffers']:
            for b in c.get(key,[]) or []:
                t=int(b['Type']); name=buffs[t] if 0<=t<len(buffs) else str(t)
                value=b.get('Value',0)
                suffix=f'數值 {value}'
                if t in (6,16,17):suffix=f'加成 {float(value)*100:g}%'
                if t==1:suffix=f'每 {settings["BurnTriggerInterval"]} 秒扣目標最大生命 {float(settings["BurnDamage"])*100:g}%（每跳取整數）'
                if t==11:suffix=f'每 {settings["BleedTriggerInterval"]} 秒扣目標最大生命 {float(settings["BleedDamage"])*100:g}%（每跳取整數）'
                details.append(('自身' if key=='SelfBuffers' else '命中目標')+f'：{name}，Time={b.get("Time",0)}，{suffix}，Value2={b.get("Value2",0)}')
        if details:result.append({'prefab':path.stem,'source':str(path.relative_to(root)),'details':details})
        # Only follow gameplay prefab references, not particles, sounds, or textures.
        def refs(v):
            if isinstance(v,dict):
                if v.get('guid') in prefabs:yield prefabs[v['guid']]
                for x in v.values():yield from refs(x)
            elif isinstance(v,list):
                for x in v:yield from refs(x)
        for target in refs(c):result.extend(combat_values(target,seen))
    return result
rows = []
for f in features:
    name, _, description = strings[f['ID']]['Chinese'].partition('/')
    prefab = assets / ('Resources/Gameobjects/Battle/Skill/Skill-'+f['FeatureType'].strip()+'.prefab')
    text = prefab.read_text(encoding='utf-8-sig') if prefab.exists() else ''
    parameters = re.findall(r'^  (?!m_)([A-Za-z][A-Za-z0-9_]*): ([^\r\n]+)', text, re.M)
    parameters = [(k,v) for k,v in parameters if re.fullmatch(r'-?[\d.]+',v)]
    rows.append(dict(id=int(f['ID']),part=parts[f['FeaturePart']],name=name,description=description,
        acquisition={'Free':'初始配件','Star':'星幣','Kred':'付費（尚未接金流）'}[f['SoldType']],
        price=f.get('Star',f.get('Kred','0')),skill=f['FeatureType'],parameters=parameters,
        source=str(prefab.relative_to(root)),combat=combat_values(prefab)))
out=root/'docs/accessories';out.mkdir(parents=True,exist_ok=True)
(out/'catalog.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
body=[]
for r in rows:
    damage='\n\n'.join(x['prefab']+'\n'+'\n'.join(x['details']) for x in r['combat'])
    if not any('傷害係數' in line or '固定基準傷害' in line for x in r['combat'] for line in x['details']):
        damage='未發現直接傷害係數；請看下列被動／增益效果，不等於總傷害為零。\n\n'+damage
    cells=[str(r['id']),r['part'],r['name'],r['description'],damage,r['acquisition']+' '+r['price'],
           r['skill'], '\n'.join(k+' = '+v for k,v in r['parameters'])]
    body.append('<tr>'+''.join('<td>'+html.escape(c)+'</td>' for c in cells)+'</tr>')
page='''<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>星際遊俠 配件能力清單</title><style>body{font:16px system-ui;background:#10192b;color:#eee;margin:24px}h1{color:#d8bd77}input{padding:12px;width:min(90%,480px)}table{border-collapse:collapse;width:100%;margin-top:20px}th,td{padding:14px;border-bottom:1px solid #586070;text-align:left;vertical-align:top;white-space:pre-line}th{color:#d8bd77}td:nth-child(4){min-width:270px}td:last-child{font:12px monospace;min-width:180px}.wrap{overflow:auto}</style><h1>星際遊俠：95 個配件能力清單</h1><p>搜尋名稱、部位或技能。能力敘述來自遊戲文案；右欄是技能 prefab 原始參數，未經實戰校對，不代表完整最終傷害。子彈與被動效果另有設定。</p><p>付費價格沿用原本 Kreds 資料，並非台幣售價。升級數值尚待設計，未接上商店交易驗證。</p><input id="q" placeholder="搜尋配件、能力或部位"><div class="wrap"><table><thead><tr><th>ID</th><th>部位</th><th>名稱</th><th>能力說明</th><th>取得／原價格</th><th>技能識別字</th><th>原始參數</th></tr></thead><tbody>'''+''.join(body)+'''</tbody></table></div><script>q.oninput=()=>document.querySelectorAll('tbody tr').forEach(r=>r.hidden=!r.textContent.toLowerCase().includes(q.value.toLowerCase()))</script></html>'''
page=page.replace('<th>取得／原價格</th>','<th>傷害數值／觸發與增益</th><th>取得／原價格</th>')
page=page.replace('td:last-child{','td:nth-child(5){min-width:380px;color:#ead59f}td:last-child{')
page=page.replace('搜尋名稱、部位或技能。能力敘述來自遊戲文案；右欄是技能 prefab 原始參數，未經實戰校對，不代表完整最終傷害。子彈與被動效果另有設定。',
    f'已追加技能、子彈與衍生爆炸 prefab 的傷害係數及被動增益。比較基準：一般攻擊力 {base_damage:g}、對決攻擊力 {duel_damage:g}；先不計增傷、虛弱、減傷、持續傷害。數字是單次接觸計算值，並非每次施放總傷害或 DPS；多發不保證全部命中。治療／反射／格擋類元件仍需依其行為解讀，零係數不代表沒有作用。')
page=page.replace('<p>付費價格', '<p>來源：有 FixedDamage 時，以固定基準傷害乘上目前攻擊力／基礎攻擊力，保留增傷與虛弱；其餘使用攻擊力 × ValuePercent。替代肉搏的 MeleeAmmo 使用肉搏攻擊力。自身增益另列，未加入基準傷害。Time 與條件參數是原始資料，0 的意義依效果實作而異。仍需實戰驗證。</p><p>付費價格')
page=page.replace('<input id="q"', '<p><a style="color:#a8d9df" href="../bot-strategy/index.html">查看三階 Bot 與 95 個配件的戰術分析</a></p><input id="q"')
(out/'index.html').write_text(page,encoding='utf-8')
print(f'Exported {len(rows)} accessories: '+str(out/'index.html'))
