# Photon feature port for Paperchalk

Paperchalk is translating the rendering feature set of [sixthsurge/photon](https://github.com/sixthsurge/photon) into its native Three.js/WebGL renderer.

This is not a Minecraft/Iris shader-loader wrapper. Minecraft-specific uniforms, G-buffer contracts, block IDs, Iris compute/image APIs and Distant Horizons hooks are replaced by Paperchalk-native render passes that preserve the game's paper materials, terrain runtime, entities and side-scrolling gameplay.

## License and attribution

Photon Shaders is Copyright © 2021-2025 Benjamin Stott ("SixthSurge"). Its custom license permits source study, personal modification, and redistribution of modified or unmodified portions subject to the stated restrictions. The upstream license is preserved verbatim in `THIRD_PARTY_LICENSES/PHOTON_SHADERS_LICENSE.txt`.

## Feature parity

Implemented on `feat/photon-full-port-r1`:

- **Sky / lighting / water**
  - existing Paperchalk world-space Mie + height-fog atmosphere retained as the volumetric-fog stage;
  - Photon-style PCSS blocker search and variable-size penumbra filtering patched into Three.js directional shadows;
  - dynamic sun/moon coupling and ACES output retained;
  - water-only depth/mask pass, screen-space reflection raymarch, depth intersection, Fresnel, refraction and multi-wave Gerstner-style normals.
- **Clouds and weather**
  - volumetric low cumulus layer with sun self-shadow;
  - cirrus, altocumulus and noctilucent high layers;
  - procedural changing weather front;
  - ground cloud shadows;
  - rain streaks and wet-weather color shift;
  - lightning flash;
  - aurora and primary/secondary rainbow optics.
- **Colored lighting**
  - local RGB voxel light volume;
  - terrain-solid occupancy;
  - six-neighbour flood-fill propagation;
  - PointLight emitters including the hand torch;
  - world-space surface lookup in the post-lighting pass.
- **Ambient / reflections**
  - GTAO-style depth reconstructed ambient occlusion;
  - depth-aware bilateral AO filtering;
  - screen-space water reflections;
  - material-masked screen-space reflections driven by Three.js roughness/metalness, with paper surfaces naturally suppressed by high roughness.
- **Camera / image quality**
  - bloom extraction + separable blur;
  - depth of field;
  - camera motion blur;
  - native TAA with Halton jitter, world-space history reprojection and neighbourhood clamping;
  - TAAU path: reduced internal scene resolution + full-resolution temporal reconstruction;
  - FXAA;
  - CAS-style sharpening.
- **Performance**
  - independent desktop/mobile quality levels;
  - offscreen scene/depth pipeline;
  - subsampled AO and bloom buffers;
  - adjustable TAAU render scale;
  - in-game Photon debug controls for TAAU scale, GTAO, bloom, PCSS softness, cloud coverage and procedural weather strength;
  - rendering systems split into independent modules to keep `World3DEngine.js` inside its original 56 KB architecture budget.

## Photon-to-Paperchalk translation notes

Photon's **labPBR resource-pack support** is a Minecraft asset convention, not a rendering effect by itself. Paperchalk already owns its authored/procedural `PaperMaterial` normal/roughness/physical-sheen pipeline, so importing labPBR block-ID/resource-pack decoding would not make sense for this game. The equivalent material channels are consumed natively from Paperchalk materials instead.

Photon's Iris-specific compute/image voxelization is likewise replaced with a bounded Paperchalk voxel light volume fed directly from `TerrainWorld`. This preserves the visible colored-light behavior without making the browser renderer depend on Minecraft/Iris APIs unavailable in WebGL.

Photon's Distant Horizons / Voxy compatibility programs are Minecraft-mod integration layers and therefore have no Paperchalk equivalent to port.

## Modules

- `PhotonPipeline.js` — render graph, PCSS hook, GTAO, bloom, TAA/TAAU, FXAA/CAS, DOF and motion blur.
- `PhotonWaterPass.js` — water mask/depth, SSR, refraction, Fresnel and procedural wave normals.
- `PhotonVoxelLightVolume.js` — bounded RGB voxel occupancy and flood-fill colored lighting.
- `PhotonSkyWeatherPass.js` — multi-layer clouds, weather, cloud shadows, rain, lightning, aurora and rainbow.
- `AtmospherePass.js` — world-space shadow-map volumetric fog/Mie scattering and dynamic base sky.

## Validation gates

The branch has static architecture and size-budget assertions for every Photon module, plus real Chromium/SwiftShader framebuffer A/B smoke coverage. The Photon pipeline can be disabled at runtime with `Paperchalk3D.configurePhoton({enabled:false})` so comparisons use the exact same gameplay/world state.

## Remaining parity work

The remaining items are integration/tuning parity rather than missing headline Photon feature families:

- additional cloud morphology/tuning to more closely match individual Photon cloud presets;
- weather state driven by a future Paperchalk gameplay weather system rather than only renderer-side procedural fronts;
- expanding the debug controls to expose every low-level tuning constant rather than the current high-value subset;
- device profiling/tuning of Ultra/Balanced/Mobile presets.

These are intentionally kept separate from Minecraft-only labPBR, Iris, Distant Horizons and Voxy compatibility code.
