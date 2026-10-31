# PIXEL CHARACTER AI LAB — 像素人物生成模型博士级研究规程 v0.1
> **最新科研主线（2026-10-31）：只做完整全身像素肖像。** 入口：[FULLBODY_ONLY_PROTOCOL.md](./FULLBODY_ONLY_PROTOCOL.md)。新全局全身模型 `fullbody_vae.py`，新训练 `train_fullbody.py`，准入 `fullbody_corpus.py`。只认 192×256 / 384×512 原生画师像素图，含真实面部、手、脚、全身服装；48×64、脸部单张、Q版、动作帧和场景全部不属于当前正向训练集。**审核通过原图仍为零，未发布高质量训练权重；训练器按设计会阻止无数据训练。**

> **2026-10-31 高质量训练数据强制规范：** 只用有明确训练许可、原生像素分辨率和**两名独立评审通过**的画师原作进入新的正式数据集；必须区分全身立绘、面部画像、动作素材和场景。请优先读 [HIGH_QUALITY_CORPUS.md](./HIGH_QUALITY_CORPUS.md)、[HUMAN_ART_SOURCES.json](./HUMAN_ART_SOURCES.json)。原有四色程序拼装图仅保留为失败对照，不再充当「优秀艺术训练集」。新的 [quality_gate.py](./quality_gate.py) 和 [art_training.py](./art_training.py) 将素材审核与原始 RGBA 学习分开；**目前正式人工美术审核通过的数据为 0 张，尚无基于高质量画师作品训练出的模型权重。**


> **EXP-001 · 2026-10-31：**已实际训练一轮 192×256 原生像素的结构条件 PyTorch 网络（已完成第6 epoch，并保存权重、留出集分项评分与 PNG）。学术结果详见 [EXP001_REPORT.md](./experiments/EXP001_REPORT.md)。这是只使用合成训练人物的条件色彩重建原型，**未通过游戏美术质量验收**；不代表发表论文成果，不允许把它说成文字直接生成完整立绘。

> **2026-10-31 学术审查修正：**先阅读 [LITERATURE_REVIEW.md](./LITERATURE_REVIEW.md)（经期刊/会议核对的研究谱系、创新性冲突、可证伪研究问题、对照实验和研究诚信），引用条目见 [REFERENCES.bib](./REFERENCES.bib)。下方 v0.1 文档是旧的工程探索记录，其未经严密论证的模型选择和 48×64 默认目标**不代表博士研究方案**。本次新增的 192×256～1024×768 分块代码仍是无损网格和**有粗图引导的局部细化实验**，不是训练成功的高分辨率人物/场景生成模型。严格禁止把任何实现称为已优于已有论文。


## 当前状态（2026-10-31）

R0: 已实现可控制的原生 48×64、PAPERWORLD 四色+透明全身人物生成规则基线、像素审计、PNG 导出、参考图对照和有授权的数据登记。R1: 已实现 PyTorch 条件 Masked-token 模型、训练、验证、checkpoint 和采样代码。

**尚未获得真实艺术家素材集、未用真实艺术数据完成训练，没有发布或验证过任何通用人物生成模型的权重。网页上的 R0 人物不是 AI 模型生成，研究代码通过 smoke test 不代表美术质量过关。**

在主分支完成合并且 GitHub Pages 部署后，网页地址：
https://g2066203208-beep.github.io/paperchalk-world/pixel-lab/character-ai/

## 可检验的研究假设

- H1: 直接对五种离散 cell（透明 + 四色）进行条件生成，可严格满足网格与色板约束；但不意味着结构或美感合格。
- H2: 将姿态、发型与服饰作为条件，会在人物身份隔离的测试集上产生可量化控制性。
- H3（未来）：人脸/服装语义分割、骨架和参考身份联合控制，比无结构条件模型更好地保持人物面相。
- H4（未来）：人工逐像素校正 + 生成模型比纯通用生图降低返工时间。

## 训练数据契约

PNG 原生 48×64 RGBA；前景 RGB 只能是 #393657 / #F2A5C2 / #A9BAE9 / #FFF5E6；透明只能 0 或 255。必须附带 source/license、identity_id、pose（站立/挥手/行走）、hair（短发/长发/双丸子/侧马尾）、outfit（围裙/外套/连衣裙/工装）、path（相对数据根目录）。

同一个 identity_id 的全部视角与姿态严格处于相同 train/val/test 分组。网页和 Python 使用一致的 UTF-16 code-unit FNV-1a 32-bit 哈希来分组，比例约 80/10/10。

禁止把未经授权的游戏截图、角色立绘作为训练图；游戏截图参考图库只用于视觉研究。不得静默缩放、抠背景、改颜色再称为原生像素图。正式实验还需去除跨组的近重复图片。

示例 manifest.json 是 JSON 数组：
[{"path":"char_0001.png","identity_id":"char_0001","pose":"站立","hair":"短发","outfit":"围裙","license":"own original artwork"}]

网页导出的 manifest 只有文件名和元数据，并不上传图片；本地训练时请把 PNG 放在数据根目录。

## 安装和运行

进入 research/pixel-character-ai/ 目录，运行以下命令：

pip install -r requirements.txt

python -m unittest discover -s . -p "test_*.py" -v

python train.py train --data ./data --manifest manifest.json --output ./runs/r1 --epochs 30 --seed 20261031

python train.py sample --checkpoint ./runs/r1/best.pt --pose 站立 --hair 短发 --outfit 围裙 --seed 42 --output sample.png

运行必须至少有 2 个训练样本和 1 个按身份隔离的验证样本。runs 下存储 run.json（数据量、种子、模型参数量、训练完成状态），metrics.jsonl（训练损失和验证损失），best.pt（真实参数）。训练脚本从不自动下载商业美术素材或预训练权重。

## 严格实验评价与最终验收

1. 原生像素硬约束：逻辑网格、色板、Alpha、连通块、孤岛像素与轮廓占比。
2. 外貌一致性：标注眼睛、五官、发型轮廓与身体结构，报告偏差及人工评审结果；当前未实现。
3. 角色多样性：同一条件不同种子，统计相似/重复候选和模式坍缩。
4. 数据隔离：跨姿态按人物 ID 而非按图片随机切分；需要未见角色测试和训练图近重复检测。
5. 至少三位独立画师盲评：脸型与神态、人体、服饰、风格、像素整洁度分别打分；所有失败例保留，禁止 cherry-pick。
6. 对照：规则基线 R0、训练后 R1、未来的参考图受控 R2；三种随机种子、报告均值/误差及模型耗时。
7. 可复现性：记录代码 commit、数据哈希和许可、模型权重哈希、硬件以及全部评测样本。

## 文献与开源证据

- SD-πXL, Binninger & Sorkine-Hornung, SIGGRAPH Asia 2024: https://igl.ethz.ch/projects/sd-pixl/
- Pixel art character generation as an image-to-image translation problem using GANs, Coutinho & Chaimowicz, Graphical Models 2024: https://doi.org/10.1016/j.gmod.2024.101213
- Missing Data Imputation GAN for Character Sprite Generation, arXiv:2409.10721: https://arxiv.org/abs/2409.10721
- PixelDiT, CVPR 2026: https://openaccess.thecvf.com/content/CVPR2026/html/Yu_PixelDiT_Pixel_Diffusion_Transformers_for_Image_Generation_CVPR_2026_paper.html
- PixelGen, arXiv:2602.02493: https://arxiv.org/abs/2602.02493
- Palette indexed open research baseline: https://github.com/danfking/pixel-llm

注意：PixelDiT、PixelGen 是通用像素空间生成研究，不能把它们在 ImageNet 上的指标冒充像素人物表现。此代码是独立的小型条件离散去噪基线，并非对上面论文架构的完整复现。
