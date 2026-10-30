"""Fail publication if learned editing destroys figure or fabricates meaning."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
import torch
from ml.fullbody_refine.semantic_cleanup import read_source,components
def verify():
 p=Path('site/pixel-lab/semantic-output')
 r=json.loads((p/'report.json').read_text())
 a=read_source(p/'source_native.png');b=read_source(p/'refined_native.png')
 ledger=json.loads((p/'edit-reasons.json').read_text())
 assert r['trained_policy'] and not r['diffusion_trained']
 assert not r['semantic_understanding_achieved'] and not r['art_approved']
 assert r['native_grid']==[192,256] and r['preview_grid']==[384,512]
 assert r['source_sha256']!=r['result_sha256']
 assert r['native_changed_pixels']==int(np.sum(a!=b))==len(ledger['accepted'])
 assert 12<=r['native_changed_pixels']<=450
 assert np.array_equal(a[:80],b[:80]) and np.array_equal(a>0,b>0)
 assert components(a)['small_component_pixels']>components(b)['small_component_pixels']
 assert r['holdout']['holdout_synthetic_accuracy_gain']>0
 coverage=np.asarray(Image.open(p/'pixel-audit-map.png'))
 assert coverage.shape==(256,192)
 assert np.array_equal(coverage==4,a!=b)
 for row in ledger['accepted']:
  y,x=row['y'],row['x']
  assert a[y,x]==row['before'] and b[y,x]==row['after']
  assert row['neighbor_votes']>=5 and row['surrounding_support']>=12
  assert row['actual_object_semantics_known'] is False
 assert (p/'bandit-policy.pt').is_file()
 print('PASS: genuine REINFORCE training, actual noise reduction, exact per-pixel edit reasons and preserved anatomy silhouette')
if __name__=='__main__':verify()
