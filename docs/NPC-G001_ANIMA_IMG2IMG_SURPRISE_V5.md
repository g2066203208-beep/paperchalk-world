# NPC-G001｜惊讶：全身大动作与共同目光方向 V6（2026-11-08）
> **用户关键纠正：** “正前方”指三个人的眼睛看向她们**面前的同一个场景事件**，**不是摄影机要正面平视**。游戏有统一透视摄像机，人物必须顺着空间关系转头转身。上一版要求 camera front view 属于误解，应删除。使用获批“喜悦”三人原图保身份；仍需要真正重编身体与脚步，不固定脚底或摄影机视角。

## 完整 Anima Base img2img 正向提示词
```text
masterpiece, best quality, score_7, safe, @akipekostyle, <lora:akipekoanima_v1_1:1>, <lora:anima_ref_adapter_pilot_r32:1>, 3girls, three close schoolgirl friends, full body, head to toe, school uniforms, sudden surprise, shocked, wide eyes, raised eyebrows, spontaneous movement, dynamic full-body poses, candid moment, natural interaction, three-quarter view, perspective, looking at the same object, looking offscreen, white background, simple background, clean lineart, cel shading.

The same three girls from the APPROVED original reference image, their recognizable faces, hairstyles and uniforms unchanged. Three friends chatting together suddenly notice the SAME unbelievable thing a short distance IN FRONT OF THEM, inside their own world. The unseen event is in front of the girls, NOT the photographer or the camera. All three direct their eyes and head angles toward ONE SHARED OFF-SCREEN TARGET in front of them, not toward the viewer and not in three unrelated directions. The camera keeps the natural perspective of the original scene. The girls can be seen at natural three-quarter or side angles according to their poses; do not force them to face the camera.

LEFT GIRL: the shortest girl with short dark chestnut bob hair, rounded cheeks and small brown eyes. She jolts backward, drops her weight, bends one knee deeply and takes a quick step sideways. One hand tightly catches the middle friend's sleeve; her other arm stretches sideways to catch her balance. She looks toward the unseen event in front of all three, her eyes widened and mouth slightly open in a short startled breath. BLACK socks, dark brown loafers.

MIDDLE GIRL: medium height, slim, light ash-brown shoulder-length softly wavy hair, small brown eyes. Her previous storytelling pose is completely gone. Her torso twists and lowers in a sudden movement, one leg steps out to steady her weight, one arm supports her left friend's forearm while the other lifts instinctively across her body. Her gaze quickly fixes on the SAME unseen event ahead. She gives a restrained astonished gasp, not an exaggerated scream. LIGHT GRAY socks, clearly visible straight dark burgundy necktie, dark brown loafers.

RIGHT GIRL: the tallest girl with the SAME thick dark low braid, slightly angular longer face, narrow brown eyes. She straightens sharply, takes a larger step in toward the others, turns her torso toward the unseen event in front of the trio, and instinctively reaches one arm across to protect or steady her friends. Her other arm swings outward with the sudden movement. She watches exactly the SAME unseen event, with eyebrows lifted, mouth slightly parted and alert disbelief. BLACK socks, dark brown loafers.

Three genuinely different full-body movement silhouettes: left girl recoils and grabs, middle girl twists and catches her, right girl steps in to steady them. Natural chain reaction between close friends, not independent posing. They may shift their feet, crouch, lean, overlap or move forward and backward in depth, without losing their identities. The overall scene keeps a believable perspective and floor plane. All three wear matching very dark navy blazers with two small MATTE near-black front buttons, white collared shirts, STRAIGHT DARK BURGUNDY NECKTIES on EACH girl, charcoal gray pleated skirts and dark brown loafers. SOCK COLORS: LEFT BLACK, MIDDLE LIGHT GRAY, RIGHT BLACK. Complete full bodies, all six shoes visible, comfortable white margins around the group, neutral shading, no background scenery, no painted ground shadow.
```

## 完整通用 Negative Prompt
```text
worst quality, low quality, blurry, 1girl, 2girls, 4girls, extra person, duplicated face, different characters, swapped identities, same old laughing pose, stiff lineup, posed group photograph, fashion pose, static standing, identical gestures, synchronized poses, hands pressed to both cheeks, all girls covering mouths, exaggerated screaming, cartoon exclamation marks, three unrelated gaze directions, looking directly at camera, eye contact with viewer, forced straight-on camera, flat orthographic lineup, front-facing police lineup, separate events, hands on knees, tiny movements only, deformed fingers, extra arms, fused bodies, cropped legs, cropped shoes, out of frame, missing necktie, ribbon tie, bow tie, gold buttons, metallic trim, wrong socks, black socks on middle girl, white socks on left girl, white socks on right girl, floating feet, heavy shadows, background scenery, text, watermark
```

## 本次验收
- **视线**：三人看向她们前方的**同一个画面外事件点**；不是看摄影机，也不是左看右看毫无关系。
- **镜头**：保留原图或游戏实际透视；允许自然的半侧脸、斜侧脸。不要正面平视强制三张脸对镜。
- **身体**：左后撤抓人、中扭身扶人、右跨步接应；腿、腰、手臂都应明显改变，与定稿喜悦动作不同。
- **身份**：三人仍然是固定A/B/C，不交换人物；袜色A黑/B浅灰/C黑、每人都必须有酒红长领带、深色扣子。
- **出图**：三人从头到鞋底全部完整，不裁切；留白、白底，场景真实投影由游戏制作。
- **SD**：优先保留用户实测已有效的 Anima Base img2img + ImageStitch + pilot_r32 的**现有成功配置**，避免无故更改所有参数；首轮35 steps/CFG4.5/ER SDE，img2img denoise可从0.80试，需根据实图评估。用户实际成功参数优先。
- 当前**提示词已更新，惊讶素材还未经用户最终批准，也没实装游戏**。

## 来源
- [项目场景摄像机](../site/game/scene-camera.js)
- [地面透视几何](../site/game/ground-perspective.js)
- [Anima环境清单](ANIMA_FORGE_NEO_INVENTORY_20261105.md)
