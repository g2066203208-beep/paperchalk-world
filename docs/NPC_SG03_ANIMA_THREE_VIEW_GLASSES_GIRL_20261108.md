# SG03 学校眼镜妹｜Anima V3：眼睛全空白，单肩书包三个视角位置锁定

> **2026-11-08 最新用户截图不合格：** 左侧视图灰蓝包变成挂在背后的背包，中正面有真实眼睛却没有眼镜，右背面的包又挂成另一种背法。此前 V2 字句太多、左右位置描述含混，且「眼镜、眼睛、书包、笔记本」同时竞争，Anima 可能按常见动漫数据先验补上眼睛并把单肩包误解成背包。这**不是用户画错或设置错，而是之前提示词无法稳定约束出图**。
>
> **本 V3 只针对真正错误：** 统一**一只灰蓝帆布单肩托特包**，一根肩带、在人物**左肩→左胯**，侧面可见，正面在画面右侧，背面在画面左侧。**绝对不是双肩背包、斜挎包**。正面必须画**两枚清晰圆镜框＋鼻梁连接件**，镜框里的脸只有空白肤色，没有眼睛、眼睑、睫毛、瞳孔。为了减轻生成负担，暂时移除此前助手自行添加、用户未要求保留的「一本笔记本」道具，不改变人物、校服和三面顺序。
>
> **状态：尚未生成和批准本 V3 的图片。** 用户最新上传的失败图不作为母图登记。基础构图仍承袭 [SG01 已验证图序 V2 模板](ANIMA_SCHOOLGIRL_THREE_VIEW_FILL_IN_TEMPLATE_V2_20261108.md)，但 V3 在道具识别部分进行了明确修订。官方模型卡 https://huggingface.co/circlestone-labs/Anima 不保证复杂多视图配件绝对一致，实际出图仍需检查。

## Positive Prompt

```text
masterpiece, best quality, score_7, safe, @akipekostyle, <lora:akipekoanima_v1_1:1.0>, character reference sheet, character turnaround, multiple views, three full body figures, Japanese schoolgirl, dark brown short bob hair, round wire-frame glasses, slate blue canvas shoulder bag, simple anime style, clean lineart, flat colors, muted colors, white background.

A single character turnaround sheet showing exactly three full-body drawings of ONE identical Japanese schoolgirl in one horizontal row: LEFT pure left-facing side profile, CENTER direct front view, RIGHT direct back view. She has an average-height, slightly sturdy natural build, a softly round face, warm beige skin, short dark auburn-brown bob hair with wispy uneven bangs, and a reserved but slightly hurried manner.

Her face has a tiny nose and a small mouth. She wears the SAME clearly drawn pair of thin dark ROUND WIRE-FRAME GLASSES in the front and side views: two connected circular rims and a narrow bridge in the front, a visible rim and a temple arm in the side profile. The space INSIDE BOTH GLASS LENSES is completely blank smooth face-colored skin, without any drawn facial marks. Her face has the same empty upper-face style as the eyeless schoolgirl NPC reference. No face details except nose, mouth and glasses. The back view shows only the back of the head.

She wears the same school uniform as the female protagonist: a fitted very dark midnight-navy school blazer with notched lapels and exactly two large matte dark warm gray-brown round front buttons, a white collared shirt, a narrow LONG BURGUNDY NECKTIE, a short charcoal-gray pleated skirt, black mid-calf socks and dark brown leather loafers. Her blazer is worn neatly, its upper button fastened and lower button undone. The uniform and wearing style are identical in every view.

She carries ONE soft SLATE-BLUE CANVAS SINGLE-SHOULDER TOTE BAG with ONE long continuous fabric shoulder strap, hanging from her own LEFT shoulder and resting against the outside of her own LEFT HIP. This is a shoulder tote hanging at the hip, NOT a backpack. The bag has a soft rectangular shape, one opening at its top, and no rear backpack straps. It stays on the SAME LEFT SHOULDER and LEFT HIP in all three drawings, even as the camera angle changes. She carries no other props.

LEFT FIGURE: Pure 90-degree left-facing SIDE PROFILE. Her nose, shoulders, chest, hips, knees and shoes face LEFT. Her far shoulder is hidden behind the near shoulder. The single bag is clearly visible on the near LEFT side of her body, hanging beside her left hip, with its strap running over her near left shoulder. She lightly steadies the strap with her left hand while taking one small relaxed walking step. One eyeglass rim is seen in profile with its thin temple arm; the face behind it has no eye marks.

CENTER FIGURE: Direct FRONT VIEW. Her shoulders, chest, hips and feet face directly toward the viewer. Both circular glasses rims and the bridge are clearly visible, with smooth blank skin inside them. The tote strap is on HER LEFT shoulder, which appears on the RIGHT SIDE OF THE PICTURE, and the slate-blue bag hangs by HER LEFT hip, also on the picture's right. She takes a small forward step and holds the strap with her left hand. Her clearly visible long burgundy tie hangs in front of her white shirt.

RIGHT FIGURE: Direct BACK VIEW. Her head, shoulders, back and hips face away, with no face visible. The SAME bag hangs from HER LEFT shoulder at HER LEFT hip, appearing on the LEFT SIDE OF THE PICTURE in this back view. One continuous shoulder strap loops over her left shoulder. She takes a small step away with her right arm relaxed by her side. The back of her bob haircut, navy blazer, gray pleated skirt, socks and loafers matches the other views.

All three figures are the identical person with the same glasses, bag design, bag shoulder, hairstyle, skin tone, uniform, body proportions and colors. Left: genuine side profile, center: genuine front, right: genuine back. Gentle natural walking moments, balanced posture, full body from head to shoes, three evenly spaced figures, plain white background, neutral diffuse overcast light, flat colors, no cast shadows.
```

## Negative Prompt

```text
worst quality, low quality, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, chromatic aberration, anime eyes, drawn eyes, pupils, irises, eyeballs, eyelids, eyelashes, eyebrows, eye highlights, closed-eye arcs, bare face without glasses, missing glasses, glasses missing in front view, glasses missing in side view, opaque lenses, sunglasses, different glasses, backpack, school backpack, rucksack, two backpack straps, bag on back, crossbody bag, bag on right shoulder, bag switching shoulders, bag hidden in side view, bag absent in front view, duplicate bags, extra props, notebook, missing long burgundy tie, bow tie, gold buttons, shiny buttons, different uniform, different hairstyles, different skin tones, two frontal views, side view in center, three-quarter side view, angled shoulders, turned head, looking backward, stiff mannequin pose, running, jumping, exaggerated gestures, extra figures, cropped head, cropped shoes, hard shadows, dramatic light, furniture, scenery, text, watermark
```

## 本地参数和逐格验收
Anima Base · ER SDE · 35 Steps · CFG 4.5 · 1536×1024 · `@akipekostyle, <lora:akipekoanima_v1_1:1.0>`。

- 左：**90°纯朝左侧面**，包在画面可见的左髋侧；边走边左手轻扶肩带；眼镜侧面存在但不画眼睛。
- 中：纯正面，双圆镜框及连接鼻梁线可见，框内只有肤色；包在**画面右侧**（人物自己的左侧），酒红长领带不丢失。
- 右：纯背面，同一灰蓝包在**画面左侧**（人物自己的左侧），不是突然变双肩背包。
- 若实际图只出了眼睛或有任何视角变包背法，直接不通过。不承诺文字版一轮能完全修复。
