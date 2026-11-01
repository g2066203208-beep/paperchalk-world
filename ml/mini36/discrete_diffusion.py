#!/usr/bin/env python3
"""Mini36 categorical diffusion experiment and matte pixel-cluster candidate.

36 concept-extracted sprites are NOT human-drawn Gold labels. Categorical
noise/denoising is truly performed on 15 token values, never on blurry RGB
fields. The output for users is a conservative, high-contrast discrete-palette
candidate; diffusion predictions are separately reported, not promoted as art.
"""
from __future__ import annotations
import argparse, json, math, random, hashlib
from collections import Counter
from pathlib import Path
import numpy as np
from PIL import Image
import cv2
import torch
from torch import nn
from torch.nn import functional as F

SEED=20261101
K=15
T=8
BETA=np.array([.07,.09,.11,.13,.15,.17,.19,.22], dtype=np.float32)
ABAR=np.cumprod(1-BETA)
BG=(251,235,214)

class Denoiser(nn.Module):
    def __init__(self, hidden=40):
        super().__init__()
        self.m=nn.Sequential(nn.Conv2d(K+3,hidden,3,padding=1),nn.GELU(),
            nn.Conv2d(hidden,hidden,3,padding=1),nn.GELU(),
            nn.Conv2d(hidden,hidden,3,padding=1),nn.GELU(),
            nn.Conv2d(hidden,hidden,3,padding=1),nn.GELU(),
            nn.Conv2d(hidden,K,1))
    def forward(self, idx,t):
        if idx.dim()!=3:raise ValueError('B,24,24 discrete token input required')
        n,h,w=idx.shape
        oh=F.one_hot(idx.long(),K).permute(0,3,1,2).float()
        yc=torch.linspace(-1,1,h,device=idx.device).view(1,1,h,1).expand(n,1,h,w)
        xc=torch.linspace(-1,1,w,device=idx.device).view(1,1,1,w).expand(n,1,h,w)
        tt=t.float().view(-1,1,1,1).expand(n,1,h,w)/T
        return self.m(torch.cat([oh,xc,yc,tt],dim=1))

def load(root):
    root=Path(root);rgb=[];target=[];pals=[]
    for row in range(1,7):
      for col in range(1,7):
        img=np.asarray(Image.open(root/f'R{row}C{col}.png').convert('RGBA'))
        if img.shape!=(24,24,4):raise ValueError(f'Not 24x24: R{row}C{col}')
        if not np.all(np.isin(img[:,:,3],[0,255])):raise ValueError('Alpha not discrete')
        opaque=img[:,:,3]==255
        colors,count=np.unique(img[opaque,:3],axis=0,return_counts=True)
        if len(colors)>14:raise ValueError(f'Too many colors: {len(colors)}')
        # Descending luminance is shared token semantics, not arbitrary unique-color ordering.
        lum=colors@np.array([.2126,.7152,.0722])
        order=np.lexsort((np.arange(len(colors)),-lum))
        colors=colors[order]
        tok=np.zeros((24,24),np.uint8)
        for i,color in enumerate(colors):tok[opaque & np.all(img[:,:,:3]==color,axis=-1)]=i+1
        pal=np.zeros((K,3),np.uint8);pal[1:1+len(colors)]=colors
        rgb.append(img);target.append(tok);pals.append(pal)
    return np.stack(rgb),np.stack(target),np.stack(pals)

def corrupt(clean,t,rng):
    clean=np.asarray(clean);t=np.asarray(t)
    out=clean.copy()
    for b in range(len(clean)):
        chance=float(1-ABAR[int(t[b])-1]); mask=rng.random(clean.shape[1:])<chance
        out[b][mask]=rng.integers(0,K,size=int(mask.sum()),dtype=np.uint8)
    return out

def train(indices,steps=450,device='cpu'):
    torch.set_num_threads(2);torch.manual_seed(SEED);np.random.seed(SEED);random.seed(SEED)
    net=Denoiser().to(device);opt=torch.optim.AdamW(net.parameters(),lr=.001)
    rng=np.random.default_rng(SEED);history=[]
    for step in range(steps):
        chosen=rng.integers(0,30,size=24);clean=indices[chosen].copy()
        # Pixel-grid-preserving mirroring only, never arbitrary rotation/resampling.
        flips=rng.random(len(clean))<.5
        clean[flips]=clean[flips,:,::-1]
        t=rng.integers(1,T+1,size=len(clean))
        noisy=corrupt(clean,t,rng)
        logits=net(torch.from_numpy(noisy.astype('int64')).to(device),torch.from_numpy(t).to(device))
        loss=F.cross_entropy(logits,torch.from_numpy(clean.astype('int64')).to(device))
        opt.zero_grad();loss.backward();torch.nn.utils.clip_grad_norm_(net.parameters(),1.);opt.step()
        if step==0 or (step+1)%100==0:history.append({'step':step+1,'loss':round(float(loss.detach()),5)})
    net.eval();return net,history

@torch.no_grad()
def reverse(net,xt,t_start=T):
    # D3PM exact mixture reverse posterior for uniform categorical transition.
    x=np.asarray(xt).copy()
    for t in range(t_start,0,-1):
        logits=net(torch.from_numpy(x.astype('int64')),torch.full((len(x),),t,dtype=torch.long))
        p=F.softmax(logits,dim=1).numpy().transpose(0,2,3,1)
        if t==1:
            x=np.argmax(p,axis=-1).astype(np.uint8);break
        beta=float(BETA[t-1]);prev_abar=float(ABAR[t-2]);
        prior=prev_abar*p+(1-prev_abar)/K
        # For each possible preceding j: posterior ∝ prior[j] Q_t[j, observed i].
        w=prior*(beta/K)
        ix=x[...,None].astype('int64')
        np.put_along_axis(w,ix,np.take_along_axis(w,ix,-1)+(1-beta)*np.take_along_axis(prior,ix,-1),axis=-1)
        x=np.argmax(w,axis=-1).astype(np.uint8)
    return x

def eval_holdout(net,indices):
    tests=[];rng=np.random.default_rng(SEED+12)
    for i in range(30,36):
        clean=indices[i:i+1];t=np.array([T],dtype=np.int64)
        noisy=corrupt(clean,t,rng)
        inferred=reverse(net,noisy)
        base=float((noisy==clean).mean());model=float((inferred==clean).mean())
        alpha_gt=(clean>0);alpha_noisy=(noisy>0);alpha_pred=(inferred>0)
        def iou(a,b):return float(np.logical_and(a,b).sum()/max(1,np.logical_or(a,b).sum()))
        tests.append({'id':f'R6C{i-29}','pixel_accuracy_corrupted':round(base,4),
          'pixel_accuracy_discrete_reverse':round(model,4),'improved':model>base,
          'alpha_iou_corrupted':round(iou(alpha_gt,alpha_noisy),4),'alpha_iou_reverse':round(iou(alpha_gt,alpha_pred),4)})
    return tests

def palette_flatten(sprite, lab_threshold=25.,max_colors=10):
    """Merge close palette colors by LAB, foreground mask preserved exactly.

    Not an ML output. Never inserts intermediate colors, edits geometry or alpha.
    """
    a=sprite.copy();mask=a[:,:,3]==255
    colors,counts=np.unique(a[mask,:3],return_counts=True,axis=0)
    # Prefer the most common color as a cluster center; don't change unique anchors.
    rank=np.argsort(-counts);anchors=[];mapping={}
    labs=cv2.cvtColor(colors[None].astype(np.uint8),cv2.COLOR_RGB2LAB)[0].astype(float)
    for j in rank:
        d=[float(np.linalg.norm(labs[j]-labs[k])) for k in anchors]
        if anchors and min(d)<lab_threshold:mapping[int(j)]=int(anchors[int(np.argmin(d))])
        elif len(anchors)<max_colors: anchors.append(int(j));mapping[int(j)]=int(j)
        else:mapping[int(j)]=int(anchors[int(np.argmin(d))])
    for k,col in enumerate(colors):
        a[mask & np.all(sprite[:,:,:3]==col,axis=-1),:3]=colors[mapping[k]]
    return a,{'original_colors':int(len(colors)),'new_colors':int(len(np.unique(a[mask,:3],axis=0))),
      'merges':int(len(colors)-len(np.unique(a[mask,:3],axis=0)))}

def clean_islands(sprite):
    # Only change isolated 1px shades in interiors when ≥3 orthogonal neighbors
    # agree on replacement; never erase silhouette or the 24px face/detail ROI.
    a=sprite.copy();h,w=a.shape[:2];protected=np.zeros((h,w),bool)
    protected[5:16,4:21]=True
    edits=[]
    for y in range(1,23):
      for x in range(1,23):
        if protected[y,x] or a[y,x,3]==0:continue
        near=[(y-1,x),(y+1,x),(y,x-1),(y,x+1)]
        if any(a[yy,xx,3]==0 for yy,xx in near):continue
        options=Counter(tuple(a[yy,xx,:3]) for yy,xx in near)
        color,n=options.most_common(1)[0]
        if n>=3 and color!=tuple(a[y,x,:3]):edits.append((y,x,color))
    for y,x,color in edits:a[y,x,:3]=color
    return a,len(edits)

def reassemble(sprites,output):
    base=np.zeros((240,240,4),np.uint8);base[:,:,:3]=BG;base[:,:,3]=255
    for i,a in enumerate(sprites):
        r,c=divmod(i,6);sub=base[r*40+8:r*40+32,c*40+8:c*40+32]
        mask=a[:,:,3]==255
        sub[mask,:3]=a[mask,:3]
    Image.fromarray(base).save(output/'mini36-clean-atlas-240.png')
    big=np.repeat(np.repeat(base,4,0),4,1)
    Image.fromarray(big).save(output/'mini36-clean-preview-960.png')
    return base

def run(root,out,steps=450):
    root=Path(root);out=Path(out);out.mkdir(parents=True,exist_ok=True)
    rgba,indices,palettes=load(root)
    model,history=train(indices,steps)
    scores=eval_holdout(model,indices)
    clean=[];per=[]
    for i,img in enumerate(rgba):
        flat,color=palette_flatten(img)
        candidate,edits=clean_islands(flat)
        assert np.array_equal(candidate[:,:,3],img[:,:,3])
        name=f'R{i//6+1}C{i%6+1}'
        Image.fromarray(candidate).save(out/(name+'-clean-24.png'),optimize=True)
        clean.append(candidate)
        per.append({'id':name,'palette':color,'pixels_reassigned_by_island_clean':edits,
          'shape_alpha_changed_pixels':0})
    base=reassemble(clean,out)
    # Run diffusion on a deliberately corrupted sprite, never claim it invented hand-authored pixels.
    rng=np.random.default_rng(SEED+213)
    source=indices.copy()
    noisy=corrupt(source,np.full((36,),T),rng)
    pred=reverse(model,noisy)
    predtiles=[]
    for i in range(36):
        src=rgba[i].copy(); token=pred[i]
        p=np.zeros((24,24,4),np.uint8)
        p[:,:,:3]=palettes[i][token];p[:,:,3]=(token>0).astype('uint8')*255
        Image.fromarray(p).save(out/(f'R{i//6+1}C{i%6+1}-diffusion-proposal-24.png'),optimize=True)
        predtiles.append(p)
    model_file=out/'mini36-discrete-diffusion.pt'
    torch.save({'state':model.state_dict(),'step':steps,'K':K,'timesteps':T,
      'beta':BETA.tolist(),'train_ids':list(range(30)),
      'holdout_ids':list(range(30,36))},model_file)
    import hashlib
    sha=hashlib.sha256(model_file.read_bytes()).hexdigest()
    report={'status':'experimental: 24x24 true discrete RGBA grid, NOT perfect hand-crafted pixel art',
      'trained_real_pytorch_categorical_diffusion':True,'training_characters':30,
      'holdout_characters':6,'training_steps':steps,'vocabulary':15,
      'forward_noise':'categorical uniform-token replacement over 8 increasing steps',
      'reverse':'D3PM Bayes posterior with learned clean-token distribution',
      'training_history':history,'holdout':scores,'all_six_holdouts_improve':all(x['improved'] for x in scores),
      'source_kind':'36 algorithmically extracted concept sprites; no professional human authored GT',
      'model_shasum':sha,'production_preview':'independent conservative LAB-palette flatting; diffusion proposals NOT promoted',
      'manual_approval':False,'per_character':per}
    (out/'report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
    print(json.dumps({k:v for k,v in report.items() if k not in ['per_character','training_history']},ensure_ascii=False))
    return report

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--sprites',default='site/pixel-lab/mini36')
    ap.add_argument('--out',default='artifacts/mini36/diffusion');ap.add_argument('--steps',type=int,default=450)
    a=ap.parse_args();run(a.sprites,a.out,a.steps)