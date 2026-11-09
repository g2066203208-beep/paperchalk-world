# 第一幕｜日常校园教室 2.5D 五面盒子实装（2026-11-09）

> **用途**：实际游戏内 `school` 场景，和 `classroom-box` 战斗测试房完全分离。自绘矢量材质和角色占位素材，**不是用户本地 Anima 模型生成物**。不覆盖已定的战斗透视和人物 L2D。
>
> **代码**：`site/game/school-room-2p5d.js`、`site/game/school-room-2p5d.css`；`site/index.html` 注册 `PaperWorldSchoolRoomRenderer`；`site/game/overworld-runtime.js` 在第一幕坠楼段落通过 `triggerFall()` 演出。

## 空间协议

- 长方体真实 3D 五面室内：宽 10m、长 9m、高 3.38m，前端面对黑板。
- 近处为教室后侧固定头部镜头，约 1.58m 眼高，67° 水平视角；鼠标只绕固定头部轻微环顾，上限约左右 4.9°，禁止 2D 整图旋转。
- 课桌 5 列 × 5 排：桌面、课桌箱、四根钢腿、椅背、座面和四根椅腿均由独立 3D 网格构成；材质贴在五面墙/地/顶上，非透视画死的全图；黑板和窗户进入对应的真实墙面 UV。
- 反应镜头：当第一幕坠楼段落进行到 `effect:'fall'` 时，在左窗旁的世界空间画出快速下降的人影；镜头**先目睹再向左转头**，不是屏幕贴图。平时保持日常教室状态，无预警恐怖 UI。
- 人物：位置与桌椅用相同 3D 深度、贴脚地面投影；普通 PNG 的不透明白底在 WebGL 中作极浅白色剔除。女神 Day 2 起不在课堂，小胖 Day 6 起不出现，保持故事世界变化。
- 缓存：静止时不重复绘制 WebGL 大场景；材质加载、日期、镜头角度改变或坠楼动画帧改变才重画；已有的流体黑雾独立继续运行。
- 无强制事件调查清单，课桌、聊天和住处调查仍由原表世界的点按交互触发；不改变既有公司业绩规则。

## 本轮美术文件

- `site/assets/school-room/back.svg`：后墙、黑板、书架、公告栏、时钟
- `site/assets/school-room/left-painted.svg`：已接入正式 3D 左侧窗墙的新版手绘平面贴图，四组大窗、旧式窗框、帘布、阴天校舍外景；保留 `left.svg` 为历史可回退资源
- `site/assets/school-room/right.svg`：教室门、公告栏、储物柜
- `site/assets/school-room/floor.svg`：地面铺装，无外部景深
- `site/assets/school-room/ceiling.svg`：吸音板分格与天花灯
- `site/assets/school-room/small-boy.svg`：小胖临时人物牌
- `site/assets/school-room/class-idol.svg`：女神临时人物牌

## 后续不得隐瞒的工作

- 此批材质是**已实装的可替换二维美术纹理**，不是用户指定的 Anima + LoRA 正式绘制。正式 Anima 的墙面、顶面、地板必须分别以正交无透视材质导入，避免双重透视。
- 小胖与班级女神人物仍是本轮临时矢量站姿，画风与游戏 L2D 角色库有差异；不能假装正式人物已出完。其他几位同学借用既有人物资产作为空间检查，不代表剧情设定或固定服装已审核。
- 暂无完整 3D 物理投影阴影、灯光烘焙、昼夜灯光自动变化等高级渲染功能；目前是 WebGL 世界空间立体几何、分面明暗、独立纹理的有效演出原型。
- 小胖家内景/教学楼走廊仍需正式 2.5D 美术重做；第一幕剧情存档与基本互动已接通。
- 截图和浏览器证据以 `tests/act-one-browser.mjs` 和 GitHub Actions `Act One Story Tests` 的真实状态为准，不能因代码提交就写成视觉已验收。
