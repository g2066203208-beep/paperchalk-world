# CHAR-008 · 女老师 L2D PSD 独立部件导入

- **人物唯一 ID**：`class-teacher-geography-candidate`（复用现有 CHAR-008 角色档案，不创建新人物身份）。
- **提交素材**：`site/assets/l2d/inbox/class-teacher-geography-candidate.zip`。
- **用户源文件**：`seethrough-553b8d700b77.psd`，原始画布 1024×1024，16 个 PSD 图层；保留该用户原件，不覆盖其他人物素材。
- **发布结构**：Paperchalk PartRig v1，正面 24 张独立 RGBA PNG、对应 `front.rig.json`、整身透明立绘 `front.png`，包含原始图层审计和角色 module.json。
- **细拆**：左右云状翅膀、左右手臂、左右鞋子、左右眉毛、左右眼白、左右耳朵、左右瞳孔和左右睫毛由原 PSD 部件连通域分开；其余原件按原位保留。
- **质量处理**：剔除 SeeThrough 输出的整个 1024 画布中 alpha 值小于 8 的背景噪点，未重新生成面相、服饰、袋子或翅膀。
- **层序（后→前）**：翅膀 → 后发 → 裤子/鞋 → 颈部 → 上衣 → 手提袋 → 左右手臂 → 耳、脸、眼、眉、嘴 → 前发；袋子随握袋手臂，鞋子固定地面。
- **动态**：默认轻微发梢、衣服和独立手臂运动；翅膀/鞋/手提袋的局部风动为 0，默认不摇晃全身。后续可在已有 L2D 工作室调整骨骼、图层和局部遮挡。
- **生成**：运行 `python3 scripts/build_character_catalog.py`，会调用 `scripts/build_l2d_library.py`，从 inbox 自动安装 ZIP，并将 CHAR-008 录入 `site/characters.catalog.json` 的构建产物。发布页面与游戏公用此角色库。
- **校验**：本地已校验 ZIP CRC、24 张 RGBA 图像、贴图与 rig ID 完全相同、局部尺寸匹配、原始 1024×1024 舞台坐标、单一角色身份。GitHub Actions 发布结果仍需核验。
- **注意**：仅提供用户上传的正面素材，**没有伪造背面**；这是 PartRig 独立网格系统，不是 Cubism .moc3 文件。

