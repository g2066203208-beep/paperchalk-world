"""Actual trainable convolutional variational autoencoder, not a card template."""
import torch
from torch import nn

LATENT_SIZE=24

class PixelVAE(nn.Module):
    def __init__(self, latent_size: int = LATENT_SIZE):
        super().__init__()
        self.latent_size = latent_size
        self.encoder=nn.Sequential(
            nn.Conv2d(3,16,3,2,1), nn.GELU(),
            nn.Conv2d(16,32,3,2,1),nn.GELU(),
            nn.Conv2d(32,48,3,2,1),nn.GELU(),
            nn.Flatten(),
        )
        self.mu=nn.Linear(48*6*4,latent_size)
        self.logvar=nn.Linear(48*6*4,latent_size)
        self.fc=nn.Linear(latent_size,48*6*4)
        self.decoder=nn.Sequential(
            nn.ConvTranspose2d(48,32,4,2,1),nn.GELU(),
            nn.ConvTranspose2d(32,16,4,2,1),nn.GELU(),
            nn.ConvTranspose2d(16,3,4,2,1),nn.Sigmoid()
        )

    def encode(self,x):
        h=self.encoder(x)
        return self.mu(h),self.logvar(h)

    def decode(self,z):
        h=self.fc(z).reshape(-1,48,6,4)
        return self.decoder(h)

    def forward(self,x, sample: bool = True):
        mu,logvar=self.encode(x)
        z=mu + torch.randn_like(mu)*torch.exp(0.5*logvar) if sample else mu
        return self.decode(z),mu,logvar


def loss_fn(recon,target,mu,logvar,beta:float=0.002):
    mse=(recon-target).square().mean()
    kl=-0.5*(1+logvar-mu.square()-logvar.exp()).sum(dim=1).mean()
    return mse+beta*kl,mse,kl
