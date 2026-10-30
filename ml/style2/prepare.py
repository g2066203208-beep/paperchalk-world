"""System 02: reconstruct two first-party D-style character anchors and prepare
manually outlined, approximate semantic masks and aligned training crops.

The darkest color is both background and outline. These masks are NOT a
pixel-perfect human segmentation; review PNGs expose the coarse boundaries.
"""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from ml.repixelize.engine import decode

ROOT=Path("site/pixel-lab/style2")
PAL=["#393657","#F2A5C2","#A9BAE9","#FFF5E6"]
COL=np.array([[int(h[i:i+2],16) for i in (1,3,5)] for h in PAL],dtype=np.uint8)
PARTS=["unlabeled","hair","face","torso","left_sleeve","right_sleeve","skirt","legs","shoes"]
TINT=[None,(246,115,153),(244,194,150),(90,186,192),(129,155,239),(72,108,210),(230,198,111),(170,129,225),(225,117,89)]
# Polygon vertices were manually specified against the two original 384x512 images.
POLYGONS={
 "A_dynamic":{
  "hair":[[(136,11),(193,8),(251,47),(262,110),(280,135),(302,157),(349,177),(352,213),(293,205),(240,164),(210,143),(155,163),(117,133),(104,81)]],
  "face":[[(138,76),(182,66),(232,84),(248,121),(224,150),(172,163),(130,130)]],
  "torso":[[(139,143),(179,139),(231,161),(249,213),(223,250),(157,243),(132,199)]],
  "left_sleeve":[[(109,135),(144,157),(146,195),(117,220),(88,243),(46,209),(55,180)]],
  "right_sleeve":[[(231,161),(265,176),(304,194),(344,202),(369,244),(341,281),(291,257),(246,225)]],
  "skirt":[[(135,226),(209,223),(245,247),(267,287),(243,311),(182,326),(119,302),(108,271)]],
  "legs":[[(156,293),(205,300),(215,349),(237,412),(227,472),(188,475),(179,409),(145,359)],[(205,288),(253,291),(275,331),(248,351),(214,331)]],
  "shoes":[[(177,463),(221,461),(227,488),(208,510),(173,505)],[(240,329),(288,327),(295,350),(264,368)]]
 },
 "B_standing":{
  "hair":[[(128,11),(176,5),(239,22),(268,61),(269,111),(245,147),(222,171),(136,160),(103,121),(108,65)],[(221,124),(253,140),(288,175),(302,219),(294,260),(267,270),(235,237)]],
  "face":[[(132,70),(176,65),(230,85),(240,117),(218,153),(159,157),(127,128)]],
  "torso":[[(142,144),(213,142),(249,188),(235,255),(167,259),(127,198)]],
  "left_sleeve":[[(128,155),(153,179),(157,225),(141,267),(105,285),(88,249),(106,197)]],
  "right_sleeve":[[(230,155),(260,175),(278,214),(300,250),(276,292),(244,276),(221,221)]],
  "skirt":[[(155,235),(230,236),(258,270),(291,324),(253,344),(152,347),(113,313),(124,267)]],
  "legs":[[(148,330),(187,332),(202,386),(200,452),(191,492),(152,491),(146,430)],[(190,332),(232,336),(244,387),(238,457),(231,494),(194,489),(198,433)]],
  "shoes":[[(145,462),(198,458),(206,489),(191,507),(145,509)],[(196,464),(245,458),(254,490),(234,510),(193,508)]]
 }
}
CROPS={
 "A_dynamic":{"head":(92,4,292,190),"torso":(47,119,360,270),"skirt":(109,212,278,339),"legs":(127,281,308,512)},
 "B_standing":{"head":(102,4,290,185),"torso":(90,129,305,295),"skirt":(109,230,299,361),"legs":(132,321,261,512)}
}

def prepare():
 ROOT.mkdir(parents=True,exist_ok=True)
 sources={
  "A_dynamic":decode(Path("ml/repixelize/reference-384.lzma.b64").read_text()),
  "B_standing":decode(Path("ml/repixelize/d-standing-v1.tokens.b64").read_text())
 }
 manifest={"system":2,"style":"D 雾樱玻璃","palette":PAL,"source_images":2,
    "unique_character_identities":1,"semantic_class_names":PARTS,
    "annotation_quality":"manual approximate polygons, review required",
    "limitation":"background and darkest outlines share #393657; automatic exact masks unavailable",
    "samples":[]}
 for name,tokens in sources.items():
  assert tokens.shape==(512,384) and set(np.unique(tokens))=={0,1,2,3}
  sprite=Image.fromarray(COL[tokens],"RGB")
  sprite.save(ROOT/(name+".png"),optimize=True)
  occupied=Image.fromarray(((tokens!=0)*255).astype("uint8"),"L").filter(ImageFilter.MaxFilter(3))
  occ=np.asarray(occupied)>0
  semantic=np.zeros((512,384),np.uint8)
  review=np.array(sprite,dtype=np.float32)
  for id,part in enumerate(PARTS[1:],1):
   shape=Image.new("L",(384,512),0)
   draw=ImageDraw.Draw(shape)
   for points in POLYGONS[name].get(part,[]):draw.polygon(points,fill=255)
   semantic[(np.asarray(shape)>0)&occ]=id
  for id,color in enumerate(TINT[1:],1):
   mask=semantic==id
   review[mask]=review[mask]*.45+np.array(color)*.55
  illustration=Image.fromarray(review.astype("uint8"),"RGB")
  brush=ImageDraw.Draw(illustration)
  for part,polys in POLYGONS[name].items():
   for polygon in polys:brush.line(polygon+[polygon[0]],fill="#FFF5E6",width=1)
  illustration.save(ROOT/(name+"_mask_review.png"),optimize=True)
  Image.fromarray(semantic,"L").save(ROOT/(name+"_semantic_mask.png"),optimize=True)
  crops=[]
  for part,box in CROPS[name].items():
   sprite.crop(box).save(ROOT/(name+"_"+part+".png"),optimize=True)
   Image.fromarray(semantic,"L").crop(box).save(ROOT/(name+"_"+part+"_mask.png"),optimize=True)
   crops.append({"region":part,"box":list(box),"image":name+"_"+part+".png","mask":name+"_"+part+"_mask.png"})
  counts=np.bincount(tokens.ravel(),minlength=4)
  manifest["samples"].append({"id":name,"image":name+".png",
     "semantic_mask":name+"_semantic_mask.png","review":name+"_mask_review.png",
     "pixel_counts":counts.tolist(),"covered_non_background_fraction":
     round(float(((semantic>0)&(tokens!=0)).sum()/max(1,(tokens!=0).sum())),4),
     "full_grid":[384,512],"crops":crops,
     "sha256":hashlib.sha256(sprite.tobytes()).hexdigest()})
 (ROOT/"dataset.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf-8")
 print("Prepared two D-style characters and",sum(len(x["crops"]) for x in manifest["samples"]),"aligned crops")
 return manifest

if __name__=="__main__":prepare()
