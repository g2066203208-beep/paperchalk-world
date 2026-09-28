# Paperchalk Humanoid Rig Template v1

## Purpose

This document defines the canonical reusable 2D cutout rig for Paperchalk characters. The art is not regenerated per animation frame. A character is authored once as rigid/modular parts and motion is produced by transforms around fixed pivots.

The design borrows proven ideas from Godot Skeleton2D's GBot demo (hierarchical bones and reusable animation tracks), SpriteForge (image attachments + bones + timeline), Boneyard (canonical views and character-independent animation tracks), and Proscenio (per-layer PNG/manifest pipeline).

## Projection contract

- Fixed 2D orthographic pseudo-3/4 presentation.
- Default facing: screen-right.
- No perspective scaling or foreshortening.
- Near/far corresponding limbs use the same anatomical scale.
- Depth is represented by XY offsets, overlap, and draw order only.
- A rigid limb sprite must never be redrawn because it moves closer/farther from the viewer.

## Canonical hierarchy

```text
root
└─ pelvis
   ├─ thigh_far
   │  └─ shin_far
   │     └─ foot_far
   ├─ torso
   │  ├─ upper_arm_far
   │  │  └─ forearm_far
   │  │     └─ hand_far
   │  ├─ neck
   │  │  └─ head
   │  │     ├─ hair_back
   │  │     ├─ ponytail_far
   │  │     ├─ ponytail_near
   │  │     └─ hair_front
   │  └─ upper_arm_near
   │     └─ forearm_near
   │        └─ hand_near
   ├─ thigh_near
   │  └─ shin_near
   │     └─ foot_near
   └─ bag
```

## Required rigid body sprites

1. head_base
2. torso
3. pelvis
4. upper_arm_far
5. forearm_far
6. hand_far
7. upper_arm_near
8. forearm_near
9. hand_near
10. thigh_far
11. shin_far
12. foot_far
13. thigh_near
14. shin_near
15. foot_near

Character-specific modular attachments may add front/back hair, ponytails, curls, skirt panels, ribbons, bags and other accessories.

## Part-sheet authoring rule

The source art sheet is an exploded parts atlas, NOT an assembled pose. Every primary part:

- is fully visible;
- has transparent background around it;
- does not overlap another source part;
- contains all hidden material needed when rotated;
- has a stable local coordinate system;
- has one declared pivot;
- is large enough to survive the final game resolution.

The assembled preview is generated from the atlas + manifest. It is not the source of truth.

## Mechanical joint contract

Every rotational joint uses overlapping geometry. Connected sprites never meet edge-to-edge.

- Shoulder: upper-arm root extends underneath torso/sleeve.
- Elbow: forearm root extends underneath upper-arm/sleeve.
- Waist: pelvis extension sits underneath torso.
- Hip: thigh root extends underneath pelvis/skirt.
- Knee: shin root extends underneath thigh.
- Ankle: lower-leg root extends underneath foot/shoe assembly.

Hidden extensions should be rounded around the pivot so normal rotation does not expose background.

Initial safe rotation targets:

| Joint | Design allowance |
|---|---:|
| shoulder | ±25° |
| elbow | ±45° |
| waist | ±12° |
| hip | ±30° |
| knee | ±45° |
| ankle | ±20° |

These are authoring safety targets, not hard gameplay limits.

## Normalized pivot convention

Each sprite declares its pivot in local normalized coordinates `(u,v)`, where top-left = `(0,0)` and bottom-right = `(1,1)`.

Recommended initial locations:

| Part | Pivot region |
|---|---|
| torso | lower-center / waist |
| head | lower-center / neck |
| upper arm | rounded shoulder root |
| forearm | rounded elbow root |
| hand | wrist root |
| thigh | rounded hip root |
| shin | rounded knee root |
| foot | ankle root |
| ponytail | hair tie/root |
| bag | strap attachment/root |

Exact values are character-specific and saved in the manifest.

## Two-plane pseudo-3/4 system

`BACK`: far hair, far arm, far leg, rear accessories.

`FRONT`: torso/head, near arm, near leg, foreground hair/accessories.

Additional micro-layers are allowed for costume correctness, but they must not simulate perspective scaling.

## Canonical shoe rule

Left/right shoes use one orthographic visual system. The shoe is a rigid sprite. Walking rotates/translates it; walking does not redraw its perspective. If asymmetric costume art requires unique left/right images, both retain the same canonical scale and construction.

## Manifest v1

```json
{
  "format": "paperchalk-rig-v1",
  "projection": "orthographic-pseudo-3q-right",
  "parts": {
    "pelvis": {"parent": null, "pivot": [0.50, 0.34], "z": 0},
    "torso": {"parent": "pelvis", "pivot": [0.50, 0.88], "z": 20},
    "thigh_far": {"parent": "pelvis", "pivot": [0.50, 0.16], "z": -20},
    "shin_far": {"parent": "thigh_far", "pivot": [0.50, 0.15], "z": -20},
    "foot_far": {"parent": "shin_far", "pivot": [0.38, 0.22], "z": -20},
    "thigh_near": {"parent": "pelvis", "pivot": [0.50, 0.16], "z": 30},
    "shin_near": {"parent": "thigh_near", "pivot": [0.50, 0.15], "z": 30},
    "foot_near": {"parent": "shin_near", "pivot": [0.38, 0.22], "z": 30}
  }
}
```

Values above are starter defaults only; the editor must expose them.

## Animation contract

Reusable clips store transforms, not redrawn frames:

```text
idle
walk
run
jump
land
attack
hurt
interact
```

A clip may animate local position, local rotation, optional local scale for intentional squash/stretch only, draw-order switches, and secondary attachment rotation. Perspective morphing is forbidden.

For the initial walk implementation, do not use mesh deformation on rigid limbs. Mesh deformation is reserved for soft components such as selected hair, ribbons, skirt edges and oversized loose cloth after the rigid system is stable.

## Walk-cycle validation

A character passes Rig v1 only if a complete walk cycle can be made from the exact same source sprites.

FAIL if:

- a limb needs redrawing;
- a shoe needs a new viewing angle;
- limb length changes;
- near/far counterpart scale changes;
- a joint exposes a background hole;
- costume art locks a required joint;
- a major part disappears because the source art never contained its hidden area.

## Recommended production pipeline

```text
Character concept/reference
        ↓
Paperchalk standard body proportions
        ↓
Exploded transparent parts atlas
        ↓
Auto/manual alpha trim per part
        ↓
rig.json manifest (parent, pivot, z, rest transform)
        ↓
Rig editor assembly
        ↓
Canonical rest pose
        ↓
Reusable animation clips
        ↓
Runtime character
```

For AI-assisted art, generation should target the exploded source parts, not a finished walking frame. A separately generated assembled reference may be used for identity/style checking but must not be treated as the rig source.

## First implementation gate

Before adapting the brown-haired paper character, build a plain mannequin using these exact parts and prove:

1. assemble/disassemble;
2. visible/editable pivots;
3. parent-child FK;
4. z-order front/back limbs;
5. walk loop using unchanged sprites;
6. no black cracks at joints;
7. both shoes remain unchanged sprites;
8. export/import preserves the rig exactly.

Only after this passes should character art replace mannequin art.
