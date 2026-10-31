"""Deterministic native-pixel, provenance and exclusion tests for the R2C2 CNN run."""
import json
import unittest
from pathlib import Path
import numpy as np
from PIL import Image

OUTPUT=Path("artifacts/detective-v4-ml")
class DetectivePixelMLTests(unittest.TestCase):
    def test_native_pixel_and_no_subpixels(self):
        path=OUTPUT/"R2C2-detective-cnn-native-128.png"
        self.assertTrue(path.is_file())
        a=np.asarray(Image.open(path).convert("RGB"))
        self.assertEqual(a.shape,(128,128,3))
        preview=np.asarray(Image.open(OUTPUT/"R2C2-detective-cnn-native-128-preview-1024.png").convert("RGB"))
        self.assertEqual(preview.shape,(1024,1024,3))
        self.assertTrue(np.array_equal(preview,np.repeat(np.repeat(a,8,axis=0),8,axis=1)))
    def test_heldout_source_and_real_trained_network(self):
        report=json.loads((OUTPUT/"quality.json").read_text(encoding="utf8"))
        self.assertEqual(report["training_cells"],21)
        self.assertEqual(len(report["heldout"]),3)
        self.assertFalse(report["detective_training_leakage"])
        self.assertTrue(report["trained_model_applied_to_detective"])
        self.assertEqual(report["native_logical_grid"],[128,128])
        self.assertLessEqual(report["palette_colors"],14)
        self.assertFalse(report.get("final_gold",False))
        self.assertTrue((OUTPUT/"R2C2-restorer.pt").is_file())
        self.assertNotEqual(report["source_sha256"],"")
if __name__=="__main__":unittest.main()
