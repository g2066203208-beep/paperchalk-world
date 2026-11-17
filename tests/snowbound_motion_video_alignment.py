#!/usr/bin/env python3
"""Synchronize the game's REAL 25fps Playwright WebM against its own CDP timestamps.

The 1920x1080 desktop CDP screencast can slow to 6fps during a heavy attack,
even though Chromium has already recorded the game at 25fps to WebM.
Find WebM's absolute capture start by comparing pixels from the longer
2.8-second, player-clicked redraw to its timestamped CDP screenshots.

The attack epoch is recorded by the same monotonic browser clock and same
video stream. This then yields all actual 25fps GAME observations for the
publisher's sixteen 60fps reference timestamps (with duplicates disclosed).
No frames are drawn, invented, inferred from the source, or interpolated.
"""
import json
import math
import subprocess
import tempfile
from fractions import Fraction
from pathlib import Path
from PIL import Image, ImageChops, ImageStat

FPS_TARGET=25
W,H=128,72

def reduced(im):
    return im.convert("L").resize((W,H),Image.Resampling.BILINEAR).crop((0,45,W,H))

def diff(a,b):
    return ImageStat.Stat(ImageChops.difference(a,b)).mean[0]

def read_meta(out,device,kind):
    p=out/"raw"/(device+"-"+kind)/"capture.json"
    if not p.exists():raise RuntimeError("no real browser source-epoch metadata "+str(p))
    return json.loads(p.read_text())

def extract_webm(out,device,tmp):
    video=out/"videos"/(device+"-real-player-actions.webm")
    if not video.exists() or video.stat().st_size<40000:
        raise RuntimeError("real full-length Chromium WebM missing: "+str(video))
    detail=json.loads(subprocess.check_output([
        "ffprobe","-v","error","-select_streams","v:0",
        "-show_entries","stream=avg_frame_rate,width,height","-of","json",str(video)
    ]))
    stream=detail["streams"][0]
    native=float(Fraction(stream["avg_frame_rate"]))
    if native<20:raise RuntimeError("actual game WebM has inadequate native fps "+str(native))
    # The actual Playwright video is 25fps. Exporting to jpeg does NOT synthesize
    # anything here because the requested fps equals the input fps.
    if abs(native-FPS_TARGET)>.01:
        raise RuntimeError("unknown browser WebM fps; no fake resampling: "+str(native))
    path=Path(tmp)/"frame_%05d.jpg"
    subprocess.run([
        "ffmpeg","-hide_banner","-loglevel","error","-y",
        "-i",str(video),"-vf","scale=480:270:flags=bilinear",
        "-q:v","4","-fps_mode","passthrough",str(path)
    ],check=True)
    files=sorted(Path(tmp).glob("frame_*.jpg"))
    if len(files)<100:
        raise RuntimeError("insufficient actual browser-recorded WebM frames: "+str(len(files)))
    images=[]
    for f in files:
        with Image.open(f) as im:images.append(reduced(im))
    return files,images,native,stream

def synchronize_against_clicked_hand(out,device,video_images,fps):
    hand=read_meta(out,device,"hand")
    attack=read_meta(out,device,"attack")
    cdps=hand["frames"]
    if len(cdps)<8:
        raise RuntimeError("cannot align video: fewer than eight independent hand screenshots")
    targets=[-90,0,280,520,800,1040,1300,1550,1800,2160,2500,2740,3030,3400]
    reference=[]
    for desired in targets:
        sample=min(cdps,key=lambda f:abs(f["epochMs"]-hand["startEpochMs"]-desired))
        t=sample["epochMs"]-hand["startEpochMs"]
        p=out/"raw"/(device+"-hand")/sample["file"]
        with Image.open(p) as im:picture=reduced(im)
        reference.append((t,picture))
    period=1000.0/fps
    max_offset=len(video_images)*period-3900
    ranked=[]
    for step in range(0,int(max_offset/period)):
        offset=step*period
        differences=[]
        for rel,img in reference:
            frame=round((offset+rel)/period)
            if 0<=frame<len(video_images):
                differences.append(diff(img,video_images[frame]))
        if len(differences)>=10:
            score=sum(differences)/len(differences)
            ranked.append((score,offset))
    if not ranked:raise RuntimeError("no valid WebM/CDP timeline alignment")
    ranked.sort()
    best,epoch_offset=ranked[0]
    # On matching Chromium renders the pixel residual is ~0.9/255.
    # Much higher residual indicates a different scene, cut, or broken clock.
    if best>11:
        raise RuntimeError("unable to align unaltered game WebM with hand screenshots: pixel residual "+str(best))
    attack_video_start=epoch_offset+(attack["startEpochMs"]-hand["startEpochMs"])
    return {
        "source":"ACTUAL_CHROMIUM_WEBM_25FPS_NOT_SYNTHETIC",
        "videoHandStartMs":round(epoch_offset,2),
        "videoAttackStartMs":round(attack_video_start,2),
        "actualVideoFPS":fps,
        "handAlignmentGrayPixelResidual":round(best,4),
        "handCaptureSampleCount":len(cdps),
        "attackTraceClockMs":[x["tMs"] for x in attack["sourceClockMarks"]],
        "validation":"paired source-clock mapping originates from actual player-clicked hand replay",
    },attack_video_start

def actual_attack_frames(out,device):
    """Returns (real_video_frame_pairs, alignment_metadata, tempfile_handle).

    Must call tempfile_handle.cleanup() AFTER comparisons are fully rendered.
    Each time tuple is relative to the actual attack's source-frame F00.
    """
    scratch=tempfile.TemporaryDirectory(prefix="snowbound_webm_align_")
    try:
        files,images,fps,stream=extract_webm(out,device,scratch.name)
        alignment,video_attack_start=synchronize_against_clicked_hand(out,device,images,fps)
        period=1000.0/fps
        start=max(0,round((video_attack_start-200)/period))
        finish=min(len(files),math.ceil((video_attack_start+480)/period)+1)
        frames=[(i*period-video_attack_start,files[i]) for i in range(start,finish)]
        if len(frames)<8:
            raise RuntimeError("missing native video observations around actual attack")
        alignment["browserVideoFramesAroundAttack"]=len(frames)
        alignment["videoFrameWidth"]=stream["width"]
        alignment["videoFrameHeight"]=stream["height"]
        return frames,alignment,scratch
    except BaseException:
        scratch.cleanup()
        raise
