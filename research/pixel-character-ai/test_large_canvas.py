import unittest,tempfile,pathlib
import numpy as np
import torch
from PIL import Image
from large_canvas import PROFILES,encode_native,save_native,tile_regions,reconstruct_tiles,block_guide
from tile_refiner import GuidedTileNet,global_coordinates,refine_guided
from train_large import split_identity
class MultiResolutionSmoke(unittest.TestCase):
    def test_exact_grid_roundtrip_and_tile_ownership(self):
        for profile,(w,h) in PROFILES.items():
            a=(np.arange(w*h,dtype=np.int32).reshape(h,w)%5).astype(np.uint8)
            with tempfile.TemporaryDirectory() as d:
                p=pathlib.Path(d)/'asset.png'
                save_native(a,p)
                np.testing.assert_array_equal(encode_native(p,profile),a)
            np.testing.assert_array_equal(reconstruct_tiles(a),a)
            self.assertGreater(len(list(tile_regions(w,h))),0)
    def test_reject_fake_native(self):
        with tempfile.TemporaryDirectory() as d:
            a=np.zeros((256,192,4),dtype=np.uint8)
            p=pathlib.Path(d)/'asset.png'
            a[10,10]=[1,2,3,255];Image.fromarray(a,'RGBA').save(p)
            with self.assertRaisesRegex(ValueError,'Off-palette'):encode_native(p,'portrait')
            a[10,10]=[57,54,87,128];Image.fromarray(a,'RGBA').save(p)
            with self.assertRaisesRegex(ValueError,'Semi-transparent'):encode_native(p,'portrait')
            with self.assertRaises(ValueError):encode_native(p,'portrait_hd')
    def test_block_guide(self):
        a=np.ones((256,192),dtype=np.uint8);a[0,0]=4
        guide=block_guide(a,4)
        self.assertEqual(guide.shape,a.shape)
        self.assertTrue(np.all(guide==1))
    def test_refiner_forward_and_backward(self):
        net=GuidedTileNet(channels=8)
        a=torch.randint(0,6,(1,64,64))
        g=torch.randint(0,5,(1,64,64))
        xy=global_coordinates(0,0,192,256).unsqueeze(0)
        logits=net(a,g,xy,torch.tensor([[0,0,0]]))
        self.assertEqual(tuple(logits.shape),(1,5,64,64))
        loss=torch.nn.functional.cross_entropy(logits,torch.randint(0,5,(1,64,64)))
        loss.backward();self.assertTrue(bool(torch.isfinite(loss)))
    def test_guided_infer_shape_is_not_quality_claim(self):
        net=GuidedTileNet(channels=8)
        guide=np.zeros((256,192),dtype=np.uint8);guide[40:200,60:140]=2
        output=refine_guided(net,guide,[0,0,0],iterations=1)
        self.assertEqual(output.shape,guide.shape);self.assertTrue(np.all(output<=4))
    def test_cross_language_character_split(self):
        self.assertEqual(split_identity('char_0001'),split_identity('char_0001'))
        self.assertIn(split_identity('人物A'),['train','val','test'])
if __name__=='__main__':unittest.main()
