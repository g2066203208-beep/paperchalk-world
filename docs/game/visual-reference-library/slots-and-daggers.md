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
