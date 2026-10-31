"""Verifiable 36-sprite indexed-pixel and genuine heldout CNN checks."""
import json
import unittest
from pathlib import Path
import numpy as np
from PIL import Image
from ml.mini36.atlas import COUNT,unpack,BG

ROOT=Path('artifacts/mini36')
class Mini36Tests(unittest.TestCase):
    def test_exact_36_native_pixel_rgba(self):
        sprites,palettes,indices=unpack()
        self.assertEqual(sprites.shape,(36,24,24,4))
        self.assertEqual(indices.shape,(36,24,24))
        self.assertEqual(palettes.shape,(36,15,3))
        self.assertTrue(np.isin(sprites[:,:,:,3],[0,255]).all())
        for i in range(36):
            self.assertTrue((indices[i][sprites[i,:,:,3]==0]==0).all())
            self.assertGreater((indices[i]>0).sum(),35)
            self.assertLessEqual(np.unique(indices[i][indices[i]>0]).size,14)
            name=f'R{i//6+1}C{i%6+1}'
            a=np.asarray(Image.open(ROOT/(name+'.png')).convert('RGBA'))
            self.assertTrue(np.array_equal(a,sprites[i]))

    def test_sheet_gutters_and_integer_nearest_neighbor(self):
        native=np.asarray(Image.open(ROOT/'mini36-atlas-240.png').convert('RGBA'))
        preview=np.asarray(Image.open(ROOT/'mini36-atlas-960-nearest.png').convert('RGBA'))
        self.assertEqual(native.shape,(240,240,4))
        self.assertTrue(np.array_equal(preview,np.repeat(np.repeat(native,4,axis=0),4,axis=1)))
        for r in range(6):
          for c in range(6):
            tile=native[r*40:r*40+40,c*40:c*40+40,:3]
            gutter=np.ones((40,40),dtype=bool);gutter[8:32,8:32]=False
            self.assertTrue(np.all(tile[gutter]==np.asarray(BG)))

    def test_ml_six_heldout_characters_and_no_auto_promotion(self):
        p=ROOT/'ml'/'ml-report.json'
        self.assertTrue(p.exists(),'True PyTorch ML step must have run')
        a=json.loads(p.read_text(encoding='utf8'))
        self.assertEqual(a['train_characters'],30)
        self.assertEqual(a['holdout_characters'],6)
        self.assertEqual(len(a['holdout']),6)
        self.assertIn('Never overwrite',a['promotion_policy'])
        self.assertTrue((ROOT/'ml'/'mini36-silhouette-cnn.pt').exists())
        for i in range(36):
            p=ROOT/'ml'/f'R{i//6+1}C{i%6+1}-cnn-mask.png'
            with Image.open(p) as frame:
                self.assertEqual(frame.size,(24,24))
if __name__=='__main__':unittest.main()