#!/usr/bin/env python3
"""Build a six-person FRONT-only comparison for the civilian NPC art collection.

Source canonical art is never modified. All six renders are normalized to the
same on-page display height; no real-world height ranking is implied.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json

ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/"site/assets/characters/civilians/npc-front-comparison-20261108.png"
GALLERY=ROOT/"site/data/npc/civilians/gallery.v1.json"
ORDER=[
 ("NPC-M003","Elderly man"),
 ("NPC-C003","Elderly woman"),
 ("NPC-C001","Office worker"),
 ("NPC-C004","Young man"),
 ("NPC-C002","Young woman"),
 ("NPC-C005","Middle-aged woman")
]
FONT_CANDIDATES=[
 "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
 "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
 "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"
]
def font(size):
 for f in FONT_CANDIDATES:
  if Path(f).exists():
   return ImageFont.truetype(f,size=size)
 return ImageFont.load_default()

def bbox_nonwhite(im):
 # crop only the figure and ignore the white character-sheet background
 rgb=im.convert("RGB")
 mask=rgb.point(lambda x: 255 if x < 244 else 0)
 # mask RGB max; a pixel is nonwhite whenever one channel drops below cutoff
 import PIL.ImageChops as C
 r,g,b=mask.split()
 binary=C.lighter(C.lighter(r,g),b)
 return binary.getbbox()

def front_crop(root,npc):
 source=root / npc["source"]["path"]
 im=Image.open(source).convert("RGBA")
 if npc["id"]=="NPC-M003":
  # Reuse the existing USER-APPROVED isolated front-standing sprite, not
  # a crop guessed from a four-panel original; preserve the approved art.
  p=root/"site/assets/characters/metro/npc-m003/front-standing.png"
  im=Image.open(p).convert("RGBA")
  alpha=im.getchannel("A")
  bb=alpha.getbbox()
  return im.crop(bb)
 # User's actual three-view PNG: left side | center front | right back.
 w,h=im.size
 assert im.size==(1024,1024),f"Unexpected dimensions: {source} {im.size}"
 center=im.crop((340,0,668,h))  # exclude the neighboring left/right view figures
 bb=bbox_nonwhite(center)
 if not bb: raise RuntimeError(f"No front-view figure found for {npc['id']}")
 return center.crop(bb)

def main():
 d=json.loads(GALLERY.read_text())
 people={c["id"]:c for c in d["characters"]}
 assert all(i in people for i,_ in ORDER), "Missing civilian roster entry"
 N=len(ORDER); PANEL_W=375; W=N*PANEL_W; H=1140
 page=Image.new("RGB",(W,H),(248,248,247))
 draw=ImageDraw.Draw(page)
 titlefont=font(31); small=font(19); mini=font(15)
 draw.rectangle((0,0,W,106),fill=(235,236,236))
 draw.text((30,14),"CIVILIAN NPC  |  FRONT VIEW COMPARISON",font=titlefont,fill=(29,35,38))
 draw.text((30,62),"Same display height for art comparison; NOT actual game character heights.",font=small,fill=(85,91,95))
 draw.line([(30,101),(W-30,101)],fill=(196,198,198),width=2)
 ground=1035
 for i,(id,label) in enumerate(ORDER):
  npc=people[id]; x0=i*PANEL_W; xmid=x0+PANEL_W/2
  if i:
   draw.line([(x0,122),(x0,H-18)],fill=(215,217,218),width=2)
  cropped=front_crop(ROOT,npc)
  target_h=850; target_w=round(cropped.width * target_h / cropped.height)
  if target_w>PANEL_W-25:
   target_w=PANEL_W-25
   target_h=round(cropped.height*target_w/cropped.width)
  cropped=cropped.resize((target_w,target_h),Image.Resampling.LANCZOS)
  x=round(xmid-target_w/2)
  y=ground-target_h
  page.paste(cropped,(x,y),cropped)
  draw.line([(x0+12,ground+2),(x0+PANEL_W-12,ground+2)],fill=(186,190,191),width=1)
  draw.text((x0+22,1052),id,font=titlefont,fill=(34,42,46))
  draw.text((x0+22,1090),label,font=small,fill=(92,97,100))
 OUTPUT.parent.mkdir(parents=True,exist_ok=True)
 page.save(OUTPUT,optimize=True)
 print("WROTE",OUTPUT,page.size,"bytes",OUTPUT.stat().st_size)
 for id,label in ORDER:print(id,people[id]["source"]["path"])

if __name__=="__main__":
 main()
