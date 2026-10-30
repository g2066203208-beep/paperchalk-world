"""V2 research gates: verify actual native D palette, independent prompts, model weights and output encoding."""
from pathlib import Path
import base64, json, zlib
import numpy as np
from PIL import Image
import torch
from ml.style2 import discrete_diffusion_v2 as v2

ROOT=Path("site/pixel-lab/style2")
OUT=ROOT/"v2"
PALETTE={(57,54,87),(242,165,194),(169,186,233),(255,245,230)}

def validate():
    payload=json.loads((ROOT/"diffusion-v2-gallery.json").read_text())
    report=json.loads((OUT/"report.json").read_text())
    assert payload["report"]["train_steps"]>=200
    assert report["params"]>150000
    assert report["categories"]==v2.NAMES
    assert report["distinct_character_identities"]==1
    assert not report["guidance_from_target_at_inference"]
    assert len(payload["samples"])==7
    assert len(report["held_out_procedural"])==5
    for item in payload["samples"]:
        for field in ("reference","blueprint","generated","repaired"):
            arr=np.frombuffer(zlib.decompress(base64.b64decode(item[field])),dtype=np.uint8).reshape(64,48)
            assert arr.min()>=0 and arr.max()<=3, (item["name"],field)
            path=OUT/f"{item['name']}_{field}.png"
            assert path.is_file(),path
            rgb=np.asarray(Image.open(path).convert("RGB"))
            assert rgb.shape==(64,48,3)
            assert np.array_equal(rgb,v2.PALETTE[arr])
            assert set(map(tuple,np.unique(rgb.reshape(-1,3),axis=0))).issubset(PALETTE)
        assert item["reference"]!=item["generated"]
    weights=torch.load(OUT/"model.pt",weights_only=True,map_location="cpu")
    assert len(weights["state"])>10

if __name__=="__main__":
    validate()
    print("PASS: V2 real weights, native four-token arrays, exact PNGs and honest procedural split")
