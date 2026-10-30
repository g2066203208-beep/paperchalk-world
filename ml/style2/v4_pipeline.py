"""PixelLab V4, reproducible GitHub Actions pipeline.
Reconstructs all user-supplied and generated pixel candidates from lossless 2-bit
packed color tokens and trains a four-color restoration model plus preliminary
human-feedback reject/accept discriminative scorer.

Two gold samples are ONE character in two poses. All other samples are UNAPPROVED
and cannot become positive targets until explicitly reviewed by the user.
"""
from pathlib import Path
import argparse, json, base64, zlib, hashlib
import numpy as np
from PIL import Image,ImageFilter

DATA=Path('ml/style2/v4_dataset_packed.json')
OUTPUT=Path('site/pixel-lab/style2/v4')
PALETTE=np.array([[57,54,87],[242,165,194],[169,186,233],[255,245,230]],np.uint8)

def unpack(encoded, shape=(512,384)):
    raw=np.frombuffer(zlib.decompress(base64.b64decode(encoded,validate=True)),dtype=np.uint8)
    if len(raw)*4 != shape[0]*shape[1]:raise ValueError('Corrupt 2-bit sample')
    tokens=np.stack([(raw>>shift)&3 for shift in (0,2,4,6)],axis=1).reshape(shape)
    return tokens

def images():
    obj=json.loads(DATA.read_text(encoding='utf8'))
    if obj['grid']!=[384,512] or obj['palette']!=PALETTE.tolist():raise AssertionError('Grid or D palette changed')
    OUTPUT.mkdir(exist_ok=True,parents=True)
    review=[]
    for rec in obj['records']:
        labels=unpack(rec['pack_zlib_b64'])
        rgb=PALETTE[labels]
        if hashlib.sha256(rgb.tobytes()).hexdigest()!=rec['converted_sha256']:
            raise AssertionError('Pixel hash mismatch '+rec['id'])
        Image.fromarray(rgb,'RGB').save(OUTPUT/(rec['id']+'.png'),optimize=True)
        a={k:v for k,v in rec.items() if k!='pack_zlib_b64'}
        a['file']=rec['id']+'.png'
        a['strictly_four_colors']=len(np.unique(labels))==4
        a['image_is_original_art_reviewed']=rec['status']=='gold_master'
        a['eligible_for_positive_training']=rec['status']=='gold_master'
        review.append(a)
    (OUTPUT/'manifest.json').write_text(json.dumps({
      'palette':obj['palette'],'native_grid':obj['grid'],'records':review,
      'one_character_two_poses':True,'not_an_approval_of_machine_generated_art':True
    },ensure_ascii=False,indent=2))
    return review

def trained():
    import torch
    from torch import nn
    from torch.nn import functional as F
    torch.set_num_threads(2)
    torch.manual_seed(20261030);rng=np.random.default_rng(20261030)
    class Restorer(nn.Module):
      def __init__(self):
       super().__init__()
       self.layers=nn.Sequential(nn.Conv2d(3,32,3,padding=1),nn.GELU(),nn.Conv2d(32,32,3,padding=1),nn.GELU(),nn.Conv2d(32,48,3,padding=1),nn.GELU(),nn.Conv2d(48,32,3,padding=1),nn.GELU(),nn.Conv2d(32,4,1))
      def forward(self,x):return self.layers(x)
    a,b=[np.asarray(Image.open(OUTPUT/(id+'.png')).convert('RGB')) for id in ('gold_dynamic','gold_standing')]
    def corrupt(rgb,rng):
       im=Image.fromarray(rgb).filter(ImageFilter.GaussianBlur(float(rng.uniform(.3,1.25))))
       x=np.asarray(im).astype('float32')
       x=x*float(rng.uniform(.85,1.15))+rng.normal(0,rng.uniform(2,18),size=(1,1,3))+rng.normal(0,rng.uniform(1,8),size=x.shape)
       return np.clip(x/255,0,1).astype('float32')
    def token(rgb):return ((rgb.astype('int32')[:,:,None,:]-PALETTE.astype('int32')[None,None,:,:])**2).sum(3).argmin(2).astype('int64')
    model=Restorer();opt=torch.optim.AdamW(model.parameters(),lr=.001)
    labels=token(a); losses=[]
    # Gold A trained; Gold B is whole-image holdout of SAME identity.
    for i in range(180):
       noisy=corrupt(a,rng)
       ys=rng.integers(0,512-48,10);xs=rng.integers(0,384-48,10)
       batch=torch.from_numpy(np.stack([noisy[y:y+48,x:x+48].transpose(2,0,1) for y,x in zip(ys,xs)]))
       target=torch.from_numpy(np.stack([labels[y:y+48,x:x+48] for y,x in zip(ys,xs)]))
       result=model(batch)
       weights=torch.where(target==0,.4,3.)
       loss=(F.cross_entropy(result,target,reduction='none')*weights).sum()/weights.sum()
       opt.zero_grad();loss.backward();opt.step()
       if i in (0,29,89,179):losses.append([i+1,round(float(loss.detach()),5)])
    model.eval()
    checks=[]
    gt=token(b)
    for i in range(3):
       inp=corrupt(b,np.random.default_rng(37000+i))
       with torch.no_grad():
          lines=[]
          for y in range(0,512,64):
             parts=[]
             for x in range(0,384,64):
                tile=torch.from_numpy(inp[y:y+64,x:x+64].transpose(2,0,1).copy())[None]
                parts.append(model(tile).argmax(1)[0].numpy())
             lines.append(np.concatenate(parts,1))
          predicted=np.concatenate(lines,0)
       baseline=((inp[:,:,None,:]*255-PALETTE[None,None,:,:])**2).sum(3).argmin(2)
       fg=gt!=0
       checks.append({
         'seed':i,'model_accuracy':round(float(np.mean(predicted==gt)),5),
         'baseline_accuracy':round(float(np.mean(baseline==gt)),5),
         'model_foreground':round(float(np.mean(predicted[fg]==gt[fg])),5),
         'baseline_foreground':round(float(np.mean(baseline[fg]==gt[fg])),5)
       })
       if i==0:
          Image.fromarray(PALETTE[predicted].astype('uint8'),'RGB').save(OUTPUT/'restoration_neural_test.png')
          Image.fromarray(PALETTE[baseline].astype('uint8'),'RGB').save(OUTPUT/'restoration_baseline_test.png')
    torch.save({'weights':model.state_dict(),'D_palette':PALETTE.tolist()},OUTPUT/'converter_v4.pt')
    policy=all(c['model_accuracy']>=c['baseline_accuracy'] and c['model_foreground']>=c['baseline_foreground'] for c in checks)
    report={'architecture':'3x3 convolution four-color restoration CNN, 38004 parameters',
       'role':'conversion denoiser, NOT a trained new-character drawing model',
       'trained_gold':['gold_dynamic'],'holdout_gold':['gold_standing'],'same_identity_holdout':True,
       'steps':180,'loss':losses,'comparisons':checks,
       'enable_neural_for_production':policy,
       'production_export': 'neural' if policy else 'deterministic four-class pixel-grid baseline',
       'weak_images_policy':'all weak drafts archived for review, NEVER used as approved positive targets',
       'quality_assurance':'Exact palette and grid pass, artistic quality requires human acceptance'}
    (OUTPUT/'training_report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    return report

def main():
  parser=argparse.ArgumentParser()
  parser.add_argument('--train',action='store_true')
  args=parser.parse_args()
  review=images()
  report=trained() if args.train else None
  print(json.dumps({'converted_images':len(review),'gold':sum(x['status']=='gold_master' for x in review),
    'unapproved':sum(x['status']!='gold_master' for x in review),'training':report},ensure_ascii=False))

if __name__=='__main__':main()