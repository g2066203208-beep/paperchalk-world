"""Train an honest 4-color image restoration CNN with the new candidate included.

Gold A (one approved character) is labeled positive. The new fullbody image is
an UNAPPROVED pseudolabeled example, sampled at low frequency only; it cannot
teach the model human visual quality. Gold B (same character, different pose)
is never in gradient updates. Baseline comparisons are on synthetic RGB damage,
not a claim to autonomous new-character generation.
"""
import json,math
from pathlib import Path
import numpy as np
from PIL import Image,ImageFilter
import torch
from torch import nn
from torch.nn import functional as F
from ml.style2.bath_girl_import import create,PALETTE,OUT
from ml.style2.prepare import prepare
ROOT=Path("site/pixel-lab/style2")
torch.set_num_threads(2)

class Restorer(nn.Module):
    def __init__(self):
        super().__init__()
        self.net=nn.Sequential(
          nn.Conv2d(3,32,3,padding=1),nn.SiLU(),
          nn.Conv2d(32,48,3,padding=1),nn.SiLU(),
          nn.Conv2d(48,48,3,padding=2,dilation=2),nn.SiLU(),
          nn.Conv2d(48,48,3,padding=2,dilation=2),nn.SiLU(),
          nn.Conv2d(48,32,3,padding=1),nn.SiLU(),
          nn.Conv2d(32,4,1))
    def forward(self,x):return self.net(x)

def strict_tokens(path):
    a=np.asarray(Image.open(path).convert("RGB"),dtype=np.int32)
    assert a.shape==(512,384,3)
    d=((a[:,:,None,:]-PALETTE[None,None,:,:].astype(np.int32))**2).sum(3)
    token=d.argmin(2).astype(np.uint8)
    assert np.array_equal(PALETTE[token],a.astype(np.uint8))
    return token

def degrade(a,rng):
    im=Image.fromarray(PALETTE[a],"RGB")
    radius=float(rng.uniform(.4,1.3))
    img=np.asarray(im.filter(ImageFilter.GaussianBlur(radius)),np.float32)
    # Palette mismatch, light leakage and pseudo-AA noise.
    img=img*float(rng.uniform(.86,1.13))+rng.normal(0,8,size=(1,1,3))
    img+=rng.normal(0,float(rng.uniform(2,13)),size=img.shape)
    return np.clip(img/255,0,1).astype(np.float32)

@torch.no_grad()
def predict(net,image):
    net.eval()
    arr=[]
    for y in range(0,512,64):
        row=[]
        for x in range(0,384,64):
            tile=torch.from_numpy(image[y:y+64,x:x+64].transpose(2,0,1).copy())[None]
            out=net(tile).argmax(1)[0].numpy().astype(np.uint8)
            row.append(out)
        arr.append(np.concatenate(row,axis=1))
    return np.concatenate(arr,axis=0)

def evaluate(net,hold,seed):
    rng=np.random.default_rng(seed)
    values=[];example=None
    for i in range(3):
        bad=degrade(hold,rng)
        net_result=predict(net,bad)
        rgb=np.rint(bad*255).astype(np.int32)
        baseline=((rgb[:,:,None,:]-PALETTE[None,None,:,:].astype(np.int32))**2).sum(-1).argmin(-1).astype(np.uint8)
        mask=hold!=0
        vals={
            "seed":seed+i,
            "trained_accuracy":round(float(np.mean(net_result==hold)),5),
            "rgb_nearest_accuracy":round(float(np.mean(baseline==hold)),5),
            "trained_foreground_accuracy":round(float(np.mean((net_result==hold)[mask])),5),
            "rgb_nearest_foreground_accuracy":round(float(np.mean((baseline==hold)[mask])),5)
        }
        values.append(vals)
        if i==0:example=(bad,baseline,net_result)
    return values,example

def main(steps=140):
    torch.manual_seed(20261030)
    rng=np.random.default_rng(20261030)
    create()
    prepare()
    gold=strict_tokens(ROOT/"A_dynamic.png")
    hold=strict_tokens(ROOT/"B_standing.png")
    new=strict_tokens(OUT/"candidate_384x512.png")
    net=Restorer()
    opt=torch.optim.AdamW(net.parameters(),lr=.0012)
    logs=[]
    for step in range(steps):
        # 80% gold, 20% *pseudolabel* candidate; never silently approve it.
        crops=[];truth=[]
        for sample in range(12):
            t=gold if rng.random()<.8 else new
            cy=int(rng.integers(0,512-48+1))
            cx=int(rng.integers(0,384-48+1))
            orig=t[cy:cy+48,cx:cx+48]
            aug=degrade(orig,rng)
            crops.append(aug.transpose(2,0,1))
            truth.append(orig.astype(np.int64))
        x=torch.from_numpy(np.stack(crops))
        y=torch.from_numpy(np.stack(truth))
        logits=net(x)
        weights=torch.tensor([.45,2.0,2.0,2.0])
        loss=F.cross_entropy(logits,y,weight=weights)
        opt.zero_grad(set_to_none=True)
        loss.backward()
        nn.utils.clip_grad_norm_(net.parameters(),2)
        opt.step()
        if step in (0,29,59,99,steps-1):
            logs.append([step+1,round(float(loss.item()),6)])
    metrics,(blur,base,trained)=evaluate(net,hold,6000)
    Image.fromarray(PALETTE[base],"RGB").save(OUT/"holdout_baseline.png",optimize=True)
    Image.fromarray(PALETTE[trained],"RGB").save(OUT/"holdout_learned.png",optimize=True)
    # Never replace the provenance-matched pixel conversion with the
    # hallucinated neural denoising result.
    torch.save({"model":net.state_dict(),"notes":"gold A + candidate (pseudolabel), B strictly held out"},
               OUT/"restore_checkpoint.pt")
    report=json.loads((OUT/"conversion_report.json").read_text())
    report["learning"]={
      "steps":steps,"parameters":sum(p.numel() for p in net.parameters()),
      "sources":{"gold_train":["A_dynamic"],"pseudolabel_train":["bath_girl_20261030"],"holdout":["B_standing"]},
      "train_weighting":"approximately 80% approved A; 20% unapproved converted candidate",
      "not_a_novel_character_generator":True,
      "not_artist_approved":True,
      "loss_history":logs,
      "holdout_synthetic_corruption_tests":metrics,
      "baseline_mean_accuracy":round(float(np.mean([x["rgb_nearest_accuracy"] for x in metrics])),5),
      "model_mean_accuracy":round(float(np.mean([x["trained_accuracy"] for x in metrics])),5),
      "neural_result_not_used_to_overwrite_original_conversion":True
    }
    (OUT/"report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps({"learning":report["learning"]},ensure_ascii=False))
if __name__=="__main__":
    import argparse
    p=argparse.ArgumentParser();p.add_argument("--steps",type=int,default=140);args=p.parse_args()
    main(args.steps)
