# V32 horror lighting

References: https://store.steampowered.com/app/1262350/SIGNALIS/ (dynamic lights/shadows, low-res 3D), https://store.steampowered.com/app/1848450/Nightmare_of_Decay/ (first-person horror materials), https://store.steampowered.com/app/963710/Lost_in_Vivo/ (claustrophobia, localized lights).

Integrated actual WebGL terrain fragment shader, CPU terrain shader approximation, weather control and lantern geometry. City atlas retains clean low-contrast clusters; added broad weathering. Existing character and trench meshes unchanged. Night preset is selectable and defaults on. Actual city generates 95 light anchors, nearest six selected. Local lights use analytic attenuation and specular, not occlusion-aware shadow maps. CPU approximates local lighting per triangle. The archived screenshot and ten-frame camera GIF were rendered independently from actual city geometry, atlas, and shared horror lighting function; AO/visibility and fog differ from browser output. They do not represent a browser capture or complete game FPS test.

Checks:
```json
{
  "verified": {
    "falloff": true,
    "outsideRadius": true,
    "wetHighlight": true,
    "heightFog": true,
    "finite": true,
    "lampCount": 95,
    "frames": 10
  },
  "samples": [
    {
      "distance": 0,
      "light": [
        1.9739484351537049,
        1.4298869984983713,
        0.9257845305461114
      ],
      "sheen": [
        1.1954049359045194,
        0.7650591589788924,
        0.3586214807713558
      ]
    },
    {
      "distance": 3,
      "light": [
        1.2412585956911437,
        0.960965501242332,
        0.705977578707343
      ],
      "sheen": [
        0.000369050635233685,
        0.0002361924065495584,
        0.00011071519057010549
      ]
    },
    {
      "distance": 6,
      "light": [
        0.4889172939756215,
        0.4794670681443978,
        0.48027518819268644
      ],
      "sheen": [
        2.2425222337973288e-8,
        1.4352142296302905e-8,
        6.727566701391986e-9
      ]
    },
    {
      "distance": 9,
      "light": [
        0.23802960124718958,
        0.3188989447982014,
        0.40500888037415683
      ],
      "sheen": [
        3.994299318760523e-12,
        2.556351564006735e-12,
        1.198289795628157e-12
      ]
    },
    {
      "distance": 13,
      "light": [
        0.21600000000000003,
        0.30480000000000007,
        0.3984
      ],
      "sheen": [
        0,
        0,
        0
      ]
    }
  ],
  "fog": [
    [
      2,
      0.062370127438687195,
      0.031829660127289605
    ],
    [
      15,
      0.3830701766264525,
      0.21541806647916217
    ],
    [
      45,
      0.7651950242938597,
      0.5170358325155213
    ],
    [
      90,
      0.9448666233836388,
      0.7667456129260245
    ]
  ]
}
```

JS module syntax passed. Chromium headless test did not expose WebGL or WebGL2 contexts in the current environment; shader compile/link and full live browser testing remain unverified. No measured FPS. Need stronger wet reflections, local light occlusion, and authored material/prop details before visual acceptance.
