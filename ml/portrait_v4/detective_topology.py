#!/usr/bin/env python3
"""R2C2 original-pixel candidate gate. Operates on real CNN output and real reference.

Do not confuse 128x128 exact discrete RGB pixels with artist-approved pixel art.
A trained CNN is run upstream; its proposal MUST pass a topology/fidelity gate.
"""
import argparse, json, hashlib
from collections import Counter
from pathlib import Path
import numpy as np
import cv2
from PIL import Image

SIZE=128
FEATURE_RECTS={
 'eyes':(44,45,76,57),
 'nose':(68,52,85,70),
 'mouth_chin':(60,66,84,89),
 'cigarette':(76,69,104,90),
 'smoke':(96,44,113,79),
 'hat_brim':(2,26,126,48),
 'frame_top':(6,6,122,13),
 'frame_left':(6,8,13,120),
 'frame_right':(117,8,123,120),
 'frame_bottom':(6,113,122,119)
}
def protected():
    p=np.zeros((SIZE,SIZE),bool)
    for x0,y0,x1,y1 in FEATURE_RECTS.values():p[y0:y1,x0:x1]=True
    return p

def tiny_components(image,limit=2):
    colors,ids=np.unique(image.reshape(-1,3),axis=0,return_inverse=True)
    labels=ids.reshape((SIZE,SIZE))
    number=0
    for k in range(len(colors)):
        count,cc,stats,_=cv2.connectedComponentsWithStats((labels==k).astype('uint8'),8)
        number+=int(np.count_nonzero(stats[1:,cv2.CC_STAT_AREA]<=limit))
    return number

def clean_components(image,mask,threshold=30,limit=2):
    img=image.copy()
    corrections=0
    for _ in range(2):
        colors,ids=np.unique(img.reshape(-1,3),axis=0,return_inverse=True)
        lab=cv2.cvtColor(colors[None].astype('uint8'),cv2.COLOR_RGB2LAB)[0].astype('float32')
        labels=ids.reshape(SIZE,SIZE)
        edits=[]
        for k in range(len(colors)):
            count,cc,stats,_=cv2.connectedComponentsWithStats((labels==k).astype('uint8'),8)
            for component in range(1,count):
                if int(stats[component,cv2.CC_STAT_AREA])>limit:continue
                yx=np.argwhere(cc==component)
                if np.any(mask[yx[:,0],yx[:,1]]):continue
                neighbors=[]
                for y,x in yx:
                    for dy,dx in [(-1,0),(0,1),(1,0),(0,-1)]:
                        yy=int(y+dy);xx=int(x+dx)
                        if 0<=xx<SIZE and 0<=yy<SIZE and labels[yy,xx]!=k:
                            neighbors.append(int(labels[yy,xx]))
                if len(neighbors)<3:continue
                best,countnb=Counter(neighbors).most_common(1)[0]
                if countnb<3 or countnb/len(neighbors)<.70:continue
                if float(np.linalg.norm(lab[k]-lab[best]))>threshold:continue
                for y,x in yx:edits.append((int(y),int(x),colors[best]))
        for y,x,color in edits:img[y,x]=color
        corrections+=len(edits)
        if not edits:break
    return img,corrections

def clean_margin(image,mask):
    out=image.copy()
    # Pick the exact existing background palette color instead of adding one.
    cream=Counter(map(tuple,image[:6,:6].reshape(-1,3))).most_common(1)[0][0]
    changes=0
    for y in range(SIZE):
        for x in range(SIZE):
            # Do NOT cut the tall hat off at y=0, nor its breakout brim on either side.
            erase=(x<5 and not 27<=y<48) or (x>=125 and not 27<=y<50)
            erase=erase or y>=120 or (y<4 and (x<27 or x>=95))
            if erase and not mask[y,x] and tuple(out[y,x])!=cream:
                out[y,x]=cream;changes+=1
    return out,changes

def rgb_image(path):
    im=np.asarray(Image.open(path).convert('RGB'))
    if im.shape!=(SIZE,SIZE,3):raise ValueError(str(path)+' must be 128x128 RGB')
    return im

def evaluate(candidate,reference):
    # L1 fidelity is a risk check, not an aesthetic judgment.
    fidelity=float(np.abs(candidate.astype('float32')-reference.astype('float32')).mean())
    islands=tiny_components(candidate)
    return {'MAE_to_reference':round(fidelity,5),'tiny_8_connected_color_components':islands,
       'composite_risk_score':round(fidelity+islands*.01,5)}

def save_native(a,path):
    Image.fromarray(a,'RGB').save(path,optimize=True)
    up=np.asarray(Image.fromarray(a,'RGB').resize((1024,1024),Image.Resampling.NEAREST))
    exact=np.repeat(np.repeat(a,8,axis=0),8,axis=1)
    if not np.array_equal(up,exact):raise AssertionError('Sub-grid colors detected')
    Image.fromarray(up,'RGB').save(path.with_name(path.stem+'-preview-1024.png'),optimize=True)

def run(directory):
    directory=Path(directory);mask=protected()
    reference=rgb_image(directory/'R2C2-reference-128.png')
    sources={
       'trained_cnn': directory/'R2C2-detective-cnn-native-128.png',
       'baseline':directory/'R2C2-quantization-baseline-128.png'
    }
    records={};candidates={}
    for name,path in sources.items():
        arr=rgb_image(path)
        before=tiny_components(arr)
        out,n=clean_components(arr,mask)
        out,dust=clean_margin(out,mask)
        changed=np.any(out!=arr,axis=-1)
        if np.any(changed&mask):raise AssertionError('Protected eyes/nose/mouth/smoke/hat/frame altered')
        if tiny_components(out)>before:raise AssertionError('Topology unexpectedly degraded')
        candidates[name]=out
        records[name]=dict(evaluate(out,reference),original_tiny_components=before,
            corrected_orphan_pixels=n,removed_outer_margin_debris=dust,
            changed_pixel_count=int(changed.sum()),protected_pixels_changed=int((changed&mask).sum()),
            palette_color_count=len(np.unique(out.reshape(-1,3),axis=0)))
        save_native(out,directory/('R2C2-'+name+'-topology-128.png'))
    pick=min(records,key=lambda n:records[n]['composite_risk_score'])
    selected=candidates[pick]
    save_native(selected,directory/'R2C2-selected-native-128.png')
    report={
      'status':'candidate, NOT perfect pixel art / NOT training Gold',
      'reference_origin':'V4 original-derived lossy WEBP in repo, NOT independent human pixel drawing',
      'model_was_trained':'yes, separate actual PyTorch experiment in detective.py',
      'model_automatically_promoted':pick=='trained_cnn',
      'selected':pick,'native_logic':[128,128],
      'pixel_block_size_in_1024_preview':[8,8],
      'protected_structures':FEATURE_RECTS,'candidate_comparison':records,
      'method':'learned CNN candidate vs traditional baseline; structure-protected connected-color cleanup; guard MAE and tiny components',
      'limits':'ROI protection can preserve errors; tiny-component count is not a judgment of actual art; face still needs a pixel-artist review',
      'src_model_report_sha256':hashlib.sha256((directory/'quality.json').read_bytes()).hexdigest()
    }
    (directory/'R2C2-topology-gate-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False))
    return report

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--dir',default='artifacts/detective-v4-ml')
    args=p.parse_args();run(args.dir)
