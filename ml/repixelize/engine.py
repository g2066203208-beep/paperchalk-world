#!/usr/bin/env python3
"""Faithful fake-pixel -> genuine four-color grid. Exact palette + area votes.
Uses original composition, does not redraw parts or invoke generative models.
"""
import argparse
import base64
import hashlib
import json
import lzma
from pathlib import Path
import numpy as np
from PIL import Image

PALETTE=np.array([[15,15,59],[227,54,134],[44,159,206],[253,238,143]],np.uint8)
WIDTH,HEIGHT=384,512

def classify(image,palette=PALETTE):
    rgb=np.asarray(image.convert('RGB'),dtype=np.int32)
    p=np.asarray(palette,dtype=np.int32)
    labels=np.empty(rgb.shape[:2],dtype=np.uint8)
    for y in range(0,rgb.shape[0],96):
        strip=rgb[y:y+96]
        dist=np.square(strip[:,:,None,:]-p[None,None,:,:]).sum(axis=3)
        labels[y:y+96]=np.argmin(dist,axis=2)
    return labels

def project(labels,width=WIDTH,height=HEIGHT):
    if labels.ndim!=2 or width<1 or height<1:raise ValueError('invalid grid')
    if labels.shape==(height,width):return labels.copy()
    votes=np.stack([
        np.asarray(Image.fromarray((labels==k).astype(np.uint8)*255).resize(
            (width,height),Image.Resampling.BOX),dtype=np.uint8)
        for k in range(4)
    ],axis=2)
    return votes.argmax(axis=2).astype(np.uint8)

def from_tokens(tokens):
    a=np.asarray(tokens)
    if a.ndim!=2 or np.any(a>3):raise ValueError('bad palette tokens')
    return Image.fromarray(PALETTE[a.astype(np.uint8)],mode='RGB')

def encode(tokens):
    a=np.asarray(tokens,np.uint8).ravel()
    if len(a)%4 or np.any(a>3):raise ValueError('invalid 2-bit tokens')
    packed=((a.reshape(-1,4).astype(np.uint16)<<np.array([0,2,4,6])).sum(axis=1)).astype(np.uint8)
    return base64.b64encode(lzma.compress(packed.tobytes(),preset=9 | lzma.PRESET_EXTREME)).decode('ascii')

def decode(text,width=WIDTH,height=HEIGHT):
    binary=lzma.decompress(base64.b64decode(text.strip(),validate=True))
    a=np.frombuffer(binary,np.uint8)
    if len(a)*4!=width*height:raise ValueError('corrupted reference length')
    return ((a[:,None]>>np.array([0,2,4,6],dtype=np.uint8))&3).astype(np.uint8).reshape(height,width)

def validate(image):
    if image.mode!='RGB':raise AssertionError('not opaque RGB')
    colors=np.unique(np.asarray(image).reshape(-1,3),axis=0)
    if len(colors)!=4 or not np.array_equal(colors,np.unique(PALETTE,axis=0)):
        raise AssertionError('not exactly 4 permitted colors')
    return {'native_width':image.width,'native_height':image.height,
            'visible_colors':4,'additional_colors':0,'semitransparent_pixels':0}

def convert(input_path=None,embedded=None,out_dir='site/pixel-lab',width=WIDTH,height=HEIGHT):
    target=Path(out_dir);target.mkdir(parents=True,exist_ok=True)
    if input_path:
        raw=Path(input_path).read_bytes()
        original=Image.open(input_path).convert('RGB')
        original_labels=classify(original)
        native_labels=project(original_labels,width,height)
        origin='uploaded original RGB image'
        fingerprint=hashlib.sha256(raw).hexdigest()
    elif embedded:
        original_labels=decode(Path(embedded).read_text(),width,height)
        native_labels=original_labels
        origin='published 2-bit native-grid snapshot derived from original upload'
        fingerprint=hashlib.sha256(Path(embedded).read_bytes()).hexdigest()
    else:raise ValueError('Pass --input or --embedded')
    image=from_tokens(native_labels)
    report=validate(image)
    image.save(target/'repixelized-384x512.png',optimize=True)
    preview=image.resize((width*3,height*3),Image.Resampling.NEAREST)
    preview.save(target/'repixelized-preview.png',optimize=True)
    report.update({'input_type':origin,'sha256':fingerprint,
                   'algorithm':'fixed palette nearest-RGB classification + per-native-pixel area majority vote',
                   'preserves_contents':'yes, no freehand regeneration; boundary sampling still changes some fine pixels'})
    if input_path and original_labels.shape==(height*3,width*3):
        up=np.repeat(np.repeat(native_labels,3,axis=0),3,axis=1)
        eq=(up==original_labels)
        report['source_palette_class_agreement']=round(float(eq.mean()),5)
        report['source_foreground_class_agreement']=round(float(eq[original_labels!=0].mean()),5)
    (target/'repixelize-quality.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    return report

def main():
    a=argparse.ArgumentParser()
    a.add_argument('--input',type=Path)
    a.add_argument('--embedded',type=Path)
    a.add_argument('--out-dir',default='site/pixel-lab')
    a.add_argument('--width',type=int,default=WIDTH)
    a.add_argument('--height',type=int,default=HEIGHT)
    args=a.parse_args()
    print('REPIXELIZED',json.dumps(convert(args.input,args.embedded,args.out_dir,args.width,args.height),ensure_ascii=False))

if __name__=='__main__':main()
