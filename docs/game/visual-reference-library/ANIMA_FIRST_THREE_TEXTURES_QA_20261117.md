# 2026-11-17 Anima 素材真实验收：首批三张石墙/砖石/污渍图

**基于用户在当前聊天中实际上传的三张 PNG 实图，1024×1024。** 数据由逐像素读取 alpha、边缘 RGB 和内容分布计算得到；不是对提示词的猜测。

> **重要版权/文件事实：** 本页已经入 GitHub，但三张原始 PNG 目前仍保存在当前聊天附件中，**没有通过 GitHub 工具把二进制源图上传**。为了让后续聊天有可追溯来源，记录顺序、SHA256、分辨率、像素诊断与继续加工指令；后续真正入素材库要另行提交原图或处理成品，不能把“已写报告”冒充“图片已入库”。

## 三张画的识别、存档身份与数据检测

| 顺序 | 提交图片特征 | 意图槽 / 推荐处理 | 尺寸 | PNG 像素全不透明比例 | 全图近白区域比例 | 左右首末列 RGB 差 (平均) | 上下首末行 RGB 差 | 验收 |
|---|---|---|---|---|---|---|---|---|
| 1 | 黄褐与灰蓝灰泥、横竖刮擦笔触的**交错石砖墙面** | `HALL-01` 墙基础纹理候选 | 1024×1024 | 100% | 9.31% | 0.34 | 0.16 | *视觉候选，未通过无缝验收* |
| 2 | 2 列×4 行、灰/黄/蓝绿等 8 块独立石材色板 | **多材质色板 atlas**，不当做 HALL-02 无缝地砖 | 1024×1024 | 100% | 0.04% | 64.86 | 90.85 | *可裁为 8 个独立石材色片，不适合整图 repeat* |
| 3 | 几个不规则的黄灰粉尘污渍斑团，散点在白底 | `HALL-05` / `wall_grime` 污渍 decal 候选 | 1024×1024 | 100% | 49.67% | 5.54 | 4.49 | *需要建立真 alpha；不能直接乘白底* |

SHA256：
- 图1：`95f49d180ae6567dc5c63f633ed09651b2fdace3ca38c504c26ad5b864dc23ae`
- 图2：`d85c82d9778504d770e78da42628574986e6e8aeccb679dcc639070e390150f6`
- 图3：`30ce1f7c0043d7fde2f4b5fe89312d1a0ded95b326f9cf8b5ff6af5fe78ddfd8`

**误判警示**：图1 边缘差 0.34/0.16 非常小，是因为四周存在广泛亮白区域，**绝不证明无缝**；把图片 2×2、3×3 平铺进行目视检测才能看到亮白接缝是否明显。图2 只适合作为色板/atlas 使用，重复整图会出现很粗的边界。图3 白底 Alpha 值都是 255，必须转为带连续灰度透明的 RGBA 叠加层后再使用。

## 与现有 Three.js Demo 的具体关联

- 墙面材质：`site/card-battle/engine/anima-paintover-lab.js` 的 `paintLayer("wall",434)` 目前动态程序生成单独的 `base, grime, wet, growth, ink` 五个 Canvas。
- 地面：`paintLayer("floor",9325)`，图2 是 8 张单砖色块 atlas，不能直接赋给重复 UV；应该从 8 格中提取独立 tile，再由程序切到不同 mesh faces 或随机选 atlas UV。必须避免 tile 之间串色与缝。
- 污渍：`grime` 图层需要真正 PNG Alpha 透明。将图3 白色背景从 Alpha 中去掉，并使用 soft mask 接缝衰减；保留灰黄颗粒和刮擦边缘。
- 游戏相机、灯光、AO 和 ShadowMap 继续由 Three.js 掌控；Anima 素材不负责制作整个场景、角色、光束和固定阴影。
- 在白模/合成图相同机位保存截图和录屏，再调整每层权重，并检查相机旋转下的接缝。不要将未经验证的用户图覆盖原有已成功版本。

## 需要修订的 Anima 生成策略

1. **图1 墙体主纹理：** AI 经常理解 `wall texture` 为由单个独立石块拼接的“素材画板”，边缘自带白色缝。重新提示“full-bleed edge-to-edge surface only, no white background, no empty gaps, four edges connect continuously, truly seamless repeating stone mortar surface, every square millimeter belongs to the wall texture, no sticker silhouette”。即使这么写，仍要运行 3×3 tile 验证。
2. **图2 真地面：** 如果想用真实的 3D 地砖 UV，必须生成一个**真正连续的俯视平铺地面**。如果想使用这 8 块独立“色片”，正确资产类型是 `stone_tile_atlas`，必须在元数据里标注 `atlasGrid:[2,4]`，UV 按 tile 隔开采样，不能谎报为 seamless。
3. **图3 污渍：** 如果 Anima 只给白底，不要把 RGB 的白色像素当作浅色贴花。生成完成后执行 `alpha = 255 × (1 - smoothstep(nearWhiteThreshold, white, RGB_luminance))`，先做渐进边缘/去白 fringe；颜色要保留原灰/赭黄，但对灰尘本身细白笔触区域须人工核对，避免把想要的高光也删了。

### 修正用正面提示词（重点是结构，不重新写整个图画）

**HALL-01**:
```text
masterpiece, best quality, highres,
one perfectly flat tileable wall material texture, full bleed from corner to corner,
contiguous old limestone and mineral mortar surface, continuously linked painted stonework,
muted cold slate-grey and weathered sandy ochre pigment, delicate dry-brush grain,
gouache and worn-oil painterly texture, consistent stone scale, neutral diffuse albedo,
orthographic front-facing texture map, four edges connect without discontinuity,
no blank paper, no white gaps, no isolated stickers, no picture frame,
no vignette, no architectural props, no cast shadow, no perspective
```

**HALL-02（如果要单张平铺地砖，而不是 8 格 atlas）**:
```text
masterpiece, best quality, highres,
seamless orthographic overhead paving texture, weathered broad limestone flagstones,
staggered naturally repeating running-bond brick geometry, thin uninterrupted mortar,
surface spans the entire canvas with absolutely no white borders or sample-grid separators,
cool grey olive and sandy muted earth ochre, each stone painted with irregular tiny horizontal brush marks,
uniform stone dimensions, no gap outside the material, soft neutral flat illumination,
full bleed, continuous texture on all four canvas edges, no 2x4 swatch grid,
no stone tiles presented separately, no perspective, no floor objects
```

**HALL-05**:
```text
masterpiece, best quality, highres,
scattered isolated irregular dry-brushed old wall dust, soot and pale ochre grime stains,
subtle grey-brown dusty pigment islands, feathered translucent edges, soft uneven opacity,
randomly sized spots and fine speckles, abundant truly transparent space between stains,
ONLY the floating dirt overlay, transparent alpha background with absolutely no white sheet,
no wall material, no bricks, no rectangular backing card, no shadow, no typography
```

## 引擎验证约定

- HALL-01 和 HALL-02 必须展示 **3×3 重复**可见图，不能只看单张。
- HALL-05 必须展示 **棋盘格透明验证**，输出每张图真实 alpha 的统计与蒙版强度热图。
- 处理图必须保留独立 source PNG，另存 cleaned PNG；严禁直接修改用户上传原画。
- 未提供新 Anima PNG 时，下一个聊天应先读取本 QA 文件和 prompt library，而不是重新搜索和猜用户希望的材质。
