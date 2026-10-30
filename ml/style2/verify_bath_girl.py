"""GitHub Actions quality gate for new image conversion and *real* training output."""
from pathlib import Path
import json,hashlib
import numpy as np
from PIL import Image
import torch
from ml.style2.bath_girl_import import PALETTE,EXPECTED_RGB,load,OUT
from ml.style2.bath_girl_train import Restorer
data=load()
assert data.shape==(512,384) and len(np.unique(data))==4
files=["candidate_384x512.png","holdout_baseline.png","holdout_learned.png"]
for f in files:
    im=Image.open(OUT/f)
    assert im.size==(384,512) and im.mode=="RGB",f
    a=np.asarray(im)
    assert len(np.unique(a.reshape(-1,3),axis=0))==4
    assert set(map(tuple,np.unique(a.reshape(-1,3),axis=0)))==set(map(tuple,PALETTE))
    if f=="candidate_384x512.png":
        assert hashlib.sha256(a.tobytes()).hexdigest()==EXPECTED_RGB
assert Image.open(OUT/"native_2x.png").size==(768,1024)
report=json.loads((OUT/"report.json").read_text())
assert not report["eligible_for_gold_training"]
assert not report["original_rgb_uploaded_to_github"]
learn=report["learning"]
assert learn["steps"]>=100
assert learn["sources"]=={"gold_train":["A_dynamic"],"pseudolabel_train":["bath_girl_20261030"],"holdout":["B_standing"]}
assert learn["not_a_novel_character_generator"] and learn["not_artist_approved"]
assert learn["neural_result_not_used_to_overwrite_original_conversion"]
assert learn["loss_history"][-1][1]<learn["loss_history"][0][1],"Loss did not decrease"
assert len(learn["holdout_synthetic_corruption_tests"])==3
p=torch.load(OUT/"restore_checkpoint.pt",map_location="cpu",weights_only=True)
model=Restorer();model.load_state_dict(p["model"]);model.eval()
print("PASS new supplied artwork: fixed native RGB digest, 4 exact colors, valid trained weights, gold-vs-candidate split, same-identity heldout tests")
