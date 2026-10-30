"""PAPERWORLD: real single-character, native-grid ML retouch experiment.

Supervision is artificially damaged pixels versus the EXISTING full-body artwork,
not an independently hand-retouched gold image. This learns denoising, NOT
inventing missing eyes, clothing, anatomy or new character identities.
"""
from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path
import numpy as np
from PIL import Image
import torch
from torch import nn
from torch.nn import functional as F

COL = np.array([[0,0,0],[57,54,87],[242,165,194],[169,186,233],[255,245,230]],dtype=np.uint8)
SEED = 20261030
SOURCE = "site/pixel-lab/assets/hostess-redraw-v1-192x256.png"
OUT = "site/pixel-lab/refine-output"

class PixelRefiner(nn.Module):
    def __init__(self):
        super().__init__()
        self.net=nn.Sequential(
            nn.Conv2d(5,16,3,padding=1),nn.GELU(),
            nn.Conv2d(16,16,3,padding=1),nn.GELU(),
            nn.Conv2d(16,16,3,padding=2,dilation=2),nn.GELU(),
            nn.Conv2d(16,16,3,padding=4,dilation=4),nn.GELU(),
            nn.Conv2d(16,16,3,padding=1),nn.GELU(),
            nn.Conv2d(16,5,1))
    def forward(self,labels):
        one=F.one_hot(labels.long(),5).permute(0,3,1,2).float()
        return self.net(one)+3*one

def image_labels(path):
    img=Image.open(path).convert("RGBA")
    if img.size!=(192,256):raise ValueError("Expected genuine native 192x256 figure")
    rgba=np.asarray(img)
    if not np.isin(rgba[:,:,3],[0,255]).all():raise ValueError("Blended alpha in artwork")
    result=np.zeros((256,192),dtype=np.uint8)
    for i,color in enumerate(COL[1:],1):
        result[(rgba[:,:,:3]==color).all(axis=-1)&(rgba[:,:,3]==255)]=i
    if int((result!=0).sum()) != int((rgba[:,:,3]==255).sum()):
        raise ValueError("Source contains colors outside game D palette")
    return result

def corrupt(image,rng,amount=.08):
    damaged=image.copy()
    mask=rng.random(image.shape)<amount
    random_colors=rng.integers(0,5,size=image.shape,dtype=np.uint8)
    damaged[mask]=random_colors[mask]
    for _ in range(18):
        y=int(rng.integers(0,253));x=int(rng.integers(0,189))
        if rng.random()<.55:damaged[y:y+2,x:x+2]=rng.integers(0,5)
    return damaged

def save_indexed(labels,path):
    palette=np.vstack((COL,np.zeros((251,3),dtype=np.uint8)))
    im=Image.fromarray(labels,"P")
    im.putpalette(palette.ravel().tolist())
    im.info["transparency"]=0
    im.save(path,optimize=True)

def train(source=SOURCE,outdir=OUT,steps=70):
    torch.set_num_threads(2)
    torch.manual_seed(SEED)
    rng=np.random.default_rng(SEED)
    clean=image_labels(source)
    out=Path(outdir)
    out.mkdir(parents=True,exist_ok=True)
    net=PixelRefiner()
    opt=torch.optim.AdamW(net.parameters(),lr=.0012,weight_decay=.0001)
    history=[]
    for step in range(steps):
        xs=[];ys=[]
        for _ in range(3):
            damaged=corrupt(clean,rng,amount=float(rng.uniform(.035,.13)))
            y=int(rng.integers(0,216));x=int(rng.integers(0,152))
            xs.append(damaged[y:y+40,x:x+40])
            ys.append(clean[y:y+40,x:x+40])
        data=torch.from_numpy(np.stack(xs).astype(np.int64))
        target=torch.from_numpy(np.stack(ys).astype(np.int64))
        logits=net(data)
        weights=torch.where(target==0,.65,2.)
        loss=(F.cross_entropy(logits,target,reduction="none")*weights).mean()
        opt.zero_grad(set_to_none=True)
        loss.backward()
        nn.utils.clip_grad_norm_(net.parameters(),1)
        opt.step()
        if step in {0,steps//3,2*steps//3,steps-1}:
            history.append([step+1,round(float(loss.item()),5)])

    # Independent synthetic noise patterns. Same person is a significant
    # limitation: this validates restoration of corruption, not art quality.
    net.eval()
    test_rng=np.random.default_rng(985010)
    baseline=[];model_accuracy=[];foreground_accuracy=[]
    with torch.no_grad():
        for _ in range(12):
            damaged=corrupt(clean,test_rng,.09)
            baseline.append(float((damaged==clean).mean()))
            guess=net(torch.from_numpy(damaged.astype(np.int64))[None]).argmax(1).squeeze(0).numpy()
            model_accuracy.append(float((guess==clean).mean()))
            foreground_accuracy.append(float((guess[clean>0]==clean[clean>0]).mean()))
        output=net(torch.from_numpy(clean.astype(np.int64))[None])
        prob=output.softmax(1).squeeze(0).numpy()
        suggested=prob.argmax(0).astype(np.uint8)
        confidence=prob.max(0)

    # Preserve exact silhouette and entire head; touch only isolated, high
    # confidence internal clothing colors with at least 5 supporting neighbors.
    refined=clean.copy()
    edits=[]
    for y in range(100,255):
        for x in range(1,191):
            old=int(clean[y,x]);replacement=int(suggested[y,x])
            if old==0 or replacement==0 or old==replacement or confidence[y,x]<.65:
                continue
            neighbors=clean[y-1:y+2,x-1:x+2]
            if (neighbors==0).any():continue
            if (neighbors==old).sum()>2 or (neighbors==replacement).sum()<5:continue
            refined[y,x]=replacement
            edits.append({"x":x,"y":y,"from":old,"to":replacement,
                          "confidence":round(float(confidence[y,x]),3)})

    save_indexed(clean,out/"source_native.png")
    save_indexed(refined,out/"refined_native.png")
    save_indexed(corrupt(clean,np.random.default_rng(7855)),out/"synthetic_corruption_example.png")
    Image.open(out/"refined_native.png").resize((384,512),Image.Resampling.NEAREST).save(out/"refined_preview_384x512.png")
    changes=np.zeros((256,192,4),dtype=np.uint8)
    changes[refined!=clean]=[242,165,194,255]
    Image.fromarray(changes,"RGBA").save(out/"changes.png")
    digest=lambda a:hashlib.sha256(a.tobytes()).hexdigest()
    report={
       "pipeline":"single_identity_synthetic_corruption_refiner_v1",
       "trained":True,"trained_from_scratch":True,
       "source":SOURCE,"native_grid":[192,256],"preview_grid":[384,512],
       "full_body_input":True,"training_independent_identities":1,
       "ground_truth_is_input_not_manual_gold":True,
       "validation_is_synthetic_corruption_same_identity":True,
       "preview_has_no_new_painted_detail":True,
       "cannot_fix_anatomical_or_missing_details":True,
       "training_steps":steps,"loss":history,
       "identity_baseline_accuracy":round(float(np.mean(baseline)),5),
       "refiner_recovery_accuracy":round(float(np.mean(model_accuracy)),5),
       "refiner_foreground_accuracy":round(float(np.mean(foreground_accuracy)),5),
       "native_changed_pixels":len(edits),
       "input_opaque_pixels":int((clean!=0).sum()),
       "silhouette_unchanged":bool(np.array_equal(clean>0,refined>0)),
       "head_preserved":bool(np.array_equal(clean[:100],refined[:100])),
       "source_sha256":digest(clean),"output_sha256":digest(refined),
       "edits":edits[:60],"qa_passed":False,"art_approved":False,
       "limitations":[
          "Denoising synthetic defects on one full-body illustration is not learning a general art style.",
          "No manually retouched ground-truth pair currently exists. This cannot invent better anatomy or exquisite eyes.",
          "Native sprite is 192x256. The 384x512 preview is nearest-neighbor only.",
          "Only conservative interior color corrections are applied; final art needs manual review."]}
    report["qa_passed"]=bool(
        report["silhouette_unchanged"] and report["head_preserved"]
        and 0<len(edits)<.01*int((clean!=0).sum())
        and report["refiner_recovery_accuracy"]>report["identity_baseline_accuracy"])
    (out/"report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf8")
    torch.save({"model":"PixelRefiner","steps":steps,"state_dict":net.state_dict()},out/"refiner_checkpoint.pt")
    print(json.dumps({k:report[k] for k in
       ("native_changed_pixels","identity_baseline_accuracy","refiner_recovery_accuracy","qa_passed")}),flush=True)
    return report

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--source",default=SOURCE)
    parser.add_argument("--output",default=OUT)
    parser.add_argument("--steps",type=int,default=70)
    args=parser.parse_args()
    train(args.source,args.output,args.steps)
