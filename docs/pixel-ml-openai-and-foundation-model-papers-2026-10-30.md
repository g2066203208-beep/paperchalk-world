# PIXEL LAB：OpenAI / 其他图像生成研究的真实使用审计（2026-10-30）

## 审计结论（直接核对 GitHub main 分支代码）
- **当前没有使用 OpenAI 论文的原始架构或 checkpoint**；不存在运行中的 OpenAI iGPT、PixelCNN++、CLIP、Guided Diffusion、Consistency Models、DALL-E 技术栈。
- `ml/repixelize/engine.py` 使用定性色块分类/网格投票；`ml/repixelize/train.py`、`ml/style2/train.py` 使用小型 NumPy 邻域 MLP + Adam；这不是扩散训练，也不是逐步自回归生成。
- `ml/train_characters.py` 用简易 VAE 和 REINFORCE，`ml/train_rl.py` 用表格 Q-Learning。这些属于通用学习范式，不等于已经复现哪篇视觉生成大模型论文。
- **目前没有 PyTorch、JAX、diffusers、transformers 或 OpenAI 官方图像库依赖**：`ml/requirements.txt` 只有 NumPy、Pillow。
- 两幅 D「雾樱玻璃」样本是**同一角色的两个姿势**，不能以同身份的留出测试声称获得未见角色的风格泛化。
- 本目录的资源只是论文与实现来源清单；它们还未下载、集成、复现或部署。是否能够用于商业游戏需分别核对代码、权重、数据集许可。

## OpenAI 论文与公开实现

| 论文（年份） | 研究贡献 | 对 Pixel Lab 的价值 | 代码 | 当前状态 |
|---|---|---|---|---|
| PixelCNN++ (ICLR 2017) | 掩码卷积条件生成、逐像素似然；OpenAI 改良实现 | 系统 02：逐像素原生生成的基础基线，但旧 TF 代码已存档 | https://github.com/openai/pixel-cnn ; https://openai.com/index/pixelcnn-plus-plus/ | 未用 |
| Generative Pretraining from Pixels / Image GPT (ICML 2020) | Transformer 自回归预测像素序列 | **最贴近逐像素 AI 画像素画的 OpenAI 论文**；能作 32/64px 四色 Token 的小规模架构参考 | https://openai.com/index/image-gpt/ ; https://github.com/openai/image-gpt | 未用，官方代码已存档/环境古老 |
| CLIP (ICML 2021) | 文本与图像对比式表征 | 素材语义/角色说明条件、自动检索、粗粒度相似度；不能确保精确四色和美术质量 | https://openai.com/index/clip/ ; https://github.com/openai/CLIP | 未用 |
| Improved Denoising Diffusion Probabilistic Models (ICML 2021) | 可学习反向过程方差等训练/采样技术 | 系统 01/02：扩散图像修复与生成基础 | https://proceedings.mlr.press/v139/nichol21a.html ; https://github.com/openai/improved-diffusion | 未用 |
| Diffusion Models Beat GANs on Image Synthesis (NeurIPS 2021) | Classifier-guided diffusion 提高生成保真 | 角色类别/控制条件实验 | https://arxiv.org/abs/2105.05233 ; https://github.com/openai/guided-diffusion | 未用 |
| GLIDE (ICML 2022) | 文本条件扩散与 inpainting；对比 CFG 和 CLIP guidance | 固定服装/姿势区域内局部修饰草稿 | https://proceedings.mlr.press/v162/nichol22a.html ; https://github.com/openai/glide-text2im | 未用 |
| DALL-E 2: Hierarchical Text-Conditional Image Generation with CLIP Latents (2022) | 文本→CLIP 图像嵌入→扩散图像解码 | 角色身份、描述及图像条件分层设计 | https://openai.com/index/hierarchical-text-conditional-image-generation-with-clip-latents/ | 未用 |
| Improving Image Generation with Better Captions (DALL-E 3, 2023) | 改善标注和重新描述训练集，提升文本遵循能力 | 高质量角色设定标注、部件标签、服装设计说明 | https://openai.com/index/dall-e-3/ | 未用 |
| Consistency Models (2023), Improved Techniques (2023/24) | 一步/少步近似扩散采样 | 在线 GPU 降本和低延迟编辑的长期方向 | https://openai.com/index/consistency-models/ ; https://github.com/openai/consistency_models ; https://openai.com/index/improved-techniques-for-training-consistency-models/ | 未用 |
| Continuous-time Consistency Models improvement (2024) | 改进少步采样稳定性与扩展性 | 今后在线生成性能研究 | https://openai.com/index/simplifying-stabilizing-and-scaling-continuous-time-consistency-models/ | 未用 |

**OpenAI 当代图像产品**：`4o Image Generation (2025)`、`ChatGPT Images 2.0 / 2.5 (2026)`有官方产品说明/系统卡，但**不是一份已公开的、可完整复现实验的模型训练论文+源码**，不能凭产品效果假定能够在仓库复现，也不能臆断其内部算法：
- https://openai.com/index/introducing-4o-image-generation/
- https://openai.com/index/introducing-chatgpt-images-2-5/

## 其他团队/研究机构（只选和本项目密切相关的）

| 团队/论文 | 技术重点 | 最相关任务 | 来源及实现 | 当前状态 |
|---|---|---|---|---|
| Google Research — MaskGIT (CVPR 2022) | 双向 Transformer 预测被遮盖 token，多轮并行细化 | 系统 02：四颜色离散像素的区域补绘；避免 196608 个像素的纯串行输出 | https://research.google/pubs/maskgit-masked-image-generative-transformers/ ; https://github.com/google-research/maskgit | 未用；仓库归档，旧版 JAX |
| Google — Muse (ICML 2023) | 文本条件 Masked Token Transformer | 类别、角色设定与跨资产条件生成 | https://proceedings.mlr.press/v202/chang23b.html | 未用 |
| Google DeepMind — Image Generators are Generalist Vision Learners (2026，arXiv) | 图像生成表征同时促进视觉理解 | 结构分割、资产评价研究；并非四色像素专用 | https://deepmind.google/research/publications/240658/ | 未用 |
| CompVis / Stability AI / Runway — Latent Diffusion (CVPR 2022) | 在潜空间扩散，大幅降低普通图像成本 | 生成角色/场景草稿，不保证真像素 | https://openaccess.thecvf.com/content/CVPR2022/html/Rombach_High-Resolution_Image_Synthesis_With_Latent_Diffusion_Models_CVPR_2022_paper.html ; https://github.com/CompVis/stable-diffusion | 未用 |
| DiT (Peebles & Xie，ICCV 2023，大学研究；由 facebookresearch 发布官方实现) | Transformer 扩散网络替代 U-Net | 更好的条件扩散 backbone | https://openaccess.thecvf.com/content/ICCV2023/html/Peebles_Scalable_Diffusion_Models_with_Transformers_ICCV_2023_paper.html ; https://github.com/facebookresearch/DiT | 未用 |
| Meta — Transfusion (2024) | Token 自回归 + 图像扩散一体化 | 合并角色描述与可控图像生成的长期方向 | https://ai.meta.com/research/publications/transfusion-predict-the-next-token-and-diffuse-images-with-one-multi-modal-model/ | 未用 |
| NVIDIA / University of Rochester — PixelDiT / PixelDiT2 (CVPR/NeurIPS 2026) | 去掉 VAE 的 pixel-space diffusion + 表征驱动 | 学习真正像素空间生成，**不等于**离散像素美术 | https://github.com/NVlabs/PixelDiT | 未用 |
| ETH Zürich — SD-πXL (SIGGRAPH Asia 2024) | 指定 W×H×n 颜色格的直接优化、可微色板 | **系统 01 最贴近的论文**，直接控制网格和 D 四色 | https://github.com/AlexandreBinninger/SD-piXL | 未用；GPU 成本较高 |
| Coutinho 等 — Imputation of missing pixel art character poses with differentiable palette quantization (Entertainment Computing 2025) | 角色动作补全 + 调色板可微约束 | 系统 02：人物多姿势一致性 | https://doi.org/10.1016/j.entcom.2025.101021 | 未用，复现资源/数据许可待核实 |

## 两系统的试验优先级（避免“看过=实现”）
- **系统 01：真像素转换**：在独立小样本 A/B 测试中尝试“FFT/Sobel 网格定位（参考 PerfectPixel 思路）+ 四色逐像素 logits + 保形约束”，与当前面积投票基线对比。SD-πXL 的思想最相关，但完整 Diffusion/score distillation 版不宜直接假定能在 GitHub Pages 免费 CPU 上运行。
- **系统 02：学习画像素**：先在 32×32 或 64×64、4 色模型上比较 `iGPT/PixelCNN++ 风格自回归` 与 `MaskGIT 风格双向掩码并行迭代`。后者可批量预测像素，效率可能更合适。
- **生成草稿**：从扩散/DiT/SD 等生成语义大形后再走系统 01，对姿势、角色服装整体/大色块进行独立人工评审。
- **验收**：不得只看像素分类准确率，必须比较不同角色身份、独立场景、道具、角色多动作、轮廓和色板保持、像素簇、真实游戏缩放效果。
- **许可**：论文可阅读不等于代码可商用、数据可训练；严格分开代码许可/权重许可/训练数据许可。

该文记录的是**已核实论文与仓库状态及待实施架构**，没有声称任何新模型已经移植、训练或上线。
