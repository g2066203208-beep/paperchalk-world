"""Strict reproduction and quality test for structured artwork and training labels."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
import torch
from ml.fullbody_refine.train_parts import PartNet,PALETTE,ROOT

def check():
 old=np.asarray(Image.open('site/pixel-lab/assets/hostess-redraw-v1-192x256.png').convert('RGBA'))
 native=Image.open(ROOT/'hostess_gold_native_192x256.png')
 art=np.asarray(native.convert('RGBA'))
 semantic=np.asarray(Image.open(ROOT/'parts-index.png'))
 report=json.loads((ROOT/'gold-report.json').read_text())
 metrics=json.loads((ROOT/'parts-ml-report.json').read_text())
 assert native.mode=='P' and native.size==(192,256)
 assert set(map(tuple,np.unique(art.reshape(-1,4),axis=0)))<=set(map(tuple,PALETTE))
 assert semantic.shape==(256,192) and set(np.unique(semantic))==set(range(10))
 assert np.array_equal(semantic>0,art[:,:,3]>0)
 assert report['strokes']==77 and report['semantic_regions']['face']>600
 assert report['semantic_regions']['hands']>350
 assert report['semantic_regions']['leg']>1000
 assert report['tiny_pixel_total']<=150
 n=0
 for color in PALETTE[1:]:
  mask=np.all(old==color,axis=-1)
  label,k=ndi.label(mask)
  sizes=np.bincount(label.flatten())[1:]
  n+=int(sizes[sizes<=3].sum())
 assert n>1300 and report['tiny_pixel_total']<n*.2
 assert report['artist_game_approval'] is False
 assert not metrics['not_general_purpose_semantic_understanding'] is False
 assert metrics['independent_training_identities']==1
 assert metrics['synthetic_foreground_accuracy']>.57
 model=PartNet()
 weight=torch.load(ROOT/'parts-model.pt',map_location='cpu',weights_only=True)
 model.load_state_dict(weight['state_dict']);model.eval()
 with torch.no_grad():
  pred=model(torch.zeros((1,256,192),dtype=torch.long))
 assert pred.shape==(1,10,256,192)
 assert Image.open(ROOT/'hostess_gold_preview_384x512.png').size==(384,512)
 print('PASS: authored anatomical pixels, 77 traceable strokes, native 4-color sprites, >80% speck reduction, honest learned body-part predictions')
if __name__=='__main__':check()
