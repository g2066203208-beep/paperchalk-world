# 女主原始蹲姿 · 25 真实 ArtMesh 约束动态（2026-11-04）

## 美术和身份合同

- 动作身份：`protagonist-crouch-axe`，属于唯一人物 `protagonist` 的蹲下持斧动作，不产生第二个女主，不覆盖女主正式站立 20 ArtMesh。
- 来源：`site/assets/l2d/inbox/protagonist-crouch-axe.zip`，由用户 SeeThrough 拆分的 25 个原位透明 PNG；完整动作原稿保留，脚底位于 1024 画布底边。
- 不重绘、不生成衣裙、不复制虚假肢体。源稿无独立 `skirt` 或 `bottomwear` 可见部件；白色前衣摆及两侧深色外套下摆均包含在 `topwear` 同一张原始 ArtMesh 中。仅给 `topwear` 腰下区域加连续局部权重，保留上衣根部结构。
- 双腿为 `legwear_l/r`，左右鞋 `footwear_l/r`，双手为 `handwear_l/r`，武器独立 `axe`；不擅自拆分成额外衣服或角色。

## 对原始动作的精确约束

1. **裙摆／衣摆**：`topwear` 上部至局部 UV `v=.42` 严格固定，衣摆渐变得到横向不对称弯曲及少量竖向惯性；袖口、领口和腰线不扯动；使用 12×14 或以上网格细分，避免拉扯成四边形整体平移。
2. **斧头**：整把武器由刚性变换表示，不独立弯曲木柄和斧刃。原始 1024 画布的握持中心约 `(516,433)`，角度默认峰值 `0.745°`，并有约 1px 的微弱平移，静止时的原画位置一字不动。
3. **两只手**：源像素核查后的左握点 `(302,349)`、右握点 `(733,518)`，分别使用肩部到手腕的加权映射。手腕和握斧手指采用与武器**完全相同**的变形矩阵，肩根渐变到零，不允许整只袖子同时绕手指转动。
4. **承重大腿**：左右腿在大腿中段按相反水平方向缓慢缓冲；膝部轻微调整，接近鞋口（局部 `v=.83`）时权重归零，不做突然起立或双脚位移。
5. **鞋子**：脚踝入口固定；鞋身中段只有小于 1px 的形变，`v ≥ .92` 的鞋底完全静止，绝不悬空、穿地或漂移。
6. **独立面部与头发**：继续使用原来的 25 ArtMesh 贴图、睫毛/虹膜/嘴等素材及已有自然微动，不让鞋、武器、衣摆的二级动作污染五官。
7. **原稿保真**：所有动态是帧运行时计算，删除动态强度归零即可完全回到作者原姿，没有更改原始 PNG、源压缩包、角色 ID、图层绘制序列。

## 动态参数

工作室的蹲姿专用控制位于骨骼面板的 `#rig-crouch-motion`。四个强度 `cloth / axe / legs / feet` 默认为 100%，可调范围 0–150%，只写入当前 `protagonist-crouch-axe/front` 的本地 `crouchDynamics`，通过现有“保存到游戏”同步。渲染器导出函数 `sanitizeCrouchDynamics` 和 `bindCrouchDynamics` 让工作室和游戏读相同数据，旧的原始 ZIP 保留且不写回。

## 自动验收

- `node tests/test_protagonist_crouch_dynamics.cjs`：原始 25 部件、10 个相位、**两只手与斧头握点零差异**、刚性斧头不弯曲、衣摆动而腰固定、左右腿有小幅承重、鞋底完全静止、参数归零还原、非本动作不受影响。
- `node tests/test_protagonist_crouch_motion_browser.mjs`：真实浏览器渲染、4 个参数保存后刷新、15 帧 PNG 实际画面、游戏端加载同一套动态、输出循环实际 L2D 动态 GIF 供视觉检查。
- `python3 -m unittest tests/test_protagonist_crouch_asset.py -v`：原始 ZIP CRC、25 个 PNG 原位复合和源指纹。
- GitHub Actions：`L2D modules - auto-register and game + studio integration`，统一打包实时截图及动态 GIF 到 `heroine-crouch-studio-desktop-mobile` Artifact。

### 设计原理资料

官方 Live2D Cubism [父子关系](https://docs.live2d.com/en/cubism-editor-manual/system-of-parent-child-relation/)、[Skinning](https://docs.live2d.com/en/cubism-editor-manual/skinning/)、[Glue](https://docs.live2d.com/en/cubism-editor-manual/glue/)：根部父级继承、旋转/区域权重和接缝粘合。本项目是**自研网页 ArtMesh 引擎上的等价约束原则**，不冒充标准 Cubism/Live2D .moc3 原生文件。
