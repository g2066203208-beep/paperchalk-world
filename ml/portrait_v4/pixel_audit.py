"""Read-only per-portrait pixel topology audit. Tiny parts are warnings, not errors."""
import argparse,json
from pathlib import Path
import numpy as np
from PIL import Image
import cv2

def audit(image_path,report_path):
    a=np.asarray(Image.open(image_path).convert("RGB"))
    if a.shape!=(640,640,3):raise ValueError("Expected 640x640")
    results=[]
    for row in range(5):
      for col in range(5):
        y=row*128+10;x=col*128+10
        tile=a[y:y+108,x:x+108]
        colors,index=np.unique(tile.reshape(-1,3),axis=0,return_inverse=True)
        index=index.reshape(108,108)
        isolated=0;coords=[]
        for k in range(len(colors)):
            component_n,labels,stats,_=cv2.connectedComponentsWithStats((index==k).astype("uint8"),8)
            for c in range(1,component_n):
                sz=int(stats[c,cv2.CC_STAT_AREA])
                if sz<=2:
                    isolated+=1
                    if len(coords)<60:
                        coords.append([x+int(stats[c,cv2.CC_STAT_LEFT]),
                          y+int(stats[c,cv2.CC_STAT_TOP]),sz])
        checker=(index[:-1,:-1]==index[1:,1:])&(index[1:,:-1]==index[:-1,1:])&(index[:-1,:-1]!=index[:-1,1:])
        results.append({"id":f"R{row+1}C{col+1}","colors":len(colors),
          "tiny_connected_components_le2":isolated,
          "checkerboard_2x2_candidates":int(checker.sum()),
          "sample_locations_xy":coords,"manual_review":True})
    total={"cells":len(results),"tiny_components":sum(x["tiny_connected_components_le2"] for x in results),
      "checkerboards":sum(x["checkerboard_2x2_candidates"] for x in results)}
    out=Path(report_path);out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps({"counts":total,"cells":results,
      "warning":"Small components may be intentional eyes, pupils, wrinkles or hair. Do not automatically delete.",
      "artist_approved":False},ensure_ascii=False,indent=2))
    return total

if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("input");p.add_argument("output")
    a=p.parse_args();print(audit(a.input,a.output))
