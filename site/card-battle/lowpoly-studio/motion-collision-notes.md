# V46 motion collision audit 01

FAIL — do not promote to base body or fit garments yet.

82 sampled poses per topology: walk and bend, 41 samples each. Static rest has no detected strict noncoplanar intersections or degenerate triangles. Nonadjacent triangles checked by AABB broad phase and strict edge-triangle interior tests; shared vertex triangles and coplanar contacts excluded. Fold warning = negative dot of two constituent triangle normals in a quad (angle >90°), not proof of orientation inversion. No continuous-time guarantee. Ears, clothing and hair excluded from this body-only audit. Knee strain is not a confirmed collision or fold. Actual intersection at axilla (source faces 138/139/406 and 196/197/407); fold warnings in inner upper thighs (260/267/335/342). Unsuccessful weight trials not published. Frozen base and motion code unchanged.

{
  "original": {
    "samples": 82,
    "intersectionSamples": 10,
    "foldSamples": 41,
    "maxPairs": 2,
    "maxFolds": 2,
    "zeroAreaSamples": 0
  },
  "refined": {
    "samples": 82,
    "intersectionSamples": 10,
    "foldSamples": 41,
    "maxPairs": 2,
    "maxFolds": 4,
    "zeroAreaSamples": 0
  }
}