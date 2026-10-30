# Pixel Lab · 2026 公开研究与实现技术审计
> 截至 2026-10-30；此文是文献与源码调查，不是已经移植/跑通的宣称。

## 目标和基线

项目已有两部分：
1. REPIXEL：已有图像 -> 指定原生网格 + D 固定四颜色，尽可能保持构图与像素簇；
2. LEARN：训练从结构条件/类别/姿势生成角色、道具、场景和动画。

当前 D 色板：`#393657 #F2A5C2 #A9BAE9 #FFF5E6`。
两幅现有画面是**同一个人物的两个姿势**，不是两个人物身份；不能用其像素随机留出准确率证明跨身份创作能力。现在的 `ml/style2/train.py` 是 3×3 RGB 修复 MLP 和 5×5 masked token 填色 MLP，逐像素分类训练不等于能够进行整幅图的自回归生成。

## 核验过的资源（优先级从高到低）

| 资源 | 日期 / 领域 | 代码/模型 | 相关性 / 限制 | 许可证或风险 |
|---|---|---|---|---|
| **SD-πXL** | SIGGRAPH Asia 2024；真正受限像素/调色板优化 | https://github.com/AlexandreBinninger/SD-piXL；https://alexandrebinninger.com/SD-piXL/ | 直接在 H×W×n 离散色板格中优化，支持图像+文字+指定 palette，Gumbel Softmax。作为 REPIXEL 基础最直接；官方 README 说明可能数小时、建议约 24 GB VRAM，不能视作轻量可即用。 | 代码 MIT；底层模型另查 |
| **Missing pixel art poses + differentiable palette** | Entertainment Computing 55 (2025), 101021, DOI 10.1016/j.entcom.2025.101021 | 论文 https://doi.org/10.1016/j.entcom.2025.101021；同团队以前的公开实现 https://github.com/fegemo/mdigan-characters | 多视角 sprite 补全、可微调色板量化、palette coverage loss。不是“两张图就能学会生成新身份”；论文 2025 版代码未独立证实。 | 旧仓库许可证需核实，不直接复制进生产 |
| **Palette Aligned Image Diffusion** | Computer Graphics Forum, published 2026-03-30, DOI 10.1111/cgf.70384 | https://doi.org/10.1111/cgf.70384 | 用户指定色板的概率分布条件、正负颜色指导；条件不等于硬四色。没有核实官方可用完整代码。 | 尚需核实 |
| **PixelDiT / PixelDiT2** | CVPR 2026 / NeurIPS 2026 accepted | https://github.com/NVlabs/PixelDiT；论文 https://openaccess.thecvf.com/content/CVPR2026/html/Yu_PixelDiT_Pixel_Diffusion_Transformers_for_Image_Generation_CVPR_2026_paper.html | patch/global + pixel/local 双层建模；训练代码和权重公开，但面向一般图像不是离散四色 pixel art。参数/算力大，仅作架构研究。 | 核验 LICENSE/模型条款后引入 |
| **BitPixelLM** | HF 2026 研究模型 | https://huggingface.co/BlakePeavy/BitPixelLM | 32×32、256 色、每一个 pixel 一个离散 token、7.4M 参数、1024 token 自回归，提供权重。比基于 5×5 的局部分类更贴合序列生成；样本来自程序化合成，质量和泛化需自行评估。 | 模型卡 MIT，数据/代码再核 |
| **PixelLLM** | GitHub 实验模型 | https://github.com/danfking/pixel-llm | 32×32、固定色板小型自回归 Transformer；作者明确自评结果不佳，适合作为失败基准和实现参考。 | MIT |
| **sprite-gpt / sprite-diffusion** | HF + GitHub, 2026 | https://github.com/gmmeyer/sprite-diffusion；https://huggingface.co/gmmeyer/sprite-gpt | 在 32/64 px 原始像素空间用 rectified-flow，文字控制的 64px 版本 61.9M 参数。不是硬四色，数据混合 emoji/sprites，文档坦承有部分记忆训练样本与绿背景污染。 | HF 权重 CC-BY-SA 4.0；非全 CC0，生产许可证需审查 |
| **Alucard** | 社区 128×128 文生 Sprite/上一帧生成下一帧 | https://github.com/evilsocket/alucard；https://huggingface.co/datasets/evilsocket/alucard-sprites | 32M 条件 flow matching，支持前一帧参考，适用于结构设计研究；模型链接目前公开访问状态不可靠，不能保证可以直接下载权重。 | FAIR License，商业/公司用途有额外约束；不直接纳入生产 |
| **PXG-Tiny** | 2026-08-27，16×16 研究/离线 demo | https://github.com/tarulahsan/PXG-Tiny-AI；https://huggingface.co/Tarul/pxg-tiny | 483k 参数、NumPy CPU 离线，作者声称 38 类；过小，不匹配高细节立绘，指标需要独立抽样验证。 | 代码 MIT、作者声称程序化语料 CC0 |
| **PixelGPT 24×24 20K** | 2026-07，HF 公开低分辨率数据 | https://huggingface.co/datasets/unstonio/pixelgpt-24x24-20k | 20k 图片、24×24、≤5 色、caption / taxonomy，适合道具/小图预训练；与 D 风格高分辨率人像相差大，不可直接当 D 风格训练集。 | 页面标注 CC-BY-4.0，但历史 LICENSE 提交曾含占位提示；下载前再核对当前原文及原图来源 |
| **LPC action / multiview** | HF 2025 角色动作数据 | https://huggingface.co/datasets/carlosuperb/lpc-action-pixel-art-diffusion；https://huggingface.co/datasets/carlosuperb/lpc-4view-pixel-art-diffusion | 50k 左右动作样本/多视角；有助于身份-姿势条件研究。与 D 画风不一致，且不能直接用动作表复制风格。 | 明确附带 LPC 归属/同样方式共享约束，先核授权 |

另可参考 2024 期刊 **Graphical Models**: https://doi.org/10.1016/j.gmod.2024.101213；2022 AIIDE 的早期负面证据：直接色板编码可能导致过拟合：https://doi.org/10.1609/aiide.v18i1.21951。

## 技术选型决定：保持唯二主系统

### 01 转真像素
- 在固定原生尺寸上针对每个像素维护4维 logits `[H,W,4]`，在四种 D 色中选一色；
- 损失：输入结构约束、轮廓/边界结构损失、颜色类别监督、像素簇连续性和少量稀碎区域惩罚；
- 小规模先独立验证 differentiable palette + Gumbel Softmax 的确能提升眼睛、发丝与衣角，才考虑嵌入语义扩散引导；
- 确保所有预览能以真实 1× 像素 / 网格放大观看，禁止先双线性缩小再假定“完美”；
- 最终评测同时比较原规则转换、改进版、原参考：精确四颜色只是硬约束，不是美术品质证明。

### 02 学习创作
- 起点不是当前 5×5 MLP；采用 `[0,1,2,3]` 四类离散索引作为 **actual pixel token**，另设透明/遮罩 token 如资产需要；
- 模型探索路径：小尺寸 32/64/96 基础版本的条件 Transformer（姿势图、语义 mask、角色身份/素材类别）对比 64px 条件 diffusion/flow；
- 大的 384×512 立绘有 196608 个原生像素，直接逐格全长自回归既慢且昂贵：优先**层次化布局 → 块/区域条件生成 → 原生像素修复**，所有最终像素仍为四类之一；
- 先用权属明确的众多不同身份、动作和类别数据预训练“像素规律”，再使用我们自己的**同人物双姿势 D 母版**作为验证风格锚点；
- 需要大量不同设计人物、场景、道具的**明确授权/自产**样本，禁止未经授权直接把日本画师作品抓去训练；
- 对角色的身份一致性、服装整体结构、姿势合理性、色块质量和可玩场景实际效果做人工验收。

## 必需评测，不用漂亮数字粉饰
- 把同一角色**所有姿势/变形**放在同一 split，留出**全新身份**测试；对场景道具分别跨作品/作者分组；
- 评价像素颜色合法性、轮廓 F1、cluster 离散性、背景污染、角色一致性、关键点姿势、版面稳定性；
- 与最近颜色、形态学修复、Pix2Pix/MLP 等传统基线做配对评测；
- 所有生成图同时展示模型原始输出、规则后处理版、在游戏摄影机比例下的实际外观；
- 不存在“只要是逐像素预测就自动好看”的保证，审美必须通过人工挑选和复核。

## 尚未完成
此审计没有下载运行外部大型模型、未重训 D 风格生成器、未导入第三方数据集。它是下一步源码整合和实验复现的可核验依据；不得在网页上将以上技术标成已实现。
