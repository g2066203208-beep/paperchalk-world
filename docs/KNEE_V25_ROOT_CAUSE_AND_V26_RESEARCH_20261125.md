# V25 failure audit and V26 deformation research (2026-11-25)

Status: research and code audit only. V26 not implemented; V25 is NOT visually accepted. Preserve the approved neutral body and symmetric quad topology.

## Verified V25 implementation
Source: site/card-battle/lowpoly-studio/knee-v25.html at 7308fc20471d082ced7d5afaed081b1b14b8ba3b.
Browser screenshots and report: branch knee-v25-browser-review, run 45449228336. Single-leg test: 1302 quads; dense full working mesh: 9696 quads. Public HTTP 200 was recorded separately from file:// Chromium interaction. No full-character or collision acceptance.

- bind(): uses y=0.918 as knee center, a longitudinal transition from y=1.075 to 0.8, with z-based patella mask and neighbor weight smoothing. It is not an anatomical soft-tissue segmentation. Rigid cores already exist in V25; do not falsely claim all vertices bend.
- pose(): fixed rotation center (y=0.918,z=-0.075), dy=dz=0, patella half-angle and heuristic radial slide. 75% position blend + 25% rotation interpolation for vertices where patella weight=0. This is not genuine dual-quaternion skinning. For equal thigh/shin weights and zero patella influence, the pre-correction radial scale in the bending plane is 0.25+0.75*cos(theta/2), about 0.780 at 90 and 0.476 at 145 degrees. This is a theoretical local example, not a measured calf cross-section.
- correct(): 45 iterations of edge/diagonal distance clamping, target bounds 0.5 to 1.9 times rest lengths, 0.02 attraction back to the initial skinned pose. No anatomical collision proxies, actual self-collision, volume, contact surface, fold orientation, or tissue material constraints. Edge distance alone cannot prescribe a bone-supported knee silhouette. It also encourages the original erroneous pose.
- Source stats min/max edge ratios: 0° 1/1; 45° .888/1.876; 90° .631/1.984; 120° .499/2.231; 145° .497/2.420. Not a proof of self-intersection. Visual screenshots show rubber-like joint.

## References and implications
1. Lewis et al. 2000, PSD: https://doi.org/10.1145/344779.344862
2. Autodesk Pose Editor: https://help.autodesk.com/cloudhelp/2022/ENU/Maya-CharacterAnimation/files/GUID-00699C13-8CA1-450C-937D-57C7B3DFD8C6.htm
3. Autodesk post-skinning tangent/transform-space correctives: https://help.autodesk.com/cloudhelp/ENU/MayaCRE-CharacterAnimation/files/GUID-B8755F24-7C24-4066-B6F8-2DE6954DC2BF.htm
4. Epic Pose Driver RBF: https://dev.epicgames.com/documentation/unreal-engine/pose-driver?application_version=4.27&lang=en-US
5. Blender corrective shapes: https://docs.blender.org/manual/en/4.0/addons/animation/corrective_shape_keys.html
6. libigl DQS and ARAP: https://github.com/libigl/libigl.github.io/blob/docs/docs/tutorial.md
7. Le & Hodgins 2016 optimized centers of rotation: https://graphics.cs.cmu.edu/?p=1436
8. Vaillant et al. 2013 implicit skinning/contact: https://rodolphe-vaillant.fr/entry/31/implicit-skinning-real-time-skin-deformation-with-contact-modeli
9. Vaillant et al. 2014 elastic implicit skinning with extreme bend contact, fixes limitations of the 2013 method: https://rodolphe-vaillant.fr/entry/59/elastic-implicit-skinning-a-robust-iso-surface-tracking-for-inte
10. McAdams et al. 2011 Disney elasticity, internal rigid bone collision geometry and soft tissue: https://media.disneyanimation.com/uploads/production/publication_asset/18/asset/elasticSkinning.pdf (Fig. 8 contrasts rubber-like vs bone-supported elbow; offline/near-interactive, not direct game FPS)
11. XPBD volume and SDF collision implementation: https://github.com/InteractiveComputerGraphics/PositionBasedDynamics
12. Patellofemoral kinematics review: https://pmc.ncbi.nlm.nih.gov/articles/PMC6451817/ — patella tracks trochlear groove, flexion lags tibiofemoral flexion; no universal deep flexion curve.
13. Deep flexion thigh-calf contact measurements: https://pubmed.ncbi.nlm.nih.gov/17512647/ — generally observed beyond ~130° in this cohort; onset varies with morphology, not a universal threshold.
14. OpenSim lower extremity model: https://opensimconfluence.atlassian.net/wiki/spaces/OpenSim24/pages/54001812/Lower%2BExtremity%2BModel%2B2010 — flexion-dependent translations and patellar couplers; documented 0–100° range, do not blindly extrapolate.

## V26 proposed controlled comparisons, no overwrite of V25 or approved neutral body
A. Establish local femur/tibia/patella bone proxies and measured joint-center trajectory; verify flexion direction, neutral geometry, rest transforms; rigid core distance invariance. Anatomical anterior/posterior/lateral masks, not y-only. Patella bone motion driven by flexion curve and collision geometry.
B. Compare true DQS or optimized rotation centers with V25 using identical topology, angle, camera, lighting. Do not treat basic skinning as final.
C. Construct and visually verify high-resolution corrective target shapes at 0, 30, 60, 90, 120, 135, 145 degrees, in joint-local space. Use anatomically informed bone support, posterior compression/contact, tangential skin sliding, calf/thigh volume preservation. Compare PSD vs implicit-contact pipeline vs volumetric XPBD offline solver. FEM optional as reference generator. Use actual original vertex IDs, no remeshing between targets. Keep all neutral and rigid core deltas zero.
D. If offline contact solver generates plausible shapes, bake corrected per-vertex local deltas and interpolate for game runtime. Recheck intermediate angles and reversibility, contacts depend on pose/loading; avoid assuming simple angle-only correction handles arbitrary full body poses.
E. Tests: exact neutral recovery and mirror symmetry, core rigid pair distance, local cross-section and closed region volume where applicable, edge strain per anatomical zone, nonadjacent triangle self-intersection, signed contact gaps, inversion/orientation audit in local frames, silhouette vs anatomy references. No fabricated pass thresholds; set and justify tolerances before acceptance. Render front/side/three-quarter, zoomed knee, wire, weight, bone overlay, contact map, actual crouch/kneel/run/climb on full figure. Use same exact source and camera for comparisons. Maintain high-resolution authoring, then transfer skin weights and correctives to reduced quad-based game mesh and retest.
F. GitHub Pages HTTP 200 plus actual deployed-page interaction, no console errors and screenshot evidence; passing network tests is not visual acceptance.
