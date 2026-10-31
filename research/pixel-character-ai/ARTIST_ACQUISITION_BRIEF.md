# Art Direction & Acquisition Brief — Original Pixel Characters

**Purpose:** collect licensed ORIGINAL hand-authored high-quality full-body art, not 48×64 procedural placeholders, unverified internet images, or AI-rendered mock pixel art.

## Acceptance requirements

- True artist-authored native pixels (original Aseprite project or editable PNG), with no antialiased edge halos. No silent upscaling, no resized tiny sprites falsely marked 384×512.
- Full figure completely visible including hair, shoes, fingers and any accessories. Target logical dimensions 192×256–384×512. Background transparent; palette is the artist's **original intentional colors**, *not* a forced four-color approximation.
- Distinct visual personality: at least 5 clearly different face constructions / eye and nose design families across an initial batch. Do not replicate one anime beauty template with just different hair.
- Clear anatomy and pose: plausible shoulder–arm–wrist and hip–knee–ankle relationships, readable hands, perspective/foreshortening correct. Facial proportions and expressions visibly defined.
- Clean deliberate clusters: any lone pixel or extra highlight should carry meaning; keep silhouette and material shading clear, no incidental confetti noise.
- Visually diverse outfits and silhouettes: proportions, garments, hair texture, accessories, age range, body shape, pose. No artificial clothing damage or excessive ornamentation unless motivated by character design.
- A coherent visual identity within each *character*, but multiple artists and styles across the *corpus*. Avoid collapsing to one template, one culture, one body shape or one face.
- Preserve native author artwork and revisions. Maintain source URI, artist identifier, license evidence, date, SHA-256, character ID, optional face/bone masks.
- Original creators must explicitly agree to the intended AI training and derivative use. Honor objections even when a permissive license might technically allow reuse.
- Art must pass two independent reviews of 5 dimensions (design, face, anatomy, pixel technique, style) each >=4/5. Staff must actually inspect images; no fake signoffs.

## Collection phases (targets, not current inventory)

Pilot: collect 40–80 accepted whole-body portraits across >=5 artists and identities, including consistent expressions and 3/4 front poses. Aim for sufficient artists in held-out splits. Learn a masked-restoration baseline for testing data and representation.

Main set: 300–1,000+ authored portraits across multiple artists/styles, with face crops and anatomy labels for face-identity preservation. Treat this as a recruitment/commissioning target, not a download count or promise.

Scene stage: independently collect 512×512+ scene pieces with layer/semantic layout metadata; don't mix scene pixels into a face-only training task.

## Research integrity

An agreed dataset curation procedure can improve research quality, but 40 artist examples cannot support strong claims about universal generalization. Run artist-held-out and character-held-out tests, normalize hardware budget, measure human preferences and face consistency and report all negatives. We must eventually compare to the 2025 Entertainment Computing palette/pose paper and SIGGRAPH Asia 2024 SD-πXL where legitimately reproducible, not simply cite them while training unrelated toy models.
