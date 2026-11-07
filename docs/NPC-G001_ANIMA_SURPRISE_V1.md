# NPC-G001｜惊讶：全身动作重编 V2（替换原V1）
> 2026-11-08：用户指出原「惊讶」图只改表情、几乎照搬「喜悦」三人动作，因此否决。**本稿替换惊讶的整组三人动作设计与生图方法**。获批「喜悦」母图仍然有效，惊讶图还未获得批准。

## 正确表演逻辑
- 喜悦图：A贴近笑，B双掌摊开笑，C弯腰凑近笑。
- **惊讶必须是另一套全身姿势**：A受惊向后退半步/扬手，B挺直后仰/双手猛抬至肩膀两侧，C侧身跨步/手指向意外来源。三者视线串联事件与同伴，不能只改变嘴和眼。
- 三人不是恐惧失控，不跌倒、不尖叫、不摆战斗姿势；是突然听见荒诞或劲爆消息的群体惊讶反应。保持三人的固定五官、发型、校服；不再反复复制「三人弯腰拥挤中间」的喜悦姿态。

## Anima 正向（完整）
```text
masterpiece, best quality, score_7, safe, @akipekostyle, <lora:akipekoanima_v1_1:1>, 3girls, full body, school uniform, surprised, wide-eyed, raised eyebrows, open mouth, stepping back, recoiling, sudden movement, different poses, height difference, white background, simple background, clean lineart, cel shading.

Three close schoolgirl friends are caught in the instant they hear something unbelievable. Completely new full-body poses, unlike the laughing reference image. The three girls have space between their bodies and react to the SAME surprise with different movements.

LEFT: the shortest girl, short dark chestnut bob, round cheeks, small round brown eyes. She takes one startled step backward, lifting one heel from the floor, shoulders raised, one hand suddenly touching her cheek and the other arm flung slightly outward. She looks at the middle girl with wide eyes and a little open mouth.

MIDDLE: the medium-height slim girl, light ash-brown shoulder-length hair, long oval face, small soft brown eyes. She straightens her body and recoils backward, one foot placed behind the other. Both hands jump upward beside her shoulders with fingers spread, leaving her necktie visible; her elbows are bent outward, not holding her palms forward. She turns her head toward the left girl, mouth forming a small surprised oval.

RIGHT: the tallest girl, dark hair in one thick low braid, squarer face, narrow brown eyes. She is upright, twisting her upper body toward something off-screen. One leg steps sideways, one arm extends outward and points toward the unexpected sight, while the other hand lifts slightly toward her friends. One eyebrow raised, mouth parted in disbelief.

Clear three different silhouettes: LEFT recoils backward, MIDDLE raises her hands beside her shoulders, RIGHT turns and points. No hugging, no bending toward the center, no hands on knees, no palms-up storytelling gesture. Keep the same faces, hairstyles and clothing as the approved reference. Their surprise is lively and spontaneous, not terror or a staged group photograph.

All three wear matching dark navy school blazers with two small matte dark front buttons, white collared shirts, dark burgundy straight neckties, charcoal gray pleated skirts, dark socks and dark brown loafers. The left girl is shortest, the center girl medium height, the right girl tallest. Complete heads and shoes in frame, generous white space around all three, shoes on the same ground plane.
```

## Negative Prompt（完整）
```text
worst quality, low quality, score_1, score_2, score_3, blurry, 1girl, 2girls, 4girls, extra person, duplicate, identical face, different hairstyle, same height, same pose as reference, laughing pose, eyes closed, big laughing smile, three girls leaning into the middle, heads pressed together, bent forward, hands on knees, both palms held out together, cupped palms, presenting something, storytelling gesture, holding the same pose, identical gestures, synchronized poses, standing at attention, fashion model pose, looking at viewer, character lineup, fused limbs, extra arms, extra legs, extra fingers, bad hands, cropped shoes, cropped head, out of frame, bow tie, ribbon tie, missing necktie, untucked shirt, gold buttons, metallic buttons, mismatched school uniforms, dramatic lighting, floor shadow, speech bubble, text, watermark
```

## Forge Neo / Anima 实操
- **原先建议的 0.50–0.60 img2img 去噪不足以可靠重编三人整身动作**，会复制参考图的原手位、躯干方向和距离；若要真正大幅改姿势，优先采用「新动作的姿势控制 + 旧母版的人物身份参考」的双约束方案（前提是本地装有与 Anima 兼容的实际控制权重）。
- **只有 img2img**：使用已确认的喜悦图作参考，先加白边防裁切，去噪从 **0.72–0.82** 小范围试验，需接受三人五官衣服可能漂移的风险。配合遮罩分人物重绘及保存原头像/领带区域更稳；失败不要反复纯换词。
- **只有 txt2img**：可以借简短动作描述尝试新姿态，但**无法保证三人还是原来那三个**，不能以同一 LoRA/相同 seed 宣称锁定身份。若需要可靠视觉一致性，应先准备同身份参考约束。
- 模型 Anima Base，35 Steps，CFG 4.5，Sampler ER SDE；画布根据参考图选择，优先 1024×1024 试稿，图片四周预留空白。
- 面部变化与姿态变化可以先分两步：先固定全身新姿势，再小范围按母版修复三人脸、头发与领带。
- **验收**：三人的腿、手、躯干方向都与喜悦不同；A向后退、B后仰抬手、C转身指向；没有相同造型、没有丢领带、三双鞋不裁切；不合格不能进入已批准动作库。

## 喜悦参考记录
- [用户批准的喜悦母版元数据](characters/NPC-G001_JOY_APPROVED_20261107.json)
- 游戏尚未实现动态反应演出；本次只更新文档与提示词，不冒称已绘制成功。
