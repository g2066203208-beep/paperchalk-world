"""Inspect license-verified CC0 multi-identity pixel-face data sources.

NOT a generator; this is source acquisition and mandatory dataset audit before
pretraining. Do not use one-character augmentations as different identities.
"""
from pathlib import Path
from zipfile import ZipFile
from PIL import Image, ImageOps, ImageDraw
from collections import Counter
import hashlib, io, json, sys
ROOT=Path("site/pixel-lab/style2/face-general")
ROOT.mkdir(parents=True,exist_ok=True)
ZIP=Path("ml/datasets/cc0_faces_lamiarts.zip")
def main():
    if not ZIP.exists(): raise RuntimeError("CC0 source zip missing: fail closed, never fall back to old D character")
    assert ZIP.stat().st_size>100_000
    with ZipFile(ZIP) as z:
        files=[e for e in z.infolist() if not e.is_dir()]
        image_names=[e.filename for e in files if e.filename.lower().endswith((".png",".ase",".aseprite"))]
        subset=[p for p in image_names if p.lower().endswith(".png")]
        shapes=Counter()
        samples=[]
        for p in subset[:min(300,len(subset))]:
            try:
                with z.open(p) as f:
                    im=Image.open(io.BytesIO(f.read())).convert("RGBA")
                    shapes[f"{im.width}x{im.height}"]+=1
                    if len(samples)<36 and im.width>=16 and im.height>=16:
                        samples.append((p,im.copy()))
            except Exception: continue
        report={
         "source":"https://opengameart.org/content/faces-1",
         "license":"CC0",
         "creator":"lamiarts",
         "source_file":"https://opengameart.org/sites/default/files/faces_1.zip",
         "archive_sha256":hashlib.sha256(ZIP.read_bytes()).hexdigest(),
         "size_bytes":ZIP.stat().st_size,
         "zip_file_count":len(files),
         "png_count":len(subset),
         "image_shapes_first_300":dict(shapes),
         "first_70_paths":subset[:70],
         "directory_examples":list(dict.fromkeys("/".join(p.split("/")[:-1]) for p in subset))[:60],
         "sample_paths":[s[0] for s in samples]}
        (ROOT/"source_audit.json").write_text(json.dumps(report,indent=2,ensure_ascii=False))
        thumbs=Image.new("RGB",(6*140,6*145),(57,54,87))
        d=ImageDraw.Draw(thumbs)
        for i,(name,im) in enumerate(samples):
            rgba=Image.new("RGBA",im.size,(57,54,87,255))
            rgba.alpha_composite(im)
            rgba=ImageOps.contain(rgba.convert("RGB"),(120,118),method=Image.Resampling.NEAREST)
            xx=(i%6)*140; yy=(i//6)*145
            thumbs.paste(rgba,(xx+(140-rgba.width)//2,yy))
            d.text((xx+2,yy+119),name.split("/")[-1][:19],fill=(255,245,230))
        thumbs.save(ROOT/"source_audit_contact.png")
        # Preserve unmodified, licensed PART layers so a separate discrete model
        # can learn and recombine exact eyes, face geometry and hairstyles.
        parts_dir=ROOT/"part_samples";parts_dir.mkdir(exist_ok=True)
        for part in subset:
            if not part.startswith("Faces/parts/"):continue
            raw=archive_data=None
            with z.open(part) as src:raw=src.read()
            dst=parts_dir/part.split("/")[-1]
            dst.write_bytes(raw)
        report["part_samples_exported"]=len(list(parts_dir.glob("*.png")))
        (ROOT/"source_audit.json").write_text(json.dumps(report,indent=2,ensure_ascii=False))

        print("CC0 SOURCE AUDIT:",json.dumps(report,ensure_ascii=False)[:13000],flush=True)
if __name__=="__main__":main()
