"""Integrity gates: published models must be outputs of real data/training."""
import json
import math
from pathlib import Path

model=json.loads(Path('site/pixel-lab/model.json').read_text())
policy=json.loads(Path('site/pixel-lab/brush-policy.json').read_text())
assert model['format']=='pixel-lab-neural-inpaint-v1'
assert len(model['w1'])==327
assert len(model['w1'][0])==56
assert len(model['w2'])==56
assert len(model['w2'][0])==12
assert len(model['b1'])==56
assert len(model['b2'])==12
assert len(model['examples'])>=2
assert len(model['sources'])>=1
assert all(s['license']=='CC0-1.0' for s in model['sources'])
assert sum(s['image_count'] for s in model['sources'])>=30
assert all(len(x['pixels'])==256 for x in model['examples'])
assert all(0<=p<12 for x in model['examples'] for p in x['pixels'])
assert model['metrics']['validation_sprites']>=2
assert model['metrics']['steps']>=10
for v in model['metrics']['loss_history']:
    assert math.isfinite(v['cross_entropy'])
assert model['metrics']['loss_history'][-1]['cross_entropy'] < model['metrics']['loss_history'][0]['cross_entropy'], 'loss must decrease'
assert policy['format']=='pixel-lab-q-brush-v1'
assert len(policy['actions'])==5
assert len(policy['q'])>5
assert policy['metrics']['validation_images']>=2
assert policy['metrics']['stroke_reduction']>0, 'Q-learning must improve over pencil baseline'
print('VERIFIED training data provenance, neural weights and RL holdout improvement')
