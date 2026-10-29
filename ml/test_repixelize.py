"""Executable fidelity constraints for native four-color pixel art."""
import unittest
from pathlib import Path
import numpy as np
from PIL import Image
from ml.repixelize.engine import PALETTE,classify,project,from_tokens,decode,encode,validate,convert

SOURCE=Path('ml/repixelize/reference-384.lzma.b64')

class TestRepixelizer(unittest.TestCase):
    def test_snapshot_integrity(self):
        tokens=decode(SOURCE.read_text())
        self.assertEqual(tokens.shape,(512,384))
        self.assertEqual(set(np.unique(tokens).tolist()),{0,1,2,3})
        self.assertGreater(int(np.count_nonzero(tokens)),40000)
        self.assertEqual(decode(encode(tokens)).tolist(),tokens.tolist())

    def test_strict_palette(self):
        native=from_tokens(decode(SOURCE.read_text()))
        check=validate(native)
        self.assertEqual(check['visible_colors'],4)
        self.assertEqual(native.mode,'RGB')

    def test_reconstruct_from_antialiased_source(self):
        token=decode(SOURCE.read_text())
        native=from_tokens(token)
        blurred=native.resize((1152,1536),Image.Resampling.BICUBIC)
        recovered=project(classify(blurred))
        score=float(np.mean(recovered==token))
        self.assertGreater(score,.96,'Should preserve image features after synthetic blur')
        self.assertEqual(set(np.unique(recovered)),{0,1,2,3})

    def test_reproducible_export(self):
        report=convert(embedded=SOURCE,out_dir='repixel-test-artifacts')
        self.assertEqual(report['visible_colors'],4)
        img=Image.open('repixel-test-artifacts/repixelized-384x512.png')
        self.assertEqual(img.size,(384,512))
        self.assertEqual(img.mode,'RGB')
        self.assertTrue(np.array_equal(np.asarray(img),PALETTE[decode(SOURCE.read_text())]))

if __name__=='__main__':unittest.main()
