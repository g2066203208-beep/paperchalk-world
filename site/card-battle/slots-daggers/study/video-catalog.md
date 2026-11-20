# 《Slots & Daggers》录像与效果时码

金币比较从安奎拉13的通关录像看起。38:53.8 左盘还有空隙，随后约一秒半内，中上部几枚钱币持续下移，在已经堆起的币之间改向。07:51.6 同一台机器里，满盘硬币会互相盖住，亮面和暗边一同移动。对照官方预告的刀光和爆闪时，留意预告加了剪点、文字和镜头推近。[通关 38:53](https://www.bilibili.com/video/BV1Xy411H7bs/?t=2333) · [同片 07:51](https://www.bilibili.com/video/BV1Xy411H7bs/?t=471) · [PS 商店视频 27 秒](https://vulcan.dl.playstation.net/img/rnd/202604/2816/44090d8c0508d1b480d9ef1d82d4c5b1040ec14eb2455d27.mp4#t=27)

## 开发者发布的分项演示

另取得 Friedemann 本人公开的 27 条视频贴，逐条核对公开记录的文件哈希及视频轨，共 26 份不同文件。按文件去重后共有 9,183 帧、306.10 秒，全部为 30 帧/秒，带声音。下列时码来自动画解码后的画面；同一事件的再次上传、重剪和素材版本差异均单独标明。

这些作者公开视频也可在支持 HLS 的播放器直接观看。 [出币](https://video.bsky.app/watch/did%3Aplc%3A5yls54g4apr2jw2errohsc7k/bafkreie2hqwdkl36kx7ypjukrelp7i7tk523g4uciohicosrgoy3johhne/playlist.m3u8) · [翻币材质](https://video.bsky.app/watch/did%3Aplc%3A5yls54g4apr2jw2errohsc7k/bafkreihx3olv4pcpxusb2mtsoeebocqjonknek4ha7bvyjdhfcnxtlssfy/playlist.m3u8) · [桌震与酒杯](https://video.bsky.app/watch/did%3Aplc%3A5yls54g4apr2jw2errohsc7k/bafkreig53rqwddzqcbs4gtvkn5d7yt22g7rscmrdgtwtwooqwwzvq3qwoq/playlist.m3u8) · [商店开合](https://video.bsky.app/watch/did%3Aplc%3A5yls54g4apr2jw2errohsc7k/bafkreidwdw2osjenbex37iy3b5nw3f3qxkalhp3dpm7gcimrhv3xmjzke4/playlist.m3u8) · [施法暴击](https://video.bsky.app/watch/did%3Aplc%3A5yls54g4apr2jw2errohsc7k/bafkreigz7rw5uhbj4wq5b47vqro5pcrupywzszxdo5c4t6qtsdexdwj24e/playlist.m3u8)

原作者公布了币的材质设置。币面使用低复杂度模型和像素纹理，Unity 的金属材质调整光滑度、金属度，再由后处理叠加强 Bloom 和大范围散射。作者贴出的 Inspector 显示 Smoothness 0.6、Metallic 0.2、TextureColorAmount 1，基色为淡金 HDR，投射与接收阴影均开启，Emission 栏为黑色。上述数字是这个开发版本的材质参数，不能直接换算成另一种渲染器中的曝光量。 [作者说明](https://bsky.app/profile/friedemanna.bsky.social/post/3lwgrgjipwf2e) · [作者回复](https://bsky.app/profile/friedemanna.bsky.social/post/3lwgrgkq4th2p) · [原始材质截图](https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:5yls54g4apr2jw2errohsc7k/bafkreibgcwo7sw2wd2ymr2ycwk23vnyy4fvwxjf5e73bgwof3dvlxevqsa) · [开发期出币报道](https://80.lv/articles/check-out-coin-animation-sound-effect-in-this-slot-fantasy-game)

| 开发者视频 | 视频轨时长 | 可定位的画面 |
| --- | --- | --- |
| [托盘出币（开发版）](https://bsky.app/profile/friedemanna.bsky.social/post/3lweh7kjrwc2z) | 9.33 秒 | 0 秒左盘几乎全空，约 2.33 秒数枚亮币掠过中心，4.67 秒可见一片分散的钱币，尾部淡到黑。 |
| [同段出币的再次发布](https://bsky.app/profile/friedemanna.bsky.social/post/3lxhyjwzuqg2e) | 9.33 秒 | 与上条视频的完整文件 SHA-256 相同，两次发布计同一段素材。 |
| [币的实体和材质特写](https://bsky.app/profile/friedemanna.bsky.social/post/3lwgrgjipwf2e) | 9.07 秒 | 0–8.87 秒固定机位，两枚币在空中翻面，币边变窄，桌上的投影也随朝向变化。 |
| [币材质的另一次发布](https://bsky.app/profile/friedemanna.bsky.social/post/3lwqy3djasz2j) | 9.07 秒 | 0–8.67 秒仍为同一构图中两枚转动的币，归入同一类材质镜头；两段的音轨峰时刻一致。 |
| [玻璃杯、桌震与骰子](https://bsky.app/profile/friedemanna.bsky.social/post/3lwtj4n375h2b) | 9.03 秒 | 0 秒起观察机壳与玻璃边缘；4.33 秒三枚骰子和计数可见，6.67 秒台面又进入选择状态。 |
| [桌角骰子反馈](https://bsky.app/profile/friedemanna.bsky.social/post/3lwbgybrlzx2g) | 13.57 秒 | 3.33 秒局部放大，6.67 秒可见右侧杯子和刀光。片上含作者演示文字。 |
| [骰子小游戏](https://bsky.app/profile/friedemanna.bsky.social/post/3lwc2i5ipp42r) | 14.77 秒 | 0–7.33 秒机台远景中多颗骰子由滚动进入结算。10.67 秒已切宣传片尾。 |
| [升级商店](https://bsky.app/profile/friedemanna.bsky.social/post/3lyi5z6ltyr2i) | 6.67 秒 | 0 秒柜面，1.67 秒弹出有亮框的实体面板，3.33–4.67 秒亮框与按钮仍立于面板上，6.33 秒机壳重新露出。 |
| [实体修饰器菜单](https://bsky.app/profile/friedemanna.bsky.social/post/3lxfe3gsu352o) | 10.17 秒 | 0 秒标题，2.67–7.33 秒菜单展开、不同板件亮起，到 10.00 秒回到标题。 |
| [早期结束画面](https://bsky.app/profile/friedemanna.bsky.social/post/3lw7iznmx3o2l) | 5.90 秒 | 1.33 秒红字进入内屏，2.67 秒画面压暗，4.33 秒物品格出现在下方。 |
| [后期结束和菜单](https://bsky.app/profile/friedemanna.bsky.social/post/3lxkkqywqym2l) | 11.27 秒 | 0 秒战斗，2.67 秒结算内屏，5.33 秒切到实体修饰器，11.00 秒按钮发亮。 |
| [处决与毒攻](https://bsky.app/profile/friedemanna.bsky.social/post/3lxwwv5vp4j2g) | 6.77 秒 | 1.67、3.33 秒亮框位置不同，4.67 秒内屏边灯和效果叠加。 |
| [施法判定](https://bsky.app/profile/friedemanna.bsky.social/post/3m2w5a75sxb2b) | 11.27 秒 | 0 秒暖色敌人，2.67 秒方形判定板与亮框同时可见，8.00 秒边缘灯亮起。 |
| [施法暴击近景](https://bsky.app/profile/friedemanna.bsky.social/post/3m36bq57agh2t) | 8.00 秒 | 2.00 秒左侧法术板被金黄特效照亮，4.00 秒形状消退，5.67 秒左下重新露出钱数。 |
| [竞技场计分](https://bsky.app/profile/friedemanna.bsky.social/post/3m2qwzmo3zb2q) | 10.50 秒 | 0–10.33 秒观察数字显示和暖色竞技场边缘，敌影始终位于内屏。 |
| [发行后玩法更新](https://bsky.app/profile/friedemanna.bsky.social/post/3m4kut2hobl2m) | 15.10 秒 | 前半橙色战场，7.33 秒斜向亮线延伸到机壳右边，11 秒转为冷青色。 |
| [敌人从草图到游戏](https://bsky.app/profile/friedemanna.bsky.social/post/3lvb7jh3pes2j) | 24.90 秒 | 约 6 秒可见一排纸上草图，12.33 秒进入机台内的冷场敌人，18.67 秒可看停轮；作者说明有些初稿直接成为最终轮廓。 |
| [两天原型和四个月版本](https://bsky.app/profile/friedemanna.bsky.social/post/3lv6oxcxbrk2f) | 14.00 秒 | 0–13.67 秒上下两种版本同屏，原型面板与最终装饰、灯光的差异可直接比较。 |
| [多种敌影和场地](https://bsky.app/profile/friedemanna.bsky.social/post/3lxuk5ce3fa2g) | 11.47 秒 | 0 秒绿色地景，5.33 秒赤橙洞窟，8.33 秒绿色亮翅，11 秒蓝色冷场。 |
| [Eggo](https://bsky.app/profile/friedemanna.bsky.social/post/3lvdsku44qk2w) | 10.07 秒 | 0、4.67、7.33 秒可对照同一敌人的体态、留白及转轮遮挡。 |
| [Vicar Longlegs](https://bsky.app/profile/friedemanna.bsky.social/post/3lv4faj7ypk2n) | 14.47 秒 | 0–7 秒四肢剪影与暖光洞窟，后段切片尾。 |
| [火焰恐龙](https://bsky.app/profile/friedemanna.bsky.social/post/3lvxpdhdpf42s) | 14.30 秒 | 0–7 秒同一红橙竞技场中的敌影、亮框；后段切片尾。 |
| [Deathtrout](https://bsky.app/profile/friedemanna.bsky.social/post/3lvge3vco2k2w) | 10.97 秒 | 0–10.67 秒绿光内屏，鱼形轮廓与下方轮格。 |
| [The Cleaver](https://bsky.app/profile/friedemanna.bsky.social/post/3lvkmliicak2c) | 10.97 秒 | 0–10.67 秒冷青色场地，2.67 秒文字和亮框覆盖下方。 |
| [Ike](https://bsky.app/profile/friedemanna.bsky.social/post/3lvoiomea2y2w) | 16.37 秒 | 0–8 秒洞窟内高大剪影，12 秒已进入结算界面。 |
| [Mud Fairy](https://bsky.app/profile/friedemanna.bsky.social/post/3lw4isq4nmq2s) | 18.70 秒 | 0–9.33 秒林地亮绿飞行剪影与深色树木，随后进入片尾。 |
| [发行后庆祝片](https://bsky.app/profile/friedemanna.bsky.social/post/3m4sj6wrzqp2u) | 9.43 秒 | 约 2.33 秒下方出现爱心选项，4.67–6.67 秒暖场停轮，作为发行后画面补充。 |

Jonas Tyroller 与 Friedemann 的 1:49:51 访谈给出了按话题跳转的章节。游戏原型、灯光、桌面物体和不同场景色调都由作者本人讨论；章节的播放器缩略图也抽样核过，画面在访谈人像与游戏之间切换。 [49:55 原型与手绘像素](https://www.youtube.com/watch?v=d0jJmaLDtbA&t=2995s) · [52:24 Unity 灯光与 Bloom](https://www.youtube.com/watch?v=d0jJmaLDtbA&t=3144s) · [55:28 动画](https://www.youtube.com/watch?v=d0jJmaLDtbA&t=3328s) · [1:02:36 音效与震动](https://www.youtube.com/watch?v=d0jJmaLDtbA&t=3756s) · [1:08:06 枝叶、酒杯](https://www.youtube.com/watch?v=d0jJmaLDtbA&t=4086s) · [1:10:27 桌面感](https://www.youtube.com/watch?v=d0jJmaLDtbA&t=4227s) · [1:15:25 换色与后处理](https://www.youtube.com/watch?v=d0jJmaLDtbA&t=4525s)

## 四条独立实况的连续画面

已读取四名上传者的完整公开 H.264 视频轨。播放器标称时长合计 2 小时 06 分 56 秒。四轨共解码了 1,529 张关键帧以查找场景变化，再从 32 个时间窗解码连续帧，共 319.96 秒。这批时间窗不含音轨。表中的毫秒属于视频时间戳，普通画面里能分辨的最小间隔由各行帧率决定。

| 录像与来源 | 整轨及采样 | 从这些时码观察 |
| --- | --- | --- |
| Lurk名彻 · Steam Demo · [19:44](https://www.bilibili.com/video/BV1GQnGzfEWH/) | 852 × 480，30 帧/秒，8 段 | [00:10](https://www.bilibili.com/video/BV1GQnGzfEWH/?t=10) 标题过渡到暖黄色内屏，机壳始终可见。[04:00](https://www.bilibili.com/video/BV1GQnGzfEWH/?t=240) 桌角骰子特写切回转轮。[07:50](https://www.bilibili.com/video/BV1GQnGzfEWH/?t=470) 停轮亮框、左盘单币经过疏松币堆。[11:40](https://www.bilibili.com/video/BV1GQnGzfEWH/?t=700) 从选择面板切换到冷青色战场。[15:30](https://www.bilibili.com/video/BV1GQnGzfEWH/?t=930) 同一冷光下比较转动、停轮和按钮。 |
| 安奎拉13 · 通关 · [42:38](https://www.bilibili.com/video/BV1Xy411H7bs/) | 824 × 480，25 帧/秒，8 段，含桌面窗口边框 | [03:35](https://www.bilibili.com/video/BV1Xy411H7bs/?t=215) 暖色战场过渡到购买/选择界面。[07:50](https://www.bilibili.com/video/BV1Xy411H7bs/?t=470) 五转轮与高币量。[11:55](https://www.bilibili.com/video/BV1Xy411H7bs/?t=715) 青色战场、左盘高光随币运动。[18:15](https://www.bilibili.com/video/BV1Xy411H7bs/?t=1095) 赤红战场。[25:55](https://www.bilibili.com/video/BV1Xy411H7bs/?t=1555) 暖色洞窟及远近亮度。[33:10](https://www.bilibili.com/video/BV1Xy411H7bs/?t=1990) 林地交叉发光。[38:53](https://www.bilibili.com/video/BV1Xy411H7bs/?t=2333) 赤色战场保持时左盘下落、堆积。 |
| 主机游戏速报 · 中文试玩 · [26:56](https://www.bilibili.com/video/BV1Q3sUziExr/) | 852 × 480，30 帧/秒，8 段 | [02:15](https://www.bilibili.com/video/BV1Q3sUziExr/?t=135) 暖色高亮过后，选择框及物品说明出现。[04:55](https://www.bilibili.com/video/BV1Q3sUziExr/?t=295) 修饰器面板与机台切换。[07:31](https://www.bilibili.com/video/BV1Q3sUziExr/?t=451) 暖场敌影与剪影退场后的画面。[11:31](https://www.bilibili.com/video/BV1Q3sUziExr/?t=691) 巨蛇。[16:20](https://www.bilibili.com/video/BV1Q3sUziExr/?t=980) 青色战场敌人姿态、停轮亮框。[24:25](https://www.bilibili.com/video/BV1Q3sUziExr/?t=1465) 购买菜单里也能看到左侧硬币。 |
| 牛蛙呱呱_ · 转盘与 QTE · [37:38](https://www.bilibili.com/video/BV1HBUxBAE4T/) | 852 × 480，30 帧/秒，8 段 | [03:10](https://www.bilibili.com/video/BV1HBUxBAE4T/?t=190) 暖场敌人后方点亮，约 03:16 斜向强光经过内屏。[06:55](https://www.bilibili.com/video/BV1HBUxBAE4T/?t=415) 右侧仪表旁的斜亮线。[10:30](https://www.bilibili.com/video/BV1HBUxBAE4T/?t=630) 符号逐格亮起、复位。[22:54](https://www.bilibili.com/video/BV1HBUxBAE4T/?t=1374) 选择画面进冷青战场。[29:20](https://www.bilibili.com/video/BV1HBUxBAE4T/?t=1760) 瘦高敌人姿态。[34:10](https://www.bilibili.com/video/BV1HBUxBAE4T/?t=2050) 冷场舞台四边灯点与闪光。 |

按原片时间，四组连续取样的起点如下，每段约 10 秒。不同作者的录制窗口、缩放与压缩各异。对照光效时可用固定机壳作尺度，对照运动速度时应看同一来源相邻帧。

| 录像 | 八个起点，单位为秒 |
| --- | --- |
| Demo | 10.00、50.00、120.00、240.00、470.00、700.00、930.00、1100.00 |
| 通关 | 60.00、215.00、470.24、715.24、1095.16、1555.92、1990.92、2325.92 |
| 中文试玩 | 40.00、135.00、295.00、451.964、691.964、980.297、1257.597、1465.53 |
| 转盘与 QTE | 55.00、190.00、414.990、629.980、969.961、1374.951、1759.932、2049.923 |

## 官方视频与循环动图

| 画面 | 已核规格与适用片段 | 播放 |
| --- | --- | --- |
| Steam 商店发行预告 | 视频轨 69.833 秒，1280 × 720、60 帧/秒。用于对比暖色战斗、刀光与左侧出币时序。 | [商店](https://store.steampowered.com/app/3631290/Slots__Daggers/) · [开发者视频](https://www.youtube.com/watch?v=3ji0GyAcoMw) · [店内 HLS](https://video.fastly.steamstatic.com/store_trailers/3631290/137468819/96a15bbc1e8eaddc6eef6ef203243559fdb4d14c/1761230493/hls_264_master.m3u8) |
| Steam 首次公开预告 | 视频轨 65.017 秒，1280 × 720、60 帧/秒。较早的镜头和版本，比较机台剪影、房间明暗、转轮表面反光。 | [开发者视频](https://www.youtube.com/watch?v=1c-5tsSO6_s) · [店内 HLS](https://video.fastly.steamstatic.com/store_trailers/3631290/1491345768/dd186da5b153de9d99f0e364833621a060461050/1753299465/hls_264_master.m3u8) |
| Steam 商品介绍里的自动循环 | 11.583 秒，1170 × 658、60 帧/秒，循环可逐帧。网页同时提供两种编码，二者共用一段动画。 | [WebM 动图](https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/3631290/extras/16b15c50d1dd18f607f74c03d30972d8.webm) · [MP4 动图](https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/3631290/extras/16b15c50d1dd18f607f74c03d30972d8.mp4) |
| PlayStation 商店主机预告 | 1920 × 1080、60 帧/秒，3,601 帧，视频轨 60.017 秒。00:00 冷青开场，00:08 红色转轮，00:12 金光，00:16 暖色暴击，00:20 升级画面，00:28 暴击字，00:32 橙色内屏与堆币，00:36 结束面板，00:40 修饰器，00:52 林地，00:55 爆发后转片尾。主机剪辑和两支 Steam 预告的时长、排序均有差异，部分场面反复使用。 | [原始 MP4](https://vulcan.dl.playstation.net/img/rnd/202604/2816/44090d8c0508d1b480d9ef1d82d4c5b1040ec14eb2455d27.mp4) · [PlayStation 商店](https://store.playstation.com/en-us/concept/10018077/) · [开发者主机上市片](https://www.youtube.com/watch?v=Cv-GKTOsgaU) |
| iPhone 商店预览 | 720 × 332、30 帧/秒，897 帧，29.900 秒。00:00 装备，00:04 区域切换，00:06–00:10 暖场敌人和逐格亮框，00:12–00:14 选择，00:16 冷场，00:18 暖场剪影，00:20 绿场施法，00:23 修饰器，00:25 林地，00:27 标题。 | [App Store](https://apps.apple.com/us/app/slots-daggers/id6762803589) · [iPhone 原始 HLS](https://apptrailers.itunes.apple.com/itunes-assets/PurpleVideo211/v4/55/6a/43/556a4390-43c2-1a5d-4462-cb037987e67f/P1448524471_default.m3u8) |
| iPad 商店预览 | 960 × 720、30 帧/秒，898 帧，29.933 秒。与 iPhone 为同一组镜头，构图不同。上下余量、机壳及桌沿是应比较的部分。 | [iPad 商店](https://apps.apple.com/us/app/slots-daggers/id6762803589?platform=ipad) · [iPad 原始 HLS](https://apptrailers.itunes.apple.com/itunes-assets/PurpleVideo221/v4/3e/4e/0b/3e4e0be4-a146-88f4-fee6-832eb8ae35d6/P1448709504_default.m3u8) |

开发者另外公开了 [PC 确定发售日预告，1:11](https://www.youtube.com/watch?v=Jzvvhfs0VYY)、[主机日期预告，1:00](https://www.youtube.com/watch?v=FhI7Oalv2fo)、[手机平台公布短片，0:10](https://www.youtube.com/watch?v=HVzyXazv7lA) 和 [移动上市预告，1:00](https://www.youtube.com/watch?v=gCFQiFS9ikA)。移动上市预告也由移植方与发行方列出。这些宣传条目包含重新剪辑的画面。手机公布短片的时间线分辨率只有 48 × 27，适合核实内容，达不到材质取样精度。[移植方 Ateo](https://slotsanddaggers.ateo.ch/) · [发行新闻](https://www.gamespress.com/Slots-Daggers-out-now-on-mobile-Slot-machine-roguelite-hit)

## 其他实机与长视频

下表各用 16 张播放器公开时间线缩略图核对内容。缩略图通常间隔 5 或 10 秒，可定位镜头和配色。快速刀光、震动及硬币入射速度用上面的连续片段测量。

| 来源 | 时长 | 已核画面或创作者标记 |
| --- | --- | --- |
| fgw，无解说 PC 全流程 | 2:26:25 | 作者标注 11 次开局，第 11 次通关。可比较数次重开时的开场状态，以及首次成功局与片尾。[首次 00:00](https://www.youtube.com/watch?v=oo73Xs0HcFg&t=0s) · [第 2 次 03:23](https://www.youtube.com/watch?v=oo73Xs0HcFg&t=203s) · [第 8 次 44:28](https://www.youtube.com/watch?v=oo73Xs0HcFg&t=2668s) · [通关局 1:25:49](https://www.youtube.com/watch?v=oo73Xs0HcFg&t=5149s) · [片尾 2:26:05](https://www.youtube.com/watch?v=oo73Xs0HcFg&t=8765s) |
| Video Game Universe，无解说 PC 全流程 | 4:27:52 | 00:35:30 青色冷场，00:52:10 林地绿光，01:25:40 红色舞台，02:16:00 橙红轮廓灯，03:06:10 绿场亮光，03:39:40 洞窟暖逆光。[冷场](https://www.youtube.com/watch?v=QeABzKPVCEw&t=2130s) · [红场](https://www.youtube.com/watch?v=QeABzKPVCEw&t=5140s) · [绿色光效](https://www.youtube.com/watch?v=QeABzKPVCEw&t=11170s) · [暖色洞窟](https://www.youtube.com/watch?v=QeABzKPVCEw&t=13180s) |
| Handheld Players，Switch 1 底座录制 | 24:37 | 作者注明版本 1.0.1，主机输出 1080p，发布视频经过放大。04:40 修饰器，08:30 暖场停轮，19:20 冷场，22:40 灯点闪烁。作者章节 00:13 开始游戏，24:10 设置。[开局](https://www.youtube.com/watch?v=dI-HYP_qusg&t=13s) · [冷场](https://www.youtube.com/watch?v=dI-HYP_qusg&t=1160s) · [设置](https://www.youtube.com/watch?v=dI-HYP_qusg&t=1450s) |
| Adeptless，移动端游玩 | 10:36 | 宽屏机台，03:25 修饰器，04:05 亮框覆盖转轮，06:00 选择按钮，09:20 商店，10:00 明亮斜光横过机壳右侧。影片标题同时列出 Android、iOS，画面无法单独确认录制设备。[03:25](https://www.youtube.com/watch?v=sUf7cIiWId4&t=205s) · [06:00](https://www.youtube.com/watch?v=sUf7cIiWId4&t=360s) · [10:00](https://www.youtube.com/watch?v=sUf7cIiWId4&t=600s) |
| intercalaire，Egg Arena 最终战及后续 | 9:31 | 左盘满币、敌人动作、后期亮框与屏内爆发，片内有倍速标记，适合比较构图和效果层级。[03:40](https://www.youtube.com/watch?v=v0d8WPQcgAc&t=220s) · [05:25](https://www.youtube.com/watch?v=v0d8WPQcgAc&t=325s) · [09:00](https://www.youtube.com/watch?v=v0d8WPQcgAc&t=540s) |
| moons，Egg Arena 高分流程 | 22:10 | 09:50 选择和左盘反光，12:40 屏外右侧金光，16:50 内屏大范围发光。作者提及炸弹、闪电和第 36 关，观察后期密集特效时可与新手局对照。[09:50](https://www.youtube.com/watch?v=rL1PnO3lbWI&t=590s) · [12:40](https://www.youtube.com/watch?v=rL1PnO3lbWI&t=760s) · [16:50](https://www.youtube.com/watch?v=rL1PnO3lbWI&t=1010s) |
| FungalBrainRot，炸弹构筑 | 1:36:17 | 作者标记 1:13:24 开始炸弹局。1:25:00 绿色场地，1:31:00 冷色大面积爆闪。[炸弹局开场](https://www.youtube.com/watch?v=t0sq2c4YOnc&t=4404s) · [1:25:00](https://www.youtube.com/watch?v=t0sq2c4YOnc&t=5100s) · [1:31:00](https://www.youtube.com/watch?v=t0sq2c4YOnc&t=5460s) |
| ID@Xbox 官方直播，两款游戏同场 | 2:22:12 | 节目前段是《Slots & Daggers》。10:00 修饰器，18:50 暖场爆闪，27:40 商店选择，36:40 敌人和转轮，54:20 冷青内屏及外框灯，1:06:00 仍在本作结算页，1:07:00 回到本作标题，1:08:00 已换为第二款游戏。右上角带主播摄像头。[10:00](https://www.youtube.com/watch?v=fEF2QpzBC8A&t=600s) · [18:50](https://www.youtube.com/watch?v=fEF2QpzBC8A&t=1130s) · [54:20](https://www.youtube.com/watch?v=fEF2QpzBC8A&t=3260s) · [1:03:20](https://www.youtube.com/watch?v=fEF2QpzBC8A&t=3800s) |
| dadusek，PS5 Pro 游玩 | 10:54 | 作者标题标明机型。00:45 装备选择，04:10 结算，04:50 修饰器，05:30 返回标题，08:15 停轮亮框。可观察主机玩法 UI 及按钮文字大小。[00:45](https://www.youtube.com/watch?v=3Ga-ewb9bMg&t=45s) · [04:50](https://www.youtube.com/watch?v=3Ga-ewb9bMg&t=290s) · [08:15](https://www.youtube.com/watch?v=3Ga-ewb9bMg&t=495s) |
| GamerGuide，全成就流程 | 2:39:12 | 00:21:10 暖色场景和内屏四周亮点，00:31:00 蛇形敌人，01:30:40 青色场景，01:50:40 赤色场景，02:20:30 绿色场景中的光线交叉。[暖场](https://www.youtube.com/watch?v=KhppmH529yQ&t=1270s) · [赤色](https://www.youtube.com/watch?v=KhppmH529yQ&t=6640s) · [十字光](https://www.youtube.com/watch?v=KhppmH529yQ&t=8430s) |
| rinimt，早期版本第一分区 | 38:10 | 作者注明录制早于一轮平衡调整。00:20 开局装备说明和暖色敌人，17:00 选择及左盘高币量，28:50 修饰器，36:00 结算。[开场](https://www.youtube.com/watch?v=h105sv6PFXg&t=20s) · [17:00](https://www.youtube.com/watch?v=h105sv6PFXg&t=1020s) · [36:00](https://www.youtube.com/watch?v=h105sv6PFXg&t=2160s) |

## 额外来源及限制

另已核对 [ambiguousamphibian VODs，32:15](https://www.youtube.com/watch?v=zgG1NWO705Y) 的页面与时长。关于 Xbox，微软商店可核实平台，TheXboxHub 标明报道采用 Xbox Series 版。ID@Xbox 主播录像另在上表列出，公开说明没有给出录制机器型号。任天堂商店中的系统宣传片亦未计入游戏实录。[Xbox 商店](https://www.xbox.com/en-us/games/store/slots-daggers/9ntz0cvqc5df) · [Xbox Series 评测](https://www.thexboxhub.com/slots-daggers-review/) · [Nintendo 商店](https://www.nintendo.com/us/store/products/slots-and-daggers-switch/)

原游戏素材始终作为观察来源。文中的时间点、取景和运动描述可以重新核对。公开画面可以呈现可见的投影、亮边和遮挡关系，无法据此确认原作模型的拓扑、灯光数量或着色器内部实现。
