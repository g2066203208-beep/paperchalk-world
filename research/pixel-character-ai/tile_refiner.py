"""Experimental native-grid guided tile refiner, NOT a trained scene generator.
Input is a full-resolution layout; output predicts native palette cells, never upscales a 48x64 sprite.
"""
import numpy as np
import torch
from torch import nn
import torch.nn.functional as F
from large_canvas import PROFILES,tile_regions
class Residual(nn.Module):
    def __init__(self,c,d):
        super().__init__();self.n=nn.GroupNorm(8,c);self.conv=nn.Conv2d(c,c,3,padding=d,dilation=d)
    def forward(self,x):return x+0.5*F.gelu(self.conv(F.gelu(self.n(x))))
class GuidedTileNet(nn.Module):
    def __init__(self,channels=32):
        super().__init__()
        if channels%8:raise ValueError('channels must be divisible by 8')
        self.tokens=nn.Embedding(6,channels)
        self.guide=nn.Embedding(5,channels)
        self.condition=nn.ModuleList([nn.Embedding(3,channels),nn.Embedding(4,channels),nn.Embedding(4,channels)])
        self.position=nn.Conv2d(2,channels,1)
        self.blocks=nn.Sequential(*[Residual(channels,d) for d in (1,2,4,8,4,2,1)])
        self.final=nn.Sequential(nn.GroupNorm(8,channels),nn.GELU(),nn.Conv2d(channels,5,1))
    def forward(self,tokens,guide,xy,condition):
        if tokens.shape!=guide.shape or tuple(xy.shape[:2])!=(tokens.shape[0],2):
            raise ValueError('Tile tensor shape mismatch')
        x=self.tokens(tokens.long()).permute(0,3,1,2)
        x=x+self.guide(guide.long()).permute(0,3,1,2)+self.position(xy)
        for i,emb in enumerate(self.condition):
            x=x+emb(condition[:,i])[:,:,None,None]
        return self.final(self.blocks(x))
def global_coordinates(x,y,w,h,tile=64):
    xx=(np.arange(x,x+tile,dtype=np.float32)+0.5)/w*2-1
    yy=(np.arange(y,y+tile,dtype=np.float32)+0.5)/h*2-1
    return torch.from_numpy(np.stack(np.meshgrid(xx,yy,indexing='xy')))
@torch.no_grad()
def refine_guided(model,guide,conditions,iterations=2,tile=64,stride=48,device='cpu'):
    """Guided inference requires actual checkpoint and native full-size layout."""
    source=np.asarray(guide,dtype=np.uint8);h,w=source.shape
    if (w,h) not in PROFILES.values():raise ValueError('Unsupported resolution')
    if np.any(source>4):raise ValueError('Invalid palette token')
    if tile<1 or iterations<1:raise ValueError('Invalid inference parameters')
    tile=min(tile,h,w)
    output=np.full_like(source,5)
    model.eval();cond=torch.as_tensor(conditions,dtype=torch.long,device=device).view(1,3)
    for _ in range(iterations):
        next_output=np.zeros_like(source)
        for (x,y,_,_),(l,t,r,b) in tile_regions(w,h,tile,stride):
            tx=torch.as_tensor(output[y:y+tile,x:x+tile].copy(),device=device).unsqueeze(0).long()
            tg=torch.as_tensor(source[y:y+tile,x:x+tile].copy(),device=device).unsqueeze(0).long()
            coords=global_coordinates(x,y,w,h,tile).to(device).unsqueeze(0)
            pred=model(tx,tg,coords,cond).argmax(dim=1)[0].cpu().numpy().astype(np.uint8)
            next_output[t:b,l:r]=pred[t-y:b-y,l-x:r-x]
        output=next_output
    return output
