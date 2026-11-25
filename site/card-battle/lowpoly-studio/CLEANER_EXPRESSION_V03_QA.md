# Cleaner V03 expression review

Reference: https://area.autodesk.jp/column/tutorial/maya-lowpoly/06-facial/ and user-specified Esukevi GIF. V07 geometry source preserved. Fixed hand-authored pixel cels (9 eye, 12 mouth) sampled independently into existing UV texture, nearest-neighbor. Not separate eye/mouth meshes; no changes to V07 topology. Head tilt reduced for yawn and head weight transition tightened; no physics or collision audit. Text speech is approximate, not real phoneme alignment.

QA: JS syntax; 18 modes sampled every 0.025s; 8 software-rendered frames using actual original model and decoded original facial PNG, actual renderer with a canvas adapter. Browser UI and live deployment not tested. Visual review sheet: cleaner-expression-v03-review.png. Frames left-to-right top then bottom: idle, open (blink setup), smile, yawn, look, talk, sleep, annoyed.

[
  {
    "mode": "idle",
    "t": 0.5,
    "frames": {
      "left": "closed",
      "right": "closed",
      "mouth": "rest"
    },
    "vertices": 1471,
    "finite": true
  },
  {
    "mode": "blink",
    "t": 0.3,
    "frames": {
      "left": "open",
      "right": "open",
      "mouth": "rest"
    },
    "vertices": 1471,
    "finite": true
  },
  {
    "mode": "smile",
    "t": 1.5,
    "frames": {
      "left": "happy",
      "right": "happy",
      "mouth": "grin"
    },
    "vertices": 1471,
    "finite": true
  },
  {
    "mode": "yawn",
    "t": 2,
    "frames": {
      "left": "closed",
      "right": "closed",
      "mouth": "yawn"
    },
    "vertices": 1471,
    "finite": true
  },
  {
    "mode": "look",
    "t": 1.2,
    "frames": {
      "left": "left",
      "right": "left",
      "mouth": "rest"
    },
    "vertices": 1471,
    "finite": true
  },
  {
    "mode": "talk",
    "t": 0.095,
    "frames": {
      "left": "sleepy",
      "right": "sleepy",
      "mouth": "A"
    },
    "vertices": 1471,
    "finite": true
  },
  {
    "mode": "sleep",
    "t": 3,
    "frames": {
      "left": "closed",
      "right": "closed",
      "mouth": "small"
    },
    "vertices": 1471,
    "finite": true
  },
  {
    "mode": "annoyed",
    "t": 1.2,
    "frames": {
      "left": "annoyed",
      "right": "annoyed",
      "mouth": "pout"
    },
    "vertices": 1471,
    "finite": true
  }
]
