#!/usr/bin/env python3
"""Build plain-browser character registration automatically from approved PNGs.
No bundler, no hand-maintained imports. Metadata next to each image is optional,
but recommended for approved names, roles and prompt provenance.
"""
import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "site" / "assets" / "characters"
TARGET = ROOT / "site" / "card-battle" / "data" / "characters.generated.js"
PROFESSIONS = {"engineer", "guardian", "warrior", "ranger", "skirmisher", "medic", "summoner"}


def png_size(path):
    with path.open("rb") as fh:
        header = fh.read(24)
    if len(header) < 24 or header[:8] != bytes.fromhex("89504e470d0a1a0a"):
        raise ValueError(f"Not a PNG: {path}")
    return struct.unpack(">II", header[16:24])


def build():
    characters = []
    ids = set()
    for file in sorted(ASSETS.rglob("*.png")):
        rel = file.relative_to(ASSETS)
        # Only canonical faction/profession/portrait.png folders enter the registry.
        if len(rel.parts) != 3 or rel.parts[1] not in PROFESSIONS:
            continue
        meta = file.with_suffix(".character.json")
        data = json.loads(meta.read_text(encoding="utf-8")) if meta.is_file() else {}
        faction, profession = rel.parts[:2]
        if data.get("approved") is False:
            continue
        ident = data.get("id") or (faction + "-" + profession + "-" + file.stem)
        if ident in ids:
            raise ValueError(f"Duplicate character id: {ident}")
        ids.add(ident)
        width, height = png_size(file)
        if width != 704 or height != 1024:
            raise ValueError(f"Expected 704x1024: {rel}, got {width}x{height}")
        expected_name = data.get("art")
        if expected_name and expected_name != file.name:
            raise ValueError(f"Metadata art filename differs: {rel}")
        if data.get("profession", profession) != profession:
            raise ValueError(f"Metadata profession differs: {rel}")
        if data.get("faction", faction) not in (faction, "farmer" if faction == "farmer-faction" else faction):
            raise ValueError(f"Metadata faction differs: {rel}")
        record = {
            "id": ident,
            "name": data.get("name", file.stem),
            "faction": data.get("faction", faction),
            "profession": profession,
            "portrait": "../assets/characters/" + rel.as_posix(),
            "approved": bool(data.get("approved", False)),
            "width": width,
            "height": height,
            "roleName": data.get("roleName", ""),
            "variant": data.get("variant", ""),
            "sourcePrompt": data.get("sourcePrompt"),
            "tags": data.get("tags", []),
        }
        characters.append(record)
    payload = json.dumps(characters, ensure_ascii=False, indent=2)
    contents = (
        "/* AUTO-GENERATED — do not edit manually. Run: python3 tools/build-character-registry.py */\n"
        "(function(root){\n'use strict';\n"
        "if(!root.PaperchalkCharacterRegistry)throw Error('Load character-registry.js first');\n"
        "for(const character of " + payload + ") root.PaperchalkCharacterRegistry.register(character);\n"
        "})(window);\n"
    )
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(contents, encoding="utf-8")
    print(f"Registered {len(characters)} characters -> {TARGET.relative_to(ROOT)}")


if __name__ == "__main__":
    build()
