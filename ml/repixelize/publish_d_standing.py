"""Deterministically publish the D style standing master; NO obsolete model training."""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image
from ml.repixelize.engine import decode

D_COLORS=["#393657","#F2A5C2","#A9BAE9","#FFF5E6"]
D_PALETTE=np.array([[int(c[i:i+2],16) for i in (1,3,5)] for c in D_COLORS],dtype=np.uint8)
W,H=384,512

def publish(source:Path,site:Path):
    source=Path(source);site=Path(site)
    options=json.loads(Path("site/pixel-lab/palette-choices.json").read_text())
    assert next(x["colors"] for x in options if x["id"]=="D")==D_COLORS
    labels=decode(source.read_text(encoding="ascii"),W,H)
    assert labels.shape==(H,W) and set(np.unique(labels).tolist())=={0,1,2,3}
    site.mkdir(parents=True,exist_ok=True)
    img=Image.fromarray(D_PALETTE[labels],"RGB")
    img.save(site/"d-standing-v1-384x512.png",optimize=True)
    img.resize((W*2,H*2),Image.Resampling.NEAREST).save(site/"d-standing-v1-preview-2x.png",optimize=True)
    actual=np.asarray(Image.open(site/"d-standing-v1-384x512.png").convert("RGB"))
    assert np.array_equal(actual,D_PALETTE[labels])
    report={
       "asset":"d-standing-v1-384x512.png",
       "title":"D 雾樱玻璃 · 原生四色站姿人物",
       "source":"original four-color standing master preserved as exact pixel tokens",
       "native_grid":[W,H],"palette_id":"D","palette":D_COLORS,
       "color_pixel_counts":np.bincount(labels.ravel(),minlength=4).tolist(),
       "distinct_rgb_colors":4,"other_rgb_colors":0,"alpha_pixels":0,
       "output_pixel_sha256":hashlib.sha256(actual.tobytes()).hexdigest(),
       "pixel_tokens_sha256":hashlib.sha256(source.read_bytes()).hexdigest(),
       "conversion":"faithful token decode and exact D palette export",
       "model_training":False,
       "note":"This is a preserved reference asset. All active generative training is in system 02 V2, not on this page."
    }
    (site/"d-standing-v1-report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps({"grid":report["native_grid"],"colors":4,"reference_only":True},ensure_ascii=False))
    return report

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--source",type=Path,default=Path("ml/repixelize/d-standing-v1.tokens.b64"))
    p.add_argument("--site",type=Path,default=Path("site/pixel-lab"))
    a=p.parse_args()
    publish(a.source,a.site)
