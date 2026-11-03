# 女主战斗正面｜PSD 拆分与 L2D 工作室检查（2026-11-03）

## 目标及安全边界

本轮上传的源 PSD 为 **1024 × 1024**，原始独立图层 **23 层**。
不能把战斗正面误替换原来的 `protagonist` 正背面，也不能覆盖女二 `char-002` 的 PSD 或骨骼。

GitHub Studio 专用档案：`protagonist-battle-front`（**独立工作室本地档案**）。
使用 `/character-editor/?character=protagonist-battle-front&side=front` 打开专用入口，
在标记的导入区选择原位分层 ZIP。导入完成后，工作室自动激活新版 L2D 动画编辑器；
编辑后的部件贴图和骨骼保存到与现有女主不同的 IndexedDB 档案。

**重要：源 PSD/透明 PNG 当前未上传到 GitHub CDN。** 网页上的专用角色档案是接收已经整理好的
24 层 ZIP 的预备槽，不会假装已经预加载原稿。该 ZIP 由当前会话用户上传 PSD 逐层重新抽取，
必须由用户在本地打开网页后选一次文件。绝不能将占位符冒充完成的模型。

## PSD 客观检查

源 PSD 包含 `back hair`, `objects`, `legwear`, `footwear`,
`handwear-r`, `bottomwear`, `neck`, `topwear`,
`eyebrow-l`, `eyebrow-r`, `handwear-l`, `face`,
`mouth`, `ears-r`, `ears-l`, `headwear`,
`eyelash-r`, `eyewhite-r`, `eyewhite-l`,
`eyelash-l`, `irides-r`, `irides-l`, `front hair`。

1. **objects 中混杂两把不同斧头**：一把横在画面头顶，一把握在手里。
   已用真实原稿的像素边界把它们分离为 `axe_overhead` / `axe_held` 两层；
   头顶斧头默认隐藏，像素源保留，允许用户在工作室选择并恢复。
2. **手臂未细分**：`handwear_r` 和 `handwear_l` 各自把袖子、手和握拳
   放在同一张贴图。可以给整条手臂做网格摆动，但**无法凭空保证手腕、手指关节独立**。
   真正战斗挥斧需要继续从 PSD 重新精修部件，尤其是武器与双手的机械父子绑定。
3. **腿部未细分**：`legwear` 同时包含两条腿，无法提供独立的双腿动画贴图。
   `footwear` 是一整个鞋子层，暂时只能固定鞋底。
4. **不透明边界拖尾很大**：部分层文件矩形比实际像素大非常多，
   比如 face 570×953，实际可见脸仅位于右上角 115×154 区域；
   已按实际 alpha 边界裁剪，并把裁剪偏移补回原始 `x/y`，因此不会改变组装外观。
5. 原 PSD 内置的扁平合成图左侧有明显斑点干扰；
   独立图层按原来的前后顺序重新合成没有这些斑点，
   因此**不得使用 PSD 的 merged preview 图代替真实分层**。
6. 脸部具有独立 `eyebrow`、`eyewhite`、`irides`、`eyelash` 等 8 处小层，
   适合后续眨眼与视线动画，但**眼睑闭合贴图尚不存在**，不能声称完整眨眼。

## 整理后的拆分 ZIP

- 根目录含 `layers.json`（front 共 24 层，包含准确绝对 `x/y`）、
  `front.rig.json`（首版非破坏性网格绑定）、
  `module.json`（未来独立发布规范）、`front.png`（清洁静态预览）。
- `front/` 保存 24 张真实 PSD RGBA 部件 PNG；不采用 fake crop 或图片重新生成。
- 所有 `sourcePart` 均与原始素材一一对应，额外只拆出同一 objects 层里原本分开的两把斧头。
- 严格保持原来的 1024px 画布，隐藏第二把斧头时只是改变显示状态，不删除原始数据。

## 仍未完成的内容

- 独立手掌、手腕、左右大腿及小腿、裙摆前后片、斧头握柄的真实父子装配。
- 精细战斗骨骼权重和整套攻击动作帧。
- 将这份独立作品发布到游戏人物库（这需要实际将源 PNG 发布到 GitHub，按模块校验通过）。
- 真实浏览器渲染验收，不得把源码语法检查视为视觉验收。

本轮不能因为用户提出“先组装看看”就擅自将暂未完善的战斗 L2D 接入游戏战斗。
