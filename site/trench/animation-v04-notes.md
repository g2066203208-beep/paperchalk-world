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

## Updated checks
After refining carry and aim, 648 pose samples had max bone-length error 2.22e-16 and wrist-target residual 6.21e-17, max ankle-target residual 0.00181. Minimum body Y equals rest floor. Actual textured animation rendered offline in 48 frames. Full JavaScript loop run against a mock DOM and WebGL API with bounds checks: {"frames":213,"draws":1278,"subUploads":426,"fullDraws":213,"firstDraws":213,"errors":[],"states":[{"x":-8,"z":-27.85,"pitch":-0.09,"animWalk":0,"animCrouch":0,"animAim":0},{"x":-2.316553000000004,"z":-27.85,"pitch":-0.09,"animWalk":0.9999999890912432,"animCrouch":0,"animAim":0},{"x":-2.316553000000004,"z":-27.85,"pitch":-0.09,"animWalk":0.0012724641142637958,"animCrouch":0,"animAim":0.9902103339959867},{"x":-2.316553000000004,"z":-27.85,"pitch":-0.09,"animWalk":0.0000016191649397522263,"animCrouch":0.9987275358718554,"animAim":0.9999747494044451},{"x":-2.316553000000004,"z":-27.85,"pitch":-1.32,"animWalk":7.036744540884902e-7,"animCrouch":0.9994469985862859,"animAim":0.9999882642026925}],"exitPassed":true}. Not a GPU or live browser test; actual hand surface/prop and elbow clipping, gait appearance and performance still need visual validation.
