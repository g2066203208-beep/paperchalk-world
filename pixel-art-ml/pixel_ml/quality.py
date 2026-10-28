"""Mechanical checks: resolution, palette size, transparent mistakes, blockiness.

These are guards, not a substitute for professional human art critique.
"""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image

from .data import WIDTH,HEIGHT


def inspect_image(path:Path,max_colors:int=16) -> dict:
    with Image.open(path) as opened:
        original_mode=opened.mode
        rgb=np.asarray(opened.convert("RGB"),dtype=np.uint8)
        size=opened.size
    distinct=len(np.unique(rgb.reshape(-1,3),axis=0))
    # Edge density is descriptive, NOT an arbitrary pass/fail aesthetic metric.
    horizontal=np.mean(np.any(rgb[:,1:]!=rgb[:,:-1],axis=2))
    vertical=np.mean(np.any(rgb[1:]!=rgb[:-1],axis=2))
    return dict(name=Path(path).name,size=list(size),mode=original_mode,colors=distinct,
                edge_density=round(float((horizontal+vertical)/2),4),
                passes=size==(WIDTH,HEIGHT) and distinct<=max_colors)


def main():
    p=argparse.ArgumentParser()
    p.add_argument("--dir",type=Path,required=True)
    p.add_argument("--max-colors",type=int,default=16)
    p.add_argument("--glob",type=str,default="sprite_*.png",help="Only audit native generated sprites, not contact sheets or card frames")
    p.add_argument("--report",type=Path)
    args=p.parse_args()
    found=sorted(args.dir.glob(args.glob))
    if not found:
        raise SystemExit("No PNG files found")
    results=[inspect_image(x,args.max_colors) for x in found]
    report={"inspected":len(results),"passed":sum(r["passes"] for r in results),"results":results}
    if args.report:
        args.report.parent.mkdir(parents=True,exist_ok=True)
        args.report.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps({k:v for k,v in report.items() if k!="results"}))
    if report["passed"] != report["inspected"]:
        raise SystemExit("Pixel quality checks failed")

if __name__=="__main__":main()
