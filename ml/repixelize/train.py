#!/usr/bin/env python3
"""Real patch-MLP learning synthetic anti-alias/noise correction on one sprite.
Honesty: source count=1, spatial holdout is NOT unseen-character generalization.
The faithful converter uses deterministic hard constraints to avoid model drift.
"""
import argparse
import json
from pathlib import Path
import numpy as np
from PIL import Image,ImageFilter
from ml.repixelize.engine import PALETTE,decode

def features(rgb):
    a=np.asarray(rgb,dtype=np.float32)/255.
    h,w,_=a.shape
    p=np.pad(a,((1,1),(1,1),(0,0)),mode='edge')
    return np.stack([p[1+dy:1+dy+h,1+dx:1+dx+w] for dy in (-1,0,1) for dx in (-1,0,1)],axis=-2).reshape(h*w,27)

def degrade(labels,rng):
    image=Image.fromarray(PALETTE[labels],mode='RGB')
    if rng.random()<.75:
        ratio=float(rng.uniform(.72,.98))
        w=max(4,int(image.width*ratio));h=max(4,int(image.height*ratio))
        image=image.resize((w,h),Image.Resampling.BILINEAR).resize(labels.shape[::-1],Image.Resampling.BICUBIC)
    if rng.random()<.6:image=image.filter(ImageFilter.GaussianBlur(radius=float(rng.uniform(.3,.85))))
    a=np.asarray(image,dtype=np.float32)
    jitter=rng.normal(0,rng.uniform(1.5,10),size=(1,1,3))
    return np.clip(a+jitter+rng.normal(0,rng.uniform(1,11),a.shape),0,255).astype(np.uint8)

def run(tokens,steps=300):
    rng=np.random.default_rng(20261029)
    H,W=tokens.shape
    train_positions=np.flatnonzero(np.indices((H,W))[0].ravel()<H*3//4)
    hold=np.flatnonzero(np.indices((H,W))[0].ravel()>=H*3//4)
    w1=rng.normal(0,.12,(27,48)).astype(np.float32);b1=np.zeros(48,np.float32)
    w2=rng.normal(0,.12,(48,4)).astype(np.float32);b2=np.zeros(4,np.float32)
    params=[w1,b1,w2,b2]
    m=[np.zeros_like(v) for v in params];v=[np.zeros_like(x) for x in params]
    targets=tokens.ravel().astype(np.int64)
    losses=[];current=features(degrade(tokens,rng))
    for step in range(1,steps+1):
        if step%20==1:current=features(degrade(tokens,rng))
        sel=rng.choice(train_positions,768)
        x=current[sel];y=targets[sel]
        h=np.maximum(0,x@w1+b1)
        logits=h@w2+b2;logits-=logits.max(axis=1,keepdims=True)
        ex=np.exp(logits);probs=ex/ex.sum(axis=1,keepdims=True)
        dz=probs.copy();dz[np.arange(len(y)),y]-=1;dz/=len(y)
        dw2=h.T@dz;db2=dz.sum(axis=0)
        dh=(dz@w2.T)*(h>0);dw1=x.T@dh;db1=dh.sum(axis=0)
        for k,(param,grad) in enumerate(zip(params,[dw1,db1,dw2,db2])):
            m[k][:]=.9*m[k]+.1*grad
            v[k][:]=.999*v[k]+.001*grad*grad
            param-=.005*(m[k]/(1-.9**step))/(np.sqrt(v[k]/(1-.999**step))+1e-8)
        if step in (1,20,40,80,120,180,240,300,steps):
            loss=float(-np.log(np.maximum(probs[np.arange(len(y)),y],1e-9)).mean())
            losses.append({'step':step,'cross_entropy':round(loss,5)})
    hold_features=features(degrade(tokens,np.random.default_rng(20261231)))[hold]
    prediction=(np.maximum(0,hold_features@w1+b1)@w2+b2).argmax(axis=1)
    accuracy=float(np.mean(prediction==targets[hold]))
    near_rgb=hold_features.reshape(-1,9,3)[:,4]*255
    near_pred=np.square(near_rgb[:,None,:]-PALETTE[None,:,:]).sum(2).argmin(axis=1)
    baseline=float(np.mean(near_pred==targets[hold]))
    return {'method':'real 27-48-4 gradient-trained RGB patch MLP',
            'training_steps':steps,'source_artwork_count':1,'augmentation':'resize/blur/chroma shift/noise',
            'validation':'same-artwork lower quarter, unseen synthetic corruption seed',
            'neural_accuracy':round(accuracy,5),'nearest_color_baseline':round(baseline,5),
            'loss_curve':losses,'limitation':'Does not learn new characters or artist style; do not infer generalization'},params

def main():
    a=argparse.ArgumentParser()
    a.add_argument('--source',type=Path,default=Path('ml/repixelize/reference-384.lzma.b64'))
    a.add_argument('--output',type=Path,default=Path('repixel-ml-artifacts'))
    a.add_argument('--steps',type=int,default=300)
    args=a.parse_args()
    labels=decode(args.source.read_text())
    report,params=run(labels,args.steps)
    args.output.mkdir(parents=True,exist_ok=True)
    (args.output/'training-report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
    np.savez_compressed(args.output/'denoiser-weights.npz',w1=params[0],b1=params[1],w2=params[2],b2=params[3])
    print('REPIXEL TRAINED',json.dumps(report,ensure_ascii=False))

if __name__=='__main__':main()
