# 《错位日常》/《地牢电梯》 Anima 新版双画风预设（2026-11-09）

> **状态：用户指定的当前新画风 LoRA 组合，已登记为项目画风配置。** 这是一份后续生成图片时必须检查的配方记录，并不代表这些权重已由当前环境执行、已通过美术质检，或自动覆盖任何已入库原图。

## 1. 可爱版（cute）

以下整行必须**原样复制**，不要换 LoRA 名称、大小写、权重或删除对应 @标签：

```text
<lora:akipekoanima_v1_1:0.8> @akipekostyle <lora:Munji_Anima_AITK_KNA35_18ep2520_1024_20261031:1> @muji_style <lora:anima-highres-aesthetic-boost:1> <lora:firedotinc_old-dataset_anima-b1_v6:0.8> @firedotinc-old
```

含 `firedotinc_old-dataset_anima-b1_v6`（权重 `0.8`）与 `@firedotinc-old`，作为**可爱版**与正常版的唯一配方差别。

## 2. 正常版（normal）

从可爱版中**仅去掉** `<lora:firedotinc_old-dataset_anima-b1_v6:0.8>` 及 `@firedotinc-old`，其余文本和权重完全相同：

```text
<lora:akipekoanima_v1_1:0.8> @akipekostyle <lora:Munji_Anima_AITK_KNA35_18ep2520_1024_20261031:1> @muji_style <lora:anima-highres-aesthetic-boost:1>
```

> **2026-11-09 用户明确要求：** 后续所有新 Anima 正向提示词不要添加 `safe` 标签。它不是画风 LoRA 预设的一部分；不要从旧模板或官方示例机械复制到最终提示词。原文历史记录保持可追溯。

## 3. 使用规则（下次生成素材必须先看）

1. 只要用户提到“可爱版”，使用上面 **cute** 整行；提到“正常版”，使用上面 **normal** 整行。没有指明版本时先看当前任务或具体角色的指定风格；若仍不明确，按**正常版**拟稿，并明确标注所选版本，不能默默混合两者。
2. 生成任何新的角色、NPC、场景、商品、怪物或《地牢电梯》纸片美术之前，先查看本文件和 [Anima 官方提示词规范](ANIMA_OFFICIAL_PROMPTING_REFERENCE_20261108.md)。用户后来更新画风时，以最新明确指示为准并同步修改本文件及 `site/data/art/anima-style-presets.v1.json`。
3. LoRA 风格字符串属于**正向提示词的画风前缀**，需要同具体主体、角度、服装、背景、透明通道及比例等要求合并。它不等于一条完整的角色/场景提示词，也不替代已有角色的身份母图。
4. 已批准的角色长相、校服、三视图顺序、L2D 动作、色彩、游戏内展示方式仍按各自的角色档案执行。旧文档里有历史 LoRA 用量（例如 `0.65`、`1.0`）；这些是原有作品当时的版本记录，**不应擅自批量替换或据此覆盖批准图**。本文件定义的是 **2026-11-09 起的新画风可选预设**。
5. 不得私自把可爱版多加的 `firedotinc` LoRA 混入正常版；不得为“更好看”擅自改成别的权重。明确需要单次实验或旧角色复现时，记录该次偏差和原因。
6. **画风与生成工具的区分：** 本文两套是 Anima/LoRA 的预设配置，不是 GPT Image 的模型参数；用 GPT Image 生成素材时只能参照视觉描述与已批准原画，不能谎称 GPT Image 实际加载了这些 LoRA。
7. 不能仅凭登记本文件就宣称素材已生成、已经换进游戏、画风已经实测统一或有商业授权。需要逐张真实图片和游戏内截图验收。

## 4. 机器读取

机器版本：[`site/data/art/anima-style-presets.v1.json`](../site/data/art/anima-style-presets.v1.json)

- `normal.positive_prefix`：正常版完整原始文本。
- `cute.positive_prefix`：可爱版完整原始文本。
- `default_preset`：未另行指定时的新素材拟稿默认版本；具体角色已有锁定文档优先。

**更新日期：2026-11-09，来源：用户在项目会话中亲自提供的完整 LoRA 组合。**
