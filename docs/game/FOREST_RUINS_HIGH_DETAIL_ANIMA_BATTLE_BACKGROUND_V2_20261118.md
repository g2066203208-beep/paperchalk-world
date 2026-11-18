# 森林遗迹战斗场景高精修正版｜Anima 提示词 V2（2026-11-18）

> 状态：**用户待 Anima 实际生成/审核的候选提示词**。不声称已经由 Anima 输出；不得 AI 重绘批准人物。没有使用 LoRA 或 @画师风格标签，不含 `safe`。

## 观察和问题
- 比较图片：用户在本聊天上传的 1536×1024 森林遗迹场景；GitHub 真实原画 3人、5人合成截图。角色真实来源 `site/assets/characters/monster-hunters/02-blood-physician.png`、`site/assets/characters/crimson-vampires/pureblood-empress.png`、`site/assets/characters/wonder-circus/ringmaster.png`、`site/assets/characters/witch-workshop/grand-witch.png`、`site/assets/characters/demon-merchant/shop-owner.webp`，不允许重新生成替代这些人物。
- 原画是精细有力的深色线条与块面阴影；旧遗迹图中远景/石墙笔触块状概括、正中背景偏亮、地面偏土黄且缺乏足部接触细节。
- 不应通过“降清晰度/加虚化”匹配人物；应强化战场中景石材线条、材质边界、明暗结构，远处再适度概括。角色不直接由场景图片画出。
- 《骰子浪游者》（DICEOMANCER）参考：借用“远景氛围—中景敌人—下方手牌UI”的信息层次，**不复制具体布局或画面**。官方地址 https://store.steampowered.com/app/2501600/DICEOMANCER/ 。
- 官方 Anima Base 模型卡：https://huggingface.co/circlestone-labs/Anima 。30–50 Steps、CFG 4–5；ER SDE 中性/干净线条。Anima 不保证精确像素定位，硬性位置用程序调。

## 游戏 UI 合成坐标建议（非扩散模型精确约束）
- 母图 1536×1024，镜头前视略俯、浅透视，不做大广角。
- 大角色图与现有站位继续匹配：角色宽度可变，主要轮廓约 x=180–1360、y=125–700，脚底共线约 y=670–705；角色横排三人优先，五人做压力测试。
- 敌方血量条/行动意图位于头部外上方的 UI 层，背景上方不可亮白；如出现重叠，程序按站位数据调整。
- 底部 y=730–1024 是我方卡牌/骰子等覆盖区，画面仍为自然连续地面但颜色纹理低对比；不画 UI。
- 同一场景的材质要“中景细而精；远景有空间概括”，不要求背景远景每块砖的刻画都和人物一样细。

## Anima 正向提示词（无风格 LoRA；复制整段）
```text
masterpiece, best quality, highres,

finished premium 2d anime fantasy game environment illustration, intricately drawn ancient forest ruins, crisp and elegant ink linework, confident thin dark outlines, precise architectural drawing, refined cel-shaded forms, clean hand-painted color shapes, high resolution environmental artwork, visually consistent with highly detailed anime character illustrations.

A wide, frontal battle environment inside an overgrown stone sanctuary in an old forest. Eye-level to slightly elevated camera, restrained perspective, broad horizontal composition. A complete believable place, not an empty theatrical stage. A long continuous level stone-and-earth fighting ground fills the middle of the composition, providing an unobstructed clear horizontal standing surface for several large full-body characters arranged side by side. The standing ground is level, not a raised platform, with clear contact surfaces at the center and on both sides.

The middle distance is backed by old dark slate masonry, partially collapsed narrow arches, mossy retaining walls, aged weathered limestone blocks, ivy and carefully placed deep green foliage. These structures are low-contrast and visually quiet behind the characters, yet individually crafted: fine chipped stone edges, clean mortar joints, small moss tufts, carved stone reliefs, roots following the cracks and subtly different stone surfaces. Rich detailed stonework is concentrated around the standing ground and along the left and right edges. Larger tree trunks, ruined columns and clusters of leaves frame only the outer margins.

Behind the standing area, dark muted green-gray trees and shaded ruins form a soft mid-value backdrop, avoiding a large bright sky opening directly behind the characters. A glimpse of distant pale blue forest mist and smaller arches appears only in the upper distance. Soft atmospheric perspective simplifies distant details but preserves sharp, finished drawing and believable layered depth around the battle area.

Beautiful controlled daylight enters from the upper left, producing consistent soft shadows on the ground and elegant directional highlights on stone edges and leaves. Gentle cool blue-gray ambient fill in the shade, restrained warm sunlight on limestone, delicate reflected light from the ground. Natural contact shadows under stones and roots, subtle local occlusion where masonry touches earth. Balanced luminous atmosphere without exaggerated glowing effects or blown-out whites.

Sophisticated restrained palette of slate gray, muted olive green, warm limestone and desaturated brown. Crisp cel-shaded shadow planes, carefully defined volumes, precise small material accents, polished cohesive anime game art. A calm, readable middle background that supports bright red, white, black and green fantasy character costumes without losing their silhouettes.

The foreground is continuous unobstructed stone-and-earth ground with fine low-contrast texture and calm broad color areas, suitable for interface overlays at the bottom of the screen. No central furniture, no pedestal, no stairs across the standing zone, no podium. Empty environment only, no people, no creatures, no standing figures, no playing cards, no dice, no slot machines, no interface, no lettering.
```

## 负向（项目标准六项，不添加内容类词）
```text
worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark
```

## 首测参数
- Anima Base / 1536×1024 / er_sde / 35 Steps / CFG 4.5 / 随机 Seed 记录实际值。
- 先独立 txt2img 测试构图与质感；如果原图布局更重要，另做 img2img 参考原图尝试，建议去噪强度 0.5–0.65 作为**实验起点而非官方推荐值**，观察是否过度保留旧场景粗笔触。模型对绝对布局控制无保证。
- 首轮完成后将 GitHub 的三张批准原画实际叠加同一张背景，**头部及服装保真、脚底接地、白衣辨识和 3/5 人拥挤**分项验收。禁止用重新绘制的 AI 角色冒充实际游戏效果。
- 动态受光/环境色/真实接触阴影是引擎阶段任务；Anima 背景本身不能直接完成原始人物的逐像素光照匹配。
