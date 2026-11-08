# Anima 官方提示词规范：仓库内必读核对版

> **核对日期：2026-11-08。** 本文件按 CircleStone Labs Anima 官方模型卡整理，保留官方来源 URL 和少量必要的准确示例；不是未经授权镜像整篇 README。**每次撰写、改写 Anima 提示词前必须打开本文件，并核对官方原始模型卡。** 官方资料可能更新，以原始来源为准。

## 官方原始来源（必须打开）

- [CircleStone Labs / Anima 官方模型卡](https://huggingface.co/circlestone-labs/Anima)
- [官方 README / Prompting 部分](https://huggingface.co/circlestone-labs/Anima/blob/main/README.md#prompting)
- [官方 README / Generation settings](https://huggingface.co/circlestone-labs/Anima/blob/main/README.md#generation-settings)
- [官方 README / Natural language prompting tips](https://huggingface.co/circlestone-labs/Anima/blob/main/README.md#natural-language-prompting-tips)
- [官方 README / Limitations](https://huggingface.co/circlestone-labs/Anima/blob/main/README.md#limitations)

**来源属性：** 以下「官方」是对原模型卡截至核对日的中文转述，不应再把「项目要求」伪称官方能力。若链接不可用，应说明未完成本次复核；不得靠记忆声称看过官方最新版本。

## 1. 官方 Prompting 要点（Anima 模型本身）

1. 训练提示形式包括 Danbooru 风格标签、自然语言描述，及两者混写。可以在前部给标签，后部用准确英文句子补充具体外观/姿势。
2. 标签一般小写，多词以空格间隔；`score_7` 这类评分标签保留下划线。Danbooru/Gelbooru 名称有差异时优先 Gelbooru 形式。
3. 推荐开头（官方样式）：`masterpiece, best quality, score_7, safe`。
4. 推荐负向（官方样式）：`worst quality, low quality, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, chromatic aberration`。
5. 推荐标签整体顺序：质量/元信息/年代/安全 → 角色数量 → 角色 → 作品 → 作者风格 → 其他描述；同一类内部顺序不严格。
6. 作者风格标签前需要 `@`，例如项目的 `@akipekostyle`（**该具体风格名是项目配置，不是官方推荐的指定画风**）。
7. 自然语言提示：短得离谱可能出现不符合预期的内容；纯自然语言最好有两句以上具体描述。自然语言与标签可自由组合；多人物时每个人都应该明确描述外貌，而不是仅写名字。
8. 模型存在局限，例如可能出现不需要的细节或错误文本。官方**未承诺**准确执行单图多视角、三视图排列或保证不同图中服装一致，也未把重复 `EXACT` 认定为有效锁视角机制。
9. Anima-Aesthetic 的评分标签建议与 Base 不同，Aesthetic 不建议照搬 Base 的评分标签组合；不要混用版本配方。

## 2. 官方 Generation settings（区分版本）

- **Anima Base：** 支持约 512² 至 1536² 像素范围；推荐 **30–50 steps**、**CFG 4–5**。
- **`er_sde`：** 中性、平涂、较清晰线条，官方列为合理的默认采样之一。
- **`euler_a`：** 更柔和细线，有时带 2.5D 感。
- **Anima Turbo：** 官方建议 **8–12 steps**、**CFG 1**，与 Base 不可混成同一设置。

## 3. 本游戏的固定生产约束（用户要求，非 Anima 官方功能）

- 老版本基准风格为 `@akipekostyle, <lora:akipekoanima_v1_1:0.65>`；除非用户明确更改，**不添加 Munji 或别的 LoRA**。`<lora:...>` 是本项目 Forge Neo / 本地 LoRA 习惯写法，不是 Anima 官方模型卡的预装标签。
- 视图只有三格时：**纯正面 0° → 朝左纯侧面 90° → 纯背面 180°**；每格全身、自然站立、双臂下垂。四格版本才有第四格专属**可持续**生活待机动作；角度默认纯正面。不可擅自调换顺序。
- 外观、服装、颜色、穿法、头发、鞋子在全部视图一致；不可在侧面或特殊动作脱外套或添加未经许可的道具；不画可见眼睛。没有家具/背景/强定向灯光。
- 使用简短具体的标签与自然语言要求；**不得反复堆 `EXACT`、`MUST` 等冒充官方有效的控制词**。能写清要求，不等于模型可以可靠执行。
- NPC 三视图/四视图模板请**同时先读** [已批准老人 M003 的用户原文](NPC-M003_ANIMA_APPROVED_FOUR_POSE_USER_PROMPT_20261108.md) 与 [NPC 四格规范](NPC_FOUR_POSE_DEVELOPMENT_WHITEPAPER_V1_20261108.md)。老人原文在 GitHub 是真实用户提供的，不得改写后冒充原文。
- 如果生成结果缺侧面、背面、衣服漂移，应据实判为失败。若反复失败，建议基于**同一个人物自己的批准原图**做视角参考/局部修复，而不是继续加入大量重复方向词。三视图无需强行加第四格。
- 模型导出的白底 RGB 不等于真透明；游戏导入前须在批准后分割并校验 RGBA Alpha。未获审核不得改动人物集中的批准资源。
- 当前 Base 首测参数 **ER SDE / 35 Steps / CFG 4.5 / 1536×1024** 属于**项目选择**，而不是官方唯一标准或成功图可核验元数据。

### 2026-11-08 用户最新指令：自然动作三视图（项目特例）

上述“前三格站姿、双手下垂”不再是后续所有人物的强制要求。**以后新人物三视图可以分别是不同的小幅自然生活动作**：边走边看手机、轻快自然步行、慢慢散步，保持正面/左侧/背面朝向正确、人物一致、动作舒服且无遮挡。旧图不追溯修改，具体见 [学生妹三人队第一位完整动态三视图](NPC_SG01_ANIMA_DYNAMIC_THREE_VIEW_PHONE_WALK_20261108.md)。**这属于用户游戏美术项目的最新规则，不是 Anima 官方对多视图动作准确性的承诺。**

### 学校角色 LoRA 例外（2026-11-08 用户新要求）
女主学校新学生三视图的项目 LoRA 强度改为 `<lora:akipekoanima_v1_1:1.0>`；普通路人历史 Akipeko 0.65 的已批准图像保持不变。此权重不是 Anima 官方固定值；仅适用于本项目用户当次要求。

## 4. 每次编写 Anima 提示词的强制开工顺序（不准跳过）

1. **先读本文件，打开并核对官方 Prompting 和 Generation settings 链接**；检查官网是否已改版。不能访问时明确说出。
2. **读本项目风格锁**：[ANIMA_CHARACTER_ART_STYLE_LOCK_V1.md](ANIMA_CHARACTER_ART_STYLE_LOCK_V1.md)。
3. **若是 NPC，读老爷爷已批准原文与当前三/四格合同**；如果是已有角色，读该角色当前的批准母图/文档，不用失败旧稿。
4. **按用户当次明确要求写完整可直接复制的正向和负向文本**，不需要用户自行拼接；不编造官方支持的精确姿态功能。
5. **交付前校对** 视图数量、顺序、角度、是否缺失侧面/背面、衣服一致性、是否有眼睛或多余道具、LoRA 权重、模型与版本参数。
6. 如果没有实际运行 Anima 或图像验收，只报告「提示词已写」，不能承诺「一定生成正确」或「美术已批准」。

## 5. 老错误对照

- **错误：** 「只要写很多遍 EXACT 90 DEGREE，官方就会识别侧面。」→ **事实：** 官方并无这种准确控制承诺。
- **错误：** 「把 Base 的 CFG/steps 拿去 Turbo。」→ **事实：** 两个版本建议配置不同。
- **错误：** 「下一次直接换画风/加配件/换动作。」→ **事实：** 改画风、身份、配件或动作必须来自用户明确要求；不得擅改已批准母版。
- **错误：** 「白背景就等于透明 PNG。」→ **事实：** 需要检查 PNG Alpha。

---

维护者注意：如以后官方说明更新，应先更新本文件中的引述/转述、核对日期和相关工作流程，再创建新的 Anima 提示词。不得删除 GitHub 中已批准 M003 原文。
