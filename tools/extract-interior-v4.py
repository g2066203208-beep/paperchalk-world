"""Extract authored raster layers; never raster-draw replacement furnishings."""
from PIL import Image, ImageDraw
from pathlib import Path
import json, shutil
root=Path(__file__).resolve().parents[1]
src=root/'assets/interior-v4/production-master.webp'
out=root/'assets/interior-v4';out.mkdir(exist_ok=True)
im=Image.open(src).convert('RGBA'); # Production master is preserved; extraction never overwrites it.
W,H=im.size; parts=[]
def maskpoly(points):
 m=Image.new('L',(W,H));ImageDraw.Draw(m).polygon(points,fill=255);return m
def rect(b):
 x,y,r,d=b;return maskpoly([(x,y),(r,y),(r,d),(x,d)])
def save(name,mask):
 a=im.copy();a.putalpha(mask);b=mask.getbbox();a=a.crop(b);a.save(out/(name+'.webp'),quality=95)
 parts.append(dict(id=name,path=name+'.webp',rect=list(b),alpha=True))
# Each static support is separate from the shelf backing and merchandise.
shelf_regions=[(0,280,270,850),(754,280,1023,850)]
counter=maskpoly([(0,824),(243,789),(295,758),(731,758),(780,791),(1023,824),(1023,1018),(0,1018)])
doors=[[(91,74),(242,105),(242,277),(73,254)],[(797,105),(1007,68),(1007,263),(797,292)]]
drawers=[(199,1102,506,1218),(527,1102,828,1218)]
window=Image.new('L',(W,H));px=im.load();mp=window.load()
for y in range(300,759):
 for x in range(295,732):
  r,g,b,a=px[x,y]
  if y>=370 or (b>r*1.15 and b>g*1.10):mp[x,y]=255
shell=Image.new('L',(W,H),255)
from PIL import ImageChops
for m in [window,counter,*[rect(b) for b in shelf_regions],*[maskpoly(p) for p in doors],*[rect(b) for b in drawers]]:shell=ImageChops.subtract(shell,m)
save('room-shell',shell);save('countertop',counter)
for i,(reg,side) in enumerate(zip(shelf_regions,['left','right'])):
 x,y,r,d=reg
 # A complete authored interior plane under each structural support.
 backing=im.crop((45 if i==0 else 875,505,155 if i==0 else 985,604)).resize((r-x,d-y))
 backing.save(out/f'shelf-{side}-back.webp',quality=95)
 parts.append(dict(id=f'shelf-{side}-back',path=f'shelf-{side}-back.webp',rect=list(reg),alpha=False))
 structure=rect(reg)
 # Remove the empty interiors, retain posts, brackets, planks and front rails.
 for b in [(27 if i==0 else 785,345,240 if i==0 else 998,464),(27 if i==0 else 785,494,240 if i==0 else 998,618),(27 if i==0 else 785,659,240 if i==0 else 998,760)]:
  structure=ImageChops.subtract(structure,rect(b))
 save(f'shelf-{side}-structure',structure)
 for j,(a,b) in enumerate([(464,495),(618,660),(760,830)]):save(f'shelf-{side}-rail-{j}',ImageChops.multiply(structure,rect((x,a,r,b))))
for i,p in enumerate(doors):save('cabinet-'+('left' if i==0 else 'right')+'-door',maskpoly(p))
for i,b in enumerate(drawers):save('drawer-'+('left' if i==0 else 'right')+'-face',rect(b))
manifest=dict(version=4,source=src.name,sourceSize=[W,H],worldOrigin=[590,0],parts=parts,rule='All products, customers, hands, movable doors and drawer faces are independent. No retail units baked into room layers.',style='Orange/navy/ivory flat graphic anime, unified source perspective',sourceRole='Original GPTIMG empty production environment, restyled against approved menu reference')
old=json.loads((out/'manifest.json').read_text()) if (out/'manifest.json').exists() else {}
manifest['source']='exec-da806495-5ef2-463c-b845-219c16c8d7c6.png'
if 'extensions' in old:manifest['extensions']=old['extensions']
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
(root/'src/kiosk-interior-v4.js').write_text('export const INTERIOR_PARTS='+json.dumps(parts,separators=(',',':'))+';\nexport const interiorRect=p=>({x:590+p.rect[0],y:p.rect[1],w:p.rect[2]-p.rect[0],h:p.rect[3]-p.rect[1]});\n')
print('Extracted',len(parts),'independent authored layers')
