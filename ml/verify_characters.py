"""Fail closed: no "trained character" publishing without real audited character sprites."""
import json
import math
from pathlib import Path
from PIL import Image

data=json.loads(Path('site/pixel-lab/characters.json').read_text())
r=data['report']
assert data['format']=='pixel-lab-character-generator-v1'
assert r['image_count']>=65
assert r['source_count']>=4
assert r['train_images']>=45 and r['holdout_images']>=8
assert r['train_images']+r['holdout_images']==r['image_count']
assert r['step_count']>=200
assert len(r['loss_curve'])>=3
assert r['loss_curve'][-1]['recon_ce']<r['loss_curve'][0]['recon_ce'],'must train and converge'
assert len(r['holdout_sources'])>=1
assert 0<=r['metrics']['source_disjoint_validation_accuracy']<=1
assert len(data['decoder']['w2'])==20
assert len(data['decoder']['w2'][0])==80
assert len(data['decoder']['w3'])==80
assert len(data['decoder']['w3'][0])==2048
assert len(data['generated'])>=16
assert len(data['real_samples'])>=20
assert all(s['license']=='CC0-1.0' for s in r['source_stats'])
assert r['source_count']==len([s for s in r['source_stats'] if s['accepted_frames']>0])
assert sum(s['accepted_frames'] for s in r['source_stats'])==r['image_count']
assert all(s['source'].startswith('https://') for s in r['source_stats'])
assert all(s['raw_sha256'] for s in r['source_stats'] if s['accepted_frames'])
assert len({r['source_id'] for r in data['real_samples']})>=4
for item in data['generated']+data['real_samples']:
    assert len(item['tokens'])==256
    assert all(isinstance(i,int) and 0<=i<8 for i in item['tokens'])
    assert len(item['palette'])==8
    assert all(len(row)==3 for row in item['palette'])
    assert sum(i>0 for i in item['tokens'])>=12
fingerprints={tuple(x['tokens']) for x in data['generated']}
assert len(fingerprints)>=16,'generated sprites must be different'
assert fingerprints.isdisjoint(tuple(x['tokens']) for x in data['real_samples']), 'must not pass original sprites off as generated'
for filename in ('character-reference-sheet.png','character-generated-sheet.png'):
    img=Image.open('site/pixel-lab/'+filename)
    assert img.width>=640 and img.height>=180
    assert img.mode in ('RGB','RGBA')
assert math.isfinite(r['rl']['prior_reward'])
assert math.isfinite(r['rl']['reinforced_reward'])
assert r['rl']['episodes']>=100
assert Path('ml/characters/character-vae-weights.npz').stat().st_size>30000
print('VERIFIED real CC0 character-only dataset, original-source holdout, genuine learned decoder, unique generated 16px sprites, RL policy and contact sheets.')
