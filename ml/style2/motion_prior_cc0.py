"""CC0 multi-identity animation pose PRIOR, separate from final D-style character.

Trains conditioned pixel-token decoder on 3 real 16px animated sheets with
multiple action rows. This is motion-layout pretraining, not 384x512 new
character illustration and not proof of action transfer to uploaded image.
CC0 artists: ImogiaGames / frozenen via OpenGameArt.
"""
from pathlib import Path
import hashlib,json,math
import numpy as np
from PIL import Image
import torch
from torch import nn
from torch.nn import functional as F

ROOT=Path("site/pixel-lab/style2/motion-prior")
IN=Path("ml/datasets/cc0-motions")
COL=np.array([[57,54,87],[242,165,194],[169,186,233],[255,245,230]],np.uint8)
INPUTS=["onur.png","james.png","frank.png"]
SOURCES=["https://opengameart.org/content/pixel-character-01-onur",
         "https://opengameart.org/content/pixel-character-02-james",
         "https://opengameart.org/content/pixel-character-03-frank"]
def extract():
 out=[]
 for identity,name in enumerate(INPUTS):
  p=IN/name
  assert p.is_file(),f"CC0 action sheet not downloaded: {name}"
  img=Image.open(p).convert("RGBA")
  w,h=img.size
  assert w%16==0 and h%16==0 and w>=64 and h>=64,(name,img.size)
  pixels=np.asarray(img,dtype=np.uint8)
  for y in range(min(h//16,8)):
   for x in range(min(w//16,12)):
    a=pixels[y*16:(y+1)*16,x*16:(x+1)*16]
    rgb=a[:,:,:3].astype(np.int32)
    idx=((rgb[:,:,None,:]-COL.astype(np.int32)[None,None,:,:])**2).sum(-1).argmin(-1).astype(np.uint8)
    idx[a[:,:,3]<32]=0
    if (idx!=0).sum()<10:continue
    out.append((identity,y,x,idx))
 assert len(out)>=40, f"not enough action frames {len(out)}"
 assert len({(i,r) for i,r,_,a in out})>=12
 return out

class PoseDecoder(nn.Module):
 def __init__(self):
  super().__init__()
  self.identity=nn.Embedding(3,16)
  self.action=nn.Embedding(8,24)
  self.phase=nn.Embedding(12,16)
  self.fc=nn.Linear(56,64*4*4)
  self.decoder=nn.Sequential(
    nn.Conv2d(64,64,3,padding=1),nn.SiLU(),nn.Upsample(scale_factor=2,mode="nearest"),
    nn.Conv2d(64,48,3,padding=1),nn.SiLU(),nn.Upsample(scale_factor=2,mode="nearest"),
    nn.Conv2d(48,32,3,padding=1),nn.SiLU(),nn.Conv2d(32,4,1))
 def forward(self,ids,row,phase):
  v=torch.cat([self.identity(ids),self.action(row),self.phase(phase)],1)
  return self.decoder(self.fc(v).reshape(-1,64,4,4))

def run(steps=450):
 ROOT.mkdir(parents=True,exist_ok=True)
 torch.manual_seed(20261030);torch.set_num_threads(2)
 data=extract()
 # Leave phase 3/7 unseen where possible; test can share bodies, not unseen identity.
 train=[item for item in data if item[2]%4!=3]
 test=[item for item in data if item[2]%4==3]
 assert len(train)>=30 and len(test)>=8
 net=PoseDecoder();opt=torch.optim.AdamW(net.parameters(),lr=.001)
 rng=np.random.default_rng(20261030)
 history=[]
 for step in range(steps):
  net.train()
  ix=rng.integers(0,len(train),size=40)
  items=[train[i] for i in ix]
  ids=torch.tensor([r[0] for r in items]);row=torch.tensor([r[1] for r in items]);ph=torch.tensor([r[2] for r in items])
  truth=torch.from_numpy(np.stack([r[3] for r in items]).astype(np.int64))
  logits=net(ids,row,ph)
  weight=torch.tensor([.25,1.8,1.8,1.8])
  loss=F.cross_entropy(logits,truth,weight=weight)
  opt.zero_grad(set_to_none=True);loss.backward()
  nn.utils.clip_grad_norm_(net.parameters(),2.);opt.step()
  if step in (0,steps//2,steps-1):history.append([step+1,round(float(loss.item()),5)])
 net.eval()
 with torch.no_grad():
  preds=[];known=[]
  for i in range(0,len(test),40):
   t=test[i:i+40]
   logits=net(torch.tensor([v[0] for v in t]),torch.tensor([v[1] for v in t]),torch.tensor([v[2] for v in t]))
   preds.extend(logits.argmax(1).cpu().numpy().astype(np.uint8))
   known.extend(v[3] for v in t)
  acc=float(np.mean(np.stack(preds)==np.stack(known)))
  # 8 different action rows x 2 identities; generate *from learned weights*.
  modes=sorted({r for _,r,_,_ in train})[:8]
  configs=[(i,r,0) for i in (0,1) for r in modes]
  assert len(configs)>=12
  ids=torch.tensor([x[0] for x in configs]);rows=torch.tensor([x[1] for x in configs]);ph=torch.tensor([x[2] for x in configs])
  out=net(ids,rows,ph).argmax(1).cpu().numpy().astype(np.uint8)
 distinct=len({x.tobytes() for x in out})
 # No fake diversity claim: report distinct count, do not force pass.
 for i,a in enumerate(out):
  Image.fromarray(COL[a],mode="RGB").resize((128,128),Image.Resampling.NEAREST).save(ROOT/f"motion_{i:02}.png")
 contact=Image.new("RGB",(128*4,128*math.ceil(len(out)/4)),tuple(COL[0]))
 for i,a in enumerate(out):
  img=Image.fromarray(COL[a],mode="RGB").resize((128,128),Image.Resampling.NEAREST)
  contact.paste(img,((i%4)*128,(i//4)*128))
 contact.save(ROOT/"contact.png")
 torch.save({"state_dict":net.state_dict(),"source":"CC0 3 character action sheets"},ROOT/"motion_prior.pt")
 report={"trained":True,"training_images":len(train),"heldout_images":len(test),
  "identity_count":3,"action_rows_seen":len(modes),"actions":len(out),"distinct_predictions":distinct,
  "pixel_accuracy_heldout_frames":round(acc,4),"steps":steps,"loss":history,
  "new_uploaded_image_used_for_pose_training":False,"native_training_resolution":[16,16],
  "fullbody_quality_approved":False,
  "source_urls":SOURCES,"license":"CC0",
  "limitations":["This is a separate 16px sprite motion prior; it cannot yet generate original 384x512 human anatomy.",
    "Training images from 3 character sheets have repeated pixel assets, not fully independent characters.",
    "Unseen animation phase holdout is not unseen action or identity generalization."]}
 (ROOT/"report.json").write_text(json.dumps(report,indent=2,ensure_ascii=False))
 print(json.dumps({"trained":True,"frame_accuracy":acc,"distinct_generated":distinct,"samples":len(out)}))
if __name__=="__main__":
 import argparse
 p=argparse.ArgumentParser();p.add_argument("--steps",type=int,default=450);run(p.parse_args().steps)
