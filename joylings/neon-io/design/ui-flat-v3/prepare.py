"""Copy original UI reference assets; export a small, read-only skill catalogue."""
from pathlib import Path
import json,shutil
from PIL import Image
root=Path(__file__).resolve().parents[2]
out=Path(__file__).resolve().parent
assets=out/'assets';assets.mkdir(exist_ok=True)
def read(name):
    data=(root/'unity/Assets/Resources/Json'/name).read_bytes()
    return json.loads(data.decode('utf-16' if data[:2] in (b'\xff\xfe',b'\xfe\xff') else 'utf-8-sig'),strict=False)
names={row['ID']:row['Chinese'] for row in read('String_Feature.json')['String_Feature']}
features=read('Feature.json')['Feature'];rows=[]
for part in ['Head','Body','Back']:
    for f in [r for r in features if r['FeaturePart']==part][:9]:
        original=root/f"unity/Assets/Resources/Images/Role/{part}/{f['Icon']}.png"
        target=assets/f"skill-{f['ID']}.png";shutil.copy2(original,target)
        image=Image.open(original).convert('RGBA');bbox=image.getchannel('A').getbbox()
        x,y,r,b=bbox;pad=3;x=max(0,x-pad);y=max(0,y-pad);r=min(image.width,r+pad);b=min(image.height,b+pad)
        name,description=names[f['ID']].split('/',1)
        rows.append({'id':int(f['ID']),'part':part,'name':name,'description':description,'file':target.name,'viewBox':[x,y,r-x,b-y],'size':list(image.size)})
(out/'skills.js').write_text('window.NEON_SKILLS = '+json.dumps(rows,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
print(json.dumps({'original_skills':len(features),'preview_skills':len(rows),'parts':3}))
