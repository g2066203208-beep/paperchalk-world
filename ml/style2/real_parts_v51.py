"""V5.1 real-pixel-domain part adaptation with honest one-pose holdout.

V5 is only pre-trained on synthetic 3D shapes. This experiment adapts its
part-segmentation branch using the manually approximate polygons from
ml.style2.prepare on A_dynamic, then tests on B_standing with NO B gradient.
The two images are the SAME identity: no generalization-to-new-person claim.
Masked polygon labels are coarse human supervision, NOT 3D ground truth.
"""
import argparse, json, math
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
import torch
from torch.nn import functional as F
from ml.style2.volume_parts_v5 import GeometryNet, RGB, DIAGNOSTIC, OUT, W, H

# prepare.PARTS: unlabeled hair face torso left_sleeve right_sleeve skirt legs shoes
MAP={1:1,2:2,3:5,4:6,5:6,6:9,7:10,8:12}
NAMES=("A_dynamic","B_standing")

def load(name):
    base=Path("site/pixel-lab/style2")
    rgb=np.asarray(Image.open(base/(name+".png")).convert("RGB").resize((W,H),Image.Resampling.NEAREST),np.int32)
    assert rgb.shape==(H,W,3)
    distances=((rgb[:,:,None,:]-RGB[None,None,:,:].astype(np.int32))**2).sum(-1)
    pixel=distances.argmin(-1).astype(np.uint8)
    assert np.array_equal(RGB[pixel],rgb.astype(np.uint8))
    raw=np.asarray(Image.open(base/(name+"_semantic_mask.png")).convert("L").resize((W,H),Image.Resampling.NEAREST),np.uint8)
    y=np.full((H,W),255,np.uint8)
    for src,tgt in MAP.items():y[raw==src]=tgt
    # Only certain FAR background is labeled; masked gaps can be line-art or foreground.
    occupied=Image.fromarray((raw>0).astype(np.uint8)*255).filter(ImageFilter.MaxFilter(9))
    far=(np.asarray(occupied)==0)&(pixel==0)
    y[far]=0
    assert np.sum(y!=255)>1500 and set(np.unique(y)).issubset({0,1,2,5,6,9,10,12,255})
    return pixel,y

def transform(x,y,rg):
    # Exact-grid shift/mirror. Transforms both inputs and labels together.
    if rg.integers(2):
        x=x[:,::-1].copy();y=y[:,::-1].copy()
    dy=int(rg.integers(-9,10));dx=int(rg.integers(-8,9))
    out=np.zeros_like(x);mask=np.full_like(y,255)
    a0=max(0,dy);b0=min(H,H+dy);c0=max(0,dx);d0=min(W,W+dx)
    if b0>a0 and d0>c0:
        out[a0:b0,c0:d0]=x[a0-dy:b0-dy,c0-dx:d0-dx]
        mask[a0:b0,c0:d0]=y[a0-dy:b0-dy,c0-dx:d0-dx]
    return out,mask

def metrics(net,pack):
    image,target=pack
    net.eval()
    with torch.no_grad():
        seg,_,_,_=net(torch.from_numpy(image.copy()).long()[None])
        pred=seg.argmax(1)[0].cpu().numpy()
    known=target!=255;fg=known&(target!=0)
    labels=sorted(set(target[fg].tolist()))
    scores={}
    for label in labels:
        truth=(target==label)&known;estimate=(pred==label)&known
        union=(truth|estimate).sum()
        scores[str(label)]=round(float((truth&estimate).sum()/max(1,union)),4)
    return {"pixel_accuracy_known":round(float((pred[known]==target[known]).mean()),4),
            "foreground_accuracy":round(float((pred[fg]==target[fg]).mean()),4),
            "macro_iou":round(float(np.mean(list(scores.values()))) if scores else 0,4),
            "class_iou":scores,"annotated_pixel_count":int(known.sum())},pred

def save_visual(name,pack,before,after,out):
    source,target=pack
    vis=np.where(target==255,0,target)
    for suffix,vals,palette in (("source",source,RGB),("manual_approx",vis,DIAGNOSTIC),
        ("synthetic_model",before,DIAGNOSTIC),("real_adapted",after,DIAGNOSTIC)):
        Image.fromarray(palette[vals],"RGB").save(out/(name+"_"+suffix+".png"))

def run(steps=160,seed=20261030,out=OUT):
    out=Path(out);out.mkdir(parents=True,exist_ok=True)
    torch.set_num_threads(2);torch.manual_seed(seed)
    rng=np.random.default_rng(seed)
    weights=torch.load(out/"geometry_weights.pt",map_location="cpu",weights_only=True)
    original=GeometryNet();original.load_state_dict(weights["state_dict"]);original.eval()
    tuned=GeometryNet();tuned.load_state_dict(weights["state_dict"])
    train_data=load("A_dynamic");heldout_data=load("B_standing")
    baselineA,previewA=metrics(original,train_data)
    baselineB,previewB=metrics(original,heldout_data)
    optimizer=torch.optim.AdamW(tuned.parameters(),lr=.00035,weight_decay=.0005)
    history=[]
    for n in range(steps):
        tuned.train()
        batch=[transform(*train_data,rng) for _ in range(3)]
        xs=torch.from_numpy(np.stack([p[0] for p in batch]).copy()).long()
        ys=torch.from_numpy(np.stack([p[1] for p in batch]).copy()).long()
        logits=tuned(xs)[0]
        ce=F.cross_entropy(logits,ys,ignore_index=255,reduction="none")
        class_weights=torch.ones_like(ce)
        class_weights[ys==0]=.18
        loss=(ce*class_weights*(ys!=255)).sum()/(class_weights*(ys!=255)).sum().clamp(min=1)
        optimizer.zero_grad(set_to_none=True);loss.backward()
        torch.nn.utils.clip_grad_norm_(tuned.parameters(),2.)
        optimizer.step()
        if n in (0,39,79,119,steps-1):history.append([n+1,round(float(loss.item()),5)])
    afterA,predA=metrics(tuned,train_data)
    afterB,predB=metrics(tuned,heldout_data)
    save_visual("A_dynamic",train_data,previewA,predA,out)
    save_visual("B_standing",heldout_data,previewB,predB,out)
    accepted=(afterB["macro_iou"]>baselineB["macro_iou"]+.02 and
              afterB["foreground_accuracy"]>baselineB["foreground_accuracy"]+.02)
    torch.save({"state_dict":tuned.state_dict(),"trained_from":"V5 synthetic initialization",
        "real_training_images":["A_dynamic"],"real_holdout_images":["B_standing"]},
        out/"v51_real_parts_experiment.pt")
    report={
        "version":"V5.1","task":"real D-style pixel-art semantic domain adaptation",
        "no_claim_new_identity":True,"no_claim_real_depth_ground_truth":True,
        "annotation_quality":"manually approximate broad polygons; unlabeled gaps ignored",
        "real_annotated_train":["A_dynamic"],"real_heldout":["B_standing"],
        "resolution":[W,H],"steps":steps,"loss_history":history,
        "baseline_train":baselineA,"baseline_holdout":baselineB,
        "adapted_train":afterA,"adapted_holdout":afterB,
        "heldout_improvement":round(afterB["macro_iou"]-baselineB["macro_iou"],4),
        "passes_proxy_improvement":bool(accepted),
        "accepted_as_finished_character_art":False,
        "limitations":["1 character in only 2 poses; cannot prove unseen person generalization",
         "No validated depth data for real image; depth/head pose remains synthetic",
         "Only coarse approximate body masks, no high-resolution detailed eye/hand truth",
         "No evidence of autonomous 384x512 character illustration quality"]
    }
    (out/"v51_real_parts_report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps({"baseline_holdout":baselineB,"adapted_holdout":afterB,
        "passes_proxy_improvement":accepted},ensure_ascii=False))
    return report

if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("--steps",type=int,default=160)
    args=ap.parse_args()
    run(steps=args.steps)
