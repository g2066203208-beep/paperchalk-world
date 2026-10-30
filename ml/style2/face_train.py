"""Face-only D-palette masked-token model (System 02).

Actual neural training and sampling from two hand-approved poses of ONE identity.
Every face is a 96x96 crop on the original 384x512 pixel grid. No RGB
interpolation, no generated fifth color. Conditioning on a *coarse* guide is
not standalone text-to-character generation. Scores distinguish local
restoration from creative quality; human approval remains mandatory.
"""
import argparse, json, math, random
from pathlib import Path
import numpy as np
import torch
from torch import nn
from torch.nn import functional as F
from PIL import Image, ImageDraw

ROOT=Path("site/pixel-lab/style2")
OUT=ROOT/"face-lab"
PAL=np.array([[57,54,87],[242,165,194],[169,186,233],[255,245,230]],np.uint8)
SIDE=96
SOURCES={"A_dynamic":(128,68),"B_standing":(123,62)}

def face(name):
    a=np.asarray(Image.open(ROOT/(name+".png")).convert("RGB"),np.uint8)
    x,y=SOURCES[name]; a=a[y:y+SIDE,x:x+SIDE]
    assert a.shape==(SIDE,SIDE,3)
    d=((a.astype(np.int32)[:,:,None,:]-PAL.astype(np.int32)[None,None,:,:])**2).sum(-1)
    t=d.argmin(-1).astype(np.uint8)
    assert np.array_equal(PAL[t],a), "Gold is not an exact four-color image"
    return t

def guide_of(tokens):
    # Coarse 3x3 majority, no smooth blending / never break four-color rule.
    t=torch.from_numpy(tokens.astype(np.int64))[None]
    scores=F.avg_pool2d(F.one_hot(t,4).permute(0,3,1,2).float(),3)
    low=scores.argmax(1).float()[:,None]
    return F.interpolate(low,size=(SIDE,SIDE),mode="nearest")[0,0].long()

def morph(a,rng):
    # Mild, controlled shape changes; nearest-neighbor cluster geometry only.
    # This creates augmentation, not new independently approved artist examples.
    yy,xx=np.mgrid[:SIDE,:SIDE]
    wid=float(rng.uniform(.955,1.055))
    eye=float(rng.uniform(-1.7,1.7))
    cheek=np.exp(-((yy-55.)/29.)**2)
    mx=(xx-47.5)/(wid + (eye/80.)*cheek)+47.5
    my=yy+float(rng.uniform(-2.0,2.0))*np.exp(-((yy-67)/26)**2)
    x=np.clip(np.rint(mx).astype(int)+int(rng.integers(-3,4)),0,SIDE-1)
    y=np.clip(np.rint(my).astype(int)+int(rng.integers(-3,4)),0,SIDE-1)
    b=a[y,x].copy()
    if rng.random()<.16:b=b[:,::-1].copy()
    return b

class Block(nn.Module):
    def __init__(self,ch):
        super().__init__()
        self.layers=nn.Sequential(nn.GroupNorm(8,ch),nn.SiLU(),nn.Conv2d(ch,ch,3,padding=1),
                                  nn.GroupNorm(8,ch),nn.SiLU(),nn.Conv2d(ch,ch,3,padding=1))
    def forward(self,x):return x+.28*self.layers(x)

class FaceNet(nn.Module):
    def __init__(self,ch=32):
        super().__init__()
        # noisy 5 tokens, 4 coarse guide tokens, 2 normalized grid coordinates
        self.head=nn.Conv2d(11,ch,3,padding=1)
        self.enc=nn.Sequential(Block(ch),nn.Conv2d(ch,ch*2,4,stride=2,padding=1),Block(ch*2))
        self.mid=nn.Sequential(nn.Conv2d(ch*2,ch*2,4,stride=2,padding=1),Block(ch*2),Block(ch*2))
        self.dec=nn.Sequential(nn.Conv2d(ch*4,ch*2,3,padding=1),Block(ch*2))
        self.tail=nn.Sequential(nn.Conv2d(ch*3,ch,3,padding=1),Block(ch),nn.GroupNorm(8,ch),nn.SiLU(),nn.Conv2d(ch,4,1))
    def forward(self,noisy,guide):
        b,h,w=noisy.shape
        yy=torch.linspace(-1,1,h,device=noisy.device)[None,None,:,None].expand(b,1,h,w)
        xx=torch.linspace(-1,1,w,device=noisy.device)[None,None,None,:].expand(b,1,h,w)
        x=torch.cat((F.one_hot(noisy.long(),5).permute(0,3,1,2).float(),
                     F.one_hot(guide.long(),4).permute(0,3,1,2).float(),xx,yy),1)
        a=self.head(x);skip=self.enc(a);low=self.mid(skip)
        z=self.dec(torch.cat((F.interpolate(low,size=skip.shape[-2:],mode="nearest"),skip),1))
        return self.tail(torch.cat((F.interpolate(z,size=(h,w),mode="nearest"),a),1))

def make_batch(rng,source,bs=10):
    gt=[];guide=[]
    for _ in range(bs):
        t=morph(source,int_rng(rng))
        gt.append(torch.tensor(t.copy(),dtype=torch.long))
        guide.append(guide_of(t))
    gt=torch.stack(gt)
    guide=torch.stack(guide)
    masks=rng.random((bs,SIDE,SIDE))<rng.uniform(.45,1.,(bs,1,1))
    noise=gt.clone()
    noise[torch.from_numpy(masks)]=4
    corrupt=(rng.random((bs,SIDE,SIDE))<.04)&~masks
    random_values=torch.from_numpy(rng.integers(0,4,(bs,SIDE,SIDE),dtype=np.int64))
    noise[torch.from_numpy(corrupt)]=random_values[torch.from_numpy(corrupt)]
    return gt,guide,noise

def int_rng(rng):
    # This tiny wrapper simply gives each augmentation its own deterministic RNG.
    return np.random.default_rng(int(rng.integers(0,2**32)))

@torch.no_grad()
def sample(net,guide,seed=0,passes=6,temperature=.82,retain=None):
    rng=torch.Generator().manual_seed(int(seed))
    g=guide.long()[None]
    cur=torch.full((1,SIDE,SIDE),4,dtype=torch.long)
    lock=torch.zeros_like(cur,dtype=torch.bool)
    if retain is not None:
        t,fraction=retain
        mask=torch.rand((1,SIDE,SIDE),generator=rng)<fraction
        cur[mask]=t[None][mask];lock=mask
    for step in range(passes):
        scores=net(cur,g).softmax(1)
        prob,tok=scores.max(1)
        if step==passes-1:idx=tok
        else:
            # Controlled stochastic diversity is limited to uncertain pixels.
            chosen=torch.multinomial(scores.permute(0,2,3,1).reshape(-1,4).clamp_min(1e-8),
                                     num_samples=1,generator=rng).reshape(1,SIDE,SIDE)
            idx=torch.where(prob>.90,tok,chosen)
        open_mask=(cur==4)
        remaining=int(open_mask.sum())
        keep=0 if step==passes-1 else int((SIDE*SIDE)*math.cos((step+1)*math.pi/(passes*2)))
        n=max(0,remaining-keep)
        if n:
            confidences=prob.masked_fill(~open_mask,-1.)
            selected=torch.topk(confidences.flatten(),n).indices
            cur.flatten()[selected]=idx.flatten()[selected]
        cur[lock]=retain[0][None][lock]
    assert bool((cur!=4).all())
    return cur[0].numpy().astype(np.uint8)

def save(t,path):
    assert t.shape==(SIDE,SIDE) and set(np.unique(t).tolist())<=set(range(4))
    Image.fromarray(PAL[t],"RGB").save(path)

def eval_holdout(net,base):
    guide=guide_of(base)
    pred=sample(net,guide,seed=9021,passes=6)
    baseline=guide.numpy().astype(np.uint8)
    relevant=(base!=0)
    def metrics(p):
        return {"all":round(float(np.mean(p==base)),4),
                "foreground":round(float(np.mean(p[relevant]==base[relevant])),4)}
    return pred,baseline,metrics(pred),metrics(baseline)

def run(steps=360,seed=20261030,out=OUT):
    out=Path(out);out.mkdir(parents=True,exist_ok=True)
    torch.set_num_threads(2);torch.manual_seed(seed)
    rng=np.random.default_rng(seed)
    gold={name:face(name) for name in SOURCES}
    for name,t in gold.items():save(t,out/(name+"_gold96.png"))
    net=FaceNet()
    optimizer=torch.optim.AdamW(net.parameters(),lr=.0009,weight_decay=.0002)
    points=[]
    for i in range(steps):
        net.train()
        gt,guide,noise=make_batch(rng,gold["A_dynamic"])
        logits=net(noise,guide)
        loss=F.cross_entropy(logits,gt)
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(net.parameters(),1.5)
        optimizer.step()
        if i in (0,steps//4,steps//2,steps-1):
            points.append([i+1,round(float(loss.item()),5)])
    net.eval()
    hold,baseline,score,baseline_score=eval_holdout(net,gold["B_standing"])
    save(hold,out/"heldout_neural.png");save(baseline,out/"heldout_nearest.png")
    candidates=[]
    for i in range(16):
        # Each candidate is generated by learned discrete denoising,
        # CONDITIONED on a deliberately varied structural guide.
        change=morph(gold["A_dynamic"],np.random.default_rng(seed+i*121+3))
        g=guide_of(change)
        pred=sample(net,g,seed=seed+i*47+9,passes=6)
        save(pred,out/(f"candidate_{i:02}.png"))
        candidates.append({"file":f"candidate_{i:02}.png","source":"A_dynamic guided structural variation",
                           "approved":False})
    sheet=Image.new("RGB",(SIDE*4*3,SIDE*4*4),tuple(PAL[0]))
    d=ImageDraw.Draw(sheet)
    for i,c in enumerate(candidates):
        image=Image.open(out/c["file"]).resize((SIDE*3,SIDE*3),Image.Resampling.NEAREST)
        sheet.paste(image,((i%4)*SIDE*3,(i//4)*SIDE*3))
    sheet.save(out/"contact_16.png")
    torch.save({"model":net.state_dict(),"source":["A_dynamic"],"holdout":["B_standing"]},out/"face_model.pt")
    report={"model":"face-only masked discrete RGB-free network","trained":True,
      "grid":[SIDE,SIDE],"palette":["#393657","#F2A5C2","#A9BAE9","#FFF5E6"],
      "train_real_identity_count":1,"train_gold":["A_dynamic"],"holdout_gold":["B_standing"],
      "training_steps":steps,"parameters":sum(p.numel() for p in net.parameters()),
      "loss_curve":points,"holdout_neural":score,"holdout_coarse_nearest":baseline_score,
      "baseline_beaten_foreground":score["foreground"]>baseline_score["foreground"],
      "generated_candidates":candidates,"human_approved_count":0,
      "interpretation":"16 structurally guided candidate faces, NOT autonomous new identities",
      "limitation":"Only one approved character in 2 poses; missing independently approved front-face identities and separately annotated eyes/nose/mouth; cannot claim high-quality original face synthesis."}
    (out/"report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps({k:report[k] for k in ("training_steps","parameters","holdout_neural","holdout_coarse_nearest","baseline_beaten_foreground")},ensure_ascii=False))
    return report

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--steps",type=int,default=360)
    args=parser.parse_args()
    run(steps=args.steps)
