"""Check multi-face model is trained on true third-party CC0 compositions."""
import json
from pathlib import Path
from PIL import Image
import numpy as np
import torch
from ml.style2.face_general_train import VAE,COLORS,SIDE
p=Path("site/pixel-lab/style2/face-general")
d=json.loads((p/"general_report.json").read_text())
assert d["pretrained"] and d["source_combinations_available"]>=4000
assert d["distinct_train_combinations"]>=64 and d["distinct_holdout_combinations"]>=10
assert d["not_independent_character_identity_count"]
assert "overlap" in d["holdout_policy"]
assert d["candidate_count"]>=8
assert d["exact_training_copies"]==0
assert d["mean_nearest_train_pixel_difference"]>.005
assert d["human_approved_count"]==0 and not d["pixel_96x96_quality"]
assert d["steps"]>=100
weights=torch.load(p/"generic_faces_weights.pt",weights_only=True,map_location="cpu")
net=VAE(weights["latent"]);net.load_state_dict(weights["state_dict"]);net.eval()
allowed=set(map(tuple,COLORS))
arr=[]
for i in range(d["candidate_count"]):
    file=p/f"generated_{i:02d}.png"
    im=np.asarray(Image.open(file).convert("RGB"),dtype=np.uint8)
    assert im.shape==(SIDE,SIDE,3)
    assert set(map(tuple,np.unique(im.reshape(-1,3),axis=0)))<=allowed
    arr.append(im.tobytes())
assert len(set(arr))>=8
for f in ("generated_contact.png","training_combinations_contact.png","heldout_combinations_contact.png"):
    assert (p/f).is_file()
print(f"PASS multi-combination actual VAE: {d['distinct_train_combinations']} train, {d['distinct_holdout_combinations']} holdout, {len(arr)} proposals, D four colors.")
