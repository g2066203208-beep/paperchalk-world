#!/usr/bin/env python3
"""V4 R2C2 detective: real CPU CNN experiment, native discrete-pixel candidate.

Does NOT claim artist-trained model or perfect pixel art. 21 other character
cells give synthetic-degradation/pseudo-label training data. Detective is fully
excluded from training. A learned candidate is compared against a direct
quantization baseline, never silently promoted to approved artwork.
"""
import argparse, hashlib, json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image
import torch
from torch import nn
from torch.nn import functional as F

SEED=20261031
CELL=128
DETECTIVE=6
HOLDOUTS=(4,17,23)
EXCLUDED=(DETECTIVE,)+HOLDOUTS

class PixelRestorer(nn.Module):
    def __init__(self):
        super().__init__()
        self.net=nn.Sequential(nn.Conv2d(3,32,3,padding=1),nn.ReLU(),
          nn.Conv2d(32,32,3,padding=1),nn.ReLU(),
          nn.Conv2d(32,32,3,padding=1),nn.ReLU(),
          nn.Conv2d(32,3,3,padding=1))
    def forward(self,x):return torch.clamp(x+self.net(x),0,1)

def tiles(sheet):
    h,w=sheet.shape[:2]
    if w<256 or h<256:raise ValueError("Source too small")
    for r in range(5):
      for c in range(5):
        x0=round(c*w/5);x1=round((c+1)*w/5)
        y0=round(r*h/5);y1=round((r+1)*h/5)
        yield cv2.resize(sheet[y0:y1,x0:x1],(CELL,CELL),interpolation=cv2.INTER_AREA)

def quantize(a,k):
    cv2.setRNGSeed(SEED)
    src=a.reshape(-1,3).astype("float32")
    _,labels,centers=cv2.kmeans(src,k,None,
      (cv2.TERM_CRITERIA_MAX_ITER+cv2.TERM_CRITERIA_EPS,25,.3),
      4,cv2.KMEANS_PP_CENTERS)
    colors=np.uint8(np.clip(np.rint(centers),0,255))
    return colors[labels.ravel()].reshape(a.shape),colors

def degrade(clean,rng):
    img=cv2.GaussianBlur(clean.astype("float32"),(3,3),float(rng.uniform(.45,1.1)))
    if rng.random()<.6:
        n=int(rng.integers(99,120))
        img=cv2.resize(cv2.resize(img,(n,n),interpolation=cv2.INTER_LINEAR),
            (CELL,CELL),interpolation=cv2.INTER_LINEAR)
    img+=rng.normal(0,rng.uniform(.006,.021),img.shape).astype("float32")
    return np.clip(img,0,1)

def train(pseudo,steps):
    torch.set_num_threads(2);torch.manual_seed(SEED)
    rng=np.random.default_rng(SEED)
    training=[i for i in range(25) if i not in EXCLUDED]
    net=PixelRestorer()
    optimizer=torch.optim.AdamW(net.parameters(),lr=.001)
    for step in range(steps):
        inputs=[];labels=[]
        for j in range(12):
            i=int(rng.choice(training));truth=pseudo[i].astype("float32")/255
            damaged=degrade(truth,rng)
            y=int(rng.integers(0,81));x=int(rng.integers(0,81))
            inputs.append(damaged[y:y+48,x:x+48].transpose(2,0,1))
            labels.append(truth[y:y+48,x:x+48].transpose(2,0,1))
        xx=torch.from_numpy(np.stack(inputs));yy=torch.from_numpy(np.stack(labels))
        pred=net(xx);loss=F.l1_loss(pred,yy)+.15*F.mse_loss(pred,yy)
        optimizer.zero_grad();loss.backward();optimizer.step()
    net.eval();holdout=[]
    with torch.no_grad():
      for i in HOLDOUTS:
        truth=pseudo[i].astype("float32")/255
        x=degrade(truth,np.random.default_rng(SEED+i))
        pred=net(torch.from_numpy(x.transpose(2,0,1)[None])).numpy()[0].transpose(1,2,0)
        a=float(np.abs(x-truth).mean());b=float(np.abs(pred-truth).mean())
        holdout.append({"id":f"R{i//5+1}C{i%5+1}","input_L1":round(a,6),
          "learned_L1":round(b,6),"improved":b<a})
    return net,holdout,training

def learned_discrete(source,net,palette=14):
    baseline,colors=quantize(source,palette)
    with torch.no_grad():
        x=torch.from_numpy((source.astype("float32")/255).transpose(2,0,1)[None])
        predicted=net(x).numpy()[0].transpose(1,2,0)*255
    # Save edges in face, nose, eyes and cigarette. Avoid soft final pixels.
    gray=cv2.cvtColor(source,cv2.COLOR_RGB2GRAY)
    edges=cv2.Canny(gray,45,125)>0
    face=np.zeros((CELL,CELL),bool);face[42:104,37:112]=True
    focus=face & (edges | (gray<95))
    predicted[focus]=.25*predicted[focus]+.75*source[focus]
    d=((predicted[:,:,None,:]-colors[None,None,:,:].astype("float32"))**2).sum(axis=-1)
    learned=colors[np.argmin(d,axis=-1)].astype("uint8")
    # Preserve strict output color count: no dither, no interpolation.
    return learned,baseline,int(focus.sum())

def save_grid_exact(image,path):
    im=Image.fromarray(image,"RGB")
    im.save(path,optimize=True)
    large=im.resize((1024,1024),Image.Resampling.NEAREST)
    x=np.asarray(large).reshape(128,8,128,8,3)
    assert np.all(x==x[:,0:1,:,0:1,:]),"A logical pixel was split"
    large.save(path.with_name(path.stem+"-preview-1024.png"),optimize=True)

def run(source,out,steps=150,colors=14):
    source=Path(source);out=Path(out);out.mkdir(parents=True,exist_ok=True)
    raw=source.read_bytes()
    atlas=np.asarray(Image.open(source).convert("RGB"))
    samples=list(tiles(atlas))
    pseudo=[quantize(x,14)[0] for x in samples]
    model,heldout,train_ids=train(pseudo,steps)
    result,baseline,protected=learned_discrete(samples[DETECTIVE],model,colors)
    save_grid_exact(result,out/"R2C2-detective-cnn-native-128.png")
    Image.fromarray(baseline).save(out/"R2C2-quantization-baseline-128.png")
    Image.fromarray(samples[DETECTIVE]).save(out/"R2C2-reference-128.png")
    torch.save({"state_dict":model.state_dict(),"seed":SEED,"training_cells":train_ids,
      "excluded_cells":EXCLUDED,"steps":steps},out/"R2C2-restorer.pt")
    report={"status":"candidate NOT approved gold",
      "source_sha256":hashlib.sha256(raw).hexdigest(),
      "source_size":list(Image.open(source).size),
      "reference":"Original V4 5x5 image, not artist-authored pixel training data",
      "training":"Real PyTorch CPU CNN with synthetic-degradation pseudo-labels",
      "training_cells":len(train_ids),"test_cells":list(HOLDOUTS),
      "detective_training_leakage":False,"steps":steps,
      "heldout":heldout,"all_holdout_improved":all(x["improved"] for x in heldout),
      "trained_model_applied_to_detective":True,"native_logical_grid":[128,128],
      "palette_colors":int(np.unique(result.reshape(-1,3),axis=0).shape[0]),
      "protected_face_edge_pixels":protected,
      "limitation":"Pseudo-labels do not train artistic semantics: face and staircase quality need artist review."}
    (out/"quality.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf8")
    print(json.dumps(report,ensure_ascii=False))
    return report

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--input",default="site/pixel-lab/portrait-v4/source-v4-640-q92.webp")
    p.add_argument("--out",default="artifacts/detective-v4-ml")
    p.add_argument("--steps",type=int,default=150)
    p.add_argument("--colors",type=int,default=14)
    a=p.parse_args()
    if not (4<=a.colors<=32):raise SystemExit("colors must be 4..32")
    run(a.input,a.out,a.steps,a.colors)
