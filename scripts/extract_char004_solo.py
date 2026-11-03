#!/usr/bin/env python3
"""Exact-source extraction of approved CHAR-004 left full-body panel.

The input is the user's selected 1024x1024 reference sheet. Pixel edits
remove the overlapping *right* portrait only; do not redraw the left girl.
"""
from __future__ import annotations
from PIL import Image, ImageDraw
from pathlib import Path
import base64, hashlib, io, json

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'site/assets/characters/char-004/reference-sheet.png'
OUTPUT=ROOT/'site/assets/characters/char-004/fullbody-solo.png'
REVIEW=ROOT/'docs/characters/char004-review/solo-thumb.b64'
INFO=ROOT/'docs/characters/char004-review/solo.json'

src=Image.open(SOURCE).convert('RGBA')
if src.size != (1024,1024):
 raise ValueError(f'Unexpected approved source geometry: {src.size}')
# The reference has a left full-body model and overlapping enlarged right
# bust. The girl's held coat extends to x~434; the second shoe to x~539.
# Keep every source pixel to x=448, remove the entire right bust, then
# restore the second shoe's unique silhouette on the bottom of the sheet.
crop_w=604
image=Image.new('RGBA',(crop_w,1024),(255,255,255,255))
image.paste(src.crop((0,0,crop_w,1024)),(0,0))
out_pixels=image.load()
for y in range(1024):
 for x in range(448,crop_w):
  # White-paper foreground erase, no generative replacement.
  out_pixels[x,y]=(255,255,255,255)
# The original reference sheet also contributes a small disconnected dark
# contour at x~437, y~860 (the edge of the enlarged right portrait). It is
# NOT part of the girl's trouser; clear that sliver without touching her leg.
ImageDraw.Draw(image).polygon([(434,847),(451,849),(452,895),(436,895)],fill=(255,255,255,255))
# Restore the distant (right) shoe and ankle that extends into the erased
# right bust panel. The polygon is entirely below the girl's knee.
keep=Image.new('L',(crop_w,1024),0)
draw=ImageDraw.Draw(keep)
draw.polygon([
 (400,913),(417,913),(435,932),(450,939),(470,947),
 (496,967),(517,984),(536,1008),(545,1023),
 (408,1023),(395,999),(388,963),(397,934)
],fill=255)
# Keep actual dark shoe pixels, not the giant right bust's white shirt.
kp=keep.load()
source_pixels=src.load()
for y in range(900,1024):
 for x in range(448,min(crop_w,548)):
  if kp[x,y] == 0: continue
  r,g,b,a=source_pixels[x,y]
  # Fine anti-aliasing remains unchanged for actual shoe pixels.
  if a>0 and min(r,g,b)<175 and (r+g+b)/3<155:
   out_pixels[x,y]=(r,g,b,a)
# Avoid a hard white vertical edge by erasing only the right panel:
# original pixels to the left (x<=447) remain completely identical.
OUTPUT.parent.mkdir(parents=True,exist_ok=True)
image.save(OUTPUT,optimize=True)
preview=image.copy()
preview.thumbnail((422,716),Image.Resampling.LANCZOS)
b=io.BytesIO();preview.save(b,format='PNG',optimize=True)
REVIEW.parent.mkdir(parents=True,exist_ok=True)
REVIEW.write_text(base64.b64encode(b.getvalue()).decode('ascii'))
INFO.write_text(json.dumps({
 'source':'site/assets/characters/char-004/reference-sheet.png',
 'output':'site/assets/characters/char-004/fullbody-solo.png',
 'source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
 'output_sha256':hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),
 'output_size':list(image.size),
 'unchanged_left_columns':448,
 'purpose':'remove right giant portrait, preserve left full-body and shoe; no redraw',
 'status':'single-character preview, not Live2D or rigged'
},ensure_ascii=False,indent=2))
print('Extracted',OUTPUT,'bytes',OUTPUT.stat().st_size,'sha256',hashlib.sha256(OUTPUT.read_bytes()).hexdigest())
