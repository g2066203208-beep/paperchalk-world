# Pixel Atelier — 开源学习和专业参考登记 V1.1

记录日：2026-10-31  
目的：学习公开实现与官方设计文档；区分“可阅读源码”“允许复制/再发布”“许可证义务”。未经许可证审查和明确授权，不导入第三方代码、字体、图标、贴图或模型。

## A. 研究项目和可靠资料

| 来源 | 地址 | 可研究范围 | 许可证及使用约束 | 研究结论 |
|---|---|---|---|---|
| Aseprite 官方文档 | https://aseprite.com/docs/ | 选区、Sprite/Cel/Timeline、变形、Tiled Mode、笔画 | 文档提供行为参考；当前 Aseprite 应用源码/发行受其 EULA 约束，不应当作可直接再分发的开源代码 | 选择区布尔逻辑、移动和变换、每帧 duration/Cel、洋葱皮是专业基线 |
| Aseprite 授权 FAQ | https://www.aseprite.org/faq | 开源历史与再分发边界 | Aseprite 自 2016 年改变授权；不能擅自再发布软件或照搬其源码 | 以黑盒功能规范研究，不导入受限代码 |
| LibreSprite GitHub | https://github.com/LibreSprite/LibreSprite | 像素笔刷、动画、平铺、图层、渐变 | GPL-2.0 项目：如果实际复制其代码，需完成许可证兼容审查和归属义务；本轮没有复制 | 可研究开放的图层/帧分工与 Tiled 操作 |
| Blockbench 官网 | https://blockbench.net/ | Cuboid、UV 贴图、对象树、建模/绘画/动画、Graph Editor | 产品 UX 参考，不复制 UI 素材 | 采用两个编辑模式和共用纹理资产的架构 |
| Blockbench GitHub | https://github.com/JannisX11/blockbench | 3D 模型和 Keyframe 数据关系 | GPL-3.0；直接复制代码前必须决定工程许可与义务 | 3D 作为独立场景图，不与 2D 文档强行混用 |
| Minecraft/Microsoft Blockbench 说明 | https://learn.microsoft.com/en-us/minecraft/creator/documents/blockbench?view=minecraft-bedrock-stable | Cube、Bone/Group、UV、贴图编辑工作流 | 官方技术与教育文档，遵循其内容许可 | 要有选模式→建模→贴图→动画的明确顺序 |
| Krita 磁性选择 | https://docs.krita.org/en/reference_manual/tools/magnetic_select.html | Live Wire 风格边缘吸附、阈值、搜索半径、锚点 | Krita GPL-3.0，文档用于设计研究 | 智能选择先用确定性边缘路径+用户引导 |
| Krita Assistant | https://docs.krita.org/en/user_manual/painting_with_assistants.html | 直尺、无限直尺、平行尺、Bézier 曲线助手 | GPL 项目，需审查代码复制 | 尺规可独立于最终像素数据存在 |
| Krita 许可证 | https://krita.org/en/about/license/ | GPLv3 许可 | 仅登记，不复制 | 逐文件合规审查后再引入代码 |
| Android Compose 手势 | https://developer.android.com/develop/ui/compose/touch-input/pointer-input/understand-gestures | pointerInput、pointer event、双指、事件消费 | Android 官方开发文档 | 不要将多指拖动和精确像素笔画相互污染 |
| Android 触控笔输入 | https://developer.android.com/develop/ui/compose/touch-input/input-compatibility-on-large-screens | stylus pressure、历史样本、palm rejection | Android 官方开发文档 | 支持历史采样、工具类型和真实设备能力检测 |
| Android MotionEvent | https://developer.android.com/reference/android/view/MotionEvent | historical samples、pressure、tool type | 官方 API 文档 | 轨迹预测必须基于实际输入并可撤销 |
| OpenCV 资料入口 | https://docs.opencv.org/ | 可选 GrabCut、图像分割和梯度处理 | Android/OpenCV 许可证需按具体引入版本复核 | 离线智能选区优先传统图像算法，ML 可选 |

## B. 可借鉴与禁止复制边界

允许学习：通用数学/几何原理、公开格式规范、工具操作语义、算法思想、技术论文中的数学概念。

需要单独审查：复用源码、库的动态/静态链接、衍生性界面图标、产品名、录屏素材、示例工程、专有模型/字体、从代码库直接抽取算法实现。用户请求“开源记录”不等于为整个仓库自动选择某个开源许可证；在公开仓库可阅读代码不必然等于授予使用/复制/分发许可。**本轮不新加 LICENSE，需由项目持有者决定授权策略，并由工程记录说明。**

登记引入第三方库的规则：
- 确定 upstream 仓库、release tag、commit、许可证文件以及第三方依赖树；
- 明确复制片段的路径/提交及许可证、NOTICE 和 attribution；
- 若 GPL/AGPL 兼容性未评估，不得拷进 Android 发布 APK；
- 审查 Android 上的动态链接、闭源第三方资产、商标和 SDK 的额外条款；
- 可优先自主实现小型确定性算法，附测试和文献参考；
- 对论文和开源资料不宣称“模型训练已完成”，除非有数据集、脚本、权重、实验和可重复证据。

## C. 设计借鉴—原创落地映射

| 参考机制 | Pixel Atelier 原创方案 |
|---|---|
| Aseprite 选区与变形 | 手机偏移光标 + 控制柄 + 底部浮动操作条 + SelectionMask Command |
| Aseprite 分帧/洋葱皮 | Frame/Cel 引擎 + 可收折时间轴 + 按帧 durationMs + 双向 ghost 层 |
| Aseprite Tiled | 周期写入与 3×3 预览分离的 Android WrappedCanvas |
| Krita 磁性套索 | 固定梯度图 + Live Wire + 手动节点修正，明示非语义识别 |
| Krita 尺规/曲线助手 | 非导出 vector guide + 统一 Rasterizer + 手机触控柄 |
| Blockbench 3D | Android 原生 Cuboid/SceneGraph + 整数纹素 UV + 2D/3D 共用 TextureAsset |
| Blockbench 曲线动画 | Step/Linear/Cubic 真实插值 + 数值轨道曲线 + 触控时间轴 |
| Android Stylus | MotionEvent 历史采样 + 可选压力映射 + 防误触 FSM |

## D. 研究优先级和下一行动

立即：只研究 SelectionMask、Clipboard、TransformSession、Ellipse/Bezier、WrappedCanvas 相关基础源码与算法；用独立测试验证。  
随后：研究动画 Cel 数据与帧序列；再研究 Cuboid/UV、SceneGraph、3D Graph Editor。  
不将第三方截图用于应用图标、启动页或自有市场宣传；不在未跑过时宣称功能已达到参考产品水平。

## E. 本轮原创工作记录

- 根据用户提出的 20+ 类功能缺失整理 V1.1 主规范。
- 把高级绘画、动画、材质与 3D 拆分为独立技术模块。
- 建立 FEATURE_MATRIX_V1_1.md 的功能 ID、状态和验收说明。
- 建立 ENGINE_DESIGN_V1_1.md 的算法、数据不变量和输入/输出契约。
- 研究对应的官方文档、开源仓库和许可证差异。
- 本轮为规格和源码研究记录，不是宣称新增所有工具已经写入 APK。
