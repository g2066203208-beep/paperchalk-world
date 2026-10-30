"""Verification gates for the V5 *synthetic* geometry-supervision experiment."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
import torch
from ml.style2.volume_parts_v5 import OUT, RGB, DIAGNOSTIC, PARTS, JOINTS, scene, GeometryNet

def main():
    report=json.loads((OUT/"report.json").read_text())
    assert report["trained"] and report["no_claim_real_3d"]
    assert report["no_claim_new_character_generation"]
    assert report["train_steps"]>=120
    assert report["native_geometry_grid"]==[96,128]
    assert len(report["preview"])==5
    assert all(x.get("not_ground_truth") for x in report["preview"][3:])
    assert len(report["target_part_classes"])==13
    assert len(report["joint_names"])==10
    assert np.isfinite(report["evaluation"]["foreground_part_mean_iou"])
    assert report["evaluation"]["test_images"]>=15
    assert report["loss_points"][-1][1]<report["loss_points"][0][1]
    payload=torch.load(OUT/"geometry_weights.pt",map_location="cpu",weights_only=True)
    net=GeometryNet();net.load_state_dict(payload["state_dict"]);net.eval()
    for view in range(3):
        c,p,z,heat,yaw=scene(2700000,view)
        assert c.shape==(128,96)
        assert p.shape==(128,96) and z.shape==(128,96)
        assert heat.shape==(10,128,96)
        assert int(p.max())>=10
        assert int(z.max())<=4 and int(z.min())==0
        assert (p>0).sum()>300
        assert set(np.unique(c).tolist()).issubset({0,1,2,3})
        with torch.no_grad():
            seg,dep,hm,angle=net(torch.from_numpy(c.copy())[None].long())
        assert seg.shape==(1,len(PARTS),128,96)
        assert dep.shape==(1,5,128,96)
        assert hm.shape==(1,len(JOINTS),128,96)
        assert angle.shape==(1,3)
        for name in ("input","target_parts","pred_parts","pred_depth"):
            img=np.asarray(Image.open(OUT/f"view{view}_{name}.png").convert("RGB"))
            assert img.shape==(128,96,3)
            colors=set(map(tuple,np.unique(img.reshape(-1,3),axis=0)))
            if name=="input":
                assert colors.issubset(set(map(tuple,RGB)))
            elif name=="pred_depth":
                assert colors.issubset({(57,54,87),(85,91,121),(124,143,174),(169,186,233),(255,245,230)})
            else:
                assert colors.issubset(set(map(tuple,DIAGNOSTIC)))
    for name in ("A_dynamic","B_standing"):
        for item in ("input","pred_parts"):
            im=np.asarray(Image.open(OUT/f"{name}_{item}.png").convert("RGB"))
            assert im.shape==(128,96,3)
            colors=set(map(tuple,np.unique(im.reshape(-1,3),axis=0)))
            assert colors.issubset(set(map(tuple,RGB if item=="input" else DIAGNOSTIC)))
    print("PASS V5 anatomy: 3 true perspective views, 13 parts, depth, joint maps, learned weights, heldout synthetic test")

if __name__=="__main__":main()
