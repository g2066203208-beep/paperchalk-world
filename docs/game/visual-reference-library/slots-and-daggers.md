# 游戏参考拆解与复现任务（2026-11-17）

> 注意：版权游戏素材采用**外部来源链接**保存，不把第三方 GIF、视频、截图复制为本项目资产。此页是技术研究清单，不表示已逐帧像素级复刻。

# Slots & Daggers

**开发者：** Friedemann

**参考目标：** 重点复现实体机台、金币金属厚度、运动中高光、掉落和音效之间的节奏关系；不是单独让黄色圆点弹出。

## 确认过的来源事实

- 开发者在访谈中提及 Unity 混合 2D/3D、透视相机与由引擎投射的 sprite 阴影。
- 开发者介绍为金币声、机台升级菜单以及微交互投入大量动画与音效工作；80 Level 保存了特别聚焦金币吐出的开发动态。
- 现有专用参考包含一个开发者发言段（视频 00:43—00:52），可对比视觉目标。

## 画面观察与美术判断（研究结论，不等于开发者公开技术）

- 金币尺寸并非越小越真实：画面要能在实际分辨率辨别正反面与薄厚。
- 高光来自环境反射与视角相对运动；静态纯黄边并不是金属。
- 弹跳应有首触冲击、幅度衰减、多币交错撞击以及声音间隔，收集速度和发射速度不相同。
- 机台外壳材质负责建立空间，金属高光、圆角硬边、阴影、像素层必须统一颜色空间。

## 落地实现步骤

- 一枚 coin 必须有正面、背面、侧面、倒角，不做双面平面 PNG 充当实体硬币。
- 至少提供两类 specular：宽而弱的环境映射 + 窄且亮的短暂掠射；逐帧跟随旋转。
- 币的发射、落下、接触阴影、滚动、收集分成可回放阶段，不和真实游戏货币数据耦合。
- 加入撞击音效事件，并与重力碰撞时间对齐；使用可复现随机种子以便帧对比。
- 在手机和桌面都保存静态关键帧+整段 WebM，检查是否过暗、穿透接币盘或飞出机台。

## 渲染通道 / 资产分层命名

- `3d-coin-mesh`
- `normal+metallic-roughness`
- `environment-specular`
- `contact-shadow`
- `emit`
- `gravity-bounce`
- `collect`
- `metallic-audio`
- `post-bloom`

## 验收截图与视频规则

- 使用金币 12/48/76 三组密度，截图以物理实际发生时刻为准而不是睡眠时间累加。
- 固定相同硬件/分辨率记录：碰撞次数、平均落地时刻、亮斑面积、硬币可见数。
- 最初一版只是可运行基线，反光色彩、数量、时序与原开发 GIF 尚未逐帧标定；严禁写成像素级还原。

## 当前项目相关文件

- `site/card-battle/motion/slot-daggers-coins.js — 自制金币 WebGL 渲染`
- `site/card-battle/coin-fx-lab.html — 单独金币交互演示`
- `tests/slots-daggers-coins-browser.mjs — 三尺寸帧与录屏验收`
- `docs/game/SLOTS_DAGGERS_COIN_REFERENCE_AND_IMPLEMENTATION_20261117.md — 先前技术摘要`

## 原始图片 / 视频 / GIF 资源

| 类型 | 参考资料 | 核心用途 | 核验状态 |
|---|---|---|---|
| website | [开发者官方网站（含截图+Trailer）](https://slotsanddaggers.ateo.ch/) | 机台截图、产品展示、官方预告片入口 | `source-page-verified` |
| website | [Steam 官方商店](https://store.steampowered.com/app/3631290/Slots__Daggers/) | 官方截图、视频、玩法文案 | `source-page-verified` |
| article | [80 Level：金币动画与音效专题](https://80.lv/articles/check-out-coin-animation-sound-effect-in-this-slot-fantasy-game) | 重点研究金币喷出与声音；内嵌开发者动态 | `source-page-verified` |
| video | [开发者亲述视频 00:43–00:52](https://www.dailymotion.com/video/x9sjabo) | 开发者讲到金币声音、菜单动画的精细打磨 | `video-page-verified` |
| video | [实机全流程 4K 60fps](https://www.youtube.com/watch?v=oo73Xs0HcFg) | 逐帧研究投注、转轮、中奖、收钱与节奏 | `video-page-verified` |
| video | [之前采集的实机演示视频](https://www.youtube.com/watch?v=35dhkRyCvhU) | 备用不同版本参考 | `previously-collected-not-reprobed` |
| article | [开发者技术访谈：Unity 3D 透视与 FMOD](https://indiegames.wtf/interviews/slots-daggers-the-roguelite-between-luck-and-strategy/) | 确认 2D+3D、透视相机、实时阴影和音效流程 | `source-page-verified` |
| image | [老虎机战斗 UI 实机图](https://i0.wp.com/rogueliker.com/wp-content/uploads/2025/10/slotsart.jpg?fit=1920%2C1080&ssl=1) | 金属机壳、屏幕、像素表演、转轮布局 | `image-search-verified` |
| image | [升级界面与金币实机图](https://i3.gamebiz.jp/media/6f77cda6-dcbd-4608-ad72-0e3c3b1e1f1e.jpg) | 机台物理质感、硬边轮廓、金币簇 | `image-search-verified` |
| image | [80 Level modifiers 截图](https://cdn.80.lv/api/upload/content/b6/689efe48bf4cf.jpg) | 机台边框/阴影色调 | `image-search-verified` |
| video-embedded | [金币喷出循环：专题嵌入源](https://80.lv/articles/check-out-coin-animation-sound-effect-in-this-slot-fantasy-game) | 页面含相关原开发动态视频；尚未获得独立可保存 GIF URL | `embedded-only` |

## 人工逐帧研究表（等待逐帧核验）

| 素材 | 原始 FPS/帧间隔 | 起点时间码 | 关键帧标注 | 当前状态 |
|---|---|---|---|---|
| 官方 PV/实机 | TBD | TBD | 先记录镜头和触发事件，再逐帧量屏幕坐标 | 未完成逐帧测量 |
| GIF/短片 | TBD | TBD | 帧宽高、循环、帧持续时间及总时长均需采集 | 未完成逐帧测量 |
| 我们录屏 | 以实际 Chromium WebM 为准 | 本地 QA 事件时间轴 | 记录输入帧、第一动作帧、峰值帧、结束帧 | 需定期更新 |

## 资源保全与引用规则

1. 可阅读的原始链接和来源类型保存在 `reference-media-manifest.json`，避免以后搜索不到。
2. 不擅自复制或镜像未授权的游戏图片、GIF、宣传片；如果原链接失效，只更新参考索引并标记失效。
3. 自己拍摄的游戏工程测试截图/视频可留在 GitHub Actions artifact；在正式对比图中明确「原版参考（外链）」与「我们的实机输出」。
4. 若后续 Anima 产出单独素材，则登记尺寸、透明度、源提示词、资产路径、材质槽和遮挡层，**不能**把程序占位纹理写成 Anima 成品。


## 2026-11-18 用户明确纠正：金币应为卡片式 2D/2.5D 高光，不能继续以厚重 3D 圆柱为视觉基准

### 一、证据与方法边界

用户根据《Slots & Daggers》实机所见，要求金币更像**一张张很薄的卡片/精灵图**，翻转时有 3D 质感与强烈、短促的真实金属高光，而不是当前 `motion/slot-daggers-coins.js` 厚重挤出圆柱、浮雕塑料感。**这属于用户视觉目标，不是对原版引擎内实现的已证实判断**。原版具体是否使用 sprite / plane / mesh 仍未知，禁止宣称其采用某种未公开技术。

原版主要动图出处仍为 80 Level 2025-08-15 开发者 WIP 动画专题：
https://80.lv/articles/check-out-coin-animation-sound-effect-in-this-slot-fantasy-game

原版开发者亲述 00:43–00:52 动画、金币声音与触感：https://www.dailymotion.com/video/x9sjabo

原版 4K 实机：https://www.youtube.com/watch?v=oo73Xs0HcFg

原版静帧：https://assets.st-note.com/production/uploads/images/224807377/rectangle_large_type_2_3f697b50263642d1d3c051cc38795bab.jpeg?fit=bounds&height=2000&quality=85&width=2000

**注意**：80 Level 文章确认有展示 WIP 片段，但迄今未找到独立、可直接提取帧的官方 GIF/视频文件。上述不是已完成原版逐帧测量，更不可报出不存在的原版毫秒参数。

### 二、可公开访问的类似技术案例与动态 GIF

1. **DhafinFawwaz/Unity-Optimized-Coins-Shader — 最接近卡片金币批量翻转。**
   仓库 https://github.com/DhafinFawwaz/Unity-Optimized-Coins-Shader
   实际原作者 GIF https://github.com/DhafinFawwaz/Unity-Optimized-Coins-Shader/blob/main/Images/Optimized.gif
   其他 GIF：
   https://github.com/DhafinFawwaz/Unity-Optimized-Coins-Shader/blob/main/Images/MonobehaviourUpdate.gif
   https://github.com/DhafinFawwaz/Unity-Optimized-Coins-Shader/blob/main/Images/SingleMaterial.gif
   https://github.com/DhafinFawwaz/Unity-Optimized-Coins-Shader/blob/main/Images/MultiMaterial.gif
   作者 README 可核对的具体算法：Sprite flipbook 8 帧例子、顶点偏移模拟跳跃、精灵顶点颜色 RGB 分别编码跳跃幅度/相位/起始帧、同材质单批次；阴影不随金币升起。该项目有 MIT license；参考算法，不直接导入素材。

2. **traggett/UnitySpriteShaders — 2D Sprite 可用真实金属/法线/高光分层，而非厚 mesh。**
   仓库 https://github.com/traggett/UnitySpriteShaders
   动态示例 https://github.com/traggett/UnitySpriteShaders/blob/master/ReadmeAssets/Example.gif
   具体技术：Normal Map、metallic gloss、smoothness、emission、rim light、view-space fixed normal；可以在只有一个 plane 的情况下保持类似厚度的受光。

3. **Tim Chism / Coin Shimmer — 单靠 3D coin + 基础光照也会呆板；额外屏幕空间金属闪光蒙版。**
   实际技术说明 https://www.timchism.com/coin-shimmer.html
   原作者动画 GIF https://www.timchism.com/uploads/6/9/6/9/6969793/coinshimmerexamplesm_orig.gif
   另一组 GIF https://www.timchism.com/uploads/6/9/6/9/6969793/coinshimmerexplosionsm_orig.gif
   其方案是在屏幕位置上移动黑白亮斑遮罩，并用 AO/specular mask 屏蔽不该发亮的暗面。这是**独立于原版**的可学技术。

4. **basementuniverse/world-2d — WebGL 2D 法线/高光层与高度照明范例。**
   https://github.com/basementuniverse/world-2d
   可结合当前浏览器游戏引擎，批量绘制 Sprite albedo + normal + specular mask，避免所有亮部都用无结构 additive bloom。

5. **像素金币翻面美术的直接思路**：有独立 2D 开发者描述用 Illustrator 绘制翻面序列帧、Tween 缩放 https://www.reddit.com/r/IndieDev/comments/1x1wvo0/made_a_little_coin_flip_for_a_card_game_ive_been/ 。这是另一开发者经验，不代表原版实现。

### 三、当前金币模块的具体设计替换（未动运行代码前禁止称完成）

**先做 1 枚完整金币视觉单元，通不过对比就不能批量喷发：**

- 金币外形使用带透明边的**薄 2D sprite quad / 程序生成贴图 atlas**，不要依赖当前 44-segment 挤出圆柱体外观。正/斜/边/背至少 8–16 个可观察姿态；侧边应是很细的暗金长条，不能在边沿出现过宽、厚塑胶圆柱的观感。
- 每张 pose 有一致的金色像素轮廓、压印图案、暗金 AO、受控法线和金属/高光蒙版。颜色强调深褐-暗金-亮黄-接近白色四阶；不能一味全局提高 saturation 或 brightness。
- 翻面用 atlas 帧选择或变形 quad（适当的 `abs(cos θ)` 水平宽度 + 侧边姿态贴图），按帧安排正/斜/边/反面的纹理转换；硬币的平面内滚动单独控制。
- 第一层金属反光依照纹理法线与虚拟光源方向，第二层是**受蒙版控制的移动高亮软盒光带**；极亮白色星芒只在小面积、短时间、特定转向出现，不能每枚每帧都十字星泛滥。
- 手绘/像素化轮廓优先；Shader 不应毁掉美术中有意设计的受光断面，减少现在的杂乱细碎几何和镜面噪声。
- 多金币继续可复现 seed/seek、不同初始相位/尺寸/角速度、重力+衰减弹跳、接地阴影、叠层遮挡、逐币 clink、吸入零钱堆；但**不能把掉进钱包的 CG 演出当真正经济逻辑**。
- 手机优先共享 atlas + WebGL instancing/batching；和桌面一样遵守原始横纵比例与 UI 区域，不允许为了手机把硬币绘制得肥厚。

### 四、逐帧验收（必须有真实证据）

1. 先取得能合法查看并逐帧定位的**原版金币 WIP/实机片段**，锁定有效起始帧和 FPS，再记录喷出相对时刻、转角、曝光/高光大小、首触地、收拢时刻；未取得之前原版时间码一律 `unverified`。
2. 同时对比 `1920×1080`、`390×844`、`844×390` 三视口：同一点的原版参考截图（清楚标来源）与我们的浏览器实际截图；保存完整 WebM/GIF、关键帧序列和原样 GIF URL。
3. QA 先只验收**单枚翻转轮廓 + 动态反光**，再加 12/48/76 枚发射、碰撞、阴影、音效；如截图缺失或 CI 失败，不准称已经还原。
4. 未来重新制作完成后更新此节 `状态`、`commit`、`截图目录`、`视频目录`，保留旧版失败图做对比，避免反复回退到劣质 3D 金币。

**当前状态：技术来源已查到，运行时代码仍是旧 3D V2，需要下一轮替换、浏览器实测、逐帧验收。**


### 五、旧版 V2 材质问题的源码直接核对（2026-11-18）

实际检查 `site/card-battle/motion/slot-daggers-coins.js`：片元 Shader 中**没有 `sampler2D` 或 `texture2D` 调用**，没有原画金币贴图、法线贴图、金属遮罩、sprite atlas 或逐帧 flipbook；代码以硬编码顶点位置/法线 + 程序几何生成带厚度圆柱，在 Fragment Shader 中用径向 `rosette` / `brushed` 正弦噪声模拟浮雕，并单独通过 Canvas 叠加星芒。因而它与用户要求的**有手绘像素高光层的薄片式 2D/2.5D 金币**存在根本设计差异；继续微调旧几何的金属颜色/粗糙度/厚度不能代替更换素材表示。

第一验收项明确为：改为真实二维姿态序列 + 反光贴图以后，逐个比较朝向正面、约 45° 斜面、窄边、反面四阶段的轮廓；随后核对高光扫过同一纹理位置的动态连贯性。禁止把单个固定斜杠 glint 当成“真实金属反光”。


## 2026-11-18 白模 V2：依据实机左侧金币堆纠正空间与动态

**触发背景**：用户明确拒绝此前自己想象的“机身中央喷币→横跨全屏底部 U 型接币盘”，要求真正看《Slots & Daggers》原版并直接改成一开始不带金属、光照、贴图的动力学白模。此次针对从 2025–2026 官方/玩家原版静帧可直接核实的**机台右侧主体、金币堆集中在机台左缘，以及金币堆随已有金币数量变化**重构，**不是**声称取得原版 WIP 逐帧视频。

### 直接对照的原版证据

- 原版金币大量聚于机器**左侧**，并在人物界面左缘遮住背景/沿机器高度延伸： https://cdn.playtester.io/screenshots/slots-and-daggers/slots-daggers-ritual-dagger-screen.webp
- 另一个原版特写，左上桌面大量硬币、机台在右： https://assets.st-note.com/production/uploads/images/224807377/rectangle_large_type_2_3f697b50263642d1d3c051cc38795bab.jpeg?fit=bounds&height=2000&quality=85&width=2000
- 2025-11-18 玩家评测明确写到左侧是可见金币堆，数量随货币变化，机器平卧在酒馆桌上： https://djmmtgamechangerdoc.wordpress.com/2025/11/18/slots-daggers-review-7-5-10/
- 开发者明确强调完整金币动效+金币撞击声音： https://80.lv/articles/check-out-coin-animation-sound-effect-in-this-slot-fantasy-game
- 其开发者亲述片段 00:43–00:52： https://www.dailymotion.com/video/x9sjabo

**原版动态可访问状态：没有下载到可以逐帧检查的开发者原始金币 WIP 片段。前述来源是可核实的实机静态构图与开发者陈述，因此目前无法严谨量化原版发射速度、撞击频率、弹跳衰减的真实毫秒值。禁止声称已经逐帧/像素级复刻、也不能把自制测试 GIF 当原版参照。**

### 已实际提交 main 的可运行白模 V2

- 页面： `site/card-battle/coin-whitebox-lab.html`，提交 `e05e1482feb3a559f84a598ef826a79da412b182`
- 引擎： `site/card-battle/motion/slot-whitebox-physics.js`，提交 `53f573b3c51633ed15410e575fd5d4d1e61c2533`
- 120Hz 单测： `tests/slot-whitebox-physics.test.cjs`，提交 `2fe9a61201ddb2d966590ff076d9f064d0351b81`
- 浏览器截图+视频： `tests/slot-whitebox-browser.mjs`，提交 `5bb8c9080f6ee06e5d2341bf44c3c06b3862ab28`
- 托管目标： https://g2066203208-beep.github.io/paperchalk-world/card-battle/coin-whitebox-lab.html （是否完成 GitHub Pages 部署需另外核对 Actions；不能仅凭 GitHub commit 断言部署成功）

### 此次与上版本质区别

1. **坐标/构图**：固定 1000×600 原型坐标，游戏机主体在 `x=283..970`，金币物理区域 `x=62..271`；左翼机身出口 `(258,224)`，不是中央喷口/屏幕底部大 U 盘。
2. **原有堆**：每次首次试玩存在 18 枚具有真实碰撞体、堆叠支撑的旧金币；新币加入时会撞醒旧币，**不是两个重叠的贴图层**。
3. **连续喷发**：重力、每枚速度差/角速度差和连喷节拍，二维圆形接触代理，一维厚度靠翻面角体现。未作 3D 圆柱物理谎称。
4. **可叠加下一次中奖**：新增 `append(count)` 保留之前全部已有金币，并将第二次中奖喷入同一堆；用户单击“从零重播”才真正重置。
5. **反弹与安定**：固定 120 Hz，空间网格配对，9 轮冲量/位置纠正、桌面与侧界壁、法向反弹与切向摩擦、接触支撑与休眠；每枚金币只因真实接触被重新激活。
6. **无材质**：只显示单色白模圆片和边线；未加入金属、反射、星芒、金币贴图，严格保持先运动后材质的用户指令。
7. **手机**：游戏全景 + **同一物理世界**左侧金币堆二次放大镜头，不生成第二组假粒子。测试 1365×900、390×844、844×390。

### 已运行的本地真实 Chrome 测试与限制

`node tests/slot-whitebox-physics.test.cjs` 对 12/48/76 枚、初始 18 枚旧币、固定种子等价、后续累计喷发、最终不穿透桌面/左右边界、金币间接触全部通过；48 新币+18 原有在约 5.8s 完成静止，最终 66/66 都处于 sleeping，最终最大穿透校正误差约 `0.04` 画面单位。桌面/手机浏览器按 360/900/1800/3200/5800/10000ms 渲染并截图，未出现 JS 异常。具体 QA 录屏与截图依托上传后的 GitHub Actions workflow；**未确认 CI final success 之前不得称线上自动验收已通过**。

**仍然待做**：真正找到并提取开发者出币 WIP 视频相邻帧，统一参照帧宽、FPS、起喷/触地/峰值/结束时间，以实机帧与我们的同帧画面对比反复改调；当前新白模是“有静态构图证据的物理布局纠正”，还不是完整原版动作重现。
