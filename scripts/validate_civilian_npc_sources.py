#!/usr/bin/env python3
"""Verify source images of independent civilian NPCs without silently modifying them."""
import hashlib
import json
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "site/data/npc/civilians/gallery.v1.json"
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"

def check():
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    errors = []
    seen = set()
    for c in data["characters"]:
        assert c["id"] not in seen, f"Duplicate NPC: {c['id']}"
        seen.add(c["id"])
        s = c["source"]
        path = ROOT / s["path"]
        if not path.is_file():
            errors.append(f"{c['id']}: missing: {s['path']}")
            continue
        blob = path.read_bytes()
        digest = hashlib.sha256(blob).hexdigest()
        if digest != s["sha256"]:
            errors.append(f"{c['id']}: SHA mismatch, got {digest}")
        if len(blob) != s["bytes"]:
            errors.append(f"{c['id']}: byte size mismatch")
        if not blob.startswith(PNG_SIGNATURE) or len(blob) < 26:
            errors.append(f"{c['id']}: not PNG")
            continue
        w, h = struct.unpack(">II", blob[16:24])
        if [w, h] != s["dimensions"]:
            errors.append(f"{c['id']}: wrong dimensions: {w}x{h}")
        color_type = blob[25]
        if color_type != 2:  # PNG Truecolour (RGB)
            errors.append(f"{c['id']}: PNG color type {color_type}, expected RGB=2")
        if s["actualImageLeftToRight"] != ["side_left", "front", "back"]:
            errors.append(f"{c['id']}: image view order inconsistent")
        print(f"{c['id']}: {s['path']}  {w}x{h} RGB  sha256={digest[:12]}")
    if errors:
        print("\n" + "\n".join(errors), file=sys.stderr)
        return 1
    print(f"All {len(seen)} original civilian NPC images verified.")
    return 0

if __name__ == "__main__":
    sys.exit(check())
