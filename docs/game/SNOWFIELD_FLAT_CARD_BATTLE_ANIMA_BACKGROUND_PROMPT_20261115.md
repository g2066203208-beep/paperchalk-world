# Anima｜雪原森林纯场景原画（2026-11-15 修订）

> **状态：待生成、待审核的场景提示词。** 根据用户明确纠正：Anima 只负责绘制独立景物，不给它解释玩法或操作系统；原先过度工程化的英文版本废弃。此文件已改成可以直接复制的单幅冬季自然风景提示词。未执行模型、未生成或覆盖任何图片。

## 场景画面

- 纯粹的冬季雪原森林风景，手绘童话感、青蓝色与白色，低矮雪丘、针叶林、远山与薄雾。
- 构图以开阔积雪为主，树木和灌木围绕左右边缘，远景山丘、近景雪地。图中不预先嵌入其他独立美术元素。
- 工作尺寸 **1536×864（16:9 横屏）**；可后期适配 1920×1080，保持同一宽高比。
- 保留项目完整 normal LoRA 原文；负面严格使用批准的六项。最终尺寸及效果需按真实 Anima 输出验收。

## Positive Prompt

```text
masterpiece, best quality, highres,
<lora:akipekoanima_v1_1:0.8> @akipekostyle <lora:Munji_Anima_AITK_KNA35_18ep2520_1024_20261031:1> @muji_style <lora:anima-highres-aesthetic-boost:1>,

scenery, winter landscape, snowy forest clearing, beautiful hand-painted 2d illustration, charming fantasy storybook style,

A vast peaceful clearing covered in thick, soft, powdery snow. The wide snowfield stretches across the foreground and middle ground, with gently undulating snowdrifts, smooth rounded snowbanks, delicate wind-swept snow patterns and subtle blue shadows.

In the distance, a line of small dark teal evergreen trees covered in heavy white snow, irregularly spaced along soft snowy hills. Larger snow-covered pine trees and rounded frosted bushes frame the far left and right edges of the landscape.

Beyond the trees, pale blue mountain silhouettes gradually fade into the cold winter atmosphere. A soft turquoise-blue sky with delicate white clouds and a gentle misty horizon.

Fresh untouched snow, beautiful rounded natural shapes, quiet winter morning atmosphere, soft diffused daylight, subtle ambient shadows, harmonious icy blue, pale cyan, turquoise, white and deep blue-green colors.

Simple expressive outlines, delicate hand-painted textures, clean color shapes, soft cel shading, whimsical illustration, beautiful layered landscape composition, gentle atmospheric depth, richly illustrated snow and trees, calm and cozy winter scenery.
```

## Negative Prompt

```text
worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark
```

## 状态说明

这里的作品是独立场景原画。后续如何合成、排版不属于 Anima 提示词的一部分。画面质感、主体构图与雪地层次以生成实图为准，不声称已画好。
