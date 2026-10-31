"""Reject false 'pixel perfect' claims: verify native indexed output and provenance."""
import importlib.util, pathlib, tempfile, unittest, json, hashlib
from PIL import Image
import numpy as np
SRC=pathlib.Path("ml/deathroad_study/render_originals.py")
spec=importlib.util.spec_from_file_location("atlas",SRC)
lab=importlib.util.module_from_spec(spec);spec.loader.exec_module(lab)

class TrueGridTests(unittest.TestCase):
    def test_all_thirty_distinct_artworks(self):
        with tempfile.TemporaryDirectory() as tmp:
            result=lab.emit(tmp)
            self.assertEqual(result["original_character_count"],30)
            hashes=set()
            for i in range(1,31):
                p=pathlib.Path(tmp)/f"character-{i:02d}.png"
                self.assertTrue(p.exists())
                im=Image.open(p).convert("RGBA")
                self.assertEqual(im.size,(32,48))
                a=np.asarray(im)
                self.assertTrue(np.isin(a[:,:,3],[0,255]).all())
                self.assertLessEqual(len(np.unique(a.reshape(-1,4),axis=0)),7)
                hashes.add(hashlib.sha256(im.tobytes()).hexdigest())
            self.assertEqual(len(hashes),30)
            self.assertTrue((pathlib.Path(tmp)/"contact-30-original.png").exists())
            self.assertEqual(len(list(pathlib.Path(tmp).glob("character-*.png"))),30)
    def test_study_reference_not_required_to_render(self):
        self.assertEqual(len(lab.NAMES),30)
        self.assertEqual(len(lab.SPECIES),30)
        self.assertTrue(all(not name.lower().startswith("death road") for name in lab.NAMES))

if __name__=="__main__":unittest.main()
