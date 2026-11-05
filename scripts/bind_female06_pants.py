#!/usr/bin/env python3
"""Non-destructive FEMALE-06 wardrobe weights.

IMPORTANT: the original female-06 body is NEVER written or composited.
The previous implementation injected a shorts layer into female-06 base;
restore_original_inputs reverses that legacy build side-effect using the
immutable uploaded source ZIP. Weighted shorts live ONLY on outfit-02
(the user's THIRD costume, orange jacket + black shorts).

All source pixels, body PSD parts, and portraits are preserved as uploaded.
"""
from __future__ import annotations
import json
from pathlib import Path
from zipfile import ZipFile

BASE_ID="female-06"
THIRD_OUTFIT_ID="female-06-outfit-02"
BINDING_VERSION="third-outfit-skin-weight-v1"

def read(path: Path)->dict:
    return json.loads(path.read_text(encoding="utf-8"))

def write(path: Path,data:dict)->None:
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

def restore_original_inputs(library:Path)->None:
    """Revert earlier ASSISTANT-generated base overlay, not user's own PSD."""
    base=library/BASE_ID
    source=library.parent/"inbox"/(BASE_ID+".zip")
    rig_file=base/"front.rig.json"
    if rig_file.exists() and source.exists():
        rig=read(rig_file)
        legacy=rig.get("wearableSource",{}).get("binding")=="pelvis-waist-dual-thigh-v2"
        if legacy:
            with ZipFile(source) as z:
                for rel in ("module.json","front.rig.json","front.png"):
                    member=BASE_ID+"/"+rel
                    if member not in z.namelist():
                        raise ValueError("Can't restore authentic base: "+member)
                    (base/rel).write_bytes(z.read(member))
            for rel in ("front/pants_overlay.png","front.pristine-source.png"):
                (base/rel).unlink(missing_ok=True)
    outfit=library/THIRD_OUTFIT_ID
    source=library.parent/"inbox"/(THIRD_OUTFIT_ID+".zip")
    rig_file=outfit/"front.rig.json"
    if rig_file.exists() and source.exists():
        rig=read(rig_file)
        if rig.get("sleeveRigFix")=="paired-shoulder-elbow-v1" or rig.get("weightBindingVersion")==BINDING_VERSION:
            with ZipFile(source) as z:
                member=THIRD_OUTFIT_ID+"/front.rig.json"
                if member not in z.namelist():
                    raise ValueError("Outfit original rig missing")
                rig_file.write_bytes(z.read(member))

def arm_bones(side:str)->list:
    x0,x1,x2=((.83,.55,.16) if side=="l" else (.17,.45,.85))
    return [
        {"id":"shoulder","parent":None,"head":{"x":x0,"y":.065},
         "tail":{"x":x1,"y":.50},"amplitude":1.8,"frequency":.84,
         "phase":0 if side=="l" else .36,"radius":.37,"enabled":True},
        {"id":"elbow","parent":"shoulder","head":{"x":x1,"y":.50},
         "tail":{"x":x2,"y":.92},"amplitude":2.8,"frequency":.95,
         "phase":.23 if side=="l" else .60,"radius":.34,"enabled":True},
    ]

def install(library:Path)->bool:
    """Only third wardrobe rig is changed; base and both PSDs stay original."""
    base=library/BASE_ID
    outfit=library/THIRD_OUTFIT_ID
    if not (base/"module.json").is_file() or not (outfit/"module.json").is_file():
        return False
    original=read(base/"front.rig.json")
    if "pants_overlay" in original.get("parts",{}) or original.get("wearableSource"):
        raise ValueError("Refusing to publish modified female-six BASE; restore source ZIP first")
    rig_path=outfit/"front.rig.json"
    rig=read(rig_path)
    if rig.get("characterId")!=THIRD_OUTFIT_ID:
        raise ValueError("Third costume rig belongs to a different character")
    parts=rig.get("parts",{})
    if not all(x in parts for x in ("bottomwear","legwear","handwear_l","handwear_r")):
        raise ValueError("Third costume needs original pants, legs, and separate sleeves")
    legs=parts["legwear"]
    if legs.get("kind")!="leg-combined" or len(legs.get("bones",[]))<4:
        raise ValueError("Third costume lacks real left/right leg IK")
    garment=parts["bottomwear"]
    # No texture edit, no alpha mask, no body clipping, no resizing.
    # Top waistband: 100% pelvis. Lower hem: weighted left/right thigh IK.
    garment["parentId"]="pelvis"
    garment["mesh"]={"rows":12,"columns":12}
    garment["bones"]=[]
    garment["motion"]={"x":0,"y":0,"angle":0,"frequency":1,"phase":0}
    garment["skinBinding"]={
        "target":"legwear","method":"pelvis-waist-dual-thigh-v2",
        "waist":"pelvis","left":"left-knee","right":"right-knee",
        "waistLock":1.0,"transition":[.35,.80],"rootLock":1.0
    }
    # Keep the approved separately-anchored sleeve hierarchy unchanged.
    for side,pivot,tip,kind in (
        ("l",(.83,.065),(.16,.92),"arm-left"),
        ("r",(.17,.065),(.85,.92),"arm-right")
    ):
        sleeve=parts["handwear_"+side]
        sleeve["parentId"]="torso"
        sleeve["kind"]=kind
        sleeve["pivot"]={"x":pivot[0],"y":pivot[1]}
        sleeve["tip"]={"x":tip[0],"y":tip[1]}
        sleeve["mesh"]={"rows":10,"columns":8}
        sleeve["bones"]=arm_bones(side)
        sleeve["motion"]={"x":0,"y":0,"angle":0,"frequency":1,"phase":0}
    rig["sleeveRigFix"]="paired-shoulder-elbow-v1"
    rig["weightBindingVersion"]=BINDING_VERSION
    write(rig_path,rig)
    print("FEMALE06: original base preserved; THIRD COSTUME pants weighted pelvis-to-two-thighs, zero clipping")
    return True

if __name__=="__main__":
    install(Path(__file__).resolve().parents[1]/"site/assets/l2d/library")
