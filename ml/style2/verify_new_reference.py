"""Validation of uploaded reference conversion and real restoration training."""
import json,hashlib
from pathlib import Path
import numpy as np
from PIL import Image
import torch
from ml.style2.new_reference import decode,PALETTE,BASE,EXPECTED
from ml.style2.new_reference_train import PixelRepair
raw=decode();assert raw.shape==(512,384)
assert hashlib.sha256(raw.tobytes()).hexdigest()==EXPECTED
image=np.asarray(Image.open(BASE/"modern-pink-hair-384x512.png").convert("RGB"))
assert image.shape==(512,384,3)
assert np.array_equal(image,PALETTE[raw])
report=json.loads((BASE/"report.json").read_text())
assert report["native_size"]==[384,512] and "unapproved_candidate" in report["style_training_role"]
ml=json.loads((BASE/"ml_report.json").read_text())
assert ml["trained"] and ml["steps"]>=80
assert ml["models_new_pose"] is False and ml["does_not_prove_perfect_conversion"]
state=torch.load(BASE/"learned_repair.pt",map_location="cpu",weights_only=True)
net=PixelRepair();net.load_state_dict(state["state_dict"])
for n in ("heldout_truth","heldout_masked","heldout_repaired"):
 a=np.asarray(Image.open(BASE/(n+".png")).convert("RGB"))
 assert a.shape==(136,384,3)
 assert set(map(tuple,np.unique(a.reshape(-1,3),axis=0))).issubset(set(map(tuple,PALETTE)))
assert ml["masked_accuracy"]>=0 and ml["masked_accuracy"]<=1
print("PASS: exact uploaded 4-color native source + 3-image real neural repair weights + honest holdout")
