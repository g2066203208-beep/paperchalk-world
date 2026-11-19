# 七席人物卡主游戏：人物下方叠放手牌、复用老虎机 3D 物理演出
日期 2026-11-20

## 用户这轮明确纠错
> 每个人物的手牌都叠加在人物牌下面啊！还有美术画面布局动画效果，我让你做到的老虎机白做了吗？我们的物理效果用起来啊！

**本轮施工不能再做下方一整排公共技能手牌 / 公共人物牌堆。** 不是 Anima 绘画提示词，直接把实际托管的游戏改好。原游戏机制“七个敌卡位、七个我卡位、人物上场解锁其独立牌堆、手动摸牌、出牌可打队友也可打对面”保留。共享手牌总上限 10 只作为规则，不是公共 UI 区。

## 已按此目标接入的源码
1. `site/card-battle/character-card-machine.html` 与 `site/card-battle/seven-seat-battle.html`：敌我七列每个卡位变成完整人物卡列，人物卡正下方叠放该人物的纸质卡背/已抽技能卡。牌堆使用用户已批准的深酒红金丝原卡背；卡槽和纸张无粗厚金属包框。每个人的卡组开关都与其座位固定绑定，空座位卡堆确实是空的。没有以前独立的 `deck-section`、`hand-section`。
2. `site/card-battle/seven-seat-battle.mjs`：按 `ownerId` 将共享存储的手牌映射到对应人物的局部口袋 `.person-pocket`，每张人物牌下方保留实际 `.pocket-deck` 实体卡背和 `.pocket-mini` 叠牌。只点/触摸这名人物的牌背才会抽这名人物的卡；点其叠牌展开局部 `#owner-fan`，其它人物牌不动。局部展开的每张行动牌可选择己方或敌方人物目标，不改变原卡组规则。敌方各个已上场人物下面也有一张背扣的实际行动意图卡，对应 `endRound` 每人一攻，不虚构玩家不可查看的大量手牌。
3. `site/card-battle/motion/seven-seat-card-physics.mjs`：**真复用**旧老虎机的 `vendor/three.module.js`、`coin-payout-lighting.mjs` 的真实 PBR 环境 PMREM、灯光和金属材质、`character-card-sequence.mjs` 的 2350–2990ms 实体卡 3D 翻面时序、`card-image-relief.mjs` 的颜色→法线/金属/粗糙度图、`card-physical-edge.mjs` 的细纸板切边。卡牌离开候补/牌堆后在透明 WebGL 层中以**半隐式 Euler + 弹簧阻尼 + 着地速度反弹**轨迹飞入指定人物/目标，不再只用 CSS opacity 装样子。角色静态立绘和 UI 仍是 DOM 和实际用户原画，升级灯光的是运动的实体卡和实际按原灯光渲染的特殊演出，不宣称整张牌桌每个静止 UI 都是真 3D。
4. `site/card-battle/motion/seven-seat-card-physics.mjs` 的 `victoryCoins(36)` 使用**原老虎机的真实** `FastCoinPayout`、`FAST_DT`、`COIN`、`prepareExtrudedSprite`、`buildLowPolyPixelCoin3D`、`upgradeCoinMaterials`；原十边形金币 SVG `site/card-battle/assets/slots-style-pixel-coin.svg`，最多模拟 36 枚（容量 40），用实例绘制节流，防止新 UI 再次出现 500 硬币巨卡。打败所有敌人后的奖励演出自动调用该物理系统。
5. `tests/seven-seat-battle-browser.mjs`：桌面 1440×900、手机竖屏 390×844、手机横屏 844×390。检查 7+7 列卡牌、每人实体叠牌、未部署无牌堆、摸牌与所属人物一致、展开卡片、打队友和对面、攻击/护盾伤害、拖动操作、真实 3D 网格、旧灯光/翻面时序、真实十边形金币模拟和屏幕实际像素宽度。截图/录像必须保存，测试失败不得谎称全过。
6. 历史 3D 角色抽卡机完整保留在 `site/card-battle/character-card-machine-legacy.html`，新主游戏主入口仍为 `site/card-battle/character-card-machine.html`，绝不可删除旧机与原美术资产。

## 视觉质量验收标准
- 任何时候都看得见上下两排七个卡位；首关敌方预置三张，其余不是假人物。
- 每个已上场人物的个人牌堆**都直接压在对应人物牌的下方**；新抽出的牌从自己的卡背抽出来，再叠到自己下面；不是放在独立大栏。
- 抽牌/部署/出牌能看到有体积的纸牌翻转、纸张厚度/灯光、惯性和目标撞击反馈；伤害/治疗/盾有不同反馈；结算不是只刷新数字。
- 金币获胜奖励必须是真运行旧 `FastCoinPayout` 三维接触模拟，不得叫纯 CSS 金色圆点“复用金币物理”。
- 关卡精美原画保持原始比例、无白底、无粗金边，横屏/竖屏各截图检查，确保七列在屏幕宽度内真实可点。
- 注意：基于弹簧的过场卡牌是 arcade 物理近似；`FastCoinPayout` 的碰撞也是明确注明保守 disc 的 spatial hash approximation，不声称精确凸多面体 SAT。
