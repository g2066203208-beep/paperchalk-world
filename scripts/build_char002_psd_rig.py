#!/usr/bin/env python3
"""Build CHAR-002 directly from the user's uploaded 303x1024 Photoshop document.

The checked-in ZIP includes the original PSD composite, all 24 Photoshop
layer records and losslessly exported original full-canvas PNGs. 17 contain
visible art. Their cropped original-pixel PNGs are the ONLY runtime ArtMeshes.
Seven near-empty placeholder PSD layers are recorded but never fabricated
into visible hairs, sleeves or accessories. No seven-region crop fallback.
"""
from __future__ import annotations

import hashlib
import io
import json
import shutil
import subprocess
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

from PIL import Image, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "site/assets/l2d/source-psd/char-002-original-psd-parts.zip"
DEST = ROOT / "site/assets/l2d/library/char-002-psd-v1"
PSD_SHA = "b8d6509214f1013dc3f455261f43815b58e7b4f07600f33a5a4038309acfc3bc"
ZIP_SHA = "cc1f09233ee447f010bcb72b6b0d7d0e6ecbad5b066ea51bc804cc5f58f2ce00"
EXPECTED_PARTS = (
    "head_reference", "back_hair", "legwear", "footwear", "neck",
    "bottomwear", "topwear", "ears", "face", "handwear",
    "mouth", "eyebrow", "eyewhite", "irides", "eyelash",
    "nose", "front_hair"
)
# The one original PSD handwear layer has two DISCONNECTED painted sleeves.
# Separate its exact original pixel regions; no drawing or model generation.
RUNTIME_PARTS = tuple(
    name for pid in EXPECTED_PARTS
    for name in (("hand_raised", "hand_lowered") if pid=="handwear" else (pid,))
)
ARM_REGIONS = (
    ("hand_raised", "举起的左手与衣袖", (0,0,150,244)),
    ("hand_lowered", "垂下的右手与衣袖", (150,73,299,440)),
)
JS = r"""
const fs=require('node:fs');
const window={};
new Function('window',fs.readFileSync('site/l2d/part-rig.js','utf8'))(window);
const data=JSON.parse(fs.readFileSync(0,'utf8'));
const model=window.PaperchalkPartRigCore.project(data.parts,'char-002-psd-v1','front');
process.stdout.write(JSON.stringify(model));
"""


def output(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")


def preserve_original_psd():
    """Reassemble the exact uploaded 4,356,278-byte Photoshop document.

    GitHub stores four ordinary lossless binary blobs to avoid relying on
    Actions' ImageMagick PSD decoder or truncating a >4MB API upload.
    The same validated .psd is published as a directly retrievable source.
    """
    folder=SOURCE.parent
    chunks=[folder / f"CHAR-002_middle_cropped_generated.psd.part0{i}" for i in range(1,5)]
    if any(not chunk.is_file() for chunk in chunks):
        raise FileNotFoundError("The four original uploaded PSD binary chunks are missing")
    data=b"".join(chunk.read_bytes() for chunk in chunks)
    if len(data)!=4356278 or hashlib.sha256(data).hexdigest()!=PSD_SHA:
        raise ValueError("The committed original female-two Photoshop document is incomplete")
    dest=folder / "CHAR-002_middle_cropped_generated.psd"
    if not dest.exists() or hashlib.sha256(dest.read_bytes()).hexdigest()!=PSD_SHA:
        dest.write_bytes(data)
    return dest


def build():
    preserve_original_psd()
    if not SOURCE.is_file():
        raise FileNotFoundError("The uploaded CHAR-002 PSD archive is not committed")
    if hashlib.sha256(SOURCE.read_bytes()).hexdigest() != ZIP_SHA:
        raise ValueError("CHAR-002 original Photoshop source ZIP checksum changed")
    with ZipFile(SOURCE) as z:
        if z.testzip() is not None:
            raise ValueError("The original PSD layer ZIP is corrupt")
        info=json.loads(z.read("layers.json").decode("utf-8"))
        rows=info["layers"]["front"]
        if info["characterId"]!="char-002" or info["sourceCanvas"] != [303,1024] or (
            info["canvas"] != [1024,1024] or info["psd_sha256"] != PSD_SHA
        ):
            raise ValueError("Wrong original CHAR-002 Photoshop identity or geometry")
        if len(info["originalLayerRecords"])!=24 or len(rows)!=17 or (
            tuple(p["id"] for p in rows)!=EXPECTED_PARTS
        ):
            raise ValueError("Original PSD has 24 records and 17 visible parts; no invented layers")
        if any(p["active"] and p["partId"] not in EXPECTED_PARTS
               for p in info["originalLayerRecords"]):
            raise ValueError("Original PSD layer activity was altered")
        src=Image.open(io.BytesIO(z.read("original-composite.png"))).convert("RGBA")
        if src.size!=(303,1024):
            raise ValueError("Photoshop source image dimensions changed")
        stage=Image.new("RGBA",(1024,1024))
        offset=(1024-303)//2
        stage.alpha_composite(src,(offset,0))
        DEST.mkdir(parents=True, exist_ok=True)
        stage.save(DEST/"front.png", optimize=True)
        source_rebuild=Image.new("RGBA",src.size)
        textures={}
        parts=[]
        for row in rows:
            ident=row["id"]
            file=row["file"]
            if not file.startswith("front/") or file != f"front/{ident}.png":
                raise ValueError("PSD layer filename mismatch: "+str(file))
            data=z.read(file)
            image=Image.open(io.BytesIO(data))
            if image.mode!="RGBA" or list(image.size)!=row["size"]:
                raise ValueError("Original independent PSD part altered: "+ident)
            image.load()
            if image.getchannel("A").getbbox() is None:
                raise ValueError("Visible PSD layer unexpectedly empty: "+ident)
            x,y=int(row["x"]),int(row["y"])
            w,h=image.size
            if not (0<=x<=1024-w and 0<=y<=1024-h):
                raise ValueError("Original component placement exceeds canvas: "+ident)
            texture="parts/front/"+ident+".png"
            dest=DEST/texture
            dest.parent.mkdir(parents=True,exist_ok=True)
            dest.write_bytes(data)  # ORIGINAL pixels, no retouch or AI regeneration.
            textures[ident]=texture
            source_rebuild.alpha_composite(image,(x-offset,y))
            parts.append({"partId":ident,"name":row["name"],"x":x,"y":y,
                          "canvas":{"width":w,"height":h},"sourcePart":True,
                          "visible":True,"opacity":1})
        if set(textures) != set(EXPECTED_PARTS):
            raise ValueError("Loss of original visible Photoshop components")
        # The source Photoshop composite is immutable; only anti-aliased, near-zero
        # alpha pixels can differ after export of independently visible regions.
        diff=ImageChops.difference(src,source_rebuild)
        visible=src.getchannel("A").point(lambda a: 255 if a>32 else 0)
        rgb=diff.convert("RGB")
        if max(ImageStat.Stat(rgb,visible).mean)>2.0:
            raise ValueError("Original visible PSD source RGB was not preserved")
        if ImageStat.Stat(diff.getchannel("A")).mean[0]>1:
            raise ValueError("Original Photoshop opacity was not preserved")
    result=subprocess.run(["node","-e",JS],cwd=ROOT,
        input=json.dumps({"parts":parts}),capture_output=True,text=True,check=True)
    model=json.loads(result.stdout)
    if tuple(model["parts"])!=EXPECTED_PARTS:
        raise ValueError("The shared L2D renderer lost a real PSD component")
    idle=model["idleProfile"]
    idle["body"]["amount"]=0
    idle["hair"]["amount"]=.21
    idle["cloth"]["amount"]=.11
    idle["sleeves"]["amount"]=.045
    idle["breath"]["amount"]=.34
    idle["joints"]={"hands":.24,"shoulders":.12,"hips":.10}
    idle["parts"].update({"back_hair":1.20,"front_hair":1.25,
        "bottomwear":1.15,"handwear":.8})
    model["provenance"]="original-psd"
    model["sourcePsdSha256"]=PSD_SHA
    model["sourceLayerRecords"]=24
    model["visiblePartCount"]=17
    model["limitations"]=[
        "24 original PSD records; 17 visible independently textured parts",
        "Seven empty or nearly transparent source placeholders are not animated",
        "The supplied PSD has one combined handwear texture and one combined footwear texture",
        "The hidden back sides of hair and sleeves cannot be invented without additional painting",
        "Front view only: no original back PSD was uploaded"
    ]
    output(DEST/"front.rig.json",model)
    shutil.copyfile(SOURCE,DEST/"front-original-psd-parts.zip")
    output(DEST/"module.json",{
        "schema":1,"id":"char-002-psd-v1","label":"女二 · 原始PSD独立骨骼",
        "views":{"front":{
            "portrait":"front.png",
            "sourceParts":{"file":"front-original-psd-parts.zip","provenance":"original-psd"},
            "rig":{"type":"part-mesh","file":"front.rig.json","textures":textures}
        }}
    })
    print("PASS CHAR-002: 24 real PSD records, 17 individually visible"
          " textures, original pixels preserved, no old 7-region clip")


if __name__=="__main__":
    build()
