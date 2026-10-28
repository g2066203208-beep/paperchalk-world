"""Copyright-clean procedural bootstrap dataset and strict manifest loading."""
import argparse
import csv
import hashlib
from pathlib import Path
import random

import numpy as np
from PIL import Image, ImageDraw

from .palette import PALETTE

# No external copyrighted artwork may be incorporated without explicit permission.
PERMITTED = {"OWN", "CC0-1.0", "CC-BY-4.0", "CC-BY-SA-4.0", "MIT"}
WIDTH, HEIGHT = 32, 48


def make_icon(seed: int) -> Image.Image:
    """Draw a simple teaching icon from scratch on a native pixel grid.

    Procedural sprites are a bootstrap/smoke-test corpus only: they are not
    presented as high-quality human-drawn pixel art or a Balatro replica.
    """
    rng = random.Random(seed)
    p = [tuple(color) for color in PALETTE]
    img = Image.new("RGB", (WIDTH, HEIGHT), p[0])
    d = ImageDraw.Draw(img)
    # Consistent reserved border, with asymmetrical composition and 3-4 tones.
    d.rectangle((2, 2, WIDTH-3, HEIGHT-3), fill=p[1])
    d.rectangle((4, 4, WIDTH-5, HEIGHT-5), fill=p[2])
    accent = p[rng.choice([6,7,8,9])]
    light = p[5]; shadow = p[1]; mid = p[3]
    cx = rng.randint(14,18); cy = rng.randint(21,27)
    mode = seed % 4
    if mode == 0:  # talisman face
        d.polygon([(cx,8),(cx+10,13),(cx+9,34),(cx,39),(cx-10,34),(cx-10,13)], fill=shadow)
        d.polygon([(cx,11),(cx+7,15),(cx+6,31),(cx,35),(cx-7,31),(cx-7,15)], fill=accent)
        d.rectangle((cx-6,16,cx+2,20), fill=light)
        d.rectangle((cx-5,23,cx-3,25), fill=shadow)
        d.rectangle((cx+3,23,cx+5,25), fill=shadow)
        d.line([(cx-3,30),(cx,32),(cx+4,29)], fill=shadow, width=2)
    elif mode == 1:  # lantern
        d.line((cx,8,cx,12), fill=light, width=2)
        d.rectangle((cx-4,12,cx+4,15), fill=shadow)
        d.rectangle((cx-8,16,cx+8,35), fill=shadow)
        d.rectangle((cx-6,18,cx+6,33), fill=accent)
        d.rectangle((cx-3,20,cx+1,31), fill=light)
        d.rectangle((cx-9,35,cx+9,37), fill=mid)
    elif mode == 2: # moth emblem
        d.polygon([(cx,20),(cx-11,13),(cx-12,31),(cx-3,28)], fill=accent)
        d.polygon([(cx,20),(cx+11,13),(cx+12,31),(cx+3,28)], fill=accent)
        d.polygon([(cx-2,25),(cx-9,35),(cx-1,36)], fill=mid)
        d.polygon([(cx+2,25),(cx+9,35),(cx+1,36)], fill=mid)
        d.rectangle((cx-2,15,cx+1,34), fill=shadow)
        d.point((cx-7,21),fill=light); d.point((cx+7,21),fill=light)
        d.line((cx,15,cx-4,10), fill=light); d.line((cx,15,cx+4,10), fill=light)
    else: # hourglass
        d.rectangle((cx-10,12,cx+10,14), fill=light)
        d.rectangle((cx-10,35,cx+10,37), fill=light)
        d.line((cx-8,15,cx-8,34), fill=shadow, width=2)
        d.line((cx+8,15,cx+8,34), fill=shadow, width=2)
        d.polygon([(cx-6,16),(cx+6,16),(cx,24)], fill=accent)
        d.polygon([(cx,25),(cx-6,33),(cx+6,33)], fill=accent)
        d.rectangle((cx-2,23,cx+1,26),fill=light)
    # Intentional pixel clusters rather than per-pixel random noise.
    for dx, dy in [(-9,-10),(8,10)]:
        if rng.random() < .55:
            d.rectangle((cx+dx,cy+dy,cx+dx+2,cy+dy+1),fill=light)
    return img


def build_dataset(root: Path, count: int = 320, seed: int = 1729) -> Path:
    if count < 10:
        raise ValueError("Need at least 10 samples for validation split")
    root = Path(root)
    root.mkdir(parents=True, exist_ok=True)
    samples = []
    digests = set()
    for i in range(count):
        # Balance shape families and actively avoid duplicate training pixels.
        # Only seed variants that produce a new pixel image are admitted.
        attempt = 0
        while True:
            sample_seed = ((seed+i*1009+attempt*739)//4)*4+i%4
            image = make_icon(sample_seed)
            raw = image.tobytes()
            digest = hashlib.sha256(raw).hexdigest()
            if digest not in digests:
                digests.add(digest)
                break
            attempt += 1
            if attempt > 10000:
                raise RuntimeError("Generator exhausted distinct training samples")
        name = f"bootstrap_{i:05d}.png"
        image.save(root/name)
        samples.append(dict(path=name, source="generated-by-pixel-ml", license="OWN", sha256=digest,
                            split="val" if i%5 == 0 else "train"))
    manifest=root/"manifest.csv"
    with manifest.open("w",newline="",encoding="utf-8") as f:
        writer=csv.DictWriter(f,fieldnames=["path","source","license","sha256","split"])
        writer.writeheader(); writer.writerows(samples)
    return manifest


def load_manifest(manifest: Path) -> list[dict]:
    manifest=Path(manifest)
    if not manifest.is_file():
        raise FileNotFoundError(manifest)
    with manifest.open(encoding="utf-8", newline="") as f:
        rows=list(csv.DictReader(f))
    if not rows:
        raise ValueError("Empty dataset manifest")
    seen_paths=set(); seen_hashes={}; out=[]
    for row in rows:
        rel=Path(row["path"])
        if rel.is_absolute() or ".." in rel.parts:
            raise ValueError(f"Unsafe dataset path: {rel}")
        path=(manifest.parent/rel).resolve()
        if not path.is_file() or not path.is_relative_to(manifest.parent.resolve()):
            raise ValueError(f"Missing/outside dataset: {rel}")
        if str(rel) in seen_paths:
            raise ValueError(f"Duplicate path: {rel}")
        seen_paths.add(str(rel))
        if row["license"] not in PERMITTED or not row["source"].strip():
            raise ValueError(f"Missing or unsupported license/source for {rel}")
        split=row["split"]
        if split not in {"train","val"}:
            raise ValueError(f"Bad split: {split}")
        with Image.open(path) as img:
            img=img.convert("RGB")
            if img.size != (WIDTH,HEIGHT):
                raise ValueError(f"Wrong size {img.size} for {rel}; exact {WIDTH}x{HEIGHT} required")
            image=np.asarray(img,dtype=np.uint8)
        sha=hashlib.sha256(image.tobytes()).hexdigest()
        if sha!=row["sha256"]:
            raise ValueError(f"Pixel digest mismatch: {rel}")
        if sha in seen_hashes:
            raise ValueError(f"Duplicate content across samples / splits: {rel} and {seen_hashes[sha]}")
        seen_hashes[sha]=rel
        out.append(dict(path=path, image=image, split=split))
    if not any(r["split"]=="train" for r in out) or not any(r["split"]=="val" for r in out):
        raise ValueError("Require nonempty train and val splits")
    return out


def main():
    p=argparse.ArgumentParser(description="Generate copyright-clean synthetic training examples")
    p.add_argument("--out",type=Path,default=Path(".pixel-data/bootstrap"))
    p.add_argument("--count",type=int,default=320)
    p.add_argument("--seed",type=int,default=1729)
    args=p.parse_args()
    manifest=build_dataset(args.out,args.count,args.seed)
    print(f"Wrote {args.count} owned bootstrap sprites: {manifest}")

if __name__ == "__main__":
    main()
