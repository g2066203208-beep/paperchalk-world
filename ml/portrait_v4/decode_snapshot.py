"""Decode the lossy 25-character 40x40-per-portrait V4 derivative.

This source is extracted from the original V4 art but it is NOT original quality.
It was deliberately downsampled and limited to eight colors per cell for
transport through a UTF-8 GitHub connector. It must NOT be recorded as gold.
"""
import base64
import json
import lzma
from pathlib import Path
import numpy as np
from PIL import Image

PACK=Path("site/pixel-lab/portrait-v4/source-40x40-8color.lzma.b64")
SIDE=40
COLORS=8
COUNT=25
PALETTE_BYTES=COUNT*COLORS*3
PIXEL_BYTES=COUNT*SIDE*SIDE//2
EXPECTED=PALETTE_BYTES+PIXEL_BYTES

def restore(path=PACK,output="artifacts/portrait-v4-derived/source-derived-1250.png"):
    packed=Path(path).read_text(encoding="ascii").strip()
    binary=lzma.decompress(base64.b64decode(packed,validate=True))
    if len(binary)!=EXPECTED:raise ValueError("Corrupt packed portrait source")
    colors=np.frombuffer(binary[:PALETTE_BYTES],np.uint8).reshape(COUNT,COLORS,3)
    tokens=np.frombuffer(binary[PALETTE_BYTES:],np.uint8).reshape(COUNT,SIDE*SIDE//2)
    out=Image.new("RGB",(1250,1250),(246,235,210))
    unique=[]
    for i in range(COUNT):
        high=tokens[i]>>4
        low=tokens[i]&15
        labels=np.empty(SIDE*SIDE,np.uint8);labels[::2]=high;labels[1::2]=low
        if np.any(labels>=COLORS):raise ValueError("Pixel index exceeds source palette")
        rgb=colors[i][labels.reshape(SIDE,SIDE)]
        unique.append(int(np.unique(rgb.reshape(-1,3),axis=0).shape[0]))
        tile=Image.fromarray(rgb,"RGB").resize((250,250),Image.Resampling.NEAREST)
        out.paste(tile,((i%5)*250,(i//5)*250))
    output=Path(output);output.parent.mkdir(parents=True,exist_ok=True)
    out.save(output,optimize=True)
    report={"source":"V4 original-derived 40x40 per-cell compressed low-fidelity preview",
      "original_is_present":False,"is_approved_gold":False,
      "source_cell_size":[40,40],"cells":COUNT,"palette_max":COLORS,
      "resizing_to_1250":"NEAREST, no information gain",
      "warning":"Do not use as an independently verified fine-detail pixel art target.",
      "per_cell_color_counts":unique}
    output.with_suffix(".json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf8")
    return report

if __name__=="__main__":
    print(json.dumps(restore(),ensure_ascii=False))
