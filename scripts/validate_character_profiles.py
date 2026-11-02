#!/usr/bin/env python3
"""Validate every character dossier against complete v3 field catalog.
All absent information must be represented by an unknown value rather than
silently omitted or fabricated. Drafts never become game actors automatically.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOC = ROOT / "docs" / "characters"
schema = json.loads((DOC / "CHARACTER_FIELD_SCHEMA_V2.json").read_text(encoding="utf-8"))
assert schema["schemaVersion"] == 3, "unexpected profile field schema revision"
statuses = set(schema["statuses"])
spec = {g["id"]: set(g["fields"]) for g in schema["sections"]}
assert len(spec) == 22, "unexpected section count"
assert len([name for fields in spec.values() for name in fields]) >= 448
for required in schema["requiredFields"]:
    group, field = required.split(".", 1)
    assert group in spec and field in spec[group], f"missing required specification {required}"


def read_profile(filename):
    result = json.loads((DOC / filename).read_text(encoding="utf-8"))
    assert result["schemaVersion"] == schema["schemaVersion"], filename
    assert set(result["fields"]) == set(spec), f"missing or extra groups in {filename}"
    for group, expected in spec.items():
        actual = result["fields"][group]
        assert set(actual) == expected, f"missing/extra fields in {filename} {group}: {expected ^ set(actual)}"
        for field, item in actual.items():
            assert isinstance(item, dict) and "value" in item and "status" in item, (filename, group, field)
            assert item["status"] in statuses, (filename, group, field)
            if item["status"] in {"unknown", "not_applicable"}:
                assert item["value"] is None, f"{filename} {group}.{field}: unknown data must not have guessed value"
            elif item["status"] != "rejected":
                assert item["value"] is not None, f"{filename} {group}.{field}: known field needs a value"
                assert isinstance(item.get("source"), str) and item["source"].strip(), (
                    filename, group, field, "missing evidence or proposal origin"
                )
    ref = result.get("readableDocument")
    if ref is not None:
        assert (ROOT / ref).is_file(), f"missing human-readable dossier: {ref}"
    else:
        assert result["recordCode"] == "CHAR-XXX", "only blank templates may omit a readable document"
    return result


blank = read_profile("CHARACTER_PROFILE_TEMPLATE_V2.json")
hero = read_profile("CHAR-001.profile.json")
girl2 = read_profile("CHAR-002.profile.json")
male = read_profile("CHAR-003.profile.json")
male2 = read_profile("CHAR-016.profile.json")
assert blank["recordState"] == "empty_character_profile_template_not_registered_in_game"
assert hero["recordCode"] == "CHAR-001" and hero["canonicalId"] == "protagonist"
assert girl2["recordCode"] == "CHAR-002" and girl2["recordState"].startswith("design_candidate")
assert girl2["canonicalId"] != hero["canonicalId"]
assert male["recordCode"] == "CHAR-003" and male["canonicalId"] == "male-lead-candidate"
assert male["recordState"].startswith("design_candidate")
assert male["canonicalId"] not in {hero["canonicalId"], girl2["canonicalId"]}
assert male["fields"]["identity"]["ageYears"]["value"] == 18
assert male["fields"]["identity"]["ageYears"]["status"] == "user_confirmed"
assert male["fields"]["temperament"]["coreConfirmedTraits"]["value"] == ["叛逆", "厌学", "冷淡", "不耐烦"]
assert male["fields"]["hair"]["hairBaseColor"]["status"] == "user_confirmed"
assert male["fields"]["visualProduction"]["promptPositive"]["value"].startswith("masterpiece, best quality")
assert "1boy, solo" in male["fields"]["visualProduction"]["promptPositive"]["value"]
assert "multiple boys" in male["fields"]["visualProduction"]["promptNegative"]["value"]
for name, number in (("heightCm",176),("weightKg",62),("chestCircumferenceCm",90),("waistCircumferenceCm",72),("hipCircumferenceCm",88),("upperArmCircumferenceCm",27),("forearmCircumferenceCm",24),("thighCircumferenceCm",49),("calfCircumferenceCm",34)):
    item=male["fields"]["measurements"][name]
    assert item["value"] == number and item["status"] == "proposed", (name,item)
assert all(item["status"] != "unknown" for group in male["fields"].values() for item in group.values()), "user requested complete 448 male character detail entries"
assert male["fields"]["visualProduction"]["frontReference"]["value"] == "site/assets/characters/char-003/front.png"
assert male["fields"]["visualProduction"]["frontReference"]["status"] == "approved_art_reference"
assert "尚未绘制" in male["fields"]["visualProduction"]["backReference"]["value"], "male back portrait remains pending"

assert male2["recordCode"] == "CHAR-016" and male2["canonicalId"] == "male-second-transfer-candidate"
assert male2["recordState"].startswith("design_candidate")
assert male2["fields"]["measurements"]["heightCm"]["value"] == 173
assert male2["fields"]["measurements"]["heightCm"]["status"] == "proposed"
assert "1boy, solo" in male2["fields"]["visualProduction"]["promptPositive"]["value"]
assert len(male2["fields"]["visualProduction"]["promptPositive"]["value"].split()) < 500
assert male2["fields"]["visualProduction"]["frontReference"]["status"] == "unknown"
assert male2["fields"]["visualProduction"]["backReference"]["status"] == "unknown"
assert hero["fields"]["temperament"]["coreConfirmedTraits"]["value"] == ["毒舌", "冷淡"]
assert hero["fields"]["temperament"]["coreConfirmedTraits"]["status"] == "user_confirmed"
assert girl2["fields"]["temperament"]["coreConfirmedTraits"]["value"] == ["活泼"]
assert girl2["fields"]["hair"]["ponytailCount"]["value"] == 1
for name, size in (("chestCircumferenceCm", 80), ("waistCircumferenceCm", 62), ("hipCircumferenceCm", 86)):
    item = girl2["fields"]["measurements"][name]
    assert item["value"] == size and item["status"] == "proposed"
for profile in [hero, girl2]:
    for name in ("upperArmCircumferenceCm","forearmCircumferenceCm","thighCircumferenceCm","calfCircumferenceCm","kneeCircumferenceCm","wristCircumferenceCm"):
        assert profile["fields"]["measurements"][name]["status"] == "unknown", (
            "do not manufacture unapproved segment circumferences",profile["recordCode"],name
        )
    for name in ("facialLandmarksNormalized","eyeCenterHeightRatio","interocularSpacingRatio"):
        assert profile["fields"]["face"][name]["status"] == "unknown", (
            "landmark measurements must reference approved artwork",profile["recordCode"],name
        )
assert girl2["fields"]["visualProduction"]["frontReference"]["value"] == "site/assets/characters/char-002/front.png"
assert girl2["fields"]["visualProduction"]["frontReference"]["status"] == "approved_art_reference"
assert girl2["fields"]["visualProduction"]["backReference"]["value"] is None, (
    "CHAR-002 back view has not been generated, do not fabricate it"
)
assert hero["fields"]["visualProduction"]["frontReference"]["value"].endswith("protagonist-front.webp")
assert hero["fields"]["visualProduction"]["backReference"]["value"].endswith("protagonist-back.webp")
registered = json.loads((ROOT / "site/data/characters/registry.json").read_text(encoding="utf-8"))
assert not any(c["id"] == male2["canonicalId"] for c in registered["characters"]), (
    "male 2 is a planned character with no approved artwork, cannot be a playable actor"
)
assert not any(c["id"] == male["canonicalId"] for c in registered["characters"]), (
    "draft male lead must not become a game actor before artwork approval"
)
assert not any(c["id"] == girl2["canonicalId"] for c in registered["characters"]), (
    "candidate must not be registered as in-game actor without approved art"
)
print(f"PASS comprehensive character profiles: {len(spec)} sections, {sum(map(len, spec.values()))} fields each, "
      "four dossiers + blank template; portrait references and draft provenance valid")
