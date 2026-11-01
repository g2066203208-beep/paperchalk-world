# MINI36 V2 — 真·离散像素颜色扩散实验（2026-11-01）

## 目标与不容偷换的概念

用户要求“扩散模型去噪点到一个一个完美像素”，不是再次降低分辨率/伪像素滤镜。原稿36人、每人24×24，确实每格一种RGB色但视觉仍脏：抗锯齿带来的近似肤色和不连续像素色块已被早期自动提取冻结，因此“格子是整数”并不代表“像素艺术质量高”。

这次增加 `ml/mini36/discrete_diffusion.py`。和之前 `ml/mini36/learn.py` 仅学习黑白轮廓不同，**真正训练跨8个时序的15类离散token去噪网络**，模型输入和输出都是每个像素的颜色索引，不存在RGB高斯模糊、不存在亚像素灰度插值。前向扩散为均匀离散替换，逆向采样根据网络预测的clean token分布和均匀转移矩阵的Bayes后验进行类别恢复。

**严格的界线：** 原始36位角色是从GPT概念图程序提取的自标注素材，没有专业画师逐格标注的高质量GT，所以扩散网络只能学习“这些素材的token分布”，不可能自动推导什么才是“完美像素”。6个留出人物上的合成退化恢复成绩**不是精致角色美术评分**。不能用幻觉替代训练标注。

## 同步建立的保守色板候选

另保存一套 `R?C?-clean-24.png`，与实际扩散提案 `R?C?-diffusion-proposal-24.png` **完全分开**。清理候选使用CIE LAB近色合并和严格的4邻居3票孤立像素修正；保护全身透明形状、并在头部/五官区域拒绝自动单点删除。默认每人最多10种实色，透明Alpha只能0或255，不添加抗锯齿色，图鉴原生240×240，放大预览960×960为严格4x最近邻。

所有源素材保留原始PNG；不把实验模型输出晋升Gold。清理色彩可能误伤角色自有的细腻肤色，需人工逐人观察、用网页像素编辑器改正。

## 复现与文件

```bash
python -m ml.mini36.atlas --out artifacts/mini36-source
python -m ml.mini36.discrete_diffusion --sprites site/pixel-lab/mini36 --out artifacts/mini36-diffusion --steps 350
python -m unittest discover -s tests -p test_mini36_discrete_diffusion.py -v
```

- 工作台：`site/pixel-lab/mini36/v2/index.html`，能在原始、清理候选、扩散提案间切换，逐人下载。
- GitHub Actions：`.github/workflows/mini36-diffusion.yml`
- 模型与实验报告：`mini36-discrete-diffusion.pt`、`report.json`，GitHub产物可下载。
- 边界规则：不得新增/删除形体透明像素，不得无人工复核地修改眼睛、鼻子、嘴巴、小道具的关键色簇；不得冒充现成像素美术训练数据。

## 下一阶段才可能向“完美”靠近

必须逐格人工重建高质量正确标签，尤其要给眼睛（1-2个暗像素）、鼻口、帽檐、手/腿、衣服边界做可审查的`pixel-position -> intended meaning`标注。在大规模高质量画师授权素材上训练语义感知离散扩散模型，和人工母版比较结构、颜色、连通域，而不是继续凭空给360张伪标签加训练轮数。