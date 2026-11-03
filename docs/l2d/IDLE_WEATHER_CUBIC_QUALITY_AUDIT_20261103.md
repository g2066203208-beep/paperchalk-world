# 女主 L2D 自然待机、微风、大风三级运动调校｜2026-11-03

## 用户验收标准

普通场景里人物身体近乎静止、发梢与裙摆微动；微风时逐级增强；大风时才出现较明显的发梢延迟和裙摆飘动。头皮、裙腰、手、脚、眉鼻不能跟着全身摇晃。不得修改女主批准的原始17正面+8背面 PNG 源部件、人物五官或128帧V4备份。

## 实装代码

- `site/l2d/part-rig.js`: 三档 `IDLE_PRESETS`、独立速度/相位滞后 `IDLE_RATES`、风浪平滑包络、骨骼根部蒙皮锁定、`approachIdle()` 平滑过渡，`profileVersion:3` 升级。
- `site/character-editor/part-rig-studio.js`: 「静止／普通待机／微风／大风」一键预设，平滑预览、自定义滑块保留风力档（`weather` 与 `preset` 分离）、强度1%刻度、细分刘海与裙子。
- `site/l2d/library-player.js`: 游戏仍使用完全相同的 `PaperchalkPartRigCore` 渲染，避免编辑器与游戏效果不一致。
- `tests/test_l2d_idle.js`: 自动校验幅度边界、档位递增、强风时发根和裙腰稳定、旧V1/V2配置安全迁移、用户自定义保存、转场平滑、调节时阵风模式不丢失。
- `.github/workflows/character-editor-tests.yml`: 真正绘制原始17部件女主的3档×4个时刻，共12幅帧图存为 `heroine-3-weather-tiers-4-phases.png`，以及390与1340两分辨率浏览器检查。

## 基准定标（仅200×300测试部件，不代表实际屏幕物理像素）

| 档位 | 头发总控 | 裙子总控 | 刘海末端跨周期运动范围 | 裙摆末端跨周期运动范围 | 身体 |
|---|---:|---:|---:|---:|---|
| 普通待机 | 28% | 23% | 约10.4 px | 约6.2 px | 12% |
| 微风 | 64% | 52% | 约23.5 px | 约13.9 px | 13% |
| 大风 | 115% | 92% | 约41.5 px | 约24.4 px | 16% |

`weather` 是风型，用于产生慢速阵风包络。`preset` 标记当前是否为手工自定义：调节参数后 `preset='custom'`，但 `weather` 不变，因此大风的阵风波形不丢失。点击任意固定预设会将旧版超大的逐部件倍率恢复为自然标准倍率，避免出现明明选择普通档但刘海仍摇晃过大的情况。

## 实际人工观察与不足

检查 CI 生成的3×4实际立绘对比、刘海及裙摆局部放大图：普通档基本静止；微风档发丝/裙摆小幅摆动；大风档末端摆动更明显，脸和肩仍稳定。相比上版普通档刘海约74px、裙摆约56px的运动范围，缩减显著。

注意：本项目仍是自研PartRig而非商业Cubism，当前按骨骼曲线产生自然风型，并非真正流体和布料求解器。实际服装遮挡、局部蒙皮、柔性接缝仍可迭代；夸张强风只应在对应剧情天气下启用，普通场景不应默认开启。

## 可复现验收

- 主机命令：`node tests/test_l2d_idle.js`
- GitHub Actions：`Character editor smoke tests`、`L2D modules - auto-register and game + studio integration`、`Game DEV → L2D game/editor face and idle E2E`、`Publish game + all-character L2D DEV`。
- 编辑器：https://g2066203208-beep.github.io/paperchalk-world/character-editor/?character=protagonist&side=front&idle=1
- 游戏：https://g2066203208-beep.github.io/paperchalk-world/?dev=1

2026-11-03 使用三档真实原图帧比对验收，并未修改官方人物素材。编辑器跨设备 GitHub 永久存档需独立模块发布；浏览器点击保存只写同设备游戏工程。
