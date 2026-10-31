"""Licensed, identity-disjoint and strict native-pixel sprite dataset."""
import json,pathlib
import numpy as np
from PIL import Image
import torch
from torch.utils.data import Dataset
from model import HEIGHT,WIDTH,PALETTE,POSES,HAIRS,OUTFITS

def split_identity(identity):
    identity=str(identity).strip()
    if not identity:raise ValueError('identity_id required')
    h=2166136261
    data=identity.encode('utf-16-le')
    for i in range(0,len(data),2):
        h ^= data[i] | (data[i+1]<<8)
        h=(h*16777619)&0xffffffff
    n=h%10
    return 'train' if n<8 else ('val' if n==8 else 'test')

def encode(path):
    with Image.open(path) as im:
        im=im.convert('RGBA')
        if im.size!=(WIDTH,HEIGHT):raise ValueError('Expected native 48x64: '+str(path))
        a=np.asarray(im,dtype=np.uint8)
    alpha=a[:,:,3]
    if np.any((alpha!=0)&(alpha!=255)):raise ValueError('Half-alpha rejected: '+str(path))
    out=np.zeros((HEIGHT,WIDTH),dtype=np.int64)
    for k,c in enumerate(PALETTE,1):
        out[(alpha==255)&np.all(a[:,:,:3]==c,axis=-1)]=k
    invalid=(alpha==255)&(out==0)
    if invalid.any():
        y,x=np.argwhere(invalid)[0];raise ValueError('Off palette '+str(path)+' at '+str((int(x),int(y))))
    return torch.from_numpy(out)

def save_png(tokens,path):
    a=np.asarray(tokens,dtype=np.int64)
    if a.shape!=(HEIGHT,WIDTH) or np.any((a<0)|(a>4)):raise ValueError('Not 48x64 indexes 0..4')
    out=np.zeros((HEIGHT,WIDTH,4),dtype=np.uint8)
    for k,c in enumerate(PALETTE,1):out[a==k,:3]=c;out[a==k,3]=255
    Image.fromarray(out,'RGBA').save(path)

def validate_manifest(root,manifest):
    rows=json.loads(pathlib.Path(manifest).read_text('utf-8'))
    if isinstance(rows,dict):rows=rows['items']
    if not isinstance(rows,list):raise ValueError('Manifest must be list or {items: [...]}')
    records=[]
    for r in rows:
        identity=str(r['identity_id']).strip()
        license=str(r.get('license','')).strip()
        if not license or license.lower() in ('unknown','none'):raise ValueError('Explicit license required')
        split=split_identity(identity)
        if r.get('split') not in (None,split):
            raise ValueError('Incorrect identity split for '+identity)
        p=(root/r.get('path',r.get('file',''))).resolve()
        if not p.is_relative_to(root.resolve()) or not p.is_file() or p.suffix.lower()!='.png':
            raise ValueError('Missing/unsafe PNG: '+str(p))
        encode(p)
        cond=[POSES.index(r['pose']),HAIRS.index(r['hair']),OUTFITS.index(r['outfit'])]
        records.append({'path':p,'split':split,'condition':cond,'identity_id':identity,'license':license})
    return records

class SpriteDataset(Dataset):
    def __init__(self,rows,split):self.rows=[r for r in rows if r['split']==split]
    def __len__(self):return len(self.rows)
    def __getitem__(self,i):
        r=self.rows[i]
        return encode(r['path']),torch.tensor(r['condition'],dtype=torch.long)
