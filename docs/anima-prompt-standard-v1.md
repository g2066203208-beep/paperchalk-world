# PIXEL ATELIER | Anima 提示词规范 v1.0（2026-11-01）

> 来源优先级：Anima 作者模型卡 > 第三方插件/培训。此文件是本工作室的**提示词格式与实验规范**，不是官方认证的像素艺术 LoRA 配方。

## 0. 研发目标与边界
- Anima + LoRA 仅用于 **原创角色概念、像素艺术视觉方向探索**。最终的游戏资产必须通过独立的真原生像素制作/审核；Anima 的 1024×1024 “pixel art” 输出不应冒充原生24×24像素。
- 作者作品用于**观察/比较**，绝非已经有机器学习训练许可的素材。不要自动下载、复制原作或加进训练集。
- 工作室中同时存在24×24小人研究与192×256/384×512全身立绘研究，两者分辨率/目标不同，不能偷换。每个输出记录自己的目标网格。
- 未训练模型权重、没有授权数据、没有像素簇验收，不得自称“完美像素”。

## 1. Anima 官方规则（已核对）
来源：https://huggingface.co/UdonJP/Anima/blob/main/README.md （Prompting）
- Anima 支持 Danbooru 风格英文标签、自然语言说明及二者混合；标签不用穷举，训练时有随机 tag dropout。
- 官方标签排序：**[quality / meta / year / safety] → [1girl / 1boy / 1other...] → [character] → [series] → [artist] → [general]**。各组内部可调整。
- 官方安全标签包含 safe、sensitive、nsfw、explicit。本工作室的常规游戏角色默认写 **safe**。
- 画师标签必须是 **@画师ID**，否则影响非常弱；**但实际画师确有其人 ≠ 模型一定认识该标签**。模型识别需单独验证；禁止直接把从画师参考库收集的姓名批量添加为 @tag。
- 年份 newest/recent/year 2025 等是可选控制，不是必须堆叠的关键词；质量可用 masterpiece/best quality/score_9，但官方允许不放。
- 一般标签写小写、空格分词。例如 \`short hair\`，不要强行使用 \`short_hair\`。诸如 score_7 的标签保留官方用法。对应遵循模型和UI解析规则。
- 单行逗号分隔在工作室中作为**推荐导出格式**，并非模型卡的硬性要求：模型卡还支持多句自然语言。
- 正负提示词不必堆标签；优先用高信息量条件组织主体。

## 2. 画师标签验证SOP
1. 先记录画师真实资料、作品链接、媒介归类。
2. 另查模型的 artist-tag 词汇表／自动补全，确认是否存在**准确ID**及对应训练概念。
3. 固定模型版本、seed、采样参数，仅变更 0 / @artist 的对照组合，至少4种seed看是否真的影响。
4. 不保证 \`@m7kenji\`、\`@asaha\`、\`@1041uuu\` 等一定是有效Anima词汇；**未经测试不作为已验证tag推荐**。
5. 不因标签存在就推定可把其作品用于训练；训练授权与提示词风格引用是两件事。
6. 若需要个人原创可辨识风格：优先研究可复用的艺术手法（像素簇、轮廓阶梯、色彩组织、构图、动画法则）而非仿制某位在世画师的作品。

## 3. 工作室标准正向模板
### A — 24×24 小人概念（不是24×24原生输出保证）
\`masterpiece, best quality, safe, 1girl, original character, solo, full body, standing, front view, neutral pose, short brown hair, round face, wide-set eyes, compact body, simple shirt, plain trousers, simple shoes, pixel art, game sprite design, readable silhouette, limited color palette, clean color clusters, flat colors, minimal shading, simple background\`

### B — 人物独立剪影与可读五官
\`best quality, safe, 1boy, original character, solo, full body, standing, front view, long face, narrow shoulders, tall slender build, short curly hair, tired eyes, closed mouth, basic clothing, character sprite reference, clear head to torso connection, separate legs, simple boots, distinct silhouette, pixel art inspired, flat colors, plain background\`

### C — 酒吧/房间场景（参考构图）
\`best quality, safe, no humans, interior, small nighttime cafe, front counter, visible countertop surface, wall behind counter, warm single lamp, deep shadows, atmospheric lighting, pixel art, retro adventure game background, coherent perspective, large readable color clusters, limited palette, uncluttered composition\`

### D — 可爱表情动画的参考母图
\`best quality, safe, 1girl, original character, solo, full body, front view, small character, simple clothing, round face, short bob cut, expressive eyes, subtle smile, relaxed standing pose, pixel art character sheet reference, simple silhouette, limited palette, no props, light background\`

## 4. 常用负向（不是保证消除错误的硬性渲染器）
\`worst quality, low quality, blurry, jpeg artifacts, bad anatomy, cropped, cut off feet, extra limbs, missing arms, merged legs, unreadable face, cluttered background, glossy highlights, photorealistic, 3d render, text, watermark, logo\`

## 5. 像素美术结构检查：人工验收仍必要
- 24×24: 一格一索引色、透明alpha 0/255、6–12个主色是建议，不是美术成败的充分条件。
- 脸部：长脸/方脸/圆脸可比较，眼距/眼型/发际线真实改变。
- 人体：肩宽、头身比例、双脚支撑、双腿可分、肢体连接完整。
- 视觉：孤立像素必须有语义、避免浮动高光；轮廓上的1-2-3阶梯应由造型决定。
- 固定 seed × 多属性，固定属性 × 多 seed，与程序化基线、未训练基线、真实训练模型区分开。
- 必须保留失败样本，报告质量；无艺术审查通过不得宣传“完美”。

## 6. LoRA 不等于真像素
- 只选明确兼容 Anima 的 LoRA；SDXL/SD1.5/FLUX LoRA 不直接当 Anima 权重用。
- 先无 LoRA 固定测试，再单个 LoRA 比较 0.5 / 0.7 / 0.9 等权重（仅建议扫描区间，非官方最佳值）。
- 训练真正通用人物模型需要许可明确的原生人物数据、身份级拆分、结构与属性标注；不要把36人的职业装重组当作通用性。
- 生成高清外观像素风参考可以帮助设计，但不能自动作为“原生24×24训练真值”。

## 7. 日本像素艺术家研究库与授权
见 [网页参考库](../site/pixel-lab/anima-prompt.html)、\`site/pixel-lab/jp-pixel-artists.json\`。标记 \`Anima artist tag = unverified\`、\`training_rights = not cleared\` 是默认状态。重要例外：**渋谷員子（Kazuko Shibuya）是真正的日本职业游戏像素画师，不等同于此前误标为像素画师的吉田明彦/村田莲尔**。
来源：
- Anima 模型卡: https://huggingface.co/UdonJP/Anima/blob/main/README.md
- 34位画师作品集: https://pxl.beatnix.co.jp/book-new-pixel-art/
- Shibuya Pixel Art 2025: https://pixel-art.jp/spa2025
- the PIXEL MAGAZINE 画师目录: https://thepixel-mag.jp/artist/
- Square Enix 对渋谷員子的访谈: https://www.square-enix-games.com/en_GB/news/final-fantasy-pixel-remaster-kazuko-shibuya
