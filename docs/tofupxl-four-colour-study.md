# TofuPxl 四色像素肖像技法研究｜PIXEL ATELIER 2026-11-01

研究已入 `site/pixel-lab/character-ai/style-study-artists.json`，对应网页 `four-colour-study.html`。针对原创游戏《夜航灯》的全身立绘、人物五官和受限四色配色研究。**不是找到了之前用户所指的那位画师，不能据此替换原画师选择**。

## 原作者来源与事实
- TofuPxl / Tofu PixelJoint 账号：https://pixeljoint.com/p/224166.htm
- 正式像素作品集：https://tofupixel.carrd.co/
- `4 4 colour portraits`，2021-04-10： https://pixeljoint.com/pixelart/138985.htm 。PixelJoint 明确写 `Palette: 4 colors`；作者称为有限色板练习。四种颜色是**这幅整图的颜色数**，不是作者所有作品默认四色；原作准确HEX没有被核验，不得猜测。
- `portrait 2`，2023-11-10：https://pixeljoint.com/pixelart/154059.htm ，一个长期肖像练习案例，未确认色数。
- `fallen`，2024-06-28：https://pixeljoint.com/pixelart/156449.htm 。PixelJoint明确写 **Palette: 32 colors**；作为4色到32色的对照，不可错误标注成4色。
- `Field`，2024-05-07：https://pixeljoint.com/pixelart/155981.htm ，《Book of Abominations》战斗背景；原作者明确游戏UI为Alex De La Cour制作，不可张冠李戴。
- 官网作品集列出 `Modular Tileset`、室内场景、背景与动画，可用于我们的场景资产生产流程参考，不能当作已经获许可的训练样本。

## 学习目标（工程师观察，不冒称作者公开理论）
1. `4-colour identity`: 限定4种颜色后依然保持人物肤色、脸型、眼睛和发型的辨识度。
2. `cluster geometry`: 用大块影子、清楚的面部转折与头发区块建立结构，而不是用孤立杂点和假抖动凑细节。
3. `portrait invariance`: 自己的不同原创人物保持4色约束，分别检验形态多样性，不要把唯一参考头像变成模板换脸。
4. `environment modularity`: 从职业作品观察地面、环境、前景植被的层级关系；模块化场景与人物肖像作为不同实验项目，避免数据混淆。
5. `4 vs 32 study`: 保持不同色数作品为独立对照，不能宣称TofuPxl每张图都仅4色。

## 已实现的工作台
- 三组**我们自创**的四色调色板（雾樱玻璃 / 夜灯灰阶 / 夜港冷暖），不声称是TofuPxl作品真正HEX。
- 原创程序练习人像，64×96；本地图导入PNG/JPEG/WebP，不上传到服务器，逻辑尺寸可选64×96 / 96×144 / 128×192 / 192×256 / 256×384。
- 区域平均采样 + 4色最近邻量化，透明度强制0或255，一格一色、不做抖动，输出PNG（真正RGBA网格）和可审计JSON。
- 颜色数量、颜色占比、半透明格、透明格、连接区域与<=2格小孤岛，按其独立RGBA和原生像素坐标测量。
- 代码经过Node单测与Chromium真实桌面/手机测试，且不把代码审核成功误判成美术成功。

## 模型训练版权
PixelJoint底部明确声明“All pixel art copyrights are retained by the pixel artists.” 公共查看 ≠ AI模型训练许可。当前 `training_images_approved=0`，`training_permission=not_verified`。**不能自动下载原作进入研究模型训练集；不能偷偷制作TofuPxl LoRA。**
工作室可以学习独立的抽象技法和自己创作的色板/人像，未来有明确训练许可的数据才可进入AI训练程序。
Anima 的 `@tofupxl` 是否真实存在对应识别概念**未验证**，不要作为已验证tag加入Anima提示词。
