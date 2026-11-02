#!/usr/bin/env python3
"""Build the approved CHAR-002 front as an in-game 128-frame WebP timeline.

This is V4-compatible baked frame animation, NOT a Cubism .moc3 model.
Only the actual user-selected front.png is used. Back view remains unavailable.
The source-region ZIP is generated from visible pixels, NOT an invented PSD.
"""
from collections import deque
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from PIL import Image, ImageFilter
import argparse, hashlib, io, json, math

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'site/assets/characters/char-002/front.png'
DEST=ROOT/'site/assets/l2d/char-002'
W,H,PAD,STAGE_X,FRAMES,FPS=335,1024,16,344,128,20
PARTS=[('shoes','鞋'),('legs','双腿'),('skirt','百褶裙'),
 ('wave_hand','挥手手臂'),('free_hand','垂下的手臂'),
 ('head_hair','头部和马尾'),('jacket','校服上身')]

def matte(image):
    rgb=image.convert('RGB'); w,h=rgb.size; pix=rgb.load()
    seen=bytearray(w*h); q=deque()
    def visit(x,y):
        key=y*w+x
        if seen[key]:return
        r,g,b=pix[x,y]
        if min(r,g,b)>=242 and max(r,g,b)-min(r,g,b)<=13:
            seen[key]=1;q.append(key)
    for x in range(w):visit(x,0);visit(x,h-1)
    for y in range(h):visit(0,y);visit(w-1,y)
    while q:
        key=q.popleft();x=key%w;y=key//w
        if x:visit(x-1,y)
        if x+1<w:visit(x+1,y)
        if y:visit(x,y-1)
        if y+1<h:visit(x,y+1)
    alpha=Image.frombytes('L',(w,h),bytes(0 if a else 255 for a in seen))
    alpha=alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(.36))
    out=image.convert('RGBA');out.putalpha(alpha)
    return out

def zone(x,y):
    if y>=920:return 'shoes'
    if y>=639:return 'legs'
    if 500<=y<656 and x<284:return 'skirt'
    if 143<=y<415 and x<113:return 'wave_hand'
    if 470<=y<640 and x>=170:return 'free_hand'
    if y<235:return 'head_hair'
    return 'jacket'

def create_parts(img,target):
    w,h=img.size; src=img.load()
    regions={name:Image.new('RGBA',(w,h)) for name,_ in PARTS}
    dst={name:im.load() for name,im in regions.items()}
    for y in range(h):
        for x in range(w):
            col=src[x,y]
            if col[3]:dst[zone(x,y)][x,y]=col
    merged=Image.new('RGBA',(w,h))
    for name,_ in PARTS:merged.alpha_composite(regions[name])
    if any(a[3]!=b[3] or (a[3] and a[:3]!=b[:3])
           for a,b in zip(merged.getdata(),img.getdata())):
        raise AssertionError('CHAR-002 source-region composite changed approved pixels')
    manifest={'canvas':[1024,1024],
      'provenance':'Pixel-preserving regions of approved CHAR-002 front; NOT a genuine PSD',
      'layers':{'front':[],'back':[]}}
    with ZipFile(target,'w',ZIP_DEFLATED,compresslevel=7) as out:
        for i,(name,label) in enumerate(PARTS):
            image=regions[name];bounds=image.getbbox()
            if not bounds:continue
            cropped=image.crop(bounds);data=io.BytesIO()
            cropped.save(data,'PNG',optimize=True)
            file=f'front/{i:02d}_{name}.png'
            out.writestr(file,data.getvalue())
            manifest['layers']['front'].append({
              'id':name,'name':label,'file':file,
              'role':'derived-source-region','x':STAGE_X+PAD+bounds[0],
              'y':bounds[1],'visible':True,'locked':False,'opacity':1})
        out.writestr('layers.json',json.dumps(manifest,ensure_ascii=False,indent=2))
    return len(manifest['layers']['front'])

def render_frame(base,n):
    angle=2*math.pi*n/FRAMES
    inhale,sway=math.sin(angle),math.sin(angle-.55)
    out=Image.new('RGBA',(W,H))
    for y in range(0,H,8):
        height=min(8,H-y);cy=y+height*.5
        head=max(0,min(1,(600-cy)/480))
        torso=max(0,min(1,(720-cy)/460))
        dx=1.9*head*sway+.4*torso*inhale
        chest=max(0,1-abs(cy-365)/245)
        scale=1+.004*chest*inhale
        inv=1/scale
        strip=base.crop((0,y,W,y+height)).transform(
          (W,height),Image.Transform.AFFINE,
          (inv,0,(W*.5)*(1-inv)-dx*inv,0,1,0),
          resample=Image.Resampling.BICUBIC)
        out.paste(strip,(0,y))
    return out

def build(source=SOURCE,output=DEST):
    raw=source.read_bytes();art=Image.open(io.BytesIO(raw)).convert('RGBA')
    if art.size!=(303,1024):raise ValueError('CHAR-002 source geometry changed')
    output.mkdir(parents=True,exist_ok=True)
    clean=matte(art)
    n_parts=create_parts(clean,output/'front-source-regions.zip')
    base=Image.new('RGBA',(W,H));base.alpha_composite(clean,(PAD,0))
    frames=[render_frame(base,k) for k in range(FRAMES)]
    if len({hashlib.sha256(f.tobytes()).digest() for f in frames})<8:
        raise AssertionError('Animation has too few distinct poses')
    frames[0].save(output/'front.webp',format='WEBP',save_all=True,
      append_images=frames[1:],duration=50,loop=0,
      lossless=False,quality=94,method=0,exact=True)
    with Image.open(output/'front.webp') as im:
        if im.size!=(W,H) or im.n_frames!=FRAMES:
            raise AssertionError('CHAR-002 missing full 128-frame animation')
    manifest={'id':'char-002','label':'女二号','format':'v4-baked-webp',
      'nativeCubism':False,'front':{
      'file':'./assets/l2d/char-002/front.webp',
      'crop':{'x':STAGE_X,'y':0,'w':W,'h':H},
      'fps':FPS,'frames':FRAMES},'back':None,
      'originalArtSha256':hashlib.sha256(raw).hexdigest(),
      'partsArchive':'front-source-regions.zip','sourcePartCount':n_parts}
    (output/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print('PASS CHAR-002: 128 frames at 20 fps,',n_parts,'editable front regions')
    return manifest

if __name__=='__main__':
    ap=argparse.ArgumentParser()
    ap.add_argument('--root',type=Path,default=ROOT)
    args=ap.parse_args()
    build(args.root/'site/assets/characters/char-002/front.png',
          args.root/'site/assets/l2d/char-002')
