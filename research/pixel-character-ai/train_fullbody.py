"""Full-body only (not headshots, not sprite poses, not scenes) research trainer.

Requires reviewed original artist PNG at NATIVE 192x256 or 384x512.
Writes a RAW neural prior sample at each actual epoch + checkpoint + metrics.
Not a claim of photogenic / artistic success; failures must be retained.
"""
import argparse,hashlib,json,random
from pathlib import Path
import numpy as np
import torch
from PIL import Image
from torch.utils.data import Dataset,DataLoader
from fullbody_corpus import curate_fullbody,require_training_ready,PROFILES
from fullbody_vae import FullBodyVAE,training_loss,export_rgba

class ApprovedFullbodyDataset(Dataset):
    def __init__(self,root,items,split):
        self.root=Path(root).resolve()
        self.items=[r for r in items if r["split"]==split]
    def __len__(self):return len(self.items)
    def __getitem__(self,index):
        item=self.items[index]
        path=(self.root/item["path"]).resolve()
        if not path.is_relative_to(self.root) or hashlib.sha256(path.read_bytes()).hexdigest()!=item["sha256"]:
            raise ValueError("Source file changed since review")
        with Image.open(path) as im:
            if im.size != (item["width"],item["height"]):raise ValueError("Original image dimensions changed")
            a=np.asarray(im.convert("RGBA"),dtype=np.uint8).copy()
        a[a[:,:,3]==0,:3]=0
        return torch.from_numpy(a).permute(2,0,1).float()/255

def run(args):
    random.seed(args.seed);np.random.seed(args.seed);torch.manual_seed(args.seed)
    root=Path(args.data).resolve()
    report=curate_fullbody(root,Path(args.manifest))
    rows=require_training_ready(report,args.profile,args.experimental_small_data)
    train=ApprovedFullbodyDataset(root,rows,"train")
    val=ApprovedFullbodyDataset(root,rows,"val")
    model=FullBodyVAE(latent_dim=args.latent_dim,base=args.base).to(args.device)
    optimizer=torch.optim.AdamW(model.parameters(),lr=args.lr)
    output=Path(args.output);output.mkdir(parents=True,exist_ok=True)
    source_hash=hashlib.sha256(Path(args.manifest).read_bytes()).hexdigest()
    metadata={"scope":"FULLBODY ONLY","status":"training","profile":args.profile,
      "true_original_resolution":PROFILES[args.profile],
      "train_images":len(train),"val_images":len(val),
      "source_manifest_sha256":source_hash,"seed":args.seed,"epochs_requested":args.epochs,
      "model":"global latent VAE baseline", "trainers":["licensed human-drawn, independently reviewed"],
      "is_published_paper_result":False,"art_quality_passed":False}
    (output/"run.json").write_text(json.dumps(metadata,ensure_ascii=False,indent=2),"utf-8")
    best=float("inf")
    with (output/"metrics.jsonl").open("w",encoding="utf-8") as metric_log:
        for epoch in range(1,args.epochs+1):
            model.train();scores=[]
            for x in DataLoader(train,batch_size=args.batch,shuffle=True,num_workers=0):
                x=x.to(args.device)
                loss,parts=training_loss(model,x,kl_weight=min(.0001,.00001*epoch))
                optimizer.zero_grad(set_to_none=True);loss.backward()
                torch.nn.utils.clip_grad_norm_(model.parameters(),1.)
                optimizer.step();scores.append(float(loss.detach()))
            model.eval();valid=[]
            with torch.no_grad():
                for x in DataLoader(val,batch_size=args.batch,num_workers=0):
                    x=x.to(args.device)
                    loss,_=training_loss(model,x)
                    valid.append(float(loss))
            score=float(np.mean(valid))
            record={"epoch":epoch,"train_loss":float(np.mean(scores)),
              "val_loss":score,"generated_sample":f"epoch_{epoch:03d}_prior.png",
              "human_art_quality_approval":False}
            metric_log.write(json.dumps(record,ensure_ascii=False)+"\n");metric_log.flush()
            # Every epoch emits a newly sampled COMPLETE whole-body native portrait.
            w,h=PROFILES[args.profile]
            export_rgba(model,output/record["generated_sample"],w,h,
                seed=args.seed+10000,device=args.device)
            ckpt={"model":model.state_dict(),"epoch":epoch,"profile":args.profile,
                "base":args.base,"latent_dim":args.latent_dim,"val_loss":score,
                "seed":args.seed,"source_manifest_sha256":source_hash}
            torch.save(ckpt,output/"latest.pt")
            if score<best:
                best=score
                torch.save(ckpt,output/"best.pt")
            print(json.dumps(record,ensure_ascii=False),flush=True)
    metadata.update(status="completed",epochs_completed=args.epochs,
                    best_validation_loss=best)
    (output/"run.json").write_text(json.dumps(metadata,ensure_ascii=False,indent=2),"utf-8")

def sample_checkpoint(args):
    ckpt=torch.load(args.checkpoint,map_location=args.device,weights_only=True)
    if ckpt["profile"]!=args.profile:raise ValueError("Checkpoint profile mismatch")
    net=FullBodyVAE(ckpt["latent_dim"],ckpt["base"]).to(args.device)
    net.load_state_dict(ckpt["model"])
    w,h=PROFILES[args.profile]
    export_rgba(net,args.output,w,h,args.seed,args.device)
    print(json.dumps({"source_checkpoint":str(args.checkpoint),"epoch":ckpt["epoch"],
        "generated_fullbody":str(args.output),"art_quality_passed":False}))

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    sub=parser.add_subparsers(dest="command",required=True)
    t=sub.add_parser("train")
    t.add_argument("--data",required=True)
    t.add_argument("--manifest",required=True)
    t.add_argument("--profile",default="portrait_192",choices=PROFILES)
    t.add_argument("--output",default="runs/fullbody")
    t.add_argument("--epochs",type=int,default=20)
    t.add_argument("--batch",type=int,default=1)
    t.add_argument("--base",type=int,default=32)
    t.add_argument("--latent-dim",type=int,default=128)
    t.add_argument("--lr",type=float,default=.0002)
    t.add_argument("--seed",type=int,default=20261031)
    t.add_argument("--device",default="cuda" if torch.cuda.is_available() else "cpu")
    t.add_argument("--experimental-small-data",action="store_true",
                   help="Opt in to 2 train artist / 1 val artist SCIENTIFIC DEMO ONLY")
    s=sub.add_parser("sample")
    s.add_argument("--checkpoint",required=True)
    s.add_argument("--profile",default="portrait_192",choices=PROFILES)
    s.add_argument("--output",default="sample_fullbody.png")
    s.add_argument("--seed",type=int,default=11)
    s.add_argument("--device",default="cpu")
    args=parser.parse_args()
    if args.command=="train":run(args)
    else:sample_checkpoint(args)
