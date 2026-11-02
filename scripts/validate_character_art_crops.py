#!/usr/bin/env python3
"""Verify exact user-selected full-body PNG crops, no generated placeholders."""
import hashlib
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ARTS = [
    ("CHAR-002", "site/assets/characters/char-002/front.png", 303, 1024,
     "a0365da4e63436093800516ee595f4f3e593618a8b48ca80f9b4ebb24356ebef"),
    ("CHAR-003", "site/assets/characters/char-003/front.png", 297, 1024,
     "ad832b27c9cbd5c3a33eb54dfa23b02d2511292fee998537e705873a9d9fb71d"),
    ("CHAR-016", "site/assets/characters/char-016/front.png", 315, 1024,
     "47f730a0584102ee0086240f70560e9e95be5c411d084f5f96c1fcff0f1d8ba3"),
    ("CHAR-016-source", "site/assets/characters/char-016/reference-sheet.png", 1024, 1024,
     "87fdc19c61d067447fcd4322b65a53e2939ff52f7b3e957651fcc1394a5ac110"),
]
for name, rel, width, height, expected_sha256 in ARTS:
    data = (ROOT / rel).read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", f"{name}: not a PNG"
    assert data[12:16] == b"IHDR", f"{name}: PNG missing IHDR"
    real_width, real_height = struct.unpack(">II", data[16:24])
    assert (real_width, real_height) == (width, height), f"{name}: bad original crop size"
    sha = hashlib.sha256(data).hexdigest()
    assert sha == expected_sha256, f"{name}: artwork was replaced or recompressed without approval"
    assert len(data) > 100_000, f"{name}: unexpectedly small placeholder artwork"
    print(f"PASS {name}: stored original source or unchanged pixel crop, {width}x{height} PNG, SHA256 verified")
