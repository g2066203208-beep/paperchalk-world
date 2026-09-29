# Paper Rendering References — Phase 1

This document records the references reviewed for the paper-diorama terrain work and the implementation choice actually used in this repository.

## Repository reality

The current production renderer is **Three.js r180 / WebGL**, not C++/Vulkan. TerrainWorld remains authoritative for terrain generation, edits, collision and gameplay. Phase 1 therefore adds a visual-only paper terrain renderer instead of changing physics.

## References reviewed

### mapbox/earcut / earcut.hpp
- Purpose reviewed: fast polygon triangulation, including outer rings and holes.
- License: ISC.
- Relevance: preferred triangulator when later contour extraction moves from orthogonal grid unions to arbitrary cut-paper polygons.
- Phase 1 decision: not vendored yet. The first pass uses exact grid-region merging because the authoritative terrain is discrete and this removes render-grid lines without introducing polygon-cleanup failure modes.

### MarchingSquaresJS
- Purpose reviewed: contour extraction from a scalar/binary field, including examples that handle multiple blobs and holes.
- License: MIT.
- Relevance: candidate for Phase 1.5/2 when the visual height field is allowed to form non-orthogonal paper contours.
- Phase 1 decision: not copied. Discrete voxel boundaries are traced implicitly by comparing neighboring top heights.

### AngusJohnson/Clipper2
- Purpose reviewed: polygon boolean operations and polygon offsetting.
- License: Boost Software License 1.0.
- Relevance: useful for contour cleanup and bevel/offset operations if future paper contours become arbitrary polygons.
- Current upstream note: the repository warns that its triangulation path has known bugs. For that reason it is not used as the Phase 1 triangulator.

### paper-design/shaders
- Purpose reviewed: paper fiber, roughness grain, paper/back/shadow color concepts.
- License: Apache-2.0.
- Phase 1 decision: no code copied. The terrain material implements its own small world-space multi-scale paper variation in the existing Three.js material pipeline.

### winchxyz/tidewright
- Purpose reviewed: NPR terrain presentation, wrap-light/no-specular craft look, miniature rendering, and separating art style from simulation.
- Phase 1 decision: structural inspiration only; no source copied.

### nickschuetz/o3de-diorama
- Purpose reviewed: world-space flat art living in a lit 3D scene, soft ground shadows, 2.5D depth layering and batching.
- Phase 1 decision: structural inspiration for later character/vegetation paperization; no source copied.

### Three.js
- Existing project dependency.
- License: MIT.
- Relevant built-ins: BufferGeometry, MeshStandardMaterial, PCFSoftShadowMap, world-space shader hooks via onBeforeCompile.

## Phase 1 implementation adopted

The current terrain is a discrete voxel/height field. To eliminate the visible render grid while preserving gameplay exactly, Phase 1 uses:

1. TerrainWorld unchanged as gameplay/collision authority.
2. A new PaperTerrainRenderer as a visual-only layer.
3. Per visual chunk, sample the top authoritative solid voxel in each X/Z column.
4. Greedy-merge coplanar, equal-material top cells into large rectangles.
5. Emit side faces only at true height boundaries; no internal cell side faces.
6. Emit a narrow geometric chamfer strip at exposed top edges.
7. Use separate material groups for top paper, cardboard side and bevel.
8. Apply subtle world-space procedural fiber/print variation instead of a repeating per-tile border texture.
9. Cache one batched GPU mesh per visual chunk and rebuild only on terrain edits / streaming entry / parameter changes.
10. Keep the old voxel renderer available behind a runtime A/B toggle for verification.

This is intentionally the lowest-risk first pass: it removes the primary visual defect (tile-grid exposure) without touching collision or world generation. Arbitrary Marching-Squares + Earcut contours remain the next step only if the real framebuffer still reads too orthogonal after A/B review.