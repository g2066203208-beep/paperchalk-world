"""Train a genuine full-figure generative VAE and SAMPLE novel pixel images.
No input reference image is passed to decoder sampling. First CPU-quality pilot.
Requires 500-image licensed dataset; filters and trains 96x128 whole figures.
384x512 PNGs are honest nearest-neighbour enlargements, NOT native 384 details.
"""
from __future__ import annotations
import argparse,hashlib,io,json,random,re,time
from pathlib import Path
import numpy as np
from PIL import Image
import torch
from torch import nn
from torch.nn import functional as F

OUT=Path('site/pixel-lab/fullbody-generated')
COL=np.array([[57,54,87],[242,165,194],[169,186,233],[255,245,230]],dtype=np.uint8)
DATASET='Limbicnation/pixel-art-character'
REVISION='aa83392'
SIZE=(96,128);EXPORT=(384,512)
HUMANS=re.compile(r'\b(?:knight|wizard|mage|ninja|archer|thief|prince|princess|queen|king|pirate|cleric|ranger|merchant|villager|warrior|samurai|monk|fighter|soldier|bard|druid|rogue|witch|paladin|explorer|assassin|guard|warlock)\b',re.I)
EXCLUDE=re.compile(r'\b(?:nsfw|nude|naked|blood|gore|succubus|demon|vampire|zombie|werewolf|skeleton|wolf|dragon|griffin|unicorn|bear|lion|troll|orc|ghost|mutant|robot|goblin|phoenix|fairy|angel|monster|beast|horns|fangs|seductive|sexy|erotic)\b',re.I)
POSES={'running':r'\brunning\b|charging forward|walking animation|\bwalking\b',
 'jumping':r'\bjumping\b|\bfloating\b|\bmid.air\b',
 'casting':r'casting a spell|\bcasting\b|\bwand\b',
 'combat':r'attacking|defensive|battle stance|ready for combat|holding (?:sword|dagger|spear|axe|mace|shield|bow)',
 'resting':r'meditating|standing|idle pose|standing tall'}
def pose_for(t):
 for p,s in POSES.items():
  if re.search(s,t,re.I):return p
 return 'other'
def tokens(image):
 im=image.convert('RGBA');p=np.asarray(im);mask=p[:,:,3]>50
 if mask.sum()<1600:raise ValueError('invalid foreground')
 yy,xx=np.where(mask)
 crop=im.crop((max(0,int(xx.min())-4),max(0,int(yy.min())-4),min(im.width,int(xx.max())+5),min(im.height,int(yy.max())+5)))
 crop.thumbnail((82,116),Image.Resampling.LANCZOS)
 canvas=Image.new('RGBA',SIZE,tuple(COL[0])+(255,))
 canvas.alpha_composite(crop,((SIZE[0]-crop.width)//2,(SIZE[1]-crop.height)//2))
 rgb=np.asarray(canvas.convert('RGB'),dtype=np.int32)
 d=((rgb[:,:,None,:]-COL.astype(np.int32)[None,None,:,:])**2).sum(-1)
 ix=d.argmin(-1).astype(np.uint8)
 if (ix!=0).sum()<400:raise ValueError('missing subject')
 return ix
def load_data(limit):
 from huggingface_hub import hf_hub_download
 import pyarrow.parquet as pq
 path=hf_hub_download(repo_id=DATASET,repo_type='dataset',revision=REVISION,filename='data/train-00000-of-00001.parquet')
 rows=pq.read_table(path,columns=['image','text','file_name']).to_pylist()
 out=[];seen=set()
 for row in rows:
  text=row['text'];blob=row['image']['bytes']
  if not HUMANS.search(text) or EXCLUDE.search(text) or not blob:continue
  try:ix=tokens(Image.open(io.BytesIO(blob)))
  except Exception:continue
  sha=hashlib.sha256(ix.tobytes()).hexdigest()
  if sha in seen:continue
  seen.add(sha)
  out.append({'pose':pose_for(text),'name':row['file_name'],'image':ix,'hash':sha})
  if len(out)>=limit:break
 if len(out)<75:raise RuntimeError('Insufficient clean complete characters: '+str(len(out)))
 return out
class FigureVAE(nn.Module):
 def __init__(self,c=32,z=16):
  super().__init__()
  self.encoder=nn.Sequential(nn.Conv2d(4,c,3,2,1),nn.SiLU(),nn.Conv2d(c,c*2,3,2,1),nn.SiLU(),nn.Conv2d(c*2,c*2,3,2,1),nn.SiLU(),nn.Conv2d(c*2,c*3,3,2,1),nn.SiLU())
  self.mu=nn.Conv2d(c*3,z,1);self.logvar=nn.Conv2d(c*3,z,1)
  self.decoder=nn.Sequential(nn.Conv2d(z,c*3,3,padding=1),nn.SiLU(),nn.Upsample(scale_factor=2,mode='nearest'),
   nn.Conv2d(c*3,c*2,3,padding=1),nn.SiLU(),nn.Upsample(scale_factor=2,mode='nearest'),
   nn.Conv2d(c*2,c*2,3,padding=1),nn.SiLU(),nn.Upsample(scale_factor=2,mode='nearest'),
   nn.Conv2d(c*2,c,3,padding=1),nn.SiLU(),nn.Upsample(scale_factor=2,mode='nearest'),nn.Conv2d(c,4,3,padding=1))
 def encode(self,y):
  h=self.encoder(F.one_hot(y.long(),4).permute(0,3,1,2).float())
  return self.mu(h),self.logvar(h).clamp(-7,4)
 def forward(self,y):
  mu,lv=self.encode(y);z=mu+torch.randn_like(mu)*torch.exp(.5*lv)
  return self.decoder(z),mu,lv
@torch.no_grad()
def generate(net,train,pose,seed,n=4):
 # Unseen stochastic latent, sampled from fitted same-action posterior moments;
 # no image pixels, template bodies or source-pose copies fed to the decoder.
 group=[x for x in train if x['pose']==pose]
 if len(group)<6:group=train
 mus=[]
 for i in range(0,len(group),32):
  y=torch.from_numpy(np.stack([e['image'] for e in group[i:i+32]]).astype(np.int64))
  m,_=net.encode(y);mus.append(m)
 q=torch.cat(mus,dim=0)
 mean=q.mean(0);std=q.std(0).clamp_min(.1)
 rng=np.random.default_rng(seed);res=[]
 for k in range(n):
  z=mean+std*torch.from_numpy(rng.standard_normal(mean.shape).astype(np.float32))*.82
  pred=net.decoder(z[None]).argmax(1).squeeze(0).numpy().astype(np.uint8)
  res.append(pred)
 return res,len(group)
def run(steps=1150,limit=330):
 torch.set_num_threads(2);torch.manual_seed(20261030);np.random.seed(20261030)
 data=load_data(limit);random.Random(20261030).shuffle(data)
 n=max(8,len(data)//10);train,holdout=data[:-n],data[-n:]
 arr=np.stack([x['image'] for x in train])
 model=FigureVAE();opt=torch.optim.AdamW(model.parameters(),lr=.00085,weight_decay=.0001)
 OUT.mkdir(parents=True,exist_ok=True);history=[]
 for step in range(steps):
  y=torch.from_numpy(arr[np.random.randint(len(arr),size=10)].astype(np.int64))
  pred,mu,lv=model(y)
  weights=torch.where(y==0,.48,2.15)
  ce=(F.cross_entropy(pred,y,reduction='none')*weights).mean()
  kl=(-.5*(1+lv-mu.square()-lv.exp())).mean()
  loss=ce+.009*kl
  opt.zero_grad(set_to_none=True);loss.backward();nn.utils.clip_grad_norm_(model.parameters(),1.5);opt.step()
  if step in (0,steps//4,steps//2,3*steps//4,steps-1):
   history.append({'step':step+1,'loss':round(float(loss.item()),5),'reconstruction_ce':round(float(ce.item()),5),'kl':round(float(kl.item()),5)})
 model.eval()
 poses=[p for p in ('resting','running','jumping','casting','combat') if sum(x['pose']==p for x in train)>=6]
 if len(poses)<3:raise RuntimeError('Not enough body poses: '+str(poses))
 results=[];seen=set();inputs={x['hash'] for x in data}
 for group,pose in enumerate(poses):
  examples,pool=generate(model,train,pose,seed=440+group,n=5)
  for a in examples[:3]:
   sha=hashlib.sha256(a.tobytes()).hexdigest()
   if sha in inputs or sha in seen:continue
   fg=float((a!=0).mean())
   if fg<.012 or fg>.6:continue
   seen.add(sha);number=len(results);name=f'generated_{number:02d}.png'
   Image.fromarray(COL[a],'RGB').resize(EXPORT,Image.Resampling.NEAREST).save(OUT/name,optimize=True)
   results.append({'file':name,'pose_condition':pose,'seed':440+group,'pose_training_examples':pool,
    'sha256':sha,'foreground_fraction':round(fg,4),'native_grid':[96,128]})
 if len(results)<9:raise RuntimeError('Less than 9 nonduplicate real decoder samples: '+str(len(results)))
 cols=5;rows=(len(results)+cols-1)//cols
 sheet=Image.new('RGB',(384*cols,512*rows),tuple(COL[0]))
 for i,x in enumerate(results):sheet.paste(Image.open(OUT/x['file']),((i%cols)*384,(i//cols)*512))
 sheet.save(OUT/'contact.png',optimize=True)
 report={'trained':True,'pipeline':'full_figure_stochastic_vae_v1','training_on_complete_fullbody':True,
  'samples_are_decoder_only':True,'sampling_uses_no_original_image_pixels':True,
  'trained_grid':[96,128],'export_grid':[384,512],'export_is_nearest_neighbor_4x':True,
  'native_384_detail_learned':False,'data_source':DATASET,'dataset_revision':REVISION,
  'license':'Apache-2.0 as declared by dataset author','training_examples':len(train),'heldout_examples':len(holdout),
  'pose_groups':poses,'steps':steps,'loss':history,'generated_fullbody_count':len(results),
  'approved_for_game':0,'generated':results,'limitations':[
  'CPU pilot; artistic quality and anatomy need manual inspection.',
  'Output PNG grid 384x512 is upscaled from learned 96x128 and cannot claim original fine details.',
  'Training dataset is synthetic, imperfect and has provenance uncertainty; only SFW-caption filtering was automatic.',
  'Pose labels are weak captions rather than joint-controlled rigging.',
  'New checksums do not prove artistic originality or playable animations.']}
 (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
 torch.save({'state_dict':model.state_dict(),'steps':steps,'architecture':'FigureVAE'},OUT/'fullbody-generative-vae.pt')
 print(json.dumps({'result':'GENERATED','train_images':len(train),'poses':poses,'generated':len(results)},ensure_ascii=False),flush=True)
 return report
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--steps',type=int,default=1150);p.add_argument('--limit',type=int,default=330)
 a=p.parse_args();run(a.steps,a.limit)
