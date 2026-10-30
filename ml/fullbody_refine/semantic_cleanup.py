"""PixelLab: whole-figure palette-cluster cleanup with auditable learned pixel policy.

This is actual REINFORCE contextual-bandit training on synthetic defects.
It is NOT a diffusion model, human preference RL, or semantic understanding.
Every pixel receives a decision state; each altered pixel gets evidence.
"""
from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
import torch
from torch import nn

PAL=np.array([[0,0,0],[57,54,87],[169,186,233],[242,165,194],[255,245,230]],dtype=np.uint8)
ROLES=['transparent','dark mass/outline','blue shadow','pink base color','cream light/skin']
SOURCE='site/pixel-lab/assets/hostess-redraw-v1-192x256.png'
OUT='site/pixel-lab/semantic-output'

def read_source(path):
 a=np.asarray(Image.open(path).convert('RGBA'))
 assert a.shape==(256,192,4) and set(np.unique(a[:,:,3]).tolist())<={0,255}
 lab=np.zeros((256,192),dtype=np.uint8)
 for k in range(1,5):
  lab[(a[:,:,3]==255)&np.all(a[:,:,:3]==PAL[k],axis=2)]=k
 assert (lab!=0).sum()==(a[:,:,3]==255).sum(),"wrong palette"
 return lab

def candidates(a):
 h,w=a.shape;items=[]
 for color in range(1,5):
  components,n=ndi.label(a==color)
  sizes=np.bincount(components.ravel())
  for y in range(80,h-2):
   for x in range(2,w-2):
    if a[y,x]!=color:continue
    sz=int(sizes[components[y,x]])
    if sz>3:continue
    around=a[y-1:y+2,x-1:x+2]
    if not (around>0).all():continue
    counts=np.bincount(around.ravel(),minlength=5)
    counts[color]-=1
    target=int(np.argmax(counts));votes=int(counts[target])
    if target==color or votes<5:continue
    support=int(np.sum(a[y-2:y+3,x-2:x+3]==target))
    if support<12:continue
    features=np.array([1.,votes/8.,min(support,25)/25.,1/sz,
       float(color==1),float(color==4),y/255.,
       float(target==2),float(target==3),float(target==4)],np.float32)
    items.append((x,y,color,target,sz,votes,support,features))
 return items

def corrupt(a,rng,rate=.12):
 changed=rng.random(a.shape)<rate
 b=a.copy()
 b[changed]=rng.integers(0,5,size=int(changed.sum()),dtype=np.uint8)
 return b

def train_policy(a,episodes=95,seed=20261030):
 """True REINFORCE with rewards from synthetic corruption. Not RLHF."""
 torch.set_num_threads(2);torch.manual_seed(seed)
 rng=np.random.default_rng(seed)
 net=nn.Sequential(nn.Linear(10,1))
 with torch.no_grad():
  net[0].weight.zero_();net[0].bias.fill_(-.45);net[0].weight[0,1]=.3
 opt=torch.optim.Adam(net.parameters(),lr=.012)
 history=[]
 for _ in range(episodes):
  damaged=corrupt(a,rng)
  items=candidates(damaged)
  if len(items)<8:continue
  feat=torch.from_numpy(np.stack([c[7] for c in items]))
  prob=net(feat).sigmoid().flatten().clamp(.01,.99)
  action=torch.bernoulli(prob)
  rewards=torch.tensor([6. if a[y,x]==target else -2.
          for x,y,old,target,*_ in items])
  payoff=action*(rewards-.035)
  logp=action*torch.log(prob)+(1-action)*torch.log1p(-prob)
  loss=-(logp*(payoff.detach()-payoff.mean().detach())).mean()
  opt.zero_grad(set_to_none=True);loss.backward();opt.step()
  history.append(float(payoff.detach().mean()))
 return net,dict(episodes=len(history),mean_reward_final_20=round(float(np.mean(history[-20:])),5))

def validate(net,original):
 rng=np.random.default_rng(421688);gains=[];counts=[]
 for _ in range(8):
  damaged=corrupt(original,rng)
  options=candidates(damaged)
  with torch.no_grad():
   probs=net(torch.from_numpy(np.stack([c[7] for c in options]))).sigmoid().flatten().numpy()
  edited=damaged.copy();selected=0
  for c,p in zip(options,probs):
   if p>.57:
    x,y,old,target,*_=c;edited[y,x]=target;selected+=1
  gains.append(float(np.mean(edited==original)-np.mean(damaged==original)))
  counts.append(selected)
 return dict(holdout_synthetic_accuracy_gain=round(float(np.mean(gains)),7),
             mean_accepted_edits=round(float(np.mean(counts)),1))

def components(a):
 result={};total=0
 for c in range(1,5):
  label,n=ndi.label(a[80:]==c)
  size=np.bincount(label.ravel())[1:]
  tiny=int(size[size<=3].sum())
  result[str(c)]={'small_components':int((size<=3).sum()),'pixels_in_small_components':tiny}
  total+=tiny
 return {'by_color':result,'small_component_pixels':total}

def save_native(a,path):
 p=np.zeros((256,3),dtype=np.uint8);p[:5]=PAL
 im=Image.fromarray(a,'P');im.putpalette(p.ravel().tolist())
 im.info['transparency']=0;im.save(path,optimize=True)

def region(y):
 if y<80:return 'HEAD - protected'
 if y<128:return 'upper body/sleeves - approximate location, not verified'
 if y<204:return 'skirt/cloth - approximate location, not verified'
 return 'legs/shoes/tails - approximate location, not verified'

def run(source=SOURCE,out=OUT):
 a=read_source(source);dest=Path(out);dest.mkdir(parents=True,exist_ok=True)
 net,learn=train_policy(a)
 holdout=validate(net,a)
 options=candidates(a)
 with torch.no_grad():
  scores=net(torch.from_numpy(np.stack([c[7] for c in options]))).sigmoid().flatten().numpy()
 b=a.copy();edits=[];rejected=0
 for c,prob in zip(options,scores):
  x,y,old,new,sz,votes,support,_=c
  if prob<=.57:rejected+=1;continue
  b[y,x]=new
  edits.append(dict(x=int(x),y=int(y),before=int(old),after=int(new),
    before_role=ROLES[old],after_role=ROLES[new],region_hypothesis=region(y),
    region_verified=False,component_pixels=int(sz),neighbor_votes=int(votes),
    surrounding_support=int(support),policy_score=round(float(prob),4),
    evidence='4-connected cluster <=3px, 3x3 opaque, >=5/8 neighbors same replacement, 5x5 support >=12',
    actual_object_semantics_known=False))
 if not np.array_equal(a[:80],b[:80]):raise AssertionError('head changed')
 if not np.array_equal(a>0,b>0):raise AssertionError('figure outline changed')
 before=components(a);after=components(b)
 if not 12<=len(edits)<=450:raise AssertionError('unexpected change count '+str(len(edits)))
 if after['small_component_pixels']>=before['small_component_pixels']:
  raise AssertionError('No measurable tiny-component improvement')
 if holdout['holdout_synthetic_accuracy_gain']<=0:
  raise AssertionError('RL policy failed blinded synthetic corruption evaluation')
 save_native(a,dest/'source_native.png')
 save_native(b,dest/'refined_native.png')
 Image.open(dest/'refined_native.png').resize((384,512),Image.Resampling.NEAREST).save(dest/'refined_preview_384x512.png')
 heat=np.zeros((256,192,4),dtype=np.uint8);heat[a!=b]=[242,165,194,255]
 Image.fromarray(heat,'RGBA').save(dest/'changes.png')
 # Full coverage of all 49,152 pixels: background, preserved unverified,
 # protected head, protected edge or evidence-backed changed pixel.
 audit=np.zeros(a.shape,dtype=np.uint8);audit[a>0]=1
 audit[:80][a[:80]>0]=2
 for y in range(80,256):
  for x in range(1,191):
   if a[y,x]>0 and not (a[y-1:y+2,x-1:x+2]>0).all():audit[y,x]=3
 audit[a!=b]=4
 ap=np.zeros((256,3),np.uint8)
 ap[:5]=[[0,0,0],[169,186,233],[242,165,194],[255,245,230],[57,54,87]]
 im=Image.fromarray(audit,'P');im.putpalette(ap.ravel().tolist());im.save(dest/'pixel-audit-map.png')
 (dest/'edit-reasons.json').write_text(json.dumps(dict(accepted=edits,rejected_count=rejected),ensure_ascii=False,indent=2))
 report=dict(algorithm='constrained color clusters + REINFORCE contextual bandit',
    trained_policy=True,diffusion_trained=False,
    training_data='one character and synthetic damage; no supervised artist-corrected pairs',
    native_grid=[192,256],preview_grid=[384,512],no_new_detail_from_resize=True,
    total_pixels=int(a.size),figure_pixels=int((a>0).sum()),native_changed_pixels=len(edits),
    silhouette_preserved=True,head_preserved=True,art_approved=False,
    semantic_understanding_achieved=False,
    source_sha256=hashlib.sha256(a.tobytes()).hexdigest(),
    result_sha256=hashlib.sha256(b.tobytes()).hexdigest(),
    clusters_before=before,clusters_after=after,training=learn,holdout=holdout,
    decision_map='pixel-audit-map.png',edit_ledger='edit-reasons.json',
    audit_categories={'0':'transparent','1':'preserved/semantic unknown',
      '2':'protected head band','3':'protected contour','4':'edited with cluster evidence'},
    limitations='No model can infer actual object meaning of every pixel from one sample. All changed clusters require artist approval.')
 (dest/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 torch.save({'weights':net.state_dict(),'method':'contextual_bandit_reinforce'},dest/'bandit-policy.pt')
 print(json.dumps({'changed':len(edits),'before':before['small_component_pixels'],
 'after':after['small_component_pixels'],**holdout},ensure_ascii=False),flush=True)
 return report

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--source',default=SOURCE)
 parser.add_argument('--out',default=OUT);args=parser.parse_args();run(args.source,args.out)
