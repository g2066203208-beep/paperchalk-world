#!/usr/bin/env python3
"""Reassemble exact approved V4 animated WebP binaries for GitHub Pages.

Binary GitHub source segments are each 225000 bytes except last. No re-encoding,
no downsampling, no frame alteration. Publishing must fail if hashes mismatch.
"""
from pathlib import Path
import hashlib
import shutil

BASE = Path(__file__).resolve().parents[1] / "site/assets/l2d/v4"
EXPECTED = {
    "front": ("7183dbb1053b30b92c975843bb8d6c2456fd901088710ef45d98499a50c9f456", 6314636, 29),
    "back": ("dcc4db192d382af755c18ffa24e311b223fa219cbf69f7120807de176c0f099c", 5323044, 24),
}

def assemble(side, sha256, length, pieces):
    chunk_root = BASE / "chunks"
    names = sorted(chunk_root.glob(side + "_*.bin"))
    if len(names) != pieces:
        raise ValueError(f"{side} V4 missing chunks: {len(names)} of {pieces}")
    output = BASE / f"{side}.webp"
    digest = hashlib.sha256()
    count = 0
    with output.open("wb") as handle:
        for idx, name in enumerate(names):
            if name.name != f"{side}_{idx:02d}.bin":
                raise ValueError("Missing or misordered binary V4 chunk " + name.name)
            data = name.read_bytes()
            if idx != pieces - 1 and len(data) != 225000:
                raise ValueError(f"{name}: unexpected part length {len(data)}")
            digest.update(data)
            handle.write(data)
            count += len(data)
    if digest.hexdigest() != sha256 or count != length:
        output.unlink(missing_ok=True)
        raise ValueError(f"{side} V4 SHA256 mismatch or incomplete bytes: {digest.hexdigest()} {count}")
    if output.read_bytes()[:4] != b"RIFF":
        raise ValueError("Not a valid WebP RIFF header")
    from PIL import Image
    with Image.open(output) as im:
        if im.format != "WEBP" or im.size != (335, 1013) or im.n_frames != 128:
            raise ValueError(f"{side} V4 corrupted frame geometry")
    print(f"PASS V4 {side}: 128 frames 20 fps, {count} bytes, SHA256 {sha256}")

def main():
    for side, (sha, count, pieces) in EXPECTED.items():
        assemble(side, sha, count, pieces)
    # Chunks are source-controlled, but the Pages artifact only needs merged clips.
    shutil.rmtree(BASE / "chunks")

if __name__ == "__main__":
    main()
