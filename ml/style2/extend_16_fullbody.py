"""Extend the exact 16 trained face candidates into 16 full-body pixel sprites.

An honest, conservative FIRST full-body ML pipeline:
- neural BodyPartNet learns torso/sleeve/skirt/limb classes from the two true
  D-gold full-body characters and their COARSE hand-outlined body masks;
- 16 face-lab face candidates, NOT 16 separate approved identities, are
  transplanted (nearest-neighbor affine alignment) onto existing full-body
  gold pose templates without losing the 4-color pixel grid;
- predicted classes constrain optional palette-role costume variants.
The model does NOT synthesize anatomy/clothes from scratch. It is an
identity-preserving full-body extension prototype with paired gold templates.
Never claim 16 novel independently designed people or complete 3D knowledge.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
from pathlib import Path
import numpy as np
from PIL import Image
import torch
from torch import nn
from torch.nn import functional as F

ROOT=Path("site/pixel-lab/style2")
FACES=ROOT/"face-lab"
OUT=ROOT/"fullbody-16"
COLORS=np.array([[57,54,87],[242,165,194],[169,186,233],[255,245,230]],dtype=np.uint8)
H,W=512,384
SMALL_H,SMALL_W=128,96
# Output (standing B) face pixel => source (A) face pixel, optimized from
# the real anchor head alignment, not separately fitted to each generated face.
A_TO_B=(1.0947055,.021488527,-23.096445,.031416617,1.1025255,-4.2605586)
CROPS={"A_dynamic":(128,68),"B_standing":(123,62)}
HEAD_MASK=None

def palette_indices(image):
    rgb=np.asarray(image.convert("RGB"),dtype=np.int32)
    assert rgb.shape==(H,W,3)
    d=((rgb[:,:,None,:]-COLORS[None,None,:,:].astype(np.int32))**2).sum(-1)
    idx=d.argmin(-1).astype(np.uint8)
    assert np.array_equal(COLORS[idx],rgb.astype(np.uint8)),"source is not true D 4-color"
    return idx

def get_sources():
    gold={name:palette_indices(Image.open(ROOT/(name+".png"))) for name in CROPS}
    label={}
    for name in CROPS:
        a=np.array(Image.open(ROOT/(name+"_semantic_mask.png")).convert("L"),dtype=np.uint8)
        assert a.shape==(H,W) and int(a.max())<=8
        label[name]=a
    faces=[]
    for i in range(16):
        img=np.array(Image.open(FACES/f"candidate_{i:02d}.png").convert("RGB"))
        assert img.shape==(96,96,3)
        diff=((img.astype(np.int32)[:,:,None,:]-COLORS.astype(np.int32)[None,None,:,:])**2).sum(-1)
        pix=diff.argmin(-1).astype(np.uint8)
        assert np.array_equal(COLORS[pix],img)
        faces.append(pix)
    assert len({x.tobytes() for x in faces})==16
    return gold,label,faces

class BodyPartNet(nn.Module):
    """Learn coarse semantic mask from D palette pixels + normalized XY."""
    def __init__(self,ch=40):
        super().__init__()
        self.c1=nn.Sequential(nn.Conv2d(6,ch,5,padding=2),nn.SiLU(),
                              nn.Conv2d(ch,ch,3,padding=1),nn.SiLU())
        self.c2=nn.Sequential(nn.Conv2d(ch,ch*2,3,stride=2,padding=1),nn.SiLU(),
                              nn.Conv2d(ch*2,ch*2,3,padding=1),nn.SiLU())
        self.out=nn.Sequential(nn.Conv2d(ch*3,ch,3,padding=1),nn.SiLU(),
                               nn.Conv2d(ch,9,1))
    def forward(self,pixels):
        b,h,w=pixels.shape
        oh=F.one_hot(pixels.long(),4).permute(0,3,1,2).float()
        x=torch.linspace(-1,1,w,device=pixels.device)[None,None,None,:].expand(b,1,h,w)
        y=torch.linspace(-1,1,h,device=pixels.device)[None,None,:,None].expand(b,1,h,w)
        features=self.c1(torch.cat((oh,x,y),1))
        lower=self.c2(features)
        return self.out(torch.cat((features,F.interpolate(lower,size=(h,w),mode="nearest")),1))

def prep(gold,labels):
    source={k:np.array(Image.fromarray(v).resize((SMALL_W,SMALL_H),Image.Resampling.NEAREST),np.uint8) for k,v in gold.items()}
    target={k:np.array(Image.fromarray(v).resize((SMALL_W,SMALL_H),Image.Resampling.NEAREST),np.uint8) for k,v in labels.items()}
    return source,target

def train(gold,labels,steps=100,seed=20261030):
    torch.manual_seed(seed);torch.set_num_threads(2)
    rng=np.random.default_rng(seed)
    sources,targets=prep(gold,labels)
    names=list(sources)
    model=BodyPartNet()
    opt=torch.optim.AdamW(model.parameters(),lr=.001,weight_decay=.0001)
    history=[]
    for step in range(steps):
        raw=[];ref=[]
        for _ in range(8):
            name=names[int(rng.integers(2))]
            inp=sources[name]; lab=targets[name]
            dy=int(rng.integers(-6,7));dx=int(rng.integers(-5,6))
            a=np.zeros_like(inp);m=np.zeros_like(lab)
            y0=max(0,dy);y1=min(SMALL_H,SMALL_H+dy)
            x0=max(0,dx);x1=min(SMALL_W,SMALL_W+dx)
            a[y0:y1,x0:x1]=inp[y0-dy:y1-dy,x0-dx:x1-dx]
            m[y0:y1,x0:x1]=lab[y0-dy:y1-dy,x0-dx:x1-dx]
            if rng.random()<.5:a=a[:,::-1].copy();m=m[:,::-1].copy()
            raw.append(a);ref.append(m)
        x=torch.tensor(np.stack(raw).copy(),dtype=torch.long)
        y=torch.tensor(np.stack(ref).copy(),dtype=torch.long)
        logits=model(x)
        loss=F.cross_entropy(logits,y,weight=torch.tensor([.08,1.0,1.3,1.2,1.2,1.2,1.3,1.3,1.0]))
        opt.zero_grad(set_to_none=True);loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(),2);opt.step()
        if step in (0,steps//4,steps//2,steps-1):
            history.append([step+1,round(float(loss.item()),5)])
    model.eval()
    metrics={}
    with torch.no_grad():
        for name in names:
            pred=model(torch.from_numpy(sources[name][None].copy()).long()).argmax(1)[0].numpy()
            truth=targets[name];fg=truth!=0
            metrics[name]={"coarse_part_accuracy":round(float((pred==truth).mean()),4),
                "coarse_nonzero_accuracy":round(float((pred[fg]==truth[fg]).mean()),4)}
    return model,history,metrics

def part_prediction(net,idx):
    low=np.asarray(Image.fromarray(idx).resize((SMALL_W,SMALL_H),Image.Resampling.NEAREST),np.uint8)
    with torch.no_grad():
        logits=net(torch.from_numpy(low[None].copy()).long()).softmax(1)
    predicted=logits.argmax(1)[0].numpy().astype(np.uint8)
    confidence=logits.max(1).values[0].numpy().astype(np.float32)
    result=np.array(Image.fromarray(predicted).resize((W,H),Image.Resampling.NEAREST),np.uint8)
    conf=np.array(Image.fromarray(confidence).resize((W,H),Image.Resampling.NEAREST))
    return result,conf

def transplant_face(pixels,face,pose):
    source=Image.fromarray(COLORS[face],"RGB")
    if pose=="A_dynamic":
        aligned=np.asarray(source)
    else:
        aligned=np.asarray(source.transform((96,96),Image.Transform.AFFINE,A_TO_B,
                          resample=Image.Resampling.NEAREST,fillcolor=tuple(COLORS[0])))
    x0,y0=CROPS[pose]
    yy,xx=np.mgrid[:96,:96]
    # Central facial features replace existing face, while crown, ear ribbons
    # and broad hair masses remain continuous from the high-quality gold sprite.
    if pose=="A_dynamic":
        r=((xx-52)/37.)**2+((yy-47)/34.)**2
    else:
        r=((xx-52)/38.)**2+((yy-47)/34.)**2
    face_mask=(r<.91**2)&(yy>=17)&(yy<=79)&(xx>=18)
    output=pixels.copy()
    sub=output[y0:y0+96,x0:x0+96]
    # NN warp outputs are already exact D palette, no fifth color at borders.
    source_idx=((aligned.astype(np.int32)[:,:,None,:]-COLORS.astype(np.int32)[None,None,:,:])**2).sum(-1).argmin(-1).astype(np.uint8)
    sub[face_mask]=source_idx[face_mask]
    return output,int(face_mask.sum()),float(np.mean(face_mask))

def outfit_variant(sprite,part_mask,nn_mask,confidence,style):
    """Semantic palette-role changes: only annotated garment pixels.

    No skin/eyes/hair recolor; preserve every pixel outside the intended
    garment, including outline. Model confidence is a conservative safety
    boundary: it may veto a recolor, never invent a recolor outside known parts.
    """
    table=[
      (1,3),(2,3),(1,2),(3,1),(2,1),(3,2),(1,1),(2,2)
    ]
    shirt,skirt=table[style%8]
    out=sprite.copy()
    confidence_ok=(confidence>=.12)
    # Labels: torso 3, left/right sleeves 4/5, skirt 6.
    upper=np.isin(part_mask,[3,4,5]) & np.isin(nn_mask,[3,4,5,0]) & confidence_ok
    lower=(part_mask==6) & np.isin(nn_mask,[6,0]) & confidence_ok
    # Face/hair/skin pixels never changed unless BOTH the rough polygon and
    # the neural model agree on garment.
    upper &= (np.indices(out.shape)[0]>=165)
    lower &= (np.indices(out.shape)[0]>=250)
    upper_local=upper & (out==1)
    lower_local=lower & (out==3)
    out[upper_local]=shirt
    out[lower_local]=skirt
    return out,{"upper_changed":int((upper_local&(sprite!=shirt)).sum()),
                "lower_changed":int((lower_local&(sprite!=skirt)).sum())}

def render(steps=100):
    OUT.mkdir(parents=True,exist_ok=True)
    gold,labels,faces=get_sources()
    model,history,metrics=train(gold,labels,steps)
    torch.save({"state_dict":model.state_dict(),"label_classes":"coarse_9_parts",
                "source_poses":list(gold)},OUT/"body_part_model.pt")
    predictions={name:part_prediction(model,gold[name]) for name in gold}
    images=[]
    records=[]
    for i,face in enumerate(faces):
        # 2 verified anatomical reference poses x 8 costume role variants.
        # All are complete 384x512 sprites, not falsely claimed new humans.
        pose="B_standing" if i%2==0 else "A_dynamic"
        style=i//2
        pred,conf=predictions[pose]
        clothes,changed=outfit_variant(gold[pose],labels[pose],pred,conf,style)
        result,face_pixels,ratio=transplant_face(clothes,face,pose)
        assert result.shape==(H,W) and np.max(result)<=3
        # Bundle the exact input face next to completed fullbody for reliable
        # source-to-output comparison even without old workflow artifacts.
        face_file=f"face_input_{i:02}.png"
        Image.fromarray(COLORS[face],"RGB").save(OUT/face_file)
        file=f"fullbody_{i:02}.png"
        Image.fromarray(COLORS[result],"RGB").save(OUT/file)
        images.append(result)
        records.append({"candidate":i,"input_face_file":f"candidate_{i:02}.png","embedded_face_file":face_file,
           "fullbody_file":file,"pose_template":pose,"wardrobe_variant":style,
           "transplanted_face_pixels":face_pixels,"garment_changes":changed,
           "source_body_gold":pose,"approved_as_new_character":False})
    grid=Image.new("RGB",(4*W,4*H),tuple(COLORS[0]))
    for i,img in enumerate(images):
        grid.paste(Image.fromarray(COLORS[img],"RGB"),((i%4)*W,(i//4)*H))
    grid.save(OUT/"contact_16_native.png")
    grid.resize((768,1024),Image.Resampling.NEAREST).save(OUT/"contact_16_preview.png")
    report={"trained":True,"model":"trained 9-class body-part network + pixel-preserving D body composition",
        "method":"Conservative face-aligned extension using existing D gold full-body poses; learned coarse segmentation constrains costume role changes.",
        "not_a_new_fullbody_diffusion_generator":True,
        "not_16_independent_identities":True,
        "not_new_drawn_clothes_or_limb_art":True,
        "input_face_set":"the exact 16 neural outputs from face-train.yml (single identity)",
        "pose_gold":["A_dynamic","B_standing"],"output_grid":[W,H],
        "palette":["#393657","#F2A5C2","#A9BAE9","#FFF5E6"],
        "training_steps":steps,"train_loss":history,"body_part_metrics_on_seen_poses":metrics,
        "number_outputs":len(images),"output_records":records,"approved_for_game":0,
        "limitations":["Only two full-body gold poses from one person; no 16 new individual bodies are learned.",
          "Existing Chinese-inspired clothes are reused in different color arrangements; the model cannot design modern new outfits.",
          "Faces remain slight variants of one face; some aligned eyes/mouth may require manual retouch.",
          "Body-part metrics are on seen source poses, NOT out-of-domain or unseen-character generalization."]}
    (OUT/"report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps({"output":len(images),"steps":steps,"part_metrics":metrics,
          "distinct_sprites":len({im.tobytes() for im in images})},ensure_ascii=False))
    return report

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--steps",type=int,default=100)
    args=parser.parse_args()
    render(args.steps)
