# NPC-G001：惊讶群演｜原图 img2img 大动作 V4（2026-11-08）
> 根据用户最新验收，**旧版V2/V3都没有解决旧动作复刻**：只是眼睛/嘴变了，A/C依旧弯腰贴近B，B仍双掌向前。用户明确选择：**img2img 原始喜悦图做底、左中右站位不变、全身姿势真正重编、三人身份不变**。本版为首选；仍是测试方案，尚未宣称用户已在本机成功生成。

## 这次动作硬约束
- A 左：**由弯腰转为挺直，两手同时扬到脸两侧，肘外展**，不再手贴B肩，也不再向中间靠。
- B 中：**躯干后仰，一手掩口，一手抓自己的外套前襟**，不再双掌摊开介绍，也不再大笑闭眼。
- C 右：**由弯腰扶膝改成挺直转腰，手臂高举指向场外**，另一臂招呼同伴，不再手扶膝盖。
- **原三人左右顺序和鞋底附近坐标保持**，但头和腰可以因动作变动。身高由实际竖立比例表现：A矮B中C高；禁止通过让某人前倾、跳跃或改变地面位置伪造差异。保持衣着和脸/发。
- 生成的画面以用户最新已批准的「喜悦」有眼三人母版为输入，不使用「无眼」派生图，更不能拿生成失败的惊讶图继续当底图。

## 完整 Positive Prompt（Forge Neo Anima Base img2img）
```text
masterpiece, best quality, score_7, safe, 3girls, full body, school uniform, surprised, shocked, wide-eyed, raised eyebrows, open mouth, sudden reaction, expressive body language, different poses, height difference, looking at each other, white background, simple background, clean lineart, cel shading, @akipekostyle, <lora:akipekoanima_v1_1:1>.

An img2img repaint of the SAME three girls in the source image. Keep their original LEFT, MIDDLE, RIGHT positions, original feet locations, original face shapes, hairstyles, body proportions, uniform colors and camera framing. Completely replace the old laughing body language with three distinct, energetic surprise poses. Their feet stay near their original floor positions. No one swaps places.

LEFT GIRL: the shortest girl, short dark chestnut bob and rounded cheeks. She has suddenly stopped joking. She straightens her previously bent back, turns her shoulders outward, throws BOTH hands upward beside her cheeks with elbows spread, fingers open, wide eyes and a small astonished gasp. Her head tilts back slightly as she looks at the middle girl. Her shoes stay at the left position.

MIDDLE GIRL: medium height, slim, light-brown shoulder-length hair with bangs. She visibly JERKS BACKWARD from the waist, lifting her shoulders, holding one hand over her open mouth and the OTHER hand gripping the front of her own blazer near her collarbone. She turns her face toward the right girl, eyebrows raised high, eyes wide in disbelief. Both elbows form a new silhouette. Her shoes remain in the center position; her hands are no longer held together in front of her.

RIGHT GIRL: the tallest girl, black hair with the same low braids as the source, slightly longer face. She STRAIGHTENS UP from her previous forward bend, twists her shoulders sideways toward something unexpected outside the frame, and raises one arm HIGH to point toward the unseen event. Her other arm reaches toward the middle girl as if calling her attention. Her eyebrows lift, her eyes open in startled disbelief, mouth slightly open. She keeps her original place on the right, without bending forward or touching her knees.

Three separate silhouettes: LEFT both elbows raised by her face; MIDDLE recoiling with one hand at her mouth and one gripping her blazer; RIGHT upright with a raised pointing arm. They react to the same unbelievable thing, but do not all copy the same action. Their relationship is still warm and familiar. Excited disbelief, NOT horror or panic.

Matching dark navy school blazers with TWO small matte near-black front buttons each, white collared shirts, dark burgundy straight neckties on all three, charcoal-gray pleated skirts, school socks and dark-brown loafers. The left girl remains clearly shortest; the center girl remains medium height; the right girl is naturally tallest when standing upright. Keep three complete bodies, complete shoes and empty white margins. Preserve the source illustration style, line weight, face quality, subtle blush, color palette and shading.
```

## 完整 Negative Prompt
```text
worst quality, low quality, score_1, score_2, score_3, blurry, jpeg artifacts, chromatic aberration, 1girl, 2girls, 4girls, extra person, duplicate girls, swapped positions, wrong character, different hairstyle, different faces, identical height, identical body type, same pose as source, same laughing group pose, both outer girls leaning toward the center, bending forward, hands resting on knees, cupped palms, two palms held forward, hands together in front, storytelling gesture, three girls huddling together, three identical gestures, synchronized posing, group photo, stiff standing, closed eyes, laughing, cheerful smile, crying, screaming in terror, running, jumping away, moving to different positions, floor-level change, cropped legs, cropped shoes, out of frame, floating feet, deformed hands, extra fingers, extra arms, merged bodies, fused fingers, wrong uniform, bow tie, ribbon tie, missing necktie, gold buttons, brass buttons, metallic trim, new accessories, dramatic lighting, heavy floor shadow, background scenery, text, speech bubble, watermark
```

## Forge Neo：最少操作、保证原站位的 img2img 做法
**优先：img2img → Inpaint (WebUI自带)、不是另一个新插件，也不打开ImageStitch。** 用户之前已多轮尝试普通img2img高去噪，原三人靠近动作仍然复制；因此不继续建议把0.72当首选。
1. 打开原「喜悦」已批准PNG，在 **img2img → Inpaint**。**不要拿失败的惊讶图再重画**。宽高1024×1024，Resize mode `Just resize`（原图同尺寸同宽高比）。
2. **保留**三人左右脚底/脚跟、腿部基准位置、原头发外轮廓。**在三个角色从脸部表情、肩膀、躯干、手臂至腰部的区域上蒙版**；尤其要包括手臂抬起来将覆盖的白色空白，不然旧手只能在原轮廓里动。可以把脸的眉眼嘴涂进去但尽量不涂发型轮廓。不要蒙住鞋。
3. Mask mode `Inpaint masked`，Masked content 先试 `latent noise`（大改结构；如果画面碎裂再改 `fill`），Inpaint area `Whole picture`，Mask blur 8px（可在 6-12 试），Denoising Strength **0.82**（建议0.78～0.88范围）。
4. 模型 **Anima Base**，Sampler **ER SDE**，35 Steps，CFG4.5，Seed保留本次测试，Style `@akipekostyle` + 当前实际卡片插入的 `akipeko` LoRA（通常权重1.0）。其余脸部自动修正、hires fix、参考适配器和增强LoRA首轮关闭。
5. 首张只检查 **A双手抬脸旁、B一手掩口一手抓衣襟、C挺直转身举臂指向**。每个人脚跟基本留在原位，不允许三人交换左右身份。出现人脸变了，收小脸部蒙版、降低去噪或第二轮局部修脸；未改变动作，扩展蒙版到新的手臂空白、换masked content或略提高去噪。
6. **注意**：所有提示词都不可能让Anima保证脚底/人物身份像素级精确保持。Inpaint蒙版保留鞋底是强约束；单纯的文字命令和普通高denoise img2img不是强约束。无须OpenPose、IP-Adapter和复杂分区工作流。

**次选：** 若不愿涂蒙版，普通`img2img → img2img`依然可以在原图下尝试 0.82 / 0.86 两档，甚至更高。但这些会让全图同时重绘，可能换脸、换发型、校服出错；它不具备『站位锁定』能力，不能称为稳定最终方案。

## Anima 官方依据
- CircleStone Labs Anima：https://huggingface.co/circlestone-labs/Anima —— 支持 Booru 标签和英文自然语言混写，多人应单独描述外貌和动作；30–50 Steps，CFG 4–5，ER SDE可用。
- Stable Diffusion WebUI img2img 操作：https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Features —— Just resize/Crop and resize 的差异。
- 项目已确认环境：[Anima Forge Neo清单](ANIMA_FORGE_NEO_INVENTORY_20261105.md)；人物参考：[NPC-G001已定稿喜悦审批](characters/NPC-G001_JOY_APPROVED_20261107.json)。

## 项目状态提醒
NPC-G001 的『喜悦』是用户批准的画面参考；『惊讶』没有批准，最新三张用户图仍是废稿。此文件只保存下一次可复制提示词与操作。没有声称已把图或 NPC 动作实装游戏。
