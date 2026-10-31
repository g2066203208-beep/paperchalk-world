#!/usr/bin/env python3
"""V4 5x5 multi-palette pixel reconstruction and self-supervised CNN evaluation.

This is NOT a guaranteed perfect-pixel artist. The deterministic 640x640 candidate
uses real integer pixels; CNN targets are pseudo-labels derived from the same
input, so a synthetic restoration win does not demonstrate artistic quality.
"""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
import cv2
from PIL import Image

N=5
CELL=128
SAFE=(10,10,118,118)
PANEL=(18,18,110,110)
BG=np.array([246,235,210],dtype=np.uint8)
SEED=20261031

def tile_quantize(arr,colors=18):
    src=np.asarray(arr,dtype=np.uint8)
    small=cv2.resize(src,(108,108),interpolation=cv2.INTER_AREA)
    filtered=cv2.bilateralFilter(small,3,14,1.0)
    image=Image.fromarray(filtered,'RGB')
    q=image.quantize(colors=colors,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE)
    return np.asarray(q.convert('RGB'),dtype=np.uint8),small

def validate_safety(image):
    arr=np.asarray(image)
    if arr.shape!=(640,640,3):raise AssertionError('640x640 required')
    for row in range(5):
        for col in range(5):
            a=arr[row*CELL:(row+1)*CELL,col*CELL:(col+1)*CELL]
            mask=np.ones((CELL,CELL),dtype=bool)
            mask[SAFE[1]:SAFE[3],SAFE[0]:SAFE[2]]=False
            if not np.all(a[mask]==BG):raise AssertionError(f'Bleed R{row+1}C{col+1}')
    return True

def run_image(source,output,colors=18):
    source=Path(source)
    output=Path(output);output.mkdir(parents=True,exist_ok=True)
    raw=source.read_bytes()
    image=np.asarray(Image.open(source).convert('RGB'))
    h,w=image.shape[:2]
    if min(h,w)<256:raise ValueError('reference resolution too small')
    canvas=np.tile(BG[None,None,:],(640,640,1))
    target=[];inputs=[];records=[]
    for row in range(5):
      for col in range(5):
        x0=round(col*w/5);x1=round((col+1)*w/5)
        y0=round(row*h/5);y1=round((row+1)*h/5)
        rgb,prefilter=tile_quantize(image[y0:y1,x0:x1],colors)
        x=col*CELL+SAFE[0];y=row*CELL+SAFE[1]
        canvas[y:y+108,x:x+108]=rgb
        target.append(rgb);inputs.append(prefilter)
        name=f'R{row+1}C{col+1}'
        Image.fromarray(rgb).save(output/(name+'.png'),optimize=True)
        records.append({'id':name,'native':[108,108],
          'colors':int(np.unique(rgb.reshape(-1,3),axis=0).shape[0]),
          'source_box':[x0,y0,x1,y1],'approved':False})
    validate_safety(canvas)
    Image.fromarray(canvas).save(output/'native-baseline-640.png',optimize=True)
    Image.fromarray(canvas).resize((2560,2560),Image.Resampling.NEAREST).save(output/'preview-2560.png',optimize=True)
    np.savez_compressed(output/'training-tiles.npz',targets=np.stack(target),input=np.stack(inputs))
    report={'source_sha256':hashlib.sha256(raw).hexdigest(),'source_size':[w,h],
      'source_kind':'AI-generated concept reference; not manually authored native pixels',
      'grid':[5,5],'native_size':[640,640],'safe_local':list(SAFE),
      'minimum_horizontal_or_vertical_gap':20,'cell_palette_max':colors,
      'algorithm':'area downsampling + gentle bilateral color denoise + per-tile median-cut palette; no dithering',
      'result_status':'candidate only; not an artistic acceptance',
      'neural_used_for_export':False,'tiles':records}
    (output/'quality.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
    return report

def neural_experiment(out,steps=120):
    """Train restoration CNN on 20 identities; evaluate last 5 identities as holdout.
    Targets are deterministic pseudo-labels, NOT independently hand-authored.
    """
    import torch
    from torch import nn
    from torch.nn import functional as F
    torch.set_num_threads(2);torch.manual_seed(SEED)
    rng=np.random.default_rng(SEED)
    d=np.load(Path(out)/'training-tiles.npz')
    targets=d['targets'].astype('float32')/255
    class Restorer(nn.Module):
      def __init__(self):
        super().__init__()
        self.conv=nn.Sequential(nn.Conv2d(3,24,3,padding=1),nn.ReLU(),
          nn.Conv2d(24,24,3,padding=1),nn.ReLU(),
          nn.Conv2d(24,24,3,padding=1),nn.ReLU(),
          nn.Conv2d(24,3,3,padding=1))
      def forward(self,x):return torch.clamp(x+self.conv(x),0,1)
    def corrupt(x,rng):
      src=np.clip(x*255,0,255).astype(np.uint8)
      if rng.random()<.6:src=cv2.GaussianBlur(src,(3,3),float(rng.uniform(.45,1.15)))
      if rng.random()<.5:
        n=int(rng.uniform(77,103))
        src=cv2.resize(cv2.resize(src,(n,n),interpolation=cv2.INTER_LINEAR),
             (108,108),interpolation=cv2.INTER_LINEAR)
      a=src.astype('float32')/255
      a+=rng.normal(0,rng.uniform(.012,.035),a.shape).astype('float32')
      a+=rng.uniform(-.02,.02,(1,1,3)).astype('float32')
      return np.clip(a,0,1)
    model=Restorer();optim=torch.optim.Adam(model.parameters(),lr=.001)
    for step in range(steps):
      x=[];y=[]
      for _ in range(8):
        k=int(rng.integers(0,20));r=int(rng.integers(0,76));c=int(rng.integers(0,76))
        clean=targets[k]
        distorted=corrupt(clean,rng)
        x.append(distorted[r:r+32,c:c+32].transpose(2,0,1))
        y.append(clean[r:r+32,c:c+32].transpose(2,0,1))
      xb=torch.from_numpy(np.stack(x));yb=torch.from_numpy(np.stack(y))
      pred=model(xb);loss=F.l1_loss(pred,yb)+.15*F.mse_loss(pred,yb)
      optim.zero_grad();loss.backward();optim.step()
    model.eval();results=[]
    with torch.no_grad():
      for i in range(20,25):
        clean=targets[i];distorted=corrupt(clean,np.random.default_rng(SEED+i))
        inp=torch.from_numpy(distorted.transpose(2,0,1)[None])
        pred=model(inp).numpy()[0].transpose(1,2,0)
        b=float(np.abs(distorted-clean).mean());m=float(np.abs(pred-clean).mean())
        results.append({'id':f'R5C{i-19}','baseline_L1':round(b,6),
          'neural_L1':round(m,6),'neural_better':m<b})
    allowed=all(x['neural_better'] for x in results)
    report={'type':'real PyTorch self-supervised synthetic-corruption experiment',
      'training_characters':20,'heldout_characters':5,
      'seed':SEED,'training_steps':steps,'results':results,'all_heldout_beaten':allowed,
      'production_policy':'deterministic baseline. Neural output never silently replaces art.',
      'caveat':'Pseudo-label synthetic restoration test is NOT validation of artistic pixel accuracy.'}
    Path(out,'ml-evaluation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
    torch.save({'state':model.state_dict(),'seed':SEED,'steps':steps},Path(out,'restorer.pt'))
    return report

def smoke_source(path):
    """Independently create 25-cell synthetic fixture ONLY for CI infrastructure checks."""
    from PIL import ImageDraw
    p=Path(path);p.parent.mkdir(parents=True,exist_ok=True)
    im=Image.new('RGB',(1250,1250),(247,234,210))
    d=ImageDraw.Draw(im)
    for row in range(5):
      for col in range(5):
        x=col*250;y=row*250
        d.rectangle((x+20,y+20,x+230,y+230),fill=(25+row*20,38+col*26,72+col*10),outline=(18,22,31),width=4)
        d.ellipse((x+62,y+47,x+181,y+172),fill=(184+row*8,109+col*10,78+row*8))
        d.rectangle((x+44,y+178,x+198,y+223),fill=(50+col*21,65+row*18,118))
        d.line((x+88,y+111,x+99,y+113),fill=(19,18,33),width=5)
        d.line((x+145,y+111,x+157,y+109),fill=(19,18,33),width=5)
        d.arc((x+104,y+130,x+141,y+157),5,168,fill=(19,18,33),width=3)
    im.save(p)
    return p

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--input',type=Path)
    p.add_argument('--out-dir',type=Path,default=Path('artifacts/portrait-v4'))
    p.add_argument('--colors',type=int,default=18)
    p.add_argument('--train',action='store_true')
    p.add_argument('--steps',type=int,default=120)
    p.add_argument('--synthetic-smoke',action='store_true')
    a=p.parse_args()
    if not 4<=a.colors<=32:raise ValueError('colors must be between 4 and 32')
    source=smoke_source(a.out_dir/'ci-synthetic.png') if a.synthetic_smoke else a.input
    if source is None:raise SystemExit('Need --input real image or --synthetic-smoke (CI fixture only)')
    report=run_image(source,a.out_dir,a.colors)
    if a.train: report['training']=neural_experiment(a.out_dir,steps=a.steps)
    print(json.dumps({k:v for k,v in report.items() if k!='tiles'},ensure_ascii=False))

if __name__=='__main__':main()
