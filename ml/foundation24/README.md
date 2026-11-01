# Foundation24 — 24×24 discrete pixel character research | R0 Pilot

**Not a finished general-purpose pixel foundation model.** This is a genuinely trainable neural model pilot. It does NOT achieve the quality or generality requirements of MASTER PROMPT V1.0 yet. The previous 36 characters are AI-concept reconstructions, not high-quality licensed human artist training labels. They remain opt-in experimental inputs only.

## Working features

- Strict 24×24 integer palette-index tokens (0 transparent; 1–14 color) plus binary alpha; zero interpolation.
- 40×40 cell sprite gallery and verified 4× nearest-neighbor output (6×6 → 240×240 → 960×960).
- Audited dataset admission: image SHA256, path containment, 24×24 RGBA, native status, training permission, two reviewer IDs, and train/val/test identity isolation. These assertions do not independently verify license truth or visual duplicates.
- **A — MaskedPixelNet**: real PyTorch masked-token cross-entropy model, trained by real gradient descent; unconditional iterative pixel token generation.
- **B — structure condition ablation**: same model with supplied test-sprite silhouette. NOT an anatomy generator.
- Save real weights and optimizer checkpoint, train loss, holdout masked accuracy, 64 independent-seed candidate images and explicit limitations.
- Pilot's local palettes are unaligned across identities, so the colors in exported samples are mapped from reference palettes, NOT model-learned meaningful color choices.

## Install and run

From repository root:

~~~bash
python -m pip install numpy==2.2.6 Pillow==11.3.0
python -m pip install torch --index-url https://download.pytorch.org/whl/cpu
python -m unittest discover -s tests -p test_foundation24.py -v

# Explicit UNAPPROVED pilot; 30 train, 3 validation, 3 test (not artist gold).
python -m ml.foundation24.experiment --dataset mini36-pilot \
  --allow-unapproved-pilot --mode masked --steps 150 \
  --out artifacts/foundation24/masked

# Uses test silhouettes! Not unconditional anatomy generation.
python -m ml.foundation24.experiment --dataset mini36-pilot \
  --allow-unapproved-pilot --mode structure --steps 150 \
  --out artifacts/foundation24/structure
~~~

Official data must be supplied separately:

~~~bash
python -m ml.foundation24.experiment --dataset approved \
 --root /path/to/reviewed_pngs --manifest /path/to/manifest.json \
 --mode masked --steps 500 --out artifacts/foundation24/approved
~~~

Each JSON record requires: path, identity_id, source, author, license, training_permission=true, native_status="approved_artist_native" or "native_reauthored", reviewers array with at least 2 distinct IDs, split="train"|"val"|"test", sha256 of original PNG. Actual independent identity, reviewer, license and near-duplicate audits still need human verification.

Outputs: MODE-checkpoint.pt, MODE-report.json, MODE-64-native.png, MODE-64-native-4x.png, sprites/seed-N.png. GitHub Actions uploads artifacts; none are silently promoted to the live gallery.

## Research status and next milestone

1. Existing Mini36 and 30+6 denoising CNN **do not** prove independent character generation.
2. This experiment is an actual learned discrete generator with true optimizer and weights, but the training corpus is **not adequate** for an aesthetic foundation model; it has no learned face, hair, emotion, body-attribute controls.
3. Next quality gate: obtain and independently review 200–500 artist-authored, source-licensed, *native* 24×24 basic figures. Add semantic parts, aligned palette roles, label splits, near-duplicate/source isolation, trained attribute conditions, unseen-combination tests, and blind artist evaluation.
4. Until those pass, every report is marked experimental and foundation_model_accepted=false. No claims of perfect pixel-art aesthetics.

Reference design specification: user's PIXEL FOUNDATION MODEL MASTER PROMPT V1.0.
