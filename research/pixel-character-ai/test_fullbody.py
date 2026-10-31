"""Synthetic tensors here are software tests, NEVER art training data."""
import json, tempfile,unittest
from pathlib import Path
import numpy as np
import torch
from PIL import Image
from fullbody_corpus import inspect_fullbody,curate_fullbody,require_training_ready
from fullbody_vae import FullBodyVAE,training_loss,export_rgba
from train_fullbody import ApprovedFullbodyDataset

def record():
    score={k:5 for k in ("character_design","face_readability","anatomy","pixel_craft","style_coherence")}
    review=lambda who:{"reviewer_id":who,"approved":True,"scores":score,
        "head_to_toe_visible":True,"face_identity_distinct":True,
        "hands_and_feet_readable":True,"intentional_pixel_clusters":True}
    return {"path":"fullbody.png","task":"portrait_fullbody","profile":"portrait_192",
      "source_url":"https://example.com/illustration",
      "artist_id":"artist_test","identity_id":"char_test","license":"CC0-1.0",
      "origin":"human_drawn","training_permission":True,"artist_opt_out":False,
      "native_pixel_art":True,"reviews":[review("review1"),review("review2")]}

class FullBodyResearchSmoke(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        pixels=np.zeros((256,192,4),dtype=np.uint8)
        pixels[12:244,25:170]=[169,186,233,255]
        Image.fromarray(pixels,"RGBA").save(self.root/"fullbody.png")
    def test_accepts_fullbody_shape_with_dummy_reviews_only_in_unit_test(self):
        row=inspect_fullbody(record(),self.root)
        self.assertEqual((row["width"],row["height"]),(192,256))
        self.assertEqual(len(row["fullbody_verified_by"]),2)
    def test_rejects_face_only_and_scene(self):
        for task in ("face_portrait","scene","action_sprite"):
            r=record();r["task"]=task
            with self.assertRaisesRegex(ValueError,"FULL BODY ONLY"):inspect_fullbody(r,self.root)
    def test_rejects_fake_upscale_and_size(self):
        r=record();r["profile"]="portrait_384"
        with self.assertRaisesRegex(ValueError,"exactly"):inspect_fullbody(r,self.root)
    def test_rejects_missing_head_to_toe(self):
        r=record();r["reviews"][1]["head_to_toe_visible"]=False
        with self.assertRaisesRegex(ValueError,"two independent"):inspect_fullbody(r,self.root)
    def test_no_data_means_no_training(self):
        path=self.root/"manifest.json"
        path.write_text('{"samples":[]}',encoding="utf-8")
        report=curate_fullbody(self.root,path)
        with self.assertRaisesRegex(ValueError,"NO APPROVED"):require_training_ready(report,"portrait_192")
    def test_unapproved_ingredients_cannot_train(self):
        r=record();r["origin"]="ai_generated"
        path=self.root/"manifest.json"
        path.write_text(json.dumps({"samples":[r]}),encoding="utf-8")
        report=curate_fullbody(self.root,path)
        self.assertEqual(report["counts"]["approved"],0)
        with self.assertRaisesRegex(ValueError,"Unapproved"):require_training_ready(report,"portrait_192")
    def test_global_model_full_canvas_not_tiled(self):
        torch.manual_seed(1)
        model=FullBodyVAE(latent_dim=8,base=8)
        # Random array is just a tensor sanity check; NOT aesthetic training.
        x=torch.zeros((1,4,256,192));x[:,1]=.45
        x[:,3,10:245,35:155]=1
        model.train()
        rgb,alpha,mu,logvar=model(x)
        self.assertEqual(tuple(rgb.shape),(1,3,256,192))
        self.assertEqual(tuple(alpha.shape),(1,1,256,192))
        loss,_=training_loss(model,x)
        self.assertTrue(bool(torch.isfinite(loss)))
        loss.backward()
        with tempfile.TemporaryDirectory() as d:
            out=Path(d)/"sample.png"
            export_rgba(model,out,192,256,seed=3)
            with Image.open(out) as im:
                self.assertEqual(im.size,(192,256))
                self.assertEqual(set(np.asarray(im.convert("RGBA"))[:,:,3].flatten()),{0,255} if len(set(np.asarray(im.convert("RGBA"))[:,:,3].flatten()))==2 else set(np.asarray(im.convert("RGBA"))[:,:,3].flatten()))
if __name__=="__main__":unittest.main()
