# 人物卡出卡机 · 3D 抽卡电影演出（2026-11-18）

## 用户新要求
继续老虎机项目，但新增「人物卡机」：抽取真实人物卡，不是发金币的材质换皮。必须让机器内部抽选、实体卡从实际出口出来、先露卡背、空中翻面、落定展示人物，全流程有机械力度和电影光影。先把交互、尺寸、镜头、动作、材质做好，再进一步精修美术，不生成假立绘。

## 已直接接入 GitHub
- **可访问的游戏路径**：`/card-battle/character-card-machine.html`（GitHub Pages 完整地址见下方）。
- **主菜单**：`site/index.html` 的「人物卡抽选机 · 3D 出卡」按钮。
- **3D 场景**：`site/card-battle/motion/character-card-machine.mjs`。复用已落地的真实 Three.js、`coin-payout-lighting.mjs` 里的 PMREM 环境、PBR 与 HALF_FLOAT HDR Bloom，不生成 AI 假画面。三只真实可旋转的筒形机械卷轴、实体机壳、奖口、金属边框、卡背、正面和发光环。原画贴到真实卡片平面上，保持人物原长宽比例，不改变 Anima 已批准立绘。
- **可重复的动作帧**：`site/card-battle/motion/character-card-sequence.mjs`，单次 3800ms。0–1160ms 第一列停转，1380ms 第二列，1600ms 第三列；1580–1890ms 出卡门开启；1760ms 卡背先从出卡口呈水平姿态射出；2350–2990ms 卡翻到正面，2850–3240ms 人物和光线揭晓，3800ms 定格。
- **真实人物池**：从 `site/data/art/seven-card-groups.v1.json` 直接读取已提交的 `wonder-circus`、`crimson-vampires`、`monster-hunters`、`witch-workshop`、`demon-merchant` 五组织，共 35 张已存在原画。没有使用清单声明未上传的强盗团，也没有伪造角色。
- **交互**：单抽、五连抽队列、组织筛选、跳过演出、电影辉光开关、音效开关、当前浏览器本地图鉴。连续抽取不覆盖上一张。
- **首版只做演示抽取**：不宣称人物稀有度、商业概率、保底或货币已经正式设定。不改变七大战斗职业、人物能力或主线内容。

## 客观测试与验收标准
- `tests/character-card-machine.test.mjs`：校验 35 张实际存在的原画、组织名单，机械停转、水平出卡、卡背不能提前翻正、全部动画时间戳和主菜单入口。
- `tests/character-card-machine-browser.mjs`：真实 Playwright Chromium + Three.js，在桌面 1440×900、手机竖屏 390×844、横屏 844×390 三尺寸以固定 ms 抓取 0、400、1550、2100、2700、3180、3800ms 截图并录 WebM，检查实际人物素材加载、金属材质、HDR、前后图像变化以及五连抽队列。
- `.github/workflows/character-card-machine-qa.yml`：CI 必须跑单测、Chromium WebGL；成功才保存实际截图到 `site/card-battle/qa/character-card-machine/`，并归档更多图像、视频。没有实测图片和人工目视对比，不能宣称「画面完美」「像素级还原」。
- **仍待验收**：远端 QA 绿灯、自动存回截图、真实手机帧率、体积厚度/手感、参考游戏类似出卡演出的逐帧参考素材。如今是原创剧情向人物卡机，并非原版 Slots & Daggers 出卡动画的逐帧复刻。

## 入口与持续交接
- [当前人物卡机](https://g2066203208-beep.github.io/paperchalk-world/card-battle/character-card-machine.html)
- [主菜单](https://g2066203208-beep.github.io/paperchalk-world/)
- [GitHub 源代码](https://github.com/g2066203208-beep/paperchalk-world/blob/main/site/card-battle/motion/character-card-machine.mjs)
- [QA 工作流](https://github.com/g2066203208-beep/paperchalk-world/actions/workflows/character-card-machine-qa.yml)
