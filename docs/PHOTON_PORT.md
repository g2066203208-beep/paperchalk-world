# Photon feature port for Paperchalk

Paperchalk is integrating the rendering feature set of [sixthsurge/photon](https://github.com/sixthsurge/photon) into its Three.js/WebGL renderer.

This is not a Minecraft shader-loader wrapper. Minecraft/Iris-specific buffers, macros and world hooks are translated into native Paperchalk render passes so the game keeps its own terrain, paper materials, entities and gameplay model.

## License and attribution

Photon Shaders is Copyright © 2021-2025 Benjamin Stott ("SixthSurge") and uses a custom license that permits source study, personal modification, and redistribution of modified or unmodified portions subject to its stated restrictions. The upstream license is preserved verbatim in `THIRD_PARTY_LICENSES/PHOTON_SHADERS_LICENSE.txt`.

## Port matrix

Implemented in `PhotonPipeline.js`:

- Offscreen scene color + hardware depth buffer.
- GTAO-style depth reconstructed ambient occlusion with depth-aware bilateral filtering.
- Volumetric cloud slab with procedural 3D noise, sun scattering, self-shadow samples and weather coverage.
- Bloom extraction + separable Gaussian blur.
- TAA history accumulation with Halton subpixel jitter, world-space history reprojection and neighborhood clamping.
- FXAA edge filtering.
- CAS-style contrast-adaptive sharpening.
- Optional depth of field.
- Optional camera motion blur.
- Linear-target-aware integration with the existing shadow-map / Mie atmosphere pass.
- Desktop/mobile quality profiles.

Existing Paperchalk systems retained as Photon equivalents where they already provide the required function:

- Directional shadow map + world-space volumetric fog/light shafts: `AtmospherePass.js`.
- ACES filmic tone mapping: Three.js renderer output transform.
- Dynamic day/night sky and sun/moon coupling: `AtmospherePass.js` + `World3DEngine.js`.
- Moving warm local light: player torch PointLight.
- Water surface geometry: Paperchalk 8-layer 3D water renderer.

## Remaining full-feature parity work

These Photon feature families still require Paperchalk-native implementations before the port can be called feature-complete:

- PCSS / variable-penumbra sun shadows.
- Screen-space reflections with material masking.
- Voxel/LPV colored emissive lighting.
- Photon-class water reflection/refraction and wave normals.
- Multi-family cloud types and storm/rain state transitions beyond the first volumetric weather layer.
- LabPBR-specific material decoding (only relevant if Paperchalk adopts that asset convention).
- Temporal upscaling path separate from native-resolution TAA.
- Aurora/rainbow/special weather optics.

The branch intentionally keeps these as separate modules instead of growing `World3DEngine.js`, which is already at its enforced 56 KB architecture budget.
