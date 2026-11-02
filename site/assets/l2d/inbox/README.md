# L2D 单文件自动安装收件箱

将从工作室「导出游戏模块 ZIP」生成的完整 `<角色ID>.zip` 上传到**这个文件夹**：

`site/assets/l2d/inbox/<角色ID>.zip`

之后推送/合并到 GitHub `main` 分支，现有 Pages 发布流程自动：

- 安全解包到构建期间的 `site/assets/l2d/library/<角色ID>/`（不会向源 Git 目录强制提交解压产物）
- 校验实际独立部件/网格数据或动画 WebP、人物 ID、PNG 层尺寸、压缩包路径安全
- 生成同一份游戏 + L2D 工作室共用人物目录
- 自动部署；游戏 DEV 的「人物素材库」可选中并分配给主角/NPC

每个 ZIP **只发布一个**角色；ZIP 内根目录必须是对应 ID，例如 `char-006.zip`：

```
char-006/
  module.json
  front.png
  front.rig.json
  parts/...
```

也可直接提交已经解开的 `site/assets/l2d/library/<角色ID>/` 目录，效果相同。

安全约束：`protagonist` 和 `char-002` 的现有 V4 正式角色 ID 不允许被安装包覆盖；要体验女主的新逐件绑定，请从工作室导出一个新 ID，如 `protagonist-rig-v1`。旧角色继续显示原本认可的动画。

**上传 ZIP 到 GitHub 并不等于在网页里点击保存就上传 GitHub。** 当前网页的保存仍是浏览器本地；模块 ZIP 需要手动上传或通过 Git 提交。不会伪称网站具有你的 GitHub 写入授权。
