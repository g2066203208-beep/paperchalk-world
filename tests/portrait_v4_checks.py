"""V4 portrait reconstruction checks, including real neural training smoke."""
import tempfile
import unittest
from pathlib import Path
import numpy as np
from PIL import Image
from ml.portrait_v4.convert import BG,smoke_source,run_image,validate_safety,neural_experiment

class PortraitV4Tests(unittest.TestCase):
    def test_grid_and_safe_gutters(self):
        with tempfile.TemporaryDirectory() as t:
            src=smoke_source(Path(t)/'source.png')
            out=Path(t)/'results'
            report=run_image(src,out,18)
            image=Image.open(out/'native-baseline-640.png')
            self.assertEqual(image.size,(640,640))
            self.assertEqual(len(report['tiles']),25)
            self.assertTrue(validate_safety(image))
            self.assertEqual(Image.open(out/'preview-2560.png').size,(2560,2560))
            for rec in report['tiles']:self.assertLessEqual(rec['colors'],18)
            self.assertFalse(report['neural_used_for_export'])

    def test_rejects_bleeding_outside_safe_area(self):
        a=np.tile(BG[None,None,:],(640,640,1))
        a[10,10]=[5,10,15]
        self.assertTrue(validate_safety(a))
        a[9,10]=[5,10,15]
        with self.assertRaises(AssertionError):validate_safety(a)

    def test_trained_network_is_a_separate_experiment(self):
        with tempfile.TemporaryDirectory() as t:
            src=smoke_source(Path(t)/'source.png')
            out=Path(t)/'results'
            run_image(src,out,12)
            report=neural_experiment(out,steps=4)
            self.assertEqual(len(report['results']),5)
            self.assertEqual(report['training_characters'],20)
            self.assertTrue((out/'restorer.pt').exists())
            self.assertTrue((out/'ml-evaluation.json').exists())
            self.assertIn('never silently replaces',report['production_policy'])

if __name__=='__main__':unittest.main()
