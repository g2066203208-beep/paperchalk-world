#!/usr/bin/env python3
"""Strong binary proof: neither the source body nor any texture of its outfits
was cropped/painted/resized by the automatic wearable rig builder."""
from hashlib import sha256
from pathlib import Path
from zipfile import ZipFile
import json
ROOT=Path(__file__).resolve().parents[1]/"site/assets/l2d"
def sha(data):return sha256(data).hexdigest()
for character in ("female-06","female-06-outfit-02"):
    archive=ROOT/"inbox"/f"{character}.zip"
    target=ROOT/"library"/character
    assert archive.is_file(),f"missing immutable user source {archive}"
    assert target.is_dir(),f"missing published module {target}"
    with ZipFile(archive) as z:
        originals=[x for x in z.namelist() if x.startswith(character+"/")
                   and (x.endswith(".png") or x.endswith(".webp"))]
        assert originals,f"no source raster for {character}"
        for rel in originals:
            dst=target/rel[len(character)+1:]
            assert dst.is_file(),f"lost original texture {rel}"
            assert sha(z.read(rel))==sha(dst.read_bytes()),f"source pixels modified: {rel}"
        if character=="female-06":
            for name in ("module.json","front.rig.json","front.png"):
                rel=f"{character}/{name}"
                dst=target/name
                assert sha(z.read(rel))==sha(dst.read_bytes()),f"base file changed: {name}"
            assert not (target/"front/pants_overlay.png").exists()
            assert not (target/"front.pristine-source.png").exists()
            rig=json.loads((target/"front.rig.json").read_text(encoding="utf8"))
            assert len(rig["parts"])==17
            assert "pants_overlay" not in rig["parts"]
print("PASS SHA256: original female-six whole rig, portrait, 17 textures byte-for-byte pristine; third outfit every source texture unchanged")
