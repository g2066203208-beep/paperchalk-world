#!/usr/bin/env python3
"""Validate active V3 urban cast *plan*, never pretending proposals are playable actors."""
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
data=json.loads((ROOT/"docs/HUMAN_CAST_ROSTER_V3.json").read_text(encoding="utf-8"))
assert data["version"]=="3.0"
people=data["people"]
ids=[p["id"] for p in people]
assert len(ids)==48 and len(set(ids))==48
assert ids==[f"CHAR-{i:03d}" for i in range(1,49)], "previous permanent IDs were changed or skipped"
counts={}
for p in people:
    assert p["group"] in ("student", "other")
    assert p["tier"] in ("core","important","support")
    assert p["status"]=="proposed", (p["id"], "concept-only roster must remain a proposal")
    for field in ("label","personality","storyFunction"):
        assert isinstance(p[field],str) and len(p[field])>1,(p["id"],field)
    for field in ("face","hair","build","gesture"):
        assert isinstance(p["visual"].get(field),str) and len(p["visual"][field])>=2,(p["id"],field)
    assert "educationProposal" not in p, (p["id"], "deprecated 3-school grade/class assignment")
    if p["group"]=="student":
        assert p["schoolProposal"].startswith("主角所在的一所普通高中"),p["id"]
    else:
        assert "schoolProposal" not in p,p["id"]
    key=(p["group"],p["tier"])
    counts[key]=counts.get(key,0)+1
assert counts=={
    ("student","core"):3,("student","important"):5,
    ("other","important"):12,("other","support"):28
},counts
assert [p["id"] for p in people if p["group"]=="student"]==[
    "CHAR-001","CHAR-002","CHAR-003","CHAR-004",
    "CHAR-005","CHAR-013","CHAR-016","CHAR-020"
]
assert data["schoolPolicy"]["activeMainCampusOnly"] is True
priority=data["designPolicy"]
assert set(priority["firstFourDesigns"])=={"CHAR-001","CHAR-002","CHAR-003","CHAR-016"}
assert set(priority["studentCandidatesRemaining"])=={"CHAR-004","CHAR-005","CHAR-013","CHAR-020"}
assert len(priority["importantNonStudentIds"])==12
assert (ROOT/"docs/HUMAN_CAST_PLAN_V3.md").is_file()
registry=json.loads((ROOT/"site/data/characters/registry.json").read_text(encoding="utf-8"))
registered_ids=[p.get("recordCode") for p in registry["characters"]]
assert "CHAR-004" not in registered_ids and "CHAR-016" not in registered_ids, (
    "draft candidates cannot become playable without approved images"
)
print("PASS human cast V3: 48 planned IDs; 8 students, 12 key nonstudents, 28 city NPCs; one main school")
