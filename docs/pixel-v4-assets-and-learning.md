# PixelLab V4 — 13 张图像整合，严格 D 四色（2026-10-30）

- **训练正样本只有两张正式母版**（原画与其站姿，实际上是同一个身份），在 `ml/style2/v4_dataset_packed.json` 内保存完全无损的 384×512 四色 2-bit Tokens。
- 另外九张此前生成的 AI 草稿也已经转换并记录，但用户多次指出脸型、衣服、发丝、配色和姿势不合格，所以仅作**低质量对照集**，**不得直接作为高品质像素画训练目标**。
- 一张程序化原生像素新角色候选进入待审状态。此作品尚未达到母版的人物脸部/服饰美术质量，不得作为正式母版。
- 一张多视角/动画设定表被转换记录但标记 `excluded_multipanel`，禁止作为单人人物训练输入。
- `ml/style2/v4_pipeline.py --train`：先无损还原这 13 张 PNG，再仅用 gold A 合成模糊/噪声监督训练四色修复 CNN，以 gold B 全图留出测试；神经模型不能在全部整图及前景指标超过传统基线，则**只采用确定性处理**。
- 转换成功 = 384×512、刚好四种颜色、背景不含渐变；**不等于原创美术完美，更不等于已训练出会画新人物的最强模型**。
- 现有 V2 程序化离散生成和 V3 384×512 细节模型保持原样。下一步需要更多经人工验收的**不同人物身份**、多姿势、真实原创场景与道具，才能可靠训练新人物生成器。
- GitHub Pages V4 页面：`site/pixel-lab/v4-review.html`。用户可在正式母版、AI 草稿、新人物候选和排除样本间切换，下载原生 PNG、检查网格和查看真实实验指标。

### 运行
```bash
pip install numpy Pillow torch
python -m ml.style2.v4_pipeline --train
python -m unittest discover -s tests -p 'v4_pipeline_checks.py'
```
