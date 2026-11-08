# SG02｜第二位学校女生黑皮辣妹 · 完整三视图 Anima V5（恢复 SG01 成功结构）

> **2026-11-08 用户纠错**：上次 V4 错误使用“仅侧面单人重绘 / 整身 inpaint”代替已通过的 SG01 三视图生产流程，实测效果反而更差。现**彻底撤销单人物侧面 inpaint 建议**。回到 [SG01 已成功的完整三视图范本](NPC_SG01_ANIMA_DYNAMIC_THREE_VIEW_PHONE_WALK_20261108.md)：同一模型、同一 LoRA 1.0、同一 tag 开头、同一三面分段、同一相机约束、同一柔和步行方式。SG01 已通过原图不动。
>
> 用户最近出图 SG02 **眼睛已解决**；人物视觉身份是深晒黑肤色、金色长发至肩下略带卷发尾、白衬衫＋松系酒红长领带、深海军蓝敞开西装、炭灰裙、小腿袜及乐福鞋，**保留这个身份**；三面侧面之前的角度仍待重新验收，不能宣称已经批准。不要把人物改回短发，也不要要求一个正侧面露出两个正面扣子。原先仅侧面提示词废弃，仅保留 Git 历史。
>
> 说明：2026-11-08 已复核 [Anima 官方模型卡](https://huggingface.co/circlestone-labs/Anima)；标签和英文自然语言可混用，Base 推荐 CFG 4-5、30-50 步、er_sde 中性平涂，但**官方不承诺单幅多视图角度绝对准确**。

## Positive Prompt（一次生成完整三视图）

```text
masterpiece, best quality, score_7, safe, @akipekostyle, <lora:akipekoanima_v1_1:1.0>, character reference sheet, character turnaround, multiple views, full body, tall teenage schoolgirl, deep suntanned skin, long honey blonde hair, relaxed walking, simple anime style, clean lineart, flat colors, muted colors, soft diffuse overcast lighting, white background.

A single character turnaround sheet with exactly three full-body drawings of the same tall Japanese high school girl in one horizontal row. She has a healthy slender build, long legs, warm deep golden-brown suntanned skin, and long honey-blonde hair with darker roots, a smooth layered shape and gently wavy ends falling below her shoulders. She has a small nose, a faint self-assured smile, no visible eyes, no eyelid lines or eyelashes. The eye area is left completely blank in all three drawings.

She wears the identical school uniform DESIGN as the female protagonist, styled in her own relaxed way: a very dark midnight-navy single-breasted school blazer with notched lapels, worn OPEN and unbuttoned, with the same TWO LARGE MATTE DARK WARM GRAY-BROWN ROUND BUTTONS with nearly black rims attached to its front. She wears a white collared shirt with the top collar button casually undone, a clearly visible LONG BURGUNDY NECKTIE with a loosened knot, a short charcoal-gray pleated skirt reaching mid-thigh, black mid-calf socks slightly scrunched down, and dark brown-black penny loafers. Her blazer remains open, her long tie remains on, and the uniform, button colors and hairstyle remain identical in every view.

LEFT FIGURE: Front view. She takes a small relaxed step toward the viewer. Her head, shoulders, chest and hips face directly forward. Her right hand lightly holds the open edge of her blazer near her waist, while her left arm hangs loosely with a natural walking swing. Her mouth shows a faint confident smile, with no eye details.

CENTER FIGURE: Left-facing side profile. The same girl takes a small natural step to the left in a true 90-degree side view. Her nose, shoulders, chest, hips and shoes all face LEFT. Only one side of her face and one ear are visible. Her torso is seen directly from the side, with the far shoulder hidden behind the near shoulder. One hand rests naturally beside her open blazer and the other arm swings gently as she walks. Her long blonde hair, white collar and loosely tied burgundy necktie remain consistent with the front view.

RIGHT FIGURE: Back view. The same girl walks slowly away from the viewer, with her head, shoulders, back and hips facing directly away. She takes a small comfortable step. One hand casually touches the ends of her long blonde hair near her shoulder, while the other arm hangs naturally. Her open navy blazer, short charcoal-gray skirt, black socks and brown loafers match the other views.

Three gentle everyday walking moments, slightly varied natural gestures, consistent face shape, skin tone, hairstyle, body proportions and clothing across all three directions. Three complete full-body figures evenly spaced on a clean plain white background. Neutral overcast ambient light, flat colors, minimal soft structural shading, no dramatic lighting or cast shadows.
```

## Negative Prompt

```text
worst quality, low quality, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, chromatic aberration, visible eyes, pupils, irises, eyebrows, eyelashes, eyelid lines, closed-eye curves, smiling eye arcs, detailed eyes, pale skin, different skin tones, different hairstyles, short black hair, black ponytail, different hair lengths, closed blazer, buttoned blazer, missing long necktie, bow tie, ribbon bow, missing white shirt, gold buttons, brass buttons, shiny metal buttons, one front button, three front buttons, different school uniform, long skirt, trousers, knee-high socks, thigh-high socks, tights, sneakers, high heels, smartphone, handbag, extra accessories, stiff identical poses, huge steps, running, jumping, exaggerated gestures, repeated front views, front view in center, back view in center, front view on right, side view on right, three-quarter view, angled torso, turned shoulders, looking backward, different characters, extra people, fourth figure, cropped head, cropped feet, hard shadows, rim light, spotlight, background scenery, furniture, text, watermark
```

## 固定参数
Anima Base · ER SDE · 35 steps · CFG 4.5 · 1536×1024 · `<lora:akipekoanima_v1_1:1.0>`。

## 验收
左正面／中纯左侧面 90°／右纯背面；真实图可能输出不同空间次序，切图时以实际次序登记，**但不能接受 3/4 斜侧冒充纯侧面**。不得画眼睛、闭眼弧线或睫毛；三视统一为晒黑肌肤、金色长发、敞开西装、两枚暖深灰棕哑光圆扣、松系酒红长领带，姿势自然且各不相同。SG02 在实际通过三视图验收以前不得写为批准母图。
