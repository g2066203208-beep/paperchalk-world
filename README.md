# Paperchalk World

纸片 / 粉笔手绘风持续世界游戏原型。外景采用“打开的贺卡”舞台：玩家只在 X/Y 游戏平面移动；Z 只作为树木、建筑、远景等场景元素的景深参数。

当前可玩版本已经从早期单段道路扩展为 **20 × 6000 px = 120000 px** 的连续世界坐标，并保留 A村外道路作为起始区域：

- 120000 px 主世界 X 坐标 + Y 跳跃/高程 Camera；Z 不参与玩家移动，仅用于场景景深
- 地面、岩石、平台、木箱、树木等地图实体
- 地形碰撞、跳跃、平台落地与地图边界
- 即时近战：玩家 hitbox / hurtbox、敌人受击、击退与生命
- 跨区域敌人生成：固定出生区、休眠距离、巡逻、追击和近战攻击
- 可破坏木箱、药草拾取、背包与回血物品
- 村口 NPC：靠近提示，`E` / 手机「聊」交谈
- 地图出口与地图进度状态
- 10 格缝布生命条、掉血 / 回血动画
- 每个本地旅人档案独立存档：位置、血量、背包、破坏物、拾取物、出口进度；Schema V3 自动迁移并保留上一个有效备份
- 游戏内「调试」面板统一管理生命、战斗、碰撞箱、攻击范围、地形 Collider、敌人出生区、Camera 与地图传送
- Android WebView 调试 APK 构建

## 操作

- `A / D` 或 `← / →`：左右移动（X）
- `W / ↑ / Space`：跳跃（Y）
- `S / ↓ / C`：蹲下
- `J`：攻击
- `E`：与附近 NPC 交谈
- `B`：背包
- 所有开发调试功能：点击游戏内右上角 **调试**

触屏设备使用左侧摇杆控制左右移动，Y 方向由「跳」按钮控制；调试飞行模式下摇杆 Y 才用于上下移动。

## 在线版本

https://g2066203208-beep.github.io/paperchalk-world/

## 回归测试

主分支包含静态 Web Smoke Test、架构契约测试与真实 Chrome Core Runtime Regression，用于验证本地档案存档、生命 HUD、地图物理、即时战斗、调试面板、背包、地图进度及 NPC 等核心链路。

性能预算现在与核心回归绑定，防止热路径文件、运行时素材和渲染生命周期出现性能倒退。

## 运行时架构

动态战斗实体采用轻量 Sparse-Set ECS，并已拆出 Transform(X/Z) / Health / Combat / AI / Patrol / Renderable 组件源；玩家模拟只使用 X/Y，Transform.z 作为可选场景深度；共享 Card Camera 统一给 DOM 与 Pixi 提供景深投影；跨系统副作用通过事件总线解耦；世界图、NPC、敌人原型和物品进入可验证 Content 层。UI、对话和菜单继续使用 DOM retained-mode，PixiJS 8 作为可切换的动态实体 GPU 渲染后端。主游戏 RAF 只在进入世界后运行，离开世界时停止。

详细设计与后续迁移边界见 `docs/ARCHITECTURE.md` 与 `docs/PREPRODUCTION_FREEZE.md`。


## 角色自动动画工具链

游戏侧已加入独立的 manifest 驱动 PaperPuppet 运行时，用于承接 AI 分层角色并保持角色视觉与战斗 / 碰撞 / 对话逻辑解耦。

参考与致谢：

- Auto-live2D-beta（MIT）：https://github.com/lTwTlol/Auto-live2D-beta
- psd2live 原作者项目（GPL-3.0）：https://github.com/tsunehimatoi/psd2live
- Auto_Vtb_beta（基于 psd2live 的桌面自动化工具）：https://github.com/lTwTlol/Auto_Vtb_beta
- See-Through（角色单图分层）：https://github.com/shitagaki-lab/see-through

许可证边界：游戏运行时不直接复制 GPL 的 psd2live / Auto_Vtb_beta 源码；它们仅作为离线角色制作与方法参考。PaperPuppet 游戏侧实现保持独立，未来的 See-Through 分层 PNG 通过 `assets/puppets/*/manifest.json` 接入。
