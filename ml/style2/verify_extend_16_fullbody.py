"""Fullbody 16 actual ML-result validator, with no fake 16-identity claims."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
import torch
from ml.style2.extend_16_fullbody import BodyPartNet, COLORS, OUT, FACES
r=json.loads((OUT/"report.json").read_text())
assert r["trained"] and r["output_grid"]==[384,512]
assert r["number_outputs"]==16 and r["approved_for_game"]==0
assert r["not_a_new_fullbody_diffusion_generator"]
assert r["not_16_independent_identities"]
assert r["not_new_drawn_clothes_or_limb_art"]
assert r["input_face_set"].startswith("the exact 16")
assert r["pose_gold"]==["A_dynamic","B_standing"]
assert r["training_steps"]>=60
assert r["train_loss"][-1][1]<r["train_loss"][0][1]
assert len(r["output_records"])==16
ckpt=torch.load(OUT/"body_part_model.pt",map_location="cpu",weights_only=True)
model=BodyPartNet()
model.load_state_dict(ckpt["state_dict"])
colors=set(map(tuple,COLORS))
unique=set()
for i,item in enumerate(r["output_records"]):
    assert item["candidate"]==i
    assert item["fullbody_file"]==f"fullbody_{i:02}.png"
    assert item["input_face_file"]==f"candidate_{i:02}.png"
    assert item["pose_template"] in ("A_dynamic","B_standing")
    assert item["transplanted_face_pixels"]>=1000
    assert (FACES/item["input_face_file"]).is_file()
    assert item["embedded_face_file"]==f"face_input_{i:02}.png"
    embedded=OUT/item["embedded_face_file"]
    assert embedded.is_file()
    assert Image.open(embedded).size==(96,96)
    assert np.array_equal(np.asarray(Image.open(embedded).convert("RGB")),
       np.asarray(Image.open(FACES/item["input_face_file"]).convert("RGB"))),"face input changed"
    p=OUT/item["fullbody_file"]
    a=np.asarray(Image.open(p).convert("RGB"),dtype=np.uint8)
    assert a.shape==(512,384,3)
    assert set(map(tuple,np.unique(a.reshape(-1,3),axis=0)))<=colors
    assert (a!=COLORS[0]).any(axis=2).sum()>22000, "no full body foreground"
    # A complete body must extend from head near top to shoe near bottom.
    ys=np.where((a!=COLORS[0]).any(axis=2))[0]
    assert ys.min()<45 and ys.max()>450
    unique.add(a.tobytes())
assert len(unique)==16,"duplicate completed sprites"
assert Image.open(OUT/"contact_16_native.png").size==(1536,2048)
assert Image.open(OUT/"contact_16_preview.png").size==(768,1024)
print("PASS: 16 distinct 384x512 pixel-accurate full-body extensions, neural part checkpoint, valid palette and complete head-to-shoe outlines")
