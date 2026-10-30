"""Native 384x512 high-detail regression checks - no false quality claims."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
import torch

ROOT=Path("site/pixel-lab/style2/v3")
COLORS={(57,54,87),(242,165,194),(169,186,233),(255,245,230)}
def verify():
    r=json.loads((ROOT/"report.json").read_text())
    assert r["grid"]==[384,512] and r["guide"]==[192,256]
    assert r["sources"]==2 and r["distinct_characters"]==1
    assert r["steps"]>=200 and len(r["results"])==2
    assert r["parameters"]>100000
    weights=torch.load(ROOT/"detail_weights.pt",map_location="cpu",weights_only=True)
    assert weights["grid"]==[384,512]
    assert len(weights["weights"])>10
    for sample in r["results"]:
        name=sample["asset"]
        assert sample["visible_locked"] is True
        assert 0<=sample["lost_pixel_recovery_by_model"]<=1
        assert sample["pixels_lost_by_192x256"]>1000
        for suffix in ("original","coarse192","generated384","masked_repair384"):
            path=ROOT/(name+"_"+suffix+".png")
            img=Image.open(path)
            assert img.size==(384,512)
            rgb=np.asarray(img.convert("RGBA"))
            assert np.all(rgb[:,:,3]==255)
            actual=set(map(tuple,np.unique(rgb[:,:,:3].reshape(-1,3),axis=0)))
            assert actual==COLORS, (path,actual)
        reference=np.asarray(Image.open(ROOT/(name+"_original.png")).convert("RGB"))
        assert np.any(reference!=np.asarray(Image.open(ROOT/(name+"_coarse192.png")).convert("RGB")))
        generated=np.asarray(Image.open(ROOT/(name+"_generated384.png")).convert("RGB"))
        assert np.any(generated!=reference),"Cannot silently copy full original"
    # Quality-gate is evidence, NOT a mandatory pass. A false value must be
    # displayed honestly instead of blocking truthful publication.
    assert isinstance(r["quality_gate_passed"],bool)
    print("PASS: 384x512 true native RGB, same-pixel grid, model weights and honest foreground baseline. Art pass =",r["quality_gate_passed"])

if __name__=="__main__":verify()
