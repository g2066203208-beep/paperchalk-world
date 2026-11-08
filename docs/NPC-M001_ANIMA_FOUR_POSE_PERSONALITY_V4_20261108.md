# NPC-M001｜四格 Anima 提示词 V4：有生活感的人物（2026-11-08）

> **待生成，待用户审核，绝非已批准素材。** 按用户确认成功的 M003 原始提示词结构写作，而非 V3 过长说明。重要改进：M001 有自己固定的生活习惯、微妙神态、专属手部动作，而非机械站姿加统一坐姿。已批准的 M003 原图与提示词完全不动。

## 角色小传（候选设定，不冒称用户已批准）
- 身份：年轻普通男乘客，晚班后归途；不擅长闲聊，却会给别人让座；喜欢独处，常带一只小小的旧布饭袋节约花销。
- 生活状态：一天工作结束，疲惫、困倦，又怕在公共场合睡过站。越努力撑住眼皮，头越会向前轻点。
- **动作识别度：** 第四格正面坐着，两脚着地，两膝向前，一只手轻托脸颊，另一只手松松握着旧橄榄绿布饭袋提手，眼皮下垂、肩膀松下去、脑袋困得点头。与 M003 老爷爷正面坐着看报纸完全不同；与 M002 手机女乘客也不同。
- 固定服装：黑短发、深蓝敞开夹克、米白 T 恤、炭灰直筒裤、灰白运动鞋。无换装；配件布饭袋是**第四格独有的手持生活道具**。
- 前三格仍是纯正面、纯 90° 左侧面、纯背面**静止站姿**；第四格严格正面特殊动作。所有格同一人、同一套衣服。

## Anima Positive Prompt（完整可直接复制）
```text
safe, @akipekostyle, <lora:akipekoanima_v1_1:0.65>, character sheet, multiple views, four full body depictions of the same young adult man, short slightly messy black hair with a neat fringe, narrow tired eyes drawn as tiny simple lines, small nose, small mouth, slender ordinary build, dark navy casual jacket worn open, off-white crew-neck t-shirt, charcoal straight pants, gray-white sneakers, a quiet and considerate young commuter returning home after a long shift, simple anime style, clean lineart, flat colors, simple cel shading, muted colors, white background.

Four separate depictions of exactly the same young adult man in one horizontal row, from left to right.

FIRST: EXACT FRONT VIEW, standing still, face looking directly forward, both shoulders facing the viewer, symmetrical frontal body, slightly tired relaxed shoulders, arms hanging naturally, both feet on the ground.

SECOND: EXACT 90 DEGREE LEFT SIDE PROFILE VIEW, standing still, entire body facing left, only one side of the face visible, shoulders and chest seen strictly from the side, feet pointing left, arms relaxed.

THIRD: EXACT BACK VIEW, standing still, entire body facing away from the viewer, back of head and navy jacket visible, arms at sides, both feet on the ground.

FOURTH: EXACT FRONT VIEW, sitting on an invisible seat after a tiring work shift, torso and shoulders facing directly toward the viewer, both knees pointing forward, both shoes facing forward and touching the ground. He is trying not to fall asleep: his heavy eyelids droop, his head dips in a tiny involuntary sleepy nod, and his shoulders sag. One hand loosely supports his cheek, while the other loosely holds the handle of his small worn dark-olive fabric lunch bag between his knees. His expression is tired, quiet and a little self-conscious, not smiling for a portrait. Natural asymmetrical human seated posture, no chair visible.

The exact same face, hairstyle, open dark navy jacket, off-white t-shirt, charcoal pants and gray-white sneakers in all four depictions. The jacket is worn open over the t-shirt in every pose, including the seated pose. The small worn lunch bag appears ONLY in the fourth special action and has no lettering or logo.

Four full body figures, evenly spaced, consistent proportions, no furniture, no chair, no bench, no environment, isolated figures, simple background.
```

## Anima Negative Prompt（完整可直接复制）
```text
three-quarter view in first pose, front view in second pose, three-quarter view in second pose, front view in third pose, side view in fourth pose, three-quarter view in fourth pose, turned torso in fourth pose, walking, running, stepping in first three poses, different outfits, different jacket colors, missing jacket, missing t-shirt, closed jacket, different hairstyles, different faces, stiff straight-backed fourth pose, fully awake cheerful fourth pose, reading newspaper, checking smartphone, lunch bag in first three poses, chair, bench, subway seat, furniture, background scenery, excessive shading, excessive fabric folds, cropped feet, cropped head, extra characters, text, watermark
```

## 生成与 QA
- 首测暂沿用已批准 M003 提示词中的 `@akipekostyle <lora:akipekoanima_v1_1:0.65>` **文本配方**，并非已核实 PNG Info 里的真实权重。
- Anima Base（非 Turbo），ER SDE / 35 steps / CFG 4.5 / 1536×1024 横向，属于项目起始参数；实际生成可能需要对照，不保证四格自动严格成功。
- 白色预览背景需要后期抠成真实 RGBA，不能把白底当透明。全身、手、鞋不能被裁。
- 第二格如果不是严格朝左 90° 侧面，第三格如果不是纯背面，第四格不是正面打瞌睡，或丢失外套/布饭袋，都不得批准。
- 正式图像没到 GitHub、用户没批准之前，禁止设定 `artApproved`、`production` 和 `render.ready` 为 true，也不得在游戏里代替老爷爷。
- 行为与场景许可依然归游戏任务，不能仅因“通勤者”就随机把此 NPC 刷在任何车厢。
