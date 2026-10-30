"""Part-preserving generative face prototype, using truly distinct CC0 head/face/hair parts.

The VAE previously destroyed eyes/mouth. This experiment learns an image->part
representation with a convolutional multi-head network on 616 DIFFERENT face
combinations (7 shapes x 11 features x 8 hairs). It tests unseen combinations,
then uses the learned model to score/re-rank new combinations with a
pixel-preserving layer renderer. Final pixels come from source layers, not from
a neural pixel decoder; do not claim novel eye drawing or the D master's style.
CC0 source: https://opengameart.org/content/faces-1 (lamiarts, 2025).
"""
from __future__ import annotations
import argparse, hashlib, io, json, math
from pathlib import Path
from zipfile import ZipFile
from PIL import Image
import numpy as np
import torch
from torch import nn
from torch.nn import functional as F

D=np.array([[57,54,87],[242,165,194],[169,186,233],[255,245,230]],np.uint8)
SOURCE=Path("ml/datasets/cc0_faces_lamiarts.zip")
OUT=Path("site/pixel-lab/style2/face-structure")
SIDE=128
FACTORS=(7,11,8)
ROLEMAP={
 "shape":{(0,0,0):0,(244,96,54):3,(215,38,56):1,(255,210,63):3},
 "feature":{(0,0,0):0,(38,84,124):0,(0,252,243):2,(255,255,255):3},
 "hair":{(0,0,0):0,(33,161,121):1,(38,84,124):2}
}
def fname(role,i):
    if role=="hair" and i==7:return "Faces/parts/hair/Hair8_bald.png"
    name={"shape":"faceshape","feature":"face","hair":"hair"}[role]
    return f"Faces/parts/{name}/{name}{i+1}.png"

def make_layer(z,role,index):
    src=Image.open(io.BytesIO(z.read(fname(role,index)))).convert("RGBA")
    a=np.asarray(src,dtype=np.uint8)
    rgb=a[:,:,:3].astype(np.int32)
    alpha=a[:,:,3]>127
    labels=np.zeros(a.shape[:2],dtype=np.uint8)
    nonblack=(rgb.max(2)>35)&alpha
    if role=="shape":
        labels[nonblack]=3
        # Only actual reddish edge pixels get pink shading.
        labels[alpha&(rgb[:,:,0]>170)&(rgb[:,:,0]<230)&(rgb[:,:,1]<65)&(rgb[:,:,2]<100)]=1
    elif role=="feature":
        labels[nonblack]=0  # delicate eyes and brows need DARK ink
        cyan=alpha&(rgb[:,:,1]>170)&(rgb[:,:,2]>170)&(rgb[:,:,0]<150)
        labels[cyan]=2
        white=alpha&(rgb.min(2)>240)
        labels[white]=3
    else:
        labels[nonblack]=1  # PINK hair as the principal body color
        blue=alpha&(rgb[:,:,2]>80)&(rgb[:,:,2]>rgb[:,:,0]*1.4)&(rgb[:,:,1]<145)
        labels[blue]=2
        bright=alpha&(rgb.min(2)>210)
        labels[bright]=3
    rgba=np.zeros((256,256,4),dtype=np.uint8)
    rgba[:,:,:3]=D[labels]
    rgba[:,:,3]=alpha.astype(np.uint8)*255
    # The input CC0 outlines contain #000 ink. Keep as #393657.
    return Image.fromarray(rgba,"RGBA")

def load_layers():
    if not SOURCE.is_file():raise RuntimeError("CC0 training source missing. Never substitute 1 artist's 2 poses.")
    with ZipFile(SOURCE) as z:
        return {(r,i):make_layer(z,r,i) for r,n in zip(("shape","feature","hair"),FACTORS) for i in range(n)}

def composite(triple,layers):
    im=Image.new("RGBA",(256,256),tuple(D[0])+(255,))
    for role,index in zip(("shape","feature","hair"),triple):im.alpha_composite(layers[(role,index)])
    # Original source resolution, no resample or bilinear artifacts.
    out=np.asarray(im.crop((64,24,192,152)).convert("RGB"))
    x=out.astype(np.int32)
    idx=((x[:,:,None,:]-D[None,None,:,:].astype(np.int32))**2).sum(-1).argmin(-1)
    assert np.array_equal(out,D[idx])
    return idx.astype(np.uint8)

class PartNet(nn.Module):
    """Multi-head CNN learns to recognize head shape, features and hair as distinct factors."""
    def __init__(self):
        super().__init__()
        self.stem=nn.Sequential(nn.Conv2d(4,32,3,2,1),nn.SiLU(),
             nn.Conv2d(32,48,3,2,1),nn.GroupNorm(8,48),nn.SiLU(),
             nn.Conv2d(48,64,3,2,1),nn.GroupNorm(8,64),nn.SiLU(),
             nn.Conv2d(64,96,3,2,1),nn.GroupNorm(8,96),nn.SiLU(),
             nn.Conv2d(96,96,3,padding=1),nn.SiLU(),
             nn.AdaptiveAvgPool2d(1),nn.Flatten())
        self.heads=nn.ModuleList([nn.Linear(96,n) for n in FACTORS])
    def forward(self,x):
        a=F.one_hot(x.long(),4).permute(0,3,1,2).float()
        z=self.stem(a)
        return [head(z) for head in self.heads]

def split_combinations(seed):
    rng=np.random.default_rng(seed)
    combos=[(a,b,c) for a in range(7) for b in range(11) for c in range(8)]
    rng.shuffle(combos)
    n=int(len(combos)*.76)
    return combos[:n],combos[n:]

@torch.no_grad()
def scores(net,inputs,triples,chunk=64):
    net.eval()
    pred=[];confidence=[]
    for st in range(0,len(triples),chunk):
        x=torch.from_numpy(inputs[st:st+chunk].astype(np.int64))
        heads=net(x)
        pred.extend(zip(*(h.argmax(1).tolist() for h in heads)))
        confidence.extend(torch.stack([h.softmax(1).max(1).values for h in heads],1).prod(1).tolist())
    truth=np.array(triples); pr=np.array(pred)
    return {"shape_accuracy":float(np.mean(pr[:,0]==truth[:,0])),
            "feature_accuracy":float(np.mean(pr[:,1]==truth[:,1])),
            "hair_accuracy":float(np.mean(pr[:,2]==truth[:,2])),
            "all_three_accuracy":float(np.mean(np.all(pr==truth,axis=1)))},confidence

def sheet(samples,dest,columns=8):
    n=len(samples); rows=math.ceil(n/columns)
    canvas=Image.new("RGB",(columns*SIDE,rows*SIDE),tuple(D[0]))
    for i,s in enumerate(samples):
        canvas.paste(Image.fromarray(D[s],"RGB"),((i%columns)*SIDE,(i//columns)*SIDE))
    canvas.save(dest)

def run(steps=340,seed=20261030):
    OUT.mkdir(parents=True,exist_ok=True)
    torch.manual_seed(seed);torch.set_num_threads(2)
    layers=load_layers()
    train,test=split_combinations(seed)
    train_x=np.stack([composite(t,layers) for t in train])
    test_x=np.stack([composite(t,layers) for t in test])
    model=PartNet()
    optimizer=torch.optim.AdamW(model.parameters(),lr=.001,weight_decay=.00025)
    rng=np.random.default_rng(seed)
    losses=[]
    best_train=float("inf")
    for step in range(steps):
        model.train()
        ix=rng.choice(len(train),size=40)
        x=torch.from_numpy(train_x[ix].astype(np.int64))
        y=torch.tensor([train[i] for i in ix],dtype=torch.long)
        pred=model(x)
        loss=sum(F.cross_entropy(p,y[:,j]) for j,p in enumerate(pred))/3
        optimizer.zero_grad(set_to_none=True);loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(),2)
        optimizer.step()
        if step in (0,steps//4,steps//2,steps-1):
            losses.append([step+1,round(float(loss.item()),5)])
    trained,_=scores(model,train_x,train)
    holdout,confidence=scores(model,test_x,test)
    # On unseen COMBINATIONS only. Source feature parts were all seen.
    proposed=sorted(zip(test,confidence,test_x),key=lambda z:z[1],reverse=True)
    chosen=[];seen_h=set();seen_f=set();seen_s=set()
    for triple,conf,img in proposed:
        # Reward coverage instead of returning only easy repeated faces.
        diversity=2*(triple[0] not in seen_s)+2*(triple[1] not in seen_f)+(triple[2] not in seen_h)
        chosen.append((float(conf)+diversity/5,triple,float(conf),img))
    chosen.sort(key=lambda x:x[0],reverse=True)
    selected=[];triples=set();hair=set();shape=set();features=set()
    for _,t,conf,img in chosen:
        if t in triples:continue
        if len(selected)<16 and all((t[i] in s) for i,s in enumerate((shape,features,hair))):
            continue
        selected.append((t,conf,img));triples.add(t);shape.add(t[0]);features.add(t[1]);hair.add(t[2])
        if len(selected)>=32:break
    if len(selected)<24:
        for _,t,conf,img in chosen:
            if t not in triples:
                selected.append((t,conf,img));triples.add(t)
            if len(selected)>=32:break
    final=[x[2] for x in selected]
    for i,t in enumerate(final):
        Image.fromarray(D[t],"RGB").save(OUT/f"face_{i:02}.png")
    sheet(final,OUT/"faces_32.png")
    sheet([train_x[i] for i in range(24)],OUT/"train_24.png")
    sheet([test_x[i] for i in range(16)],OUT/"holdout_16.png")
    model_path=OUT/"part_classifier.pt"
    torch.save({"state_dict":model.state_dict(),"factors":FACTORS},model_path)
    random_comb=set(train)
    report={
      "source":"lamiarts Faces CC0",
      "source_url":"https://opengameart.org/content/faces-1",
      "license":"CC0","source_combinations_total":616,
      "train_combinations":len(train),"heldout_combinations":len(test),
      "heldout_independent_artists":False,"heldout_independent_parts":False,
      "model":"3-head factor CNN trained on authentic independent CC0 composited face parts",
      "steps":steps,"parameters":sum(x.numel() for x in model.parameters()),
      "train_accuracy":trained,"heldout_accuracy":holdout,
      "loss":losses,
      "number_generated":len(final),
      "sampled_unseen_combinations":all(x[0] in test and x[0] not in random_comb for x in selected),
      "unique_shapes":len(shape),"unique_face_expressions":len(features),"unique_hair_styles":len(hair),
      "generated_triples":[{"shape":t[0]+1,"face":t[1]+1,"hair":t[2]+1,"model_score":round(conf,4)} for t,conf,_ in selected],
      "number_exactly_preserved_source_face_features":len(final),
      "all_four_colors":True,"image_dimensions":[SIDE,SIDE],
      "pixel_source":"Exact compositing of original CC0 facial parts, selected and evaluated by the neural network. NOT a neural pixel decoder",
      "styles_approved_for_game":0,
      "limitations":["Source's old-style small eyes do not match D-game master; examples are for general identity decomposition, not final approved faces.",
        "Heldout shares all individual parts; only combinations are unseen, so component-identification accuracy is not unseen-artist generalization.",
        "New faces are distinct arrangements of existing parts, not novel pixels or learned illustration from scratch.",
        "Do not replace pixel face reference or imply trained source identity counts equal combinations."]}
    (OUT/"report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps({"train":len(train),"holdout":len(test),"heldout_metrics":holdout,
       "samples":len(final),"shape_coverage":len(shape),"feature_coverage":len(features),"hair_coverage":len(hair)},ensure_ascii=False))
    return report

if __name__=="__main__":
    a=argparse.ArgumentParser();a.add_argument("--steps",type=int,default=340)
    args=a.parse_args();run(args.steps)
