# 男二 · 新 SeeThrough 正面源图 L2D 接入记录

- 原始上传：`seethrough-bebdb7ca8778-layers.zip`
- SHA-256：`3ecc95e4b50d9302a0926a15ce51ec146a42230a1da96782c2ed71d2bdf684c9`
- 独立资源 ID：`male2`。不恢复旧 `char-016`、不污染女主或女二旧模块。
- 24 个语义部件 PNG，16 个非空可绘制部件，8 个全透明占位。
- 有效部件：`nose, head, back_hair, ears, footwear, legwear, neck, topwear, handwear, face, eyewhite, irides, eyelash, eyebrow, mouth, front_hair`。
- 所有源部件 1024×1024 RGBA，视角仅正面；`src_img.png`、`src_head.png`、`reconstruction.png` 是参考图/重建图，不能进入动态 ArtMesh 树。
- SeeThrough 资源导入时以 alpha>16 的真实内容计算裁切边界，PNG 像素在裁切区内保持原样、不用 AI 重新生成人体部位。
- 不得虚构背面。原始 `handwear` 包含相互交握的左右手，目前一个源贴图、四条独立局部骨骼链，允许微动；不宣称已完成完整独立抬手动作。
- 编辑器操作：打开 `/character-editor/?character=male2&side=front`，人物树「男二」下点击「＋ 导入男二 SeeThrough ZIP」，选择原始 ZIP；进入现有 L2D 动画预览，按「保存」保存在浏览器。
- 分发：将已验证的 `male2_l2d_module.zip` 放入 `site/assets/l2d/inbox/male2.zip` 并提交 Git，现有自动模块构建器会安装到 `site/assets/l2d/library/male2` 并在游戏目录自动注册。
- 当前 GitHub 源码包含可用的导入器、人物槽、骨骼映射、回归测试；直到上述 ZIP 二进制发布到仓库，其他设备首次进入工作室只会看到上传入口，不会凭空拥有这些用户私有贴图。

## 验收

`tests/test_male2_seethrough_browser.js` 使用合成 PNG 检查真实 SeeThrough ZIP 格式的解析、16 层与 8 空层过滤、自动生成 `arm-combined` 骨骼、保存及刷新恢复。

本记录只用于工作室和素材追踪。来源 ZIP 与实际人脸比例均不可由自动生成替换。
