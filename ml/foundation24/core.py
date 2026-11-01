"""Lossless native 24x24 indexed pixel sprites and fail-closed artist-data admission."""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image

SIDE=24
CELL=40
MAX_COLORS=14
MASK_TOKEN=15
ADMISSION={'approved_artist_native','native_reauthored'}

def validate(tokens:np.ndarray, palette:np.ndarray)->dict:
    tokens=np.asarray(tokens);palette=np.asarray(palette)
    if tokens.shape!=(SIDE,SIDE) or not np.issubdtype(tokens.dtype,np.integer):
        raise ValueError('A sprite must be an integer 24x24 palette-index grid')
    if np.any(tokens<0) or np.any(tokens>MAX_COLORS):
        raise ValueError('Pixel index outside 0..14')
    if palette.shape!=(15,3) or not np.issubdtype(palette.dtype,np.integer):
        raise ValueError('Palette must contain 15 RGB integer rows')
    if np.any(palette<0) or np.any(palette>255):
        raise ValueError('Invalid RGB palette range')
    n=int(np.unique(tokens[tokens>0]).size)
    return {'opaque_pixels':int((tokens>0).sum()),'foreground_colors':n,'native_dimensions':[SIDE,SIDE]}

def decode_rgba(tokens,palette):
    validate(tokens,palette)
    rgba=np.zeros((SIDE,SIDE,4),np.uint8)
    rgba[:,:,:3]=np.asarray(palette,dtype=np.uint8)[tokens]
    rgba[:,:,3]=(np.asarray(tokens)>0).astype(np.uint8)*255
    return rgba

def indexed_from_rgba(png:Path):
    with Image.open(png) as im:
        if im.size!=(SIDE,SIDE) or im.mode!='RGBA':
            raise ValueError(f'{png}: native 24x24 RGBA required; no resize or conversion')
        rgba=np.asarray(im).copy()
    if not np.isin(rgba[:,:,3],[0,255]).all():
        raise ValueError(f'{png}: alpha must be binary')
    colors,inv=np.unique(rgba[rgba[:,:,3]==255,:3],axis=0,return_inverse=True)
    if len(colors)>MAX_COLORS:
        raise ValueError(f'{png}: more than 14 visible colors')
    palette=np.zeros((15,3),np.uint8)
    palette[1:1+len(colors)]=colors
    tokens=np.zeros((SIDE,SIDE),np.uint8)
    tokens[rgba[:,:,3]==255]=inv+1
    decoded=decode_rgba(tokens,palette)
    assert np.array_equal(decoded[:,:,3],rgba[:,:,3])
    assert np.array_equal(decoded[rgba[:,:,3]==255,:3],rgba[rgba[:,:,3]==255,:3])
    return tokens,palette

def load_approved(root,manifest):
    """Fails closed without provenance, native originals and two reviewers."""
    root=Path(root).resolve()
    records=json.loads(Path(manifest).read_text(encoding='utf8'))
    if not isinstance(records,list) or len(records)<3:
        raise ValueError('At least 3 reviewed records required')
    samples=[];identities={}
    for record in records:
        required=('path','identity_id','source','author','license','training_permission',
                  'native_status','reviewers','split','sha256')
        if any(not record.get(k) for k in required):
            raise ValueError('Missing provenance or review fields')
        if record['native_status'] not in ADMISSION:
            raise ValueError('Unverified native resolution')
        if record['training_permission'] is not True:
            raise ValueError('Training license not approved')
        if len(set(record['reviewers']))<2:
            raise ValueError('Two independent reviews required')
        if record['split'] not in ('train','val','test'):
            raise ValueError('Invalid split')
        p=(root/record['path']).resolve()
        if not p.is_relative_to(root) or not p.is_file():
            raise ValueError('Unsafe or missing image path')
        if hashlib.sha256(p.read_bytes()).hexdigest()!=record['sha256']:
            raise ValueError('Image hash differs from reviewed record')
        identity=record['identity_id'];split=record['split']
        if identity in identities and identities[identity]!=split:
            raise ValueError('Identity leaked across splits')
        identities[identity]=split
        tokens,palette=indexed_from_rgba(p)
        samples.append({'id':identity,'split':split,'tokens':tokens,'palette':palette})
    if not {'train','val','test'}.issubset({x['split'] for x in samples}):
        raise ValueError('Train/val/test splits required')
    if len({x['id'] for x in samples})<3:
        raise ValueError('Insufficient independent identities')
    return samples

def pilot_mini36():
    """UNAPPROVED AI-concept data. Pilot only, never artist-quality gold."""
    from ml.mini36.atlas import unpack
    _,palettes,tokens=unpack()
    return [{'id':f'mini36-R{i//6+1}C{i%6+1}',
             'split':'train' if i<30 else ('val' if i<33 else 'test'),
             'tokens':tokens[i],'palette':palettes[i]} for i in range(36)]

def gallery(tokens_list,palettes,columns=8,background=(242,238,228)):
    if not tokens_list or len(tokens_list)!=len(palettes):
        raise ValueError('Invalid gallery')
    rows=(len(tokens_list)+columns-1)//columns
    canvas=np.full((rows*CELL,columns*CELL,4),255,np.uint8)
    canvas[:,:,:3]=background
    for i,(tokens,palette) in enumerate(zip(tokens_list,palettes)):
        r,c=divmod(i,columns)
        rgba=decode_rgba(tokens,palette)
        patch=canvas[r*CELL+8:r*CELL+32,c*CELL+8:c*CELL+32]
        patch[rgba[:,:,3]>0]=rgba[rgba[:,:,3]>0]
    return Image.fromarray(canvas,'RGBA')

def save_native_and_nearest(img:Image.Image,out:Path):
    out=Path(out);out.parent.mkdir(parents=True,exist_ok=True)
    img.save(out)
    enlarged=img.resize((img.width*4,img.height*4),Image.Resampling.NEAREST)
    enlarged.save(out.with_name(out.stem+'-4x.png'))
    a=np.asarray(img);b=np.asarray(enlarged)
    if not np.array_equal(b,np.repeat(np.repeat(a,4,axis=0),4,axis=1)):
        raise AssertionError('Nearest-neighbor pixel integrity failed')
