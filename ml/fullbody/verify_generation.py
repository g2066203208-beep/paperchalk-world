"""Reject copied/template outputs and inspect true sampled full-character PNGs."""
import json,hashlib
from pathlib import Path
import numpy as np
from PIL import Image
import torch
from ml.fullbody.generate import FigureVAE,OUT,COL

def verify():
 r=json.loads((OUT/'report.json').read_text(encoding='utf8'))
 assert r['trained'] and r['samples_are_decoder_only'] and r['training_on_complete_fullbody']
 assert r['sampling_uses_no_original_image_pixels']
 assert r['pipeline']=='full_figure_stochastic_vae_v1'
 assert r['trained_grid']==[96,128] and r['export_grid']==[384,512]
 assert r['export_is_nearest_neighbor_4x'] and not r['native_384_detail_learned']
 assert r['training_examples']>=60 and r['heldout_examples']>=8
 assert r['generated_fullbody_count']>=9
 assert len(r['generated'])==r['generated_fullbody_count']
 assert len(set(x['pose_condition'] for x in r['generated']))>=3
 model=FigureVAE()
 ckpt=torch.load(OUT/'fullbody-generative-vae.pt',map_location='cpu',weights_only=True)
 model.load_state_dict(ckpt['state_dict']);model.eval()
 with torch.no_grad():
  assert model.decoder(torch.randn(1,16,8,6)).shape==(1,4,128,96)
 hashes=set();foreground=[];silhouette=[]
 for row in r['generated']:
  p=OUT/row['file'];im=Image.open(p).convert('RGB')
  assert im.size==(384,512)
  a=np.asarray(im,dtype=np.uint8)
  low=a[::4,::4]
  assert np.array_equal(a,np.repeat(np.repeat(low,4,axis=0),4,axis=1)),row['file']
  assert set(map(tuple,np.unique(low.reshape(-1,3),axis=0)))<=set(map(tuple,COL))
  fg=np.any(low!=COL[0],axis=2)
  occupancy=float(fg.mean())
  assert .012<occupancy<.6,(row['file'],occupancy)
  if not fg.any():raise AssertionError('blank')
  y,x=np.where(fg);assert x.max()-x.min()>12 and y.max()-y.min()>25
  sha=hashlib.sha256(COL[((low[:,:,None,:].astype('int32')-COL.astype('int32'))**2).sum(-1).argmin(-1)].tobytes()).hexdigest()
  # File checksums in report are SHA of 96x128 class IDs, not RGB bytes.
  idx=((low[:,:,None,:].astype('int32')-COL.astype('int32'))**2).sum(-1).argmin(-1).astype('uint8')
  assert hashlib.sha256(idx.tobytes()).hexdigest()==row['sha256']
  assert row['sha256'] not in hashes
  hashes.add(row['sha256']);foreground.append(occupancy);silhouette.append(fg)
 assert len(hashes)==len(r['generated'])
 variety=np.mean([np.mean(silhouette[i]!=silhouette[j]) for i in range(len(silhouette)) for j in range(i+1,len(silhouette))])
 assert variety>.008,('silhouettes collapsed',variety)
 assert (OUT/'contact.png').is_file()
 print('PASS generated whole-character samples',len(hashes),'pose labels',r['pose_groups'],
       'silhouette variation',round(float(variety),4),'original art approval=0')
if __name__=='__main__':verify()
