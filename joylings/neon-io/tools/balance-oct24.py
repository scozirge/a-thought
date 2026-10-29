"""Apply the requested October 24 accessory balance; safe to repeat scalar assignments."""
from pathlib import Path
import re,json
root=Path(__file__).resolve().parents[1]; assets=root/'unity/Assets'; changes=[]
def read(p):
    b=p.read_bytes();enc='utf-16' if b[:2] in (b'\xff\xfe',b'\xfe\xff') else 'utf-8-sig'
    return b.decode(enc),enc
def save(p,s,enc):
    p.write_bytes(s.encode(enc));changes.append(str(p.relative_to(root)))
def prefab(name,fields=None,values=None,buff=None):
    matches=list((assets/'Resources/Gameobjects/Battle').rglob(name+'.prefab'))
    assert len(matches)==1,(name,matches)
    p=matches[0];s,enc=read(p)
    for k,v in (fields or {}).items():
        pattern=r'^  '+k+r':[^\r\n]*'
        if re.search(pattern,s,re.M):s=re.sub(pattern,'  '+k+': '+str(v),s,flags=re.M)
        else:
            assert k in ('FixedDamage','RangeScale'),(name,k)
            anchor='  ValuePercent:' if '  ValuePercent:' in s else '  LifeTime:'
            assert anchor in s,(name,k)
            s=s.replace(anchor,f'  {k}: {v}\n'+anchor,1)
    if values is not None:
        s,n=re.subn(r'  ValueList:\r?\n(?:  - [^\r\n]*\r?\n)+','  ValueList:\n'+''.join(f'  - {v}\n' for v in values),s)
        assert n,(name,'ValueList')
    for typ,field,val in buff or []:
        pattern=r'(  - Type: '+str(typ)+r'\r?\n(?:(?!  - Type:|  \w+:)[\s\S])*?)' # use explicit serialized BufferData shape
        pattern=r'(  - Type: '+str(typ)+r'\r?\n    Time: [^\r\n]*\r?\n    Value: [^\r\n]*\r?\n    Value2: [^\r\n]*)'
        def patch(m):return re.sub(r'(    '+field+r': )[^\r\n]*',lambda x:x[1]+str(val),m[0])
        s,n=re.subn(pattern,patch,s);assert n,(name,typ,field)
    save(p,s,enc)
fixed={'Ammo-Icicle':100,'Ammo-QuadrupleIcicle':100,'Melee-CircularBlade':100,'Ammo-NailSplash':80,'Ammo-TraceBalloon':300,'Ammo-Carrot':200,'Melee-FrozenSpray':20,'Ammo-FireBall':300,'Ammo-Beam':50,'Ammo-Claw':80,'Melee-DarkExplosion':150,'Ammo-Scratch':40,'Ammo-QuadrupleBlade':60,'Ammo-ConsecutiveFist':100,'Ammo-HeartAmmo':70,'Melee-MagneticField':120,'Ammo-TrackGenie':40,'Ammo-QuadrupleSword':80}
for name,value in fixed.items():prefab(name,{'FixedDamage':value})
prefab('Bomb-Confetti',{'FixedDamage':300})
for name,value in {'UpAheadBubble':2.5,'TraceBalloon':3,'SoundWave':6,'Beam':.5,'ElectricBall':1.5,'WhippingTop':2.5,'BubbleSplash':3}.items():prefab('Skill-'+name,{'Interval':value})
prefab('Bomb-DuckEgg',{'WaitToBoomTime':5,'RangeScale':1.3})
prefab('Skill-Invisible',buff=[(13,'Time',4)])
prefab('Skill-Teleport',values=[10,.5])
prefab('Skill-Constitution',values=[6])
prefab('Skill-EliteHunt',{'AmmoNum':1},values=[0,1,0])
prefab('Skill-Rest',values=[1,.03,0],buff=[(10,'Value',.1)])
prefab('Ammo-WoeShare',{'LifeTime':4})
prefab('Skill-Berserker',buff=[(10,'Value',.1)])
prefab('Melee-KnockWave',buff=[(0,'Time',2)])
prefab('Melee-PowerfulStrike',{'ValuePercent':1.5})
prefab('Skill-FocalMove',buff=[(7,'Value',.4)])
prefab('Skill-Flee',buff=[(7,'Value',.6)])
prefab('Melee-ReflectAmmoShell',{'RangeScale':1.2})
prefab('Skill-IntermittentInvisible',buff=[(13,'Time',1.5)])
prefab('Skill-Escape',{'TriggerType':10},values=[3])
prefab('Skill-Immortal',values=[6],buff=[(4,'Time',3)])
prefab('Ammo-KnockShock',{'KnockIntensity':6000})
prefab('Skill-PowerfulMelee',buff=[(16,'Value',.5),(18,'Value',.5)])
prefab('Bomb-Cannon',{'RangeScale':1.5})
prefab('Bomb-ReactionForce',{'RangeScale':1.5})
prefab('Skill-FeatherSplash',{'AmmoNum':6,'AmmoInterval':.1,'StartAngle':0,'AngleInterval':0})
prefab('Skill-Rush',buff=[(7,'Value',.7)])
prefab('Skill-Ghost',buff=[(8,'Time',2)])
prefab('Bomb-WebShoot',buff=[(0,'Time',5)])
p=assets/'Resources/Json/GameSetting.json';s,enc=read(p)
for key,value in [('FreezeMove','.6'),('SickDamageReduce','.5')]:s=re.sub(r'("ID":"'+key+r'",\s*"Value":")[^"]+',lambda m:m[1]+value,s)
save(p,s,enc)
# Escape is controlled by the preview component; remove the legacy hit/cycle teleport.
p=assets/'Resources/Gameobjects/Battle/Skill/Skill-Escape.prefab';s,enc=read(p)
s=re.sub(r'  SelfBuffers:\r?\n(?:  - Type:[^\n]*\n(?:    [^\n]*\n)*)+', '  SelfBuffers: []\n',s)
save(p,s,enc)
# Keep original skill prose; only update changed mechanics and existing values.
import runpy
runpy.run_path(str(root/'tools/restore-feature-descriptions.py'), run_name='__main__')
p=assets/'Resources/Json/String_UI.json';s,enc=read(p)
s=s.replace('"Chinese":"冰凍"','"Chinese":"緩速"').replace('"English":"FREEZE"','"English":"SLOW"')
s=s.replace('降低30%移動與技能冷卻速度','降低60%移動速度，不影響技能冷卻').replace('Slow down move speed and cooldown by 30%','Reduce movement speed by 60%; cooldowns are unaffected')
save(p,s,enc)
print('Changed',len(set(changes)),'balance assets')
