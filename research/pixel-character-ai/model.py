"""Small trainable categorical masked-denoising model. No pretrained weights."""
import torch
from torch import nn
import torch.nn.functional as F

HEIGHT,WIDTH,MASK=64,48,5
PALETTE=[(57,54,87),(242,165,194),(169,186,233),(255,245,230)]
POSES=('站立','挥手','行走')
HAIRS=('短发','长发','双丸子','侧马尾')
OUTFITS=('围裙','外套','连衣裙','工装')

class Block(nn.Module):
    def __init__(self,ch,dilation):
        super().__init__()
        self.norm=nn.GroupNorm(8,ch)
        self.conv=nn.Conv2d(ch,ch,3,padding=dilation,dilation=dilation)
        self.point=nn.Conv2d(ch,ch,1)
    def forward(self,x):
        return x+self.point(F.gelu(self.conv(F.gelu(self.norm(x)))))*.5

class MaskedSpriteNet(nn.Module):
    """Neural model over exact 5-state sprite cells, with pose/hair/outfit tokens."""
    def __init__(self,channels=64):
        super().__init__()
        self.embedding=nn.Embedding(6,channels)
        self.pose=nn.Embedding(len(POSES),channels)
        self.hair=nn.Embedding(len(HAIRS),channels)
        self.outfit=nn.Embedding(len(OUTFITS),channels)
        self.xy=nn.Parameter(torch.zeros(1,channels,HEIGHT,WIDTH))
        self.blocks=nn.Sequential(*[Block(channels,d) for d in (1,2,4,8,4,2,1)])
        self.head=nn.Sequential(nn.GroupNorm(8,channels),nn.GELU(),nn.Conv2d(channels,5,1))
        nn.init.normal_(self.xy,std=.02)
    def forward(self,tokens,conditions):
        x=self.embedding(tokens.long()).permute(0,3,1,2)
        c=self.pose(conditions[:,0])+self.hair(conditions[:,1])+self.outfit(conditions[:,2])
        return self.head(self.blocks(x+c[:,:,None,None]+self.xy))

@torch.no_grad()
def sample(model,condition,seed,steps=16,temperature=.85):
    if steps<1:raise ValueError('steps must be >= 1')
    device=next(model.parameters()).device
    g=torch.Generator(device=device).manual_seed(int(seed))
    tokens=torch.full((1,HEIGHT,WIDTH),MASK,dtype=torch.long,device=device)
    cond=torch.as_tensor(condition,dtype=torch.long,device=device).view(1,3)
    model.eval()
    for i in range(steps):
        probs=F.softmax(model(tokens,cond)/max(temperature,.05),dim=1).permute(0,2,3,1).reshape(-1,5)
        choice=torch.multinomial(probs,1,generator=g).reshape(1,HEIGHT,WIDTH)
        confidence=probs.max(-1).values.reshape(1,HEIGHT,WIDTH)
        missing=tokens==MASK
        amount=int(missing.sum())
        take=amount if i==steps-1 else max(1,HEIGHT*WIDTH//steps)
        pos=torch.topk(confidence.masked_fill(~missing,-1).flatten(),min(take,amount)).indices
        tokens.view(-1)[pos]=choice.view(-1)[pos]
    return tokens[0].cpu()
