"""Optional deterministic connected-pixel regularization.

Never replaces original candidate silently. It removes only tiny palette-color
components when a close perceptual neighboring color dominates. High-contrast
pupils/inks stay protected. Human review remains necessary.
"""
import argparse,json
from pathlib import Path
import numpy as np
import cv2
from PIL import Image

def regularize(tile,limit=55):
    a=np.asarray(tile).copy();changed=0;by_pass=[]
    for _ in range(2):
        palette,ids=np.unique(a.reshape(-1,3),axis=0,return_inverse=True)
        lab=cv2.cvtColor(palette[None].astype('uint8'),cv2.COLOR_RGB2LAB)[0].astype('float32')
        labels=ids.reshape(a.shape[:2]);replacement=[]
        for k in range(len(palette)):
            mask=(labels==k).astype('uint8')
            count,components,stats,_=cv2.connectedComponentsWithStats(mask,8)
            for component in range(1,count):
                if stats[component,cv2.CC_STAT_AREA]>2:continue
                x,y,w,h=(int(stats[component,v]) for v in
                    (cv2.CC_STAT_LEFT,cv2.CC_STAT_TOP,cv2.CC_STAT_WIDTH,cv2.CC_STAT_HEIGHT))
                ys,xs=np.where(components[y:y+h,x:x+w]==component)
                points=[(int(yy+y),int(xx+x)) for yy,xx in zip(ys,xs)]
                neighbors=[]
                for yy,xx in points:
                    for ny in range(max(0,yy-1),min(108,yy+2)):
                        for nx in range(max(0,xx-1),min(108,xx+2)):
                            if (ny,nx) not in points and labels[ny,nx]!=k:
                                neighbors.append(int(labels[ny,nx]))
                if len(neighbors)<3:continue
                indices,counts=np.unique(neighbors,return_counts=True)
                best=int(indices[counts.argmax()])
                perceptual=float(np.linalg.norm(lab[k]-lab[best]))
                if perceptual<=limit and int(counts.max())>=3:
                    replacement.extend((yy,xx,best) for yy,xx in points)
        for y,x,best in replacement:a[y,x]=palette[best]
        changed+=len(replacement);by_pass.append(len(replacement))
        if not replacement:break
    return a,{"changed_pixels":changed,"each_pass":by_pass}

def run(path,out):
    original=np.asarray(Image.open(path).convert('RGB'))
    if original.shape!=(640,640,3):raise ValueError('expected 640x640')
    fixed=original.copy();tiles=[]
    for r in range(5):
        for c in range(5):
            y=r*128+10;x=c*128+10
            tile,report=regularize(fixed[y:y+108,x:x+108])
            fixed[y:y+108,x:x+108]=tile
            tiles.append({"id":f"R{r+1}C{c+1}",**report})
    from ml.portrait_v4.convert import validate_safety
    validate_safety(fixed)
    out=Path(out);out.parent.mkdir(parents=True,exist_ok=True)
    Image.fromarray(fixed).save(out,optimize=True)
    out.with_suffix(".json").write_text(json.dumps({"mode":"OPTIONAL candidate, not approved art",
      "changed_pixels":sum(t["changed_pixels"] for t in tiles),
      "rule":"only <=2-pixel connected components with perceptually close neighbors",
      "original_preserved":True,"tiles":tiles},ensure_ascii=False,indent=2))
    return sum(t["changed_pixels"] for t in tiles)

if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("input");p.add_argument("output")
    a=p.parse_args();print("optional changed pixels",run(a.input,a.output))
