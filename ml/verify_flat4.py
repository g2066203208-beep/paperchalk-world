"""Validate actual exported four-color model, provenance, and loss improvement."""
import json, numpy as np
from pathlib import Path
src=json.loads(Path('site/pixel-lab/flat4-source.json').read_text())
model=json.loads(Path('site/pixel-lab/flat4-model.json').read_text())
assert model['format']=='flat4-masked-token-mlp-v1'
assert src['format']=='flat4-original-source-v1'
assert (src['width'],src['height'])==(64,96)
assert src['palette']==model['palette'] and len(src['palette'])==4
assert len(src['tokens'])==6144
assert all(type(x)==int and 0<=x<=4 for x in src['tokens'])
assert set(src['tokens'])==set(range(5))
w=model['weights']
assert np.array(w['w1']).shape==(150,48)
assert np.array(w['w2']).shape==(48,5)
assert np.array(w['b1']).shape==(48,)
assert np.array(w['b2']).shape==(5,)
assert all(np.isfinite(np.asarray(a,dtype=float)).all() for a in w.values())
metrics=model['metrics']
assert metrics['training_steps']>=100
assert metrics['source_sprites']==1
assert len(metrics['curve'])>=4
assert metrics['curve'][-1]['cross_entropy']<metrics['curve'][0]['cross_entropy']
assert 0<=metrics['holdout_same_source_mask_accuracy']<=1
assert 0<=metrics['four_neighbour_majority_baseline']<=1
print('FLAT4 VERIFIED; honest one-source training metrics:',metrics)
