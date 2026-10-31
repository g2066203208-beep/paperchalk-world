# EXP-002｜高品质像素全身肖像专攻（FULL-BODY ONLY）

## 研究任务边界（2026-10-31）

唯一目标：生成 **192×256 / 384×512 原生离散像素的完整人体立绘**，从头发到鞋子、保留精细脸型、五官、手部、服装材质、身体比例与独特设计。**不是脸部头像，不是 48×64 小人，不是场景，不是动画帧**。

已完成的 EXP-001 合成程序人物失败实验保留为负例，不得加入正向画师训练集。网站的 48×64 工具已移至 r0-mini.html 历史对照。

## 数据优先

训练图只能来自具备可追溯来源、明确训练权利、确认人类原生像素创作的完整全身作品；保留原作者颜色，不施加 PAPERWORLD 四色强制量化，不进行像素画质造假式放大。

两名不同于画师的审核人员必须实际看见原图，并独立确认：全身没有裁切、五官辨识明确、手和脚结构明确、像素色块逻辑清晰、整体角色设计高质量。缺任何记录时训练拒绝，而不让模型使用程序小人凑数。

第一批筛查来源：KePixelArt 3 Fantasy Characters（CC0、作者公开标注非生成式 AI，原始素材待核验），源文档 HUMAN_ART_SOURCES.json。只有一个作者的三幅图，**不具备训练可靠泛化模型所需的样本与画师多样性，不能宣称已获准入库**。

## 模型与方法

**基线 FB-VAE-01**：PyTorch 全身全局潜变量 VAE，编码整个 192×256 / 384×512 原图，通过全局 latent z 解码成完整相同逻辑网格 RGBA，不把 64×64 patch 当成独立全身图；重建颜色、二值轮廓、边界、KL 损失。精细脸部 identity-preserving conditioning 尚未实现，是下一篇实验要研究的点。该网络属我们自己的 **基础实现**，不是已发表 VQ-VAE、MaskGIT、SD-πXL 论文方法复现。

**数据接口**：fullbody_corpus.py（两档尺寸、真实画师美术审查、作者同意、全身独立审核、按画师隔离），train_fullbody.py（逐轮保存真实 checkpoint、loss 和 raw fullbody model prior sample PNG），fullbody_vae.py（全局 latent 生成基线）。

**准确状态**：源码与自动化 smoke tests 可以运行，但目前**审核通过的高质量画师数据为 0，训练会被拒绝**。不得把测试用随机张量和未训练模型采样说成训练成绩。也绝不把 EXP-001 粗糙示例当成新模型的艺术成果。

训练开始后，每个 epoch 必须产生 native fullbody PNG，并显示原始模型结果，不自动美化、不用 GPT 图片代替。保留全套失败样本，不做 cherry pick。训练/验证/测试按画师和角色隔离，不能用验证图来手工调选模型后仍声称盲测。

## 可复现命令

在 research/pixel-character-ai 下（Python、torch、numpy、Pillow）：

    python -m unittest discover -s . -p "test_*.py" -v
    python train_fullbody.py train --data ./artist-art --manifest ./artist-art/manifest.json --profile portrait_192 --epochs 20 --output runs/exp002

不满正式数据要求时，上面训练命令故意失败。少样本技术实验必须显式加入 --experimental-small-data，仍需要通过两名独立审查及至少 2 个训练画师和 1 个验证画师；该开关不等同于对外公开的论文质量模型。

    python train_fullbody.py sample --checkpoint runs/exp002/best.pt --profile portrait_192 --seed 11 --output portrait_192.png

## 评价与先行工作

- [Coutinho & Chaimowicz, Graphical Models 2024](https://doi.org/10.1016/j.gmod.2024.101213)：人物生成任务与数据限制。
- [Coutinho, Chaves & Chaimowicz, Entertainment Computing 2025](https://doi.org/10.1016/j.entcom.2025.101021)：色板与多姿态先行工作。
- [Binninger & Sorkine-Hornung, SIGGRAPH Asia 2024](https://doi.org/10.1145/3680528.3687570)：量化图像生成先行工作。
- [Esser et al., CVPR 2021 Taming Transformers](https://openaccess.thecvf.com/content/CVPR2021/html/Esser_Taming_Transformers_for_High-Resolution_Image_Synthesis_CVPR_2021_paper.html)：全局结构与高分辨率生成。
- [Chang et al., CVPR 2022 MaskGIT](https://openaccess.thecvf.com/content/CVPR2022/html/Chang_MaskGIT_Masked_Generative_Image_Transformer_CVPR_2022_paper.html)：掩码离散潜变量生成。
- [Rombach et al., CVPR 2022 Latent Diffusion](https://openaccess.thecvf.com/content/CVPR2022/html/Rombach_High-Resolution_Image_Synthesis_With_Latent_Diffusion_Models_CVPR_2022_paper.html)：高分辨率图像生成，pixel-art 独有的保形与色块仍需验证。

**不能凭网络训练成功就声称论文创新**。后续必须与强基线同样的原图/条件/算力比较，报告人脸身份盲评、人物结构正确率、全身可读性、像素群集噪点、作者/身份 holdout 结果、所有样本和坏案例。
