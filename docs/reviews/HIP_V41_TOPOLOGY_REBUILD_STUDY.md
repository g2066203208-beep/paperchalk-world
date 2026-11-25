# Hip topology study — V41 rejected; V42 design gate
2026-11-25. Research only; do not modify the current model until a distinct topology patch is designed and visually checked.

## Evidence from current mesh
The two 8-edge proximal thigh loops share the two-edge center path 147–163–153. The pelvis boundary has 12 edges. V41 retains V37 connectivity; it moved 101 coarse vertices, but did not increase or reroute the center bridge. Existing serial 8-edge rings are not a separate anatomical gluteal flow. A neutral contour adjustment is not retopology. Current center-path neighbors: [{"id":147,"neighbors":[148,533,158,545,163,560]},{"id":163,"neighbors":[551,147,153,567]},{"id":153,"neighbors":[538,152,154,550,163,566]}]. Nonmanifold/face orientation checks alone are not anatomy or deformation validation.

## Sources and application
- https://www.cs22.space/tutorial-humanoid-model : create the central front-to-back bridge and shape leg openings; outer proximal leg rim is higher than the medial rim.
- https://www.ucbugg.com/labs/modeling/organic-modeling-human : open both hip sockets and connect lower torso with a bridge, shape this saddle, attach limbs after.
- https://codernunk.com/tutorials/complete-3d-character-guide/ : section Crotch, Legs and Knees describes a ten-vertex leg opening after adding bridge divisions, round opening before extrusion.
- https://thundercloudstudio.artstation.com/blog/G980G/topology-for-low-poly-game-characters-essential-tips-and-tricks-part-2 : dedicated groin stretch and gluteal support loops; front/back leg movement and lateral stretching matter.
- https://polycount.com/discussion/204230/is-this-a-good-female-body-topology-for-posing-animation : front loops higher and arched; rear supporting loops lower near gluteal fold; not all source user-submitted examples are approved.
- https://www.3dfiggins.com/writeups/paintingWeights/ : regularly spaced spans in deformation regions facilitate normalized skinning.
- https://moridin.com/tutorials/wiro/female_body/index6.php : model central bridge, match leg and torso boundaries, route loop around lower glute.
- https://www.youtube.com/watch?v=PTWV67qUX2k : index 09:51 pelvis, 11:47 legs, 1:02:10 hip deformation; video frames not reviewed.

## Next experiment, not an approved model
Maintain V37 outside hips, flat per-quad shading. Rebuild actual face adjacency. With a fixed 12-edge waist boundary and symmetric leg openings, 10 edges per proximal opening yield four shared bridge edges (2*10=12+2*4); use an all-quad 10-to-8 transition before frozen lower thigh. This is a candidate combinatorial budget, not a guarantee of quality. Establish curved front-to-back saddle, higher lateral hip rim, distinct anterior groin and posterior gluteal fold flow. Keep rear volume and anterior contour distinct. Avoid concentrated poles at the inner fold; do not merely interpolate horizontal rings. Preserve 606/2424 targets if feasible, disclose any count change rather than destroying important loops.
Inspect neutral front, side, rear, underside and wireframe first. Then flex, extension, abduction, unilateral/bilateral, and squat; preserve rigid distal thigh and verified V37 joints. Track mesh integrity, self-intersection, symmetry, fold silhouette, strain, and glute/abdomen motion; only visual review can confirm acceptance.
