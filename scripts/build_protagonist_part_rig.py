#!/usr/bin/env python3
"""Package the protagonist's ORIGINAL 17+8 PNG into a non-destructive
separate, genuinely articulated PartRig character, keeping official V4 intact.

No cropping/splitting, generative drawing or re-encoding of part textures.
`protagonist` stays the approved V4, while `protagonist-rig-v1`
is the opt-in playable per-bone experiment in the auto registered game library.
"""
import io
import json
import hashlib
import shutil
from copy import deepcopy
import subprocess
from pathlib import Path
from zipfile import ZipFile
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'site/assets/l2d/v4/protagonist-original-parts.zip'
DEST=ROOT/'site/assets/l2d/library/protagonist-rig-v1'
CHAR='protagonist-rig-v1'

JS=r"""
const fs=require('node:fs');
let window={};
new Function('window',fs.readFileSync('site/l2d/part-rig.js','utf8'))(window);
const data=JSON.parse(fs.readFileSync(0,'utf8'));
const parts=data.parts.map(p=>({...p,canvas:{width:p.w,height:p.h}}));
const model=window.PaperchalkPartRigCore.project(parts,data.characterId,data.face);
process.stdout.write(JSON.stringify(model));
"""

def build():
    if not SRC.is_file():
        raise FileNotFoundError("Original protagonist 25-layer archive is missing")
    with ZipFile(SRC) as z:
        data=json.loads(z.read('layers.json'))
        sections=data.get('layers',{})
        if len(sections.get('front',[]))!=17 or len(sections.get('back',[]))!=8:
            raise ValueError('Refuse to create substitute layer art: expected exact 17+8')
        DEST.mkdir(parents=True,exist_ok=True)
        views={}
        for face in ('front','back'):
            raw=sections[face]
            stage=Image.new('RGBA',(1024,1024),(0,0,0,0))
            meta=[]
            textures={}
            seen=set()
            for item in raw:
                ident=item.get('id')
                if not isinstance(ident,str) or not ident or ident in seen:
                    raise ValueError(f'{face}: duplicate/invalid actual part ID {ident}')
                seen.add(ident)
                source=item['file']
                blob=z.read(source)
                with Image.open(io.BytesIO(blob)) as pic:
                    im=pic.convert('RGBA')
                    w,h=im.size
                    if item.get('visible',True):
                        opacity=float(item.get('opacity',1))
                        if opacity<0 or opacity>1:raise ValueError('Invalid original opacity')
                        if opacity<1:
                            a=im.getchannel('A').point(lambda k:round(k*opacity))
                            im.putalpha(a)
                        stage.alpha_composite(im,(int(item['x']),int(item['y'])))
                part_file=f'parts/{face}/{ident}.png'
                out=DEST/part_file
                out.parent.mkdir(parents=True,exist_ok=True)
                out.write_bytes(blob)
                textures[ident]=part_file
                meta.append({'partId':ident,'name':item.get('name',ident),
                    'x':item['x'],'y':item['y'],'w':w,'h':h,
                    'sourcePart':True,'visible':item.get('visible',True),
                    'opacity':item.get('opacity',1)})
            result=subprocess.run(['node','-e',JS],input=json.dumps({
                'characterId':CHAR,'face':face,'parts':meta
            }),text=True,capture_output=True,check=True,cwd=ROOT)
            rig=json.loads(result.stdout)
            assert len(rig['parts'])==len(raw)
            assert list(rig['parts'])==[p['partId'] for p in meta]
            assert any(p['bones'] for p in rig['parts'].values())
            for item in meta:
                rig['parts'][item['partId']]['enabled']=bool(item['visible'])
            rig_file=face+'.rig.json'
            (DEST/rig_file).write_text(json.dumps(rig,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
            poster=face+'.png'
            stage.save(DEST/poster,optimize=True)
            views[face]={'portrait':poster,'rig':{
                'type':'part-mesh','file':rig_file,'textures':textures}}
        module={'schema':1,'id':CHAR,
            'label':'女主角 · 原始25层独立骨骼实验版',
            'views':views}
        (DEST/'module.json').write_text(json.dumps(module,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
        digest=hashlib.sha256(SRC.read_bytes()).hexdigest()
        print('PASS protagonist separate playable ArtMesh with real PSD-derived PNG: '
              'front=17,back=8,source sha256='+digest)



# One canonical protagonist: approved 17-part standing FRONT is the base.
# The battle PSD contributes only two REAL arm textures + one REAL axe.
# This generated bundle is INTERNAL (catalog binds it to 'protagonist');
# there is never a second game character or a replacement body/head/legs.
UNIFIED=ROOT/'site/assets/l2d/library/protagonist-unified-v1'
BATTLE=ROOT/'site/assets/l2d/library/protagonist-battle-front'
BATTLE_PIECES={
    'handwear_r':'battle_handwear_r',
    'handwear_l':'battle_handwear_l',
    'axe_held':'battle_axe',
}
IDLE_HANDS='sleeves_and_hands'

def build_unified():
    src=json.loads((DEST/'front.rig.json').read_text(encoding='utf8'))
    battle=json.loads((BATTLE/'front.rig.json').read_text(encoding='utf8'))
    if len(src['parts'])!=17 or len(battle['parts'])!=24:
        raise ValueError('Heroine merge requires the authentic standing 17 PSD parts and battle 24 parts')
    original=json.loads((DEST/'module.json').read_text(encoding='utf8'))
    ordered=src['parts']
    if IDLE_HANDS not in ordered:
        raise ValueError('Original standing arms were not found; reject fake pose')
    UNIFIED.mkdir(parents=True,exist_ok=True)
    (UNIFIED/'parts/front').mkdir(parents=True,exist_ok=True)
    shutil.copyfile(DEST/'front.png',UNIFIED/'front.png')
    textures={}
    for key,uri in original['views']['front']['rig']['textures'].items():
        rel=f'parts/front/{key}.png'
        shutil.copyfile(DEST/uri,UNIFIED/rel)
        textures[key]=rel
    for source_id,variant_id in BATTLE_PIECES.items():
        if variant_id in ordered or source_id not in battle['parts']:
            raise ValueError('Missing authentic battle arm/weapon or duplicate part ID')
        image_path=BATTLE/'front'/f'{source_id}.png'
        if not image_path.is_file():
            raise ValueError(f'Missing original battle texture {image_path}')
        rel=f'parts/front/{variant_id}.png'
        shutil.copyfile(image_path,UNIFIED/rel)
        textures[variant_id]=rel
        part=deepcopy(battle['parts'][source_id])
        part['id']=variant_id
        part['name']={'battle_handwear_r':'战斗后侧手臂（原PSD）',
                      'battle_handwear_l':'战斗持斧手臂（原PSD）',
                      'battle_axe':'战斗斧头（原PSD）'}[variant_id]
        part['parentId']='battle_handwear_l' if variant_id=='battle_axe' else 'torso'
        part['enabled']=True
        if variant_id=='battle_axe':
            part['bones']=[]
            part['kind']='fixed'
        ordered[variant_id]=part
    # Back-to-front is a formal property of the model, not dictionary order.
    src['characterId']='protagonist-unified-v1'
    src['characterFamilyId']='protagonist'
    src['partLayerGroups']={
        'shared':list(original['views']['front']['rig']['textures']),
        'idleArms':[IDLE_HANDS],
        'battleArms':['battle_handwear_r','battle_handwear_l'],
        'weapons':['battle_axe'],
    }
    src['actionProfiles']={
        'default':'idle','transitionMs':260,
        'actions':{
            'idle':{'label':'原始站立',
                    'parts':{IDLE_HANDS:{'opacity':1},
                             'battle_handwear_r':{'opacity':0},
                             'battle_handwear_l':{'opacity':0},
                             'battle_axe':{'opacity':0}}},
            'combat':{'label':'站立主体＋战斗手臂／长斧',
                    'parts':{IDLE_HANDS:{'opacity':0},
                             'battle_handwear_r':{'opacity':1},
                             'battle_handwear_l':{'opacity':1},
                             'battle_axe':{'opacity':1}}},
        }
    }
    if len(src['parts'])!=20 or set(src['parts'])!=set(textures):
        raise ValueError('Heroine rig must contain 17 unchanged standing parts + 3 PSD battle parts')
    (UNIFIED/'front.rig.json').write_text(json.dumps(src,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    meta={'schema':1,'id':'protagonist-unified-v1',
          'label':'女主角 · 站立为主 + 局部战斗替换',
          'familyId':'protagonist','variantCategory':'internal',
          'actions':['idle','combat'],
          'views':{'front':{'portrait':'front.png',
                            'rig':{'type':'part-mesh','file':'front.rig.json','textures':textures}}}}
    (UNIFIED/'module.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print('PASS canonical heroine combined: 17 authentic standing base meshes, '
          '2 genuine battle arms and 1 weapon. Base standing face/torso/skirt/legs/feet unchanged.')

if __name__=='__main__':
    build()
    build_unified()
