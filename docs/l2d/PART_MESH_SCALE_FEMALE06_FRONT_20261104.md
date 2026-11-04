# L2D Studio｜单部件缩放与女六正面短裤贴合（2026-11-04）

## 本次修复

- 女六 `female-06` 基础正面实际双腿原始 PSD 裁切框：`x=413,y=409,w=164,h=605`。上部腿腰在原图 `y≈433` 时非透明范围约为 `x=426–565`。
- 此前把新衣服的黑色短裤硬重采样为 `164×162`，置于 `(420,415)`，结果既偏右又盖得过长。旧图层的动态蒙皮跟随测试通过，**但初始穿着贴合并未通过**。
- 不再重新裁切或涂改用户的任何原始图层。正式构建的 `pants_overlay` 保留原位 PSD 独立纹理，追加非破坏性 `placement`：
  `{"scaleX":1.20,"scaleY":1.00,"offsetX":-15,"offsetY":-17}`。
- **修复父级后：短裤一级父级为 `parentId="pelvis"`，不是 `legwear`。** `skinBinding.target="legwear"` 只是裤腿的二级蒙皮来源。腰部上方约 42% 的面网格与骨盆刚性绑定，中段向左右腿 IK 权重平滑过渡，下摆完全继承左右腿。上衣的下摆也固定到同一个骨盆变换，避免呼吸/肩部动作使腰线脱开。骨盆坐标来自原始腿部骨骼和身体位置，**绝不从裤子素材推算**。左右翅膀同样附着肩部，原身体脚踝保持落地。
- 画册静态合成 `front.png` 与动态 ArtMesh 使用同一个贴合变换。不保留旧的错位裤子缩略图。

## 每个角色、每个部件可复用

`part-rig-studio.js` 的 **「部件尺寸与位置」** 面板在选择任何真实 PSD 部件后显示，具有：
1. X/Y 独立缩放（25%–400%），默认锁定宽高比例，可解除；
2. 水平/垂直像素偏移（±1024px）、精确数字输入；
3. 画布拖动矩形、四角手柄缩放，方向键 1px 微调、Shift + 方向键 10px；
4. 重置选中部件的尺寸和位置，不影响其他层；
5. 通过顶栏 **「保存并应用到游戏」** 保存到当前人物和视角。保存的是 Rig JSON 中的 `placement`，不是把 PNG 重采样或覆盖；返回同设备游戏会读取相同的绑定。
6. 调整后 `mapToSource` 仍然反算到原始 PSD 像素；局部遮挡蒙版绘制也使用这一反算变换，避免被移动/缩放的蒙版错位。

`placement` 结构：
```json
{"scaleX":1,"scaleY":1,"offsetX":0,"offsetY":0}
```
保持旧项目默认向后兼容；女六的 `pants_overlay` 若来自旧版无 `placement` 的本地草稿，自动补入该部件特定的校准值，保留原有绘画、图层、骨骼和遮挡设置。任何人物的新比例都应通过 UI 保存，而不是改根图层 `x/y/w/h`。

## 发布边界与回归

- 对应原图与安装包：`site/assets/l2d/inbox/female-06.zip` 和 `female-06-outfit-02.zip`；构建器 `scripts/bind_female06_pants.py` 只在临时部署中生成派生贴合，不覆盖已入库 ZIP。
- 编辑器与游戏渲染都经 `site/l2d/part-rig.js`，杜绝编辑器一套、游戏一套的缩放实现。
- 单元回归：`tests/test_l2d_part_placement.cjs`、`tests/test_female06_pants_skin.cjs`。
- Chromium 端到端：`tests/test_l2d_part_resize_browser.js`、`tests/test_female06_pants_wear_browser.js`、`tests/test_female06_existing_draft_migration_browser.js`。要核对保存、刷新、原贴图尺寸、腿部运动时的贴合和重复打开不会新增第二条裤子。
- 在线改动**不等于**服务器自动保存手工编辑后的二进制纹理；跨设备发布需导出模块并经 GitHub CI。用户同一浏览器中的 Rig 参数通过 IndexedDB 保存。



## 2026-11-04 父子骨骼绑定复核与验证

实际发现：此前裤子虽然指定了 `skinBinding.target='legwear'`，**但这不等于裤腰的父级为骨盆**；上一版骨盆还可能从被调整的短裤纹理推算。新绑定使用人体源图层定义的固定骨盆根节点。

```
ground (fixed feet)
└── pelvis (virtual skeletal root, from original body anatomy)
    ├── torso (waist locked, shoulders and breath above)
    │   ├── left/right shoulder → independent arms
    │   ├── left/right wing attachment
    │   └── neck → head → face, eyes, hair
    ├── left hip → knee → planted ankle
    ├── right hip → knee → planted ankle
    └── shorts waistband (100% pelvis)
        ├── left leg hem → blended into left thigh skin
        └── right leg hem → blended into right thigh skin
```

- 根节点：`bodyHierarchy.graph.pelvis` 从原始腿部骨骼推导，不再依附 shorts 的位置、缩放。
- 裤子：`parentId='pelvis'`，`skinBinding.method='pelvis-waist-dual-thigh-v2'`，网格上部刚性腰锁 `[0,.42]`，中间 `[.42,.84]` 平滑过渡，裤脚 `[.84,1]` 采用二腿 IK 蒙皮。
- 上衣：肩部/胸部允许局部呼吸，腰下方的局部骨骼与服装角度变换逐步衰减到 0，和短裤共享骨盆。
- 双翼：`wings_l/r` 接 `torso` 肩部。脚底保留原腿骨的落地约束。
- 专项 GitHub Action `.github/workflows/female06-body-hierarchy.yml` 成功验证：`tests/test_female06_pants_skin.cjs`（42 帧）+`tests/test_l2d_part_placement.cjs`+`tests/test_female06_pants_wear_browser.js`+`tests/test_l2d_part_resize_browser.js`，包含真实 Chromium 工作室/游戏往返。

**适用范围：本轮对女六正面做了完整父级验证；不代表全部其他人物的每一张 PSD 都已经达到同样的验收水平。**
