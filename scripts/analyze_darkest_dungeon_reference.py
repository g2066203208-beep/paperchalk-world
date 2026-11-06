#!/usr/bin/env python3
"""Analyze REAL user-provided reference footage, one native frame at a time.

Only grounded screen-space measurements are emitted. A 2D affine estimate
cannot prove game-engine camera yaw/pitch/roll or a named character's movement.
No video is bundled in this repository. This script REQUIRES --video.
Requires: pip install opencv-python numpy Pillow

Example:
 python scripts/analyze_darkest_dungeon_reference.py \
   --video reference.mp4 --out artifacts/dd-source-frames --export-frames
"""
from __future__ import annotations
import argparse
import csv
import json
import math
from pathlib import Path

import cv2
import numpy as np

RECORDED_ENTRIES = (79, 178, 315, 416)
RECORDED_EXITS = (128, 228, 368, 470)
RECORDED_FPS = 30
RECORDED_COUNT = 699


def guess_stage(frame: int) -> str:
    for i, (a, b) in enumerate(zip(RECORDED_ENTRIES, RECORDED_EXITS)):
        if frame == a:
            return f"previous-note-entrance-{i + 1}"
        if frame == b:
            return f"previous-note-exit-{i + 1}"
        if a < frame < b:
            return f"previous-note-interval-{i + 1}"
    return "unannotated"


def optical_frame(prev: np.ndarray, curr: np.ndarray) -> dict:
    """Return affine SCREEN image motion, not physical camera rotation."""
    h, w = curr.shape
    mask = np.zeros((h, w), np.uint8)
    # Ignore top overlay and lower interface; keep scene background.
    mask[int(h * .15):int(h * .82), int(w * .04):int(w * .96)] = 255
    # Avoid central silhouettes when tracking static background.
    mask[int(h * .36):int(h * .77), int(w * .25):int(w * .78)] = 0
    pts = cv2.goodFeaturesToTrack(
        prev, maxCorners=1200, qualityLevel=.014, minDistance=7, mask=mask)
    if pts is None or len(pts) < 8:
        return {"estimate": "unknown", "matches": 0, "inliers": 0}
    tracked, status, _ = cv2.calcOpticalFlowPyrLK(
        prev, curr, pts, None, winSize=(21, 21), maxLevel=3,
        criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 35, .01))
    if tracked is None or status is None:
        return {"estimate": "unknown", "matches": 0, "inliers": 0}
    good = status.ravel().astype(bool)
    src = pts.reshape(-1, 2)[good]
    dst = tracked.reshape(-1, 2)[good]
    if len(src) < 8:
        return {"estimate": "unknown", "matches": len(src), "inliers": 0}
    mat, inlier = cv2.estimateAffinePartial2D(
        src, dst, method=cv2.RANSAC, ransacReprojThreshold=3.5,
        maxIters=2000, confidence=.995, refineIters=12)
    if mat is None:
        return {"estimate": "unknown", "matches": len(src), "inliers": 0}
    inliers = int(inlier.sum()) if inlier is not None else 0
    if inliers < 8:
        return {"estimate": "unknown", "matches": len(src), "inliers": inliers}
    zoom = math.hypot(float(mat[0, 0]), float(mat[1, 0]))
    tilt = math.degrees(math.atan2(float(mat[1, 0]), float(mat[0, 0])))
    stabilized = cv2.warpAffine(prev, mat, (w, h))
    roi = (mask > 0)
    delta = cv2.absdiff(stabilized, curr)
    residual = delta[roi]
    return {
        "estimate": "ransac-2d-screen-affine",
        "matches": len(src),
        "inliers": inliers,
        "pixel_dx": round(float(mat[0, 2]), 4),
        "pixel_dy": round(float(mat[1, 2]), 4),
        "screen_zoom_ratio": round(zoom, 6),
        "screen_rotation_degrees": round(tilt, 5),
        "residual_mad": round(float(residual.mean()), 3),
        "residual_pixels_over_25_pct": round(float(np.mean(residual > 25) * 100), 3),
    }


def sheets_for_markers(frames: list[Path], output: Path, size=(256, 142)):
    """Contact sheets sampled every 3 original frames around four recorded events."""
    from PIL import Image, ImageDraw
    for i, (entry, exit_frame) in enumerate(zip(RECORDED_ENTRIES, RECORDED_EXITS), 1):
        ids = list(range(max(0, entry-6), min(len(frames), exit_frame+7), 3))
        if not ids:
            continue
        cols = 5
        rows = math.ceil(len(ids)/cols)
        cellw, cellh = size[0], size[1]+23
        sheet = Image.new("RGB", (cols*cellw, rows*cellh), (22, 23, 27))
        paint = ImageDraw.Draw(sheet)
        for n, frame_id in enumerate(ids):
            with Image.open(frames[frame_id]) as source:
                thumb = source.convert("RGB")
                thumb.thumbnail(size)
                x, y = (n % cols)*cellw, (n // cols)*cellh
                sheet.paste(thumb, (x, y))
            paint.text((x+4, y+size[1]+3),
                       f"frame {frame_id:03d} / {frame_id/RECORDED_FPS:.3f}s",
                       fill=(238, 226, 201))
        sheet.save(output/f"recorded-interval-{i}-every-3frames.jpg", quality=93)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--video", type=Path, required=True, help="Original user's MP4/MOV")
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--export-frames", action="store_true",
                        help="Write EVERY frame as lossless PNG; contact sheets require this")
    args = parser.parse_args()
    if not args.video.is_file():
        parser.error("Original reference video not found: " + str(args.video))
    args.out.mkdir(parents=True, exist_ok=True)
    cap = cv2.VideoCapture(str(args.video))
    if not cap.isOpened():
        parser.error("OpenCV failed to decode the supplied video")
    native_fps = float(cap.get(cv2.CAP_PROP_FPS))
    declared_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    size = [int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
            int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))]
    rows = []
    framepaths = []
    previous = None
    idx = 0
    png_dir = args.out/"frames"
    if args.export_frames:
        png_dir.mkdir(exist_ok=True)
    try:
        while True:
            ok, bgr = cap.read()
            if not ok:
                break
            gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
            if args.export_frames:
                png_file = png_dir/f"{idx:04d}.png"
                if not cv2.imwrite(str(png_file), bgr):
                    raise IOError("Failed to write "+str(png_file))
                framepaths.append(png_file)
            movement = (optical_frame(previous, gray) if previous is not None else
                        {"estimate": "first-frame", "matches": 0, "inliers": 0})
            rows.append({
                "frame": idx,
                "time_s": round(idx/native_fps, 6) if native_fps > 0 else None,
                "previous_note": guess_stage(idx),
                "luminance_mean": round(float(gray.mean()), 3),
                "luminance_std": round(float(gray.std()), 3),
                "character_bbox": None,
                "pose_id": None,
                "actor_world_displacement": None,
                "physical_camera_yaw_pitch_roll": None,
                **movement,
            })
            previous = gray
            idx += 1
    finally:
        cap.release()
    details = {
        "source_file": args.video.name,
        "source_original_video_available": True,
        "native_fps": native_fps, "decoded_frames": idx,
        "declared_frames": declared_frames, "resolution": size,
        "previous_recorded_fps": RECORDED_FPS,
        "previous_recorded_frames": RECORDED_COUNT,
        "notes": [
            "Frame numbers start at 0. Time uses actual container fps.",
            "RANSAC affine is motion of screen background features ONLY.",
            "Do NOT treat image-plane rotation as physical 3D camera tilt.",
            "Entry/exit markers are earlier text notes awaiting image confirmation.",
            "Unknown silhouettes, poses and physical camera angles are NULL, not fabricated."
        ]
    }
    (args.out/"metadata.json").write_text(
        json.dumps(details, ensure_ascii=False, indent=2), encoding="utf-8")
    (args.out/"per-frame-measurements.json").write_text(
        json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    columns = [
        "frame", "time_s", "previous_note", "luminance_mean", "luminance_std",
        "estimate", "matches", "inliers", "pixel_dx", "pixel_dy", "screen_zoom_ratio",
        "screen_rotation_degrees", "residual_mad", "residual_pixels_over_25_pct",
        "character_bbox", "pose_id", "actor_world_displacement",
        "physical_camera_yaw_pitch_roll",
    ]
    with (args.out/"per-frame-measurements.csv").open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.DictWriter(stream, columns, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    if args.export_frames and idx >= max(RECORDED_EXITS):
        sheets_for_markers(framepaths, args.out)
    if idx != RECORDED_COUNT or abs(native_fps - RECORDED_FPS) > .2:
        print("WARNING: this differs from the 699-frame/30fps previous note;",
              "verify that this is the same source file.")
    print("Decoded", idx, "actual video frames at", native_fps, "fps to", args.out)
    print("Screen-space estimates are empirical, physical camera/pose fields remain unknown.")


if __name__ == "__main__":
    main()
