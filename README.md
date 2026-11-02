# Paperchalk World｜GitHub 托管游戏与像素工作室

当前 main 仓库同时包含横屏叙事场景、自动场景发布系统与独立美术工具；场景实验并不是完整的剧情游戏。

[打开托管游戏](https://g2066203208-beep.github.io/paperchalk-world/) · [GitHub Actions 自动发布](https://github.com/g2066203208-beep/paperchalk-world/actions)

## 新增场景：只上传一张图片

把 WebP、PNG 或 JPEG 图片上传到 **[site/assets/scenes/](https://github.com/g2066203208-beep/paperchalk-world/tree/main/site/assets/scenes)**；推荐尺寸 1024×576，也可以使用其他清晰尺寸。比如新增 basement.webp 后只需提交到 main。

自动流水线：图片解码及校验 → 场景数据生成 → 场景预览和游戏内切换自动注册 → 共用主角背面、黑雾、鼠标/手机倾斜、黑色转场 → 浏览器测试 → GitHub Pages 发布。可以用 ?scene=basement 直接打开。图片内容不被自动裁切、重画或重新压缩。

**[详细使用说明：模块契约、命名、设置保留、验收与故障处理](docs/SCENE_AUTOMATION.md)**

## 现有游戏内容

- 场景：教室、卧室、客厅、玄关，后续图片自动注册。
- 主角：site/assets/characters/protagonist-front.webp 和 protagonist-back.webp 两张独立图；游戏场景使用透明背面前景。
- 分层：背景 3D 倾斜、固定屏幕空间实时黑雾、背景边缘全黑遮挡、深黑转场、手机和电脑兼容。
- 沿用已调好的浏览器设置、黑雾和 DEV 景深参数；新场景不重建效果。
- 废弃恐怖角色、动态黑斑、单独“主角立绘”场景已经从当前游戏中移除。

## 独立工具

- [PixelLab](https://g2066203208-beep.github.io/paperchalk-world/pixel-lab/)
- [像素绘画编辑器](https://g2066203208-beep.github.io/paperchalk-world/pixel-lab/editor.html)
- [像素材质工作室](https://g2066203208-beep.github.io/paperchalk-world/world-builder/materials.html)
- [美术参考资料库](https://g2066203208-beep.github.io/paperchalk-world/learning-library/)

## 自动构建

本地可运行 python3 scripts/build_scene_catalog.py （需要 Pillow），随后运行 node tests/scene-modules.test.cjs。正式发布由 .github/workflows/studio-pages.yml 执行 Chromium 回归测试后上线。

备注：浏览器本地保存的个人参数不会被新图片覆盖，但 GitHub 无法从用户浏览器读取这些参数并自动备份到仓库。

## 正式角色档案（唯一身份与素材锁定）

- [女主角 CHAR-001：外貌、瞳色、性格与可修改的年龄/身高/体重草案](docs/PROTAGONIST_CANON.md)
- [角色机器档案](site/data/characters/registry.json)：所有正背面与未来主角变体均复用 `protagonist`，不创建重复女主角。
- 验证：`python3 scripts/validate_character_identity.py`，并接入现有 Pages GitHub Actions 部署检查。
- 原有主角正面/背面 WebP 未修改；传入新场景图也不应生成独立的人物场景。
