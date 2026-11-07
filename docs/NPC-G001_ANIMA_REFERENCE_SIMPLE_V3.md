# NPC-G001 三人组｜Anima 最简整组换动作工作流 V3（2026-11-08）

> **当前优先方案：txt2img + ImageStitch Integrated + anima-reference-forge-neo 已记录的 pilot Ref Adapter。** 这是设计/操作指导，没有远程操控用户本地 Forge 或验证实际成图。旧版「直接将喜悦图放入普通 img2img、不断拉高去噪」以及「默认要 OpenPose + IP-Adapter + 分区提示」不再推荐为第一方案。

## 为什么
- 普通 img2img 的初始潜空间已经包含「A/B弯腰靠近、C手扶膝」等动作构图，写新动作也容易保留旧姿势。
- [anima-reference-forge-neo 官方README](https://github.com/eduardoabreu81/anima-reference-forge-neo)明确：Ref Adapter 的人物外貌来自 **ImageStitch Integrated** 里的图片，动作/构图来自提示词；对于把人物放到新场景，推荐 **txt2img**；在参考模式下过量写外貌标签可能与参考图对抗。
- 本项目截图清单 [ANIMA_FORGE_NEO_INVENTORY_20261105.md](ANIMA_FORGE_NEO_INVENTORY_20261105.md) 已记录安装：`anima-reference-forge-neo`、ImageStitch、pilot r32 和 `akipekoanima_v1_1`。这只是当时截图记录，不代表本机此刻运行状态已测试。
- 注意：pilot 参考方法的训练目标主要是**单个人物**；「三人整组合图做参考」是最简单的首试方案，**保三个人不换脸尚未得到作者保证**。失败优先在同一 ImageStitch 流程中对比 `anima-role-ref-kv-v1.0` 方法，先不引入骨架或其他扩展。

## Forge Neo 首试（五步）
1. **txt2img**（不是普通 img2img），checkpoint 选已有的 Anima Base。
2. 打开 **ImageStitch Integrated**，勾选 Enable，将用户批准的**喜悦三人母图**作为第一张也是唯一一张参考图。
3. 正向提示词包含 **`<lora:anima_ref_adapter_pilot_r32:1>`** 和原风格 **`@akipekostyle<lora:akipekoanima_v1_1:1>`**；实际 LoRA alias 以 Forge 卡片插入为准。不要再堆人物身高、体重、面部五官的文字。
4. Settings → Stable Diffusion → **Anima Reference**：reference guidance 先试 **4.5**，correction **apg**；关闭 Settings → `[Anima] Enable Reference`（它是另一种 Edit LoRA 的流程）。不要同时勾选独立 `sd-forge-anima-ref-adapter` 面板；一次一个参考方法。
5. 首轮 Euler / Simple、30 steps、CFG4.5、1024×1024；输出检查三个身份、三套动作是否都从原姿势明显变化。全部身份正确再考虑高分辨率。
这些参数主要取自扩展作者对 Anima Base 的建议，实际风格/三人结果以本机实测为准。Turbo 另用 CFG1/8~12 steps，CFG1负向分支通常无效、参考 guidance 也会被限制。

## 下一张『惊讶』完整 Positive Prompt（txt2img + 三人 reference）
```text
masterpiece, best quality, score_7, safe, @akipekostyle, <lora:akipekoanima_v1_1:1>, <lora:anima_ref_adapter_pilot_r32:1>, 3girls, three schoolgirl friends, full body, school uniforms, surprised, wide-eyed, open mouth, different poses, stepping back, arms raised, pointing, height difference, looking at each other, white background, simple background, clean lineart, cel shading.

A completely new full-body pose for each of the three girls from the reference image, reacting together to unexpected news.

LEFT GIRL: the shortest girl suddenly takes a startled step backward, shoulders raised, one hand beside her cheek and her other arm out to the side, eyes wide, looking at her friends.

MIDDLE GIRL: the medium-height girl recoils upright and steps backward with one foot, both hands abruptly raised near her shoulders, elbows bent, open fingers, astonished face, looking toward the left girl.

RIGHT GIRL: the tallest girl stands upright and turns her whole body sideways, one foot stepping out, one arm extended pointing toward something surprising off-screen, other hand lifted toward her friends, eyebrows raised in disbelief.

Three different full-body silhouettes, no previous leaning-together laughing pose. The girls are still recognizable close friends, naturally responding to the same sudden surprise. Preserve exactly the same three identities and matching school uniforms as the reference image, with dark burgundy neckties visible on everyone. All three complete bodies and shoes visible, generous white margin.
```

## Negative Prompt（Anima Base，CFG4.5）
```text
worst quality, low quality, score_1, score_2, score_3, blurry, jpeg artifacts, extra girl, 1girl, 2girls, 4girls, duplicate, merged bodies, bad anatomy, extra arms, extra fingers, cropped feet, same pose as reference, both girls leaning toward center, hands on knees, palms held out, laughing pose, eyes closed, identical poses, three girls posing for camera, wrong uniform, missing necktie, bow tie, gold buttons, background scenery, watermark, text
```

## 没成功时先判断原因
- **动作仍与喜悦相同**：确认真在 txt2img；参考图只放进 ImageStitch，而**不是** img2img 的原图输入；不要又把旧动作描述带进Prompt。
- **参考图完全不起作用**：检查扩展是否已生效、ImageStitch Enable 是否已勾、LoRA pilot tag 是否精确插入；插件作者说明旧 Forge Neo 可能禁用插件，并明确不可以把这些专用权重只当普通 LoRA 加载。
- **三人变脸/丢人**：这是该单角色参考方法对三人群像的潜在限制。优先只替换方法标签为 `<lora:anima-role-ref-kv-v1.0:1>` 做一次同参考图对比（仍在 ImageStitch，不同时用 pilot）；若无改进再研究更强控制法，不先上三层插件。
- **没变动作不是因为去噪小**：此方案 txt2img 不需要填写 Denoising Strength，故不应再让用户反复调 0.75。

## 来源
- Forge Neo 参考插件官方 README：https://github.com/eduardoabreu81/anima-reference-forge-neo
- CircleStone Labs Anima 官方模型：https://huggingface.co/circlestone-labs/Anima
- 本仓库既有环境清单：[ANIMA_FORGE_NEO_INVENTORY_20261105.md](ANIMA_FORGE_NEO_INVENTORY_20261105.md)
- 三人喜悦参考审批：[characters/NPC-G001_JOY_APPROVED_20261107.json](characters/NPC-G001_JOY_APPROVED_20261107.json)
