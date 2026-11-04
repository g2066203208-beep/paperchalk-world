#!/usr/bin/env python3
"""Non-destructive wearable skin attachment for CHAR female-06.

Consumes the two *original* PSD-derived, published modules after inbox install.
All edits happen to the disposable Pages build output, NOT the uploaded ZIPs.

- Adds only the approved source shorts to the female-06 base model.
- Parents garment to original legwear using a region-weighted shared leg
  deformation field in part-rig.js; no independent skirt/cloth flutter.
- Repairs the new outfit's left/right sleeves: their previous arm-raised
  bones had the shoulder root at the wrist and visibly detached.
"""
from __future__ import annotations

import copy
import json
from pathlib import Path
from PIL import Image

PANTS_ID = "pants_overlay"
BASE_ID = "female-06"
OUTFIT_ID = "female-06-outfit-02"
PANTS_BOUNDS = (420, 415, 164, 162)  # preserved source raster in current approved module
# Original legwear: (413,409,164,605), hip-alpha width ~139px at Y=433.
# Comparing actual studio screenshots of base female06 and outfit02 showed the last\n# attempted fit was visibly too narrow and flat (about 95px vs 135px on screen).\n# Restore the authored loose bubble-short width, retain waist attachment, and\n# align the hem over the original thigh tops without altering body art.
# Fit as non-destructive Rig placement, not by repeatedly resizing the PNG.
PANTS_PLACEMENT = {"scaleX": 1.20, "scaleY": 1.00,
                   "offsetX": -15.0, "offsetY": -17.0}


def read(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write(path: Path, value: dict) -> None:
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n",
                    encoding="utf-8")


def arm_bones(side: str) -> list:
    # Screen-left sleeve sits on the screen-left shoulder, which is the
    # RIGHT edge of that sleeve's crop.  Screen-right is mirrored.
    left = side == "l"
    x0, x1, x2 = ((.83, .55, .16) if left else (.17, .45, .85))
    return [
        dict(id="shoulder", parent=None,
             head=dict(x=x0, y=.065), tail=dict(x=x1, y=.50),
             amplitude=1.8, frequency=.84, phase=0 if left else .36,
             radius=.37, enabled=True),
        dict(id="elbow", parent="shoulder",
             head=dict(x=x1, y=.50), tail=dict(x=x2, y=.92),
             amplitude=2.8, frequency=.95, phase=.23 if left else .60,
             radius=.34, enabled=True)
    ]



def restore_original_inputs(library: Path) -> None:
    """Restore only the source files OUR build derived on a prior invocation.

    The common inbox installer compares extracted ZIP bytes exactly and must
    keep rejecting unrelated changes. Before re-running it, undo ONLY our
    versioned, explicitly marked generated modifications. Never loosen ZIP
    verification or overwrite other locally authored modules.
    """
    from zipfile import ZipFile
    inbox = library.parent / "inbox"
    definitions = (
        (BASE_ID, "wearableSource", "binding", "pelvis-waist-dual-thigh-v2",
         ("module.json", "front.rig.json", "front.png"),
         ("front/pants_overlay.png", "front.pristine-source.png")),
        (OUTFIT_ID, "sleeveRigFix", None, "paired-shoulder-elbow-v1",
         ("front.rig.json",), ()),
    )
    for module_id, field, subfield, expected, restore, purge in definitions:
        folder = library / module_id
        source_archive = inbox / (module_id + ".zip")
        rig_path = folder / "front.rig.json"
        if not (rig_path.is_file() and source_archive.is_file()):
            continue
        record = read(rig_path)
        marker = record.get(field)
        marked = (marker.get(subfield) == expected) if subfield else marker == expected
        if not marked:
            continue
        with ZipFile(source_archive) as z:
            for rel in restore:
                member = module_id + "/" + rel
                if member not in z.namelist():
                    raise ValueError("missing immutable original " + member)
                dest = folder / rel
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(z.read(member))
        for rel in purge:
            (folder / rel).unlink(missing_ok=True)

def install(library: Path) -> bool:
    base = library / BASE_ID
    outfit = library / OUTFIT_ID
    if not (base / "module.json").exists() or not (outfit / "module.json").exists():
        return False

    base_mod, outfit_mod = read(base / "module.json"), read(outfit / "module.json")
    base_rig, outfit_rig = read(base / "front.rig.json"), read(outfit / "front.rig.json")
    if base_mod.get("id") != BASE_ID or outfit_mod.get("id") != OUTFIT_ID:
        raise ValueError("female-06 wearable module ID mismatch")
    if outfit_mod.get("familyId") != BASE_ID or outfit_mod.get("variantCategory") != "outfit":
        raise ValueError("female-06 outfit is not a registered outfit for the base actor")
    if base_rig.get("characterId") != BASE_ID or outfit_rig.get("characterId") != OUTFIT_ID:
        raise ValueError("female-06 source PSD rig identities do not match")
    if "legwear" not in base_rig.get("parts", {}) or "bottomwear" not in outfit_rig.get("parts", {}):
        raise ValueError("pants attachment requires authentic source legs and shorts")
    original_legs = base_rig["parts"]["legwear"]
    if original_legs.get("kind") != "leg-combined" or len(original_legs.get("bones", [])) < 4:
        raise ValueError("female-06 base legs no longer have source hip/knee/ankle rig")
    source = outfit / "front" / "bottomwear.png"
    if not source.is_file():
        raise ValueError("female-06 original PSD shorts PNG not installed")
    with Image.open(source) as image:
        rgba = image.convert("RGBA")
    if rgba.size != (225, 207) or not rgba.getchannel("A").getbbox():
        raise ValueError("female-06 source pants dimensions/alpha changed; refit required")

    # Audit the true PSD coordinates and nontransparent silhouettes before fitting.
    # Log source geometry in the build so a visible misfit can be corrected
    # against the original wearer rather than a guessed 1024-stage box.
    with Image.open(base / "front" / "legwear.png") as body_part:
        body = body_part.convert("RGBA")
    waist_rows = []
    for frac in (.0, .04, .08, .12, .18, .24, .30):
        row = min(body.height-1, round(frac*(body.height-1)))
        a = body.getchannel("A").crop((0,row,body.width,row+1))
        waist_rows.append((round(frac,2),a.getbbox()))
    print("FEMALE06 SOURCE GEOMETRY:",
          "legs",(original_legs['x'],original_legs['y'],original_legs['w'],original_legs['h']),
          "alpha",body.getchannel("A").getbbox(),
          "waist_rows",waist_rows,
          "outfit_shorts_source",rgba.size,
          "outfit_alpha_bbox",rgba.getchannel("A").getbbox(),
          "original_topwear", {k:outfit_rig['parts']['topwear'].get(k)
                              for k in ('x','y','w','h')})
    x, y, w, h = PANTS_BOUNDS
    fitted = rgba.resize((w, h), Image.Resampling.LANCZOS)
    target_file = base / "front" / (PANTS_ID + ".png")
    target_file.parent.mkdir(parents=True, exist_ok=True)
    fitted.save(target_file, "PNG", optimize=True)

    # The destination model retains every original source layer; one
    # additional shorts ArtMesh is placed in front of the leg/torso.
    pants = {
        "id": PANTS_ID, "name": "女六 · 黑色短裤", "x": x, "y": y,
        "w": w, "h": h, "parentId": "pelvis", "kind": "pants-bound",
        "pivot": {"x": .5, "y": .09}, "tip": {"x": .5, "y": .91},
        "placement": PANTS_PLACEMENT.copy(),
        "mesh": {"rows": 12, "columns": 12},
        "bones": [],
        "motion": {"x": 0, "y": 0, "angle": 0, "frequency": 1, "phase": 0},
        "skinBinding": {
            "target": "legwear", "method": "pelvis-waist-dual-thigh-v2",
            "waist": "pelvis", "left": "left-knee",
            "right": "right-knee", "waistLock": 1.0,
            "transition": [.42, .84], "rootLock": 1.0
        },
        "enabled": True,
    }
    base_rig["parts"][PANTS_ID] = pants
    order = [name for name in base_rig.get("layerOrder", []) if name != PANTS_ID]
    position = order.index("topwear") + 1 if "topwear" in order else len(order)
    order.insert(position, PANTS_ID)
    base_rig["layerOrder"] = order
    base_rig["partCount"] = len(base_rig["parts"])
    strengths = base_rig.setdefault("idleProfile", {}).setdefault("parts", {})
    strengths[PANTS_ID] = 0
    base_rig["wearableSource"] = {
        "outfitId": OUTFIT_ID, "sourcePart": "bottomwear",
        "fittedTo": "legwear", "binding": "pelvis-waist-dual-thigh-v2",
        "fitPlacement": PANTS_PLACEMENT.copy(),
        "fitRevision": "female06-pelvis-waist-v3",
        "noTextureRegeneration": True
    }
    base_mod["views"]["front"]["rig"]["textures"][PANTS_ID] = "front/" + PANTS_ID + ".png"
    base_mod["label"] = "女六 · 原始彩绘＋黑色短裤"
    write(base / "front.rig.json", base_rig)
    write(base / "module.json", base_mod)

    # The portrait is deliberately composed from the source original PNG
    # and the exact same fitted garment used in the ArtMesh, not AI artwork.
    # Compiler can be invoked more than once in CI. Preserve the ORIGINAL
    # portrait once and always rebuild the derived preview from its bytes;
    # never alpha-composite shorts repeatedly over themselves.
    pristine = base / "front.pristine-source.png"
    if not pristine.is_file():
        with Image.open(base / "front.png") as source_poster:
            source_poster.convert("RGBA").save(pristine, "PNG", optimize=True)
    with Image.open(pristine) as source_poster:
        poster = source_poster.convert("RGBA")
    # Static poster must agree with the exact PartMesh REST pose. Otherwise
    # gallery/actor thumbnails show the former oversized/misplaced shorts.
    transform = PANTS_PLACEMENT
    sw = max(1, round(w * transform["scaleX"]))
    sh = max(1, round(h * transform["scaleY"]))
    px, py = .5, .09
    left = round(x + w*px + transform["offsetX"] - sw*px)
    top = round(y + h*py + transform["offsetY"] - sh*py)
    poster.alpha_composite(fitted.resize((sw, sh), Image.Resampling.LANCZOS),
                           (left, top))
    poster.save(base / "front.png", "PNG", optimize=True)

    # Repair BOTH new-outfit arms using per-sleeve shoulder -> elbow chains.
    # Previous module incorrectly borrowed raised-arm bones with their
    # shoulder root at the bottom (wrist), tearing the sleeve from the body.
    for side, kind, pivot, tip in [
        ("l", "arm-left", (.83, .065), (.16, .92)),
        ("r", "arm-right", (.17, .065), (.85, .92)),
    ]:
        ident = "handwear_" + side
        sleeve = outfit_rig["parts"].get(ident)
        if not sleeve:
            raise ValueError("female-06 outfit sleeve absent: " + ident)
        sleeve["parentId"] = "torso"
        sleeve["kind"] = kind
        sleeve["pivot"] = {"x": pivot[0], "y": pivot[1]}
        sleeve["tip"] = {"x": tip[0], "y": tip[1]}
        sleeve["mesh"] = {"rows": 10, "columns": 8}
        sleeve["bones"] = arm_bones(side)
        sleeve["motion"] = {
            "x": 0, "y": 0, "angle": 0, "frequency": 1, "phase": 0}
    outfit_rig["sleeveRigFix"] = "paired-shoulder-elbow-v1"
    write(outfit / "front.rig.json", outfit_rig)

    # A compiled module must contain EXACTLY one texture per model ArtMesh.
    if set(base_mod["views"]["front"]["rig"]["textures"]) != set(base_rig["parts"]):
        raise ValueError("female-06 post-attach ArtMesh textures do not match")
    print("AUTO FITTED female-06 authentic hip geometry: raw x=420 y=415 164x162, rendered placement "+str(PANTS_PLACEMENT)+", "
          "18 ArtMeshes, dual-leg shared-skin, separate repaired outfit sleeves")
    return True


if __name__ == "__main__":
    install(Path(__file__).resolve().parents[1] / "site/assets/l2d/library")
