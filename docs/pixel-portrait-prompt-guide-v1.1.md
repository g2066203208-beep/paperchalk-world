# PIXEL ATELIER｜日本像素人物立绘参考 × Anima/MOSS 规范 V1.1

当前重点是精致完整的人物立绘，不是24×24小人、场景或伪像素。当前人物立绘研究网格建议192×256或256×512；二者是研发选择而非已定最佳尺寸。

## Anima提示词规则
格式：[质量/年份/安全] → [人数] → [原创人物/作品] → [@画师标签（仅实测后）] → [身体、面容、发型、服装、姿势、像素技法、背景]。
英文逗号隔开的tag，普通标签使用空格；可自然语言混用；safe是本工作室原创常规人物默认安全级别。输出建议单行，不能误认为官方禁止换行。
画师真实存在≠Anima必然认识对应画师标签≠作品允许训练。我们目前记录的像素艺术家@tag全部unverified，不能自动注入提示词。
参考作品作者与训练授权分开审查。任何第三方人物素材都不能直接当高质量训练集。

## Anima人物立绘正向（概念参考）
masterpiece, best quality, safe, 1girl, solo, original character, full body, from head to toe, feet visible, standing, three-quarter view, mature facial proportions, expressive eyes, medium-length asymmetrical hair, coherent anatomical proportions, distinct shoulders, separate legs, readable hands, layered simple clothing, plain ankle boots, japanese pixel art inspired, detailed character sprite illustration, coherent color clusters, controlled stair-step outlines, limited matte color palette, crisp hard-edged shadows, clear silhouette, plain light background

## 负面
worst quality, low quality, blurry, jpeg artifacts, bad anatomy, cropped, cut off feet, missing arms, fused legs, extra limbs, glossy skin, excessive highlights, painterly gradients, random pixel noise, watermark, text

## MOSS自然语言参考（与Anima tag语法分开）
Create one original full-body Japanese-game character concept. Show head, hair, hands and shoes completely in a clean three-quarter standing pose. Use a distinctive face shape, intentional eye placement, coherent shoulder-waist-leg proportions, well-designed simple layered clothing, a small coherent matte palette, crisp readable color groups and a neutral plain background. This is a concept reference; do not falsely claim native grid integrity.

## 真正像素验收
精修在原生离散网格完成，α只为0/255，一格一色。逐格查五官、发丝大块、人体连接、腿脚、衣服阴影等；最近邻只用来展示。不把Anima/MOSS高清图缩小叫做原生完美像素。

## 重点参考作者与作品
- hinyari9 | 《溶鉄のマルフーシャ》 | 未公开 | https://molteniron.lsv.jp/ | 日系全身像素角色，研究五官、头发、制服、腿与手的结构 | 日本来源
- hinyari9 | 《救国のスネジンカ》 | 未公开 | https://snezhinka.ltt.jp/ | 同画风多角色对照，研究不同脸型、表情和服装 | 日本来源
- Sakulibera | 高精细像素人物/Live2D | 约256×512 | https://sakulibera.carrd.co/ | 标准款约256×512，全身、五官和动画拆分 | 日本来源
- 煮 / Nimono | 体型差异像素立绘 | ≤200×200 | https://nimono.moo.jp/00/ | 200×200左右、约30色以内，人物剪影和人体多样性 | 日本来源
- domoのドット絵 | RPG Girls角色合集 | 72×96 / 80×80 | https://booth.pm/ja/items/6301957 | 72×96、80×80原生人物，45页含部分过程图 | 日本来源
- 佐藤 / @satozz | Pixel standing sprite | 待核实 | https://goirai.jp/en/satozz | 日本创作者本人自述专长像素肖像/站立立绘 | 日本来源
- tsuki_kawa | 像素人物与表情 | 24–192 | https://skima.jp/item/detail?item_id=63833 | 24至192像素的原创人物和限制调色板 | 日本来源
- とけちゃん | TRPG人物像素立绘 | 待核实 | https://skima.jp/item/detail?item_id=63095 | 日本创作者站立人物和面部像素 | 日本来源
- SKIMA专项点绘画师（待核名） | 大型全身像素角色 | ~200px | https://skima.jp/item/detail?item_id=287720 | 长边约200像素，表情差分与全身游戏精灵 | 日本来源
- Sakami @pixelsakami | Full Body Pixel Sprite | 未公开 | https://vgen.co/pixelsakami/service/pixelart-sprite-full-body/252442bf-6c3b-4bf1-bef4-ab1075d6e6d8 | 全身PNG及待机GIF，作者地域未经核实 | 国际/地域未核实
- maszakap @masza001 | Full Body Character | 约96×128 | https://vgen.co/masza001/service/pixel-full-body-character-static-or-animated-/3a9bcbde-88dc-4471-aceb-145014a92cb0 | 约96×128原生人物，源工程与待机动画 | 国际/地域未核实
- riyu @sakanaito | 格斗游戏人物Idle | 未公开 | https://vgen.co/sakanaito/service/standard-idles/73ddf3b0-25f2-44a8-9d5e-49c28852d1a8 | 全身站姿动作，衣摆头发的动画像素 | 国际/地域未核实
- Peccuro | 半身/全身像素插画 | ~200×200 | https://vgen.co/Peccuro/service/pixel-illustration-/993e08f5-62a4-4f48-b691-06aec4ce592e | 200×200左右的角色与背景 | 国际/地域未核实
- juujarts | 全身像素表情动画 | 未公开 | https://vgen.co/commission/service/ec856b01-87c4-48a8-8c3f-ac194e447983 | 完整人物表情GIF，眨眼和嘴型差分 | 国际/地域未核实

## 资料使用限制
参考图片仅在网页上以原作者提供的URL引用，不入Git仓库，也不能进入LoRA训练集。画师标签缺少词表+同种子证据时全部标注unverified。旧的asaha、APO+、BAN8KU、m7kenji等研究保留为动画/场景二级档案，不混在人物立绘主画廊。

关键来源：
https://huggingface.co/UdonJP/Anima/blob/main/README.md
https://molteniron.lsv.jp/
https://snezhinka.ltt.jp/
https://sakulibera.carrd.co/
https://skima.jp/item/detail?item_id=264927
https://booth.pm/ja/items/6301957
