"""Pixel Lab System 02 - independent-blueprint D four-color masked discrete diffusion V2.

Own original research prototype, not official NVIDIA or Google weights.
Datasets: two user-provided poses of SAME character and five original,
programmatically designed prop/scene families. Held-out procedural seeds test
small-scale structure generalization, not professional artistic quality.
"""
import argparse, base64, json, math, random, time, zlib
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
import torch
from torch import nn
from torch.nn import functional as F

W,H=48,64
PALETTE=np.array([[57,54,87],[242,165,194],[169,186,233],[255,245,230]],dtype=np.uint8)
NAMES=['potion','lantern','chest','tree','cottage','A_dynamic','B_standing']
MASK=4

def _rect(d,box,c):d.rectangle(tuple(round(x) for x in box),fill=int(c))
def _poly(d,points,c):d.polygon([(round(x),round(y)) for x,y in points],fill=int(c))
def sprite(asset,seed):
    """Blueprint and detailed target independently rendered from shared parameters.

    Note: A blueprint is a composition CONDITION, never reconstructed from
    target during inference. Target includes additional color/detail decisions.
    """
    r=random.Random(int(seed))
    target=Image.new('L',(W,H),0);layout=Image.new('L',(W,H),0)
    t=ImageDraw.Draw(target);g=ImageDraw.Draw(layout)
    cx=24+r.randint(-4,4);cy=31+r.randint(-5,5)
    sx=r.randint(0,3);sy=r.randint(0,3)
    if asset=='potion':
        _rect(g,(cx-5-sx,cy-9,cx+5+sx,cy+12+sy),1)
        _rect(g,(cx-3,cy-15,cx+3,cy-8),2)
        _rect(t,(cx-6-sx,cy-10,cx+6+sx,cy+13+sy),0)
        _rect(t,(cx-5-sx,cy-9,cx+5+sx,cy+12+sy),1)
        _rect(t,(cx-3,cy-16,cx+3,cy-7),0)
        _rect(t,(cx-2,cy-15,cx+2,cy-8),2)
        _rect(t,(cx-6,cy-17,cx+6,cy-15),3)
        _rect(t,(cx-3,cy-3,cx+3,cy+6),3)
        _rect(t,(cx-1,cy-2,cx+1,cy+5),2)
        _rect(t,(cx-4-sx,cy-8,cx-3-sx,cy+9),3)
        _rect(t,(cx-5-sx,cy+11+sy,cx+5+sx,cy+12+sy),2)
    elif asset=='lantern':
        _rect(g,(cx-7-sx,cy-6,cx+7+sx,cy+12+sy),1)
        _rect(g,(cx-4,cy-13,cx+4,cy-7),2)
        _rect(t,(cx-8-sx,cy-8,cx+8+sx,cy+13+sy),0)
        _rect(t,(cx-7-sx,cy-6,cx+7+sx,cy+12+sy),2)
        _rect(t,(cx-5-sx,cy-5,cx+5+sx,cy+10+sy),3)
        _rect(t,(cx-2,cy-3,cx+2,cy+7),1)
        _rect(t,(cx-1,cy-5,cx+1,cy+3),3)
        _rect(t,(cx-8-sx,cy-7,cx+8+sx,cy-5),1)
        _rect(t,(cx-8-sx,cy+11+sy,cx+8+sx,cy+13+sy),1)
        _rect(t,(cx-2,cy-14,cx+2,cy-10),2)
        _rect(t,(cx-4,cy-13,cx-3,cy-9),3)
        _rect(t,(cx+3,cy-13,cx+4,cy-9),3)
    elif asset=='chest':
        _rect(g,(cx-14-sx,cy-5,cx+14+sx,cy+13+sy),1)
        _rect(g,(cx-14-sx,cy-10,cx+14+sx,cy-5),2)
        _rect(t,(cx-15-sx,cy-11,cx+15+sx,cy+14+sy),0)
        _rect(t,(cx-14-sx,cy-10,cx+14+sx,cy+13+sy),1)
        _rect(t,(cx-13-sx,cy-9,cx+13+sx,cy-5),2)
        _rect(t,(cx-12-sx,cy-3,cx+12+sx,cy+10+sy),1)
        _rect(t,(cx-14-sx,cy-5,cx+14+sx,cy-3),3)
        _rect(t,(cx-14-sx,cy+10+sy,cx+14+sx,cy+13+sy),2)
        _rect(t,(cx-11-sx,cy-9,cx-9-sx,cy+11+sy),3)
        _rect(t,(cx+9+sx,cy-9,cx+11+sx,cy+11+sy),3)
        _rect(t,(cx-3,cy-4,cx+3,cy+5),2)
        _rect(t,(cx-1,cy-1,cx+1,cy+3),3)
    elif asset=='tree':
        _poly(g,[(cx,cy-23-sy),(cx-13-sx,cy+9),(cx+13+sx,cy+9)],1)
        _rect(g,(cx-3,cy+9,cx+3,cy+23),2)
        _rect(t,(cx-3,cy+4,cx+3,cy+23),2)
        _poly(t,[(cx,cy-24-sy),(cx-8,cy-7),(cx+8,cy-7)],1)
        _poly(t,[(cx,cy-14-sy),(cx-12-sx,cy+2),(cx+12+sx,cy+2)],1)
        _poly(t,[(cx,cy-6),(cx-14-sx,cy+12),(cx+14+sx,cy+12)],1)
        _poly(t,[(cx-1,cy-19-sy),(cx-4,cy-8),(cx+1,cy-8)],3)
        _poly(t,[(cx-4,cy-7),(cx-9,cy),(cx-4,cy)],3)
        _poly(t,[(cx+6,cy+1),(cx+10,cy+6),(cx+6,cy+6)],2)
        _rect(t,(cx-2,cy+13,cx+2,cy+21),3)
    elif asset=='cottage':
        _rect(g,(cx-15-sx,cy-5,cx+15+sx,cy+20+sy),1)
        _poly(g,[(cx,cy-23-sy),(cx-19-sx,cy-6),(cx+19+sx,cy-6)],2)
        _rect(t,(cx-15-sx,cy-6,cx+15+sx,cy+20+sy),3)
        _poly(t,[(cx,cy-24-sy),(cx-19-sx,cy-7),(cx+19+sx,cy-7)],2)
        _poly(t,[(cx,cy-20-sy),(cx-13-sx,cy-9),(cx+13+sx,cy-9)],1)
        _rect(t,(cx-5,cy+5,cx+5,cy+20+sy),1)
        _rect(t,(cx-2,cy+11,cx+2,cy+20+sy),2)
        _rect(t,(cx-11-sx,cy-1,cx-7-sx,cy+5),2)
        _rect(t,(cx+7+sx,cy-1,cx+11+sx,cy+5),2)
        _rect(t,(cx-14-sx,cy+18+sy,cx+14+sx,cy+20+sy),1)
    else:raise ValueError(asset)
    return np.asarray(target,dtype=np.int64),np.asarray(layout,dtype=np.int64)

def load_character(path):
    rgb=np.asarray(Image.open(path).convert('RGB').resize((W,H),Image.Resampling.NEAREST),dtype=np.int32)
    delta=(rgb[:,:,None,:]-PALETTE[None,None,:,:].astype(np.int32))**2
    values=delta.sum(3).argmin(2).astype(np.int64)
    assert np.array_equal(PALETTE[values],rgb.astype('uint8'))
    guide=np.asarray(Image.fromarray(values.astype('uint8')).resize((12,16),Image.Resampling.NEAREST).resize((W,H),Image.Resampling.NEAREST),dtype=np.int64)
    return values,guide

def training_example(rng,chars):
    category=int(rng.integers(0,len(NAMES)))
    if category<5:
        target,guide=sprite(NAMES[category],int(rng.integers(0,100000000)))
    else:
        target,guide=chars[category-5]
        dx,dy=int(rng.integers(-2,3)),int(rng.integers(-2,3))
        def shifted(a):
            v=np.zeros_like(a)
            x0,x1=max(0,dx),min(W,W+dx)
            y0,y1=max(0,dy),min(H,H+dy)
            v[y0:y1,x0:x1]=a[y0-dy:y1-dy,x0-dx:x1-dx]
            return v
        target,guide=shifted(target),shifted(guide)
        if rng.random()<.5:target,guide=np.fliplr(target).copy(),np.fliplr(guide).copy()
    return category,target,guide

class Block(nn.Module):
    def __init__(self,c,d):
        super().__init__()
        self.path=nn.Sequential(nn.GroupNorm(8,c),nn.SiLU(),nn.Conv2d(c,c,3,padding=d,dilation=d),
            nn.GroupNorm(8,c),nn.SiLU(),nn.Conv2d(c,c,1))
    def forward(self,x):return x+.3*self.path(x)

class Model(nn.Module):
    def __init__(self,width=48):
        super().__init__()
        self.colors=nn.Embedding(5,16)
        self.category=nn.Embedding(len(NAMES),8)
        # 16 tokens + 8 category + 4 guide + XY + age + mask ratio = 32 channels
        self.inp=nn.Conv2d(32,width,3,padding=1)
        self.blocks=nn.Sequential(*(Block(width,d) for d in (1,2,4,8,8,4,2,1)))
        self.out=nn.Sequential(nn.GroupNorm(8,width),nn.SiLU(),nn.Conv2d(width,4,1))
    def forward(self,noisy,category,guide,age,mask_ratio):
        batch,h,w=noisy.shape
        x=self.colors(noisy).permute(0,3,1,2)
        q=self.category(category)[:,:,None,None].expand(batch,8,h,w)
        g=F.one_hot(guide,4).permute(0,3,1,2).float()
        coords=torch.stack(torch.meshgrid(torch.linspace(-1,1,h,device=noisy.device),
            torch.linspace(-1,1,w,device=noisy.device),indexing='ij'))[None].expand(batch,2,h,w)
        a=(age/4.)[:,None,:,:]
        t=mask_ratio[:,None,None,None].expand(batch,1,h,w)
        return self.out(self.blocks(self.inp(torch.cat((x,q,g,coords,a,t),1))))

def make_batch(rng,chars,b=12):
    records=[training_example(rng,chars) for _ in range(b)]
    target=torch.from_numpy(np.stack([v[1] for v in records])).long()
    guide=torch.from_numpy(np.stack([v[2] for v in records])).long()
    category=torch.tensor([v[0] for v in records],dtype=torch.long)
    ratio=torch.tensor(rng.uniform(.10,.99,b),dtype=torch.float32)
    hidden=torch.from_numpy(rng.random((b,H,W))<ratio[:,None,None].numpy())
    errors=torch.from_numpy(rng.random((b,H,W))<rng.uniform(.03,.20,(b,1,1)))&~hidden
    age=torch.from_numpy(rng.integers(1,5,(b,H,W),dtype=np.int64)).float()
    age[hidden]=0
    noisy=target.clone()
    wrong=torch.from_numpy(rng.integers(0,4,(b,H,W),dtype=np.int64))
    noisy[hidden]=4;noisy[errors]=wrong[errors]
    return target,category,guide,noisy,age,ratio,hidden,errors

@torch.no_grad()
def sample(model,guide,category,seed=0,passes=10,partial=None,locked=None,edit=True):
    if isinstance(guide,np.ndarray):guide=torch.from_numpy(guide.copy()).long()
    assert guide.shape==(H,W) and 0<=int(guide.min()) and int(guide.max())<=3
    rng=torch.Generator().manual_seed(seed)
    state=torch.full((1,H,W),4,dtype=torch.long) if partial is None else partial.clone().long()[None]
    lock=torch.zeros((H,W),dtype=torch.bool) if locked is None else locked.clone().bool()
    assert not (lock&(state[0]==4)).any()
    age=torch.zeros((1,H,W),dtype=torch.float32)
    for step in range(passes):
        ratio=(state==4).float().mean((1,2))
        logits=model(state,torch.tensor([category]),guide[None],age,ratio)[0].permute(1,2,0)
        probabilities=logits.softmax(-1)
        confidence,pred=probabilities.max(-1)
        unknown=(state[0]==4)&~lock
        if edit and step>=1:
            visible=(~unknown)&~lock
            old=state[0].clamp(max=3)
            oldprob=probabilities.gather(-1,old[...,None]).squeeze(-1)
            correction=visible&(pred!=old)&(confidence-oldprob>.11+.03*age[0])&(confidence>.43)
            state[0,correction]=pred[correction]
            age[0,correction]=1
        age[0,(state[0]<4)&~lock]+=1
        age.clamp_(0,4)
        unknown=(state[0]==4)&~lock
        remaining=int(unknown.sum())
        if not remaining:continue
        target_remaining=0 if step==passes-1 else int(H*W*math.cos((step+1)*math.pi/(passes*2)))
        fill=max(0,remaining-target_remaining)
        if fill:
            conf=(confidence+torch.rand((H,W),generator=rng)*.001).masked_fill(~unknown,-1)
            indices=torch.topk(conf.flatten(),min(fill,remaining)).indices
            state.view(-1)[indices]=pred.flatten()[indices]
            age.view(-1)[indices]=1
    assert (state<=3).all()
    if partial is not None:assert (state[0,lock]==partial[lock]).all()
    return state[0]

def save(arr,path):
    a=arr.detach().cpu().numpy() if isinstance(arr,torch.Tensor) else arr
    Image.fromarray(PALETTE[a.astype('uint8')],'RGB').save(path,optimize=True)
def encoded(arr):
    a=arr.detach().cpu().numpy() if isinstance(arr,torch.Tensor) else arr
    return base64.b64encode(zlib.compress(np.ascontiguousarray(a,dtype=np.uint8).tobytes(),9)).decode('ascii')

def evaluate(model,chars,out,seed):
    rng=np.random.default_rng(seed+500000)
    examples=[];stats=[]
    for category in range(5):
        records=[]
        for j in range(8):
            target,guide=sprite(NAMES[category],10**10+10007+j*777+category*99991)
            target=torch.from_numpy(target).long();guide=torch.from_numpy(guide).long()
            generated=sample(model,guide,category,seed+category*100+j,passes=10)
            masked=torch.from_numpy(rng.random((H,W))<.55)
            partial=target.clone();partial[masked]=4
            repaired=sample(model,guide,category,seed+category*100+j,passes=10,partial=partial,locked=~masked)
            fg=target!=0
            records.append({
              'generated_all':float((generated==target).float().mean()),
              'guided_layout_baseline':float((guide==target).float().mean()),
              'recover_hidden':float((repaired[masked]==target[masked]).float().mean()),
              'unchanged_visible':float((repaired[~masked]==target[~masked]).float().mean()),
              'generated_foreground_recall':float(((generated!=0)&fg).sum()/max(1,int(fg.sum()))),
              'target_fg_fraction':float(fg.float().mean())})
            if j==0:
                for label,frame in zip(('reference','blueprint','generated','repaired'),(target,guide,generated,repaired)):
                    save(frame,out/f'{NAMES[category]}_{label}.png')
                examples.append({'name':NAMES[category],'category':category,
                    'reference':encoded(target),'blueprint':encoded(guide),
                    'generated':encoded(generated),'repaired':encoded(repaired)})
        stats.append({'category':NAMES[category],**{k:round(float(np.mean([v[k] for v in records])),4) for k in records[0]}})
    # Same two D character poses are in-distribution.
    for category in (5,6):
        target,guide=chars[category-5]
        target=torch.from_numpy(target).long();guide=torch.from_numpy(guide).long()
        generated=sample(model,guide,category,seed+category,passes=10)
        mask=torch.from_numpy(rng.random((H,W))<.55)
        part=target.clone();part[mask]=4
        repaired=sample(model,guide,category,seed+category+30,passes=10,partial=part,locked=~mask)
        for label,frame in zip(('reference','blueprint','generated','repaired'),(target,guide,generated,repaired)):
            save(frame,out/f'{NAMES[category]}_{label}.png')
        examples.append({'name':NAMES[category],'category':category,
            'reference':encoded(target),'blueprint':encoded(guide),
            'generated':encoded(generated),'repaired':encoded(repaired)})
    return stats,examples

def run(steps=240,seed=20261030,out=Path('site/pixel-lab/style2/v2'),characters=Path('site/pixel-lab/style2')):
    start=time.time();out.mkdir(parents=True,exist_ok=True)
    torch.set_num_threads(2);torch.manual_seed(seed);rng=np.random.default_rng(seed)
    chars=[load_character(characters/n) for n in ('A_dynamic.png','B_standing.png')]
    model=Model()
    optimizer=torch.optim.AdamW(model.parameters(),lr=.001,weight_decay=.0005)
    losses=[]
    for step in range(steps):
        target,category,guide,noisy,age,ratio,hidden,errors=make_batch(rng,chars)
        logits=model(noisy,category,guide,age,ratio)
        weight=torch.where(target==0,.75,2.3)*(hidden.float()+3*errors.float()+.18)
        loss=(F.cross_entropy(logits,target,reduction='none')*weight).sum()/weight.sum()
        optimizer.zero_grad();loss.backward()
        nn.utils.clip_grad_norm_(model.parameters(),1.5)
        optimizer.step()
        if step in (0,29,59,119,steps-1):losses.append([step+1,round(loss.item(),5)])
    model.eval()
    torch.save({'state':model.state_dict(),'classes':NAMES,'palette':PALETTE.tolist(),'seed':seed},out/'model.pt')
    stats,examples=evaluate(model,chars,out,seed)
    report={
       'method':'Masked categorical generation with visible-token editing and per-pixel age',
       'original_implementation':True,'official_pretrained_weights':False,'image_grid':[W,H],
       'palette':['#393657','#F2A5C2','#A9BAE9','#FFF5E6'],
       'categories':NAMES,'hand_drawn_character_anchors':2,'distinct_character_identities':1,
       'procedural_asset_types':NAMES[:5],
       'procedural_seed_split':'Training random seeds < 10^8; evaluation seeds >= 10^10',
       'guidance_from_target_at_inference':False,
       'character_guidance_note':'Character blueprints are extracted from the same known image, and are not independent novel identities.',
       'params':sum(p.numel() for p in model.parameters()),'train_steps':steps,
       'sampling_network_evaluations':10,'loss':losses,
       'held_out_procedural':stats,'runtime_seconds':round(time.time()-start,1),
       'limitations':['Procedural assets are intentionally simple and not professionally vetted.',
       'Human character identities are seen during training; no new human design capability.',
       'Input guide is editable colored geometry; text-to-image is not implemented.']}
    (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    (out.parent/'diffusion-v2-gallery.json').write_text(
       json.dumps({'palette':report['palette'],'report':report,'samples':examples},
       ensure_ascii=False,separators=(',',':')))
    print(json.dumps({'steps':steps,'runtime_seconds':report['runtime_seconds'],
       'held_out_procedural':stats,'params':report['params']},ensure_ascii=False))
    return report

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--steps',type=int,default=240)
    p.add_argument('--out',type=Path,default=Path('site/pixel-lab/style2/v2'))
    p.add_argument('--characters',type=Path,default=Path('site/pixel-lab/style2'))
    a=p.parse_args()
    run(a.steps,out=a.out,characters=a.characters)
