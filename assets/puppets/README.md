# Paper Puppet runtime assets

This folder is the runtime handoff point between character authoring and Paperchalk World.

- Current `player/manifest.json` uses `kind: "card"` so the existing player art works immediately.
- A See-Through / Auto-live2D character can later use `kind: "layered"` with transparent PNG layers.
- Game simulation, collision, dialogue and combat do not depend on the art format.

Layer roles understood by the runtime include:
`backHair`, `frontHair`, `sideHair`, `midHair`, `ahoge`, `face`, `eyes`, `eyewhite`, `irides`, `eyelash`, `eyebrow`, `mouth`, `nose`, `ears`, `headwear`, `neck`, `neckwear`, `topwear`, `body`, `handwear`, `bottomwear`, `skirt`, `legLeft`, `legRight`.

Example layered manifest:

```json
{
  "version": 1,
  "id": "npc-example",
  "kind": "layered",
  "layers": [
    {"id":"back-hair","role":"backHair","src":"./back-hair.webp","z":2,"anchor":[0.5,0.12]},
    {"id":"body","role":"topwear","src":"./topwear.webp","z":12,"anchor":[0.5,1]},
    {"id":"face","role":"face","src":"./face.webp","z":20,"anchor":[0.5,0.82]},
    {"id":"front-hair","role":"frontHair","src":"./front-hair.webp","z":30,"anchor":[0.5,0.14]}
  ]
}
```

The role names intentionally follow the same semantic split used by See-Through / Auto-live2D-style PSD workflows.
