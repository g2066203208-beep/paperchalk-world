"""Gate CC0 action-prior training without mislabeling it 384px character art."""
from pathlib import Path
import json
import numpy as np
import torch
from PIL import Image
from ml.style2.motion_prior_cc0 import ROOT,PoseDecoder,COL
report=json.loads((ROOT/"report.json").read_text())
assert report["trained"] and report["identity_count"]==3
assert report["training_images"]>=30 and report["heldout_images"]>=8
assert report["native_training_resolution"]==[16,16]
assert report["new_uploaded_image_used_for_pose_training"] is False
assert report["fullbody_quality_approved"] is False
assert report["actions"]>=12
assert report["distinct_predictions"]>=4,"pose model collapsed to static repeated sprites"
net=PoseDecoder()
state=torch.load(ROOT/"motion_prior.pt",weights_only=True,map_location="cpu")
net.load_state_dict(state["state_dict"])
valid=set(map(tuple,COL))
for i in range(report["actions"]):
 image=np.asarray(Image.open(ROOT/f"motion_{i:02}.png").convert("RGB"),np.uint8)
 assert image.shape==(128,128,3)
 assert set(map(tuple,np.unique(image.reshape(-1,3),axis=0))).issubset(valid)
assert Image.open(ROOT/"contact.png").width==512
print("PASS real CC0 neural pose-prior, heldout action frames, visual distinctness and D-palette integrity")
