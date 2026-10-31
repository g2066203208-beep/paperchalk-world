# PIXEL CHARACTER AI LAB — 文献综述与研究重设计 v0.2（2026-10-31）

> **学术诚信说明**：本文件首先是经 DOI/出版商/会议论文集核对的、可追溯的**定向文献核查**，不是已完成的系统综述（systematic review）、元分析或已证明新颖性的论文。没有原始训练结果不得写成「优于 SOTA」。不把 GitHub 项目、预印本或论文摘要当作已复现结果。
>
> 本项目已有 R0=48×64 规则精灵及 R1=小型条件 masked-token 网络源码。两者都不是高精度全身像素立绘/插画的已验证生成模型。新增加的 high-resolution tiles/refiner 只是**native-grid 数据与条件细化原型**：其 guide 来源于目标图的 block-majority，所以只能用于已知粗构图的细化研究，不能评价为「无条件生成」；若粗 guide 从真实测试图产生，必须在实验报告标为 oracle conditioning，且不能与没有相同信息的模型公平比较。

## 0. 课题的严格定义

**研究对象**：在已授权、原生像素艺术素材上学习，生成/编辑 192×256～384×512 的高质量全身人物及 512×512～1024×768 的游戏场景。输出必须保留离散网格、可控色板、轮廓连贯、语义与角色身份；与通用 AI 图像「像素化滤镜」区别对待。

**研究任务须拆开**：T1 Text/attribute→sprite（原创人物生成）；T2 reference character+pose→sprite（保留面相与身份）；T3 scene graph/semantic layout→pixel scene（组合场景）。T1/T2/T3 绝不混用训练输入、指标和创新性主张。人物的 48×64 只作退化/工程基线，不作为高精度目标规格。

## 1. 经过出版平台核对的直接相关论文（优先级最高）

| 论文和出处 | 方法、可直接验证的贡献 | 局限、对本课题的意义 |
|---|---|---|
| Coutinho & Chaimowicz (2022), **On the Challenges of Generating Pixel Art Character Sprites Using GANs**, AAAI AIIDE 18(1):87–94. DOI: [10.1609/aiide.v18i1.21951](https://doi.org/10.1609/aiide.v18i1.21951) | pix2pix 风格的角色方向转换；测试色板表示、直方图损失；报告色板表示可能促进过拟合。 | **反证「像素 token 自动更好」**。必须把过拟合/跨角色测试作为研究核心，不能只报告合法颜色。 |
| Coutinho & Chaimowicz (2024), **Pixel art character generation as an image-to-image translation problem using GANs**, *Graphical Models* 132:101213. DOI: [10.1016/j.gmod.2024.101213](https://doi.org/10.1016/j.gmod.2024.101213) | 多组小数据集（每组 <1k）及约 12k 大数据集；front/right/back/left 四域转换；混合主动式精灵编辑器。 | 已完成多姿态/多视角 GAN 思路。我们不能把「姿态补全」直接声称为新颖贡献。 |
| Coutinho, Chaves & Chaimowicz (2025), **Imputation of missing pixel art character poses with differentiable palette quantization**, *Entertainment Computing* 55:101021. DOI: [10.1016/j.entcom.2025.101021](https://doi.org/10.1016/j.entcom.2025.101021) | 多个输入姿态预测缺失姿态；可微色板量化、palette coverage loss、conservative input dropout。 | **以前遗漏的关键先行工作**；禁止再把「可微色板量化」「色板覆盖损失」「多视角补全」称为我们的独创。应作为最直接的比较基线与待复现工作。 |
| Binninger & Sorkine-Hornung (2024), **SD-πXL: Generating Low-Resolution Quantized Imagery via Score Distillation**, *SIGGRAPH Asia 2024 Conference Papers*, article 17. DOI: [10.1145/3680528.3687570](https://doi.org/10.1145/3680528.3687570) | 以 H×W×N 的类别表示、softmax / Gumbel-softmax 和 score distillation 实现文本及可选参考图驱动的量化图像生成。 | 是真正面向像素/受限色板的强基线，但对高精度角色身份、人物骨架跨动作和复杂场景编辑的适用性必须实测，不能凭展示图认定。 |
| Nikolov (2025), **Light the Sprite: Pixel Art Dynamic Light Map Generation**, Eurographics Short Papers. DOI: [10.2312/egs.20251032](https://doi.org/10.2312/egs.20251032) | 从精灵与光照参数学习光照图，支持实时重新照明。 | 光影应独立研究，不是主生成模型质量的替代指标。 |

## 2. 基础生成模型与高分辨率控制文献（已发表，但不是像素人物专用）

| 方向 | 经核实的来源 | 对我们的技术启示与不适用边界 |
|---|---|---|
| 条件图像转换 | Isola et al., Pix2Pix, CVPR 2017, [CVF](https://openaccess.thecvf.com/content_cvpr_2017/html/Isola_Image-To-Image_Translation_With_CVPR_2017_paper.html) | T2 的标准基线；但 RGB 连续域预测不保证整数像素 / 有限色板。 |
| 离散潜表示 | van den Oord et al., VQ-VAE, NeurIPS 2017, [论文](https://mlanthology.org/neurips/2017/vandenoord2017neurips-neural/) | 应评估编码器压缩引起的轮廓/眼睛失真，不能认为 latent 模型天然保像素。 |
| 高分辨率分层 token | Esser et al., Taming Transformers, CVPR 2021, [CVF](https://openaccess.thecvf.com/content/CVPR2021/html/Esser_Taming_Transformers_for_High-Resolution_Image_Synthesis_CVPR_2021_paper.html) | 全局/局部结构协同，支持布局引导；**不是**把 48×64 最近邻放大到 384×512。 |
| 离散迭代生成 | Chang et al., MaskGIT, CVPR 2022, [CVF](https://openaccess.thecvf.com/content/CVPR2022/html/Chang_MaskGIT_Masked_Generative_Image_Transformer_CVPR_2022_paper.html) | R1 的 masked-token 思路来源；目前 R1 仅为小 CNN masked model，**不可称 MaskGIT 复现**，缺少其双向 Transformer、tokenizer、mask schedule 等关键设计。 |
| 高分辨率扩散 | Rombach et al., Latent Diffusion Models, CVPR 2022, [CVF](https://openaccess.thecvf.com/content/CVPR2022/html/Rombach_High-Resolution_Image_Synthesis_With_Latent_Diffusion_Models_CVPR_2022_paper.html) | 可作通用/条件基线，但 codec 的重建保真风险必须额外测量。 |
| 空间控制 | Zhang et al., ControlNet, ICCV 2023, [CVF](https://openaccess.thecvf.com/content/ICCV2023/html/Zhang_Adding_Conditional_Control_to_Text-to-Image_Diffusion_Models_ICCV_2023_paper.html) | 可作为姿态、分割图和深度约束的启发；输出仍需原生像素处理及实测。 |
| 直接像素空间 | Yu et al., PixelDiT, CVPR 2026, [CVF](https://openaccess.thecvf.com/content/CVPR2026/html/Yu_PixelDiT_Pixel_Diffusion_Transformers_for_Image_Generation_CVPR_2026_paper.html) | 其 "pixel" 指 **RGB 像素空间扩散**，而不是证明其擅长游戏 pixel art。不可借用 ImageNet FID 代表像素美术水平。 |

## 3. 研究综述与方法学基底

- Fukaya, Daylamani-Zad & Agius (2025), **Intelligent Generation of Graphical Game Assets: A Conceptual Framework and Systematic Review of the State of the Art**, *ACM Computing Surveys* 57(5), article 118. [DOI 10.1145/3708499](https://doi.org/10.1145/3708499)。报告纳入了 239 篇文献，提示必须将角色、场景、贴图、动画和可编辑性区分分析。
- **Image-Based Video Game Asset Generation and Evaluation Using Deep Learning: A Systematic Review of Methods and Applications**, *IEEE Transactions on Games* 17(3):622–630 (2025); first online 2024-10-28. [DOI 10.1109/TG.2024.3487054](https://doi.org/10.1109/TG.2024.3487054)。特别需要检查图像资产评价指标是否契合像素艺术。
- Coutinho & Chaimowicz (2024), **A Missing Data Imputation GAN for Character Sprite Generation**, [arXiv:2409.10721](https://arxiv.org/abs/2409.10721)，以及同作者的 SBGames 2024 版本属同一研究谱系；**不能当作与 2025 Entertainment Computing 扩展论文完全独立的三次证据**。

## 4. 已有研究支持什么，尚不支持什么

**已经有相当直接的先行工作**：姿态转换、缺失姿态预测、有限色板可微优化、利用预训练模型进行文字/参考图条件的量化图像生成。仅实现这些功能不足以声称论文创新。

**有待验证的组合式研究缺口（是问题，不是已经证明的空白）**：
1. 192×256～384×512 全身像素立绘中的细粒度脸部、五官与发型身份一致性；
2. 原生像素约束与跨动作角色一致性/长期编辑性之间的耦合；
3. 512×512 以上多角色场景的全局布局—局部像素协同及无缝连续性；
4. 公平、领域适配的人类偏好/身份/修订工时评价体系。

## 5. 预注册研究问题与模型对照

- **RQ1（表示）**：严格离散 RGBA/色板输出能否在**不增加过拟合**的前提下提高像素结构真实性？对照：Pix2Pix-RGB + post-quantize vs Pix2Pix/2025 palette-aware GAN vs direct categorical decoder；相同数据、姿态条件和训练预算。
- **RQ2（身份）**：加入人脸局部标注和 reference-condition 能否降低跨动作/视角的身份漂移？对照：姿态-only vs reference+pose vs reference+pose+face-mask；严格按人物 identity_id 划分训练/验证/测试，交叉艺术家风格外测。
- **RQ3（规模）**：高分辨率的 global-layout + local-refine 相比独立 tile 或 naive resize 是否提高整体人体/场景结构一致性？对照：整图端到端、独立 tile、global-guided tile，**所有方法必须得到相同的参考信息**。对 oracle guide 的实验单独分组，禁止与无引导生成混排。
- **RQ4（人机共创）**：模型 + 审计 + 艺术家编辑，能否在同一视觉质量阈值下减少编辑时间？随机分配任务，保留失败样本和审稿者盲评。

**必须报告的指标**：严格分辨率/色板/α 合法率（工程约束）；分离区域的眼睛/发型/服饰 PCK/IoU；人工身份 A/B 盲评及独立绘师一致性；多样性/近重复；脸部结构错误率；边缘孤岛/色块连通度；端到端编辑时间；推理耗时和峰值显存。FID/KID/LPIPS 可作为辅助而不是唯一指标，且须声明预训练特征对小型像素图的领域偏差。

**预注册原则**：在看 test 结果之前冻结评价阈值、holdout identity IDs、train/val/test hashes、训练预算和模型搜索范围。至少 3 个随机种子；报告均值、95% bootstrap CI、所有负面案例和参考版权。不要用 test 集选择 checkpoint——只在 val 上调参，test 留到最终一次评估。

## 6. 可复现文献审查流程（未声称已完成）

目标数据库：ACM DL、IEEE Xplore、CVF Open Access、Elsevier ScienceDirect、Eurographics Digital Library、DBLP、Crossref（查 DOI/出版身份）、arXiv（预印本单列）。

建议检索式：
`("pixel art" OR "sprite" OR "game asset") AND ("generation" OR "diffusion" OR "GAN" OR "transformer" OR "image translation")`
再分别扩展 `("palette quantization" AND generative)`、`("character identity" AND pose generation)`、`("game scene" AND procedural generation)`。

记录检索日期、数据库、原始检索式、命中数、去重数、纳入/排除原因、论文证据表、授权与复现代码；附 PRISMA 式流程记录时明确该流程是否完整执行。**本文件是起点，不伪称已有全面覆盖/显著性结论。**

## 7. 工程状态与论文声称的边界

- PR #125 中 R0 硬约束/网站演示、R1 CNN masked-token 原型：可运行 ≠ 高质量模型。
- 本研究分支的 `large_canvas.py`：尺寸契约与无损拼接工程；`tile_refiner.py`/`train_large.py`：带粗指导的实验架构；**不等于从文本生成高精度像素插画**。
- 真正的高质量训练/完整同行评议论文仍需：可合法训练的代表性数据；强基线复现；真实且相同预算的对照；盲评；消融；公开失败案例；审计日志。
