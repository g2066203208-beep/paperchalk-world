#!/usr/bin/env python3
"""Render original-art practice axe swing from the approved PSD-separated protagonist.
Does not overwrite or modify character originals or L2D rigs.
"""
from pathlib import Path
import math,json,zipfile
from PIL import Image, ImageChops
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

def bone_affine(im, A, B, dstA, dstB):
    u=(B[0]-A[0],B[1]-A[1]);v=(dstB[0]-dstA[0],dstB[1]-dstA[1])
    scale=max(.001,math.hypot(*v))/max(.001,math.hypot(*u))
    angle=math.atan2(v[1],v[0])-math.atan2(u[1],u[0])
    c=math.cos(angle)/scale;s=math.sin(angle)/scale
    ax,ay=A[0]+PAD,A[1]+PAD;bx,by=dstA[0]+PAD,dstA[1]+PAD
    return im.transform((SIZE,SIZE),Image.Transform.AFFINE,
      (c,s,ax-c*bx-s*by,-s,c,ay+s*bx-c*by),resample=FILTER)

def arm_transform(im, shoulder, source_hand, destination_hand, name):
    # Two painted bone sections, not an isotropically enlarged hand or sleeve.
    elbow={"handwear_r":(367,367),"handwear_l":(617,397)}[name]
    S=shoulder;E=elbow;W=source_hand;T=destination_hand
    l1=math.dist(S,E);l2=math.dist(E,W)
    dx,dy=T[0]-S[0],T[1]-S[1];distance=max(.001,math.hypot(dx,dy))
    d=max(abs(l1-l2)+.02,min(l1+l2-.02,distance))
    ux,uy=dx/distance,dy/distance
    along=(l1*l1-l2*l2+d*d)/(2*d)
    height=math.sqrt(max(0,l1*l1-along*along))
    cross=(W[0]-S[0])*(E[1]-S[1])-(W[1]-S[1])*(E[0]-S[0])
    sign=1 if cross>=0 else -1
    bent=(S[0]+ux*along-sign*uy*height,S[1]+uy*along+sign*ux*height)
    reached=(S[0]+ux*d,S[1]+uy*d)
    bbox=im.getbbox();x0,y0,x1,y1=bbox
    crop=im.crop(bbox);alpha=crop.getchannel("A")
    w,h=crop.size;mask=Image.new("L",(w,h));pix=mask.load()
    S2=(S[0]+PAD,S[1]+PAD);E2=(E[0]+PAD,E[1]+PAD);W2=(W[0]+PAD,W[1]+PAD)
    def dist(x,y,a,b):
        vx,vy=b[0]-a[0],b[1]-a[1]
        t=max(0,min(1,((x-a[0])*vx+(y-a[1])*vy)/max(1,vx*vx+vy*vy)))
        return math.hypot(x-a[0]-t*vx,y-a[1]-t*vy)
    for y in range(h):
        for x in range(w):
            xx,yy=x+x0,y+y0
            top=dist(xx,yy,S2,E2);bottom=dist(xx,yy,E2,W2)
            pix[x,y]=round(255*max(0,min(1,.5+(bottom-top)/40)))
    parts=[]
    for m in (mask,ImageChops.invert(mask)):
        piece=crop.copy();piece.putalpha(ImageChops.multiply(alpha,m))
        part=Image.new("RGBA",(SIZE,SIZE));part.paste(piece,(x0,y0))
        parts.append(part)
    upper=bone_affine(parts[0],S,E,S,bent)
    lower=bone_affine(parts[1],E,W,bent,reached)
    upper.alpha_composite(lower)
    return upper

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
                part=arm_transform(src,SHOULDERS[name],GRIPS[name],grip,name)
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
