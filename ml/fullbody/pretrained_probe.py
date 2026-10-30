"""Evaluate independently trained open weights for *recognizable* NEW character art.

The previous scratch-trained VAE was rejected for disconnected colour blobs.
Alucard is an EXTERNAL pretrained 32M sprite flow-matching model (FAIR v1),
not our own trained network. This evaluation does not promote its images to
commercial game assets or pretend they have native 384x512 painted detail.
"""
import argparse,hashlib,json
from pathlib import Path
import numpy as np
from PIL import Image
import torch

OUT=Path('site/pixel-lab/fullbody-pretrained')
COL=np.array([[57,54,87],[242,165,194],[169,186,233],[255,245,230]],dtype=np.uint8)
REQUESTS=[
 ('archivist_stand','resting','full body pixel art game sprite, adult female archivist, long flowing pink braid, intricate pale blue travel coat, satchel, standing upright, visible head and both shoes, front view, transparent background'),
 ('scout_run','running','full body pixel art game sprite, adult female athletic explorer, short blue hair, cream tunic and pink scarf, dynamic running pose, both arms and boots clearly visible, front three quarter view, transparent background'),
 ('mage_cast','casting','full body pixel art game sprite, adult mage, blue hood and pink floor length cloak, one arm raised casting a spell, both feet and the whole head visible, front view, transparent background'),
 ('guard_attack','combat','full body pixel art game sprite, adult female sword guard, braided hair, pale blue armor and cape, side lunge attack stance, visible sword, both legs and boots, transparent background'),
]
def convert(img):
 raw=img.convert('RGBA')
 if raw.size!=(128,128):raise RuntimeError('unexpected pretrained source dimensions '+str(raw.size))
 pixels=np.asarray(raw)
 valid=pixels[:,:,3]>48
 if valid.sum()<300:raise RuntimeError('No meaningful foreground from pretrained model')
 yy,xx=np.where(valid)
 crop=raw.crop((max(0,int(xx.min())-3),max(0,int(yy.min())-3),
               min(128,int(xx.max())+4),min(128,int(yy.max())+4)))
 crop.thumbnail((172,238),Image.Resampling.NEAREST)
 paper=Image.new('RGBA',(192,256),tuple(COL[0])+(255,))
 paper.alpha_composite(crop,((192-crop.width)//2,(256-crop.height)//2))
 rgb=np.asarray(paper.convert('RGB')).astype(np.int32)
 idx=((rgb[:,:,None,:]-COL.astype(np.int32)[None,None,:,:])**2).sum(-1).argmin(-1)
 pix=COL[idx.astype(np.uint8)]
 return Image.fromarray(pix,'RGB').resize((384,512),Image.Resampling.NEAREST)
def run(steps):
 torch.set_num_threads(2)
 from alucard import Alucard
 model=Alucard.from_pretrained('evilsocket/alucard',device='cpu')
 OUT.mkdir(exist_ok=True,parents=True)
 results=[]
 for i,(name,pose,prompt) in enumerate(REQUESTS):
  sprite=model(prompt,num_steps=steps,cfg_text=4.2,seed=20261030+i*49)
  sprite.save(OUT/(name+'_raw.png'))
  converted=convert(sprite);converted.save(OUT/(name+'_D_384x512.png'),optimize=True)
  results.append({'id':name,'pose':pose,'prompt':prompt,'raw_file':name+'_raw.png',
     'four_color_file':name+'_D_384x512.png','model':'evilsocket/alucard',
     'raw_grid':[128,128],'converted_grid':[384,512],
     'raw_sha256':hashlib.sha256(sprite.tobytes()).hexdigest()})
 report={'probe':True,'source':'external_pretrained_flow_matching_model','not_trained_by_paperworld':True,
  'model':'evilsocket/alucard','parameter_count':31956228,'sampling_steps':steps,
  'output_count':len(results),'approved':0,'visual_qa':'pending',
  'license':'FAIR v1.0 - research use; business use needs written agreement',
  'not_native_384_detail':True,'results':results,
  'warning':'Research probe only: correct anatomy/pose/clothes and independent human review required. No claim of own fullbody model training.'}
 (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
 print(json.dumps({'status':'MODEL_PROBE_FINISHED','count':len(results)},ensure_ascii=False))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--steps',type=int,default=16);a=p.parse_args();run(a.steps)
