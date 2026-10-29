#!/usr/bin/env python3
"""CC0-only CURATED 16x16 CHARACTER training — no tiles, no resized illustrations.
Download is opt-in per verified creator/page. Exact frame geometry, dedup and
manifest provenance are recorded. Explicitly trains an unsupervised categorical
variational autoencoder (VAE) and a reward-optimised latent policy.
No claim that the resulting sprites reach professional artist quality.
"""
from __future__ import annotations
import collections, hashlib, io, json, math, os, random, time, urllib.request, zipfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT=Path('ml/characters')
SITE=Path('site/pixel-lab')
CACHED=ROOT/'cache'
N=16
K=8
D=256*K
LATENT=20
HIDDEN=80
SEED=20261029

# Each entry corresponds to a separately reviewed CC0 page, not web-scraping
# arbitrary asset-pack downloads. Only sheets consisting of character frames.
SOURCES=[
 {'id':'rpg8','author':'devurandom','kind':'grid','source':'https://opengameart.org/content/16x16-8-bit-rpg-character-set',
  'url':'https://opengameart.org/sites/default/files/rpg_16x16_0.png'},
 {'id':'base','author':'zaphgames','kind':'grid','source':'https://opengameart.org/content/simple-character-base-16x16',
  'url':'https://opengameart.org/sites/default/files/character_base_16x16_0.png'},
 {'id':'sara','author':'nightgane','kind':'grid','source':'https://opengameart.org/content/oga-sara-16x16-1bit-color',
  'url':'https://opengameart.org/sites/default/files/sara_16x16_1bit_and_color_spritesheet_cc0_0.png'},
 {'id':'male','author':'Unnamed','kind':'grid','source':'https://opengameart.org/content/16x16-base-sprites',
  'url':'https://opengameart.org/sites/default/files/base_male.png'},
 {'id':'female','author':'Unnamed','kind':'grid','source':'https://opengameart.org/content/16x16-base-sprites',
  'url':'https://opengameart.org/sites/default/files/base_female.png'},
 {'id':'hero','author':'Cough-E','kind':'grid','source':'https://lpc.opengameart.org/content/base-character-spritesheet-16x16',
  'url':'https://lpc.opengameart.org/sites/default/files/Hero.png'},
 {'id':'bit-era','author':'Pav Creations','kind':'grid','source':'https://opengameart.org/content/a-cute-little-game-character-from-bit-era',
  'url':'https://opengameart.org/sites/default/files/main-character-4_0.png'},
 {'id':'rpgaction','author':'Bennyboi_hack','kind':'grid','source':'https://opengameart.org/content/basic-16x16-character-sprites-4-directional',
  'url':'https://opengameart.org/sites/default/files/sprites_24.png'},
 {'id':'princess','author':'OpenGameArt contributor','kind':'grid','source':'https://github.com/Tiddybub/2d-assets/tree/main/characters/oga-miss-princess-animated-16x16',
  'url':'https://raw.githubusercontent.com/Tiddybub/2d-assets/main/characters/oga-miss-princess-animated-16x16/missprincess.png'},
 {'id':'ninja','author':'Pixel-Boy','kind':'grid','source':'https://github.com/pixel-boy/NinjaAdventure',
  'url':'https://raw.githubusercontent.com/pixel-boy/NinjaAdventure/main/content/character/ninja_blue/sprite.png'},
 {'id':'samurai','author':'Pixel-Boy','kind':'grid','source':'https://github.com/pixel-boy/NinjaAdventure',
  'url':'https://raw.githubusercontent.com/pixel-boy/NinjaAdventure/main/content/character/samurai_blue/sprite.png'},
 {'id':'cozy','author':'IshtartPixels','kind':'archive','source':'https://opengameart.org/content/cozy-asset-pack-10',
  'url':'https://opengameart.org/sites/default/files/ishtar_pixels_cozy_pack_1.0.zip'},
 {'id':'person-16','author':'pboop','kind':'grid','source':'https://opengameart.org/content/16x16-person-sprite',
  'url':'https://opengameart.org/sites/default/files/person_sprite_sheet.png'},
 {'id':'furkan-50','author':'Furkan Duran','kind':'minis_archive','source':'https://opengameart.org/content/16x16-mini-characters',
  'url':'https://opengameart.org/sites/default/files/Minis%20_1.zip'},
 {'id':'grafxkid','author':'GrafxKid','kind':'grid','source':'https://opengameart.org/content/rpg-character-sprites',
  'url':'https://opengameart.org/sites/default/files/RPG_assets.png'},
 {'id':'mage','author':'saint11','kind':'grid','source':'https://opengameart.org/content/16x16-mage',
  'url':'https://opengameart.org/sites/default/files/mage.png'},
 {'id':'putting','author':'patvanmackelberg','kind':'grid','source':'https://opengameart.org/content/16x16-characters-putting-animation',
  'url':'https://opengameart.org/sites/default/files/Putt%20Putt%20Chars.png'},
 {'id':'man','author':'dutzy','kind':'grid','source':'https://opengameart.org/content/man-sprite-16x16',
  'url':'https://opengameart.org/sites/default/files/villager.png'},
]
# All sources individually CC0; reuse of other packs is forbidden unless audited.
for s in SOURCES:s['license']='CC0-1.0'

def fetch(source):
 CACHED.mkdir(parents=True,exist_ok=True)
 url=source['url']
 ext='.zip' if source['kind'] in ('archive','minis_archive') else '.png'
 dest=CACHED/(source['id']+ext)
 if dest.exists() and dest.stat().st_size>200:return dest.read_bytes()
 last=None
 for attempt in range(3):
  try:
   req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (PixelLab educational CC0 art analysis)'})
   with urllib.request.urlopen(req,timeout=28) as response:
    data=response.read(12_000_000)
   if len(data)<100:raise ValueError('file too small')
   if ext=='.zip':
    if not zipfile.is_zipfile(io.BytesIO(data)):raise ValueError('not zip')
   elif not data[:8]==b'\x89PNG\r\n\x1a\n':raise ValueError('not PNG')
   dest.write_bytes(data)
   return data
  except Exception as e:
   last=e;time.sleep(.25*(attempt+1))
 print('SOURCE UNAVAILABLE:',source['id'],repr(last),flush=True)
 return None

def normalize(img):
 arr=np.array(img.convert('RGBA'),dtype=np.uint8)
 # Some spritesheets use an opaque uniform magenta/chroma-key background.
 corners=np.array([arr[0,0],arr[0,-1],arr[-1,0],arr[-1,-1]])
 key=corners[0]
 if np.all(corners[:,:3]==key[:3]) and key[3]==255:
  rgb=key[:3]
  # Treat only conspicuous exact sheet-wide flat backdrops as transparent.
  matches=np.all(arr[:,:,:3]==rgb,axis=2)
  if matches.mean()>.22 and (int(rgb.max())-int(rgb.min())>115 or rgb.max()<38):
   arr[matches]=[0,0,0,0]
 arr[arr[:,:,3]<128]=[0,0,0,0]
 arr[arr[:,:,3]>=128,3]=255
 return arr

def frames(s,data):
 try:
  if s['kind']=='grid':
   img=Image.open(io.BytesIO(data))
   w,h=img.size
   if w%16 or h%16 or w>1024 or h>1024:
    raise ValueError('not a clean 16px grid: '+str(img.size))
   arr=normalize(img)
   for row in range(h//16):
    for col in range(w//16):
     yield f'{s["id"]}:{row}:{col}',arr[row*16:(row+1)*16,col*16:(col+1)*16].copy()
  else:
   archive=zipfile.ZipFile(io.BytesIO(data))
   if s['kind']=='minis_archive':
    print('ARCHIVE AUDIT',s['id'],[m.filename for m in archive.infolist() if m.filename.lower().endswith('.png')][:35],flush=True)
   for member in archive.infolist():
    name=member.filename.lower()
    if not name.endswith('.png') or member.file_size>2_000_000:continue
    if s['kind']=='minis_archive':
     # This archive also contains weapons and attacks. Reject such paths.
     if any(x in name for x in ('weapon','axe','sword','spear','wand','bow','dagger','pistol','rapier','crystal',
                               'attack','preview','showcase','sample','tileset','background','effect')):
      continue
    elif not any(x in name for x in ('character','npc','player','hero','people','person','sprite')):
     continue
    if any(x in name for x in ('preview','logo','tile','map','sample','background')):continue
    try:
     img=Image.open(io.BytesIO(archive.read(member)))
     w,h=img.size
     if w%16 or h%16 or w>1024 or h>1024:continue
     arr=normalize(img)
     for row in range(h//16):
      for col in range(w//16):
       yield f'{s["id"]}:{member.filename}:{row}:{col}',arr[row*16:(row+1)*16,col*16:(col+1)*16].copy()
    except Exception:continue
 except Exception as e:
  print('UNSUPPORTED SOURCE',s['id'],str(e),flush=True)

def largest_connected(mask):
 if not np.any(mask):return 0
 seen=np.zeros_like(mask,bool);best=0
 for y in range(16):
  for x in range(16):
   if not mask[y,x] or seen[y,x]:continue
   stack=[(y,x)];seen[y,x]=True;count=0
   while stack:
    yy,xx=stack.pop();count+=1
    for y2,x2 in [(yy-1,xx),(yy+1,xx),(yy,xx-1),(yy,xx+1)]:
     if 0<=y2<16 and 0<=x2<16 and mask[y2,x2] and not seen[y2,x2]:
      seen[y2,x2]=True;stack.append((y2,x2))
   best=max(best,count)
 return best

def acceptable(arr):
 mask=arr[:,:,3]>0
 area=int(mask.sum())
 if not 18<=area<=225:return False
 ys,xs=np.where(mask)
 if xs.max()-xs.min()<3 or ys.max()-ys.min()<5:return False
 if largest_connected(mask)<area*.65:return False
 if len(np.unique(arr[mask,:3],axis=0))<2:return False
 return True

def collect():
 data=[];records=[];stats=[];seen=set();selected_sources=set()
 for source in SOURCES:
  raw=fetch(source)
  count=0
  if raw:
   for ref,arr in frames(source,raw):
    if not acceptable(arr):continue
    key=hashlib.sha256(arr.tobytes()).hexdigest()
    if key in seen:continue
    seen.add(key);data.append(arr);records.append({'source_id':source['id'],'sprite_ref':ref,'sha256':key})
    count+=1
  stats.append({'id':source['id'],'author':source['author'],'source':source['source'],
    'license':source['license'],'url':source['url'],'raw_sha256':hashlib.sha256(raw).hexdigest() if raw else None,
    'accepted_frames':count,'status':'included' if count else 'unavailable-or-empty'})
  if count:selected_sources.add(source['id'])
  print('CURATED',source['id'],count,'accepted true 16x16 character frames',flush=True)
 if len(data)<65 or len(selected_sources)<4:
  raise RuntimeError(f'Only {len(data)} character frames from {len(selected_sources)} sources. No fake or mismatched source fallback.')
 return np.stack(data),records,stats

def to_roles(images):
 # Per-character luminosity rank: color 0 is transparent, 1..7 dark-to-light.
 # Avoids confusing red clothing of one artist with the blue clothes of another.
 encoded=[];palettes=[]
 for img in images:
  mask=img[:,:,3]>0
  pix=img[mask,:3]
  colors,count=np.unique(pix,axis=0,return_counts=True)
  order=np.argsort(count)[::-1]
  chosen=colors[order[:K-1]].astype(np.float32)
  if not len(chosen):continue
  weights=np.array([.2126,.7152,.0722])
  chosen=chosen[np.argsort(chosen@weights)]
  if len(chosen)<K-1:
   chosen=np.concatenate([chosen,np.repeat(chosen[-1:],K-1-len(chosen),axis=0)],axis=0)
  diff=((img[:,:,:3].astype(np.float32)[:,:,None,:]-chosen[None,None,:,:])**2).sum(-1)
  tokens=diff.argmin(-1).astype(np.uint8)+1
  tokens[~mask]=0
  encoded.append(tokens)
  palettes.append(np.concatenate([np.zeros((1,3),np.float32),chosen],axis=0).astype(np.uint8))
 return np.stack(encoded),np.stack(palettes)

def render(sprite,palette):
 out=np.zeros((16,16,4),np.uint8)
 for value in range(1,K):
  m=sprite==value
  out[m,:3]=palette[value]
  out[m,3]=255
 return Image.fromarray(out,'RGBA')

def contact(arrays,palettes,path,title,cols=12):
 n=len(arrays);tile=80;header=31;rows=math.ceil(n/cols)
 sheet=Image.new('RGB',(cols*tile,header+rows*tile),(23,32,41))
 d=ImageDraw.Draw(sheet)
 d.text((9,9),title,fill=(205,229,220))
 for i,(sprite,palette) in enumerate(zip(arrays,palettes)):
  img=render(sprite,palette).resize((64,64),Image.Resampling.NEAREST)
  x=(i%cols)*tile+8;y=header+(i//cols)*tile+8
  d.rectangle([x-2,y-2,x+65,y+65],fill=(51,65,74))
  sheet.paste(img,(x,y),img)
 path.parent.mkdir(parents=True,exist_ok=True)
 sheet.save(path)

def make_split(records):
 # No leakage across animation frames of the same source in validation.
 # Hold out complete sources where possible.
 ids=sorted(set(r['source_id'] for r in records))
 rng=random.Random(SEED);rng.shuffle(ids)
 sizes=collections.Counter(r['source_id'] for r in records)
 held=set()
 for source in ids:
  if sum(sizes[x] for x in held)>=max(10,len(records)//6):break
  if len(records)-sum(sizes[x] for x in held)-sizes[source]>=45:
   held.add(source)
 train=np.array([i for i,r in enumerate(records) if r['source_id'] not in held],np.int32)
 val=np.array([i for i,r in enumerate(records) if r['source_id'] in held],np.int32)
 if len(val)<8 or len(train)<45:
  raise RuntimeError('not enough source-disjoint sprites for train/validation')
 return train,val,sorted(held)

def softmax(a):
 a=a-a.max(axis=-1,keepdims=True)
 e=np.exp(a);return e/e.sum(axis=-1,keepdims=True)

def training(tokens,trainidx,validx,steps):
 rng=np.random.default_rng(SEED)
 p={}
 def init(k,shape,scale=.04):p[k]=rng.normal(0,scale,shape).astype(np.float32)
 init('w1',(D,HIDDEN));init('wm',(HIDDEN,LATENT));init('wv',(HIDDEN,LATENT))
 init('w2',(LATENT,HIDDEN));init('w3',(HIDDEN,D))
 for k,n in [('b1',HIDDEN),('bm',LATENT),('bv',LATENT),('b2',HIDDEN),('b3',D)]:
  p[k]=np.zeros(n,np.float32)
 m={k:np.zeros_like(v) for k,v in p.items()}
 v={k:np.zeros_like(v) for k,v in p.items()}
 alltokens=np.eye(K,dtype=np.float32)[tokens].reshape(-1,D)
 record=[]
 for step in range(1,steps+1):
  index=rng.choice(trainidx,size=64,replace=True)
  x=alltokens[index]
  u=x@p['w1']+p['b1'];h=np.maximum(0,u)
  mean=h@p['wm']+p['bm'];lv=np.clip(h@p['wv']+p['bv'],-5,3)
  noise=rng.normal(size=mean.shape).astype(np.float32)
  sigma=np.exp(.5*lv);z=mean+sigma*noise
  v2=z@p['w2']+p['b2'];h2=np.maximum(0,v2)
  output=(h2@p['w3']+p['b3']).reshape(-1,256,K)
  prob=softmax(output)
  y=tokens[index].reshape(-1,256)
  cross=-np.log(np.maximum(prob[np.arange(len(y))[:,None],np.arange(256)[None,:],y],1e-8)).mean()
  kl=(-.5*(1+lv-mean*mean-np.exp(lv))).sum(1).mean()
  beta=.004
  grad=prob
  grad[np.arange(len(y))[:,None],np.arange(256)[None,:],y]-=1
  grad=grad.reshape(-1,D)/(len(y)*256)
  g={}
  g['w3']=h2.T@grad;g['b3']=grad.sum(0)
  dh2=(grad@p['w3'].T)*(v2>0)
  g['w2']=z.T@dh2;g['b2']=dh2.sum(0)
  dz=dh2@p['w2'].T
  dmean=dz+beta*mean/len(y)
  dlv=dz*(.5*sigma*noise)+beta*(np.exp(lv)-1)*.5/len(y)
  g['wm']=h.T@dmean;g['bm']=dmean.sum(0)
  g['wv']=h.T@dlv;g['bv']=dlv.sum(0)
  dh=(dmean@p['wm'].T+dlv@p['wv'].T)*(u>0)
  g['w1']=x.T@dh;g['b1']=dh.sum(0)
  lr=.0019
  for key in p:
   gradient=np.clip(g[key],-2,2)
   m[key]=.9*m[key]+.1*gradient
   v[key]=.999*v[key]+.001*gradient**2
   p[key]-=lr*(m[key]/(1-.9**step))/(np.sqrt(v[key]/(1-.999**step))+1e-8)
  if step==1 or step%50==0 or step==steps:
   record.append({'step':step,'recon_ce':round(float(cross),4),'kl':round(float(kl),4)})
   print('CHARACTER VAE',step,'/',steps,'recon_ce',round(float(cross),4),'kl',round(float(kl),3),flush=True)
 def eval_split(idx):
  x=alltokens[idx]
  h=np.maximum(0,x@p['w1']+p['b1'])
  mean=h@p['wm']+p['bm']
  out=decode(p,mean,temperature=1.0,sample=False)
  return float((out==tokens[idx]).mean())
 return p,record,{'train_reconstruction_accuracy':round(eval_split(trainidx),4),
  'source_disjoint_validation_accuracy':round(eval_split(validx),4)}

def decode(p,z,temperature=.8,sample=True,rng=None):
 h=np.maximum(0,z@p['w2']+p['b2'])
 logits=(h@p['w3']+p['b3']).reshape(-1,256,K)
 if sample:
  rng=rng or np.random.default_rng()
  pr=softmax(logits/max(.1,temperature))
  cdf=np.cumsum(pr,axis=-1)
  vals=(rng.random((len(z),256,1))>cdf).sum(-1)
 else:
  vals=logits.argmax(-1)
 return vals.reshape(-1,16,16).astype(np.uint8)

def quality(sprite,reference):
 fg=sprite>0;area=int(fg.sum())
 if area<18 or area>235:return -3.
 connected=largest_connected(fg)/max(1,area)
 rows=fg.sum(1)
 top=int(rows[2:8].sum());bottom=int(rows[8:15].sum())
 palette=len(np.unique(sprite[fg]))
 simplicity=(fg[:,:1].sum()+fg[:,15:].sum())/max(1,area)
 # Encourage recognisable connected body silhouettes. This is a handcrafted
 # geometric proxy, not a human-preference reward or aesthetic judgment.
 silhouettes=reference>0
 d=np.mean(silhouettes!=fg[None,:,:],axis=(1,2))
 closest=float(d.min())
 novelty=min(1,closest/.14) if closest>0 else 0
 score=2.2*connected+.8*min(1,area/75)+.6*min(1,max(0,205-area)/45)
 score+=.4*min(1,top/max(1,bottom))+.25*min(1,palette/4)+.4*novelty
 score-=.8*simplicity
 return float(score)

def reinforce(p,train_sprites,episodes=180):
 # REINFORCE updates a factorized categorical policy over latent values;
 # a reproducible held-out reward comparison is shown, no human aesthetic claims.
 rng=np.random.default_rng(SEED+120)
 values=np.array([-1.55,-.45,.45,1.55],np.float32)
 policy=np.zeros((LATENT,len(values)),np.float32)
 def batch(policy,b=20):
  prob=softmax(policy.astype(np.float32))
  sample=rng.random((b,LATENT))
  choices=(sample[:,:,None]>np.cumsum(prob[None,:,:],axis=-1)).sum(-1).clip(0,len(values)-1)
  z=values[choices]
  out=decode(p,z,temperature=.52,sample=False)
  rewards=np.array([quality(img,train_sprites) for img in out],np.float32)
  return choices,out,rewards
 before=float(np.mean([batch(np.zeros_like(policy),16)[2].mean() for _ in range(4)]))
 for _ in range(episodes):
  choices,out,rewards=batch(policy,20)
  baseline=rewards.mean()
  probs=softmax(policy)
  grad=-probs[None,:,:].repeat(len(choices),axis=0)
  for i in range(len(choices)):
   grad[i,np.arange(LATENT),choices[i]]+=1
  update=(grad*((rewards-baseline)[:,None,None])).mean(0)
  policy+=.11*update
  policy=np.clip(policy,-2.1,2.1)
 after=float(np.mean([batch(policy,16)[2].mean() for _ in range(4)]))
 # Take 320 fresh samples, rank by explicit geometric reward; no training-image
 # insertion, memorized sample substitution, or pixel-domain artist painting.
 final_choices,imgs,rewards=batch(policy,320)
 ordered=np.argsort(-rewards)
 unique=[];unique_scores=[]
 for i in ordered:
  img=imgs[i]
  if not np.any(img):continue
  if any(np.mean(img!=old)<.09 for old in unique):continue
  unique.append(img);unique_scores.append(float(rewards[i]))
  if len(unique)>=48:break
 print('REINFORCE',{'baseline_geometric_reward':round(before,4),'policy_reward':round(after,4),'generated':len(unique)},flush=True)
 return np.stack(unique),policy,{'prior_reward':round(before,4),'reinforced_reward':round(after,4),
  'episodes':episodes,'unique_generated':len(unique),'reward_type':'hand-engineered silhouette proxy, NOT human aesthetic feedback'}

def main():
 ROOT.mkdir(parents=True,exist_ok=True)
 SITE.mkdir(parents=True,exist_ok=True)
 sprites,records,sources=collect()
 tokens,palettes=to_roles(sprites)
 train,val,held=make_split(records)
 print('CHARACTER ONLY DATASET',len(tokens),'training',len(train),'holdout',len(val),'held sources',held,flush=True)
 steps=int(os.getenv('CHARACTER_TRAIN_STEPS','440'))
 params,loss,metrics=training(tokens,train,val,steps)
 samples,policy,rl=reinforce(params,tokens[train])
 rng=np.random.default_rng(SEED+44)
 # Each rendered output borrows a palette from a legally CC0 training sprite,
 # but its token geometry comes from the trained decoder.
 chosen=palettes[train][rng.integers(len(train),size=len(samples))]
 # Round-robin examples across sources to avoid showing 100 variants of one author.
 buckets=collections.defaultdict(list)
 for i,r in enumerate(records):buckets[r['source_id']].append(i)
 showcase=[]
 while len(showcase)<min(120,len(records)) and any(buckets.values()):
  for sid in sorted(buckets):
   if buckets[sid] and len(showcase)<min(120,len(records)):
    showcase.append(buckets[sid].pop(0))
 contact(tokens[showcase],palettes[showcase],
  SITE/'character-reference-sheet.png','REAL 16x16 CC0 CHARACTER DATA  /  NOT GENERATED',12)
 contact(samples,chosen,SITE/'character-generated-sheet.png',
  'UNSUPERVISED VAE + REINFORCE / ACTUAL GENERATED 16x16 SPRITES',12)
 # Save actual learned matrices for reproducibility, not just pre-rendered outputs.
 np.savez_compressed(ROOT/'character-vae-weights.npz',**params,rl_policy=policy)
 report={'format':'pixel-lab-character-only-v1','resolution':[16,16],
  'image_count':len(tokens),'train_images':len(train),'holdout_images':len(val),
  'holdout_sources':held,'source_count':len([s for s in sources if s['accepted_frames']]),
  'step_count':steps,'loss_curve':loss,'metrics':metrics,'rl':rl,
  'source_stats':sources,
  'transformation':'EXACT 16x16 frame extraction only; 7 local palette ranks; CC0 only; no raster enlargement during training',
  'warning':'The geometric reward is NOT a human aesthetic preference model. This is an experimental generator.'}
 (ROOT/'character-data-manifest.json').write_text(json.dumps({'sources':sources,'frames':records,'heldout_source_ids':held},indent=2))
 (ROOT/'character-report.json').write_text(json.dumps(report,indent=2))
 # decoder published in JS-readable form, and actual samples under own IDs.
 export={'format':'pixel-lab-character-generator-v1','report':report,
  'latent_values':[-1.55,-.45,.45,1.55],
  'latent_policy':np.round(policy,5).tolist(),
  'decoder':{'w2':np.round(params['w2'],5).tolist(),
     'b2':np.round(params['b2'],5).tolist(),
     'w3':np.round(params['w3'],5).tolist(),
     'b3':np.round(params['b3'],5).tolist()},
  'palettes':palettes[train][:min(40,len(train))].tolist(),
  'real_samples':[{'tokens':tokens[i].flatten().tolist(),'palette':palettes[i].tolist(),
     'source_id':records[i]['source_id']} for i in showcase[:min(48,len(showcase))]],
  'generated':[{'tokens':t.flatten().tolist(),'palette':pal.tolist()}
      for t,pal in zip(samples,chosen)]}
 (SITE/'characters.json').write_text(json.dumps(export,separators=(',',':')))
 print('CHARACTER TRAINING DONE',json.dumps({k:report[k] for k in ('image_count','source_count','train_images','holdout_images','metrics','rl')}),flush=True)

if __name__=='__main__':main()
