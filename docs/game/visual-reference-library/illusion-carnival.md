# 游戏参考拆解与复现任务（2026-11-17）

> 注意：版权游戏素材采用**外部来源链接**保存，不把第三方 GIF、视频、截图复制为本项目资产。此页是技术研究清单，不表示已逐帧像素级复刻。

# 幻象游园剧 / Illusion Carnival

**开发者：** KiZ_qi

**参考目标：** 复现游戏的斜俯视纸片立体书演出、精巧剧场布景和黑童话配色，不把它错归类为传统低分辨率像素游戏。

## 确认过的来源事实

- 用户给出的 B 站第一章宣传 PV 已精确检索到原视频 BV1Cx4y1x7kz，上传账号 KiZ_qi。
- Steam 页面将游戏列为 2.5D、手绘、俯视、冒险/探索/心理恐怖风格。
- 第一章剧情实机和流程合集可以用来区分 PV 的预剪辑和交互中的真实镜头。

## 画面观察与美术判断（研究结论，不等于开发者公开技术）

- 主场景的角色很小但依然有辨识度；需要让背景通过明暗聚焦角色，而不是盲目放大立绘。
- 多层道具如机械齿轮、拱门、布幔、灯牌占据不同 Z 值，并使用真实遮挡。
- 色彩组织是少数高饱和焦点（暖红/洋红/明黄）+ 紫褐暗处；不要每一层都开满饱和度。
- 界面文字与对话框像舞台装饰的一部分，但依然需要显示层级，不能把文字糊成图片。

## 落地实现步骤

- 建立一个小型真实 3D 舞台白膜：平台、后墙、机械装置定位、前景遮挡结构，固定正交/弱透视俯视镜头。
- Anima 逐件生产独立透明 PNG：机械盘、门、灯、丝带、柱头、织物、脚边碎纸、远景灯带。
- 每件素材用 anchor+大小+层级明确挂到 3D proxy，不能简单按 DOM 排列。
- 给平面层添加轻微法线响应与环境色，不要让白边或纸片和场景照度完全脱节。
- 保持角色立绘清晰；像素化应该是可选显示着色层而非不可逆缩小素材。
- 实机重点采集探索转场、镜头推进、互动提示弹入、场景聚光的时序。

## 渲染通道 / 资产分层命名

- `3d-stage-proxy`
- `alpha-sprite-decor`
- `z-depth-occlusion`
- `emissive-props`
- `foreground-occluders`
- `color-grade`
- `small-character-anchors`
- `ui-dialogue`

## 验收截图与视频规则

- 指定作者 PV 作为主参考，另外用第一章真实流程核对镜头运动是否可在运行中实现。
- 输出合成、白膜、前景关闭、所有层独立关闭四版截图，检查遮挡深度。
- 验证人物脚下与平台高度一致；桥/悬空平台不能从背景画直接推断可走区域。

## 当前项目相关文件

- `site/card-battle/anima-paintover-lab.html — 可用来切换俯视镜头的真实 3D 多图层基线`
- `site/card-battle/engine/anima-paintover-lab.js — 多层材质权重与角色画片`

## 原始图片 / 视频 / GIF 资源

| 类型 | 参考资料 | 核心用途 | 核验状态 |
|---|---|---|---|
| video | [【作者】第一章宣传 PV（用户指定）](https://www.bilibili.com/video/BV1Cx4y1x7kz/) | 第一优先：完整构图、剪纸层位、移动镜头、过场反馈 | `video-page-verified` |
| website | [Steam 游戏页](https://store.steampowered.com/app/2796340/Illusion_Carnival/) | 官方图片、预告、游戏说明，2.5D/手绘标签 | `source-page-verified` |
| video | [完整第一章剧情与成就演示](https://www.bilibili.com/video/BV1zS411w7Ri/) | 真实游戏内从探索到对话/机关/场景切换 | `video-page-verified` |
| video | [正式版全流程合集](https://www.bilibili.com/video/BV1a9bHe7E75/) | 不同版本对照，章节内场景完整性 | `video-page-verified` |
| website | [IGDB press kit](https://www.igdb.com/games/illusion-carnival/presskit) | 截图/其他正式媒体入口 | `source-page-verified` |
| image | [霓虹剪纸舞台 Steam 原图](https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2796340/ss_3430dc80d2ac834d82cd331b8c27d6f9b8acb5d2.1920x1080.jpg?t=1774685346) | 巨型手臂与粉紫前景分层，冷暖光 | `image-search-verified` |
| image | [齿轮立体舞台 Steam 原图](https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2796340/ss_15c00bad45920433c40117cce5501fe4ed759ed6.1920x1080.jpg?t=1773124376) | 主景平台/装置竖深/剪纸背景 | `image-search-verified` |
| image | [角色景别与人设 Steam 原图](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2796340/ss_2d250b762443cb29b85ca167e59ba16df7ea1a42.1920x1080.jpg?t=1773124376) | 人物比例、角色边线与舞台配色 | `image-search-verified` |
| image | [游戏谜题界面截图](https://jj-labo.up.seesaa.net/image/Illusion_Carnival__image6.jpg) | 对话/谜题的画面占比 | `image-search-verified` |

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
