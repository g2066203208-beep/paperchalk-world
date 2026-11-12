# 连续纵深七层 2D 舞台｜第一版可操作小场景

入口：
- 原游戏章鱼托管入口（现为纵深样机）：https://g2066203208-beep.github.io/paperchalk-world/?scene=paper-ocean
- 独立场景测试入口：https://g2066203208-beep.github.io/paperchalk-world/paper-depth-preview.html

沿用原 \`paper-ocean\` 入口、现有 \`#view/#scene\`，不重建新项目，不改其他恐怖游戏场景。海浪和章鱼原图留在仓库内，可在后续章节复用。

## 本版实际层数：7

最前到最深，全部同时挂载在同一个舞台 DOM：

1. **初始小村** · 安全区
2. **麦田小路** · 旅途
3. **幽深森林** · 旅途
4. **遗迹外道** · 旅途
5. **墓地与荒野** · 精英
6. **古堡前庭** · 旅途
7. **深渊王座** · 最终 Boss

玩家在第一层时能看见后面全部场景直到最深 Boss，并非不同背景轮播。每点一次「通关 · 向深处前进」，当前最前层朝屏幕下方退出，其后所有尚未通关的 2D 层一起产生视差式位移和放大；不黑屏，不重新创建一整张背景。回退、重置和最终关完成也可操作。

## 当前素材与技术真实情况

- 本版用已经绘制的 **1672×941** 村庄到王座原画：\`site/assets/paper-ocean/depth-journey-master.png\`。
- **运行时七个独立的 2D DOM 图层**各有自己的遮罩、层序、transform 和 opacity；为快速验证，本版七层从上述同一张原画对应区域动态裁剪，并**不是七张已经独立重画完成的透明 PNG**。
- 无 3D 摄像机、Three.js、模型、3D 透视或 3D 位移；仅平面位移和缩放。
- 技术验收接口：\`window.PaperWorldPaperOceanRenderer.inspect()\` 返回 \`layerCount:7\`、\`level\`、\`allLayersMounted\`、\`imagesLoaded\` 等。
- 操作接口：\`advance()\`、\`retreat()\`、\`reset()\`，以及供后续战斗胜利时调用的 \`markCleared()\` 事件。关卡推进时向舞台派发 \`paper-depth-stagechange\`。
- 为检验动画而设置的「通关」按钮只模拟胜利，**并不代表人物卡牌自动战斗、敌人或 Boss 战斗逻辑已经实装**。

## 验收

\`tests/paper-ocean-stage-preview.mjs\` 在相同站点本地 HTTP 服务器上检查七层均挂载、纹理成功加载、从村庄推进至最终 Boss、结局及重置，并输出 1920×1080 的起点、中段、Boss 截图。由 \`.github/workflows/paper-ocean-stage.yml\` 自动上传截图产物。

本版优先验证用户要求的「后面全部可见、通关后前景退出且后景真实推进」。后续换成**逐层独立绘制并带透明通道的高质量原画**即可保留现有推进控制逻辑。
