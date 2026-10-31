# HIGH-QUALITY HUMAN PIXEL ART CORPUS — v0.3

## Research correction (2026-10-31)

**Stop using EXP-001's low-quality procedural people as positive high-quality training examples.** EXP-001 is preserved only as a failed synthetic control. Our target is real native 192×256 and 384×512 full-body portraits, as well as 512×512+ scenes. A 256×256 PNG does not prove original native pixel resolution without inspecting the source grid.

## What is implemented vs unimplemented

- HUMAN_ART_SOURCES.json tracks potential sources and explicit exclusions. **Approved actual artist illustrations: zero.** No source page by itself is a dataset.
- quality_gate.py rejects unverified licenses, missing explicit training rights, creator opt-outs, AI-generated/procedural images, inadequate native resolution, semitransparent alpha, missing SHA provenance and artwork without **two independent positive reviews**. The five review dimensions are character design, readable face, anatomy, pixel technique and coherent visual style (each must score at least 4/5). A machine cannot infer beauty from size or color count.
- art_training.py is a true, trainable PyTorch native-RGBA 64×64 masked-detail learning baseline, using the **original RGB colors**. It prevents an empty or unapproved corpus from training. It is **NOT** yet a full text-to-character generator.
- The old four-color training pipeline is an engineering ablation, not a way to learn sophisticated multi-color artist images.

## Curated sources (not approved yet)

1. Loregret Pixel-Art Portrait Pack: https://loregret.itch.io/pixel-art-portrait-pack — 100 CC0 portraits reportedly human drawn, with editable Aseprite source. Candidate for FACE training only; not full body.
2. Retraissance base animations: https://retraissance.itch.io/pixel-character-base-animations-64x64 — CC0, human-drawn 64×128 whole-body motion bases, useful for anatomy. Not HQ portrait-grade.
3. Kenney Roguelike Characters: https://kenney.nl/assets/roguelike-characters — CC0, 16×16 miniature sprites; **low-resolution control only**.
4. Not Jam Pixels: https://not-jam.itch.io/pixels — CC0 but artist explicitly opposes AI/ML use. **EXCLUDED** out of respect for author's preference.
5. FreeGameSprites RPG 256×256 pack: https://freegamesprites.com/en/packs/rpg-characters — CC0 advertised, original human authorship unresolved. **QUARANTINE** until independently confirmed.

Preferred source: original 192×256–384×512 works by collaborating pixel artists, original PNG/Aseprite documents, signed permissions for AI training and derivatives, identity labels, and separate face/pose annotations.

## Mandatory manifest structure (illustrative, not genuine artist approval)

JSON example:

    {
      "samples": [{
        "path": "portraits/original_character_001.png",
        "task": "portrait_fullbody",
        "identity_id": "original_character_001",
        "artist_id": "original_pixel_artist",
        "origin": "human_drawn",
        "native_pixel_art": true,
        "source_url": "https://example.org/creator/artist-asset",
        "license": "custom-written-consent",
        "consent_evidence": "https://example.org/verified-permission",
        "training_permission": true,
        "artist_opt_out": false,
        "reviews": [
          {"reviewer_id":"reviewer_a","approved":true,"scores":
           {"character_design":5,"face_readability":4,"anatomy":5,"pixel_craft":5,"style_coherence":5}},
          {"reviewer_id":"reviewer_b","approved":true,"scores":
           {"character_design":4,"face_readability":5,"anatomy":4,"pixel_craft":5,"style_coherence":4}}
        ]
      }]
    }

**Never fabricate reviewers, author consent or provenance.** Above is a schema example only.

## Run

From research/pixel-character-ai/:

    python quality_gate.py --data ./licensed-art --manifest ./licensed-art/manifest.json --report ./runs/quality.json
    python -m unittest discover -s . -p "test_*.py" -v
    python art_training.py --data ./licensed-art --manifest ./licensed-art/manifest.json --output ./runs/human-art --epochs 20

The training CLI must BLOCK when no real approved data is available. Its output is a local pixel-restoration baseline, not freeform prompt-based full-body character generation.

## Scientific measurements

Split source artwork by ARTIST as well as checking identity leakage. Audit duplicate hashes and near-duplicate variants before final holdout. For any later generation model evaluate facial identity, hands, silhouette, pixel style, overall full-body composition and blinded illustrator ratings. A 95% pixel-accuracy score on synthetic data does not establish aesthetic quality.

## Published scientific context

- Coutinho & Chaimowicz, Graphical Models (2024): https://doi.org/10.1016/j.gmod.2024.101213.
- Coutinho, Chaves & Chaimowicz, Entertainment Computing (2025): https://doi.org/10.1016/j.entcom.2025.101021.
- Ma et al., HPSv3, ICCV (2025): https://openaccess.thecvf.com/content/ICCV2025/html/Ma_HPSv3_Towards_Wide-Spectrum_Human_Preference_Score_ICCV_2025_paper.html.
- Ferbach et al., NeurIPS (2024): https://proceedings.nips.cc/paper_files/paper/2024/hash/b9e88ae0308cf82d0b0f634ddbdf809a-Abstract-Conference.html.

The final two studies concern preference evaluation and self-consuming data, and are not validated pixel-art generative benchmarks. Do not claim the above papers' results are ours.

**Current state: human-art training code exists; no high-quality artwork has completed provenance, independent review and dataset ingestion, and no artist-trained model weights have been produced.**
