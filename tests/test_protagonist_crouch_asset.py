"""Published crouch pose: exact user supplied SeeThrough source split into independent
articulated source PNGs; never confuse a duplicate head/composite for an eye layer.
"""
import io
import json
import unittest
from pathlib import Path
from zipfile import ZipFile
from PIL import Image, ImageChops

ARCHIVE = Path("site/assets/l2d/inbox/protagonist-crouch-axe.zip")
PREFIX = "protagonist-crouch-axe/"
PART_COUNT = 25

class CrouchAsset(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        assert ARCHIVE.exists(), "User-approved crouching module ZIP must exist"
        cls.z = ZipFile(ARCHIVE)
        assert cls.z.testzip() is None, "All 25 source PNG CRC checks must pass"
        cls.module = json.loads(cls.z.read(PREFIX + "module.json"))
        cls.model = json.loads(cls.z.read(PREFIX + "front.rig.json"))
        cls.audit = json.loads(cls.z.read(PREFIX + "SOURCE_AUDIT.json"))
    @classmethod
    def tearDownClass(cls):
        cls.z.close()

    def test_same_person_one_action_not_new_character(self):
        self.assertEqual(self.module["id"], "protagonist-crouch-axe")
        self.assertEqual(self.module["familyId"], "protagonist")
        self.assertEqual(self.module["variantCategory"], "action")
        self.assertEqual(self.module["actions"], ["crouch"])
        self.assertEqual(self.model["actionProfiles"]["default"], "crouch")
        self.assertEqual(self.model["characterFamilyId"], "protagonist")
        self.assertEqual(self.model["canvas"], [1024, 1024])
        self.assertEqual(self.model["sourceSha256"], self.audit["sha256"])
        self.assertEqual(self.audit["source"], "seethrough-67384e51b18a-layers.zip")

    def test_all_real_source_layers_and_local_png_dimensions(self):
        parts = self.model["parts"]
        spec = self.module["views"]["front"]["rig"]
        self.assertEqual(len(parts), PART_COUNT)
        self.assertEqual(set(parts), set(spec["textures"]))
        self.assertEqual(set(parts), set(self.model["layerOrder"]))
        self.assertEqual(len(self.model["layerOrder"]), PART_COUNT)
        for id, part in parts.items():
            with self.subTest(part=id):
                b = self.z.read(PREFIX + spec["textures"][id])
                with Image.open(io.BytesIO(b)) as pic:
                    self.assertEqual(pic.mode, "RGBA")
                    self.assertEqual(pic.size, (part["w"], part["h"]))
                    self.assertGreater(pic.getchannel("A").getbbox()[2], 0)
                self.assertGreaterEqual(part["x"], 0)
                self.assertGreaterEqual(part["y"], 0)
                self.assertLessEqual(part["x"] + part["w"], 1024)
                self.assertLessEqual(part["y"] + part["h"], 1024)
                self.assertTrue(part["enabled"])

    def test_independent_wrist_feet_eyes_and_weapon(self):
        p = self.model["parts"]
        for group in [
            ("handwear_l", "handwear_r"),
            ("legwear_l", "legwear_r"),
            ("footwear_l", "footwear_r"),
            ("eyewhite_l", "eyewhite_r"),
            ("irides_l", "irides_r"),
            ("eyelash_l", "eyelash_r"),
            ("eyebrow_l", "eyebrow_r"),
        ]:
            self.assertLess(p[group[0]]["x"]+p[group[0]]["w"],p[group[1]]["x"]+p[group[1]]["w"])
        self.assertEqual(p["axe"]["kind"], "fixed")
        self.assertEqual(p["axe"]["parentId"], "root")
        self.assertGreater(p["axe"]["w"], 800)
        self.assertTrue(0 < p["axe"]["x"] + p["axe"]["w"] <= 1024)
        self.assertEqual(p["footwear_l"]["parentId"], "ground")
        self.assertEqual(p["footwear_r"]["parentId"], "ground")
        self.assertEqual(p["legwear_l"]["parentId"], "ground")
        self.assertEqual(p["legwear_r"]["parentId"], "ground")
        self.assertGreater(p["footwear_l"]["y"]+p["footwear_l"]["h"], 980)
        self.assertGreater(p["footwear_r"]["y"]+p["footwear_r"]["h"], 980)
        self.assertEqual(p["handwear_l"]["motion"]["x"], 0)
        self.assertEqual(p["handwear_r"]["motion"]["x"], 0)
        self.assertEqual(p["topwear"]["motion"]["x"], 0)
        self.assertEqual(self.model["idleProfile"]["joints"]["hands"], 0)
        self.assertEqual(self.model["idleProfile"]["joints"]["hips"], 0)
        self.assertNotIn("head",p,"Composite head would duplicate facial details")
        for noise in ("wings","tail","bottomwear","earwear","eyewear"):
            self.assertNotIn(noise,p,"SeeThrough noise placeholder cannot be drawn")

    def test_true_layer_reconstruction_matches_published_portrait(self):
        rig = self.module["views"]["front"]["rig"]
        composed = Image.new("RGBA",(1024,1024))
        for id in self.model["layerOrder"]:
            part=self.model["parts"][id]
            with Image.open(io.BytesIO(self.z.read(PREFIX + rig["textures"][id]))) as raw:
                composed.alpha_composite(raw.convert("RGBA"), (part["x"],part["y"]))
        with Image.open(io.BytesIO(self.z.read(PREFIX + "front.png"))) as raw:
            poster=raw.convert("RGBA")
            self.assertIsNone(ImageChops.difference(composed,poster).getbbox(),
                "What game and studio draw must equal the authored transparent poster pixel-for-pixel")
            # A transparent clean stage: alpha-noise outside the character removed.
            self.assertEqual(poster.getpixel((0,0))[3],0)
            self.assertEqual(poster.getpixel((1023,0))[3],0)
            self.assertEqual(poster.getpixel((1023,1023))[3],0)
            self.assertEqual(poster.getpixel((0,1023))[3],0)

if __name__ == "__main__":
    unittest.main()
