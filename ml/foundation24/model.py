"""Two genuinely learned baselines: masked pixel tokens and supplied-silhouette condition.

Local palette IDs in the current mini36 PILOT are not semantically aligned;
the experiment does not establish generalized color design or anatomy.
"""
from __future__ import annotations
import numpy as np
import torch
from torch import nn
from torch.nn import functional as F
from .core import MASK_TOKEN,SIDE

class Residual(nn.Module):
    def __init__(self,width,dilation):
        super().__init__()
        self.net=nn.Sequential(nn.Conv2d(width,width,3,padding=dilation,dilation=dilation),
                               nn.GELU(),nn.Conv2d(width,width,1))
    def forward(self,x):
        return F.gelu(x+self.net(x)*0.5)

class MaskedPixelNet(nn.Module):
    def __init__(self,width=48,structure_condition=False):
        super().__init__()
        self.width=width;self.structure_condition=structure_condition
        self.embed=nn.Embedding(16,24)
        self.start=nn.Conv2d(26+int(structure_condition),width,3,padding=1)
        self.body=nn.Sequential(Residual(width,1),Residual(width,2),Residual(width,4),
                                Residual(width,8),Residual(width,1))
        self.out=nn.Conv2d(width,15,1)
    def forward(self,tokens,silhouette=None):
        n,h,w=tokens.shape
        if (h,w)!=(SIDE,SIDE):
            raise ValueError('Only native 24x24 supported')
        x=self.embed(tokens.long()).permute(0,3,1,2)
        yy=torch.linspace(-1,1,h,device=tokens.device)[None,None,:,None].expand(n,1,h,w)
        xx=torch.linspace(-1,1,w,device=tokens.device)[None,None,None,:].expand(n,1,h,w)
        channels=[x,xx,yy]
        if self.structure_condition:
            if silhouette is None:
                raise ValueError('Structure-conditioned model needs a silhouette')
            channels.append(silhouette[:,None].float())
        return self.out(self.body(F.gelu(self.start(torch.cat(channels,dim=1)))))

def masked_loss(net,batch,rng,conditioning=False):
    truth=batch.long()
    fraction=float(rng.uniform(0.25,1.0))
    missing=torch.from_numpy(rng.random(tuple(truth.shape))<fraction).to(truth.device)
    if not bool(missing.any()):missing[:,0,0]=True
    damaged=truth.clone();damaged[missing]=MASK_TOKEN
    silhouette=(truth>0) if conditioning else None
    logits=net(damaged,silhouette)
    per_pixel=F.cross_entropy(logits,truth,reduction='none')
    weights=(1+2*(truth>0).float())*missing.float()
    return (weights*per_pixel).sum()/weights.sum().clamp_min(1)

@torch.no_grad()
def generate(net,seed,structure=None,steps=12,temperature=1.0):
    """Iterative confidence-based fill, outputs only valid 24x24 integer tokens."""
    device=next(net.parameters()).device
    if net.structure_condition and structure is None:
        raise ValueError('An independently specified silhouette is required')
    if not net.structure_condition and structure is not None:
        raise ValueError('Unconditional model cannot claim silhouette control')
    g=torch.Generator(device=device).manual_seed(int(seed))
    canvas=torch.full((1,SIDE,SIDE),MASK_TOKEN,dtype=torch.long,device=device)
    silhouette=None if structure is None else torch.as_tensor(
        np.asarray(structure),device=device,dtype=torch.float32)[None]
    for step in range(steps):
        logits=net(canvas,silhouette)[0].permute(1,2,0).reshape(-1,15)
        probs=torch.softmax(logits/max(0.05,float(temperature)),dim=-1)
        unknown=(canvas.view(-1)==MASK_TOKEN)
        if not bool(unknown.any()):break
        sampled=torch.multinomial(probs[unknown],1,generator=g).view(-1)
        confidence=probs[unknown].gather(1,sampled[:,None]).squeeze(1)
        count=int(unknown.sum().item())
        select_n=max(1,int(np.ceil(count/(steps-step))))
        order=torch.argsort(confidence,descending=True)[:select_n]
        full_idx=torch.nonzero(unknown).view(-1)[order]
        canvas.view(-1)[full_idx]=sampled[order]
    if bool((canvas==MASK_TOKEN).any()):
        logits=net(canvas,silhouette).argmax(1)
        canvas=torch.where(canvas==MASK_TOKEN,logits,canvas)
    result=canvas[0].cpu().numpy().astype(np.uint8)
    assert result.shape==(SIDE,SIDE) and int(result.max())<=14
    return result
