# 游戏参考拆解与复现任务（2026-11-17）

> 注意：版权游戏素材采用**外部来源链接**保存，不把第三方 GIF、视频、截图复制为本项目资产。此页是技术研究清单，不表示已逐帧像素级复刻。

# 极乐迪斯科 / Disco Elysium

**开发者：** ZA/UM

**参考目标：** 这是我们的 3D 白膜 + Anima 单元素素材 + 相机投射 + depth/normal/height/ID/mask 多 pass 合成管线的核心参考。

## 确认过的来源事实

- ZA/UM 官方文章明确拒绝仅保留地板 3D、其他全是 backdrop 的简单方案，转而建立简单的 3D block-in 世界支持动态光和遮挡。
- 官方文档明确说明固定视角下从相机屏幕投影 UV 到 mesh，配合 tiles 构建绘画世界。
- 美术总监描述用 Blender 输出 diffuse、三个方向 shadow、height、normal、object-ID 等，再 paintover，最后在 Unity 放动态灯和植被。
- 官方另一文章强调：可互动、会移动或仅在特定时间出现的物体必须实时渲染；透明植物单片通过形变 shader 制作海草和水面。

## 画面观察与美术判断（研究结论，不等于开发者公开技术）

- 3D 几何准确不等于美观；对同场景的笔触分组、光比、叙事焦点和色调统一必须单独做。
- 长距离的背景感可以靠遮挡体/深度和大面积画块，避免把所有细节逐一建模。
- 不要让 Anima 每次绘制整张场景，应按照石材底色、腐蚀、苔藓、贴花、植物、道具、雾层分开入库。

## 落地实现步骤

- 白膜先锁相机；透视/正交相机二选一，写明相机矩阵、焦距、目标点。
- 生成 object-ID、depth、normal、AO、height、shadow、world-position 等 pass，在可绘制材质蒙版中存储权重。
- 制作图层导入器：素材 ID、透明通道、绘制 UV、世界空间锚点、影响几何层、blend mode、mask 权重。
- 将 overlay 置于真实几何表面或由投影器投到 mesh 上，严禁将黑影/污渍横跨不同墙体平面。
- 后景远处大块手绘，前景植物/灯/可移动物体实时；为每个可交互对象保留碰撞 proxy。
- 把角色与地面、阴影、局部光照绑定，人物不能漂在卡面上。

## 渲染通道 / 资产分层命名

- `orthographic-camera-projection`
- `blockin-geometry`
- `color-ID`
- `depth`
- `height`
- `normal`
- `AO`
- `shadow-3-directions`
- `albedo-paintover`
- `material-weight-masks`
- `dynamic-lights`
- `realtime-actors`
- `volumetric-fx`

## 验收截图与视频规则

- 检查同一镜头的白模、主材质、画笔层、AO、光照、最终合成六图顺序。
- 镜头偏离主构图时素材是否穿模；若只为固定镜头服务必须显式锁定可移动范围。
- 记录每次 Anima 单元素素材的源文件路径、尺寸、世界单位、对应蒙版及版本。

## 当前项目相关文件

- `site/card-battle/anima-paintover-lab.html — 独立 3D 白膜+5 权重层测试页`
- `site/card-battle/engine/anima-paintover-lab.js — 程序占位材质；已有原始 Anima 猎人医生立绘`
- `tests/anima-paintover-lab-browser.mjs — 白膜、强/弱蒙版、日/夜、人物开关逐态截图`

## 原始图片 / 视频 / GIF 资源

| 类型 | 参考资料 | 核心用途 | 核验状态 |
|---|---|---|---|
| website | [官方媒体库（截图/概念图/壁纸/预告）](https://discoelysium.com/media) | 美术源索引 | `source-page-verified` |
| article | [官方技术文章：Tiling of the World](https://discoelysium.com/devblog/2016/08/18/tiling-of-the-world) | 正交相机投射 UV / block-in / depth-occlusion | `source-page-verified` |
| article | [官方技术文章：From Render to Paintover](https://discoelysium.com/devblog/2019/01/23/from-render-to-paintover) | 动态物体分离、透明植被/水体/flow map | `source-page-verified` |
| article | [美术总监 Aleksander Rostov 专访](https://drumiel.wordpress.com/2023/04/04/entrevista-a-aleksander-rostov-disco-elysium/) | Blender diff/shadow/height/normal/object-ID 各 Pass + 手绘 | `source-page-verified` |
| article | [GamesRadar 艺术团队访谈](https://www.gamesradar.com/disco-elysium-comes-to-life-once-the-talking-stops-zaum-details-its-approach-to-creating-a-truly-expressive-rpg/) | 动态世界与角色的表现策略 | `source-page-verified` |
| video | [Noclip：Making of Disco Elysium Part 4 Art](https://www.youtube.com/watch?v=-eUtrUW2QVU) | 画风、构图、角色艺术设计访谈 | `video-page-verified` |
| video | [Noclip：Making of Disco Elysium Part 2](https://www.youtube.com/watch?v=yrVWe_ZCAko) | 游戏搭建与制作背景 | `video-page-verified` |
| article | [GDC 2020 技术美术讲座介绍](https://www.gamedeveloper.com/art/come-to-gdc-and-see-how-i-disco-elysium-i-s-unique-style-was-achieved-) | Turpentine Fumes and Shaders；讲座存在，不冒充获取全文视频 | `source-page-verified` |
| image | [摇摆旅舍室内图](https://miro.medium.com/v2/0%2AlCXs2KKaBZLCqR0b) | 俯视角色融合，光照与地面花纹 | `image-search-verified` |
| image | [教堂遗迹室内图](https://miro.medium.com/v2/resize%3Afit%3A1400/1%2AavwNWTVIgcgtywFGtyusSQ.jpeg) | 复杂高差/场景遮挡/绘画笔触 | `image-search-verified` |
| image | [海岸教堂俯视场景图](https://image.gcores.com/fee434ac-1747-4eea-bbd6-1eb145d00e3f.jpg?x-oss-process=image%2Fresize%2Climit_1%2Cm_lfit%2Cw_3000%2Ch_5250%2Fquality%2Cq_90%2Fformat%2Cwebp) | 室外场景，岸边材质、破旧建筑 | `image-search-verified` |

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
