# L2D 模块素材库｜放入文件就自动注册

这是**正式可部署的模块素材库**，不是临时网页草稿。每个人物一个目录：
`site/assets/l2d/library/<角色 ID>/module.json`。将完整模块提交 GitHub 后，现有 Pages 部署流水线会自动验证素材、生成游戏与工作室共用的角色目录，并发布。无需去编辑 `index.html`、人物下拉选项或 NPC 加载器。

> 角色 ID 为小写英数及短横线/下划线，例如 `char-006`。正式资源不得复用现有受保护的 `protagonist` 和 `char-002` ID；这两人的原 V4 和素材不被自动替换。必须先把新人物的真实美术和动画或网格一起准备好，不能只丢一张普通立绘冒充 L2D。

## 方式 A：已经做完的逐帧 L2D 动画

目录示例（文件名是**格式示例**，不是现成资源）：

```
site/assets/l2d/library/char-006/
├─ module.json
├─ front.png                 # 原尺寸人物静态定位图（必须为单帧）
├─ front.webp                # 已完成的逐帧透明 WebP 动画（多帧）
└─ front-source-parts.zip    # 可选：原始独立部件工程
```

`module.json`：

```json
{
  "schema": 1,
  "id": "char-006",
  "label": "新角色",
  "views": {
    "front": {
      "portrait": "front.png",
      "clip": {
        "type": "v4-webp",
        "file": "front.webp",
        "crop": {"x": 344, "y": 0, "w": 335, "h": 1024},
        "frames": 128,
        "fps": 20
      },
      "sourceParts": {
        "file": "front-source-parts.zip",
        "provenance": "original-psd"
      }
    }
  }
}
```

特别注意：`crop` 是游戏 1024 原位画布上的动画实际裁剪位置（不是人物移动坐标）；`w×h` **必须匹配** WebP 的实际像素尺寸。`frames` 必须与真实 WebP 动画帧数一致。若只有正面，只写 `front`，**绝对不伪造背面**。如果 ZIP 是从合成图片划分的区域，`provenance` 必须写 `derived-region`。

## 方式 B：可独立骨骼 / ArtMesh 变形的 L2D 模块

从工作室「逐件绑定」导出角色当前方向的 `paperchalk-part-rig-v1` JSON，必须配套**对应的真实原始部件 RGBA PNG**。只有 JSON 或只有合成图不能部署为真正独立 ArtMesh。

```
site/assets/l2d/library/char-007/
├─ module.json
├─ front.png                    # 人物静态预览定位
├─ front.rig.json               # 从同一角色/方向导出的真实 ArtMesh 绑定
└─ parts/
   ├─ back_hair.png             # 与 rig.parts 的 ID、w、h 一一对应
   ├─ skirt.png
   └─ ...                       # 所有实际部件，按原始图层顺序
```

```json
{
  "schema": 1,
  "id": "char-007",
  "label": "已绑定角色",
  "views": {
    "front": {
      "portrait": "front.png",
      "rig": {
        "type": "part-mesh",
        "file": "front.rig.json",
        "textures": {
          "back_hair": "parts/back_hair.png",
          "skirt": "parts/skirt.png"
        }
      }
    }
  }
}
```

`rig.parts` 须包含与 `textures` **完全一致**的每个 partId，保留原位 `x/y`、局部 `w/h`、轴点 `pivot`、末端 `tip`、网格与动画参数。自动校验图层纹理尺寸、RGBA 颜色通道、ID 和位置。底层按原始 JSON 的部件顺序独立绘制，绝不是将合成图统一摇晃。

## 最简单操作：工作室一键导出单 ZIP

**你不用自己挨个创建部件 PNG 文件或写 module.json。** 打开角色 L2D 工作室，选择已经导入原始独立部件的人物，在「逐件绑定」里完成各层网格参数，然后点 **「一键打包游戏模块 ZIP」**。网页会自动收集当前角色真正的正、反面独立部件、对应 Rig 数据、静态定位图，打包成 `新角色ID.zip`。它不会覆盖原先的女主 V4。

随后只要将这个 ZIP **上传到** `site/assets/l2d/inbox/` 并提交 GitHub，Pages 构建就会自动安装、校验并注册为游戏可选人物。详细说明在 [inbox/README.md](../inbox/README.md)。

请注意：女二目前仓库里只有从合成图划分的七块原画区域，**不是**真实 16 层 PSD。

- `scripts/build_char002_part_rig.py` 会将这 7 个保真区域建立为内部 `char-002-rig-v1` 的**有限独立网格**，经严格白名单自动绑定到原来唯一的 `char-002` 人物，不增加重复女二。可在原游戏里调节两手、肩、胯、胸部呼吸与裙摆。
- `head_hair` 仍是一张头部合成区域，**无法宣称刘海/后发独立飘动或独立眨眼**。没有原画遮挡补像素时，大角度变形可能暴露分区边界。正式 16 层 PSD/独立 PNG 到齐后才能完整升级。
- 女二原始正面 `front.png`、旧 128 帧 V4 和真实角色 ID 均不覆盖。这里的基础骨骼是可用的过渡模块，不是美术分层已完成的证明。

**全流程与验收规范**：[L2D 工作室唯一制作流程](../../../../docs/l2d/L2D_STUDIO_CANONICAL_WORKFLOW_20261103.md)。

## 自动化工作流

1. 新增完整人物模块目录 + `module.json` 并提交到主分支。
2. GitHub Actions 执行 `scripts/build_v4_assets.py`、`scripts/build_char002_v4.py`、`scripts/build_character_catalog.py`，最后一步会自动调用 `scripts/build_l2d_library.py`。
3. 模块检测器验证路径不能越界、素材不是损坏文件、多帧 V4 尺寸/帧数、ArtMesh 的逐层原始贴图、骨骼模型身份和部件数量。无效模块**直接使构建失败**，不会偷偷挂载损坏的人物。
4. 通过后自动编译 `site/l2d-library.generated.json` 和 `site/characters.catalog.json`，游戏 DEV 的「人物素材库」出现该角色，可选择映射为主角或 NPC；L2D 运行时自动区分 V4 和独立网格。
5. 工作室打开同一角色时自动找到模块里的源 ZIP 或网格 PNG 与绑定 JSON。保存的本机临时调整仍然保留在 IndexedDB，不会自动上传 GitHub；正式发布需要将导出的绑定 JSON + 对应纹理提交到此模块目录。
6. 女主角原 128 帧 V4 和用户的本机手工修改始终保留。**安装一个新模块 ≠ 自动覆盖女主或女二的正式美术。**

也可以命令行检查（本地需 Pillow）：

```bash
python3 scripts/build_character_catalog.py
```

游戏入口：<https://g2066203208-beep.github.io/paperchalk-world/?dev=1>

在线工作室：<https://g2066203208-beep.github.io/paperchalk-world/character-editor/>

重要限制：目前这套 `part-mesh` 是自研的原位独立网格格式，并不是 Live2D Cubism 的 `.moc3`；不能直接把 Cubism 模型文件放进目录而不转换。
