# Paperchalk World — agent working rules

## Mandatory preflight: before EVERY Anima prompt

Read these documents **in the current session**, not from memory:

1. [Anima official prompting reference (verified 2026-11-08)](docs/ANIMA_OFFICIAL_PROMPTING_REFERENCE_20261108.md). Open the official [model card](https://huggingface.co/circlestone-labs/Anima) and check the current **Prompting** and **Generation settings** sections.
2. [Our approved art style lock](docs/ANIMA_CHARACTER_ART_STYLE_LOCK_V1.md).
3. For subway NPCs, [the approved elderly M003 prompt, verbatim](docs/NPC-M003_ANIMA_APPROVED_FOUR_POSE_USER_PROMPT_20261108.md) and [NPC pose specification](docs/NPC_FOUR_POSE_DEVELOPMENT_WHITEPAPER_V1_20261108.md). For an existing named character, consult that character's approved art records.

**Do not claim to have consulted official instructions unless you actually checked them.** If upstream access fails, disclose that and rely on the last dated copy. The reference is a source-linked summary, not an invented official guarantee of precise multi-view control.

### Current NPC standards (unless user changes them)
- Anima Base, `@akipekostyle, <lora:akipekoanima_v1_1:0.65>`; do not add Munji or new LoRAs unless asked.
- Three views, when requested: **front neutral stand → strict LEFT 90° profile neutral stand → directly back neutral stand**. No extra figure or special action.
- Four views only when requested: those three, then a distinctive **sustainable** everyday idle state, usually in front view.
- No visible eyes. Same person, proportions, hairstyle, garments, colors, layers, shoes and accessories across all views. No unrequested bag or prop. No environment, furniture or background shadows.
- Provide **one complete directly copyable positive and one complete directly copyable negative prompt**. Follow official tag-plus-natural-language conventions; avoid giant repetitive command chains and claims that `EXACT` or `MUST` force correct views.
- Generation can fail to obey multi-view layouts. If it does, name the error and recommend a controlled reference/individual-view workflow instead of falsely claiming the next prompt guarantees success.
- A prompt is not approved art; do not modify registered NPC images until the user approves new actual source images. Official model guidance never overrides the user-approved M003 reference.

## Verify result
Whenever an Anima image is supplied, inspect each view individually: front symmetry, true left-facing side silhouette (head/shoulders/feet), full back, number of figures, identical outfit, intact head/feet, and absence of extra objects. Reject bad results rather than passing them to game assets.
