# CHAR-001 女主 · 蹲下持斧：真实 SeeThrough 分层 PartRig 交付审计

- **交付日期**：2026-11-04
- **原始上传**：`seethrough-67384e51b18a-layers.zip`，15,877,161 bytes
- **原始 SHA256**：`7fb38ce233b0c6a9f5674f190f3ac95c70bc3ed8c7ea574a27460b6e79312a1f`
- **人物唯一归属**：CHAR-001 `protagonist`，动作资源为 `protagonist-crouch-axe`；绝不新增独立 NPC 身份或替换女主站立模型。
- **游戏发布源**：`site/assets/l2d/inbox/protagonist-crouch-axe.zip`（已提交二进制，而非空 JSON 或占位图）。由 `scripts/build_l2d_library.py` 和 `scripts/build_character_catalog.py` 构建为真实、完整的可玩 PartRig。
- **可用入口**：[女主蹲下持斧 L2D 工作室](https://g2066203208-beep.github.io/paperchalk-world/character-editor/?character=protagonist-crouch-axe&side=front)

## 可审计素材

输出保留 1024 × 1024 原位画布；25 张透明可编辑 PNG、`front.rig.json`、`front.png`、`SOURCE_AUDIT.json`，均位于模块 ZIP 中。真实分组及绘制顺序，从后往前：

```
back_hair
neck
topwear
legwear_l, legwear_r
footwear_l, footwear_r
axe
handwear_l, handwear_r
face
ears_l, ears_r
eyewhite_l, eyewhite_r
irides_l, irides_r
eyelash_l, eyelash_r
eyebrow_l, eyebrow_r
nose, mouth
front_hair, headwear
```

- **人体约束**：左右大腿/小腿区域与左右鞋按源像素分离，各有地面父级；鞋底不参加呼吸和风摆，不对整幅蹲姿做假缩放。斧头独立原位纹理，其上双手在斧柄前方，持斧手臂默认不产生不协调的晃动。
- **脸部**：保留独立眼白、虹膜、睫毛、眉毛、鼻、嘴、耳和发丝。禁止额外叠加 SeeThrough 的 `head.png` 合成头部，否则必然产生重复五官。无关的极低 alpha 语义伪层 `bottomwear/wings/tail/earwear/eyewear` 不参与导出；`neckwear` 清理噪点后无实体内容。
- **运动**：只允许发丝少量待机与后续可调表情；躯干、双手、斧柄、双腿、鞋保持稳定。蹲姿是**单独真实分层 Pose**，不是通过形变站立 20 层模型伪造。它和站立、战斗、睡衣同处一个人物根节点。
- **编辑器角色语义**：`site/l2d/part-rig.js` 单独声明 25 类蹲姿部件角色，防止通用导入把斧头和左右鞋误判为 `unclassified` 或遗失父子关系。
- **美术**：用户源像素经过小透明噪点清理与 Alpha/连通域拆分，未生成第二张女主脸；纹理属于 SeeThrough 源图的可追溯**二次拆分**，不是声称原 PSD 层逐字节复制。

## 生产验收

- `python3 -m unittest tests/test_protagonist_crouch_asset.py -v`：素材 CRC、原始 SHA、25 个 PNG、尺寸、鞋底/左右手/腿、每层顺序与重建前后像素完全相同。
- `node tests/test_protagonist_crouch_studio_browser.mjs`：真实 Chromium 检查 25 网格、L2D 人物单根目录、完整斧头绘制、动作切换、正面 20 部件恢复、桌面/手机预览、手机鞋底不被底部工具栏挡住、游戏 DEV 加载/恢复女二。
- CI:`L2D modules - auto-register and game + studio integration`，已在该轮通过，并上传 `heroine-crouch-studio-desktop-mobile` 实机截图。

## 边界

本交付实现的是**蹲姿持斧待机**，没有谎称从站立到蹲下的完整连续 IK 过渡；若未来需要起身动作，应按原始膝/踝关节重新制作中间姿势序列，并单独做镜头、地面和遮挡测试。当前仍可在 L2D 工作室进一步调节骨骼和保存局部修改，而不会覆盖原女主站立原画。
