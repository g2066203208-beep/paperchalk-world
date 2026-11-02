# CHAR-002 女二号｜游戏 V4 动画及共用编辑工作室

> 2026-11-02。唯一基准：`site/assets/characters/char-002/front.png`，来自用户认可的三人图中间人物。**不得重画或替换脸与姿势**。

## 真实实现

- `scripts/build_char002_v4.py` 从 303×1024 的原画中，只移除与外框连通的白背景，保留人物内部浅色的衬衣、眼白、面部与肤色。
- 输出 `site/assets/l2d/char-002/front.webp`：**128 帧，20 FPS，335×1024**，轻微头肩摇摆及上身呼吸，鞋底基本固定；由 GitHub Actions 发布时生成，与女主角同样接入 `site/l2d/runtime.js` 的逐帧 WebP 播放链路。**这不是 Live2D Cubism .moc3 骨骼模型**；没有虚构口型、眨眼物理绑定。
- 同时生成 `front-source-regions.zip`，共 7 个从已认可原画原位像素划分的可编辑区域：鞋、腿、裙、挥手手臂、垂手手臂、头发与面部、校服上身。**这些不是 Photoshop 原 PSD 分层，不含原画看不到的遮挡层**；组合后逐像素还原可见母版。
- `manifest.json` 是唯一动画元数据，包含 `front` 裁切区 `x=344,y=0,w=335,h=1024`。构建 `scripts/build_character_catalog.py` 将它与原画路径一起注册到 `site/characters.catalog.json`。
- 游戏 `site/dev/character-bridge.js` 和编辑器 `site/character-editor/studio.js` 都从这一 `clips.front` 元数据加载同一份动画，不再通过改造女主角 ID 的方式展示女二。
- 工作室 `?character=char-002&side=front`，自动加载女二 7 个编辑区域；`frames:char-002:front`、`parts-patch:char-002:front`、`overlay:char-002:front` 等独立存储，绝不覆盖女主角的 `protagonist` 数据。
- **背面没有源图，目前禁用。** 严禁左右镜像正面充当背面、复制女主背面、把用户尚未审核的人设变为正式资产。
- 编辑修补发生在浏览器的 IndexedDB。游戏即时使用保存到本浏览器的修改；若要同步多个浏览器，需导出修补备份。GitHub Pages 不会替用户自动上传浏览器本地图片。

## 一致性验收

发布 CI 检查 `front.webp` 恰有 128 帧、原画路径正确、7 个图层和背面为空。E2E 必须进一步覆盖：游戏加载 `char-002` 的解码帧 → 编辑器打开相同 ID/动画 → 可编辑区域数为 7 → 禁用背面 → 保存后回到游戏，仍使用 `char-002` 身份。

## 后续美术边界

原图是单张合成 PNG，不能从中真实恢复被头发/袖子遮挡的皮肤及完整 Cubism 参数，也不能凭空创造可信背面。若需要真正 Cubism 变形器、眼球追踪、眼睑闭合、物理马尾、多个表情/动作和正背连续旋转，应在这份身份母版基础上制作真正的分层原画和 Cubism 原生工程，不能把现有逐帧 WebP 误写为已完成的骨骼动画。