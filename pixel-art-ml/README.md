# Pixel Art ML Lab / 像素画机器学习实验室

**这是独立于 PaperWorld 游戏的学习项目。** GitHub 独立实验分支为 `lab/pixel-art-ml`，游戏 `main` 分支的网页和 APK 不受影响。本实验室包含 **真实可训练的卷积变分自编码器（VAE）**、有来源声明的数据清单、训练/验证、质量指标、像素调色板量化、批量预览和自动化测试。

> 当前完成的是 **可运行的机器学习训练管线**，不是已达到《小丑牌》美术质量的生成模型。基础数据为自己用程序绘制的简易几何像素图，验证训练能否运行。商业游戏卡面、美术和字体未包含在数据中，**不会**未经许可抓取《小丑牌》素材训练。

## 学习目标

1. **像素原生网格**：32×48 RGB 原生图训练，禁止通过高清图缩小伪装像素画。
2. **数据来源可审计**：每张 PNG 有来源、许可、逐像素 SHA256、train/val 标签；重名、重复像素、越界路径和未授权许可均拒绝。
3. **真正的学习模型**：PyTorch VAE 进行梯度更新、记录验证误差和与训练集均值的朴素基线比较。
4. **素材与界面分离**：模型输出 32×48 图；71×95 卡牌框架是程序布局，不能将框架误认作 AI 学会的画风。
5. **机器检查 + 人工审美验收**：限定分辨率、色板、色数，记录边缘密度；美术设计感必须人工评审，不能用模型 loss 取代。
6. **模型不接入游戏**：只有对比样本通过人工质量评审后，才考虑移植至正式游戏。

## 运行方法（Python 3.11+）

```bash
cd pixel-art-ml
python -m pip install -r requirements.txt
python -m pytest -q
python -m pixel_ml.data --out .pixel-data/bootstrap --count 320 --seed 1729
python -m pixel_ml.train --manifest .pixel-data/bootstrap/manifest.csv --out .pixel-runs/local --epochs 24 --seed 1729
python -m pixel_ml.sample --checkpoint .pixel-runs/local/best.pt --manifest .pixel-data/bootstrap/manifest.csv --out .pixel-runs/showcase --count 12
python -m pixel_ml.quality --dir .pixel-runs/showcase --max-colors 10 --report .pixel-runs/quality.json
```

生成：`best.pt`（真正训练得到的权重）、`metrics.json`（训练损失/验证 MSE/均值基线）、`sprite_*.png`（32×48 像素模型输出）、`card_*.png`（71×95 示意卡）、`contact_sheet_3x.png`（放大预览）、`quality.json`（机械检查）。GitHub Actions 以 24 epoch 做短训练，并发布以上文件为 Artifact；**短训练不是美术收敛结论**。

## 采集真正的绘画训练集（下一阶段）

- 仅允许自有作品、明确允许训练与再发布的素材；不能把网页可下载当作有训练许可。
- 统一 32×48 的原生像素 PNG，控制色板；不得使用双线性重采样生成伪像素画。
- 每张图片在 `manifest.csv` 提供 `path,source,license,sha256,split`。`sha256` 是将 RGB 数据按行序列化后计算，而不是 PNG 文件哈希。
- 当前许可白名单：`OWN`, `CC0-1.0`, `CC-BY-4.0`, `CC-BY-SA-4.0`, `MIT`。有署名要求的素材需另行保存完整归属与许可证声明，并核实模型训练用途；清单校验并不自动保证法律合规。
- 训练集和验证集不得有相同像素数据；验证集按画师/系列拆分会比简单随机拆分更严谨。
- 真正追求高水平像素设计时，需要大量经过人工审查、轮廓优先、像素簇有意图的合法作品。少量程序图只证明算法能跑通。

## GitHub 自动测试

`Pixel Art ML - train, inspect, preview` 在分支 `lab/pixel-art-ml` 推送时执行单元测试、产生原创样本、训练模型、推断、检查并上传结果。

## 本项目不会做的事

- 不复刻/训练商业游戏原图集；不拿提取原图像素当“机器学会了绘画”。
- 不将模板随机生成器冒充神经网络；模型和生成器在源代码中严格分开。
- 不以视觉难看的首次训练成果冒充成品。
- 不擅自把实验性 AI 像素素材添加到 PaperWorld 游戏仓库主分支。
