# Pixel Lab · 两套系统（2026-10-30 清理后）
- **01 真像素转换**：`site/pixel-lab/repixelize.html`、`ml/repixelize/engine.py`，原生 D 四色和逐像素网格、PNG 下载。 `ml/repixelize/publish_d_standing.py` 只导出站姿母版，不再训练旧单图模型。
- **02 像素绘画学习**：`site/pixel-lab/learn.html`、`ml/style2/discrete_diffusion_v2.py` 与 `ml/style2/verify_discrete_v2.py`，带形体条件的 4 类离散生成，像素年龄、可见 token 纠错、程序化测试留出。
- **原始数据保留**：`ml/repixelize/reference-384.lzma.b64`、`ml/repixelize/d-standing-v1.tokens.b64`，`ml/style2/prepare.py` 输出 D 姿势母版及粗分区标签。
- **独立纯编辑工具保留**：`site/pixel-lab/flat4.html` 与 `flat4-redraw.html`（不是训练模型）。
- **已在当前分支清理**：CC0 16×16 MLP、VAE、Q-Learning、FLAT4 训练、RGB patch 训练、像素补绘 MLP、离散扩散 V1；删除对应旧页面、测试、CI 步骤与部署产物。
- **研究论文保留**：`docs/*paper*`、`docs/*research*` 只是论文调查，不代表官方模型已经集成。
- **验收**：四色准确性、网格、真实 PNG、模型生成、与蓝图基线比较、留出参数测试、网页/手机 Chromium；不以正确率冒充美术质量。
历史提交可在 GitHub History 恢复，但不再随当前 main 构建、运行或部署。
