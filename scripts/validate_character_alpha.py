#!/usr/bin/env python3
"""Validate alpha in a committed game sprite WITHOUT modifying its pixels.

The 2026-11-02 automatic threshold patch re-encoded artwork on each deploy,
introducing damaged hair detail. Keep game asset immutable at build time.
Use scripts/matte_character.py to prepare/inspect new character art OFFLINE.
"""
from pathlib import Path
from PIL import Image
import sys

ASSET=Path("site/assets/characters/protagonist-front.webp")

def inspect(path=ASSET):
    img=Image.open(path).convert("RGBA")
    w,h=img.size
    a=img.getchannel("A")
    extrema=a.getextrema()
    center=(round(w*.50),round(h*.70))
    torso=(round(w*.47),round(h*.39))
    if min(w,h)<140 or max(w,h)<600:
        raise ValueError(f"Sprite is too small: {w}x{h}")
    if extrema[0]>0 or extrema[1]<240:
        raise ValueError(f"Must include real 0-255 transparency, got {extrema}")
    if a.getpixel(center)>8:
        raise ValueError(f"Solid background remains between legs at {center}")
    if a.getpixel(torso)<230:
        raise ValueError(f"Foreground body was accidentally erased at {torso}")
    if any(a.getpixel(p)>3 for p in [(0,0),(w-1,0),(0,h-1),(w-1,h-1)]):
        raise ValueError("Opaque source corners: background not removed")
    print(f"PASS: untouched transparent sprite {path} {w}x{h};"
          f" leg-gap alpha={a.getpixel(center)}, torso alpha={a.getpixel(torso)}")

if __name__=="__main__":
    inspect()
