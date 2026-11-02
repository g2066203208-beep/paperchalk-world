#!/usr/bin/env python3
"""Repair pure-white inner holes and white alpha contamination in the
approved protagonist asset. Run on a fresh checkout BEFORE packaging Pages.
Only the opacity boundary changes; never redraw or repaint the character.
"""
from collections import deque
from pathlib import Path
from PIL import Image, ImageFilter

INPUT=Path("site/assets/characters/protagonist-front.webp")

def repair(path=INPUT):
    image=Image.open(path).convert("RGBA")
    w,h=image.size
    src=image.load()
    candidate=bytearray(w*h)
    for y in range(h):
        for x in range(w):
            r,g,b,a=src[x,y]
            if a>48 and min(r,g,b)>=230 and max(r,g,b)-min(r,g,b)<=18:
                candidate[y*w+x]=1
    seen=bytearray(w*h)
    removed_mask=Image.new("L",(w,h),0)
    removed_px=removed_mask.load()
    removed=[]
    for seed in range(w*h):
        if not candidate[seed] or seen[seed]:
            continue
        stack=deque([seed]);seen[seed]=1;region=[]
        while stack:
            k=stack.popleft();region.append(k)
            x=k%w;y=k//w
            for neighbor in (k-1 if x else -1,k+1 if x<w-1 else -1,
                             k-w if y else -1,k+w if y<h-1 else -1):
                if neighbor>=0 and candidate[neighbor] and not seen[neighbor]:
                    seen[neighbor]=1;stack.append(neighbor)
        if len(region)>max(1500,w*h//90):
            removed.append(len(region))
            for k in region:
                removed_px[k%w,k//w]=255
    if not removed:
        raise ValueError("Expected the known solid-white leg gap; source asset changed")
    feather=removed_mask.filter(ImageFilter.GaussianBlur(.64)).load()
    for y in range(h):
        for x in range(w):
            r,g,b,a=src[x,y]
            if not a: continue
            newa=round(a*(1-feather[x,y]/255))
            if 5<newa<254:
                t=newa/255
                r=max(0,min(255,round((r-(1-t)*253)/max(.12,t))))
                g=max(0,min(255,round((g-(1-t)*254)/max(.12,t))))
                b=max(0,min(255,round((b-(1-t)*254)/max(.12,t))))
            src[x,y]=(r,g,b,newa)
    # Preserve source dimensions and transparent game rendering.
    image.save(path,"WEBP",quality=84,method=6,exact=True)
    check=Image.open(path).convert("RGBA")
    assert check.getpixel((165,700))[3] <= 5,"Leg gap still opaque"
    assert check.getpixel((150,400))[3] >= 240,"Character silhouette destroyed"
    print("PASS: repaired character matte; removed background regions:",removed)

if __name__=="__main__":
    repair()
