"""Full-body portrait-only curated dataset.

No face-only crops, 48x64 sprites, action frames, scenes, procedural/AI training data.
This is a strict admission layer on top of quality_gate; nothing is resized.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image
from quality_gate import inspect_sample,split_artist

PROFILES={"portrait_192": (192,256), "portrait_384": (384,512)}
REVIEW_FIELDS=("head_to_toe_visible","face_identity_distinct","hands_and_feet_readable","intentional_pixel_clusters")

def inspect_fullbody(sample,root):
    if sample.get("task")!="portrait_fullbody":
        raise ValueError("FULL BODY ONLY: no portraits cropped at the shoulders, sprites, animations, or scenes")
    if sample.get("profile") not in PROFILES:
        raise ValueError("Unsupported fullbody target profile: must be 192x256 or 384x512 native pixels")
    approved=inspect_sample(sample,root)
    expected=PROFILES[sample["profile"]]
    if (approved["width"],approved["height"])!=expected:
        raise ValueError(f"Source must be truly authored at exactly {expected} pixels; resizing is forbidden")
    # Fullbody composition must be confirmed independently, not inferred from a large PNG canvas.
    verified=set()
    for review in sample.get("reviews",[]):
        rid=str(review.get("reviewer_id","")).strip()
        if rid==sample["artist_id"] or review.get("approved") is not True:
            continue
        if all(review.get(f) is True for f in REVIEW_FIELDS):
            verified.add(rid)
    if len(verified)<2:
        raise ValueError("Require two independent reviewers verifying whole figure, facial individuality, hands, feet, and genuine clusters")
    approved["profile"]=sample["profile"]
    approved["fullbody_verified_by"]=sorted(verified)
    return approved

def curate_fullbody(root,manifest):
    root=Path(root).resolve()
    raw=json.loads(Path(manifest).read_text(encoding="utf-8"))
    entries=raw["samples"] if isinstance(raw,dict) else raw
    if not isinstance(entries,list):
        raise ValueError("manifest must contain samples list")
    accepted,rejected=[],[]
    seen_hashes=set()
    artists_for_identity={}
    for index,sample in enumerate(entries):
        try:
            item=inspect_fullbody(sample,root)
            if item["sha256"] in seen_hashes:raise ValueError("exact duplicate")
            seen_hashes.add(item["sha256"])
            old=artists_for_identity.setdefault(item["identity_id"],item["split"])
            if old!=item["split"]:raise ValueError("identity leaked across artist splits")
            # Conditions must describe the actual human-authored image.
            for key in ("pose","hair","outfit","visual_style"):
                item[key]=str(sample.get(key,"unspecified"))
            accepted.append(item)
        except (ValueError,KeyError,TypeError,OSError) as exc:
            rejected.append({"index":index,"reason":str(exc)})
    return {"scope":"fullbody_portrait_only","approved":accepted,"rejected":rejected,
        "counts":{"submitted":len(entries),"approved":len(accepted),"rejected":len(rejected)}}

def require_training_ready(report,profile,experimental_small_data=False):
    rows=[r for r in report["approved"] if r["profile"]==profile]
    if report["rejected"]:raise ValueError("Unapproved or wrong-task artworks must be removed before training")
    if not rows:raise ValueError("NO APPROVED FULLBODY ART: training is blocked rather than using procedural people")
    artists={s:{r["artist_id"] for r in rows if r["split"]==s} for s in ("train","val","test")}
    thresholds={"train":2,"val":1,"test":0} if experimental_small_data else {"train":5,"val":2,"test":2}
    for split,min_n in thresholds.items():
        if len(artists[split])<min_n:
            raise ValueError(f"Insufficient distinct {split} artists: {len(artists[split])} < {min_n}; no synthetic fallback")
    return rows
