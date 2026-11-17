# 游戏参考拆解与复现任务（2026-11-17）

> 注意：版权游戏素材采用**外部来源链接**保存，不把第三方 GIF、视频、截图复制为本项目资产。此页是技术研究清单，不表示已逐帧像素级复刻。

# Forgive Me Father 2

**开发者：** Byte Barrel

**参考目标：** 重建三维建筑与画中人物一体化的空间感，观察相机运动时建筑、雾和 2D 怪物正确的前后关系。不能把整幅截图当作一张贴在后面的全屏卡面。

## 确认过的来源事实

- 官方确认 2D sprite 置于真实 3D 场景中；续作敌人采用 8 个观察角度。
- 游戏设计材料与开发日志可用于研究漫画式轮廓、高对比环境色和建筑结构。
- 场景灰盒与完成图是同一建筑的前后对照，适合精确比较构图和材质层的差别。

## 画面观察与美术判断（研究结论，不等于开发者公开技术）

- 注意地砖的实际消失点：近处平铺纹理尺度应随距离缩小，而不是像 UI 平面一样固定像素大小。
- 灯附近的墙面必须由材料响应光，而不仅是屏幕空间叠加一块暖色蒙层。
- 人物的脚底/行进方向、墙体前后遮挡以及动态雾的深度应该连动。
- 黑线并非在所有物体上同样粗，远景轮廓应衰减；场景里的亮源要保留色彩层级。

## 落地实现步骤

- 先完成透视与基本 geometry，锁定机位/视角，记录镜头内每个主物体的屏幕包围盒。
- 墙体和地面建立独立材质层（底色、破损、粗糙度、湿度）；不要把所有纹理画进一张照片。
- 给静态地形提供深度、法线，添加轮廓后处理（不要画黑框伪装漫画风）。
- 人物独立 billboard，保留原始长宽比，通过方向图集而非旋转单张图片表现转身。
- 人物、脚下阴影与建筑遮挡须使用统一地面坐标。
- 攻击段落建立逐帧 capture：击中前、命中首帧、hit-stop、恢复、死亡/散落。

## 渲染通道 / 资产分层命名

- `geometry/depth`
- `handpainted-albedo`
- `detail-decals`
- `normal+roughness`
- `lighting/shadow`
- `toon-edges`
- `volumetric-fog`
- `character-billboards`
- `hit-vfx`

## 验收截图与视频规则

- PC 1920×1080、横屏 844×390、竖屏 390×844 保存相同镜头。
- 相机左右各偏移 ±10°，角色是否卡在正确深度；近景栏杆应能遮挡人物下半身。
- 白膜与完成场景结构轮廓应对齐；材质变化不得导致人物飘离脚底坐标。
- GIF 播放速度、逐帧位移、残影的帧数未测量前必须标注 TBD。

## 当前项目相关文件

- `site/card-battle/engine/snowbound-inkworld.js — 早期 3D 哥特场景学习版；不是原版还原`
- `site/card-battle/ui/snowbound-inkworld.css — 现有游戏混合层`
- `site/card-battle/anima-paintover-lab.html — 新的白膜/多权重材质演示`

## 原始图片 / 视频 / GIF 资源

| 类型 | 参考资料 | 核心用途 | 核验状态 |
|---|---|---|---|
| website | [官方 Steam 页面](https://store.steampowered.com/app/2272250/Forgive_Me_Father_2/) | 官方商店、预告片、截图汇总 | `source-page-verified` |
| article | [开发日志 2：八方向敌人与 2D+3D](https://store.steampowered.com/news/app/2272250/view/3740859408912773681) | 开发者对 8 方位 sprite 与首代差别的说明 | `source-page-verified` |
| article | [开发日志 3：场景/材质/氛围](https://store.steampowered.com/news/posts/?enddate=1697461329&feed=steam_community_announcements) | 场景贴图/着色/装饰物与灯光 | `source-page-verified` |
| article | [开发日志 4：教堂模型制作](https://store.steampowered.com/news/app/2272250/view/3775765476432166473) | 灰盒、教堂构图到正式贴图 | `source-page-verified` |
| article | [开发日志 7：命中与死亡反馈](https://store.steampowered.com/news/posts/?enddate=1704991355&feed=steam_community_announcements) | 打击、破碎、命中反馈 | `source-page-verified` |
| image | [教堂灰盒原始 PNG](https://clan.fastly.steamstatic.com/images/43916633/13c816d7ef808e05c990e051d5558856b780a933.png) | 同场景 before 参考；对照正式场景 | `previously-collected-not-reprobed` |
| image | [教堂完成图原始 PNG](https://clan.fastly.steamstatic.com/images/43916633/08a83ade378ad7d6c4d3203d43e7682277155afb.png) | 同场景 after、材质/光比 | `previously-collected-not-reprobed` |
| image | [八方向人物对照 PNG](https://clan.fastly.steamstatic.com/images/43916633/aa6e72de41ea162de8a0747acc8e48882f5ff1e8.png) | 方向切换参考 | `previously-collected-not-reprobed` |
| image | [温暖教堂实机截图](https://cdn.cloudflare.steamstatic.com/steam/apps/2272250/ss_1330f61dda7e7b9105f16d7986782e1eb5752d07.1920x1080.jpg?t=1712342923) | 暖色逆光和高纵深空间 | `image-search-verified` |
| image | [潮湿夜巷实机截图](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2272250/ss_1c3efec2d2f47c8a1dac5b7ba7bedb5fe3dc0744.1920x1080.jpg?t=1721056082) | 青色窗光+湿地反射 | `image-search-verified` |
| image | [植物园实机截图](https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2272250/ss_57250e83ca7c9e3bd7b091349df92612385b9ab4.1920x1080.jpg?t=1731401324) | 装饰栏杆、枝叶遮挡、色彩调度 | `image-search-verified` |
| gif | [敌人八方向旋转 GIF](https://clan.fastly.steamstatic.com/images/43916633/d6bb3f6ff3695cfdbb7aeb1c0f92d0ae9757ab5a.gif) | 每45度切换；gif URL 已记录，不代表已下载或逐帧测量 | `gif-url-present-frames-not-measured` |
| gif | [场景材质制作 GIF](https://clan.fastly.steamstatic.com/images/43916633/247e746c576a13b9aa215a0ad79a2d00e1baf314.gif) | 逐层添加材质对照 | `gif-url-present-frames-not-measured` |
| gif | [漫画描边效果 GIF](https://clan.fastly.steamstatic.com/images/43916633/b3e024a68e85a6344ed21d2544b5a9ab0a89b64d.gif) | 深度/法线边缘效果 | `gif-url-present-frames-not-measured` |
| gif | [场景物体交互 GIF](https://clan.fastly.steamstatic.com/images/43916633/9dc81476db595ac87bd28d7a8189b795348cd315.gif) | 反应细节与舞台物理感 | `gif-url-present-frames-not-measured` |
| gif | [死亡与破碎 GIF](https://clan.fastly.steamstatic.com/images/43916633/168ddf79a362fac1b9c9197e5b3822f2d9deca46.gif) | 死亡节奏与分层碎片 | `gif-url-present-frames-not-measured` |
| gif | [命中喷溅 GIF](https://clan.fastly.steamstatic.com/images/43916633/1e353b60cbdba2ad13f8d42e2d51ea0aff3d0dc2.gif) | 屏幕内叠加/打击瞬间 | `gif-url-present-frames-not-measured` |
| video | [教堂完整游戏录制](https://www.youtube.com/watch?v=tU6_MWgpAAE) | 第一人称运动/室内打光 | `video-page-verified` |
| video | [全流程 4K 视频](https://www.youtube.com/watch?v=0tAab42MADw) | 机位移动/时间先后/整局演出 | `previously-collected-not-reprobed` |

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
