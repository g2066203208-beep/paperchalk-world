"""Tiny exact four-color masked discrete diffusion with parallel token editing.

Research prototype inspired by:
 - MaskGIT (CVPR 2022), masked parallel decoding
 - Nemotron-Labs-Diffusion-Image (2026), correcting visible tokens

NOT the official models. 48x64 native logical grid; outputs D palette.
Two supplied images are one character in two poses, not two identities.
Requires PyTorch (CPU works). After running ml.style2.prepare:
 python -m ml.style2.discrete_diffusion --steps 160
"""
from pathlib import Path
import argparse, json, math, time
import numpy as np
import torch
from torch import nn
from torch.nn import functional as F
from PIL import Image
from ml.style2.prepare import ROOT as ASSETS, COL, prepare

H,W=64,48
ROOT=ASSETS/"diffusion"
def tokens(path):
    rgb=np.asarray(Image.open(path).convert("RGB").resize((W,H),Image.Resampling.NEAREST),dtype="int16")
    delta=(rgb[:,:,None,:]-COL[None,None,:,:].astype("int16"))**2
    return torch.from_numpy(delta.sum(3).argmin(2).astype("int64"))
def png(v,path):
    Image.fromarray(COL[v.cpu().numpy().astype("uint8")],"RGB").save(path)

class Block(nn.Module):
    def __init__(self,n,d):
        super().__init__()
        self.net=nn.Sequential(nn.GroupNorm(8,n),nn.SiLU(),
            nn.Conv2d(n,n,3,padding=d,dilation=d),nn.GroupNorm(8,n),
            nn.SiLU(),nn.Conv2d(n,n,1))
    def forward(self,x):return x+0.30*self.net(x)

class DNet(nn.Module):
    def __init__(self,n=48):
        super().__init__()
        self.embed=nn.Embedding(5,16)   # four exact colors + [MASK]
        self.pose=nn.Embedding(2,8)
        self.stem=nn.Conv2d(28,n,3,padding=1)
        self.blocks=nn.Sequential(*(Block(n,d) for d in (1,2,4,8,8,4,2,1)))
        self.head=nn.Sequential(nn.GroupNorm(8,n),nn.SiLU(),nn.Conv2d(n,4,1))
    def forward(self,a,p,t):
        b,h,w=a.shape
        e=self.embed(a).permute(0,3,1,2)
        q=self.pose(p)[:,:,None,None].expand(-1,-1,h,w)
        y=torch.linspace(-1,1,h)[None,None,:,None].expand(b,1,h,w)
        x=torch.linspace(-1,1,w)[None,None,None,:].expand(b,1,h,w)
        t=t[:,None,None,None].expand(b,1,h,w)
        return self.head(self.blocks(self.stem(torch.cat((e,q,x,y,t,1-t),1))))

def batch(images,rng,b=12):
    choices=rng.integers(0,2,b)
    clean=torch.stack([images[int(k)].clone() for k in choices])
    poses=torch.from_numpy(choices).long()
    for i in range(b):
        if rng.random()<.4:clean[i]=clean[i].flip(1)
        dx,dy=int(rng.integers(-2,3)),int(rng.integers(-2,3))
        if dx or dy:
            src=clean[i].clone();clean[i].fill_(0)
            x0,x1=max(0,dx),min(W,W+dx)
            y0,y1=max(0,dy),min(H,H+dy)
            clean[i,y0:y1,x0:x1]=src[y0-dy:y1-dy,x0-dx:x1-dx]
    noise=torch.tensor(rng.uniform(.06,.99,b),dtype=torch.float32)
    mask=torch.from_numpy(rng.random((b,H,W))<noise[:,None,None].numpy())
    corrupted=torch.from_numpy(rng.random((b,H,W))<.06)&~mask
    bad=torch.from_numpy(rng.integers(0,4,(b,H,W),dtype=np.int64))
    inp=clean.clone()
    inp[mask]=4;inp[corrupted]=bad[corrupted]
    return clean,poses,noise,inp,mask,corrupted

@torch.no_grad()
def generate(net,pose=1,seed=20261030,passes=8,part=None,allow_edit=True):
    torch.manual_seed(seed)
    seq=torch.full((1,H,W),4,dtype=torch.long) if part is None else part[None].clone()
    p=torch.tensor([pose])
    for step in range(passes):
        ratio=(seq==4).float().mean().view(1)
        probabilities=F.softmax(net(seq,p,ratio)[0].permute(1,2,0)/max(.75,1.25-.06*step),-1)
        confidence,prediction=probabilities.max(-1)
        unknown=seq[0]==4
        if allow_edit and step:
            old=seq[0].clamp(max=3)
            old_prob=probabilities.gather(-1,old[...,None]).squeeze(-1)
            changed=(~unknown)&(prediction!=old)&(confidence>old_prob+.1)&(confidence>.43)
            seq[0,changed]=prediction[changed]
        unknown=seq[0]==4
        keep=0 if step==passes-1 else int(H*W*math.cos((step+1)/passes*math.pi/2))
        count=max(0,int(unknown.sum())-keep)
        if count:
            scores=torch.where(unknown,confidence,-1.)
            idx=torch.topk(scores.flatten(),min(count,int(unknown.sum()))).indices
            seq.view(-1)[idx]=prediction.flatten()[idx]
    assert (seq<=3).all()
    return seq[0]

def run(steps=160,out=ROOT,seed=20261030):
    out=Path(out);out.mkdir(parents=True,exist_ok=True)
    if not (ASSETS/"dataset.json").exists():prepare()
    originals=[tokens(ASSETS/n) for n in ("A_dynamic.png","B_standing.png")]
    rng=np.random.default_rng(seed);torch.manual_seed(seed);torch.set_num_threads(2)
    net=DNet();optim=torch.optim.AdamW(net.parameters(),lr=.001,weight_decay=.001)
    trajectory=[];start=time.time()
    for step in range(steps):
        target,pose,ratio,noisy,hidden,bad=batch(originals,rng)
        logits=net(noisy,pose,ratio)
        weight=torch.where(target==0,1.,4.)*(torch.where(hidden,2.,.25)+bad.float()*2.)
        loss=(F.cross_entropy(logits,target,reduction="none")*weight).sum()/weight.sum()
        optim.zero_grad();loss.backward();nn.utils.clip_grad_norm_(net.parameters(),2.);optim.step()
        if step in (0,24,74,steps-1):trajectory.append([step+1,round(loss.item(),4)])
    net.eval();torch.save({"model":net.state_dict(),"palette":COL.tolist(),"grid":[W,H]},out/"weights.pt")
    validations=[]
    for i,source in enumerate(originals):
        tag="A" if i==0 else "B"
        png(source,out/f"{tag}_original.png")
        generated=generate(net,i,seed+i)
        png(generated,out/f"{tag}_generated.png")
        mask=torch.from_numpy(rng.random((H,W))<.55)
        partial=source.clone();partial[mask]=4
        repaired=generate(net,i,seed+100+i,part=partial)
        png(repaired,out/f"{tag}_repair.png")
        validations.append({"pose":tag,
          "mask55_recovery":round(float((repaired[mask]==source[mask]).float().mean()),4),
          "all_background_baseline":round(float((source[mask]==0).float().mean()),4),
          "from_full_mask_agreement":round(float((generated==source).float().mean()),4)})
    report={"method":"Masked discrete diffusion + visible token editing, small convolutional denoiser",
       "not_official_Nemotron":True,"palette":["#393657","#F2A5C2","#A9BAE9","#FFF5E6"],
       "grid":[W,H],"images":2,"distinct_character_identities":1,
       "parameters":sum(p.numel() for p in net.parameters()),
       "train_steps":steps,"parallel_denoising_passes":8,
       "loss_points":trajectory,"training_seconds":round(time.time()-start,1),
       "tests":validations,"can_create_new_good_characters":False,
       "limitations":"Only one character in two poses. Engineering smoke-test, not validated aesthetic generation."}
    (out/"report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps(report,ensure_ascii=False))
if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("--steps",type=int,default=160)
    ap.add_argument("--out",type=Path,default=ROOT)
    args=ap.parse_args()
    run(args.steps,args.out)
