#!/usr/bin/env python3
"""Strict every-commit screenshot + video + GIF original-reference comparison.

Sources: native official publisher GIF and 60fps Steam promo; sampled *short*
low-resolution extracts only. Original full footage is never committed or
published in CI artifacts. The developer's OWN gameplay is filmed in Chromium.

This is a temporal/motion-feel audit, NOT a claim of pixel identity or a
machine verdict that different artistic styles look equally beautiful.
"""
import json, math, os, sys, subprocess, hashlib
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps, ImageStat, ImageEnhance
OUT=Path("artifacts/snowbound-motion-side-by-side")
SOURCE=Path("motion-source")
OUT.mkdir(parents=True,exist_ok=True)
DEVICES=["desktop-1920","portrait-390"]
FBASE=["hand","attack"]
CLOCKS={
 "hand":{"ms":2800.0,"indices":[0,4,7,13,17,20,27,34],"fps":12.5,
         "fullFrameCount":35,"origin":"Balatro publisher GIF #1",
         "file":"balatro_official_1.gif","sourceAtSec":0},
 "attack":{"ms":16*1000/60,"indices":[0,2,4,6,8,10,12,15],"fps":60,
         "fullFrameCount":16,"origin":"Slots & Daggers publisher Steam game explainer",
         "file":"slots_game_explainer.mp4","sourceAtSec":10.380}
}
def rgb_image(img):
    if img.mode!="RGB":return img.convert("RGB")
    return img.copy()
def source_frames(kind):
    cfg=CLOCKS[kind];p=SOURCE/cfg["file"]
    if not p.exists() or p.stat().st_size<12000:
        raise RuntimeError("missing original-source clip, cannot pass comparison: "+str(p))
    if kind=="hand":
        img=Image.open(p);out=[]
        for i in range(cfg["fullFrameCount"]):
            img.seek(i);out.append(img.convert("RGB").copy())
        return out
    import tempfile
    with tempfile.TemporaryDirectory() as td:
        subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-y",
                        "-i",str(p),"-ss",str(cfg["sourceAtSec"]),
                        "-frames:v",str(cfg["fullFrameCount"]),
                        "-vf","scale=480:-2:flags=lanczos","-vsync","0",
                        str(Path(td)/"frame_%03d.png")],check=True)
        names=sorted(Path(td).glob("frame_*.png"))
        result=[Image.open(file).convert("RGB") for file in names]
        if len(result)<cfg["fullFrameCount"]:
            raise RuntimeError("Source movie decoded insufficient native frames: "+str(len(result)))
        return result
def fit(img,size=(310,196)):
    img=rgb_image(img)
    thumb=ImageOps.contain(img,size,Image.Resampling.LANCZOS)
    bg=Image.new("RGB",size,(22,31,40))
    bg.paste(thumb,((size[0]-thumb.width)//2,(size[1]-thumb.height)//2))
    return bg
def mean_delta(a,b):
    a=a.convert("L").resize((120,72))
    b=b.convert("L").resize((120,72))
    import PIL.ImageChops
    return round(ImageStat.Stat(PIL.ImageChops.difference(a,b)).mean[0],3)
def pair_frame(source,ours,device,kind,index,tms,observed):
    W,H=660,257
    bg=Image.new("RGB",(W,H),(15,25,33))
    d=ImageDraw.Draw(bg)
    d.text((12,8),f"{kind.upper()}  {device}  reference frame {index}  |  t={tms:.1f}ms",fill=(240,229,188))
    bg.paste(fit(source),(8,35));bg.paste(fit(ours),(342,35))
    d.text((12,235),"ORIGINAL VIDEO/GIF REFERENCE",fill=(231,239,230))
    d.text((344,235),f"OUR CHROMIUM GAME  observed +{observed:.1f}ms",fill=(191,232,239))
    return bg
def strict_load_capture(device,kind):
    dir=OUT/"raw"/f"{device}-{kind}"
    path=dir/"capture.json"
    if not path.exists():raise RuntimeError("missing actual capture "+str(path))
    v=json.loads(path.read_text())
    if v["event"]!=kind or v["device"]!=device:raise RuntimeError("wrong device/event captured")
    frames=v["frames"]
    if len(frames)<6:raise RuntimeError("fewer than six actual Chrome screencast frames for "+str(path))
    result=[]
    start=v["startEpochMs"]
    for frame in frames:
        file=dir/frame["file"]
        if not file.exists():raise RuntimeError("missing screenshot "+str(file))
        result.append((float(frame["epochMs"])-start,file))
    return v,result
def audit_one(device,kind,sources):
    cfg=CLOCKS[kind];capture,frames=strict_load_capture(device,kind)
    panels=[];observations=[];times=[]
    for ix in cfg["indices"]:
        target=ix*1000/cfg["fps"]
        t,file=min(frames,key=lambda r:abs(r[0]-target))
        error=round(t-target,2)
        if abs(error)>(125 if kind=="hand" else 95):
            raise RuntimeError(f"{device}/{kind} too few real frames near source F{ix}: "
                               f"source {target:.1f}ms, our nearest {t:.1f}ms")
        source=sources[ix]
        actual=Image.open(file).convert("RGB")
        panels.append(pair_frame(source,actual,device,kind,ix,target,t))
        observations.append({
          "sourceFrame":ix,"sourceElapsedMs":round(target,3),
          "gameFrame":file.name,"gameElapsedMs":round(t,3),
          "timingDifferenceMs":error
        })
        times.append(target)
    if len({x["gameFrame"] for x in observations})<4:
        raise RuntimeError(device+"/"+kind+" actual sampled game appears frozen or undersampled")
    # A visually honest 8-sample diagnostic GIF, not a falsely claimed 60fps
    # recording. Delays preserve the ORIGINAL event's total playback duration.
    delays=[max(20,round(times[i+1]-times[i])) for i in range(len(times)-1)]
    delays.append(max(20,round(cfg["ms"]-times[-1])))
    gifpath=OUT/f"{device}-{kind}-timed-reference-vs-game.gif"
    panels[0].save(gifpath,save_all=True,append_images=panels[1:],
                   duration=delays,loop=0,optimize=False,disposal=2)
    # All eight samples are shown at original source timestamps for manual
    # visual comparison of relative displacement, peak brightness, shape and
    # scene clutter. Never interpret color pixel similarity as a fidelity score.
    cols=2;rows=4;w,h=panels[0].size
    sheet=Image.new("RGB",(w*cols,h*rows),(9,17,27))
    for i,frame in enumerate(panels):
        sheet.paste(frame,((i%cols)*w,(i//cols)*h))
    sheetpath=OUT/f"{device}-{kind}-8-timepoints-side-by-side.png"
    sheet.save(sheetpath,optimize=True)
    video=OUT/"videos"/(device+"-real-player-actions.webm")
    if not video.exists() or video.stat().st_size<40000:
        raise RuntimeError("missing actual full live game video recording "+str(video))
    clip_ts=sorted(frames,key=lambda x:x[0])
    screenshot_file=OUT/f"{device}-live-battle-before.png"
    if not screenshot_file.exists():
        raise RuntimeError("missing actual browser battle screenshot "+str(screenshot_file))
    measured={
      "reference":cfg["origin"],"kind":kind,"device":device,"passed":True,
      "sourceFps":cfg["fps"],"sourceDurationMs":cfg["ms"],
      "sourceFrameCount":cfg["fullFrameCount"],
      "chromeCapturedFrames":len(frames),
      "chromeFrameSpacingMeanMs":round((clip_ts[-1][0]-clip_ts[0][0])/(len(clip_ts)-1),1),
      "maxFrameMisalignmentMs":max(abs(x["timingDifferenceMs"]) for x in observations),
      "humanVisualJudgment":"REQUIRES HUMAN REVIEW: not claimed pixel identical",
      "sampledSourceAndGame":observations,
      "sourceTimelineGif":str(gifpath.relative_to(OUT)),
      "sourceTimelineContactSheet":str(sheetpath.relative_to(OUT)),
      "realLiveVideo":str(video.relative_to(OUT)),
      "firstLiveBattleScreenshot":str(screenshot_file.relative_to(OUT))
    }
    return measured
report={
 "name":"Snowbound every-commit original-versus-game dynamic QA",
 "policy":"Actual game screenshots AND full browser videos AND publisher frame-timed side-by-side comparisons are mandatory; comparison failures fail CI.",
 "notPixelClone":"Original source art is not shipped. Different artwork cannot pass pixel-identity scoring. Frame sampling is disclosed.",
 "comparisons":[],"sources":[]
}
errors=[];source_cache={}
for kind in FBASE:
    try:
        src=SOURCE/CLOCKS[kind]["file"]
        raw=src.read_bytes()
        source_cache[kind]=source_frames(kind)
        report["sources"].append({"game":CLOCKS[kind]["origin"],
          "sizeBytes":len(raw),"sha256":hashlib.sha256(raw).hexdigest(),
          "originalFps":CLOCKS[kind]["fps"]})
    except Exception as exc:errors.append(str(exc))
for device in DEVICES:
 for kind in FBASE:
    try:
      if kind not in source_cache:raise RuntimeError("original source unavailable: "+kind)
      result=audit_one(device,kind,source_cache[kind])
      report["comparisons"].append(result)
      print("PASS",device,kind,"8 reference/actual game timepoints, still screenshots, real WebM, paired GIF")
    except Exception as exc:
      msg=device+"/"+kind+" "+str(exc)
      errors.append(msg);report["comparisons"].append({"device":device,"kind":kind,"passed":False,"error":msg})
report["allRequiredComparisonsPassed"]=len(report["comparisons"])==4 and all(
 x.get("passed") for x in report["comparisons"])
report["errors"]=errors
(OUT/"audit.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
readme=["# Mandatory real-reference vs real-game comparison",
 "Every updated Snowbound game change must be tested in desktop + portrait Chromium.",
 "At each source-clock point, the left image is the real publisher GIF/video,",
 "and the right image is the actual game renderer from a Chromium screencast.",
 "An original live game video (.webm), battle screenshots (.png), paired",
 "timepoint frames (.png), paired low-res animated previews (.gif), and measured",
 "frame alignment (.json) are produced together.",
 "",
 "**The GIFs have only 8 diagnostic time samples** and preserve the source",
 "event's overall playback duration. They are not 60fps browser captures;",
 "the captured Chromium frame spacing is disclosed in audit.json.",
 "The hand reference is the original Balatro GIF, 35 frames × 80ms = 2.8s.",
 "The attack reference is the original Slots & Daggers 60fps source excerpt",
 "starting at 10.380 seconds; the source clip contains promo editing and",
 "is not a direct measurement of the source game's input latency.",
 "",
 "Comparison of timing does not establish identical shaders, motion curves,",
 "materials, illustration style, or cinematic quality.",
 "",
 "## Required captures"]
for c in report["comparisons"]:
 if c.get("passed"):
  readme.extend([f"### {c['device']} · {c['kind']}",
   f"![Source and real game at eight source-clock points]({c['sourceTimelineContactSheet']})",
   f"![Full source-clock 8-sample paired playback]({c['sourceTimelineGif']})",
   f"Recorded: [{c['realLiveVideo']}]({c['realLiveVideo']})",""])
(OUT/"README.md").write_text("\n".join(readme)+"\n")
if errors or not report["allRequiredComparisonsPassed"]:
    print("COMPARISON QA FAILED:",errors,file=sys.stderr)
    sys.exit(1)
print("PASSED ALL FOUR REQUIRED ACTUAL GAME × ORIGINAL VIDEO/GIF TIMING COMPARISONS")
