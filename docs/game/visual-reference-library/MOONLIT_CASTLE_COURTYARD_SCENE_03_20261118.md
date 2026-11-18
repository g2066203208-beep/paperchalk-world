# 月下古堡庭院 — Scene 03（三维可探索场景，2026-11-18）

## 目标与正确游戏入口
接在 **Scene 01 褪色的会客厅 → Scene 02 古堡长廊** 后。第三场景命名 **Scene 03 月下古堡庭院**。它不是新网页/AI 画的假截图，而是和原来游戏共享 Three.js scene 的一组真正三维网格，复用 Anima 猎人医生、镜头、投影阴影、A* 行走、触摸/桌面交互、任务快捷条与场景淡出淡入。

游戏入口： https://g2066203208-beep.github.io/paperchalk-world/card-battle/anima-paintover-lab.html

GitHub 主菜单按钮：**古堡探索 · 三场景**。

## 实际提交的源码
- `site/card-battle/engine/anima-courtyard-scene.js`: 新增 `createCastleCourtyard({THREE,scene,materials,compact})`；独立根组 `playable-castle-moonlit-courtyard`。约 15×13 的真实石砖庭院、有厚度的庭院地板、3D 铺石（`THREE.InstancedMesh`，低 draw call）、后墙及左墙、剖面式低矮前/右围墙、不遮挡人物的正门入口、后方哥特铁门与纹理实体、左侧柱廊、石窗、破损喷泉实体盆壁及浅水面、弯折枯树与树根、残破祭坛和散落石块、苔藓/攀藤（合批实例）、冷色月光与暖色火把。
- `site/card-battle/engine/anima-hall-gameplay.js`: 增加 `courtyard` room、独立 A* 地图约束和喷泉/树/祭坛避障；长廊的 `sealed` 尽头石门开放为庭院入口；庭院 `courtyardBack` 交互原路返回长廊，角色世界对象真正 reparent；既有会客厅取证和长廊钟铃保持。
- `site/index.html`: 原主菜单入口改为“古堡探索 · 三场景”，仍然进入同一个已有页面。
- `tests/anima-hall-gameplay-browser.mjs`: 桌面 1440×900、手机 390×844、横屏 844×390 的真实 Chromium 测试流程从会客厅实际取证/开门→长廊→石门→庭院→调查喷泉→返回长廊→回会客厅。测试断言真实庭院网格超过 45、marker=4、roomCount=3、四次转场，保存 PNG 和 WebM。
- `tests/anima-courtyard-scene-unit.mjs`: 本地代码/构件单元契约，通过。
- `.github/workflows/anima-hall-gameplay-qa.yml`: 包含新增源文件、node 语法和单元检查，以及完整实际浏览器路径；输出三机截图视频 artifact。

## 美术与玩法规则
1. 不允许把庭院做成一张 Anima 全景图；场景是纯三维几何、贴图是单元素材映射。已有 Anima 人物图保留原比例。
2. 镜头从 +X/+Z 看进真实空间，前方和右方必须剖面式矮墙和入口缺口。**历史长廊事故：完整近景墙遮住整个游戏**，绝不能复发。
3. 高优先级是可读的单张实机截图：人物接地、场景透视一致、前景别盖住人物；桌面、竖屏、横屏都要能看到庭院。
4. 进门位置 `courtyard (x=0,z=4.12)`，出门走到 `courtyardBack [0,4.16]`，回到长廊石门前 `corridor (x=0,z=-5.87)`。庭院喷泉中心 [-1.2,-1.25] 设障碍，树在 [3.37,-3.3]，祭坛 [-3.96,-4.72]。
5. 实际材质使用项目可替换的环境 painter materials + 独立程序模型；**这不是最终 Anima 手绘素材、最终光影或已经验收的视觉品质**。
6. 截图和浏览器验收须基于真实运行结果。仅提交脚本/源码、通过语法检查**不能冒充**实机已通过。GitHub Actions 成功日志与截图须后续明确检查再声明。

## 后续建议
先看三机真实截图，优先检查场景是否被墙遮挡、3D 空间尺度、手机纵屏可读性、FPS；然后替换石砖和墙面 Anima 单元素贴图、雕刻喷泉和树的特征造型，继续完善声音和日夜照明。**不要突然再回卡牌设计**，当前用户明确要求优先继续搭建完整 3D 场景。
