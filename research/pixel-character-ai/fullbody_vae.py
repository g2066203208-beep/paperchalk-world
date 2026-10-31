"""Native-resolution full-body portrait VAE baseline (NOT a trained model).

Its global latent samples whole portrait composition, unlike old 64x64 tile inpainting.
No resizing of artist originals. Nearest-neighbour upsampling of latent features;
only one logical output cell for each target pixel; binary export alpha.
"""
import torch
from torch import nn
import torch.nn.functional as F

PROFILES={"portrait_192":(192,256),"portrait_384":(384,512)}

def gn(c):return nn.GroupNorm(8,c)
def conv(in_c,out_c,k=3,s=1):
    return nn.Conv2d(in_c,out_c,k,stride=s,padding=k//2)

class Residual(nn.Module):
    def __init__(self,c):
        super().__init__()
        self.conv1=conv(c,c);self.conv2=conv(c,c)
        self.norm1=gn(c);self.norm2=gn(c)
    def forward(self,x):
        return x+self.conv2(F.silu(self.norm2(self.conv1(F.silu(self.norm1(x))))))*.5

class FullBodyVAE(nn.Module):
    def __init__(self,latent_dim=128,base=32):
        super().__init__()
        if base%8:raise ValueError("base channels must divide by eight")
        self.latent_dim=latent_dim
        cs=[base,base*2,base*3,base*4]
        enc=[conv(4,cs[0],3,2),nn.SiLU()]
        for ci,co in zip(cs[:-1],cs[1:]):
            enc.extend([Residual(ci),conv(ci,co,3,2),nn.SiLU()])
        self.enc=nn.Sequential(*enc)
        self.spatial=nn.AdaptiveAvgPool2d((2,2))
        self.mu=nn.Linear(cs[-1]*4,latent_dim)
        self.logvar=nn.Linear(cs[-1]*4,latent_dim)
        self.seed=nn.Linear(latent_dim,cs[-1]*4*4)
        dec=[]
        ch=cs[-1]
        for co in (cs[2],cs[1],cs[0],cs[0]):
            dec.extend([Residual(ch),conv(ch,co),nn.SiLU()])
            ch=co
        self.dec=nn.ModuleList(dec)
        self.rgb=conv(ch,3,1)
        self.alpha=conv(ch,1,1)

    def encode(self,image):
        if image.ndim!=4 or image.shape[1]!=4:
            raise ValueError("RGBA tensor required")
        if (image.shape[-1],image.shape[-2]) not in PROFILES.values():
            raise ValueError("Must be a native full-body 192x256 / 384x512 canvas")
        h=self.enc(image)
        pooled=self.spatial(h).flatten(1)
        return self.mu(pooled),self.logvar(pooled)

    def decode(self,z,width,height):
        if (width,height) not in PROFILES.values():
            raise ValueError("Full-body portrait profile only")
        b=z.shape[0]
        x=self.seed(z).reshape(b,-1,4,4)
        x=F.interpolate(x,size=(height//16,width//16),mode="nearest")
        for i in range(4):
            x=self.dec[i*3](x)
            x=F.silu(self.dec[i*3+1](x))
            # dec[i*3+2] is an additional SiLU; retain explicit nearest upsampling.
            x=self.dec[i*3+2](x)
            x=F.interpolate(x,scale_factor=2,mode="nearest")
        return torch.sigmoid(self.rgb(x)),self.alpha(x)

    def forward(self,image):
        mu,logvar=self.encode(image)
        z=mu+torch.randn_like(mu)*torch.exp(logvar*.5) if self.training else mu
        rgb,alpha_logits=self.decode(z,image.shape[-1],image.shape[-2])
        return rgb,alpha_logits,mu,logvar

    @torch.no_grad()
    def sample(self,batch,width,height,device,seed):
        generator=torch.Generator(device=device).manual_seed(int(seed))
        z=torch.randn((batch,self.latent_dim),generator=generator,device=device)
        self.eval()
        rgb,alpha_logits=self.decode(z,width,height)
        return rgb,alpha_logits

def training_loss(model,image,kl_weight=.0001):
    rgb,alpha_logits,mu,logvar=model(image)
    mask=(image[:,3:4]>.5).float()
    if float(mask.sum())==0:raise ValueError("Empty portrait")
    color=(torch.abs(rgb-image[:,:3])*mask).sum()/(mask.sum()*3)
    silhouette=F.binary_cross_entropy_with_logits(alpha_logits,mask)
    # A distinct edge term penalizes unwanted silhouette changes, relevant to clean pixel clusters.
    actual_edges=(mask[:,:,:,1:]-mask[:,:,:,:-1]).abs()
    predicted=alpha_logits.sigmoid()
    predicted_edges=(predicted[:,:,:,1:]-predicted[:,:,:,:-1]).abs()
    edge=F.l1_loss(predicted_edges,actual_edges)
    kl=-.5*(1+logvar-mu.square()-logvar.exp()).mean()
    loss=color+silhouette*.4+edge*.15+kl_weight*kl
    return loss,{"color":float(color.detach()),"silhouette":float(silhouette.detach()),
                 "edge":float(edge.detach()),"kl":float(kl.detach())}

@torch.no_grad()
def export_rgba(model,path,width,height,seed=1,device="cpu"):
    import numpy as np
    from PIL import Image
    rgb,alpha=model.sample(1,width,height,device,seed)
    v=np.zeros((height,width,4),dtype=np.uint8)
    v[:,:,:3]=(rgb[0].permute(1,2,0).cpu().numpy()*255).round().clip(0,255).astype(np.uint8)
    v[:,:,3]=np.where(alpha.sigmoid()[0,0].cpu().numpy()>.5,255,0).astype(np.uint8)
    # No bilinear resize, no fake pixel shader.
    Image.fromarray(v,"RGBA").save(path)
    return {"width":width,"height":height,"alpha_values":[0,255],"trained":True}
