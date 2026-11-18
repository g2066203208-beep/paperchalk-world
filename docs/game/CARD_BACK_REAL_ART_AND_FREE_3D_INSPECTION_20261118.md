# 人物卡机：用户原卡背实装 + 3D 卡牌自由观赏（2026-11-18）

## 本次用户命令
> “你先在老虎机那里做一下卡牌自由观赏吧卡背做到里面先传到github”

本次 **不要重新生成卡背或卡框**。用用户在此会话实际提供并认可的 Anima 暗酒红、纤细香槟金边、四角金丝、中心罗盘八角星卡背。随后用户试画的“厚红边灰窗正面卡框”已经明确判定难看，**严禁误当作获批正式正面卡框**。

## 已入库的真实背面素材
- **原始来源**：用户聊天上传的 704×1024 RGB PNG，含白色扫描边缘，与用户认定卡背图案一致。未经用户另行同意不得重绘/改设计。原始用户消息中的 PNG 是唯一完整母图。
- **游戏派生纹理**：`site/assets/cards/shared/character-card-back-anima.webp`，480×724 RGBA WebP，大小 12,914 bytes，Git blob SHA1 `8e8d3ef4c34fad66c07738e02b6bffab8d6c39b5`。为性能对原图剪掉白底（原暗红卡主体边界约 x30–678,y25–1003，原有效比例约 648/978），生成半透明圆角外沿，缩放压缩为适用 3D 游戏的 WebP。**这不是逐字节原始 PNG，也不是新 AI 生成图；生产 WebP 是经裁切与有损压缩的派生品。**
- GitHub 以真正 **binary blob** 写入 WebP 并按本地原图编码确认相同 Git blob SHA，不是假的 HTML data url。中间转存的 base64 文本块均已从主分支删除。
- 3D 卡牌几何从 1.68×2.32 调整为 **1.68×2.53**，比例约 .664，与真实裁边卡背 480/724≈.663 一致。背面贴图不再受错误比例拉伸；原来程序画的圆圈、星、PAPERCHALK 字样被撤下。
- Three.js 背面 `MeshStandardMaterial`，针对已上传纹理的暖金像素自动生成 metalness mask，暗红漆面维持非金属，金箔响应现有 PBR 环境与 HDR bloom。不要对原图二次重新 AI 绘制。

## 交互与目标
`site/card-battle/character-card-machine.html` 按钮：**自由观赏卡牌**。
- 实时同一 WebGL 舞台暂停机器抽卡，隐藏机壳与地面，放大到画面中心的真实厚度卡片。没有假图预览或 CSS 伪 3D。
- 默认先看用户认可的通用卡背；选择器可以挑入库的五个组织 35 张原有人物立绘查看正面。用户原始人物图片一字节不动。
- 手/鼠拖动画面任意旋转，俯仰限制 ±1.17 弧度；滚轮与双指缩放 1.12～2.75；正面/背面切换、自动缓慢旋转、复位和返回机器。
- 关掉观赏恢复原有抽卡状态、暂停时间、机台和控制；在观赏期间禁用单抽、五连抽、跳过按钮防止状态冲突。浏览器自动抽卡队列仍然会继续（观赏退出后）。
- `window.PaperchalkCharacterMachineQA` 提供 `cardBackReady`、`backsideUsesOriginalTexture`、`inspecting`、`inspectionYaw` / `Pitch` / `Zoom` 等可重复检查值。

## 必须做真实验收
`tests/character-card-machine-browser.mjs` 要验证原图 URL 返回成功、加载尺寸480×724、WebGL 3D 模型确实贴了这张纹理，分别在桌面1440×900、手机竖屏390×844、横屏844×390测试：
- 初始卡机；
- **自由观赏中的真实卡背正面投影**；
- 选择 **马戏团团长** 的真实前脸立绘；
- 手动旋转/缩放卡片看斜侧面；
- 背面翻转、退出观赏；
- 继续抽卡、卡背先出机、翻正揭晓、五连抽队列。
QA 的截图和 WebM 才是**真正的游戏画面**。浏览器通过 ≠ 已在用户实体手机 GPU 测过帧率；未经截图逐张复核不要承诺像素级美术完成。

## 入口
- https://g2066203208-beep.github.io/paperchalk-world/card-battle/character-card-machine.html
- https://github.com/g2066203208-beep/paperchalk-world/blob/main/site/assets/cards/shared/character-card-back-anima.webp
- https://github.com/g2066203208-beep/paperchalk-world/blob/main/site/card-battle/motion/character-card-machine.mjs

## 下一步
修复任何真实 Chrome QA 失败；取得观赏状态的真实截屏后对照用户卡背查看方向/清晰度/色彩，不要继续画失败的厚边正面卡框。

## 2026-11-18 用户追问：「我要能放大缩小任意旋转」
- 旧版有错误限制：俯仰 ±1.17 弧度、缩放 1.12～2.75，**不足以称作自由观赏**，现已替换。
- `site/card-battle/motion/character-card-machine.mjs` 由原来限制角度的 yaw/pitch 直接控制改为真正的 `THREE.Quaternion` 任意旋转；鼠标/触屏单指拖动可沿 X/Y 任意累计超过 360°，无俯仰限制；手机双指扭转围绕 Z 轴，右键/Shift 拖动或双指平移可移动卡片。
- 缩放实际范围为 `0.32~7.5` 倍（相对模型局部世界尺寸，约 23.4 倍跨度），支持鼠标滚轮、手机捏合、明确的「＋放大」「－缩小」按钮、双击/「居中复位」；复位会依据舞台宽高正交相机视口自动计算完整卡片展示比例。
- 观赏工具栏已移到画布**下方独立行**，不覆盖用户 Anima 卡片正面及金线卡背。红色底色改为原图不经舞台暖光变色的图层，金线单独做金箔金属层，卡纸为真正有圆角厚度的 3D mesh。
- 真实 Playwright/Chromium run **44313854657** 完整成功，包含 1440×900、390×844、844×390 三尺寸；在真实 WebGL 中通过了鼠标 pointer drag、滚轮、放大缩小按钮、连续多周 quaternion、Z 轴翻滚、深度放大、平移、复位、切正反面和抽卡回归；`results.json` 三端 `passed:true`、`errors:[]`。
- 全量实机截图（42 PNG）和 3 段 WebM 位于 [run 44313854657 artifact](https://github.com/g2066203208-beep/paperchalk-world/actions/runs/44313854657/artifacts/14431787691)。`.github/workflows/character-card-machine-qa.yml` 现增加了成功后归档观赏模式截图到 `site/card-battle/qa/character-card-machine/` 的步骤，待该工作流最新一次完成即可作为 GitHub 永久截图。
- 未真实接触用户手机硬件，物理手机 GPU 的稳定 FPS 仍需实机测试。由于卡背游戏优化纹理当前为 480×724 WebP，在最大缩放时清晰度有纹素上限；如要超近距离鉴赏纤细金线，应另由原 PNG 制作保真高分辨率纹理，不能假装已有。
