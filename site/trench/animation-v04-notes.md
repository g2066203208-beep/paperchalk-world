# V04 procedural animation prototype

Existing V11 rest geometry and pixel-v01 UVs retained. Original rifle rigidly transformed as game art. Two-bone analytic IK, blended knee/shoulder/elbow regions, original glove vertices, cyclic walk, crouch, raise/aim and pitch-follow transitions. Both view passes use identical deformed vertices. No shooting implementation. Tests sample 120 poses, finite coordinates, fixed segment lengths, rigid prop distances; wrist reach residual and floor clipping remain to review. No verified live browser or visual playback yet. 

[
  {
    "label": "idle",
    "segmentError": 1.6653345369377348e-16,
    "minY": 0.3051397664246103,
    "maxWrist": 0.1331552094545964,
    "maxFoot": 0.0018001350094824509,
    "propError": 4.163336342344337e-17
  },
  {
    "label": "walk",
    "segmentError": 1.6653345369377348e-16,
    "minY": 0.3033431245877311,
    "maxWrist": 0.13978875071587635,
    "maxFoot": 0.0018001350094824509,
    "propError": 1.942890293094024e-16
  },
  {
    "label": "crouch",
    "segmentError": 1.1102230246251565e-16,
    "minY": 0.3033431245877312,
    "maxWrist": 0.1331552094545967,
    "maxFoot": 5.551115123125783e-17,
    "propError": 4.163336342344337e-17
  },
  {
    "label": "aim",
    "segmentError": 1.1102230246251565e-16,
    "minY": 0.3051397664246103,
    "maxWrist": 1.3877787807814457e-17,
    "maxFoot": 0.0018001350094824509,
    "propError": 5.551115123125783e-17
  },
  {
    "label": "movingAim",
    "segmentError": 1.6653345369377348e-16,
    "minY": 0.3033431245877311,
    "maxWrist": 6.938893903907228e-17,
    "maxFoot": 0.0018001350094824509,
    "propError": 1.3877787807814457e-16
  }
]