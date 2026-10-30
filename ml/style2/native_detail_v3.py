"""Native 384x512 four-color pixel-detail learning research, 2026.

V2's 48x64 output is a thumbnail, never a publishable full-body portrait.
V3 trains on native 48x48 CROPS from both 384x512 D masters, conditioned by
a separate 192x256 image guide. Samples are assembled on the REAL 384x512
grid; every output pixel is a discrete D palette class. Not a new-identity
generator. From-guide evaluation is in-sample, not artist-quality proof.

Run after: python -m ml.style2.prepare
    python -m ml.style2.native_detail_v3 --steps 260
"""
import argparse, json, math, time
from pathlib import Path
import numpy as np
import torch
from torch import nn
from torch.nn import functional as F
from PIL import Image

ROOT=Path("site/pixel-lab/style2")
OUT=ROOT/"v3"
RGB=np.array([[57,54,87],[242,165,194],[169,186,233],[255,245,230]],dtype=np.uint8)
H,W=512,384

def labels(file):
    raw=np.asarray(Image.open(file).convert("RGB"),dtype=np.int32)
    assert raw.shape==(H,W,3)
    distances=((raw[:,:,None,:]-RGB[None,None,:,:].astype(np.int32))**2).sum(3)
    tokens=distances.argmin(2).astype("int64")
    assert np.array_equal(RGB[tokens],raw.astype("uint8")),"D palette integrity violated"
    return torch.from_numpy(tokens)

def coarse_from_native(values):
    # 2x2 majority, with a tiny tie preference for foreground to retain
    # delicate strands. No RGB interpolation or fifth color.
    categories=F.one_hot(values.long(),4).permute(0,3,1,2).float()
    majority=F.avg_pool2d(categories,2)
    majority[:,1:]+=0.0001
    coarse=majority.argmax(1)
    return F.interpolate(coarse[:,None].float(),scale_factor=2,mode="nearest")[:,0].long()

class ResBlock(nn.Module):
    def __init__(self,channels,dilation):
        super().__init__()
        self.layers=nn.Sequential(
            nn.GroupNorm(8,channels),nn.SiLU(),
            nn.Conv2d(channels,channels,3,padding=dilation,dilation=dilation),
            nn.GroupNorm(8,channels),nn.SiLU(),nn.Conv2d(channels,channels,1))
    def forward(self,x):return x+.30*self.layers(x)

class DetailNet(nn.Module):
    def __init__(self,channels=40):
        super().__init__()
        self.embed=nn.Embedding(5,12) # 4 actual colors and one MASK
        self.identity=nn.Embedding(2,4)
        # token embedding(12), guide(4), parity(4), coordinates(2),
        # reference pose(4) and masked fraction(1) = 27 channels.
        self.input=nn.Conv2d(27,channels,3,padding=1)
        self.blocks=nn.Sequential(*(ResBlock(channels,d) for d in (1,2,4,8,4,2,1)))
        self.output=nn.Sequential(nn.GroupNorm(8,channels),nn.SiLU(),
                                  nn.Conv2d(channels,4,1))
    def forward(self,unknown,guide,pose,origin=(0,0)):
        b,h,w=unknown.shape;device=unknown.device
        yy=torch.arange(h,device=device)+origin[0]
        xx=torch.arange(w,device=device)+origin[1]
        yy=yy[:,None].expand(h,w)
        xx=xx[None,:].expand(h,w)
        px=F.one_hot(xx%2,2).permute(2,0,1).float()[None].expand(b,-1,-1,-1)
        py=F.one_hot(yy%2,2).permute(2,0,1).float()[None].expand(b,-1,-1,-1)
        gx=(xx.float()/W*2-1)[None,None].expand(b,1,h,w)
        gy=(yy.float()/H*2-1)[None,None].expand(b,1,h,w)
        color=self.embed(unknown).permute(0,3,1,2)
        guide_onehot=F.one_hot(guide,4).permute(0,3,1,2).float()
        who=self.identity(pose)[:,:,None,None].expand(b,4,h,w)
        mask=(unknown==4).float().mean((1,2))[:,None,None,None].expand(b,1,h,w)
        features=torch.cat((color,guide_onehot,px,py,gx,gy,who,mask),1)
        return self.output(self.blocks(self.input(features)))

def patches(images,guides,rng,batch=6,span=48):
    rows=[]
    for i in range(batch):
        k=int(rng.integers(2))
        y=int(rng.integers(H-span+1));x=int(rng.integers(W-span+1))
        rows.append((k,y,x))
    ground=torch.stack([images[k][y:y+span,x:x+span] for k,y,x in rows])
    guide=torch.stack([guides[k][y:y+span,x:x+span] for k,y,x in rows])
    frac=rng.uniform(.40,1.0,batch)
    frac[rng.random(batch)<.22]=1
    hidden=torch.from_numpy(rng.random((batch,span,span))<frac[:,None,None])
    error=torch.from_numpy(rng.random((batch,span,span))<.07)&~hidden
    noisy=ground.clone();noisy[hidden]=4
    distractor=torch.from_numpy(rng.integers(0,4,(batch,span,span),dtype=np.int64))
    noisy[error]=distractor[error]
    return rows,ground,guide,noisy,hidden,error

@torch.no_grad()
def generate(network,guide,pose,known=None,passes=5):
    current=torch.full((1,H,W),4,dtype=torch.long) if known is None else known[None].clone()
    immutable=torch.zeros((H,W),dtype=torch.bool) if known is None else known!=4
    for step in range(passes):
        predictions=network(current,guide[None],torch.tensor([pose]))[0].softmax(0)
        confidence,next_color=predictions.max(0)
        hidden=current[0]==4
        remaining=int(hidden.sum().item())
        if remaining:
            left=0 if step==passes-1 else int(H*W*math.cos((step+1)*math.pi/(passes*2)))
            count=min(remaining,max(0,remaining-left))
            if count:
                loc=confidence.masked_fill(~hidden,-1).flatten().topk(count).indices
                current.reshape(-1)[loc]=next_color.flatten()[loc]
        if step>=1:
            permitted=(current[0]!=4)&~immutable
            old=current[0].clamp(max=3)
            prob=predictions.gather(0,old[None]).squeeze(0)
            correction=permitted&(confidence>.58)&(confidence-prob>.14)
            current[0][correction]=next_color[correction]
    assert (current<=3).all()
    if known is not None:assert torch.equal(current[0][immutable],known[immutable])
    return current[0]

def save_image(values,path):
    Image.fromarray(RGB[values.numpy().astype("uint8")],"RGB").save(path,optimize=True)

def compare(target,guide,result):
    fg=target!=0;lost=target!=guide;match=result==target
    return {
        "guide_accuracy":round(float((guide==target).float().mean()),5),
        "model_accuracy":round(float(match.float().mean()),5),
        "guide_foreground_accuracy":round(float(((guide==target)&fg).sum()/fg.sum()),5),
        "model_foreground_accuracy":round(float((match&fg).sum()/fg.sum()),5),
        "pixels_lost_by_192x256":int(lost.sum()),
        "lost_pixel_recovery_by_model":round(float((match&lost).sum()/lost.sum()),5)
    }

def train(steps=260,seed=20261030):
    OUT.mkdir(parents=True,exist_ok=True)
    torch.set_num_threads(2);torch.manual_seed(seed)
    rng=np.random.default_rng(seed)
    sources=[labels(ROOT/"A_dynamic.png"),labels(ROOT/"B_standing.png")]
    guides=[coarse_from_native(t[None])[0] for t in sources]
    network=DetailNet();optim=torch.optim.AdamW(network.parameters(),lr=.001,weight_decay=.0005)
    start=time.monotonic();losses=[]
    for step in range(1,steps+1):
        rows,ground,guide,noisy,masked,corrupted=patches(sources,guides,rng)
        logits=torch.cat([
            network(noisy[i:i+1],guide[i:i+1],torch.tensor([k]),(y,x))
            for i,(k,y,x) in enumerate(rows)],0)
        detail=(guide!=ground).float()
        weights=(.7+2*(ground!=0).float()+3*detail)*(masked.float()+.4*corrupted.float()+.08)
        loss=(F.cross_entropy(logits,ground,reduction="none")*weights).sum()/weights.sum()
        optim.zero_grad();loss.backward()
        nn.utils.clip_grad_norm_(network.parameters(),2)
        optim.step()
        if step in (1,20,40,80,120,steps):
            losses.append([step,round(float(loss.detach()),5)])
    network.eval()
    entries=[]
    for idx,(source,guide) in enumerate(zip(sources,guides)):
        name=("A_dynamic","B_standing")[idx]
        predicted=generate(network,guide,idx)
        torch.manual_seed(seed+idx+101)
        hidden=torch.rand((H,W))<.58
        damaged=source.clone();damaged[hidden]=4
        repaired=generate(network,guide,idx,known=damaged,passes=4)
        for label,image in (("original",source),("coarse192",guide),
                            ("generated384",predicted),("masked_repair384",repaired)):
            save_image(image,OUT/(name+"_"+label+".png"))
        score=compare(source,guide,predicted)
        score.update(asset=name,masked58_recovery=round(float((repaired[hidden]==source[hidden]).float().mean()),5),
                     visible_locked=bool(torch.equal(repaired[~hidden],source[~hidden])))
        entries.append(score)
    torch.save({"weights":network.state_dict(),"grid":[W,H],"guide":[W//2,H//2],
                "palette":RGB.tolist(),"seed":seed},OUT/"detail_weights.pt")
    report={"method":"384x512 native four-class detail refinement with learned denoising and 192x256 composition condition",
        "sources":2,"distinct_characters":1,"grid":[W,H],"guide":[W//2,H//2],
        "palette":["#393657","#F2A5C2","#A9BAE9","#FFF5E6"],
        "parameters":sum(p.numel() for p in network.parameters()),
        "steps":steps,"training_seconds":round(time.monotonic()-start,1),
        "loss_samples":losses,"results":entries,
        "baseline":"Nearest-neighbor enlargement of 192x256 coarse image",
        "scope":"same-character 2-pose in-sample restoration; no new character generation",
        "success_criteria":"model must beat coarse baseline on foreground, not just background",
        "quality_gate_passed":all(t["model_foreground_accuracy"]>t["guide_foreground_accuracy"] for t in entries)}
    (OUT/"report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps({"steps":steps,"quality_gate_passed":report["quality_gate_passed"],
                      "results":entries},ensure_ascii=False))
    return report

if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("--steps",type=int,default=260)
    args=p.parse_args();train(args.steps)
