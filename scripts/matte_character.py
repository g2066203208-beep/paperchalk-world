#!/usr/bin/env python3
"""Professional, non-destructive anime sprite alpha pipeline.

Usage:
  pip install Pillow numpy scipy opencv-python-headless
  python scripts/matte_character.py input.png out.png --engine flat-white
  pip install "rembg[cpu]"
  python scripts/matte_character.py input.png out.png --engine isnet-anime

Options:
  flat-white   Fast deterministic matte for near-uniform pale/white art backgrounds.
               Uses foreground component, soft alpha, white decontamination.
  isnet-anime  Specialized ONNX anime foreground segmentation via open-source rembg.
  birefnet-general-lite  Alternative for complex scenery (larger, slower).
Always generate the lossless transparent PNG before WebP compression and inspect
light/dark checkerboard previews. No automatic model downloads in game/runtime.
"""
import argparse
import io
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np

def flat_white(source):
    import cv2
    from scipy.ndimage import distance_transform_edt
    rgb=np.asarray(source.convert("RGB"),dtype=np.float32)
    h,w=rgb.shape[:2]
    corners=np.stack([rgb[2,2],rgb[2,w-3],rgb[h-3,2],rgb[h-3,w-3]])
    base=np.median(corners,axis=0)
    if np.min(base)<230 or np.max(base)-np.min(base)>18:
        raise ValueError("Not a white-background illustration. Use --engine isnet-anime instead.")
    distance=np.max(np.abs(rgb-base),axis=2)
    core=np.uint8(distance>32)
    count,labels,stats,_=cv2.connectedComponentsWithStats(core,8)
    if count<2: raise ValueError("No discernible foreground")
    root=np.uint8(labels==1+np.argmax(stats[1:,cv2.CC_STAT_AREA]))
    if np.sum(root)<h*w*.01: raise ValueError("Foreground too small to segment")
    near=cv2.dilate(root,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9)))
    alpha=np.clip((distance-6.5)/31.5,0,1)
    inside=cv2.erode(root,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(3,3)))
    alpha[inside>0]=1
    alpha[near==0]=0
    holemask=cv2.morphologyEx(root,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
    area=(holemask>0)&(distance>17)
    alpha[area]=np.maximum(alpha[area],.72)
    cleaned=(rgb-(1-alpha[...,None])*base)/np.maximum(alpha[...,None],.06)
    cleaned=np.clip(cleaned,0,255)
    cleaned[alpha>.985]=rgb[alpha>.985]
    # Clean tiny white halo pixels only on high hair perimeter.
    opaque=alpha>=90/255
    dark=opaque&(np.max(cleaned,axis=2)<122)
    if np.any(dark):
        _,inds=distance_transform_edt(~dark,return_indices=True)
        nearest=cleaned[inds[0],inds[1]]
        perimeter=distance_transform_edt(opaque)
        bright=np.min(cleaned,axis=2)
        Y=np.arange(h)[:,None]
        fringe=(Y<h*.36)&opaque&(perimeter<=3.2)&(bright>176)&(
            (np.max(cleaned,axis=2)-bright)<40)
        cleaned[fringe]=np.clip(nearest[fringe]*.86+cleaned[fringe]*.14,0,255)
    result=np.dstack((cleaned,np.round(alpha*255))).astype(np.uint8)
    return Image.fromarray(result,"RGBA")

def neural(source,model):
    from rembg import new_session, remove
    import io
    # rembg is used ONLY in an offline build tool. Never in the game client.
    session=new_session(model,providers=["CPUExecutionProvider"])
    buf=io.BytesIO()
    source.convert("RGB").save(buf,format="PNG")
    result=remove(buf.getvalue(),session=session,alpha_matting=False)
    return Image.open(io.BytesIO(result)).convert("RGBA")

def crop(result,padding):
    a=np.asarray(result.getchannel("A"))
    ys,xs=np.nonzero(a>5)
    if not len(xs):raise ValueError("Empty output alpha")
    x0=max(0,int(xs.min())-padding)
    y0=max(0,int(ys.min())-padding)
    x1=min(result.width,int(xs.max())+1+padding)
    y1=min(result.height,int(ys.max())+1+padding)
    return result.crop((x0,y0,x1,y1))

def checkerboard(size):
    out=Image.new("RGB",size)
    draw=ImageDraw.Draw(out)
    tile=18
    for y in range(0,size[1],tile):
        for x in range(0,size[0],tile):
            c=(56,64,75) if ((x//tile+y//tile)%2) else (88,98,109)
            draw.rectangle((x,y,x+tile,y+tile),fill=c)
    return out

def main():
    p=argparse.ArgumentParser()
    p.add_argument("source",type=Path)
    p.add_argument("destination",type=Path,help="Lossless, transparent PNG output")
    p.add_argument("--engine",choices=("flat-white","isnet-anime","birefnet-general-lite"),default="flat-white")
    p.add_argument("--padding",type=int,default=16)
    p.add_argument("--webp",type=Path,help="Optional compressed game sprite")
    p.add_argument("--preview-dir",type=Path)
    args=p.parse_args()
    source=Image.open(args.source)
    out=flat_white(source) if args.engine=="flat-white" else neural(source,args.engine)
    out=crop(out,args.padding)
    args.destination.parent.mkdir(parents=True,exist_ok=True)
    out.save(args.destination,format="PNG",optimize=True)
    if args.webp:
        args.webp.parent.mkdir(parents=True,exist_ok=True)
        out.save(args.webp,format="WEBP",quality=90,method=6,exact=True)
    if args.preview_dir:
        args.preview_dir.mkdir(parents=True,exist_ok=True)
        for label,background in (("dark",(22,30,43)),("gray",(126,131,136)),
                                 ("light",(246,247,248))):
            canvas=Image.new("RGB",out.size,background)
            canvas.paste(out,mask=out.getchannel("A"))
            canvas.save(args.preview_dir/f"{label}.png")
        cb=checkerboard(out.size);cb.paste(out,mask=out.getchannel("A"))
        cb.save(args.preview_dir/"checkerboard.png")
    print(f"Generated: {args.destination}; alpha range {out.getchannel('A').getextrema()},"
          f" dimensions {out.size}; engine={args.engine}")
if __name__=="__main__":
    main()
