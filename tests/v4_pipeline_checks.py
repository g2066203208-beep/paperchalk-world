import json, unittest
from pathlib import Path
import numpy as np
from PIL import Image
from ml.style2.v4_pipeline import PALETTE,unpack,OUTPUT,DATA
class V4Checks(unittest.TestCase):
 def test_all_samples_are_lossless_in_repo(self):
  data=json.loads(DATA.read_text())
  self.assertEqual(len(data['records']),13)
  self.assertEqual(len([x for x in data['records'] if x['status']=='gold_master']),2)
  for rec in data['records']:
   v=unpack(rec['pack_zlib_b64'])
   self.assertEqual(v.shape,(512,384))
   im=np.asarray(Image.open(OUTPUT/(rec['id']+'.png')).convert('RGB'))
   self.assertTrue(np.array_equal(im,PALETTE[v]))
 def test_no_draft_accidentally_approved(self):
  manifest=json.loads((OUTPUT/'manifest.json').read_text())
  self.assertEqual(len(manifest['records']),13)
  self.assertEqual(sum(x['eligible_for_positive_training'] for x in manifest['records']),2)
  self.assertFalse(next(x for x in manifest['records'] if x['id']=='new_person_candidate')['eligible_for_positive_training'])
 def test_neural_holdout_and_fallback(self):
  report=json.loads((OUTPUT/'training_report.json').read_text())
  self.assertEqual(report['steps'],180)
  self.assertTrue(report['same_identity_holdout'])
  for m in report['comparisons']:
   for k in ('model_accuracy','baseline_accuracy','model_foreground','baseline_foreground'):
    self.assertTrue(0<=m[k]<=1)
  if not report['enable_neural_for_production']:
   self.assertIn('deterministic',report['production_export'])
if __name__=='__main__':unittest.main()
