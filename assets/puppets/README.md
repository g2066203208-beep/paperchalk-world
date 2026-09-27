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

## AI 拆图接入

把 AI 或人工修补后的透明 PNG 放进角色目录，再运行：

```powershell
node tools/build_puppet_manifest.mjs `
  --input assets/puppets/player/layers `
  --output assets/puppets/player/manifest.json `
  --id paperchalk-player `
  --width 104 `
  --height 156
```

文件名就是角色部件名，前面的数字可用于表达绘制顺序，例如：
`02-backHair.png`、`12-body.png`、`20-face.png`、`30-frontHair.png`。
工具会根据部件角色生成 z 顺序和相对路径。生成后可以在 manifest 中微调
`anchor`、`offset`、`scale` 和 `physicsGain`，再通过 `?renderer=pixi` 检查动作。

建议至少拆出 `backHair`、`body`、`face`、`frontHair`；需要跑步和攻击时，
再拆出 `legLeft`、`legRight`、`arms`、`handwear` 和武器层。
