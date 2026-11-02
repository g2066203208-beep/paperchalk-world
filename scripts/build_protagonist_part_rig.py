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


if __name__=='__main__':
    build()
