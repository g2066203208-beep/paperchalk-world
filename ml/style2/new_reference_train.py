"""Train a genuine masked-token restoration model on D-color pixel patches.

Two gold D poses + unapproved uploaded converted image. New image bottom rows
are held out from source training. This does NOT learn new pose or perfect art.
"""
import argparse,json
from pathlib import Path
import numpy as np
import torch
from torch import nn
from torch.nn import functional as F
from PIL import Image
from ml.style2.new_reference import decode,PALETTE,BASE
from ml.style2.prepare import prepare

class Res(nn.Module):
 def __init__(self,c):
  super().__init__();self.net=nn.Sequential(nn.GroupNorm(8,c),nn.SiLU(),nn.Conv2d(c,c,3,padding=1),nn.GroupNorm(8,c),nn.SiLU(),nn.Conv2d(c,c,3,padding=1))
 def forward(self,x):return x+.3*self.net(x)
class PixelRepair(nn.Module):
 def __init__(self,c=32):
  super().__init__();self.net=nn.Sequential(nn.Conv2d(5,c,3,padding=1),Res(c),Res(c),nn.GroupNorm(8,c),nn.SiLU(),nn.Conv2d(c,4,1))
 def forward(self,x):return self.net(F.one_hot(x.long(),5).permute(0,3,1,2).float())

def gold(name):
 a=np.asarray(Image.open(Path("site/pixel-lab/style2")/(name+".png")).convert("RGB"),np.uint8)
 assert a.shape==(512,384,3)
 d=((a.astype(np.int32)[:,:,None,:]-PALETTE.astype(np.int32)[None,None,:,:])**2).sum(-1)
 t=d.argmin(-1).astype(np.uint8)
 assert np.array_equal(PALETTE[t],a)
 return t

def batch(rng,images,count=12,side=48):
 patches=[]
 for _ in range(count):
  i=int(rng.integers(len(images)));a=images[i]
  max_y=min(a.shape[0]-side,320) if i==2 else a.shape[0]-side
  y=int(rng.integers(max_y+1));x=int(rng.integers(a.shape[1]-side+1))
  p=a[y:y+side,x:x+side]
  if rng.random()<.5:p=p[:,::-1]
  patches.append(p.copy())
 gt=np.stack(patches).astype(np.int64)
 mask=rng.random(gt.shape)<rng.uniform(.2,.6,(count,1,1))
 noisy=gt.copy();noisy[mask]=4
 return torch.from_numpy(noisy),torch.from_numpy(gt),torch.from_numpy(mask)

@torch.no_grad()
def evaluate(net,truth,seed=2301):
 rng=np.random.default_rng(seed)
 mask=rng.random(truth.shape)<.35
 noisy=truth.astype(np.int64).copy();noisy[mask]=4
 pred=np.empty_like(truth)
 net.eval()
 for y in range(0,len(truth),32):
  z=net(torch.from_numpy(noisy[y:y+32][None])).argmax(1)[0].numpy()
  pred[y:y+len(z)]=z
 repaired=truth.copy();repaired[mask]=pred[mask]
 # Explicit visible-neighbor 3x3 majority baseline.
 p=np.pad(noisy,1,mode="edge")
 counts=np.zeros((4,*truth.shape),np.int16)
 for dy in range(3):
  for dx in range(3):
   v=p[dy:dy+truth.shape[0],dx:dx+truth.shape[1]]
   for c in range(4):counts[c]+=(v==c)
 baseline=counts.argmax(0)
 dirty=truth.copy();dirty[mask]=0
 for name,a in (("heldout_truth",truth),("heldout_masked",dirty),("heldout_repaired",repaired)):
  Image.fromarray(PALETTE[a],mode="RGB").save(BASE/(name+".png"))
 return round(float(np.mean(repaired[mask]==truth[mask])),4),round(float(np.mean(baseline[mask]==truth[mask])),4)

def run(steps=160):
 prepare()
 src=[gold("A_dynamic"),gold("B_standing"),decode()]
 torch.manual_seed(20261030);torch.set_num_threads(2)
 rng=np.random.default_rng(20261030)
 net=PixelRepair();opt=torch.optim.AdamW(net.parameters(),lr=.001)
 loss_history=[]
 for i in range(steps):
  net.train();noisy,gt,mask=batch(rng,src)
  logits=net(noisy);loss=(F.cross_entropy(logits,gt,reduction="none")*mask).sum()/mask.sum().clamp(min=1)
  opt.zero_grad(set_to_none=True);loss.backward();nn.utils.clip_grad_norm_(net.parameters(),1.5);opt.step()
  if i in (0,steps//2,steps-1):loss_history.append([i+1,round(float(loss.item()),5)])
 BASE.mkdir(exist_ok=True,parents=True)
 torch.save({"state_dict":net.state_dict(),"sources":["A_dynamic","B_standing","new_unapproved_uploaded"]},BASE/"learned_repair.pt")
 acc,baseline=evaluate(net,src[-1][376:])
 report={"trained":True,"steps":steps,"model":"masked palette CNN, 2 residual blocks",
   "parameters":sum(x.numel() for x in net.parameters()),
   "source_images":["A_dynamic GOLD","B_standing GOLD","uploaded modern character CANDIDATE"],
   "holdout":"uploaded image bottom 136 pixel rows not used as training crops",
   "masked_accuracy":acc,"three_by_three_visible_mode_baseline":baseline,
   "beats_baseline":acc>baseline,"loss":loss_history,
   "strict_d_palette":True,"models_new_pose":False,
   "does_not_prove_perfect_conversion":True,"style_approval":"unapproved"}
 (BASE/"ml_report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(json.dumps(report,ensure_ascii=False))
if __name__=="__main__":
 p=argparse.ArgumentParser();p.add_argument("--steps",type=int,default=160)
 run(p.parse_args().steps)
