# CHAR-016 男二｜用户提供 Photoshop PSD 的真实 21 层 PartRig

**身份：CHAR-016 男二（不是 CHAR-003 男主或 CHAR-002 女二）。**

## 来源／不可覆盖的人物身份

- 用户于 2026-11-03 上传 `修复图层.psd`：SHA256
  `8b9c05c03cee6afafd3fd7d444cf37a1e05ca56d9390919f4857a3cba8508205`。
- PSD 原始画布为 **315×1024**。已校验两类 Photoshop 内部数据：完整可见 RGB 合成画面，以及有意义的 **21 层真实 alpha 蒙版**。
- 仓库保存了该 PSD 的**逐像素无损合成图**和逐层原始蒙版：
  `site/assets/l2d/source-masks/char-016-front-psd-composite.png.base64`（PNG 文件的 Base64，无质量损失），
  `site/assets/l2d/source-masks/char-016-front-psd-maskbank.json`（逐层蒙版压缩＋原始坐标）。
- 可见合成图 PNG SHA256
  `40791f6947ef530e921d75018ca32589238dba0639ec071e53ab6b8578d5658f`。
- 保留旧的 `site/assets/characters/char-016/front.png` 原画备份，不把新 PSD 乱覆盖到旧文件，也不建一个新人物 ID。

## 图层结构，21/21

这份 PSD 的图层蒙版是互斥的：**同一像素不属于两层，21 层的透明度并集严格等于 PSD 原合成图**。颜色来自这次上传 PSD 的原始合成，而非重新绘画或猜测颜色。

| 区域 | PSD 对应分层名 | 实际使用的独立 PNG |
|---|---|---|
| 发型 | back hair、front hair | back_hair、front_hair |
| 头脸 | ears、face、eyebrow、eyelash、eyewhite、irides | ears、face、brows、lashes、eye_white、irises |
| 西装 | topwear、局部补充区域 | jacket、shirt、tie、collar_left、collar_right |
| 手臂末端 | 局部袖口、左右手 | cuff_left、cuff_right、hand_left、hand_right |
| 下装 | 长裤 + 左右鞋 | pants、shoe_left、shoe_right |
| 连接 | 颈部 | neck |

实际每块 `x/y/w/h` 保存于 maskbank，落在 1024×1024 L2D 舞台时 x 只增加 `(1024−315)//2=354`，不拉伸、不变更脸型。

## 正式模块和可重复构建

`scripts/build_char016_psd_rig.py` → `site/assets/l2d/library/char-016/`：

- `front.png`：原 PSD 的无损合成画面，居中置于 1024×1024 舞台；
- `parts/front/*.png`：21 个 RGBA 独立部件，逐像素符合用户上传 PSD；
- `front.rig.json`：与人物库一致的 `paperchalk-part-rig-v1`，每层独立网格、骨骼、自然默认待机；脚固定，长裤胯/膝使用 IK，胸、肩、颈、头沿骨骼父级传递；
- `front-original-psd-layers.zip`：含 `layers.json` 和 21 个透明 PNG，工作室可直接装载；
- `module.json`：注册原角色 `char-016`（仅正面），自动挂到游戏目录，编辑器和游戏共用相同模型和保存键。

自动测试必须同时核验逐层 PNG 尺寸、所有蒙版不交叠、alpha 并集、原始 RGB 合成对比、游戏 21 部件、鞋固定、实际浏览器滑块和保存。没有通过自动化测试或视觉检查前不要宣称无穿模。

## 真正仍需精修的地方

上传 PSD **没有补画人体被衣服遮挡的区域**：21 层蒙版已经是真实拆分，但在大幅转动头发、手或衣服时，可能露出原图不存在的隐藏像素。西装的主体袖子也仍与躯干纹理相连，独立的是手和袖口，不能把袖口滑块说成完整上臂分段。只有正面素材，没有原生背面。解决方法是在现有 21 层之上做局部遮挡补画和更精细的蒙皮，不能用 AI 合成新脸掩盖问题。

用户工作流程保持唯一：打开 [CHAR-016 L2D 工作室](../../site/character-editor/index.html) → 选择男二 → 调独立滑块 → 保存到游戏；本机保存使用 IndexedDB，发布到仓库仍须提交版本化源图和 rig。
