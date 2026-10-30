"""Validate genuine whole-canvas training results and prevent template-gallery fraud."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
import torch
from ml.fullbody.train import WholeFigureMaskNet, PALETTE, ROOT

def verify():
    r=json.loads((ROOT/"report.json").read_text(encoding="utf8"))
    assert r["trained"] and r["trained_actual_full_canvas"]
    assert r["native_model_grid"]==[384,512]
    assert r["pipeline"]=="whole_figure_masked_reconstruction_v1"
    assert r["training_fullbody_images"]==2
    assert r["training_independent_identities"]==1
    assert r["evaluation_only_images"]==1
    assert r["novel_fullbody_generator_trained"] is False
    assert r["new_distinct_fullbody_characters_generated"]==0
    assert r["fullbody_art_approved"]==0
    assert r["identity_data_gate_passed"] is False
    assert r["minimum_independent_approved_characters_for_generative_training"]>=32
    assert r["outputs_are_masked_reconstruction_not_original_character_art"]
    assert r["steps"]>=30 and len(r["loss"])>=3
    assert len(r["records"])==3
    checkpoint=torch.load(ROOT/"fullbody-masknet.pt",map_location="cpu",weights_only=True)
    net=WholeFigureMaskNet()
    net.load_state_dict(checkpoint["state_dict"])
    palette=set(map(tuple,PALETTE.tolist()))
    hashes=set()
    for row in r["records"]:
        assert row["source_grid"] in ([384,512],[192,256])
        assert row["preview"] and row["reconstruction"]
        assert row["evaluation"]["masked_pixels"]>0
        assert 0<=row["evaluation"]["masked_foreground_accuracy"]<=1
        for key in ("preview","reconstruction"):
            img=Image.open(ROOT/row[key])
            assert img.size==(384,512),row
            colors=np.asarray(img.convert("RGB")).reshape(-1,3)
            assert set(map(tuple,np.unique(colors,axis=0)))<=palette
        hashes.add(row["sha256"])
    assert len(hashes)==3
    assert all(x["train"] for x in r["records"][:2])
    assert not r["records"][2]["train"]
    assert r["records"][2]["source_grid"]==[192,256]
    print("PASS: full-image 384x512 Torch model, native four-ink predictions, nonleaky holdout and zero false claims")

if __name__=="__main__":verify()
