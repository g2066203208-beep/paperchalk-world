"""Real L2D modular auto-discovery and fail-closed validation tests.

Synthetic test textures are generated under TemporaryDirectory only.
No dummy character is checked into production and no original V4 is edited.
"""
import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path
from PIL import Image
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
import build_l2d_library as compiler


class L2DModulesTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.site=Path(self.temp.name)/"site"
        self.library=self.site/"assets/l2d/library"
        self.library.mkdir(parents=True)
        self.saved=(compiler.SITE,compiler.LIBRARY,compiler.OUT)
        compiler.SITE=self.site
        compiler.LIBRARY=self.library
        compiler.OUT=self.site/"l2d-library.generated.json"

    def tearDown(self):
        compiler.SITE,compiler.LIBRARY,compiler.OUT=self.saved
        self.temp.cleanup()

    def write(self,path,data):
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_text(json.dumps(data,ensure_ascii=False),encoding="utf-8")

    def portrait(self,folder):
        Image.new("RGBA",(1024,1024),(0,0,0,0)).save(folder/"front.png")

    def v4(self):
        p=self.library/"qa-v4"
        p.mkdir(parents=True)
        self.portrait(p)
        a=Image.new("RGBA",(80,110),(255,0,0,200))
        b=Image.new("RGBA",(80,110),(0,0,255,200))
        a.save(p/"clip.webp",format="WEBP",save_all=True,append_images=[b],
               duration=60,loop=0,lossless=True)
        data={"schema":1,"id":"qa-v4","label":"V4 自动模块",
              "views":{"front":{"portrait":"front.png","clip":{
                "type":"v4-webp","file":"clip.webp",
                "crop":{"x":20,"y":20,"w":80,"h":110},
                "frames":2,"fps":20}}}}
        self.write(p/"module.json",data)
        return p,data

    def rig(self):
        p=self.library/"qa-rig";p.mkdir(parents=True)
        self.portrait(p)
        parts={}
        textures={}
        for i,id in enumerate(("hair","skirt")):
            Image.new("RGBA",(60,80),(100+50*i,70,110,255)).save(p/f"{id}.png")
            textures[id]=f"{id}.png"
            parts[id]={"id":id,"name":id,"parentId":"root","kind":"hair" if id=="hair" else "skirt",
                "x":300+i*80,"y":50+i*180,"w":60,"h":80,
                "pivot":{"x":0.5,"y":0.05},"tip":{"x":0.5,"y":0.95},
                "mesh":{"columns":4,"rows":5},
                "motion":{"x":12+i*5,"y":0,"angle":4,"frequency":1,"phase":0},
                "enabled":True}
        model={"format":"paperchalk-part-rig-v1","characterId":"qa-rig","face":"front",
            "canvas":[1024,1024],"parts":parts}
        self.write(p/"front.rig.json",model)
        data={"schema":1,"id":"qa-rig","label":"独立贴图自动模块",
            "views":{"front":{"portrait":"front.png",
                "rig":{"type":"part-mesh","file":"front.rig.json","textures":textures}}}}
        self.write(p/"module.json",data)
        return p,data

    def test_compiles_two_real_formats_without_manual_registration(self):
        self.v4();self.rig()
        generated=compiler.build()
        self.assertEqual([m["id"] for m in generated["modules"]],["qa-rig","qa-v4"])
        mesh=generated["modules"][0]["views"]["front"]
        self.assertEqual(mesh["renderer"],"part-mesh")
        self.assertEqual(mesh["rig"]["partCount"],2)
        self.assertEqual(list(mesh["rig"]["textures"]),["hair","skirt"])
        self.assertEqual(generated["modules"][1]["views"]["front"]["clip"]["frames"],2)
        self.assertTrue(compiler.OUT.is_file())

    def test_missing_texture_rejects_broken_module(self):
        folder,_=self.rig()
        (folder/"hair.png").unlink()
        with self.assertRaisesRegex(ValueError,"missing referenced file"):
            compiler.build()

    def test_rejects_fake_rig_layers_and_invalid_png_geometry(self):
        folder,_=self.rig()
        model=json.loads((folder/"front.rig.json").read_text())
        model["parts"]["hair"]["w"]=50
        self.write(folder/"front.rig.json",model)
        with self.assertRaisesRegex(ValueError,"size does not match"):
            compiler.build()

    def test_rejects_path_escape_and_mismatched_animation(self):
        folder,data=self.v4()
        data["views"]["front"]["clip"]["file"]="../private.webp"
        self.write(folder/"module.json",data)
        with self.assertRaisesRegex(ValueError,"unsafe file path"):
            compiler.build()
        data["views"]["front"]["clip"]["file"]="clip.webp"
        data["views"]["front"]["clip"]["frames"]=128
        self.write(folder/"module.json",data)
        with self.assertRaisesRegex(ValueError,"declared frame count"):
            compiler.build()

    def test_changes_asset_version_when_only_png_changes(self):
        folder,_=self.rig()
        first=compiler.build()["modules"][0]["version"]
        Image.new("RGBA",(60,80),(40,40,40,255)).save(folder/"hair.png")
        second=compiler.build()["modules"][0]["version"]
        self.assertNotEqual(first,second)


if __name__=="__main__":
    unittest.main()
