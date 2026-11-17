#!/usr/bin/env python3
"""Extract *actual* consecutive source frames for commentary, not lookalikes.

Input: downloaded publicly released promo GIF/MP4 clips (not shipped media).
Output: low-res 8-frame analytical contact sheets, per-frame motion deltas,
source hashes, reproducible report. Do not redistribute full media files.
All timings are timestamps of the *clips*, not motion-engine constants.
"""
import json, math, os, hashlib, subprocess, sys, tempfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

SRC=Path("motion-source")
OUT=Path("artifacts/reference-motion")
OUT.mkdir(parents=True, exist_ok=True)
RATE=8  # consecutive observation frames every 125ms; never claim 60fps
N=8
MAX_STUDY_S=24

def ffprobe(path):
    args=["ffprobe","-v","error","-select_streams","v:0",
          "-show_entries","stream=r_frame_rate,avg_frame_rate,width,height:format=duration",
          "-of","json",str(path)]
    d=json.loads(subprocess.check_output(args).decode())
    return {"stream":d.get("streams",[{}])[0],"format":d.get("format",{})}

def read_gif(path):
    im=Image.open(path)
    frames=[]
    times=[]
    t=0.0
    while True:
        dur=max(0.02,float(im.info.get("duration",100))/1000)
        if t>MAX_STUDY_S:break
        frames.append(im.convert("RGB").copy())
        times.append(t)
        t+=dur
        try:im.seek(im.tell()+1)
        except EOFError:break
    return frames,times,t

def read_video(path):
    # Decode sample images at an exact 8Hz clock on the source timeline.
    with tempfile.TemporaryDirectory() as tmp:
        target=Path(tmp)/"frame_%05d.png"
        subprocess.run(["ffmpeg","-hide_banner","-loglevel","error",
                        "-y","-i",str(path),"-t",str(MAX_STUDY_S),
                        "-vf",f"fps={RATE},scale=480:-2:flags=lanczos",
                        "-vsync","0",str(target)],check=True)
        names=sorted(Path(tmp).glob("frame_*.png"))
        frames=[Image.open(x).convert("RGB") for x in names]
    times=[i/RATE for i in range(len(frames))]
    return frames,times,len(frames)/RATE

def reduced(im):
    z=im.copy()
    z.thumbnail((480,280))
    return z

def delta(a,b):
    a=np.asarray(a.resize((160,90)).convert("L"),dtype=np.int16)
    b=np.asarray(b.resize((160,90)).convert("L"),dtype=np.int16)
    return float(np.abs(a-b).mean())

def choose_windows(times,diffs):
    n=len(times)
    if n<10:return [0]
    # First observable interaction and highest sustained local-change interval.
    # Never select an abrupt trailer shot-cut as a convincing 'attack' measurement:
    # these windows are discovery frames to be inspected manually.
    good=[(sum(min(diffs[k],36) for k in range(i+1,min(i+N,n))),
          i) for i in range(0,n-N,2) if times[i] >= 1]
    top=sorted(good,reverse=True)
    out=[0]
    for _,i in top:
        if all(abs(times[i]-times[k])>=2.4 for k in out):
            out.append(i)
            break
    return out

def sheet(name,frames,times,start,rate,kind):
    xs=[min(len(frames)-1,start+k) for k in range(N)]
    card_w,card_h=430,278
    W,H=4*card_w,2*card_h+56
    sheet=Image.new("RGB",(W,H),(18,25,31))
    d=ImageDraw.Draw(sheet)
    d.text((20,13),f"{name}  / {kind} / source time {times[start]:.3f}s - {times[xs[-1]]:.3f}s",(238,242,233))
    for i,k in enumerate(xs):
        frame=reduced(frames[k])
        frame.thumbnail((412,228))
        x=(i%4)*card_w+9
        y=(i//4)*card_h+43
        sheet.paste(frame,(x+(412-frame.width)//2,y+(226-frame.height)//2))
        d.text((x+8,y+236),f"OBS #{k:04d}   t={times[k]:07.3f}s",(238,238,224))
    p=OUT/f"{name}_sequence_{start:04d}.jpg"
    sheet.save(p,quality=86,optimize=True)
    return str(p)


def native_60fps_burst(path,name,start):
    """16 consecutive ORIGINAL 60fps video frames = ~267 ms, ~16.67ms apart."""
    with tempfile.TemporaryDirectory() as tmp:
        target=Path(tmp)/"native_%05d.png"
        subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-y",
                        "-i",str(path),"-ss",str(start),
                        "-frames:v","16","-vf","scale=340:-2:flags=lanczos",
                        "-vsync","0",str(target)],check=True)
        imgs=[Image.open(x).convert("RGB") for x in sorted(Path(tmp).glob("native_*.png"))]
    if len(imgs)!=16:raise RuntimeError("expected 16 native frames, got "+str(len(imgs)))
    w,h=370,250
    canvas=Image.new("RGB",(w*4,h*4+38),(14,23,30))
    draw=ImageDraw.Draw(canvas)
    draw.text((10,9),f"{name} - 16 NATIVE 60fps FRAMES - source t {start:.3f}s to {start+15/60:.3f}s",(235,239,228))
    for i,im in enumerate(imgs):
        im.thumbnail((w-12,h-34))
        x=(i%4)*w+6;y=(i//4)*h+38
        canvas.paste(im,(x+(w-12-im.width)//2,y+(h-34-im.height)//2))
        draw.text((x+4,y+h-27),f"F{i:02d}   t={start+i/60:.4f}s",(240,235,215))
    p=OUT/f"{name}_native60_{str(start).replace('.','p')}.jpg"
    canvas.save(p,quality=86,optimize=True)
    return str(p)

reports=[]
for path in sorted(SRC.iterdir()):
    if path.suffix.lower() not in (".gif",".mp4",".webm"):continue
    name=path.stem.lower().replace(" ","_")
    filehash=hashlib.sha256(path.read_bytes()).hexdigest()
    try:
        metadata=ffprobe(path)
        if path.suffix.lower()==".gif":images,times,duration=read_gif(path)
        else:images,times,duration=read_video(path)
        if not images:raise RuntimeError("no decoded frames")
        diff=[0.0]+[delta(images[i-1],images[i]) for i in range(1,len(images))]
        windows=choose_windows(times,diff)
        if path.suffix==".gif":
            windows=sorted(set([0,max(0,(len(times)-N)//2),max(0,len(times)-N)]))
        previews=[sheet(name,images,times,idx,RATE,"GIF native frames" if path.suffix==".gif" else "8fps sampling") for idx in windows]
        if path.suffix.lower()==".mp4" and name in ("slots_game_explainer","slots_reveal_trailer"):
            start=10.38 if name=="slots_game_explainer" else 21.88
            previews.append(native_60fps_burst(path,name,start))
        if name=="wildfrost_release_trailer":
            # This source is an 81.7s publisher promo with several montage
            # cuts. Do not mislabel cuts as an in-game battle animation.
            # Sample three separated 16-frame continuous source sequences.
            for start in (12.0,32.0,54.0):
                previews.append(native_60fps_burst(path,name,start))
        metrics=[{"index":i,"time_s":round(t,4),"mean_luma_change":round(diff[i],3)} for i,t in enumerate(times)]
        (OUT/f"{name}_frame_metrics.json").write_text(json.dumps(metrics,indent=2))
        reports.append({"name":name,"file_sha256":filehash,"byte_size":path.stat().st_size,
           "sample_count":len(images),"sample_period_sec":None if path.suffix==".gif" else 1/RATE,
           "source_native_fps":metadata["stream"].get("avg_frame_rate"),
           "source_duration_s":metadata["format"].get("duration"),
           "decoded_span_sec":duration,
           "contact_sheets":previews,"motion_peaks":sorted(metrics,key=lambda m:m["mean_luma_change"],reverse=True)[:10],
           "status":"success"})
    except Exception as ex:
        reports.append({"name":name,"status":"FAILED","error":str(ex)})
(OUT/"report.json").write_text(json.dumps(reports,ensure_ascii=False,indent=2))
with open(OUT/"README.md","w") as f:
    f.write("# Frame-sampled real promotional footage study\n\n")
    f.write("8 consecutive observation frames per contact sheet. GIF uses native frames; MP4 uses 8 fps samples. ")
    f.write("Timestamps refer to source footage, NOT original engine easing constants. ")
    f.write("Source motion peaks are pixel-difference maxima; manual review is required to distinguish edits from actual object movement. ")
    f.write("Full downloaded copyrighted clips are intentionally excluded from artifacts.\n\n")
    for row in reports:
        f.write(f"## {row['name']}  {row['status']}\n\n")
        if row['status']=="success":
            f.write(f"frames={row['sample_count']} / sample period={row['sample_period_sec']} / native fps={row['source_native_fps']}\n\n")
            for x in row['contact_sheets']:f.write(f"![8-frame analysis]({Path(x).name})\n\n")
        else:f.write(row["error"]+"\n\n")
print(json.dumps([{k:v for k,v in row.items() if k not in ("motion_peaks","file_sha256")} for row in reports],ensure_ascii=False))
if sum(x["status"]=="success" for x in reports)<2:sys.exit("Need at least 2 decoded source clips to validate actual motion")
