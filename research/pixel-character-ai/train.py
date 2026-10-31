"""Conditional masked-sprite model: reproducible training and sampling CLI."""
import argparse,json,pathlib,random,time
import numpy as np
import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader
from dataset import SpriteDataset,validate_manifest,save_png
from model import MaskedSpriteNet,MASK,sample,POSES,HAIRS,OUTFITS

def seed_all(seed):
    random.seed(seed);np.random.seed(seed);torch.manual_seed(seed)
    if torch.cuda.is_available():torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic=True
    torch.backends.cudnn.benchmark=False

def masked_loss(net,tokens,condition):
    fraction=.1+.8*torch.rand((),device=tokens.device)
    mask=torch.rand(tokens.shape,device=tokens.device)<fraction
    if not mask.any():mask.flatten()[0]=True
    logits=net(tokens.masked_fill(mask,MASK),condition)
    loss=F.cross_entropy(logits,tokens,reduction='none')
    weights=torch.where(tokens==0,1.0,2.0)
    return (loss*mask*weights).sum()/(mask*weights).sum()

def train(args):
    seed_all(args.seed)
    root=pathlib.Path(args.data).resolve()
    rows=validate_manifest(root,root/args.manifest)
    ds=SpriteDataset(rows,'train');val=SpriteDataset(rows,'val')
    if len(ds)<2 or len(val)<1:raise ValueError('Need >=2 train sprites and >=1 identity-disjoint val sprite')
    device=torch.device(args.device)
    loader=DataLoader(ds,batch_size=args.batch,shuffle=True,num_workers=0)
    eval_loader=DataLoader(val,batch_size=args.batch,shuffle=False,num_workers=0)
    net=MaskedSpriteNet(channels=args.channels).to(device)
    opt=torch.optim.AdamW(net.parameters(),lr=args.lr,weight_decay=.01)
    out=pathlib.Path(args.output);out.mkdir(parents=True,exist_ok=True)
    meta={'seed':args.seed,'train_count':len(ds),'val_count':len(val),'parameters':sum(p.numel() for p in net.parameters()),'device':str(device),'status':'training','model':'conditional masked token baseline'}
    (out/'run.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),'utf-8')
    best=float('inf');start=time.monotonic()
    with (out/'metrics.jsonl').open('w',encoding='utf-8') as log:
        for epoch in range(1,args.epochs+1):
            net.train();total=0.
            for x,c in loader:
                x=x.to(device);c=c.to(device)
                loss=masked_loss(net,x,c)
                opt.zero_grad(set_to_none=True);loss.backward()
                torch.nn.utils.clip_grad_norm_(net.parameters(),1.);opt.step()
                total+=float(loss.item())*len(x)
            net.eval();vtotal=0.
            with torch.no_grad():
                torch.manual_seed(args.seed+3000)
                for x,c in eval_loader:
                    x=x.to(device);c=c.to(device)
                    vtotal+=float(masked_loss(net,x,c).item())*len(x)
            score=vtotal/len(val)
            rec={'epoch':epoch,'train_loss':round(total/len(ds),6),'val_loss':round(score,6),'elapsed_seconds':round(time.monotonic()-start,2)}
            log.write(json.dumps(rec)+'\n');log.flush();print(json.dumps(rec),flush=True)
            if score<best:
                best=score
                torch.save({'state_dict':net.state_dict(),'config':{'channels':args.channels},'epoch':epoch,'seed':args.seed,'best_val_loss':score},out/'best.pt')
    meta.update(status='finished',best_val_loss=best,epochs=args.epochs)
    (out/'run.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),'utf-8')

def generate(args):
    seed_all(args.seed)
    # Only open checkpoints that you created/trust.
    c=torch.load(args.checkpoint,map_location=args.device,weights_only=True)
    net=MaskedSpriteNet(channels=c['config']['channels']).to(args.device)
    net.load_state_dict(c['state_dict'])
    condition=[POSES.index(args.pose),HAIRS.index(args.hair),OUTFITS.index(args.outfit)]
    tokens=sample(net,condition,seed=args.seed,steps=args.steps)
    save_png(tokens,args.output)
    print(json.dumps({'output':args.output,'seed':args.seed,'trained_checkpoint_epoch':c['epoch']},ensure_ascii=False))

if __name__=='__main__':
    p=argparse.ArgumentParser()
    subs=p.add_subparsers(dest='command',required=True)
    t=subs.add_parser('train')
    t.add_argument('--data',required=True)
    t.add_argument('--manifest',default='manifest.json')
    t.add_argument('--output',default='runs/r1')
    t.add_argument('--epochs',type=int,default=30)
    t.add_argument('--batch',type=int,default=8)
    t.add_argument('--channels',type=int,default=64)
    t.add_argument('--lr',type=float,default=.0003)
    t.add_argument('--seed',type=int,default=20261031)
    t.add_argument('--device',default='cuda' if torch.cuda.is_available() else 'cpu')
    s=subs.add_parser('sample')
    s.add_argument('--checkpoint',required=True)
    s.add_argument('--output',default='sample.png')
    s.add_argument('--pose',choices=POSES,default='站立')
    s.add_argument('--hair',choices=HAIRS,default='短发')
    s.add_argument('--outfit',choices=OUTFITS,default='围裙')
    s.add_argument('--seed',type=int,default=42)
    s.add_argument('--steps',type=int,default=16)
    s.add_argument('--device',default='cpu')
    args=p.parse_args()
    train(args) if args.command=='train' else generate(args)
