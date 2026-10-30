"""PAPERWORLD full-canvas pixel illustration experiment.

Train on WHOLE 384x512 D-palette character paintings (not faces, 16px sprites,
body-template transplants or cut-up parts). A masked full-image reconstruction
baseline ONLY. It does not synthesize novel identities. The independent
illustration and identity count are intentionally exposed in the report.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image
import torch
from torch import nn
from torch.nn import functional as F

from ml.repixelize.engine import decode

ROOT=Path("site/pixel-lab/fullbody-learning")
ASSET=Path("site/pixel-lab/assets/hostess-redraw-v1-192x256.png")
PALETTE=np.array([[57,54,87],[242,165,194],[169,186,233],[255,245,230]],np.uint8)
WIDTH,HEIGHT=384,512
SOURCES=[
    ("gold_dynamic","ml/repixelize/reference-384.lzma.b64","gold", "master_identity_01"),
    ("gold_standing","ml/repixelize/d-standing-v1.tokens.b64","gold", "master_identity_01"),
    ("hostess_candidate",str(ASSET),"unapproved_eval_only","hostess_identity_candidate")
]


def palette_index(rgb:np.ndarray)->np.ndarray:
    if rgb.shape!=(HEIGHT,WIDTH,3):raise ValueError("full-canvas dimensions must be 384x512")
    dist=((rgb.astype(np.int16)[:,:,None,:]-PALETTE.astype(np.int16)[None,None,:,:])**2).sum(-1)
    idx=dist.argmin(-1).astype(np.uint8)
    if not np.array_equal(PALETTE[idx],rgb):
        raise ValueError("non-D-palette pixel found; conversion belongs in System 01")
    return idx


def sources():
    samples=[]
    for key,path,status,identity in SOURCES:
        if path.endswith(".b64"):
            tok=decode(Path(path).read_text(encoding="utf8"))
            if tok.shape!=(HEIGHT,WIDTH) or not set(np.unique(tok)).issubset({0,1,2,3}):
                raise ValueError("corrupt master "+key)
            labels=tok.astype(np.uint8)
            src_native=[384,512]
        else:
            img=Image.open(path).convert("RGBA")
            if img.size!=(192,256):raise ValueError("candidate must be 192x256")
            # This candidate is already a native indexed 192x256 image. Upscaling
            # does NOT create new authored 384x512 detail.
            bg=Image.new("RGBA",img.size,tuple(PALETTE[0])+(255,))
            bg.alpha_composite(img)
            resized=bg.convert("RGB").resize((WIDTH,HEIGHT),Image.Resampling.NEAREST)
            labels=palette_index(np.asarray(resized))
            src_native=[192,256]
        pixels=PALETTE[labels]
        fname=key+"_source.png"
        ROOT.mkdir(parents=True,exist_ok=True)
        Image.fromarray(pixels,"RGB").save(ROOT/fname,optimize=True)
        samples.append(dict(id=key,source_file=path,status=status,identity=identity,source_grid=src_native,
                            train=status=="gold",labels=labels,preview=fname,
                            sha256=hashlib.sha256(pixels.tobytes()).hexdigest()))
    assert len({s["sha256"] for s in samples})==len(samples)
    assert len({s["identity"] for s in samples if s["train"]})==1
    return samples


class WholeFigureMaskNet(nn.Module):
    """Full-resolution context-aware classifier for damaged palette pixels.

    Every forward processes one complete 384x512 picture at once. The
    downsampled context branch sees the entire figure; a native-grid branch
    retains high-frequency pixels. No head-specific model or body templates.
    """
    def __init__(self):
        super().__init__()
        self.fine=nn.Sequential(
            nn.Conv2d(7,16,3,padding=1),nn.GELU(),
            nn.Conv2d(16,16,3,padding=2,dilation=2),nn.GELU())
        self.context=nn.Sequential(
            nn.Conv2d(7,16,5,padding=2),nn.GELU(),
            nn.Conv2d(16,16,3,padding=1),nn.GELU())
        self.head=nn.Conv2d(32,4,1)
    def forward(self,palette_pixels,missing):
        n,h,w=palette_pixels.shape
        one=F.one_hot(palette_pixels.long(),4).permute(0,3,1,2).float()
        one=one*(~missing).unsqueeze(1)
        xx=torch.linspace(-1,1,w,device=palette_pixels.device)[None,None,None,:].expand(n,1,h,w)
        yy=torch.linspace(-1,1,h,device=palette_pixels.device)[None,None,:,None].expand(n,1,h,w)
        feature=torch.cat([one,missing[:,None].float(),xx,yy],dim=1)
        a=self.fine(feature)
        b=self.context(F.avg_pool2d(feature,4))
        b=F.interpolate(b,size=(h,w),mode="nearest")
        return self.head(torch.cat([a,b],1))


def missing_mask(rng, h=HEIGHT,w=WIDTH):
    mask=np.zeros((h,w),dtype=bool)
    # Full-image random occlusion, including arms, shoes, eyes and clothing.
    for _ in range(28):
        hh=int(rng.integers(8,38));ww=int(rng.integers(8,38))
        y=int(rng.integers(0,h-hh));x=int(rng.integers(0,w-ww))
        mask[y:y+hh,x:x+ww]=True
    mask|=rng.random((h,w))<.035
    return torch.from_numpy(mask.copy())[None]


def evaluate(net,labels,rng):
    truth=torch.from_numpy(labels.astype(np.int64))[None]
    missing=missing_mask(rng)
    with torch.no_grad():pred=net(truth,missing).argmax(1).squeeze(0).numpy().astype(np.uint8)
    ref=labels
    obs=missing.squeeze(0).numpy()
    fg=obs & (ref!=0)
    accuracy=float((pred[obs]==ref[obs]).mean()) if obs.any() else 0
    fga=float((pred[fg]==ref[fg]).mean()) if fg.any() else 0
    # Unlike a composited visual preview, this file shows actual model guesses.
    return pred,{"masked_accuracy":round(accuracy,4),"masked_foreground_accuracy":round(fga,4),
                 "masked_pixels":int(obs.sum())}


def run(steps=110):
    torch.set_num_threads(2)
    torch.manual_seed(20261030)
    rng=np.random.default_rng(20261030)
    items=sources()
    training=[s for s in items if s["train"]]
    holdouts=[s for s in items if not s["train"]]
    if len(training)!=2 or len(holdouts)!=1:raise AssertionError("curation changed")
    net=WholeFigureMaskNet()
    optimizer=torch.optim.AdamW(net.parameters(),lr=.001)
    log=[]
    for step in range(steps):
        item=training[step%len(training)]
        truth=torch.from_numpy(item["labels"].astype(np.int64))[None]
        missing=missing_mask(rng)
        logits=net(truth,missing)
        weighted=F.cross_entropy(logits,truth,reduction="none")
        weights=missing.float()*2.0+0.15
        weights=weights*(1+0.65*(truth!=0))
        loss=(weighted*weights).mean()
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        nn.utils.clip_grad_norm_(net.parameters(),1.)
        optimizer.step()
        if step in {0,steps//3,2*steps//3,steps-1}:
            log.append([step+1,round(float(loss.item()),5)])
    net.eval()
    results=[]
    for item in items:
        predicted,metric=evaluate(net,item["labels"],rng)
        name=item["id"]+"_pred.png"
        Image.fromarray(PALETTE[predicted],"RGB").save(ROOT/name,optimize=True)
        results.append({k:v for k,v in item.items() if k!="labels"}|
                       {"reconstruction":name,"evaluation":metric})
    approved_identity_count=len({s["identity"] for s in training})
    # Safety gate: same character in two poses is not a general-purpose
    # 384x512 character illustration generator, however low the loss gets.
    report={
      "pipeline":"whole_figure_masked_reconstruction_v1",
      "trained":True,"trained_actual_full_canvas":True,
      "native_model_grid":[WIDTH,HEIGHT],"palette":PALETTE.tolist(),
      "steps":steps,"loss":log,
      "training_fullbody_images":len(training),"training_independent_identities":approved_identity_count,
      "evaluation_only_images":len(holdouts),
      "novel_fullbody_generator_trained":False,
      "new_distinct_fullbody_characters_generated":0,
      "fullbody_art_approved":0,
      "minimum_independent_approved_characters_for_generative_training":32,
      "identity_data_gate_passed":approved_identity_count>=32,
      "outputs_are_masked_reconstruction_not_original_character_art":True,
      "records":results,
      "warnings":[
       "Two gold 384x512 images show different poses of the SAME identity; not two separate characters.",
       "192x256 hostess candidate is upscaled 2x for separate evaluation only; enlargement creates NO new drawn detail.",
       "Masked reconstruction accuracy is NOT evidence that a model can invent anatomy, clothing or a new person.",
       "No faces, head-only samples, 16x16 motion sheets, or face-body transplants are positive training samples."
      ]
    }
    (ROOT/"report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf8")
    torch.save({"state_dict":net.state_dict(),"steps":steps,"report_pipeline":report["pipeline"]},ROOT/"fullbody-masknet.pt")
    print(json.dumps({"steps":steps,"identities":approved_identity_count,
      "heldout":results[-1]["evaluation"],"new_approved_art":0},ensure_ascii=False))
    return report

if __name__=="__main__":
    a=argparse.ArgumentParser();a.add_argument("--steps",type=int,default=110)
    args=a.parse_args();run(steps=args.steps)
