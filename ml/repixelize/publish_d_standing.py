#!/usr/bin/env python3
"""Publish the new standing D-palette character, train a real local denoiser,
and keep deterministic conservation distinct from neural restoration.
Pixel tokens are authored from the user-approved candidate image; no artist
assets are downloaded or copied.
"""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

from ml.repixelize.engine import decode
from ml.repixelize import train as ml

D_COLORS = ["#393657", "#F2A5C2", "#A9BAE9", "#FFF5E6"]
D_PALETTE = np.array([[int(hexcolor[i:i + 2], 16) for i in (1, 3, 5)]
                      for hexcolor in D_COLORS], dtype=np.uint8)
W, H = 384, 512


def publish(source: Path, site: Path, steps: int = 300):
    defined = json.loads(Path("site/pixel-lab/palette-choices.json").read_text())
    registered = next(item["colors"] for item in defined if item["id"] == "D")
    if registered != D_COLORS:
        raise AssertionError("The standing character and D style palette differ")
    tokens = decode(source.read_text(encoding="ascii"), W, H)
    if tokens.shape != (H, W) or np.any(tokens > 3):
        raise AssertionError("Invalid native pixel tokens")
    counts = np.bincount(tokens.ravel(), minlength=4).tolist()
    if min(counts) == 0:
        raise AssertionError("Exactly four colors are required")
    site.mkdir(parents=True, exist_ok=True)
    final = Image.fromarray(D_PALETTE[tokens], mode="RGB")
    name = "d-standing-v1-384x512.png"
    final.save(site / name, optimize=True)
    final.resize((W * 2, H * 2), Image.Resampling.NEAREST).save(
        site / "d-standing-v1-preview-2x.png", optimize=True)
    decoded = np.asarray(Image.open(site / name).convert("RGB"))
    actual = {tuple(map(int, v)) for v in decoded.reshape(-1, 3)}
    expected = {tuple(map(int, v)) for v in D_PALETTE}
    if actual != expected or final.size != (W, H):
        raise AssertionError("Four-color PNG integrity failure")
    # The trained RGB-patch model is evaluated on synthetic corruption of the
    # same illustration. No claim of a learned artist style or generalization.
    ml.PALETTE = D_PALETTE
    report, params = ml.run(tokens, steps=steps)
    weights_path = site / "d-standing-v1-neural-weights.npz"
    np.savez_compressed(weights_path, w1=params[0], b1=params[1],
                        w2=params[2], b2=params[3])
    degraded = ml.degrade(tokens, np.random.default_rng(20261030))
    feats = ml.features(degraded)
    prediction = np.empty(W * H, np.uint8)
    for i in range(0, W * H, 8192):
        x = feats[i:i + 8192]
        prediction[i:i + len(x)] = (
            np.maximum(0, x @ params[0] + params[1]) @ params[2] + params[3]
        ).argmax(axis=1)
    prediction = prediction.reshape(H, W)
    image = Image.fromarray(D_PALETTE[prediction], mode="RGB")
    image.save(site / "d-standing-v1-neural-denoise-demo.png", optimize=True)
    info = {
        "asset": name,
        "title": "D 雾樱玻璃 · 站姿角色 · 单人全身像素画",
        "source": "new single standing-character image created in this conversation",
        "source_sha256": "9411f813fc068653ab914acfc4ba36df9c321db8985136313dc8eb289dae0027",
        "source_grid": [1086, 1448],
        "native_grid": [W, H],
        "palette_id": "D",
        "palette": D_COLORS,
        "color_pixel_counts": counts,
        "distinct_rgb_colors": 4,
        "other_rgb_colors": 0,
        "alpha_pixels": 0,
        "conversion": "original RGB -> nearest D color -> four-role area vote -> isolated foreground speck removal -> exact native 384x512 tokens",
        "pixel_tokens_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "output_pixel_sha256": hashlib.sha256(decoded.tobytes()).hexdigest(),
        "training": report,
        "neural_reconstruction_accuracy_on_degraded_same_sprite": round(float(np.mean(prediction == tokens)), 5),
        "final_image_is_neural_inference": False,
        "limitation": "True four-color grid verified. A same-image MLP is trained and run as denoising evidence; the faithful published PNG remains deterministic. Neither step guarantees aesthetic perfection.",
    }
    (site / "d-standing-v1-report.json").write_text(
        json.dumps(info, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({
        "native_grid": info["native_grid"], "colors": info["palette"],
        "model_steps": steps, "holdout_accuracy": report["neural_accuracy"],
        "baseline": report["nearest_color_baseline"],
        "neural_demo_accuracy": info["neural_reconstruction_accuracy_on_degraded_same_sprite"],
    }, ensure_ascii=False))
    return info


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=Path("ml/repixelize/d-standing-v1.tokens.b64"))
    parser.add_argument("--site", type=Path, default=Path("site/pixel-lab"))
    parser.add_argument("--steps", type=int, default=300)
    args = parser.parse_args()
    publish(args.source, args.site, args.steps)
