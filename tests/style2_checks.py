"""Check that both real D-style character anchors, regions and neural weights exist."""
import json
from pathlib import Path
import unittest
import numpy as np
from PIL import Image

ROOT=Path("site/pixel-lab/style2")
EXPECTED={(57,54,87),(242,165,194),(169,186,233),(255,245,230)}
PARTS=9

class TrainingSetChecks(unittest.TestCase):
 def test_both_anchors_and_four_exact_colors(self):
  data=json.loads((ROOT/"dataset.json").read_text())
  self.assertEqual(data["source_images"],2)
  self.assertEqual(data["unique_character_identities"],1)
  self.assertEqual(len(data["samples"]),2)
  for sample in data["samples"]:
   img=Image.open(ROOT/sample["image"])
   self.assertEqual(img.size,(384,512))
   a=np.asarray(img.convert("RGB"))
   self.assertEqual(set(map(tuple,np.unique(a.reshape(-1,3),axis=0))),EXPECTED)
 def test_real_semantic_masks_and_crops(self):
  data=json.loads((ROOT/"dataset.json").read_text())
  for sample in data["samples"]:
   mask=np.asarray(Image.open(ROOT/sample["semantic_mask"]).convert("L"))
   self.assertEqual(mask.shape,(512,384))
   self.assertTrue(np.any(mask>0))
   self.assertTrue(np.all(mask<PARTS))
   self.assertGreaterEqual(len(sample["crops"]),4)
   for c in sample["crops"]:
    im=Image.open(ROOT/c["image"])
    part=Image.open(ROOT/c["mask"])
    self.assertEqual(im.size,part.size)
    self.assertGreater(im.width,50)
 def test_trained_models_and_honest_metrics(self):
  r=json.loads((ROOT/"training_report.json").read_text())
  self.assertTrue(r["model_training_completed"])
  self.assertEqual(r["source_images"],2)
  self.assertEqual(r["distinct_characters"],1)
  for filename in r["weights"]:
   with np.load(ROOT/filename) as w:
    self.assertEqual(w["w2"].shape[-1],4)
    self.assertTrue(np.isfinite(w["w1"]).all())
  p=r["repair"]["A_dynamic_train_to_B_standing_test"]
  d=r["pixel_drawing_learning"]
  for value in (p["neural_accuracy"],p["nearest_baseline"],d["foreground_accuracy"],d["foreground_neighbor_baseline"]):
   self.assertGreaterEqual(value,0)
   self.assertLessEqual(value,1)
  self.assertGreater(d["foreground_test_pixels"],1000)

if __name__=="__main__":unittest.main()
