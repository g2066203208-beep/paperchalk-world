# 人物资源库 V3 — 全角色一致的 L2D 工作室规则

## 编辑器里只保留正常制作所需的资源

每个人物始终是**一个根节点**，按同一顺序呈现：

```text
女主角
  基础立绘
    正面 · 站立
    背面
  动作（已做好的才显示）
    战斗 · 持斧
  服装（已导入的才显示）
    睡衣
女二
  基础立绘
    正面
男主角
  基础立绘
    正面
  服装
    新服装
男二
  基础立绘
    正面
女三
  基础立绘
    正面
女六
  基础立绘
    正面
女老师
  基础立绘
    正面
```

实际显示以该角色已发布且能加载的真实素材为准，不用假的背面、假的换装或待导入占位充数。没有的分类**不显示空文件夹**。

## 一个通用导入入口

人物资源库上方只有一处 **＋ 导入 PSD / 分层 ZIP**，始终显示当前选中的人物与方向（例如：`导入到：女二 / 正面`）。导入按钮直接调用现有正式导入器 `studio-parts-import` / `importComponentArchive`，不得另写不一致的男二、女二或老师专用导入流程。切换已有服装后，导入目标是当前服装，不会误写到基础模型。

**技术源文件和历史工程**：`protagonist-battle-front`、旧女二 PSD、旧版 male2/char-016 等仍保留在原有仓库和浏览器草稿，**不放进人物树，也不放进常规角色下拉选择列表**。特殊原始项目仍可通过原有 `?character=...` 深链接直接打开，不影响回退、源稿校对和修改。

不能让旧导入草稿盖掉已发布主角立绘；不得因为整理树而删除源 PNG、ArtMesh、骨骼、遮罩、动作参数或本地数据。

## 动作与换装

- **动作**是同一个人物的参数／局部部件变化，现有女主战斗通过 `protagonist/front` 的 `combat` 参数执行，绝不把独立 24 片 PSD 复制成一个人物。
- **服装**是同一人物的另一套正式艺术资源，可单独维护；不要把它登记为另一名角色。
- **正面／背面**只显示真实可加载的视图，不用正面图片伪装成背面。
- **图层树**是另一个独立系统，按原始 PSD ArtMesh 和遮挡／Z 顺序工作；人物资源树不参与重排图层。

## 每次发布必须验收

- `node tests/test_l2d_person_tree_model.cjs`：身份、分类、动作、服装、旧稿归属
- `node tests/test_l2d_person_tree_professional_browser.js`：女主动作/睡衣/直链
- `node tests/test_l2d_all_people_clean_tree_browser.js`：全演员资源树、统一导入、无历史杂项
- `node tests/test_male2_seethrough_browser.js`：男二通过统一导入方式安装拆分
- `node tests/test_l2d_person_tree_delete_browser.js`：删除、撤销、保存和人物去重

参考资料：[Live2D Parts Palette](https://docs.live2d.com/en/cubism-editor-manual/partspalatte/)，[Spine Skins](https://us.esotericsoftware.com/spine-skins)。二者的共同设计原则是把人物、图形部件、动作和换装概念分离，让制作资产归档不妨碍日常使用。
