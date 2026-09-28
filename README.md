# Paperchalk World 3D

Paperchalk World 已迁移为 **Three.js r180 + WebGLRenderer 的原生 3D 浏览器游戏运行时**。

当前主线架构只有一套世界渲染路径：

```text
ECS gameplay state
      ↓
PaperchalkRuntime
      ↓
Three.js Scene / PerspectiveCamera / WebGLRenderer
      ↓
WebGL canvas
```

旧的 DOM Card Camera、PixiJS 世界渲染、2D 玩家 Sprite、2D 建筑/道路/交通层、PaperPuppet 世界渲染和 DOM 血条已经退出生产运行时。

## 当前 3D 功能

- 原生 X/Y/Z 玩家状态与存档
- WASD / 方向键在 3D 地面移动
- Space 跳跃、重力和落地
- C 蹲下、J 攻击动作状态
- 第三人称透视相机
- 鼠标/触控拖动旋转镜头，滚轮缩放
- 程序化 3D 地面、道路、人行道、建筑、树木和岩石
- DirectionalLight / HemisphereLight
- 实时阴影、雾、色调映射
- 建筑 3D 碰撞
- ECS 固定步长模拟
- 10 点世界空间血条：9 个普通格 + 1 个尾巴格
- 掉血和回血的 3D 缩放/透明动画
- 血条 Billboard 始终朝向摄像机
- 本地档案、Schema V4 3D Transform 存档
- 20 格背包
- 3D 镜头设置
- 3D Collider 调试显示
- Android WebView 壳

HTML 只保留菜单、背包、地图和调试等屏幕 UI；游戏世界本体全部由 Three.js 渲染。

## 操作

- `WASD` / 方向键：3D 平面移动
- `Space`：跳跃
- `C`：蹲下
- `J`：攻击
- `B`：背包
- `M`：世界地图
- 拖动 3D 场景：旋转镜头
- 鼠标滚轮：镜头缩放

手机端使用左侧虚拟摇杆和右侧“蹲 / 跳 / 攻”按钮。

## 在线版本

https://g2066203208-beep.github.io/paperchalk-world/

## 回归测试

- Web 3D Static Smoke
- Core 3D Runtime Regression
- Three.js Production Engine Smoke
- UI + 3D Overlay Smoke
- Android APK Build

这些测试会阻止 2D/Pixi/CardCamera 渲染代码重新进入生产架构。
