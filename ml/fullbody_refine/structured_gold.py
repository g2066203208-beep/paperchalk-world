"""Artist-authored, pixel-exact structural gold candidate; NOT an ML-generated picture.

This source stores 77 versioned, intentionally placed strokes. On first export
it materializes editable trace.json with every polygon/line and body-part label.
Future editing: change trace.json, then run this renderer again. Four palette
inks plus transparent only; never blend/blur/dither.
"""
from pathlib import Path
import base64,zlib,json,hashlib
from collections import Counter
import numpy as np
from PIL import Image,ImageDraw
from scipy import ndimage as ndi

PALETTE=[(0,0,0,0),(57,54,87,255),(242,165,194,255),(169,186,233,255),(255,245,230,255)]
OUT=Path('site/pixel-lab/structured-gold')
DATA='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'

def render():
 OUT.mkdir(parents=True,exist_ok=True)
 trace=OUT/'trace.json'
 if trace.exists(): spec=json.loads(trace.read_text(encoding='utf8'))
 else:
  spec=json.loads(zlib.decompress(base64.b64decode(DATA)))
  trace.write_text(json.dumps(spec,ensure_ascii=False,indent=2),encoding='utf8')
 labels=spec['labels']
 assert len(labels)==10
 canvas=Image.new('RGBA',(192,256),(0,0,0,0))
 parts=Image.new('L',(192,256),0)
 a=ImageDraw.Draw(canvas);p=ImageDraw.Draw(parts)
 for op in spec['calls']:
  color=tuple(op['color']);points=[tuple(q) for q in op['points']]
  assert color in PALETTE[1:] and op['tag'] in labels
  lid=labels.index(op['tag'])
  if op['type']=='poly':
   a.polygon(points,fill=color);p.polygon(points,fill=lid)
  elif op['type']=='line':
   a.line(points,fill=color,width=int(op['width']),joint='curve')
   p.line(points,fill=lid,width=int(op['width']),joint='curve')
  else: raise ValueError('unknown stroke '+str(op['type']))
 rgba=np.asarray(canvas);region=np.asarray(parts)
 assert set(np.unique(rgba[:,:,3]).tolist())=={0,255}
 palette=np.asarray(PALETTE,dtype=np.uint8)
 indices=np.zeros((256,192),dtype=np.uint8)
 for i in range(1,5):indices[np.all(rgba==palette[i],axis=2)]=i
 assert int(np.sum(indices>0))==int(np.sum(region>0))
 assert np.all((indices==0)==(region==0))
 native=Image.fromarray(indices,'P')
 pcolors=np.zeros((256,3),np.uint8);pcolors[:5]=palette[:,:3]
 native.putpalette(pcolors.flatten().tolist());native.info['transparency']=0
 native.save(OUT/'hostess_gold_native_192x256.png',optimize=True)
 native.resize((384,512),Image.Resampling.NEAREST).save(OUT/'hostess_gold_preview_384x512.png')
 parts.save(OUT/'parts-index.png',optimize=True)
 # Human-readable semantic regions for training and auditing (not guessed from pixels).
 stats={name:int((region==i).sum()) for i,name in enumerate(labels)}
 sizes={}
 for i,color in enumerate(palette[1:],1):
  cc,n=ndi.label(indices==i)
  s=np.bincount(cc.ravel())[1:]
  sizes[str(i)]={'tiny_regions':int((s<=3).sum()),'tiny_pixels':int(s[s<=3].sum())}
 report={
   'provenance':'hand-authored polygon/line pixel geometry, NOT generated by neural network',
   'person':'same pink-haired blue-dress hostess redesigned with readable head, hands, costume, legs and boots',
   'native_grid':[192,256],'display_grid':[384,512],'four_inks_exact':True,
   'strokes':len(spec['calls']),'semantic_regions':stats,
   'semantic_ground_truth_exists_only_for_this_manual_redraw':True,
   'pixel_groups':sizes,'tiny_pixel_total':sum(v['tiny_pixels'] for v in sizes.values()),
   'data_sha256':hashlib.sha256(indices.tobytes()).hexdigest(),
   'usable_as_supervised_training_sample':True,
   'artist_game_approval':False,'not_generalized_ml_art_generation':True,
   'limitations':['This is a manual/algorithmic redraw prototype, not diffusion art.',
     'Each pixel has a recorded final body-part label, but artistic quality still needs review.',
     '384x512 is only 2x nearest-neighbor preview.']
 }
 (OUT/'gold-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
 print(json.dumps({'strokes':report['strokes'],'semantic_labels':len(labels),'tiny_pixels':report['tiny_pixel_total'],'figure_pixels':int((indices>0).sum())}))
 return report
if __name__=='__main__':render()
