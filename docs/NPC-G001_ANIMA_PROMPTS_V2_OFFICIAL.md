# NPC-G001｜Anima 官方格式核对后的 9 类通用表情与动作提示词 V2
> 2026-11-07。**更新：三人『喜悦』整体母版已获用户认可；『惊讶』改用该图的 img2img 参考，完整新提示词见 [惊讶V1](NPC-G001_ANIMA_SURPRISE_V1.md)。其他情绪尚属候选；没有把会话中的PNG二进制提交到GitHub，也未上线游戏。**

## 官方依据
- [Anima 官方模型页 / Prompting](https://huggingface.co/circlestone-labs/Anima): 训练支持 booru-style tags、自然语言 captions 及混合；标签建议用小写、空格替换下划线（score_X 除外）；建议前缀 `masterpiece, best quality, score_7, safe`，艺术家标签前加 `@`，训练使用随机 tag dropout，不需要堆积重复标签。
- 多人布局用短句具体描述**可见**的左右外貌和动作，不要用 `155cm`、`49kg`、`recurring NPC`、`personality` 这样的无法可靠画出来的设定词代替图像约束；厘米公斤只能保存在角色资料中，实际身高需要画面参考与缩放校准。
- 官方 Base 建议 30–50 steps、CFG 4–5，`er_sde` 为可选默认；Turbo 建议 8–12 steps、CFG1。模型原生宣称支持 512²~1536²范围；**首测三人组用 1536×1024**，如确实要2048横向尺寸采用二阶段放大或分块，而非谎称官方建议原生2048。
- 风格保留项目既有 `@akipekostyle` 和 `<lora:akipekoanima_v1_1:1>`；实际 Forge 卡片插入的 alias 必须本机确认。其他高分/增强 LoRA 默认不加。
- **重要：** 下面9套每套含独立完整正向，不用人工拼接；但**同一张参考母图及参考约束**才是保持三人跨图同脸的主路径。只凭文本换动作，仍可能换脸。

## 所有正向的共同角色设计
- 左短：short, slightly plump; round face, short chestnut bob, small round brown eyes。
- 中：slim; longer oval face, shoulder-length wavy ash-brown hair, drooping brown eyes。
- 右高：taller, slightly broader; squarer long face, thick low black braid, narrow half-lidded brown eyes。
- 校服：dark navy two-button blazers、matte dark buttons、white shirts、burgundy ties、charcoal pleated skirts、dark socks、dark loafers。每张都要检查原人物的正式制服母图；**文字对扣子数目不能保证100%成功**。

## 01 中性 / neutral — 关系亲密的日常聊天（V3：自然活力优先）
**2026-11-07 用户反馈：上一张虽然有身高差，却三人站桩。左A不主动，中B独白发呆，右C置身事外；B未佩戴领带、衬衫没有收进裙腰。当前首要目标是通过肢体交互构成真正的朋友关系，而不是静态站姿。**
```text
masterpiece, best quality, score_7, safe, 3girls, @akipekostyle, <lora:akipekoanima_v1_1:1>, full body, group, school uniforms, height difference, friends, chatting, smiling, laughing, looking at each other, leaning toward another, hand gestures, cheerful, white background, simple background, clean lineart, cel shading.

Three close high school friends are chatting and joking together in a spontaneous moment, not posing for a photograph. They form one lively, close-knit group. All three are involved in the same conversation, reacting to one another.

LEFT: the shortest girl, petite with soft round cheeks, short dark chestnut bob, small round brown eyes. She grins mischievously and leans slightly toward her friend, playfully nudging the middle girl's elbow with one hand, her other arm relaxed.

MIDDLE: the medium-height slim girl, long oval face, shoulder-length wavy ash-brown hair, small drooping brown eyes. She turns toward the left girl, smiling with her mouth open in mid-sentence, gesturing animatedly with one raised open palm as if telling a funny story. She looks at her friend, not the viewer.

RIGHT: the tallest girl, slightly wider shoulders, squarer face, thick low black braid, narrow half-lidded brown eyes. She leans slightly closer into the conversation, looking toward the other two with a teasing sideways grin and one eyebrow raised, making a small playful response with one hand. She is participating, not standing aside.

Clearly different expressions and hand gestures. The three classmates look comfortable around each other, with natural asymmetrical poses and easy friendly teasing. Same school uniform on all three: dark navy notched blazers with two small matte dark front buttons, white collared shirts tucked neatly into charcoal gray pleated skirts, dark burgundy neckties clearly visible on every girl, dark socks, dark brown loafers.

The left girl is visibly the shortest, the middle girl intermediate, the right girl clearly tallest. Feet on the same ground level, full shoes visible, empty white space above their heads and below their shoes, balanced three-person composition.
```

## 02 喜悦 / joy【2026-11-07 用户批准整组三人参考母图，详见 characters/NPC-G001_JOY_APPROVED_20261107.json】
```text
masterpiece, best quality, score_7, safe, 3girls, @akipekostyle, <lora:akipekoanima_v1_1:1>, high school girls, school uniform, full body, standing, group, height difference, looking at each other, white background, simple background, clean lineart, simple shading. laughing, open mouth, closed eyes, cheerful, covering mouth. Three classmates stand together in one full-body illustration, with their heads, hands and shoes visible. The short girl on the left has a slightly plump build, a round face, short chestnut bob hair and small round brown eyes. The slim girl in the middle has a longer oval face, shoulder-length wavy ash-brown hair and small drooping brown eyes. The tall girl on the right has a slightly broader frame, a squarer long face, a thick low black braid and narrow half-lidded brown eyes. Their identical school uniforms have dark navy blazers, white collared shirts, burgundy neckties, charcoal pleated skirts, dark socks and dark loafers. Each blazer has two small matte dark front buttons. The short girl bends forward with laughter, holding her stomach. The middle girl laughs and covers her mouth with one hand. The tall girl turns slightly away with a crooked grin, trying not to laugh.
```

## 03 惊讶 / surprise【旧试作候选；现在优先使用 NPC-G001_ANIMA_SURPRISE_V1.md 中更新的 img2img 全量提示词】
```text
masterpiece, best quality, score_7, safe, 3girls, @akipekostyle, <lora:akipekoanima_v1_1:1>, high school girls, school uniform, full body, standing, group, height difference, looking at each other, white background, simple background, clean lineart, simple shading. surprised, wide-eyed, open mouth, raised eyebrows. Three classmates stand together in one full-body illustration, with their heads, hands and shoes visible. The short girl on the left has a slightly plump build, a round face, short chestnut bob hair and small round brown eyes. The slim girl in the middle has a longer oval face, shoulder-length wavy ash-brown hair and small drooping brown eyes. The tall girl on the right has a slightly broader frame, a squarer long face, a thick low black braid and narrow half-lidded brown eyes. Their identical school uniforms have dark navy blazers, white collared shirts, burgundy neckties, charcoal pleated skirts, dark socks and dark loafers. Each blazer has two small matte dark front buttons. The short girl flinches backward with both hands raised. The middle girl freezes with one hand halfway up and her mouth open. The tall girl turns sharply toward something outside the frame, her eyebrows raised.
```

## 04 好奇 / curiosity
```text
masterpiece, best quality, score_7, safe, 3girls, @akipekostyle, <lora:akipekoanima_v1_1:1>, high school girls, school uniform, full body, standing, group, height difference, looking at each other, white background, simple background, clean lineart, simple shading. curious, questioning, head tilt, leaning forward, thinking pose. Three classmates stand together in one full-body illustration, with their heads, hands and shoes visible. The short girl on the left has a slightly plump build, a round face, short chestnut bob hair and small round brown eyes. The slim girl in the middle has a longer oval face, shoulder-length wavy ash-brown hair and small drooping brown eyes. The tall girl on the right has a slightly broader frame, a squarer long face, a thick low black braid and narrow half-lidded brown eyes. Their identical school uniforms have dark navy blazers, white collared shirts, burgundy neckties, charcoal pleated skirts, dark socks and dark loafers. Each blazer has two small matte dark front buttons. The short girl leans closer and tilts her head with a questioning look. The middle girl gestures toward something outside the frame and watches carefully. The tall girl rests one hand below her chin and studies the same thing with narrowed eyes.
```

## 05 愤怒 / anger
```text
masterpiece, best quality, score_7, safe, 3girls, @akipekostyle, <lora:akipekoanima_v1_1:1>, high school girls, school uniform, full body, standing, group, height difference, looking at each other, white background, simple background, clean lineart, simple shading. angry, annoyed, frown, furrowed brow, crossed arms. Three classmates stand together in one full-body illustration, with their heads, hands and shoes visible. The short girl on the left has a slightly plump build, a round face, short chestnut bob hair and small round brown eyes. The slim girl in the middle has a longer oval face, shoulder-length wavy ash-brown hair and small drooping brown eyes. The tall girl on the right has a slightly broader frame, a squarer long face, a thick low black braid and narrow half-lidded brown eyes. Their identical school uniforms have dark navy blazers, white collared shirts, burgundy neckties, charcoal pleated skirts, dark socks and dark loafers. Each blazer has two small matte dark front buttons. The short girl puffs her cheeks and protests with her hands on her hips. The middle girl frowns and speaks with one open hand extended. The tall girl folds her arms, narrows her eyes and gives a sharp sideways look.
```

## 06 悲伤 / sadness
```text
masterpiece, best quality, score_7, safe, 3girls, @akipekostyle, <lora:akipekoanima_v1_1:1>, high school girls, school uniform, full body, standing, group, height difference, looking at each other, white background, simple background, clean lineart, simple shading. sad, downcast eyes, tears, comforting, looking down. Three classmates stand together in one full-body illustration, with their heads, hands and shoes visible. The short girl on the left has a slightly plump build, a round face, short chestnut bob hair and small round brown eyes. The slim girl in the middle has a longer oval face, shoulder-length wavy ash-brown hair and small drooping brown eyes. The tall girl on the right has a slightly broader frame, a squarer long face, a thick low black braid and narrow half-lidded brown eyes. Their identical school uniforms have dark navy blazers, white collared shirts, burgundy neckties, charcoal pleated skirts, dark socks and dark loafers. Each blazer has two small matte dark front buttons. The short girl wipes a tear from her cheek with one hand. The middle girl lowers her head and shoulders with a sad expression. The tall girl gently rests one hand on the middle girl's shoulder, her own eyes downcast.
```

## 07 恐惧 / fear
```text
masterpiece, best quality, score_7, safe, 3girls, @akipekostyle, <lora:akipekoanima_v1_1:1>, high school girls, school uniform, full body, standing, group, height difference, looking at each other, white background, simple background, clean lineart, simple shading. scared, frightened, wide eyes, startled, recoiling. Three classmates stand together in one full-body illustration, with their heads, hands and shoes visible. The short girl on the left has a slightly plump build, a round face, short chestnut bob hair and small round brown eyes. The slim girl in the middle has a longer oval face, shoulder-length wavy ash-brown hair and small drooping brown eyes. The tall girl on the right has a slightly broader frame, a squarer long face, a thick low black braid and narrow half-lidded brown eyes. Their identical school uniforms have dark navy blazers, white collared shirts, burgundy neckties, charcoal pleated skirts, dark socks and dark loafers. Each blazer has two small matte dark front buttons. The short girl recoils and grips the middle girl's sleeve. The middle girl stares toward danger outside the frame with one hand covering her mouth. The tall girl steps slightly in front of her friends, holding out one arm to warn them back.
```

## 08 羞涩 / embarrassment
```text
masterpiece, best quality, score_7, safe, 3girls, @akipekostyle, <lora:akipekoanima_v1_1:1>, high school girls, school uniform, full body, standing, group, height difference, looking at each other, white background, simple background, clean lineart, simple shading. blush, embarrassed, shy, looking away, nervous smile. Three classmates stand together in one full-body illustration, with their heads, hands and shoes visible. The short girl on the left has a slightly plump build, a round face, short chestnut bob hair and small round brown eyes. The slim girl in the middle has a longer oval face, shoulder-length wavy ash-brown hair and small drooping brown eyes. The tall girl on the right has a slightly broader frame, a squarer long face, a thick low black braid and narrow half-lidded brown eyes. Their identical school uniforms have dark navy blazers, white collared shirts, burgundy neckties, charcoal pleated skirts, dark socks and dark loafers. Each blazer has two small matte dark front buttons. The short girl blushes and turns her face aside, hiding part of her smile with one hand. The middle girl looks down and nervously holds her hands together. The tall girl looks away with flushed cheeks and rubs the back of her neck.
```

## 09 轻蔑 / contempt
```text
masterpiece, best quality, score_7, safe, 3girls, @akipekostyle, <lora:akipekoanima_v1_1:1>, high school girls, school uniform, full body, standing, group, height difference, looking at each other, white background, simple background, clean lineart, simple shading. unimpressed, annoyed, half-closed eyes, smirk, facepalm. Three classmates stand together in one full-body illustration, with their heads, hands and shoes visible. The short girl on the left has a slightly plump build, a round face, short chestnut bob hair and small round brown eyes. The slim girl in the middle has a longer oval face, shoulder-length wavy ash-brown hair and small drooping brown eyes. The tall girl on the right has a slightly broader frame, a squarer long face, a thick low black braid and narrow half-lidded brown eyes. Their identical school uniforms have dark navy blazers, white collared shirts, burgundy neckties, charcoal pleated skirts, dark socks and dark loafers. Each blazer has two small matte dark front buttons. The short girl pouts and gives a sideways glance. The middle girl closes her eyes halfway and puts one palm to her forehead in a tired facepalm. The tall girl raises one eyebrow and smirks with her arms folded.
```

## 通用负向（Base CFG>1 时使用）
```text
worst quality, low quality, score_1, score_2, score_3, blurry, jpeg artifacts, chromatic aberration, 1girl, 2girls, 4girls, extra person, duplicate, identical faces, same hairstyle, same height, character sheet, multiple views, collage, cropped, out of frame, bad anatomy, extra arms, extra hands, extra legs, missing fingers, fused bodies, fused limbs, floating feet, oversized eyes, sparkling eyes, heavy makeup, hidden eyes, faceless, gold buttons, golden trim, shiny brass buttons, missing necktie, different uniforms, background scenery, strong shadows, dramatic lighting, watermark, text
```

## 生产规则
1. 母版通过前，先只测中性；外貌、校服、站姿不合格不能批量生成9张。
2. 第一张验收后，其余使用同一母版作为参考，优先用兼容 Anima 的姿势控制/局部重绘变动作，而非靠句子保证精确身份。
3. 校服纽扣、袜子、领带、鞋子逐张目测复查；遇到三人一模一样或多/少人，先调整布局/参考控制。
4. 本文档只修改提示词标准，不覆盖角色图片、PSD、L2D或人群运行时。
