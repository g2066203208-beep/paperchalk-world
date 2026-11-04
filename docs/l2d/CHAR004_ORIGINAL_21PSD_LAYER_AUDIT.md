# CHAR-004 · 原始 Photoshop 图层顺序取证与修复（2026-11-04）

## 问题实证

旧模块手工猜测了 `page_06` 到 `page_19` 的实际内容：把源 `eyebrow-r` 当作嘴巴、漏了独立睫毛、错误分配虹膜/眼白/鼻子，并擅自重新排列所有图层。造成眼部缺笔、面部层级错误与不自然手臂遮挡。

源文件：`7b8696ab-8f78-460a-bb73-639166f41e5a.psd`。ImageMagick PSD layer property `%[label]` 和 `%X/%Y` 可读出 **21 个真实图层（序号 1..21）**；序号 0 是 Photoshop 合成预览，绝不可作为编辑层。

**精确源顺序（从后到前，不重排）**：

```text
01 back hair
02 footwear
03 legwear
04 neck
05 topwear
06 eyebrow-r
07 ears-r
08 ears-l
09 face
10 nose
11 mouth
12 handwear-l
13 eyebrow-l
14 eyelash-r
15 eyelash-l
16 eyewhite-r
17 eyewhite-l
18 irides-l
19 irides-r
20 handwear-r
21 front hair
```

其中 `handwear-l` 和 `handwear-r` 是两张**已有的原画衣袖+手臂图**，不能把画面左右误认为人物左右。小部件在原始 PSD 中是 25×11 等真实裁剪区域并有 PSD 原位偏移，不应当按图块左上角 (0,0) 直接放置。

## 验证

新模块 `site/assets/l2d/inbox/char-004.zip` 保留每个源的 `sourcePsdLayerName`、`sourcePsdIndex`、`layerOrder`、`x,y,w,h`。源 Photoshop layer 1..21 叠加比对合成预览：角色区域 98.40% 像素 RGB 最大通道误差小于 10/255，平均绝对误差 1.58/255。仅去除极低透明度的独立背景噪点，不修画、换脸、生成新眼睛或抄袭。

**本地数据迁移**：旧版浏览器中保存的 19 层骨骼工程自动备份到 `legacy-part-rig:char-004:front:pre-21-psd`，不将错误部件映射到新版眼睛/嘴巴；旧源画布自动更新为 21 层。新模块和女主睡衣仍然按 `familyId` 在同人物大类下展示。

浏览器 CI 在桌面及手机检查 `21` 张源层、`21` 网格、PSD 图层严格顺序和原始来源，生成真实截图。
