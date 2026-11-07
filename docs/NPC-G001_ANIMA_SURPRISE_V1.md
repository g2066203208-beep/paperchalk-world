# NPC-G001 · 第03套情绪『惊讶』完整 Anima Prompt · V1
> 2026-11-07。**以用户确认的第02套『喜悦』三人整体立绘作为同一批固定演员的参考，不重设计人物。** 这份是下一张要生成的提示词，并非已经生成的惊讶素材。

## 参考定稿（已获用户批准）
- 元数据：[`NPC-G001_JOY_APPROVED_20261107.json`](characters/NPC-G001_JOY_APPROVED_20261107.json)
- 批准素材：用户在本轮对话上传的1024×1024 RGB原图，SHA256 `c3afb8ac08173c4cb20178ff3088b33592d3f13bb40a66ba52fab06a50b2e53d`
- 原PNG仍为会话附件；**没有提交二进制PNG到GitHub，不冒充游戏正式加载素材。**
- 图像A左矮深棕短波波头，B中浅棕中长发，C右深色低位粗辫。三人笑着靠近交谈的亲密关系已获认可。

## 下一张：惊讶（不是恐惧，不是喜悦）
目标是听到突如其来的大消息时，A倒吸一口气、B话到一半停住、C挑眉追问。保持同一组亲近的朋友和同一张人物母版；**人物之间要有动作呼应**，不三人排成站桩，不同时张大嘴，不全部抬手。
### Positive Prompt（完整、可单独复制）
```text
masterpiece, best quality, score_7, safe, @akipekostyle, <lora:akipekoanima_v1_1:1>, 3girls, school uniforms, full body, height difference, surprised, wide-eyed, open mouth, raised eyebrows, startled, looking at each other, hand gestures, close friends, white background, simple background, clean lineart, cel shading.

Same three schoolgirl friends as the reference image, same faces, hairstyles, outfits and proportions. One lively three-person group, with three different natural reactions to unexpected news. No posing for the viewer.

LEFT: the shortest girl, round cheeks, short dark chestnut bob and small round brown eyes. She gasps with wide eyes, stops mid-laugh and reaches toward the middle girl's sleeve, leaning slightly backward in surprise.

MIDDLE: the medium-height slim girl, soft light-brown shoulder-length hair with bangs and small soft brown eyes. She suddenly stops talking, eyes open, eyebrows raised, mouth forming a small surprised oval. Her two hands pause near chest level, fingers naturally spread. She glances toward her friends for confirmation.

RIGHT: the tallest girl, dark black hair in one thick low side braid, a slightly squarer face and narrow brown eyes. She raises one eyebrow and turns toward the middle girl in disbelief, one hand lifted as if asking "Really?", the other hand relaxed against her skirt.

Keep the three girls close together and visibly reacting to each other. The expressions must differ: spontaneous gasp, speechless astonishment, skeptical surprise. Maintain their warm familiar friendship and distinct face shapes, not three identical shocked faces.

Matching dark navy notched school blazers with two small matte dark front buttons, white collared shirts, dark burgundy straight neckties on all three, charcoal pleated skirts, dark socks, dark brown loafers. Three complete figures, all shoes visible, natural balance, feet on one ground level, spacious white margins above and below.
```

### Negative Prompt（通用）
```text
worst quality, low quality, score_1, score_2, score_3, blurry, 1girl, 2girls, 4girls, extra person, duplicate, identical faces, same hairstyle, same height, identical pose, identical expression, laughing, closed eyes, constant big smile, crying, angry, frightened screaming, stiff lineup, looking at viewer, formal group photograph, idol group, overly detailed sparkling eyes, missing eyes, missing necktie, bow tie, ribbon tie, untucked shirt, gold buttons, metallic buttons, different uniforms, fused hands, extra arms, extra fingers, extra legs, missing shoes, cropped feet, cropped head, out of frame, dramatic lighting, background scenery, watermark, text
```

## 模式与生成建议
- **优先使用 Anima Base img2img，不建议重新使用无参考的 txt2img。** 下一张改变的是情绪与姿势，人物身份及校服不能随机重画。
- 原图 1024×1024；先在画布四周加白边，最好将原图等比例缩小到 ~88%，居中留白（避免脚边切裁），再作为 img2img 的输入。会话内已生成一份 1024×1024 白边参考文件；未自动传到 GitHub。
- 1024×1024 开始，35 Steps，CFG4.5，ER SDE；img2img **Denoising strength先尝试0.50–0.60**。若动作未变，适度上调或局部重绘面部和手势；若换脸、换发型、校服丢失则降低去噪并使用姿势/参考约束。
- 如果局部修改：保留三个头部结构、头发颜色、纽扣/领带不重绘，针对眉眼嘴与双手局部重绘；参考图比纯文字更重要。
- 注意不同性格表演不等于不同情绪类别；本套统一主情绪是『惊讶』，不同表情来自三人个性。
- 所有3人必须全身，包括鞋底，白底方便后续去背；校服不能出现蝴蝶结、金扣、漏领带。
