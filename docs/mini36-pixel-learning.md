# PIXEL LAB MINI36 — 36 character native 24x24 dataset and self-supervised silhouette experiment

Date: 2026-11-01.

## Provenance / what is and isn't done

- **36 sprites, 6 by 6**, from the exact generated concept reference in the conversation. No new GPT rendering during reconstruction.
- Original concept reference SHA256 `c13119d4d2eb175b7d1efd3df950b5aeaa2a4636b3e13a779a350085491d97bf` (original 1254x1254 PNG in conversation). Repository stores a **Q82 compressed full-size WEBP** (`source-concept-q82.webp`), **not** byte-identical original PNG.
- Each 24x24 RGBA sprite is serialized **losslessly and verifiably** in `mini36-v1.lossless.lzma.b64`, with independent 14-color palette and exactly 576 color indices. The uncompressed pack SHA256 is `cd406a55ba1119cc31b7464fafd390a7622972318a0622825fcdddca911575d8`.
- 24x24 is **native for the rebuilt deliverable**, not proof the image was originally drawn at this grid. This is an algorithmically reconstructed candidate, **not pixel-artist verified gold or perfect pixel art**.
- `ml/mini36/atlas.py` decodes and exports all **36 independent transparent PNGs**, plus a **240x240 master** and **960x960 4× integer-nearest preview**.
- `ml/mini36/learn.py` performs real PyTorch CPU silhouette restoration training on **30 characters**, evaluates **six never-trained identities** (last row) and emits 36 separate black-white ML suggestions for comparisons. 24x24 indexed sprites are never silently replaced by model predictions.
- All image boundaries are integer pixel grid. Alpha only 0 or 255. 14 or fewer opaque colors per sprite. 8 native pixel margin around every 24x24 sprite within its 40x40 gallery cell, so no neighboring overlap.
- Face and hands are still imperfect: the model learns against generated pseudo-labels and synthesized corruption. A good IoU on held-out sprites **does not demonstrate human-like pixel cluster aesthetics or facial precision**.

## Exact source layout correction

The original visually-even 6x6 sheet was **not** evenly split at 209 pixels per row. The actual gap-aligned approximate source separators are:

```
X: 0, 209, 408, 627, 824, 1033, 1254
Y: 0, 217, 444, 661, 871, 1068, 1254
```

Using equidistant `round(k*1254/6)` produces residual pixel-shapes at the tops of rows 3–6; selecting the blank gutters avoids accidental transfer from neighboring sprites. The reconstruction is independently quantized per person, with source crop and pixel-space scaling to fit within 24x24. Pack stores the approved **candidate** only; do not reinterpret the pack as original ground truth.

## Production quality gate

The workspace can validate: exactly 36 sprites, exactly 24x24, complete RGBA pixels (no semitransparency), integer-upscale equivalence, ≤14 colors per sprite, 8 logical px gallery margins, and no portrait duplication. None of those checks proves the result is visually perfect; manual pixel-level retouching of eyes, mouth, outlines, silhouettes and costume clusters remains required.

## Workflows

- GitHub Action: `.github/workflows/mini36-ml.yml`
- Source data: `site/pixel-lab/mini36/mini36-v1.lossless.lzma.b64`
- Gallery and 1×1 pixel editor: `site/pixel-lab/mini36/index.html`
- CSV-less JSON manifest exported at `site/pixel-lab/mini36/atlas-manifest.json`

```sh
pip install numpy pillow opencv-python-headless torch
python -m ml.mini36.atlas
python -m ml.mini36.learn --out artifacts/mini36/ml --steps 250
python -m unittest discover -s tests -p test_mini36.py -v
```