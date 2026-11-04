#!/usr/bin/env python3
"""Validate additive 448+64 character schema without breaking older 448-field consumers."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHAR = ROOT / "docs" / "characters"
base = json.loads((CHAR / "CHARACTER_FIELD_SCHEMA_V2.json").read_text(encoding="utf8"))
ext = json.loads((CHAR / "ANGEL_TRANSACTION_SAN_EXTENSION_V1.json").read_text(encoding="utf8"))
base_sections = {s["id"]: s["fields"] for s in base["sections"]}
extension_sections = {s["id"]: s["fields"] for s in ext["sections"]}
assert len(base_sections) == 22
assert sum(len(x) for x in base_sections.values()) == 448
assert len(extension_sections) == 8
assert sum(len(x) for x in extension_sections.values()) == 64
assert ext["totalFieldCount"] == 512
assert len(set(base_sections) | set(extension_sections)) == 30
assert not (set(base_sections) & set(extension_sections)), "extension sections must be additive"

def validate(path):
    data = json.loads(path.read_text(encoding="utf8"))
    assert set(data["fields"]) == set(base_sections), path
    e = data.get("extensions")
    assert e and e["schemaVersion"] == 1, path
    assert e["extensionSchema"] == "docs/characters/ANGEL_TRANSACTION_SAN_EXTENSION_V1.json", path
    assert set(e["fields"]) == set(extension_sections), path
    for group, fields in extension_sections.items():
        assert set(e["fields"][group]) == set(fields), (path, group)
        for field in fields:
            item = e["fields"][group][field]
            assert isinstance(item, dict), (path, group, field)
            assert item.get("status") in ext["statuses"], (path, group, field)
            if item["status"] in ("unknown", "not_applicable"):
                assert item.get("value") is None, (path, group, field)
            else:
                assert item.get("value") is not None, (path, group, field)
                assert isinstance(item.get("source"), str) and item["source"].strip(), (path, group, field)
    if data.get("fieldCount") == 512:
        assert data.get("fieldBreakdown") == {"base":448, "extension":64}, path
    return data

files = sorted(CHAR.glob("CHAR-*.profile.json"))
assert files, "no active characters"
for path in files:
    validate(path)
validate(CHAR / "CHARACTER_PROFILE_TEMPLATE_V2.json")

hero = json.loads((CHAR / "CHAR-001.profile.json").read_text(encoding="utf8"))
h = hero["extensions"]["fields"]
rule = h["sanityRules"]
for key, value in (("startingSan", 50),("baselineSan", 50),("minimumSan", 50),
                   ("maximumSan", 100), ("monsterEncounterDelta", 0)):
    assert rule[key]["value"] == value and rule[key]["status"] == "user_confirmed", key
assert rule["combatKillDelta"]["status"] == "user_confirmed"
assert "不" in rule["passiveDecayRule"]["value"] or "无" in rule["passiveDecayRule"]["value"]
assert rule["otherNegativeEffectRule"]["status"] == "user_confirmed"

new = json.loads((CHAR / "CHAR-035.profile.json").read_text(encoding="utf8"))
assert new["canonicalId"] == "char-035" and new["fieldCount"] == 512
assert new["fields"]["visualProduction"]["frontReference"]["status"] != "approved_art_reference"
assert new["extensions"]["fields"]["tradeDesire"]["lifeDeficit"]["status"] == "user_confirmed"
roster = json.loads((ROOT / "docs" / "HUMAN_CAST_ROSTER_V3.json").read_text(encoding="utf8"))
assert len(roster["people"]) == 48
assert sum(p["id"] == "CHAR-035" for p in roster["people"]) == 1
print(f"PASS: {len(files)} character profiles plus template, 30 groups / 512 fields; heroine SAN 50..100, no loss, kill gains.")
