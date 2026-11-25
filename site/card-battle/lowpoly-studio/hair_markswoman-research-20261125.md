# 猎人枪手发型：V19 前的技术研究（2026-11-25）
## 阅读过的资料
- C&R TECH-COYOTE： https://3d.crdg.jp/tech/archives/844 — 先用板面锁定剪影，再复制背面并局部加厚；后发边线沿毛流；多角度验证。
- 六色： https://note.com/rikuhayasaka/n/n5ab4a25233d1?hl=en — 平面用于刘海和细节；菱形/梯形截面用于有厚度的发束；Shrinkwrap 用于隐藏底层，Solidify 可用权重控制发尾厚度。
- UCBUGG: https://www.ucbugg.com/labs/modeling/polygon-hair-modeling — 长马尾案例，后发先在头皮上画朝扎点汇聚的曲线再沿曲线扫掠；底壳只能藏在发束下面填缝。
- Autodesk AREA Japan: https://area.autodesk.jp/column/tutorial/maya-lowpoly/02-setting-start-modeling/ — 原画相机参考、多角度验证，不能仅满足单一投影。
- Ann oon: https://annoon.net/character-modeling-hair — 先排列平面发片再加厚，反复检查交叠。
- 赛马娘低模候选作者：えすけび @esukevi，2024-11-04 低模タキオン，出处 https://umamusume-pakamusu.blog.jp/archives/27316690.html 。尚未确认是否为此前用户指定作者，不声称已获得其网格或逐帧分析。
## 本项目硬约束
原画 site/assets/characters/monster-hunters/04-bounty-markswoman.png 是造型依据；不借用赛马娘角色的具体发型。纯色，不使用原画裁切纹理、高光贴图或渐变。V45人体不变。
## 执行顺序
1. 在原画近似视角标注发根尖角、主前发斜折边、窄前发、露耳边界、扎点和马尾端点。先匹配二维剪影，再调深度。
2. 前发以独立折面片制作，主折脊由几何提供，局部加厚但不统一圆管截面。
3. 后发先定义从发缝/额侧到低扎点的毛流，再逐束沿头皮曲线抬升，边缘逐渐收薄。相邻发束有明确的覆盖关系，避免交叉杂面。不可见的底层才负责填补露头皮的缝。
4. 低马尾使用数条独立、宽窄变化的折面发束，统一从扎点出发。
5. 四边形优先，减面在剪影稳定之后。每次交付实际四视图与360° GIF，检查后脑、侧面、俯视、原画视角，保留上一版。
6. 当前仅为研究记录，不代表V19模型已完成。