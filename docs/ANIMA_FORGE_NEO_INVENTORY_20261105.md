# Anima × Forge Neo 资产制作环境清单（2026-11-05，必须读）

> 入口：README → 本文件 → [CHAR-001 2048 精修 SOP](CHAR_001_2048_REPAINT_SOP_20261105.md) → [人物画风锁](ANIMA_CHARACTER_ART_STYLE_LOCK_V1.md) → [女主正式档案](PROTAGONIST_CANON.md)。所有角色重画前先按此顺序阅读，不能拿 SDXL/SD1.5 的参数直接套 Anima。
>
> 证据性质：本文件来自用户 2026-11-05 上传的 Forge Neo 界面、插件页、LoRA 卡片截图，结合下方上游技术资料整理；“截图可见” ≠ 已验证安装文件哈希、LoRA训练信息/触发词、模型兼容性，也 ≠ 实际生成成功。未见的插件/文件不可凭空宣称已安装。不得将这个手工快照当作机器实时探测结果。

## 1. 当前软件与模型（截图直接可核对）

- 软件：Stable Diffusion WebUI **Forge Neo** 风格界面；UI Preset = anima，img2img 页面。无法仅凭截图确认具体 Forge Neo commit、GPU/VRAM、Python/torch 版本及扩展当前运行是否报错。
- Checkpoint 下拉显示 **anima_turboV11.safetensors**（推定属于 Anima Turbo 系；准确权重来源、SHA256、与作者 v1.1 的关系需由 PNG Info/本地模型卡核验，不把文件名当官方验签）。
- VAE / Text Encoder 栏显示 **qwen_image_vae_2004692.safetensors** 与 **anima_base/v10_txt.safetensors**（按用户界面逐字记录；和官方发布名称不同不代表一定有错，先实测解析是否正常）。
- UI 当前 img2img：Crop and Resize、ER SDE、Beta、32 steps、1024×1024、Shift 3、CFG 4、Denoising 0.6、Batch Count 1、Batch Size 1、Seed -1。此套不是下一次女主保真人物重画的推荐参数。
- 当前源图是正面单人完整站姿。预览周边棋盘格不证明图像本身已有 Alpha；须保存 PNG 后检查像素 Alpha。
- 上游 Anima 原版是 2B 模型，Qwen3 小文本编码器+Qwen Image VAE；官方建议 Base / Aesthetic 30–50 steps、CFG 4–5；Turbo 8–12 steps、CFG 1。原生训练/使用尺寸主要是 512–1536 范围，1024²为优先起点，不把 2048² 当一次扩散的原生质量保证。
- **关键知识**：CFG=1 时，通常没有负面分支引导，输入 Negative Prompt 不会按 CFG>1 同样起作用；要优先保证正面描述与低去噪。官方 README 有 Anima prompt 规则：Booru 标签 + 自然语言可混合，标签小写并以空格分词（score_7 例外）；推荐前缀 masterpiece, best quality, score_7, safe；艺术家 tag 前缀 @；Aesthetic 变种不建议堆 score 标签。当前项目风格锁 **@akipekostyle + akipekoanima_v1_1** 优先级高于其他随意风格 LoRA。

## 2. 已在扩展列表中启用（截图可见；每一项用途/本任务使用方法）

### Forge 内置模块（截图）
| 模块（界面/扩展ID） | 作用 | 女主2048重画中的操作原则 |
|---|---|---|
| extra-options-section | 将额外设置暴露为界面项 | 不影响美术；按需展开 |
| forge_legacy_preprocessors | 旧版预处理器兼容层 | 只有相应控制模型明确兼容时用，勿盲开 |
| forge_preprocessor_inpaint | 局部蒙版预处理 | 后期修发夹、手、扣子可用 |
| forge_preprocessor_reference | 参考图预处理 | 仅在对应参考链路需要时用 |
| forge_preprocessor_tile | 图块预处理 | 放大/纹理补细节可能使用，需配 Anima 兼容控制权重 |
| mobile | 移动端 WebUI 布局辅助 | 不参与生成逻辑 |
| prompt-bracket-checker | 提示词括号格式检查 | 防止权重语法写错 |
| sd_forge_compile | 编译/加速 | 先做可靠基础测试，确认兼容后再尝试 |
| sd_forge_controlllite | 轻量图像结构控制 | **需要专门的 Anima 兼容权重**；仅有 UI 不代表模型齐全 |
| sd_forge_controlnet | ControlNet 推理和控制界面 | 要核对 Anima Canny / SoftEdge / Pose / Tile 对应模型，不能用 SDXL 权重冒充 |
| sd_forge_image_stitch | ImageStitch，多参考图输入 | **Anima Reference for Forge Neo** 参考图流程需启用并上传参考人物 |
| sd_forge_ipadapter | IP-Adapter 类参考控制 | 仅确认具体适配器兼容 Anima 后启用 |
| sd_forge_json_builder | 可视化构建/导出 JSON 任务 | 用于记录/调试配置，不负责身份保真 |
| sd_forge_lora | LoRA 加载 | 在 LoRA 卡片单击插入真实别名，避免猜文件名 |
| sd_forge_lora_schedule | 分阶段改变 LoRA 强度 | 首次复现关闭；后期独立实验 |
| sd_forge_multidiffusion | 分块生成/重画 | 高分辨率低去噪细化的备选；防拼接缝与身份漂移 |
| sd_forge_neveroom | 避免显存不足时的资源调度 | OOM 时尝试，而非画质增强按钮 |
| sd_forge_pid | PID 数值控制模块 | 与女主保真无直接作用 |
| sd_forge_radial | 特定架构注意力加速 | 不当作画质 LoRA |
| sd_forge_sparse | Sparse Attention 加速 | 兼容性确认后才开 |
| sd_forge_spectrum | 频域/采样加速 | 基线关闭，排除变量 |
| soft-inpainting | 柔化局部修复接缝 | 局部补画时按需，首轮全图关闭 |

### 额外安装的扩展（截图逐项）
| 扩展名称 | 具体作用 | 从哪里进入、怎么用、对女主的建议 |
|---|---|---|
| ADetailer-Neo | 自动检测面部/人体并局部重绘 | img2img 页面 ADetailer 折叠区；高保真首轮**关闭**，脸正确后也不要自动替换成通用 AI 脸 |
| anima-reference-forge-neo | Anima 参考人物一致性；封装 ElectronGirl Ref Adapter、AnticPan Role Ref KV | 参考模式需在 Prompt 插入对应参考方法的 LoRA 标签，开启 ImageStitch Integrated，并放入原人物参考；Settings → Stable Diffusion → Anima Reference 配置 guidance/APG；**不能当普通风格 LoRA**；一次只选一种方法 |
| composer_forge_neo | 提示词组合/模板管理 | Composer 标签辅助批量组织 prompt；第一次保真用固定一段 Prompt 更易控制 |
| forge-neo-lama-cleaner | Lama 擦除/修补画面缺陷 | 少量坏背景/杂物可修，不能代替主体高质量重画 |
| img2img-hires-fix | img2img 生成后进行高分辨率二次阶段 | img2img Hires Fix 折叠区；单阶段通过后再开，注意 Anima 高分辨率可能产生网点与变形 |
| sd-forge-anima-ref-adapter | ElectronGirl Ref Adapter 集成 | 与 anima-reference-forge-neo **可能功能重叠**；一次仅用一条参考链路，不同时开启两个脚本/方法 |
| sd-forge-couple | 按区域分配提示词、减少多对象互相污染 | Forge Couple 折叠区；单人母图通常关闭 |
| sd-webui-3d-open-pose-editor | 可视化骨架姿势编辑器 | 顶栏 3D Openpose；用于姿势草稿；**只有对应 Anima Pose 控制权重时才能约束实际输出** |
| sd-webui-photopea-embed-ReForge-Neo | 网页内 Photopea 图像手修 | 顶栏 Photopea；用于透明化、边缘净化、局部绘制、PSD 输出 |
| sd-webui-regional-prompter | 分区提示词 | 单人首轮关闭；不同身体区域差别修复时可研究 |
| sd-webui-state-manager-neo | 生成配置/状态保存管理 | 生成后保存参数快照；不能替代最终 PNG Info |
| sd-webui-tagcomplete-neo | 英文标签自动补全 | 编写 Anima tag 时选准确标签，留意标签后缀和大小写 |
| sd-webui-zh-tag-autocomplete | 中文辅助标签补全 | 可输入中文辅助查词，**最终提示词用英文 Anima 标签/自然语言** |
| stable-diffusion-webui-wd14-tagger | WD14 图像反向标签 | 顶栏 Tagger；可为原图提供标签草稿，人工核对修正发夹、面相、左右与服饰 |
 
**版本信息：** 截图中可见 ADetailer-Neo af228eba、composer 3f228321、Lama cleaner 8ae81aed、img2img-hires-fix b8930527、sd-forge-anima-ref-adapter 9d4881e8、sd-forge-couple c7884e81、OpenPose ff298de5、Photopea 329e1d3a、Regional Prompter 9d6c1f4、State Manager ff53c2d6、Tagcomplete 781a0b12、中文补全 223d8d9d、WD14 Tagger ce1b3e31。它们是**截图所示 commit 简写**，不是“已重启并全功能验证”。

## 3. LoRA 与专用参考权重卡片（2026-11-05 截图中能辨认的所有项目）

> **卡片可见并不代表具体 safetensors 的准确完整文件名、版本、模型类型、推荐权重均已查实。** 必须在 Forge 的 LoRA 页点击对应卡片核验插入的完整标签，并打开元数据/对应模型页面确认 Base Model/Trigger words/License/Recommended weight；下表对不确定项明确标注“待核”。对角色一致性的承诺不能只凭卡片名称。

| 卡片显示名 | 作用/类别 | 如何调用及本次建议 |
|---|---|---|
| **AnimeEditV2**（截图卡片名；是否等于 AnimaEditV2 待核） | 用于 Anima 编辑/变换方向的候选特殊 LoRA | **默认不开**；先核验它是否是 Forge 原生 Anima Edit 专用权重、支持哪个变体以及 Settings → Stable Diffusion → [Anima] Enable Reference 模式，不能把它当常规画风增强 |
| **Smooth_Booster_Anima** | 名义上平滑/细节风格助推，具体训练目标待核 | 不在首轮用；需要前后图固定 seed 做 0 / 小权重对照，警惕抹掉原版线条 |
| **Anima Bold v1** | 线宽/粗线风格滑杆 | 如线条确实太细再做单独 A/B，不与多个风格调节器叠加 |
| **anima_base_slider_step800** | 滑杆型/训练中间版本，具体目标未知 | **待核标签和训练页**；不能擅自定义功能，不用于首轮 |
| **Character Sheet for Anima** | 角色多视角/设定图辅助 | 单张全身立绘时**不开**，避免生成额外人物和多宫格 |
| **Dark (Anima) v1** | 暗黑画风/色调风格候选 | 不用于原版校服母图（后续恐怖氛围交给游戏光照/场景） |
| **Rotation_SliderLeft_RightV2** | 视角左右旋转控制候选 | 单张严格正面不用；如做 3/4 或背面另立任务对照 |
| **screenshot_v5-000009** | 无法从卡片判定用途的权重 | **未知：禁止启用到正式流程** |
| **akipekoanima_v1_1-step00003000** | 项目认可的主画风风格 LoRA 候选具体权重（与旧文档别名 akipekoanima_v1_1 可能不同） | **当前唯一优先主画风**，配触发词 @akipekostyle；首轮使用实际卡片插入的 LoRA tag，可从 0.8 测试并对照档案历史 1.0 |
| **anima-aesthetic-improvement-v1.2** | 审美提升型 LoRA | 保真人物首轮关闭；后续如图像偏粗糙可做单项对照，防止换脸 |
| **anima-highres-aesthetic-boost** | 高分辨率/审美辅助 LoRA，具体训练分辨率需核 | 首轮关闭；不保证 2048 的超分细节，不要替代真正上采样 |
| **saturation_v6** | 饱和度调节滑杆 | 原项目克制配色已定；关闭，防止制服变色 |
| **anima-role-ref-kv-v1.0** | AnticPan 的 Role Reference KV **专用参考权重** | **仅配合 anima-reference-forge-neo**：插入正确权重标签＋ImageStitch 原图，不能把它当普通风格 LoRA |
| **anima_ref_adapter_pilot_r32** | ElectronGirl 老版参考适配器权重 | 已有 v2 时首选 v2 对照，但兼容须以安装扩展 README 为准 |
| **anima_ref_adapter_v2_r64** | ElectronGirl v2 参考适配器权重 | 需核验当前 Forge 扩展实际支持 v2（原作者 ComfyUI 支持 v2 不自动等于用户 Forge 版本支持）；img2img 原图低去噪与 Reference Adapter 在某些情形会冲突，需单独 A/B 测试 |

**角色母图第一轮 LoRA 策略**：只有 **akipeko** 一款常规风格 LoRA（或 0-LoRA 基线），所有滑杆/美化类和参考类先关闭；参考适配器实验另开一轮，并记录是否确实有效。必要时局部 inpaint + 原参考图比整体强去噪更稳定。

## 4. 正确区分“模型 LoRA / 参考适配器 / ControlNet / 插件”

1. 普通风格 LoRA：通常在 Prompt 中使用 <lora:实际卡片插入名称:权重>；只改倾向，**不是精确保人**。
2. 参考权重：Role Ref KV / Ref Adapter 一定要有安装的配套引擎和参考图。Anima Reference for Forge Neo 的用法是 **提示词方法标签 + ImageStitch Integrated 的原人物图 + 对应 Settings**。同轮只使用一种方法，不和原生 Anima Edit 的 Reference 同时启用。
3. ControlNet / ControlLLLite：结构约束必须额外存在**兼容 Anima 的模型权重**，可见的 3D OpenPose 编辑器只是摆姿势 UI，**不等于姿势控制模型已装**。
4. Photopea/WD14/TagComplete 是工具，不是扩散模型，不能解决模型训练边界。
5. ADetailer 是“重绘局部”，对**身份锁定**可能比不用还差；只有眼/手确有局部缺陷且蒙版受控才考虑。
6. LoRA 的适配基础一般是 Anima Base；在 Turbo 上画风/参考能力可能漂移，尤其 **ElectronGirl 官方 v2 卡说明未测试 Anima-Turbo 完整 checkpoint**，但是 Forge Neo 第三方扩展声明支持 turbo。**二者不是同等强度证据**；最终看用户实际生成对照。

## 5. 官方来源与进一步阅读（每次复核，不把第三方经验当官方规则）

- Anima 作者模型卡（最高优先级）：https://huggingface.co/circlestone-labs/Anima
- Anima 模型文件与许可：https://huggingface.co/circlestone-labs/Anima/tree/main
- InvokeAI Anima 技术说明（Turbo CFG=1 时负向影响、模型结构、LoRA）：https://v7.invoke.ai/users-guide/models/local-models/anima/
- Forge Neo 官方仓库（需核实实际安装的分支/commit）：https://github.com/Haoming02/sd-webui-forge-classic/tree/neo
- Anima Reference for Forge Neo：https://github.com/eduardoabreu81/anima-reference-forge-neo
- ElectronGirl Ref Adapter v2 研究/用法：https://huggingface.co/ElectronGirl/anima-ref-adapter
- Anima Role Ref KV：https://huggingface.co/AnticPan/Anima-Role-Ref-KV
- Img2img Hires Fix：https://github.com/Amadeus-AI/img2img-hires-fix
- 对 Anima 纵长/高分辨率高修可能有网点问题的讨论：https://github.com/Haoming02/sd-webui-forge-classic/issues/763

## 6. 强制逐次生成记录（从第一张起）

每张候选 PNG 保留：角色ID、源图路径/内容哈希、尺寸与 Alpha、 checkpoint 文件名 + SHA256、文本编码器/VAE 名称、Forge Neo commit、扩展版本、LoRA **完整精确文件名、版本/权重/trigger**、Prompt 与 Negative、sampler/scheduler/shift/steps/CFG/denoise、resize mode、seed、ControlNet 模型和参数、参考图适配器模式、upscaler/倍率/二次重画参数、VRAM 条件、输出 PNG Info、主观问题与审核状态。记录到角色对应制作日志；**不保存用户私人服务密钥或个人账号信息**。

每次开始：重新核对本文件中的截图快照与实际安装界面是否发生变化；新增/删去插件后更新**本表和日期**；**用户未确认前，严禁覆盖正式角色母版与正式 L2D 资产**。
