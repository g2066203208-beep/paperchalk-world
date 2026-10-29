#!/usr/bin/env python3
"""Train a tiny REAL neural pixel-completion model on explicitly CC0 Kenney art.
No synthetic art, no secret remote service, no API key. NumPy mini-batch SGD/Adam.
The model predicts the colour token of a hidden pixel from a 5x5 context.
This is inpainting/reconstruction, NOT text-to-image or an artistic foundation model.
"""
import argparse
import collections
import hashlib
import io
import json
import os
from pathlib import Path
import random
import sys
import urllib.request
import zipfile

import numpy as np
from PIL import Image

PACKS = [
    ('kenney-tiny-dungeon', 'https://kenney.nl/media/pages/assets/tiny-dungeon/f8422efb44-1674742415/kenney_tiny-dungeon.zip', 'https://kenney.nl/assets/tiny-dungeon'),
    ('kenney-tiny-town', 'https://kenney.nl/media/pages/assets/tiny-town/a415fbeb49-1735736916/kenney_tiny-town.zip', 'https://kenney.nl/assets/tiny-town'),
    ('kenney-pixel-platformer', 'https://opengameart.org/sites/default/files/kenney_pixel-platformer.zip', 'https://opengameart.org/content/pixel-platformer-0'),
]
SIZE = 16
COLORS = 12
MASK = COLORS
FEATURES = 25 * (COLORS + 1) + 2
HIDDEN = 56

def gather_images(cache):
    cache.mkdir(parents=True, exist_ok=True)
    images, sources, seen = [], [], set()
    for name, url, landing in PACKS:
        data = None
        archive = cache / (name + '.zip')
        if archive.exists():
            data = archive.read_bytes()
        else:
            try:
                request = urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0 PixelLabResearch/0.1'})
                with urllib.request.urlopen(request, timeout=35) as r:
                    data = r.read(15_000_000)
                if len(data) < 1000:
                    raise ValueError('archive unexpectedly small')
                archive.write_bytes(data)
            except Exception as e:
                print('source download unavailable', name, repr(e), flush=True)
                continue
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as z:
                count = 0
                for f in sorted(z.infolist(), key=lambda x:x.filename):
                    if not f.filename.lower().endswith('.png') or f.file_size > 2_000_000:
                        continue
                    if any(word in f.filename.lower() for word in ('sample','preview','spritesheet','tilemap','extruded','scaled','@2x')):
                        continue
                    # Kenney packs contain individual PNG files and sheets.
                    with Image.open(io.BytesIO(z.read(f))) as img:
                        if img.size not in ((16,16),(18,18)):
                            continue
                        if img.size==(18,18):
                            img=img.crop((1,1,17,17))
                        arr=np.asarray(img.convert('RGBA')).copy()
                    arr[arr[:,:,3]<120]=[0,0,0,0]
                    if (arr[:,:,3]>120).sum()<14 or (arr[:,:,3]>120).sum()>245:
                        continue
                    sha=hashlib.sha256(arr.tobytes()).hexdigest()
                    if sha in seen:continue
                    seen.add(sha)
                    images.append(arr)
                    count+=1
                sources.append({'pack':name,'url':landing,'archive_sha256':hashlib.sha256(data).hexdigest(),
                   'image_count':count,'license':'CC0-1.0'})
                print('licensed pixel art:',name,count,'unique sprites',flush=True)
        except Exception as e:
            print('cannot parse source',name,repr(e),flush=True)
    if len(images)<30:
        raise RuntimeError('Need >=30 genuine CC0 sprites; training aborted. No synthetic fallback pretending to be a dataset.')
    return np.stack(images), sources

def palette_and_tokens(images):
    counter=collections.Counter()
    for image in images:
        for rgb in image[image[:,:,3]>120,:3]:
            counter[tuple(int(x)//16*16 for x in rgb)]+=1
    palette=[list(x) for x,_ in counter.most_common(COLORS-1)]
    while len(palette)<COLORS-1:
        palette.append([0,0,0])
    palette=np.array([[0,0,0]]+palette,dtype=np.uint8)
    rgb=images[:,:,:,:3].astype(np.int32)
    colors=palette[1:].astype(np.int32)
    delta=((rgb[...,None,:]-colors)**2).sum(-1)
    tokens=(delta.argmin(-1)+1).astype(np.uint8)
    tokens[images[:,:,:,3]<=120]=0
    return palette,tokens

def make_batch(images,rng,n=320,mask_prob=.42):
    count=len(images)
    image_ix=rng.integers(count,size=n)
    pixels=rng.integers(256,size=n)
    ys,xs=np.divmod(pixels,16)
    # Randomly hide 25–65% of each image, always including the prediction target.
    visible=images[image_ix].astype(np.int16).copy()
    hidden=rng.random((n,16,16)) < mask_prob
    hidden[np.arange(n),ys,xs]=True
    visible[hidden]=MASK
    feat=np.zeros((n,FEATURES),dtype=np.float32)
    # Each 5x5 context position is categorical one-hot.
    k=0
    for dy in (-2,-1,0,1,2):
        for dx in (-2,-1,0,1,2):
            iy=ys+dy;ix=xs+dx
            val=np.full(n,MASK,dtype=np.int32)
            good=(iy>=0)&(iy<16)&(ix>=0)&(ix<16)
            rows=np.nonzero(good)[0]
            val[rows]=visible[rows,iy[rows],ix[rows]]
            feat[np.arange(n),k*(COLORS+1)+val]=1
            k+=1
    feat[:,-2]=xs/15
    feat[:,-1]=ys/15
    return feat,images[image_ix,ys,xs].astype(np.int64)

def softmax(z):
    z=z-z.max(axis=-1,keepdims=True)
    v=np.exp(z)
    return v/np.maximum(v.sum(-1,keepdims=True),1e-9)

def predict(x,w1,b1,w2,b2):
    hidden=np.maximum(0,x@w1+b1)
    return softmax(hidden@w2+b2)

def train(tokens,steps=200,seed=20261029):
    rng=np.random.default_rng(seed)
    order=rng.permutation(len(tokens))
    cut=max(1,int(len(tokens)*.85))
    trainset=tokens[order[:cut]]
    valset=tokens[order[cut:]]
    if len(valset)<2:raise RuntimeError('missing held-out validation sprites')
    w1=rng.normal(0,.07,(FEATURES,HIDDEN)).astype(np.float32)
    b1=np.zeros(HIDDEN,dtype=np.float32)
    w2=rng.normal(0,.075,(HIDDEN,COLORS)).astype(np.float32)
    b2=np.zeros(COLORS,dtype=np.float32)
    params=[w1,b1,w2,b2]
    m=[np.zeros_like(p) for p in params];v=[np.zeros_like(p) for p in params]
    learning=0.003
    history=[]
    for step in range(1,steps+1):
        x,y=make_batch(trainset,rng,384,mask_prob=float(rng.uniform(.2,.65)))
        mid=x@w1+b1
        activ=np.maximum(mid,0)
        prob=softmax(activ@w2+b2)
        loss=-np.log(np.maximum(prob[np.arange(len(y)),y],1e-9)).mean()
        dlog=prob;dlog[np.arange(len(y)),y]-=1
        dlog/=len(y)
        grads=[
            x.T@((dlog@w2.T)*(mid>0)),
            ((dlog@w2.T)*(mid>0)).sum(0),
            activ.T@dlog,
            dlog.sum(0)
        ]
        for j,(p,g) in enumerate(zip(params,grads)):
            np.clip(g,-5,5,out=g)
            m[j][:]=.9*m[j]+.1*g
            v[j][:]=.999*v[j]+.001*g*g
            p-=learning*(m[j]/(1-.9**step))/(np.sqrt(v[j]/(1-.999**step))+1e-8)
        if step==1 or step%25==0 or step==steps:
            history.append({'step':step,'cross_entropy':round(float(loss),4)})
            print('neural training',step,'/',steps,'loss',round(float(loss),4),flush=True)
    x,y=make_batch(valset,np.random.default_rng(seed+1),4096,mask_prob=.4)
    output=predict(x,*params)
    accuracy=float((output.argmax(-1)==y).mean())
    counts=np.bincount(trainset.ravel(),minlength=COLORS)
    baseline=float((y==counts.argmax()).mean())
    nonempty=(y>0)
    foreground_accuracy=float((output.argmax(-1)[nonempty]==y[nonempty]).mean()) if nonempty.any() else 0
    metrics={'heldout_masked_accuracy':round(accuracy,4),
        'frequency_baseline':round(baseline,4),
        'heldout_foreground_accuracy':round(foreground_accuracy,4),
        'training_sprites':int(len(trainset)),'validation_sprites':int(len(valset)),
        'steps':steps,'loss_history':history}
    return params, metrics, valset

def quant(weights):
    return [[round(float(t),5) for t in row] for row in weights] if weights.ndim==2 else [round(float(x),5) for x in weights]

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--output',default='site/pixel-lab/model.json')
    ap.add_argument('--steps',type=int,default=220)
    args=ap.parse_args()
    image,sources=gather_images(Path('ml/.cache'))
    palette,tokens=palette_and_tokens(image)
    weights,metrics,validation=train(tokens,steps=args.steps)
    # Examples are actual withheld CC0 sprites, not "AI-generated" examples.
    examples=[{'pixels':val.flatten().tolist(),'label':'真实CC0留出样本 '+str(i+1)}
        for i,val in enumerate(validation[:min(10,len(validation))])]
    model={'format':'pixel-lab-neural-inpaint-v1','model':'2-layer-context-MLP','seed':20261029,
      'resolution':16,'palette':palette.tolist(),'channels':COLORS,
      'hidden':HIDDEN,'input_features':FEATURES,
      'w1':quant(weights[0]),'b1':quant(weights[1]),'w2':quant(weights[2]),'b2':quant(weights[3]),
      'examples':examples,'metrics':metrics,'sources':sources,
      'scope':'reference-conditioned 16x16 pixel inpainting; NOT text-to-image or free-generation'}
    destination=Path(args.output);destination.parent.mkdir(parents=True,exist_ok=True)
    destination.write_text(json.dumps(model,separators=(',',':')),encoding='utf-8')
    Path('ml').mkdir(exist_ok=True)
    Path('ml/metrics.json').write_text(json.dumps(metrics,indent=2),encoding='utf-8')
    print('TRAINING COMPLETE',metrics,'OUTPUT',destination,'bytes',destination.stat().st_size,flush=True)
if __name__=='__main__':main()
