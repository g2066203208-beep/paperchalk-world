#!/usr/bin/env python3
"""Validate the one canonical protagonist identity in source and hosted assets."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
RECORD = SITE / "data/characters/registry.json"
data = json.loads(RECORD.read_text(encoding="utf-8"))
assert data.get("schemaVersion") == 1, "unexpected character manifest schema"
chars = data.get("characters")
assert isinstance(chars, list) and chars, "character manifest must contain characters"
seen = set()
alias_owner = {}
main_roles = []
for character in chars:
    cid = character.get("id")
    assert isinstance(cid, str) and re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", cid), f"bad id: {cid}"
    assert cid not in seen, f"duplicate character ID: {cid}"
    seen.add(cid)
    for alias in [cid, *character.get("aliases", [])]:
        key = alias.casefold().strip()
        assert key and (key not in alias_owner or alias_owner[key] == cid), f"alias assigned to two characters: {alias}"
        alias_owner[key] = cid
    if character.get("role") == "playable_protagonist":
        main_roles.append(character)
assert len(main_roles) == 1, f"must have exactly one playable protagonist: {len(main_roles)}"
hero = main_roles[0]
assert hero["id"] == "protagonist" and hero["recordCode"] == "CHAR-001"
assert hero["name"] is None, "do not invent an approved protagonist name"
assert hero["status"]["visual"] == "approved_reference_locked"
assert hero["status"]["biography"] == "proposed_not_approved"
assert hero["status"]["name"] == "pending"
assets = hero["assets"]
for side in ("front", "back"):
    rel = assets[side]
    assert rel == f"site/assets/characters/protagonist-{side}.webp", f"unexpected {side} asset: {rel}"
    full = ROOT / rel
    assert full.is_file(), f"missing {side} character art: {rel}"
    content = full.read_bytes()
    assert content[:4] == b"RIFF" and content[8:12] == b"WEBP", f"invalid WebP: {rel}"
assert assets["front"] != assets["back"], "front/back assets must be distinct, not a mirrored reference"
characters_dir = SITE / "assets/characters"
actual = {p.name for p in characters_dir.glob("protagonist-*") if p.is_file()}
assert actual == {"protagonist-front.webp", "protagonist-back.webp"}, f"unregistered protagonist duplicate: {actual}"
assert "protagonist-back.webp" in (SITE / "index.html").read_text(encoding="utf-8")
assert "protagonist-" in (SITE / "l2d/index.html").read_text(encoding="utf-8")
assert (ROOT / hero["designDocument"]).is_file()
for field in ("ageYears", "heightCm", "weightKg", "occupation", "personality"):
    assert hero["proposedProfile"][field]["status"] == "proposed", f"unapproved {field} should remain a proposal"
assert len(hero["visualCanon"]["hairStyle"]) > 30
assert len(hero["visualCanon"]["iris"]) > 8
assert len(hero["visualCanon"]["hairAccessory"]) > 25
# Detailed design data is linked to this SAME character, not an extra identity.
profile=hero.get("productionProfile")
assert isinstance(profile,dict) and profile.get("version")=="1.1", "missing detailed character production record"
assert (ROOT/profile["designDocument"]).is_file(), "missing full heroine dossier"
assert hero.get("profileDocument")==profile["designDocument"], "profile mismatch"
assert (ROOT/"docs/CHARACTER_BIBLE_INDEX.md").is_file(), "missing cast index"
assert (ROOT/"docs/characters/CHARACTER_PROFILE_TEMPLATE.md").is_file(), "missing NPC profile template"
assert data["policy"]["sameCharacterAcrossAllViews"] is True
assert data["policy"]["draftPhysicalValuesMustNotBeClaimedUserApproved"] is True
sizing=profile["fictionalSizingProposal"]
assert sizing["status"]=="proposed_not_approved"
assert sizing["heightCm"]==hero["proposedProfile"]["heightCm"]["value"]
assert sizing["weightKg"]==hero["proposedProfile"]["weightKg"]["value"]
assert sizing["intimatesSizing"] is None
assert sizing["bodyFatPercentage"] is None
assert profile["personalityProposal"]["status"]=="proposed_not_approved"
assert len(profile["appearance"])>=8 and len(profile["costumeBlueprint"])>=7
assert len(profile["unresolved"])>=5
assert len(profile["animationBoundaries"]["constraints"])>=2
for character in chars:
    # New characters must have their own identity notes and may NOT share
    # either of the original protagonist's locked image files.
    if character["id"]=="protagonist": continue
    assert character.get("designDocument") or character.get("profileDocument"), f"missing new character design file: {character['id']}"
    if character.get("designDocument"):
        assert (ROOT/character["designDocument"]).is_file()
    for field in ("front","back"):
        p=character.get("assets",{}).get(field)
        assert p not in (assets["front"],assets["back"]), f"new NPC reuses protagonist {field} asset"
print(f"PASS identity: exactly one playable protagonist ({hero['id']}), two approved view assets, no duplicate IDs")
