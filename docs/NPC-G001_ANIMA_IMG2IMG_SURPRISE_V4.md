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

## 只操作 Forge Neo img2img 这一个页面
1. **img2img → img2img**，上传最后获批的三人喜悦原PNG（不是失败的惊讶稿）。不走 ImageStitch 参考方法，禁用 pilot_r32/role-ref-kv/其他对同一原动作的额外参考约束。只开原画风 `@akipekostyle` 和真实卡片插入的 `akipeko` 画风LoRA，1.0（或已验收值）。
2. 图片宽高 **1024×1024** 与原图相同，Resize mode **Just resize**；不要 Crop and resize，也不要改变横竖比。如果鞋底贴边，可先用原定稿的1024方形留白参考版。
3. Checkpoint 选 **Anima Base**，Steps **35**，CFG **4.5**，Sampler **ER SDE**，Shift **沿用你已验证的 Anima Base 设定**；Batch Size 1。
4. **Denoising Strength 先试 0.72**，固定同一个 seed 比较 **0.68 / 0.72 / 0.78** 三档。0.68可能动作保留太多，0.78可能脸/校服漂移；这是经验起点，不是官方保证成功的阈值。
5. 首轮不要开 ADetailer、Face Restore、Hires Fix 或额外 LoRA；它们可能在基础动作没对前带来另一轮外貌漂移。
6. **画面审核**：A有没有双手抬到脸旁、B有没有掩口与抓前襟、C有没有挺直侧转+抬臂指向？若没达到，不能以『表情像惊讶』宣布过关。
7. 纯文字+普通 img2img **不能严格保证**『局部姿势大变且人物身份/鞋底像素完全不变』；如果 0.78 下还是复制原身体，最少只需切换同一 img2img 页的 Inpaint，对每个人躯干/双手局部遮罩高去噪（保留脸、鞋子不涂），不需要额外安装控制插件；同样不保证一次成功。

## Anima 官方依据
- CircleStone Labs Anima：https://huggingface.co/circlestone-labs/Anima —— 支持 Booru 标签和英文自然语言混写，多人应单独描述外貌和动作；30–50 Steps，CFG 4–5，ER SDE可用。
- Stable Diffusion WebUI img2img 操作：https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Features —— Just resize/Crop and resize 的差异。
- 项目已确认环境：[Anima Forge Neo清单](ANIMA_FORGE_NEO_INVENTORY_20261105.md)；人物参考：[NPC-G001已定稿喜悦审批](characters/NPC-G001_JOY_APPROVED_20261107.json)。

## 项目状态提醒
NPC-G001 的『喜悦』是用户批准的画面参考；『惊讶』没有批准，最新三张用户图仍是废稿。此文件只保存下一次可复制提示词与操作。没有声称已把图或 NPC 动作实装游戏。
