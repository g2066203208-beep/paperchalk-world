#!/usr/bin/env python3
"""Reproducible alpha PNGs from accepted Anima 3-view master sheets.
Original RGB images are immutable. Static poses; no fabricated walk cycles.
"""
import json
from pathlib import Path
import numpy as np
import cv2
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
GALLERY=ROOT/'site/data/npc/civilians/gallery.v1.json'
MANIFEST=ROOT/'site/data/npc/production-manifest.v1.json'
VIEWS=('side_left','front','back')
HEIGHTS={'NPC-C001':1.74,'NPC-C002':1.61,'NPC-C003':1.55,
 'NPC-C004':1.74,'NPC-C005':1.60,'NPC-C006':1.73,'NPC-SG01':1.57}
WIDTHS={'NPC-C001':.97,'NPC-C002':.92,'NPC-C003':.92,
 'NPC-C004':1.,'NPC-C005':.91,'NPC-C006':.97,'NPC-SG01':.86}

def isolate(sheet,i):
 w,h=sheet.size
 img=np.asarray(sheet.crop((round(i*w/3),0,round((i+1)*w/3),h)).convert('RGB'))
 minimum=img.min(axis=2).astype(np.int16)
 color_spread=img.max(axis=2).astype(np.int16)-minimum
 near_white=(minimum>223)&(color_spread<26)
 # Remove only background connected to the sheet border. White clothing
 # enclosed by its ink outline remains opaque and retains its color.
 _,labels,_,_=cv2.connectedComponentsWithStats(near_white.astype('uint8'),8)
 border=np.unique(np.concatenate((labels[0],labels[-1],labels[:,0],labels[:,-1])))
 background=near_white&np.isin(labels,border)
 count,regions,stats,_=cv2.connectedComponentsWithStats((~background).astype('uint8'),8)
 if count<2:raise ValueError('No person foreground')
 largest=1+int(stats[1:,cv2.CC_STAT_AREA].argmax())
 if stats[largest,cv2.CC_STAT_AREA]<7000:raise ValueError('Too small person')
 mask=np.uint8(regions==largest)*255
 smooth=cv2.GaussianBlur(mask,(3,3),.65)
 alpha=np.maximum(cv2.erode(mask,np.ones((3,3),np.uint8)),smooth)
 yy,xx=np.where(alpha>32)
 x0=max(0,int(xx.min())-5);x1=min(img.shape[1],int(xx.max())+6)
 y0=max(0,int(yy.min())-5);y1=min(img.shape[0],int(yy.max())+6)
 if y1-y0<600:raise ValueError('Invalid person height')
 return Image.fromarray(np.dstack((img,alpha))[y0:y1,x0:x1].astype(np.uint8),'RGBA')

def build():
 gallery=json.loads(GALLERY.read_text(encoding='utf8'))
 lookup={c['id']:c for c in gallery['characters']}
 output=[];records=[]
 for cid,height in HEIGHTS.items():
  if cid=='NPC-C006':
   source=ROOT/'site/assets/characters/civilians/npc-c006/three-view-original.png'
   dest=source.parent
  else:
   row=lookup[cid];source=ROOT/row['source']['path']
   if row['source']['actualImageLeftToRight']!=list(VIEWS):
    raise ValueError('Source view order differs from actual image: '+cid)
   dest=source.parent
  master=Image.open(source)
  if master.size!=(1024,1024):raise ValueError('Master size changed: '+str(source))
  dest.mkdir(parents=True,exist_ok=True)
  views={};measure={}
  for i,view in enumerate(VIEWS):
   sprite=isolate(master,i)
   path=dest/(view+'.png')
   sprite.save(path,optimize=True,compress_level=9)
   output.append(str(path.relative_to(ROOT)))
   views[view]='./'+str(path.relative_to(ROOT/'site'))
   measure[view]=[sprite.width,sprite.height]
  records.append({'id':cid,'kind':'student' if cid.startswith('NPC-SG') else 'civilian',
   'artApproved':True,'production':True,'trial':True,
   'sprites':{'idle':views['front'],**views},
   'geometry':{'heightMeters':height,'assetCrownY':.009,
    'assetSoleY':.991,'soleX':.5,'widthScale':WIDTHS[cid]},
   'viewOrder':list(VIEWS),'viewSizes':measure,
   'sourceMaster':'./'+str(source.relative_to(ROOT/'site')),
   'notes':'User-selected master for NPC test. Static views, not animated gait.'})
 base=json.loads(MANIFEST.read_text(encoding='utf8'))
 rows={x['id']:x for x in base.get('records',[]) if x['id'] not in HEIGHTS}
 for r in records:rows[r['id']]=r
 rows['NPC-M003']={
  'id':'NPC-M003','kind':'civilian','artApproved':True,'production':True,'trial':True,
  'sprites':{
   'idle':'./assets/characters/metro/npc-m003/front-standing.png',
   'front':'./assets/characters/metro/npc-m003/front-standing.png',
   'side_left':'./assets/characters/metro/npc-m003/side-standing.png',
   'back':'./assets/characters/metro/npc-m003/back-standing.png',
   'rest':'./assets/characters/metro/npc-m003/special-front-seated-reading.png'},
  'geometry':{'heightMeters':1.65,'assetCrownY':.011,
   'assetSoleY':.989,'soleX':.5,'widthScale':.91},
  'notes':'Existing user-approved transparent M003 sprites kept intact.'}
 base['records']=list(rows.values())
 base['testPhase']='civilian-alpha-v1'
 base['description']='In-game trial assets with real transparency, not finalized walking animations.'
 base['pendingStateArt']=['communicate','rest','death']
 MANIFEST.write_text(json.dumps(base,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 # Acknowledge only test-stage registration in the visual gallery; full
 # authored communicate/rest/death animations remain explicitly incomplete.
 for item in gallery['characters']:
  if item['id'] not in HEIGHTS and item['id']!='NPC-M003':continue
  state=item.setdefault('production',{})
  state['registeredForGame']=True
  state['gameApproved']=False
  state['hasRealAlpha']=True
  state['trial']=True
  state['staging']='Real alpha views and world placement are available for first scene trial; gait and emotion states not authored.'
  if item['id']=='NPC-C005':state['sourceImageUserAccepted']=True
  if item['id'] in HEIGHTS:
   state['sprites']={k:v for k,v in rows[item['id']]['sprites'].items() if k!='idle'}
   state['heightMeters']=HEIGHTS[item['id']]
 gallery.setdefault('npcTest',{})['phase']='ready-for-gameplay-qa'
 gallery['npcTest']['extractedAlphaSprites']=len(output)
 GALLERY.write_text(json.dumps(gallery,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 print('Generated',len(output),'transparent view PNGs and',len(rows),'NPC registrations')
 for s in output:print(s)

if __name__=='__main__':build()
