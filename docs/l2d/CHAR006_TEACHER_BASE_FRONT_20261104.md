# CHAR-006 女五／女老师 · 基础正面 L2D 资产交付说明

日期：2026-11-04

## 用户确认的身份
- **女五就是之前的「女老师」**；这两者是一个人，不可在游戏/编辑器重复注册。
- 唯一玩家/角色标识：`char-006`。旧内部媒体模块 `class-teacher-geography-candidate` 是历史素材别名，并非新人物。
- `CHAR-008.profile.json` 原老师候选字段作为历史企划保留，不构成第二个已确认的女老师角色。
- 旧人物深链接：`/character-editor/?character=class-teacher-geography-candidate&side=front` 自动映射到 `char-006`。

## 用户实际上传的新基础正面
- 上传文件：`SeeThrough-09c07882ba7c.psd`
- SHA-256：`1938264e92927c17e3a6c341326418279b6e20ed8cade7f6fdcd56f2065a78bb`
- PSD 画布：1024×1024，RGB 8 位，带 Alpha
- **15 条真实 Photoshop 独立图层**：翅膀、手提物、手臂、后发、腿、身体服装层、颈、眼白、眉、耳、脸、口、虹膜、睫毛、前发。
- 本轮由原 PSD 各图层解码创建 **17 个 RGBA ArtMesh**：原翅膀层真实分区为左右翅膀；原手臂层真实分区为左右手臂；其余原生图层只裁切透明外围并清除离散半透明噪点。**不补画隐藏像素，不伪造背面。**
- 本轮生成会话附件 `char-006.zip`，包含 `char-006/module.json`、`front.png`、`front.rig.json`、`parts/*.png`、`front-source-parts.zip`。17 贴图尺寸/ID/原位坐标均在本轮检查通过。源文件本体和 ZIP 由该次会话附件交付，并不自动出现在 GitHub 仓库。

## GitHub 兼容上线策略
- 网站构建器将已发布的 `class-teacher-geography-candidate` 原始分层作为唯一 `char-006` 角色的**临时/兼容 L2D 媒体**。生成目录里仅出现 `char-006` 人物，而不是老师+女五重复人物。
- 通过严格验证 `sourceCharacterId=class-teacher-geography-candidate` 允许游戏和工作室使用历史真实 PSD 模型，绝不放开任意跨角色 Rig。
- **这不等于新上传的 PSD 已在 GitHub 发布。** 要让在线工作室精确使用此轮原 PSD，需要将会话生成的完整 `char-006.zip` 提交到 `site/assets/l2d/inbox/char-006.zip`；模块自动安装器会优先选原生 char-006 媒体，不需再次改代码。
- 不能将 448 字段人物表当成实际图像媒体，不能用不含贴图的 JSON 声称完成发布。
