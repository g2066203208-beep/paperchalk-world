# Elbow deformation research and isolated test

Status: experimental, not production-approved. Frozen V46, 506-quad refined mesh and existing traversal code unchanged. Comparison includes a controlled two-bone linear blend (not the preceding full traversal DQ solver), ring-uniform rigid rotation, and circular fillet centerline correction. Actual arm vertices are used, no replacement geometry. The ring-uniform methods preserve pairwise distances within each specified cross section and hand group to numerical precision. This does not guarantee entire limb volume, silhouette, muscle anatomy, or joint skin length. The fillet is not a true FEM or production pose-space corrective. At high bend, the transition reaches further up/down the limb; it needs anatomical retopology/artist correctives. Independent bilateral elbow bend in the forward direction, fixed shoulders, no wrist motion. Full-body strict nonadjacent noncoplanar triangle crossing and intraquad angle warnings tested every integer degree 0–145. Shared-vertex pairs and coplanar contacts excluded. No continuous-time proof. The 140–145 degree range still fails. Do not integrate into production rig yet.

Research sources:
- C&R low-poly character modeling: https://3d.crdg.jp/tech/archives/844 — asymmetrical outer/inner joint edge layout.
- Disney Research optimized centers of rotation: https://la.disneyresearch.com/publication/skinning-with-optimized-cors/ — LBS collapse, DQS bulging and optimized rotation centers.
- Autodesk Maya smooth skinning: https://help.autodesk.com/cloudhelp/2024/ENU/Maya-CharacterAnimation/files/GUID-630C335C-B63E-4F2E-A4A4-AEA1DD00B0D6.htm
- Autodesk post-skinning correctives: https://help.autodesk.com/cloudhelp/2024/ENU/Maya-CharacterAnimation/files/GUID-B8755F24-7C24-4066-B6F8-2DE6954DC2BF.htm
- Lewis et al. Pose Space Deformation: https://doi.org/10.1145/344779.344862
- Epic Pose Driver: https://dev.epicgames.com/documentation/unreal-engine/pose-driver-in-unreal-engine
- Blender corrective smoothing: https://docs.blender.org/manual/en/4.4/modeling/modifiers/deform/corrective_smooth.html

Recommended next: anatomical joint pivot; staggered joint topology; rigid shafts and hand/foot bindings; angle-driven shape correctives authored at key angles; tests of flexion, twist and combined shoulder poses, plus surface contact. Avoid arbitrary radius shrink to pass intersection counts.
