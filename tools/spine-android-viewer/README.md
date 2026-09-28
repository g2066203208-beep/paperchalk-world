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
