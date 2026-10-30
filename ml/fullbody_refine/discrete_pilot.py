"""Experimental discrete-palette timestep-conditioned denoiser.

This is a deliberately SMALL categorical diffusion pilot, NOT PixelDiT or a
state of the art production model. Its pseudo-gold is the existing RL-cleaned
ONE-CHARACTER sprite; synthetic-noise recovery cannot prove aesthetic quality.
Output is artifact-only and never replaces production sprites automatically.
"""
import hashlib,json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
import torch
from torch import nn
from torch.nn import functional as F
from ml.fullbody_refine.semantic_cleanup import read_source,PAL,components

OUT=Path('artifacts/pixel-discrete-diffusion')
RAW='site/pixel-lab/assets/hostess-redraw-v1-192x256.png'
PSEUDO='site/pixel-lab/semantic-output/refined_native.png'

class DiscreteDenoiser(nn.Module):
 def __init__(self):
  super().__init__()
  self.net=nn.Sequential(nn.Conv2d(6,24,3,padding=1),nn.GELU(),
   nn.Conv2d(24,24,3,padding=2,dilation=2),nn.GELU(),
   nn.Conv2d(24,24,3,padding=1),nn.GELU(),nn.Conv2d(24,5,1))
 def forward(self,x,t):
  one=F.one_hot(x.long(),5).permute(0,3,1,2).float()
  n,c,h,w=one.shape
  steps=(t/6.).reshape(-1,1,1,1).expand(n,1,h,w)
  return self.net(torch.cat([one,steps],dim=1))

def corrupt(a,rng,rate):
 b=a.copy();m=rng.random(b.shape)<rate
 b[m]=rng.integers(0,5,size=int(m.sum()),dtype=np.uint8)
 return b

def run(steps=250):
 torch.set_num_threads(2);torch.manual_seed(123456)
 src=read_source(RAW);target=read_source(PSEUDO)
 assert src.shape==target.shape==(256,192)
 assert (src!=target).sum()>10,"Experiment must not train against identical images"
 rng=np.random.default_rng(12345);model=DiscreteDenoiser();opt=torch.optim.AdamW(model.parameters(),lr=.001)
 learning=[]
 for i in range(steps):
  patches=[];truth=[];time=[]
  for j in range(3):
   t=int(rng.integers(1,7));broken=corrupt(target,rng,.035*t)
   y=int(rng.integers(0,208));x=int(rng.integers(0,144))
   patches.append(broken[y:y+48,x:x+48]);truth.append(target[y:y+48,x:x+48]);time.append(t)
  inp=torch.from_numpy(np.stack(patches).astype(np.int64))
  y=torch.from_numpy(np.stack(truth).astype(np.int64))
  t=torch.tensor(time,dtype=torch.float32)
  pred=model(inp,t)
  loss=(F.cross_entropy(pred,y,reduction='none')*torch.where(y==0,.5,2.)).mean()
  opt.zero_grad(set_to_none=True);loss.backward();opt.step()
  if i in (0,steps//2,steps-1):learning.append([i+1,round(float(loss.item()),5)])
 model.eval();metrics=[];proposals=[];walk=src.copy()
 with torch.no_grad():
  for _ in range(8):
   dam=corrupt(target,rng,.14)
   pred=model(torch.from_numpy(dam.astype(np.int64))[None],torch.tensor([4.])).argmax(1).squeeze(0).numpy()
   metrics.append([float((dam==target).mean()),float((pred==target).mean())])
  for t in (6,5,4,3,2,1):
   logits=model(torch.from_numpy(walk.astype(np.int64))[None],torch.tensor([float(t)]))
   prob=logits.softmax(1).squeeze(0).numpy()
   next_color=prob.argmax(0)
   changed=0
   for y in range(80,255):
    for x in range(1,191):
     old=int(walk[y,x]);new=int(next_color[y,x])
     if old==0 or new==0 or old==new or prob[new,y,x]<.5:continue
     patch=walk[y-1:y+2,x-1:x+2]
     if (patch==0).any() or (patch==new).sum()<5:continue
     walk[y,x]=new;changed+=1
   proposals.append({'timestep':t,'changes':changed})
 if not np.array_equal(walk>0,src>0) or not np.array_equal(walk[:80],src[:80]):
  raise AssertionError('Discrete diffusion damaged silhouette or protected head')
 before=components(src);after=components(walk)
 OUT.mkdir(parents=True,exist_ok=True)
 img=Image.fromarray(PAL[walk],'RGB')
 img.save(OUT/'experimental-only.png')
 img.resize((384,512),Image.Resampling.NEAREST).save(OUT/'experimental-2x-preview.png')
 torch.save({'model':'DiscreteDenoiser','state_dict':model.state_dict(),'steps':steps},OUT/'experimental-model.pt')
 m=np.mean(metrics,axis=0)
 report={
  'experiment':'time_conditioned_categorical_discrete_denoiser',
  'trained':True,'not_pixeldit':True,'not_rlhf':True,'manual_gold_available':False,
  'pseudo_gold_from_rl_cleanup':True,'independent_person_count':1,
  'native_grid':[192,256],'preview_is_2x_nearest_only':True,'art_approved':False,
  'usable_for_game':False,'trained_steps':steps,'loss':learning,
  'holdout_corrupted_accuracy':round(float(m[0]),5),
  'holdout_denoised_accuracy':round(float(m[1]),5),
  'different_from_original_pixels':int((walk!=src).sum()),
  'different_from_pseudo_gold_pixels':int((walk!=target).sum()),
  'small_cluster_before':before['small_component_pixels'],
  'small_cluster_after':after['small_component_pixels'],
  'sampling_steps':proposals,'artwork_status':'needs manual comparison before any promotion',
  'caution':'Synthesized corruption improvement cannot prove face, clothing and intended shading are better. Only one pseudo-labelled figure exists.'
 }
 (OUT/'report.json').write_text(json.dumps(report,indent=2))
 assert m[1]>m[0]+.03
 print(json.dumps(report),flush=True)
if __name__=='__main__':run()
