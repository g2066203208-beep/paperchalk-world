# 雪境行旅 · 第一阶段 Anima 正式绘画提示词（2026-11-16）

状态：**六套可直接复制的完整提示词已定稿，尚未调用 Anima 生成，尚未导入场景。** 本文件不是对任何未生成画作的质量承诺。

参照：docs/ANIMA_OFFICIAL_PROMPTING_REFERENCE_20261108.md；docs/ANIMA_STYLE_PRESETS_NORMAL_CUTE_20261109.md；docs/game/SNOWFIELD_FLAT_CARD_BATTLE_ANIMA_BACKGROUND_PROMPT_20261115.md；docs/game/FACTION_CARD_FRAME_ANIMA_PROMPTS_CANDIDATE_20261115.md；docs/art/SNOWBOUND_VISUAL_REBUILD_MASTER_PROMPT_20261116.md；docs/art/SNOWBOUND_PHASE1_PIXEL_AUDIT_20261116.md。
Anima 官方原始模型卡：https://huggingface.co/circlestone-labs/Anima （2026-11-16 重新核对）。

**要点：Anima 只画独立场景/空白卡框。全部代码 UI、角色、伤害数字、地图阵位、桌面手牌和按钮由游戏程序叠加。不得让 Anima 画带 UI 的成品战斗截图。**

## 0. 模型参数与共同负向

模型：Anima Base（非 Turbo）。Sampler：er_sde。Steps：35。CFG：4.5。森林画布：1536×864（16:9）；绘制后按比例适配 1920×1080。卡框画布：704×1024，正立竖版。以上为项目实际目标，Base 官方建议范围是 30–50 steps / CFG 4–5，不保证生成器对画面几何完美遵从。Seed 首测随机，生成后记录真实 seed。

**每个正向已经包含完整 normal LoRA，直接复制即可。** 不使用可爱版增补 LoRA，不加 safe，不擅自修改权重。不得修改仓库中已经批准的人物原图。

**全部素材的通用 Negative Prompt（唯一版本）：**

~~~text
worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark
~~~

## 1. 森林战斗完整环境 · 1536×864

Anima 工作对象：一幅独立的冬季森林风景。不要解释卡牌操作规则，不要让模型画 UI、棋格、人物、木桌或其他游戏功能物件。

**Positive Prompt**

~~~text
masterpiece, best quality, highres,
<lora:akipekoanima_v1_1:0.8> @akipekostyle <lora:Munji_Anima_AITK_KNA35_18ep2520_1024_20261031:1> @muji_style <lora:anima-highres-aesthetic-boost:1>,

scenery, snowy forest, winter landscape, original hand-painted 2d fantasy environment, beautiful storybook illustration, delicate anime background art, atmospheric painting,

A beautiful natural winter forest clearing in a quiet fantasy wilderness, seen from a calm straight-on viewpoint. The wide landscape has a continuous gently undulating blanket of fresh snow over the foreground and middle ground, with a naturally open clearing in the center. Old snowy evergreen trees gather in irregular clusters to the left and right, their branches bearing uneven soft pillows of snow. Several slender leafless trees with gently bending branches stand between the pines, adding variety to the natural silhouettes.

In the far distance, layers of pale turquoise-blue mountain ridges fade into cold winter mist behind a forest of much smaller frosted trees. The atmospheric depth is beautiful and convincing: near evergreen branches have crisp, expressive hand-painted edges; medium-distance pine trunks and bushes are slightly lighter; distant hills appear softly muted and cool in the air. The scene looks like one believable place with coherent geography and overlapping vegetation rather than separate decorative objects.

The foreground snow has quietly exquisite painted detail: shallow rounded snowdrifts, delicately shaded bumps and wind-rippled surfaces, occasional partially buried smooth stones, old fallen branches, a few fine winter grasses and small dark teal shadows where trees meet the snow. Tiny traces of ice sparkle very subtly in the diffuse light. The composition is naturally spacious through the middle while its richer details remain close to the wooded sides, far treeline and foreground edges.

The forest is alive with organic variation: each tree differs in height, leaning direction, shape, density and snow coverage. Large mature trunks on the sides, irregular smaller pines behind them, bare branches between them, dark green-blue needles underneath milky snow, understated shadows near the roots, occasional soft rocky contours. No tiled repetition or rigid geometric symmetry.

Lighting is delicate, like a quiet cold winter morning. A pale turquoise sky with thin creamy clouds, subdued cool daylight and soft warm ivory reflected highlights on fresh snow. The landscape is charming and cozy but carries a slight mysterious atmosphere. Restrained palette of icy cyan, desaturated teal, pale blue-green, milk-white snow, deep pine-green, cool gray-brown bark and tiny warm winter highlights.

Original handcrafted illustrated environment, beautifully controlled large painted shapes, gently irregular ink contours, clear layered forms, carefully balanced soft cel shading and matte gouache-like textures, subtle natural gradients only inside believable painted surfaces, crisp detailed brushwork where needed, thoughtful warm-cool color harmony and delicate atmospheric perspective.

One single complete independent beautiful winter landscape painting, horizontal wide composition, no character figures, no creature, no text, no interface, no trading cards, no symbols, no furniture, no platforms, no grid, no artificial board geometry.
~~~

**验收**：有树木个体差异、自然雪地、远中近景、真实树根/岩石接地、中央空间宁静但不空洞；不能出现一排重复的三角树、纯色梯形山或贴图味噪点。母图审核通过后才考虑分层，而不是再无参照生成一套不一致的树。

## 2. 前景可分离绘画母图 · 1536×864

若第一张森林母图可以人工切层，**优先从那张图片里拆出前景**，避免独立生成后无法对齐。仅在需要额外的近景植物时使用：

**Positive Prompt**

~~~text
masterpiece, best quality, highres,
<lora:akipekoanima_v1_1:0.8> @akipekostyle <lora:Munji_Anima_AITK_KNA35_18ep2520_1024_20261031:1> @muji_style <lora:anima-highres-aesthetic-boost:1>,

scenery, winter landscape, beautiful 2d illustration, hand-painted anime background art, original winter forest foreground decorative elements,

A clean hand-painted study of irregular snow-covered woodland foreground decorations. On the far left stands a beautiful old pine trunk with a few heavy curved branches carrying lumps of soft white snow, with a small group of partly buried rough blue-gray rocks at its base. On the far right is a loosely arranged cluster of frosted evergreen twigs, slender curved leafless stems, tiny winter grasses and low rounded mounds of powdery snow. Across the lower corners lie several varied natural snowbanks that gradually fade out before reaching the center. The center is mostly empty so this foreground scene can frame a larger landscape without obscuring its principal subjects.

Beautiful 2d hand-drawn texture, gentle irregular ink outlines, controlled expressive anime cel shading, subtle natural bark texture, beautifully shaped creamy-white snow, delicate teal-blue shadows, varied botanical silhouettes, consistent soft cold winter daylight, realistic plant grounding, a charming original storybook winter mood. All decorative objects belong to one coherent perspective-free scene, drawn from a calm straight frontal view.

The background is a flat uniform medium gray suitable for careful manual cutout and later compositing. One independent illustration, no characters, no game objects, no typography or interface.
~~~

注意：uniform gray 仅用于后处理抠图，**不是透明 Alpha**，必须检查边缘与羽化。

## 3. 通用最简人物卡框 · 704×1024

先生成**一张**不带阵营材质的通用形制作为基准。以程序蒙版确定真正的同宽圆角和边框比例。

**Positive Prompt**

~~~text
masterpiece, best quality, highres,
<lora:akipekoanima_v1_1:0.8> @akipekostyle <lora:Munji_Anima_AITK_KNA35_18ep2520_1024_20261031:1> @muji_style <lora:anima-highres-aesthetic-boost:1>,

single isolated original decorative playing card frame texture, upright flat front-facing vertical rounded rectangle, straight orthographic 2d visual asset, elegant restrained hand-painted paper and wood craftsmanship,

One slim delicate decorative card border occupies the center of a vertical canvas. The frame is a narrow continuous dark walnut-brown strip with soft gently rounded corners and a single quiet warm ivory paper keyline on its inside edge. The narrow border is understated and physically believable, with barely visible wood grain, tiny handmade brush irregularities and subtle natural edge highlights. The whole frame is straight, perfectly upright and fully visible inside the canvas with generous neutral space around all four sides.

Almost the entire card interior is a completely open empty portrait window, filled with flat uniform medium gray for precise software masking. The outside of the card is also flat uniform medium gray for precise masking. Both fields are smooth and unpatterned. There is no picture in the window and no decorative piece covering the opening.

Subtle handmade card paper texture, restrained warm wood rim, clean softly inked outlines, neat small bevels, miniature scale craftsmanship, no large raised ornaments, no banner, no title plate, no letters, no number badges and no icons. A complete isolated original 2d card border material designed to sit above a separately illustrated anime character portrait.
~~~

**工程约束**：目标边框宽占总宽 3%–4%；真实宽度、圆角、内窗必须由同一个精确模板裁切，不能因为生成图对称性偏差而用不同框遮挡脸。所有中文文字、血量、攻击和倒计时由程序绘制。

## 4. 猎人组织独立卡框 · 704×1024

**Positive Prompt**

~~~text
masterpiece, best quality, highres,
<lora:akipekoanima_v1_1:0.8> @akipekostyle <lora:Munji_Anima_AITK_KNA35_18ep2520_1024_20261031:1> @muji_style <lora:anima-highres-aesthetic-boost:1>,

one single isolated original fantasy collectible character card frame texture, slender front-facing vertical rounded rectangle, flat orthographic 2d asset, completely empty smooth medium gray portrait window and uniform medium gray outside background for later masking,

An elegant and disciplined monster hunter card frame. The continuous narrow border is made of dark blued steel and slightly charcoal-black lacquered wood, with a satin matte finish, a few very delicate brush-painted steel streaks and a tiny warm ivory printed inner edge. Only two small flush muted brass points appear at the top corners. The visual impression is old-world, severe, calm, practical and meticulously crafted, not overly dark or ornamental. The edge feels like an object handled frequently, with slight natural wear on the tiny corner bevels and gently varying handcrafted ink contours.

The silhouette is an uninterrupted slim rounded rectangle with no protrusions. The border occupies only a very narrow perimeter around an exceptionally large open portrait area. The interior contains no illustration, lettering, numbers, symbols, icons or decorations. All corners remain completely inside the canvas. Premium original hand-painted 2d game card component, clean elegant materials and crisp natural edges.
~~~

## 5. 血族组织独立卡框 · 704×1024

**Positive Prompt**

~~~text
masterpiece, best quality, highres,
<lora:akipekoanima_v1_1:0.8> @akipekostyle <lora:Munji_Anima_AITK_KNA35_18ep2520_1024_20261031:1> @muji_style <lora:anima-highres-aesthetic-boost:1>,

one single isolated original fantasy collectible character card frame texture, slender front-facing vertical rounded rectangle, flat orthographic 2d asset, completely empty smooth medium gray portrait window and uniform medium gray outside background for later masking,

A refined aristocratic vampire card border made of deep muted burgundy lacquered wood and thin oxidized black-silver edging. A delicate warm ivory paper keyline runs inside the narrow rim. Extremely faint rose-vine etching appears within the tiny curved upper corners only, never projecting outside the smooth silhouette. The surface has subtle hand-painted soft highlights, restrained dark cherry varnish, slightly worn corners and delicate craft detail. Elegant, mysterious, old-world, beautiful and quiet rather than ornate.

The thin outer border is continuous and exactly the same general form as a simple handcrafted playing card: softly rounded corners, narrow width, a very large empty central portrait opening and no separate title panel. The interior and exterior flat gray regions are clean for software masking. No illustration, lettering, symbols, iconography, numbers, hanging objects, jewels or large ornamental pieces. Premium original 2d game card frame texture with excellent natural outlines.
~~~

## 6. 道具战术卡框 · 704×1024

**Positive Prompt**

~~~text
masterpiece, best quality, highres,
<lora:akipekoanima_v1_1:0.8> @akipekostyle <lora:Munji_Anima_AITK_KNA35_18ep2520_1024_20261031:1> @muji_style <lora:anima-highres-aesthetic-boost:1>,

one single isolated original fantasy item card border asset, upright flat front-facing rounded rectangle, clean orthographic 2d composition, beautiful minimalist old-paper illustration,

A very narrow warm ivory handmade parchment border with a fine dark walnut edge and a softly imperfect ink-printed outline. The paper is tactile but quiet, with subtle pale cream fibers, delicate brushed edges, gently rounded corners and restrained miniature craftsmanship. Almost the whole interior is a large flat plain medium gray opening for a separately illustrated game item. The outside background is also uniform medium gray for later precise masking. The frame is consistent and simple, with no attached plaques or ornamental objects; it is slightly warmer and lighter than the character card border to help tactical item artwork remain easy to distinguish. Entire rounded rectangle completely visible, exact front-facing two-dimensional presentation, beautifully controlled ink lines, modest aged printed-paper texture, no picture, no letters, no numbers or symbols.
~~~

## 7. 第一轮图片审核与游戏导入门槛

1. 用 1536×864 画森林，不要把 1920×1080 误当 Anima 已确认的原生尺寸。无损保持 16:9 适配。
2. 先**审核完整雪森林**。只有批准之后才切层，并为游戏生成独立背景/前景，不要自动把每次随机生成的树组合成不同的森林。
3. 先**审核单张通用卡框**。若缩小到桌面角色 218×258、手机横屏 94×104、竖屏 110×126 后显得太复杂、边框压脸、透明不成立或出现文字，判为失败并迭代。
4. 猎人、血族和道具框沿用同一个程序定义的 mask。区别是窄边材质，不是结构变形。
5. 参考游戏画面用于衡量卡框的清晰程度、卡牌占屏比例和可读性；不复制原作的插画、精灵图、角色或 UI。
6. **没有实际生成图不能标记为已经完成美术**。后续必须生成候选图、审图、提交 GitHub、替换并用 Chromium 比较，才算通过质量门槛。

目标提交素材路径（仅规划，**目前未生成**）：
- site/card-battle/assets/snowbound-v2/bg/forest-battle-master.png
- site/card-battle/assets/snowbound-v2/fg/forest-foreground.png
- site/card-battle/assets/snowbound-v2/cards/frame-common.png
- site/card-battle/assets/snowbound-v2/cards/frame-hunter.png
- site/card-battle/assets/snowbound-v2/cards/frame-vampire.png
- site/card-battle/assets/snowbound-v2/cards/frame-item.png

**版权与使用提示**：截至此次核对的 CircleStone Labs 官方 Anima 模型页面显示 non-commercial license；如果项目打算商业发行，必须另外确认许可要求，不能仅凭本提示词假定有商业授权。
