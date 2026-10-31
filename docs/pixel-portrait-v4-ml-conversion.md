# V4 25人图鉴｜多色真像素转换 + PyTorch 实验（2026-10-31）

## 工作结果与边界

本次针对用户确认的V4图鉴，已经在本对话执行一次实际转换与真实PyTorch训练。源图1254×1254，构造640×640整数网格候选，25格独立区域，每个角色108×108候选块，每格18色上限，任意相邻角色理论最小空白20逻辑像素；另导出2560×2560最近邻预览。**机器验证安全间距通过。**

但当前源码提交与GitHub Actions流程并不等同于图片二进制已上传：连接器支持提交UTF-8源码，**原始1254×1254的PNG本轮尚未加入GitHub仓库**。图像与本地训练输出已经打包在用户本次聊天的ZIP里。Action仅在仓库存在`site/pixel-lab/portrait-v4/source-v4.png`时才处理真实图像，或额外存在原始高清文件时分别处理。**合成CI样本、40×40低保真衍生样本、640×640高保真WebP衍生样本**在产出路径上彼此隔离，不得互相混称。

**禁止宣称“完美像素”已经完成。** 像素归属逻辑、脸部结构、瞳孔线条、发丝簇与色彩仍需人工逐格审查。

## 为什么另建这条流程

以前固定D四色384×512全身立绘系统不适用此张25人彩色图鉴：强行四色将破坏每格独立色板。新模型严格独立，不能覆盖旧训练权重、已认可母图或角色资产。

- 源码：`ml/portrait_v4/convert.py`
- CI与真实PyTorch烟雾训练：`.github/workflows/portrait-v4-ml.yml`
- 可运行检查：`tests/portrait_v4_checks.py`
- 25人详细提示词：`site/pixel-lab/portrait-atlas-v4.json`
- 美术规范：`docs/pixel-portrait-atlas-v4-art-direction.md`

## 转换步骤

1. 每格单独源图裁切，按区域精确比例转换。
2. 利用`INTER_AREA`投影到独立108×108整数网格；轻量双边滤波仅去颜色噪声。
3. 无抖动`Median-Cut`限色，默认每格最多18种颜色。
4. 25个角色置入128×128独立单元格内的`[10,118)×[10,118)`安全区。
5. 严格测试安全区外皆为背景色，不允许跨入邻格；导出25张独立头像。
6. 拼成640×640真正离散像素网格；2560×2560只做4×最近邻放大。
7. 分离地运行CNN自监督候选修复和独立测试，若不满足门槛，不允许静默覆盖图鉴。

**注意**：这是可核验的“原生整数像素文件”，并不意味着像素簇已拥有手工画家般的每格语义和艺术性。

## PyTorch实验：已在本地真实运行的结果

使用由确定性转换得到的伪标签图像，模拟高斯模糊、插值与颜色噪声，训练四层残差Conv2d网络恢复清洁像素。训练集为20位人物，最后整行5位人物完整留出；CPU固定种子20261031，实际120训练步骤。

| 未参与训练人物 | 基线L1 | 神经L1 | 表现 |
| --- | ---: | ---: | --- |
| R5C1 | 0.045944 | 0.043586 | 改善 |
| R5C2 | 0.017862 | 0.019993 | 退步 |
| R5C3 | 0.045926 | 0.042568 | 改善 |
| R5C4 | 0.039634 | 0.038518 | 改善 |
| R5C5 | 0.062482 | 0.059437 | 改善 |

**结论：未全通过门槛，神经网络暂不用于生产导出。** L1是对伪标签的模拟退化恢复，不是针对原创像素艺术水准的外部客观评分。

## 运行

前提：Python 3.11+，numpy、Pillow、opencv-python-headless、PyTorch。

```sh
python -m ml.portrait_v4.convert --input site/pixel-lab/portrait-v4/source-v4.png --out-dir artifacts/portrait-v4-real --train --steps 120
python -m unittest discover -s tests -p portrait_v4_checks.py -v
```

GitHub Actions入口：https://github.com/g2066203208-beep/paperchalk-world/actions/workflows/portrait-v4-ml.yml

在线浏览并自动加载640×640图鉴WebP衍生图：https://g2066203208-beep.github.io/paperchalk-world/pixel-lab/portrait-v4-convert.html

源图WebP（浏览器直接查看）：https://g2066203208-beep.github.io/paperchalk-world/pixel-lab/portrait-v4/source-v4-640-q92.webp

## 下一步艺术验收：不能以训练损失取代

必须逐格检查25张图：眼睛是不是自主设计的像素形状、鼻尖和嘴唇是否不油亮、额外碎点是否有语义、复杂曲线的锯齿是否规律、框外碎片是否来自相邻行、衣领与手部有没有断裂、每格色板是否保留人物个性。确认25张都通过后才能升级到正式美术母版。
