#!/usr/bin/env python3
"""Verify actual WebGL screenshots show real fixture power changes.
This is not a simulated image; measure screenshots from Chromium/SwiftShader.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from PIL import Image, ImageStat

out = Path(sys.argv[1] if len(sys.argv) > 1 else "artifacts/ring-arena-quick")
screens = {
    "normal": "01-outer-full-lights-1917x906.png",
    "partial": "02-outer-partial-blackout-1917x906.png",
    "flicker": "03-outer-flicker-moment-1917x906.png",
    "outage": "04-ceiling-fixtures-red-1917x906.png",
    "restored": "05-single-encounter-light-restored-1917x906.png",
    "horror_fault": "07-horror-ballast-flicker-1917x906.png",
    "horror_dark": "08-horror-complete-failure-1917x906.png",
    "horror_restore": "09-horror-partial-restore-1917x906.png",
}
# Real, stable portions of the screenshot with no UI; changing power must
# change the *actual wall/floor/ceiling pixels*, not merely reported uniforms.
rois = {
    "ceiling": (130, 5, 1700, 123),
    "wall": (400, 135, 1550, 465),
    "floor": (630, 580, 1630, 830),
}
values = {}
red_channel_means = {}
for state, name in screens.items():
    img = Image.open(out / name).convert("RGB")
    if img.size != (1917, 906):
        raise AssertionError(f"Incorrect real game screenshot resolution for {state}: {img.size}")
    channel_means = ImageStat.Stat(img.crop(rois["wall"])).mean
    red_channel_means[state] = [round(x, 2) for x in channel_means]
    values[state] = {
        name: round(sum(ImageStat.Stat(img.crop(rect)).mean) / 3, 2)
        for name, rect in rois.items()
    }

def required(condition, message):
    if not condition:
        raise AssertionError(message + ": " + json.dumps(values, ensure_ascii=False))

for surface, minimum in [("ceiling", 10), ("wall", 12), ("floor", 7)]:
    required(
        values["normal"][surface] - values["outage"][surface] > minimum,
        f"{surface} remains lit when all six fluorescent light meshes are off",
    )

required(
    values["outage"]["wall"] + 20 < values["partial"]["wall"]
    < values["normal"]["wall"] - 3,
    "Partial blackout must have visibly different real wall exposure",
)
required(
    values["normal"]["wall"] > values["flicker"]["wall"] + 2,
    "A broken ballast must visibly change the real scene",
)
required(
    values["horror_dark"]["floor"] < values["normal"]["floor"] * .92,
    "Scripted emergency red ceiling lamps must remain more dimly lit than daylight",
)
required(
    red_channel_means["outage"][0] > red_channel_means["outage"][1] * 1.30,
    "Emergency illumination must be physically RED on the wall, not an invisible point-light state",
)
required(
    values["restored"]["wall"] > values["outage"]["wall"] + 45,
    "Real shop lighting must recover in the same one encounter",
)
required(
    values["horror_restore"]["wall"] > values["horror_dark"]["wall"] + 20,
    "Scripted light restoration must brighten the actual rendered wall",
)

result = {"type": "actual-1917x906-WebGL-image-statistics", "luminance": values, "red_wall_rgb": red_channel_means, "passed": True}
(out / "pixel-lighting-proof.json").write_text(
    json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8"
)
print("PASS actual WebGL: red ceiling emitters illuminate the same room, with measured lamp recovery")
