"""Exact-pixel modular face generation + learned discrete part sampler.

This is a STRUCTURED GENERATOR, not a neural pixel painter.
Train on many (shape, eyes/expression, hair) combinations in lamiarts' CC0
part kit. Generate fresh combinations using trained masked transformer,
rasterize with original authored components, recolor exact 4 D colors.

The 7*11*8=616 triples share templates, so 'unseen combination' does NOT
mean 'unseen artist/person'. This is a quality-preserving baseline while
researching a learned high-resolution original-face decoder.
"""
import argparse, hashlib, io, json, math
from pathlib import Path
from zipfile import ZipFile
import numpy as np
from PIL import Image
import torch
from torch import nn
from torch.nn import functional as F

ROOT=Path("site/pixel-lab/style2/face-general")
ZIP=Path("ml/datasets/cc0_faces_lamiarts.zip")
COLOR=np.array([[57,54,87],[242,165,194],[169,186,233],[255,245,230]],np.uint8)
CAP=(7,11,8)
SEED=20261030

def source_layer(arc,part,i):
    file=("Hair8_bald.png" if part=="hair" and i==7 else f"{part}{i+1}.png")
    key=f"Faces/parts/{'faceshape' if part=='faceshape' else part}/{file}"
    with arc.open(key) as f:
        img=Image.open(io.BytesIO(f.read())).convert("RGBA")
    assert img.size==(256,256)
    return np.asarray(img,np.uint8)

def recolor_layer(arr,part):
    rgb=arr[:,:,:3].astype(np.int32); alpha=arr[:,:,3]
    lum=rgb.mean(axis=2)
    idx=np.zeros(alpha.shape,dtype=np.uint8)
    if part=="faceshape":
        idx[:]=3;idx[lum<55]=0
    elif part=="face":
        idx[:]=0
        idx[(lum>150)&(rgb[:,:,0]>150)]=3
        idx[(rgb[:,:,0]>110)&(rgb[:,:,0]>rgb[:,:,2]*1.35)&(lum<170)]=1
        idx[(rgb[:,:,2]>100)&(rgb[:,:,2]>rgb[:,:,0]*1.1)&(lum>70)&(lum<135)]=2
    else:
        idx[:]=1;idx[lum<55]=0
        idx[(rgb[:,:,2]>rgb[:,:,0]*1.2)&(lum<195)&(lum>=55)]=2
        idx[(lum>215)&(rgb[:,:,0]>160)]=3
    result=np.empty_like(arr);result[:,:,:3]=COLOR[idx]
    result[:,:,3]=np.where(alpha>=80,255,0)
    return Image.fromarray(result,"RGBA")

class Sampler(nn.Module):
    def __init__(self,d=64):
        super().__init__()
        self.embed=nn.Embedding(27,d)
        self.pos=nn.Parameter(torch.randn(1,3,d)*.04)
        layer=nn.TransformerEncoderLayer(d_model=d,nhead=4,dim_feedforward=128,dropout=0.0,batch_first=True,norm_first=True)
        self.tr=nn.TransformerEncoder(layer,num_layers=2,enable_nested_tensor=False)
        self.heads=nn.ModuleList([nn.Linear(d,k) for k in CAP])
    def forward(self,t):
        # 0 is MASK. Offsets prevent head/face/hair token collisions.
        raw=torch.zeros_like(t)
        raw[:,0]=torch.where(t[:,0]>=0,t[:,0]+1,0)
        raw[:,1]=torch.where(t[:,1]>=0,t[:,1]+8,0)
        raw[:,2]=torch.where(t[:,2]>=0,t[:,2]+19,0)
        h=self.tr(self.embed(raw)+self.pos)
        return [head(h[:,i]) for i,head in enumerate(self.heads)]

def split():
    all_items=[(h,f,a) for h in range(CAP[0]) for f in range(CAP[1]) for a in range(CAP[2])]
    # Held-out combinations; components are shared across splits by design.
    rng=np.random.default_rng(SEED);rng.shuffle(all_items)
    return all_items[:450],all_items[450:]

def train(steps=340):
    torch.manual_seed(SEED);torch.set_num_threads(2)
    rng=np.random.default_rng(SEED)
    tr,te=split()
    net=Sampler()
    opt=torch.optim.AdamW(net.parameters(),lr=.00065,weight_decay=.00015)
    curve=[]
    for n in range(steps):
        net.train()
        data=torch.tensor(np.asarray([tr[i] for i in rng.integers(0,len(tr),size=96)]),dtype=torch.long)
        mask=torch.from_numpy((rng.random((len(data),3))<.6))
        # Ensure at least one masked attribute in every training example.
        mask[torch.arange(len(data)),torch.tensor(rng.integers(0,3,len(data)))]=True
        inp=data.masked_fill(mask,-1)
        outputs=net(inp)
        losses=[]
        for i in range(3):
            if bool(mask[:,i].any()):
                losses.append(F.cross_entropy(outputs[i][mask[:,i]],data[:,i][mask[:,i]]))
        loss=sum(losses)/len(losses)
        opt.zero_grad(set_to_none=True);loss.backward()
        nn.utils.clip_grad_norm_(net.parameters(),1.5);opt.step()
        if n in (0,steps//4,steps//2,steps-1):curve.append([n+1,round(loss.item(),5)])
    net.eval()
    predictions={}
    with torch.no_grad():
        data=torch.tensor(np.asarray(te),dtype=torch.long)
        for which in range(3):
            partial=data.clone();partial[:,which]=-1
            out=net(partial)[which].argmax(1)
            predictions[("head_shape","features","hair")[which]]=round(float((out==data[:,which]).float().mean()),4)
    return net,tr,te,curve,predictions

@torch.no_grad()
def sample(net,trainset,count=32):
    # Actual neural categorical sampler, not one-person augmentation.
    rng=torch.Generator().manual_seed(SEED+9)
    chosen=[];seen=set()
    for attempt in range(5000):
        tokens=torch.full((1,3),-1,dtype=torch.long)
        for i in (0,1,2):
            probs=net(tokens)[i].softmax(1).squeeze(0)
            idx=int(torch.multinomial(probs,1,generator=rng))
            tokens[0,i]=idx
        tup=tuple(map(int,tokens[0].tolist()))
        if tup not in seen and tup not in trainset:
            seen.add(tup);chosen.append(tup)
        if len(chosen)>=count:break
    if len(chosen)<count:raise RuntimeError(f"Sampler failed to generate {count} distinct held-out component combinations")
    return chosen

def paint(triples):
    if not ZIP.exists():raise RuntimeError("Missing true CC0 source archive")
    ROOT.mkdir(parents=True,exist_ok=True)
    sheet=Image.new("RGB",(8*128,math.ceil(len(triples)/8)*128),tuple(COLOR[0]))
    imgs=[]
    with ZipFile(ZIP) as arc:
        assets={(p,i):recolor_layer(source_layer(arc,p,i),p)
           for p,count in (("faceshape",7),("face",11),("hair",8)) for i in range(count)}
        for j,(sh,feature,hair) in enumerate(triples):
            out=Image.new("RGBA",(256,256),tuple(COLOR[0])+(255,))
            for key in (("faceshape",sh),("face",feature),("hair",hair)):
                out.alpha_composite(assets[key])
            crop=out.crop((64,4,192,132)).convert("RGB")
            a=np.asarray(crop,np.uint8)
            assert set(map(tuple,np.unique(a.reshape(-1,3),axis=0)))<=set(map(tuple,COLOR))
            file=f"structured_{j:02d}.png";crop.save(ROOT/file)
            sheet.paste(crop,((j%8)*128,(j//8)*128))
            imgs.append(file)
    sheet.save(ROOT/"structured_contact.png")
    return imgs

def main(steps=340):
    net,tr,te,curve,metrics=train(steps)
    imgs=sample(net,set(tr),count=32)
    outputs=paint(imgs)
    ROOT.mkdir(parents=True,exist_ok=True)
    torch.save({"model":net.state_dict(),"components":{"face_shapes":7,"facial_features":11,"hair_styles":8},"seed":SEED},ROOT/"structured_sampler.pt")
    report={
       "model_type":"learned discrete part sampler + pixel-exact CC0 layering",
       "not_neural_pixel_generation":True,
       "source":"https://opengameart.org/content/faces-1",
       "license":"CC0",
       "all_valid_head_feature_hair_combinations":616,
       "train_combination_count":len(tr),
       "holdout_combination_count":len(te),
       "distinct_generated_heldout_combinations":len(imgs),
       "source_body_combinations_not_counted_as_independent_people":True,
       "native_resolution":[128,128],"exact_palette":["#393657","#F2A5C2","#A9BAE9","#FFF5E6"],
       "components":{"head_shape":7,"face_features":11,"hairstyles":8},
       "steps":steps,"learned_parameter_count":sum(p.numel() for p in net.parameters()),
       "train_loss":curve,
       "holdout_masked_component_top1":metrics,
       "generated_triplets":imgs,
       "generated_files":outputs,
       "human_approved_count":0,
       "art_quality":"not approved: CC0 pixel art style differs from D style gold master",
       "limitations":["Exact CC0 layer combinations preserve authored eyes, mouth and hair; model does not draw new pixels.",
           "All 616 combinations share artist-designed components; unseen combos do not imply new independent human identities.",
           "This is a discrete sampling/structure module, not autonomous 384x512 D-quality portrait design."]
    }
    (ROOT/"structured_report.json").write_text(json.dumps(report,indent=2,ensure_ascii=False))
    print(json.dumps({"steps":steps,"generated_count":len(imgs),"train":len(tr),"test":len(te),"metrics":metrics},ensure_ascii=False),flush=True)
if __name__=="__main__":
    ap=argparse.ArgumentParser();ap.add_argument("--steps",type=int,default=340)
    args=ap.parse_args();main(args.steps)
