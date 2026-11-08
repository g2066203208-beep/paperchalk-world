# NPC-G001｜惊讶 V7：高辨识度强惊讶、全身留白、共同视线（2026-11-08）

> **优先使用版本。** 用户最新上传的惊讶候选图中三人头/鞋被裁切，A像说悄悄话、B弯腰愣着、C像听故事：**情绪强度严重不足，不予定稿**。这次九大类之一的「惊讶」必须强过「好奇」，通过明显的全身弹开、失衡、眼眉嘴变化体现一瞬间的震惊。正式「喜悦」母版身份不变。

## 官方文本规范
CircleStone Labs官方Anima模型卡：https://huggingface.co/circlestone-labs/Anima
- Danbooru/Gelbooru小写标签与英文自然语言长句混用；特殊 `score_7` 例外，LoRA标签按Forge实际别名。
- 推荐 `masterpiece, best quality, score_7, safe` 前缀；推荐负向低质量词、模糊/JPEG/色散。
- Anima Base建议30–50 steps、CFG4–5；er_sde是其推荐采样器之一。
- 参考插件官方：https://github.com/eduardoabreu81/anima-reference-forge-neo。该参考适配器能通过ImageStitch识别参考人，但主要针对单角色；**用户本人三人组实际使用体验不错**，可继续配合img2img做同身份动作变化，不能声称所有外貌细节自动锁定。

## 完整正向：Anima Base + img2img + Pilot r32
```text
masterpiece, best quality, score_7, safe, 3girls, full body, wide shot, dynamic pose, surprised, shocked, wide-eyed, raised eyebrows, open mouth, recoiling, flinching, stumbling, grabbing another's arm, school uniform, height difference, looking at the same object, looking offscreen, white background, simple background, clean lineart, cel shading, @akipekostyle, <lora:akipekoanima_v1_1:1>, <lora:anima_ref_adapter_pilot_r32:1>.

Three close schoolgirl friends from the approved reference image. Preserve their individual faces, hairstyles, relative body sizes and matching school uniforms. A single extraordinary event suddenly appears a few steps IN FRONT OF THE GIRLS, within their own surroundings. All three immediately fix their eyes on the SAME unseen point ahead of them. Their heads may turn at different natural angles because they stand at different positions. They are NOT looking at the camera. Preserve the scene's natural perspective; do not force an eye-level front-facing portrait.

A BIG, INSTANT FULL-BODY SHOCK REACTION, not a gentle conversation. Their conversation is interrupted in one split second. Three strongly different body silhouettes, arms and legs moving, balance disturbed, clothing swinging. The three girls react to the same sight and instinctively catch each other. They are still believable teenage friends, not stage performers.

LEFT GIRL: the shortest schoolgirl, dark chestnut short bob haircut, round cheeks and small brown eyes. She jolts BACKWARD so suddenly that she drops into a deep half-crouch, with her knees bent and feet stepping apart. One hand grabs the middle girl's blazer sleeve firmly for balance; her OTHER arm flies up away from her body, fingers spread. Shoulders lifted, head drawn back, eyes very wide, eyebrows shooting up, mouth open in a startled gasp. She stares toward the SAME unseen event ahead. BLACK mid-calf socks, dark brown loafers.

MIDDLE GIRL: the medium-height slim schoolgirl, soft light ash-brown shoulder-length hair and small brown eyes. The sudden sight makes her RECOIL in a large backward step: her upper body arches away from the event, her weight shifts onto one leg, and her skirt and hair move with the abrupt turn. Her LEFT arm reaches out to catch the short girl's hand; her RIGHT arm flies outward behind her for balance. Her eyes open widely with a striking, disbelieving stare, eyebrows high and mouth dropped into a large clear O-shaped gasp. She looks at the SAME unseen event. LIGHT GRAY mid-calf socks, dark brown loafers, LONG DARK BURGUNDY NECKTIE clearly visible.

RIGHT GIRL: the tallest schoolgirl, longer slightly angular face, narrow brown eyes, charcoal-black hair in the SAME thick low braid. She is caught completely off guard: she STRAIGHTENS abruptly from her old forward-leaning pose, TWISTS her shoulders toward the unseen event, and takes a large staggered step backward. Her LEFT hand catches the middle girl's upper arm; her RIGHT hand lifts sharply beside her shoulder with fingers open. Her usually composed expression breaks into genuine astonishment: both eyebrows rise, eyes widen noticeably and her mouth opens in a sudden surprised exclamation. She looks at the SAME unseen event, not at either friend's face. BLACK mid-calf socks, dark brown loafers.

Their reactions are connected but NOT identical. LEFT suddenly half-crouches and clutches a sleeve; MIDDLE reels back with both arms spread differently; RIGHT twists, staggers and catches her friend. Show the exact instant of shock, with strong emotional expressions and large movement from head to feet. This must look unmistakably like SURPRISE, not curiosity, gossip, fear, laughter or a posed photograph.

Uniform details on ALL THREE: very dark navy notched school blazers, exactly two small matte near-black front buttons, white collared shirts, STRAIGHT DARK BURGUNDY NECKTIES clearly visible on every girl, charcoal gray pleated skirts, dark brown school loafers. Socks MUST be LEFT BLACK, MIDDLE LIGHT GRAY, RIGHT BLACK. Keep their faces and hairstyles as in the reference image.

FULL-LENGTH THREE-PERSON COMPOSITION: camera pulled back, complete bodies from the highest hair strands to the entire soles of ALL SIX shoes, all three figures entirely INSIDE the image, ample clean white margins above the hair, below the shoes and along both sides. The group occupies the CENTER of a larger blank canvas with comfortable breathing room. Neutral flat character lighting, no background objects, no baked ground shadows.
```

## 完整负向
```text
worst quality, low quality, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, chromatic aberration, 1girl, 2girls, 4girls, duplicate girls, wrong character, character swap, identical faces, identical expressions, identical poses, expressionless, relaxed, smiling, laughing, quiet curiosity, whispering, gossip, three heads huddled together, leaning in to listen, hands on knees, hands cupped beside mouth, old reference pose, stiff standing, posing for camera, synchronized gestures, standing in a straight lineup, looking at viewer, eye contact with camera, looking in different directions, closed eyes, tiny mouth, emotionless eyes, theatrical symbol, exclamation mark, shock marks, terrified crying, extreme panic, deformed hands, extra fingers, extra arms, fused bodies, missing legs, cropped, close-up, upper body only, feet cropped, shoe tips cropped, head cropped, out of frame, hair cut off, figures touching canvas edge, giant characters filling canvas, missing necktie, bow tie, ribbon tie, gold buttons, brass buttons, white socks on left girl, black socks on middle girl, white socks on right girl, wrong socks, mismatched uniforms, background scenery, floor shadow, dramatic lighting, text, watermark
```

## 真正解决裁切：先做画布而非只写Prompt
- 之前获批「喜悦」原图是1024×1024，生成的最新失败惊讶图人物头发/鞋尖贴边。已将获批喜悦**原图缩至80%后放在1024×1024纯白画布中央**，不改变人物的头发、脸、衣服：本会话生成 `/mnt/data/NPC-G001_joy_img2img_fullbody_padded.png`（**本机文件，未提交GitHub二进制图片**）。
- **img2img底图**：该留白版；**ImageStitch参考图**：用户已批准的原始「喜悦」三人合图。仅一张参考，开启ImageStitch。
- Anima Base、CFG4.5、35 steps、er_sde，LoRA包含真实Forge卡片插入的akipeko和pilot_r32，参考 Guidance 4.5、Correction apg（用户已经测试成功的参数优先）。
- Denoising建议先用已验证的成功值，如果没有记录，从0.82左右做首轮；新的衬衫/袜子/脸可能会漂，注意逐一审核；Denoise越高不是越准确。
- 脸和眼睛仍保留。A黑袜/B浅灰袜/C黑袜，三条暗酒红长领带都要清楚可见。
- 摄像机透视是游戏场景给定的，不应强制front view/eye-level camera；“前面”是**三位女生视线中的同一个场景事件目标**，而非摄像机所在方向。
- 大动作反应：A后弹半蹲抓袖，B全身后仰双臂展开，C扭身后撤扶B；**不是恐惧类的坐地失控，不是好奇类凑头观察**。
- 如果成图还能看成聊天/脸上只有轻微惊讶，拒绝该图；不能以保住三个人为由默认通过。

## 状态
提示词已提交，**惊讶图片尚未通过用户验收，也未装入游戏**。
