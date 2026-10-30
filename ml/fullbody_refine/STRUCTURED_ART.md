# 可读的像素立绘：按结构重绘，而非盲目降噪

本分支的主要质量突破不是继续增大去噪模型，而是先用 **77笔可追溯矢量/像素几何**重构现有粉发蓝裙人物，严格在192×256原生像素栅格绘制。对象部位标签包含：背景、斗篷、头发、腿、鞋、衣袖、手、脖颈、衣裙和脸。每格由最后一笔可追溯色彩和区域生成，不使用抖动、随机细节、双线抗锯齿。实际组织形式是**离散像素符号图层**；最终栅格仍为真1:1像素。

输出：
- `site/pixel-lab/structured-gold/hostess_gold_native_192x256.png`：严格四色透明索引 PNG
- `parts-index.png`：每格类别标注，参照 `trace.json`（可编辑的77笔语义化笔画）
- `hostess_gold_preview_384x512.png`：仅最近邻2倍展示，不虚称新增细节
- `parts-model-prediction.png` + `parts-ml-report.json`：真实PyTorch部位识别实验；用单个身份合成损坏做测试，不是通用语义理解。
- `gold-report.json`：小色块、类别像素数、制图来源和未通过美术验收状态

参考：
- [Pixel Denoise](https://github.com/LucidTactics/pixel-denoise-aseprite) 的局部隔离与保留细线思想
- [Image-to-Pixel Cleanup](https://tezumie.github.io/Image-to-Pixel/docs/adjust-cleanup/) 四方向相邻规则
- [Discrete Sprite Lab](https://github.com/qiulinfan/discrete-sprite-lab) 的离散符号栅格、阶段间差异检查和人体身份数据合同
- [PixPerfect NeurIPS2025](https://research.adobe.com/publication/pixperfect-seamless-latent-diffusion-local-editing-with-discriminative-pixel-space-refinement/) 的真实像素局部修补框架（**并未实现此论文模型**）

这是作者结构化重画的初版美术**候选**，不是随机模型生成，也不应拿自动小色块减少来替代审美审核。真实ML部分仅在新的区域标签上训练，并明确仅有1个身份。
