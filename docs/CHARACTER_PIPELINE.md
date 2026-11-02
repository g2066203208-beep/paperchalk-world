# 当前主角正式资源接入规范（2026-11-02）

**现行身份母版：[PROTAGONIST_CANON.md](PROTAGONIST_CANON.md)**；机器真源：[`site/data/characters/registry.json`](../site/data/characters/registry.json)。

- `protagonist` 是唯一女主角身份 ID，姓名待定。所有人物属性和新变体必须引用该 ID，不新建「背面主角」「卧室主角」等重复身份。
- 正面母版：`site/assets/characters/protagonist-front.webp`，由已批准的原始主角图去除白底得到；**不可未经允许重新生成面孔/发型/服装**。
- 背面母版：`site/assets/characters/protagonist-back.webp`，是同一角色的实际背面，不可使用正面水平镜像代替。
- 游戏 `site/index.html` 使用背面立绘于现有主角层；`site/l2d/` 正背切换查看同一人的原位呼吸形变；`site/character-editor/` 以正背两张合成素材作为本机分层编辑参考。
- 旧 `site/assets/battle/player-back.webp` 临时角色**已被删除**，不得再当作正式来源；不在场景预览另开一张「主角立绘」关卡。
- 新图片场景的自动注册属于 `site/assets/scenes/`，与人物资源目录分离。室内场景的主角仍复用单一角色层。
- 不应将 `site/l2d/rig.js` 的栅格原位形变误称为完整 Spine/Cubism 骨骼资产；如果日后引入分层 PSD，应保留用户的原图坐标、层顺序与可回滚记录。
- 角色姓名/生日/确切年龄/身高/体重/职业/性格中，**除原画可见特征外均未获最终确认**；具体临时设计建议详见主档案，不得将提案说成已确认事实。
- 修改任何人物资产或角色注册表前运行 `python3 scripts/validate_character_identity.py`，提交到 GitHub 后工作流自动再验。不得不经用户允许改动已有两张 WebP。

> 历史资料曾写「背面仍是临时战斗图」「动态黑斑开关」等内容，那是旧版本叙述；以当前主分支文件和本规范为准。动态黑斑功能已从现行主网页移除，基础动态黑雾是另一套效果。
