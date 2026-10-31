"""Native indexed canvases and exact (not resized) overlap tile geometry.
Infrastructure, NOT an image generation model.
"""
from pathlib import Path
import numpy as np
from PIL import Image
PALETTE=np.array([(57,54,87),(242,165,194),(169,186,233),(255,245,230)],dtype=np.uint8)
PROFILES={'npc':(48,64),'portrait':(192,256),'portrait_hd':(384,512),'scene_square':(512,512),'scene_wide':(1024,768)}
def dimensions(profile):
    if profile not in PROFILES:raise ValueError(f'Unsupported profile: {profile}')
    return PROFILES[profile]
def encode_native(path,profile):
    with Image.open(path) as image:
        if image.format!='PNG':raise ValueError('PNG only')
        if image.size!=dimensions(profile):raise ValueError(f'Expected native {dimensions(profile)}; got {image.size}')
        rgba=np.asarray(image.convert('RGBA'),dtype=np.uint8)
    alpha=rgba[:,:,3]
    if np.any((alpha!=0)&(alpha!=255)):raise ValueError('Semi-transparent cell rejected')
    out=np.zeros(alpha.shape,dtype=np.uint8)
    for ink,color in enumerate(PALETTE,1):
        out[(alpha==255)&np.all(rgba[:,:,:3]==color,axis=-1)]=ink
    if np.any((alpha==255)&(out==0)):raise ValueError('Off-palette cell rejected')
    return out
def save_native(indexes,path):
    a=np.asarray(indexes)
    if a.ndim!=2 or np.any((a<0)|(a>4)):raise ValueError('Expected HxW with indexes 0..4')
    rgb=np.zeros((*a.shape,4),dtype=np.uint8)
    for i,color in enumerate(PALETTE,1):
        rgb[a==i,:3]=color
        rgb[a==i,3]=255
    Image.fromarray(rgb,mode='RGBA').save(path)
def axis_starts(size,tile=64,stride=48):
    if tile<1 or size<tile or stride<1 or stride>tile:raise ValueError('Require 1 <= stride <= tile <= size')
    xs=list(range(0,size-tile+1,stride))
    if xs[-1]!=size-tile:xs.append(size-tile)
    return xs
def tile_regions(width,height,tile=64,stride=48):
    """Return input rectangle and single-owner core; full coverage without seams."""
    tile=min(tile,width,height);stride=min(stride,tile)
    xs=axis_starts(width,tile,stride);ys=axis_starts(height,tile,stride)
    for jy,y in enumerate(ys):
        top=0 if jy==0 else (ys[jy-1]+tile+y)//2
        bottom=height if jy==len(ys)-1 else (y+tile+ys[jy+1])//2
        for ix,x in enumerate(xs):
            left=0 if ix==0 else (xs[ix-1]+tile+x)//2
            right=width if ix==len(xs)-1 else (x+tile+xs[ix+1])//2
            yield (x,y,x+tile,y+tile),(left,top,right,bottom)
def reconstruct_tiles(indexed,tile=64,stride=48):
    """Byte-identical tiling test; no resizing, smoothing or averaging."""
    h,w=indexed.shape;tile=min(tile,w,h)
    out=np.zeros_like(indexed);coverage=np.zeros_like(indexed,dtype=np.uint8)
    for (x0,y0,_,_),(l,t,r,b) in tile_regions(w,h,tile,stride):
        part=indexed[y0:y0+tile,x0:x0+tile]
        out[t:b,l:r]=part[t-y0:b-y0,l-x0:r-x0]
        coverage[t:b,l:r]+=1
    if not np.all(coverage==1):raise AssertionError('Tile ownership gap/overlap')
    return out
def block_guide(indexes,factor=4):
    """Block-majority coarse guide on same canvas (not an art-quality enhancement)."""
    a=np.asarray(indexes);h,w=a.shape
    if factor<1 or h%factor or w%factor:raise ValueError('Dimensions must divide factor')
    count=np.stack([(a==i).reshape(h//factor,factor,w//factor,factor).sum((1,3)) for i in range(5)])
    coarse=np.argmax(count,axis=0).astype(np.uint8)
    return np.repeat(np.repeat(coarse,factor,axis=0),factor,axis=1)
