#!/usr/bin/env python3
"""Check the *planned* 48 human identities, without registering nonexistent NPC art."""
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
doc=ROOT/"docs"/"HUMAN_CAST_ROSTER_V2.json"
data=json.loads(doc.read_text(encoding="utf-8"))
assert data["version"]=="2.0"
people=data["people"]
ids=[p["id"] for p in people]
assert len(ids)==48, (len(ids),"expected 48 unique human identities")
assert len(set(ids))==48,"duplicate human cast IDs"
assert ids==[f"CHAR-{i:03d}" for i in range(1,49)],"do not reassign or skip existing cast IDs"
groups={}
for p in people:
    assert p["group"] in ("student","other")
    assert p["tier"] in ("core","important","support")
    assert p["status"]=="proposed","planning must not be misrepresented as approved artwork"
    for key in ("label","personality","storyFunction"):
        assert isinstance(p[key],str) and len(p[key])>1,(p["id"],key)
    assert all(isinstance(p["visual"].get(k),str) and len(p["visual"][k])>4
               for k in ("face","hair","build","gesture")),p["id"]
    groups[(p["group"],p["tier"])]=groups.get((p["group"],p["tier"]),0)+1
assert groups=={("student","core"):3,("student","important"):9,("student","support"):16,
               ("other","important"):6,("other","support"):14},groups
assert [p["label"] for p in people[:3]]==["女主角","女二号","男主角"]
assert [p["label"] for p in people[3:15]]==[
"女三／谨慎见证者","纪律委员","夜间保安","隔壁住户","班主任",
"公寓管理员","校医","便利店店员","修理兴趣男同学","摄影社女同学",
"值班警员","匿名证人"]
assert (ROOT/"docs"/"HUMAN_CAST_PLAN_V2.md").is_file()
registered=json.loads((ROOT/"site"/"data"/"characters"/"registry.json").read_text(encoding="utf-8"))
assert not any(p["recordCode"]=="CHAR-004" for p in registered["characters"]),(
    "CAST-004 is still a design candidate with no approved art"
)
print("PASS human cast plan: 48 distinct proposed identities; 28 students, 20 others, 18 important, 30 supporting")
