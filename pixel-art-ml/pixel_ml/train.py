"""Train/evaluate a real PyTorch VAE with fixed seeds and no test-set leakage."""
import argparse
import json
import random
from pathlib import Path

import numpy as np
import torch
from torch.utils.data import DataLoader, TensorDataset

from .data import load_manifest
from .model import PixelVAE,loss_fn


def tensorize(items):
    array=np.stack([row["image"] for row in items]).astype(np.float32)/255.0
    return torch.from_numpy(array).permute(0,3,1,2).contiguous()


def run(manifest:Path, out:Path,epochs:int=15,batch_size:int=32,seed:int=1729,lr:float=0.003,threads:int=2):
    if epochs<1 or batch_size<1:
        raise ValueError("epochs and batch_size must be positive")
    random.seed(seed);np.random.seed(seed);torch.manual_seed(seed)
    torch.set_num_threads(max(1,threads))
    out=Path(out);out.mkdir(parents=True,exist_ok=True)
    data=load_manifest(manifest)
    train=tensorize([item for item in data if item["split"]=="train"])
    val=tensorize([item for item in data if item["split"]=="val"])
    loader=DataLoader(TensorDataset(train),batch_size=batch_size,shuffle=True,
                      generator=torch.Generator().manual_seed(seed))
    net=PixelVAE()
    optimizer=torch.optim.Adam(net.parameters(),lr=lr)
    history=[];best=float('inf')
    mean_image=train.mean(dim=0,keepdim=True)
    baseline=float((val-mean_image).square().mean().item())
    for ep in range(1,epochs+1):
        net.train();loss_total=0.;n=0
        for (images,) in loader:
            optimizer.zero_grad(set_to_none=True)
            reconstructed,mu,logvar=net(images)
            loss,mse,kl=loss_fn(reconstructed,images,mu,logvar)
            loss.backward()
            optimizer.step()
            loss_total+=float(loss.item())*len(images);n+=len(images)
        net.eval()
        with torch.no_grad():
            predicted,mu,logvar=net(val,sample=False)
            eval_loss,eval_mse,eval_kl=loss_fn(predicted,val,mu,logvar)
        metric=dict(epoch=ep,train_loss=round(loss_total/n,6),
                    val_mse=round(float(eval_mse),6),
                    val_kl=round(float(eval_kl),6),
                    naive_mean_mse=round(baseline,6))
        history.append(metric)
        print(json.dumps(metric))
        if float(eval_mse)<best:
            best=float(eval_mse)
            torch.save({"model":net.state_dict(),"latent_size":net.latent_size,
                        "native_size":[32,48],"epoch":ep,"seed":seed,
                        "source":"permitted manifest / authored synthetic bootstrap"},out/"best.pt")
    (out/"metrics.json").write_text(json.dumps({"seed":seed,"train_count":len(train),
       "val_count":len(val),"epochs":history,"best_validation_mse":round(best,6),
       "baseline_mse":round(baseline,6)},indent=2),encoding="utf-8")
    return out/"best.pt"


def main():
    p=argparse.ArgumentParser()
    p.add_argument("--manifest",type=Path,required=True)
    p.add_argument("--out",type=Path,default=Path(".pixel-runs/latest"))
    p.add_argument("--epochs",type=int,default=15)
    p.add_argument("--batch-size",type=int,default=32)
    p.add_argument("--seed",type=int,default=1729)
    p.add_argument("--lr",type=float,default=.003)
    p.add_argument("--threads",type=int,default=2)
    args=p.parse_args()
    print(f"checkpoint: {run(args.manifest,args.out,args.epochs,args.batch_size,args.seed,args.lr,args.threads)}")

if __name__=="__main__":main()
