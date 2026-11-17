# 褪色的会客厅 — Anima 独立素材提示词全库（v1.0）

**记录日期：** 2026-11-17。**对应实机：** `site/card-battle/anima-paintover-lab.html`；`site/card-battle/engine/anima-paintover-lab.js`。本文件的英文描述是**待生成的原创生产提示词**，不是已经生成的素材或原版游戏提示词。

## 使用前说明

- 以已经写入游戏的白膜几何为准，**只出单种独立元素**，绝不能让 Anima 画整面墙+人物+窗+场景的大合图。
- 输出前缀 `masterpiece, best quality, highres` 已写在各正面提示词开头；不要重复增加有矛盾的风格词。建议不要给环境材质套强人脸 LoRA，避免生成出人物/过度动漫式硬轮廓。
- 本项目目标为**低饱和、旧欧洲建筑、精细油画/水粉干笔的 2D 素材质感**，实际空间体积、镜头和灯光仍由 Three.js 构建。
- **BASE** 是不透明正交无透视的素材，要能四边循环；**OVERLAY** 是独立透明颜色斑块；**SPRITE/PROP** 是完整的单件透明剪片；**ARCHITECTURAL** 是贴在已有三维模型上的平面雕花，别画另一整栋建筑。
- Anima 对严格无缝拼接与真正 Alpha PNG 并不总是可靠。必须检查四边 seam、Alpha 通道、主体是否出界；如果只给浅白底，后处理扣图并标为非原生透明，避免污染贴图边缘。
- 如果使用 LoRA：只使用已在当前 Anima 环境中确认安装的 LoRA；不要把现有人物专用 LoRA 权重强行固定给建筑环境。统一负面提示词在文末。
- **首批生产优先顺序**：HALL-01、02、03（基础材质）→ HALL-05、06、07、08（四组局部蒙版）→ HALL-14、15（前景剪片）→ HALL-09–13、16–18（装饰材质）。

## 素材清单与目标槽

| ID | 资产名 | 组 | 像素尺寸 | 交付 | 接入点 | 优先级 |
|---|---|---|---|---|---|---|
| HALL-01 | 风化石墙基础纹理 | BASE | 1024×1024 | square seamless opaque | `wallPaint / stone walls and columns` | P0 |
| HALL-02 | 老旧石砖地面 | BASE | 1024×1024 | square seamless opaque | `floorPaint / walkable surfaces and stair treads` | P0 |
| HALL-03 | 深褐老木材主纹理 | BASE | 1024×1024 | square seamless opaque | `woodPaint / door and sideboard` | P0 |
| HALL-04 | 脱落灰泥底纹 | BASE | 1024×1024 | square seamless opaque | `optional wallPaint variant / plaster wall` | P1 |
| HALL-05 | 浮灰油污覆盖层 | OVERLAY | 1024×1024 | square alpha overlay | `grime weight / stone and plaster only` | P0 |
| HALL-06 | 潮湿渗水覆盖层 | OVERLAY | 1024×1024 | square alpha overlay | `wet weight / base of stone walls and ground` | P0 |
| HALL-07 | 苔藓色斑覆盖层 | OVERLAY | 1024×1024 | square alpha overlay | `growth weight / wall footing and stone pillars` | P0 |
| HALL-08 | 裂纹与干笔边缘 | OVERLAY | 1024×1024 | square alpha overlay | `ink weight / wall rough paint edge accents` | P0 |
| HALL-09 | 尖拱门石雕贴面 | ARCHITECTURAL | 1024×1536 | vertical alpha front-on | `door arch geometry / back wall` | P1 |
| HALL-10 | 石柱表面雕纹 | ARCHITECTURAL | 768×1536 | vertical alpha front-on | `pillars / vertical plane or UV label` | P1 |
| HALL-11 | 老木门雕花门板 | ARCHITECTURAL | 1024×1536 | vertical alpha front-on | `wooden door existing 3D block` | P1 |
| HALL-12 | 古典彩窗玻璃花纹 | ARCHITECTURAL | 1024×1536 | vertical alpha front-on | `existing glass and mullion 3D geometry` | P1 |
| HALL-13 | 旧天鹅绒垂布 | SPRITE | 1024×1536 | vertical alpha sprite | `foreground cloth world card` | P1 |
| HALL-14 | 一条垂落藤蔓 | SPRITE | 1024×1536 | vertical alpha sprite | `foreground vines and wall foliage` | P0 |
| HALL-15 | 前景一丛植物叶片 | SPRITE | 1024×1536 | vertical alpha sprite | `camera-near foreground leaf card` | P0 |
| HALL-16 | 古典小木柜雕饰面 | ARCHITECTURAL | 1024×1024 | square alpha front-on | `sideboard 3D mesh front` | P2 |
| HALL-17 | 铜质古灯罩 | PROP | 1024×1024 | square alpha single prop | `existing 3D lamp at (3.45,6.5,-3.9)` | P2 |
| HALL-18 | 地面碎石独立素材 | PROP | 1024×1024 | square alpha single decal | `small stone debris world-space floor` | P2 |

## 可直接复制到 Anima 的独立完整正面提示词

### HALL-01 · 风化石墙基础纹理

- **画幅：** `1024×1024`；**画面输出：** `square seamless opaque`；**程序接法：** UV repeat / base；**目标：** `wallPaint / stone walls and columns`。
- **制作验收：** 四边拼接，不能有斜透视或完整墙面/窗/门；不画明暗聚光。

```text
masterpiece, best quality, highres, a single flat seamless hand-painted limestone wall texture tile, aged European manor limestone, faded grey ochre and cool sage stone, delicate mineral pigment variation, subtle chalky dry brush strokes, occasional tiny worn marks, subdued painterly gouache and oil texture, soft natural material variation across the entire surface, evenly detailed from edge to edge, neutral diffuse lighting, top-down flat texture scan, uniform scale, straight-on orthographic surface view, perfectly square texture sample, seamless repeating pattern, no central subject, no visible border, no horizon, no architectural features, texture only
```

### HALL-02 · 老旧石砖地面

- **画幅：** `1024×1024`；**画面输出：** `square seamless opaque`；**程序接法：** UV repeat / base；**目标：** `floorPaint / walkable surfaces and stair treads`。
- **制作验收：** 绝对俯视，不要画斜地砖视角；石砖之间缝大小一致，做平铺测试。

```text
masterpiece, best quality, highres, a seamless square hand-painted flagstone floor texture, viewed perfectly from directly overhead, old broad rectangular limestone paving stones in a staggered running bond pattern, irregular hand-worn softened edges, narrow dark mortar gaps, muted charcoal teal, grey olive and warm dusted stone, tactile brushed pigment and tiny chips, visual rhythm of medium-sized slabs, restrained uneven stone tone, soft diffuse neutral shading, consistent realistic size across the image, seamless repeat at every edge, pure flat orthographic material sample, texture only, no perspective, no cast shadows, no objects, no furniture, no border
```

### HALL-03 · 深褐老木材主纹理

- **画幅：** `1024×1024`；**画面输出：** `square seamless opaque`；**程序接法：** UV repeat / base；**目标：** `woodPaint / door and sideboard`。
- **制作验收：** 只画木料，不能带门、桌脚、锁孔。

```text
masterpiece, best quality, highres, a single seamless flat material sample of old walnut oak wooden boards, narrow straight vertical grain, faded smoked brown and muted umber, very fine visible carved fibers and varnish wear, gentle desaturated copper-toned brushstroke highlights embedded into wood grain, aged elegant European interior wood with subtle tiny scratches, hand-painted painterly material texture, orthographic front facing, completely flat, consistent grain size and color throughout, low-contrast neutral diffuse illumination, texture only, no door handles, no furniture silhouettes, no frame, no perspective, seamlessly repeatable on all sides
```

### HALL-04 · 脱落灰泥底纹

- **画幅：** `1024×1024`；**画面输出：** `square seamless opaque`；**程序接法：** UV repeat / base；**目标：** `optional wallPaint variant / plaster wall`。
- **制作验收：** 做第二套墙面底色，不能把具体位置污渍画死。

```text
masterpiece, best quality, highres, seamless square flat hand-painted worn chalk plaster wall material, old European interior faded linen grey, pale mineral cream, cool desaturated mushroom and ash undertones, extremely subtle layered painterly washes, soft pigment clouds, delicate powdery texture, scattered tiny aged speckles, occasional nearly invisible fine hairline abrasions, even surface frequency, muted low saturation, orthographic texture scan under neutral diffuse light, edge-to-edge painting, seamless repeat in all directions, material only, no architectural structures, no window, no moldings, no vignette, no perspective
```

### HALL-05 · 浮灰油污覆盖层

- **画幅：** `1024×1024`；**画面输出：** `square alpha overlay`；**程序接法：** multiply with alpha mask；**目标：** `grime weight / stone and plaster only`。
- **制作验收：** 仅脏污，背景务必真透明；覆盖率约30%，不能整张变黑。

```text
masterpiece, best quality, highres, a single isolated transparent overlay of aged surface grime and dusty soot, irregular scattered smoky grey-brown deposits, softly diffused mineral stain islands, dusty residue at random sizes, porous edges, thin hand-painted pigments with very different levels of opacity, sparse patches with large clear empty areas between stains, detailed delicate grunge texture, painterly dry-brush texture only, absolutely no solid wall material behind the grime, no bricks, no furniture, no room, transparent empty background, centered distribution suitable for a wall decal sheet, orthographic flat view, no baked cast shadow, no border
```

### HALL-06 · 潮湿渗水覆盖层

- **画幅：** `1024×1024`；**画面输出：** `square alpha overlay`；**程序接法：** tint + roughness modulation using alpha；**目标：** `wet weight / base of stone walls and ground`。
- **制作验收：** 只负责水迹分布，真实高光/roughness由程序计算，不能在贴图里画死反光。

```text
masterpiece, best quality, highres, transparent standalone hand-painted dampness marks, subtle dark blue-green translucent water seepage streaks on old stone, a handful of irregular vertical drips, soft edge diffusion into transparent emptiness, scattered thin mineral water marks, mild stains concentrated toward the bottom half, painterly washes, faint oxidized blue slate pigment, soft organic transitions and varying transparency, large uninterrupted transparent negative space, texture overlay only, orthographic flat surface detail, no painted wall, no bricks, no architecture, no light beam, no glossy floor reflection, no border
```

### HALL-07 · 苔藓色斑覆盖层

- **画幅：** `1024×1024`；**画面输出：** `square alpha overlay`；**程序接法：** overlay + alpha；**目标：** `growth weight / wall footing and stone pillars`。
- **制作验收：** 只画青苔斑块，绝不画成带石头/花盆的场景。

```text
masterpiece, best quality, highres, an isolated transparent sheet of tiny delicate patches of old moss and lichen growing on stone, soft olive green, muted bottle green, dusty sage green and scattered pale ochre lichen, very fine branching moss filaments, small irregular velvety clumps with naturally broken boundaries, painterly gouache detail and subtle tonal variation, about two thirds of the canvas remaining transparent, nonuniform sparse coverage with clumps stronger near the bottom edge, orthographic straight-on decal asset, no wall surface, no entire garden, no flower pots, no architectural elements, no cast shadow, transparent empty background
```

### HALL-08 · 裂纹与干笔边缘

- **画幅：** `1024×1024`；**画面输出：** `square alpha overlay`；**程序接法：** multiply/darken using alpha；**目标：** `ink weight / wall rough paint edge accents`。
- **制作验收：** 只保留稀疏裂纹与笔触，不能整张做成黑噪声。

```text
masterpiece, best quality, highres, an isolated transparent 2D paint detail overlay, thin branching hairline stone cracks, a few chipped plaster scratches and sparse uneven hand-painted dark dry-brush marks, restrained old ink edges mixed with warm pale chalk highlights, sharp natural tapering endings, broken discontinuous sketchlike texture, delicate handmade strokes on otherwise transparent empty canvas, flat orthographic asset, balanced random distribution with generous negative space, no outline around the whole image, no wall or floor underneath, no border, no full object, no background shadows
```

### HALL-09 · 尖拱门石雕贴面

- **画幅：** `1024×1536`；**画面输出：** `vertical alpha front-on`；**程序接法：** world-space trim decal + depth-tested；**目标：** `door arch geometry / back wall`。
- **制作验收：** 贴在真实3D门拱几何外表面，不作为可替代厚度的建筑。

```text
masterpiece, best quality, highres, one isolated antique Gothic pointed stone door arch decorative facade, strictly frontal orthographic elevation view, only the stone framing trim surrounding one tall pointed empty doorway, elegant but weathered carved limestone, off-white grey stone, lightly chipped raised molding, subtle sculpted ornament and faded gold traces, refined hand-painted European fantasy architecture texture, visible paint brush edges and mineral pigment, the entire doorway opening completely empty and transparent, no door inside, no wall behind, all external space transparent, complete object entirely inside the frame with generous margins, no perspective, no cast lighting, no floor
```

### HALL-10 · 石柱表面雕纹

- **画幅：** `768×1536`；**画面输出：** `vertical alpha front-on`；**程序接法：** world-space trim decal；**目标：** `pillars / vertical plane or UV label`。
- **制作验收：** 只画石柱雕饰花纹；3D柱子已经有体积，不能再生成一根透视柱子。

```text
masterpiece, best quality, highres, a single tall narrow transparent decorative carved pattern intended for one ancient limestone interior column, faded hand-painted Gothic floral stone relief and sparse vertical fluting highlights, very subtle patina and fine cracks, graceful narrow vertical symmetrical ornamental arrangement, calm old architectural material palette of cool grey, ash beige and faint dark olive, front elevation flat orthographic design, isolated decoration ONLY, empty transparent surroundings, no complete pillar cylinder, no wall, no pedestal, no background, no drop shadow, no perspective, full ornament visible with margins
```

### HALL-11 · 老木门雕花门板

- **画幅：** `1024×1536`；**画面输出：** `vertical alpha front-on`；**程序接法：** front surface world-space overlay；**目标：** `wooden door existing 3D block`。
- **制作验收：** 主材质可拆面板纹理与金属把手；如透明生成失败，可程序扣除外围。

```text
masterpiece, best quality, highres, one flat front-elevation antique dark walnut wooden door surface decorative panel, tall rectangular single door, old European manor style, deeply but delicately carved rectangular raised panels, faint worn engraved floral ornament, fine smoked oak grain, subtle antique golden hinge details and a small authentic brass knob on the left, restrained muted brown and black wood tones, artisanal painterly surface detail, orthographic directly frontal, flat surface to apply to existing door geometry, centered and fully visible, isolated with transparent exterior, no complete room, no wall, no floor, no perspective, no open door, no theatrical lighting
```

### HALL-12 · 古典彩窗玻璃花纹

- **画幅：** `1024×1536`；**画面输出：** `vertical alpha front-on`；**程序接法：** translucent overlay map；**目标：** `existing glass and mullion 3D geometry`。
- **制作验收：** 玻璃纹样而不是一整面窗墙；光穿透、闪烁由程序。

```text
masterpiece, best quality, highres, an isolated tall lancet Gothic stained-glass window artwork, strictly flat front elevation, narrow pointed top and long vertical pane, weathered hand-painted semi-translucent glass sections in desaturated teal, dark petrol blue, smoky amber and cloudy sage, subtle artisan glass pigment swirls, thin antique black lead lines making an elegant geometric rosette and elongated lozenge pattern, no religious figure or portrait, rich but controlled painterly detail, tiny scratches and slight opacity variation within glass segments, single window glass surface only, transparent outer canvas, no stone wall, no stone window frame, no perspective, no visible sunbeams, no floor
```

### HALL-13 · 旧天鹅绒垂布

- **画幅：** `1024×1536`；**画面输出：** `vertical alpha sprite`；**程序接法：** alphaTest world-space sprite；**目标：** `foreground cloth world card`。
- **制作验收：** 做单块布不是整套窗帘；程序动画轻微摆动。

```text
masterpiece, best quality, highres, one single isolated long worn European velvet hanging drapery panel, suspended from its straight top edge, dark faded dusty wine-brown and charcoal plum textile, several natural long vertical folds, frayed ragged uneven hem, subtle faded embroidery near the edge and old hand-stitched seams, tactile gouache and painterly fine brush strokes, gentle fabric highlights only showing inherent material folds, fully visible from top edge to bottom hem, no window, no wall, no rod, no other curtain panel, neutral frontal view with almost no perspective, generous transparent margins around the entire cloth, no floor or cast shadow
```

### HALL-14 · 一条垂落藤蔓

- **画幅：** `1024×1536`；**画面输出：** `vertical alpha sprite`；**程序接法：** alpha clip world card；**目标：** `foreground vines and wall foliage`。
- **制作验收：** 藤蔓逐条生成，每条要不同轮廓；不能生成一整片墙叶。

```text
masterpiece, best quality, highres, one isolated hanging climbing vine branch descending naturally from the top of the image, thin dark twisting woody stem, several small overlapping pointed ivy leaves and a few dried leaves, delicate realistic irregular growth, desaturated deep sage and olive green, dark smoky green shadow leaves, hand-painted fine gouache brushstrokes, varied leaf sizes and directions, elegant asymmetrical silhouette, leaf shapes must remain individually readable, full branch visible inside canvas, abundant transparent empty background all around, natural two-dimensional front elevation, no pot, no wall, no tree trunk, no ground, no forest, no extra plants, no framing, no baked dramatic lighting
```

### HALL-15 · 前景一丛植物叶片

- **画幅：** `1024×1536`；**画面输出：** `vertical alpha sprite`；**程序接法：** alpha-tested world card with depth sorting；**目标：** `camera-near foreground leaf card`。
- **制作验收：** 一丛叶片，不包含整棵树；近景可用轻微镜头偏移。

```text
masterpiece, best quality, highres, a single isolated irregular spray of old indoor ivy and broad wild leaves growing from one off-center stem, many individually separated leaves, elegant asymmetrical clustered silhouette, muted dusty olive, deep pine green and blue-grey green, tiny faded yellow edges, exquisite hand-painted stylized organic texture with believable leaf veins, oil-gouache hybrid painting, front-facing orthographic sprite for a 2.5D game, the complete plant cluster fully visible with breathing room around the edges, clean transparent empty background, no pot, no stone, no ground, no room, no landscape, no decorative frame, no heavy cast shadows
```

### HALL-16 · 古典小木柜雕饰面

- **画幅：** `1024×1024`；**画面输出：** `square alpha front-on`；**程序接法：** surface decal on furniture proxy；**目标：** `sideboard 3D mesh front`。
- **制作验收：** 已有真实3D柜体；只画可贴前面的装饰层。

```text
masterpiece, best quality, highres, one flat decorative front facade of a narrow antique European oak sideboard cabinet, only the visible front wooden panels and two drawers, faded carved trim, uneven wood stain, tiny brass handles, detailed weathered smoked walnut finish, delicate floral line engraving, hand-painted storybook realism, restrained warm grey-brown palette, strictly straight-on front elevation designed to be mapped onto an existing cuboid 3D furniture front, no legs, no top surface, no surrounding table, no room, no perspective, clean isolated rectangular flat front with transparent outside
```

### HALL-17 · 铜质古灯罩

- **画幅：** `1024×1024`；**画面输出：** `square alpha single prop`；**程序接法：** sprite facade / 3D surface map；**目标：** `existing 3D lamp at (3.45,6.5,-3.9)`。
- **制作验收：** 美术仅灯罩外观；点光源、投影、光晕由游戏引擎生成。

```text
masterpiece, best quality, highres, one isolated antique bell-shaped brass hanging lamp shade, aged dark bronze and warm muted gold metal, gently scalloped rim, tiny worn ornamental grooves and patina, refined old European manor design, tactile small painted scratches and fine metallic highlights belonging to the surface, neutral studio-like soft lighting, view from directly in front at slight natural eye level, complete lamp shade entirely inside the square frame, no bulb, no chains, no ceiling, no wall, no visible beam of light, no room, no floor, no drop shadow, empty transparent background
```

### HALL-18 · 地面碎石独立素材

- **画幅：** `1024×1024`；**画面输出：** `square alpha single decal`；**程序接法：** world sprite or decal；**目标：** `small stone debris world-space floor`。
- **制作验收：** 不能画地面或接触阴影；碎石与主地砖由程序贴合。

```text
masterpiece, best quality, highres, a single modest scatter of several tiny aged limestone chips and broken plaster flakes arranged loosely as one compact cluster, directly overhead orthographic view, pale grey beige, dusty slate and subtle olive moss hints, hand-painted realistic stone pigment with fine chips and surface grain, irregular organic broken pieces in a believable random cluster, no larger than one small patch of a floor, surrounding empty transparent canvas, delicate controlled painted edges, no entire floor, no stone tiles beneath, no architecture, no ground shadow, no dramatic studio light, no border, no perspective
```


## 通用负面提示词（所有图层共用）

```text
low quality, worst quality, blurry, jpeg artifacts, noise, watermark, signature, text, logo, blurry edges, low resolution, overexposed, excessive glow, excessive contrast, distorted shape, duplicated motifs, fisheye, inconsistent perspective, decorative frame, vignette
```

注意：负面提示词只包含通用质量问题，未写入和输出素材种类无关的角色描述。

## 什么**不需要**让 Anima 画

| 技术层 | 生成方式 | 原因 |
|---|---|---|
| Geometry/Depth/Object ID | 3D 场景自己输出 | 反映真实空间，不能用静态纹理伪造 |
| ShadowMap、接地 AO | 程序灯光与几何 | 阴影随人物及光源移动 |
| Normal / Roughness / Metallic / Height | 程序计算/从素材辅助推导；必要时做专用工作流 | 画出来的颜色贴图不能直接等同真实物理 PBR 通道 |
| 环境光、窗光、点灯、雾深度 | THREE 灯光、后处理、深度 | 不在原画里画死光斑 |
| 小丑牌式 CRT/卡牌金属 shader | Shader 独立层 | 动态反光跟输入角度和光照变化 |
| 金币粒子、飞屑、声效、屏幕反馈 | 程序 | 要与实机事件同步，不能把特效埋进一张素材 |

## 入库与测试验收

新增 Anima 图时按 `site/assets/anima-environments/fading-hall/<ID>-<slug>.png` 命名，登记 `source=anima`、promptVersion、尺寸、Alpha、色彩空间、worldScale、Anchor、BlendMode、UV repeat、参考截图日期、测试结果。**目前这些路径是计划路径，不表示图片已存在。**

每层独立截图一张，再用同镜头保存：白膜、BASE、BASE+污渍、BASE+湿痕、BASE+苔藓、BASE+笔触、远景、前景、角色、昼/夜与最终合成。必须把 Anima 图真正加载到材质槽，不能只修改 CSS 半透明颜色就标为完成。
