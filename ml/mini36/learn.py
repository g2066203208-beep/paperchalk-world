"""Real CPU CNN trained on 30 sprites to denoise silhouettes of six held-out sprites.

No human artist dataset. Candidate-only; never overwrites the native indexed set.
"""
import argparse,json
from pathlib import Path
import numpy as np
from PIL import Image
import cv2
import torch
from torch import nn
from torch.nn import functional as F
from .atlas import unpack,BG
SEED=20261101
class SilhouetteCNN(nn.Module):
    def __init__(self):
        super().__init__()
        self.layers=nn.Sequential(nn.Conv2d(4,24,3,padding=1),nn.ReLU(),
          nn.Conv2d(24,24,3,padding=1),nn.ReLU(),
          nn.Conv2d(24,16,3,padding=1),nn.ReLU(),nn.Conv2d(16,1,1))
    def forward(self,x):return self.layers(x)

def distort(rgba,rng):
    rgb=rgba[:,:,:3].astype('float32')/255
    alpha=rgba[:,:,3].astype('float32')/255
    bg=np.asarray(BG,dtype='float32')/255
    visible=rgb*alpha[:,:,None]+bg[None,None,:]*(1-alpha[:,:,None])
    sig=float(rng.uniform(.45,1.2))
    rgb=cv2.GaussianBlur(visible,(3,3),sig)
    rgb=np.clip(rgb+rng.normal(0,.012,visible.shape),0,1)
    noisy=cv2.GaussianBlur(alpha,(3,3),sig)
    flips=rng.random(alpha.shape)<.075
    noisy[flips]=1-noisy[flips]
    noisy=np.clip(noisy+rng.normal(0,.075,alpha.shape),0,1)
    return np.concatenate([rgb,noisy[:,:,None]],axis=2).astype('float32')

def iou(a,b):
    a=bool_arr(a);b=bool_arr(b)
    u=np.logical_or(a,b).sum()
    return float(np.logical_and(a,b).sum()/u) if u else 1.
def bool_arr(x):return np.asarray(x)>0.5

def run(data,out,steps=250):
    torch.set_num_threads(2);torch.manual_seed(SEED)
    sprites,palettes,indices=unpack(data)
    out=Path(out);out.mkdir(parents=True,exist_ok=True)
    rng=np.random.default_rng(SEED)
    model=SilhouetteCNN();optimizer=torch.optim.Adam(model.parameters(),lr=.001)
    for step in range(steps):
        batch=[];targets=[]
        for _ in range(16):
            idx=int(rng.integers(0,30))
            batch.append(distort(sprites[idx],rng).transpose(2,0,1))
            targets.append((sprites[idx,:,:,3]==255).astype('float32')[None])
        x=torch.from_numpy(np.stack(batch));y=torch.from_numpy(np.stack(targets))
        logit=model(x)
        loss=F.binary_cross_entropy_with_logits(logit,y)
        optimizer.zero_grad();loss.backward();optimizer.step()
    model.eval();checks=[];all_improve=True
    for idx in range(30,36):
        source=sprites[idx];clean=(source[:,:,3]==255)
        noisy=distort(source,np.random.default_rng(SEED+idx))
        with torch.no_grad():
            x=torch.from_numpy(noisy.transpose(2,0,1)[None])
            prob=torch.sigmoid(model(x))[0,0].numpy()
        baseline_iou=iou(noisy[:,:,3],clean)
        cnn_iou=iou(prob,clean)
        checks.append({'id':f'R6C{idx-29}','noisy_baseline_iou':round(baseline_iou,5),
          'trained_cnn_iou':round(cnn_iou,5),'improved':cnn_iou>baseline_iou})
        all_improve &= cnn_iou>baseline_iou
    # Save ML silhouette suggestions separately, never overwrite the 36 indexed sprites.
    for i in range(36):
        noisy=distort(sprites[i],np.random.default_rng(SEED+1000+i))
        with torch.no_grad():
            logits=model(torch.from_numpy(noisy.transpose(2,0,1)[None]))
            proposed=(torch.sigmoid(logits)[0,0].numpy()>.5).astype('uint8')
        Image.fromarray(proposed*255,'L').save(out/f'R{i//6+1}C{i%6+1}-cnn-mask.png')
    torch.save({'state':model.state_dict(),'steps':steps,'train_index':list(range(30)),
      'validation_index':list(range(30,36))},out/'mini36-silhouette-cnn.pt')
    report={'status':'real PyTorch pseudo-supervised silhouette study; not trained on human professional pixel art',
       'train_characters':30,'holdout_characters':6,'total_training_steps':steps,
       'holdout':checks,'all_holdouts_beaten':bool(all_improve),
       'promotion_policy':'Never overwrite the verified 24x24 palette-index sprites; CNN mask is experimental only.',
       'visual_quality_conclusion':'An IoU win on synthetic corruption does NOT prove pixel-art craft.'}
    (out/'ml-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
    return report

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--data',default='site/pixel-lab/mini36/mini36-v1.lossless.lzma.b64')
    p.add_argument('--out',default='artifacts/mini36/ml');p.add_argument('--steps',type=int,default=250)
    args=p.parse_args();print(json.dumps(run(args.data,args.out,args.steps),ensure_ascii=False))