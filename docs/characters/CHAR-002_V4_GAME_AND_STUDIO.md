# CHAR-002 女二号｜真实 PSD 分层骨骼与游戏接入（2026-11-02）

## 已核实源文件

用户上传的 `女二-正面(1).psd` 是 **1024×1024，16 个真实 Photoshop 位图图层**，不是之前 `front.png` 的 7 块切割区域。层序（由后向前）：`back hair`、`legwear`、`footwear`、`bottomwear`、`neck`、`topwear`、`handwear`、`ears`、`face`、`nose`、`mouth`、`eyewhite`、`eyebrow`、`irides`、`eyelash`、`front hair`。仅存在真实正面；**不得伪造背面**。

## 新增：真正逐层驱动的网页版动画

- `site/l2d/rig.js` 的 `setLayers()` 不再将 PSD 位图永久合成为一张照片；它同时保存每层原始纹理，`psdTarget()` 和 `renderPSDParts()` 分别驱动关节及可弯曲网格。
- 骨骼与独立物理：头颈细微转动、胸腔呼吸、上臂肩关节、后发末端惯性、刘海末端、裙摆褶边两段波动、虹膜视线、眼白/眼睫眨眼、嘴部微动。脚部保持原位。
- `site/character-editor/studio.js` 导入真实 PSD 或含 `layers.json` 的分层 ZIP（必须有至少 12 个 `role=psd-part` 的独立源位图）。每个图层保留自身坐标、透明像素、层序和可编辑性，保存到 IndexedDB 键 `skeletal:char-002:front`。
- `site/dev/character-bridge.js` 切换女二到 `player` 或 `enemy` 时，**优先**读取已保存的 `skeletal` 数据，调用 `PaperchalkL2D.setLayers()`，模式为 `psd-layer-skeletal`。若尚未导入，则旧的扁平 V4 WebP 仍是后备显示，不得称为真骨骼。
- `site/character-editor/l2d-mode.js` 检测真实 PSD 16 层后恢复独立网格预览；没有真实 PSD 的女主仍使用她已经认可的 V4 帧动画。
- `site/index.html` 将 `player` 和 `enemy` 角色显示画布强制设置为原始 **1:1** 比例，角色立绘宽高比不同也不会误改为细长占位，固定人物脚底与原站位。
- `scripts/fix_protagonist_neck_v4.py` 从女主 PSD 的独立 `neck` 图层推导多余的前脖颈覆盖像素，逐帧修正女主 V4 正面 128 帧；不碰背面。

**技术边界：** 这是以 PSD 原图为输入的真实 **Canvas 分层骨骼 + 仿射三角网格**，已经不是移动一张静态图；但不是 Live2D Cubism 官方的 `.moc3` / ArtMesh 编辑工程，不应虚称 Cubism 物理系统。对于未绘制的被遮挡画面，不虚构背部或侧面。

## 原始图层交付和加载方式

当前用户原始 PSD 及 16 层 PNG 存在本次任务的交付 ZIP **`女二_真实PSD分层骨骼L2D工作室_16层.zip`**，该二进制包**没有写入 Git 仓库**。它包含原 PSD、`assets/01.png`—`assets/16.png`、`layers.json`、本地实时动画预览 `index.html` / `rig.js`。

第一次在 GitHub Pages 启用真人物分层动画：

1. 打开 `https://g2066203208-beep.github.io/paperchalk-world/character-editor/?character=char-002&side=front`。
2. 点击 **导入全部真实部件（PSD / V4 ZIP）**，选择上述整个 ZIP 文件，或选择原始 PSD（PSD 需要浏览器能加载 `ag-psd` 解析库）。
3. 右侧 **角色实时动画** 预览应有独立运动的后发、裙摆和表情。点击 **返回游戏 DEV** 触发保存；角色选择 `player` 或 `enemy` 对应 `char-002`。
4. 在游戏开发栏选择要替换的主角站位（`player`），选择女二，点击切换；查看实际 `data-l2d-mode=psd-layer-skeletal`。同一个浏览器的 IndexedDB 保留 16 层。
5. 数据**不是自动上传 GitHub，也不跨浏览器同步**。换设备须重新导入；当前尚未实现源 PSD 到仓库的永久二进制提交。

## 回归界限

GitHub Pages 构建校验了 JS 可解析、女主正面 V4 128 帧、女二旧 fallback V4 128 帧、7 个后备区域。实际 PSD 16 层渲染在独立工作室通过节点/纹理比较（脚部不动、头发/裙摆都有变化）；**完整浏览器端「导入真实 PSD → 保存 → 游戏加载 16 层」自动化 E2E 尚未验收，不得把旧 WebP E2E 冒充为此项测试通过**。
