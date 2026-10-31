"""Human-first quality and provenance gate for licensed, original pixel art.

No aesthetic quality is inferred from resolution or automated image statistics.
Only two independent artist reviews can mark a sample APPROVED.
Unreviewed/AI-generated/procedural images are excluded from the production corpus.
"""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

TASK_MIN_SIZE = {
    "portrait_fullbody": (192, 192),
    "face_portrait": (48, 48),
    "action_sprite": (48, 64),
    "scene": (512, 512),
}
DIMENSIONS = ("character_design", "face_readability", "anatomy",
              "pixel_craft", "style_coherence")
ALLOWED_LICENSES = {"CC0-1.0", "CC-BY-4.0", "custom-written-consent"}
REVIEW_THRESHOLD = 4
MIN_REVIEWERS = 2

def split_artist(artist_id):
    """80/10/10 deterministic split by ARTIST, stricter than by sprite image."""
    if not artist_id or not str(artist_id).strip():
        raise ValueError("artist_id required")
    digest = hashlib.sha256(str(artist_id).strip().encode("utf-8")).hexdigest()
    slot = int(digest[:16], 16) % 10
    return "train" if slot < 8 else "val" if slot == 8 else "test"

def _safe_file(root, relative):
    root = Path(root).resolve()
    file = (root / relative).resolve()
    if not file.is_relative_to(root) or not file.is_file() or file.suffix.lower() != ".png":
        raise ValueError("PNG must exist inside dataset root")
    return file

def _image_stats(path, task):
    with Image.open(path) as original:
        if original.format != "PNG":
            raise ValueError("Only original PNG, no JPEG re-export")
        width, height = original.size
        rgba = np.asarray(original.convert("RGBA"), dtype=np.uint8)
    required = TASK_MIN_SIZE[task]
    if width < required[0] or height < required[1]:
        raise ValueError(f"native artwork too small: {width}x{height}; minimum {required}")
    alpha = rgba[:,:,3]
    if np.any((alpha != 0) & (alpha != 255)):
        raise ValueError("Antialiased / semitransparent alpha; native pixels must be binary")
    visible = alpha == 255
    if visible.sum() < width * height * .05:
        raise ValueError("Less than 5% visible artwork")
    colors = np.unique(rgba[visible,:3], axis=0).shape[0]
    # Anti-aliasing / style diagnostics, not an automatic beauty score:
    # nuanced, high-resolution pixel art may use many deliberate colors.
    return {"width":width, "height":height, "opaque_pixels":int(visible.sum()),
            "colors":int(colors), "binary_alpha":True}

def _review(sample):
    reviews = sample.get("reviews") or []
    accepted = set()
    for r in reviews:
        rid = str(r.get("reviewer_id", "")).strip()
        scores = r.get("scores") or {}
        if not rid or rid in accepted or rid == sample.get("artist_id"):
            continue
        if (r.get("approved") is True and all(
            isinstance(scores.get(k), (int,float))
            and not isinstance(scores[k], bool)
            and REVIEW_THRESHOLD <= scores[k] <= 5
            for k in DIMENSIONS)):
            accepted.add(rid)
    if len(accepted) < MIN_REVIEWERS:
        raise ValueError("Two independent art reviews (all dimensions >=4/5) required")
    return sorted(accepted)

def inspect_sample(sample, root):
    if not isinstance(sample, dict):
        raise ValueError("Sample must be an object")
    for field in ("path", "source_url", "artist_id", "identity_id", "license", "task"):
        if not str(sample.get(field,"")).strip():
            raise ValueError(f"Missing field: {field}")
    if sample["task"] not in TASK_MIN_SIZE:
        raise ValueError("Unknown task")
    if sample["license"] not in ALLOWED_LICENSES:
        raise ValueError("License not in reviewed allowlist")
    if sample.get("origin") != "human_drawn":
        raise ValueError("Training requires human-drawn original artwork, not procedurally or AI generated")
    if sample.get("training_permission") is not True:
        raise ValueError("Explicit documented training permission required")
    if sample.get("artist_opt_out") is not False:
        raise ValueError("Artist preference unverified / excludes AI training")
    if sample.get("native_pixel_art") is not True:
        raise ValueError("Native pixel grid must be verified by a human reviewer")
    if str(sample["source_url"]).startswith(("http://", "https://")) is False:
        raise ValueError("Attributable public source URL or evidence URL required")
    if sample["license"] == "custom-written-consent" and not sample.get("consent_evidence"):
        raise ValueError("Written consent requires an evidence reference")
    reviewers = _review(sample)
    file = _safe_file(root, sample["path"])
    info = _image_stats(file,sample["task"])
    digest = hashlib.sha256(file.read_bytes()).hexdigest()
    if sample.get("sha256") and sample["sha256"] != digest:
        raise ValueError("Source bytes changed since approval")
    return {**{k: sample[k] for k in ("path","source_url","artist_id","identity_id",
        "license","task","origin","training_permission","native_pixel_art")},
        "artist_opt_out":False, "reviewers":reviewers,
        "sha256":digest, "split":split_artist(sample["artist_id"]), **info}

def curate(root, manifest):
    source = json.loads(Path(manifest).read_text("utf-8"))
    items = source.get("samples", []) if isinstance(source,dict) else source
    if not isinstance(items,list):raise ValueError("manifest.samples must be an array")
    approved,rejected=[],[]
    all_sha=set(); identities={}
    for index,s in enumerate(items):
        try:
            q=inspect_sample(s,root)
            if q["sha256"] in all_sha:raise ValueError("Duplicate file hash")
            all_sha.add(q["sha256"])
            identity=q["identity_id"]
            if identity in identities and identities[identity]!=q["split"]:
                raise ValueError("Identity would leak across artist holdout splits")
            identities[identity]=q["split"]
            # Preserve pose/hair/outfit labels for the existing model pipeline.
            for field in ("pose","hair","outfit"):
                if field in s:q[field]=s[field]
            approved.append(q)
        except (ValueError,KeyError,OSError,TypeError) as e:
            rejected.append({"index":index,
                "path":s.get("path","") if isinstance(s,dict) else "",
                "reason":str(e)})
    return {"schema_version":"quality-v1",
        "method":"two-independent-reviewers; artist-level holdout; exact PNG hash",
        "approved":approved,"rejected":rejected,
        "counts":{"submitted":len(items),"approved":len(approved),"rejected":len(rejected)}}

def main():
    p=argparse.ArgumentParser(description="No unreviewed art may train the model")
    p.add_argument("--data",required=True,type=Path)
    p.add_argument("--manifest",required=True,type=Path)
    p.add_argument("--report",required=True,type=Path)
    args=p.parse_args()
    report=curate(args.data,args.manifest)
    args.report.parent.mkdir(parents=True,exist_ok=True)
    args.report.write_text(json.dumps(report,ensure_ascii=False,indent=2),"utf-8")
    print(json.dumps(report["counts"],ensure_ascii=False))
    if report["counts"]["approved"]==0:
        raise SystemExit("BLOCKED: zero approved high-quality human-drawn examples")
if __name__=="__main__":
    main()
