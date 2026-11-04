#!/usr/bin/env python3
"""Read-only QA for the approved 25-layer crouching pose.
Extract a handful of ORIGINAL PNGs to CI artifact; no source recoloring.
This makes wrist, axe-handle and real hem bounds independently inspectable.
"""
import io, json
from pathlib import Path
from zipfile import ZipFile
from PIL import Image
SOURCE=Path('site/assets/l2d/inbox/protagonist-crouch-axe.zip')
OUT=Path('artifacts/protagonist-crouch/source-inspection')
ROOT='protagonist-crouch-axe/'
INTEREST=('topwear','handwear_l','handwear_r','axe','legwear_l','legwear_r',
          'footwear_l','footwear_r')
def main():
    OUT.mkdir(parents=True,exist_ok=True)
    with ZipFile(SOURCE) as z:
        rig=json.loads(z.read(ROOT+'front.rig.json'))
        module=json.loads(z.read(ROOT+'module.json'))
        textures=module['views']['front']['rig']['textures']
        report={'source':SOURCE.as_posix(),'characterId':rig['characterId'],
                'canvas':rig['canvas'],'parts':{}}
        for id in INTEREST:
            p=rig['parts'][id]
            im=Image.open(io.BytesIO(z.read(ROOT+textures[id]))).convert('RGBA')
            box=im.getchannel('A').getbbox()
            data={'x':p['x'],'y':p['y'],'w':p['w'],'h':p['h'],
                  'alphaBox':box,'kind':p.get('kind'),'parentId':p.get('parentId'),
                  'pivot':p.get('pivot'),'tip':p.get('tip'),
                  'bones':p.get('bones',[]),'motion':p.get('motion')}
            report['parts'][id]=data
            im.save(OUT/(id+'.png'))
            print('CROUCH SOURCE GEOMETRY',id,json.dumps(data,ensure_ascii=False))
    (OUT/'geometry.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
if __name__=='__main__':main()
