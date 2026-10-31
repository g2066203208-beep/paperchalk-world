"""Metadata-mock tests only: these are NOT approved artist contributions."""
import json
import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image
from quality_gate import curate,inspect_sample,split_artist

def sample():
    scores={name:5 for name in ("character_design","face_readability","anatomy",
       "pixel_craft","style_coherence")}
    return {"path":"portrait.png","source_url":"https://example.org/artist/portrait",
       "artist_id":"artist1","identity_id":"original-character1",
       "license":"CC0-1.0","origin":"human_drawn",
       "training_permission":True,"artist_opt_out":False,
       "native_pixel_art":True,"task":"portrait_fullbody",
       "reviews":[{"reviewer_id":"reviewer1","scores":scores,"approved":True},
                  {"reviewer_id":"reviewer2","scores":scores,"approved":True}]}

class QualityGateTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        pixels=np.zeros((256,192,4),dtype=np.uint8)
        pixels[20:245,30:170]=[57,54,87,255]
        Image.fromarray(pixels,mode="RGBA").save(self.root/"portrait.png")
    def test_pass_only_with_manual_reviews(self):
        approved=inspect_sample(sample(),self.root)
        self.assertEqual(approved["width"],192)
        self.assertEqual(approved["height"],256)
        self.assertEqual(len(approved["reviewers"]),2)
        self.assertEqual(approved["split"],split_artist("artist1"))
    def test_unreviewed_rejected(self):
        s=sample();s["reviews"]=[]
        with self.assertRaisesRegex(ValueError,"Two independent"):inspect_sample(s,self.root)
    def test_same_reviewer_twice_rejected(self):
        s=sample();s["reviews"][1]["reviewer_id"]="reviewer1"
        with self.assertRaisesRegex(ValueError,"Two independent"):inspect_sample(s,self.root)
    def test_low_beauty_rating_rejected(self):
        s=sample();s["reviews"][0]["scores"]["character_design"]=3
        with self.assertRaisesRegex(ValueError,"Two independent"):inspect_sample(s,self.root)
    def test_ai_and_procedural_rejected(self):
        for origin in ["procedural","ai_generated"]:
            s=sample();s["origin"]=origin
            with self.assertRaisesRegex(ValueError,"human-drawn"):inspect_sample(s,self.root)
    def test_creator_ai_optout_respected(self):
        s=sample();s["artist_opt_out"]=True
        with self.assertRaisesRegex(ValueError,"Artist preference"):inspect_sample(s,self.root)
    def test_missing_training_permission_rejected(self):
        s=sample();s["training_permission"]=False
        with self.assertRaisesRegex(ValueError,"training permission"):inspect_sample(s,self.root)
    def test_tiny_upscaled_sprite_without_provenance_rejected(self):
        s=sample();s["native_pixel_art"]=False
        with self.assertRaisesRegex(ValueError,"Native pixel grid"):inspect_sample(s,self.root)
    def test_palette_is_not_forced_to_four_colors(self):
        data=np.asarray(Image.open(self.root/"portrait.png").convert("RGBA")).copy()
        for y in range(20,245):
            data[y,50:100,:3]=[y%256,80,(y*3)%256]
        Image.fromarray(data,"RGBA").save(self.root/"portrait.png")
        output=inspect_sample(sample(),self.root)
        self.assertGreater(output["colors"],4)
    def test_duplicate_rejected(self):
        manifest=self.root/"manifest.json"
        manifest.write_text(json.dumps({"samples":[sample(),sample()]}),encoding="utf-8")
        result=curate(self.root,manifest)
        self.assertEqual(result["counts"],{"submitted":2,"approved":1,"rejected":1})
        self.assertIn("Duplicate",result["rejected"][0]["reason"])
    def test_fails_if_no_art(self):
        manifest=self.root/"manifest.json"
        manifest.write_text('{"samples":[]}',encoding="utf-8")
        result=curate(self.root,manifest)
        self.assertEqual(result["counts"]["approved"],0)
if __name__=="__main__":
    unittest.main()
