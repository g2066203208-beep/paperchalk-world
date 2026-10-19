# 夜行档案 · GPTimg 美术制作总提示词 v0.2

## 核心定位
项目是 **可实际游玩的横屏手机视觉小说 + 生活模拟桌面 RPG**，核心画面不是宣传页。参考游戏 VA-11 Hall-A 的“固定场景中反复发生戏剧”的演出逻辑，以及 NE​​EDY STREAMER OVERLOAD 的多窗口日常互动与信息压力，但绝不复制其人物、造型、品牌元素、UI 排列或受版权保护的场景。

**必须先锁角色母版、再做单独的场景、最后编排程序 UI；不许 GPTimg 输出整张假游戏截图当作成品。**

## 风格约束（所有图片共享）
- 原创现代海滨大学城、夜间街灯、凌晨的私人空间。白天是温柔的普通校园生活，晚上是有紧张节奏的秘密委托。
- 深海蓝 #0B1222，墨灰蓝 #202B42，亮玫粉 #F66EA8，电光青 #72BED9，暖象牙色 #E9DDBE。粉色只作为强调色，绝不全屏高饱和轰炸。
- 手绘细节密度可接近商业 2D 日式视觉小说背景，但角色五官、材质和线条必须统一。柔和体积光来自明确的实际灯具，不用 AI 模糊烟雾遮盖结构问题。
- 角色/背景/UI 分开生成；所有输入文字、日历、任务板、对话、按钮均为真正的 HTML/CSS 或精确 SVG 渲染，而非画在背景图上的假交互。
- 使用 16:9 横向景别标准，最低 2048×1152 背景绘制，人物立绘高优先 1536×2048；素材审核前不得宣称 Spine 可用。

## MASTER CHARACTER PROMPT · 成人大学生主角
“An original, 20-year-old female university student in a cinematic 2D urban mystery visual novel. A unique established identity: shoulder-length dark chestnut hair with controlled messy strands; single asymmetrical triangular silver hairpin on her LEFT temple; warm ash-brown eyes with mildly tired lower eyelids; soft but distinctive nose bridge; a tiny cluster of freckles beside the nose; thoughtful reserved expression, not an existing anime character. A functional black crewneck top, bone-white slightly oversized jacket, high-rise charcoal wide-leg trousers, black practical sneakers, one plain shoulder bag, no extra jewelry. Slim but plausible adult anatomy, approximately 7.5 heads tall, camera at chest height and consistent gentle 3/4 right perspective. One standing neutral full-body pose, both shoes and hands fully visible and separated from body for potential cutout, coherent warm 2800K key light and deep blue 7000K rim, refined deliberate anime painted light shapes and clean readable outlines. No typography, no GUI, no watermarks, no background people, no brand marks, no cropped body, no unclear hands, no altered outfit. Plain neutral studio background for later masking. Stable camera and consistent proportions.”

必须先验收“脸型、发夹方向、外套、肩宽、腰线、手脚、正面与 3/4 透视”，母版不合格不得继续批量出表情。

## EXPRESSION VARIANTS PROMPT
“Edit the approved master while preserving the exact facial identity, bangs, hairclip direction, accessory inventory, outfit seams and shot alignment. Change ONLY facial animation and a small coordinated head tilt. Produce individual transparent or easily-maskable renders of: neutral tired, subtle warm smile, careful suspicion, startled vulnerability. Match consistent top-of-head, neck anchor, shoulder seam positions across renders. No new costumes, no extra hair accessories, no random eye color shifts, no hairstyle replacement, no invented tattoos, no stylized exaggerated facial proportions.”

表情应是单独的 4 张可切换图，且带清晰的统一锚点；不要把“四宫格概念图”直接变成游戏素材。

## SCENE A · 23:18 夜间卧室
“An original cinematic anime visual novel BACKGROUND PLATE ONLY, no person, no UI, no text, no baked-in interactive highlights. A realistically small and lived-in 20-year-old art student's apartment bedroom in an original fictional coastal city. A writing desk under a window with a closed laptop, coffee cup, study notes, scattered receipts, stacked novels, plants, one plush bunny keychain, warm lamp, cozy unmade bed, a couple of abstract graphic posters WITHOUT readable text. Through the wide rain-streaked window: a deep-blue modern skyline, elevated rail line, sparse magenta advertisements rendered without legible logos. Eye-level 1.4m, 35mm lens perspective, left-center clear silhouette staging area for a character, right side holds desk with separate interactions. Balanced contrast of amber indoor warm pool and cyan rainy outdoors, economical pink signal accent, crisp physically plausible geometry, layered atmospheric perspective, hand-painted Japanese visual novel background quality. 16:9 2560×1440 with 10% safe crop margins. DO NOT draw dialogue, buttons, icons or inset screenshots.”

这个背景需要拆分至少：外部城市、窗户玻璃、室内布景、桌面前景、灯光遮罩，用于景深、轻微摇镜和人物遮挡。

## SCENE B · 白天校园
“An original university courtyard in a fictional coastal city under clear autumn daylight. Empty human staging zone in central-left third. Different functional architecture from real game IP, light warm concrete and large glass, tram stop, trees, vending kiosk, gentle shadow direction, several objects at distinct depth for optional clickable hotspots. No human characters, no UI, no logos. Consistent crisp anime-painted outlines and color language with the night bedroom image. 16:9 2560×1440.”

## SCENE C · 雨滴咖啡
“Nighttime small coffee shop interior in the old quarter of a fictional coastal city, cosy counter, espresso machine, receipt printer, isolated paper receipt on countertop, warm practical pendants and rainy shop windows, background stools and distinctive décor, enough empty ground area for a single character at the left, consistent 35mm cinematic perspective, no human figures, no words, no UI; 16:9, 2560×1440.”

## SCENE D · 中央站前、展馆
“Two distinct original background plates with consistent eye-level and soft environmental light. Plate 1: rainy night train station plaza with an electronic timetable surface LEFT BLANK FOR RUNTIME TEXT. Plate 2: evening contemporary art gallery with independent paper visitor registry and long cold-lit corridor. No humans, no UI or photos from existing games, no logos, stable perspective, 16:9 2560×1440.”

## UI DECORATIONS PROMPT
“Original minimal boutique cyber-noir desk UI decoration ASSET SET, NOT A FULL UI MOCKUP: 9-slice panel corner ornaments, 1px window dividers, pointer marker rings, chip shadows, notification badge styles, simple app glyphs in coherent thin vector style. Main colors restrained charcoal navy and warm pink/cyan accent. Transparent isolated small assets; no text baked into graphics, no fake buttons or phone frame. The real interface is responsive HTML/CSS.”

## 技术美术验收与游戏端测试
1. 同一角色不同姿势必须脸一致，服装接缝一致；手指、鞋、透视和头发边界逐个检查。
2. 提供尺寸、透视高度、角色足底/头部锚点、交互热点相对坐标的资产 manifest。
3. 2D 场景至少两层遮挡分布，窗玻璃与室内不全贴一张不可编辑图。
4. 所有图在横屏 667×375、844×390、1280×720 下与游戏真实 UI 合成检查，对话框不得遮挡关键表情。
5. 所有交互都必须是真实按钮、线索和对话状态；剧情从消息、调查、规划到结果可以完整走通。
6. 拍摄真实浏览器截图进行人工检查；一旦视觉失败先优化镜头/立绘/遮挡，不追加杂乱宣传文字。
7. 显著标注哪些图仍是概念或临时裁剪，绝不把“做过美术方向稿”说成“全部正式素材完成”。
