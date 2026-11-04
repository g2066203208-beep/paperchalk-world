# Character Resource Tree V2 — 人物、动作、服装、源稿严格分离

## 身份与编辑资源不是同一概念

一个**人物身份（canonical actor）**在工作室资源树里只能占据一个根节点。背景、动作、换装、动画导出、PSD 拆分及实验版本绝不能被登记为另一个人物。人物根 ID 不随姿势和服装切换。

资源树使用 `site/character-editor/person-tree-model.js` 的纯函数 `makeTree()` 构建。页面只负责渲染和响应点击，禁止为了凑列表临时拷贝人物记录或改动贴图的 Z 顺序。

### 女主角的正式资源结构

```text
女主角                      ← 唯一人物根 protagonist
├── 基础立绘
│   ├── 正面 · 站立         ← protagonist/front；正式 20 个 ArtMesh
│   └── 基础模型 · 背面      ← protagonist/back
├── 动作
│   └── 战斗 · 持斧          ← 同一个 protagonist/front，切到 combat 参数
├── 服装
│   └── 睡衣 · 正面          ← protagonist-sleepwear；同一人物的另一套服装
└── ▸ 源稿与历史工程        ← 默认折叠，不参与日常人物切换
    ├── 战斗 PSD · 原始 24 部件
    │                       ← protagonist-battle-front；可独立校对源稿
    └── 旧导入／备份版本     ← 保留编辑权限，不冒充新的游戏人物
```

## 类型合同

| 类型 | 编辑对象 | 是否独立人物 | 主导航 |
| --- | --- | --- | --- |
| 基础立绘 | canonical person + front/back | 否 | 展开 |
| 角色动作 | 同一人物／同一网格的动作参数 | 否 | 展开 |
| 服装 | `variantCategory=outfit` 或明确的已发布服装模块 | 否 | 展开 |
| 源稿 | PSD 原件、单独姿势源模块、Rig 中间产物 | 否 | 默认折叠 |
| 历史导入 | 同身份旧稿、不明类别历史条目 | 否 | 默认折叠 |
| 待导入 | 只有占位图、无正式 ArtMesh 的服装 | 否 | 默认折叠 |

任何类别都禁止修改用户素材的永久删除状态、网格亲子关系、遮挡蒙版或实际绘制 Z 顺序。源稿保留原始 ID 和打开能力，直接访问旧 `?character=...` 链接时自动展开所在的源稿组。

## 编辑器交互约束

1. 点击正面基础模型：恢复已发布正面 L2D；女主同时选择 `idle`，避免从上次保存的战斗状态残留。
2. 点击战斗：沿用 `protagonist` 的 20 片正式模型，只通过 `rig-character-action` 修改动作；不切到 `protagonist-battle-front`，也不重复加载头、脸、身体或裙子。
3. 点击睡衣：加载 `protagonist-sleepwear`，但人物树始终选中同一个“女主角”根节点。
4. 点击源稿：才进入原始 24 片战斗 PSD 模块；保留其独立审稿与修改用途。
5. 任何旧导入记录不得覆盖同 ID 的已发布资源，也不得生成第二个女主／女二／男主根节点。
6. 搜索可按人物、动作、服装和源稿过滤；折叠状态保持，真实图层编辑器独立工作。
7. PC、手机及 URL 深链接均使用同一套分类模型。

## 验收与回归

- 纯数据测试：`node tests/test_l2d_person_tree_model.cjs`
- 浏览器页面测试：`node tests/test_l2d_person_tree_professional_browser.js`
- 工作室旧功能回归：`node tests/test_l2d_studio_rework_browser.js`
- 删除和身份去重测试：`node tests/test_l2d_person_tree_delete_browser.js`

专业参考：Live2D Cubism Editor 官方 [Parts palette](https://docs.live2d.com/en/cubism-editor-manual/partspalatte/) 和 [About draw order](https://docs.live2d.com/en/cubism-editor-manual/draworder/)。本项目借鉴组件树层次化思想，但人物资产导航与 ArtMesh Z-order 永远是两个独立系统。
