# 路人 NPC：Anima 快速量产工作流 V1（2026-11-08）

> **状态：新生产流程提案，尚未由用户审核通过或完成 Anima 实际测试。** 为解决此前整张三视图反复生成成正面/侧面/背面错误而制定。不能把流程文档当成已生成资产。批准的 NPC-M003 原图和四格不变。

## 生产目标

1. **普通城市群众**：参考 P5 的陌生城市人群视觉层级，保留《错位日常》的 Akipeko 角色画风。无可见眼睛，低对比、低细节，不刻画复杂衣纹、个性配饰。灰阶/降饱和度**在游戏运行时集中处理**，不让 Anima 改成与主角风格不同的硬边剪影。
2. **重要 NPC**：继续单独的人物身份、独特服装、持续生活动作，不能拿背景群众模板冒充已有角色。
3. 普通 NPC 只制作 **正面站姿、严格朝左的 90° 侧面站姿、纯背面站姿** 三张；所有人双脚站稳、手臂放松。右侧方向可在适用时用镜像或专门补画。**不做第四格**；重要 NPC 的独立待机作为单独生产任务。
4. 新群众模板第一批最多六种身形和人群类别：成人男性职员、成人女性职员、年长男性、年长女性、年轻男性、年轻女性；之后按画面重复率补齐学生、家长、工人等。**这些是模板类别，不是固定的真实身份或日程。**

## 必读资料

- [Anima 官方源链接与提示词整理](ANIMA_OFFICIAL_PROMPTING_REFERENCE_20261108.md) — 官方模型卡 https://huggingface.co/circlestone-labs/Anima
- [Forge Neo 人物参考插件](https://github.com/eduardoabreu81/anima-reference-forge-neo) — 插件本身不是 Anima 官方产品，支持 ImageStitch Integrated + `<lora:anima_ref_adapter_pilot_r32:1>`。
- [本项目角色画风锁](ANIMA_CHARACTER_ART_STYLE_LOCK_V1.md)
- [M003 老爷爷已批准原文](NPC-M003_ANIMA_APPROVED_FOUR_POSE_USER_PROMPT_20261108.md)

## 决定：不要再一次生成整张三视图

整张三视图经过多轮失败：第二个人重复正面、第三个人错成侧面、外套丢失。文字中的 `EXACT` 不是 Anima 的官方强制角度控制机制。

固定工作流：

- **阶段 A：正面母图**。Anima Base + `@akipekostyle, <lora:akipekoanima_v1_1:0.65>`；**一张图只一个人**，全身，白底，无眼睛，低细节。首测 ER SDE / 35 steps / CFG 4.5 / 896×1152（portrait）。用户检查轮廓、穿着、比例与风格后锁定母图。
- **阶段 B：左侧面**。仍用同一正面母图；Forge Neo 中打开 **ImageStitch Integrated**，添加母图；在提示词中加入 `<lora:anima_ref_adapter_pilot_r32:1>`，不要同时启用 Forge Neo 原生 `[Anima] Enable Reference`。生成一张纯左侧面全身。
- **阶段 C：纯背面**。**继续使用阶段 A 的同一张正面母图作为参考**，不是拿侧面接力生成；只生成一张纯背面全身。
- **阶段 D：验收、拆格、真实 Alpha、游戏运行时统一灰阶和世界比例**。每张图确认朝向、外套、裤子、鞋子及缺图情况；没通过不能入库。素材 RGBA 后处理独立完成，不假定白底 PNG 自动透明。不要裁切头脚。

### 参数说明

- 阶段 A 仅是本项目基线首测；Anima 官方 Base 范围推荐 30–50 steps、CFG 4–5，ER SDE 为中性平涂采样，不保证单图能控制任意视角。
- 参考插件作者对 **Anima Base v1.0 / Ref Adapter** 推荐：**Euler / Simple / 28–30 steps / CFG 4.5 / 896×1152，reference guidance 4.5–6、correction APG**。先依插件推荐测试；它可能有发色/大衣颜色漂移，仍需审查。
- 此角色参考插件的 LoRA 必须与插件机制配合才有效，不能把 `pilot_r32` 当普通美术风格 LoRA。调不同方法时不要同时开启多个参考机制。
- 若本机插件没有启用或缺权重，先检查环境；不得谎称已使用参考功能。

## 可复制的首位普通男职员 Prompt：仅正面

**Positive**

```text
masterpiece, best quality, score_7, safe, @akipekostyle, <lora:akipekoanima_v1_1:0.65>, 1man, solo, full body, front view, standing, arms at sides, adult Japanese office worker, short neatly combed dark brown hair, no visible eyes, small nose, small mouth, average body build, simple gray suit jacket, white collared shirt, dark gray straight trousers, plain dark shoes, understated background civilian, simple anime style, clean lineart, flat colors, simple cel shading, muted colors, white background.

One full body man standing still and facing straight toward the viewer. His arms hang naturally by his sides, with both shoes fully visible. The suit has a simple silhouette, minimal garment details and no accessories.
```

**Negative**

```text
worst quality, low quality, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, chromatic aberration, multiple people, multiple views, character sheet, side view, back view, three-quarter view, visible eyes, detailed eyes, walking, raised arms, sitting, bag, name badge, elaborate costume, extreme shadows, furniture, background scenery, cropped head, cropped feet, text, watermark
```

## 仅左侧面：使用已批准母图作为参考

**ImageStitch 参考图 = 正面母图；插件工作正常时添加 Ref Adapter LoRA**。

**Positive**

```text
masterpiece, best quality, score_7, safe, @akipekostyle, <lora:akipekoanima_v1_1:0.65>, <lora:anima_ref_adapter_pilot_r32:1>, 1man, solo, full body, side view, profile, facing left, standing, arms at sides, simple anime style, clean lineart, flat colors, simple cel shading, white background.

The same person from the reference image is standing in a complete 90-degree left-facing side profile. His nose, chest, knees and both shoes face left. His head and shoes are fully inside the image.
```

**Negative**

```text
worst quality, low quality, blurry, multiple people, multiple views, front view, back view, three-quarter view, looking at viewer, missing jacket, different outfit, visible eyes, raised arms, walking, sitting, cropped head, cropped shoes, scenery, text
```

## 仅纯背面：仍然使用同一张正面母图

**ImageStitch 参考图 = 阶段 A 正面母图**。

**Positive**

```text
masterpiece, best quality, score_7, safe, @akipekostyle, <lora:akipekoanima_v1_1:0.65>, <lora:anima_ref_adapter_pilot_r32:1>, 1man, solo, full body, back view, from behind, standing, arms at sides, simple anime style, clean lineart, flat colors, simple cel shading, white background.

The same person from the reference image is standing with his entire body facing away from the viewer. Only the back of his head, jacket, trousers and shoes is shown. The figure is fully visible from head to shoes.
```

**Negative**

```text
worst quality, low quality, blurry, multiple people, multiple views, front view, side view, three-quarter view, face visible, missing jacket, different outfit, visible eyes, raised arms, walking, sitting, cropped head, cropped shoes, scenery, text
```

## 停止条件

1. 不再重复五六轮整张三视图重抽。
2. 第一张正面不满意，才改风格/服装；正面批准后侧面与背面只修角度/身份一致性。
3. 单独生成的侧面或背面仍错时，先检查 ImageStitch、插件权重、开启状态和参考来源，再采取姿态引导；不能断言提示词必然成功。
4. 游戏可以复用已批准的少量背景群众模板，通过比例、时间、位置、速度和适当色调变化丰富人群，但不能把同一模板假冒不同已命名 NPC。
5. 这套方案尚未在本机真实 Anima 验证，用户的下一幅实际出图是最终准入依据。
