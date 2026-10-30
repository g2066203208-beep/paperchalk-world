"""Decode an exact new 384x512 four-color pixel tensor from uploaded image.

The original user image (1086x1448 RGB) SHA256 is retained for provenance:
3105a922b5959beacbf190250043b257945295864dfddea63beb5ded25dc70c0.
The source RGB remains in the chat; this repository commits the lossless
converted tensor. Exact four-color pixels != artistically perfect conversion.
"""
from pathlib import Path
import base64, hashlib, lzma, json
import numpy as np
from PIL import Image
BASE=Path("site/pixel-lab/style2/new-reference")
TOKENS=Path("ml/style2/assets/shower_new_reference_384x512.lzma.b64")
PALETTE=np.array([[57,54,87],[242,165,194],[169,186,233],[255,245,230]],dtype=np.uint8)
EXPECTED="32850671d77a0981b459e3f64980f80bc990fe39ec33316157a8df90a9643e8a"
INPUT_HASH="3105a922b5959beacbf190250043b257945295864dfddea63beb5ded25dc70c0"
def decode():
    packed=base64.b64decode(TOKENS.read_text().strip(),validate=True)
    t=lzma.decompress(packed)
    assert len(t)==384*512,"wrong converted tensor dimensions"
    assert hashlib.sha256(t).hexdigest()==EXPECTED,"binary tensor corrupted in GitHub transfer"
    idx=np.frombuffer(t,dtype=np.uint8).reshape(512,384).copy()
    assert set(np.unique(idx).tolist())=={0,1,2,3}
    return idx
def output():
    BASE.mkdir(parents=True,exist_ok=True)
    idx=decode()
    Image.fromarray(PALETTE[idx],mode="RGB").save(BASE/"modern-pink-hair-384x512.png",optimize=True)
    counts=np.bincount(idx.flatten(),minlength=4).tolist()
    report={"asset_id":"new-reference-2026-10-30","source":"user-uploaded original image in chat",
      "original_rgb_size":[1086,1448],"original_rgb_sha256":INPUT_HASH,
      "native_size":[384,512],"palette":["#393657","#F2A5C2","#A9BAE9","#FFF5E6"],
      "source_index_sha256":EXPECTED,"counts":counts,
      "method":"Nearest Lab palette labels on original, area-mode downscale; mixed pixels use area-RGB nearest, no dithering; background gradient flattened",
      "status":"machine-checked native pixel candidate, NOT manually approved perfect art",
      "style_training_role":"unapproved_candidate; useful for pixel repair tests, not gold aesthetic supervision",
      "verified_no_dither":True,"original_not_embedded":True,
      "limitations":["Original high-res RGB remains in conversation; repository stores converted tensor plus SHA256.", "Four-color correctness does not guarantee aesthetically perfect conversion."]}
    (BASE/"report.json").write_text(json.dumps(report,indent=2,ensure_ascii=False))
    print(json.dumps({"artifact":str(BASE/"modern-pink-hair-384x512.png"),"counts":counts,"verified":True}))
    return idx
if __name__=="__main__":output()
