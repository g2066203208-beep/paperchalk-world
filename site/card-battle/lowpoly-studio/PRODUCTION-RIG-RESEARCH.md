# V46 character deformation — production research and reset gate
Status: V10 rejected; do not use collision-free samples as visual acceptance. No replacement production rig has been completed.

## Primary references and implementation implications
- Thunder Cloud Studio, Topology for Low Poly Game Characters: https://thundercloud-studio.com/article/topology-for-low-poly-game-characters/ — study the independent front groin loops, posterior gluteal loops and joint-support rings. Rebuild the edge flow rather than adding parallel cuts to existing bad faces. Reference images: https://thundercloud-studio.com/wp-content/uploads/2024/09/image11.jpg and https://thundercloud-studio.com/wp-content/uploads/2024/09/image66.jpg .
- Autodesk Maya Pose Space Deformation: https://help.autodesk.com/cloudhelp/2023/ENU/Maya-CharacterAnimation/files/GUID-00699C13-8CA1-450C-937D-57C7B3DFD8C6.htm — explicitly sculpt corrective target shapes for difficult joint poses and interpolate by joint transform.
- Kavan et al., Geometric Skinning with Approximate Dual Quaternion Blending: https://users.cs.utah.edu/~ladislav/kavan08geometric/kavan08geometric.html — use rigid transform blending as baseline, not an anatomical contact solver.
- SideFX Muscle setup: https://www.sidefx.com/docs/houdini/muscles/musclesetup.html — separate bone surfaces, muscle volumes, fibers, attachments, fascia and tissue constraints. The current line/radius proxies do not implement this system.
- Disney, Efficient Elasticity for Character Skinning with Contact and Collisions: https://disneyanimation.com/publications/efficient-elasticity-for-character-skinning-with-contact-and-collisions/ — consider volumetric elastic solve and collision handling offline.
- Epic ML Deformer: https://dev.epicgames.com/documentation/unreal-engine/ml-deformer-framework-in-unreal-engine — runtime approximation depends on good ground truth shapes; it cannot fix bad training geometry.
- Lewis et al., Pose Space Deformation: https://doi.org/10.1145/344779.344862 — pose-dependent shape corrections.

## Next implementation gate
1. Preserve V46 archive. Stop tuning V10 offsets. Design mirrored hip/groin/gluteal edge flow with sufficient local density and no arbitrary total quad ceiling.
2. Define pelvis, femur, tibia, foot and torso transforms in a consistent hierarchy. Neutral pose must reproduce rest geometry; test both limbs and joint rotations independently.
3. Build and visually approve high flexion targets at 45/90/115/130 degrees hip flexion and combined knee flexion. Thigh bulk remains near bone, abdomen and fat yield, gluteal contour extends, groin folds locally. Separate hip abduction and twist tests.
4. Use corrective shape interpolation with actual approved mesh targets; muscle/tissue solve can supply targets if implemented and validated. No claim of actual muscle simulation from line proxies.
5. Validate whole body, wireframe, principal strain, edge length, cross-sectional shape, triangle area, volume where a closed region is well-defined, contact separation, temporal continuity, and feet/hands IK. Geometry heuristics are not anatomical proof.
6. Test crouch, deep tuck, jump, run, slash, wall/rope climbing and vault with environmental contact. Render from side/front/back and compare against grounded reference. Reject visible deformation regardless of metrics.
7. Bake or transfer verified shapes to low-poly runtime mesh and retain high-density source. Do not reduce the pose range to make a test pass.

## V10 findings
The actual surface strain audit (v10-surface-strain-audit.json) reveals severe hip/abdomen compression even in a collision-free squat. Previous primary-ring distance checks were too narrow. The threshold in the audit is a diagnostic heuristic, not a biological rule. Existing screenshots show unacceptable silhouettes; the experimental V10 muscle proxy is not a production solution.
