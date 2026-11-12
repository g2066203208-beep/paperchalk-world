#!/usr/bin/env python3
"""Render a simple 2.5D paper-theatre rehearsal from the two APPROVED original PNGs.
No regeneration or repainting of the characters. White background is removed
only in memory; committed original art remains byte-for-byte untouched.
"""
from collections import deque
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import math, random

ROOT = Path(__file__).resolve().parents[1]
RING = ROOT / "site/assets/characters/wonder-circus/ringmaster.png"
DOC = ROOT / "site/assets/characters/monster-hunters/02-blood-physician.png"
OUT = ROOT / "site/previews"
OUT.mkdir(parents=True, exist_ok=True)
W, H = 960, 540
FPS, FRAMES = 12, 96
TAU = math.tau

def remove_white_edge(src):
    rgb = Image.open(src).convert("RGB")
    w, h = rgb.size
    # Non-destructive edge-connected flood fill on ORIGINAL 704x1024 RGB.
    # It never removes closed bright areas such as a doctor's white coat.
    px = rgb.load()
    mark = bytearray(w*h)
    q = deque()
    def seed(x,y):
        i=y*w+x
        if mark[i]: return
        r,g,b=px[x,y]
        if min(r,g,b)>214 and max(r,g,b)-min(r,g,b)<39:
            mark[i]=1; q.append(i)
    for x in range(w):
        seed(x,0); seed(x,h-1)
    for y in range(h):
        seed(0,y); seed(w-1,y)
    while q:
        i=q.popleft()
        x=i%w; y=i//w
        if x: seed(x-1,y)
        if x+1<w: seed(x+1,y)
        if y: seed(x,y-1)
        if y+1<h: seed(x,y+1)
    rgba=rgb.convert("RGBA")
    alpha=Image.new("L",(w,h),255)
    a=alpha.load()
    for y in range(h):
        for x in range(w):
            if mark[y*w+x]: a[x,y]=0
    rgba.putalpha(alpha)
    return rgba

def background():
    im=Image.new("RGB",(W,H))
    p=im.load()
    for y in range(H):
        for x in range(W):
            k=y/H
            radial=max(0,1-math.sqrt(((x-W*.5)/(W*.63))**2+((y-H*.42)/(H*.80))**2))
            p[x,y]=(round(17+31*k+30*radial),round(11+18*k+12*radial),round(22+18*k+11*radial))
    d=ImageDraw.Draw(im,"RGBA")
    for i in range(9):
        x=151+i*82
        d.rectangle((x,45,x+72,370),fill=(89 if i%2 else 50,27,42,100))
        d.line((x+72,45,x+72,370),fill=(190,130,95,48),width=2)
    d.arc((180,58,780,540),181,359,fill=(185,135,90,170),width=7)
    # side curtains: layered, irregular textile-style paper flats
    for side in (0,1):
        for i in range(6):
            x=i*19 if side==0 else W-i*19
            col=(104,43,53,255) if i%2==0 else (63,23,40,255)
            d.polygon([(x,0),(x+28,0),(x+38,260),(x+10,405),(x-17,380)],fill=col)
    # wooden stage recedes to back
    d.polygon([(142,375),(818,375),(958,540),(2,540)],fill=(92,62,56,255))
    d.line([(142,375),(818,375)],fill=(180,124,86,190),width=4)
    for j in range(10):
        z=j/9
        y=375+int(z*z*165)
        dx=int((y-375)*.84)
        d.line([(142-dx,y),(818+dx,y)],fill=(177,118,82,68) if j%2 else (18,10,20,100),width=2)
    for j in range(-8,9):
        d.line((480+j*42,375,480+j*94,540),fill=(18,10,20,80),width=1)
    # transparent spotlight cone over painted backdrop
    layer=Image.new("RGBA",(W,H))
    l=ImageDraw.Draw(layer,"RGBA")
    l.polygon([(365,38),(397,38),(562,425),(168,425)],fill=(246,211,158,27))
    l.polygon([(596,45),(632,45),(810,425),(398,425)],fill=(246,211,158,20))
    im=Image.alpha_composite(im.convert("RGBA"),layer)
    return im

def draw_actor(stage, sprite, x, feet, height, flip=False):
    height = max(1, int(round(height)))
    w=round(sprite.width*height/sprite.height)
    resized=sprite.resize((w,height),Image.Resampling.LANCZOS)
    if flip: resized=resized.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    shadow=Image.new("RGBA",(W,H))
    sd=ImageDraw.Draw(shadow,"RGBA")
    sd.ellipse((x-w//4,feet-8,x+w//4,feet+11),fill=(0,0,0,100))
    shadow=shadow.filter(ImageFilter.GaussianBlur(5))
    stage.alpha_composite(shadow)
    stage.alpha_composite(resized,(round(x-w/2),round(feet-height)))

def petal_layer(t,front):
    overlay=Image.new("RGBA",(W,H))
    dr=ImageDraw.Draw(overlay,"RGBA")
    # Stable deterministic scatter seeded by petal birth time.
    for i in range(156):
        seed=random.Random(i*497+33)
        birth=seed.uniform(-5,8)
        age=t-birth
        if age<0 or age>3.4: continue
        az=seed.uniform(-math.pi,math.pi)
        depth=math.sin(az)
        if (depth>=0)!=front: continue
        x=480+195*math.cos(az) + math.sin(age*1.8+i)*17 + seed.uniform(-35,35)
        y=430+45*depth - 160 + 83*age + seed.uniform(-36,36)
        size=seed.uniform(2.2,5.0)*(1+max(depth,0)*.22)
        color=seed.choice([(243,219,187,210),(230,160,161,190),(245,219,140,200)])
        dr.ellipse((x-size,y-size*.5,x+size,y+size*.5),fill=color)
    return overlay

def paint_frame(t, ring, doc, backdrop):
    stage=backdrop.copy()
    a=-math.pi/2+t*TAU/7.2
    depth=math.sin(a)
    x=480+195*math.cos(a)
    feet=426+43*depth
    height=326+47*depth
    stage.alpha_composite(petal_layer(t,False))
    if depth<0: draw_actor(stage,ring,x,feet,height,math.cos(a)<0)
    draw_actor(stage,doc,480,426+math.sin(t*1.8)*1.2,383)
    if depth>=0: draw_actor(stage,ring,x,feet,height,math.cos(a)<0)
    stage.alpha_composite(petal_layer(t,True))
    d=ImageDraw.Draw(stage,"RGBA")
    d.rectangle((0,518,W,540),fill=(48,29,30,255))
    d.rectangle((0,520,W,524),fill=(185,135,90,255))
    for x in range(64,W,86):
        d.ellipse((x-2,520,x+2,524),fill=(250,202,145,255))
    return stage

def main():
    assert RING.exists() and DOC.exists(), (str(RING),str(DOC))
    ring=remove_white_edge(RING)
    doc=remove_white_edge(DOC)
    b=background()
    images=[]
    for i in range(FRAMES):
        frame=paint_frame(i/FPS,ring,doc,b).convert("RGB")
        if i==14: frame.save(OUT/"circus-doctor-orbit-still.png")
        images.append(frame.quantize(colors=128,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE))
    images[0].save(OUT/"circus-doctor-orbit.gif",save_all=True,append_images=images[1:],
                   duration=round(1000/FPS),loop=0,optimize=False,disposal=2)
    assert (OUT/"circus-doctor-orbit.gif").stat().st_size>50000
    print("Rendered approved-art GIF:",(OUT/"circus-doctor-orbit.gif").stat().st_size)
    print("Rendered still:",(OUT/"circus-doctor-orbit-still.png").stat().st_size)

if __name__=="__main__":
    main()
