# 怪物猎人组织·血液医师｜原 PSD 真分层 L2D 工程（2026-11-12）

## 来源与人物身份
- 用户提供：`SeeThrough-381e99011ec6.psd`，1024×1024，SHA-256 `f2845ddda8f74cfbbaca03405cd27e5e4e02bc393799a9e1039aa1b1ef26ab30`。
- **根据原画内容判定为怪物猎人组织的血液医师（女性）**，虽名叫 SeeThrough，绝不是旧 `male2` 素材。
- 独立模块 ID：`hunter-blood-physician`，关联现有怪物猎人七人组原画；不覆盖任何其他角色。
- 发布安装包：`site/assets/l2d/inbox/hunter-blood-physician.zip`。由 `scripts/build_l2d_library.py` 验证后装入 `site/assets/l2d/library/hunter-blood-physician/` 并纳入人物目录。
- 编辑器：`/character-editor/?character=hunter-blood-physician&side=front`，网页部署后可选此人物直接调整可动部件。

## 原始 PSD 图层（17 张非合并独立 RGBA PNG）
按原绘制叠放顺序，从下到上：后发、鞋、裤腿、脖颈、下摆、上衣、眉毛、双手与袖、耳朵、脸、嘴、鼻、眼白、眼睫、虹膜、前发、器具。

- 所有纹理采用原 PSD 真正的图层像素，并记录各自画布上的 `x/y/w/h`、可见度、Alpha、SHA-256；没有 AI 重画或从整图伪分割。
- 1024×1024 合成从这些原图层原位还原。源 PNG 保存在模块的 `parts/`，`layers.json` 与 `source-parts.zip` 可供工作室检查、重导入。
- **原 PSD 本身的手套两手是一个 handwear 图层，药剂和器具是一个 objects 图层，不能假称已独立拆出左右手指、左右药瓶。**
- 当前为安全的**初始 PartRig 组装和轻度待机参数**：后发、前发、下摆和袖子可单独调整；鞋与腿固定。高级骨架、跨层遮挡后的补绘尚未人工验收，不要称“完整高精度 Live2D Cubism”或虚构不存在的骨骼。

## QA 与发布
- 本模块需通过 `build_l2d_library.py` 的严格源图层尺寸/Alpha/部件数/rig验证，随后统一人物目录更新。
- GH Pages 发布以当次绿色 workflow 为准。确认部署后再访问 L2D 工作室查看。
- 原始同组织美术路径 `site/assets/characters/monster-hunters/02-blood-physician.png` 不修改。
