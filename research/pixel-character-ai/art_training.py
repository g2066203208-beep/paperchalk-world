"""Human-made pixel art RGB(A) inpainting baseline; NOT a text-to-portrait generator.

The source artwork remains at its native, authored resolution and original colors.
Every loaded PNG is re-approved and SHA-256 verified against the quality report.
"""
import argparse,hashlib,json,pathlib,random
import numpy as np
import torch
from torch import nn
import torch.nn.functional as F
from torch.utils.data import Dataset,DataLoader
from PIL import Image
from quality_gate import curate

TILE=64
class NativeArtistPatches(Dataset):
    def __init__(self,approved,root,split):
        self.tiles=[];root=pathlib.Path(root).resolve()
        for item in approved:
            if item["split"]!=split or item["task"]!="portrait_fullbody":continue
            p=(root/item["path"]).resolve()
            if not p.is_relative_to(root) or hashlib.sha256(p.read_bytes()).hexdigest()!=item["sha256"]:
                raise ValueError("Approved artist source changed / path unsafe")
            with Image.open(p) as im:w,h=im.size
            for y in range(0,h-TILE+1,48):
                for x in range(0,w-TILE+1,48):self.tiles.append((p,x,y))
    def __len__(self):return len(self.tiles)
    def __getitem__(self,i):
        p,x,y=self.tiles[i]
        with Image.open(p) as im:
            a=np.asarray(im.convert("RGBA").crop((x,y,x+TILE,y+TILE)),dtype=np.uint8).copy()
        a[a[:,:,3]==0,:3]=0
        return torch.from_numpy(a).permute(2,0,1).float()/255

class ResBlock(nn.Module):
    def __init__(self,c,d):
        super().__init__();self.n=nn.GroupNorm(8,c);self.a=nn.Conv2d(c,c,3,padding=d,dilation=d);self.b=nn.Conv2d(c,c,1)
    def forward(self,x):return x+.4*self.b(F.gelu(self.a(F.gelu(self.n(x)))))

class ArtistRGBModel(nn.Module):
    """Predict each original RGB byte (3x256) and binary alpha (2) at native resolution."""
    def __init__(self,ch=32):
        super().__init__()
        if ch%8:raise ValueError("channels must divide by 8")
        self.stem=nn.Conv2d(7,ch,3,padding=1)
        self.blocks=nn.Sequential(*[ResBlock(ch,d) for d in (1,2,4,8,4,2,1)])
        self.out=nn.Conv2d(ch,770,1)
    def forward(self,rgba,mask):
        b,_,h,w=rgba.shape
        yy,xx=torch.meshgrid(torch.linspace(-1,1,h,device=rgba.device),torch.linspace(-1,1,w,device=rgba.device),indexing="ij")
        xy=torch.stack([xx,yy])[None].expand(b,-1,-1,-1)
        x=torch.cat([rgba*(~mask),mask.float(),xy],dim=1)
        return self.out(self.blocks(F.gelu(self.stem(x))))

def masked_loss(model,rgba):
    b,_,h,w=rgba.shape
    ratio=.25+.4*float(torch.rand(1))
    mask=torch.rand((b,1,h,w),device=rgba.device)<ratio
    logits=model(rgba,mask)
    values=(rgba*255).round().long()
    visible=values[:,3]>=128
    rgb_mask=(mask[:,0]&visible)
    total=torch.tensor(0.,device=rgba.device)
    for i in range(3):
        pixel_loss=F.cross_entropy(logits[:,i*256:(i+1)*256],values[:,i],reduction="none")
        total=total+(pixel_loss*rgb_mask).sum()/rgb_mask.sum().clamp(min=1)
    alpha_loss=F.cross_entropy(logits[:,768:770],visible.long(),reduction="none")
    return total+(alpha_loss*mask[:,0]).sum()/mask.sum().clamp(min=1)

def run(args):
    torch.manual_seed(args.seed);np.random.seed(args.seed);random.seed(args.seed)
    root=pathlib.Path(args.data).resolve()
    gate=curate(root,args.manifest)
    if gate["rejected"]:raise ValueError("BLOCKED: rejected source(s) "+json.dumps(gate["rejected"],ensure_ascii=False)[:400])
    rows=[r for r in gate["approved"] if r["task"]=="portrait_fullbody"]
    artists={k:{r["artist_id"] for r in rows if r["split"]==k} for k in ("train","val","test")}
    if len(artists["train"])<2 or len(artists["val"])<1:
        raise ValueError("BLOCKED: high-quality corpus needs >=2 reviewed train artists and >=1 heldout val artist")
    training=NativeArtistPatches(rows,root,"train");validation=NativeArtistPatches(rows,root,"val")
    if not len(training) or not len(validation):raise ValueError("BLOCKED: empty native-pixel patches")
    net=ArtistRGBModel(args.channels).to(args.device)
    opt=torch.optim.AdamW(net.parameters(),lr=args.lr)
    out=pathlib.Path(args.output);out.mkdir(parents=True,exist_ok=True)
    report={"status":"training","task":"MASKED INPAINTING, NOT FULL TEXT-TO-IMAGE",
            "train_artists":sorted(artists["train"]),"val_artists":sorted(artists["val"]),
            "approved_fullbody_images":len(rows),"train_tiles":len(training),
            "val_tiles":len(validation),"seed":args.seed}
    (out/"run.json").write_text(json.dumps(report,indent=2,ensure_ascii=False))
    with (out/"metrics.jsonl").open("w") as f:
        for epoch in range(args.epochs):
            net.train();tr=[]
            for batch in DataLoader(training,batch_size=args.batch,shuffle=True,num_workers=0):
                loss=masked_loss(net,batch.to(args.device))
                opt.zero_grad(set_to_none=True);loss.backward()
                nn.utils.clip_grad_norm_(net.parameters(),1.);opt.step()
                tr.append(float(loss.detach()))
            net.eval();vl=[]
            with torch.no_grad():
                for batch in DataLoader(validation,batch_size=args.batch,num_workers=0):
                    vl.append(float(masked_loss(net,batch.to(args.device))))
            record={"epoch":epoch+1,"train_loss":float(np.mean(tr)),"val_loss":float(np.mean(vl))}
            print(json.dumps(record),flush=True);f.write(json.dumps(record)+"\n");f.flush()
            torch.save({"state_dict":net.state_dict(),"channels":args.channels,"epoch":epoch+1},out/"latest.pt")
    report.update(status="finished",epochs=args.epochs)
    (out/"run.json").write_text(json.dumps(report,indent=2,ensure_ascii=False))

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--data",required=True)
    p.add_argument("--manifest",required=True)
    p.add_argument("--output",default="runs/human-art")
    p.add_argument("--epochs",type=int,default=20)
    p.add_argument("--batch",type=int,default=4)
    p.add_argument("--channels",type=int,default=32)
    p.add_argument("--lr",type=float,default=.0002)
    p.add_argument("--seed",type=int,default=20261031)
    p.add_argument("--device",default="cuda" if torch.cuda.is_available() else "cpu")
    run(p.parse_args())
