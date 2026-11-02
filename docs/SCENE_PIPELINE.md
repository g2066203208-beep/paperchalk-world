# Paperchalk World · 场景模块开发规范

## 本次审计结论

此前只有 `menu` 与 `classroom` 两个写死的场景，不具备真正的“放一张图自动注册”。本次实现了自动发现的静态图片场景模块；现有课堂对话、角色景深、DEV 镜头和浏览器本地已保存的角色参数均不做变更。

## 一张图自动上线

1. 将新的 **WebP 背景图** 放进 `site/assets/scenes/`，采用小写短横线命名，例如 `bedroom.webp`、`kitchen.webp`。
2. 推送到 `main`。原 `.github/workflows/studio-pages.yml` 自动扫描目录并生成 `site/scene-catalog.generated.js`。
3. GitHub Pages 发布时，场景自动出现在主菜单的「场景预览」和游戏左上角菜单的「切换场景」里，也可以使用 `?scene=bedroom` 深链预览。
4. 渲染使用 **同一个 #scene 背景、#scene::after 附着黑色渐变、独立 #fog 动态纯黑流体画布和 #scene-transition 完全遮黑的换场动画**，不会为每张图片复制舞台代码。
5. 新增室内场景默认**无人**，不会自动启用教室内主角/敌人贴图或教室台词。后续人物及互动必须显式配置。
6. 图片名就是唯一 ID，文件必须是合法 WebP。未知场景文件名会作为菜单显示名自动格式化；常见房间中文名在 `scripts/build_scene_catalog.py` 中集中维护。

## 当前已注册场景

- `classroom`：教室剧情，维持原角色、对话、存档和 DEV 设置。
- `living-room`：已经确认的客厅空镜，来源为用户提供的 Anima 原图，发布前压缩为 1024×576 WebP，保留画面构图。
- `menu`：原有主菜单。

## 设计与测试约束

- 新房间一律复用现有舞台视角/场景边缘渐变/屏幕固定纯黑安全区，不能在图片里烘焙额外黑雾。
- 严禁没有指示就覆盖浏览器中的 `paperchalk-layer-editor-v2` 角色配置。
- 场景资源必须解码成功后才能完成场景切换，否则保留旧场景。
- 自动化测试检查：资源头与尺寸、目录注册、菜单入口、完整遮黑过渡、黑雾画布身份一致、新场景隐藏战斗人物及教室文字、手机横竖屏和桌面表现。
- 生成文件是构建产物，不需要手工修改。开发者本地预览前执行 `python3 scripts/build_scene_catalog.py`。
