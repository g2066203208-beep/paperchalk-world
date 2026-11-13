# 农民组织｜战士·萝莉伐木工｜Anima 提示词 V2（2026-11-13）

> **候选提示词，未生成或批准原画。** 玩家最新要求：组织内七战斗职业；本次是农民组织**战士=伐木工**的萝莉型，不是“第八职业”，也不是中性通用小兵。
>
> **生成画布：704×1024 px（宽×高）**；单人全身、站姿、透明背景（需检查真实 Alpha）。后续少女型、成熟丰满型使用同款工作制服，但每人面貌与骨架独立。
>
> **已直接复核 Anima 官方**（2026-11-13）：[官方模型卡 Prompting](https://huggingface.co/circlestone-labs/Anima#prompting)、[Generation settings](https://huggingface.co/circlestone-labs/Anima#generation-settings)。官方认可 Danbooru 式标签＋自然语言混用、质量标签放前、`loli` 作为本项目要求的字面标签；官方并**未要求或保证**单个标签必然实现某种脸型。用户另有禁止 `safe`、小兵不得添加风格 LoRA/画师标签的明确项目约束，继续遵守。旧文档 672×1024 的尺寸由用户本次更新为 704×1024。
>
> **注意：** V1 实际已经在开头写了 `1girl, solo, loli`。用户反馈意味着要让萝莉型特征更清楚、更精简；V2 将 `loli` 放在开头最醒目位置，同时缩短冗余描述。不将用户的“没写”误记为文件中的事实。
>
> 生成建议（仅 Anima-Base 方案，未实测）：er_sde、35 steps、CFG 4.5。若使用 Turbo，官方建议 CFG 1、8–12 steps。画布比例为用户项目要求，不冒称官方默认尺寸。

## 正向提示词（V2 完整）

```text
masterpiece, best quality, 1girl, solo, loli, petite, short stature, small frame, childlike proportions, round face, soft cheeks, short rounded chin, large hazel eyes, straight thin eyebrows, small nose, small closed mouth, light sun-kissed skin, faint freckles across the nose, short chestnut-brown slightly tousled bob hair, uneven bangs, one tiny side braid behind the right ear, cute little village lumberjack girl, farmer faction warrior.

She wears a simple rural woodcutter recruit uniform: ivory linen long-sleeved shirt with rolled cuffs, dark walnut-brown sleeveless work vest with small wooden buttons, a modest muted brick-red neckerchief, deep olive-brown knee-length work skirt over dark fitted trousers, narrow brown leather belt, one small beige canvas tool pouch on her left hip, dark leather work gloves, short beige ankle wraps, and worn dark brown lace-up ankle boots. Practical inexpensive country work clothes, modest and easy to move in. Keep this entire uniform design identical for the future young-woman and mature-woman lumberjack recruits, changing only the size and tailoring.

She stands upright in a natural relaxed dialogue-portrait pose, mostly facing forward, feet comfortably apart, weight resting slightly on one foot. Her right hand loosely holds a small realistic woodcutting hatchet with a short wooden handle; the modest iron axe head points down beside her right leg. Her left hand rests lightly near her work belt. Neutral natural expression, unobstructed face and chest, small contained gesture, no dramatic action.

Single isolated character, nearly frontal standing full body, centered on a portrait canvas, head to both boot soles completely visible, both hands and entire hatchet fully within frame, generous clear margins above head, beside elbows and axe, and below boots, transparent background.
```

## 负面提示词（完整）

```text
worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark
```

## 不可遗漏

- 头尾、双手、斧子、靴子全部完整入镜，留安全边距。
- 角色面部、身材明显幼态，朴素非性感的农家工作制服。
- 斧头自然下垂，不挥砍，不坐姿，不做战斗海报。
- 本小兵正向提示词不写 LoRA、画师标签、画风词和 safe。
- [七职业正式规则](../game/SEVEN_BATTLE_CLASSES_PARTY_SYNERGY_CANON_20261113.md) / [小兵统一规范](FACTION_MINION_CHARACTER_IDENTITY_AND_PROMPT_RULES_V1_20261111.md)。
