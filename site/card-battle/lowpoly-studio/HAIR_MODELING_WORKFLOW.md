# V46 低多边形实体头发建模规范

状态：Bob 01 V1/V2 未通过外观验收；此文档为学习与后续建模规范，不代表新版已完成。

## 专业资料（已阅读网页中的头发建模章节）
- UCBUGG Polygon Hair Modeling: https://www.ucbugg.com/labs/modeling/polygon-hair-modeling — 后发/侧发使用贴头皮导向曲线及 Sweep Mesh；前发亦可用贴合额头的平面分割、内嵌棱线和实体挤出；短发后部可使用较大连续面，底层发帽仅用于填补缝隙。
- Ascalon Flat Modeling Anime/Toon Hair: https://blenderartists.org/t/flat-modeling-anime-toon-hair/1204349 ; https://www.youtube.com/watch?v=lo_FxdSe_F8 — 平面建模后用曲线和变形贴头、发尖拓扑和 UV 连接。视频页面与作者说明已查阅，未逐帧观看视频。
- CoderNunk hair chapter: https://codernunk.com/tutorials/complete-3d-character-guide/#modeling-the-hair — 低分辨率曲线截面，内侧较平、外侧凸起，分层制作刘海/主发，保留曲线源文件后转网格并优化。
- CG Cookie: https://cgcookie.mavenseed.com/posts/how-to-model-hair-in-blender — 先大体积、再中小发束；曲线宽度和扭转，转换网格后精修；从各角度检查。
- Blender 官方曲线几何: https://docs.blender.org/manual/en/5.1/modeling/curves/properties/geometry.html — 自定义 bevel 截面、低分辨率、端部闭合。
- Maya 官方 Sweep Mesh: https://help.autodesk.com/cloudhelp/2026/ENU/Maya-Modeling/files/GUID-515863CF-D31E-4D70-ADAB-0E36F342EB37.htm — 独立控制截面宽度、角度、扭转、收缩曲线、沿路径的分段密度。
- Polycount 从业者讨论: https://polycount.com/discussion/158947/faster-ways-to-polygon-model-anime-hair-in-maya-modo-or-zbrush — 前部及侧部独特发束、后部复用并调整轮廓，最后手工整理。

## 实施规范
1. 冻结 body_v46 的网格、耳朵、面部 UV/贴图和基础渲染参数。禁止改素体迎合头发。
2. 用已确认头部三视图与发型参考建立前/侧/后/顶的根部、流向、体积、发梢位置。先拟合低面数底层体积，仅用来防止露头皮，不当最终头发。
3. 先单独制作中心刘海测试件：根部到尖端的三维导向点；截面使用低边数扁宽棱形或带脊的多边形，内面贴头、外面鼓起；每站独立宽度、厚度、朝向。沿路径挤出四边形纵向面，尖端保留极小非退化四边形封口或使用四边形收束拓扑。禁止全头纬圈+锯齿代替发束。单束检查正侧背及线框后再扩展。
4. 刘海独立中心束与镜像侧束，宽窄及走势分主次；侧发顺头骨向下，末端内扣；后发少量宽大连续体积配合纵向折面，避免等间距锯齿和同质重复。必要时使用贴合面挤厚法而非一律扫掠。
5. 保留可编辑每束导向、截面、分组和网格生成代码。局部控制截面扭转，防止翻转；根部覆盖自然，层间接触与有意隐藏重叠应区分于可见穿模。若需整体无交叠则执行局部拓扑合并重建，不把所有发束强行压入球壳。
6. 保持左右镜像与源四边形要求。检查退化面、法线、非流形、重复面、自交、身体及耳朵的双向穿插，区分渲染时三角化与源拓扑。
7. 每阶段输出同视角、同光源的原始头部对照/参考图/真实网格渲染，另有单束和全发型线框、顶视/四分之三视角。截图不通过不宣称完成。先审单束与发型轮廓再全头组合。

Bob 01 不以顶点数或碰撞计数替代视觉验收。V1/V2 保留为失败对照，不覆盖原始 V46。

## 2026-11-24 用户纠正：Esukevi / えすけび 是核心美术参考
作者身份来自现有 lowpoly-studio/index.html 的既定参考登记，不是新选的普通动漫作者。作者主页 https://x.com/esukevi/media ；原作者介绍的转载索引 https://twiman.net/user/3976248253/illust 。
重点参考（Tenor 第三方转载，非作者发布原文件）：
- 爱丽速子 10.2 秒 https://tenor.com/view/agnes-tachyon-umamusume-esukevi-agnes-tachyon-gif-10846683350037499610
- 曼城茶座双人近景 2.2 秒 https://tenor.com/view/esukevi-umamusume-manhattan-cafe-agnes-tachyon-umamusume-pretty-derby-esukevi-gif-14152756986251812271
- 舞蹈 11.2 秒 https://tenor.com/view/esukevi-umamusume-uma-musume-agnes-tachyon-gif-2139452339290722119
- 双人演出 9.6 秒 https://tenor.com/en-GB/view/esukevi-uma-musume-uma-musume-umamusume-gif-12940021271253575468
目前已核对参考页面和时长，但本次未成功下载/解码 GIF，也未找到作者公开的头发网格、线框或制作教程。不得声称已测量作者发束拓扑、面数或逐帧学习完成。
技术佐证：C&R 的低模制作原则 https://3d.crdg.jp/tech/archives/844 ：先在轮廓峰值设顶点，然后按需求增加边；くろさわ https://note.com/thesaurus/n/nf3af49670ce8 ：非平面四边形的渲染对角线会改变凸凹，低模特别明显。二者不是 Esukevi 作者自身教程。
项目实施优先级：原作实际帧轮廓 > 用户批准 V46 头骨与波波头设计 > 通用教程。取消以大量独立扫掠发束为必然正确方法的假设；采用极少数主发块、关键轮廓顶点和局部折面，先构建低面数实体，再根据参考逐点增删。四边形、镜像、头部冻结继续执行，不将作者真实拓扑与我们的推断混淆。对比图应统一角度、尺度、五官与光照；不得使用 AI 替代原始参考帧。

## 多层板ポリ方案（用户明确确认，替代闭合实体发束优先规则）
C&R 角色班原文第3节 https://3d.crdg.jp/tech/archives/844 ：先在正交方向用板ポリ决定剪影；流向成立后按需复制背面，局部顶点沿法线移动得到厚度，减少不影响剪影的背面点。后脑边线沿发流布置。ポリゴログ https://polygolog.com/hair-modeling/ 展示侧发沿法线外移，后发贴合头曲面并以小片补缝。该教程的厚度和细分不是本项目必需，不能冒称 Esukevi 的原版做法。此次重新检索原作 GIF（Tenor 10846683350037499610 / 14152756986251812271），网页已读但媒体下载失败，未解码真实帧，确切层数和源拓扑未知。
V46 波波头建议四组而非四个完整壳：底层贴头皮覆盖发根区域；后发约五个宽片；左右各两片侧发；中心一片加镜像两对刘海。片数是试制预算，不是作者数据。每片先做2列或3列控制点、3至5个纵向站点（四边形网格，按关键轮廓减增），通过折线及宽度变化形成剪影，允许开放边界；发梢保留微小边而非退化四边形。可双面渲染，避免复制共面网格；确实需要厚度才增加背面。先冻结发际线和头皮实际三角化表面，用三角网格最近点/有符号距离约束每片；间距初值取头宽的0.5–1.5%并局部调整，不采用固定全球半径；耳朵独立纳入碰撞。与相邻片沿根到梢各检查站建立内外顺序，重叠投影允许而实际几何相交默认禁止；共享缝边可明确白名单，其他非相邻面做三角-三角相交及最近距离检查，排除共面重叠与深度闪烁。头部绑定时所有发片跟随同一骨骼；独立发梢摆动需逐帧/连续碰撞复核，不能以静态检测冒称动画通过。输出各层单独、逐层叠加、线框、正侧背顶和45度视图；中性光照及目标像素尺寸观察。V1/V2保留失败对照。

## 2026-11-24 重新学习：Cards01 与 Front02 视觉未通过
保留 V46、已经通过用户初步认可的独立呆毛，不覆盖旧资产。停止盲目增加面数或仅凭零交叉统计验收。Cards01 的透明 UV/贴图替换机制可保留，当前网格轮廓、发际线、鬓发和材质不合格。
- https://booth.pm/ja/items/7927214 日本作者 @.saboruna 的模块化低模头发案例：波波头前发19三角面、后发100三角面，短发前30后52；256x256贴图，提供FBX及PSD（含UV）。已看产品展示图和规格，未购入/解析源文件；风格不是 Esukevi 的精确复刻。说明模块化前后发及低面数可行，具体拓扑待实际文件核验。
- https://area.autodesk.jp/column/tutorial/maya-lowpoly/02-setting-start-modeling/ 高部的专业游戏低模系列：从头部抽取平面作为髪的起点，适当扩大轮廓；视频②0:00–33:33为头发制作，网页文字已读，视频未逐帧检查；教程模型可注册后免费下载，未下载。
- https://area.autodesk.jp/column/tutorial/maya-lowpoly/03-complete-modeling/ 视频41:13–48:08为头发UV；矩形UV可能严重扭曲，应按实际艺术要求决定。贴图细节与大面积留白需有主次。
- https://lurgee.xii.jp/?p=11132 手绘板ポリ髪贴图实例：宽笔底色、修尖梢、分层提亮、整体阴影，最后处理透明材质；不是周期性条纹。
- https://cgworld.jp/article/310-lowpolychara1.html 256FES制作特辑 STEP04/06/07：极低面数通过轮廓控制、旋转检查、隐藏面削减；该案例头发用球体基础，不应声称是纯发片方案。
- https://3d.crdg.jp/tech/archives/844 第3节：从板ポリ确定正侧轮廓，发流沿边线布置，厚度按实际可见需要决定。
下次必须先获得可检视的合法样例/原始线框和UV，先研究原模型再拟合V46；不把贴图透明裁切误当作可以弥补任意三维轮廓。区域模板需要按头部表面、前额遮挡、鬓角遮挡和头顶接缝做设计，测试正、侧、背、45度及顶视；仅隐藏重叠可以存在，不允许可见穿插、漏头皮与闪烁。Esukevi真实网格仍未取得，不能声称已掌握其确切技术。

## 原书公开样页及 CGWORLD 专题复核（2026-11-24）
- 出版社 https://www.borndigital.co.jp/book/9784862466587/ ：448页；配套ZIP约4.2GB，密码在书前言p.X；配套数据限制再分发，不上传GitHub。未获取书籍全文或源模型。
- 实际打开并查看原书样页：https://media.borndigital.co.jp/app/uploads/2026/01/9784862466587.IN04.png （pp22–23，整身预算70000多边形，头发与耳朵15000；不可作为极低模面数目标）；https://media.borndigital.co.jp/app/uploads/2026/01/9784862466587.IN14.png （pp224–225，头发UV着色，AO与渐变底色后手绘阴影，统一假定光源，利用阴影表现几何不存在的凹凸）；https://media.borndigital.co.jp/app/uploads/2026/01/9784862466587.IN16.png （pp332–333，底色、描边、影、光泽、其他表现及整体调整）；https://media.borndigital.co.jp/app/uploads/2026/01/9784862466587.IN02.png （pp6–7 设计先行）。
- https://cgworld.jp/article/310-lowpolychara1.html 已读STEP01–11及15；原始封面含设计、线框、纹理/权重和成品 https://cgworld.jp/article/assets_c/2024/06/main_lpc-thumb-1920x1080-55544.png 。STEP04明确使用球体基础塑造头发与马尾，不是纯纸片；STEP06在旋转视角下合并不影响轮廓的静态顶点；STEP07独立部件嵌入并删不可见面；STEP08透明贴图用于配饰，不能推断为该作者全部头发；STEP09棋盘格校验UV方向与密度；STEP10在3D模型标记位置底色，STEP11在外部绘画软件反复更新贴图。正文步骤图未能提取，不冒称逐图检查。
- 同一书作者高部的公开教程 https://area.autodesk.jp/column/tutorial/maya-lowpoly-season-2/02-modeling/ ：正交对照+目标游戏画角对照；单色形状检查、按需硬边、四边形及边流、按发束/背面暂时UV分岛，剖面检查；先保证几何形状与设计契合，再在材质状态反复调整。视频未逐帧观看。
- 项目下一步重点：不继续旧头盔网格；前发、鬓发、后发、附件以独立区域试验，先检查各视角轮廓与遮盖，再以UV棋盘格检查变形，直接在实际3D投影定位绘画，使用有方向的手绘阴影、高光和透明轮廓，避免重复条纹。参考图片仅保留链接，不复制书籍配套数据。V46和已认可呆毛不变。
