#!/usr/bin/env python3
"""Compile plug-and-play L2D modules. The installed directory is the API.

Put site/assets/l2d/library/<character-id>/module.json + referenced source
art/animation under the same directory. The existing game and studio discover
the compiled catalog; no JS, HTML or actor slots require per-character edits.
Files are read/validated only. Approved old V4 assets are untouched.
"""
from __future__ import annotations
import hashlib
import json
import re
from pathlib import Path
from zipfile import ZipFile, BadZipFile
from PIL import Image, UnidentifiedImageError

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
LIBRARY = SITE / "assets/l2d/library"
OUT = SITE / "l2d-library.generated.json"
ID = re.compile(r"^[a-z][a-z0-9_-]{0,79}$")
IMAGE = {".png": "PNG", ".webp": "WEBP", ".jpg": "JPEG", ".jpeg": "JPEG"}
MAX_IMAGE = 26 * 1024 * 1024
MAX_CLIP = 72 * 1024 * 1024


def fail(where, why):
    raise ValueError(f"L2D module {where}: {why}")


def read_json(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (ValueError, UnicodeError, OSError) as exc:
        fail(path, f"invalid JSON ({exc})")


def within(folder, name, *, required=True):
    if not isinstance(name, str) or not name or "\\" in name:
        fail(folder, "relative filename missing or contains backslash")
    p = Path(name)
    if p.is_absolute() or ".." in p.parts or name.startswith("/") or name.startswith("."):
        fail(folder, f"unsafe file path {name}")
    actual = (folder / p).resolve()
    if not actual.is_relative_to(folder.resolve()):
        fail(folder, f"path escapes module directory {name}")
    if required and not actual.is_file():
        fail(folder, f"missing referenced file {name}")
    return actual


def url(file):
    return "./" + file.relative_to(SITE).as_posix()


def image(file, *, static=False, limit=MAX_IMAGE):
    if file.suffix.lower() not in IMAGE or file.stat().st_size < 32 or file.stat().st_size > limit:
        fail(file, "invalid image extension or file size")
    try:
        with Image.open(file) as im:
            if im.format != IMAGE[file.suffix.lower()]:
                fail(file, "image bytes do not match extension")
            dims = (im.width, im.height)
            count = getattr(im, "n_frames", 1)
            if not all(1 <= n <= 8192 for n in dims):
                fail(file, f"invalid dimensions {dims}")
            if static and count != 1:
                fail(file, "poster / part texture must contain exactly one frame")
            im.verify()
        with Image.open(file) as im:
            im.seek(0)
            im.load()
        return dims, count
    except (OSError, ValueError, UnidentifiedImageError) as exc:
        fail(file, f"cannot decode image ({exc})")


def inspect_view(folder, value, face):
    if not isinstance(value, dict):
        fail(folder, f"views.{face} must be an object")
    poster = within(folder, value.get("portrait"))
    image(poster, static=True)
    result = {"portrait": url(poster)}
    clip = value.get("clip")
    rig = value.get("rig")
    if bool(clip) == bool(rig):
        fail(folder, f"views.{face} requires exactly one of clip or rig")
    if clip:
        if not isinstance(clip, dict) or clip.get("type") != "v4-webp":
            fail(folder, f"views.{face}.clip.type must be v4-webp")
        src = within(folder, clip.get("file"))
        if src.suffix.lower() != ".webp" or src.stat().st_size > MAX_CLIP:
            fail(src, "V4 animation must be WebP, max 72 MB")
        (width, height), frames = image(src, limit=MAX_CLIP)
        if frames < 2:
            fail(src, "V4 requires multiple real decoded frames")
        if int(clip.get("frames", frames)) != frames:
            fail(src, "declared frame count mismatches encoded WebP")
        fps = clip.get("fps", 20)
        if not isinstance(fps, (int, float)) or fps < 1 or fps > 60:
            fail(src, "FPS must be between 1 and 60")
        crop = clip.get("crop")
        if not isinstance(crop, dict) or set(crop) != {"x", "y", "w", "h"}:
            fail(src, "crop must specify x,y,w,h original art coordinates")
        if any(type(crop[k]) is not int for k in crop) or crop["w"] != width or crop["h"] != height:
            fail(src, "crop dimensions must match actual animation geometry")
        if crop["x"] < 0 or crop["y"] < 0 or crop["x"]+width > 8192 or crop["y"]+height > 8192:
            fail(src, "out-of-canvas crop")
        result["clip"] = {"url":url(src), "crop":crop, "fps":fps, "frames":frames}
        result["renderer"] = "v4-webp"
    else:
        if not isinstance(rig, dict) or rig.get("type") != "part-mesh":
            fail(folder, f"views.{face}.rig.type must be part-mesh")
        model_file = within(folder, rig.get("file"))
        model = read_json(model_file)
        if model.get("format") != "paperchalk-part-rig-v1" or model.get("face") != face:
            fail(model_file, "requires exported PartRig v1 of the same view")
        model_parts = model.get("parts")
        textures = rig.get("textures")
        if not isinstance(textures, dict) or not isinstance(model_parts, dict) or not textures:
            fail(model_file, "part-mesh requires an explicit partId -> independent PNG mapping")
        if set(textures) != set(model_parts) or len(textures) > 100:
            fail(model_file, "textures must match every rig partId exactly (max 100)")
        paths = {}
        if model.get('characterId') != folder.name or model.get('canvas') != [1024,1024]:
            fail(model_file, 'rig character ID or stage dimensions mismatch')
        for ident in model_parts:
            if not ID.fullmatch(ident):
                fail(model_file, f"invalid part ID {ident}")
            img = within(folder, textures[ident])
            if img.suffix.lower() != ".png":
                fail(img, "each ArtMesh texture must be a separate RGBA PNG")
            (w,h),count = image(img,static=True)
            with Image.open(img) as texture:
                if texture.mode != 'RGBA':
                    fail(img, 'independent ArtMesh texture must be 8-bit RGBA')
            part = model_parts[ident]
            if not isinstance(part,dict) or part.get("id") != ident:
                fail(model_file,f"partId mismatch: {ident}")
            if part.get("w") != w or part.get("h") != h:
                fail(img, f"size does not match rig part {ident}")
            if not isinstance(part.get("mesh"), dict) or not isinstance(part.get("motion"), dict):
                fail(model_file,f"missing mesh or animation parameters for {ident}")
            if not all(isinstance(part["mesh"].get(k), int) and 2 <= part["mesh"][k] <= 64 for k in ("rows","columns")):
                fail(model_file,f"mesh grid out of limits for {ident}")
            if not isinstance(part.get("x"), (int,float)) or not isinstance(part.get("y"),(int,float)):
                fail(model_file,f"missing original coordinate for {ident}")
            if not isinstance(part.get("pivot"),dict) or not isinstance(part.get("tip"),dict):
                fail(model_file,f"missing pivots / tips for {ident}")
            paths[ident] = url(img)
        result["rig"] = {"url":url(model_file), "textures":paths, "partCount":len(paths)}
        result["renderer"] = "part-mesh"
    source = value.get("sourceParts")
    if source is not None:
        if not isinstance(source,dict) or source.get("provenance") not in ("original-psd","derived-region"):
            fail(folder,"sourceParts requires provenance original-psd or derived-region")
        archive = within(folder,source.get("file"))
        if archive.suffix.lower() != ".zip" or archive.stat().st_size > MAX_CLIP:
            fail(archive,"sourceParts must be a <=72MB ZIP archive")
        try:
            with ZipFile(archive) as z:
                names=z.namelist()
                if len(names)!=len(set(names)) or len(names)>256:
                    fail(archive,"duplicate members or too many parts in ZIP")
                if any(n.startswith("/") or "\\\\" in n or ".." in Path(n).parts for n in names):
                    fail(archive,"unsafe member path")
                manifest='layers.json' if 'layers.json' in names else 'assets.json'
                if manifest not in names:
                    fail(archive,"missing source parts manifest")
                definition=json.loads(z.read(manifest).decode("utf-8"))
                if not isinstance(definition,dict):
                    fail(archive,"invalid archive part manifest")
                if z.testzip() is not None:
                    fail(archive,"source ZIP CRC check failed")
        except (BadZipFile,OSError,UnicodeError,ValueError) as exc:
            fail(archive,f"invalid source ZIP ({exc})")
        result["sourceParts"] = {"url":url(archive), "provenance":source["provenance"]}
    return result


def inspect_module(folder):
    m = read_json(folder / "module.json")
    ident = m.get("id")
    if ident != folder.name or not isinstance(ident,str) or not ID.fullmatch(ident):
        fail(folder, "module.id must equal its lowercase directory name")
    label = m.get("label")
    if not isinstance(label,str) or not label.strip() or len(label) > 80:
        fail(folder, "label must be a nonempty string of <=80 characters")
    if m.get("schema") != 1:
        fail(folder,"schema must be 1")
    views = m.get("views")
    if not isinstance(views,dict) or not views or any(k not in ("front","back") for k in views):
        fail(folder,"views must contain front and/or back")
    if "back" in views and "front" not in views:
        fail(folder,"back-only characters need a front portrait for game catalog (no faked back)")
    faces = {side: inspect_view(folder,v,side) for side,v in views.items()}
    # No coercion of blank/corrupt/missing assets into a playable character.
    digest=hashlib.sha256()
    for f in sorted(folder.rglob("*")):
        if f.is_file():
            digest.update(f.relative_to(folder).as_posix().encode("utf-8"))
            with f.open("rb") as stream:
                for chunk in iter(lambda:stream.read(1024*1024),b""):
                    digest.update(chunk)
    return {"id":ident, "label":label.strip(), "views":faces,
            "module":True, "version":digest.hexdigest()[:12]}


def build():
    modules = []
    if LIBRARY.exists():
        for folder in sorted(LIBRARY.iterdir(),key=lambda f:f.name.lower()):
            if not folder.is_dir() or folder.name.startswith("."):
                continue
            if not (folder/"module.json").is_file():
                fail(folder,"missing module.json (put all module resources in one folder)")
            modules.append(inspect_module(folder))
    if len({m["id"] for m in modules}) != len(modules):
        fail(LIBRARY, "duplicate character IDs")
    payload = {"schema":1,"modules":modules}
    OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("AUTO L2D LIBRARY:",len(modules),"packaged modules")
    for m in modules:print(f"  {m['id']}: {m['label']} {list(m['views'])}")
    return payload


if __name__=="__main__":
    build()
