# PaperChalk Spine Viewer for Android

A compact Android APK for previewing and debugging Spine skeletal animation exports on a phone/tablet.

## What it does

- Imports `.atlas` + `.json`/`.skel` + all texture `.png` pages using Android's Storage Access Framework.
- Animation selection, looping, play/pause, playback speed (0.10×–4.00×), and default mix time.
- Skin selection.
- FIT/FILL display modes.
- Pinch zoom, one-finger pan, double-tap reset.
- Checker/dark/light viewport backgrounds.
- Optional bone-point debug overlay using the official Spine Android `DebugRenderer`.
- Keeps the most recently imported project in app-private storage; no storage permission is required.
- No analytics, no account system, and no network permission.

## Runtime versions

CI builds two APKs from the same source:

- `Spine 4.2.12`
- `Spine 4.3.5`

Use the APK whose runtime major.minor matches the Spine Editor version used to export your skeleton. Spine recommends keeping the editor and runtime versions in lockstep.

## Import workflow

1. Export from Spine: skeleton data (`.json` or `.skel`), `.atlas`, and texture page(s) (`.png`).
2. Tap **导入 Spine 文件**.
3. Multi-select the `.atlas`, skeleton file, and every PNG page referenced by the atlas.
4. The viewer copies them into app-private storage and loads the animation.

If the atlas refers to texture pages inside nested subdirectories, export/copy them so the atlas and texture pages are selectable with their expected names.

## Build

The project is intentionally standalone. From this directory:

```bash
gradle :app:assembleDebug -PspineVersion=4.3.5
gradle :app:assembleDebug -PspineVersion=4.2.12
```

The repository workflow builds both variants automatically on pull requests and uploads them as artifacts.

## Licensing

This wrapper code is intended for the PaperChalk project. The official Esoteric Software Spine Runtimes are source-available but use the **Spine Runtimes License**, not a permissive MIT/Apache license. Each user must satisfy the Spine Editor / Spine Runtimes license requirements. The required license notice is bundled in `app/src/main/assets/SPINE_RUNTIME_LICENSE.txt`.

Official references:

- https://github.com/EsotericSoftware/spine-runtimes
- https://esotericsoftware.com/spine-android
- https://esotericsoftware.com/spine-runtimes


## V2 authoring studio

The APK now includes a mobile authoring studio built from a pinned MIT-licensed Stretchy Studio revision. It is served through Android's secure `appassets.androidplatform.net` origin so PSD file input, WebGL and camera APIs work inside WebView.

Features:

- Layered PSD import and automatic layer/group reconstruction (`ag-psd` upstream).
- Heuristic auto-rig that works locally without a model download.
- Optional DWPose/ONNX auto-rig for higher-accuracy whole-body joint placement.
- Mesh generation, triangle/vertex editing, vertex skinning and mesh deformation/warp animation.
- Keyframe timeline and animation clips.
- Camera pose tracking bridge using MediaPipe Pose Landmarker. The first detected pose becomes the calibration pose; body/limb rotations are written as non-destructive draft poses.
- Motion capture recording: camera samples are compressed and written directly into a new 30 fps timeline animation.
- Clean canvas recording: records the largest WebGL/Canvas surface only, not the Android toolbar. MediaRecorder data is flushed to Android storage every second rather than accumulated for the whole recording.
- No application-imposed recording duration. Real limits are device thermal/battery state, codec/WebView behavior, available storage and filesystem/media-container limits.
- On-device one-tap foreground cutout using MediaPipe Selfie Segmenter, with transparent PNG output and alpha-bound trimming.

### Important scope note

The foreground cutout model is a person/selfie segmenter. It is useful for human and human-like characters, but it is not equivalent to semantic anime layer decomposition. For a single flattened anime illustration, high-quality automatic separation into hair/face/arms/clothes/etc. is a different task (for example the See-Through research/model family). A layered PSD remains the preferred input for reliable auto-rigging.

### Third-party components

- Stretchy Studio — MIT, pinned at `24a83a27ba43e43e9d2e3de5e33994594e6199c2`.
- ag-psd — MIT (transitively used by Stretchy Studio).
- MediaPipe / Tasks Vision — Apache-2.0 APIs; camera pose tracking and foreground segmentation.
- Official Spine Android runtime — Spine Runtimes License (separate from the MIT/Apache components).
