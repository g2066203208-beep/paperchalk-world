# 骑士团｜三名普通小兵 Anima 完整提示词（2026-11-12）

> 本文件是 **现有六个阵营流程重新轮转到骑士团** 时创建的最新候选提示词，不是三张历史 PNG 的原始生成提示词，也不是重新批准的图片。原有七人组与三名小兵 PNG、SHA、正式展示页面保持不动。

## 1. 权威依据

- 全阵营最新统一硬规则：[FACTION_MINION_CHARACTER_IDENTITY_AND_PROMPT_RULES_V1_20261111.md](FACTION_MINION_CHARACTER_IDENTITY_AND_PROMPT_RULES_V1_20261111.md)。
- 现有七位骑士团成员参考：[骑士团七人展示页](../../site/character-editor/knight-booth.html)；角色分别为骑士长、骑士、军士、旗手、弩手、随军司铎、斥候。
- 已上传的三张旧版骑士团小兵原图：[minions/README](../../site/assets/characters/knight-order/minions/README.md) 与 [机器清单](../../site/data/art/knight-order-minions.v1.json)；不得覆盖。
- Anima 官方说明：https://huggingface.co/circlestone-labs/Anima/blob/main/README.md#prompting 。模型允许自然语言与标签混写，用户针对本批小兵明确要求删去 LoRA、画师和风格标签。

## 2. 硬性规则

- 三人分别是 `loli` 萝莉型、青年少女型、成年成熟丰满型，**完整不同的女性**，且第一人正向文本必须字面包含 `loli`，该类型不添加性感表述。
- 三人共享**完全相同**的骑士团普通剑兵制服：深海军蓝及膝开衩长袖上衣、胸前刻有深色十字标的朴素拉丝铁胸甲、两块窄肩甲、普通铁护臂、窄棕皮腰带/方铁扣、左腰入鞘的细直剑、深色长裤、棕色皮手套、棕色平底短靴。只按骨架调整尺码；不得把萝莉型变成轻装、成熟型变成全身重甲。
- 只有日常对话演出级别的自然小动作，脸、手、胸甲与衣摆无遮挡；不挥剑、不举盾、不蹲地、不做战斗海报或固定性格夸张表情。
- 输出目标 672×1024 竖版，单人全身、四周留大安全边距，背景要求透明；实际 PNG 是否有 Alpha 必须在图像生成后检查。
- 正向绝不出现 `safe`、LoRA、`@` 画师、画风词。每人独立完整提示词及 **同一份** 通用六项负面，不依赖上一条内容。

## 3. 完整 Anima 提示词

### 01｜萝莉型骑士团小兵

**正向：**

```text
masterpiece, best quality, 1girl, solo, loli, very short petite girl, distinctly diminutive height, small narrow shoulders, short slim legs and a small nonsexualized frame, very round soft face, full youthful cheeks, short rounded chin, wide round golden-brown eyes, thin gently arched eyebrows, small button nose, tiny closed lips, fair peach skin, fluffy light honey-brown chin-length hair with short curved bangs, two uneven little locks tucked behind the ears. She is a unique individual rather than a smaller duplicate of another knight recruit. She wears the identical standard medieval knight order infantry uniform: a dark navy blue long-sleeved fitted tunic with a straight knee-length blue skirt panel and short side slits, a simple brushed iron breastplate with one small engraved dark cross insignia centered on the chest, two narrow matching iron shoulder guards, plain dark steel forearm guards, a narrow dark brown leather waist belt with a single small square iron buckle, a plain sheathed straight sword hanging neatly from the left hip, dark fitted trousers, dark brown leather gloves, and dark brown flat leather ankle boots. Every part of this uniform keeps the same materials, colors, seams, badge, belt, sword placement, gloves and boots as the other two recruits, adjusted only to fit her much smaller frame. Her expression is natural and neutral. She stands with her feet close together and one foot gently turned outward, both gloved hands lightly meeting in front of her waist belt, as though she has just settled into a comfortable attentive standing position. A single isolated full-body character for a dialogue scene, nearly frontal view with only a slight natural shoulder angle, standing upright and centered. Her face, both arms, both hands, the entire tunic hem, the complete sword scabbard, both legs and both boot soles are fully visible and contained inside the canvas. Leave generous empty space above her head, beside both elbows and below her feet. Transparent background.
```

**负面：**

```text
worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark
```

### 02｜少女型骑士团小兵

**正向：**

```text
masterpiece, best quality, 1girl, solo, young adult woman, average height, toned slender athletic proportions, long oval face with a delicate angular jaw, narrow almond-shaped slate-gray eyes, straight brows with a modest upward tilt, refined straight nose, a small defined mouth with naturally level corners, light olive skin, smooth deep chestnut hair in a high tied-back ponytail with a clean off-center fringe and two short strands beside the cheeks. Her face, eyes, nose, hair, height, body structure and skin are completely different from those of the other recruits. She wears the identical standard medieval knight order infantry uniform: a dark navy blue long-sleeved fitted tunic with a straight knee-length blue skirt panel and short side slits, a simple brushed iron breastplate with one small engraved dark cross insignia centered on the chest, two narrow matching iron shoulder guards, plain dark steel forearm guards, a narrow dark brown leather waist belt with a single small square iron buckle, a plain sheathed straight sword hanging neatly from the left hip, dark fitted trousers, dark brown leather gloves, and dark brown flat leather ankle boots. The tunic, breastplate, shoulder guards, cross badge, forearm guards, belt buckle, sword sheath, trouser cut, gloves and boots have the identical uniform design as those worn by every recruit, merely sized to fit her. Her expression is neutral and focused without a fixed personality performance. She stands balanced with her weight on the left foot and the right foot a little behind, one gloved hand resting loosely near the top of the sword scabbard without drawing it, the other arm hanging comfortably with the elbow gently relaxed. A single isolated full-body character for a dialogue scene, nearly frontal view with only a slight natural shoulder angle, standing upright and centered. Her face, both arms, both hands, the entire tunic hem, the complete sword scabbard, both legs and both boot soles are fully visible and contained inside the canvas. Leave generous empty space above her head, beside both elbows and below her feet. Transparent background.
```

**负面：**

```text
worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark
```

### 03｜成熟丰满型骑士团小兵

**正向：**

```text
masterpiece, best quality, 1girl, solo, tall mature adult woman, clearly mature facial bone structure, long softly rectangular face, pronounced high cheekbones, a defined lower jaw with a slightly broad rounded chin, narrow deep teal eyes, low-set strong brows, a longer straight nose with a distinctive tip, naturally full lips, warm bronze skin, thick dark auburn hair arranged in a large woven crown braid leading into a heavy low braid down her back with a few naturally wavy temple strands. She is visibly a different person from the other recruits: an adult voluptuous build with a full bust, broad mature hips, clearly defined waist, strong shapely thighs, fuller shoulder frame and taller longer-legged proportions. She wears the identical standard medieval knight order infantry uniform: a dark navy blue long-sleeved fitted tunic with a straight knee-length blue skirt panel and short side slits, a simple brushed iron breastplate with one small engraved dark cross insignia centered on the chest, two narrow matching iron shoulder guards, plain dark steel forearm guards, a narrow dark brown leather waist belt with a single small square iron buckle, a plain sheathed straight sword hanging neatly from the left hip, dark fitted trousers, dark brown leather gloves, and dark brown flat leather ankle boots. The same breastplate is properly shaped and sized to sit over her fuller adult chest, while the badge position, tunic hem construction, shoulder guards, arm guards, waist belt, sword sheath, gloves and boots remain identical to the other two recruits, with no different armor rank or extra ornaments. Her face is calm, composed and emotionally neutral. She stands upright with one leg bearing slightly more weight, her right gloved hand subtly straightening the cuff of her left glove while both arms stay near her body, a reserved natural gesture suitable for a dialogue portrait. A single isolated full-body character for a dialogue scene, nearly frontal view with only a slight natural shoulder angle, standing upright and centered. Her face, both arms, both hands, the entire tunic hem, the complete sword scabbard, both legs and both boot soles are fully visible and contained inside the canvas. Leave generous empty space above her head, beside both elbows and below her feet. Transparent background.
```

**负面：**

```text
worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark
```

## 4. 状态

- 新版三名骑士小兵正负提示词：**完整已保存，待生成和用户验收**。
- 历史三张 PNG：**已验证并入库，不修改、不删除、不重命名**。
- 不把新候选提示词冒充为历史已批准图片的生成参数。
- 若用户修改外貌或动作，必须修改本文件中该人物的**完整正负提示词**。