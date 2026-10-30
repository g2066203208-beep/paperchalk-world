# 2026-10-30｜原始论文核读与四色像素生成实验设计

> **这份记录仅声明已读论文方法和已提交的我们自己的小模型。**
> 不是把论文模型、权重或 8B checkpoint 原封不动移植，也没有将两张人物图说成可泛化的数据集。

## 直接阅读的最新论文和具体公式

### 1. PixelFlow (2025)，arXiv HTML 3.1–3.4
- 全文：https://arxiv.org/html/2504.07963v1
- Eq. (1) 从干净图像 `x1` 和噪声 `x0` 沿直线构造 `xt = t*x1 + (1-t)*x0`。
- Eq. (5) 训练速度场对目标端点差做 MSE。
- 3.2 单一模型跨分辨率训练；初始低分辨率、后续升到高分辨率。无额外预训练 VAE。
- **适配限制**：论文是连续 RGB 像素空间，不能自动保证四色离散 Token；不直接用于当前 48×64 模型。

### 2. Improved Mean Flows (CVPR 2026)
- 全文：https://arxiv.org/html/2512.02012
- §3–§4 原方法拟合平均速度 `u`，新方法把损失转成等价速度回归并改善条件 CFG 的可控性。
- 论文报告 ImageNet 256 一次模型评估（1-NFE）FID 1.72。这不是我们的数据、模型或 FPS。
- **适配限制**：适于未来 GPU 少步连续流；未取代离散四色模型。

### 3. MFlow (2026-10-16，预印本，非已录用论文)
- 全文：https://arxiv.org/html/2610.23854v1
- §3.2 Eq. (1–7) 针对主成分方向可学习混合 `x0` 与速度的预测参数；不是所有方向都用同一个噪声目标。
- §4 高频缺口与 ConvRefiner：关注生成图像高频保真。
- **适配限制**：对色块边缘有研究价值，但不是现成的像素画生成器，作者报告的 ConvRefiner 使用对抗训练，不能直接声称其解决 D 风格瑕疵。

### 4. Nemotron-Labs-Diffusion-Image (2026-06-29)
- 论文全文：https://arxiv.org/abs/2606.29814 （含网页可读正文）
- §2.1 Eq. (1)：Masked discrete diffusion 的随机遮挡 token 负对数似然；
- §3.2 & Appendix A.2 Eq. (11)：同时对已显示 token 加颜色/近邻的纠错扰动，而不只遮挡，用于模型学习纠正之前确认的错误；
- 论文对大 VQ codebook 采用 grouped CE；**四色 codebook 只有四类，没必要复刻 131072 类的 GCE**。
- **适配**：我们使用 5-token 输入 `0..3 + [MASK]`，损失以交叉熵监督真实四颜色，并在已显示像素中随机加入错误色训练；并行预测+可修正先前像素；不是其 8B 大模型。

### 5. Nemotron-Labs-Diffusion-Uni (2026-10-27 最新预印本)
- 论文全文：https://arxiv.org/abs/2610.36466
- §3.2 把 token 状态扩展为 `S = V × A`（离散 token + token age），逐 token 的状态年龄由 `0..K` 演化，而不是单纯从完全遮罩一步跳到确定的颜色；
- 其目标是更稳定的**逐 token 自修正**，并通过跨范式 on-policy distillation 从 AR VLM 与 flow teacher 迁移能力。
- **状态：只完成技术核读，尚未实现 token-age 过程或 teacher distillation**。它需要比我们的两图数据集大得多的资料和算力。

### 6. MaskGIT (CVPR 2022)
- 论文：https://openaccess.thecvf.com/content/CVPR2022/papers/Chang_MaskGIT_Masked_Generative_Image_Transformer_CVPR_2022_paper.pdf
- §3.1 随机掩码训练、双向网络预测；§3.2 所有被遮位置**并行**预测，并按置信度保留候选像素；多轮而不是全像素顺序采样。
- **差别**：官方算法使用向量量化图像 Token + Transformer；我们的轻量实验直接 4 个真实 RGB 颜色 Token + 残差空洞卷积，不能冒称原版 MaskGIT。

## 我们已提交的代码
- `ml/style2/discrete_diffusion.py`：自编 PyTorch 小模型，48×64、四种精确 RGB、随机 mask、错误色替换、加权 CE、并行解码和 visible-token correction。
- `site/pixel-lab/discrete-diffusion.html`：系统 02 内的研究子页面，默认逐像素网格，原始/粗形体/最终生成/遮挡修复四种视图，只展示**最终**结果，不把每一轮截图当美术交付。
- `.github/workflows/pixel-discrete-diffusion.yml`：手动执行的 CPU 训练及输出校验。没运行或未通过时，不宣称云端完成。

## 2026 具体路线决策
- **现在**：离散四颜色、带布局条件的并行生成 + 已确定 Token 纠错。用低分辨率形状引导从全 Mask 开始生成。
- **下次**：逐 token 年龄 `(color, age)` 与新鲜颜色修正，对比当前 Mask+Edit；并在独立新角色上留出测试，避免同身份高分。
- **之后**：引入覆盖人物、场景、道具和多姿势的明确授权/原创数据；进阶是多尺度条件 Transformer 或 Flow Matching，并比较少步速度/画面质量。
- **美术验收**：完全符合 D 四色是底线；另外核查姿势、服装设计、五官、完整轮廓、色块簇、场景统一性。模型每次产生高损坏画面必须标记失败，不隐瞒。
