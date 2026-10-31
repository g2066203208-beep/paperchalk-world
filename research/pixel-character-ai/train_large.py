"""Train a native-grid guided tile-detail model. Requires licensed multi-identity pixel art."""
import argparse,json,pathlib,random,time
import numpy as np
import torch
import torch.nn.functional as F
from torch.utils.data import Dataset,DataLoader
from large_canvas import PROFILES,encode_native,save_native,tile_regions,block_guide
from tile_refiner import GuidedTileNet,global_coordinates,refine_guided
POSES=('站立','挥手','行走');HAIRS=('短发','长发','双丸子','侧马尾');OUTFITS=('围裙','外套','连衣裙','工装')
def split_identity(identity):
    s=str(identity).strip();h=2166136261
    if not s:raise ValueError('Missing identity')
    data=s.encode('utf-16-le')
    for i in range(0,len(data),2):
        h=((h^(data[i]|(data[i+1]<<8)))*16777619)&0xffffffff
    r=h%10
    return 'train' if r<8 else ('val' if r==8 else 'test')
def load_rows(root,manifest,profile):
    if profile not in PROFILES:raise ValueError('Unknown profile')
    parsed=json.loads(pathlib.Path(manifest).read_text('utf-8'))
    rows=parsed.get('items') if isinstance(parsed,dict) else parsed
    if not isinstance(rows,list):raise ValueError('Invalid manifest')
    out=[]
    for r in rows:
        if r.get('profile')!=profile:continue
        license=str(r.get('license','')).strip()
        if not license or license.lower() in ('unknown','none'):raise ValueError('Training rights and license must be explicit')
        identity=str(r['identity_id']).strip();part=split_identity(identity)
        if r.get('split') not in (None,part):raise ValueError('Identity leakage in manifest')
        p=(root/r.get('path',r.get('file',''))).resolve()
        if not p.is_relative_to(root.resolve()) or not p.is_file():raise ValueError('Unsafe/missing training PNG')
        image=encode_native(p,profile)
        condition=[POSES.index(r['pose']),HAIRS.index(r['hair']),OUTFITS.index(r['outfit'])]
        out.append((image,block_guide(image,4),condition,part,identity))
    return out
class TileDataset(Dataset):
    def __init__(self,rows,split,tile=64,stride=48):
        self.items=[]
        for image,guide,condition,part,identity in rows:
            if part!=split:continue
            h,w=image.shape
            size=min(tile,w,h)
            for (x,y,_,_),_ in tile_regions(w,h,tile,stride):
                self.items.append((image[y:y+size,x:x+size].copy(),
                    guide[y:y+size,x:x+size].copy(),global_coordinates(x,y,w,h,size),condition))
    def __len__(self):return len(self.items)
    def __getitem__(self,i):
        a,b,xy,c=self.items[i]
        return torch.from_numpy(a).long(),torch.from_numpy(b).long(),xy,torch.tensor(c,dtype=torch.long)
def loss_fn(net,pixels,guide,coords,condition):
    mask=torch.rand_like(pixels,dtype=torch.float32)<(.15+.65*torch.rand((),device=pixels.device))
    if not mask.any():mask.reshape(-1)[0]=True
    logits=net(pixels.masked_fill(mask,5),guide,coords,condition)
    loss=F.cross_entropy(logits,pixels,reduction='none')
    weight=torch.where(pixels==0,.5,2.)
    return (loss*weight*mask).sum()/(weight*mask).sum()
def train(args):
    if not getattr(args,"experimental_four_ink_ablation",False):
        raise RuntimeError("This tool is an old FOUR-COLOR ablation only. For curated original artist RGB pixel work, use art_training.py with human quality review. Pass --experimental-four-ink-ablation to deliberately run this limited baseline.")
    random.seed(args.seed);np.random.seed(args.seed);torch.manual_seed(args.seed)
    if torch.cuda.is_available():torch.cuda.manual_seed_all(args.seed)
    root=pathlib.Path(args.data).resolve()
    rows=load_rows(root,root/args.manifest,args.profile)
    ids={part:{r[4] for r in rows if r[3]==part} for part in ('train','val','test')}
    if len(ids['train'])<2 or not ids['val']:raise ValueError('At least two train identities and one disjoint val identity required')
    ds=TileDataset(rows,'train');vs=TileDataset(rows,'val')
    dl=DataLoader(ds,batch_size=args.batch,shuffle=True);vl=DataLoader(vs,batch_size=args.batch)
    net=GuidedTileNet(args.channels).to(args.device);opt=torch.optim.AdamW(net.parameters(),lr=args.lr)
    out=pathlib.Path(args.output);out.mkdir(parents=True,exist_ok=True)
    meta={'profile':args.profile,'resolution':PROFILES[args.profile],'train_identities':len(ids['train']),
      'val_identities':len(ids['val']),'train_tiles':len(ds),'val_tiles':len(vs),
      'seed':args.seed,'state':'training','guide':'block-majority factor4'}
    (out/'run.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),'utf-8')
    best=float('inf');start=time.monotonic()
    with (out/'metrics.jsonl').open('w') as log:
        for epoch in range(1,args.epochs+1):
            net.train();total=0.
            for a,b,xy,c in dl:
                a=a.to(args.device);b=b.to(args.device);xy=xy.to(args.device);c=c.to(args.device)
                loss=loss_fn(net,a,b,xy,c)
                opt.zero_grad(set_to_none=True);loss.backward()
                torch.nn.utils.clip_grad_norm_(net.parameters(),1.);opt.step()
                total+=float(loss.item())*len(a)
            net.eval();vsum=0.
            with torch.no_grad():
                torch.manual_seed(args.seed+137)
                for a,b,xy,c in vl:
                    a=a.to(args.device);b=b.to(args.device);xy=xy.to(args.device);c=c.to(args.device)
                    vsum+=float(loss_fn(net,a,b,xy,c).item())*len(a)
            score=vsum/len(vs);rec={'epoch':epoch,'train':total/len(ds),'val':score,
              'seconds':round(time.monotonic()-start,2)}
            log.write(json.dumps(rec)+'\n');log.flush();print(json.dumps(rec),flush=True)
            if score<best:
                best=score
                torch.save({'weights':net.state_dict(),'channels':args.channels,
                  'profile':args.profile,'epoch':epoch,'val':score},out/'best.pt')
    meta.update(state='finished',best_val_loss=best,epochs=args.epochs)
    (out/'run.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),'utf-8')
def sample(args):
    checkpoint=torch.load(args.checkpoint,map_location=args.device,weights_only=True)
    if checkpoint['profile']!=args.profile:raise ValueError('Checkpoint profile mismatch')
    net=GuidedTileNet(checkpoint['channels']).to(args.device)
    net.load_state_dict(checkpoint['weights'])
    guide=encode_native(args.guide,args.profile)
    condition=[POSES.index(args.pose),HAIRS.index(args.hair),OUTFITS.index(args.outfit)]
    prediction=refine_guided(net,guide,condition,iterations=args.iterations,device=args.device)
    save_native(prediction,args.output)
    print(json.dumps({'output':args.output,'profile':args.profile,'epoch':checkpoint['epoch']},ensure_ascii=False))
if __name__=='__main__':
    p=argparse.ArgumentParser();sub=p.add_subparsers(dest='command',required=True)
    t=sub.add_parser('train')
    t.add_argument('--data',required=True);t.add_argument('--manifest',default='manifest.json')
    t.add_argument('--profile',choices=list(PROFILES),default='portrait')
    t.add_argument('--experimental-four-ink-ablation',action='store_true');t.add_argument('--output',default='runs/portrait')
    t.add_argument('--epochs',type=int,default=30);t.add_argument('--batch',type=int,default=8)
    t.add_argument('--channels',type=int,default=32);t.add_argument('--lr',type=float,default=.0003)
    t.add_argument('--seed',type=int,default=20261031)
    t.add_argument('--device',default='cuda' if torch.cuda.is_available() else 'cpu')
    s=sub.add_parser('sample')
    s.add_argument('--checkpoint',required=True);s.add_argument('--guide',required=True)
    s.add_argument('--profile',choices=list(PROFILES),default='portrait');s.add_argument('--output',default='portrait.png')
    s.add_argument('--pose',choices=POSES,default='站立');s.add_argument('--hair',choices=HAIRS,default='短发')
    s.add_argument('--outfit',choices=OUTFITS,default='围裙');s.add_argument('--iterations',type=int,default=2)
    s.add_argument('--device',default='cpu')
    args=p.parse_args()
    train(args) if args.command=='train' else sample(args)
