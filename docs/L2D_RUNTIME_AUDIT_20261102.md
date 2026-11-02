# 游戏角色 V4 / 编辑工作室一致性核验（2026-11-02）

## 结论与边界

本项目在浏览器中运行的主角动画是**透明 WebP 逐帧 V4**（正反面各 128 帧，20 fps），通过 `site/l2d/runtime.js` 的 WebCodecs `ImageDecoder` 或原生 WebP 回退路径渲染。它**不是** Live2D Cubism 的 `.moc3` 模型，也不应以“Cubism 骨骼绑定完成”宣传。自定义 `site/l2d/rig.js` 是仅供非 V4 角色使用的程序化网格回退，女主角 V4 的编辑主画布不再使用它充当最终预览。

正式主角只使用 `protagonist` 身份：
- 原始正背参考：`site/assets/characters/protagonist-front.webp`、`protagonist-back.webp`。
- 动画发布素材：由 `scripts/build_v4_assets.py` 校验 SHA-256 后，将 `site/assets/l2d/v4/chunks/` 合成为 `front.webp` 和 `back.webp`。
- 原始分层：`site/assets/l2d/v4/protagonist-original-parts.zip`，正面 17 个、背面 8 个；分层不是 V4 动态帧本身。
- 游戏真实运行：`site/dev/character-bridge.js` → `site/l2d/runtime.js`。
- 同一编辑入口：`site/character-editor/`，通过 `studio.js` 读取与游戏一致的 V4 WebP / IndexedDB 修补。

## 本轮修复

1. 删除“环境房间”对女主角位置及尺寸的强制 `!important` 覆盖；课堂、客厅、玄关、卧室使用同一角色位置与存储键 `paperchalk-layer-editor-v2`。已在浏览器保存的配置优先，默认设置只在没有存档时使用。
2. 全游戏的菜单、人物称谓、对话及操作字体变量统一为 `--font-menu`；不再只有主菜单呈现 PaperSerif。
3. **V4 女主角编辑默认显示真实 V4**，不再因为自动载入 25 个 PSD 部件而切换成额外的假网格人物。
4. 中央主画布应用与游戏一致的 V4 帧、原始分层像素修补、通用修补、逐帧修补和闲置呼吸变换。程序化网格仅用于其他缺乏 V4 的角色。
5. 选中 PSD 部件落笔时临时切换为静态源部件，以保留原图精确编辑坐标；结束编辑回到原版动画，源图差值通过 `parts-patch:<id>:<side>` 保存并叠加到游戏实际 V4。
6. 女主角的第二套“网格动态预览”隐藏；小的 V4 缩略画布只保留为内部解码缓存，不再重复显示。保留播放、暂停、原始部件静态精修与帧修补的显式控制。
7. 修改资源 URL 版本号，避免旧缓存脚本继续覆盖新编辑器。

## 保存纪律

浏览器 `IndexedDB` 是编辑器的本地个人数据，不自动同步至 GitHub。编辑器返回游戏时将 `overlay:<id>:<side>`、`frames:<id>:<side>`、`parts-patch:<id>:<side>` 及运动配置保存在同源存储，游戏在每次角色指派时读取。迁移至其他电脑需导出修补备份或将合法原始动画资产提交仓库；不要覆盖现有二进制母版或清空用户存档。

## 验收要求

- 通过 `.github/workflows/character-editor-pages.yml` 的页面构建和部署检查；
- 通过 `.github/workflows/character-editor-tests.yml` 的桌面和手机绘画/布局验收；
- 通过 `.github/workflows/game-character-dev-tests.yml` 验证游戏 V4 → 编辑实际 V4 → PSD 修补 → 保存 → 回到游戏 → 修补重新加载；必须断言假网格缩略不显示；
- 通过 `.github/workflows/studio-pages.yml` 验证场景切换后 `getComputedStyle` 的主角 left/bottom/height 保持一致，以及游戏文字各处字体与主菜单一致。

**尚未解决的问题**：当前不是原生 Cubism 资产，无法仅凭现有 WebP 宣称有可驱动的完整 Cubism 面部参数/物理绑定。原生 Cubism 的开发必须由原创分层模型导出合法的 `.model3.json`、`.moc3`、纹理图和动作物理文件，再接入其授权运行时。V4 全部帧中的外观和透明度仍须以实际发布网页截图逐帧复核，不以静态母版或单次构建成功代替美术验收。
