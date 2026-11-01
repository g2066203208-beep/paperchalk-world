"""Tests for categorical pixel diffusion and independent conservative export."""
import json, tempfile, unittest
from pathlib import Path
import numpy as np
from PIL import Image
from ml.mini36.discrete_diffusion import load, corrupt, palette_flatten, clean_islands, reverse, Denoiser, run, K, T

ROOT=Path('site/pixel-lab/mini36')
class TestMini36DiscreteDiffusion(unittest.TestCase):
    def test_all_native_index_tokens_and_integer_alpha(self):
        rgb,idx,pal=load(ROOT)
        self.assertEqual(rgb.shape,(36,24,24,4))
        self.assertEqual(idx.shape,(36,24,24))
        self.assertTrue(np.isin(rgb[:,:,:,3],[0,255]).all())
        self.assertLess(int(idx.max()),K)
        self.assertTrue(np.array_equal(idx==0,rgb[:,:,:,3]==0))
    def test_palette_merging_never_blurs_or_alters_silhouettes(self):
        sprites,_,_=load(ROOT)
        for img in sprites:
            out,stats=palette_flatten(img)
            out,num=clean_islands(out)
            self.assertTrue(np.array_equal(out[:,:,3],img[:,:,3]))
            self.assertLessEqual(stats['new_colors'],10)
            unique=np.unique(out[out[:,:,3]==255,:3],axis=0)
            self.assertEqual(len(unique),stats['new_colors'])
    def test_categorical_forward_and_reverse_exact_classes(self):
        sprites,tokens,_=load(ROOT)
        rng=np.random.default_rng(42)
        noisy=corrupt(tokens[:2],np.array([T,T]),rng)
        self.assertEqual(noisy.dtype,np.uint8)
        self.assertTrue(((noisy>=0)&(noisy<K)).all())
        import torch
        net=Denoiser();net.eval()
        pred=reverse(net,noisy)
        self.assertEqual(pred.shape,(2,24,24))
        self.assertTrue(((pred>=0)&(pred<K)).all())
    def test_real_model_artifacts_if_present(self):
        out=Path('artifacts/mini36/diffusion')
        if not (out/'report.json').exists(): self.skipTest('real diffusion training not run in this job')
        r=json.loads((out/'report.json').read_text())
        self.assertEqual(r['holdout_characters'],6)
        self.assertEqual(len(r['holdout']),6)
        self.assertTrue(r['trained_real_pytorch_categorical_diffusion'])
        self.assertFalse(r['manual_approval'])
        self.assertEqual(r['vocabulary'],15)
        a=np.asarray(Image.open(out/'mini36-clean-atlas-240.png').convert('RGBA'))
        b=np.asarray(Image.open(out/'mini36-clean-preview-960.png').convert('RGBA'))
        self.assertTrue(np.array_equal(np.repeat(np.repeat(a,4,0),4,1),b))
        for i in range(36):
            name=f'R{i//6+1}C{i%6+1}'
            test=np.asarray(Image.open(out/(name+'-clean-24.png')).convert('RGBA'))
            original=np.asarray(Image.open(ROOT/(name+'.png')).convert('RGBA'))
            self.assertTrue(np.array_equal(test[:,:,3],original[:,:,3]))
            self.assertLessEqual(len(np.unique(test[test[:,:,3]==255,:3],axis=0)),10)
            self.assertTrue((out/(name+'-diffusion-proposal-24.png')).exists())

if __name__=='__main__':unittest.main()