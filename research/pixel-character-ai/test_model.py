import unittest,tempfile,pathlib
import numpy as np
import torch
from PIL import Image
from dataset import encode,save_png,split_identity
from model import MaskedSpriteNet,HEIGHT,WIDTH,sample
from train import masked_loss
class ResearchSmoke(unittest.TestCase):
    def test_native_roundtrip(self):
        with tempfile.TemporaryDirectory() as d:
            p=pathlib.Path(d)/'a.png';x=torch.zeros((HEIGHT,WIDTH),dtype=torch.long);x[8:20,12:27]=2
            save_png(x,p);self.assertTrue(torch.equal(encode(p),x))
    def test_off_palette_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            p=pathlib.Path(d)/'b.png';a=np.zeros((HEIGHT,WIDTH,4),dtype=np.uint8);a[8,9]=[1,2,3,255]
            Image.fromarray(a,'RGBA').save(p)
            with self.assertRaises(ValueError):encode(p)
    def test_identity_stable(self):
        for identity in ['test','char_0001','人物A']:self.assertEqual(split_identity(identity),split_identity(identity))
    def test_model_forward_and_sample(self):
        m=MaskedSpriteNet(channels=16)
        x=torch.randint(0,5,(2,HEIGHT,WIDTH));c=torch.tensor([[0,0,0],[1,2,3]])
        self.assertEqual(tuple(m(x,c).shape),(2,5,HEIGHT,WIDTH))
        self.assertTrue(torch.isfinite(masked_loss(m,x,c)))
        a=sample(m,[0,0,0],seed=5,steps=2)
        self.assertEqual(tuple(a.shape),(HEIGHT,WIDTH))
        self.assertTrue(bool(torch.all((a>=0)&(a<=4))))
        self.assertTrue(torch.equal(a,sample(m,[0,0,0],seed=5,steps=2)))
if __name__=='__main__':unittest.main()
