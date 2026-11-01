# PIXEL ATELIER — Anima 材质与纹理制作工作流 V1.0

更新：2026-11-01，功能：site/pixel-lab/material-forge.html。

## 用户真正要的资产
- 木板与木纹、石砖和石块、草地、泥土、沙子、金属、布料、屋瓦、树皮、水面、苔石12类。
- 游戏使用的是**平铺的独立纹理**，而不是室内场景概念图、环境整体插画或物体俯视图。
- 原生16/32/64/128离散像素网格与有限色板、PNG/JSON/12块图集合。
- 3×3与5×5平铺检查；上下左右边界像素相等是严格机器条件，**但无法证明视觉上完全没有重复条纹、砖缝断裂或形态别扭**。最终艺术质量需要人工检查。
- 不替换旧世界构建器中的16×16四色材质编辑器；这是独立彩色材料研究工具。

## Anima兼容性
以Anima Base v1.0为起点。它是专注非照片插画的高分辨率DiT，文生图通常从512×512往上，不能靠一个提示词生成确定的32×32像素格，也不能假设天然无缝。
目前**没有验证通过的Anima专用自动无缝像素材质LoRA**。已找到的像素风、游戏环境或纹理增强LoRA只用于视觉对照，不宣称可供无缝贴图生产。不能将SDXL/Pony/Illustrious/FLUX/Z-Image的LoRA直接加载到Anima。
研究来源：
- 模型架构与限制：https://ostris.com/docs/ai-toolkit/models/anima
- Anima官方模型卡：https://huggingface.co/circlestone-labs/Anima
- Anima LoRA训练器：https://github.com/sorryhyun/anima_lora/blob/main/docs/guidelines/guidebook.md
- Kohya Anima LoRA脚本：https://github.com/kohya-ss/sd-scripts/blob/main/docs/anima_train_network.md
- 可搜索Anima Pixel类LoRA目录（非无缝保证）：https://tensor.art/models/tag/603628941604971288
- 可搜索Anima Background类LoRA目录（不是材质专用）：https://tensor.art/models/tag/595223054951381108

## Anima正向模板
将[材料描述]替换为项目网页里的木板/砖墙/石块/草地等12种专业描述：
`masterpiece, best quality, safe, no humans, [材料描述], pixel art, game texture, orthographic top-down view, flat lighting, edge-to-edge repeating surface, seamless tileable material, no isolated objects, structured clean color clusters, crisp pixel edges, limited matte color palette, square image, uniform texel density`

负向：
`low quality, blurry, photographic, perspective view, isometric, room, environment, objects, text, watermark, bevel, bloom, strong directional shadow, depth of field, 3d, gradient lighting, vignette, border`

初始采样：1024×1024, 30 steps, CFG4，seed固定；仅为对照起点，不冒充官方最佳无缝参数。

## 推荐生产过程
1. **方案 A 无需Anima**：在材质工坊选择12种程序化原生纹理。它们具有可查验的格点/颜色和接缝规律，但是美术表现仍可能达不到你的期望。
2. **方案 B Anima参考图**：复制网页的Anima标签，在本机ComfyUI生图，挑一个视觉结构好、构图合适的1024×1024材质候选。
3. 将图片导入网页版，按中心正方形裁切并在逻辑画布上重采样（这个过程可以模糊原图，属于转换；此处不能声称其原生绘制来源），进行 **6/8/12/16/24/32色聚类量化**。
4. 使用“修复/锁定边缘”：以左右端颜色与上下端颜色平均接近色，保证离散色板上严格配对，同时微调内侧数列。**算法不是语义inpainting**；不能凭两边色相同就宣称自然无缝。
5. 用3×3和5×5查看；检查大面积周期重复、石头裂缝走向、屋瓦是否成行、木板是否有逻辑分隔。用像素画笔人工修正；还可用旧世界材质编辑器研究16×16四色方案。
6. 导出单张原生PNG、JSON像素证据和12种材质组合Atlas；导出结果与Anima的原图必须分开存档。

## 自训LoRA：现实条件
若要真正训练一个**Anima专用“游戏材质风格LoRA”**，可使用Anima Base + sorryhyun/anima_lora 的GUI；准备**自己创作或有明确AI训练授权的素材**，每张图同名TXT，一种内容一套结构化标签。
示例caption: `safe, no humans, oak wood planks, seamless material texture, top down view, flat lighting, no scenery, game texture, pixel art`
该训练器默认拒绝低于0.25MP的输入，因此16×16/64×64原生像素作品需要**整数倍最近邻放大至≥512×512**供训练；但放大副本仅是训练输入，不能冒充更高原生分辨率。训练的网络学习像素风而不是保证逻辑格点；输出仍须上述原生转换流程。默认Rank32/alpha32、LR2e-5、caption_dropout0.1按训练器文档，具体以版本与实验为准。
不要把此前艺术家参考库当作合法训练数据；已明确禁止AI的作者作品严禁训练。

## 质量检查
Node核心单元测试：每种×每种尺寸，每格一个离散色板索引，RGBA全为不透明，边界严格匹配；导入RGB数据量化与接缝修复；不同seed的差异；PNG原生尺寸。
Chromium浏览器：在手机/桌面加载并操作，导入测试PNG，调整色数，画笔编辑，查看3×3/5×5平铺，导出PNG、截图。截图与测试是网页功能证据，不是专业美术验收。

## 使用权限
Anima模型有非商业限制，游戏商业发布必须先核实模型本身和LoRA的许可证。程序化独立纹理不包含第三方训练图片；用户导入Anima图片的生成许可仍由其自己的模型许可约束。

## 2026-11-01 可核查的 Anima LoRA 补充
- [STYLE > gpt-image-2 / Anima-base1 v1.0–1.1](https://tensor.art/models/998864747409499914): 模型页面明确 Anima、@gpt-image-2；加强画面光照、纹理细节。**v1.1甚至可能制造不自然的纹理重复**，不能当无缝纹理模型。生成游戏原生像素时先用不加载LoRA对照。
- [Anima Detailer v1.0](https://tensor.art/models/1022836946310825745): 页面明确 Anima Base LoRA，可减轻背景 stippling 颗粒。它会改变材质颗粒，不能保证砖纹/木纹正确。
