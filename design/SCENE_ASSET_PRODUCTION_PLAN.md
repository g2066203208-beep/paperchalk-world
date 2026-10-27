> **2026-10-27 后续用户指令覆盖说明**：主菜单已明确采用 `design/menu/reference-approved.jpg` 的场景构图，并已授权分层实现；不能回退或擅自换方向。用户进一步确定：开局小杂货店，菜单是当前店面，扩建/换店同步更新菜单，人物必须完整全身并参与真实物件演出。最新规范见 [实机界面设计](gameplay/SMALL_SHOP_SCENE_SPEC.md) 和 [转场设计](gameplay/TRANSITION_SPEC.md)。本文件的 Gate 0–5 仅作为营业场景逐区域重构的历史制作方法，不能覆盖这些更新的授权与设定。

# 未命名冬季窗口小店｜美术生产与场景装配实施规范 v1

> 2026-10-27 用户纠偏后制作基准。**这是一份待逐关验收的实施方案，不代表场景或精灵已经绘制完成。** 最新有效要求优先于所有旧设计笔记：色块扁平、简约清爽、统一限色；先一面墙、再开窗、再逐个装配柜子/台面/道具；真正可组合的高清透明独立素材，不许用整张概念图当游戏，不许一页塞几十个小素材。游戏未命名。

## 0. 本轮检查及立刻停止的错误路径

main 在撰写前检查为 `3e4c7a4206cd717db63b7283ae5865bb1b5b0a76`。仓库 `src/kiosk-gpt-scene.js` 仍保留从 `winter-kiosk-source.png` 逐坐标裁剪的 atlas 兜底，`assets/gptimg/parts/` 虽有 28 个 PNG 和 manifest，但除一张分割顾客外，大多数只是裁剪出来的**带原场景背景的片段**，不符合最终可重复摆放独立素材标准。CI 最近通过，只能证明原型可运行，不能证明美术质量。旧版描边像素、浓重二次元厚涂、橙蓝油光贴纸包、单张大图假交互全部退出正式视觉生产。禁止为“补数量”批量生成全套资产图集。

## 1. 唯一风格母版

用户给出的橙色标题视频截图表达的，是**视觉设计语言**而不是必须复制的角色或标题：大块轮廓、硬边色片、图形构成、有限橙/藏蓝/浅灰白、干净留白；不复制原视频人物、服饰、台词、标识。
- 调色板初始候选（用户确认前可微调）：深藏蓝 #243452、蓝灰 #7185AB、浅蓝灰 #DCE4F0、暖白 #F8F6F1、橙 #EE9A36、深轮廓 #202947。**同一物体最多底色+一层阴影+少量强调色**。
- 禁止：照片质感、木纹、写实反射、圆润假 3D、塑胶亮面、渐变空气刷、辉光 bloom、细碎贴纸、橙蓝都高饱和互相抢焦点、素材和 UI 多套画风混用。
- 形状用整洁平面轮廓、少量硬边色片；避免为了“精致”无端加入雪堆、动物耳朵、女仆围裙、商标、拉花、装饰彩带等用户未指示内容。
- **风格关口**：先一块墙和一个洞在真实 Canvas 里看起来正确，才允许任何后续付费生成。

## 2. 画面坐标、相机与装配方式

- 概念工作画布：设计基准 1080×1920 竖屏；运行时为等比例逻辑坐标，按 viewport 和 safe-area 解算场景矩形。场景相机不强制伸展单张图片；手机横屏改成重排/露出两侧内容而非压扁人物。
- 独立对象需要 id、type、anchor、logical rect、layer、state、hit region、asset refs、optional animation。视觉边界不得定义库存；库存、价格、交互仍依附 `kiosk-core` 的权威状态。
- 先在画布显示一面墙，**在墙上扣出真实透明窗口开口**。后面才画窗外街景和顾客。窗口上下左右有 frame back/front 和 sill；关闭时显示独立 shutter 并阻断交谈；打开时 shutter 不得挡住街景和顾客。
- 跨设备需维持顾客/商品原始长宽比，人物脚/下缘锚点固定，不能用 `drawImage(img,x,y,w,h)` 任意挤压源尺寸；可用 contain/cover、9-slice、裁剪窗或矢量伸展。

## 3. 显式层级（绘制顺序由后到前）

| Z | Scene Node | 生产方法 | 真实状态 / 遮挡 |
|---|---|---|---|
| -20 | menu/空白背景：斜条、圆角几何和呼吸循环 | Canvas 数学动画，仅变换/色块 | 不放字、与营业场景隔离 |
| 0 | outdoor sky/街道基础色片 | Canvas 基本几何；复杂固定远景可独立 GPT 素材 | 只透过 window opening 可见 |
| 10 | wall.back / 单块室内墙 | Canvas 色块、矩形和转角 | 窗口区域必须留洞 |
| 20 | window.back-frame | Canvas 矩形边框 | 后框，静态 |
| 25 | outdoor snow and far prop | 数学粒子 + 有必要才用独立美术 | 窗口剪裁范围内 |
| 30 | npc.fullbody | GPT 单人高清透明完整立绘 | 状态：到达/等待/说话/接货/离开；下半身裁在窗内 |
| 40 | npc.hand / item being accepted | 独立手势/商品精灵 | 位于人物前面，框前面或后面按动作移动 |
| 45 | window.front-frame + sill | Canvas 单独矩形边线/必要时独立图 | 遮挡顾客下缘；具物理窗闩 |
| 50 | cabinet interior / wall shelves | Canvas 简洁开口、分隔板；少数材质饰件才 GPT | 实际容量/格位 |
| 60 | shelf product items | GPT 每件商品单张透明图 | 依据库存每格显示实际数量和占位 |
| 70 | cabinet doors / drawers | Canvas 几何/可替换独立高分辨率门板 | 独立 open/closed；遮住内部 |
| 80 | counter rear fixtures | Canvas 柜台台面、收银设备结构；复杂特殊道具 GPT | 可被手部遮挡 |
| 90 | handoff mat / delivered item | Canvas 台垫 + GPT 单件商品 | 与 `counter` 权威状态一致 |
| 100 | first-person arm and held item | GPT 单独手/袖姿态或 2D 骨骼剪片；物品独立层 | 拿/放/归还/交接不能复制库存 |
| 110 | counter front fascia, lower drawers | Canvas 纯色大块；特殊把手独立 | 台沿遮挡玩家手/托盘一部分 |
| 200 | HUD and clickable controls | Canvas/DOM 排版图形；字体实时绘制 | 独立 hitbox，不烘焙字到图里 |

注意：**只把动态窗口景象放在墙的洞后**；不要把整张窗外街道绘制在柜台前。开关门和商品堆叠分别有独立深度，不能再裁原图某个矩形假扮“柜子已打开”。

## 4. 制作/验收关口（严格逐级，不允许跳关）

### Gate 0：仅“墙”
- 在独立 branch 做 `wall-root` 的真正运行 Canvas 场景：一面墙、平面颜色和结构线。没有顾客、橱柜、商品、UI 皮肤或生成图。
- 只用程序画：墙面、墙边线、地面/顶面结构；不为直线消耗 GPT 生成。
- 390×844、360×800、844×390、1280×720 自动截图；不滚动、不抻变，避免离屏元素和文字盖住主场景。墙体的最终位置/颜色先验收。

### Gate 1：墙上“真开窗”
- 墙自身不是一张贴图；设 `windowRect` 的裁剪/挖空。先放纯色测试卡在洞后验证只透过洞能看到。
- 前后框和窗台为独立 layer；打开/关闭改变 shutter 的 visibility；窗闩命中区域手机至少 44 CSS px。反复开关 100 次不得出现闪烁/状态不同步。
- 不画商品、不生顾客；先确认窗的形状、大小和室内狭窄感。

### Gate 2：四周柜子 + 可用货架
- 吊柜独立左/右门扇，抽屉分开 closed/open、各自 hitbox，货架为真正的 slot 容量。柜门状态和内部格子始终保留 `kiosk-core` 原有权威规则。
- 门板、木作均优先 Canvas 几何；确需特殊造型才给 GPT 单件独立素材，不要把“左右两个门状态”贴在一张低分辨率表里。
- 检查遮挡：门关遮内物、门开露背板；放货真实占位且超限拒绝。

### Gate 3：前景操作台 + 一件商品
- 收银机、置物垫、交易台、抽屉各自为节点，测试从单个货架拿起 `bread` -> 手持 -> 交接垫 -> 收银 -> 库存/钱更新；主视角操作台占实际合理空间。
- GPT 只生成**单个复杂商品/特殊道具**，每张透明，不能有自带台面/背景/假标签文字。包装上的文字由程序绘制或使用原创抽象色条。
- UI 按钮可点可读，44px 触控区，出图不混淆前景道具和菜单 UI。

### Gate 4：完整人物
- 先做**一个原创完整全身立绘**，而不是只画窗口以上的胸像。一个角色一张高清透明 PNG，头顶与脚底都在画布内；一套确定的冬装造型、剪影与颜色情况，先进行风格比对。
- 其他人物、表情、侧面、接货姿态必须继承同一角色母版，不得重新随机设计换人。角色全身在 NPC 层里，经窗口 clip 只露出上半身；客人走近/离开使用变换与状态，不重复生产静态角色。
- 待完整立绘确认，才逐个生成表情/手势图与第二个 NPC。

### Gate 5：统一 HUD 与发布
- 标题和道具不烘焙进 NPC 或环境贴图。所有数字、货币、库存、操作标签都实时渲染；不塞假字、假热点。
- 同一调色板、边框规范、图标尺寸体系。保留单屏、safe-area、旧存档键、WebRTC 店长/店员权限和 Android 测试构建。
- 真机横竖屏验证仍为未完成项，不能只凭 CI 称真机通过。

**每一关交付**：真实源文件/PNG、manifest JSON（id、路径、原始像素 w/h、alpha、anchor、rect、Z、动作状态、版权来源）、Game Canvas 截图、与参考图对照、Node + Playwright 回归结果及 commit SHA。上一关截图未通过，不再批量生成下一关素材。

## 5. 谁画什么：成本与清晰度策略

| 元素 | 方法 | 为什么 |
|---|---|---|
| 墙、矩形洞、直线、边缘、窗台几何 | Canvas/矢量参数 | 可无限缩放，尺寸精确，不浪费生成次数 |
| 窗门/柜门/抽屉简单平面形态 | Canvas 形状 + 动态状态 | 门可开关、遮挡与尺寸联动 |
| 窗外雪粒、呼吸色块、慢速斜条、空白背景 | 数学计算 | 平滑循环，无大图，性能可控 |
| HUD、文字、数量、图标中的简单符号 | Canvas/DOM/矢量 | 可本地化、可点击、高清 |
| 完整 NPC 立绘、表情脸/手势、原创复杂包裹/设备 | **GPT image：每次仅一个目标，独立高分辨率** | 需要手工设计感，不能让程序胡乱代画 |
| 面包、牛奶、热茶、纸箱等有设计的包装 | GPT 单个产品（经一致母版） | 可复用、可摆放、不能来自完整场景切边 |
| 按钮/图标可用几何元素 | Canvas/矢量优先；少数特殊装饰才 GPT | 避免一页几百个模糊小图标 |

**资产规格**：大人物母版建议单张 1024×1536 或更高（以出图实际尺寸为准），透明完整四周至少 6% 缓冲；复杂物件单张至少 768×768 或 1024×1024，透明，不裁切底部。不得“4×4 图集共 1024 像素”当正式源。所有视觉资产一件一文件 `png` 原稿并可有 webp 转码。检查 alpha extrema 0..255、白边/背景污染、边界不切断、对象轮廓完整、与定义尺寸 1x/2x 验收后才放入 runtime。禁止用 Python 重新造美术；Python 只作 PNG 解包/蒙版检查/裁边与自动测试，不替代 GPT 的绘制。

## 6. 第一批 GPT 提示词——**不是立即执行，Gate 1 通过才使用**

下面提示词是生产约束，实际生成时一次只附一个当前目标和一张已批准的风格母版。

### A：单件完整可拆人物（Gate 4）
```text
Create exactly ONE original full-body character sprite for a winter neighborhood shop simulation game.
Visual language: clean Japanese-inspired flat 2D editorial character design, strong readable silhouette,
broad solid color shapes, sharp controlled edges, large negative spaces, simplified facial proportions,
minimum fine detail, only one cel-shaded shadow cut per material, zero airbrush, zero gradients,
zero bloom, zero painterly brush texture, zero glossy 3D shading.
Color budget: midnight navy, muted blue-gray, off-white, restrained warm orange accent,
soft natural skin color. The character is an ordinary winter customer, standing naturally,
relaxed neutral pose, two legs and both shoes FULLY visible, both hands unobstructed,
straight-on front view (no 3/4 perspective), centered on canvas, consistent anatomy,
designed for later separate face and arm expression variants.
A simple practical winter outfit, not maid costume, no animal ears, no excessive accessories.
Transparent alpha background only. Exactly one person. No floor, no shadow, no frame, no
shelves, no kiosk, no UI, no typography, no props, no logo, no spritesheet, no collage,
no cut-off hair or feet. Allow clear transparent padding on all four sides.
Output a full-resolution isolated editable character master, not a gameplay screenshot.
```

### B：唯一复杂商品的透明独立精灵（Gate 3）
```text
Create exactly ONE isolated small packaged shop product prop for the SAME approved flat-color game art bible.
The requested object is [specific SKU and exact desired packaging silhouette].
Front orthographic view, believable box/container silhouette, broad flat solid-color regions,
max one hard-edged shadow region, crisp readable shape at 48px screen display.
Restrained navy / muted blue-gray / warm orange / ivory palette only.
Transparent alpha background with generous edge padding. No shelf, no hand, no table,
no background environment, no fake UI, no label text or brand names, no drop shadow,
no scene context, no perspective 3D gloss, no extra objects, no sheet layout.
One item = one full-resolution image. Object completely inside frame.
```

### C：只有确需独立设计的特殊窗口装饰才使用（Gate 1 精准选择）
```text
Create ONE isolated front-facing flat-color decorative window-frame ornament module,
not an entire building, not a snowy street, not a kiosk scene.
Perfectly flat 2D front orthographic design, clean geometric cuts, limited navy, off-white,
muted blue and small orange accent, one solid shadow layer maximum.
Respect this exact rectangular slot: [measured logical rect and aspect ratio].
The open hole in the center MUST remain fully transparent if requested.
No attached shutter, customer, product, text, wall or table. Single object,
full-resolution transparent PNG, clean complete exterior edges, no drop shadow.
```

生成标准：不对比风格母版和实时游戏截图，不批准第二张；一个失败素材先局部重做，不扩散到 20 张成套资源。

## 7. 工程技术与自动验收

- 当前保留 Canvas/WebRTC 原型，不在美术 Gate 0 强制换引擎。改为 `SceneNode -> z-sort -> clip/mask -> draw -> hit-testing` 小型确定性场景树；游戏状态逻辑不被“改画风”重写。
- `SceneNode` 的 input hit order 和 visual Z 是两套顺序；输入不能因为边框盖住了人物就错点柜门。这里参考 Godot CanvasItem 的树顺序和 z-index 原理，但实际现有 Canvas 代码按同样原则实现。
- Playwright 截图验收：360×800、390×844、844×390、1280×720；检查 viewport 无滚动、元素边界不越界、主 hitbox 至少 44 CSS px、窗口 clip 有效、人物不拉伸、中文显示、画面遮挡层级正确；双客户端交接/收款/开柜同步与 v3 localStorage 不退化。
- 发布必须真实对应同一个 SHA：Node、Chromium Actions、Pages、Debug APK 构建及截图；失败读 CI 日志修复重跑。APK 现为 WebView 测试壳，不得称原生 Android 引擎或自动安装更新。

## 8. 工作准则

1. 用户说“先规划/先画一面墙”，就只交付该阶段，不扩大成一张整合效果图。
2. 不以没有验证的占位素材冒充美术交付；不复用带原背景矩形裁片当正式透明资产。
3. 不再同时生成场景图集、角色图集、商品图集、UI 图集。任何新的 GPT 绘制先确认母版且**一次一个完整对象**。
4. 用户视觉确认之前不生成后续大批美术。所有效果以**实际运行截图**而不是生成结果预览作为最终验收。
