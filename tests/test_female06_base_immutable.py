#!/usr/bin/env python3
"""Female-six has exactly ONE canonical L2D: authentic THIRD orange-coat art.
All 17 source PNG ArtMeshes are byte-identical to the user source archive.
No old original base or second outfit is installed.
"""
from hashlib import sha256
from pathlib import Path
from zipfile import ZipFile
import json

ROOT=Path(__file__).resolve().parents[1]/"site/assets/l2d"
SOURCE="female-06-outfit-02"
CANONICAL="female-06"
archive=ROOT/"inbox"/f"{SOURCE}.zip"
target=ROOT/"library"/CANONICAL

assert archive.is_file(), "the approved THIRD outfit source archive was lost"
assert not (ROOT/"inbox"/"female-06.zip").exists(), "retired original base ZIP must be deleted"
assert not (ROOT/"inbox"/"female-06-second-outfit.zip").exists(), "retired second outfit ZIP must be deleted"
assert target.is_dir(), "third wardrobe has not been promoted to canonical female-06"
assert not (ROOT/"library"/SOURCE).exists(), "third wardrobe remains duplicated as an outfit"
assert not (ROOT/"library"/"female-06-second-outfit").exists(), "second outfit unexpectedly installed"

with ZipFile(archive) as z:
    sources=[name for name in z.namelist()
             if name.startswith(SOURCE+"/") and name.lower().endswith(".png")]
    assert len(sources)>=17, "third source missing its independent PNG layers"
    for source in sources:
        dest=target/source[len(SOURCE)+1:]
        assert dest.is_file(),f"missing canonical part: {dest}"
        assert sha256(z.read(source)).digest()==sha256(dest.read_bytes()).digest(),f"source texture was modified: {source}"

mod=json.loads((target/"module.json").read_text(encoding="utf8"))
rig=json.loads((target/"front.rig.json").read_text(encoding="utf8"))
assert mod["id"]=="female-06"
assert mod["familyId"]=="female-06"
assert mod["label"]=="女六"
assert mod.get("variantCategory")=="default"
assert rig["characterId"]=="female-06"
assert rig["canonicalBasePromotion"]=="third-costume-orange-coat-v1"
assert len(rig["parts"])==17, "entire 17-part original THIRD rig must be present"
assert rig["weightBindingVersion"]=="third-outfit-skin-weight-v1"
assert rig["parts"]["bottomwear"]["skinBinding"]["target"]=="legwear"
assert not (target/"front/pants_overlay.png").exists()
print("PASS: old female-six first/second deleted; third 17 original texture PNGs byte-identical; sole female-06 base")
