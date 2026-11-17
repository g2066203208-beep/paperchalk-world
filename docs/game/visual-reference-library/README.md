# 游戏视觉与动态参考库｜2026-11-17

> 项目唯一索引：**五款重点参考游戏、57 条已编目的参考媒体**。这里保存**外部官方/开发者/实机/编辑图源链接**、验证程度、技术拆解、逐帧复刻验收标准。未把受版权保护的第三方图片与视频直接提交到仓库。  
> 浏览器可视化入口（同仓库静态站部署后）：[`site/card-battle/reference-library.html`](../../../site/card-battle/reference-library.html)。

## 五个重点游戏（分别维护，不混成一堆）

| 游戏 | 参考重点 | 详细资料 | 图片/视频/GIF 链接数量 |
|---|---|---|---:|
| **Forgive Me Father 2** | 三维漫画场景、8方向 Sprite、环境光、打击死亡 GIF | [独立记录](forgive-me-father-2.md) | 19 |
| **Slots & Daggers** | 金币翻转/反射/落地/声音、机台材料 | [独立记录](slots-and-daggers.md) | 11 |
| **幻象游园剧 / Illusion Carnival** | KiZ_qi 原作者 PV、俯视 2.5D 纸片舞台、多层光照 | [独立记录](illusion-carnival.md) | 9 |
| **极乐迪斯科 / Disco Elysium** | 3D 灰盒、相机投射、diffuse/shadow/depth/object-ID pass、paintover | [独立记录](disco-elysium.md) | 11 |
| **小丑牌 / Balatro** | CRT、卡牌特殊箔片反光、计分动画、交互节奏 | [独立记录](balatro.md) | 7 |

- [**机器可读总表 JSON**](reference-media-manifest.json)：57 条媒体，保存媒体类型、来源、URL、目标画面和已核实状态。
- [**场景合成执行规范**](RENDER_AND_ANIMA_PIPELINE.md)：3D 白膜 → 单元素 Anima → 图层权重 → 深度遮挡 → 灯光 → 逐帧对比。
- [**Anima 独立素材完整提示词库：18 张素材，尺寸、正负提示词、分层与验收规则**](ANIMA_ENVIRONMENT_PROMPTS_LIBRARY.md)。
- [**Anima 场景素材机器可读生产清单（JSON）**](anima-fading-hall-prompt-catalog.json)；状态为 `prompt-only-not-generated`，防止把规划误判为已入库的素材。

- [原有 Slots & Daggers 金币实现研究](../SLOTS_DAGGERS_COIN_REFERENCE_AND_IMPLEMENTATION_20261117.md)。
- [原有雪地场景原版 vs 游戏实机 QA](../SNOWBOUND_REQUIRED_REAL_REFERENCE_VISUAL_QA.md)。

## 资源状态解释

- **source-page-verified**：官方/开发者/媒体网页在公开检索中有明确内容；
- **image-search-verified**：公开图片检索获得了原始图链接，可在图库预览，但未复制到本项目；
- **video-page-verified**：视频页面可检索，**不代表**已经下载并逐帧对比；
- **gif-url-present-frames-not-measured**：原始 GIF 外链已登记，但浏览器检索器不支持读取 GIF 帧时间，尚未做帧级测量；
- **previously-collected-not-reprobed**：此前查到的来源已记录，本次没有再做媒体文件完整性测试；
- **embedded-only**：开发者动态视频嵌在文章内，没有确认可独立访问的 GIF 文件。

## 每次复现必须留证据

1. 原参考的 URL、镜头点、参考时间码或 GIF 帧序号；
2. 游戏的**实际运行截图**（白膜 / 材质 / 蒙版 / 光照 / 合成）；
3. GitHub Actions 保存 desktop + mobile 的 **WebM + PNG**；
4. 检查相机、空间接地、人物尺寸与透明 alpha、遮挡，以及实际播放速度；
5. 记录完成度和遗留问题。没有逐帧核验的效果只能标为“开发版”或“视觉观察版”。

## 当前演示场景和模块

- [真实 3D 白膜 + Anima 分层场景](../../../site/card-battle/anima-paintover-lab.html) · [源码](../../../site/card-battle/engine/anima-paintover-lab.js) · [实机测试](../../../tests/anima-paintover-lab-browser.mjs)。
- [Slots & Daggers 金币材质实验室](../../../site/card-battle/coin-fx-lab.html) · [原生 WebGL 金币模块](../../../site/card-battle/motion/slot-daggers-coins.js) · [三分辨率 QA](../../../tests/slots-daggers-coins-browser.mjs)。
- [Forgive Me Father 2 风格 3D 场景初版](../../../site/card-battle/engine/snowbound-inkworld.js) · [战斗入口](../../../site/card-battle/snowbound-journey.html)。

## 额外参考游戏（暂不归入本批 57 条）

先前讨论的《邪恶冥刻》《杀戮尖塔》《炉石传说》《纸片马里奥》《暗黑地牢》等，可以另建独立游戏资料页。**在没有经过来源检索前不虚构图源/开发者技术。**

## 版权所有和可重复验证

- 参考资料链接回原作者/官方页面。这里的“已记录”不代表获授权把游戏图片打包进开源代码仓库。
- 我们自建的截图、录屏、程序绘制材质或用户拥有的 Anima 原素材按项目已有规范保存。
- 所有资料保持“可追溯来源 + 需要完成的检测项”，绝不把主观视觉判断写作开发者技术公告。
