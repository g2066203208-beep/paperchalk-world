"""Train a small pixel-part classifier from an artist-authored FULL BODY label map.

Supervision comes from ONE manually authored pink-haired hostess. This is not
a general-purpose character segmenter or a new character generator. Noise and
crop validation share the identity and must not be called held-out identities.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
import torch
from torch import nn
from torch.nn import functional as F

ROOT=Path('site/pixel-lab/structured-gold')
PALETTE=np.array([[0,0,0,0],[57,54,87,255],[242,165,194,255],[169,186,233,255],[255,245,230,255]],np.uint8)
class PartNet(nn.Module):
 def __init__(self):
  super().__init__()
  self.blocks=nn.Sequential(
   nn.Conv2d(7,32,3,padding=1),nn.GELU(),
   nn.Conv2d(32,32,3,padding=2,dilation=2),nn.GELU(),
   nn.Conv2d(32,32,3,padding=4,dilation=4),nn.GELU(),
   nn.Conv2d(32,32,3,padding=1),nn.GELU(),
   nn.Conv2d(32,10,1))
 def forward(self,colors):
  n,h,w=colors.shape
  one=F.one_hot(colors.long(),5).permute(0,3,1,2).float()
  x=torch.linspace(-1,1,w,device=colors.device)[None,None,None,:].expand(n,1,h,w)
  y=torch.linspace(-1,1,h,device=colors.device)[None,None,:,None].expand(n,1,h,w)
  return self.blocks(torch.cat([one,x,y],dim=1))

def train(steps=240):
 torch.set_num_threads(2);torch.manual_seed(20261030)
 rng=np.random.default_rng(20261030)
 img=np.asarray(Image.open(ROOT/'hostess_gold_native_192x256.png').convert('RGBA'))
 colors=np.zeros((256,192),np.uint8)
 for i in range(1,5):
  colors[np.all(img==PALETTE[i],axis=-1)]=i
 label=np.asarray(Image.open(ROOT/'parts-index.png'))
 assert np.all((colors>0)==(label>0)) and len(np.unique(label))==10
 def damage(a,rng):
  x=a.copy()
  mask=rng.random(a.shape)<rng.uniform(.01,.07)
  x[mask]=rng.integers(0,5,size=int(mask.sum()),dtype=np.uint8)
  return x
 model=PartNet();opt=torch.optim.AdamW(model.parameters(),lr=.002,weight_decay=.0001)
 history=[]
 for step in range(steps):
  patches=[];targets=[]
  for _ in range(4):
   x=int(rng.integers(0,128));y=int(rng.integers(0,192))
   patches.append(damage(colors[y:y+64,x:x+64],rng))
   targets.append(label[y:y+64,x:x+64])
  a=torch.from_numpy(np.stack(patches).astype(np.int64))
  b=torch.from_numpy(np.stack(targets).astype(np.int64))
  predicted=model(a)
  loss=F.cross_entropy(predicted,b)
  opt.zero_grad();loss.backward();opt.step()
  if step in {0,steps//2,steps-1}:history.append([step+1,round(float(loss.item()),5)])
 model.eval();hold=np.random.default_rng(89828)
 with torch.no_grad():
  all_acc=[];foreground=[]
  for _ in range(8):
   noisy=damage(colors,hold)
   pred=model(torch.from_numpy(noisy.astype(np.int64))[None]).argmax(1).squeeze(0).numpy()
   all_acc.append(float((pred==label).mean()))
   foreground.append(float((pred[label>0]==label[label>0]).mean()))
  pred=model(torch.from_numpy(colors.astype(np.int64))[None]).argmax(1).squeeze(0).numpy().astype('uint8')
 Image.fromarray(pred,'L').save(ROOT/'parts-model-prediction.png',optimize=True)
 torch.save({'architecture':'PartNet','state_dict':model.state_dict(),'steps':steps},ROOT/'parts-model.pt')
 metrics={'trained':True,'model':'pixel-palette-and-global-coordinates 10-part segmentation CNN',
  'data':'one artist-authored fullbody and synthetic damage, NO independent identity test',
  'trained_steps':steps,'loss':history,'regions':10,
  'independent_training_identities':1,
  'synthetic_corruption_accuracy':round(float(np.mean(all_acc)),4),
  'synthetic_foreground_accuracy':round(float(np.mean(foreground)),4),
  'whole_gold_same_identity_accuracy':round(float((pred==label).mean()),4),
  'not_general_purpose_semantic_understanding':True,
  'not_art_approved':True,
  'limitations':'Image and body-part labels come from one designed figure. Predictions on original AI mother painting would be out of distribution and are not used to overwrite it.'}
 (ROOT/'parts-ml-report.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2),encoding='utf8')
 print(json.dumps(metrics),flush=True)
 return metrics
if __name__=='__main__':train()
