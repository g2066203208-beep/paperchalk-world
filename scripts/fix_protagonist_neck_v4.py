#!/usr/bin/env python3
"""Remove the unwanted extra FRONT neck layer from the existing protagonist V4.

Compute pixel deltas by compositing the source PSD archive with/without
front_05_neck, then register the animated 128 frames locally by face pixels.
Back view and all other front pixels remain untouched before WebP re-encoding.
"""
from pathlib import Path
from zipfile import ZipFile
from PIL import Image, ImageChops, ImageStat
from io import BytesIO
import json

BASE = Path(__file__).resolve().parents[1] / "site/assets/l2d/v4"

def layers_without_neck(archive):
    with ZipFile(archive) as z:
        layers = json.loads(z.read("layers.json"))["layers"]["front"]
        full = Image.new("RGBA", (1024, 1024))
        clean = Image.new("RGBA", (1024, 1024))
        for layer in layers:
            art = Image.open(BytesIO(z.read(layer["file"]))).convert("RGBA")
            at = (layer["x"], layer["y"])
            full.alpha_composite(art, at)
            if layer["id"] != "neck":
                clean.alpha_composite(art, at)
        assert any(x["id"] == "neck" for x in layers)
    return full.crop((351,9,686,1022)), clean.crop((351,9,686,1022))

def patch(front=BASE/"front.webp", archive=BASE/"protagonist-original-parts.zip"):
    source, clean = layers_without_neck(archive)
    left=source.load(); right=clean.load()
    changed=[]
    for y in range(165,215):
        for x in range(140,215):
            delta=tuple(right[x,y][i]-left[x,y][i] for i in range(3))
            if max(abs(t) for t in delta)>=3:
                changed.append((x,y,delta))
    if not (180<=len(changed)<=400):
        raise ValueError(f"Unexpected heroine neck influence region: {len(changed)} pixels")
    original=Image.open(front)
    if original.size!=(335,1013) or original.n_frames!=128:
        raise ValueError("Expected original 128-frame V4 source")
    region=(137,103,210,162)
    template=source.convert("RGB").crop(region)
    frames=[]
    for frame in range(128):
        original.seek(frame)
        im=original.convert("RGBA")
        rgb=im.convert("RGB")
        offsets=[]
        for dy in range(-2,3):
            for dx in range(-3,4):
                sample=rgb.crop((region[0]+dx,region[1]+dy,
                                 region[2]+dx,region[3]+dy))
                score=sum(ImageStat.Stat(ImageChops.difference(template,sample)).mean)
                offsets.append((score,dx,dy))
        _,dx,dy=min(offsets)
        pixels=im.load()
        for x,y,diff in changed:
            a,b=x+dx,y+dy
            if 0<=a<335 and 0<=b<1013:
                old=pixels[a,b]
                pixels[a,b]=(*(max(0,min(255,old[i]+diff[i])) for i in range(3)),old[3])
        frames.append(im)
    # Lossless preserves the fine seams of corrected face/collar pixels.
    temp=front.with_suffix(".neck-corrected.webp")
    frames[0].save(temp,format="WEBP",save_all=True,
        append_images=frames[1:],duration=50,loop=0,lossless=True,method=0,exact=True)
    with Image.open(temp) as check:
        assert check.n_frames==128 and check.size==(335,1013)
    temp.replace(front)
    print("PASS protagonist: removed duplicate front neck influence in 128 registered frames",
          len(changed),"source pixels; back unchanged")

if __name__=="__main__":
    patch()
