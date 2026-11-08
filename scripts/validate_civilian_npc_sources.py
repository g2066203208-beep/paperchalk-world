#!/usr/bin/env python3
"""Validate the single civilian NPC gallery, preserving approved legacy art."""
import hashlib
import json
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GALLERY = ROOT / "site/data/npc/civilians/gallery.v1.json"
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"

def check():
    data = json.loads(GALLERY.read_text(encoding="utf-8"))
    errors = []
    seen = set()
    for npc in data["characters"]:
        name = npc["id"]
        if name in seen:
            errors.append(f"{name}: duplicate ID")
        seen.add(name)
        source = npc["source"]
        file = ROOT / source["path"]
        if not file.is_file():
            errors.append(f"{name}: missing binary: {source['path']}")
            continue
        blob = file.read_bytes()
        digest = hashlib.sha256(blob).hexdigest()
        if digest != source["sha256"]:
            errors.append(f"{name}: SHA-256 mismatch: {digest}")
        git_sha = hashlib.sha1(b"blob " + str(len(blob)).encode("ascii") + b"\\x00" + blob).hexdigest()
        if git_sha != source.get("gitBlobSha"):
            errors.append(f"{name}: Git blob SHA mismatch: {git_sha}")
        if source.get("bytes") is not None and len(blob) != source["bytes"]:
            errors.append(f"{name}: wrong byte count")
        if len(blob) < 26 or not blob.startswith(PNG_SIGNATURE):
            errors.append(f"{name}: invalid PNG")
            continue
        width, height = struct.unpack(">II",blob[16:24])
        if [width,height] != source["dimensions"]:
            errors.append(f"{name}: wrong dimensions {width}x{height}")
        if blob[25] != 2:
            errors.append(f"{name}: source expected RGB PNG, got PNG color type {blob[25]}")
        expected = ["front","side_left","back","seated_reading"] if name=="NPC-M003" else ["side_left","front","back"]
        if source["actualImageLeftToRight"] != expected:
            errors.append(f"{name}: incorrect documented view order")
        if name == "NPC-M003":
            if source["path"] != "site/assets/characters/metro/npc-m003/approved-four-poses.png":
                errors.append("M003: do not move or duplicate approved image")
            for extra in [npc["production"]["rgbaAtlas"],*npc["production"]["sprites"].values()]:
                if not (ROOT / extra).is_file():
                    errors.append(f"M003: missing approved RGBA asset: {extra}")
        print(f"{name}: {width}x{height} RGB sha256={digest[:12]} {source['path']}")
    if errors:
        print("\n".join(errors),file=sys.stderr)
        return 1
    print(f"All {len(seen)} civilian NPC original source images verified.")
    return 0

if __name__ == "__main__":
    sys.exit(check())
