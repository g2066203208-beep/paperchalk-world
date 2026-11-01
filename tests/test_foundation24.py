"""Native-index assertions and REAL gradient/generation checks on controlled fixtures."""
import json
import tempfile
import unittest
from pathlib import Path
import numpy as np
from PIL import Image
import torch
from ml.foundation24.core import (
    decode_rgba,validate,indexed_from_rgba,load_approved,gallery,save_native_and_nearest)
from ml.foundation24.model import MaskedPixelNet,masked_loss,generate

class PixelFoundation24Test(unittest.TestCase):
    @classmethod
    def setUpClass(cls):torch.set_num_threads(2)
    def setup_sprite(self):
        tokens=np.zeros((24,24),np.uint8)
        tokens[3:10,8:16]=1
        tokens[10:18,9:15]=2
        tokens[18:22,9:12]=3
        tokens[18:22,13:16]=3
        palette=np.zeros((15,3),np.uint8)
        palette[1]=[220,175,145]
        palette[2]=[75,110,150]
        palette[3]=[35,36,50]
        return tokens,palette

    def test_native_lossless_and_grid(self):
        tokens,palette=self.setup_sprite()
        meta=validate(tokens,palette)
        self.assertEqual(meta['foreground_colors'],3)
        rgba=decode_rgba(tokens,palette)
        self.assertTrue(np.isin(rgba[:,:,3],[0,255]).all())
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'native.png'
            Image.fromarray(rgba,'RGBA').save(p)
            t,q=indexed_from_rgba(p)
            self.assertTrue(np.array_equal(decode_rgba(t,q),rgba))
            sheet=gallery([tokens]*36,[palette]*36,columns=6)
            self.assertEqual(sheet.size,(240,240))
            save_native_and_nearest(sheet,Path(d)/'sheet.png')
            a=np.array(Image.open(Path(d)/'sheet.png'))
            b=np.array(Image.open(Path(d)/'sheet-4x.png'))
            self.assertTrue(np.array_equal(b,np.repeat(np.repeat(a,4,0),4,1)))
            for row in range(6):
                for col in range(6):
                    tile=a[row*40:row*40+40,col*40:col*40+40,3]
                    self.assertTrue(np.all(tile==255))

    def test_reject_antialias_and_unlicensed(self):
        tokens,palette=self.setup_sprite()
        with tempfile.TemporaryDirectory() as d:
            d=Path(d);p=d/'native.png'
            rgba=decode_rgba(tokens,palette);rgba[0,0,3]=64
            Image.fromarray(rgba,'RGBA').save(p)
            with self.assertRaisesRegex(ValueError,'alpha must be binary'):
                indexed_from_rgba(p)
            manifest=d/'data.json'
            manifest.write_text(json.dumps([{'path':'native.png'}]*3))
            with self.assertRaisesRegex(ValueError,'Missing provenance'):
                load_approved(d,manifest)

    def test_real_backprop_and_discrete_generation(self):
        tokens,_=self.setup_sprite()
        truth=torch.tensor(np.stack([tokens,tokens])).long()
        for conditioned in (False,True):
            torch.manual_seed(8)
            net=MaskedPixelNet(width=16,structure_condition=conditioned)
            optimizer=torch.optim.Adam(net.parameters(),lr=.005)
            first=net.out.weight.detach().clone()
            loss=masked_loss(net,truth,np.random.default_rng(42),conditioned)
            self.assertTrue(torch.isfinite(loss))
            optimizer.zero_grad();loss.backward();optimizer.step()
            self.assertFalse(torch.equal(net.out.weight.detach(),first))
            net.eval()
            kwargs={'structure':tokens>0} if conditioned else {}
            a=generate(net,seed=18,steps=4,**kwargs)
            b=generate(net,seed=18,steps=4,**kwargs)
            self.assertTrue(np.array_equal(a,b))
            self.assertEqual(a.shape,(24,24))
            self.assertLessEqual(int(a.max()),14)

if __name__=='__main__':unittest.main()
