# NPC-G001｜惊讶 V5：自然连锁反应 + 校服袜色硬锁（2026-11-08）

> 用户已经否决了“所有人高举双手、捂嘴瞪眼的摆拍惊讶”。**喜悦母版继续作为唯一有效原始输入；新惊讶图不通过验收。** 本稿目标是以原始母版 img2img 生成 **全身大动作、自然的朋友间连锁反应**，不是自拍式三人惊叫。当前仍为待用户本机测试的提示词，不声称已生成、已入库。

## 对刚才失败的惊讶图逐项检查

- 左A两手贴脸，中B单手贴嘴，右C指脑门：彼此没有肢体因果联系，像漫画姿势展示，而不是生活中互相反应。
- 人物站位已有左右中顺序但不够自然；**只锁三人身份顺序**，脚步、腰、腿、手臂可以自由大幅度改变，不能写“脚底坐标固定”。
- **袜子串位：** 喜悦母图 A黑、B浅灰、C黑；废稿 A黑、B黑、C浅灰。必须给每个人分别加 SOCK COLOR，并在整体服装段复述一次。
- A、B 的暗酒红长领带消失，必须每个人都留可见长领带，不允许蝴蝶结或敞领。
- 地面大面积硬阴影和惊讶符号是多余图层；应白底不烘焙阴影，表情不要都瞪眼张嘴。
- 中间原本浅棕微卷的头发不应换成完全不同的直发；右边黑低位粗辫不能换。
- 站位是 A左、B中、C右，不是要求鞋底全程不动，也不要求高度因为弯腰还要遵循头顶阶梯线。真正身高看人物竖立时的比例。

## 完整 Anima Base img2img Positive Prompt
```text
masterpiece, best quality, score_7, safe, @akipekostyle, <lora:akipekoanima_v1_1:1>, 3girls, full body, three schoolgirl friends, school uniform, sudden surprise, startled reaction, spontaneous movement, candid moment, natural body language, dynamic poses, height difference, looking at each other, white background, simple background, clean dark lineart, subdued cel shading.

The same THREE girls from the original approved image, in the same LEFT–MIDDLE–RIGHT order. Their faces, hairstyles, uniforms and relative body sizes remain the same. A single believable moment: the girls have just heard something unexpected during a friendly conversation. They react to ONE ANOTHER, not to a camera. Completely NEW whole-body movements, unlike the original laughing scene. Their feet may step and their weight may shift, but the three girls do not swap places.

LEFT GIRL: the shortest friend with a dark chestnut short bob, round cheeks and small brown eyes. She suddenly flinches BACKWARD and SIDEWAYS, turning her shoulders away from the center, bending one knee and taking a quick step back. Her right hand instinctively GRABS the middle girl's sleeve near the elbow; her left arm swings outward to keep balance. Her eyes open in surprise, her lips part for a short gasp. She is looking at the middle girl, NOT covering her own face with both hands. BLACK mid-calf socks, dark brown loafers.

MIDDLE GIRL: medium height, slender, light ash-brown shoulder-length hair with a soft natural wave, small brown eyes. The sudden tug makes her TWIST her torso toward the left friend, shift her weight to one leg and step sideways to catch her balance. One hand reaches down to steady the left girl's arm, the other arm moves outward from her old storytelling position. Her eyebrows lift, her mouth is slightly open in a short surprised "oh", not screaming. She looks toward the left friend. LIGHT GRAY socks, dark brown loafers, a CLEARLY VISIBLE long burgundy necktie.

RIGHT GIRL: the tallest friend with dark hair in the SAME thick low braid, a longer slightly angular face and narrow brown eyes. She suddenly STRAIGHTENS from her previous bent-over posture, takes one quick step toward her friends, turns her hips and shoulders toward the middle girl and reaches one hand to the middle girl's upper arm, ready to support her. Her other hand swings naturally beside her body. She looks toward the other two with one eyebrow raised and a small startled open mouth. She is NOT pointing dramatically or posing with hands on her knees. BLACK mid-calf socks, dark brown loafers.

Three DISTINCT dynamic full-body silhouettes: LEFT stepping backward and tugging a sleeve, MIDDLE twisting and catching her balance, RIGHT straightening and reaching toward her friend. The girls remain close and connected by a natural chain reaction. Clear visible eyes and distinct faces, believable teenage movement, unposed everyday moment, no synchronized hand gestures, no cartoon shock symbols.

All THREE wear identical very dark navy blazers, two small matte near-black front buttons on each blazer, WHITE collared shirts, a STRAIGHT DARK BURGUNDY NECKTIE on EACH girl, charcoal gray pleated skirts, dark brown loafers. Exact socks from the approved original image: LEFT BLACK, MIDDLE LIGHT GRAY, RIGHT BLACK. Keep all three pairs of shoes inside the frame with white margins. Clean white background, even neutral lighting, no painted ground shadows.
```

## 完整 Negative Prompt
```text
worst quality, low quality, blurry, 1girl, 2girls, 4girls, extra girl, swapped characters, different hairstyle, changed identity, identical faces, same body proportions, same pose as the input image, unchanged arms, unchanged torso, same leaning-in laughter pose, three girls posing for a photograph, looking at viewer, group lineup, synchronized poses, both hands over the mouth, both hands pressing cheeks, three screaming faces, exaggerated shocked expression, cartoon exclamation marks, orange surprise symbols, speech bubbles, pointing at forehead, dramatic pointing pose, hands on knees, runway model pose, frozen standing, big open mouth on every girl, extra limbs, fused arms, extra fingers, distorted hands, floating feet, cropped feet, cropped shoes, missing necktie, bow tie, ribbon tie, untucked shirt, gold buttons, brass buttons, metallic gold trim, wrong socks, black socks on middle girl, white socks on left girl, white socks on right girl, mismatched school uniforms, dramatic lighting, ground shadow, cast shadow, background scenery, text, logo, watermark
```

## Forge Neo 极简配置
- **img2img → img2img**，上传用户已批准的『喜悦』有眼三人母图，**不要用失败的惊讶图作为输入**；Just resize，1024×1024。
- **Anima Base**，35 steps，CFG 4.5，ER SDE；风格用项目 akipeko 画风LoRA 1.0（以 Forge LoRA 卡片真实 alias 为准），不要再叠加角色参考LoRA/ADetailer/美化LoRA。
- Denoising strength **0.78～0.82**，先试 **0.80**：相对上一张0.85更偏向保持身份/配色，但全身换动作的有效性必须看出图，不保证；不够换动作再考虑0.85。
- 不采用“同一画面全员举手/捂嘴”的示范动作。A后撤并牵动B，B失衡又稳住A，C顺势扶住B，动作形成因果链。
- 若动作成功但只是 B 的袜色、三个领带错了：**不用重新全图生图**，在同一 img2img → Inpaint 中只蒙版错误的袜子、领带，低去噪0.3～0.45，以 A黑/B浅灰/C黑 和三条酒红领带修正；尽量不碰已经合格的手、脸、腿。
- 身高/校服/表情优先按母图身份验收；不要把“保持原样”理解为禁止换全身动作。
- 更多参考：[原项目Anima环境清单](ANIMA_FORGE_NEO_INVENTORY_20261105.md)。
