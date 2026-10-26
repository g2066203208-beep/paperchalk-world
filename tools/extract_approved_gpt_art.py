#!/usr/bin/env python3
"""Cut user-approved GPT scene into reproducible, named runtime assets.
Only source pixels are processed: no procedural painting or generated replacement art.
Non-transparent fixture crops are provisional; a separate clean alpha asset must replace each.
"""
from pathlib import Path
import json
import numpy as np
import cv2
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"assets/gptimg/winter-kiosk-source.png"
DEST=ROOT/"assets/gptimg/parts"
CROPS={
 "wall-left":(0,127,235,875),"wall-right":(705,127,236,875),
 "cabinetL-closed":(0,130,228,198),"cabinetR-closed":(708,125,231,202),
 "shelfL1":(0,345,230,168),"shelfL2":(0,515,230,168),"shelfL3":(0,685,230,168),
 "shelfR1":(711,336,228,168),"shelfR2":(711,511,228,168),"shelfR3":(711,686,228,168),
 "window-landscape":(270,300,424,244),
 "building-left":(295,390,120,230),"building-right":(570,345,120,250),
 "frame-left":(217,160,52,828),"frame-right":(682,160,43,828),
 "frame-top":(250,165,432,118),"frame-sill":(241,981,453,73),
 "shutter-closed":(10,125,220,180),
 "countertop":(0,1012,941,239),"under-counter":(0,1240,941,169),
 "drawerL-closed":(15,1255,240,156),"drawerR-closed":(680,1258,248,155),
 "good-tea":(799,711,118,153),"good-bread":(769,334,168,174),
 "good-battery":(326,1275,149,119),"good-cocoa":(403,408,151,131)
}
def actor(src):
    x0,y0,x1,y1=(282,542,681,984)
    rgb=np.asarray(src.crop((x0,y0,x1,y1)).convert("RGB"))
    h,w=rgb.shape[:2]
    pts=np.array([
       [160,19],[211,14],[259,27],[296,46],[324,84],[328,123],
       [307,160],[348,205],[352,252],[369,336],[390,439],
       [8,439],[20,351],[42,289],[60,247],[55,208],[68,154],
       [85,102],[105,56],[143,23]
    ],np.int32)
    mask=np.full((h,w),cv2.GC_BGD,np.uint8)
    cv2.fillPoly(mask,[pts],cv2.GC_PR_FGD)
    for p in [[(144,65),(240,68),(273,120),(271,209),(212,255),(123,243),(92,177)],
              [(130,272),(273,262),(346,430),(48,430)]]:
        cv2.fillPoly(mask,[np.array(p,np.int32)],cv2.GC_FGD)
    ring=cv2.dilate(cv2.fillPoly(np.zeros_like(mask),[pts],1),np.ones((11,11),np.uint8),iterations=2)
    mask[(ring==1)&(mask==cv2.GC_BGD)]=cv2.GC_PR_BGD
    cv2.grabCut(rgb,mask,None,np.zeros((1,65),np.float64),np.zeros((1,65),np.float64),6,cv2.GC_INIT_WITH_MASK)
    a=np.where((mask==cv2.GC_FGD)|(mask==cv2.GC_PR_FGD),255,0).astype(np.uint8)
    a=cv2.GaussianBlur(a,(3,3),.5)
    return Image.fromarray(np.dstack([rgb,a]),"RGBA"),[x0,y0,x1-x0,y1-y0]

def main():
    src=Image.open(SOURCE).convert("RGBA")
    if src.size!=(941,1672):raise RuntimeError("source resolution mismatch")
    DEST.mkdir(parents=True,exist_ok=True)
    manifest={"source":str(SOURCE.relative_to(ROOT)),"sourceSize":[941,1672],
              "pipeline":"crop and alpha extraction ONLY; original GPT pixels",
              "sprites":{}}
    for name,(x,y,w,h) in CROPS.items():
        if not (0<=x<941 and 0<=y<1672 and x+w<=941 and y+h<=1672):raise ValueError(name)
        src.crop((x,y,x+w,y+h)).save(DEST/(name+".png"),optimize=True)
        manifest["sprites"][name]={"file":name+".png","size":[w,h],
          "sourceCrop":[x,y,w,h],"anchor":[.5,.5],"alpha":"opaque-composite-part",
          "stage":"prototype; regenerate individually before final art"}
    customer,box=actor(src)
    customer.save(DEST/"customer-idle.png",optimize=True)
    assert customer.getchannel("A").getextrema()==(0,255)
    manifest["sprites"]["customer-idle"]={"file":"customer-idle.png",
       "size":list(customer.size),"sourceCrop":box,"anchor":[.5,1],
       "alpha":"segmented-transparent","stage":"provisional edge cleanup"}
    (DEST/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    assert len(manifest["sprites"])==27
    print("Extracted",len(manifest["sprites"]),"real standalone images")
if __name__=="__main__": main()
