#!/usr/bin/env python3
"""Publish CHAR-002's EXISTING seven provenance-tagged source image regions.

This is a playable, editable *derived-region PartMesh*, not a genuine PSD
decomposition.  The combined head/hair PNG is deliberately one rigid parent:
it is not acceptable to invent independent bangs, eyeballs or hidden pixels.
The original approved front PNG and 128-frame V4 are never overwritten.
A real original 16-layer PSD, when supplied, upgrades this same character ID.
"""
from __future__ import annotations

import hashlib
import io
import json
import shutil
import subprocess
from pathlib import Path
from zipfile import ZipFile

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "site/assets/l2d/char-002/front-source-regions.zip"
DEST = ROOT / "site/assets/l2d/library/char-002-rig-v1"
PARTS = ("shoes", "legs", "skirt", "wave_hand", "free_hand", "head_hair", "jacket")
MODULE_ID = "char-002-rig-v1"
JS = r"""
const fs=require('node:fs');
const window={};
new Function('window',fs.readFileSync('site/l2d/part-rig.js','utf8'))(window);
const data=JSON.parse(fs.readFileSync(0,'utf8'));
const model=window.PaperchalkPartRigCore.project(
 data.parts.map(p=>({...p,canvas:{width:p.w,height:p.h}})),
 data.id,'front');
process.stdout.write(JSON.stringify(model));
"""


def build():
    if not SOURCE.is_file():
        raise FileNotFoundError(
            "Run scripts/build_char002_v4.py to produce the original-pixel region archive first."
        )
    with ZipFile(SOURCE) as z:
        manifest=json.loads(z.read("layers.json"))
        rows=manifest.get("layers",{}).get("front",[])
        if tuple(row.get("id") for row in rows) != PARTS:
            raise ValueError("CHAR-002 original 7-region IDs/order changed; do not fabricate PSD layers")
        if manifest.get("layers",{}).get("back"):
            raise ValueError("CHAR-002 has no approved genuine back artwork")
        if "NOT a genuine PSD" not in manifest.get("provenance",""):
            raise ValueError("Source regions lost their explicit derived-region provenance")
        stage=Image.new("RGBA",(1024,1024))
        meta=[]
        textures={}
        DEST.mkdir(parents=True,exist_ok=True)
        for row in rows:
            ident=row["id"]
            blob=z.read(row["file"])
            with Image.open(io.BytesIO(blob)) as img:
                if img.mode!="RGBA":
                    raise ValueError(f"{ident}: original cropped texture must be RGBA")
                img.load()
                w,h=img.size
                x,y=int(row["x"]),int(row["y"])
                if not (0<=x<=1024-w and 0<=y<=1024-h):
                    raise ValueError(f"{ident}: original part escaped stage")
                if not img.getbbox():
                    raise ValueError(f"{ident}: empty region")
                # Pixel-preserving: no retouch, alpha reconstruction or duplicate pixels.
                stage.alpha_composite(img,(x,y))
            texture=f"parts/front/{ident}.png"
            out=DEST/texture
            out.parent.mkdir(parents=True,exist_ok=True)
            out.write_bytes(blob)
            textures[ident]=texture
            meta.append({"partId":ident,"name":row.get("name",ident),
              "x":x,"y":y,"w":w,"h":h,"sourcePart":True,
              "visible":True,"opacity":1})
        if stage.getbbox() is None:
            raise ValueError("Empty original artwork")
        # 100% static source pixels are restored exactly at every original
        # x/y. The permanent composite is saved only as the stage locator.
        stage.save(DEST/"front.png",optimize=True)
    model=json.loads(subprocess.run(["node","-e",JS],cwd=ROOT,
        input=json.dumps({"id":MODULE_ID,"parts":meta}),
        text=True,capture_output=True,check=True).stdout)
    if tuple(model["parts"])!=PARTS:
        raise AssertionError("Runtime and source parts have mismatched identities")
    hierarchy=model.get("bodyHierarchy")
    if hierarchy:
        # Runtime-only hierarchy is rebuilt from original part bounds at load.
        raise AssertionError("Transient anatomical hierarchy was serialized")
    # A region cut across an original image has no painted hidden pixels:
    # do not default to high-amplitude motion that would expose transparent seams.
    idle=model["idleProfile"]
    idle["body"]["amount"]=0
    idle["hair"]["amount"]=0
    idle["cloth"]["amount"]=.08
    idle["sleeves"]["amount"]=.025
    idle["breath"]["amount"]=.24
    idle["joints"]={"hands":.16,"shoulders":.10,"hips":.04}
    idle["parts"].update({"skirt":.65,"wave_hand":.48,"free_hand":.50,"head_hair":0})
    model["provenance"]="derived-region"
    model["limitations"]=[
      "Only seven pixel-preserving regions from original flat portrait",
      "Head and hair are one texture; no independent bang sway or natural blinking",
      "Hidden layers behind moved arms, hair and skirt do not exist",
      "Front view only; real 16-part PSD is required for full rig completion"
    ]
    (DEST/"front.rig.json").write_text(
        json.dumps(model,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    shutil.copyfile(SOURCE,DEST/"front-source-regions.zip")
    manifest={
      "schema":1,"id":MODULE_ID,"label":"女二 · 原图7区域基础骨骼",
      "views":{"front":{
        "portrait":"front.png",
        "sourceParts":{"file":"front-source-regions.zip","provenance":"derived-region"},
        "rig":{"type":"part-mesh","file":"front.rig.json","textures":textures}
      }}
    }
    (DEST/"module.json").write_text(
        json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("PASS CHAR-002 7 real-pixel regions -> editable front PartMesh "
          "(derived-region, NOT an original PSD); source SHA256:",
          hashlib.sha256(SOURCE.read_bytes()).hexdigest())


if __name__=="__main__":
    build()
