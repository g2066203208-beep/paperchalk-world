"""System 02 / V5 geometry & anatomy supervision experiment.

Small real multi-task PyTorch network trained on synthetic, articulated 3D
ellipsoid/capsule proxies. Predicts 12 body parts, ordered depth bins,
2D joints and camera yaw from strict D-palette 96x128 renderings.

These are synthetic GEOMETRIC supervision pairs, NOT real 3D reconstructions
of the user's two hand-drawn characters, and NOT a new character painter.
The output semantic/depth displays use diagnostic colors outside D palette.
"""
import argparse
import json
import math
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
import torch
from torch import nn
from torch.nn import functional as F

H, W = 128, 96
RGB=np.array([[57,54,87],[242,165,194],[169,186,233],[255,245,230]],dtype=np.uint8)
PARTS=["background","hair","face","eyes","neck","torso","upper_arm","forearm","hand","skirt","thigh","shin","shoe"]
JOINTS=["head","neck","l_shoulder","r_shoulder","l_elbow","r_elbow","l_wrist","r_wrist","l_knee","r_knee"]
VIEW_ANGLES=(-40.,0.,40.)
DIAGNOSTIC=np.array([
    (57,54,87),(235,115,164),(253,209,157),(121,234,239),(236,172,116),
    (180,206,254),(172,142,245),(115,219,197),(255,236,156),
    (245,151,178),(171,178,249),(114,149,233),(226,135,107)
],dtype=np.uint8)
OUT=Path("site/pixel-lab/style2/geometry-v5")

def project(point,angle):
    """Perspective projection with changing yaw; near geometry appears larger."""
    x,y,z=point
    a=math.radians(angle)
    rx=x*math.cos(a)+z*math.sin(a)
    rz=z*math.cos(a)-x*math.sin(a)
    scale=150./(4.0-rz)
    return W/2+rx*scale,H*.84-y*scale,scale,rz

def scene(seed,view):
    """Supervised procedural anatomy with jointed limbs and explicit z-order.

    Distinct randomized proportions, elbow bends, hair bulk, dress length,
    shoulder/hip widths. No user image is converted into fake depth ground truth.
    """
    rng=np.random.default_rng(int(seed))
    angle=VIEW_ANGLES[int(view)]
    chest=float(rng.uniform(.41,.53))
    hip=float(rng.uniform(.36,.48))
    body=float(rng.uniform(.56,.72))
    head=float(rng.uniform(.30,.40))
    bend=float(rng.uniform(-.22,.22))
    pose=float(rng.uniform(-.18,.18))
    skirt_width=float(rng.uniform(.47,.68))
    skirt_drop=float(rng.uniform(.32,.48))
    color=np.zeros((H,W),np.uint8)
    parts=np.zeros((H,W),np.uint8)
    depth=np.zeros((H,W),np.uint8)
    zbuf=np.full((H,W),-20.,np.float32)
    landmarks={}
    # Geometry is expressed as 3D center and radii, rather than 2D stickers.
    points={
        "head":(0,2.15,.03), "neck":(0,1.78,.04),
        "l_shoulder":(-chest/2,1.69,.05),"r_shoulder":(chest/2,1.69,.05),
        "l_elbow":(-chest/2-.13,1.24,.12+bend),
        "r_elbow":(chest/2+.13,1.24,.12-bend),
        "l_wrist":(-chest/2-.09,.85,.12+pose),
        "r_wrist":(chest/2+.09,.85,.12-pose),
        "l_knee":(-hip/3,.50,.05),
        "r_knee":(hip/3,.50,.05)
    }
    for k,p in points.items():
        xx,yy,_,_=project(p,angle)
        landmarks[k]=(int(round(xx)),int(round(yy)))
    def paint(mask,part,pal,near):
        region=np.asarray(mask,dtype=bool)&(near>zbuf)
        parts[region]=part;color[region]=pal
        # Approximate ordinal surface depth, background remains zero.
        zbuf[region]=near[region]
        depth[region]=np.clip(np.floor((near[region]+1.1)*1.65).astype(np.int16)+1,1,4).astype(np.uint8)
    def ellipse(pos,radii,part,pal):
        x,y,scale,z=project(pos)
        rx,ry,rz=radii
        # Explicit axial foreshortening for off-axis ellipsoids.
        factor=math.sqrt(max(.25,math.cos(math.radians(angle))**2))
        ax=max(1,rx*scale*factor)
        ay=max(1,ry*scale)
        gy,gx=np.ogrid[:H,:W]
        dist=((gx-x)/ax)**2+((gy-y)/ay)**2
        mask=dist<=1
        surface=np.sqrt(np.maximum(0,1-dist)).astype(np.float32)
        near=np.where(mask,z+surface*rz,-100)
        paint(mask,part,pal,near)
    def capsule(p0,p1,radius,part,pal):
        x0,y0,s0,z0=project(p0,angle);x1,y1,s1,z1=project(p1,angle)
        gy,gx=np.mgrid[:H,:W]
        vx=x1-x0;vy=y1-y0
        t=np.clip(((gx-x0)*vx+(gy-y0)*vy)/max(1.,vx*vx+vy*vy),0,1)
        px=x0+t*vx;py=y0+t*vy
        pr=(1-t)*s0+t*s1
        d=((gx-px)**2+(gy-py)**2)/np.maximum(1,(radius*pr)**2)
        mask=d<=1
        near=np.where(mask,z0*(1-t)+z1*t+radius*np.sqrt(np.maximum(0,1-d)),-100)
        paint(mask,part,pal,near)
    # All elements compete in one z-buffer; no fake fixed drawing order.
    ellipse((0,.86,-.03),(skirt_width,skirt_drop,.10),9,1)
    ellipse((0,1.47,-.01),(chest*.72,body*.53,.18),5,2)
    ellipse((0,1.82,.0),(.12,.15,.11),4,3)
    for side in (-1,1):
        x=side*hip/3
        capsule((x,.90,.0),(x,.43,.04),.135,10,3)
        capsule((x,.45,.04),(x,.08,.12),.105,11,2)
        ellipse((x,.075,.18),(.17,.07,.20),12,1)
        ex=side*(chest/2+.13)
        wrist=side*(chest/2+.09)
        capsule((side*chest/2,1.67,.02),(ex,1.24,.12+side*bend),.14,6,2)
        capsule((ex,1.24,.12+side*bend),(wrist,.85,.12+side*pose),.112,7,3)
        ellipse((wrist,.81,.14+side*pose),(.115,.13,.13),8,3)
    ellipse((0,2.17,-.07),(head*1.05,head*1.05,.26),1,1)
    ellipse((0,2.11,.10),(head*.78,head*.79,.23),2,3)
    # Eyes are in front of face, move correctly with the camera.
    for side in (-1,1):
        ellipse((side*head*.36,2.15,.36),(.054,.078,.044),3,0)
    ellipse((0,2.41,.22),(head*.89,head*.24,.15),1,1)
    # Hair framing gives visible volume and side occlusion.
    for side in (-1,1):
        ellipse((side*head*.80,2.03,.02),(.085,head*.67,.16),1,1)
    heat=np.zeros((len(JOINTS),H,W),np.float32)
    yy,xx=np.mgrid[:H,:W]
    for i,key in enumerate(JOINTS):
        x,y=landmarks[key]
        heat[i]=np.exp(-((xx-x)**2+(yy-y)**2)/(2*2.4**2)).astype(np.float32)
    # This is a learnable z-order proxy, not a metric depth scan.
    return color,parts,depth,heat,angle

class Res(nn.Module):
    def __init__(self,c):
        super().__init__()
        self.f=nn.Sequential(nn.GroupNorm(8,c),nn.SiLU(),nn.Conv2d(c,c,3,padding=1),
            nn.GroupNorm(8,c),nn.SiLU(),nn.Conv2d(c,c,3,padding=1))
    def forward(self,x):return x+.35*self.f(x)

class GeometryNet(nn.Module):
    def __init__(self,channels=32):
        super().__init__()
        self.enc=nn.Sequential(nn.Conv2d(6,channels,3,padding=1),Res(channels),nn.Conv2d(channels,channels*2,3,stride=2,padding=1),Res(channels*2))
        self.mid=nn.Sequential(nn.Conv2d(channels*2,channels*3,3,stride=2,padding=1),Res(channels*3))
        self.up=nn.Sequential(nn.Conv2d(channels*3+channels*2,channels*2,3,padding=1),Res(channels*2))
        self.skip=nn.Conv2d(6,channels,1)
        self.out=nn.Sequential(nn.Conv2d(channels*2+channels,channels,3,padding=1),Res(channels))
        self.seg=nn.Conv2d(channels,len(PARTS),1)
        self.dep=nn.Conv2d(channels,5,1)
        self.joints=nn.Conv2d(channels,len(JOINTS),1)
        self.yaw=nn.Sequential(nn.AdaptiveAvgPool2d(1),nn.Flatten(),nn.Linear(channels*3,3))
    def forward(self,pixels):
        b,h,w=pixels.shape
        a=F.one_hot(pixels,4).permute(0,3,1,2).float()
        yy=torch.linspace(-1,1,h,device=pixels.device)[None,None,:,None].expand(b,1,h,w)
        xx=torch.linspace(-1,1,w,device=pixels.device)[None,None,None,:].expand(b,1,h,w)
        enc=torch.cat((a,xx,yy),1)
        s=self.enc(enc);low=self.mid(s)
        big=F.interpolate(low,size=s.shape[-2:],mode='nearest')
        big=self.up(torch.cat((big,s),1))
        full=F.interpolate(big,size=(h,w),mode='nearest')
        full=self.out(torch.cat((full,self.skip(enc)),1))
        return self.seg(full),self.dep(full),self.joints(full),self.yaw(low)

def make_batch(rng,batch=8,train=True):
    lo,hi=(0,800000) if train else (2000000,3000000)
    sample=[scene(int(rng.integers(lo,hi)),int(rng.integers(0,3))) for _ in range(batch)]
    color=torch.tensor(np.stack([x[0] for x in sample]),dtype=torch.long)
    parts=torch.tensor(np.stack([x[1] for x in sample]),dtype=torch.long)
    depth=torch.tensor(np.stack([x[2] for x in sample]),dtype=torch.long)
    heat=torch.tensor(np.stack([x[3] for x in sample]),dtype=torch.float32)
    yaw=torch.tensor([VIEW_ANGLES.index(x[4]) for x in sample],dtype=torch.long)
    return color,parts,depth,heat,yaw

def loss_fn(net,batch):
    color,part,dep,heat,yaw=batch
    ps,pd,pj,py=net(color)
    weights=torch.tensor([.18]+[2.]*(len(PARTS)-1))
    part_loss=F.cross_entropy(ps,part,weight=weights)
    mask=part!=0
    depth_loss=F.cross_entropy(pd,dep,reduction='none')
    depth_loss=(depth_loss*mask).sum()/mask.sum().clamp(min=1)
    # Center-sensitive heat supervision; positive heat regions are scarce.
    joint_loss=((pj.sigmoid()-heat)**2*(1+24*heat)).mean()
    yaw_loss=F.cross_entropy(py,yaw)
    return part_loss+.4*depth_loss+2*joint_loss+.15*yaw_loss,(ps,pd,pj,py)

def eval_model(net,seed=903451,count=30):
    rng=np.random.default_rng(seed)
    sum_iou=np.zeros((len(PARTS)-1,),np.float64)
    valid=np.zeros((len(PARTS)-1,),np.int32)
    pixel_total=0;pixel_correct=0;depth_total=0;depth_correct=0;yaw_total=0;yaw_correct=0;joint_dist=[]
    net.eval()
    with torch.no_grad():
        for _ in range(count):
            b=make_batch(rng,1,False)
            pred=net(b[0])
            out=pred[0].argmax(1)[0].numpy();true=b[1][0].numpy()
            pdep=pred[1].argmax(1)[0].numpy();gdep=b[2][0].numpy()
            active=true>0
            depth_correct+=int(((pdep==gdep)&active).sum());depth_total+=int(active.sum())
            pixel_correct+=int((out==true).sum());pixel_total+=H*W
            for i in range(1,len(PARTS)):
                union=((out==i)|(true==i)).sum()
                if union:
                    valid[i-1]+=1
                    sum_iou[i-1]+=((out==i)&(true==i)).sum()/union
            yaw_correct+=int(pred[3].argmax(1).item()==b[4].item());yaw_total+=1
            heat_pred=pred[2][0].sigmoid().numpy();heat_true=b[3][0].numpy()
            for a,bg in zip(heat_pred,heat_true):
                i0=np.argmax(a);i1=np.argmax(bg)
                joint_dist.append(float(math.hypot(i0//W-i1//W,i0%W-i1%W)))
    return {"heldout_seed_range":[2000000,3000000],
      "full_pixel_seg_accuracy":round(pixel_correct/max(pixel_total,1),4),
      "foreground_part_mean_iou":round(float((sum_iou/np.maximum(valid,1)).mean()),4),
      "foreground_depth_bin_accuracy":round(depth_correct/max(depth_total,1),4),
      "yaw_class_accuracy":round(yaw_correct/max(yaw_total,1),4),
      "joint_mean_error_pixels":round(float(np.mean(joint_dist)),2),
      "test_images":count}

def write_preview(net,out):
    palette=DIAGNOSTIC
    net.eval()
    cases=[]
    with torch.no_grad():
        for yaw in range(3):
            sample=scene(22334455,yaw)
            color,part,depth,heat,_=sample
            pred=net(torch.from_numpy(color.copy())[None].long())
            preds=pred[0][0].argmax(0).numpy()
            z=pred[1][0].argmax(0).numpy()
            cases.append({"view":VIEW_ANGLES[yaw],"input":f"view{yaw}_input.png",
                "target_parts":f"view{yaw}_target_parts.png","pred_parts":f"view{yaw}_pred_parts.png",
                "pred_depth":f"view{yaw}_pred_depth.png"})
            Image.fromarray(RGB[color],"RGB").save(out/cases[-1]["input"])
            Image.fromarray(palette[part],"RGB").save(out/cases[-1]["target_parts"])
            Image.fromarray(palette[preds],"RGB").save(out/cases[-1]["pred_parts"])
            shades=np.array([[57,54,87],[85,91,121],[124,143,174],[169,186,233],[255,245,230]],np.uint8)
            Image.fromarray(shades[z],"RGB").save(out/cases[-1]["pred_depth"])
    return cases

def train(steps=180,out=OUT,seed=20261030):
    out=Path(out);out.mkdir(parents=True,exist_ok=True)
    torch.manual_seed(seed);torch.set_num_threads(2)
    rng=np.random.default_rng(seed)
    net=GeometryNet()
    optimizer=torch.optim.AdamW(net.parameters(),lr=.0008,weight_decay=.0002)
    history=[]
    net.train()
    for i in range(steps):
        batch=make_batch(rng,8,True)
        loss,_=loss_fn(net,batch)
        optimizer.zero_grad(set_to_none=True);loss.backward()
        torch.nn.utils.clip_grad_norm_(net.parameters(),2)
        optimizer.step()
        if i in (0,29,59,119,steps-1):
            history.append([i+1,round(loss.item(),5)])
    torch.save({"state_dict":net.state_dict(),"classes":PARTS,"joints":JOINTS},out/"geometry_weights.pt")
    scores=eval_model(net)
    previews=write_preview(net,out)
    report={
      "purpose":"PARTS / DEPTH / PERSPECTIVE / JOINTS pretrained synthetic geometry prototype",
      "trained":True,"no_claim_real_3d":True,"no_claim_new_character_generation":True,
      "native_geometry_grid":[W,H],"input_palette":["#393657","#F2A5C2","#A9BAE9","#FFF5E6"],
      "target_part_classes":PARTS,"views_deg":list(VIEW_ANGLES),"joint_names":JOINTS,
      "parameter_count":sum(x.numel() for x in net.parameters()),"train_steps":steps,
      "loss_points":history,"evaluation":scores,"preview":previews,
      "limitations":["Synthetic 3D primitive proxies, not the user's original character's actual 3D volume.",
        "Semantic/depth diagnostic masks contain colors outside D palette; sprites remain exact D four colors.",
        "Original hand-made 384x512 face, hairstyle and modern clothes require authentic annotated exemplars.",
        "These weights predict parts/depth/view, they do not yet produce finished 384x512 portrait art."]}
    (out/"report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps({"steps":steps,"results":scores,"parameters":report["parameter_count"]},ensure_ascii=False))
    return report

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--steps",type=int,default=180)
    p.add_argument("--out",type=Path,default=OUT)
    a=p.parse_args();train(steps=a.steps,out=a.out)
