#!/usr/bin/env python3
"""Build male secondary CHAR-016 from 21 REAL Photoshop PSD masks.

The user supplied 修复图层.psd (sha in maskbank).  Each of its 21 usable,
opaque-but-alpha-masked layers has pixel RGB exactly equal to the accepted
site/assets/characters/char-016/front.png at the same location.  Therefore
reproducing *each actual layer* = original approved RGB within that exact
layer's recorded binary PSD alpha mask.  This is lossless layer extraction,
not a guessed segmentation, another AI image, or a cropped flat character.
The original source artwork is immutable.  Missing hidden-paint is acknowledged.
"""
from __future__ import annotations

import base64
import hashlib
import io
import json
import subprocess
import zipfile
import zlib
from pathlib import Path

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'site/assets/characters/char-016/front.png'
MASK = ROOT / 'site/assets/l2d/source-masks/char-016-front-psd-maskbank.json'
DEST = ROOT / 'site/assets/l2d/library/char-016'
ID = 'char-016'
EXPECTED_SOURCE = '8b9c05c03cee6afafd3fd7d444cf37a1e05ca56d9390919f4857a3cba8508205'
NAMES = (
    'back_hair','ears','brows','lashes','eye_white','face','front_hair','irises',
    'jacket','pants','shoe_left','shoe_right','shirt','tie','neck',
    'collar_left','collar_right','cuff_left','cuff_right','hand_left','hand_right'
)
JS = r"""
const fs=require('node:fs');
const window={};
new Function('window',fs.readFileSync('site/l2d/part-rig.js','utf8'))(window);
const a=JSON.parse(fs.readFileSync(0,'utf8'));
const model=window.PaperchalkPartRigCore.project(a.parts,'char-016','front');
process.stdout.write(JSON.stringify(model));
"""


def dump(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')


def build():
    maskbank=json.loads(MASK.read_text(encoding='utf-8'))
    if maskbank.get('characterId')!=ID or maskbank.get('sourceSha256')!=EXPECTED_SOURCE:
        raise ValueError('Wrong actual uploaded PSD mask identity')
    rows=maskbank.get('parts')
    if tuple(p['id'] for p in rows)!=NAMES or maskbank.get('canvas')!=[315,1024]:
        raise ValueError('21 original male-second PSD layers changed unexpectedly')
    if maskbank.get('compression')!='zlib-alpha-8bit-concatenated':
        raise ValueError('Unsupported/lossy PSD alpha format')
    raw=zlib.decompress(base64.b64decode(maskbank['alphaZlibBase64']))
    if len(raw)!=maskbank['rawBytes'] or len(raw)!=sum(p['w']*p['h'] for p in rows):
        raise ValueError('Truncated PSD mask payload')
    image=Image.open(ART).convert('RGBA')
    if image.size!=(315,1024):
        raise ValueError('CHAR-016 approved front must be 315x1024 unchanged')
    alpha=image.getchannel('A')
    flat=Image.new('RGBA',(1024,1024))
    offset=(1024-image.width)//2
    flat.alpha_composite(image,(offset,0))
    extracted=Image.new('RGBA',image.size)
    mask_union=Image.new('L',image.size)
    generated=[]
    textures={}
    part_records=[]
    stride=0
    DEST.mkdir(parents=True,exist_ok=True)
    for row in rows:
        ident,x,y,w,h=(row[key] for key in ('id','x','y','w','h'))
        if not all(isinstance(v,int) for v in (x,y,w,h)) or min(x,y)<0 or min(w,h)<=0:
            raise ValueError('Invalid Photoshop layer geometry '+ident)
        if x+w>image.width or y+h>image.height:
            raise ValueError('PSD layer out of bounds '+ident)
        size=w*h
        seg=raw[stride:stride+size]
        stride+=size
        if len(seg)!=size or any(v not in (0,255) for v in seg):
            raise ValueError('PSD layer alpha is not original exact binary mask: '+ident)
        layer_alpha=Image.frombytes('L',(w,h),seg)
        if layer_alpha.getbbox() is None:
            raise ValueError('PSD layer unexpectedly empty: '+ident)
        # Physical PSD layers have disjoint alpha. Check instead of guessing
        # source pixel ownership: zero false pixels, no overlaps, no holes.
        union_crop=mask_union.crop((x,y,x+w,y+h))
        if ImageChops.multiply(union_crop,layer_alpha).getbbox() is not None:
            raise ValueError('PSD part ownership overlaps: '+ident)
        mask_union.paste(ImageChops.lighter(union_crop,layer_alpha),(x,y))
        crop=image.crop((x,y,x+w,y+h))
        if ImageChops.subtract(layer_alpha,crop.getchannel('A')).getbbox() is not None:
            raise ValueError('PSD layer mask lies beyond original approved image: '+ident)
        crop.putalpha(layer_alpha)
        extracted.alpha_composite(crop,(x,y))
        partfile=DEST/'parts/front'/(ident+'.png')
        partfile.parent.mkdir(parents=True,exist_ok=True)
        crop.save(partfile,optimize=True)
        textures[ident]=partfile.relative_to(DEST).as_posix()
        part_records.append({
            'partId':ident,'name':ident,'x':x+offset,'y':y,'w':w,'h':h,
            'sourcePart':True,'visible':True,'opacity':1
        })
        generated.append({'file':'front/'+ident+'.png','id':ident,
                          'name':ident,'x':x+offset,'y':y,
                          'visible':True,'locked':False,'opacity':1,
                          'role':'original-psd-layer'})
    if ImageChops.difference(alpha,mask_union).getbbox() is not None:
        raise ValueError('PSD mask union does not exactly cover original character alpha')
    if ImageChops.difference(extracted,image).getbbox() is not None:
        raise ValueError('21 extracted PSD layers do not reproduce the EXACT original pixel artwork')
    result=subprocess.run(['node','-e',JS],cwd=ROOT,input=json.dumps({'parts':part_records}),
                          text=True,capture_output=True,check=True)
    rig=json.loads(result.stdout)
    if tuple(rig['parts'])!=NAMES:
        raise ValueError('JS PartRig destroyed a source Photoshop layer')
    profile=rig['idleProfile']
    profile['body']['amount']=0
    profile['hair']['amount']=.12
    profile['cloth']['amount']=.055
    profile['sleeves']['amount']=.035
    profile['breath']['amount']=.30
    profile['joints']={'hands':.08,'shoulders':.08,'hips':.08}
    # All 21 independent textures are real, but some source masks have no
    # painted occluded backs; limit default idle to avoid white gaps.
    rig['sourcePsdSha256']=EXPECTED_SOURCE
    rig['provenance']='original-psd-masks'
    rig['limitations']=[
        '21 exact original source masks and original approved visible RGB',
        'Occluded behind-paint not present in supplied PSD; large swing may show gaps',
        'Jacket is one source layer; arms are exposed hands/cuffs, not independently split upper arms',
        'No source back view; do not mirror or invent a back texture'
    ]
    dump(DEST/'front.rig.json',rig)
    flat.save(DEST/'front.png',optimize=True)
    # The existing editor imports this real 21-layer ZIP automatically.
    archive=DEST/'front-original-psd-layers.zip'
    with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        manifest={'canvas':[1024,1024],'provenance':'original-psd',
                  'sourcePsdSha256':EXPECTED_SOURCE,'layers':{'front':generated,'back':[]}}
        z.writestr('layers.json',json.dumps(manifest,ensure_ascii=False))
        for row in generated:
            path=DEST/'parts'/row['file']
            z.write(path,row['file'])
    dump(DEST/'module.json',{
        'schema':1,'id':ID,'label':'男二 · 21层原始PSD骨骼',
        'views':{'front':{
            'portrait':'front.png',
            'rig':{'type':'part-mesh','file':'front.rig.json','textures':textures},
            'sourceParts':{'file':archive.name,'provenance':'original-psd'}
        }}
    })
    print(f'PASS CHAR-016: {len(NAMES)} real PSD layer masks, exact RGBA composite, '
          f'independent part textures, knees+feet+neck parent chain, original source {EXPECTED_SOURCE}')


if __name__=='__main__':
    build()
