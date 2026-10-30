"""Quality gates for CC0 parts + trained factor-model pipeline."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
import torch
from ml.style2.face_parts_structured import PartNet,D,OUT
report=json.loads((OUT/"report.json").read_text())
assert report["source_combinations_total"]==616
assert report["train_combinations"]>=400 and report["heldout_combinations"]>=100
assert report["heldout_independent_artists"] is False
assert report["heldout_independent_parts"] is False
assert report["sampled_unseen_combinations"] is True
assert report["all_four_colors"]
assert report["number_generated"]==32
assert report["styles_approved_for_game"]==0
assert "NOT a neural pixel decoder" in report["pixel_source"]
assert report["heldout_accuracy"]["shape_accuracy"]>=.25
assert report["heldout_accuracy"]["feature_accuracy"]>=.20
assert report["heldout_accuracy"]["hair_accuracy"]>=.25
assert len(report["generated_triples"])==32
assert len({tuple(d[k] for k in ("shape","face","hair")) for d in report["generated_triples"]})==32
ckpt=torch.load(OUT/"part_classifier.pt",map_location="cpu",weights_only=True)
net=PartNet();net.load_state_dict(ckpt["state_dict"])
colors=set(map(tuple,D))
images=[]
for i in range(32):
    p=OUT/f"face_{i:02}.png"
    assert p.exists()
    a=np.array(Image.open(p).convert("RGB"))
    assert a.shape==(128,128,3)
    assert set(map(tuple,np.unique(a.reshape(-1,3),axis=0)))<=colors
    images.append(a.tobytes())
assert len(set(images))==32
for name in ("faces_32.png","train_24.png","holdout_16.png"):
    assert (OUT/name).is_file()
print("PASS: trained compositional CNN, heldout component accuracy, 32 unique face combinations, four-color 128px PNG and honest non-neural-pixel source")
