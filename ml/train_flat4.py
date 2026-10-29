#!/usr/bin/env python3
"""Real small self-supervised masked pixel network for one ORIGINAL flat4 sprite.
Learns local reconstruction only. No claim of learned anime aesthetics or general text-to-image.
"""
from __future__ import annotations
import json, os
from pathlib import Path
import numpy as np
RNG=np.random.default_rng(20261029)
SOURCE=Path('ml/flat4/source.json')
OUT=Path('site/pixel-lab/flat4-model.json')
W,H=64,96
PATCH,CLASSES,HID=5,6,48
D=PATCH*PATCH*CLASSES

def shifted(base,dx,dy,flip=False):
    b=base[:,::-1] if flip else base
    dst=np.zeros_like(b)
    sy0=max(0,-dy);sy1=min(H,H-dy);sx0=max(0,-dx);sx1=min(W,W-dx)
    if sy0<sy1 and sx0<sx1:dst[sy0+dy:sy1+dy,sx0+dx:sx1+dx]=b[sy0:sy1,sx0:sx1]
    return dst

def patches(image,coords,corrupt_neighbors=True):
    n=len(coords);yy=coords[:,0];xx=coords[:,1]
    padded=np.pad(image,2,constant_values=0)
    offsets=np.arange(-2,3)
    dy,dx=np.meshgrid(offsets,offsets,indexing='ij')
    vals=padded[yy[:,None]+dy.ravel()[None,:]+2,xx[:,None]+dx.ravel()[None,:]+2].copy()
    if corrupt_neighbors:vals[RNG.random(vals.shape)<.035]=5
    vals[:,12]=5
    return np.eye(CLASSES,dtype=np.float32)[vals].reshape(n,D)

def make_examples(frames,n):
    outx=[];outy=[];per=(n+len(frames)-1)//len(frames)
    for frame in frames:
        fg=np.argwhere(frame!=0);bg=np.argwhere(frame==0)
        assert len(fg)>0 and len(bg)>0
        cf=int(per*.65)
        pos=np.concatenate([fg[RNG.integers(len(fg),size=cf)],
                            bg[RNG.integers(len(bg),size=per-cf)]])
        RNG.shuffle(pos);outx.append(patches(frame,pos))
        outy.append(frame[pos[:,0],pos[:,1]].astype(np.int64))
    return np.concatenate(outx),np.concatenate(outy)

def forward(x,w1,b1,w2,b2):
    h=np.maximum(0,x@w1+b1)
    z=h@w2+b2;z-=z.max(axis=1,keepdims=True)
    p=np.exp(z);p/=p.sum(axis=1,keepdims=True)
    return h,p

def evaluation(frames,w1,b1,w2,b2):
    scores=[]
    for frame in frames:
        mask=RNG.random((H,W))<.12;pos=np.argwhere(mask)
        damaged=frame.copy();damaged[mask]=5
        x=patches(damaged,pos,False)
        _,prob=forward(x,w1,b1,w2,b2)
        predicted=prob.argmax(axis=1);truth=frame[mask]
        padded=np.pad(damaged,1,constant_values=0)
        yy=pos[:,0]+1;xx=pos[:,1]+1
        neighbors=np.stack([padded[yy-1,xx],padded[yy+1,xx],
                            padded[yy,xx-1],padded[yy,xx+1]],axis=1)
        votes=np.stack([(neighbors==c).sum(axis=1) for c in range(5)],axis=1)
        naive=votes.argmax(axis=1)
        scores.append([float(np.mean(predicted==truth)),float(np.mean(naive==truth)),
                       float(np.mean(predicted[truth!=0]==truth[truth!=0]))])
    return np.mean(scores,axis=0).tolist()

def main():
    src=json.loads(SOURCE.read_text())
    assert src['width']==W and src['height']==H and len(src['tokens'])==W*H
    img=np.asarray(src['tokens'],dtype=np.int16).reshape(H,W)
    assert np.all((img>=0)&(img<=4)) and all(np.any(img==k) for k in range(1,5))
    assert np.sum(img!=0)>=900
    frames=[shifted(img,int(dx),int(dy),flip) for flip in (False,True)
            for dx in (-4,-2,0,2,4) for dy in (-3,0,3)]
    holdout=[shifted(img,1,1),shifted(img,-3,2,True),shifted(img,3,-1)]
    X,Y=make_examples(frames,35000)
    order=RNG.permutation(len(Y));X=X[order];Y=Y[order]
    w1=RNG.normal(0,.13,(D,HID)).astype(np.float32);b1=np.zeros(HID,np.float32)
    w2=RNG.normal(0,.13,(HID,5)).astype(np.float32);b2=np.zeros(5,np.float32)
    params=[w1,b1,w2,b2]
    m=[np.zeros_like(p) for p in params];v=[np.zeros_like(p) for p in params]
    curve=[];steps=int(os.getenv('FLAT4_TRAIN_STEPS','260'));bs=512
    for step in range(1,steps+1):
        ix=RNG.integers(len(Y),size=bs);x=X[ix];y=Y[ix]
        h,p=forward(x,w1,b1,w2,b2)
        dz=p.copy();dz[np.arange(bs),y]-=1;dz/=bs
        dw2=h.T@dz;db2=dz.sum(axis=0)
        dh=(dz@w2.T)*(h>0);dw1=x.T@dh;db1=dh.sum(axis=0)
        for k,(param,grad) in enumerate(zip(params,[dw1,db1,dw2,db2])):
            m[k][:]=.9*m[k]+.1*grad;v[k][:]=.999*v[k]+.001*(grad*grad)
            param-=.004*(m[k]/(1-.9**step))/(np.sqrt(v[k]/(1-.999**step))+1e-8)
        if step==1 or step%20==0 or step==steps:
            ix=RNG.integers(len(Y),size=2048)
            _,p=forward(X[ix],w1,b1,w2,b2)
            loss=float(-np.log(np.clip(p[np.arange(len(ix)),Y[ix]],1e-8,1)).mean())
            curve.append({'step':step,'cross_entropy':round(loss,5)})
    acc,naive,foreground=evaluation(holdout,w1,b1,w2,b2)
    report={'training_steps':steps,'source_sprites':1,'augmentation_frames':len(frames),
            'holdout_same_source_mask_accuracy':round(acc,4),
            'four_neighbour_majority_baseline':round(naive,4),
            'holdout_foreground_accuracy':round(foreground,4),'curve':curve}
    model={'format':'flat4-masked-token-mlp-v1',
           'source':'First-party original 64x96 sprite only',
           'limitations':'One hand-authored source plus transforms. Learns local masked-pixel reconstruction, not new anime aesthetics or professional character generation.',
           'width':W,'height':H,'palette':src['palette'],'patch_size':PATCH,
           'input_classes':CLASSES,'hidden':HID,
           'weights':{'w1':w1.round(5).tolist(),'b1':b1.round(5).tolist(),
                      'w2':w2.round(5).tolist(),'b2':b2.round(5).tolist()},
           'metrics':report}
    OUT.write_text(json.dumps(model,separators=(',',':')))
    print('TRAINED FLAT4 DENOISER',json.dumps(report,ensure_ascii=False))
if __name__=='__main__':main()
