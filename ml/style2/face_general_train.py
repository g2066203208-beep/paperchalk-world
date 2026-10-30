"""General-purpose *pretraining* prototype on multiple CC0 pixel-face combinations.

Training identities come from a CC0 modular portrait corpus, NOT one user's
pose artificially shifted hundreds of times. The 4,928 images are combinations
of parts, not 4,928 independent drawn people. Train/test split is by combination
file, NOT unseen component or unseen identity. Samples are not D-style gold.
"""
from __future__ import annotations
import argparse, hashlib, io, json, math, random, re
from collections import Counter
from pathlib import Path
from zipfile import ZipFile
import numpy as np
from PIL import Image, ImageDraw, ImageOps
import torch
from torch import nn
from torch.nn import functional as F

ROOT=Path("site/pixel-lab/style2/face-general")
ZIP=Path("ml/datasets/cc0_faces_lamiarts.zip")
COLORS=np.array([[57,54,87],[242,165,194],[169,186,233],[255,245,230]],dtype=np.uint8)
SIDE=64
SEED=20261030

def convert_to_d(rgba):
    # Explicit 4-color representation for learning COLOR CLUSTERS; this
    # is not a learned style transfer of the reference D character.
    im=rgba.crop((64,4,192,132)).resize((SIDE,SIDE),Image.Resampling.NEAREST)
    a=np.asarray(im.convert("RGBA"),np.uint8)
    rgb=a[:,:,:3].astype(np.int32)
    dist=((rgb[:,:,None,:]-COLORS.astype(np.int32)[None,None,:,:])**2).sum(-1)
    idx=dist.argmin(-1).astype(np.uint8)
    idx[a[:,:,3]<80]=0
    # Keep exposed cyan face regions distinct from hair and dark contour.
    yy,xx=np.mgrid[:SIDE,:SIDE]
    cyan=(rgb[:,:,1]>105)&(rgb[:,:,2]>105)&(rgb[:,:,0]<115)
    central=(xx>18)&(xx<47)&(yy>12)&(yy<48)
    idx[cyan&central&(a[:,:,3]>=80)]=3
    return idx

def load_data(limit=768):
    if not ZIP.exists():raise RuntimeError("Missing licensed CC0 portrait archive; never substitute repeated D poses")
    arr=[]
    with ZipFile(ZIP) as archive:
        names=[n for n in archive.namelist() if re.fullmatch(r"Faces/faces/faces_[0-9]+\.png",n)]
        if len(names)<1000:raise RuntimeError("Unexpected CC0 dataset; fewer than 1k independently composited samples")
        names.sort(key=lambda n:int(re.search(r"(\d+)\.png$",n).group(1)))
        # Deterministic combination-level holdout, NOT genuine identity holdout.
        tr=[x for x in names if int(re.search(r"(\d+)\.png$",x).group(1))%9!=0]
        te=[x for x in names if int(re.search(r"(\d+)\.png$",x).group(1))%9==0]
        rng=np.random.default_rng(SEED)
        rng.shuffle(tr);rng.shuffle(te)
        for split,source in (("train",tr[:limit]),("test",te[:max(64,limit//6)])):
            for name in source:
                with archive.open(name) as f:im=Image.open(io.BytesIO(f.read())).convert("RGBA")
                indexed=convert_to_d(im)
                arr.append((split,name,indexed))
    tr=[(n,a) for split,n,a in arr if split=="train"]
    te=[(n,a) for split,n,a in arr if split=="test"]
    # Pixel-exact deduplication; different names can share appearance.
    def dedup(items):
        seen=set();unique=[]
        for n,x in items:
            h=hashlib.sha256(x.tobytes()).hexdigest()
            if h not in seen:seen.add(h);unique.append((n,x))
        return unique
    tr=dedup(tr);te=dedup(te)
    trhash={hashlib.sha256(x.tobytes()).hexdigest() for _,x in tr}
    te=[(n,x) for n,x in te if hashlib.sha256(x.tobytes()).hexdigest() not in trhash]
    if len(tr)<64 or len(te)<10:raise RuntimeError(f"Not enough distinct licensed examples after dedup: {len(tr)} train {len(te)} test")
    return tr,te,len(names)

class VAE(nn.Module):
    def __init__(self,latent=48):
        super().__init__();self.latent=latent
        self.encoder=nn.Sequential(
            nn.Conv2d(4,32,3,padding=1),nn.SiLU(),
            nn.Conv2d(32,64,4,2,1),nn.SiLU(),
            nn.Conv2d(64,96,4,2,1),nn.SiLU(),
            nn.Conv2d(96,128,4,2,1),nn.SiLU(),
            nn.Conv2d(128,128,3,padding=1),nn.SiLU(),
            nn.AdaptiveAvgPool2d(1),nn.Flatten())
        self.mu=nn.Linear(128,latent);self.logvar=nn.Linear(128,latent)
        self.fc=nn.Linear(latent,128*8*8)
        self.decoder=nn.Sequential(
            nn.Conv2d(128,128,3,padding=1),nn.SiLU(),
            nn.Upsample(scale_factor=2,mode="nearest"),
            nn.Conv2d(128,96,3,padding=1),nn.SiLU(),
            nn.Upsample(scale_factor=2,mode="nearest"),
            nn.Conv2d(96,64,3,padding=1),nn.SiLU(),
            nn.Upsample(scale_factor=2,mode="nearest"),
            nn.Conv2d(64,32,3,padding=1),nn.SiLU(),
            nn.Conv2d(32,4,1))
    def encode(self,ids):
        x=F.one_hot(ids.long(),4).permute(0,3,1,2).float()
        h=self.encoder(x)
        return self.mu(h),self.logvar(h).clamp(-8,6)
    def decode(self,z):return self.decoder(self.fc(z).reshape(-1,128,8,8))
    def forward(self,x):
        mu,logvar=self.encode(x)
        z=mu+torch.randn_like(mu)*torch.exp(.5*logvar)
        return self.decode(z),mu,logvar

def contact(images,dst,scale=3,cols=6):
    rows=math.ceil(len(images)/cols)
    tile=SIDE*scale
    canvas=Image.new("RGB",(cols*tile,rows*tile),tuple(COLORS[0]))
    for i,idx in enumerate(images):
        native=Image.fromarray(COLORS[idx],"RGB").resize((tile,tile),Image.Resampling.NEAREST)
        canvas.paste(native,((i%cols)*tile,(i//cols)*tile))
    canvas.save(dst)

@torch.no_grad()
def evaluate(net,items,max_items=64):
    net.eval();data=np.stack([x for _,x in items[:max_items]])
    x=torch.from_numpy(data.astype(np.int64))
    pred=net.decode(net.encode(x)[0]).argmax(1).cpu().numpy()
    return {"test_combinations":len(items),
      "exact_pixel_accuracy":round(float(np.mean(pred==data)),4),
      "foreground_accuracy":round(float(np.mean((pred==data)[data>0])),4)}

def run(steps=420,limit=768,seed=SEED):
    ROOT.mkdir(parents=True,exist_ok=True)
    torch.manual_seed(seed);torch.set_num_threads(2)
    train,test,total=load_data(limit)
    rng=np.random.default_rng(seed)
    data=np.stack([x for _,x in train])
    net=VAE();optim=torch.optim.AdamW(net.parameters(),lr=.00075,weight_decay=.0001)
    history=[]
    for i in range(steps):
        net.train()
        batch=data[rng.integers(len(data),size=20)]
        x=torch.from_numpy(batch.astype(np.int64))
        pred,mu,lv=net(x)
        # Foreground receives greater importance than the dark backing.
        w=torch.tensor([.25,1.4,1.4,1.5])
        recon=F.cross_entropy(pred,x,weight=w)
        kl=(-.5*(1+lv-mu.square()-lv.exp())).sum(1).mean()
        loss=recon+min(.009,.009*(i+1)/120)*kl
        optim.zero_grad(set_to_none=True);loss.backward()
        nn.utils.clip_grad_norm_(net.parameters(),2)
        optim.step()
        if i in (0,steps//4,steps//2,steps-1):
            history.append([i+1,round(loss.item(),5),round(recon.item(),5),round(kl.item(),5)])
    scores=evaluate(net,test)
    net.eval()
    picks=rng.choice(len(train),size=80,replace=False)
    src=torch.from_numpy(data[picks].astype(np.int64))
    with torch.no_grad():
        latent=net.encode(src)[0]
        proposals=[]
        for i in range(48):
            j,k=rng.choice(len(picks),size=2,replace=False)
            alpha=float(rng.uniform(.25,.75))
            noise=torch.randn((1,net.latent))*float(rng.uniform(.1,.35))
            z=alpha*latent[j:j+1]+(1-alpha)*latent[k:k+1]+noise
            im=net.decode(z).argmax(1)[0].cpu().numpy().astype(np.uint8)
            proposals.append(im)
    unique=[]
    for im in proposals:
        if not any(np.array_equal(im,other) for other in unique):
            unique.append(im)
        if len(unique)>=24:break
    if len(unique)<8:raise RuntimeError("Posterior collapse: insufficient distinct network-generated faces")
    train_set=np.stack([a for _,a in train])
    exact_copies=0
    min_diff=[]
    for i,im in enumerate(unique):
        pixel_diff=np.mean(train_set!=im[None],axis=(1,2))
        d=float(pixel_diff.min());min_diff.append(d)
        if d<1e-8:exact_copies+=1
        Image.fromarray(COLORS[im],"RGB").save(ROOT/f"generated_{i:02d}.png")
    contact(unique,ROOT/"generated_contact.png")
    contact([a for _,a in train[:24]],ROOT/"training_combinations_contact.png")
    contact([a for _,a in test[:12]],ROOT/"heldout_combinations_contact.png")
    torch.save({"state_dict":net.state_dict(),"latent":net.latent,"provenance":"CC0 lamiarts modular parts"},ROOT/"generic_faces_weights.pt")
    report={
      "status":"multi-combination-pretraining-only","pretrained":True,
      "source":"lamiarts CC0 modular portrait kit",
      "source_url":"https://opengameart.org/content/faces-1",
      "license":"CC0",
      "source_combinations_available":total,
      "distinct_train_combinations":len(train),
      "distinct_holdout_combinations":len(test),
      "not_independent_character_identity_count":True,
      "holdout_policy":"Different combination filenames; component shapes and hair parts overlap across train/test",
      "native_grid":[SIDE,SIDE],
      "exact_four_colors":["#393657","#F2A5C2","#A9BAE9","#FFF5E6"],
      "steps":steps,"network":"convolutional VAE with latent interpolation",
      "parameters":sum(p.numel() for p in net.parameters()),
      "loss_curve":history,
      "holdout":scores,
      "candidate_count":len(unique),
      "exact_training_copies":exact_copies,
      "mean_nearest_train_pixel_difference":round(float(np.mean(min_diff)),4),
      "pixel_96x96_quality":False,
      "human_approved_count":0,
      "limitations":["Modular CC0 asset: 4928 combinations share face/head/hair parts; not 4928 independent people.",
                     "Pretraining visual quality is different from pink-haired four-color reference artist.",
                     "64x64 source-face geometry is coarse, not final 96x96 high-detail face generation.",
                     "Novel pixel combination cannot prove a genuinely beautiful original face."]
    }
    (ROOT/"general_report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps({k:report[k] for k in ("distinct_train_combinations","distinct_holdout_combinations",
       "candidate_count","exact_training_copies","mean_nearest_train_pixel_difference","holdout")},ensure_ascii=False),flush=True)
if __name__=="__main__":
    ap=argparse.ArgumentParser();ap.add_argument("--steps",type=int,default=420);ap.add_argument("--limit",type=int,default=768)
    a=ap.parse_args();run(a.steps,a.limit)
