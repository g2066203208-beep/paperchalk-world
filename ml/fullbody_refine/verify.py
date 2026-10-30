"""Evidence gate: inspect real PNG data, not mere existence of filenames."""
from pathlib import Path
import json,numpy as np
from PIL import Image
import torch
from ml.fullbody_refine.refine import PixelRefiner,image_labels
def verify():
    p=Path("site/pixel-lab/refine-output")
    r=json.loads((p/"report.json").read_text(encoding="utf8"))
    assert r["trained"] and r["full_body_input"] and r["qa_passed"],r
    assert r["native_grid"]==[192,256] and r["preview_grid"]==[384,512]
    assert r["training_independent_identities"]==1
    assert r["ground_truth_is_input_not_manual_gold"]
    assert not r["art_approved"] and r["cannot_fix_anatomical_or_missing_details"]
    a=image_labels(p/"source_native.png");b=image_labels(p/"refined_native.png")
    assert a.shape==b.shape==(256,192)
    assert int((a!=b).sum())==r["native_changed_pixels"]
    assert (a!=b).sum()>0 and (a!=b).sum()<(a!=0).sum()*.01
    assert np.array_equal(a>0,b>0) and np.array_equal(a[:100],b[:100])
    assert r["refiner_recovery_accuracy"]>r["identity_baseline_accuracy"]
    assert r["source_sha256"]!=r["output_sha256"]
    assert np.array_equal(np.asarray(Image.open(p/"refined_preview_384x512.png").convert("RGBA"))[::2,::2,:3],
                          np.asarray(Image.open(p/"refined_native.png").convert("RGBA"))[:,:,:3])
    weights=torch.load(p/"refiner_checkpoint.pt",map_location="cpu",weights_only=True)
    net=PixelRefiner();net.load_state_dict(weights["state_dict"]);net.eval()
    with torch.no_grad():
        logits=net(torch.from_numpy(a.astype("int64"))[None])
    assert logits.shape==(1,5,256,192)
    print("PASS: trained checkpoint, genuinely altered D-palette pixels, intact whole-figure silhouette & synthetic holdout improvement")
if __name__=="__main__":verify()
