# Paperchalk World — agent working rules

## Mandatory preflight: before EVERY Anima prompt

Read these documents **in the current session**, not from memory:

1. [Anima official prompting reference (verified 2026-11-08)](docs/ANIMA_OFFICIAL_PROMPTING_REFERENCE_20261108.md). Open the official [model card](https://huggingface.co/circlestone-labs/Anima) and check the current **Prompting** and **Generation settings** sections.
2. [Our approved art style lock](docs/ANIMA_CHARACTER_ART_STYLE_LOCK_V1.md).
3. For subway NPCs, [the approved elderly M003 prompt, verbatim](docs/NPC-M003_ANIMA_APPROVED_FOUR_POSE_USER_PROMPT_20261108.md) and [NPC pose specification](docs/NPC_FOUR_POSE_DEVELOPMENT_WHITEPAPER_V1_20261108.md). For an existing named character, consult that character's approved art records.

**Do not claim to have consulted official instructions unless you actually checked them.** If upstream access fails, disclose that and rely on the last dated copy. The reference is a source-linked summary, not an invented official guarantee of precise multi-view control.

### Current NPC canonical prompt: MANDATORY

**Always read [NPC multi-view canonical LEFT/CENTER/RIGHT template](docs/NPC_ANIMA_LEFT_CENTER_RIGHT_TURNAROUND_V1_20261108.md) before writing multi-view NPC prompts.** The user confirmed a complete three-view office-worker example with `LEFT FIGURE: front / CENTER FIGURE: left profile / RIGHT FIGURE: back`. Preserve this spatial structure, changing only character appearance and, if requested, adding a fourth far-right frontal **sustainable** idle. In a four-view variant, remove contradictory negative terms such as `fourth figure` or `two frontal figures`. The abandoned single-view trial was deleted from main; Git history retains it for audit. It must never be the default. The three-view composition has user approval; the new fourth-view addition still needs actual image review.

### Separate civilian-NPC gallery (mandatory)

Ordinary background civilians, **including the user-approved elderly subway reader NPC-M003**, are indexed together in [site/data/npc/civilians/gallery.v1.json](site/data/npc/civilians/gallery.v1.json), separate only from named story CHAR assets. Keep the M003 ID, legacy record and original approved files in place; the old metro gallery is a compatibility index, not a separate type of character. **Default is THREE views only.** Each person's own img2img communication/rest/death states will be added later, one per state, without inventing finished art. The four user-accepted 1024x1024 RGB civilian original PNGs (NPC-C001–C004) were actually committed to main at b4daf488; all are arranged left side / center front / right back, **not** the canonical Anima prompt's left front / center side / right back. The approved old man NPC-M003 is also a civilian, and his legacy four-pose originals and RGBA sprites stay at their canonical legacy paths. Git Blob SHA and SHA256 all verified. All five belong to the same civilian gallery. Check SHA256 and image dimensions using `scripts/validate_civilian_npc_sources.py` and GitHub Actions civilian asset validation. Do not mark `gameApproved` or game rendering live until runtime work is separately verified.

### Current NPC standards (unless user changes them)
- Anima Base, `@akipekostyle, <lora:akipekoanima_v1_1:0.65>`; do not add Munji or new LoRAs unless asked.
- Three views, when requested: **front neutral stand → strict LEFT 90° profile neutral stand → directly back neutral stand**. No extra figure or special action.
- Four views only when requested: those three, then a distinctive **sustainable** everyday idle state, usually in front view.
- No visible eyes. Same person, proportions, hairstyle (front, side and back), garments, colors, layers, shoes and accessories across all views. No unrequested bag or prop. No environment or furniture. **All NPC source art defaults to neutral overcast diffuse illumination, even flat colors, no baked cast shadow, dramatic directional lighting, deep black shadow patches, sharp white highlights, rim light, or ground shadow.** The game scene supplies dynamic lighting. New C004 candidate was rejected for inconsistent hair and baked dramatic shadows; use [C004 corrected prompt](docs/NPC-C004_ANIMA_THREE_VIEW_OVERCAST_HAIR_LOCK_20261108.md).
- Provide **one complete directly copyable positive and one complete directly copyable negative prompt**. Follow official tag-plus-natural-language conventions; avoid giant repetitive command chains and claims that `EXACT` or `MUST` force correct views.
- Generation can fail to obey multi-view layouts. If it does, name the error and recommend a controlled reference/individual-view workflow instead of falsely claiming the next prompt guarantees success.
- A prompt is not approved art; do not modify registered NPC images until the user approves new actual source images. Official model guidance never overrides the user-approved M003 reference.

## Verify result
Whenever an Anima image is supplied, inspect each view individually: front symmetry, true left-facing side silhouette (head/shoulders/feet), full back, number of figures, identical outfit, intact head/feet, and absence of extra objects. Reject bad results rather than passing them to game assets.
