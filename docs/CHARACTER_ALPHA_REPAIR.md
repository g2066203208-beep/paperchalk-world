# Paperchalk World — Character alpha-matting pipeline

2026-11-02 audit: the old Pillow white-pixel threshold script only fixed the large opaque leg gap, not hair-level matting. It also recompressed the game sprite on EVERY Pages deployment. This is now replaced by a checked-in transparent sprite and a read-only CI alpha validator.

## Assets and reproducibility
- site/assets/characters/protagonist-front.webp: corrected original-reference front-facing actor, 312 x 1019 RGBA WebP, processed from the user-approved original 1024 x 1024 flat-white artwork. No character repaint.
- scripts/validate_character_alpha.py: run at deploy, checks real alpha/leg gap/silhouette without modifying the image.
- scripts/matte_character.py: reusable tool; plain white backgrounds take a fast deterministic alpha/decontamination path; difficult backgrounds can instead use ONNX anime segmentation via rembg.

### Flat white Anima image
  python -m pip install Pillow numpy scipy opencv-python-headless
  python scripts/matte_character.py raw.png transparent.png --engine flat-white --webp site/assets/characters/new-actor.webp --preview-dir out/qa

### Anime neural segmentation
  python -m pip install 'rembg[cpu]'
  python scripts/matte_character.py raw.png transparent.png --engine isnet-anime --webp site/assets/characters/new-actor.webp --preview-dir out/anime-qa

Optional alternative for complex foregrounds: --engine birefnet-general-lite. AI model weights are downloaded only in the ASSET PRODUCTION environment, never the game client. The current protagonist's cleaned matte uses flat-white processing; do not claim that it was inferred by isnet-anime.

## Open source sources and licenses
- rembg (MIT): https://github.com/danielgatis/rembg
- anime-segmentation (Apache 2.0): https://github.com/SkyTNT/anime-segmentation
- PyMatting (open source trimap/foreground correction): https://github.com/pymatting/pymatting
Model license must be checked separately from program license (in particular BRIA's commercial terms).

## Art QA
Check transparency on dark, neutral, near-white, and checkerboard backgrounds. Inspect individual hair strands, nape, jacket outline, fingers, leg gaps, shoes. Do NOT redraw the character or change its facial design. Alpha must be genuine in PNG/WebP. Keep original source art and lossless PNG; game uses a preprocessed WebP. Auto-tests do not substitute for visual sign-off.
