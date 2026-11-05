#!/usr/bin/env python3
"""Render original-art practice axe swing from the approved PSD-separated protagonist.
Does not overwrite or modify character originals or L2D rigs.
"""
from pathlib import Path
import math,json,zipfile
from PIL import Image
SOURCE=Path("site/assets/l2d/library/protagonist-battle-front")
OUT=Path("site/assets/animations/protagonist-axe-attack")
N=1024; PAD=128; SIZE=N+2*PAD; FILTER=Image.Resampling.BICUBIC
# animation angle, translation X/Y, milliseconds
KEYS=[
(0,0,0,135),(5,-3,-2,95),(10,-4,-5,85),(16,-5,-9,85),
(17,-4,-9,90),(9,0,-3,55),(-5,5,4,45),(-20,11,8,45),
(-33,17,11,60),(-40,19,14,85),(-28,14,8,75),(-15,9,5,75),
(-5,3,2,75),(0,0,0,145)]
PIVOT=(517,375)
SHOULDERS={"handwear_r":(417,252),"handwear_l":(599,248)}
GRIPS={"handwear_r":(351,431),"handwear_l":(694,316)}

def rotate_point(p,c,degrees):
    t=math.radians(degrees);dx=p[0]-c[0];dy=p[1]-c[1]
    return c[0]+dx*math.cos(t)+dy*math.sin(t),c[1]-dx*math.sin(t)+dy*math.cos(t)

def paste_layer(layer):
    src=SOURCE/layer["file"]
    with Image.open(src) as inp:
        im=inp.convert("RGBA")
    expected=(int(layer["w"]),int(layer["h"]))
    if im.size!=expected:raise ValueError(f"{src}: {im.size} expected {expected}")
    canvas=Image.new("RGBA",(SIZE,SIZE))
    canvas.alpha_composite(im,(int(layer["x"])+PAD,int(layer["y"])+PAD))
    return canvas

def arm_transform(im,shoulder,wrist,destination):
    sx,sy=shoulder[0]+PAD,shoulder[1]+PAD
    wx,wy=wrist[0]+PAD,wrist[1]+PAD
    tx,ty=destination[0]+PAD,destination[1]+PAD
    ux,uy=wx-sx,wy-sy;vx,vy=tx-sx,ty-sy
    scale=max(.56,min(1.65,math.hypot(vx,vy)/max(1,math.hypot(ux,uy))))
    ang=math.atan2(vy,vx)-math.atan2(uy,ux)
    c=math.cos(ang)/scale;s=math.sin(ang)/scale
    a,b,d,e=c,s,-s,c
    return im.transform((SIZE,SIZE),Image.Transform.AFFINE,
                        (a,b,sx-a*sx-b*sy,d,e,sy-d*sx-e*sy),resample=FILTER)

def main():
    meta=json.loads((SOURCE/"layers.json").read_text(encoding="utf-8"))
    assert meta["canvas"]==[1024,1024]
    layers=[x for x in meta["layers"]["front"] if x.get("visible",True)]
    cache={x["id"]:paste_layer(x) for x in layers}
    frames=[];delays=[]
    folder=OUT/"frames";folder.mkdir(parents=True,exist_ok=True)
    for i,(angle,dx,dy,ms) in enumerate(KEYS):
        image=Image.new("RGBA",(SIZE,SIZE))
        for layer in layers:
            name=layer["id"];src=cache[name]
            if name=="axe_held":
                part=src.rotate(angle,center=(PIVOT[0]+PAD,PIVOT[1]+PAD),resample=FILTER)
            elif name in GRIPS:
                grip=rotate_point(GRIPS[name],PIVOT,angle)
                part=arm_transform(src,SHOULDERS[name],GRIPS[name],grip)
            elif name in ("front_hair","back_hair","bottomwear"):
                coefficient={"front_hair":-.6,"back_hair":.4,"bottomwear":.25}[name]
                part=src.rotate(coefficient*max(-1,min(1,angle/24)),
                    center=(layer["x"]+PAD+layer["w"]*.5,
                            layer["y"]+PAD+layer["h"]*.17),resample=FILTER)
            else:part=src
            if name in ("axe_held","handwear_r","handwear_l"):
                part=part.transform((SIZE,SIZE),Image.Transform.AFFINE,
                    (1,0,-dx,0,1,-dy),resample=FILTER)
            image.alpha_composite(part)
        image.save(folder/f"frame_{i:03}.png",optimize=True)
        frames.append(image);delays.append(ms)
    # All frames are quantized against one global palette, with reserved transparent index.
    contact=Image.new("RGB",(SIZE*4,SIZE*4),(255,0,255))
    for i,frame in enumerate(frames):
        bg=Image.new("RGB",frame.size,(255,0,255))
        bg.paste(frame,mask=frame.getchannel("A"))
        contact.paste(bg,((i%4)*SIZE,(i//4)*SIZE))
    palette=contact.resize((SIZE,SIZE),Image.Resampling.BILINEAR).quantize(colors=255)
    gifframes=[]
    for frame in frames:
        rgb=Image.new("RGB",frame.size,(255,0,255))
        rgb.paste(frame,mask=frame.getchannel("A"))
        q=rgb.quantize(palette=palette,dither=Image.Dither.NONE)
        old=q.getpalette()[:255*3]
        pal=[255,0,255]+old+[0]*(768-3-len(old))
        aa=frame.getchannel("A").tobytes()
        indices=bytes((v+1 if a>=96 else 0) for v,a in zip(q.tobytes(),aa))
        result=Image.frombytes("P",q.size,indices)
        result.putpalette(pal)
        result.info["transparency"]=0
        gifframes.append(result)
    OUT.mkdir(parents=True,exist_ok=True)
    gifframes[0].save(OUT/"attack.gif",save_all=True,
            append_images=gifframes[1:],duration=delays,loop=0,disposal=2,
            transparency=0,optimize=False)
    atlas=Image.new("RGBA",(4*SIZE,4*SIZE))
    for i,frame in enumerate(frames):
        atlas.alpha_composite(frame,((i%4)*SIZE,(i//4)*SIZE))
    atlas.save(OUT/"spritesheet.png",optimize=True)
    with zipfile.ZipFile(OUT/"png-sequence.zip","w",zipfile.ZIP_DEFLATED) as z:
        for i in range(len(frames)):
            p=folder/f"frame_{i:03}.png";z.write(p,p.name)
        z.writestr("timing.json",json.dumps({"frame_ms":delays,"canvas":[SIZE,SIZE],
                          "frames":len(frames),"grid":[4,4],"loop":True}))
    (OUT/"metadata.json").write_text(json.dumps({
         "source":str(SOURCE),"preservesOriginal":True,"frames":len(frames),
         "canvas":[SIZE,SIZE],"durationMs":sum(delays),
         "note":"Preview only; existing L2D art and character config untouched."
        },ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"Exported {len(frames)} original-art frames; {sum(delays)} ms")
if __name__=="__main__": main()
