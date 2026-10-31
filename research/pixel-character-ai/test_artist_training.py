"""Unit tests with random byte tensors ONLY; no fake art is declared approved."""
import unittest
import torch
from art_training import ArtistRGBModel,masked_loss

class ArtistRGBModelTests(unittest.TestCase):
    def test_preserves_full_rgb_output_space_not_four_ink(self):
        net=ArtistRGBModel(ch=8)
        im=torch.zeros(1,4,64,64)
        mask=torch.ones(1,1,64,64,dtype=torch.bool)
        with torch.no_grad():
            logits=net(im,mask)
        self.assertEqual(tuple(logits.shape),(1,770,64,64))
    def test_cpu_backward(self):
        torch.manual_seed(7)
        model=ArtistRGBModel(ch=8)
        im=torch.rand(1,4,64,64)
        im[:,3]=(im[:,3]>.5).float()
        loss=masked_loss(model,im)
        self.assertTrue(torch.isfinite(loss))
        loss.backward()
        self.assertIsNotNone(model.stem.weight.grad)
if __name__=="__main__":
    unittest.main()
