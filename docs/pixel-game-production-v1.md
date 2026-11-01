# PIXEL ATELIER — 像素游戏资产生产规范 V1.0 (2026-11-01)

目标：精致日系全身像素人物、酒吧/房间互动场景、独立道具、无缝材质、可切片UI。**游戏里使用原生像素单元和真正模块，而不是将Anima场景整图作为游戏资源。**

## 真实工程和数据现状
- 游戏源：`site/galgame/`《夜航灯》；编辑台：`site/pixel-lab/game-asset-studio.html`，独立于游戏，不覆盖游戏进度。
- 场景起始384×216：包含可见桌面透视的吧台、门、窗、杯架、吊灯、咖啡道具、室内植物、椅子和一个标记为占位的NPC。前景背景按Z排序；拖动整数坐标、导出原生 PNG 和 JSON。
- 单元素在原始逻辑画布上以整数坐标及不抗锯齿的矩形/多边形绘制。场景能按不同对象重复摆放，但美术造型仍是待评价的 V1 基础素材。
- 角色母版：`hostess-redraw-v1-192x256.png` 和 `hostess-20261030-D-192x256.png`。二者尚未证明是同一角色、不是LoRA训练资产。
- Anima 数据清单：`ml/anima-asset-pipeline/character-lora-manifest.example.json`。默认0张人工审核通过的合法训练图；训练权重未创建。

## 人物身份稳定要求
- 固定角色圣经：脸型/眼距眼型/发际线主发束/制服剪裁/主配色/身材比例。
- 允许变化：表情、动作、视角、光照、场景，但变化不可改变身份。
- 先制作同一角色20+张有明确AI训练许可的原创作品母版；要包含至少3种视角、4种姿态、4种表情，单独保留不用于训练的测试集。
- LoRA不能凭一张参考图弥补视角缺失。固定seed测试相同身份、换姿势、换表情、换场景、配色保持；结果必须和未加载LoRA基线比。
- **20张仅为实验性数据准入条件，不是训练成功保证**。通常素材质量和变化范围比堆张数更关键。

## 正确 Anima 训练手段
- 官方模型卡建议用 **Anima Base** 训练 LoRA；Turbo v1.1用于快速8–12步、CFG1的参考图抽样。Base推理一般30–50步CFG4–5。
- 官方建议 rank32 以 LR 2e-5 为起点，**不要训练LLM Adapter**。采用专用 `kohya-ss/sd-scripts/anima_train_network.py`，不是SDXL旧训练程序。
- Anima训练所需模型：Anima base DiT、Qwen3 0.6B文本编码器、Qwen-Image VAE和对应tokenizer/adapter（以具体 trainer 指南为准）。
- 训练标签：`safe, 1girl, original character, full body, front view, standing, short hair, blue jacket, pixel art, clean clusters`。真实角色ID以触发词单独固定，正确分开必需属性和可变属性。
- 原生像素训练图片如果需扩大到训练尺寸，必须最近邻整数倍展示；扩张副本**不能冒充更高原生像素细节**。模型输出仍需独立网格审查。
- 只有取得素材授权、审核批准并有真实GPU训练环境时才开始训练；本仓库提供数据准入工具与基础预生产界面，没有冒充训练完权重。
- 模型许可证：Anima 为非商业使用许可证；准备发布商业游戏需要单独解决授权。

## 场景资产与像素完整性
- 场景模块各自拥有type、id、x、y、z。不要将整房间画成一张无法复用的AI背景。
- 单独制作：墙/地板纹理、门、窗、家具、柜台、台面俯视层、装饰、灯光/遮挡。
- 光照分两部分：图片原生阴影像素与游戏动态调光；不能因为抗锯齿而把原生网格模糊。
- 材质：`site/pixel-lab/material-forge.html` 已支持12种结构化原生纹理及Anima图导入、4边接缝审查，适合后续模块贴图。
- 检查需要RGBA半透明统计、格点真实性、角色视觉结构评估、各材质3×3/5×5真实平铺检查、游戏场景完整截图。**单靠边缘像素相等不保证美术无缝**。
- 真实PNG导出要验证宽高为384×216；物体越界、透视遮挡错误、异色杂点都要列入人工review，而不是只满足单元测试。

## QA与发布门槛
- Node测试：模块、坐标与校验、prompt语法、LoRA空数据拒绝、训练授权门槛。
- GitHub Actions Chromium：手机版390px与桌面1440px，加载编辑器、添加/拖动模块、导出PNG、导入JSON、人物像素审核、LoRA拒绝提示、截图。
- 测试和实际艺术评级分开。代码通过≠人物/环境/原生像素效果达到完美。
- 所有生成资产先经艺术审核，再加入游戏主线。

## 参考
- 官方模型卡：https://huggingface.co/circlestone-labs/Anima/blob/main/README.md
- 专用LoRA：https://github.com/kohya-ss/sd-scripts/blob/main/docs/anima_train_network.md
- 自有材质工作台：`site/pixel-lab/material-forge.html`
- 人物立绘画师库：`site/pixel-lab/pixel-portrait-references.html`
