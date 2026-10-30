"""Actual NumPy neural training on both D-style sprite anchors.
01 RGB repair: blurry/noisy 3x3 patch -> one of exactly four color classes.
02 Drawing study: masked 5x5 neighboring pixel tokens -> missing center pixel.

No unseen-character claim. The two images show the SAME character, two poses.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image,ImageFilter
from ml.style2.prepare import ROOT,COL,prepare

H,W=512,384

class MLP:
 def __init__(self,inputs,rng):
  self.w1=(rng.normal(0,.10,(inputs,64))).astype("float32")
  self.b1=np.zeros(64,"float32")
  self.w2=(rng.normal(0,.10,(64,4))).astype("float32")
  self.b2=np.zeros(4,"float32")
  self.weights=[self.w1,self.b1,self.w2,self.b2]
  self.m=[np.zeros_like(t) for t in self.weights]
  self.v=[np.zeros_like(t) for t in self.weights]
  self.step=0
 def logits(self,x):
  return np.maximum(0,x@self.w1+self.b1)@self.w2+self.b2
 def train(self,x,labels,lr=.003):
  self.step+=1
  hidden=np.maximum(0,x@self.w1+self.b1)
  z=hidden@self.w2+self.b2
  z-=z.max(1,keepdims=True)
  prob=np.exp(z);prob/=prob.sum(1,keepdims=True)
  loss=float(-np.log(prob[np.arange(len(labels)),labels]+1e-10).mean())
  prob[np.arange(len(labels)),labels]-=1
  prob/=len(labels)
  g2=hidden.T@prob;gb2=prob.sum(0)
  gh=(prob@self.w2.T)*(hidden>0)
  g1=x.T@gh;gb1=gh.sum(0)
  for i,(weight,grad) in enumerate(zip(self.weights,(g1,gb1,g2,gb2))):
   self.m[i][:]=.9*self.m[i]+.1*grad
   self.v[i][:]=.999*self.v[i]+.001*grad**2
   weight-=lr*(self.m[i]/(1-.9**self.step))/(np.sqrt(self.v[i]/(1-.999**self.step))+1e-8)
  return round(loss,5)
 def save(self,path):
  np.savez_compressed(path,w1=self.w1,b1=self.b1,w2=self.w2,b2=self.b2)

def load_tokens(name):
 image=np.asarray(Image.open(ROOT/(name+".png")).convert("RGB"))
 matching=(image[:,:,None,:]==COL[None,None,:,:]).all(3)
 assert matching.any(2).all(),name
 return matching.argmax(2).astype("uint8")

def degrade(tokens,rng):
 image=Image.fromarray(COL[tokens],"RGB")
 scale=float(rng.uniform(.78,.97))
 size=(int(W*scale),int(H*scale))
 image=image.resize(size,Image.Resampling.BILINEAR).resize((W,H),Image.Resampling.BICUBIC)
 if rng.random()<.8:image=image.filter(ImageFilter.GaussianBlur(float(rng.uniform(.4,1.1))))
 rgb=np.asarray(image,dtype="float32")
 rgb+=rng.normal(0,rng.uniform(2,12),size=(1,1,3)).astype("float32")
 rgb+=rng.normal(0,rng.uniform(1,15),size=rgb.shape).astype("float32")
 return np.clip(rgb/255.,0,1).astype("float32")

def sample_coords(rng,tokens,count,upper_only=False):
 limit=H*3//4 if upper_only else H
 # Mix foreground/background so learning does not just guess the solid backdrop.
 yy,xx=np.nonzero(tokens[:limit]!=0)
 foreground=rng.integers(len(yy),size=count//2)
 y=np.concatenate((yy[foreground],rng.integers(limit,size=count-count//2)))
 x=np.concatenate((xx[foreground],rng.integers(W,size=count-count//2)))
 return y,x

def rgb_window(rgb,ys,xs,k=3):
 radius=k//2;p=np.pad(rgb,((radius,radius),(radius,radius),(0,0)),mode="edge")
 return np.concatenate([p[ys+dy,xs+dx] for dy in range(k) for dx in range(k)],axis=1).astype("float32")

def masked_window(tokens,ys,xs,rng,k=5):
 radius=k//2;p=np.pad(tokens,radius,mode="edge")
 neighbors=np.stack([p[ys+dy,xs+dx] for dy in range(k) for dx in range(k)],axis=1)
 # Center is always hidden, with a random subset of other context hidden too.
 hidden=(rng.random(neighbors.shape)<.13)
 hidden[:,(k*k)//2]=True
 neighbors[hidden]=4
 return np.eye(5,dtype="float32")[neighbors].reshape(len(ys),-1)

def infer(net,generate,length,k,seed=62):
 rng=np.random.default_rng(seed)
 parts=[]
 for start in range(0,length,4096):
  stop=min(length,start+4096)
  features=generate(start,stop,rng)
  parts.append(net.logits(features).argmax(1))
 return np.concatenate(parts)

def main(steps=240,seed=20261030):
 if not (ROOT/"dataset.json").exists():prepare()
 rng=np.random.default_rng(seed)
 a=load_tokens("A_dynamic");b=load_tokens("B_standing")
 image_sources=[a,b]
 repair=MLP(27,rng)
 curve=[]
 # A-only training and B holdout is a *pose* test of the same character.
 for step in range(1,steps+1):
  source=a
  if step%12==1:corrupted=degrade(source,rng)
  ys,xs=sample_coords(rng,source,640)
  loss=repair.train(rgb_window(corrupted,ys,xs),source[ys,xs])
  if step in (1,40,100,steps):curve.append([step,loss])
 corrupted_b=degrade(b,np.random.default_rng(seed+10))
 ys_all=np.repeat(np.arange(H),W);xs_all=np.tile(np.arange(W),H)
 pred_a=infer(repair,lambda lo,hi,r:rgb_window(corrupted_b,ys_all[lo:hi],xs_all[lo:hi]),H*W,3).reshape(H,W)
 nearest=((corrupted_b[:,:,None,:]*255-COL[None,None,:,:])**2).sum(3).argmin(2)
 holdout={"neural_accuracy":round(float((pred_a==b).mean()),5),
     "nearest_baseline":round(float((nearest==b).mean()),5)}
 # Continue actual training with BOTH anchor images before exporting weights.
 for step in range(1,steps+1):
  source=image_sources[(step-1)%2]
  if (step-1)//2%12==0 and (step-1)%2==0:
   cached=[degrade(s,rng) for s in image_sources]
  ys,xs=sample_coords(rng,source,640)
  loss=repair.train(rgb_window(cached[(step-1)%2],ys,xs),source[ys,xs])
  if step in (1,40,100,steps):curve.append(["both",step,loss])
 repair.save(ROOT/"repair_weights.npz")
 # Pixel-completion training: top 75% of each image, bottom 25% for evaluation.
 painter=MLP(125,rng)
 drawcurve=[]
 for step in range(1,steps+1):
  source=image_sources[(step-1)%2]
  ys,xs=sample_coords(rng,source,768,upper_only=True)
  guess=masked_window(source,ys,xs,rng)
  loss=painter.train(guess,source[ys,xs],lr=.002)
  if step in (1,40,100,steps):drawcurve.append([step,loss])
 painter.save(ROOT/"pixel_completion_weights.npz")
 y0=H*3//4;eval_y=np.repeat(np.arange(y0,H),W);eval_x=np.tile(np.arange(W),H-y0)
 fixed_rng=np.random.default_rng(seed+91)
 # Full evaluation is deterministic and excludes training targets from bottom quarter.
 features=masked_window(b,eval_y,eval_x,fixed_rng)
 neural=np.concatenate([painter.logits(features[i:i+4096]).argmax(1) for i in range(0,len(features),4096)])
 expected=b[y0:,:].ravel()
 # The four orthogonal neighbors constitute a simple non-neural baseline.
 context=features.reshape(-1,25,5)[:,[7,11,13,17],:4].sum(1)
 baseline=context.argmax(1)
 fg=expected!=0
 visual=b.copy();visual[y0:,:]=neural.reshape(H-y0,W)
 Image.fromarray(COL[visual],"RGB").save(ROOT/"completion_example.png")
 Image.fromarray(COL[pred_a],"RGB").save(ROOT/"repair_holdout_example.png")
 manifest=json.loads((ROOT/"dataset.json").read_text())
 report={
  "source_images":2,"distinct_characters":1,"color_palette":manifest["palette"],
  "repair":{
   "architecture":"27→64→4 patch MLP, Adam, RGB anti-alias/noise examples",
   "A_dynamic_train_to_B_standing_test":holdout,
   "note":"Cross-pose only, NOT an unseen-character test; nearest-color baseline may be stronger.",
   "training_loss_points":curve
  },
  "pixel_drawing_learning":{
   "architecture":"125→64→4 masked 5x5 color-token MLP",
   "train_area":"upper three-quarters of BOTH poses",
   "test_area":"lower quarter of standing pose",
   "pixel_accuracy":round(float((neural==expected).mean()),5),
   "neighbor_baseline":round(float((baseline==expected).mean()),5),
   "foreground_accuracy":round(float((neural[fg]==expected[fg]).mean()),5),
   "foreground_neighbor_baseline":round(float((baseline[fg]==expected[fg]).mean()),5),
   "foreground_test_pixels":int(fg.sum()),"all_test_pixels":int(len(expected)),
   "training_loss_points":drawcurve,
   "note":"Local masked-pixel learning, not a mature person/scene/prop generation model."
  },
  "model_training_completed":True,"training_steps_per_stage":steps,
  "weights":["repair_weights.npz","pixel_completion_weights.npz"]
 }
 (ROOT/"training_report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print("SYSTEM 02 TRAINED:",json.dumps({"repair_holdout":holdout,
    "completion_foreground":report["pixel_drawing_learning"]["foreground_accuracy"],
    "completion_baseline":report["pixel_drawing_learning"]["foreground_neighbor_baseline"]},ensure_ascii=False))

if __name__=="__main__":main()
