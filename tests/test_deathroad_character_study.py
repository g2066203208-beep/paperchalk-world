"""Regression tests for each separately fitted reference-pixel study model."""
import importlib.util
from pathlib import Path
import tempfile, json, unittest
from PIL import Image
import numpy as np

SCRIPT=Path("ml/deathroad_study/identity_lab.py")
spec=importlib.util.spec_from_file_location("identity_lab",SCRIPT)
lab=importlib.util.module_from_spec(spec);spec.loader.exec_module(lab)

class CharacterStudyTests(unittest.TestCase):
    def test_every_visual_slot_is_trained_separately(self):
        sheet=lab.original_demo()
        report=lab.study(sheet,"original-demo")
        self.assertEqual(report["records_count"],30)
        self.assertEqual(len(set(x["identity_id"] for x in report["records"])),30)
        self.assertEqual(len(set(tuple(x["grid"]) for x in report["records"])),30)
        self.assertEqual({x["model"] for x in report["records"]},
            {"per-character categorical-neighborhood + k-means"})
        self.assertTrue(all(x["native_grid"]==[24,24] for x in report["records"]))
        self.assertTrue(all(x["foreground_pixels"]>20 for x in report["records"]))
        self.assertTrue(all(x["model_statistics"]["contexts"]>1 for x in report["records"]))
        self.assertTrue(all(not x["game_asset_approved"] for x in report["records"]))
        self.assertNotIn("sprite_raw_bytes",json.dumps(report))
    def test_zero_alpha_output_and_discrete_colors(self):
        cell=next(lab.slots(lab.original_demo()))[1]
        img=lab.canonical_pixels(cell)
        self.assertEqual(img.shape,(24,24,4))
        self.assertEqual(set(np.unique(img[:,:,3])),{0,255})
        centroids,token=lab.palette_kmeans(img,k=7)
        self.assertEqual(token.shape,(24,24))
        self.assertTrue(0<=token.min() and token.max()<=7)
        self.assertGreater(len(np.unique(token)),2)
        self.assertTrue(np.all(np.isfinite(centroids)))
    def test_deterministic_analysis_does_not_export_proprietary_crops(self):
        a=lab.study(lab.original_demo(),"original-demo")
        b=lab.study(lab.original_demo(),"original-demo")
        self.assertEqual(a,b)
        self.assertFalse(any("png" in key for row in a["records"] for key in row))
    def test_empty_sprite_rejected(self):
        with self.assertRaises(ValueError):
            lab.canonical_pixels(Image.new("RGBA",(90,90),(0,0,0,255)))

if __name__=="__main__":unittest.main()
