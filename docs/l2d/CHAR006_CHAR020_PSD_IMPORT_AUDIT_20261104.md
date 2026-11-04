# CHAR-006（女五）和 CHAR-020（男三）PSD 导入状态
更新：2026-11-04

## 用户本轮提供的真实文件核对

| 文件 | 实际内容 | 角色对应 | 可生成部件 | GitHub 状态 |
|---|---|---|---|---|
| `7b8696ab-8f78-460a-bb73-639166f41e5a.psd` | 短发假小子、校服、左侧全身立绘；21 条 PSD 层 | **CHAR-004 女三**（旧素材） | 已有拆图，**不是男三** | 不得误登为 CHAR-020 |
| `SeeThrough-09c07882ba7c.psd` | 1024 × 1024 翅膀女性人物和手提物品；15 条真实 PSD 层 | **CHAR-006 女五候选** | 已由源像素处理成 17 张独立 PNG（左右翅膀/双臂拆开） | 已制作本地可安装模块 `char-006.zip`，**媒体尚未在 GitHub** |
| 男三 | 仓库现存 CHAR-020 448 字段人物设定，没有正式立绘 | **CHAR-020 男三** | 无法从女三的 PSD 捏造男三独立骨骼 | 缺正式男三绘画/PSD，禁止冒用别人的脸 |

## 女五预备模块

本轮制作完毕的 `char-006.zip` 是原样可供 `site/assets/l2d/inbox/` 安装的完整可验证包。包括 `char-006/module.json`、`front.png`、`front.rig.json`、17 张带局部原位坐标的 RGBA PNG，以及 `front-rig-editable-parts.zip`。真实可动部件：

`wing_viewer_left`, `wing_viewer_right`, `back_hair`, `legwear`, `neck`, `topwear`, `objects`, `arm_viewer_left`, `arm_viewer_right`, `ears`, `face`, `eye_white`, `irides`, `eyelash`, `eyebrow`, `mouth`, `front_hair`。

翅膀独立控制，左右手臂拆开，头发/眼睛/身体分层，脚保持原位。没有背面原画，所以不伪造背面。原 PSD 存在一些低 Alpha 透明噪点，导出时清理阈值以下噪声。该资源是衍生裁切（`derived-region`）而非无损的逐字节原图层复制。

## 发布约束

**当前 GitHub 连接器不能直接接收本聊天沙盒 ZIP 的二进制引用作为 Git blob**；不能空写 `module.json` 假装已部署 17 张 PNG，否则现有页面构建会失败。不要在 GitHub 创建缺失贴图的假模块。

将完整 `char-006.zip` 以**完全相同的名称**上传到 `site/assets/l2d/inbox/char-006.zip` 并提交后，仓库原有 `scripts/build_l2d_library.py` / `scripts/build_character_catalog.py` 即自动安装并验证，同一角色在 L2D 工作室/游戏 DEV 里自动注册。正式男三素材到位后使用其 **CHAR-020** 角色档案归属，不应重新设计或借用 CHAR-004 美术。

当前的角色档案状态必须保持“候选 / 媒体未发布”，不能对用户谎称两名角色在在线工作室已经可播放。
