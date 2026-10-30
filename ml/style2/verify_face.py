"""Strict face-only training QA: never call output original identity or approved art."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
import torch
from ml.style2.face_train import FaceNet, PAL, SIDE
OUT=Path("site/pixel-lab/style2/face-lab")

def main():
    report=json.loads((OUT/"report.json").read_text())
    assert report["trained"] and report["grid"]==[96,96]
    assert report["train_real_identity_count"]==1
    assert report["train_gold"]==["A_dynamic"]
    assert report["holdout_gold"]==["B_standing"]
    assert report["human_approved_count"]==0
    assert len(report["generated_candidates"])==16
    assert report["training_steps"]>=120
    assert len(report["loss_curve"])>=3
    assert report["loss_curve"][-1][1]<report["loss_curve"][0][1],"Model did not train"
    assert report["interpretation"].startswith("16 structurally guided")
    checkpoint=torch.load(OUT/"face_model.pt",map_location="cpu",weights_only=True)
    FaceNet().load_state_dict(checkpoint["model"])
    allowed=set(map(tuple,PAL))
    files=[f"A_dynamic_gold96.png",f"B_standing_gold96.png","heldout_neural.png",
      "heldout_nearest.png"]+[x["file"] for x in report["generated_candidates"]]
    for name in files:
        file=OUT/name
        assert file.is_file(),name
        rgb=np.asarray(Image.open(file).convert("RGB"),np.uint8)
        assert rgb.shape==(SIDE,SIDE,3),name
        assert set(map(tuple,np.unique(rgb.reshape(-1,3),axis=0)))<=allowed,name
    sheet=Image.open(OUT/"contact_16.png")
    assert sheet.size==(1152,1152)
    candidates=[np.asarray(Image.open(OUT/f"candidate_{i:02}.png").convert("RGB")) for i in range(16)]
    assert len({im.tobytes() for im in candidates})>=4,"No candidate diversity"
    print("PASS 16 face-only neural candidates, source-holdout split, native 96x96, 4-color integrity and trained checkpoint")

if __name__=="__main__":main()
