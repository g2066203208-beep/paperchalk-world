# 卡牌战场自由镜头模块规范（2026-11-13）

## 入口与架构

- **独立输入/插值控制器**：`site/card-battle/engine/battle-camera.js`，`PaperchalkBattleCamera.create()`
- **战场场景**：`site/card-battle/formation-6x16-3d.html`，由该页面将控制器输出的相机eye/target/fov传入WebGL的view/projection矩阵
- **体素地形**：`site/card-battle/engine/voxel-terrain.js`，地形本身不随镜头操作变化
- **回归测试**：`tests/six-row-formation-browser.mjs`，实际Chromium截图和GUI事件

**禁止**后续助手再次把镜头输入、地图几何、卡牌位置分别复制成互不关联的三套计算；这个相机模块可用于以后其他场景。

## 操作

- 默认镜头为常规31°透视，默认距离48世界单位、53°俯角；比上一版固定相机更近，战场显示面积更大
- **右键拖动**：绕镜头关注点旋转，水平方向完整360°，上下俯仰限制22°–79°，避免穿过地形或翻倒画面
- **中键拖动 / Shift+左键拖动**：沿当前屏幕方向平移关注点，允许浏览世界地形各处；不变更任何地块或角色位置
- **滚轮**：靠近/远离视角，平滑缩放范围23–115世界单位，避免穿模
- **单指手势**：没有选中卡牌、也没有点中角色时用于旋转镜头
- **双指手势**：平移和捏合缩放
- **右上角 +/-、重置视角**，以及键盘数字0/Home、WASD、方向键、Q/E控制
- **左键普通放牌、拖卡、挖掘、堆土**不得被镜头手势吞掉；角色卡翻面仍用双击

## 摄影机与拾取

- 镜头模块用`update(dt)`做指数阻尼，不要用鼠标自动跟随视角导致画面漂移
- 改动相机必须更新WebGL投影矩阵以及`worldFromPointer`的透视射线方向
- 格子拾取用`terrain.center(c,r)`生成的世界中心做屏幕重投影；无论镜头怎么旋转缩放，卡牌落点与真实方块中心保持一致
- `window.__battleCamera.snapshot()`供浏览器测试检查角度、目标点、距离
- 拖镜头不应触发卡牌攻击、翻转、放置或地形变化；平移和缩放不应改变`window.__terrainEngine.snapshot()`

## 真实验收

GitHub工作流 `Tactile one-on-one card battle QA` 必须涵盖：
1. 一开始场地更近、比例更合适，卡牌没有被镜头裁切
2. 滚轮后相机距离确实缩小（截图`15-6x16-camera-zoomed-in-real-webgl.png`）
3. 右键横向和纵向拖动后偏航与俯仰确实变化（截图`16-6x16-camera-rotated-real-webgl.png`）
4. 中键拖动后焦点确实平移（截图`17-6x16-camera-panned-real-webgl.png`）
5. 重置恢复默认方向与距离，放牌位置和挖掘/堆土测试通过

后续如发现卡牌在任意旋转视角下点不中，应先修复屏幕拾取算法，而不是把镜头锁死。
