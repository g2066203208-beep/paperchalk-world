"""Imported October 30 AI artwork: reconstruct native 384x512 D-palette draft.

The packed file contains the EXACT quantized 384x512 candidate produced from the
1086x1448 user image, not its full-resolution RGB original (preserved in local
deliverable only). Four-color compliance is provable; artistic perfection isn't.
This image is UNAPPROVED and NEVER joins the hand-approved style-gold set.
"""
import argparse,hashlib,json
from pathlib import Path
import numpy as np
from PIL import Image
from ml.repixelize.engine import decode
SOURCE=Path("ml/repixelize/bath_girl_candidate_384.lzma.b64")
OUT=Path("site/pixel-lab/style2/bath-girl")
PALETTE=np.array([[57,54,87],[242,165,194],[169,186,233],[255,245,230]],np.uint8)
EXPECTED_RGB="172f25f35b7d4ecafb21793b736b0949f3543006ea4bb2887aee26885020799a"
ORIGINAL_SHA256="3105a922b5959beacbf190250043b257945295864dfddea63beb5ded25dc70c0"

def load():
    idx=decode(SOURCE.read_text(encoding="ascii"),width=384,height=512)
    rgb=PALETTE[idx]
    assert idx.shape==(512,384) and set(np.unique(idx).tolist())=={0,1,2,3}
    assert hashlib.sha256(rgb.tobytes()).hexdigest()==EXPECTED_RGB,"Packed sample content mismatch"
    return idx

def create():
    OUT.mkdir(parents=True,exist_ok=True)
    idx=load()
    rgb=PALETTE[idx]
    img=Image.fromarray(rgb,"RGB")
    img.save(OUT/"candidate_384x512.png",optimize=True)
    img.resize((768,1024),Image.Resampling.NEAREST).save(OUT/"native_2x.png",optimize=True)
    crop=img.crop((95,0,300,164))
    crop.resize((820,656),Image.Resampling.NEAREST).save(OUT/"face_grid.png",optimize=True)
    report={
      "source":"uploaded image, October 30, 2026",
      "original_rgb_dimensions":[1086,1448],
      "original_rgb_sha256":ORIGINAL_SHA256,
      "original_rgb_uploaded_to_github":False,
      "source_note":"GitHub hosts the exact 384x512 *quantized* pixel snapshot, not the untouched high-resolution RGB source.",
      "conversion":"Lab nearest and area-mode consensus with low-confidence RGB-area fallback; no image generation",
      "grid":[384,512],
      "palette":["#393657","#F2A5C2","#A9BAE9","#FFF5E6"],
      "color_counts":{f"#{v[0]:02X}{v[1]:02X}{v[2]:02X}":int((idx==i).sum()) for i,v in enumerate(PALETTE)},
      "rgb_sha256":hashlib.sha256(rgb.tobytes()).hexdigest(),
      "eligible_for_gold_training":False,
      "allowed_training_use":"unapproved example / reconstruction-and-restoration experiments / negative or candidate sampling only",
      "quality_claim":"native four-color technical conversion only; visual/artistic perfection unverified"
    }
    (OUT/"conversion_report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps(report,ensure_ascii=False))
    return idx

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.parse_args()
    create()
